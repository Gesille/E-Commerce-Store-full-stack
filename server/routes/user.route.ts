import express from 'express';
import { activateUser, deleteUser, getAllUsers, getMostActiveUsers, getRecentUsers, getRegistrationsPerMonth, getTopSpenders, getUserActivity, getUserInfo, loginUser, logoutUser, managerRegisterUser, refreshTokenMiddleware, registrationUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole } from '../controllers/user.controller.js';
import { authorizeRoles, isAuthenticated } from '../middleware/auth.js';


const userRouter = express.Router();

userRouter.post('/registration' , registrationUser);

userRouter.post('/activation',activateUser);

userRouter.post('/login',loginUser);

userRouter.get('/logout',isAuthenticated,logoutUser);

userRouter.get('/refresh-token',refreshTokenMiddleware,updateAccessToken);

userRouter.get('/get-user-info',refreshTokenMiddleware,isAuthenticated,getUserInfo);

userRouter.post('/social-auth',socialAuth);

userRouter.put('/update-user-info',refreshTokenMiddleware,isAuthenticated,updateUserInfo);

userRouter.put('/update-user-pass',refreshTokenMiddleware,isAuthenticated,updatePassword);

userRouter.put('/update-user-avatar',refreshTokenMiddleware,isAuthenticated,updateProfilePicture);

userRouter.get('/get-users',refreshTokenMiddleware,isAuthenticated,authorizeRoles("admin"),getAllUsers);

userRouter.put('/update-user',isAuthenticated,authorizeRoles("admin"),updateUserRole);

userRouter.delete('/delete-user/:id',refreshTokenMiddleware,isAuthenticated,authorizeRoles("admin"),deleteUser);



userRouter.get(
  "/top-spenders",
  refreshTokenMiddleware,
  isAuthenticated,
  authorizeRoles("admin"),
  getTopSpenders,
);

userRouter.get(
  "/user/most-active-users",
  refreshTokenMiddleware,
  isAuthenticated,
  authorizeRoles("admin"),
  getMostActiveUsers,
);

userRouter.get(
  "/user/recent-users",
  refreshTokenMiddleware,
  isAuthenticated,
  authorizeRoles("admin"),
  getRecentUsers,
);

userRouter.get(
  "/user/registrations-per-month",
  refreshTokenMiddleware,
  isAuthenticated,
  authorizeRoles("admin"),
  getRegistrationsPerMonth
);

userRouter.get("/user/:id/activity",isAuthenticated,authorizeRoles("admin"),getUserActivity)


userRouter.post("/manager-register-user", isAuthenticated, isAuthenticated,authorizeRoles("admin"), managerRegisterUser);








export default userRouter;