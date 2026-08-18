import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";
import { PROJECT_TYPES_CONFIG, type ProjectTypeKey } from "./ProjectCreate";

interface Phase {
  id: string;
  modelName?: string;
  phaseName: string;
  unit: string;
  unitPrice?: number;
  totalSurveyedQty?: number;
  progressPercent?: number;
  executedQty?: number;
  subcontractorName?: string;
  notes?: string;
}

interface Investor {
  id: string;
  name: string;
  phone?: string;
  sharePercent: number;
  initialCapital: number;
}

interface Worker {
  id: string;
  name: string;
  specialty?: string;
  dailyRate: number;
  phone?: string;
}

interface Supervisor {
  id: string;
  name: string;
  phone?: string;
  salaryType: string;
  salary: number;
}

interface WorkerDailyRecord {
  id: string;
  date: string;
  status: string;
  amount: number;
  worker?: { id: string; name: string; specialty?: string };
  notes?: string;
}

interface StatementDoc {
  id: string;
  subcontractor?: { id: string; name: string };
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

interface ProjectFileItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

export default function ProjectDetailsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toasts, showToast, removeToast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("data");

  // 10 Tabs Data Lists
  const [phasesList, setPhasesList] = useState<Phase[]>([]);
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [supervisorsList, setSupervisorsList] = useState<Supervisor[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [workerDailiesList, setWorkerDailiesList] = useState<WorkerDailyRecord[]>([]);
  const [investorsList, setInvestorsList] = useState<Investor[]>([]);
  const [subcontractorsList, setSubcontractorsList] = useState<any[]>([]);
  const [statementsList, setStatementsList] = useState<StatementDoc[]>([]);
  const [filesList, setFilesList] = useState<ProjectFileItem[]>([]);

  // Add/Edit Investor Modal State
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [invName, setInvName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invSharePercent, setInvSharePercent] = useState("50");
  const [invCapital, setInvCapital] = useState("0");

  // Add File Modal State
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileTitle, setFileTitle] = useState("");
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Received Revenue Collections Modal State
  const [revenuesList, setRevenuesList] = useState<any[]>([]);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revAmount, setRevAmount] = useState("");
  const [revType, setRevType] = useState("مستخلص نسبة % من العقد");
  const [revNotes, setRevNotes] = useState("");
  const [revDate, setRevDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      const [projRes, expRes, dailiesRes, supRes, subDocRes, dbPhasesRes, dbFilesRes, revRes] = await Promise.all([
        supabase.from("Project").select("*").eq("id", projectId).single(),
        supabase.from("ProjectExpense").select("*").eq("projectId", projectId).order("createdAt", { ascending: false }),
        supabase.from("WorkerDaily").select("*, worker:Worker(id, name, specialty)").eq("projectId", projectId).order("date", { ascending: false }),
        supabase.from("Supervisor").select("*").eq("projectId", projectId),
        supabase.from("SubcontractorDoc").select("*, subcontractor:Subcontractor(id, name)").eq("projectId", projectId).order("date", { ascending: false }),
        supabase.from("ProjectPhase").select("*").eq("projectId", projectId).order("createdAt", { ascending: true }),
        supabase.from("ProjectFile").select("*").eq("projectId", projectId).order("createdAt", { ascending: false }),
        supabase.from("Revenue").select("*").eq("projectId", projectId).order("date", { ascending: false }),
      ]);

      if (projRes.error) throw projRes.error;
      setProject({
        ...projRes.data,
        workerDailies: dailiesRes.data || [],
      });

      if (expRes.data) setExpensesList(expRes.data);
      if (dailiesRes.data) setWorkerDailiesList(dailiesRes.data);
      if (supRes.data) setSupervisorsList(supRes.data);
      if (subDocRes.data) setStatementsList(subDocRes.data);
      if (dbFilesRes.data) setFilesList(dbFilesRes.data);
      if (revRes.data) setRevenuesList(revRes.data);

      // Extract unique workers from dailies or project
      if (dailiesRes.data) {
        const uniqueWorkersMap = new Map<string, Worker>();
        dailiesRes.data.forEach((d: any) => {
          if (d.worker && !uniqueWorkersMap.has(d.worker.id)) {
            uniqueWorkersMap.set(d.worker.id, {
              id: d.worker.id,
              name: d.worker.name,
              specialty: d.worker.specialty || "عامل",
              dailyRate: d.amount || 0,
            });
          }
        });
        setWorkersList(Array.from(uniqueWorkersMap.values()));
      }

      // Unique Subcontractors
      if (subDocRes.data) {
        const uniqueSubMap = new Map<string, any>();
        subDocRes.data.forEach((sd: any) => {
          if (sd.subcontractor && !uniqueSubMap.has(sd.subcontractor.id)) {
            uniqueSubMap.set(sd.subcontractor.id, sd.subcontractor);
          }
        });
        setSubcontractorsList(Array.from(uniqueSubMap.values()));
      }

      // Fetch Phases
      if (dbPhasesRes.data && dbPhasesRes.data.length > 0) {
        setPhasesList(dbPhasesRes.data);
      } else {
        const storedPhases = localStorage.getItem(`phases_${projectId}`);
        if (storedPhases) setPhasesList(JSON.parse(storedPhases));
      }

      // Fetch Investors
      const storedInv = localStorage.getItem(`investors_${projectId}`);
      if (storedInv) {
        setInvestorsList(JSON.parse(storedInv));
      } else {
        const rawNotes = projRes.data?.notes || "";
        let foundPartners: Investor[] = [];
        if (rawNotes.includes("partners=")) {
          const partnersMatch = rawNotes.match(/partners=([^\|\]]+)/);
          if (partnersMatch) {
            try {
              foundPartners = JSON.parse(decodeURIComponent(partnersMatch[1]));
            } catch (e) {}
          }
        }
        if (foundPartners.length > 0) {
          setInvestorsList(foundPartners);
        } else {
          setInvestorsList([
            { id: "inv-1", name: "م. أحمد محمود", sharePercent: 50, phone: "01012345678", initialCapital: 100000 },
          ]);
        }
      }

      // Fetch Files LocalStorage fallback if needed
      if (!dbFilesRes.data || dbFilesRes.data.length === 0) {
        const storedFiles = localStorage.getItem(`files_${projectId}`);
        if (storedFiles) setFilesList(JSON.parse(storedFiles));
      }
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل بيانات المشروع", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Tab Scroll Controls
  const scrollTabs = (direction: "left" | "right") => {
    const container = document.getElementById("project-tabs-container");
    if (container) {
      const scrollAmount = direction === "left" ? -240 : 240;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Phase Handlers
  const savePhasesList = (newList: Phase[]) => {
    setPhasesList(newList);
    try {
      localStorage.setItem(`phases_${projectId}`, JSON.stringify(newList));
    } catch (e) {}
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;
    try {
      await supabase.from("ProjectPhase").delete().eq("id", phaseId);
    } catch (e) {}

    const updated = phasesList.filter((p) => p.id !== phaseId);
    savePhasesList(updated);
    showToast("تم الحذف بنجاح ✅", "success");
  };

  // Investor Handlers
  const saveInvestors = (newList: Investor[]) => {
    setInvestorsList(newList);
    try {
      localStorage.setItem(`investors_${projectId}`, JSON.stringify(newList));
    } catch (e) {}
  };

  const handleOpenAddInvestor = () => {
    setEditingInvestor(null);
    setInvName("");
    setInvPhone("");
    setInvSharePercent("50");
    setInvCapital("0");
    setShowInvestorModal(true);
  };

  const handleOpenEditInvestor = (inv: Investor) => {
    setEditingInvestor(inv);
    setInvName(inv.name || "");
    setInvPhone(inv.phone || "");
    setInvSharePercent(inv.sharePercent ? inv.sharePercent.toString() : "50");
    setInvCapital(inv.initialCapital ? inv.initialCapital.toString() : "0");
    setShowInvestorModal(true);
  };

  const handleSaveInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName) return;

    if (editingInvestor) {
      const updated = investorsList.map((inv) =>
        inv.id === editingInvestor.id
          ? {
              ...inv,
              name: invName,
              phone: invPhone,
              sharePercent: parseFloat(invSharePercent) || 0,
              initialCapital: parseFloat(invCapital) || 0,
            }
          : inv
      );
      saveInvestors(updated);
      showToast("تم تحديث المستثمر بنجاح ✅", "success");
    } else {
      const newInv: Investor = {
        id: "inv-" + Date.now(),
        name: invName,
        phone: invPhone,
        sharePercent: parseFloat(invSharePercent) || 0,
        initialCapital: parseFloat(invCapital) || 0,
      };
      saveInvestors([...investorsList, newInv]);
      showToast("تم إضافة الشريك بنجاح ✅", "success");
    }
    setShowInvestorModal(false);
  };

  const handleDeleteInvestor = (invId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الشريك؟")) return;
    const updated = investorsList.filter((inv) => inv.id !== invId);
    saveInvestors(updated);
    showToast("تم حذف الشريك بنجاح ✅", "success");
  };

  // File Attachment Handlers
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileObject || !fileTitle) {
      showToast("برجاء اختيار الملف وإدخال عنوان المستند", "warning");
      return;
    }

    setUploadingFile(true);
    try {
      const readAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const dataUrl = await readAsDataURL(fileObject);
      const newFileItem: ProjectFileItem = {
        id: "file-" + Date.now(),
        title: fileTitle,
        fileName: fileObject.name,
        fileSize: fileObject.size,
        fileUrl: dataUrl,
        createdAt: new Date().toISOString(),
      };

      try {
        await supabase.from("ProjectFile").insert([{
          id: newFileItem.id,
          projectId,
          title: fileTitle,
          fileName: fileObject.name,
          fileSize: fileObject.size,
          fileUrl: dataUrl,
        }]);
      } catch (err) {}

      const updated = [newFileItem, ...filesList];
      setFilesList(updated);
      localStorage.setItem(`files_${projectId}`, JSON.stringify(updated));

      showToast("تم مرفق الملف بنجاح ✅", "success");
      setShowFileModal(false);
      setFileTitle("");
      setFileObject(null);
    } catch (e: any) {
      showToast(e.message || "فشل في رفع الملف", "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("هل تريد حذف هذا الملف؟")) return;
    try {
      await supabase.from("ProjectFile").delete().eq("id", fileId);
    } catch (e) {}

    const updated = filesList.filter((f) => f.id !== fileId);
    setFilesList(updated);
    localStorage.setItem(`files_${projectId}`, JSON.stringify(updated));
    showToast("تم حذف الملف بنجاح ✅", "success");
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "60vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تحميل تفاصيل المشروع...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state" style={{ minHeight: "60vh" }}>
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-text">المشروع غير موجود أو تم حذفه</div>
        <Link to="/projects" className="btn btn-primary" style={{ marginTop: 14 }}>العودة للمشاريع</Link>
      </div>
    );
  }

  // Extract project type metadata from notes
  const rawNotes = project?.notes || "";
  let projectTypeKey: ProjectTypeKey = "GENERAL_CONTRACTING";
  let metaSupervisorName = "";
  let metaOwnerMeterRate = 0;
  let metaSupervisorMeterRate = 0;
  let metaMeterUnit = "م² مسطح";
  let metaEstimatedMeters = 0;
  let metaStageTaxPercent = 10;

  if (rawNotes.includes("[meta:")) {
    const typeMatch = rawNotes.match(/type=([^\|\]]+)/);
    if (typeMatch && (typeMatch[1] as ProjectTypeKey) in PROJECT_TYPES_CONFIG) {
      projectTypeKey = typeMatch[1] as ProjectTypeKey;
    }
    const supMatch = rawNotes.match(/supervisor=([^\|\]]+)/);
    if (supMatch) metaSupervisorName = decodeURIComponent(supMatch[1]);
    const omrMatch = rawNotes.match(/ownerRate=([^\|\]]+)/);
    if (omrMatch) metaOwnerMeterRate = parseFloat(omrMatch[1]) || 0;
    const smrMatch = rawNotes.match(/supervisorRate=([^\|\]]+)/);
    if (smrMatch) metaSupervisorMeterRate = parseFloat(smrMatch[1]) || 0;
    const unitMatch = rawNotes.match(/meterUnit=([^\|\]]+)/);
    if (unitMatch) metaMeterUnit = decodeURIComponent(unitMatch[1]);
    const estMatch = rawNotes.match(/estimatedMeters=([^\|\]]+)/);
    if (estMatch) metaEstimatedMeters = parseFloat(estMatch[1]) || 0;
    const taxMatch = rawNotes.match(/stageTaxPercent=([^\|\]]+)/);
    if (taxMatch) metaStageTaxPercent = parseFloat(taxMatch[1]) || 10;
  }

  const currentTypeConfig = PROJECT_TYPES_CONFIG[projectTypeKey];
  const cleanNotes = rawNotes.replace(/\[meta:[^\]]+\]/, "").trim();

  const totalExp = expensesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalDailies = workerDailiesList.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  const totalCosts = totalExp + totalDailies;

  // Investment Calculations (+10% tax on stages)
  const stageTaxAmount = totalCosts * (metaStageTaxPercent / 100);
  const totalCostsWithTax = totalCosts + stageTaxAmount;

  // Meter Rate Calculations
  const totalExecutedMetersFromPhases = phasesList.reduce((sum, p) => sum + (p.executedQty || 0), 0);
  const activeMeters = totalExecutedMetersFromPhases > 0 ? totalExecutedMetersFromPhases : metaEstimatedMeters;
  const unitProfitDiff = metaOwnerMeterRate - metaSupervisorMeterRate;
  const totalMeterOwnerValue = metaOwnerMeterRate * activeMeters;
  const totalSupervisorEntitlement = metaSupervisorMeterRate * activeMeters;
  const totalMeterDiffProfit = unitProfitDiff * activeMeters;

  const totalRevenuesReceived = revenuesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const netProfit =
    projectTypeKey === "SUPERVISOR_METER_RATE" && metaOwnerMeterRate > 0
      ? totalMeterOwnerValue - (totalSupervisorEntitlement + totalExp)
      : (project.value || 0) - totalCosts;

  const handleSaveRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !revAmount) return;

    const amt = parseFloat(revAmount);
    const newRev = {
      projectId,
      amount: amt,
      type: revType,
      notes: revNotes || "دفعة مستلمة من الشركة المالكة للمشروع",
      date: new Date(revDate).toISOString(),
    };

    try {
      await supabase.from("Revenue").insert([newRev]);
    } catch (err) {}

    const updated = [{ ...newRev, id: "rev-" + Date.now() }, ...revenuesList];
    setRevenuesList(updated);
    localStorage.setItem(`revenues_${projectId}`, JSON.stringify(updated));

    showToast("تم تسجيل الدفعة المستلمة وتسميعها في حساب وإيرادات المشروع بنجاح 💰", "success");
    setShowRevenueModal(false);
    setRevAmount("");
    setRevNotes("");
  };

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="page-header print:mb-4" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-primary" style={{ fontSize: 12, padding: "3px 10px" }}>{project.code}</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "8px",
                background: `${currentTypeConfig.color}20`,
                color: currentTypeConfig.color,
                border: `1px solid ${currentTypeConfig.color}50`,
              }}
            >
              <span>{currentTypeConfig.icon}</span>
              <span>{currentTypeConfig.badge}</span>
            </span>
            <h1 className="page-title" style={{ fontSize: 22 }}>{project.name}</h1>
          </div>
          <p className="page-subtitle" style={{ fontSize: 13, marginTop: 4 }}>
            النوع: <strong>{currentTypeConfig.title}</strong> • العميل: {project.client || "غير محدد"} • الحالة: <span className="badge badge-success" style={{ fontSize: 11 }}>{project.status}</span>
          </p>
        </div>
        <div className="print:hidden" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-gold btn-sm" onClick={() => setShowRevenueModal(true)}>
            💰 + تسجيل دفعة مستلمة من الشركة المالكة
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ طباعة التقرير</button>
          <Link to="/projects" className="btn btn-ghost btn-sm">← المشاريع</Link>
        </div>
      </div>

      {/* 4 OVERVIEW STAT CARDS (CUSTOMIZED BY PROJECT TYPE) */}
      {projectTypeKey === "SUPERVISOR_METER_RATE" ? (
        /* TYPE 2: SUPERVISOR METER RATE STATS */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>فارق سعر المتر (هامش الربح)</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(unitProfitDiff)}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                  المالك ({metaOwnerMeterRate}) - المشرف ({metaSupervisorMeterRate}) ج/{metaMeterUnit}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>📐</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>الأمتار المسندة / المنفذة</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{activeMeters} {metaMeterUnit}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>المشرف المسؤول: {metaSupervisorName || "مشرف الموقع"}</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>📊</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(139, 92, 246, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>إجمالي استحقاق المشرف</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalSupervisorEntitlement)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>حساب الأمتار المنفذة للمشرف</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>👔</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>أرباح فرق السعر المقدرة</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalMeterDiffProfit)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>فارق السعر × الأمتار</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>📈</div>
            </div>
          </div>
        </div>
      ) : projectTypeKey === "INVESTMENT_PARTNERSHIP" ? (
        /* TYPE 3: INVESTMENT & PARTNERSHIP STATS */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>عدد الشركاء المساهمين</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{investorsList.length} شركاء</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                  رأس المال المبدئي: {formatCurrency(investorsList.reduce((sum, inv) => sum + (inv.initialCapital || 0), 0))}
                </div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>🤝</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>إجمالي مصروفات المراحل</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalCosts)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>المصروفات المنفذة للموقع</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>💸</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>ضريبة / إدارة المراحل ({metaStageTaxPercent}%)</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(stageTaxAmount)}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>+{metaStageTaxPercent}% مضافة على كل مرحلة</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>🏛️</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(99, 102, 241, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>إجمالي التكلفة شاملة الضريبة</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalCostsWithTax)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>المخصوم من حصص الشركاء</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>📋</div>
            </div>
          </div>
        </div>
      ) : (
        /* TYPE 1: GENERAL CONTRACTING STATS */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>قيمة العقد الإجمالية</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(project.value || 0)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>المبلغ المتعاقد عليه مع المالك</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>📜</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>إجمالي المصروفات الحالية</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalCosts)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>خامات + عمالة موقع</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>💸</div>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(139, 92, 246, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>استحقاق يوميات الموقع</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalDailies)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>عمالة الموقع المسجلة</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>👷</div>
            </div>
          </div>

          <div
            style={{
              background: netProfit >= 0 ? "linear-gradient(135deg, #10b981 0%, #047857 100%)" : "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
              color: "#fff",
              borderRadius: 16,
              padding: "18px 20px",
              boxShadow: netProfit >= 0 ? "0 4px 14px rgba(16, 185, 129, 0.25)" : "0 4px 14px rgba(220, 38, 38, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>صافي الربح التقديري</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(netProfit)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>العقد - التكاليف الحالية</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.85 }}>📈</div>
            </div>
          </div>
        </div>
      )}

      {/* 10 TABS MULTI-ROW NAVIGATION */}
      <div className="print:hidden" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 8,
          }}
        >
          {[
            { id: "data", label: "📌 البيانات ونوع المشروع" },
            { id: "phases", label: `🏗️ مراحل المشروع (${phasesList.length})` },
            { id: "workers", label: `👷 العمال (${workersList.length})` },
            { id: "supervisors", label: `👔 المشرفون (${supervisorsList.length})` },
            { id: "expenses", label: `💸 المصروفات (${expensesList.length})` },
            { id: "worker_dailies", label: `🗓️ يوميات العمال (${workerDailiesList.length})` },
            { id: "investors", label: `💼 الشركاء والمستثمرون (${investorsList.length})` },
            { id: "subcontractors", label: `🔧 مقاولو الباطن (${subcontractorsList.length})` },
            { id: "statements", label: `📋 المستخلصات (${statementsList.length})` },
            { id: "files", label: `📁 الملفات الخاصة بالمشروع (${filesList.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                fontSize: 12.5,
                fontWeight: 700,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: activeTab === tab.id ? "1px solid #3b82f6" : "1px solid hsl(var(--border-subtle))",
                background: activeTab === tab.id ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-card))",
                color: activeTab === tab.id ? "#ffffff" : "hsl(var(--text-primary))",
                boxShadow: activeTab === tab.id ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="card">
        <div className="card-body" style={{ padding: 20 }}>
          {/* TAB 1: BASIC DATA & PROJECT TYPE DETAILS */}
          {activeTab === "data" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>📌 البيانات الأساسية ونوع المشروع</h3>
                <Link to={`/projects/create?edit=${project.id}`} className="btn btn-primary btn-sm">
                  ✏️ تعديل البيانات والنوع
                </Link>
              </div>

              {/* PROJECT TYPE SPECIAL HIGHLIGHT CARD */}
              <div
                style={{
                  background: `linear-gradient(145deg, hsl(var(--bg-elevated)), ${currentTypeConfig.color}15)`,
                  border: `1px solid ${currentTypeConfig.color}40`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 32 }}>{currentTypeConfig.icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 15, color: currentTypeConfig.color }}>
                        {currentTypeConfig.title}
                      </span>
                      <span className="badge" style={{ background: currentTypeConfig.color, color: "#fff", fontSize: 11 }}>
                        {currentTypeConfig.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "hsl(var(--text-secondary))", marginTop: 4 }}>
                      {currentTypeConfig.desc}
                    </div>
                  </div>
                </div>

                {projectTypeKey === "SUPERVISOR_METER_RATE" && (
                  <div style={{ display: "flex", gap: 16, background: "hsl(var(--bg-card))", padding: "8px 14px", borderRadius: 8, fontSize: 12 }}>
                    <div>سعر المالك: <strong style={{ color: "hsl(var(--gold))" }}>{formatCurrency(metaOwnerMeterRate)}</strong></div>
                    <div>سعر المشرف: <strong style={{ color: "#f59e0b" }}>{formatCurrency(metaSupervisorMeterRate)}</strong></div>
                    <div>فرق المتر: <strong style={{ color: "#10b981" }}>{formatCurrency(unitProfitDiff)}</strong></div>
                  </div>
                )}

                {projectTypeKey === "INVESTMENT_PARTNERSHIP" && (
                  <div style={{ display: "flex", gap: 16, background: "hsl(var(--bg-card))", padding: "8px 14px", borderRadius: 8, fontSize: 12 }}>
                    <div>نسبة ضريبة المراحل: <strong style={{ color: "#10b981" }}>{metaStageTaxPercent}%</strong></div>
                    <div>عدد الشركاء: <strong>{investorsList.length}</strong></div>
                  </div>
                )}
              </div>

              <div className="grid-3" style={{ gap: 14 }}>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>كود المشروع</label>
                  <div style={{ fontWeight: 800, color: "hsl(var(--gold))", fontSize: 14, marginTop: 2 }}>{project.code}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>اسم المشروع</label>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{project.name}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>العميل / الجهة المالكة</label>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{project.client || "غير محدد"}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>تاريخ البداية</label>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{project.startDate ? formatDateShort(project.startDate) : "-"}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>تاريخ التسليم المتوقع</label>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{project.endDate ? formatDateShort(project.endDate) : "-"}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>حالة التنفيذ</label>
                  <div style={{ marginTop: 2 }}><span className="badge badge-success">{project.status}</span></div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="text-muted" style={{ fontSize: 11 }}>العنوان التفصيلي والملاحظات</label>
                <div style={{ padding: 12, borderRadius: 8, background: "hsl(var(--bg-elevated))", marginTop: 4, fontSize: 13, whiteSpace: "pre-wrap" }}>
                  {cleanNotes || "لا توجد ملاحظات مدونة للمشروع"}
                </div>
              </div>


              {/* 🏢 MODELS, BUILDINGS & METERS BREAKDOWN CARD (تفاصيل النماذج والبنايات وعدد الأمتار) */}
              <div style={{ marginTop: 24, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 900, color: "hsl(var(--gold))", margin: 0 }}>
                      🏢 تفاصيل النماذج والبنايات وعدد الأمتار للمشروع
                    </h4>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 3 }}>
                      حصر إجمالي العمائر، النماذج، كميات الأمتار المسطحة والمكعبة للأعمال
                    </div>
                  </div>
                  <Link to={`/project-phases/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                    + إضافة نموذج / بناية جديدة
                  </Link>
                </div>

                {phasesList.length === 0 ? (
                  <div style={{ fontSize: 12, color: "hsl(var(--text-muted))", textAlign: "center", padding: 16 }}>
                    لا توجد نماذج أو بنايات مدخلة لهذا المشروع بعد
                  </div>
                ) : (
                  <div className="table-container">
                    <table style={{ fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: "hsl(var(--bg-card))" }}>
                          <th style={{ width: 35, textAlign: "center" }}>#</th>
                          <th>اسم النموذج</th>
                          <th>مرحلة / تخصص العمل</th>
                          <th>البنايات والأدوار المندرجة</th>
                          <th style={{ textAlign: "center" }}>كمية الأمتار الحصرية</th>
                          <th style={{ textAlign: "center" }}>الأمتار المنفذة</th>
                          <th style={{ textAlign: "center" }}>نسبة الإنجاز %</th>
                          <th className="print:hidden" style={{ textAlign: "center", minWidth: 200 }}>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phasesList.map((p, idx) => {
                          let buildingsSummary = "عمارة 1 (جميع الأدوار)";
                          if (p.notes) {
                            try {
                              const parsed = JSON.parse(p.notes);
                              if (parsed.buildingNames && parsed.buildingNames.length > 0) {
                                const modeLabel = parsed.areaMode === "UNIFIED" ? "مساحات موحدة" : "مساحات مخصصة";
                                buildingsSummary = `${parsed.buildingNames.join("، ")} (${parsed.buildingNames.length} عمارات - ${modeLabel})`;
                              } else if (parsed.buildingItems && parsed.buildingItems.length > 0) {
                                const bNames = Array.from(new Set(parsed.buildingItems.map((b: any) => b.buildingName))).join(" ، ");
                                buildingsSummary = `${bNames} (${parsed.buildingItems.length} دور/مستوى)`;
                              }
                            } catch (e) {}
                          }
                          return (
                            <tr key={p.id || idx}>
                              <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                              <td style={{ fontWeight: 800, color: "#38bdf8" }}>{p.modelName || "نموذج عام"}</td>
                              <td><span className="badge badge-info">{p.phaseName}</span></td>
                              <td style={{ fontWeight: 600 }}>🏛️ {buildingsSummary}</td>
                              <td style={{ textAlign: "center", fontWeight: 800 }}>{p.totalSurveyedQty || 0} {p.unit}</td>
                              <td style={{ textAlign: "center", fontWeight: 800, color: "#10b981" }}>{p.executedQty || 0} {p.unit}</td>
                              <td style={{ textAlign: "center" }}><span className="badge badge-warning">{p.progressPercent || 0}%</span></td>
                              <td className="print:hidden" style={{ textAlign: "center" }}>
                                <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                                  <Link
                                    to={`/project-phases/create?projectId=${project.id}&cloneFromPhaseId=${p.id}`}
                                    className="btn btn-xs btn-primary"
                                    style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}
                                    title="إضافة مرحلة/مهنة أخرى (حدادة، نجارة، تشوين...) على نفس هذا النموذج وعماراته"
                                  >
                                    ➕ إضافة مهنة للنموذج
                                  </Link>
                                  <Link
                                    to={`/project-phases/create?projectId=${project.id}&edit=${p.id}`}
                                    className="btn-icon-centered"
                                    title="تعديل"
                                  >
                                    ✏️
                                  </Link>
                                  <button
                                    onClick={() => handleDeletePhase(p.id)}
                                    className="btn-icon-centered text-danger"
                                    title="حذف"
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
                  </div>
                )}
              </div>
            </div>

          )}

          {/* TAB 2: PHASES (مراحل المشروع - موحدة حسب التخصص: مرحلة الحدادة، مرحلة المباني...) */}
          {activeTab === "phases" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>🏗️ مراحل تنفيذ مشروع ({project.name})</h3>
                  <div style={{ fontSize: 12, color: "hsl(var(--text-muted))", marginTop: 3 }}>
                    مراحل الأعمال والمهن الموحدة (مرحلة الحدادة، مرحلة المباني، مرحلة النجارة...) ويندرج تحت كل مرحلة النماذج والبنايات المخصصة
                  </div>
                </div>
                <Link to={`/project-phases/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + إضافة مرحلة / نموذج حصر
                </Link>
              </div>

              {phasesList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">🏗️</div>
                  <div className="empty-state-text">لم يتم إضافة مراحل تنفيذ لهذا المشروع بعد</div>
                  <Link to={`/project-phases/create?projectId=${project.id}`} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                    + إضافة أول مرحلة (مباني / حدادة)
                  </Link>
                </div>
              ) : (
                (() => {
                  const groupedPhases = phasesList.reduce((acc: Record<string, Phase[]>, phase) => {
                    const cat = phase.phaseName || "أخرى";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(phase);
                    return acc;
                  }, {});

                  const categoriesList = Object.keys(groupedPhases);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {categoriesList.map((catName) => {
                        const catPhases = groupedPhases[catName];
                        const totalCategorySurveyed = catPhases.reduce((sum, p) => sum + (p.totalSurveyedQty || 0), 0);
                        const totalCategoryExecuted = catPhases.reduce((sum, p) => sum + (p.executedQty || 0), 0);
                        const overallCategoryProgress = totalCategorySurveyed > 0 ? (totalCategoryExecuted / totalCategorySurveyed) * 100 : 0;
                        const mainUnit = catPhases[0]?.unit || "م²";

                        return (
                          <div
                            key={catName}
                            style={{
                              background: "hsl(var(--bg-elevated))",
                              border: "1px solid hsl(var(--border-subtle))",
                              borderRadius: 16,
                              padding: 18,
                              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                            }}
                          >
                            {/* MASTER PHASE HEADER */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10, borderBottom: "1px solid hsl(var(--border-subtle))", paddingBottom: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="badge badge-warning" style={{ fontSize: 14, padding: "6px 14px", fontWeight: 900 }}>
                                  🔨 مرحلة {catName}
                                </span>
                                <span style={{ fontSize: 12, color: "hsl(var(--text-muted))", fontWeight: 700 }}>
                                  ({catPhases.length} نموذج / بند مندرج)
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12 }}>
                                  <span className="text-muted">إجمالي الحصر: </span>
                                  <strong style={{ color: "#38bdf8" }}>{totalCategorySurveyed} {mainUnit}</strong>
                                </div>
                                <div style={{ fontSize: 12 }}>
                                  <span className="text-muted">المنفذ: </span>
                                  <strong style={{ color: "#10b981" }}>{totalCategoryExecuted} {mainUnit}</strong>
                                </div>
                                <div>
                                  <span className="badge badge-success" style={{ fontSize: 12, padding: "4px 10px" }}>
                                    إنجاز المرحلة {overallCategoryProgress.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* NESTED MODELS & BUILDINGS TABLE INSIDE THIS TRADE */}
                            <div className="table-container">
                              <table style={{ fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "hsl(var(--bg-card))" }}>
                                    <th style={{ width: 35, textAlign: "center" }}>#</th>
                                    <th>اسم النموذج المندرِج</th>
                                    <th>البنايات والأدوار المندرجة</th>
                                    <th>الوحدة</th>
                                    <th>سعر الهيئة / المالك</th>
                                    <th>سعر المقاول الفرعي</th>
                                    <th>كمية الحصر</th>
                                    <th>الكمية المنفذة</th>
                                    <th>نسبة الإنجاز %</th>
                                    <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {catPhases.map((p, idx) => {
                                    let buildingsSummary = "عمارة 1 (جميع الأدوار)";
                                    let subPrice = 0;
                                    if (p.notes) {
                                      try {
                                        const parsed = JSON.parse(p.notes);
                                        if (parsed.subcontractorUnitPrice) subPrice = parsed.subcontractorUnitPrice;
                                        if (parsed.buildingNames && parsed.buildingNames.length > 0) {
                                          const modeLabel = parsed.areaMode === "UNIFIED" ? "مساحات موحدة" : "مساحات مخصصة";
                                          buildingsSummary = `${parsed.buildingNames.join("، ")} (${parsed.buildingNames.length} عمارات - ${modeLabel})`;
                                        } else if (parsed.buildingItems && parsed.buildingItems.length > 0) {
                                          const bNames = Array.from(new Set(parsed.buildingItems.map((b: any) => b.buildingName))).join(" ، ");
                                          buildingsSummary = `${bNames} (${parsed.buildingItems.length} دور/مستوى)`;
                                        }
                                      } catch (e) {}
                                    }

                                    return (
                                      <tr key={p.id || idx}>
                                        <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                                        <td style={{ fontWeight: 800, color: "#38bdf8" }}>{p.modelName || "نموذج عام"}</td>
                                        <td style={{ fontWeight: 600 }}>🏛️ {buildingsSummary}</td>
                                        <td><span className="badge badge-info">{p.unit}</span></td>
                                        <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{formatCurrency(p.unitPrice || 0)}</td>
                                        <td style={{ fontWeight: 700, color: "#f59e0b" }}>{formatCurrency(subPrice)}</td>
                                        <td style={{ fontWeight: 700 }}>{p.totalSurveyedQty || 0}</td>
                                        <td style={{ fontWeight: 800, color: "#10b981" }}>{p.executedQty || 0}</td>
                                        <td><span className="badge badge-success">{p.progressPercent || 0}%</span></td>
                                        <td className="print:hidden" style={{ textAlign: "center" }}>
                                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                            <Link to={`/project-phases/create?projectId=${project.id}&edit=${p.id}`} className="btn-icon-centered" title="تعديل">
                                              ✏️
                                            </Link>
                                            <button onClick={() => handleDeletePhase(p.id)} className="btn-icon-centered text-danger" title="حذف">
                                              🗑️
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TAB 3: WORKERS */}
          {activeTab === "workers" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>👷 العمال المساهمون في موقع المشروع</h3>
                <Link to="/workers/create" className="btn btn-primary btn-sm">
                  + إضافة عامل جديد
                </Link>
              </div>

              {workersList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">👷</div>
                  <div className="empty-state-text">لا يوجد عمال مسجلون على هذا المشروع بعد</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم العامل</th>
                        <th>التخصص</th>
                        <th>الأجر اليومي</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workersList.map((w, idx) => (
                        <tr key={w.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{w.name}</td>
                          <td><span className="badge badge-info">{w.specialty || "عامل"}</span></td>
                          <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{formatCurrency(w.dailyRate)}</td>
                          <td>
                            <Link to={`/workers/${w.id}/statement`} className="btn btn-ghost btn-sm">
                              📄 كشف حساب العامل
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUPERVISORS */}
          {activeTab === "supervisors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>👔 المشرفون والمهندسون المسؤولون عن الموقع</h3>
                <Link to="/supervisors/create" className="btn btn-primary btn-sm">
                  + إضافة مشرف جديد
                </Link>
              </div>

              {supervisorsList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">👔</div>
                  <div className="empty-state-text">لا يوجد مشرفون معينون على هذا المشروع حالياً</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم المشرف / المهندس</th>
                        <th>رقم الهاتف</th>
                        <th>نظام الراتب</th>
                        <th>الراتب / الأجر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisorsList.map((sup, idx) => (
                        <tr key={sup.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{sup.name}</td>
                          <td>{sup.phone || "-"}</td>
                          <td><span className="badge badge-warning">{sup.salaryType}</span></td>
                          <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{formatCurrency(sup.salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EXPENSES */}
          {activeTab === "expenses" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>💸 مصروفات مشروع {project.name}</h3>
                  <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                    إجمالي المصروفات: <strong style={{ color: "#ef4444" }}>{formatCurrency(totalExp)}</strong>
                  </span>
                </div>
                <Link to={`/project-expenses/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + تسجيل مصروف للمشروع
                </Link>
              </div>

              {expensesList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">💸</div>
                  <div className="empty-state-text">لا توجد مصروفات مسجلة لهذا المشروع بعد</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>التاريخ</th>
                        <th>النوع</th>
                        <th>البيان / الشرح</th>
                        <th>المبلغ</th>
                        <th>ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesList.map((exp, idx) => (
                        <tr key={exp.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td>{formatDateShort(exp.date)}</td>
                          <td><span className="badge badge-info">{exp.type}</span></td>
                          <td>{exp.description}</td>
                          <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(exp.amount)}</td>
                          <td>{exp.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: WORKER DAILIES */}
          {activeTab === "worker_dailies" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>🗓️ يوميات وسجل حضور العمال بالموقع</h3>
                  <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                    إجمالي المستحقات: <strong style={{ color: "#f59e0b" }}>{formatCurrency(totalDailies)}</strong>
                  </span>
                </div>
                <Link to={`/worker-daily/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + تسجيل يومية موقع
                </Link>
              </div>

              {workerDailiesList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">🗓️</div>
                  <div className="empty-state-text">لا توجد يوميات مسجلة لعمال هذا المشروع بعد</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>التاريخ</th>
                        <th>اسم العامل</th>
                        <th>حالة الحضور</th>
                        <th>المبلغ / الاستحقاق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerDailiesList.map((d, idx) => (
                        <tr key={d.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td>{formatDateShort(d.date)}</td>
                          <td style={{ fontWeight: 700 }}>{d.worker?.name || "عامل موقع"}</td>
                          <td><span className="badge badge-success">{d.status}</span></td>
                          <td style={{ fontWeight: 800, color: "#f59e0b" }}>{formatCurrency(d.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: INVESTORS & PARTNERSHIP SETTLEMENT */}
          {activeTab === "investors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                    🤝 حسابات وتوزيعات الشركاء المستثمرين
                  </h3>
                  <div style={{ fontSize: 12, color: "hsl(var(--text-muted))", marginTop: 3 }}>
                    تُخصم مصروفات مراحل المشروع تلقائياً من حصة كل شريك وتضاف نسبة {metaStageTaxPercent}% ضريبة/إدارة على كل مرحلة
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleOpenAddInvestor}>
                  + إضافة شريك / مستثمر
                </button>
              </div>

              {/* FINANCIAL SETTLEMENT SUMMARY CARD FOR PARTNERS */}
              <div
                style={{
                  background: "linear-gradient(145deg, hsl(var(--bg-elevated)) 0%, #10b98110 100%)",
                  border: "1px solid #10b98140",
                  borderRadius: 14,
                  padding: "16px 20px",
                  marginBottom: 18,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: "hsl(var(--text-muted))" }}>إجمالي مصروفات المراحل الفعلية</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#ef4444", marginTop: 2 }}>{formatCurrency(totalCosts)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: "hsl(var(--text-muted))" }}>ضريبة / إدارة المراحل ({metaStageTaxPercent}%)</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>{formatCurrency(stageTaxAmount)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: "hsl(var(--text-muted))" }}>إجمالي التكلفة شاملة الضريبة</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "hsl(var(--gold))", marginTop: 2 }}>{formatCurrency(totalCostsWithTax)}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: "hsl(var(--text-muted))" }}>إجمالي رؤوس الأموال المودعة</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981", marginTop: 2 }}>
                    {formatCurrency(investorsList.reduce((sum, inv) => sum + (inv.initialCapital || 0), 0))}
                  </div>
                </div>
              </div>

              {investorsList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">💼</div>
                  <div className="empty-state-text">لم يتم إضافة شركاء مساهمين لهذا المشروع بعد</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={handleOpenAddInvestor}>
                    + إضافة أول شريك
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم الشريك / المستثمر</th>
                        <th>رقم الهاتف</th>
                        <th style={{ textAlign: "center" }}>نسبة المساهمة %</th>
                        <th>رأس المال / الدفعة المودعة</th>
                        <th>نصيب الشريك من التكلفة والضريبة</th>
                        <th>الرصيد المتبقي للشريك</th>
                        <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investorsList.map((inv, idx) => {
                        const partnerShareFraction = (inv.sharePercent || 0) / 100;
                        const partnerCostShare = totalCostsWithTax * partnerShareFraction;
                        const partnerBalance = (inv.initialCapital || 0) - partnerCostShare;

                        return (
                          <tr key={inv.id}>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 800 }}>{inv.name}</td>
                            <td>{inv.phone || "-"}</td>
                            <td style={{ textAlign: "center" }}>
                              <span className="badge badge-warning" style={{ fontSize: 12 }}>
                                {inv.sharePercent}%
                              </span>
                            </td>
                            <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
                              {formatCurrency(inv.initialCapital || 0)}
                            </td>
                            <td style={{ fontWeight: 800, color: "#ef4444" }}>
                              {formatCurrency(partnerCostShare)}
                              <div style={{ fontSize: 10, color: "hsl(var(--text-muted))" }}>
                                (شامل +{metaStageTaxPercent}% ضريبة)
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 900,
                                  color: partnerBalance >= 0 ? "#10b981" : "#dc2626",
                                  fontSize: 13,
                                }}
                              >
                                {formatCurrency(partnerBalance)}
                              </span>
                              <div style={{ fontSize: 10, color: "hsl(var(--text-muted))" }}>
                                {partnerBalance >= 0 ? "رصيد فائض" : "مطلوب سداد / استكمال"}
                              </div>
                            </td>
                            <td className="print:hidden" style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button onClick={() => handleOpenEditInvestor(inv)} className="btn-icon-centered" title="تعديل">
                                  ✏️
                                </button>
                                <button onClick={() => handleDeleteInvestor(inv.id)} className="btn-icon-centered text-danger" title="حذف">
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SUBCONTRACTORS */}
          {activeTab === "subcontractors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>🔧 مقاولو الباطن التابعون للمشروع</h3>
                <Link to="/subcontractors/create" className="btn btn-primary btn-sm">
                  + إضافة مقاول فرعي
                </Link>
              </div>

              {subcontractorsList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">🔧</div>
                  <div className="empty-state-text">لا يوجد مقاولو باطن مسجلون على هذا المشروع بعد</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم الشركة / المقاول</th>
                        <th>التخصص</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcontractorsList.map((sub, idx) => (
                        <tr key={sub.id || idx}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{sub.name}</td>
                          <td><span className="badge badge-info">{sub.specialty || "مقاول باطن"}</span></td>
                          <td>
                            <Link to="/subcontractors" className="btn btn-ghost btn-sm">
                              📄 عرض المستخلصات والعقود
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: STATEMENTS (مستخلصات المقاولين) */}
          {activeTab === "statements" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>📋 مستخلصات وعقود الأعمال للمشروع</h3>
                <Link to="/subcontractors" className="btn btn-primary btn-sm">
                  + إضافة مستخلص جديد
                </Link>
              </div>

              {statementsList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-text">لا توجد مستخلصات مسجلة لهذا المشروع بعد</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>التاريخ</th>
                        <th>المقاول الفرعي</th>
                        <th>نوع المستند</th>
                        <th>البيان</th>
                        <th>المبلغ</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementsList.map((st, idx) => (
                        <tr key={st.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td>{formatDateShort(st.date)}</td>
                          <td style={{ fontWeight: 700 }}>{st.subcontractor?.name || "مقاول فرعي"}</td>
                          <td><span className="badge badge-info">{st.type}</span></td>
                          <td>{st.description}</td>
                          <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{formatCurrency(st.amount)}</td>
                          <td><span className="badge badge-success">{st.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: FILES */}
          {activeTab === "files" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>📁 المستندات والملفات الخاصة بالمشروع</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowFileModal(true)}>
                  + رفع ملف للمشروع
                </button>
              </div>

              {filesList.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-icon">📁</div>
                  <div className="empty-state-text">لم يتم رفع مستندات أو ملفات لهذا المشروع بعد</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setShowFileModal(true)}>
                    + رفع أول ملف
                  </button>
                </div>
              ) : (
                <div className="grid-2" style={{ gap: 14 }}>
                  {filesList.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "hsl(var(--bg-elevated))",
                        border: "1px solid hsl(var(--border-subtle))",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 28 }}>📄</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                          <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 2 }}>
                            {f.fileName} • {(f.fileSize / 1024).toFixed(1)} ك.بايت
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a href={f.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                          👁️ عرض
                        </a>
                        <button onClick={() => handleDeleteFile(f.id)} className="btn-icon-centered text-danger" title="حذف">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* INVESTOR MODAL FORM */}
      {showInvestorModal && (
        <div className="modal-overlay" onClick={() => setShowInvestorModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingInvestor ? "✏️ تعديل بيانات الشريك" : "💼 إضافة شريك / مستثمر جديد"}</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowInvestorModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveInvestor}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم الشريك / المستثمر *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="اسم الشريك بالكامل..."
                    required
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="01xxxxxxxxx"
                    value={invPhone}
                    onChange={(e) => setInvPhone(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نسبة المساهمة / الشراكة %</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="50"
                      value={invSharePercent}
                      onChange={(e) => setInvSharePercent(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">رأس المال / الدفعة المبدئية</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0"
                      value={invCapital}
                      onChange={(e) => setInvCapital(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInvestorModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ بيانات الشريك</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILE UPLOAD MODAL */}
      {showFileModal && (
        <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2 className="modal-title">📁 رفع مستند / ملف للمشروع</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowFileModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUploadFile}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">عنوان المستند / المرفق *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: عقد المشروع الأصلي، المخطط الهندسي..."
                    required
                    value={fileTitle}
                    onChange={(e) => setFileTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">اختيار الملف *</label>
                  <input
                    type="file"
                    className="form-control"
                    required
                    onChange={(e) => setFileObject(e.target.files ? e.target.files[0] : null)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowFileModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingFile}>
                  {uploadingFile ? <span className="spinner" /> : "حفظ المرفق"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVENUE COLLECTION MODAL */}
      {showRevenueModal && (
        <div className="modal-overlay" onClick={() => setShowRevenueModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">💰 تسجيل دفعة تحصيل مستلمة من الشركة المالكة</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowRevenueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRevenue}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">مبلغ الدفعة المستلمة (جنيه) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="0.00"
                    required
                    value={revAmount}
                    onChange={(e) => setRevAmount(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع التحصيل *</label>
                    <select className="form-control" value={revType} onChange={(e) => setRevType(e.target.value)}>
                      <option value="مستخلص نسبة % من العقد">مستخلص نسبة % من العقد</option>
                      <option value="مبلغ تحصيل مقطوعية">مبلغ تحصيل مقطوعية</option>
                      <option value="دفعة مقدمة">دفعة مقدمة من المالكة</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={revDate}
                      onChange={(e) => setRevDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">البيان وملاحظات التحصيل</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="تحصيل مستخلص شهر..."
                    value={revNotes}
                    onChange={(e) => setRevNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRevenueModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-gold">تسجيل الدفعة وتسميع الإيراد</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
