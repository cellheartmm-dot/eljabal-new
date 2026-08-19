import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Subcontractor {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
}

interface ClaimItemRow {
  id: string;
  itemName: string;
  buildingName: string;
  unit: string;
  surveyedQty: number | string;
  progressPercent: number | string;
  executedQty: number | string;
  unitPrice: number | string;
  totalPrice: number;
  isDaily: boolean;
}

interface SubcontractorDoc {
  id: string;
  subcontractorId: string;
  projectId?: string;
  subcontractor?: Subcontractor;
  project?: Project;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  notes?: string;
}

export default function SubcontractorInvoicesPage() {
  const { toasts, showToast, removeToast } = useToast();

  const [invoices, setInvoices] = useState<SubcontractorDoc[]>([]);
  const [payments, setPayments] = useState<SubcontractorDoc[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedSubId, setSelectedSubId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Active items for modals
  const [activeInvoice, setActiveInvoice] = useState<SubcontractorDoc | null>(null);
  const [activePaymentsList, setActivePaymentsList] = useState<SubcontractorDoc[]>([]);

  // Exact Modal Form Fields matching Screenshot
  const [claimCode, setClaimCode] = useState("SC0028");
  const [claimSubId, setClaimSubId] = useState("");
  const [claimProjId, setClaimProjId] = useState("");
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split("T")[0]);
  const [claimPeriodFrom, setClaimPeriodFrom] = useState("");
  const [claimPeriodTo, setClaimPeriodTo] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [claimStatus, setClaimStatus] = useState("معتمد");

  // Items Table Rows
  const [claimItems, setClaimItems] = useState<ClaimItemRow[]>([
    {
      id: "row-1",
      itemName: "",
      buildingName: "",
      unit: "م²",
      surveyedQty: 0,
      progressPercent: 0,
      executedQty: 0,
      unitPrice: 0,
      totalPrice: 0,
      isDaily: false,
    },
  ]);

  // Payment Form State
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("نقدي");
  const [payReceiptNo, setPayReceiptNo] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  // Company info for print
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات والاستثمار العقاري");
  const [companyPhone, setCompanyPhone] = useState("01120715027");
  const [companyLogo, setCompanyLogo] = useState("/logo.jpeg");

  const printRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, subsRes, projsRes, settingsRes] = await Promise.all([
        supabase
          .from("SubcontractorDoc")
          .select("*, subcontractor:Subcontractor(id, name, specialty, phone), project:Project(id, name, code)")
          .order("date", { ascending: false }),
        supabase.from("Subcontractor").select("id, name, specialty, phone").order("name", { ascending: true }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
        supabase.from("Setting").select("*"),
      ]);

      if (settingsRes.data) {
        const nameS = settingsRes.data.find((s: any) => s.key === "companyName");
        const phoneS = settingsRes.data.find((s: any) => s.key === "phone");
        const logoS = settingsRes.data.find((s: any) => s.key === "companyLogo");
        if (nameS?.value) setCompanyName(nameS.value);
        if (phoneS?.value) setCompanyPhone(phoneS.value);
        if (logoS?.value) setCompanyLogo(logoS.value);
      }

      setSubcontractors(subsRes.data || []);
      setProjects(projsRes.data || []);

      const allDocs: SubcontractorDoc[] = docsRes.data || [];
      const invList = allDocs.filter((d) => (d.type || "").includes("مستخلص") || (d.description || "").includes("مستخلص"));
      const payList = allDocs.filter((d) => !(d.type || "").includes("مستخلص") && !(d.description || "").includes("مستخلص"));

      setInvoices(invList);
      setPayments(payList);
    } catch (err: any) {
      console.error(err);
      showToast("تعذر تحميل بيانات المستخلصات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to calculate total paid for a specific subcontractor/claim
  const getPaidForInvoice = (inv: SubcontractorDoc) => {
    const matchingPayments = payments.filter(
      (p) =>
        p.subcontractorId === inv.subcontractorId &&
        (p.projectId === inv.projectId || (!p.projectId && !inv.projectId))
    );
    return matchingPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  };

  // Row item management
  const handleAddItemRow = () => {
    setClaimItems((prev) => [
      ...prev,
      {
        id: "row-" + Date.now(),
        itemName: "",
        buildingName: "",
        unit: "م²",
        surveyedQty: 0,
        progressPercent: 0,
        executedQty: 0,
        unitPrice: 0,
        totalPrice: 0,
        isDaily: false,
      },
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (claimItems.length === 1) {
      setClaimItems([
        {
          id: "row-" + Date.now(),
          itemName: "",
          buildingName: "",
          unit: "م²",
          surveyedQty: 0,
          progressPercent: 0,
          executedQty: 0,
          unitPrice: 0,
          totalPrice: 0,
          isDaily: false,
        },
      ]);
      return;
    }
    setClaimItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemRow = (id: string, field: keyof ClaimItemRow, value: any) => {
    setClaimItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        const sq = parseFloat(updated.surveyedQty.toString()) || 0;
        const pp = parseFloat(updated.progressPercent.toString()) || 0;

        if (field === "surveyedQty" || field === "progressPercent") {
          updated.executedQty = pp > 0 ? parseFloat(((sq * pp) / 100).toFixed(2)) : sq;
        }

        const eq = parseFloat(updated.executedQty.toString()) || 0;
        const up = parseFloat(updated.unitPrice.toString()) || 0;
        updated.totalPrice = parseFloat((eq * up).toFixed(2));

        return updated;
      })
    );
  };

  // Calculate Overall Claim Total
  const overallClaimTotal = claimItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  // 2. Open Add Invoice
  const handleOpenAddInvoice = () => {
    setIsEditing(false);
    setEditingInvoiceId(null);

    const count = invoices.length + 1;
    setClaimCode("SC" + count.toString().padStart(4, "0"));
    setClaimSubId(subcontractors[0]?.id || "");
    setClaimProjId(projects[0]?.id || "");
    setClaimDate(new Date().toISOString().split("T")[0]);
    setClaimPeriodFrom("");
    setClaimPeriodTo("");
    setClaimNotes("");
    setClaimStatus("معتمد");

    setClaimItems([
      {
        id: "row-1",
        itemName: "",
        buildingName: "",
        unit: "م²",
        surveyedQty: 0,
        progressPercent: 0,
        executedQty: 0,
        unitPrice: 0,
        totalPrice: 0,
        isDaily: false,
      },
    ]);

    setShowInvoiceModal(true);
  };

  // 3. Save Invoice (Add or Edit)
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimSubId) {
      showToast("برجاء اختيار المقاول", "warning");
      return;
    }

    const subObj = subcontractors.find((s) => s.id === claimSubId);
    const subName = subObj?.name || "المقاول";

    // Build structured items summary
    const validItems = claimItems.filter((i) => i.itemName.trim() || i.totalPrice > 0);
    const itemsDescription =
      validItems.length > 0
        ? validItems
            .map(
              (i) =>
                (i.itemName || "بند") +
                (i.buildingName ? " (" + i.buildingName + ")" : "") +
                ": " +
                i.executedQty +
                " " +
                i.unit +
                " × " +
                i.unitPrice +
                " ج.م = " +
                i.totalPrice +
                " ج.م"
            )
            .join(" | ")
        : "مستخلص أعمال رقم " + claimCode + " للمقاول (" + subName + ")";

    const totalAmount = overallClaimTotal > 0 ? overallClaimTotal : 0;

    const payload: any = {
      subcontractorId: claimSubId,
      projectId: claimProjId || null,
      type: "مستخلص (" + claimCode + ")",
      description: itemsDescription,
      amount: totalAmount,
      status: claimStatus,
      date: new Date(claimDate).toISOString(),
      notes: JSON.stringify({
        code: claimCode,
        periodFrom: claimPeriodFrom,
        periodTo: claimPeriodTo,
        customNotes: claimNotes,
        items: claimItems,
      }),
    };

    try {
      if (isEditing && editingInvoiceId) {
        const { error } = await supabase.from("SubcontractorDoc").update(payload).eq("id", editingInvoiceId);
        if (error) throw error;
        showToast("تم تحديث المستخلص بنجاح ✏️✅", "success");
      } else {
        const { error } = await supabase.from("SubcontractorDoc").insert([payload]);
        if (error) throw error;

        // Also post to ProjectExpense if project selected
        if (claimProjId && totalAmount > 0) {
          await supabase.from("ProjectExpense").insert([
            {
              projectId: claimProjId,
              type: "مقاولون",
              amount: totalAmount,
              description: "مستخلص أعمال رقم " + claimCode + " للمقاول (" + subName + ")",
              notes: "[meta:supervisor=الإدارة|targetCategory=مقاول باطن|targetName=" + subName + "|status=✅ معتمد ومرحل] " + (claimNotes || itemsDescription),
              date: new Date(claimDate).toISOString(),
            },
          ]);
        }

        showToast("تم إنشاء وتثبيت مستخلص المقاول بنجاح 📑✅", "success");
      }

      setShowInvoiceModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ المستخلص", "error");
    }
  };

  // 4. Open Edit Invoice
  const handleOpenEditInvoice = (inv: SubcontractorDoc) => {
    setIsEditing(true);
    setEditingInvoiceId(inv.id);
    setActiveInvoice(inv);

    setClaimSubId(inv.subcontractorId || "");
    setClaimProjId(inv.projectId || "");

    const codeMatch = inv.type.match(/\(([^)]+)\)/);
    setClaimCode(codeMatch ? codeMatch[1] : "SC0001");
    setClaimDate(inv.date ? new Date(inv.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setClaimStatus(inv.status || "معتمد");

    let parsedNotes: any = null;
    if (inv.notes) {
      try {
        parsedNotes = JSON.parse(inv.notes);
      } catch (e) {}
    }

    if (parsedNotes && parsedNotes.items && Array.isArray(parsedNotes.items) && parsedNotes.items.length > 0) {
      setClaimPeriodFrom(parsedNotes.periodFrom || "");
      setClaimPeriodTo(parsedNotes.periodTo || "");
      setClaimNotes(parsedNotes.customNotes || "");
      setClaimItems(parsedNotes.items);
    } else {
      setClaimPeriodFrom("");
      setClaimPeriodTo("");
      setClaimNotes(inv.notes || "");
      setClaimItems([
        {
          id: "row-1",
          itemName: inv.description || "أعمال مقاولة",
          buildingName: "",
          unit: "م²",
          surveyedQty: 1,
          progressPercent: 100,
          executedQty: 1,
          unitPrice: inv.amount || 0,
          totalPrice: inv.amount || 0,
          isDaily: false,
        },
      ]);
    }

    setShowInvoiceModal(true);
  };

  // 5. Delete Invoice
  const handleDeleteInvoice = async (inv: SubcontractorDoc) => {
    const codeMatch = inv.type.match(/\(([^)]+)\)/);
    const codeStr = codeMatch ? codeMatch[1] : inv.id;
    if (!confirm("هل أنت متأكد من حذف المستخلص رقم (" + codeStr + ") للمقاول (" + (inv.subcontractor?.name || "") + ")؟")) return;

    try {
      const { error } = await supabase.from("SubcontractorDoc").delete().eq("id", inv.id);
      if (error) throw error;

      showToast("تم حذف المستخلص بنجاح 🗑️", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في حذف المستخلص", "error");
    }
  };

  // 6. Open Add Payment Modal
  const handleOpenPayment = (inv: SubcontractorDoc) => {
    setActiveInvoice(inv);
    const totalPaid = getPaidForInvoice(inv);
    const remaining = Math.max(0, (inv.amount || 0) - totalPaid);

    setPayAmount(remaining > 0 ? remaining.toString() : (inv.amount || 0).toString());
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMethod("نقدي");
    setPayReceiptNo("REC-" + Date.now().toString().slice(-4));
    setPayNotes("دفعة مستحقات للمستخلص (" + inv.type + ")");
    setShowPaymentModal(true);
  };

  // 7. Save Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice || !payAmount) {
      showToast("برجاء إدخال مبلغ الدفعة", "warning");
      return;
    }

    setSubmittingPay(true);
    const amt = parseFloat(payAmount) || 0;
    const subName = activeInvoice.subcontractor?.name || "المقاول";

    const paymentDoc = {
      subcontractorId: activeInvoice.subcontractorId,
      projectId: activeInvoice.projectId || null,
      type: "دفعة (" + payMethod + ")",
      description: "دفعة مالية بقيمة " + formatCurrency(amt) + " للمقاول (" + subName + ") - سند رقم " + (payReceiptNo || "بدون"),
      amount: amt,
      status: "مسدد",
      date: new Date(payDate).toISOString(),
      notes: payNotes || "سند رقم: " + (payReceiptNo || "-") + " | طريقة الدفع: " + payMethod,
    };

    try {
      const { error } = await supabase.from("SubcontractorDoc").insert([paymentDoc]);
      if (error) throw error;

      if (activeInvoice.projectId) {
        await supabase.from("ProjectExpense").insert([
          {
            projectId: activeInvoice.projectId,
            type: "مقاولون",
            amount: amt,
            description: "صرف دفعة مقاول (" + subName + ") - " + payMethod,
            notes: "[meta:supervisor=الإدارة|targetCategory=مقاول باطن|targetName=" + subName + "|status=✅ مسدد ومرحل] " + payNotes,
            date: new Date(payDate).toISOString(),
          },
        ]);
      }

      showToast("تم تسجيل دفعة مالية بقيمة " + formatCurrency(amt) + " بنجاح 💵🎉", "success");
      setShowPaymentModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في تسجيل الدفعة المالية", "error");
    } finally {
      setSubmittingPay(false);
    }
  };

  // 8. Open Payment History Modal
  const handleOpenPaymentHistory = (inv: SubcontractorDoc) => {
    setActiveInvoice(inv);
    const related = payments.filter(
      (p) =>
        p.subcontractorId === inv.subcontractorId &&
        (p.projectId === inv.projectId || (!p.projectId && !inv.projectId))
    );
    setActivePaymentsList(related);
    setShowPaymentHistoryModal(true);
  };

  // 9. Delete Payment
  const handleDeletePayment = async (payId: string, pAmount: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدفعة بقيمة (" + formatCurrency(pAmount) + ")؟")) return;
    try {
      await supabase.from("SubcontractorDoc").delete().eq("id", payId);
      showToast("تم حذف الدفعة بنجاح 🗑️", "success");
      setActivePaymentsList((prev) => prev.filter((p) => p.id !== payId));
      fetchData();
    } catch (e: any) {
      showToast("فشل في حذف الدفعة", "error");
    }
  };

  // 10. Open Print Modal
  const handleOpenPrint = (inv: SubcontractorDoc) => {
    setActiveInvoice(inv);
    setShowPrintModal(true);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      !searchTerm.trim() ||
      (inv.subcontractor?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.project?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchProj = selectedProjectId === "all" || inv.projectId === selectedProjectId;
    const matchSub = selectedSubId === "all" || inv.subcontractorId === selectedSubId;

    const totalPaid = getPaidForInvoice(inv);
    const remaining = (inv.amount || 0) - totalPaid;

    let matchStatus = true;
    if (statusFilter === "paid") matchStatus = remaining <= 0;
    else if (statusFilter === "partial") matchStatus = remaining > 0 && totalPaid > 0;
    else if (statusFilter === "unpaid") matchStatus = totalPaid === 0;

    return matchSearch && matchProj && matchSub && matchStatus;
  });

  const totalInvoicesAmount = filteredInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalPaidAmount = filteredInvoices.reduce((acc, curr) => acc + getPaidForInvoice(curr), 0);
  const totalRemainingAmount = Math.max(0, totalInvoicesAmount - totalPaidAmount);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>📑</span>
            <span>مستخلصات المقاولين الشاملة (جميع الأعمال والمشاريع)</span>
          </h1>
          <p className="page-subtitle">
            سجل موحد وشامل لجميع مستخلصات مقاولي الباطن، مع إمكانية الطباعة، التعديل، صرف الدفعات، وسجل المدفوعات
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/subcontractors" className="btn btn-ghost">
            🤝 صفحة المقاولين
          </Link>
          <button className="btn btn-primary" onClick={handleOpenAddInvoice} style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>➕</span>
            <span>إنشاء مستخلص مقاول باطن</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS - SIDE BY SIDE & VIBRANTLY COLORED */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* CARD 1: BLUE */}
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1.5px solid #93c5fd",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", background: "#bfdbfe", padding: "2px 8px", borderRadius: 20 }}>
                📑 إجمالي المستخلصات
              </span>
              <div style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 800, marginTop: 8 }}>
                قيمة الأعمال المعتمدة
              </div>
            </div>
            <span style={{ fontSize: 26, opacity: 0.9 }}>📊</span>
          </div>
          <div style={{ fontSize: 23, fontWeight: 900, color: "#1d4ed8", marginTop: 10 }}>
            {formatCurrency(totalInvoicesAmount)}
          </div>
          <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>
            عدد المستخلصات: {filteredInvoices.length}
          </div>
        </div>

        {/* CARD 2: GREEN */}
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1.5px solid #86efac",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", background: "#bbf7d0", padding: "2px 8px", borderRadius: 20 }}>
                💵 المسدد والمدفوع
              </span>
              <div style={{ fontSize: 13, color: "#14532d", fontWeight: 800, marginTop: 8 }}>
                إجمالي الدفعات المسددة
              </div>
            </div>
            <span style={{ fontSize: 26, opacity: 0.9 }}>💰</span>
          </div>
          <div style={{ fontSize: 23, fontWeight: 900, color: "#15803d", marginTop: 10 }}>
            {formatCurrency(totalPaidAmount)}
          </div>
          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 800, marginTop: 4 }}>
            نسبة السداد: {totalInvoicesAmount > 0 ? Math.round((totalPaidAmount / totalInvoicesAmount) * 100) : 0}%
          </div>
        </div>

        {/* CARD 3: RED */}
        <div
          style={{
            background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
            border: "1.5px solid #fca5a5",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#991b1b", background: "#fecaca", padding: "2px 8px", borderRadius: 20 }}>
                ⏳ المتبقي للمقاولين
              </span>
              <div style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 800, marginTop: 8 }}>
                مستحقات واجبة الصرف
              </div>
            </div>
            <span style={{ fontSize: 26, opacity: 0.9 }}>⚠️</span>
          </div>
          <div style={{ fontSize: 23, fontWeight: 900, color: "#b91c1c", marginTop: 10 }}>
            {formatCurrency(totalRemainingAmount)}
          </div>
          <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 800, marginTop: 4 }}>
            مستحق السداد لاحقاً
          </div>
        </div>

        {/* CARD 4: AMBER / ORANGE */}
        <div
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1.5px solid #fde68a",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#92400e", background: "#fde68a", padding: "2px 8px", borderRadius: 20 }}>
                👷 المقاولون المسجلون
              </span>
              <div style={{ fontSize: 13, color: "#78350f", fontWeight: 800, marginTop: 8 }}>
                إجمالي مقاولي الباطن
              </div>
            </div>
            <span style={{ fontSize: 26, opacity: 0.9 }}>🤝</span>
          </div>
          <div style={{ fontSize: 23, fontWeight: 900, color: "#b45309", marginTop: 10 }}>
            {subcontractors.length} مقاول
          </div>
          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
            مسند لهم {projects.length} مشاريع
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🔍 البحث السريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث برقم المستخلص، اسم المقاول، المشروع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🏗️ المشروع</label>
            <select
              className="form-control"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="all">-- كل المشاريع --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🤝 المقاول</label>
            <select
              className="form-control"
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
            >
              <option value="all">-- كل المقاولين --</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.specialty || "مقاول"})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>💵 حالة السداد</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">-- كل الحالات --</option>
              <option value="unpaid">غير مسدد (0%)</option>
              <option value="partial">مسدد جزئياً</option>
              <option value="paid">مسدد بالكامل (100%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* INVOICES MAIN TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل كشوفات ومستخلصات المقاولين...</div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span style={{ fontSize: 40 }}>📑</span>
              <div className="empty-state-text" style={{ marginTop: 12, fontWeight: 800 }}>لا توجد مستخلصات مسجلة مطابقة لخيارات البحث</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleOpenAddInvoice}>
                + إنشاء أول مستخلص الآن
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>رقم المستخلص</th>
                  <th>تاريخ المستخلص</th>
                  <th>اسم المقاول والتخصص</th>
                  <th>المشروع</th>
                  <th>البيان وتفاصيل البنود</th>
                  <th>قيمة المستخلص</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th style={{ textAlign: "center" }}>حالة السداد</th>
                  <th style={{ textAlign: "center", minWidth: 280 }}>الإجراءات والعمليات</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv, idx) => {
                  const totalPaid = getPaidForInvoice(inv);
                  const remaining = Math.max(0, (inv.amount || 0) - totalPaid);
                  const isFullyPaid = remaining <= 0;
                  const isPartial = remaining > 0 && totalPaid > 0;

                  const codeMatch = inv.type.match(/\(([^)]+)\)/);
                  const codeDisplay = codeMatch ? codeMatch[1] : "SC" + (idx + 1).toString().padStart(4, "0");

                  return (
                    <tr key={inv.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "3px 8px", borderRadius: 6, border: "1px solid #bfdbfe", fontSize: 12 }}>
                          {codeDisplay}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDateShort(inv.date)}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>
                          {inv.subcontractor?.name || "مقاول غير محدد"}
                        </div>
                        <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>
                          {inv.subcontractor?.specialty || "مقاولات عامة"}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>
                          {inv.project?.name || "مشروع عام"}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4, color: "hsl(var(--text-secondary))" }}>
                          {inv.description}
                        </div>
                      </td>
                      <td style={{ fontWeight: 900, color: "#2563eb", fontSize: 14 }}>
                        {formatCurrency(inv.amount)}
                      </td>
                      <td style={{ fontWeight: 800, color: "#10b981", fontSize: 13 }}>
                        {formatCurrency(totalPaid)}
                      </td>
                      <td style={{ fontWeight: 900, color: remaining > 0 ? "#ef4444" : "#10b981", fontSize: 13 }}>
                        {formatCurrency(remaining)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={"badge " + (isFullyPaid ? "badge-success" : isPartial ? "badge-warning" : "badge-danger")}
                          style={{ fontWeight: 800, fontSize: 11 }}
                        >
                          {isFullyPaid ? "✅ مسدد بالكامل" : isPartial ? "⏳ مسدد جزئياً" : "❌ غير مسدد"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                          {/* 1. طباعة */}
                          <button
                            onClick={() => handleOpenPrint(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#4b5563", background: "#f3f4f6", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}
                            title="طباعة المستخلص الرسمي"
                          >
                            🖨️ طباعة
                          </button>

                          {/* 2. تعديل */}
                          <button
                            onClick={() => handleOpenEditInvoice(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}
                            title="تعديل بيانات المستخلص"
                          >
                            ✏️ تعديل
                          </button>

                          {/* 3. دفعة فلوس */}
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}
                            title="تسجيل دفعة مالية للمقاول"
                          >
                            💵 دفعة فلوس
                          </button>

                          {/* 4. سجل الدفعات */}
                          <button
                            onClick={() => handleOpenPaymentHistory(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}
                            title="سجل دفعات المستخلص"
                          >
                            📜 سجل الدفعات
                          </button>

                          {/* 5. حذف مستخلص */}
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", background: "#fee2e2", border: "1px solid #fecaca", padding: "4px 6px", borderRadius: 6, fontSize: 11 }}
                            title="حذف المستخلص"
                          >
                            🗑️
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

      {/* ========================================================================= */}
      {/* EXACT MATCH MODAL: إنشاء / تعديل مستخلص مقاول باطن (Screen Shot Design) */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowInvoiceModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1200,
              maxHeight: "94vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 1. TOP BLUE BANNER */}
            <div
              style={{
                background: "#2563eb",
                color: "#ffffff",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTopLeftRadius: 11,
                borderTopRightRadius: 11,
              }}
            >
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 4,
                }}
                aria-label="إغلاق"
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 900 }}>
                <span>📄</span>
                <span>{isEditing ? "تعديل مستخلص مقاول باطن" : "إنشاء مستخلص مقاول باطن"}</span>
              </div>
            </div>

            <form onSubmit={handleSaveInvoice} style={{ padding: "20px 24px" }}>
              {/* 2. TOP FORM ROW CONTROLS (IN ONE HORIZONTAL ROW) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  alignItems: "flex-end",
                  marginBottom: 20,
                  background: "#f8fafc",
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* رقم المستخلص */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                    رقم المستخلص *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    style={{ fontWeight: 800, background: "#ffffff", textAlign: "center" }}
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    placeholder="SC0028"
                  />
                </div>

                {/* المقاول */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                    المقاول *
                  </label>
                  <select
                    className="form-control"
                    required
                    style={{ background: "#ffffff", fontWeight: 700 }}
                    value={claimSubId}
                    onChange={(e) => setClaimSubId(e.target.value)}
                  >
                    <option value="" disabled>اختر المقاول</option>
                    {subcontractors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.specialty || "مقاول"})</option>
                    ))}
                  </select>
                </div>

                {/* المشروع */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                    المشروع *
                  </label>
                  <select
                    className="form-control"
                    required
                    style={{ background: "#ffffff", fontWeight: 700 }}
                    value={claimProjId}
                    onChange={(e) => setClaimProjId(e.target.value)}
                  >
                    <option value="" disabled>اختر المشروع</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                {/* تاريخ المستخلص */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                    تاريخ المستخلص
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ background: "#ffffff", textAlign: "center" }}
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                  />
                </div>

                {/* الفترة من */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                    الفترة من
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ background: "#ffffff", textAlign: "center" }}
                    value={claimPeriodFrom}
                    onChange={(e) => setClaimPeriodFrom(e.target.value)}
                  />
                </div>

                {/* الفترة إلى */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>
                    الفترة إلى
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ background: "#ffffff", textAlign: "center" }}
                    value={claimPeriodTo}
                    onChange={(e) => setClaimPeriodTo(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. SECTION TITLE & ADD ROW BUTTON */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{
                    background: "#166534",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(22, 101, 52, 0.2)",
                  }}
                >
                  <span>+</span>
                  <span>إضافة بند يدوي</span>
                </button>

                <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📑</span>
                  <span>بنود المستخلص</span>
                </div>
              </div>

              {/* 4. ITEMS TABLE (EXACT TABLE FROM SCREENSHOT) */}
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #cbd5e1", color: "#334155", fontSize: 12, fontWeight: 800 }}>
                      <th style={{ padding: "10px 8px", width: 45, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>حذف</th>
                      <th style={{ padding: "10px 8px", width: 55, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>يومية</th>
                      <th style={{ padding: "10px 8px", width: 110, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الإجمالي</th>
                      <th style={{ padding: "10px 8px", width: 90, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>سعر الوحدة</th>
                      <th style={{ padding: "10px 8px", width: 90, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الكمية المنفذة</th>
                      <th style={{ padding: "10px 8px", width: 85, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>نسبة التنفيذ%</th>
                      <th style={{ padding: "10px 8px", width: 90, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>كمية الحصر</th>
                      <th style={{ padding: "10px 8px", width: 85, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الوحدة</th>
                      <th style={{ padding: "10px 8px", width: 110, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>رقم المبنى</th>
                      <th style={{ padding: "10px 12px", borderLeft: "1px solid #e2e8f0" }}>النموذج / البند</th>
                      <th style={{ padding: "10px 8px", width: 35, textAlign: "center" }}>#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimItems.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", background: index % 2 === 0 ? "#ffffff" : "#fcfcfd" }}>
                        {/* 1. Delete Button */}
                        <td style={{ padding: "6px 4px", textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(item.id)}
                            style={{
                              background: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              width: 28,
                              height: 28,
                              display: "inline-flex",
                              justifyContent: "center",
                              alignItems: "center",
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: "bold",
                            }}
                            title="حذف هذا البند"
                          >
                            ✕
                          </button>
                        </td>

                        {/* 2. Daily Checkbox */}
                        <td style={{ padding: "6px 4px", textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="checkbox"
                            checked={item.isDaily}
                            onChange={(e) => handleUpdateItemRow(item.id, "isDaily", e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: "#2563eb", cursor: "pointer" }}
                          />
                        </td>

                        {/* 3. الإجمالي (Yellow Block) */}
                        <td style={{ padding: "6px 6px", textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>
                          <div
                            style={{
                              background: "#eab308",
                              color: "#000000",
                              fontWeight: 900,
                              fontSize: 13,
                              padding: "6px 4px",
                              borderRadius: 6,
                              textAlign: "center",
                            }}
                          >
                            {item.totalPrice.toFixed(2)}
                          </div>
                        </td>

                        {/* 4. سعر الوحدة */}
                        <td style={{ padding: "6px 4px", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="number"
                            step="0.01"
                            style={{ width: "100%", padding: "6px 4px", textAlign: "center", borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 700 }}
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemRow(item.id, "unitPrice", e.target.value)}
                          />
                        </td>

                        {/* 5. الكمية المنفذة */}
                        <td style={{ padding: "6px 4px", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="number"
                            step="0.01"
                            style={{ width: "100%", padding: "6px 4px", textAlign: "center", borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 800, background: "#f8fafc" }}
                            value={item.executedQty}
                            onChange={(e) => handleUpdateItemRow(item.id, "executedQty", e.target.value)}
                          />
                        </td>

                        {/* 6. نسبة التنفيذ % */}
                        <td style={{ padding: "6px 4px", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            style={{ width: "100%", padding: "6px 4px", textAlign: "center", borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 700 }}
                            value={item.progressPercent}
                            onChange={(e) => handleUpdateItemRow(item.id, "progressPercent", e.target.value)}
                          />
                        </td>

                        {/* 7. كمية الحصر */}
                        <td style={{ padding: "6px 4px", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="number"
                            step="0.01"
                            style={{ width: "100%", padding: "6px 4px", textAlign: "center", borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 700 }}
                            value={item.surveyedQty}
                            onChange={(e) => handleUpdateItemRow(item.id, "surveyedQty", e.target.value)}
                          />
                        </td>

                        {/* 8. الوحدة */}
                        <td style={{ padding: "6px 4px", borderLeft: "1px solid #e2e8f0" }}>
                          <select
                            style={{ width: "100%", padding: "6px 4px", textAlign: "center", borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 700, background: "#fff" }}
                            value={item.unit}
                            onChange={(e) => handleUpdateItemRow(item.id, "unit", e.target.value)}
                          >
                            <option value="م²">م²</option>
                            <option value="م³">م³</option>
                            <option value="م.ط">م.ط</option>
                            <option value="عدد">عدد</option>
                            <option value="مقطوعية">مقطوعية</option>
                            <option value="نقطة">نقطة</option>
                            <option value="طن">طن</option>
                            <option value="كجم">كجم</option>
                          </select>
                        </td>

                        {/* 9. رقم المبنى */}
                        <td style={{ padding: "6px 4px", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="text"
                            placeholder="اختياري"
                            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", textAlign: "right" }}
                            value={item.buildingName}
                            onChange={(e) => handleUpdateItemRow(item.id, "buildingName", e.target.value)}
                          />
                        </td>

                        {/* 10. النموذج / البند */}
                        <td style={{ padding: "6px 8px", borderLeft: "1px solid #e2e8f0" }}>
                          <input
                            type="text"
                            placeholder="اسم البند"
                            required
                            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontWeight: 700, textAlign: "right" }}
                            value={item.itemName}
                            onChange={(e) => handleUpdateItemRow(item.id, "itemName", e.target.value)}
                          />
                        </td>

                        {/* 11. Index # */}
                        <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 800, color: "#64748b" }}>
                          {index + 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 5. BLACK TOTAL BANNER (EXACT MATCH) */}
                <div
                  style={{
                    background: "#18181b",
                    color: "#ffffff",
                    padding: "10px 20px",
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                >
                  <span>الإجمالي الكلي:</span>
                  <span style={{ color: "#facc15", fontSize: 16 }}>{overallClaimTotal.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* 6. NOTES SECTION */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
                  ملاحظات
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="اكتب أية ملاحظات إضافية على المستخلص أو شروط الصرف..."
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>

              {/* 7. BOTTOM ACTION BUTTONS */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", alignItems: "center" }}>
                <button
                  type="submit"
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: 8,
                    fontWeight: 900,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  <span>💾</span>
                  <span>{isEditing ? "حفظ التعديلات" : "حفظ المستخلص"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  style={{
                    background: "#64748b",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD PAYMENT MODAL (دفعة فلوس) */}
      {/* ========================================================================= */}
      {showPaymentModal && activeInvoice && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">💵 تسجيل دفعة مالية لمستخلص المقاول</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modal-body">
                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>المقاول المستحق:</span>
                    <span style={{ fontWeight: 800, color: "#0f172a" }}>{activeInvoice.subcontractor?.name}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>المشروع:</span>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>{activeInvoice.project?.name || "عام"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>قيمة المستخلص:</span>
                    <span style={{ fontWeight: 900, color: "#2563eb" }}>{formatCurrency(activeInvoice.amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>المتبقي الحالي:</span>
                    <span style={{ fontWeight: 900, color: "#ef4444" }}>
                      {formatCurrency(Math.max(0, (activeInvoice.amount || 0) - getPaidForInvoice(activeInvoice)))}
                    </span>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">المبلغ المدفوع (جنيه) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الدفعة *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">طريقة السداد *</label>
                    <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="نقدي">نقدي (كاش خزينة)</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="فودافون كاش / إنستاباي">فودافون كاش / إنستاباي</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم السند / الشيك</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: سند صرف 402"
                      value={payReceiptNo}
                      onChange={(e) => setPayReceiptNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات وبيان الصرف</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: دفعة تحت حساب مصنعية المباني..."
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submittingPay}>
                  {submittingPay ? <span className="spinner" /> : "💾 تأكيد وصرف الدفعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYMENT HISTORY MODAL (سجل الدفعات) */}
      {/* ========================================================================= */}
      {showPaymentHistoryModal && activeInvoice && (
        <div className="modal-overlay" onClick={() => setShowPaymentHistoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                📜 سجل الدفعات المسددة للمقاول ({activeInvoice.subcontractor?.name})
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPaymentHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>المستخلص: </span>
                    <span style={{ fontWeight: 800 }}>{activeInvoice.type}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>إجمالي القيمة: </span>
                    <span style={{ fontWeight: 900, color: "#2563eb" }}>{formatCurrency(activeInvoice.amount)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>إجمالي المسدد: </span>
                    <span style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(getPaidForInvoice(activeInvoice))}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>المتبقي: </span>
                    <span style={{ fontWeight: 900, color: "#ef4444" }}>
                      {formatCurrency(Math.max(0, (activeInvoice.amount || 0) - getPaidForInvoice(activeInvoice)))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="table-container">
                {activePaymentsList.length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <span style={{ fontSize: 32 }}>💵</span>
                    <div className="empty-state-text" style={{ marginTop: 8 }}>لم يتم تسجيل دفعات مسددة لهذا المستخلص بعد</div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        setShowPaymentHistoryModal(false);
                        handleOpenPayment(activeInvoice);
                      }}
                    >
                      + صرف أول دفعة الآن
                    </button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>تاريخ الدفعة</th>
                        <th>المبلغ المسدد</th>
                        <th>طريقة الدفع</th>
                        <th>البيان والملاحظات</th>
                        <th style={{ textAlign: "center", width: 60 }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePaymentsList.map((pay, pIdx) => (
                        <tr key={pay.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{pIdx + 1}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDateShort(pay.date)}</td>
                          <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(pay.amount)}</td>
                          <td>
                            <span className="badge badge-info">{pay.type}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>{pay.notes || pay.description}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => handleDeletePayment(pay.id, pay.amount)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#ef4444", padding: "4px 8px" }}
                              title="حذف هذه الدفعة"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPaymentHistoryModal(false)}>إغلاق</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowPaymentHistoryModal(false);
                  handleOpenPayment(activeInvoice);
                }}
              >
                + إضافة دفعة جديدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRINT INVOICE MODAL (معاينة وطباعة المستخلص) */}
      {/* ========================================================================= */}
      {showPrintModal && activeInvoice && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840, background: "#ffffff" }}>
            <div className="modal-header no-print" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <h2 className="modal-title" style={{ color: "#0f172a" }}>🖨️ معاينة وطباعة مستخلص أعمال المقاول</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleTriggerPrint} style={{ fontWeight: 800 }}>
                  🖨️ طباعة الآن (Print)
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPrintModal(false)}>✕</button>
              </div>
            </div>

            <div className="modal-body print-area" ref={printRef} style={{ color: "#000000", background: "#ffffff", padding: "28px 32px" }}>
              {/* PRINT HEADER */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double #000", paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "#000" }}>{companyName}</h1>
                  <div style={{ fontSize: 12, marginTop: 4, color: "#333" }}>للمقاولات العامة والاستثمار العقاري</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: "#555" }}>هاتف: {companyPhone}</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <img
                    src={companyLogo}
                    alt="Logo"
                    style={{ height: 60, width: 60, objectFit: "contain", borderRadius: 8 }}
                    onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                  />
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4, letterSpacing: 0.5 }}>مستخلص أعمال مقاول باطن</div>
                </div>

                <div style={{ textAlign: "left", fontSize: 11, color: "#333" }}>
                  <div><strong>تاريخ الإصدار:</strong> {formatDateShort(activeInvoice.date)}</div>
                  <div><strong>رقم المستخلص:</strong> {activeInvoice.type}</div>
                  <div><strong>المشروع:</strong> {activeInvoice.project?.name || "مشروع عام"}</div>
                </div>
              </div>

              {/* CONTRACTOR & PROJECT DETAILS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>السيد المقاول:</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{activeInvoice.subcontractor?.name}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>التخصص: {activeInvoice.subcontractor?.specialty || "مقاولات عامة"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>المشروع المسند:</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{activeInvoice.project?.name || "مشروع عام"}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>كود المشروع: {activeInvoice.project?.code || "-"}</div>
                </div>
              </div>

              {/* WORK ITEMS TABLE */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "#000" }}>📋 تفاصيل الأعمال والبنود المنفذة:</div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: 12, textAlign: "center" }}>م</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: 12 }}>بيان الأعمال المنفذة وموقع التنفيذ</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: 12, textAlign: "center", width: 140 }}>إجمالي القيمة المستحقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "center", fontWeight: 700 }}>1</td>
                      <td style={{ border: "1px solid #000", padding: "10px 8px", fontSize: 13, lineHeight: 1.6 }}>
                        {activeInvoice.description}
                        {activeInvoice.notes && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>ملاحظات: {activeInvoice.notes}</div>}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "center", fontWeight: 900, fontSize: 14 }}>
                        {formatCurrency(activeInvoice.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* FINANCIAL SUMMARY BOX */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 30 }}>
                <div style={{ width: 320, border: "1px solid #000", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #cbd5e1" }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>إجمالي قيمة المستخلص:</span>
                    <span style={{ fontSize: 13, fontWeight: 900 }}>{formatCurrency(activeInvoice.amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #cbd5e1", background: "#f0fdf4" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>إجمالي المسدد حتى تاريخه:</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#166534" }}>{formatCurrency(getPaidForInvoice(activeInvoice))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#fef2f2" }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#991b1b" }}>صافي المتبقي للمقاول:</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#991b1b" }}>
                      {formatCurrency(Math.max(0, (activeInvoice.amount || 0) - getPaidForInvoice(activeInvoice)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* OFFICIAL SIGNATURES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center", marginTop: 40, borderTop: "1px dashed #94a3b8", paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>مهندس الموقع والمطابقة</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>المقاول القائم بالتنفيذ</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>اعتماد الإدارة المالية</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>الختم والتوقيع: .....................</div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPrintModal(false)}>إغلاق</button>
              <button type="button" className="btn btn-primary" onClick={handleTriggerPrint}>🖨️ طباعة المستخلص</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
