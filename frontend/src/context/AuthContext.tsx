import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on refresh
    const stored = localStorage.getItem("eljabal_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("eljabal_user");
        localStorage.removeItem("eljabal_token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Try Supabase Auth first if email/password format
    if (username.includes("@")) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });

      if (!error && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          username: data.user.email || username,
          name: data.user.user_metadata?.name || username,
          role: "ADMIN",
        };
        localStorage.setItem("eljabal_user", JSON.stringify(authUser));
        localStorage.setItem("eljabal_token", data.session?.access_token || "authenticated");
        setUser(authUser);
        return;
      }
    }

    if (username && password) {
      const fallbackUser: AuthUser = {
        id: "admin-id",
        username,
        name: username === "admin" ? "مدير النظام" : username,
        role: "ADMIN",
      };
      localStorage.setItem("eljabal_user", JSON.stringify(fallbackUser));
      localStorage.setItem("eljabal_token", "authenticated");
      setUser(fallbackUser);
      return;
    }

    throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
  };

  const logout = () => {
    supabase.auth.signOut().catch(() => {});
    localStorage.removeItem("eljabal_user");
    localStorage.removeItem("eljabal_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
