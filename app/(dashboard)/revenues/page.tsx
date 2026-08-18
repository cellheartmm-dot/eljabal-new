"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function RevenuesPage() {
  const [revenues, setRevenues] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjFilter, setSelectedProjFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRev, setEditingRev] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states matching explicit user prompt:
  // التاريخ (07/28/2026)
  // المشروع (اختيارى) - بدون مشروع
  // نوع الإيراد * - اختر
  // طريقة الدفع - نقدى
  // البيان
  // المبلغ *
  // ملاحظات
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Revenues
      const rRes = await fetch("/api/revenues");
      const rData = await rRes.json();
      if (Array.isArray(rData)) setRevenues(rData);

      // 2. Fetch Projects dropdown
      const pRes = await fetch("/api/projects");
      const pData = await pRes.json();
      const pList = Array.isArray(pData) ? pData : pData?.projects || [];
      setProjects(pList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setProjectId("");
    setType("");
    setPaymentMethod("نقدي");
    setDescription("");
    setAmount("");
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (rev: any) => {
    setEditingRev(rev);
    setDate(rev.date ? new Date(rev.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setProjectId(rev.projectId || "");
    setType(rev.type || "مستخلص أعمال");
    setPaymentMethod(rev.paymentMethod || "نقدي");
    setDescription(rev.description || "");
    setAmount(rev.amount?.toString() || "");
    setNotes(rev.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !amount) return;

    const targetProj = projects.find((p) => p.id === projectId);
    const projNameText = targetProj ? targetProj.name : "بدون مشروع";

    setSubmitting(true);
    try {
      const res = await fetch("/api/revenues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          projectId: projectId || null,
          projectName: projNameText,
          type,
          paymentMethod,
          description: description || `إيراد ${type}`,
          amount,
          notes,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRev || !type || !amount) return;

    const targetProj = projects.find((p) => p.id === projectId);
    const projNameText = targetProj ? targetProj.name : "بدون مشروع";

    setSubmitting(true);
    try {
      const res = await fetch("/api/revenues", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRev.id,
          date,
          projectId: projectId || null,
          projectName: projNameText,
          type,
          paymentMethod,
          description: description || editingRev.description,
          amount,
          notes,
        }),
      });

      if (res.ok) {
        setEditingRev(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (revId: string, revAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف الإيراد بقيمة (${formatCurrency(revAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/revenues?id=${revId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Revenues
  const filteredRevenues = revenues.filter((rev) => {
    const search = searchTerm.toLowerCase();
    const projName = rev.projectName || "";
    const desc = rev.description || "";
    const typeVal = rev.type || "";
    const notesVal = rev.notes || "";

    const matchSearch =
      !search ||
      projName.toLowerCase().includes(search) ||
      desc.toLowerCase().includes(search) ||
      typeVal.toLowerCase().includes(search) ||
      notesVal.toLowerCase().includes(search);

    if (!matchSearch) return false;
    if (selectedProjFilter === "none" && rev.projectId) return false;
    if (selectedProjFilter && selectedProjFilter !== "none" && rev.projectId !== selectedProjFilter) return false;
    if (typeFilter && rev.type !== typeFilter) return false;

    return true;
  });

  const totalRevenuesVal = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📈 الإيرادات والدفعات الواردة</h1>
          <p className="page-subtitle">تسجيل وتتبع كافة المقبوضات والدفعات الواردة وإيرادات المشاريع والشركة</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة دفعة/إيراد
          </button>
          <Link href="/revenues/create" className="btn btn-gold">
            📝 صفحة إدخال إيراد
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي الإيرادات المقبوضة:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalRevenuesVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع المبالغ المسددة والمقبوضة بالنظام</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>عدد المقبوضات:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{filteredRevenues.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>إجمالي عدد دفعات الإيراد المسجلة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>متوسط قيمة الدفعة:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>
            {formatCurrency(filteredRevenues.length > 0 ? totalRevenuesVal / filteredRevenues.length : 0)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>متوسط الدفعة الواردة الفردية</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR (Side-by-Side Row) */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 230px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث بالبيان، اسم المشروع، أو نوع الإيراد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🏢 فلتر المشروع</label>
            <select
              className="form-control"
              value={selectedProjFilter}
              onChange={(e) => setSelectedProjFilter(e.target.value)}
            >
              <option value="">-- جميع المشاريع --</option>
              <option value="none">بدون مشروع</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 170px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>📈 فلتر نوع الإيراد</label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">جميع الأنواع</option>
              <option value="مستخلص أعمال">مستخلص أعمال</option>
              <option value="دفعة مقدمة">دفعة مقدمة</option>
              <option value="استرداد تأمينات">استرداد تأمينات</option>
              <option value="بيع خامات/تخريد">بيع خامات/تخريد</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجلات الإيرادات...</div>
            </div>
          ) : filteredRevenues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <div className="empty-state-text">
                {searchTerm || selectedProjFilter || typeFilter ? "لا توجد إيرادات تتماشى مع فلاتر والبحث المحددة" : "لا توجد إيرادات مسجلة حالياً"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول دفعة إيراد
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>المشروع</th>
                  <th>نوع الإيراد</th>
                  <th>طريقة الدفع</th>
                  <th>البيان / التفاصيل</th>
                  <th>المبلغ المقبوض</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenues.map((rev, idx) => (
                  <tr key={rev.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(rev.date)}</td>
                    <td style={{ fontWeight: 700 }}>
                      <span className={`badge ${rev.projectId ? "badge-info" : "badge-ghost"}`}>
                        {rev.projectName || "بدون مشروع"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--gold))" }}>{rev.type}</td>
                    <td><span className="badge badge-success">{rev.paymentMethod || "نقدي"}</span></td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{rev.description || "-"}</td>
                    <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(rev.amount)}</td>
                    <td>{rev.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(rev)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDelete(rev.id, rev.amount)}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD / EDIT REVENUE MODAL */}
      {(showModal || editingRev) && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingRev(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingRev ? "✏️ تعديل بيانات الإيراد" : "📈 تسجيل إيراد / دفعة واردة جديدة"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingRev(null); }}>✕</button>
            </div>
            <form onSubmit={editingRev ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-body">
                {/* 1. التاريخ */}
                <div className="form-group">
                  <label className="form-label">التاريخ *</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* 2. المشروع (اختياري) */}
                <div className="form-group">
                  <label className="form-label">المشروع (اختياري)</label>
                  <select
                    className="form-control"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">بدون مشروع</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. نوع الإيراد * + 4. طريقة الدفع */}
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع الإيراد *</label>
                    <select
                      className="form-control"
                      required
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="" disabled>اختر نوع الإيراد</option>
                      <option value="مستخلص أعمال">مستخلص أعمال</option>
                      <option value="دفعة مقدمة">دفعة مقدمة</option>
                      <option value="استرداد تأمينات">استرداد تأمينات</option>
                      <option value="بيع خامات/تخريد">بيع خامات/تخريد</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة الدفع</label>
                    <select
                      className="form-control"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="نقدي">نقدي</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                    </select>
                  </div>
                </div>

                {/* 5. البيان */}
                <div className="form-group">
                  <label className="form-label">البيان</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="شرح الإيراد أو تفاصيل المستخلص..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* 6. المبلغ * */}
                <div className="form-group">
                  <label className="form-label">المبلغ *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {/* 7. ملاحظات */}
                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أي ملاحظات إضافية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingRev(null); }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ الإيراد والتأكيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
