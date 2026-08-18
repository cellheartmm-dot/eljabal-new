import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Project {
  id: string;
  code: string;
  name: string;
}

export type TradeType =
  | "مباني"
  | "تشوين / رفع خامات"
  | "نجارة مسلحة"
  | "حدادة مسلحة"
  | "بياض محارة"
  | "دهانات"
  | "سيراميك وبلاط"
  | "عزل مائي وحراري"
  | "سباكة وصحي"
  | "كهرباء"
  | "أعمال ترابية / حفر وردم"
  | "أخرى";

export interface FloorItem {
  id: string;
  floorName: string;
  // Dual measurement quantities
  qtyFlat?: number;    // مسطح م² (أو عمدان م²)
  qtyCubic?: number;   // مكعب م³ (أو أسقف م³)
  qtySingle?: number;  // للوحدات الفردية
  progressPercent: number;
  notes?: string;
}

export interface BuildingData {
  buildingName: string;
  floors: FloorItem[];
}

const DEFAULT_FLOORS = [
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
  "الموقع العام والواجهات",
];

const TRADES_CONFIG: Record<
  TradeType,
  {
    icon: string;
    isDual: boolean;
    label1?: string;
    unit1?: string;
    label2?: string;
    unit2?: string;
    defaultUnits?: string[];
    description: string;
  }
> = {
  "مباني": {
    icon: "🧱",
    isDual: true,
    label1: "مسطح (قواطع 12 سم)",
    unit1: "م² مسطح",
    label2: "مكعب (حوائط 25 سم)",
    unit2: "م³ مكعب",
    description: "حصر المباني بالمتر المسطح (12سم) والمتر المكعب (25سم)",
  },
  "تشوين / رفع خامات": {
    icon: "🏗️",
    isDual: true,
    label1: "تشوين مسطح",
    unit1: "م² مسطح",
    label2: "تشوين مكعب",
    unit2: "م³ مكعب",
    description: "تشوين ورفع الخامات والأسمنت والرمل والطوب للأدوار",
  },
  "نجارة مسلحة": {
    icon: "🔨",
    isDual: true,
    label1: "نجارة عمدان وحوائط",
    unit1: "م² مسطح",
    label2: "نجارة أسقف وكمرات",
    unit2: "م³ مكعب",
    description: "نجارة العمدان بالمتر المربع والأسقف بالمتر المكعب",
  },
  "حدادة مسلحة": {
    icon: "⛓️",
    isDual: true,
    label1: "حدادة عمدان وقواعد",
    unit1: "م² مسطح",
    label2: "حدادة أسقف وكمرات",
    unit2: "م² مسطح (أو م³)",
    description: "حدادة العمدان بالمتر المسطح والأسقف بالمسطح/المكعب",
  },
  "بياض محارة": {
    icon: "🎨",
    isDual: false,
    defaultUnits: ["م² مسطح (داخلي/واجهات)", "م³ مكعب", "متر طولي (كرانيش/أوتار)", "مقطوعية"],
    description: "أعمال البياض والمحارة الداخلية والخارجية",
  },
  "دهانات": {
    icon: "🖌️",
    isDual: false,
    defaultUnits: ["م² مسطح (حوائط وأسقف)", "م² مسطح (واجهات)", "متر طولي", "مقطوعية"],
    description: "أعمال المعجون والبطانة والدهانات النهائية",
  },
  "سيراميك وبلاط": {
    icon: "⬜",
    isDual: false,
    defaultUnits: ["م² مسطح (أرضيات)", "م² مسطح (حوائط)", "متر طولي (وزرات)", "مقطوعية"],
    description: "تركيب الأرضيات والحوائط والسيراميك والبورسلين",
  },
  "عزل مائي وحراري": {
    icon: "🛡️",
    isDual: false,
    defaultUnits: ["م² مسطح", "متر طولي", "مقطوعية"],
    description: "عزل الحمامات والمطابخ والأسطح والقواعد",
  },
  "سباكة وصحي": {
    icon: "🚰",
    isDual: false,
    defaultUnits: ["عدد / نقطة", "شقة كاملة", "متر طولي", "مقطوعية"],
    description: "تأسيس وتشطيب شبكات التغذية والصرف الصحي",
  },
  "كهرباء": {
    icon: "⚡",
    isDual: false,
    defaultUnits: ["عدد / نقطة (مخرج)", "شقة كاملة", "متر طولي (مواسير/كابلات)", "مقطوعية"],
    description: "تأسيس وتمديد وتركيبات شبكة الكهرباء والإنارة",
  },
  "أعمال ترابية / حفر وردم": {
    icon: "🚜",
    isDual: false,
    defaultUnits: ["م³ مكعب", "ساعة عمل معدة", "نقلة / لودر", "مقطوعية"],
    description: "حفر وتطهير وردم ودك وتسوية الموقع العام",
  },
  "أخرى": {
    icon: "📋",
    isDual: false,
    defaultUnits: ["م² مسطح", "م³ مكعب", "متر طولي", "عدد / وحدة", "طن", "كجم", "مقطوعية"],
    description: "بنود وأعمال هندسية وموقعية مخصصة",
  },
};

