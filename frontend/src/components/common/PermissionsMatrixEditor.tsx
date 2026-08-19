import React from "react";
import {
  type PermissionsMatrix,
  MODULES_CONFIG,
  type AppModules,
  getDefaultPermissionsForRole,
  FULL_ADMIN_PERMISSIONS,
  EMPTY_PERMISSIONS,
} from "../../lib/permissions";

interface PermissionsMatrixEditorProps {
  value: PermissionsMatrix;
  onChange: (newPermissions: PermissionsMatrix) => void;
  selectedRole?: string;
  onRoleTemplateChange?: (roleName: string) => void;
}

export default function PermissionsMatrixEditor({
  value,
  onChange,
  selectedRole,
  onRoleTemplateChange,
}: PermissionsMatrixEditorProps) {
  const currentPermissions = value || EMPTY_PERMISSIONS;

  // Toggle single action for a specific module
  const handleToggle = (moduleKey: AppModules, action: "view" | "add" | "edit" | "delete") => {
    const updated = JSON.parse(JSON.stringify(currentPermissions)) as PermissionsMatrix;
    if (!updated[moduleKey]) {
      updated[moduleKey] = { view: false, add: false, edit: false, delete: false };
    }

    const currentVal = Boolean(updated[moduleKey][action]);
    const nextVal = !currentVal;
    updated[moduleKey][action] = nextVal;

    // If viewing is turned off, automatically turn off add/edit/delete
    if (action === "view" && !nextVal) {
      updated[moduleKey].add = false;
      updated[moduleKey].edit = false;
      updated[moduleKey].delete = false;
    }

    // If add/edit/delete is turned on, automatically turn on view
    if (action !== "view" && nextVal) {
      updated[moduleKey].view = true;
    }

    onChange(updated);
  };

  // Toggle entire row for a module
  const handleToggleRow = (moduleKey: AppModules) => {
    const updated = JSON.parse(JSON.stringify(currentPermissions)) as PermissionsMatrix;
    const cur = updated[moduleKey] || { view: false, add: false, edit: false, delete: false };
    const allChecked = cur.view && cur.add && cur.edit && cur.delete;

    updated[moduleKey] = {
      view: !allChecked,
      add: !allChecked,
      edit: !allChecked,
      delete: !allChecked,
    };

    onChange(updated);
  };

  // Quick preset buttons
  const handleSelectAll = () => {
    onChange(JSON.parse(JSON.stringify(FULL_ADMIN_PERMISSIONS)));
  };

  const handleClearAll = () => {
    onChange(JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)));
  };

  const handleViewOnlyAll = () => {
    const viewOnly: PermissionsMatrix = JSON.parse(JSON.stringify(EMPTY_PERMISSIONS));
    MODULES_CONFIG.forEach((m) => {
      viewOnly[m.key] = { view: true, add: false, edit: false, delete: false };
    });
    onChange(viewOnly);
  };

  const applyTemplate = (roleTemplate: string) => {
    onRoleTemplateChange?.(roleTemplate);
    const templatePerms = getDefaultPermissionsForRole(roleTemplate);
    onChange(templatePerms);
  };

  return (
    <div style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 12, overflow: "hidden" }}>
      {/* HEADER & QUICK ACTIONS */}
      <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1.5px solid #e2e8f0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔐</span>
              <span>مصفوفة الصلاحيات التفصيلية (Permissions Matrix)</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              تحكم بدقة متناهية في صلاحيات العرض، الإضافة، التعديل، والحذف لكل قسم وصفحة على حدة.
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={handleSelectAll}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, fontWeight: 800, color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "4px 8px" }}
              title="تفعيل كافة الصلاحيات لكل الأقسام"
            >
              ✅ تحديد الكل
            </button>
            <button
              type="button"
              onClick={handleViewOnlyAll}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", background: "#dbeafe", border: "1px solid #93c5fd", padding: "4px 8px" }}
              title="تفعيل صلاحية القراءة والعرض فقط لجميع الصفحات"
            >
              👁️ عرض فقط
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, fontWeight: 800, color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", padding: "4px 8px" }}
              title="إلغاء وحجب جميع الصلاحيات"
            >
              ❌ تفريغ الكل
            </button>
          </div>
        </div>

        {/* Preset Templates Selector */}
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>قوالب جاهزة سريعة:</span>
          {[
            { label: "👑 مدير كامل", role: "مدير النظام" },
            { label: "💰 محاسب مالي", role: "محاسب مالية" },
            { label: "👷 مشرف موقع", role: "مشرف موقع" },
            { label: "📐 مهندس حصر", role: "مهندس حصر ومكتب فني" },
            { label: "👥 شؤون HR", role: "مسؤول شؤون عاملين" },
            { label: "👀 قراءة فقط", role: "قراءة فقط" },
          ].map((tpl) => (
            <button
              key={tpl.role}
              type="button"
              onClick={() => applyTemplate(tpl.role)}
              className="btn btn-ghost btn-sm"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 6,
                background: selectedRole?.includes(tpl.role) ? "#0284c7" : "#ffffff",
                color: selectedRole?.includes(tpl.role) ? "#ffffff" : "#334155",
                border: "1px solid #cbd5e1",
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div style={{ maxHeight: 380, overflowY: "auto", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 540, borderCollapse: "collapse", fontSize: 12, textAlign: "right" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 2, borderBottom: "1.5px solid #cbd5e1" }}>
              <th style={{ padding: "8px 12px", color: "#334155", fontWeight: 800 }}>القسم / الصفحة</th>
              <th style={{ padding: "8px 6px", textAlign: "center", color: "#1e40af", fontWeight: 800, width: 70 }}>
                👁️ عرض
              </th>
              <th style={{ padding: "8px 6px", textAlign: "center", color: "#166534", fontWeight: 800, width: 70 }}>
                ➕ إضافة
              </th>
              <th style={{ padding: "8px 6px", textAlign: "center", color: "#b45309", fontWeight: 800, width: 70 }}>
                ✏️ تعديل
              </th>
              <th style={{ padding: "8px 6px", textAlign: "center", color: "#b91c1c", fontWeight: 800, width: 70 }}>
                🗑️ حذف
              </th>
              <th style={{ padding: "8px 8px", textAlign: "center", color: "#475569", fontWeight: 800, width: 75 }}>
                تحديد
              </th>
            </tr>
          </thead>
          <tbody>
            {MODULES_CONFIG.map((mod, idx) => {
              const p = currentPermissions[mod.key] || { view: false, add: false, edit: false, delete: false };
              const isAll = p.view && p.add && p.edit && p.delete;
              const isNone = !p.view && !p.add && !p.edit && !p.delete;

              return (
                <tr
                  key={mod.key}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{mod.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{mod.label}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{mod.description}</div>
                      </div>
                    </div>
                  </td>

                  {/* VIEW CHECKBOX */}
                  <td style={{ textAlign: "center", padding: "6px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(p.view)}
                      onChange={() => handleToggle(mod.key, "view")}
                      style={{ width: 18, height: 18, accentColor: "#2563eb", cursor: "pointer" }}
                    />
                  </td>

                  {/* ADD CHECKBOX */}
                  <td style={{ textAlign: "center", padding: "6px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(p.add)}
                      onChange={() => handleToggle(mod.key, "add")}
                      style={{ width: 18, height: 18, accentColor: "#16a34a", cursor: "pointer" }}
                    />
                  </td>

                  {/* EDIT CHECKBOX */}
                  <td style={{ textAlign: "center", padding: "6px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(p.edit)}
                      onChange={() => handleToggle(mod.key, "edit")}
                      style={{ width: 18, height: 18, accentColor: "#d97706", cursor: "pointer" }}
                    />
                  </td>

                  {/* DELETE CHECKBOX */}
                  <td style={{ textAlign: "center", padding: "6px" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(p.delete)}
                      onChange={() => handleToggle(mod.key, "delete")}
                      style={{ width: 18, height: 18, accentColor: "#dc2626", cursor: "pointer" }}
                    />
                  </td>

                  {/* ROW ALL TOGGLE */}
                  <td style={{ textAlign: "center", padding: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleRow(mod.key)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: "2px 6px",
                        fontSize: 10,
                        fontWeight: 700,
                        background: isAll ? "#dcfce7" : isNone ? "#f1f5f9" : "#e0f2fe",
                        color: isAll ? "#15803d" : isNone ? "#64748b" : "#0369a1",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {isAll ? "كامل ✅" : isNone ? "معطل ❌" : "مخصص ⚙️"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
