"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function ProjectsPage() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.projects || [];
      setProjects(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من إزالة مشروع "${name}" من النظام؟`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`تم حذف مشروع "${name}" بنجاح ✅`, "success");
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search Logic
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏗️ إدارة المشاريع</h1>
          <p className="page-subtitle">عرض وإضافة ومتابعة وإجراءات كافة مشاريع الشركة</p>
        </div>
        <Link href="/projects/create" className="btn btn-primary">
          + إضافة مشروع جديد
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div className="grid-2" style={{ gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "center" }}>
          {/* Search Box */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 بحث باسم المشروع، كود المشروع، أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">جميع الحالات (الكل)</option>
              <option value="جاري">جاري</option>
              <option value="مخطط">مخطط</option>
              <option value="منتهي">منتهي</option>
              <option value="متوقف">متوقف</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل المشاريع...</div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏗️</div>
              <div className="empty-state-text">
                {searchTerm || statusFilter !== "ALL" ? "لا توجد نتائج تطابق خيارات البحث والفلترة" : "لم يتم إضافة مشاريع حتى الآن"}
              </div>
              <Link href="/projects/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + إضافة أول مشروع
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: "center" }}>م.</th>
                  <th>الكود</th>
                  <th>اسم المشروع</th>
                  <th>العميل / الجهة</th>
                  <th>المصروفات</th>
                  <th>قيمة العقد</th>
                  <th>تاريخ البداية</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p, index) => {
                  const expensesSum = p.expenses
                    ? p.expenses.reduce((sum: number, item: any) => sum + item.amount, 0)
                    : 0;

                  return (
                    <tr key={p.id}>
                      {/* 1. Serial Number */}
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>
                        {index + 1}
                      </td>

                      {/* 2. Project Code */}
                      <td><span className="badge badge-primary">{p.code}</span></td>

                      {/* 3. Project Name */}
                      <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{p.name}</td>

                      {/* 4. Client */}
                      <td>{p.client || "-"}</td>

                      {/* 5. Total Expenses */}
                      <td className="text-danger" style={{ fontWeight: 800 }}>
                        {formatCurrency(expensesSum)}
                      </td>

                      {/* 6. Contract Value */}
                      <td className="text-gold" style={{ fontWeight: 800 }}>
                        {formatCurrency(p.value)}
                      </td>

                      {/* 7. Start Date */}
                      <td>{p.startDate ? formatDateShort(p.startDate) : "-"}</td>

                      {/* 8. Status Badge */}
                      <td>
                        <span
                          className={`badge ${
                            p.status === "جاري"
                              ? "badge-success"
                              : p.status === "منتهي"
                              ? "badge-info"
                              : p.status === "مخطط"
                              ? "badge-warning"
                              : "badge-danger"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* 9. Compact Icon-Only Actions Row (Perfect Center) */}
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                          {/* 👁️ View Project Profile */}
                          <Link
                            href={`/projects/${p.id}`}
                            className="btn-icon-centered"
                            title="عرض ملف المشروع الشامل"
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>👁️</span>
                          </Link>

                          {/* ✏️ Edit Project */}
                          <Link
                            href={`/projects/create?edit=${p.id}`}
                            className="btn-icon-centered"
                            title="تعديل بيانات المشروع"
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>✏️</span>
                          </Link>

                          {/* 💸 Add Project Expense */}
                          <Link
                            href={`/project-expenses/create?projectId=${p.id}`}
                            className="btn-icon-centered"
                            title="إضافة مصروف للمشروع"
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14, color: "#f87171" }}>💸</span>
                          </Link>

                          {/* 📑 Print Project Report */}
                          <Link
                            href={`/projects/${p.id}`}
                            className="btn-icon-centered"
                            title="استخراج تقرير مالي وموقعي"
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>📑</span>
                          </Link>

                          {/* 🗑️ Delete Project */}
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deletingId === p.id}
                            className="btn-icon-centered text-danger"
                            title="حذف المشروع"
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>
                              {deletingId === p.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
