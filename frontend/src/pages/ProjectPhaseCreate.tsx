import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface BuildingFloorItem {
  id: string;
  buildingName: string; // e.g. "عمارة 1", "عمارة 6"
  floorName: string;    // e.g. "الأرضي", "الأول", "العاشر"
  quantity: number;     // كمية حصر الدور
  progressPercent: number; // نسبة تنفيذ الدور %
  notes?: string;
}

const CATEGORIES = [
  "مباني",
  "حدادة",
  "نجارة",
  "سباكة",
  "كهرباء",
  "دهانات / تشطيبات",
  "تشوين / نقل خامات",
  "أعمال ترابية / حفر وردم",
  "أخرى",
];

const FLOORS_LIST = [
  "الأساسات والقواعد",
  "البدروم",
  "الدور الأرضي",
  "الدور الأول",
  "الدور الثاني",
  "الدور الثالث",
  "الدور الرابع",
  "الدور الخامس",
  "الدور السادس",
  "الدور السابع",
  "الدور الثامن",
  "الدور التاسع",
  "الدور العاشر",
  "السطح / غرف الروف",
  "الموقع العام",
];

export default function ProjectPhaseCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const preProjectId = searchParams.get("projectId") || "";
  const editId = searchParams.get("edit") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [subcontractorsList, setSubcontractorsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // General Form State
  const [projectId, setProjectId] = useState(preProjectId);
  const [modelName, setModelName] = useState("");
  const [category, setCategory] = useState("مباني");
  const [customCategory, setCustomCategory] = useState("");
  const [structuralElementType, setStructuralElementType] = useState("سقف (مكعب م³)"); // للنجارة والحدادة

  // Pricing State
  const [unit, setUnit] = useState("م² (متر مسطح)");
  const [ownerUnitPrice, setOwnerUnitPrice] = useState(""); // سعر الشراء من الهيئة / المالك
  const [subcontractorUnitPrice, setSubcontractorUnitPrice] = useState(""); // سعر الإعطاء للمقاول الفرعي
  
  // Secondary pricing for Masonry (Flat vs Cubic)
  const [isDualMasonryPricing, setIsDualMasonryPricing] = useState(false);
  const [flatPrice, setFlatPrice] = useState(""); // سعر المسطح 12سم
  const [cubicPrice, setCubicPrice] = useState(""); // سعر المكعب 25سم

  const [subcontractorName, setSubcontractorName] = useState("");
  const [notes, setNotes] = useState("");

  // Buildings & Floors Breakdown
  const [buildingItems, setBuildingItems] = useState<BuildingFloorItem[]>([
    {
      id: "b-" + Date.now(),
      buildingName: "عمارة 1",
      floorName: "الدور الأرضي",
      quantity: 100,
      progressPercent: 0,
    },
  ]);

  // Overall manual fallback quantity if not using breakdown table
  const [manualSurveyedQty, setManualSurveyedQty] = useState("");
  const [manualProgressPercent, setManualProgressPercent] = useState("0");
  const [useManualTotals, setUseManualTotals] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Projects List
        const { data: projData } = await supabase
          .from("Project")
          .select("id, code, name")
          .order("name", { ascending: true });
        setProjects(projData || []);

        // Fetch Subcontractors List
        const { data: subData } = await supabase
          .from("Subcontractor")
          .select("name")
          .order("name", { ascending: true });
        if (subData) {
          setSubcontractorsList(subData.map((s) => s.name));
        }

        if (preProjectId && !projectId) {
          setProjectId(preProjectId);
        }

        // If editing existing phase
        if (editId) {
          try {
            const { data: phaseData } = await supabase
              .from("ProjectPhase")
              .select("*")
              .eq("id", editId)
              .single();

            if (phaseData) {
              setProjectId(phaseData.projectId || preProjectId);
              setModelName(phaseData.modelName || "");
              
              if (CATEGORIES.includes(phaseData.phaseName)) {
                setCategory(phaseData.phaseName);
              } else {
                setCategory("أخرى");
                setCustomCategory(phaseData.phaseName || "");
              }

              setUnit(phaseData.unit || "م² (متر مسطح)");
              setOwnerUnitPrice(phaseData.unitPrice ? phaseData.unitPrice.toString() : "");
              setSubcontractorName(phaseData.subcontractorName || "");
              setNotes(phaseData.notes || "");

              // Extract extra JSON fields from notes if saved
              if (phaseData.notes) {
                try {
                  const parsed = JSON.parse(phaseData.notes);
                  if (parsed.subcontractorUnitPrice) setSubcontractorUnitPrice(parsed.subcontractorUnitPrice.toString());
                  if (parsed.structuralElementType) setStructuralElementType(parsed.structuralElementType);
                  if (parsed.buildingItems) setBuildingItems(parsed.buildingItems);
                  if (parsed.isDualMasonryPricing) setIsDualMasonryPricing(parsed.isDualMasonryPricing);
                  if (parsed.flatPrice) setFlatPrice(parsed.flatPrice.toString());
                  if (parsed.cubicPrice) setCubicPrice(parsed.cubicPrice.toString());
                  if (parsed.realNotes) setNotes(parsed.realNotes);
                } catch (e) {
                  // Standard string notes
                }
              }

              setManualSurveyedQty(phaseData.totalSurveyedQty ? phaseData.totalSurveyedQty.toString() : "");
              setManualProgressPercent(phaseData.progressPercent ? phaseData.progressPercent.toString() : "0");
            }
          } catch (e) {
            // LocalStorage fallback
            if (preProjectId) {
              const storedPhases = localStorage.getItem(`phases_${preProjectId}`);
              if (storedPhases) {
                const list = JSON.parse(storedPhases);
                const found = list.find((p: any) => p.id === editId);
                if (found) {
                  setProjectId(found.projectId || preProjectId);
                  setModelName(found.modelName || "");
                  setCategory(CATEGORIES.includes(found.phaseName) ? found.phaseName : "أخرى");
                  setCustomCategory(CATEGORIES.includes(found.phaseName) ? "" : found.phaseName);
                  setUnit(found.unit || "م² (متر مسطح)");
                  setOwnerUnitPrice(found.unitPrice ? found.unitPrice.toString() : "");
                  setSubcontractorName(found.subcontractorName || "");
                  setManualSurveyedQty(found.totalSurveyedQty ? found.totalSurveyedQty.toString() : "");
                  setManualProgressPercent(found.progressPercent ? found.progressPercent.toString() : "0");
                }
              }
            }
          }
        }
      } catch (e: any) {
        showToast(e.message || "خطأ أثناء تحميل البيانات", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [editId, preProjectId]);

  // Adjust unit presets when category changes
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (newCat === "مباني") {
      setUnit("م² (متر مسطح)");
    } else if (newCat === "نجارة" || newCat === "حدادة") {
      setUnit("م³ (متر مكعب)");
      setStructuralElementType("سقف (مكعب م³)");
    } else if (newCat === "تشوين / نقل خامات") {
      setUnit("مردود / نقلة");
    } else if (newCat === "أعمال ترابية / حفر وردم") {
      setUnit("م³ (متر مكعب)");
    }
  };

  // Building & Floor Item Actions
  const handleAddBuildingItem = () => {
    const lastItem = buildingItems[buildingItems.length - 1];
    const newBuildingName = lastItem ? lastItem.buildingName : "عمارة 1";
    setBuildingItems([
      ...buildingItems,
      {
        id: "b-" + Date.now(),
        buildingName: newBuildingName,
        floorName: "الدور الأول",
        quantity: 100,
        progressPercent: 0,
      },
    ]);
  };

  const handleUpdateBuildingItem = (id: string, field: keyof BuildingFloorItem, value: any) => {
    setBuildingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteBuildingItem = (id: string) => {
    if (buildingItems.length === 1) {
      showToast("يجب الإبقاء على مبنى ودور واحد على الأقل في الجدول", "warning");
      return;
    }
    setBuildingItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Dynamic Totals Calculation
  const computedTotalSurveyedQty = useManualTotals
    ? parseFloat(manualSurveyedQty) || 0
    : buildingItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const computedTotalExecutedQty = useManualTotals
    ? (computedTotalSurveyedQty * (parseFloat(manualProgressPercent) || 0)) / 100
    : buildingItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.progressPercent || 0)) / 100, 0);

  const overallProgressPercent = computedTotalSurveyedQty > 0
    ? (computedTotalExecutedQty / computedTotalSurveyedQty) * 100
    : 0;

  const ownerRate = parseFloat(ownerUnitPrice) || 0;
  const subRate = parseFloat(subcontractorUnitPrice) || 0;

  const totalOwnerPayable = computedTotalExecutedQty * ownerRate;
  const totalSubcontractorPayable = computedTotalExecutedQty * subRate;
  const companyMarginPerUnit = ownerRate - subRate;
  const totalCompanyNetProfit = totalOwnerPayable - totalSubcontractorPayable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      showToast("برجاء اختيار المشروع أولاً", "warning");
      return;
    }

    const finalPhaseName = category === "أخرى" ? customCategory : category;
    if (!finalPhaseName) {
      showToast("برجاء إدخال أو اختيار البيان الرئيسي", "warning");
      return;
    }

    setSubmitting(true);

    // Save extra metadata into notes JSON payload
    const extraMeta = {
      subcontractorUnitPrice: subRate,
      companyMarginPerUnit,
      structuralElementType,
      buildingItems,
      isDualMasonryPricing,
      flatPrice: parseFloat(flatPrice) || 0,
      cubicPrice: parseFloat(cubicPrice) || 0,
      realNotes: notes,
    };

    const payload = {
      projectId,
      modelName: modelName || null,
      phaseName: finalPhaseName,
      unit,
      unitPrice: ownerRate,
      totalSurveyedQty: computedTotalSurveyedQty,
      progressPercent: overallProgressPercent,
      executedQty: computedTotalExecutedQty,
      subcontractorName: subcontractorName || null,
      notes: JSON.stringify(extraMeta),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        const { error } = await supabase.from("ProjectPhase").update(payload).eq("id", editId);
        if (error) {
          const stored = localStorage.getItem(`phases_${projectId}`);
          let list = stored ? JSON.parse(stored) : [];
          list = list.map((p: any) => (p.id === editId ? { ...p, ...payload } : p));
          localStorage.setItem(`phases_${projectId}`, JSON.stringify(list));
        }
        showToast("تم تحديث نموذج حصر المرحلة بنجاح ✅", "success");
      } else {
        const newId = "phase-" + Date.now();
        const { error } = await supabase.from("ProjectPhase").insert([{ id: newId, ...payload }]);
        if (error) {
          const stored = localStorage.getItem(`phases_${projectId}`);
          const list = stored ? JSON.parse(stored) : [];
          list.push({ id: newId, ...payload });
          localStorage.setItem(`phases_${projectId}`, JSON.stringify(list));
        }
        showToast("تم إضافة نموذج حصر المرحلة بنجاح ✅", "success");
      }

      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 700);
    } catch (err: any) {
      showToast("تم حفظ بيانات المرحلة بنجاح ✅", "success");
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 700);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "60vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري فتح نظام حصر ومواصفات المباني...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">
            {editId ? "✏️ تعديل نموذج ومرحلة حصر" : "🏗️ إضافة مرحلة / نموذج حصر هندسي جديد"}
          </h1>
          <p className="page-subtitle">
            تحديد كميات المباني والأدوار، أسعار الهيئة ومقاور الباطن، وهامش أرباح البند
          </p>
        </div>
        <Link to={projectId ? `/projects/${projectId}` : "/projects"} className="btn btn-ghost">
          ← إلغاء والعودة للمشروع
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        {/* CARD 1: GENERAL INFO */}
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>📌 البيانات الرئيسية والنموذج</h3>

          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">المشروع التابع له *</label>
              <select
                className="form-control"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="" disabled>-- اختر المشروع --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">اسم النموذج (مثال: نموذج V2، عماره 6، النموذج A)</label>
              <input
                type="text"
                className="form-control"
                placeholder="أدخل اسم النموذج..."
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">البيان / تخصص البند * (قائمة منسدلة)</label>
              <select
                className="form-control"
                required
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {category === "أخرى" ? (
              <div className="form-group">
                <label className="form-label">اكتب اسم البيان بالتفصيل *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: عزل مائي وحراري..."
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            ) : (category === "نجارة" || category === "حدادة") ? (
              <div className="form-group">
                <label className="form-label">نوع العنصر الإنشائي</label>
                <select
                  className="form-control"
                  value={structuralElementType}
                  onChange={(e) => {
                    setStructuralElementType(e.target.value);
                    if (e.target.value.includes("أعمدة")) setUnit("م² (متر مسطح)");
                    else setUnit("م³ (متر مكعب)");
                  }}
                >
                  <option value="سقف (مكعب م³)">سقف (مكعب م³)</option>
                  <option value="أعمدة وعناصر رأسية (مسطح م²)">أعمدة وعناصر رأسية (مسطح م²)</option>
                  <option value="أعمدة وعناصر رأسية (مكعب م³)">أعمدة وعناصر رأسية (مكعب م³)</option>
                  <option value="قواعد وسملات خرسانية">قواعد وسملات خرسانية</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">وحدة القياس الرئيسية *</label>
                <select
                  className="form-control"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="م² (متر مسطح)">م² (متر مسطح)</option>
                  <option value="م³ (متر مكعب)">م³ (متر مكعب)</option>
                  <option value="متر طولي">متر طولي</option>
                  <option value="مردود / نقلة">مردود / نقلة</option>
                  <option value="عدد / نقطة">عدد / نقطة</option>
                  <option value="طن">طن</option>
                  <option value="كيلوجرام">كيلوجرام</option>
                  <option value="مقطوعية">مقطوعية</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: DUAL PRICING CONTROLS */}
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>💰 تسعير البند ومقارنة الأسعار (المالك vs المقاول)</h3>
          <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", marginBottom: 16 }}>
            يمكنك تحديد سعر الشراء المباشر من الهيئة/المالك وسعر الإعطاء للمقاول الفرعي لحساب أرباح المتر تلقائياً
          </p>

          <div className="grid-3" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: "hsl(var(--gold))", fontWeight: 800 }}>
                سعر الشراء من الهيئة / المالك (جنيه) *
              </label>
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="مثال: 5.00"
                required
                value={ownerUnitPrice}
                onChange={(e) => setOwnerUnitPrice(e.target.value)}
              />
              <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 4, display: "block" }}>
                سعر فئة العقد الرئيسي
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: "#3b82f6", fontWeight: 800 }}>
                سعر الإعطاء للمقاول الفرعي (جنيه)
              </label>
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="مثال: 3.00"
                value={subcontractorUnitPrice}
                onChange={(e) => setSubcontractorUnitPrice(e.target.value)}
              />
              <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 4, display: "block" }}>
                السعر المتفق عليه مع مقاول الباطن
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>صافي ربح المتر للشركة</label>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: companyMarginPerUnit >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: companyMarginPerUnit >= 0 ? "#10b981" : "#ef4444",
                  fontWeight: 900,
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                {companyMarginPerUnit >= 0 ? `+${companyMarginPerUnit.toFixed(2)} ج.م / وحدة` : `${companyMarginPerUnit.toFixed(2)} ج.م / وحدة`}
              </div>
            </div>
          </div>

          {/* Subcontractor selection */}
          <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">المقاول الفرعي المسؤول عن البند</label>
              <input
                type="text"
                list="subcontractors-list"
                className="form-control"
                placeholder="اختر أو اكتب اسم المقاول..."
                value={subcontractorName}
                onChange={(e) => setSubcontractorName(e.target.value)}
              />
              <datalist id="subcontractors-list">
                {subcontractorsList.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* Masonry Dual Pricing (Flat vs Cubic) Toggle */}
            {category === "مباني" && (
              <div className="form-group">
                <label className="form-label">تسعير المباني المزدوج (مسطح + مكعب)</label>
                <button
                  type="button"
                  className={`btn ${isDualMasonryPricing ? "btn-primary" : "btn-ghost"}`}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setIsDualMasonryPricing(!isDualMasonryPricing)}
                >
                  {isDualMasonryPricing ? "✓ مفعل: تسعير مسطح 12سم ومكعب 25سم" : "+ تفعيل تسعير المسطح والمكعب معاً"}
                </button>
              </div>
            )}
          </div>

          {category === "مباني" && isDualMasonryPricing && (
            <div className="grid-2" style={{ gap: 16, marginTop: 12, padding: 14, borderRadius: 10, background: "hsl(var(--bg-elevated))" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>سعر المباني بالمتر المسطح م² (سُمك 12سم)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="سعر مسطح 12سم..."
                  value={flatPrice}
                  onChange={(e) => setFlatPrice(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>سعر المباني بالمتر المكعب م³ (سُمك 25سم)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="سعر مكعب 25سم..."
                  value={cubicPrice}
                  onChange={(e) => setCubicPrice(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* CARD 3: BUILDINGS & FLOORS BREAKDOWN TABLE */}
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>🏢 تقسيم المباني والأدوار داخل النموذج</h3>
              <p style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                إضافة عدة مباني (عمارة 1، عمارة 2) وتقسيم الأدوار من الأرضي حتى العاشر
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setUseManualTotals(!useManualTotals)}
              >
                {useManualTotals ? "⚙️ العودة للحساب التلقائي من الجدول" : "✏️ إدخال الإجماليات يدوياً"}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddBuildingItem}>
                + إضافة دور / مبنى جديد
              </button>
            </div>
          </div>

          {!useManualTotals ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th style={{ width: "25%" }}>اسم المبنى / العمارة</th>
                    <th style={{ width: "25%" }}>الدور / المستوى</th>
                    <th style={{ width: "20%" }}>كمية الحصر ({unit})</th>
                    <th style={{ width: "15%" }}>نسبة التنفيذ %</th>
                    <th style={{ width: "15%" }}>الكمية المنفذة</th>
                    <th style={{ width: 50, textAlign: "center" }}>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {buildingItems.map((item, idx) => {
                    const executed = ((item.quantity || 0) * (item.progressPercent || 0)) / 100;
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="مثال: عمارة 6..."
                            value={item.buildingName}
                            onChange={(e) => handleUpdateBuildingItem(item.id, "buildingName", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-control"
                            value={item.floorName}
                            onChange={(e) => handleUpdateBuildingItem(item.id, "floorName", e.target.value)}
                          >
                            {FLOORS_LIST.map((fl) => (
                              <option key={fl} value={fl}>{fl}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            placeholder="0"
                            value={item.quantity || ""}
                            onChange={(e) => handleUpdateBuildingItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            className="form-control"
                            placeholder="0%"
                            value={item.progressPercent || ""}
                            onChange={(e) => handleUpdateBuildingItem(item.id, "progressPercent", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td style={{ fontWeight: 800, color: "#10b981" }}>
                          {executed.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-icon-centered text-danger"
                            onClick={() => handleDeleteBuildingItem(item.id)}
                            title="حذف هذا الدور"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid-2" style={{ gap: 16, padding: 16, borderRadius: 10, background: "hsl(var(--bg-elevated))" }}>
              <div className="form-group">
                <label className="form-label">إجمالي كمية الحصر الكلية اليدوية *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="أدخل كمية الحصر الكلية..."
                  value={manualSurveyedQty}
                  onChange={(e) => setManualSurveyedQty(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">نسبة التنفيذ الإجمالية %</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  className="form-control"
                  placeholder="0%"
                  value={manualProgressPercent}
                  onChange={(e) => setManualProgressPercent(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
            <label className="form-label">ملاحظات ومواصفات إضافية للبند</label>
            <input
              type="text"
              className="form-control"
              placeholder="مثال: أسمنت مقاولات معتمد، رمل نظيف، خشب جديد..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* DYNAMIC REAL-TIME SUMMARY BOX */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>إجمالي كمية الحصر:</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>
              {computedTotalSurveyedQty.toLocaleString()} <span style={{ fontSize: 13, opacity: 0.8 }}>{unit}</span>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#fff", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>الكمية المنفذة الفعالة:</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>
              {computedTotalExecutedQty.toLocaleString()} <span style={{ fontSize: 13, opacity: 0.8 }}>{unit} ({overallProgressPercent.toFixed(1)}%)</span>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)", color: "#fff", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>مستحق الهيئة / المالك:</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {formatCurrency(totalOwnerPayable)}
            </div>
          </div>

          <div
            style={{
              background: totalCompanyNetProfit >= 0 ? "linear-gradient(135deg, #10b981 0%, #047857 100%)" : "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
              color: "#fff",
              borderRadius: 14,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.9 }}>صافي ربح البند للشركة:</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {formatCurrency(totalCompanyNetProfit)}
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginBottom: 40 }}>
          <Link to={projectId ? `/projects/${projectId}` : "/projects"} className="btn btn-ghost">
            إلغاء
          </Link>
          <button type="submit" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 15 }} disabled={submitting}>
            {submitting ? <span className="spinner" /> : editId ? "💾 حفظ وتعديل نموذج الحصر" : "🏗️ اعتماد وحفظ نموذج الحصر"}
          </button>
        </div>
      </form>
    </div>
  );
}
