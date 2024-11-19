// hooks/useAuth.ts
"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { setCredentials, clearAuthState } from "@/store/auth/authSlice";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Type for user data
export interface User {
  name: string;
  email: string;
  auth_token: string;
}

// Hook for auth state
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.auth_token) {
            dispatch(
              setCredentials({
                user: parsedUser,
                token: storedToken,
              })
            );
          } else {
            dispatch(clearAuthState());
          }
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          dispatch(clearAuthState());
        }
      }
      setIsInitialized(true);
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    if (
      isInitialized &&
      authState.token &&
      (!authState.user || !authState.user.auth_token)
    ) {
      dispatch(clearAuthState());
    }
  }, [authState.token, authState.user, dispatch, isInitialized]);

  return isInitialized && !!authState.token && !!authState.user?.auth_token;
};

// Hook for accessing user data
export const useUser = () => {
  const user = useAppSelector((state) => state.auth.user);
  return user as User | null;
};