export default function ProjectPhaseCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const preProjectId = searchParams.get("projectId") || "";
  const editId = searchParams.get("edit") || "";
  const cloneFromPhaseId = searchParams.get("cloneFromPhaseId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [subcontractorsList, setSubcontractorsList] = useState<string[]>([]);
  const [existingPhases, setExistingPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Computed unique models registered in this project
  const uniqueModelPhases = React.useMemo(() => {
    return Array.from(
      new Map(
        existingPhases
          .filter((p) => p.modelName && p.modelName.trim())
          .map((p) => [p.modelName.trim(), p])
      ).values()
    );
  }, [existingPhases]);

  // 1. Basic Project & Model Info
  const [projectId, setProjectId] = useState(preProjectId);
  const [modelName, setModelName] = useState("");
  const [trade, setTrade] = useState<TradeType>("مباني");
  const [customTradeName, setCustomTradeName] = useState("");


  // 2. Buildings Configuration
  // Model contains multiple buildings (e.g. عمارة 1, عمارة 2, عمارة 3)
  const [buildingNames, setBuildingNames] = useState<string[]>(["عمارة 1"]);
  const [newBuildingInput, setNewBuildingInput] = useState("");

  // Area Mode:
  // "UNIFIED": Model unified areas (apply to all buildings equally)
  // "CUSTOM": Per-building custom areas
  const [areaMode, setAreaMode] = useState<"UNIFIED" | "CUSTOM">("UNIFIED");
  const [selectedBuildingIndex, setSelectedBuildingIndex] = useState(0);

  // Unified Floors Table
  const [unifiedFloors, setUnifiedFloors] = useState<FloorItem[]>([
    { id: "fl-1", floorName: "الدور الأرضي", qtyFlat: 250, qtyCubic: 80, qtySingle: 300, progressPercent: 0 },
    { id: "fl-2", floorName: "الدور الأول", qtyFlat: 250, qtyCubic: 80, qtySingle: 300, progressPercent: 0 },
    { id: "fl-3", floorName: "الدور الثاني", qtyFlat: 250, qtyCubic: 80, qtySingle: 300, progressPercent: 0 },
  ]);

  // Per-Building Floors Table (when areaMode === "CUSTOM")
  const [customBuildings, setCustomBuildings] = useState<BuildingData[]>([
    {
      buildingName: "عمارة 1",
      floors: [
        { id: "cb-1", floorName: "الدور الأرضي", qtyFlat: 250, qtyCubic: 80, qtySingle: 300, progressPercent: 0 },
        { id: "cb-2", floorName: "الدور الأول", qtyFlat: 250, qtyCubic: 80, qtySingle: 300, progressPercent: 0 },
      ],
    },
  ]);

  // 3. Pricing & Measurement Units
  const [singleUnit, setSingleUnit] = useState("م² مسطح");
  const [ownerUnitPrice, setOwnerUnitPrice] = useState("");
  const [subcontractorUnitPrice, setSubcontractorUnitPrice] = useState("");

  // Dual Pricing (e.g. for Masonry flat vs cubic, or carpentry columns vs slabs)
  const [ownerUnitPrice2, setOwnerUnitPrice2] = useState("");
  const [subcontractorUnitPrice2, setSubcontractorUnitPrice2] = useState("");
  const [useSeparateDualPricing, setUseSeparateDualPricing] = useState(false);

  const [subcontractorName, setSubcontractorName] = useState("");
  const [notes, setNotes] = useState("");

  // Helper to clone from a phase object
  const applyPhaseData = (phaseData: any, isClone: boolean = false) => {
    if (!phaseData) return;
    setProjectId(phaseData.projectId || preProjectId);
    setModelName(phaseData.modelName || "");

    if (isClone) {
      // Suggest next trade
      if (phaseData.phaseName === "مباني") setTrade("حدادة مسلحة");
      else if (phaseData.phaseName === "حدادة مسلحة") setTrade("نجارة مسلحة");
      else if (phaseData.phaseName === "نجارة مسلحة") setTrade("تشوين / رفع خامات");
      else if (phaseData.phaseName === "تشوين / رفع خامات") setTrade("بياض محارة");
      else setTrade("دهانات");
      showToast(`تم استيراد بنايات وأدوار نموذج (${phaseData.modelName}) بنجاح ✅ يمكنك الآن إدخال كميات وأسعار المهنة الجديدة.`, "success");
    } else {
      const matchedTrade = Object.keys(TRADES_CONFIG).find((t) => t === phaseData.phaseName) as TradeType;
      if (matchedTrade) {
        setTrade(matchedTrade);
      } else {
        setTrade("أخرى");
        setCustomTradeName(phaseData.phaseName || "");
      }
      setSingleUnit(phaseData.unit || "م² مسطح");
      setOwnerUnitPrice(phaseData.unitPrice ? phaseData.unitPrice.toString() : "");
      setSubcontractorName(phaseData.subcontractorName || "");
    }

    if (phaseData.notes) {
      try {
        const parsed = JSON.parse(phaseData.notes);
        if (parsed.buildingNames && parsed.buildingNames.length > 0) {
          setBuildingNames(parsed.buildingNames);
        }
        if (parsed.areaMode) setAreaMode(parsed.areaMode);

        if (parsed.unifiedFloors && parsed.unifiedFloors.length > 0) {
          if (isClone) {
            // Keep floors AND pull all surveyed quantities/areas from the cloned model
            setUnifiedFloors(
              parsed.unifiedFloors.map((f: FloorItem) => ({
                id: "fl-" + Math.random().toString(36).substring(2, 9),
                floorName: f.floorName,
                qtyFlat: f.qtyFlat || 0,
                qtyCubic: f.qtyCubic || 0,
                qtySingle: f.qtySingle || f.qtyFlat || 0,
                progressPercent: 0,
                notes: f.notes || "",
              }))
            );
          } else {
            setUnifiedFloors(parsed.unifiedFloors);
          }
        }

        if (parsed.customBuildings && parsed.customBuildings.length > 0) {
          if (isClone) {
            // Pull all custom building floors and their exact quantities/areas
            setCustomBuildings(
              parsed.customBuildings.map((b: BuildingData) => ({
                buildingName: b.buildingName,
                floors: b.floors.map((f) => ({
                  id: "cb-" + Math.random().toString(36).substring(2, 9),
                  floorName: f.floorName,
                  qtyFlat: f.qtyFlat || 0,
                  qtyCubic: f.qtyCubic || 0,
                  qtySingle: f.qtySingle || f.qtyFlat || 0,
                  progressPercent: 0,
                  notes: f.notes || "",
                })),
              }))
            );
          } else {
            setCustomBuildings(parsed.customBuildings);
          }
        }


        if (!isClone) {
          if (parsed.subcontractorUnitPrice) setSubcontractorUnitPrice(parsed.subcontractorUnitPrice.toString());
          if (parsed.ownerUnitPrice2) setOwnerUnitPrice2(parsed.ownerUnitPrice2.toString());
          if (parsed.subcontractorUnitPrice2) setSubcontractorUnitPrice2(parsed.subcontractorUnitPrice2.toString());
          if (parsed.useSeparateDualPricing !== undefined) setUseSeparateDualPricing(parsed.useSeparateDualPricing);
          if (parsed.realNotes) setNotes(parsed.realNotes);
        }
      } catch (e) {
        if (!isClone) setNotes(phaseData.notes);
      }
    }
  };

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: projData } = await supabase
          .from("Project")
          .select("id, code, name")
          .order("name", { ascending: true });
        setProjects(projData || []);

        const { data: subData } = await supabase
          .from("Subcontractor")
          .select("name")
          .order("name", { ascending: true });
        if (subData) {
          setSubcontractorsList(subData.map((s) => s.name));
        }

        const activeProjId = preProjectId || projectId;
        if (activeProjId) {
          setProjectId(activeProjId);
          // Fetch existing phases for this project to allow cloning
          const { data: existingP } = await supabase
            .from("ProjectPhase")
            .select("*")
            .eq("projectId", activeProjId)
            .order("createdAt", { ascending: false });
          setExistingPhases(existingP || []);
        }

        // Clone Mode Parsing
        if (cloneFromPhaseId) {
          const { data: phaseData } = await supabase
            .from("ProjectPhase")
            .select("*")
            .eq("id", cloneFromPhaseId)
            .single();

          if (phaseData) {
            applyPhaseData(phaseData, true);
          }
        } else if (editId) {
          // Edit Mode Parsing
          const { data: phaseData } = await supabase
            .from("ProjectPhase")
            .select("*")
            .eq("id", editId)
            .single();

          if (phaseData) {
            applyPhaseData(phaseData, false);
          }
        }
      } catch (err: any) {
        showToast(err.message || "خطأ أثناء تحميل البيانات", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [editId, cloneFromPhaseId, preProjectId]);

  // Dynamic reload of existing phases when projectId changes
  useEffect(() => {
    if (projectId) {
      supabase
        .from("ProjectPhase")
        .select("*")
        .eq("projectId", projectId)
        .order("createdAt", { ascending: false })
        .then(({ data }) => {
          if (data) setExistingPhases(data);
        });
    }
  }, [projectId]);



  // Handle Trade Change
  const handleTradeChange = (newTrade: TradeType) => {
    setTrade(newTrade);
    const cfg = TRADES_CONFIG[newTrade];
    if (!cfg.isDual && cfg.defaultUnits && cfg.defaultUnits.length > 0) {
      setSingleUnit(cfg.defaultUnits[0]);
    }
  };

  // Building Management
  const handleAddBuilding = () => {
    const name = newBuildingInput.trim() || `عمارة ${buildingNames.length + 1}`;
    if (buildingNames.includes(name)) {
      showToast("اسم العمارة موجود بالفعل في هذا النموذج", "warning");
      return;
    }
    const updated = [...buildingNames, name];
    setBuildingNames(updated);
    setNewBuildingInput("");

    // Sync custom buildings list
    if (!customBuildings.find((b) => b.buildingName === name)) {
      setCustomBuildings([
        ...customBuildings,
        {
          buildingName: name,
          floors: unifiedFloors.map((f) => ({ ...f, id: "cb-" + Math.random().toString(36).substring(2, 9) })),
        },
      ]);
    }
    showToast(`تمت إضافة ${name} إلى النموذج ✅`, "success");
  };

  const handleRemoveBuilding = (nameToRemove: string) => {
    if (buildingNames.length === 1) {
      showToast("يجب أن يحتوي النموذج على بناية واحدة على الأقل", "warning");
      return;
    }
    const updated = buildingNames.filter((n) => n !== nameToRemove);
    setBuildingNames(updated);
    setCustomBuildings(customBuildings.filter((b) => b.buildingName !== nameToRemove));
    if (selectedBuildingIndex >= updated.length) {
      setSelectedBuildingIndex(0);
    }
  };

  // Floor Row Management for Unified Table
  const handleAddUnifiedFloor = () => {
    const lastFloor = unifiedFloors[unifiedFloors.length - 1];
    let nextName = "الدور المتكرر";
    if (lastFloor) {
      const idx = DEFAULT_FLOORS.indexOf(lastFloor.floorName);
      if (idx >= 0 && idx < DEFAULT_FLOORS.length - 1) {
        nextName = DEFAULT_FLOORS[idx + 1];
      }
    }
    setUnifiedFloors([
      ...unifiedFloors,
      {
        id: "fl-" + Date.now(),
        floorName: nextName,
        qtyFlat: 0,
        qtyCubic: 0,
        qtySingle: 0,
        progressPercent: 0,
      },
    ]);
  };

  const handleUpdateUnifiedFloor = (id: string, field: keyof FloorItem, value: any) => {
    setUnifiedFloors((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteUnifiedFloor = (id: string) => {
    if (unifiedFloors.length === 1) {
      showToast("يجب الإبقاء على دور واحد على الأقل", "warning");
      return;
    }
    setUnifiedFloors((prev) => prev.filter((item) => item.id !== id));
  };

  // Floor Row Management for Custom Per-Building Table
  const activeCustomBuilding = customBuildings[selectedBuildingIndex] || {
    buildingName: buildingNames[0] || "عمارة 1",
    floors: [],
  };

  const handleAddCustomFloor = () => {
    const bName = buildingNames[selectedBuildingIndex];
    setCustomBuildings((prev) =>
      prev.map((b, idx) => {
        if (idx === selectedBuildingIndex) {
          return {
            ...b,
            floors: [
              ...b.floors,
              {
                id: "cb-" + Date.now(),
                floorName: "الدور المتكرر",
                qtyFlat: 0,
                qtyCubic: 0,
                qtySingle: 0,
                progressPercent: 0,
              },
            ],
          };
        }
        return b;
      })
    );
  };

  const handleUpdateCustomFloor = (id: string, field: keyof FloorItem, value: any) => {
    setCustomBuildings((prev) =>
      prev.map((b, idx) => {
        if (idx === selectedBuildingIndex) {
          return {
            ...b,
            floors: b.floors.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
          };
        }
        return b;
      })
    );
  };

  const handleDeleteCustomFloor = (id: string) => {
    setCustomBuildings((prev) =>
      prev.map((b, idx) => {
        if (idx === selectedBuildingIndex) {
          if (b.floors.length === 1) {
            showToast("يجب الإبقاء على دور واحد على الأقل للعمارة", "warning");
            return b;
          }
          return {
            ...b,
            floors: b.floors.filter((f) => f.id !== id),
          };
        }
        return b;
      })
    );
  };

  // --- Dynamic Mathematical Calculations ---
  const currentConfig = TRADES_CONFIG[trade] || TRADES_CONFIG["أخرى"];
  const isDual = currentConfig.isDual;

  // Single Building Quantities (from unified model)
  const singleBuildingTotalQty1 = unifiedFloors.reduce((sum, f) => sum + (f.qtyFlat || 0), 0);
  const singleBuildingTotalQty2 = unifiedFloors.reduce((sum, f) => sum + (f.qtyCubic || 0), 0);
  const singleBuildingTotalSingleQty = unifiedFloors.reduce((sum, f) => sum + (f.qtySingle || 0), 0);

  // Total Surveyed & Executed Quantities across all buildings
  let totalModelSurveyedQty1 = 0;
  let totalModelSurveyedQty2 = 0;
  let totalModelSurveyedSingleQty = 0;

  let totalModelExecutedQty1 = 0;
  let totalModelExecutedQty2 = 0;
  let totalModelExecutedSingleQty = 0;

  const numBuildings = buildingNames.length;

  if (areaMode === "UNIFIED") {
    totalModelSurveyedQty1 = singleBuildingTotalQty1 * numBuildings;
    totalModelSurveyedQty2 = singleBuildingTotalQty2 * numBuildings;
    totalModelSurveyedSingleQty = singleBuildingTotalSingleQty * numBuildings;

    totalModelExecutedQty1 =
      unifiedFloors.reduce((sum, f) => sum + ((f.qtyFlat || 0) * (f.progressPercent || 0)) / 100, 0) * numBuildings;
    totalModelExecutedQty2 =
      unifiedFloors.reduce((sum, f) => sum + ((f.qtyCubic || 0) * (f.progressPercent || 0)) / 100, 0) * numBuildings;
    totalModelExecutedSingleQty =
      unifiedFloors.reduce((sum, f) => sum + ((f.qtySingle || 0) * (f.progressPercent || 0)) / 100, 0) * numBuildings;
  } else {
    customBuildings.forEach((b) => {
      b.floors.forEach((f) => {
        const p = (f.progressPercent || 0) / 100;
        totalModelSurveyedQty1 += f.qtyFlat || 0;
        totalModelSurveyedQty2 += f.qtyCubic || 0;
        totalModelSurveyedSingleQty += f.qtySingle || 0;

        totalModelExecutedQty1 += (f.qtyFlat || 0) * p;
        totalModelExecutedQty2 += (f.qtyCubic || 0) * p;
        totalModelExecutedSingleQty += (f.qtySingle || 0) * p;
      });
    });
  }

  // Financial calculations
  const pOwner1 = parseFloat(ownerUnitPrice) || 0;
  const pSub1 = parseFloat(subcontractorUnitPrice) || 0;
  const pOwner2 = useSeparateDualPricing ? parseFloat(ownerUnitPrice2) || 0 : pOwner1;
  const pSub2 = useSeparateDualPricing ? parseFloat(subcontractorUnitPrice2) || 0 : pSub1;

  let totalOwnerRevenue = 0;
  let totalSubcontractorExpense = 0;

  if (isDual) {
    totalOwnerRevenue = totalModelExecutedQty1 * pOwner1 + totalModelExecutedQty2 * pOwner2;
    totalSubcontractorExpense = totalModelExecutedQty1 * pSub1 + totalModelExecutedQty2 * pSub2;
  } else {
    totalOwnerRevenue = totalModelExecutedSingleQty * pOwner1;
    totalSubcontractorExpense = totalModelExecutedSingleQty * pSub1;
  }

  const totalCompanyProfit = totalOwnerRevenue - totalSubcontractorExpense;
  const unitProfitMargin1 = pOwner1 - pSub1;
  const unitProfitMargin2 = pOwner2 - pSub2;

  const totalSurveyedSum = isDual
    ? totalModelSurveyedQty1 + totalModelSurveyedQty2
    : totalModelSurveyedSingleQty;

  const totalExecutedSum = isDual
    ? totalModelExecutedQty1 + totalModelExecutedQty2
    : totalModelExecutedSingleQty;

  const overallProgress = totalSurveyedSum > 0 ? (totalExecutedSum / totalSurveyedSum) * 100 : 0;

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      showToast("يرجى اختيار المشروع أولاً", "warning");
      return;
    }

    const finalTradeName = trade === "أخرى" ? customTradeName : trade;
    if (!finalTradeName) {
      showToast("يرجى إدخال أو تحديد بيان البند", "warning");
      return;
    }

    setSubmitting(true);

    const extraMetadata = {
      trade,
      customTradeName,
      buildingNames,
      areaMode,
      unifiedFloors,
      customBuildings,
      isDual,
      subcontractorUnitPrice: pSub1,
      ownerUnitPrice2: pOwner2,
      subcontractorUnitPrice2: pSub2,
      useSeparateDualPricing,
      totalModelSurveyedQty1,
      totalModelSurveyedQty2,
      totalModelSurveyedSingleQty,
      totalOwnerRevenue,
      totalSubcontractorExpense,
      totalCompanyProfit,
      realNotes: notes,
    };

    const finalUnitDisplay = isDual
      ? `${currentConfig.unit1} + ${currentConfig.unit2}`
      : singleUnit;

    const payload = {
      projectId,
      modelName: modelName.trim() || `نموذج (${buildingNames.join("، ")})`,
      phaseName: finalTradeName,
      unit: finalUnitDisplay,
      unitPrice: pOwner1,
      totalSurveyedQty: totalSurveyedSum,
      progressPercent: overallProgress,
      executedQty: totalExecutedSum,
      subcontractorName: subcontractorName || null,
      notes: JSON.stringify(extraMetadata),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        const { error } = await supabase.from("ProjectPhase").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث وحفظ بيانات النموذج والبنايات بنجاح ✅", "success");
      } else {
        const newId = "phase-" + Date.now();
        const { error } = await supabase.from("ProjectPhase").insert([{ id: newId, ...payload }]);
        if (error) throw error;
        showToast("تم اعتماد وإضافة نموذج الحصر والبنايات بنجاح 🏗️✅", "success");
      }

      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 700);
    } catch (err: any) {
      // Fallback to localStorage
      const stored = localStorage.getItem(`phases_${projectId}`);
      let list = stored ? JSON.parse(stored) : [];
      if (editId) {
        list = list.map((p: any) => (p.id === editId ? { ...p, ...payload } : p));
      } else {
        list.push({ id: "phase-" + Date.now(), ...payload });
      }
      localStorage.setItem(`phases_${projectId}`, JSON.stringify(list));

      showToast("تم حفظ بيانات النموذج بنجاح ✅", "success");
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
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تحميل محرك حصر النماذج والبنايات...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">
            {editId ? "✏️ تعديل نموذج وحصر البنايات والأدوار" : "🏗️ إضافة نموذج حصر هندسي (بنايات وأدوار)"}
          </h1>
          <p className="page-subtitle">
            إدارة مساحات النماذج الموحدة، تخصيص مساحات البنايات، وحصر القياسات المزدوجة (مسطح ومكعب وعمدان وأسقف)
          </p>
        </div>
        <Link to={projectId ? `/projects/${projectId}` : "/projects"} className="btn btn-ghost">
          ← إلغاء والعودة للمشروع
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        {/* CARD 1: MODEL & BUILDINGS SETUP */}
        <div className="card" style={{ padding: 22, marginBottom: 20, border: "1px solid hsl(var(--border-subtle))" }}>
          {/* CLONE / IMPORT EXISTING MODEL BANNER */}
          {existingPhases.length > 0 && !editId && (
            <div
              style={{
                marginBottom: 18,
                padding: "14px 18px",
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>💡</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: "hsl(var(--text-primary))" }}>
                    إضافة مهنة جديدة (حدادة / نجارة / تشوين / محارة...) على نموذج موجود مسبقاً:
                  </div>
                  <div style={{ fontSize: 11.5, color: "hsl(var(--text-muted))", marginTop: 2 }}>
                    اختر أي نموذج مسجل لنسخ نفس العمارات والأدوار فوراً دون إعادة كتابتها:
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  className="form-control"
                  style={{ minWidth: 260, fontSize: 12.5, fontWeight: 700, borderColor: "#3b82f6" }}
                  defaultValue=""
                  onChange={(e) => {
                    const selected = existingPhases.find((p) => p.id === e.target.value);
                    if (selected) {
                      applyPhaseData(selected, true);
                    }
                  }}
                >
                  <option value="" disabled>-- 📋 اختر نموذج لنسخ عماراته وأدواره --</option>
                  {existingPhases.map((p) => {
                    let bCount = 1;
                    try {
                      const parsed = JSON.parse(p.notes || "{}");
                      if (parsed.buildingNames) bCount = parsed.buildingNames.length;
                    } catch (e) {}
                    return (
                      <option key={p.id} value={p.id}>
                        {p.modelName || "نموذج عام"} ({bCount} عمارات - بند {p.phaseName})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🏢</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>تكوين النموذج وقائمة البنايات (العمارات)</h3>
              <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: "2px 0 0" }}>
                النموذج يحتوي على مجموعة بنايات، يمكنك تطبيق مساحات موحدة للنموذج أو تخصيص كل بناية
              </p>
            </div>
          </div>


          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800 }}>
                  اسم النموذج (اختر نموذج مسجل أو اكتب جديد) *
                </label>
                {uniqueModelPhases.length > 0 && (
                  <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>
                    {uniqueModelPhases.length} نموذج مسجل بالمشروع
                  </span>
                )}
              </div>

              {uniqueModelPhases.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <select
                    className="form-control"
                    style={{
                      borderColor: "#3b82f6",
                      fontWeight: 800,
                      background: "hsl(var(--bg-elevated))",
                      fontSize: 13,
                    }}
                    value={
                      uniqueModelPhases.some((p) => p.modelName === modelName)
                        ? uniqueModelPhases.find((p) => p.modelName === modelName)?.id
                        : modelName
                        ? "__custom__"
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        setModelName("");
                      } else {
                        const selected = existingPhases.find((p) => p.id === val);
                        if (selected) {
                          applyPhaseData(selected, true);
                        }
                      }
                    }}
                  >
                    <option value="" disabled>-- 📋 اختر النموذج لتحديد العمارات والأدوار تلقائياً --</option>
                    {uniqueModelPhases.map((p) => {
                      let bCount = 1;
                      let bNamesList = "";
                      try {
                        const parsed = JSON.parse(p.notes || "{}");
                        if (parsed.buildingNames && parsed.buildingNames.length > 0) {
                          bCount = parsed.buildingNames.length;
                          bNamesList = ` (${parsed.buildingNames.slice(0, 3).join("، ")}${bCount > 3 ? "..." : ""})`;
                        }
                      } catch (e) {}
                      return (
                        <option key={p.id} value={p.id}>
                          🏢 نموذج {p.modelName} — [{bCount} عمارات{bNamesList}]
                        </option>
                      );
                    })}
                    <option value="__custom__">✍️ + كتابة اسم نموذج جديد يدوي...</option>
                  </select>

                  {/* Manual input if custom or editing */}
                  {(!uniqueModelPhases.some((p) => p.modelName === modelName) || modelName === "") && (
                    <input
                      type="text"
                      list="models-autocomplete"
                      className="form-control"
                      placeholder="اكتب اسم أو كود النموذج الجديد (مثال: نموذج V2، نموذج 014)..."
                      value={modelName}
                      onChange={(e) => {
                        const typed = e.target.value;
                        setModelName(typed);
                        const matched = existingPhases.find(
                          (p) => p.modelName && p.modelName.trim().toLowerCase() === typed.trim().toLowerCase()
                        );
                        if (matched) {
                          applyPhaseData(matched, true);
                        }
                      }}
                    />
                  )}
                  <datalist id="models-autocomplete">
                    {uniqueModelPhases.map((p) => (
                      <option key={p.id} value={p.modelName} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="أدخل كود أو اسم النموذج (مثال: نموذج V2، نموذج 014)..."
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              )}

              {modelName && (
                <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700, marginTop: 4 }}>
                  ✓ تم ربط {buildingNames.length} عمارات تلقائياً مع نموذج ({modelName})
                </div>
              )}
            </div>
          </div>


          {/* BUILDINGS CHIPS & ADDER */}
          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "hsl(var(--bg-elevated))", border: "1px dashed hsl(var(--border-subtle))" }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, display: "block" }}>
              🏛️ البنايات / العمارات التابعة لهذا النموذج ({buildingNames.length} بناية):
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
              {buildingNames.map((bName) => (
                <span
                  key={bName}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 20,
                    background: "hsl(var(--bg-card))",
                    border: "1px solid #3b82f660",
                    color: "hsl(var(--text-primary))",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  🏢 {bName}
                  <button
                    type="button"
                    onClick={() => handleRemoveBuilding(bName)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                    title="حذف هذه العمارة"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, maxWidth: 400 }}>
              <input
                type="text"
                className="form-control"
                placeholder="اسم العمارة (مثال: عمارة 15)..."
                value={newBuildingInput}
                onChange={(e) => setNewBuildingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddBuilding();
                  }
                }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddBuilding}>
                + إضافة بناية
              </button>
            </div>
          </div>

          {/* AREA MODE SELECTION: UNIFIED VS CUSTOM */}
          <div style={{ marginTop: 18 }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: 13 }}>
              📐 نظام تطبيق المساحات على البنايات:
            </label>
            <div className="grid-2" style={{ gap: 12 }}>
              <div
                onClick={() => setAreaMode("UNIFIED")}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${areaMode === "UNIFIED" ? "#10b981" : "hsl(var(--border-subtle))"}`,
                  background: areaMode === "UNIFIED" ? "rgba(16, 185, 129, 0.08)" : "hsl(var(--bg-elevated))",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: areaMode === "UNIFIED" ? "#10b981" : "inherit" }}>
                  <span>{areaMode === "UNIFIED" ? "🔘" : "⚪"}</span>
                  <span>مساحات موحدة للنموذج (تطبق على كل البنايات)</span>
                </div>
                <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: "6px 0 0 24px" }}>
                  يتم إدخال مساحات الأدوار مرة واحدة لنموذج العمارة وتتضاعف تلقائياً بعدد البنايات ({buildingNames.length} عمارة).
                </p>
              </div>

              <div
                onClick={() => setAreaMode("CUSTOM")}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${areaMode === "CUSTOM" ? "#3b82f6" : "hsl(var(--border-subtle))"}`,
                  background: areaMode === "CUSTOM" ? "rgba(59, 130, 246, 0.08)" : "hsl(var(--bg-elevated))",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: areaMode === "CUSTOM" ? "#3b82f6" : "inherit" }}>
                  <span>{areaMode === "CUSTOM" ? "🔘" : "⚪"}</span>
                  <span>مساحات مخصصة لكل بناية على حدة</span>
                </div>
                <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: "6px 0 0 24px" }}>
                  تحديد مساحات وأدوار مستقلة لكل عمارة على حدة لاختلاف التصميمات المعمارية بين البنايات.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: TRADE & MEASUREMENT UNITS */}
        <div className="card" style={{ padding: 22, marginBottom: 20, border: "1px solid hsl(var(--border-subtle))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🧱</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>تخصص البند ووحدات القياس الهندسية</h3>
              <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: "2px 0 0" }}>
                اختر نوع البند لتفعيل وحدات القياس المتطابقة (مسطح ومكعب للمباني والتشوين، عمدان وأسقف للنجارة والحدادة)
              </p>
            </div>
          </div>

          <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>
            {(Object.keys(TRADES_CONFIG) as TradeType[]).map((tKey) => {
              const cfg = TRADES_CONFIG[tKey];
              const isSelected = trade === tKey;
              return (
                <div
                  key={tKey}
                  onClick={() => handleTradeChange(tKey)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? "hsl(var(--gold))" : "hsl(var(--border-subtle))"}`,
                    background: isSelected ? "rgba(245, 158, 11, 0.1)" : "hsl(var(--bg-elevated))",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isSelected ? "hsl(var(--gold))" : "inherit" }}>
                      {tKey}
                    </div>
                    {cfg.isDual && (
                      <span className="badge badge-warning" style={{ fontSize: 10, padding: "2px 6px", marginTop: 2 }}>
                        قياس مزدوج ({cfg.unit1} + {cfg.unit2})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {trade === "أخرى" && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">اكتب اسم البيان بالتفصيل *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="مثال: أعمال لاندسكيب وبردورات..."
                value={customTradeName}
                onChange={(e) => setCustomTradeName(e.target.value)}
              />
            </div>
          )}

          {/* SINGLE UNIT SELECTOR IF NOT DUAL */}
          {!isDual && (
            <div className="form-group" style={{ maxWidth: 360, marginBottom: 0 }}>
              <label className="form-label">وحدة القياس المعتمدة للبند *</label>
              <select
                className="form-control"
                value={singleUnit}
                onChange={(e) => setSingleUnit(e.target.value)}
              >
                {currentConfig.defaultUnits?.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CARD 3: DUAL PRICING & SUBCONTRACTOR COMPARISON */}
        <div className="card" style={{ padding: 22, marginBottom: 20, border: "1px solid hsl(var(--border-subtle))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>💰 تسعير البند ومقارنة الأسعار (المالك vs المقاول الفرعي)</h3>
              <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: "2px 0 0" }}>
                تحديد سعر فئة الشراء من الهيئة وسعر الإعطاء لمقاول الباطن لحساب صافي أرباح الشركة تلقائياً
              </p>
            </div>

            {isDual && (
              <button
                type="button"
                className={`btn btn-sm ${useSeparateDualPricing ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setUseSeparateDualPricing(!useSeparateDualPricing)}
              >
                {useSeparateDualPricing
                  ? "✓ مفعل: تسعير منفصل لـ " + currentConfig.label1 + " و " + currentConfig.label2
                  : "+ تفعيل تسعير منفصل لكل من " + currentConfig.unit1 + " و " + currentConfig.unit2}
              </button>
            )}
          </div>

          {!isDual || !useSeparateDualPricing ? (
            <div className="grid-3" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: "hsl(var(--gold))", fontWeight: 800 }}>
                  سعر الشراء من الهيئة / المالك (جنيه) *
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  required
                  placeholder="مثال: 5.00"
                  value={ownerUnitPrice}
                  onChange={(e) => setOwnerUnitPrice(e.target.value)}
                />
                <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 3, display: "block" }}>
                  سعر العقد الرئيسي المعتمد
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#3b82f6", fontWeight: 800 }}>
                  سعر الإعطاء لمقاول الباطن (جنيه)
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="مثال: 3.00"
                  value={subcontractorUnitPrice}
                  onChange={(e) => setSubcontractorUnitPrice(e.target.value)}
                />
                <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 3, display: "block" }}>
                  سعر الاتفاق مع مقاول التنفيذ
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800 }}>صافي ربح الوحدة للشركة</label>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: unitProfitMargin1 >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: unitProfitMargin1 >= 0 ? "#10b981" : "#ef4444",
                    fontWeight: 900,
                    fontSize: 16,
                    textAlign: "center",
                  }}
                >
                  {unitProfitMargin1 >= 0 ? `+${unitProfitMargin1.toFixed(2)} ج.م / وحدة` : `${unitProfitMargin1.toFixed(2)} ج.م / وحدة`}
                </div>
              </div>
            </div>
          ) : (
            /* SEPARATE DUAL PRICING (e.g. Masonry flat vs cubic) */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Part 1: Flat / Columns */}
              <div style={{ padding: 14, borderRadius: 10, background: "hsl(var(--bg-elevated))" }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: "hsl(var(--gold))" }}>
                  1️⃣ تسعير {currentConfig.label1} ({currentConfig.unit1}):
                </div>
                <div className="grid-3" style={{ gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>سعر الهيئة / المالك ({currentConfig.unit1})</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      value={ownerUnitPrice}
                      onChange={(e) => setOwnerUnitPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>سعر مقاول الباطن ({currentConfig.unit1})</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      value={subcontractorUnitPrice}
                      onChange={(e) => setSubcontractorUnitPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>صافي ربح {currentConfig.unit1}</label>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: unitProfitMargin1 >= 0 ? "#10b98120" : "#ef444420", color: unitProfitMargin1 >= 0 ? "#10b981" : "#ef4444", fontWeight: 800, textAlign: "center" }}>
                      +{unitProfitMargin1.toFixed(2)} ج.م
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Cubic / Slabs */}
              <div style={{ padding: 14, borderRadius: 10, background: "hsl(var(--bg-elevated))" }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: "#3b82f6" }}>
                  2️⃣ تسعير {currentConfig.label2} ({currentConfig.unit2}):
                </div>
                <div className="grid-3" style={{ gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>سعر الهيئة / المالك ({currentConfig.unit2})</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      value={ownerUnitPrice2}
                      onChange={(e) => setOwnerUnitPrice2(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>سعر مقاول الباطن ({currentConfig.unit2})</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      value={subcontractorUnitPrice2}
                      onChange={(e) => setSubcontractorUnitPrice2(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>صافي ربح {currentConfig.unit2}</label>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: unitProfitMargin2 >= 0 ? "#10b98120" : "#ef444420", color: unitProfitMargin2 >= 0 ? "#10b981" : "#ef4444", fontWeight: 800, textAlign: "center" }}>
                      +{unitProfitMargin2.toFixed(2)} ج.م
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subcontractor selection */}
          <div className="form-group" style={{ marginTop: 14, marginBottom: 0 }}>
            <label className="form-label">المقاول الفرعي المسؤول عن التنفيذ</label>
            <input
              type="text"
              list="subcontractors-list"
              className="form-control"
              placeholder="اختر أو اكتب اسم مقاول الباطن..."
              value={subcontractorName}
              onChange={(e) => setSubcontractorName(e.target.value)}
            />
            <datalist id="subcontractors-list">
              {subcontractorsList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>

        {/* CARD 4: FLOORS BREAKDOWN TABLE */}
        <div className="card" style={{ padding: 22, marginBottom: 20, border: "1px solid hsl(var(--border-subtle))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                📊 جدول حصر الأدوار {areaMode === "UNIFIED" ? "(مساحات النموذج الموحدة)" : `(مساحات ${buildingNames[selectedBuildingIndex]})`}
              </h3>
              <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: "2px 0 0" }}>
                {areaMode === "UNIFIED"
                  ? `هذه المساحات تطبق تلقائياً على كل البنايات التابعة للنموذج (${buildingNames.length} عمارة)`
                  : `تخصيص المساحات بشكل مستقل لـ ${buildingNames[selectedBuildingIndex]}`}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={areaMode === "UNIFIED" ? handleAddUnifiedFloor : handleAddCustomFloor}
              >
                + إضافة دور جديد
              </button>
            </div>
          </div>

          {/* BUILDING TABS WHEN IN CUSTOM MODE */}
          {areaMode === "CUSTOM" && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 14, borderBottom: "1px solid hsl(var(--border-subtle))" }}>
              {buildingNames.map((bName, idx) => (
                <button
                  key={bName}
                  type="button"
                  onClick={() => setSelectedBuildingIndex(idx)}
                  className={`btn btn-sm ${selectedBuildingIndex === idx ? "btn-primary" : "btn-ghost"}`}
                >
                  🏢 {bName}
                </button>
              ))}
            </div>
          )}

          {/* THE TABLE */}
          <div className="table-container">
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th style={{ width: "24%" }}>الدور / المستوى</th>

                  {isDual ? (
                    <>
                      <th style={{ width: "20%" }}>
                        {currentConfig.label1} <span style={{ color: "hsl(var(--gold))" }}>({currentConfig.unit1})</span>
                      </th>
                      <th style={{ width: "20%" }}>
                        {currentConfig.label2} <span style={{ color: "#3b82f6" }}>({currentConfig.unit2})</span>
                      </th>
                    </>
                  ) : (
                    <th style={{ width: "35%" }}>
                      كمية الحصر <span style={{ color: "hsl(var(--gold))" }}>({singleUnit})</span>
                    </th>
                  )}

                  <th style={{ width: "16%", textAlign: "center" }}>نسبة الإنجاز %</th>
                  <th style={{ width: "16%" }}>الكمية المنفذة</th>
                  <th style={{ width: 45, textAlign: "center" }}>حذف</th>
                </tr>
              </thead>
              <tbody>
                {(areaMode === "UNIFIED" ? unifiedFloors : activeCustomBuilding.floors).map((fl, idx) => {
                  const p = (fl.progressPercent || 0) / 100;
                  const executed = isDual
                    ? ((fl.qtyFlat || 0) + (fl.qtyCubic || 0)) * p
                    : (fl.qtySingle || 0) * p;

                  return (
                    <tr key={fl.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <select
                          className="form-control"
                          value={fl.floorName}
                          onChange={(e) =>
                            areaMode === "UNIFIED"
                              ? handleUpdateUnifiedFloor(fl.id, "floorName", e.target.value)
                              : handleUpdateCustomFloor(fl.id, "floorName", e.target.value)
                          }
                        >
                          {DEFAULT_FLOORS.map((df) => (
                            <option key={df} value={df}>{df}</option>
                          ))}
                        </select>
                      </td>

                      {isDual ? (
                        <>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              placeholder="0"
                              value={fl.qtyFlat ?? ""}
                              onChange={(e) =>
                                areaMode === "UNIFIED"
                                  ? handleUpdateUnifiedFloor(fl.id, "qtyFlat", parseFloat(e.target.value) || 0)
                                  : handleUpdateCustomFloor(fl.id, "qtyFlat", parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control"
                              placeholder="0"
                              value={fl.qtyCubic ?? ""}
                              onChange={(e) =>
                                areaMode === "UNIFIED"
                                  ? handleUpdateUnifiedFloor(fl.id, "qtyCubic", parseFloat(e.target.value) || 0)
                                  : handleUpdateCustomFloor(fl.id, "qtyCubic", parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
                        </>
                      ) : (
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            placeholder="0"
                            value={fl.qtySingle ?? ""}
                            onChange={(e) =>
                              areaMode === "UNIFIED"
                                  ? handleUpdateUnifiedFloor(fl.id, "qtySingle", parseFloat(e.target.value) || 0)
                                  : handleUpdateCustomFloor(fl.id, "qtySingle", parseFloat(e.target.value) || 0)
                            }
                          />
                        </td>
                      )}

                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          className="form-control"
                          placeholder="0%"
                          style={{ textAlign: "center", fontWeight: 700 }}
                          value={fl.progressPercent || ""}
                          onChange={(e) =>
                            areaMode === "UNIFIED"
                              ? handleUpdateUnifiedFloor(fl.id, "progressPercent", parseFloat(e.target.value) || 0)
                              : handleUpdateCustomFloor(fl.id, "progressPercent", parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>

                      <td style={{ fontWeight: 800, color: "#10b981" }}>
                        {executed.toLocaleString()}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-icon-centered text-danger"
                          onClick={() =>
                            areaMode === "UNIFIED"
                              ? handleDeleteUnifiedFloor(fl.id)
                              : handleDeleteCustomFloor(fl.id)
                          }
                          title="حذف الدور"
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

          {/* Notes */}
          <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
            <label className="form-label">ملاحظات ومواصفات هندسية إضافية للبند</label>
            <input
              type="text"
              className="form-control"
              placeholder="مثال: أسمنت بورتلاندي معتمد، طوب أسمنتي مصمت، خشب جديد..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* REAL-TIME EXECUTIVE FINANCIAL & QUANTITY SUMMARY */}
        <div
          style={{
            background: "linear-gradient(145deg, hsl(var(--bg-elevated)) 0%, rgba(59, 130, 246, 0.08) 100%)",
            border: "1px solid #3b82f640",
            borderRadius: 16,
            padding: "20px 24px",
            marginBottom: 26,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>إجمالي حصر العمارة الواحدة</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "hsl(var(--text-primary))", marginTop: 3 }}>
              {isDual ? (
                <>
                  <div>{singleBuildingTotalQty1.toLocaleString()} <span style={{ fontSize: 11, color: "hsl(var(--gold))" }}>{currentConfig.unit1}</span></div>
                  <div>{singleBuildingTotalQty2.toLocaleString()} <span style={{ fontSize: 11, color: "#3b82f6" }}>{currentConfig.unit2}</span></div>
                </>
              ) : (
                <div>{singleBuildingTotalSingleQty.toLocaleString()} <span style={{ fontSize: 12, color: "hsl(var(--gold))" }}>{singleUnit}</span></div>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>إجمالي حصر النموذج ({numBuildings} عمارات)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#3b82f6", marginTop: 3 }}>
              {isDual ? (
                <>
                  <div>{totalModelSurveyedQty1.toLocaleString()} <span style={{ fontSize: 11 }}>{currentConfig.unit1}</span></div>
                  <div>{totalModelSurveyedQty2.toLocaleString()} <span style={{ fontSize: 11 }}>{currentConfig.unit2}</span></div>
                </>
              ) : (
                <div>{totalModelSurveyedSingleQty.toLocaleString()} <span style={{ fontSize: 12 }}>{singleUnit}</span></div>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>الكمية المنفذة الفعالة (نسبة {overallProgress.toFixed(1)}%)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#10b981", marginTop: 3 }}>
              {totalExecutedSum.toLocaleString()} <span style={{ fontSize: 12 }}>{isDual ? "إجمالي وحدات" : singleUnit}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>مستحقات المالك / الهيئة</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "hsl(var(--gold))", marginTop: 3 }}>
              {formatCurrency(totalOwnerRevenue)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>مستحقات مقاول الباطن</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#ef4444", marginTop: 3 }}>
              {formatCurrency(totalSubcontractorExpense)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>صافي أرباح الشركة من البند</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: totalCompanyProfit >= 0 ? "#10b981" : "#dc2626",
                marginTop: 3,
              }}
            >
              {formatCurrency(totalCompanyProfit)}
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Link to={projectId ? `/projects/${projectId}` : "/projects"} className="btn btn-ghost">
            إلغاء
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "12px 32px", fontSize: 15, fontWeight: 800 }}
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : editId ? "💾 حفظ وتعديل نموذج الحصر" : "🏗️ اعتماد وحفظ نموذج الحصر"}
          </button>
        </div>
      </form>
    </div>
  );
}
