import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";
import { formatCurrency } from "../lib/utils";

const GOVERNORATES = [
  "اختر المحافظة",
  "القاهرة", "الجيزة", "الإسكندرية", "الشرقية", "الدقهلية",
  "البحيرة", "القليوبية", "المنوفية", "الغربية", "سوهاج",
  "أسيوط", "المنيا", "قنا", "بني سويف", "كفر الشيخ",
  "أسوان", "دمياط", "الإسماعيلية", "الأقصر", "السويس",
  "بورسعيد", "جنوب سيناء", "شمال سيناء", "مطروح",
  "البحر الأحمر", "الوادي الجديد", "الفيوم",
];

export type ProjectTypeKey = "GENERAL_CONTRACTING" | "SUPERVISOR_METER_RATE" | "INVESTMENT_PARTNERSHIP";

export const PROJECT_TYPES_CONFIG: Record<
  ProjectTypeKey,
  {
    title: string;
    badge: string;
    color: string;
    icon: string;
    desc: string;
    details: string;
  }
> = {
  GENERAL_CONTRACTING: {
    title: "مشاريع تنفيذ ومقاولات شركات",
    badge: "مقاولات وتنفيذ",
    color: "#3b82f6",
    icon: "🏢",
    desc: "مشاريع مأخوذة من شركات وهيئات، يعين عليها مشرف (يوميات)، مقاولو باطن بعمالهم (مستخلصات ودفعات أسبوعية)، وعمالة/صنايعية مباشرة.",
    details: "إشراف يوميات • مستخلصات باطن أسبوعية • كشوف عمالة",
  },
  SUPERVISOR_METER_RATE: {
    title: "مشاريع تشغيل وتسليم بالمتر لمشرف",
    badge: "فرق سعر المتر",
    color: "#f59e0b",
    icon: "📐",
    desc: "مشاريع يتم استلام المتر فيها بسعر من المالك وبيعه/إسناده لمشرف بسعر مختلف، وصرف دفعات ومصاريف تشغيل للمشرف وحساب فارق الربح.",
    details: "سعر متر المالك vs سعر المشرف • دفعات تشغيل • حساب فرق المتر",
  },
  INVESTMENT_PARTNERSHIP: {
    title: "مشاريع استثمارية وشراكة بنسب",
    badge: "استثماري وشراكة",
    color: "#10b981",
    icon: "🤝",
    desc: "مشاريع استثمارية بين شركاء بنسب مساهمة، يتم الصرف على كافة المراحل وتخصم من حسابات الشركاء وتضاف 10% ضريبة/إدارة على كل مرحلة.",
    details: "نسب الشركاء % • خصم المصروفات تلقائياً • +10% ضريبة مراحل",
  },
};

