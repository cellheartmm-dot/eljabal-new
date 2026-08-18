import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface SubcontractorDoc {
  id: string;
  projectId?: string;
  project?: { id: string; name: string };
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

interface SubcontractorWorkItem {
  id: string;
  subcontractorId: string;
  projectId: string;
  modelName: string;
  buildingName: string;
  floorName: string;
  surveyedQty: number;
  unit: string;
  subcontractorUnitPrice: number;
  progressPercent: number;
  executedQty: number;
  notes?: string;
}

interface SubcontractorDailyCrew {
  id: string;
  subcontractorId: string;
  projectId: string;
  date: string;
  craftsmenCount: number; // عدد الصنايعية
  craftsmenRate: number;  // سعر يومية الصنايعي
  helpersCount: number;   // عدد المساعدين
  helpersRate: number;    // سعر يومية المساعد
  notes?: string;
}

interface Subcontractor {
  id: string;
  name: string;
  specialty?: string;
  contractType?: string;
  projectId?: string;
  phone?: string;
  notes?: string;
  docs?: SubcontractorDoc[];
}

interface Project {
  id: string;
  code: string;
  name: string;
}

interface ProjectPhase {
  id: string;
  projectId: string;
  modelName?: string;
  phaseName: string;
  unit: string;
  unitPrice?: number;
  totalSurveyedQty?: number;
  notes?: string;
}

export default function SubcontractorsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Selected Subcontractor Profile / Works Modal
  const [selectedSub, setSelectedSub] = useState<Subcontractor | null>(null);
  const [subActiveTab, setSubActiveTab] = useState("works"); // "works", "dailies", "payments", "statement_print"

  // Data lists for selected subcontractor
  const [subWorks, setSubWorks] = useState<SubcontractorWorkItem[]>([]);
  const [subDailies, setSubDailies] = useState<SubcontractorDailyCrew[]>([]);
  const [subPayments, setSubPayments] = useState<SubcontractorDoc[]>([]);
  const [projectPhases, setProjectPhases] = useState<ProjectPhase[]>([]);

  // Work Assignment Form State (الربط الآلي بالنماذج والأدوار)
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [workProjectId, setWorkProjectId] = useState("");
  const [workModelName, setWorkModelName] = useState("");
  const [workBuildingName, setWorkBuildingName] = useState("عمارة 1");
  const [workFloorName, setWorkFloorName] = useState("الدور الأرضي");
  const [workSurveyedQty, setWorkSurveyedQty] = useState("");
  const [workUnit, setWorkUnit] = useState("م² (متر مسطح)");
  const [workSubPrice, setWorkSubPrice] = useState("");
  const [workProgressPercent, setWorkProgressPercent] = useState("100");

  // Daily Crew Form State (مقاول اليومية - صنايعية ومساعدين)
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyProjectId, setDailyProjectId] = useState("");
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [craftsmenCount, setCraftsmenCount] = useState("2");
  const [craftsmenRate, setCraftsmenRate] = useState("350");
  const [helpersCount, setHelpersCount] = useState("2");
  const [helpersRate, setHelpersRate] = useState("200");
  const [dailyNotes, setDailyNotes] = useState("");

  // Payment Voucher Form State (دفعات وخصومات حساب المقاول)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProjectId, setPaymentProjectId] = useState("");
  const [paymentType, setPaymentType] = useState("دفعة تحت الحساب");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentRecipient, setPaymentRecipient] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // New Subcontractor Claim Modal State (إضافة مستخلص مقاول باطن جديد)
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [claimCode, setClaimCode] = useState("SC0001");
  const [claimSubcontractorId, setClaimSubcontractorId] = useState("");
  const [claimProjectId, setClaimProjectId] = useState("");
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split("T")[0]);
  const [claimPeriodFrom, setClaimPeriodFrom] = useState("");
  const [claimPeriodTo, setClaimPeriodTo] = useState("");
  const [claimPaymentStatus, setClaimPaymentStatus] = useState("مدفوع بالكامل");
  const [claimNotes, setClaimNotes] = useState("");

  const [claimItems, setClaimItems] = useState<any[]>([
    {
      id: "item-1",
      name: "",
      modelName: "",
      buildingName: "",
      floorName: "",
      unit: "م²",
      surveyedQty: 0,
      progressPercent: 100,
      executedQty: 0,
      unitPrice: 0,
      totalPrice: 0,
    },
  ]);

  const handleAddItemRow = () => {
    setClaimItems((prev) => [
      ...prev,
      {
        id: "item-" + Date.now(),
        name: "",
        modelName: "",
        buildingName: "",
        floorName: "",
        unit: "م²",
        surveyedQty: 0,
        progressPercent: 100,
        executedQty: 0,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (claimItems.length === 1) return;
    setClaimItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemRow = (id: string, field: string, value: any) => {
    setClaimItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        if (field === "surveyedQty" || field === "progressPercent") {
          const sq = parseFloat(field === "surveyedQty" ? value : updated.surveyedQty) || 0;
          const pp = parseFloat(field === "progressPercent" ? value : updated.progressPercent) || 0;
          updated.executedQty = sq * (pp / 100);
        }

        if (field === "executedQty" || field === "unitPrice" || field === "surveyedQty" || field === "progressPercent") {
          const eq = parseFloat(updated.executedQty) || 0;
          const up = parseFloat(updated.unitPrice) || 0;
          updated.totalPrice = eq * up;
        }

        return updated;
      })
    );
  };

  const handleProjectSelect = async (pId: string) => {
    setClaimProjectId(pId);
    if (!pId) return;

    try {
      // Fetch phases for this project from Supabase
      const { data: phasesData } = await supabase
        .from("ProjectPhase")
        .select("*")
        .eq("projectId", pId);

      let phases = phasesData || [];
      if (phases.length === 0) {
        const stored = localStorage.getItem(`phases_${pId}`);
        if (stored) phases = JSON.parse(stored);
      }

      if (phases && phases.length > 0) {
        const populated: any[] = [];
        phases.forEach((p: any) => {
          let subPrice = p.unitPrice || 0;
          let buildingItemsList: any[] = [];

          if (p.notes) {
            try {
              const parsed = JSON.parse(p.notes);
              if (parsed.subcontractorUnitPrice) subPrice = parsed.subcontractorUnitPrice;
              if (parsed.buildingItems && Array.isArray(parsed.buildingItems)) {
                buildingItemsList = parsed.buildingItems;
              }
            } catch (e) {}
          }

          if (buildingItemsList.length > 0) {
            buildingItemsList.forEach((b: any) => {
              const sq = b.quantity || p.totalSurveyedQty || 100;
              const pp = 100;
              const eq = sq * (pp / 100);
              const up = subPrice || p.unitPrice || 0;
              populated.push({
                id: "item-" + Math.random(),
                name: p.phaseName || "بند أعمال",
                modelName: p.modelName || "نموذج عام",
                buildingName: b.buildingName || "عمارة 1",
                floorName: b.floorName || "الدور الأرضي",
                unit: p.unit || "م²",
                surveyedQty: sq,
                progressPercent: pp,
                executedQty: eq,
                unitPrice: up,
                totalPrice: eq * up,
              });
            });
          } else {
            const sq = p.totalSurveyedQty || 100;
            const pp = 100;
            const eq = sq * (pp / 100);
            const up = subPrice || p.unitPrice || 0;
            populated.push({
              id: "item-" + Math.random(),
              name: p.phaseName || "بند أعمال",
              modelName: p.modelName || "نموذج عام",
              buildingName: "عمارة 1",
              floorName: "جميع الأدوار",
              unit: p.unit || "م²",
              surveyedQty: sq,
              progressPercent: pp,
              executedQty: eq,
              unitPrice: up,
              totalPrice: eq * up,
            });
          }
        });

        if (populated.length > 0) {
          setClaimItems(populated);
          showToast(`⚡ تم سحب وتعبئة (${populated.length}) بند تلقائياً من مراحل المشروع! أدخل النسب والأسعار فقط ✅`, "success");
          return;
        }
      }
    } catch (e) {}

    // Fallback preset items if project has no custom phases registered yet
    const fallbackPresets = [
      { id: "f-1", name: "مباني", modelName: "نموذج A", buildingName: "عمارة 1", floorName: "الدور الأرضي", unit: "م²", surveyedQty: 100, progressPercent: 100, executedQty: 100, unitPrice: 0, totalPrice: 0 },
      { id: "f-2", name: "حدادة مسلحة", modelName: "نموذج A", buildingName: "عمارة 1", floorName: "الدور الأول", unit: "م³", surveyedQty: 50, progressPercent: 100, executedQty: 50, unitPrice: 0, totalPrice: 0 },
      { id: "f-3", name: "نجارة مسلحة", modelName: "نموذج A", buildingName: "عمارة 1", floorName: "الدور الأول", unit: "م³", surveyedQty: 50, progressPercent: 100, executedQty: 50, unitPrice: 0, totalPrice: 0 },
    ];
    setClaimItems(fallbackPresets);
    showToast("⚡ تم تجهيز بنود مراحل العمل افتراضياً، قم بتعديل النسب والأسعار 📝", "info");
  };

  const handleOpenNewClaim = (subId?: string, projId?: string) => {
    setClaimCode(`SC${String(subcontractors.length + 1).padStart(4, "0")}`);
    if (subId) setClaimSubcontractorId(subId);

    const targetProjectId = projId || (projects.length > 0 ? projects[0].id : "");
    if (targetProjectId) {
      handleProjectSelect(targetProjectId);
    }
    setShowNewClaimModal(true);
  };

  const handleSaveNewClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimSubcontractorId || !claimProjectId) {
      showToast("برجاء اختيار المقاول والمشروع المستهدف", "warning");
      return;
    }

    const overallTotal = claimItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    if (overallTotal <= 0) {
      showToast("برجاء إدخال البنود والكميات وسعر الوحدة بشكل صحيح", "warning");
      return;
    }

    const subObj = subcontractors.find((s) => s.id === claimSubcontractorId);
    const subName = subObj ? subObj.name : "مقاول باطن";

    const itemsSummary = claimItems
      .filter((i) => i.name.trim())
      .map((i) => `${i.name} (${i.executedQty} ${i.unit} × ${i.unitPrice})`)
      .join(" | ");

    const newDoc = {
      subcontractorId: claimSubcontractorId,
      projectId: claimProjectId,
      type: `مستخلص (${claimCode})`,
      description: `مستخلص أعمال رقم ${claimCode} للمقاول (${subName}) - بنود: ${itemsSummary}`,
      amount: overallTotal,
      status: claimPaymentStatus,
      date: new Date(claimDate).toISOString(),
    };

    try {
      await supabase.from("SubcontractorDoc").insert([newDoc]);

      // Also post to Project Expense as Subcontractor Execution Expense
      await supabase.from("ProjectExpense").insert([
        {
          projectId: claimProjectId,
          type: "مقاولون",
          amount: overallTotal,
          description: `مستخلص أعمال رقم ${claimCode} للمقاول (${subName})`,
          notes: `[meta:supervisor=الإدارة|targetCategory=مقاول باطن|targetName=${subName}|status=✅ معتمد ومرحل] ${claimNotes}`,
          date: new Date(claimDate).toISOString(),
        },
      ]);
    } catch (err) {}

    const updatedDocs = [{ ...newDoc, id: "doc-" + Date.now() }, ...subPayments];
    setSubPayments(updatedDocs);
    localStorage.setItem(`sub_payments_${claimSubcontractorId}`, JSON.stringify(updatedDocs));

    showToast(`تم حفظ وتأكيد مستخلص الأعمال برقم ${claimCode} بقيمة (${overallTotal} ج.م) بنجاح 📋✅`, "success");
    setShowNewClaimModal(false);
  };

  const fetchSubcontractors = async () => {
    setLoading(true);
    try {
      const [subRes, projRes] = await Promise.all([
        supabase.from("Subcontractor").select("*, docs:SubcontractorDoc(*)").order("name", { ascending: true }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
      ]);

      if (subRes.data) {
        const processed = subRes.data.map((sub: any) => {
          let contractType = "بالقاطع / بالمتر";
          let projectId = "";
          let cleanNotes = sub.notes || "";

          if (sub.notes && sub.notes.includes("[meta:")) {
            const ctMatch = sub.notes.match(/contractType=([^\|\]]+)/);
            if (ctMatch) contractType = ctMatch[1];
            const pMatch = sub.notes.match(/projectId=([^\|\]]+)/);
            if (pMatch) projectId = pMatch[1];
            cleanNotes = sub.notes.replace(/\[meta:[^\]]+\]/, "").trim();
          }

          return { ...sub, contractType, projectId, notes: cleanNotes };
        });
        setSubcontractors(processed);
      }
      if (projRes.data) setProjects(projRes.data);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل مقاولي الباطن", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  // Whenever a subcontractor is selected, fetch their works, dailies & payments
  useEffect(() => {
    if (!selectedSub) return;

    const loadSubDetails = async () => {
      const subId = selectedSub.id;

      // 1. Works
      const localW = localStorage.getItem(`sub_works_${subId}`);
      setSubWorks(localW ? JSON.parse(localW) : []);

      // 2. Daily Crew Attendance
      const localD = localStorage.getItem(`sub_dailies_${subId}`);
      setSubDailies(localD ? JSON.parse(localD) : []);

      // 3. Payments
      try {
        const { data: pData } = await supabase
          .from("SubcontractorDoc")
          .select("*, project:Project(name)")
          .eq("subcontractorId", subId)
          .order("date", { ascending: false });
        if (pData) setSubPayments(pData);
      } catch (e) {
        const localP = localStorage.getItem(`sub_payments_${subId}`);
        setSubPayments(localP ? JSON.parse(localP) : []);
      }
    };

    loadSubDetails();
  }, [selectedSub]);

  // When project is selected in Work Modal, load project models/phases
  const handleWorkProjectChange = async (projId: string) => {
    setWorkProjectId(projId);
    if (!projId) return;

    try {
      const { data: phasesData } = await supabase
        .from("ProjectPhase")
        .select("*")
        .eq("projectId", projId);
      if (phasesData && phasesData.length > 0) {
        setProjectPhases(phasesData);
        if (phasesData[0].modelName) setWorkModelName(phasesData[0].modelName);
        if (phasesData[0].totalSurveyedQty) setWorkSurveyedQty(phasesData[0].totalSurveyedQty.toString());
        if (phasesData[0].unit) setWorkUnit(phasesData[0].unit);
      } else {
        const storedPhases = localStorage.getItem(`phases_${projId}`);
        if (storedPhases) {
          const list = JSON.parse(storedPhases);
          setProjectPhases(list);
          if (list[0]?.modelName) setWorkModelName(list[0].modelName);
        }
      }
    } catch (e) {}
  };

  // Add Work Assignment Handler
  const handleSaveWorkAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !workProjectId) return;

    const surveyed = parseFloat(workSurveyedQty) || 0;
    const progress = parseFloat(workProgressPercent) || 100;
    const executed = (surveyed * progress) / 100;
    const price = parseFloat(workSubPrice) || 0;

    const newWork: SubcontractorWorkItem = {
      id: "work-" + Date.now(),
      subcontractorId: selectedSub.id,
      projectId: workProjectId,
      modelName: workModelName || "نموذج عام",
      buildingName: workBuildingName,
      floorName: workFloorName,
      surveyedQty: surveyed,
      unit: workUnit,
      subcontractorUnitPrice: price,
      progressPercent: progress,
      executedQty: executed,
    };

    const updated = [newWork, ...subWorks];
    setSubWorks(updated);
    localStorage.setItem(`sub_works_${selectedSub.id}`, JSON.stringify(updated));
    showToast("تم إسناد العمل للمقاول بنجاح الربط ببيانات الحصر ✅", "success");
    setShowWorkModal(false);
  };

  // Add Daily Crew Attendance Handler
  const handleSaveDailyCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !dailyProjectId) return;

    const cCount = parseFloat(craftsmenCount) || 0;
    const cRate = parseFloat(craftsmenRate) || 0;
    const hCount = parseFloat(helpersCount) || 0;
    const hRate = parseFloat(helpersRate) || 0;

    const newDaily: SubcontractorDailyCrew = {
      id: "sub-daily-" + Date.now(),
      subcontractorId: selectedSub.id,
      projectId: dailyProjectId,
      date: dailyDate,
      craftsmenCount: cCount,
      craftsmenRate: cRate,
      helpersCount: hCount,
      helpersRate: hRate,
      notes: dailyNotes,
    };

    const updated = [newDaily, ...subDailies];
    setSubDailies(updated);
    localStorage.setItem(`sub_dailies_${selectedSub.id}`, JSON.stringify(updated));
    showToast("تم تسجيل يومية طاقم المقاول بنجاح ✅", "success");
    setShowDailyModal(false);
  };

  // Add Subcontractor Payment/Deduction Handler (تسميع في المصروفات فوراً)
  const handleSavePaymentVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !paymentProjectId || !paymentAmount) return;

    const amt = parseFloat(paymentAmount);
    const isDeduction = paymentType.includes("خصم");
    const reasonStr = deductionReason ? ` [سبب الخصم: ${deductionReason}]` : "";
    const fullDesc = `${paymentType} للمقاول (${selectedSub.name})${reasonStr}${paymentNotes ? " - " + paymentNotes : ""}`;

    const newDoc = {
      subcontractorId: selectedSub.id,
      projectId: paymentProjectId,
      type: isDeduction ? "خصم / استقطاع مالي" : "دفعة تحت الحساب",
      description: fullDesc,
      amount: amt,
      status: isDeduction ? "مخصوم" : "مدفوع",
      date: new Date(paymentDate).toISOString(),
    };

    try {
      await supabase.from("SubcontractorDoc").insert([newDoc]);

      // If payment (not deduction), post directly to Project Expense as well
      if (!isDeduction) {
        await supabase.from("ProjectExpense").insert([
          {
            projectId: paymentProjectId,
            type: "مقاولون",
            amount: amt,
            description: `دفعة لمقاول الباطن (${selectedSub.name}): ${paymentNotes || "دفعة تحت الحساب"}`,
            notes: `[meta:supervisor=الإدارة|targetCategory=مقاول باطن|targetName=${selectedSub.name}|status=✅ معتمد ومرحل] ${paymentNotes}`,
            date: new Date(paymentDate).toISOString(),
          },
        ]);
      }
    } catch (err) {}

    const updated = [{ ...newDoc, id: "doc-" + Date.now() }, ...subPayments];
    setSubPayments(updated);
    localStorage.setItem(`sub_payments_${selectedSub.id}`, JSON.stringify(updated));

    showToast(isDeduction ? "تم تسجيل الخصم وتسميعه في حساب المقاول بنجاح 🛑✅" : "تم تسجيل الدفعة وتسميعها في حساب المقاول ومصروفات المشروع بنجاح 💵✅", "success");
    setShowPaymentModal(false);
    setDeductionReason("");
    setPaymentNotes("");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المقاول (${name})؟`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("Subcontractor").delete().eq("id", id);
      if (error) throw error;
      showToast(`تم حذف المقاول ${name} بنجاح ✅`, "success");
      fetchSubcontractors();
    } catch (e: any) {
      showToast(e.message || "فشل في حذف المقاول", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = subcontractors.filter((sub) => {
    const s = searchTerm.toLowerCase();
    return (
      sub.name.toLowerCase().includes(s) ||
      (sub.phone && sub.phone.includes(s)) ||
      (sub.specialty && sub.specialty.toLowerCase().includes(s))
    );
  });

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🤝 مقاولو الباطن وسجلات المستخلصات</h1>
          <p className="page-subtitle">إدارة عقود وأشغال مقاولي الباطن، ربط النماذج والأدوار، مستخلصات الأعمال، وحساب طاقم اليومية</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-gold" onClick={() => handleOpenNewClaim()}>
            📋 + إضافة مستخلص جديد
          </button>
          <Link to="/subcontractors/create" className="btn btn-primary">
            + إضافة مقاول فرعي جديد
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="card print:hidden" style={{ padding: 16, marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث باسم المقاول، التخصص أو الهاتف</label>
          <input
            type="text"
            className="form-control"
            placeholder="ابحث هنا..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* SUBCONTRACTORS TABLE */}
      <div className="card print:hidden">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل قائمة مقاولي الباطن...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤝</div>
              <div className="empty-state-text">لا يوجد مقاولو باطن مطبق عليهم البحث</div>
              <Link to="/subcontractors/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + إضافة مقاول جديد
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>اسم المقاول / الشركة</th>
                  <th>التخصص / المهنة</th>
                  <th>نظام التعاقد</th>
                  <th>الهاتف</th>
                  <th style={{ textAlign: "center" }}>إدارة الأعمال والمستخلصات</th>
                  <th style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub, idx) => (
                  <tr key={sub.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800 }}>{sub.name}</td>
                    <td><span className="badge badge-info">{sub.specialty || "عام"}</span></td>
                    <td><span className="badge badge-warning">{sub.contractType || "بالقاطع"}</span></td>
                    <td>{sub.phone || "-"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: "5px 12px", fontSize: 12 }}
                        onClick={() => {
                          setSelectedSub(sub);
                          setSubActiveTab("works");
                        }}
                      >
                        📋 عرض الأشغال والمستخلص
                      </button>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <Link to={`/subcontractors/create?edit=${sub.id}`} className="btn-icon-centered" title="تعديل">
                          ✏️
                        </Link>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          disabled={deletingId === sub.id}
                          className="btn-icon-centered text-danger"
                          title="حذف"
                        >
                          {deletingId === sub.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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

      {/* SELECTED SUBCONTRACTOR WORKS & STATEMENT MODAL */}
      {selectedSub && (
        <div className="modal-overlay print:p-0" onClick={() => setSelectedSub(null)}>
          <div className="modal print:w-full print:max-w-none print:shadow-none print:border-none" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 950, width: "95%" }}>
            <div className="modal-header print:hidden">
              <div>
                <h2 className="modal-title" style={{ fontSize: 18 }}>📋 أشغال ومستخلص المقاول: {selectedSub.name}</h2>
                <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                  التخصص: {selectedSub.specialty} • نظام التعاقد: {selectedSub.contractType}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedSub(null)}>✕</button>
            </div>

            {/* Subcontractor Sub-Tabs */}
            <div className="print:hidden" style={{ display: "flex", gap: 8, padding: "12px 16px", background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border-subtle))" }}>
              <button
                onClick={() => setSubActiveTab("works")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: subActiveTab === "works" ? "1px solid #3b82f6" : "1px solid transparent",
                  background: subActiveTab === "works" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                  color: subActiveTab === "works" ? "#fff" : "hsl(var(--text-primary))",
                }}
              >
                🏗️ أشغال وبنود المقاول ({subWorks.length})
              </button>

              {selectedSub.contractType?.includes("يومية") && (
                <button
                  onClick={() => setSubActiveTab("dailies")}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: subActiveTab === "dailies" ? "1px solid #3b82f6" : "1px solid transparent",
                    background: subActiveTab === "dailies" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                    color: subActiveTab === "dailies" ? "#fff" : "hsl(var(--text-primary))",
                  }}
                >
                  📅 يوميات الطاقم (صنايعية ومساعدين) ({subDailies.length})
                </button>
              )}

              <button
                onClick={() => setSubActiveTab("payments")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: subActiveTab === "payments" ? "1px solid #3b82f6" : "1px solid transparent",
                  background: subActiveTab === "payments" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                  color: subActiveTab === "payments" ? "#fff" : "hsl(var(--text-primary))",
                }}
              >
                💵 الدفعات المسددة ({subPayments.length})
              </button>

              <button
                onClick={() => setSubActiveTab("statement_print")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: subActiveTab === "statement_print" ? "1px solid #3b82f6" : "1px solid transparent",
                  background: subActiveTab === "statement_print" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                  color: subActiveTab === "statement_print" ? "#fff" : "hsl(var(--text-primary))",
                }}
              >
                📄 طباعة مستخلص الأعمال المعتمد (A4)
              </button>
            </div>

            <div className="modal-body" style={{ padding: 20 }}>
              {/* TAB 1: WORKS ASSIGNMENT */}
              {subActiveTab === "works" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800 }}>إسناد البنود وتحديد النماذج والأدوار للمقاول</h4>
                    <button className="btn btn-gold btn-sm" onClick={() => handleOpenNewClaim(selectedSub.id)}>
                      📋 + إضافة مستخلص جديد للمقاول
                    </button>
                  </div>

                  <div className="table-container">
                    {subWorks.length === 0 ? (
                      <div className="empty-state" style={{ padding: 20 }}>
                        <div className="empty-state-text">لم يتم إضافة مستخلصات أو بنود حصر لهذا المقاول بعد</div>
                        <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} onClick={() => handleOpenNewClaim(selectedSub.id)}>
                          📋 + إضافة أول مستخلص جديد
                        </button>
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>اسم النموذج</th>
                            <th>المبنى والدور</th>
                            <th>كمية الحصر</th>
                            <th>سعر المتر للبند</th>
                            <th>نسبة التنفيذ %</th>
                            <th>الكمية المنفذة</th>
                            <th>المستحق الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subWorks.map((w, idx) => {
                            const totalAmount = (w.executedQty || 0) * (w.subcontractorUnitPrice || 0);
                            return (
                              <tr key={w.id || idx}>
                                <td>{idx + 1}</td>
                                <td style={{ fontWeight: 700 }}>{w.modelName}</td>
                                <td>{w.buildingName} - {w.floorName}</td>
                                <td>{w.surveyedQty} {w.unit}</td>
                                <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{formatCurrency(w.subcontractorUnitPrice)}</td>
                                <td><span className="badge badge-warning">{w.progressPercent}%</span></td>
                                <td style={{ fontWeight: 800, color: "#10b981" }}>{w.executedQty}</td>
                                <td style={{ fontWeight: 900, color: "#3b82f6" }}>{formatCurrency(totalAmount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DAILY CREW ATTENDANCE (مقاول اليومية) */}
              {subActiveTab === "dailies" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800 }}>تسجيل يوميات طاقم المقاول (صنايعية ومساعدين)</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowDailyModal(true)}>
                      + تسجيل يومية طاقم جديدة
                    </button>
                  </div>

                  <div className="table-container">
                    {subDailies.length === 0 ? (
                      <div className="empty-state" style={{ padding: 20 }}>
                        <div className="empty-state-text">لم يتم تسجيل يوميات لطاقم العمل بعد</div>
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>عدد الصنايعية</th>
                            <th>سعر يومية الصنايعي</th>
                            <th>عدد المساعدين</th>
                            <th>سعر يومية المساعد</th>
                            <th>إجمالي استحقاق اليومية</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subDailies.map((d, idx) => {
                            const dailyTotal = (d.craftsmenCount * d.craftsmenRate) + (d.helpersCount * d.helpersRate);
                            return (
                              <tr key={d.id || idx}>
                                <td>{formatDateShort(d.date)}</td>
                                <td>{d.craftsmenCount} صنايعي</td>
                                <td style={{ color: "hsl(var(--gold))", fontWeight: 700 }}>{formatCurrency(d.craftsmenRate)}</td>
                                <td>{d.helpersCount} مساعد</td>
                                <td style={{ color: "hsl(var(--gold))", fontWeight: 700 }}>{formatCurrency(d.helpersRate)}</td>
                                <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(dailyTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENTS */}
              {subActiveTab === "payments" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800 }}>سجل الدفعات المسددة للمقاول</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
                      + تسجيل دفعة جديدة للمقاول
                    </button>
                  </div>

                  <div className="table-container">
                    {subPayments.length === 0 ? (
                      <div className="empty-state" style={{ padding: 20 }}>
                        <div className="empty-state-text">لم يتم تسجيل دفعات مسددة لهذا المقاول بعد</div>
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>البيان والشرح</th>
                            <th>المبلغ المسدد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subPayments.map((p, idx) => (
                            <tr key={p.id || idx}>
                              <td>{formatDateShort(p.date)}</td>
                              <td><span className="badge badge-info">{p.type}</span></td>
                              <td>{p.description}</td>
                              <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: OFFICIAL WORK STATEMENT PRINT (A4) */}
              {subActiveTab === "statement_print" && (
                <div style={{ background: "#ffffff", color: "#0f172a", padding: 30, borderRadius: 12, border: "1px solid #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #1e3a8a", paddingBottom: 14, marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a", margin: 0 }}>شركة الجبل للمقاولات والاستثمار العقاري</h2>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>مستخلص أعمال ومستحقات مقاول باطن معتمد</div>
                    </div>
                    <div style={{ fontSize: 28 }}>🏗️</div>
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, background: "#1e3a8a15", color: "#1e3a8a", padding: "6px 20px", borderRadius: 20 }}>
                      📋 مستخلص الأعمال رقم (1) - المقاول: {selectedSub.name}
                    </span>
                  </div>

                  <div style={{ marginBottom: 16, fontSize: 13 }}>
                    <strong>التخصص:</strong> {selectedSub.specialty} • <strong>نظام التعاقد:</strong> {selectedSub.contractType} • <strong>الهاتف:</strong> {selectedSub.phone || "-"}
                  </div>

                  {/* WORKS TABLE SUMMARY */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12, border: "1px solid #cbd5e1" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", textAlign: "right" }}>
                        <th style={{ padding: 8, border: "1px solid #cbd5e1" }}>#</th>
                        <th style={{ padding: 8, border: "1px solid #cbd5e1" }}>النموذج وموقع العمل</th>
                        <th style={{ padding: 8, border: "1px solid #cbd5e1" }}>الكمية المنفذة</th>
                        <th style={{ padding: 8, border: "1px solid #cbd5e1" }}>سعر المتر للبند</th>
                        <th style={{ padding: 8, border: "1px solid #cbd5e1" }}>المستحق الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subWorks.map((w, idx) => {
                        const amt = (w.executedQty || 0) * (w.subcontractorUnitPrice || 0);
                        return (
                          <tr key={idx}>
                            <td style={{ padding: 8, border: "1px solid #cbd5e1" }}>{idx + 1}</td>
                            <td style={{ padding: 8, border: "1px solid #cbd5e1" }}>{w.modelName} ({w.buildingName} - {w.floorName})</td>
                            <td style={{ padding: 8, border: "1px solid #cbd5e1" }}>{w.executedQty} {w.unit} ({w.progressPercent}%)</td>
                            <td style={{ padding: 8, border: "1px solid #cbd5e1" }}>{formatCurrency(w.subcontractorUnitPrice)}</td>
                            <td style={{ padding: 8, border: "1px solid #cbd5e1", fontWeight: 800 }}>{formatCurrency(amt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* CALCULATE NET BALANCE */}
                  {(() => {
                    const totalWorksAmt = subWorks.reduce((sum, w) => sum + ((w.executedQty || 0) * (w.subcontractorUnitPrice || 0)), 0);
                    const totalDailiesAmt = subDailies.reduce((sum, d) => sum + ((d.craftsmenCount * d.craftsmenRate) + (d.helpersCount * d.helpersRate)), 0);
                    const totalGross = totalWorksAmt + totalDailiesAmt;
                    const totalPaid = subPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const netPayable = totalGross - totalPaid;

                    return (
                      <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #cbd5e1", marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                          <span>إجمالي الأعمال واليوميات المنفذة:</span>
                          <strong>{formatCurrency(totalGross)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#dc2626" }}>
                          <span>إجمالي الدفعات المسددة للمقاول:</span>
                          <strong>{formatCurrency(totalPaid)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #cbd5e1", fontSize: 16, color: "#059669" }}>
                          <span>صافي المستحق للمقاول حالياً:</span>
                          <strong style={{ fontSize: 18 }}>{formatCurrency(netPayable)}</strong>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, paddingTop: 14, borderTop: "2px dashed #cbd5e1" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>توقيع المقاول بالاستلام والاعتماد</div>
                      <div style={{ fontSize: 11, marginTop: 16 }}>التوقيع: .......................................</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>توقيع المهندس المسؤول ومدير المشروع</div>
                      <div style={{ fontSize: 11, marginTop: 16 }}>التوقيع: .......................................</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, textAlign: "center" }}>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                      🖨️ طباعة مستخلص الأعمال الآن (A4)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* DAILY CREW ATTENDANCE MODAL (مقاول اليومية) */}
      {showDailyModal && (
        <div className="modal-overlay" onClick={() => setShowDailyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">📅 تسجيل حضور طاقم المقاول (صنايعية ومساعدين)</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowDailyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDailyCrew}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المشروع *</label>
                  <select
                    className="form-control"
                    required
                    value={dailyProjectId}
                    onChange={(e) => setDailyProjectId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المشروع --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">التاريخ *</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">عدد الصنايعية</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="2"
                      value={craftsmenCount}
                      onChange={(e) => setCraftsmenCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">سعر يومية الصنايعي (ج.م)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="350"
                      value={craftsmenRate}
                      onChange={(e) => setCraftsmenRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">عدد المساعدين</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="2"
                      value={helpersCount}
                      onChange={(e) => setHelpersCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">سعر يومية المساعد (ج.م)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="200"
                      value={helpersRate}
                      onChange={(e) => setHelpersRate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowDailyModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ استحقاق يومية الطاقم</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT / DEDUCTION VOUCHER FORM MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">💵 تسجيل دفعة أو خصم مالي على المقاول</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePaymentVoucher}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المعاملة *</label>
                    <select className="form-control" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                      <option value="دفعة تحت الحساب">💵 دفعة مسددة تحت الحساب للمقاول</option>
                      <option value="خصم / استقطاع مالي">🛑 خصم / استقطاع مالي على المقاول</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">المشروع المستهدف *</label>
                    <select
                      className="form-control"
                      required
                      value={paymentProjectId}
                      onChange={(e) => setPaymentProjectId(e.target.value)}
                    >
                      <option value="" disabled>-- اختر المشروع --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">المبلغ (جنيه) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">سبب وسند الخصم (إن وجد)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: تأخير تسليم، تلف خامات بالموقع، خصم سكن صنايعية ومرافق..."
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">اسم المستلم / البيان التفصيلي</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="اسم مستلم الدفعة أو شرح السند..."
                    value={paymentRecipient}
                    onChange={(e) => setPaymentRecipient(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-gold">تسجيل المعاملة والترحيل للحسابات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📋 إضافة مستخلص مقاول باطن جديد (MATCHING USER SCREENSHOT EXACTLY) */}
      {showNewClaimModal && (
        <div className="modal-overlay" onClick={() => setShowNewClaimModal(false)} style={{ zIndex: 1100 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 960,
              width: "95%",
              background: "#0b1329",
              color: "#f8fafc",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              padding: 24,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                📋 إضافة مستخلص مقاول باطن جديد
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewClaimModal(false)} style={{ color: "#fff", background: "#ef444430", border: "1px solid #ef444460", padding: "6px 14px", borderRadius: 8, fontWeight: 800 }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewClaim}>
              {/* ROW 1: CODE, SUBCONTRACTOR, PROJECT */}
              <div className="grid-3" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>رقم المستخلص *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", fontWeight: 800 }}
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>المقاول *</label>
                  <select
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", fontWeight: 700 }}
                    required
                    value={claimSubcontractorId}
                    onChange={(e) => {
                      const subId = e.target.value;
                      setClaimSubcontractorId(subId);
                      const subObj = subcontractors.find((s) => s.id === subId);
                      if (subObj && subObj.specialty) {
                        const spec = subObj.specialty;
                        setClaimItems((prev) =>
                          prev.map((item) => ({ ...item, name: spec }))
                        );
                        showToast(`🎯 تم توحيد اسم البند تلقائياً حسب تخصص المقاول (${spec})!`, "info");
                      }
                    }}
                  >
                    <option value="" disabled>-- اختر المقاول --</option>
                    {subcontractors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.specialty || "مقاول"})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>المشروع *</label>
                  <select
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", fontWeight: 700 }}
                    required
                    value={claimProjectId}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المشروع --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ROW 2: CLAIM DATE, PERIOD FROM, PERIOD TO */}
              <div className="grid-3" style={{ gap: 14, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>تاريخ المستخلص *</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", fontWeight: 700 }}
                    required
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>الفترة من</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569" }}
                    value={claimPeriodFrom}
                    onChange={(e) => setClaimPeriodFrom(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>الفترة إلى</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569" }}
                    value={claimPeriodTo}
                    onChange={(e) => setClaimPeriodTo(e.target.value)}
                  />
                </div>
              </div>

              {/* SECTION 3: ITEMS TABLE (بنود المستخلص والتنفيذ) */}
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b", margin: 0 }}>
                      📋 بنود المستخلص والتنفيذ (تعبئة تلقائية من مراحل المشروع)
                    </h3>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      يتم سحب البنود والنماذج والعمائر تلقائياً من مراحل المشروع، أدخل النسب والأسعار فقط!
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleProjectSelect(claimProjectId)}
                      style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                    >
                      ⚡ سحب بنود مراحل المشروع تلقائياً
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      style={{ background: "#1e293b", color: "#38bdf8", border: "1px solid #38bdf840", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                    >
                      + إضافة بند يدوياً
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#1e293b", color: "#94a3b8" }}>
                        <th style={{ width: 35, textAlign: "center" }}>#</th>
                        <th>البند *</th>
                        <th>النموذج</th>
                        <th>رقم المبنى</th>
                        <th>الدور</th>
                        <th style={{ width: 80 }}>الوحدة</th>
                        <th style={{ width: 90 }}>كمية الحصر</th>
                        <th style={{ width: 85 }}>نسبة التنفيذ%</th>
                        <th style={{ width: 90 }}>الكمية المنفذة</th>
                        <th style={{ width: 95 }}>سعر الوحدة</th>
                        <th style={{ width: 100 }}>الإجمالي</th>
                        <th style={{ width: 40, textAlign: "center" }}>🗑️</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimItems.map((item, idx) => (
                        <tr key={item.id} style={{ background: "#0b1329" }}>
                          <td style={{ textAlign: "center", fontWeight: 800, color: "#94a3b8" }}>{idx + 1}</td>
                          <td>
                            <input
                              list={`categories-list-${item.id}`}
                              type="text"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#f59e0b", fontWeight: 800, border: "1px solid #334155", padding: "4px 8px", fontSize: 12 }}
                              placeholder="اختر أو اكتب البند..."
                              required
                              value={item.name}
                              onChange={(e) => handleUpdateItemRow(item.id, "name", e.target.value)}
                            />
                            <datalist id={`categories-list-${item.id}`}>
                              <option value="مباني" />
                              <option value="حدادة مسلحة" />
                              <option value="نجارة مسلحة" />
                              <option value="سباكة" />
                              <option value="كهرباء" />
                              <option value="دهانات وتشطيبات" />
                              <option value="أعمال ترابية وحفر" />
                              <option value="تشوين ونقل خامات" />
                            </datalist>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "4px 8px", fontSize: 12 }}
                              placeholder="النموذج"
                              value={item.modelName}
                              onChange={(e) => handleUpdateItemRow(item.id, "modelName", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "4px 8px", fontSize: 12 }}
                              placeholder="رقم المبنى"
                              value={item.buildingName}
                              onChange={(e) => handleUpdateItemRow(item.id, "buildingName", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "4px 8px", fontSize: 12 }}
                              placeholder="الدور"
                              value={item.floorName}
                              onChange={(e) => handleUpdateItemRow(item.id, "floorName", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="form-control"
                              style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "4px 6px", fontSize: 11 }}
                              value={item.unit}
                              onChange={(e) => handleUpdateItemRow(item.id, "unit", e.target.value)}
                            >
                              <option value="م²">م²</option>
                              <option value="م³">م³</option>
                              <option value="م.ط">م.ط</option>
                              <option value="طن">طن</option>
                              <option value="عدد">عدد</option>
                              <option value="مقطوعية">مقطوعية</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "4px 6px", fontSize: 12 }}
                              value={item.surveyedQty || ""}
                              onChange={(e) => handleUpdateItemRow(item.id, "surveyedQty", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "4px 6px", fontSize: 12 }}
                              value={item.progressPercent || 100}
                              onChange={(e) => handleUpdateItemRow(item.id, "progressPercent", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#38bdf8", fontWeight: 800, border: "1px solid #334155", padding: "4px 6px", fontSize: 12 }}
                              value={item.executedQty || 0}
                              onChange={(e) => handleUpdateItemRow(item.id, "executedQty", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              style={{ background: "#1e293b", color: "#f59e0b", fontWeight: 800, border: "1px solid #334155", padding: "4px 6px", fontSize: 12 }}
                              value={item.unitPrice || ""}
                              onChange={(e) => handleUpdateItemRow(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ fontWeight: 900, color: "#f59e0b", fontSize: 13 }}>
                            {formatCurrency(item.totalPrice || 0)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(item.id)}
                              style={{ background: "#ef444420", color: "#ef4444", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 800 }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OVERALL TOTAL BANNER */}
              {(() => {
                const overallTotal = claimItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
                return (
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>الإجمالي الكلي للمستخلص:</span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b", textShadow: "0 2px 10px rgba(245, 158, 11, 0.4)" }}>
                      {formatCurrency(overallTotal)}
                    </span>
                  </div>
                );
              })()}

              {/* ROW 4: PAYMENT STATUS & NOTES */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>حالة التسديد البدنية *</label>
                  <select
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", fontWeight: 700 }}
                    value={claimPaymentStatus}
                    onChange={(e) => setClaimPaymentStatus(e.target.value)}
                  >
                    <option value="مدفوع بالكامل">مدفوع بالكامل</option>
                    <option value="مخصوم/تحت الحساب">مخصوم/تحت الحساب</option>
                    <option value="معلق للتسوية">معلق للتسوية</option>
                    <option value="مستخلص جزئي">مستخلص جزئي</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800 }}>ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569" }}
                    placeholder="ملاحظات أو شروط الدفع..."
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* FOOTER BUTTONS */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowNewClaimModal(false)}
                  style={{ background: "#1e293b", color: "#94a3b8", padding: "10px 24px", borderRadius: 10, fontWeight: 800 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", padding: "10px 28px", borderRadius: 10, fontWeight: 900, boxShadow: "0 4px 16px rgba(37, 99, 235, 0.3)" }}
                >
                  حفظ المستخلص والتأكيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
