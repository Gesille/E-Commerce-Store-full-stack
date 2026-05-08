import { createSlice} from "@reduxjs/toolkit";

const initialState = {
  token: "",
  user: "",
  
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userRegistration: (state, action) => {
      state.token = action.payload.token;
    },
    userLoggedIn: (state, action) => {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
    },
    userLoggedOut: (state) => {
      state.token = "";
      state.user = "";
    },
    setCredentials: (state, action) => {
      state.token = action.payload.token; 
    }
    
  },
});

export const { userRegistration, userLoggedIn, userLoggedOut,setCredentials } =
  authSlice.actions;

  export default authSlice.reducer;