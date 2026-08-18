"use client";

import { useState, useEffect } from "react";
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
  const [docs, setDocs] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubFilter, setSelectedSubFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Claim Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // PDF Import Modal states
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [parsedDoc, setParsedDoc] = useState<any>(null);
  const [pdfUploadError, setPdfUploadError] = useState("");
  const [savingParsedDoc, setSavingParsedDoc] = useState(false);

  // Quick Pay Modal states
  const [payDoc, setPayDoc] = useState<any>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payDateInput, setPayDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [payMethodInput, setPayMethodInput] = useState("نقداً");
  const [payPayerInput, setPayPayerInput] = useState("شركة الجبل");
  const [payNotesInput, setPayNotesInput] = useState("");

  // Folder Batch Import Modal states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [folderClaims, setFolderClaims] = useState<any[]>([]);
  const [importingClaimId, setImportingClaimId] = useState<string | null>(null);
  const [importedClaimIds, setImportedClaimIds] = useState<string[]>([]);
  const [importingAll, setImportingAll] = useState(false);
  const [viewClaimDetails, setViewClaimDetails] = useState<any | null>(null);

  const handleOpenFolderModal = async () => {
    setShowFolderModal(true);
    setLoadingFolder(true);
    try {
      const res = await fetch("/api/subcontractor-docs/parse-folder");
      const data = await res.json();
      if (data.claims && Array.isArray(data.claims)) {
        setFolderClaims(data.claims);
      }
    } catch (e) {
      console.error("Error loading folder claims:", e);
    } finally {
      setLoadingFolder(false);
    }
  };

  const handleImportSingleFolderClaim = async (claim: any) => {
    setImportingClaimId(claim.docNo);
    try {
      const descText = claim.items?.map((i: any) => i.itemDesc).filter(Boolean).join(" - ") || `مستخلص رقم ${claim.docNo}`;
      const res = await fetch("/api/subcontractor-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNo: claim.docNo,
          subcontractorId: claim.subcontractorId,
          subcontractorName: claim.subcontractorName,
          projectId: claim.projectId,
          projectName: claim.projectName,
          type: "مستخلص",
          description: descText,
          amount: claim.totalAmount,
          status: claim.payments && claim.payments.length > 0 ? "جزئي" : "معتمد",
          date: claim.date,
          items: claim.items,
          payments: claim.payments,
          notes: "تم استيراده وتأكيده من مجلد pdf_claims",
        }),
      });

      if (res.ok) {
        setImportedClaimIds((prev) => [...prev, claim.docNo]);
        fetchData();
      }
    } catch (e) {
      console.error("Error importing claim:", e);
    } finally {
      setImportingClaimId(null);
    }
  };

  const handleImportAllFolderClaims = async () => {
    setImportingAll(true);
    try {
      for (const claim of folderClaims) {
        if (!importedClaimIds.includes(claim.docNo)) {
          await handleImportSingleFolderClaim(claim);
        }
      }
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setImportingAll(false);
    }
  };

  // Form states
  const [docNo, setDocNo] = useState("SC0001");
  const [subcontractorId, setSubcontractorId] = useState("");
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
      const dRes = await fetch("/api/subcontractor-docs");
      const dData = await dRes.json();
      if (Array.isArray(dData)) setDocs(dData);

      const sRes = await fetch("/api/subcontractors");
      const sData = await sRes.json();
      if (Array.isArray(sData)) {
        setSubcontractors(sData);
        if (sData.length > 0 && !subcontractorId) setSubcontractorId(sData[0].id);
      }

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
    fetchData();
  }, []);

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

  // Filtered Docs Logic
  const filteredDocs = docs.filter((d) => {
    const search = searchTerm.toLowerCase();
    const subName = d.subcontractorName || (d.subcontractor ? d.subcontractor.name : "");
    const projName = d.projectName || (d.project ? d.project.name : "");
    const docCode = d.docNo || "";
    const desc = d.description || "";

    const matchSearch =
      !search ||
      subName.toLowerCase().includes(search) ||
      projName.toLowerCase().includes(search) ||
      docCode.toLowerCase().includes(search) ||
      desc.toLowerCase().includes(search);

    if (!matchSearch) return false;

    if (selectedSubFilter && d.subcontractorId !== selectedSubFilter) return false;
    if (typeFilter && d.type !== typeFilter) return false;

    if (statusFilter === "مدفوع" && d.status !== "مدفوع") return false;
    if (statusFilter === "جزئي" && d.status !== "جزئي") return false;
    if (statusFilter === "معلق" && d.status !== "معلق") return false;

    return true;
  });

  const grandTotalClaims = filteredDocs.reduce((sum, d) => sum + (d.totalAmount || d.amount || 0), 0);
  const grandTotalPaid = filteredDocs.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
  const grandTotalRemaining = filteredDocs.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  const resetForm = () => {
    setDocNo(getNextDocNo(docs));
    if (subcontractors.length > 0) setSubcontractorId(subcontractors[0].id);
    if (projects.length > 0) setProjectId(projects[0].id);
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

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (d: any) => {
    setEditingDoc(d);
    setDocNo(d.docNo || getNextDocNo(docs));
    setSubcontractorId(d.subcontractorId || "");
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

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingPdf(true);
    setPdfUploadError("");
    setParsedDoc(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/subcontractor-docs/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setPdfUploadError(data.error || "فشل في معالجة ملف PDF");
      } else {
        setParsedDoc(data);
      }
    } catch (err: any) {
      console.error(err);
      setPdfUploadError("حدث خطأ أثناء رفع وقراءة ملف PDF");
    } finally {
      setParsingPdf(false);
    }
  };

  const handleConfirmSavePdfDoc = async () => {
    if (!parsedDoc) return;

    setSavingParsedDoc(true);
    try {
      const payload = {
        docNo: parsedDoc.docNo,
        subcontractorId: parsedDoc.subcontractorId,
        subcontractorName: parsedDoc.subcontractorName,
        projectId: parsedDoc.projectId || null,
        projectName: parsedDoc.projectName || "",
        type: "مستخلص",
        description: `مستخلص رقم ${parsedDoc.docNo} - ${parsedDoc.subcontractorName}`,
        amount: parsedDoc.totalAmount || 0,
        status: parsedDoc.payments && parsedDoc.payments.length > 0 ? "مدفوع" : "معلق",
        date: parsedDoc.date,
        items: parsedDoc.items || [],
        payments: parsedDoc.payments || [],
        notes: "مستورد تلقائياً من ملف PDF",
      };

      const res = await fetch("/api/subcontractor-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowPdfModal(false);
        setParsedDoc(null);
        fetchData();
      } else {
        const data = await res.json();
        setPdfUploadError(data.error || "فشل في حفظ المستخلص المستورد");
      }
    } catch (err: any) {
      console.error(err);
      setPdfUploadError("حدث خطأ أثناء حفظ بيانات المستخلص");
    } finally {
      setSavingParsedDoc(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcontractorId) return;

    const targetSub = subcontractors.find((s) => s.id === subcontractorId);
    const targetProj = projects.find((p) => p.id === projectId);
    const descText = items.map((i) => i.itemDesc).filter(Boolean).join(" - ") || `مستخلص رقم ${docNo}`;
    const finalAmount = grandTotal > 0 ? grandTotal : 0;

    setSubmitting(true);
    try {
      const res = await fetch("/api/subcontractor-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNo,
          subcontractorId,
          subcontractorName: targetSub ? targetSub.name : "",
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

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📋 مستخلصات المقاولين</h1>
          <p className="page-subtitle">تتبع وسجل كامل لمستخلصات وعقود ودفعات مقاولي الباطن وحالة السداد</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#fff", fontWeight: 800 }} onClick={handleOpenFolderModal}>
            📁 معاينة واستيراد الـ 25 مستخلص (مجلد pdf_claims)
          </button>
          <button className="btn btn-gold" onClick={() => setShowPdfModal(true)}>
            📄 استيراد فردي PDF
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل مستخلص جديد
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
          <Link href="/subcontractors" className="btn btn-ghost">
            🔧 دليل المقاولين
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المستخلصات:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(grandTotalClaims)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المبلغ الكلي الكلي المطالب به بالمستخلصات المعروضة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المدفوع:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(grandTotalPaid)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع الدفعات المسددة للمستخلصات</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>المتبقي للمقاولين:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(grandTotalRemaining)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المبلغ المستحق للمقاولين غير المسدد بعد</div>
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
              placeholder="ابحث باسم المقاول، المشروع، أو رقم المستخلص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔧 فلتر المقاول</label>
            <select
              className="form-control"
              value={selectedSubFilter}
              onChange={(e) => setSelectedSubFilter(e.target.value)}
            >
              <option value="">-- جميع المقاولين --</option>
              {subcontractors.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 150px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>📄 فلتر النوع</label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">جميع الأنواع</option>
              <option value="مستخلص">مستخلص أعمال</option>
              <option value="عقد">عقد اتفاق</option>
              <option value="دفعة">دفعة مالية</option>
              <option value="فاتورة">فاتورة</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 140px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>⚡ فلتر الحالة</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">جميع الحالات</option>
              <option value="مدفوع">مدفوع بالكامل</option>
              <option value="جزئي">مسدد جزئياً</option>
              <option value="معلق">غير مسدد (معلق)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN TABLE matching requested columns */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجلات المستخلصات...</div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">
                {searchTerm || selectedSubFilter || typeFilter || statusFilter
                  ? "لا توجد مستخلصات تتماشى مع فلاتر والبحث المحددة"
                  : "لا توجد عقود أو مستخلصات مسجلة حالياً"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول مستخلص
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>رقم المستخلص</th>
                  <th>المشروع</th>
                  <th>المقاول</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 260, whiteSpace: "nowrap" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{d.docNo || `SC000${idx + 1}`}</td>
                    <td style={{ fontWeight: 700 }}>{d.projectName || (d.project ? d.project.name : "المشروع الرئيسي")}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                      {d.subcontractorName || (d.subcontractor ? d.subcontractor.name : "مقاول باطن")}
                    </td>
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
                    <select
                      className="form-control"
                      required
                      value={subcontractorId}
                      onChange={(e) => setSubcontractorId(e.target.value)}
                    >
                      <option value="" disabled>-- اختر المقاول --</option>
                      {subcontractors.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.specialty || "أعمال عامة"})
                        </option>
                      ))}
                    </select>
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
                    <label className="form-label">حالة التسديد البدئية</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="مدفوع">مدفوع بالكامل</option>
                      <option value="معلق">معلق (غير مسدد)</option>
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

      {/* PDF IMPORT MODAL */}
      {showPdfModal && (
        <div className="modal-overlay" onClick={() => { setShowPdfModal(false); setParsedDoc(null); setPdfUploadError(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">📄 استيراد مستخلص مقاول باطن عبر ملف PDF</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowPdfModal(false); setParsedDoc(null); setPdfUploadError(""); }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "hsl(var(--text-muted))", marginBottom: 16 }}>
                قم برفع ملف PDF الخاص بمستخلص المقاول، وسيقوم النظام باستخراج بيانات المستخلص، المقاول، المشروع، البنود، وسجل الدفعات تلقائياً وترحيلها لقاعدة البيانات.
              </p>

              {/* Upload Box */}
              <div
                style={{
                  border: "2px dashed hsl(var(--gold))",
                  borderRadius: 12,
                  padding: 24,
                  textAlign: "center",
                  background: "hsl(var(--bg-elevated))",
                  cursor: "pointer",
                  marginBottom: 16,
                }}
                onClick={() => document.getElementById("pdf-file-input")?.click()}
              >
                <input
                  type="file"
                  id="pdf-file-input"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={handlePdfFileChange}
                />
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "hsl(var(--gold))" }}>اضغط هنا لاختيار ملف PDF المستخلص</div>
                <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 4 }}>يقبل جميع ملفات مستخلصات المقاولين المطبوعة PDF</div>
              </div>

              {parsingPdf && (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <span className="spinner" style={{ width: 32, height: 32 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10, color: "hsl(var(--gold))" }}>
                    جاري قراءة واستخراج بيانات المستخلص، البنود، وسجل الدفعات من PDF...
                  </div>
                </div>
              )}

              {pdfUploadError && (
                <div style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                  ⚠️ {pdfUploadError}
                </div>
              )}

              {parsedDoc && (
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 16, borderRadius: 12, border: "1px solid hsl(var(--gold))" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 12 }}>
                    ✅ تم استخراج ومطابقة البيانات التالية من ملف PDF:
                  </h4>

                  <div className="grid-2" style={{ gap: 10, fontSize: 12, marginBottom: 14 }}>
                    <div>📌 رقم المستخلص: <strong>{parsedDoc.docNo}</strong></div>
                    <div>📅 التاريخ: <strong>{parsedDoc.date}</strong></div>
                    <div>🔧 المقاول: <strong>{parsedDoc.subcontractorName}</strong></div>
                    <div>🏗️ المشروع: <strong>{parsedDoc.projectName}</strong></div>
                    <div>📋 عدد البنود المستخرجة: <strong>{parsedDoc.items?.length || 0} بند</strong></div>
                    <div>💵 عدد الدفعات المستخرجة: <strong>{parsedDoc.payments?.length || 0} دفعة</strong></div>
                  </div>

                  <div style={{ background: "hsl(var(--bg-subtle))", padding: 12, borderRadius: 8, textAlign: "center" }}>
                    <span>إجمالي قيمة المستخلص المستخرج: </span>
                    <strong style={{ fontSize: 18, color: "hsl(var(--gold))" }}>{formatCurrency(parsedDoc.totalAmount)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => { setShowPdfModal(false); setParsedDoc(null); }}>إلغاء</button>
              {parsedDoc && (
                <button type="button" className="btn btn-primary" onClick={handleConfirmSavePdfDoc} disabled={savingParsedDoc}>
                  {savingParsedDoc ? <span className="spinner" /> : "🚀 اعتماد وحفظ المستخلص في قاعدة البيانات"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BATCH FOLDER IMPORT MODAL */}
      {showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1000, width: "95%" }}>
            <div className="modal-header" style={{ borderBottom: "1px solid hsl(var(--border))", paddingBottom: 12 }}>
              <div>
                <h2 className="modal-title" style={{ fontSize: 18, color: "hsl(var(--gold))" }}>
                  📁 قسم معاينة واستيراد الـ 25 مستخلص (مجلد pdf_claims)
                </h2>
                <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", marginTop: 2 }}>
                  تم فك وتجميع كافة المستخلصات المرفوعة في المجلد جاهزة للمعاينة والتأكيد فردياً أو دفعة واحدة
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowFolderModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto", padding: "16px 0" }}>
              {loadingFolder ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <span className="spinner" style={{ width: 40, height: 40 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12, color: "hsl(var(--gold))" }}>
                    جاري قراءة وتجهيز الـ 25 مستخلص من المجلد...
                  </div>
                </div>
              ) : (
                <div>
                  {/* Summary Bar */}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", background: "hsl(var(--bg-elevated))", padding: "12px 16px", borderRadius: 12, marginBottom: 16, border: "1px solid hsl(var(--border))" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>إجمالي الملفات المكتشفة: </span>
                      <strong style={{ color: "hsl(var(--gold))", fontSize: 15 }}>{folderClaims.length} مستخلص</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>تم استيراد: </span>
                      <strong style={{ color: "#10b981", fontSize: 15 }}>{importedClaimIds.length} من {folderClaims.length}</strong>
                    </div>
                    <button
                      className="btn"
                      style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#fff", fontWeight: 800, padding: "8px 16px" }}
                      onClick={handleImportAllFolderClaims}
                      disabled={importingAll || importedClaimIds.length === folderClaims.length}
                    >
                      {importingAll ? <span className="spinner" /> : `🚀 استيراد وتأكيد الكل (${folderClaims.length - importedClaimIds.length})`}
                    </button>
                  </div>

                  {/* Claims List Table */}
                  <div className="table-responsive">
                    <table className="table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>اسم الملف / المقاول</th>
                          <th>رقم المستخلص</th>
                          <th>المشروع</th>
                          <th>التخصص</th>
                          <th>التاريخ</th>
                          <th>البنود</th>
                          <th>الدفعات</th>
                          <th>الإجمالي</th>
                          <th>الإجراء والتأكيد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {folderClaims.map((c, idx) => {
                          const isImported = importedClaimIds.includes(c.docNo);
                          const isCurrentlyImporting = importingClaimId === c.docNo;

                          return (
                            <tr key={c.docNo + "-" + idx} style={{ background: isImported ? "rgba(16, 185, 129, 0.05)" : "transparent" }}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong style={{ color: "hsl(var(--foreground))" }}>{c.subcontractorName}</strong>
                                <div style={{ fontSize: 10, color: "hsl(var(--text-muted))" }}>{c.file}</div>
                              </td>
                              <td><span className="badge badge-amber">{c.docNo}</span></td>
                              <td>{c.projectName}</td>
                              <td>{c.specialty}</td>
                              <td>{c.date}</td>
                              <td><strong>{c.items?.length || 0} بند</strong></td>
                              <td><strong>{c.payments?.length || 0} دفعة</strong></td>
                              <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{formatCurrency(c.totalAmount)}</td>
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setViewClaimDetails(c)}
                                    title="معاينة تفاصيل البنود"
                                  >
                                    👁️ معاينة
                                  </button>

                                  {isImported ? (
                                    <span className="badge badge-emerald">✓ تم الترحيل</span>
                                  ) : (
                                    <button
                                      className="btn btn-emerald btn-sm"
                                      onClick={() => handleImportSingleFolderClaim(c)}
                                      disabled={isCurrentlyImporting || importingAll}
                                    >
                                      {isCurrentlyImporting ? <span className="spinner" /> : "✅ تأكيد وإضافة"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowFolderModal(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM DETAILS PREVIEW MODAL */}
      {viewClaimDetails && (
        <div className="modal-overlay" onClick={() => setViewClaimDetails(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: 16, color: "hsl(var(--gold))" }}>
                🔍 تفاصيل المستخلص: {viewClaimDetails.docNo} - {viewClaimDetails.subcontractorName}
              </h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewClaimDetails(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 16, fontSize: 13, background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                <div>📌 المستخلص: <strong>{viewClaimDetails.docNo}</strong></div>
                <div>👷 المقاول: <strong>{viewClaimDetails.subcontractorName}</strong></div>
                <div>🏗️ المشروع: <strong>{viewClaimDetails.projectName}</strong></div>
                <div>🔧 التخصص: <strong>{viewClaimDetails.specialty}</strong></div>
                <div>📅 التاريخ: <strong>{viewClaimDetails.date}</strong></div>
                <div>💰 الإجمالي: <strong>{formatCurrency(viewClaimDetails.totalAmount)}</strong></div>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: "hsl(var(--gold))" }}>📋 بنود العمل:</h4>
              <table className="table" style={{ fontSize: 11, marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>البند</th>
                    <th>المبنى</th>
                    <th>الوحدة</th>
                    <th>الكمية المنفذة</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {viewClaimDetails.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{item.itemDesc}</td>
                      <td>{item.buildingNo || "-"}</td>
                      <td>{item.unit}</td>
                      <td>{item.execQty}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(item.rowTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {viewClaimDetails.payments && viewClaimDetails.payments.length > 0 && (
                <>
                  <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: "#10b981" }}>💵 سجل الدفعات المسددة ({viewClaimDetails.payments.length} دفعة):</h4>
                  <table className="table" style={{ fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>التاريخ</th>
                        <th>المبلغ</th>
                        <th>سلم بواسطة</th>
                        <th>ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewClaimDetails.payments.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{p.date}</td>
                          <td style={{ color: "#10b981", fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                          <td>{p.paidBy}</td>
                          <td>{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewClaimDetails(null)}>إغلاق المعاينة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
