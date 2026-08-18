"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function ProjectExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/project-expenses");
      const data = await res.json();
      if (Array.isArray(data)) setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من إزالة هذا المصروف بقيمة (${name})؟`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/project-expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("تم حذف المصروف بنجاح ✅", "success");
        fetchExpenses();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const projName = exp.project?.name || "";
    const projCode = exp.project?.code || "";
    const desc = exp.description || "";
    const type = exp.type || "";
    const search = searchTerm.toLowerCase();

    return (
      projName.toLowerCase().includes(search) ||
      projCode.toLowerCase().includes(search) ||
      desc.toLowerCase().includes(search) ||
      type.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💸 مصروفات المشاريع</h1>
          <p className="page-subtitle">تسجيل ومتابعة مواد وخامات ومصروفات المشاريع بالمستندات</p>
        </div>
        <Link href="/project-expenses/create" className="btn btn-primary">
          + تسجيل مصروف جديد
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 بحث باسم المشروع، كود المشروع، نوع المصروف، أو البيان..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل مصروفات المشاريع...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💸</div>
              <div className="empty-state-text">
                {searchTerm ? "لا توجد مصروفات تطابق نتائج البحث" : "لا توجد مصروفات مسجلة للمشاريع حتى الآن"}
              </div>
              <Link href="/project-expenses/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + تسجيل أول مصروف
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: "center" }}>م.</th>
                  <th>كود المشروع</th>
                  <th>اسم المشروع</th>
                  <th>نوع المصروف</th>
                  <th>القائم بالصرف (جهة التمويل)</th>
                  <th>البيان والملاحظات</th>
                  <th>المبلغ (جنيه)</th>
                  <th>تاريخ التسجيل</th>
                  <th style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, index) => {
                  const paidByText = e.paidBy || "شركة الجبل";
                  const isInvestor = paidByText.includes("المستثمر");
                  return (
                    <tr key={e.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>
                        {index + 1}
                      </td>
                      <td><span className="badge badge-primary">{e.project?.code || "-"}</span></td>
                      <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                        {e.project?.name || "مشروع عام"}
                      </td>
                      <td><span className="badge badge-info">{e.type}</span></td>
                      <td>
                        <span className={`badge ${isInvestor ? "badge-warning" : "badge-secondary"}`} style={{ fontWeight: 700 }}>
                          {isInvestor ? "💼 " + paidByText : "🏢 " + paidByText}
                        </span>
                      </td>
                      <td>{e.statement || e.description || "-"}</td>
                      <td className="text-danger" style={{ fontWeight: 800 }}>
                        {formatCurrency(e.amount)}
                      </td>
                      <td>{e.createdAt ? formatDateShort(e.createdAt) : "-"}</td>
                    
                    {/* Actions Column */}
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                        {/* ✏️ Edit */}
                        <Link
                          href={`/project-expenses/create?edit=${e.id}`}
                          className="btn-icon-centered"
                          title="تعديل بيانات المصروف"
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>✏️</span>
                        </Link>

                        {/* 🖨️ Print Receipt */}
                        <button
                          onClick={() => window.print()}
                          className="btn-icon-centered"
                          title="طباعة إيصال المصروف"
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>🖨️</span>
                        </button>

                        {/* 🗑️ Delete */}
                        <button
                          onClick={() => handleDelete(e.id, formatCurrency(e.amount))}
                          disabled={deletingId === e.id}
                          className="btn-icon-centered text-danger"
                          title="حذف المصروف"
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", lineHeight: 1, fontSize: 14 }}>
                            {deletingId === e.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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
