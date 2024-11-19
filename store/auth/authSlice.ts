import api from "@/services/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

interface AuthState {
  user: { name: string; email: string; auth_token: string } | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: any; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    clearAuthState: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});

export const { setCredentials, clearAuthState } = authSlice.actions;

export const logout = () => async (dispatch: any) => {
  try {
    // Call the logout API
    await api.post("/auth/logout");
    // Clear the Redux state and localStorage
    dispatch(clearAuthState());
  } catch (error) {
    console.error("Failed to log out:", error);
    // Optionally handle any errors here, like showing an error message
  }
};

export default authSlice.reducer;
