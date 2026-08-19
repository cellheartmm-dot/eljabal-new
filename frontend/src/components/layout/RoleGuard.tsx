import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "accountant" | "supervisor")[];
  requirePermission?: "canRecordExpenses" | "canRecordWorkerDaily" | "canRecordSubcontractorDaily";
}

export default function RoleGuard({ children, allowedRoles, requirePermission }: RoleGuardProps) {
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
  const isAccountant = Boolean(
    !isAdmin && user.role && (user.role.includes("محاسب") || user.role === "accountant")
  );
  const isSupervisor = Boolean(
    !isAdmin && !isAccountant && (user.role && (user.role.includes("مشرف") || user.role === "supervisor" || user.role.includes("مهندس") || user.role.includes("ميداني")))
  );

  // Admin has access to all pages
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check role restrictions
  if (allowedRoles && allowedRoles.length > 0) {
    let roleAllowed = false;
    if (allowedRoles.includes("admin") && isAdmin) roleAllowed = true;
    if (allowedRoles.includes("accountant") && isAccountant) roleAllowed = true;
    if (allowedRoles.includes("supervisor") && isSupervisor) roleAllowed = true;

    if (!roleAllowed) {
      return (
        <div className="card" style={{ maxWidth: 650, margin: "60px auto", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 50, marginBottom: 14 }}>⛔</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#dc2626", marginBottom: 10 }}>
            عذراً، هذه الصفحة غير مصرح بها لحساب المشرف
          </h2>
          <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            هذا القسم مخصص لإدارة الحسابات المالية أو مدير النظام فقط، ولا يملك حساب المشرف الحالي صلاحية الوصول إليه.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link to="/" className="btn btn-primary" style={{ fontWeight: 800 }}>
              📊 العودة للوحة التحكم
            </Link>
            <Link to="/projects" className="btn btn-ghost">
              🏗️ عرض المشاريع الميدانية
            </Link>
          </div>
        </div>
      );
    }
  }

  // Check specific granular permission for supervisors
  if (isSupervisor && requirePermission) {
    const hasPerm = Boolean(user[requirePermission]);
    if (!hasPerm) {
      return (
        <div className="card" style={{ maxWidth: 650, margin: "60px auto", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 50, marginBottom: 14 }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#d97706", marginBottom: 10 }}>
            الصلاحية الميدانية غير مفعلة لهذا الحساب
          </h2>
          <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            لم يتم تفعيل صلاحية (
            {requirePermission === "canRecordExpenses"
              ? "تسجيل مصروفات الموقع"
              : requirePermission === "canRecordWorkerDaily"
              ? "تسجيل يوميات وحضور العمال"
              : "تسجيل يوميات وأطقم مقاولي الباطن"}
            ) لهذا المشرف من قبل إدارة النظام.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link to="/" className="btn btn-primary" style={{ fontWeight: 800 }}>
              📊 العودة للوحة التحكم
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
