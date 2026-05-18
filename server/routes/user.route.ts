import express from 'express';
import { activateUser, deleteUser, getAllUsers, getMostActiveUsers, getRecentUsers, getRegistrationsPerMonth, getTopSpenders, getUserActivity, getUserInfo, loginUser, logoutUser, managerRegisterUser, registrationUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole } from '../controllers/user.controller.js';
import { authorizeRoles, isAuthenticated } from '../middleware/auth.js';


const userRouter = express.Router();

userRouter.post('/registration' , registrationUser);

userRouter.post('/activation',activateUser);

userRouter.post('/login',loginUser);

userRouter.get('/logout',isAuthenticated,logoutUser);

userRouter.get('/refresh-token',updateAccessToken);

userRouter.get('/get-user-info',updateAccessToken,isAuthenticated,getUserInfo);

userRouter.post('/social-auth',socialAuth);

userRouter.put('/update-user-info',updateAccessToken,isAuthenticated,updateUserInfo);

userRouter.put('/update-user-pass',updateAccessToken,isAuthenticated,updatePassword);

userRouter.put('/update-user-avatar',updateAccessToken,isAuthenticated,updateProfilePicture);

userRouter.get('/get-users',updateAccessToken,isAuthenticated,authorizeRoles("admin"),getAllUsers);

userRouter.put('/update-user',isAuthenticated,authorizeRoles("admin"),updateUserRole);

userRouter.delete('/delete-user/:id',updateAccessToken,isAuthenticated,authorizeRoles("admin"),deleteUser);
console.log(userRouter.stack);


userRouter.get(
  "/top-spenders",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getTopSpenders,
);

userRouter.get(
  "/user/most-active-users",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getMostActiveUsers,
);

userRouter.get(
  "/user/recent-users",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getRecentUsers,
);

userRouter.get(
  "/user/registrations-per-month",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getRegistrationsPerMonth
);

userRouter.get("/user/:id/activity",isAuthenticated,authorizeRoles("admin"),getUserActivity)


userRouter.post("/manager-register-user", isAuthenticated, isAuthenticated,authorizeRoles("admin"), managerRegisterUser);








export default userRouter;