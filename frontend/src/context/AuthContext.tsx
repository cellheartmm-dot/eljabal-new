import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  canRecordExpenses?: boolean;
  canRecordWorkerDaily?: boolean;
  canRecordSubcontractorDaily?: boolean;
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
          role: "👑 مدير النظام (كامل الصلاحيات)",
          canRecordExpenses: true,
          canRecordWorkerDaily: true,
          canRecordSubcontractorDaily: true,
        };
        localStorage.setItem("eljabal_user", JSON.stringify(authUser));
        localStorage.setItem("eljabal_token", data.session?.access_token || "authenticated");
        setUser(authUser);
        return;
      }
    }

    if (username && password) {
      // Find matching user in Supabase or local users list
      let matchedName = username;
      let matchedRole = "👑 مدير النظام (كامل الصلاحيات)";
      let canRecordExpenses = true;
      let canRecordWorkerDaily = username === "admin";
      let canRecordSubcontractorDaily = username === "admin";

      try {
        const { data: dbUser } = await supabase.from("User").select("*").eq("username", username).single();
        if (dbUser) {
          matchedName = dbUser.username || username;
          matchedRole = dbUser.notes || "👷 مشرف موقع";

          if (dbUser.notes && dbUser.notes.includes("[meta:")) {
            const nameMatch = dbUser.notes.match(/name=([^\|\]]+)/);
            if (nameMatch) matchedName = decodeURIComponent(nameMatch[1]);
            const roleMatch = dbUser.notes.match(/role=([^\|\]]+)/);
            if (roleMatch) matchedRole = decodeURIComponent(roleMatch[1]);

            const canExpMatch = dbUser.notes.match(/canExpenses=([01])/);
            if (canExpMatch) canRecordExpenses = canExpMatch[1] === "1";
            const canWorkMatch = dbUser.notes.match(/canWorkerDaily=([01])/);
            if (canWorkMatch) canRecordWorkerDaily = canWorkMatch[1] === "1";
            const canSubMatch = dbUser.notes.match(/canSubDaily=([01])/);
            if (canSubMatch) canRecordSubcontractorDaily = canSubMatch[1] === "1";
          }
        } else {
          // Check local list
          const localList = localStorage.getItem("system_users_list");
          if (localList) {
            const list = JSON.parse(localList);
            const found = list.find((u: any) => u.username === username);
            if (found) {
              matchedName = found.name || found.username;
              matchedRole = found.role || "👷 مشرف موقع";
              canRecordExpenses = found.canRecordExpenses !== undefined ? found.canRecordExpenses : true;
              canRecordWorkerDaily = found.canRecordWorkerDaily !== undefined ? found.canRecordWorkerDaily : (found.role.includes("مدير") ? true : false);
              canRecordSubcontractorDaily = found.canRecordSubcontractorDaily !== undefined ? found.canRecordSubcontractorDaily : (found.role.includes("مدير") ? true : false);
            }
          }
        }
      } catch (e) {}

      if (username === "admin" || matchedRole.includes("مدير")) {
        canRecordExpenses = true;
        canRecordWorkerDaily = true;
        canRecordSubcontractorDaily = true;
      }

      const authUser: AuthUser = {
        id: "usr-" + username,
        username,
        name: matchedName,
        role: matchedRole,
        canRecordExpenses,
        canRecordWorkerDaily,
        canRecordSubcontractorDaily,
      };

      localStorage.setItem("eljabal_user", JSON.stringify(authUser));
      localStorage.setItem("eljabal_token", "authenticated");
      setUser(authUser);
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
