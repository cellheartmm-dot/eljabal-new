"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function ClaimPaymentsPage() {
  const params = useParams();
  const docId = params?.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Payment Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("نقداً");
  const [paidBy, setPaidBy] = useState("شركة الجبل");
  const [notes, setNotes] = useState("");

  const fetchDocData = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subcontractor-docs?id=${docId}`);
      const data = await res.json();
      if (data && !data.error) {
        setDoc(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocData();
  }, [docId]);

  const resetForm = () => {
    setAmount(doc ? (doc.remainingAmount > 0 ? doc.remainingAmount.toString() : "") : "");
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("نقداً");
    setPaidBy("شركة الجبل");
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (pay: any) => {
    setEditingPayment(pay);
    setAmount(pay.amount?.toString() || "");
    setDate(pay.date ? new Date(pay.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setMethod(pay.method || "نقداً");
    setPaidBy(pay.paidBy || pay.payer || "شركة الجبل");
    setNotes(pay.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !amount) return;

    setSubmitting(true);
    const newPaymentObj = {
      id: "pay-" + Date.now(),
      amount: parseFloat(amount) || 0,
      date: date || new Date().toISOString().split("T")[0],
      method,
      paidBy: paidBy || "شركة الجبل",
      notes,
    };

    const currentPayments = Array.isArray(doc.payments) ? doc.payments : [];
    const updatedPayments = [newPaymentObj, ...currentPayments];

    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          payments: updatedPayments,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchDocData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !editingPayment || !amount) return;

    setSubmitting(true);
    const currentPayments = Array.isArray(doc.payments) ? doc.payments : [];
    const updatedPayments = currentPayments.map((p: any) =>
      p.id === editingPayment.id
        ? {
            ...p,
            amount: parseFloat(amount) || 0,
            date,
            method,
            paidBy: paidBy || "شركة الجبل",
            notes,
          }
        : p
    );

    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          payments: updatedPayments,
        }),
      });

      if (res.ok) {
        setEditingPayment(null);
        resetForm();
        fetchDocData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (payId: string, payAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف الدفعة بقيمة (${formatCurrency(payAmount)})؟`)) return;

    const currentPayments = Array.isArray(doc.payments) ? doc.payments : [];
    const updatedPayments = currentPayments.filter((p: any) => p.id !== payId);

    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          payments: updatedPayments,
        }),
      });

      if (res.ok) {
        fetchDocData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📜 سجل دفعات المستخلص: ({doc?.docNo || "SC0001"})</h1>
          <p className="page-subtitle">
            المقاول: <strong>{doc?.subcontractorName || "مقاول باطن"}</strong> | المشروع: <strong>{doc?.projectName || "-"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل دفعة جديدة
          </button>
          <Link href={`/subcontractor-docs/${docId}/print`} className="btn btn-gold">
            🖨️ طباعة المستخلص
          </Link>
          <Link href="/subcontractor-docs" className="btn btn-ghost">
            ← العودة للمستخلصات
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي مبلغ المستخلص:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(doc?.totalAmount || 0)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>القيمة الكلية المعتمدة للمستخلص</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المدفوعات المسددة:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(doc?.paidAmount || 0)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع الدفعات المالية المسجلة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>المتبقي للمستخلص:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(doc?.remainingAmount || 0)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المبلغ المستحق المتبقي غير المسدد</div>
        </div>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل دفعات المستخلص...</div>
            </div>
          ) : !doc?.payments || doc.payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💵</div>
              <div className="empty-state-text">لم يتم تسجيل أي دفعات مسددة لهذا المستخلص بعد</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول دفعة
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>تاريخ الدفع</th>
                  <th>المبلغ المدفوع</th>
                  <th>طريقة الدفع</th>
                  <th>سلم بواسطة / الدافع</th>
                  <th>الملاحظات / التفاصيل</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {doc.payments.map((p: any, idx: number) => (
                  <tr key={p.id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(p.date)}</td>
                    <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(p.amount)}</td>
                    <td><span className="badge badge-info">{p.method || "نقداً"}</span></td>
                    <td style={{ fontWeight: 700 }}>{p.paidBy || p.payer || "شركة الجبل"}</td>
                    <td>{p.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(p)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeletePayment(p.id, p.amount)}
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

      {/* ADD / EDIT PAYMENT MODAL */}
      {(showModal || editingPayment) && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingPayment(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPayment ? "✏️ تعديل الدفعة المسددة" : "💵 تسجيل دفعة جديدة للمستخلص"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingPayment(null); }}>✕</button>
            </div>
            <form onSubmit={editingPayment ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المبلغ المدفوع (جنيه) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">تاريخ السداد *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة الدفع</label>
                    <select className="form-control" value={method} onChange={(e) => setMethod(e.target.value)}>
                      <option value="نقداً">نقداً</option>
                      <option value="شيك بانكي">شيك بانكي</option>
                      <option value="تحويل بانكي">تحويل بانكي</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">سلم المبلغ بواسطة / الدافع *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: م. أحمد / المحاسب محمد / شركة الجبل"
                    required
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الملاحظات والتفاصيل</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="رقم الشيك أو الحساب البانكي..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingPayment(null); }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ الدفعة والتأكيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
