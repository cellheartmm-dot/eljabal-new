import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { type PermissionsMatrix, getDefaultPermissionsForRole, FULL_ADMIN_PERMISSIONS } from "../lib/permissions";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  permissions?: PermissionsMatrix;
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
        const parsed = JSON.parse(stored);
        if (!parsed.permissions) {
          parsed.permissions = getDefaultPermissionsForRole(parsed.role || "admin");
        }
        setUser(parsed);
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
          permissions: FULL_ADMIN_PERMISSIONS,
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
      const isAdminUsername = username.toLowerCase() === "admin" || username === "مدير";
      let matchedName = isAdminUsername ? "مدير النظام" : username;
      let matchedRole = isAdminUsername ? "👑 مدير النظام (كامل الصلاحيات)" : "👷 مشرف موقع (حضور ومصروفات الموقع)";
      let matchedPermissions: PermissionsMatrix | undefined = undefined;
      let canRecordExpenses = true;
      let canRecordWorkerDaily = isAdminUsername;
      let canRecordSubcontractorDaily = isAdminUsername;

      try {
        // 1. Check Setting table system_users_list first
        const { data: sData } = await supabase.from("Setting").select("*").eq("key", "system_users_list").maybeSingle();
        let foundInSetting = false;

        if (sData && sData.value) {
          try {
            const list = JSON.parse(sData.value);
            if (Array.isArray(list)) {
              const found = list.find((u: any) => u.username === username || u.name?.trim() === username);
              if (found) {
                foundInSetting = true;
                matchedName = found.name || found.username;
                matchedRole = found.role || (isAdminUsername ? "👑 مدير النظام (كامل الصلاحيات)" : "👷 مشرف موقع (حضور ومصروفات الموقع)");
                matchedPermissions = found.permissions;
                canRecordExpenses = found.canRecordExpenses !== undefined ? found.canRecordExpenses : true;
                canRecordWorkerDaily = found.canRecordWorkerDaily !== undefined ? found.canRecordWorkerDaily : (matchedRole.includes("مدير") || isAdminUsername);
                canRecordSubcontractorDaily = found.canRecordSubcontractorDaily !== undefined ? found.canRecordSubcontractorDaily : (matchedRole.includes("مدير") || isAdminUsername);
              }
            }
          } catch (e) {}
        }

        if (!foundInSetting) {
          // 2. Check User table
          const { data: dbUser } = await supabase.from("User").select("*").eq("username", username).maybeSingle();
          if (dbUser) {
            const isAdm = dbUser.username === "admin" || dbUser.role === "admin" || (dbUser.role && dbUser.role.includes("مدير"));
            const isAcc = dbUser.role === "accountant" || (dbUser.role && dbUser.role.includes("محاسب"));
            matchedName = dbUser.name || (isAdm ? "مدير النظام" : dbUser.username);
            matchedRole = isAdm
              ? "👑 مدير النظام (كامل الصلاحيات)"
              : isAcc
              ? "💰 محاسب مالية (إيرادات ومصروفات)"
              : "👷 مشرف موقع (حضور ومصروفات الموقع)";
            canRecordExpenses = true;
            canRecordWorkerDaily = isAdm;
            canRecordSubcontractorDaily = isAdm;
          } else {
            // 3. Check Employee table for supervisor login
            const { data: empData } = await supabase.from("Employee").select("*");
            if (empData && empData.length > 0) {
              const foundEmp = empData.find(
                (e: any) =>
                  (e.name && e.name.trim().replace(/\s+/g, "_") === username) ||
                  (e.name && e.name.trim() === username) ||
                  (e.phone && e.phone === username) ||
                  (e.code && e.code === username)
              );
              if (foundEmp) {
                const isSup = (foundEmp.jobRole || "").includes("مشرف") || (foundEmp.jobRole || "").includes("مهندس");
                matchedName = foundEmp.name;
                matchedRole = isSup ? "👷 مشرف موقع (حضور ومصروفات الموقع)" : (foundEmp.jobRole || "موظف");
                canRecordExpenses = true;
                canRecordWorkerDaily = false;
                canRecordSubcontractorDaily = false;
              }
            }

            // 4. Check local storage
            const localList = localStorage.getItem("system_users_list");
            if (localList) {
              const list = JSON.parse(localList);
              const found = list.find((u: any) => u.username === username || u.name?.trim() === username);
              if (found) {
                matchedName = found.name || found.username;
                matchedRole = found.role || "👷 مشرف موقع";
                matchedPermissions = found.permissions;
                canRecordExpenses = found.canRecordExpenses !== undefined ? found.canRecordExpenses : true;
                canRecordWorkerDaily = found.canRecordWorkerDaily !== undefined ? found.canRecordWorkerDaily : (found.role.includes("مدير") ? true : false);
                canRecordSubcontractorDaily = found.canRecordSubcontractorDaily !== undefined ? found.canRecordSubcontractorDaily : (found.role.includes("مدير") ? true : false);
              }
            }
          }
        }
      } catch (e) {}

      if (isAdminUsername || matchedRole.includes("مدير") || matchedRole === "admin") {
        matchedRole = "👑 مدير النظام (كامل الصلاحيات)";
        matchedPermissions = FULL_ADMIN_PERMISSIONS;
        canRecordExpenses = true;
        canRecordWorkerDaily = true;
        canRecordSubcontractorDaily = true;
      }

      if (!matchedPermissions) {
        matchedPermissions = getDefaultPermissionsForRole(matchedRole);
      }

      const authUser: AuthUser = {
        id: "usr-" + username,
        username,
        name: matchedName,
        role: matchedRole,
        permissions: matchedPermissions,
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
