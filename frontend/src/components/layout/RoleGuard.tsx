import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPermission, type AppModules } from "../../lib/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  moduleKey?: AppModules;
  action?: "view" | "add" | "edit" | "delete";
  allowedRoles?: ("admin" | "accountant" | "supervisor")[];
  requirePermission?: "canRecordExpenses" | "canRecordWorkerDaily" | "canRecordSubcontractorDaily";
}

export default function RoleGuard({
  children,
  moduleKey,
  action = "view",
  allowedRoles,
  requirePermission,
}: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="empty-state" style={{ minHeight: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#b91c1c" }}>يرجى تسجيل الدخول أولاً</h2>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const isAdmin = Boolean(
    user.username === "admin" || (user.role && (user.role.includes("مدير") || user.role === "admin"))
  );

  // Admin has access to all pages
  if (isAdmin) {
    return <>{children}</>;
  }

  // 1. If moduleKey is specified, check exact permissions matrix
  if (moduleKey) {
    const isAllowed = hasPermission(user, moduleKey, action);
    if (!isAllowed) {
      return (
        <div className="card" style={{ maxWidth: 650, margin: "60px auto", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 50, marginBottom: 14 }}>⛔</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#dc2626", marginBottom: 10 }}>
            عذراً، هذه الصفحة غير مصرح بها لحسابك
          </h2>
          <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            لم يتم منح حسابك صلاحية (
            {action === "view"
              ? "عرض هذا القسم"
              : action === "add"
              ? "إضافة بيانات جديدة"
              : action === "edit"
              ? "تعديل البيانات"
              : "حذف البيانات"}
            ) من قبل إدارة النظام.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link to="/" className="btn btn-primary" style={{ fontWeight: 800 }}>
              📊 العودة للوحة التحكم
            </Link>
            <Link to="/projects" className="btn btn-ghost">
              🏗️ عرض المشاريع المتاحة
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
