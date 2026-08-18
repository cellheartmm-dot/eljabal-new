"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

interface ClaimItem {
  id: string;
  itemDesc: string;
  modelName?: string;
  buildingNo: string;
  floorNo?: string;
  unit: string;
  totalQty: number;
  execPercent: number;
  execQty: number;
  unitPrice: number;
  rowTotal: number;
}

function getNextDocNo(docsList: any[]) {
  let maxNum = 0;
  docsList.forEach((d) => {
    const code = d.docNo || "";
    const match = code.match(/SC(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `SC${String(nextNum).padStart(4, "0")}`;
}

export default function SubcontractorDocsPage() {
  const params = useParams();
  const subId = params?.id as string;

  const [subcontractor, setSubcontractor] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Claim Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Pay Modal states
  const [payDoc, setPayDoc] = useState<any>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payDateInput, setPayDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [payMethodInput, setPayMethodInput] = useState("نقداً");
  const [payPayerInput, setPayPayerInput] = useState("شركة الجبل");
  const [payNotesInput, setPayNotesInput] = useState("");

  // Form states
  const [docNo, setDocNo] = useState("SC0001");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("مستخلص");
  const [status, setStatus] = useState("مدفوع");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [notes, setNotes] = useState("");

  // Items table state
  const [items, setItems] = useState<ClaimItem[]>([
    {
      id: "item-1",
      itemDesc: "",
      modelName: "",
      buildingNo: "",
      floorNo: "",
      unit: "م²",
      totalQty: 0,
      execPercent: 100,
      execQty: 0,
      unitPrice: 0,
      rowTotal: 0,
    },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Subcontractor Info
      const sRes = await fetch("/api/subcontractors");
      const sData = await sRes.json();
      if (Array.isArray(sData)) {
        const found = sData.find((item: any) => item.id === subId);
        if (found) setSubcontractor(found);
      }

      // 2. Fetch Subcontractor Docs
      const dRes = await fetch(`/api/subcontractor-docs?subcontractorId=${subId}`);
      const dData = await dRes.json();
      if (Array.isArray(dData)) setDocs(dData);

      // 3. Fetch Projects for dropdown
      const pRes = await fetch("/api/projects");
      const pData = await pRes.json();
      const pList = Array.isArray(pData) ? pData : pData?.projects || [];
      setProjects(pList);
      if (pList.length > 0 && !projectId) {
        setProjectId(pList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subId) fetchData();
  }, [subId]);

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        id: "item-" + Date.now() + Math.random(),
        itemDesc: "",
        modelName: "",
        buildingNo: "",
        floorNo: "",
        unit: "م²",
        totalQty: 0,
        execPercent: 100,
        execQty: 0,
        unitPrice: 0,
        rowTotal: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof ClaimItem, value: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    if (field === "totalQty" || field === "execPercent" || field === "unitPrice") {
      const total = parseFloat(row.totalQty as any) || 0;
      const pct = parseFloat(row.execPercent as any) || 0;
      const price = parseFloat(row.unitPrice as any) || 0;

      const calcExecQty = total * (pct / 100);
      row.execQty = Math.round(calcExecQty * 100) / 100;
      row.rowTotal = Math.round(row.execQty * price * 100) / 100;
    }

    updated[index] = row;
    setItems(updated);
  };

  const grandTotal = items.reduce((acc, row) => acc + (row.rowTotal || 0), 0);

  const resetForm = () => {
    setDocNo(getNextDocNo(docs));
    setProjectId(projects.length > 0 ? projects[0].id : "");
    setType("مستخلص");
    setStatus("مدفوع");
    setDate(new Date().toISOString().split("T")[0]);
    setPeriodFrom("");
    setPeriodTo("");
    setNotes("");
    setItems([
      {
        id: "item-1",
        itemDesc: "",
        buildingNo: "",
        unit: "م²",
        totalQty: 0,
        execPercent: 100,
        execQty: 0,
        unitPrice: 0,
        rowTotal: 0,
      },
    ]);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (d: any) => {
    setEditingDoc(d);
    setDocNo(d.docNo || getNextDocNo(docs));
    setProjectId(d.projectId || (projects.length > 0 ? projects[0].id : ""));
    setType(d.type || "مستخلص");
    setStatus(d.status || "مدفوع");
    setDate(d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setPeriodFrom(d.periodFrom || "");
    setPeriodTo(d.periodTo || "");
    setNotes(d.notes || "");
    setItems(
      d.items && d.items.length > 0
        ? d.items
        : [
            {
              id: "item-1",
              itemDesc: d.description || "",
              buildingNo: "",
              unit: "م²",
              totalQty: 1,
              execPercent: 100,
              execQty: 1,
              unitPrice: d.amount || 0,
              rowTotal: d.amount || 0,
            },
          ]
    );
  };

  const handleOpenQuickPay = (d: any) => {
    setPayDoc(d);
    setPayAmountInput(d.remainingAmount > 0 ? d.remainingAmount.toString() : (d.totalAmount || d.amount).toString());
    setPayDateInput(new Date().toISOString().split("T")[0]);
    setPayMethodInput("نقداً");
    setPayPayerInput("شركة الجبل");
    setPayNotesInput(`سداد دفعة للمستخلص رقم ${d.docNo || ""}`);
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDoc || !payAmountInput) return;

    setSubmitting(true);
    const newPaymentObj = {
      id: "pay-" + Date.now(),
      amount: parseFloat(payAmountInput) || 0,
      date: payDateInput || new Date().toISOString().split("T")[0],
      method: payMethodInput,
      paidBy: payPayerInput || "شركة الجبل",
      notes: payNotesInput,
    };

    const currentPayments = Array.isArray(payDoc.payments) ? payDoc.payments : [];
    const updatedPayments = [newPaymentObj, ...currentPayments];

    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payDoc.id,
          payments: updatedPayments,
        }),
      });

      if (res.ok) {
        setPayDoc(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const descText = items.map((i) => i.itemDesc).filter(Boolean).join(" - ") || `مستخلص رقم ${docNo}`;
    const finalAmount = grandTotal > 0 ? grandTotal : 0;
    const targetProj = projects.find((p) => p.id === projectId);

    setSubmitting(true);
    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNo,
          subcontractorId: subId,
          subcontractorName: subcontractor ? subcontractor.name : "",
          projectId: projectId || null,
          projectName: targetProj ? targetProj.name : "",
          type,
          description: descText,
          amount: finalAmount,
          status,
          date,
          periodFrom,
          periodTo,
          items,
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
    if (!editingDoc) return;

    const descText = items.map((i) => i.itemDesc).filter(Boolean).join(" - ") || editingDoc.description;
    const finalAmount = grandTotal > 0 ? grandTotal : editingDoc.amount;

    setSubmitting(true);
    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDoc.id,
          docNo,
          type,
          description: descText,
          amount: finalAmount,
          status,
          date,
          periodFrom,
          periodTo,
          items,
          notes,
        }),
      });

      if (res.ok) {
        setEditingDoc(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = async (dId: string, dDocNo: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف المستخلص رقم (${dDocNo})؟`)) return;

    try {
      const res = await fetch(`/api/subcontractor-docs?id=${dId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalContractsVal = docs.reduce((sum, d) => sum + (d.totalAmount || d.amount || 0), 0);
  const totalPaidVal = docs.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
  const remainingVal = docs.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  return (
    <div>
      {/* Screen Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📜 مستخلصات وعقود: {subcontractor?.name || "مقاول الباطن"}</h1>
          <p className="page-subtitle">إدارة وتصفح جميع المستخلصات، العقود، والدفعات المالية للمقاول</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة مستخلص جديد
          </button>
          <Link href={`/subcontractors/${subId}/statement`} className="btn btn-gold">
            📄 كشف حساب كامل
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
          <Link href="/subcontractors" className="btn btn-ghost">
            ← العودة للمقاولين
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي العقود والمستخلصات:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalContractsVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المبلغ الكلي المتفق عليه والمطالب به للمقاول</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المدفوع:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalPaidVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المجموع الكلي للمبالغ المسددة للمقاول</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>المتبقي للمقاول:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(remainingVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المبلغ المتبقي المستحق غير المسدد للمقاول</div>
        </div>
      </div>

      {/* TABLE matching main claim page columns & actions */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل مستخلصات المقاول...</div>
            </div>
          ) : docs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <div className="empty-state-text">لا توجد مستخلصات أو عقود مسجلة بعد لهذا المقاول</div>
              <button className="btn btn-primary btn-sm print:hidden" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول مستخلص
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>رقم المستخلص</th>
                  <th>المشروع</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 260, whiteSpace: "nowrap" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{d.docNo || `SC000${idx + 1}`}</td>
                    <td style={{ fontWeight: 700 }}>{d.projectName || (d.project ? d.project.name : "المشروع الرئيسي")}</td>
                    <td>{formatDateShort(d.date || d.createdAt)}</td>
                    <td style={{ fontWeight: 800 }}>{formatCurrency(d.totalAmount || d.amount || 0)}</td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(d.paidAmount || 0)}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(d.remainingAmount || 0)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${d.status === "مدفوع" ? "badge-success" : d.status === "جزئي" ? "badge-warning" : "badge-danger"}`}>
                        {d.status === "مدفوع" ? "مدفوع" : d.status === "جزئي" ? "جزئي" : "معلق"}
                      </span>
                    </td>
                    <td className="print:hidden" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" }}>
                        {/* 1. Print Claim */}
                        <Link
                          href={`/subcontractor-docs/${d.id}/print`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f640", whiteSpace: "nowrap" }}
                          title="طباعة المستخلص الرسمي"
                        >
                          🖨️ طباعة المستخلص
                        </Link>

                        {/* 2. Quick Pay */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#10b98115", color: "#10b981", border: "1px solid #10b98140", whiteSpace: "nowrap" }}
                          onClick={() => handleOpenQuickPay(d)}
                          title="تسجيل دفعة سريعة للمستخلص"
                        >
                          💵 تسجيل دفعة
                        </button>

                        {/* 3. Payments Page */}
                        <Link
                          href={`/subcontractor-docs/${d.id}/payments`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#f59e0b15", color: "#d97706", border: "1px solid #f59e0b40", whiteSpace: "nowrap" }}
                          title="فتح صفحة كافة الدفعات المسددة للمستخلص"
                        >
                          📜 الدفعات
                        </Link>

                        {/* 4. Edit Claim */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(d)}
                          title="تعديل المستخلص"
                        >
                          ✏️
                        </button>

                        {/* 5. Delete Claim */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteDoc(d.id, d.docNo || d.description)}
                          title="حذف المستخلص"
                        >
                          🗑️
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

      {/* QUICK PAY MODAL */}
      {payDoc && (
        <div className="modal-overlay" onClick={() => setPayDoc(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">💵 تسجيل دفعة للمستخلص ({payDoc.docNo || "SC0001"})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPayDoc(null)}>✕</button>
            </div>
            <form onSubmit={handleQuickPaySubmit}>
              <div className="modal-body">
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                  <span>إجمالي المستخلص: <strong>{formatCurrency(payDoc.totalAmount || payDoc.amount)}</strong></span>
                  <span>المتبقي: <strong style={{ color: "#ef4444" }}>{formatCurrency(payDoc.remainingAmount || 0)}</strong></span>
                </div>

                <div className="form-group">
                  <label className="form-label">المبلغ المدفوع (جنيه) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    required
                    value={payAmountInput}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">تاريخ السداد *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={payDateInput}
                      onChange={(e) => setPayDateInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة الدفع</label>
                    <select className="form-control" value={payMethodInput} onChange={(e) => setPayMethodInput(e.target.value)}>
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
                    value={payPayerInput}
                    onChange={(e) => setPayPayerInput(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات / رقم الشيك</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات الصرف..."
                    value={payNotesInput}
                    onChange={(e) => setPayNotesInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPayDoc(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تأكيد الدفعة والتأكيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT DETAILED PROGRESS CLAIM MODAL */}
      {(showModal || editingDoc) && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingDoc(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 940, width: "95vw" }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingDoc ? `✏️ تعديل مستخلص (${editingDoc.docNo || "SC0001"})` : `📋 إضافة مستخلص مقاول باطن جديد`}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingDoc(null); }}>✕</button>
            </div>
            <form onSubmit={editingDoc ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                {/* Row 1: رقم المستخلص + المقاول + المشروع */}
                <div className="grid-3" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">رقم المستخلص *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={docNo}
                      onChange={(e) => setDocNo(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المقاول *</label>
                    <input
                      type="text"
                      className="form-control"
                      disabled
                      value={subcontractor?.name || "مقاول الباطن"}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المشروع *</label>
                    <select
                      className="form-control"
                      required
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="" disabled>-- اختر المشروع --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: تاريخ المستخلص + الفترة من + الفترة إلى */}
                <div className="grid-3" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">تاريخ المستخلص</label>
                    <input
                      type="date"
                      className="form-control"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الفترة من</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodFrom}
                      onChange={(e) => setPeriodFrom(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الفترة إلى</label>
                    <input
                      type="date"
                      className="form-control"
                      value={periodTo}
                      onChange={(e) => setPeriodTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section Header: بنود المستخلص */}
                <div style={{ marginTop: 12, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))", margin: 0 }}>📋 بنود المستخلص والتنفيذ</h3>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddItemRow} style={{ fontSize: 12 }}>
                    + إضافة بند جديد
                  </button>
                </div>

                {/* Items Breakdown Table */}
                <div style={{ overflowX: "auto", border: "1px solid hsl(var(--border-subtle))", borderRadius: 8, marginBottom: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "hsl(var(--bg-elevated))" }}>
                        <th style={{ width: 35, padding: "8px 6px", textAlign: "center" }}>#</th>
                        <th style={{ padding: "8px 6px", minWidth: 140 }}>البند *</th>
                        <th style={{ width: 100, padding: "8px 6px" }}>النموذج</th>
                        <th style={{ width: 90, padding: "8px 6px" }}>رقم المبنى</th>
                        <th style={{ width: 85, padding: "8px 6px" }}>الدور</th>
                        <th style={{ width: 85, padding: "8px 6px" }}>الوحدة</th>
                        <th style={{ width: 85, padding: "8px 6px" }}>كمية الحصر</th>
                        <th style={{ width: 85, padding: "8px 6px" }}>نسبة التنفيذ%</th>
                        <th style={{ width: 90, padding: "8px 6px" }}>الكمية المنفذة</th>
                        <th style={{ width: 90, padding: "8px 6px" }}>سعر الوحدة</th>
                        <th style={{ width: 100, padding: "8px 6px", textAlign: "left" }}>الإجمالي</th>
                        <th style={{ width: 40, padding: "8px 6px", textAlign: "center" }}>🗑️</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, idx) => (
                        <tr key={row.id || idx} style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              placeholder="اسم البند"
                              required
                              value={row.itemDesc}
                              onChange={(e) => handleItemChange(idx, "itemDesc", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              placeholder="النموذج"
                              value={row.modelName || ""}
                              onChange={(e) => handleItemChange(idx, "modelName", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              placeholder="رقم المبنى"
                              value={row.buildingNo || ""}
                              onChange={(e) => handleItemChange(idx, "buildingNo", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              placeholder="الدور"
                              value={row.floorNo || ""}
                              onChange={(e) => handleItemChange(idx, "floorNo", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <select
                              className="form-control"
                              style={{ padding: "4px 6px", fontSize: 12 }}
                              value={row.unit}
                              onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                            >
                              <option value="متر مسطح">متر مسطح</option>
                              <option value="م.مسطح">م.مسطح</option>
                              <option value="م²">م²</option>
                              <option value="م³">م³</option>
                              <option value="طن">طن</option>
                              <option value="عدد">عدد</option>
                              <option value="يومية">يومية</option>
                              <option value="مقطوعية">مقطوعية</option>
                            </select>
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{ padding: "4px 6px", fontSize: 12 }}
                              value={row.totalQty || ""}
                              onChange={(e) => handleItemChange(idx, "totalQty", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{ padding: "4px 6px", fontSize: 12 }}
                              value={row.execPercent || ""}
                              onChange={(e) => handleItemChange(idx, "execPercent", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{ padding: "4px 6px", fontSize: 12, background: "hsl(var(--bg-elevated))" }}
                              readOnly
                              value={row.execQty || 0}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{ padding: "4px 6px", fontSize: 12 }}
                              value={row.unitPrice || ""}
                              onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 4, textAlign: "left", fontWeight: 800, color: "hsl(var(--gold))" }}>
                            {formatCurrency(row.rowTotal || 0)}
                          </td>
                          <td style={{ textAlign: "center", padding: 4 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              style={{ padding: "2px 6px", color: "#ef4444" }}
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={items.length <= 1}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary Row */}
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 14, borderRadius: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>الإجمالي الكلي للمستخلص:</span>
                  <span style={{ fontWeight: 900, color: "hsl(var(--gold))", fontSize: 20 }}>{formatCurrency(grandTotal)}</span>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">حالة التسديد</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="مدفوع">مدفوع / مسدد</option>
                      <option value="معلق">معلق / غير مسدد</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ملاحظات</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ملاحظات أو شروط الدفع..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingDoc(null); }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ المستخلص والتأكيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
