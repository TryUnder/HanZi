import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthResult {
  readonly error: string | null;
}

export interface AuthContextValue {
  readonly user: User | null;
  readonly session: Session | null;
  readonly isLoading: boolean;
  readonly signIn: (email: string, password: string) => Promise<AuthResult>;
  readonly signOut: () => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