interface PartnerItem {
  id: string;
  name: string;
  phone: string;
  sharePercent: number;
  initialCapital: number;
}

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const { toasts, showToast, removeToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loadingProject, setLoadingProject] = useState(isEditing);

  // General Project States
  const [projectCode, setProjectCode] = useState("PR0001");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [governorate, setGovernorate] = useState("اختر المحافظة");
  const [status, setStatus] = useState("مخطط");
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Project Type State
  const [projectType, setProjectType] = useState<ProjectTypeKey>("GENERAL_CONTRACTING");

  // Type 2: Meter Rate Specifics
  const [supervisorsList, setSupervisorsList] = useState<{ id: string; name: string }[]>([]);
  const [assignedSupervisor, setAssignedSupervisor] = useState("");
  const [ownerMeterRate, setOwnerMeterRate] = useState("");
  const [supervisorMeterRate, setSupervisorMeterRate] = useState("");
  const [meterUnit, setMeterUnit] = useState("م² مسطح");
  const [totalEstimatedMeters, setTotalEstimatedMeters] = useState("");

  // Type 3: Investment & Partnership Specifics
  const [stageTaxPercent, setStageTaxPercent] = useState("10");
  const [partners, setPartners] = useState<PartnerItem[]>([
    { id: "p-1", name: "", phone: "", sharePercent: 50, initialCapital: 0 },
    { id: "p-2", name: "", phone: "", sharePercent: 50, initialCapital: 0 },
  ]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [projRes, supRes] = await Promise.all([
          supabase.from("Project").select("*").order("createdAt", { ascending: false }),
          supabase.from("Supervisor").select("id, name").order("name", { ascending: true }),
        ]);

        if (supRes.data) {
          setSupervisorsList(supRes.data);
        }

        const list = projRes.data || [];

        if (isEditing && editId) {
          const target = list.find((p: any) => p.id === editId);
          if (target) {
            setProjectCode(target.code || "");
            setName(target.name || "");
            setClient(target.client || "");
            setStatus(target.status || "جاري");
            setValue(String(target.value || 0));
            setStartDate(target.startDate ? new Date(target.startDate).toISOString().split("T")[0] : "");
            setEndDate(target.endDate ? new Date(target.endDate).toISOString().split("T")[0] : "");

            // Extract metadata if exists in notes or target.type
            const rawNotes = target.notes || "";
            if (rawNotes.includes("[meta:")) {
              const typeMatch = rawNotes.match(/type=([^\|\]]+)/);
              if (typeMatch && (typeMatch[1] as ProjectTypeKey) in PROJECT_TYPES_CONFIG) {
                setProjectType(typeMatch[1] as ProjectTypeKey);
              }
              const supMatch = rawNotes.match(/supervisor=([^\|\]]+)/);
              if (supMatch) setAssignedSupervisor(decodeURIComponent(supMatch[1]));

              const omrMatch = rawNotes.match(/ownerRate=([^\|\]]+)/);
              if (omrMatch) setOwnerMeterRate(omrMatch[1]);

              const smrMatch = rawNotes.match(/supervisorRate=([^\|\]]+)/);
              if (smrMatch) setSupervisorMeterRate(smrMatch[1]);

              const unitMatch = rawNotes.match(/meterUnit=([^\|\]]+)/);
              if (unitMatch) setMeterUnit(decodeURIComponent(unitMatch[1]));

              const estMatch = rawNotes.match(/estimatedMeters=([^\|\]]+)/);
              if (estMatch) setTotalEstimatedMeters(estMatch[1]);

              const taxMatch = rawNotes.match(/stageTaxPercent=([^\|\]]+)/);
              if (taxMatch) setStageTaxPercent(taxMatch[1]);

              const partnersMatch = rawNotes.match(/partners=([^\|\]]+)/);
              if (partnersMatch) {
                try {
                  const parsedPartners = JSON.parse(decodeURIComponent(partnersMatch[1]));
                  if (Array.isArray(parsedPartners) && parsedPartners.length > 0) {
                    setPartners(parsedPartners);
                  }
                } catch (e) {}
              }

              const cleanNotes = rawNotes.replace(/\[meta:[^\]]+\]/, "").trim();
              setNotes(cleanNotes);
            } else {
              setNotes(rawNotes);
            }
          }
        } else {
          // Smart unique project code generator
          const existingCodes = new Set(list.map((p: any) => p.code));
          let maxNum = list.length + 1;

          list.forEach((p: any) => {
            if (p.code && p.code.startsWith("PR")) {
              const numPart = parseInt(p.code.replace("PR", ""), 10);
              if (!isNaN(numPart) && numPart >= maxNum) {
                maxNum = numPart + 1;
              }
            }
          });

          let nextCode = `PR${String(maxNum).padStart(4, "0")}`;
          while (existingCodes.has(nextCode)) {
            maxNum++;
            nextCode = `PR${String(maxNum).padStart(4, "0")}`;
          }

          setProjectCode(nextCode);
        }
      } catch (err: any) {
        showToast(err.message || "خطأ في الاتصال بـ Supabase", "error");
      } finally {
        setLoadingProject(false);
      }
    }
    loadInitialData();
  }, [editId, isEditing]);

  // Partner Handlers for Investment Type
  const handleAddPartner = () => {
    setPartners([
      ...partners,
      { id: "p-" + Date.now(), name: "", phone: "", sharePercent: 0, initialCapital: 0 },
    ]);
  };

  const handleRemovePartner = (id: string) => {
    if (partners.length <= 1) {
      showToast("يجب أن يحتوي المشروع على شريك واحد على الأقل", "warning");
      return;
    }
    setPartners(partners.filter((p) => p.id !== id));
  };

  const handleUpdatePartner = (id: string, field: keyof PartnerItem, val: any) => {
    setPartners(
      partners.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const totalPartnersShare = partners.reduce((sum, p) => sum + (parseFloat(String(p.sharePercent)) || 0), 0);

  // Meter Rate Calculations
  const calcOwnerRate = parseFloat(ownerMeterRate) || 0;
  const calcSupRate = parseFloat(supervisorMeterRate) || 0;
  const calcMeters = parseFloat(totalEstimatedMeters) || 0;
  const profitPerMeter = calcOwnerRate - calcSupRate;
  const totalExpectedMeterProfit = profitPerMeter * calcMeters;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("اسم المشروع مطلوب", "error");
      return;
    }

    if (projectType === "INVESTMENT_PARTNERSHIP") {
      const validPartners = partners.filter((p) => p.name.trim() !== "");
      if (validPartners.length === 0) {
        showToast("يرجى إدخال اسم شريك واحد على الأقل للمشروع الاستثماري", "warning");
        return;
      }
    }

    setSubmitting(true);
    try {
      const validPartners = partners.filter((p) => p.name.trim() !== "");
      
      // Construct metadata
      const metaTag = `[meta:type=${projectType}|typeName=${encodeURIComponent(PROJECT_TYPES_CONFIG[projectType].title)}|supervisor=${encodeURIComponent(assignedSupervisor)}|ownerRate=${ownerMeterRate}|supervisorRate=${supervisorMeterRate}|meterUnit=${encodeURIComponent(meterUnit)}|estimatedMeters=${totalEstimatedMeters}|stageTaxPercent=${stageTaxPercent}|partners=${encodeURIComponent(JSON.stringify(validPartners))}]`;
      
      const combinedNotes = `${metaTag} ${governorate !== "اختر المحافظة" ? "المحافظة: " + governorate + " | " : ""}${address ? "العنوان: " + address + " | " : ""}${notes}`.trim();

      const computedValue =
        projectType === "SUPERVISOR_METER_RATE" && calcOwnerRate > 0 && calcMeters > 0
          ? calcOwnerRate * calcMeters
          : parseFloat(value) || 0;

      const payload = {
        code: projectCode,
        name: name.trim(),
        client: client.trim() || (projectType === "INVESTMENT_PARTNERSHIP" ? "مشروع استثماري شراكة" : "جهة عامة"),
        status,
        value: computedValue,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        notes: combinedNotes,
      };

      let finalProjectId = editId;

      if (isEditing && editId) {
        const { error } = await supabase.from("Project").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تعديل بيانات المشروع ونوعه بنجاح ✅", "success");
      } else {
        let currentCode = projectCode;
        let attempts = 0;
        let success = false;
        let lastError = null;

        while (attempts < 5 && !success) {
          const newId = crypto.randomUUID();
          finalProjectId = newId;
          const currentPayload = { ...payload, code: currentCode };

          const { error } = await supabase.from("Project").insert([{ id: newId, ...currentPayload }]);

          if (!error) {
            success = true;
          } else if (error.message && (error.message.includes("Project_code_key") || error.message.includes("duplicate key"))) {
            attempts++;
            const numMatch = currentCode.match(/\d+/);
            const nextNum = numMatch ? parseInt(numMatch[0], 10) + attempts : attempts + 10;
            currentCode = `PR${String(nextNum).padStart(4, "0")}`;
            lastError = error;
          } else {
            throw error;
          }
        }

        if (!success && lastError) {
          throw lastError;
        }

        showToast("تم إنشاء المشروع بنجاح 🏗️✅", "success");
      }

      // If Investment Project, also persist partners to ProjectInvestor table and LocalStorage
      if (finalProjectId && projectType === "INVESTMENT_PARTNERSHIP" && validPartners.length > 0) {
        try {
          localStorage.setItem(`investors_${finalProjectId}`, JSON.stringify(validPartners));
          // Attempt to insert into ProjectInvestor table if table exists
          for (const p of validPartners) {
            try {
              await supabase.from("ProjectInvestor").insert([{
                id: p.id.startsWith("p-") ? crypto.randomUUID() : p.id,
                projectId: finalProjectId,
                name: p.name,
                phone: p.phone,
                sharePercent: parseFloat(String(p.sharePercent)) || 0,
                initialCapital: parseFloat(String(p.initialCapital)) || 0,
              }]);
            } catch (err) {}
          }
        } catch (e) {}
      }

      setTimeout(() => navigate(`/projects/${finalProjectId || ""}`), 1000);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "حدث خطأ أثناء حفظ المشروع", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="empty-state" style={{ minHeight: "400px" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل بيانات المشروع للتعديل...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: "40px" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">{isEditing ? "✏️ تعديل بيانات ونوع المشروع" : "🏗️ إضافة مشروع جديد"}</h1>
          <p className="page-subtitle">حدد نوع المشروع والتفاصيل المالية ورسميات العقد</p>
        </div>
        <Link to="/projects" className="btn btn-ghost">
          ← العودة للمشاريع
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ========================================================= */}
        {/* STEP 1: PROJECT TYPE SELECTION (خانة نوع المشروع الأساسية) */}
        {/* ========================================================= */}
        <div className="card" style={{ marginBottom: "24px", border: "1px solid hsl(var(--gold) / 0.3)" }}>
          <div className="card-body" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "16px" }}>
              <span style={{ fontSize: 22 }}>🏷️</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: "hsl(var(--gold))" }}>
                  نوع المشروع <span className="text-danger">*</span>
                </h3>
                <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: 0, marginTop: 2 }}>
                  اختر النموذج التشغيلي والمالي المناسب للمشروع لتفعيل الحسابات واللوحات المخصصة له
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px",
              }}
            >
              {(Object.keys(PROJECT_TYPES_CONFIG) as ProjectTypeKey[]).map((key) => {
                const config = PROJECT_TYPES_CONFIG[key];
                const isSelected = projectType === key;
                return (
                  <div
                    key={key}
                    onClick={() => setProjectType(key)}
                    style={{
                      cursor: "pointer",
                      padding: "16px",
                      borderRadius: "14px",
                      border: isSelected
                        ? `2px solid ${config.color}`
                        : "1px solid hsl(var(--border-subtle))",
                      background: isSelected
                        ? `linear-gradient(145deg, hsl(var(--bg-card)), ${config.color}15)`
                        : "hsl(var(--bg-elevated))",
                      boxShadow: isSelected ? `0 6px 20px ${config.color}25` : "none",
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 24 }}>{config.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: isSelected ? config.color : "inherit" }}>
                          {config.title}
                        </span>
                      </div>
                      {isSelected ? (
                        <span
                          style={{
                            background: config.color,
                            color: "#fff",
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </span>
                      ) : (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: "2px solid hsl(var(--border-subtle))",
                          }}
                        />
                      )}
                    </div>

                    <p style={{ fontSize: 11.5, color: "hsl(var(--text-secondary))", lineHeight: 1.5, margin: "6px 0 10px 0" }}>
                      {config.desc}
                    </p>

                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: isSelected ? `${config.color}20` : "hsl(var(--bg-card))",
                        color: isSelected ? config.color : "hsl(var(--text-muted))",
                        display: "inline-block",
                      }}
                    >
                      {config.details}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CONDITIONAL SECTION: TYPE 2 (فرق سعر المتر لمشرف) */}
        {/* ========================================================= */}
        {projectType === "SUPERVISOR_METER_RATE" && (
          <div
            className="card"
            style={{
              marginBottom: "24px",
              border: "1px solid #f59e0b",
              background: "linear-gradient(180deg, hsl(var(--bg-card)) 0%, #f59e0b08 100%)",
            }}
          >
            <div className="card-body" style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "16px" }}>
                <span style={{ fontSize: 22 }}>📐</span>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0, color: "#f59e0b" }}>
                    بيانات مقاولة المتر وإسناد التشغيل لمشرف
                  </h3>
                  <p style={{ fontSize: 11.5, color: "hsl(var(--text-muted))", margin: 0 }}>
                    حدد أسعار المتر من المالك وسعر المشرف لحساب فارق الربح وصافي المستحقات التقديرية
                  </p>
                </div>
              </div>

              <div className="grid-3" style={{ gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">المشرف المسؤول عن استلام المتر</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="form-control"
                      value={assignedSupervisor}
                      onChange={(e) => setAssignedSupervisor(e.target.value)}
                    >
                      <option value="">-- اختر من المشرفين المسجلين --</option>
                      {supervisorsList.map((sup) => (
                        <option key={sup.id} value={sup.name}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="أو اكتب اسم المشرف..."
                      value={assignedSupervisor}
                      onChange={(e) => setAssignedSupervisor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">سعر استلام المتر من المالك (جنيه) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="مثال: 200 أو 2"
                    value={ownerMeterRate}
                    onChange={(e) => setOwnerMeterRate(e.target.value)}
                    style={{ fontWeight: 800, color: "hsl(var(--gold))" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">سعر إسناد المتر للمشرف (جنيه) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="مثال: 150 أو 1"
                    value={supervisorMeterRate}
                    onChange={(e) => setSupervisorMeterRate(e.target.value)}
                    style={{ fontWeight: 800, color: "#f59e0b" }}
                  />
                </div>
              </div>

              <div className="grid-3" style={{ gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">وحدة القياس</label>
                  <select className="form-control" value={meterUnit} onChange={(e) => setMeterUnit(e.target.value)}>
                    <option value="م² مسطح">م² مسطح (أرضيات / مباني / تشطيب)</option>
                    <option value="م³ مكعب">م³ مكعب (خرسانة / حفر)</option>
                    <option value="م.ط طولي">م.ط (متر طولي)</option>
                    <option value="بند مقطوعية">بند مقطوعية</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">إجمالي كمية الأمتار التقديرية ({meterUnit})</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="مثال: 5000"
                    value={totalEstimatedMeters}
                    onChange={(e) => setTotalEstimatedMeters(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">نظام صرف مصاريف المشرف</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value="دفعات ومصاريف تشغيل بحساب الأمتار"
                    style={{ background: "hsl(var(--bg-elevated))", color: "hsl(var(--text-muted))" }}
                  />
                </div>
              </div>

              {/* LIVE KPI CALCULATION FOR METER RATE */}
              {(calcOwnerRate > 0 || calcSupRate > 0) && (
                <div
                  style={{
                    background: "hsl(var(--bg-elevated))",
                    border: "1px dashed #f59e0b",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>فرق سعر المتر (هامش الربح)</div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: profitPerMeter >= 0 ? "#10b981" : "#ef4444",
                        marginTop: 2,
                      }}
                    >
                      {formatCurrency(profitPerMeter)} / {meterUnit}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي قيمة عقد المالك</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "hsl(var(--gold))", marginTop: 2 }}>
                      {formatCurrency(calcOwnerRate * calcMeters)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي استحقاق المشرف بالأمتار</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b", marginTop: 2 }}>
                      {formatCurrency(calcSupRate * calcMeters)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي صافي أرباح فرق السعر المقدرة</div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: totalExpectedMeterProfit >= 0 ? "#10b981" : "#ef4444",
                        marginTop: 2,
                      }}
                    >
                      {formatCurrency(totalExpectedMeterProfit)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CONDITIONAL SECTION: TYPE 3 (استثماري وشراكة + ضريبة 10%) */}
        {/* ========================================================= */}
        {projectType === "INVESTMENT_PARTNERSHIP" && (
          <div
            className="card"
            style={{
              marginBottom: "24px",
              border: "1px solid #10b981",
              background: "linear-gradient(180deg, hsl(var(--bg-card)) 0%, #10b98108 100%)",
            }}
          >
            <div className="card-body" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🤝</span>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0, color: "#10b981" }}>
                      بيانات الشركاء المستثمرين وضريبة مراحل المشروع
                    </h3>
                    <p style={{ fontSize: 11.5, color: "hsl(var(--text-muted))", margin: 0 }}>
                      تُخصم مصروفات مراحل المشروع من حصص الشركاء وتضاف نسبة ضريبة/إدارة على كل مرحلة
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>ضريبة/إدارة المراحل %:</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={stageTaxPercent}
                      onChange={(e) => setStageTaxPercent(e.target.value)}
                      style={{ width: 80, fontWeight: 800, color: "#10b981", textAlign: "center" }}
                    />
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddPartner}>
                    + إضافة شريك
                  </button>
                </div>
              </div>

              {/* PARTNERS LIST TABLE */}
              <div className="table-container" style={{ marginBottom: "14px" }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: "center" }}>#</th>
                      <th>اسم الشريك / المستثمر *</th>
                      <th>رقم الهاتف</th>
                      <th style={{ width: 140 }}>نسبة المساهمة % *</th>
                      <th style={{ width: 170 }}>رأس المال / الدفعة المبدئية (جنيه)</th>
                      <th style={{ width: 60, textAlign: "center" }}>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="اسم الشريك بالكامل..."
                            required
                            value={p.name}
                            onChange={(e) => handleUpdatePartner(p.id, "name", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="01xxxxxxxxx"
                            value={p.phone}
                            onChange={(e) => handleUpdatePartner(p.id, "phone", e.target.value)}
                          />
                        </td>
                        <td>
                          <div style={{ position: "relative" }}>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              placeholder="50"
                              required
                              value={p.sharePercent}
                              onChange={(e) => handleUpdatePartner(p.id, "sharePercent", parseFloat(e.target.value) || 0)}
                              style={{ fontWeight: 800 }}
                            />
                            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }}>%</span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            placeholder="0.00"
                            value={p.initialCapital}
                            onChange={(e) => handleUpdatePartner(p.id, "initialCapital", parseFloat(e.target.value) || 0)}
                            style={{ fontWeight: 700, color: "hsl(var(--gold))" }}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleRemovePartner(p.id)}
                            className="btn-icon-centered text-danger"
                            title="حذف الشريك"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "hsl(var(--bg-elevated))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              >
                <div>
                  إجمالي نسب الشراكة الموزعة:{" "}
                  <strong style={{ color: totalPartnersShare === 100 ? "#10b981" : "#f59e0b", fontSize: 13 }}>
                    {totalPartnersShare}%
                  </strong>
                  {totalPartnersShare !== 100 && (
                    <span style={{ color: "#f59e0b", marginRight: 8 }}>(يُفضل أن يكون المجموع 100%)</span>
                  )}
                </div>
                <div>
                  إجمالي الدفعات المبدئية:{" "}
                  <strong style={{ color: "hsl(var(--gold))", fontSize: 13 }}>
                    {formatCurrency(partners.reduce((sum, p) => sum + (parseFloat(String(p.initialCapital)) || 0), 0))}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BASIC PROJECT DATA (البيانات العامة للمشروع) */}
        {/* ========================================================= */}
        <div className="card">
          <div className="card-body" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: "20px" }}>
              📌 البيانات الأساسية للمشروع ورسميات التعاقد
            </h3>

            <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  كود المشروع <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  style={{ fontWeight: 800, color: "hsl(var(--gold))" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  اسم المشروع <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="أدخل اسم المشروع"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: "20px", marginBottom: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">العميل / الجهة المالكة</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    projectType === "INVESTMENT_PARTNERSHIP"
                      ? "مشروع استثماري شراكة"
                      : "اسم العميل أو الجهة المالكة"
                  }
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المحافظة</label>
                <select
                  className="form-control"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                >
                  {GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الحالة</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="مخطط">مخطط</option>
                  <option value="جاري">جاري</option>
                  <option value="منتهي">منتهي</option>
                  <option value="متوقف">متوقف</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label">العنوان التفصيلي</label>
              <input
                type="text"
                className="form-control"
                placeholder="أدخل العنوان التفصيلي للموقع"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid-3" style={{ gap: "20px", marginBottom: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">قيمة العقد الإجمالية (جنيه)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0.00"
                  value={
                    projectType === "SUPERVISOR_METER_RATE" && calcOwnerRate > 0 && calcMeters > 0
                      ? String(calcOwnerRate * calcMeters)
                      : value
                  }
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">تاريخ البدء</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">تاريخ التسليم المتوقع</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">ملاحظات</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="أية ملاحظات أو تفاصيل إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center" style={{ borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: "20px" }}>
              <Link to="/projects" className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: "12px 28px", fontSize: "15px" }}>
                {submitting ? <span className="spinner" /> : isEditing ? "تحديث وتعديل البيانات" : "حفظ المشروع والتأكيد"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

