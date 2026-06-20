import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export type AuthValue = { user: User; isAdmin: boolean } | null;
export type AuthState = { value: AuthValue; ready: boolean };

export const AuthCtx = createContext<AuthState>({ value: null, ready: false });

export function useAuthCtx() {
  const { value, ready } = useContext(AuthCtx);
  if (!ready || !value) {
    return { user: null as unknown as User, isAdmin: false };
  }
  return value;
}

export function useAuthReady() {
  return useContext(AuthCtx).ready;
}
