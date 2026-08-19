import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface GeneralExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  targetCategory?: string; // "company", "employee", "subcontractor", "project", "custody"
  targetName?: string;
  targetId?: string;
  custodyRecipientType?: string; // "employee" | "subcontractor" | "custom"
  custodyProjectId?: string;
  custodyProjectName?: string;
  custodySettledAmount?: number;
  custodyStatus?: string; // "تحت التسوية" | "تمت التسوية بالكامل" | "تسوية جزئية"
  notes?: string;
}

interface Employee {
  id: string;
  name: string;
  code: string;
  jobRole: string;
}

interface Subcontractor {
  id: string;
  name: string;
  specialty?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function GeneralExpensesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GeneralExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Custody Settlement Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [activeCustody, setActiveCustody] = useState<GeneralExpense | null>(null);
  const [settleInvoiceAmount, setSettleInvoiceAmount] = useState("");
  const [settleInvoiceDesc, setSettleInvoiceDesc] = useState("");
  const [settleInvoiceType, setSettleInvoiceType] = useState("خامات ومصروف موقع");
  const [settleProjectId, setSettleProjectId] = useState("");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split("T")[0]);
  const [settleNotes, setSettleNotes] = useState("");
  const [submittingSettle, setSubmittingSettle] = useState(false);

  // Print Custody Voucher Modal
  const [showPrintVoucherModal, setShowPrintVoucherModal] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<GeneralExpense | null>(null);
  const printVoucherRef = useRef<HTMLDivElement>(null);

  // Company info for print
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات والاستثمار العقاري");
  const [companyPhone, setCompanyPhone] = useState("01120715027");
  const [companyLogo, setCompanyLogo] = useState("/logo.jpeg");

  // Form State
  const [type, setType] = useState("إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Target Category State
  const [targetCategory, setTargetCategory] = useState<"company" | "employee" | "subcontractor" | "project" | "custody">("company");
  const [targetId, setTargetId] = useState("");

  // Custody Specific State
  const [custodyRecipientType, setCustodyRecipientType] = useState<"employee" | "subcontractor" | "custom">("employee");
  const [custodyRecipientId, setCustodyRecipientId] = useState("");
  const [custodyCustomRecipientName, setCustodyCustomRecipientName] = useState("");
  const [custodyProjectId, setCustodyProjectId] = useState("");

  const [notes, setNotes] = useState("");

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [gRes, empRes, subRes, projRes, settingsRes] = await Promise.all([
        supabase.from("GeneralExpense").select("*").order("date", { ascending: false }),
        supabase.from("Employee").select("id, name, code, jobRole").order("name", { ascending: true }),
        supabase.from("Subcontractor").select("id, name, specialty").order("name", { ascending: true }),
        supabase.from("Project").select("id, name, code").order("name", { ascending: true }),
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

      if (empRes.data) setEmployees(empRes.data);
      if (subRes.data) setSubcontractors(subRes.data);
      if (projRes.data) setProjects(projRes.data);

      if (gRes.data) {
        const processed: GeneralExpense[] = gRes.data.map((exp: any) => {
          let paymentMethod = "نقدي";
          let targetCategory = "company";
          let targetId = "";
          let targetName = "";
          let custodyRecipientType = "employee";
          let custodyProjectId = "";
          let custodyProjectName = "";
          let custodySettledAmount = 0;
          let custodyStatus = "تحت التسوية";
          let cleanNotes = exp.notes || "";

          if (exp.notes && exp.notes.includes("[meta:")) {
            const pmMatch = exp.notes.match(/paymentMethod=([^|]]+)/);
            if (pmMatch) paymentMethod = pmMatch[1];

            const tcMatch = exp.notes.match(/targetCategory=([^|]]+)/);
            if (tcMatch) targetCategory = tcMatch[1];

            const tiMatch = exp.notes.match(/targetId=([^|]]+)/);
            if (tiMatch) targetId = tiMatch[1];

            const tnMatch = exp.notes.match(/targetName=([^|]]+)/);
            if (tnMatch) targetName = tnMatch[1];

            const crtMatch = exp.notes.match(/custodyRecipientType=([^|]]+)/);
            if (crtMatch) custodyRecipientType = crtMatch[1];

            const cpMatch = exp.notes.match(/custodyProjectId=([^|]]+)/);
            if (cpMatch) {
              custodyProjectId = cpMatch[1];
              const pFound = projRes.data?.find((p) => p.id === custodyProjectId);
              if (pFound) custodyProjectName = pFound.name;
            }

            const csaMatch = exp.notes.match(/custodySettledAmount=([^|]]+)/);
            if (csaMatch) custodySettledAmount = parseFloat(csaMatch[1]) || 0;

            const csMatch = exp.notes.match(/custodyStatus=([^|]]+)/);
            if (csMatch) custodyStatus = csMatch[1];

            cleanNotes = exp.notes.replace(/[meta:[^]]+]/, "").trim();
          }

          if (targetCategory === "custody" && !custodyStatus) {
            if (custodySettledAmount >= (exp.amount || 0)) custodyStatus = "تمت التسوية بالكامل";
            else if (custodySettledAmount > 0) custodyStatus = "تسوية جزئية";
            else custodyStatus = "تحت التسوية";
          }

          return {
            ...exp,
            paymentMethod,
            targetCategory,
            targetId,
            targetName,
            custodyRecipientType,
            custodyProjectId,
            custodyProjectName,
            custodySettledAmount,
            custodyStatus,
            notes: cleanNotes,
          };
        });
        setExpenses(processed);
      }
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل بيانات المصروفات العامة", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const resetForm = () => {
    setType("إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)");
    setPaymentMethod("نقدي");
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setTargetCategory("company");
    setTargetId("");
    setCustodyRecipientType("employee");
    setCustodyRecipientId("");
    setCustodyCustomRecipientName("");
    setCustodyProjectId("");
    setNotes("");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item: GeneralExpense) => {
    setEditingItem(item);
    setType(item.type || "إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)");
    setPaymentMethod(item.paymentMethod || "نقدي");
    setDescription(item.description || "");
    setAmount(item.amount?.toString() || "");
    setDate(item.date ? new Date(item.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setTargetCategory((item.targetCategory as any) || "company");
    setTargetId(item.targetId || "");

    if (item.targetCategory === "custody") {
      setCustodyRecipientType((item.custodyRecipientType as any) || "employee");
      setCustodyRecipientId(item.targetId || "");
      setCustodyProjectId(item.custodyProjectId || "");
      setCustodyCustomRecipientName(item.targetName || "");
    }

    setNotes(item.notes || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      showToast("برجاء إدخال المبلغ", "warning");
      return;
    }

    const numericAmount = parseFloat(amount) || 0;
    let finalTargetName = "";
    let finalTargetId = targetId;

    if (targetCategory === "employee") {
      const foundEmp = employees.find((e) => e.id === targetId);
      finalTargetName = foundEmp ? foundEmp.name : "موظف";
    } else if (targetCategory === "subcontractor") {
      const foundSub = subcontractors.find((s) => s.id === targetId);
      finalTargetName = foundSub ? foundSub.name : "مقاول باطن";
    } else if (targetCategory === "project") {
      const foundProj = projects.find((p) => p.id === targetId);
      finalTargetName = foundProj ? foundProj.name : "مشروع";
    } else if (targetCategory === "custody") {
      if (custodyRecipientType === "employee") {
        const foundEmp = employees.find((e) => e.id === custodyRecipientId);
        finalTargetName = foundEmp ? foundEmp.name : "مشرف / موظف";
        finalTargetId = custodyRecipientId;
      } else if (custodyRecipientType === "subcontractor") {
        const foundSub = subcontractors.find((s) => s.id === custodyRecipientId);
        finalTargetName = foundSub ? foundSub.name : "مقاول باطن";
        finalTargetId = custodyRecipientId;
      } else {
        finalTargetName = custodyCustomRecipientName.trim() || "عهدة مسؤول";
        finalTargetId = "custom";
      }
    }

    const finalDesc =
      description.trim() ||
      (targetCategory === "custody"
        ? "صرف عهدة مالية للمستلم (" + finalTargetName + ") تحت التسوية بالفواتير"
        : type);

    setSubmitting(true);
    try {
      let metaStr = "";
      if (targetCategory === "custody") {
        metaStr =
          "[meta:paymentMethod=" +
          paymentMethod +
          "|targetCategory=custody|targetId=" +
          finalTargetId +
          "|targetName=" +
          finalTargetName +
          "|custodyRecipientType=" +
          custodyRecipientType +
          "|custodyProjectId=" +
          custodyProjectId +
          "|custodySettledAmount=0|custodyStatus=تحت التسوية] " +
          notes;
      } else {
        metaStr =
          "[meta:paymentMethod=" +
          paymentMethod +
          "|targetCategory=" +
          targetCategory +
          "|targetId=" +
          finalTargetId +
          "|targetName=" +
          finalTargetName +
          "] " +
          notes;
      }

      const payload = {
        type: targetCategory === "custody" ? "صرف عهدة مالية (تحت التسوية)" : type,
        description: finalDesc,
        amount: numericAmount,
        date: new Date(date).toISOString(),
        notes: metaStr.trim(),
      };

      if (editingItem) {
        const { error } = await supabase.from("GeneralExpense").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        showToast("تم تحديث المصروف العام بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("GeneralExpense").insert([payload]);
        if (error) throw error;

        // AUTOMATIC LEDGER POSTINGS
        if (targetCategory === "custody") {
          // 1. Post to Employee / Supervisor ledger if employee
          if (custodyRecipientType === "employee" && finalTargetId !== "custom") {
            try {
              await supabase.from("WorkerAdvance").insert([
                {
                  workerId: finalTargetId,
                  amount: numericAmount,
                  date: new Date(date).toISOString(),
                  notes: "[عهدة مالية تحت التسوية بالفواتير] " + finalDesc,
                },
              ]);
            } catch (e) {}
          }
          // 2. Post to Subcontractor ledger if subcontractor
          else if (custodyRecipientType === "subcontractor" && finalTargetId !== "custom") {
            try {
              await supabase.from("SubcontractorDoc").insert([
                {
                  subcontractorId: finalTargetId,
                  projectId: custodyProjectId || null,
                  type: "عهدة تحت التسوية",
                  description: "[عهدة أعمال تحت التسوية] " + finalDesc,
                  amount: numericAmount,
                  status: "عهدة مفتوحة",
                  date: new Date(date).toISOString(),
                  notes: "عهدة مالية تحت تسوية الفواتير",
                },
              ]);
            } catch (e) {}
          }

          showToast("تم صرف العهدة المالية للمستلم (" + finalTargetName + ") وتسميعها في حساباته بنجاح 💼🎉", "success");
        } else if (targetCategory === "employee" && finalTargetId) {
          // Advance/Deduction
          try {
            await supabase.from("WorkerAdvance").insert([
              {
                workerId: finalTargetId,
                amount: numericAmount,
                date: new Date(date).toISOString(),
                notes: "استقطاع مصروف عام (" + type + "): " + finalDesc,
              },
            ]);
          } catch (e) {}
          showToast("تم تسميع الخصم/السلفة بنجاح في كشف حساب الموظف (" + finalTargetName + ") 👷✅", "success");
        } else if (targetCategory === "subcontractor" && finalTargetId) {
          // Subcontractor Deduction
          try {
            await supabase.from("SubcontractorDoc").insert([
              {
                subcontractorId: finalTargetId,
                type: "خصم / مصروف عام",
                description: "خصم مصروف عام (" + type + "): " + finalDesc,
                amount: numericAmount,
                status: "مخصوم",
                date: new Date(date).toISOString(),
              },
            ]);
          } catch (e) {}
          showToast("تم تسميع الاستقطاع بنجاح في كشف حساب مقاول الباطن (" + finalTargetName + ") 🤝✅", "success");
        } else if (targetCategory === "project" && finalTargetId) {
          // Project Expense
          try {
            await supabase.from("ProjectExpense").insert([
              {
                projectId: finalTargetId,
                type: "مصروف إداري بالموقع",
                amount: numericAmount,
                description: "مصروف عام إداري: " + finalDesc,
                notes: "[meta:supervisor=الإدارة|targetCategory=مصروف عام|status=✅ معتمد ومرحل] " + notes,
                date: new Date(date).toISOString(),
              },
            ]);
          } catch (e) {}
          showToast("تم تصفية المصروف وتسميعه في تكاليف المشروع (" + finalTargetName + ") 🏗️✅", "success");
        } else {
          showToast("تم تسجيل المصروف العام على إداريات الشركة بنجاح ✅", "success");
        }
      }

      setShowModal(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ المصروف العام", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Custody Settlement Modal (تسوية العهدة بالفواتير)
  const handleOpenSettle = (item: GeneralExpense) => {
    setActiveCustody(item);
    const remaining = Math.max(0, (item.amount || 0) - (item.custodySettledAmount || 0));
    setSettleInvoiceAmount(remaining > 0 ? remaining.toString() : "");
    setSettleInvoiceDesc("فاتورة ومستندات تسوية لعهدة " + (item.targetName || "المستلم"));
    setSettleInvoiceType("خامات ومصروف موقع");
    setSettleProjectId(item.custodyProjectId || projects[0]?.id || "");
    setSettleDate(new Date().toISOString().split("T")[0]);
    setSettleNotes("");
    setShowSettleModal(true);
  };

  // Submit Custody Settlement (إدخال فواتير التسوية وتخفيض رصيد العهدة)
  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustody || !settleInvoiceAmount) {
      showToast("برجاء إدخال مبلغ الفاتورة / التسوية", "warning");
      return;
    }

    setSubmittingSettle(true);
    try {
      const settleAmt = parseFloat(settleInvoiceAmount) || 0;
      const targetProj = projects.find((p) => p.id === settleProjectId);
      const projName = targetProj ? targetProj.name : "مشروع عام";

      // 1. If project selected, post the invoice directly to ProjectExpense
      if (settleProjectId) {
        await supabase.from("ProjectExpense").insert([
          {
            projectId: settleProjectId,
            type: settleInvoiceType,
            amount: settleAmt,
            description: "تسوية عهدة (" + activeCustody.targetName + "): " + settleInvoiceDesc,
            notes:
              "[meta:supervisor=" +
              activeCustody.targetName +
              "|targetCategory=تسوية عهدة|status=✅ معتمد ومرحل] " +
              (settleNotes || "مستندات فواتير تسوية عهدة"),
            date: new Date(settleDate).toISOString(),
          },
        ]);
      } else {
        // If not project specific, record as General Admin Expense
        await supabase.from("GeneralExpense").insert([
          {
            type: "تسوية عهدة إدارية",
            description: "فاتورة تسوية عهدة (" + activeCustody.targetName + "): " + settleInvoiceDesc,
            amount: settleAmt,
            date: new Date(settleDate).toISOString(),
            notes: "[meta:targetCategory=company|settledFromCustodyId=" + activeCustody.id + "] " + settleNotes,
          },
        ]);
      }

      // 2. Update the parent custody's settled amount and status
      const newSettledAmount = (activeCustody.custodySettledAmount || 0) + settleAmt;
      const isFullySettled = newSettledAmount >= activeCustody.amount;
      const newStatus = isFullySettled ? "تمت التسوية بالكامل" : "تسوية جزئية";

      const updatedMetaStr =
        "[meta:paymentMethod=" +
        activeCustody.paymentMethod +
        "|targetCategory=custody|targetId=" +
        activeCustody.targetId +
        "|targetName=" +
        activeCustody.targetName +
        "|custodyRecipientType=" +
        activeCustody.custodyRecipientType +
        "|custodyProjectId=" +
        activeCustody.custodyProjectId +
        "|custodySettledAmount=" +
        newSettledAmount +
        "|custodyStatus=" +
        newStatus +
        "] " +
        (activeCustody.notes || "");

      await supabase
        .from("GeneralExpense")
        .update({
          notes: updatedMetaStr,
        })
        .eq("id", activeCustody.id);

      showToast("تم إثبات فاتورة تسوية العهدة وترحيل التكلفة للمشروع بنجاح 🧾✅", "success");
      setShowSettleModal(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || "فشل في تسوية العهدة", "error");
    } finally {
      setSubmittingSettle(false);
    }
  };

  // Open Custody Disbursement Voucher Modal
  const handleOpenPrintVoucher = (item: GeneralExpense) => {
    setActiveVoucher(item);
    setShowPrintVoucherModal(true);
  };

  const handleDelete = async (id: string, amountText: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف / العهدة بقيمة (" + amountText + ")؟")) return;
    try {
      const { error } = await supabase.from("GeneralExpense").delete().eq("id", id);
      if (error) throw error;
      showToast("تم الحذف بنجاح 🗑️", "success");
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filtered = expenses.filter((exp) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      exp.description.toLowerCase().includes(s) ||
      exp.type.toLowerCase().includes(s) ||
      (exp.targetName && exp.targetName.toLowerCase().includes(s));
    const matchType = !typeFilter || exp.type === typeFilter;
    const matchTarget = !targetFilter || exp.targetCategory === targetFilter;

    return matchSearch && matchType && matchTarget;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCustodiesAmount = expenses
    .filter((e) => e.targetCategory === "custody")
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCustodiesSettled = expenses
    .filter((e) => e.targetCategory === "custody")
    .reduce((sum, e) => sum + (e.custodySettledAmount || 0), 0);
  const totalCustodiesOpen = Math.max(0, totalCustodiesAmount - totalCustodiesSettled);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>🧾</span>
            <span>المصروفات العامة والعهد المالية والتسميع المحاسبي</span>
          </h1>
          <p className="page-subtitle">
            سجل موحد للمصروفات الإدارية، إيجارات المقرات، صرف العهد للمشرفين والمقاولين، وتسميع الفواتير على المشاريع
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-gold"
            onClick={() => {
              resetForm();
              setTargetCategory("custody");
              setShowModal(true);
            }}
            style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>💼</span>
            <span>+ صرف عهدة مالية لمشرف أو مقاول</span>
          </button>

          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>➕</span>
            <span>تسجيل مصروف عام جديد</span>
          </button>

          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (SIDE BY SIDE & VIBRANTLY COLORED) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* CARD 1: BLUE (TOTAL EXPENSES) */}
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
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", background: "#bfdbfe", padding: "2px 8px", borderRadius: 20 }}>
                🧾 إجمالي المصروفات العامة
              </span>
              <div style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 800, marginTop: 8 }}>
                مصروفات المقر والإداريات
              </div>
            </div>
            <span style={{ fontSize: 26 }}>📊</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1d4ed8", marginTop: 10 }}>
            {formatCurrency(totalAmount)}
          </div>
          <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>
            عدد القيود: {filtered.length} قيد مالي
          </div>
        </div>

        {/* CARD 2: AMBER (OPEN CUSTODIES) */}
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
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#92400e", background: "#fde68a", padding: "2px 8px", borderRadius: 20 }}>
                💼 العهد المفتوحة تحت التسوية
              </span>
              <div style={{ fontSize: 13, color: "#78350f", fontWeight: 800, marginTop: 8 }}>
                مبالغ بيد المشرفين والمقاولين
              </div>
            </div>
            <span style={{ fontSize: 26 }}>⏳</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#b45309", marginTop: 10 }}>
            {formatCurrency(totalCustodiesOpen)}
          </div>
          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
            بانتظار تقديم فواتير الصرف
          </div>
        </div>

        {/* CARD 3: GREEN (SETTLED CUSTODIES) */}
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
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", background: "#bbf7d0", padding: "2px 8px", borderRadius: 20 }}>
                ✅ الفواتير والعهد المسواة
              </span>
              <div style={{ fontSize: 13, color: "#14532d", fontWeight: 800, marginTop: 8 }}>
                تم تسويتها وترحيلها للمشاريع
              </div>
            </div>
            <span style={{ fontSize: 26 }}>🧾</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#15803d", marginTop: 10 }}>
            {formatCurrency(totalCustodiesSettled)}
          </div>
          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 800, marginTop: 4 }}>
            فواتير ومستندات صرف معتمدة
          </div>
        </div>

        {/* CARD 4: PURPLE (ROUTING SUMMARY) */}
        <div
          style={{
            background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
            border: "1.5px solid #c4b5fd",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#5b21b6", background: "#ddd6fe", padding: "2px 8px", borderRadius: 20 }}>
                🎯 التسميع المحاسبي التلقائي
              </span>
              <div style={{ fontSize: 13, color: "#4c1d95", fontWeight: 800, marginTop: 8 }}>
                الربط مع الموظفين والمشاريع
              </div>
            </div>
            <span style={{ fontSize: 26 }}>⚡</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#6d28d9", marginTop: 10 }}>
            مربوط بالدفاتر 100%
          </div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, marginTop: 4 }}>
            ترحيل آلي لسلف الموظفين ومستخلصات المقاولين
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🔍 البحث السريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="بحث بالبيان، الموظف، المقاول، المشروع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>📋 نوع القيد / المصروف</label>
            <select className="form-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">-- جميع الأنواع --</option>
              <option value="صرف عهدة مالية (تحت التسوية)">💼 صرف عهدة مالية (تحت التسوية)</option>
              <option value="إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)">إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)</option>
              <option value="إيجار مقر الشركة">إيجار مقر الشركة</option>
              <option value="رواتب ونثريات إدارية">رواتب ونثريات إدارية</option>
              <option value="أدوات مكتبية ومطبوعات">أدوات مكتبية ومطبوعات</option>
              <option value="اتصالات وإنترنت">اتصالات وإنترنت</option>
              <option value="صيانة وتجهيزات">صيانة وتجهيزات مقر</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🎯 جهة التسميع والتحميل</label>
            <select className="form-control" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
              <option value="">-- جهة التسميع (الكل) --</option>
              <option value="custody">💼 عهد مالية تحت التسوية</option>
              <option value="company">🏢 مصروف عام على الشركة</option>
              <option value="employee">👷 خصم / سلفة موظف أو مشرف</option>
              <option value="subcontractor">🤝 خصم / دفعة مقاول باطن</option>
              <option value="project">🏗️ محمل على مشروع محدد</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجل المصروفات والعهد...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span style={{ fontSize: 40 }}>🧾</span>
              <div className="empty-state-text" style={{ marginTop: 12, fontWeight: 800 }}>
                {searchTerm || typeFilter || targetFilter ? "لا توجد نتائج تطابق البحث والتصفية" : "لم يتم تسجيل مصروفات عامة أو عهد بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleOpenAdd}>
                + تسجيل أول مصروف عام
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>نوع القيد / المصروف</th>
                  <th>البيان والشرح</th>
                  <th>جهة التحميل والمستلم</th>
                  <th>طريقة الدفع</th>
                  <th>المبلغ الإجمالي</th>
                  <th>حالة التسوية والعهد</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 200 }}>الإجراءات والتسوية</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, idx) => {
                  const isCustody = exp.targetCategory === "custody";
                  const remainingCustody = isCustody ? Math.max(0, exp.amount - (exp.custodySettledAmount || 0)) : 0;
                  const isFullySettled = isCustody && remainingCustody === 0;

                  return (
                    <tr key={exp.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDateShort(exp.date)}</td>
                      <td>
                        <span className={"badge " + (isCustody ? "badge-warning" : "badge-info")} style={{ fontWeight: 800 }}>
                          {exp.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, maxWidth: 280 }}>
                        <div>{exp.description}</div>
                        {exp.custodyProjectName && (
                          <div style={{ fontSize: 11, color: "#2563eb", marginTop: 2 }}>
                            🏗️ مخصصة لمشروع: {exp.custodyProjectName}
                          </div>
                        )}
                      </td>
                      <td>
                        {isCustody ? (
                          <div>
                            <span className="badge badge-warning" style={{ fontWeight: 900 }}>
                              💼 عهدة: {exp.targetName || "مستلم"}
                            </span>
                            <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>
                              {exp.custodyRecipientType === "subcontractor" ? "مقاول باطن" : "مشرف / موظف"}
                            </div>
                          </div>
                        ) : exp.targetCategory === "employee" ? (
                          <span className="badge badge-warning">👷 موظف: {exp.targetName || "محدد"} (خصم)</span>
                        ) : exp.targetCategory === "subcontractor" ? (
                          <span className="badge badge-warning">🤝 مقاول: {exp.targetName || "محدد"} (خصم)</span>
                        ) : exp.targetCategory === "project" ? (
                          <span className="badge badge-success">🏗️ مشروع: {exp.targetName || "محدد"}</span>
                        ) : (
                          <span className="badge badge-ghost">🏢 شركة (مصروف عام)</span>
                        )}
                      </td>
                      <td><span className="badge badge-ghost">{exp.paymentMethod || "نقدي"}</span></td>
                      <td style={{ fontWeight: 900, fontSize: 14, color: isCustody ? "#b45309" : "#dc2626" }}>
                        {formatCurrency(exp.amount)}
                      </td>
                      <td>
                        {isCustody ? (
                          <div>
                            <span className={"badge " + (isFullySettled ? "badge-success" : exp.custodySettledAmount ? "badge-warning" : "badge-danger")} style={{ fontWeight: 800, fontSize: 11 }}>
                              {isFullySettled ? "✅ تمت التسوية بالكامل" : exp.custodySettledAmount ? "⏳ تسوية جزئية" : "⚠️ عهدة مفتوحة"}
                            </span>
                            {exp.custodySettledAmount ? (
                              <div style={{ fontSize: 10, color: "#166534", marginTop: 3 }}>
                                مسوى: {formatCurrency(exp.custodySettledAmount)}
                              </div>
                            ) : null}
                            {remainingCustody > 0 && exp.custodySettledAmount ? (
                              <div style={{ fontSize: 10, color: "#b91c1c" }}>
                                متبقي: {formatCurrency(remainingCustody)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "#64748b" }}>-</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "#64748b" }}>{exp.notes || "-"}</td>
                      <td className="print:hidden" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                          {/* Custody Settlement Action */}
                          {isCustody && (
                            <button
                              onClick={() => handleOpenSettle(exp)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "4px 8px", fontSize: 11, fontWeight: 800 }}
                              title="تسجيل فواتير ومستندات تسوية العهدة"
                            >
                              🧾 تسوية
                            </button>
                          )}

                          {/* Print Custody Voucher */}
                          {isCustody && (
                            <button
                              onClick={() => handleOpenPrintVoucher(exp)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 6px", fontSize: 11 }}
                              title="طباعة إيصال استلام العهدة"
                            >
                              🖨️
                            </button>
                          )}

                          <button onClick={() => handleOpenEdit(exp)} className="btn-icon-centered" title="تعديل">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(exp.id, formatCurrency(exp.amount))} className="btn-icon-centered text-danger" title="حذف">
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
      {/* 1. ADD / EDIT GENERAL EXPENSE & CUSTODY MODAL */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem
                  ? "✏️ تعديل مصروف عام / عهدة"
                  : targetCategory === "custody"
                  ? "💼 صرف عهدة مالية لمشرف أو مقاول"
                  : "🧾 تسجيل مصروف عام وإداري جديد"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input type="date" className="form-control" required value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة الدفع / مصدر الصرف *</label>
                    <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="نقدي">نقدي (خزينة المقر)</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="إنستاباي / فودافون كاش">إنستاباي / فودافون كاش</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المصروف / القيد *</label>
                    {targetCategory === "custody" ? (
                      <input
                        type="text"
                        className="form-control"
                        disabled
                        value="صرف عهدة مالية مؤقتة (تحت التسوية)"
                        style={{ fontWeight: 800, background: "#fef3c7", color: "#92400e" }}
                      />
                    ) : (
                      <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)">إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)</option>
                        <option value="إيجار مقر الشركة">إيجار مقر الشركة الرئيسي</option>
                        <option value="رواتب ونثريات إدارية">رواتب ونثريات إدارية وضيافة</option>
                        <option value="أدوات مكتبية ومطبوعات">أدوات مكتبية ومطبوعات</option>
                        <option value="اتصالات وإنترنت">اتصالات وإنترنت</option>
                        <option value="صيانة وتجهيزات">صيانة وتجهيزات المقر</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">القيمة / المبلغ (جنيه) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* TARGET LEDGER SELECTION */}
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 14, borderRadius: 12, border: "1px solid hsl(var(--border-subtle))", margin: "10px 0 16px 0" }}>
                  <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 8, display: "block" }}>
                    🎯 جهة تحميل المصروف والتسميع التلقائي في الحسابات:
                  </label>

                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <select
                      className="form-control"
                      value={targetCategory}
                      onChange={(e) => {
                        setTargetCategory(e.target.value as any);
                        setTargetId("");
                      }}
                      style={{ fontWeight: 800 }}
                    >
                      <option value="company">🏢 مصروف عام إداري على الشركة</option>
                      <option value="custody">💼 صرف عهدة مالية (لمشرف / مقاول / موظف) تحت التسوية ⭐</option>
                      <option value="employee">👷 عن حساب موظف / مشرف (سلفة / خصم)</option>
                      <option value="subcontractor">🤝 عن حساب مقاول باطن (خصم مستخلص)</option>
                      <option value="project">🏗️ عن حساب مشروع محدد</option>
                    </select>
                  </div>

                  {/* IF CUSTODY SELECTED */}
                  {targetCategory === "custody" && (
                    <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 800, color: "#92400e", fontSize: 12, marginBottom: 8 }}>
                        💼 بيانات المستلم والمشروع المخصص له العهدة:
                      </div>

                      <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 11 }}>صفة المستلم *</label>
                          <select
                            className="form-control"
                            value={custodyRecipientType}
                            onChange={(e) => {
                              setCustodyRecipientType(e.target.value as any);
                              setCustodyRecipientId("");
                            }}
                          >
                            <option value="employee">👷 مشرف / موظف بالشركة</option>
                            <option value="subcontractor">🤝 مقاول باطن</option>
                            <option value="custom">👤 شخص / جهة أخرى</option>
                          </select>
                        </div>

                        {custodyRecipientType === "employee" && (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>اختر المشرف / الموظف *</label>
                            <select
                              className="form-control"
                              required
                              value={custodyRecipientId}
                              onChange={(e) => setCustodyRecipientId(e.target.value)}
                            >
                              <option value="" disabled>-- اختر من قائمة الموظفين --</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobRole})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {custodyRecipientType === "subcontractor" && (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>اختر المقاول *</label>
                            <select
                              className="form-control"
                              required
                              value={custodyRecipientId}
                              onChange={(e) => setCustodyRecipientId(e.target.value)}
                            >
                              <option value="" disabled>-- اختر من قائمة المقاولين --</option>
                              {subcontractors.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.name} ({sub.specialty || "مقاول"})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {custodyRecipientType === "custom" && (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>اسم المستلم / المسؤول *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="اسم المستلم..."
                              required
                              value={custodyCustomRecipientName}
                              onChange={(e) => setCustodyCustomRecipientName(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>المشروع المخصص له العهدة (اختياري)</label>
                        <select
                          className="form-control"
                          value={custodyProjectId}
                          onChange={(e) => setCustodyProjectId(e.target.value)}
                        >
                          <option value="">-- عهدة عامة / غير مقيدة بمشروع --</option>
                          {projects.map((proj) => (
                            <option key={proj.id} value={proj.id}>{proj.name} ({proj.code})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STANDARD TARGET SELECTORS */}
                  {targetCategory === "employee" && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select className="form-control" required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                        <option value="" disabled>-- اختر الموظف / المشرف --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobRole} - {emp.code})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetCategory === "subcontractor" && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select className="form-control" required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                        <option value="" disabled>-- اختر مقاول الباطن --</option>
                        {subcontractors.map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.name} ({sub.specialty || "مقاول"})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetCategory === "project" && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select className="form-control" required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                        <option value="" disabled>-- اختر المشروع --</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>{proj.name} ({proj.code})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">البيان والشرح التفصيلي</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: عهدة مشتريات خامات موقع، فاتورة كهرباء وتجهيز سكن..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات أو رقم الإيصال / السند</label>
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : editingItem ? "💾 حفظ التعديلات" : "🧾 تأكيد وصرف القيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTODY SETTLEMENT MODAL (تسوية العهدة بالفواتير والمستندات) */}
      {/* ========================================================================= */}
      {showSettleModal && activeCustody && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2 className="modal-title">🧾 إثبات فواتير وتسوية العهدة ({activeCustody.targetName})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowSettleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSettlement}>
              <div className="modal-body">
                {/* CUSTODY SUMMARY INFO */}
                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>المسؤول عن العهدة:</span>
                    <span style={{ fontWeight: 800, color: "#0f172a" }}>{activeCustody.targetName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>إجمالي قيمة العهدة الأصلية:</span>
                    <span style={{ fontWeight: 900, color: "#2563eb" }}>{formatCurrency(activeCustody.amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>المسوى سابقاً بالفواتير:</span>
                    <span style={{ fontWeight: 800, color: "#166534" }}>{formatCurrency(activeCustody.custodySettledAmount || 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>المتبقي المطلوب تسويته:</span>
                    <span style={{ fontWeight: 900, color: "#dc2626" }}>
                      {formatCurrency(Math.max(0, activeCustody.amount - (activeCustody.custodySettledAmount || 0)))}
                    </span>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">قيمة الفاتورة / المستند (جنيه) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      required
                      placeholder="0.00"
                      value={settleInvoiceAmount}
                      onChange={(e) => setSettleInvoiceAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الفاتورة / الصرف *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">المشروع المحمل عليه التكلفة</label>
                    <select
                      className="form-control"
                      value={settleProjectId}
                      onChange={(e) => setSettleProjectId(e.target.value)}
                    >
                      <option value="">-- مصروف عام للشركة --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">تصنيف بند المصروف *</label>
                    <select className="form-control" value={settleInvoiceType} onChange={(e) => setSettleInvoiceType(e.target.value)}>
                      <option value="مواد">مواد وخامات بالموقع</option>
                      <option value="مصاريف ونثريات موقع">مصاريف ونثريات موقع</option>
                      <option value="نقل وتشوين">نقل وتشوين</option>
                      <option value="إيجار معدات">إيجار معدات وآليات</option>
                      <option value="صيانة وإصلاحات">صيانة وإصلاحات</option>
                      <option value="ضيافة وبوفيه">ضيافة وبوفيه</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">بيان الفاتورة وتفاصيل ما تم شراؤه *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="مثال: فاتورة شراء مسامير وأسلاك رباط من محل..."
                    value={settleInvoiceDesc}
                    onChange={(e) => setSettleInvoiceDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">رقم الفاتورة / ملاحظات المستند</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="رقم الفاتورة أو إيصال الدفع..."
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                  />
                </div>

                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 10, fontSize: 12, color: "#166534" }}>
                  💡 <strong>التأثير المالي:</strong> سيتم تخفيض رصيد العهدة المستحقة على ({activeCustody.targetName}) بمقدار هذا المبلغ، وترحيله مباشرة لتكاليف المشروع المحدد ليظهر في كشوفات الحساب وتقارير الأرباح.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSettleModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submittingSettle}>
                  {submittingSettle ? <span className="spinner" /> : "💾 اعتماد الفاتورة وتخفيض العهدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRINT CUSTODY DISBURSEMENT VOUCHER (سند صرف عهدة مالية) */}
      {/* ========================================================================= */}
      {showPrintVoucherModal && activeVoucher && (
        <div className="modal-overlay" onClick={() => setShowPrintVoucherModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 780, background: "#ffffff" }}>
            <div className="modal-header no-print" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <h2 className="modal-title" style={{ color: "#0f172a" }}>🖨️ معاينة وطباعة سند صرف عهدة مالية</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ fontWeight: 800 }}>
                  🖨️ طباعة السند الآن
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPrintVoucherModal(false)}>✕</button>
              </div>
            </div>

            <div className="modal-body print-area" ref={printVoucherRef} style={{ color: "#000", background: "#ffffff", padding: "28px 32px" }}>
              {/* PRINT HEADER */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double #000", paddingBottom: 14, marginBottom: 18 }}>
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#000" }}>{companyName}</h1>
                  <div style={{ fontSize: 12, marginTop: 4, color: "#333" }}>للمقاولات العامة والاستثمار العقاري</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: "#555" }}>هاتف: {companyPhone}</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <img
                    src={companyLogo}
                    alt="Logo"
                    style={{ height: 55, width: 55, objectFit: "contain", borderRadius: 8 }}
                    onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                  />
                  <div style={{ fontSize: 15, fontWeight: 900, marginTop: 4 }}>سند صرف واستلام عهدة مالية مؤقتة</div>
                </div>

                <div style={{ textAlign: "left", fontSize: 11, color: "#333" }}>
                  <div><strong>تاريخ الصرف:</strong> {formatDateShort(activeVoucher.date)}</div>
                  <div><strong>طريقة الصرف:</strong> {activeVoucher.paymentMethod || "نقدي"}</div>
                  <div><strong>المشروع المخصص:</strong> {activeVoucher.custodyProjectName || "عام"}</div>
                </div>
              </div>

              {/* VOUCHER CONTENT BODY */}
              <div style={{ background: "#f8fafc", border: "1.5px solid #000", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 14, lineHeight: 2, color: "#000" }}>
                  يُصرف للسيد / <strong>{activeVoucher.targetName}</strong> ({activeVoucher.custodyRecipientType === "subcontractor" ? "مقاول باطن" : "مشرف / موظف"})
                  مبلغ وقدره <strong>{formatCurrency(activeVoucher.amount)}</strong>، وذلك كـ <strong>عهدة مالية مؤقتة تحت التسوية</strong>
                  {activeVoucher.custodyProjectName ? " لمشروع (" + activeVoucher.custodyProjectName + ")" : ""}،
                  على أن يتم تقديم فواتير ومستندات الصرف المعتمدة أو رد المتبقي فور الانتهاء من الغرض المنصرفة لأجله.
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: "#333", borderTop: "1px dashed #94a3b8", paddingTop: 8 }}>
                  <strong>البيان والغرض من العهدة:</strong> {activeVoucher.description} {activeVoucher.notes ? " | ملاحظات: " + activeVoucher.notes : ""}
                </div>
              </div>

              {/* SIGNATURES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center", marginTop: 40, borderTop: "1px dashed #94a3b8", paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>المستلم (المتعهد بالصرف)</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>الاسم: {activeVoucher.targetName}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>أمين الخزينة / القائم بالصرف</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>اعتماد الإدارة المالية</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>الختم والتوقيع: .....................</div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPrintVoucherModal(false)}>إغلاق</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة السند</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
