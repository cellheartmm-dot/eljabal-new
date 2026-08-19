import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface InvestmentTermSheet {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  parties?: string; // الأطراف (البائع / المشتري)

  // 1. تفاصيل الأرض
  landArea: number; // مساحة الأرض م²
  meterPrice: number; // سعر المتر
  totalLandValue: number; // إجمالي قيمة الأرض
  overprice: number; // مقابل التنازل / الأوفر

  // 2. الهيكلة المالية
  downPaymentPercent: number; // الدفعة المقدمة %
  downPaymentAmount: number; // قيمة الدفعة المقدمة
  totalEntryCapital: number; // إجمالي رأس مال الدخول = المقدمة + الأوفر

  // 3. شروط الشراكة
  partnerPercent: number; // نسبة الشريك %
  partnerArea: number; // مساحة الشريك م²
  partnerCapitalShare: number; // حصة الشريك من رأس المال
  remainingYears: number; // الأقساط المتبقية (سنوات)
  completionPercent: number; // % دفعة الاستكمال
  completionAmount: number; // قيمة دفعة الاستكمال

  // 4. الملاحظات
  notes?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function InvestmentTermSheetsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [sheets, setSheets] = useState<InvestmentTermSheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InvestmentTermSheet | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeSheetForPrint, setActiveSheetForPrint] = useState<InvestmentTermSheet | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Form Fields (Exact Match with Image 2)
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [parties, setParties] = useState("");

  // 1. تفاصيل الأرض
  const [landArea, setLandArea] = useState<number | string>("");
  const [meterPrice, setMeterPrice] = useState<number | string>("");
  const [overprice, setOverprice] = useState<number | string>("");

  // 2. الهيكلة المالية
  const [downPaymentPercent, setDownPaymentPercent] = useState<number | string>(10);

  // 3. شروط الشراكة
  const [partnerPercent, setPartnerPercent] = useState<number | string>(50);
  const [remainingYears, setRemainingYears] = useState<number | string>(3);
  const [completionPercent, setCompletionPercent] = useState<number | string>(16.5);

  // 4. الملاحظات
  const [notes, setNotes] = useState("");

  // Company info for print
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات والاستثمار العقاري");
  const [companyPhone, setCompanyPhone] = useState("01120715027");
  const [companyLogo, setCompanyLogo] = useState("/logo.jpeg");

  // Dynamic Financial Calculations
  const numArea = parseFloat(landArea.toString()) || 0;
  const numMeterPrice = parseFloat(meterPrice.toString()) || 0;
  const numOverprice = parseFloat(overprice.toString()) || 0;
  const numDownPercent = parseFloat(downPaymentPercent.toString()) || 0;
  const numPartnerPercent = parseFloat(partnerPercent.toString()) || 0;
  const numCompletionPercent = parseFloat(completionPercent.toString()) || 0;

  // Calculated variables
  const calcTotalLandValue = numArea * numMeterPrice;
  const calcDownPaymentAmount = (calcTotalLandValue * numDownPercent) / 100;
  const calcTotalEntryCapital = calcDownPaymentAmount + numOverprice;
  const calcPartnerArea = (numArea * numPartnerPercent) / 100;
  const calcPartnerCapitalShare = (calcTotalEntryCapital * numPartnerPercent) / 100;
  const calcCompletionAmount = (calcTotalLandValue * numCompletionPercent) / 100;

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [settingsRes, projRes] = await Promise.all([
        supabase.from("Setting").select("*"),
        supabase.from("Project").select("id, name, code").order("name", { ascending: true }),
      ]);

      if (projRes.data) setProjects(projRes.data);

      if (settingsRes.data) {
        const nameS = settingsRes.data.find((s: any) => s.key === "companyName");
        const phoneS = settingsRes.data.find((s: any) => s.key === "phone");
        const logoS = settingsRes.data.find((s: any) => s.key === "companyLogo");
        if (nameS?.value) setCompanyName(nameS.value);
        if (phoneS?.value) setCompanyPhone(phoneS.value);
        if (logoS?.value) setCompanyLogo(logoS.value);

        const sheetSetting = settingsRes.data.find((s: any) => s.key === "investment_term_sheets" || s.key === "term_sheets");
        if (sheetSetting?.value) {
          try {
            const parsed = JSON.parse(sheetSetting.value);
            if (Array.isArray(parsed)) setSheets(parsed);
          } catch (e) {}
        } else {
          const localStored = localStorage.getItem("investment_term_sheets");
          if (localStored) setSheets(JSON.parse(localStored));
        }
      }
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل مذكرات الاستثمار", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const saveSheets = async (newList: InvestmentTermSheet[]) => {
    setSheets(newList);
    localStorage.setItem("investment_term_sheets", JSON.stringify(newList));

    try {
      await supabase.from("Setting").upsert({
        key: "investment_term_sheets",
        value: JSON.stringify(newList),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setTitle("");
    setProjectId("");
    setParties("");
    setLandArea("");
    setMeterPrice("");
    setOverprice("");
    setDownPaymentPercent(10);
    setPartnerPercent(50);
    setRemainingYears(3);
    setCompletionPercent(16.5);
    setNotes("");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item: InvestmentTermSheet) => {
    setEditingItem(item);
    setTitle(item.title || "");
    setProjectId(item.projectId || "");
    setParties(item.parties || "");
    setLandArea(item.landArea || "");
    setMeterPrice(item.meterPrice || "");
    setOverprice(item.overprice || "");
    setDownPaymentPercent(item.downPaymentPercent || 10);
    setPartnerPercent(item.partnerPercent || 50);
    setRemainingYears(item.remainingYears || 3);
    setCompletionPercent(item.completionPercent || 16.5);
    setNotes(item.notes || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("برجاء إدخال عنوان المذكرة", "warning");
      return;
    }

    const matchedProject = projects.find((p) => p.id === projectId);

    const sheetPayload: InvestmentTermSheet = {
      id: editingItem ? editingItem.id : "sheet-" + Date.now(),
      title: title.trim(),
      projectId: projectId || undefined,
      projectName: matchedProject ? matchedProject.name : undefined,
      parties: parties.trim(),
      landArea: numArea,
      meterPrice: numMeterPrice,
      totalLandValue: calcTotalLandValue,
      overprice: numOverprice,
      downPaymentPercent: numDownPercent,
      downPaymentAmount: calcDownPaymentAmount,
      totalEntryCapital: calcTotalEntryCapital,
      partnerPercent: numPartnerPercent,
      partnerArea: calcPartnerArea,
      partnerCapitalShare: calcPartnerCapitalShare,
      remainingYears: parseFloat(remainingYears.toString()) || 0,
      completionPercent: numCompletionPercent,
      completionAmount: calcCompletionAmount,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      let updated: InvestmentTermSheet[];
      if (editingItem) {
        updated = sheets.map((s) => (s.id === editingItem.id ? sheetPayload : s));
        showToast("تم تحديث مذكرة الاستثمار بنجاح 📈✅", "success");
      } else {
        updated = [sheetPayload, ...sheets];
        showToast("تم حفظ مذكرة الاستثمار الجديدة بنجاح 📈🎉", "success");
      }

      await saveSheets(updated);
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ مذكرة الاستثمار", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: InvestmentTermSheet) => {
    if (!confirm("هل أنت متأكد من حذف مذكرة الاستثمار (" + item.title + ")؟")) return;
    const updated = sheets.filter((s) => s.id !== item.id);
    await saveSheets(updated);
    showToast("تم حذف مذكرة الاستثمار بنجاح 🗑️", "success");
  };

  const handleOpenPrint = (item: InvestmentTermSheet) => {
    setActiveSheetForPrint(item);
    setShowPrintModal(true);
  };

  const filteredSheets = sheets.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      s.title.toLowerCase().includes(q) ||
      (s.projectName && s.projectName.toLowerCase().includes(q)) ||
      (s.parties && s.parties.toLowerCase().includes(q))
    );
  });

  // KPI Aggregates
  const totalMemorandums = sheets.length;
  const totalAreaSum = sheets.reduce((acc, curr) => acc + (curr.landArea || 0), 0);
  const totalInvestmentsSum = sheets.reduce((acc, curr) => acc + (curr.totalLandValue || 0), 0);
  const totalEntryCapitalsSum = sheets.reduce((acc, curr) => acc + (curr.totalEntryCapital || 0), 0);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>📈</span>
            <span>مذكرات الاستثمار ودراسات جدوى الأراضي والشراكات</span>
          </h1>
          <p className="page-subtitle">
            سجل صياغة مذكرات شروط الاستثمار، حساب رأس مال الدخول، حصص الشركاء، وجدولة الأقساط والدفعات
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>➕</span>
            <span>+ مذكرة استثمار جديدة</span>
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
        {/* CARD 1: BLUE (TOTAL MEMORANDUMS) */}
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
                📈 مذكرات الاستثمار
              </span>
              <div style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 800, marginTop: 8 }}>
                إجمالي الفرص والدراسات
              </div>
            </div>
            <span style={{ fontSize: 26 }}>📑</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1d4ed8", marginTop: 10 }}>
            {totalMemorandums} مذكرة
          </div>
          <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>
            شروط وشراكات استثمارية
          </div>
        </div>

        {/* CARD 2: GREEN (TOTAL LAND AREAS) */}
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
                🗺️ إجمالي مساحات الأراضي
              </span>
              <div style={{ fontSize: 13, color: "#14532d", fontWeight: 800, marginTop: 8 }}>
                المساحة الإجمالية بالمتر المربع
              </div>
            </div>
            <span style={{ fontSize: 26 }}>📐</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#15803d", marginTop: 10 }}>
            {totalAreaSum.toLocaleString()} م²
          </div>
          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 800, marginTop: 4 }}>
            موزعة على الأراضي والمشاريع
          </div>
        </div>

        {/* CARD 3: AMBER (TOTAL LAND VALUES) */}
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
                💰 إجمالي قيمة الأراضي
              </span>
              <div style={{ fontSize: 13, color: "#78350f", fontWeight: 800, marginTop: 8 }}>
                قيمة الأصول والاستثمارات
              </div>
            </div>
            <span style={{ fontSize: 26 }}>🏛️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#b45309", marginTop: 10 }}>
            {formatCurrency(totalInvestmentsSum)}
          </div>
          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
            القيمة السوقية والتعاقدية
          </div>
        </div>

        {/* CARD 4: PURPLE (TOTAL ENTRY CAPITAL) */}
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
                🤝 إجمالي رؤوس أموال الدخول
              </span>
              <div style={{ fontSize: 13, color: "#4c1d95", fontWeight: 800, marginTop: 8 }}>
                (المقدمات + الأوفر والتنازل)
              </div>
            </div>
            <span style={{ fontSize: 26 }}>💼</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#6d28d9", marginTop: 10 }}>
            {formatCurrency(totalEntryCapitalsSum)}
          </div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, marginTop: 4 }}>
            السيولة المطلوبة لبدء المشروعات
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 بحث بعنوان المذكرة، المشروع، أو أسماء الأطراف (البائع / المشتري)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* MAIN TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل مذكرات الاستثمار...</div>
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span style={{ fontSize: 40 }}>📈</span>
              <div className="empty-state-text" style={{ marginTop: 12, fontWeight: 800 }}>
                {searchTerm ? "لا توجد نتائج تطابق البحث" : "لم يتم تسجيل أي مذكرات استثمار وشروط بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleOpenAdd}>
                + إنشاء أول مذكرة استثمار الآن
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>عنوان المذكرة</th>
                  <th>المشروع المسند</th>
                  <th>الأطراف (البائع / المشتري)</th>
                  <th>مساحة الأرض (م²)</th>
                  <th>سعر المتر</th>
                  <th>إجمالي قيمة الأرض</th>
                  <th>رأس مال الدخول (المقدم + الأوفر)</th>
                  <th>نسبة وحصة الشريك</th>
                  <th>الأقساط المتبقية</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 160 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSheets.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 900, color: "#1e3a8a", fontSize: 14 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>تاريخ الإدراج: {formatDateShort(item.createdAt)}</div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {item.projectName || "بدون مشروع"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.parties || "-"}</td>
                    <td style={{ fontWeight: 800 }}>{item.landArea ? item.landArea.toLocaleString() + " م²" : "-"}</td>
                    <td>{item.meterPrice ? formatCurrency(item.meterPrice) : "-"}</td>
                    <td style={{ fontWeight: 900, color: "#1d4ed8" }}>{formatCurrency(item.totalLandValue || 0)}</td>
                    <td>
                      <span style={{ fontWeight: 900, color: "#92400e", background: "#fef3c7", padding: "3px 8px", borderRadius: 6, border: "1px solid #fde68a" }}>
                        {formatCurrency(item.totalEntryCapital || 0)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: "#166534" }}>{item.partnerPercent || 0}%</div>
                      <div style={{ fontSize: 11, color: "#15803d" }}>حصة الشريك: {formatCurrency(item.partnerCapitalShare || 0)}</div>
                    </td>
                    <td>
                      <span className="badge badge-ghost" style={{ fontWeight: 700 }}>
                        {item.remainingYears ? item.remainingYears + " سنوات" : "-"}
                      </span>
                    </td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>
                        {/* Print */}
                        <button
                          onClick={() => handleOpenPrint(item)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 8px", fontSize: 11, fontWeight: 700 }}
                          title="طباعة مذكرة الاستثمار ودراسة الجدوى"
                        >
                          🖨️ طباعة
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="btn-icon-centered"
                          title="تعديل المذكرة"
                        >
                          ✏️
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item)}
                          className="btn-icon-centered text-danger"
                          title="حذف المذكرة"
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

      {/* ========================================================================= */}
      {/* EXACT MATCH MODAL: مذكرة استثمار جديدة (Image 2 Design) */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
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
              maxWidth: 1050,
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
                onClick={() => setShowModal(false)}
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
                <span>📈</span>
                <span>{editingItem ? "تعديل مذكرة الاستثمار" : "مذكرة استثمار جديدة"}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
              {/* 1. عنوان المذكرة */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>
                  عنوان المذكرة *
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: مذكرة شروط - حدائق العاصمة V3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ borderRadius: 6, fontWeight: 700 }}
                />
              </div>

              {/* 2. المشروع والأطراف */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>
                    المشروع (اختياري)
                  </label>
                  <select
                    className="form-control"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    style={{ borderRadius: 6 }}
                  >
                    <option value="">-- بدون مشروع --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>
                    الأطراف (البائع / المشتري)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أسماء الأطراف..."
                    value={parties}
                    onChange={(e) => setParties(e.target.value)}
                    style={{ borderRadius: 6 }}
                  />
                </div>
              </div>

              {/* SECTION 1: تفاصيل الأرض */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#2563eb", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span>🗺️</span>
                  <span>تفاصيل الأرض</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>مساحة الأرض (م²) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={landArea}
                      onChange={(e) => setLandArea(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>سعر المتر (جنيه)</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      value={meterPrice}
                      onChange={(e) => setMeterPrice(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>إجمالي قيمة الأرض</label>
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 14,
                        textAlign: "center",
                        color: "#1d4ed8",
                      }}
                    >
                      {calcTotalLandValue > 0 ? formatCurrency(calcTotalLandValue) : "0.00 ج.م"}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>مقابل التنازل / الأوفر</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      value={overprice}
                      onChange={(e) => setOverprice(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: الهيكلة المالية */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#d97706", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span>💰</span>
                  <span>الهيكلة المالية</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "flex-end" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>الدفعة المقدمة %</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="10"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>قيمة الدفعة المقدمة</label>
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 14,
                        textAlign: "center",
                        color: "#0f172a",
                      }}
                    >
                      {calcDownPaymentAmount > 0 ? formatCurrency(calcDownPaymentAmount) : "0.00 ج.م"}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#92400e" }}>
                      إجمالي رأس مال الدخول
                    </label>
                    <div
                      style={{
                        background: "#facc15",
                        color: "#000000",
                        fontWeight: 900,
                        fontSize: 15,
                        padding: "8px 12px",
                        borderRadius: 6,
                        textAlign: "center",
                        border: "1px solid #eab308",
                      }}
                    >
                      {calcTotalEntryCapital > 0 ? formatCurrency(calcTotalEntryCapital) : "0.00 ج.م"}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, color: "#64748b" }}>= الدفعة المقدمة + الأوفر</label>
                    <input
                      type="text"
                      className="form-control"
                      disabled
                      value="يُحسب تلقائياً"
                      style={{ textAlign: "center", background: "#f8fafc", color: "#64748b" }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: شروط الشراكة */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#166534", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span>🤝</span>
                  <span>شروط الشراكة</span>
                </div>

                {/* ROW 1: نسبة الشريك، مساحة الشريك، حصة الشريك، الأقساط */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12, alignItems: "flex-end" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>نسبة الشريك %</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="50"
                      value={partnerPercent}
                      onChange={(e) => setPartnerPercent(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>مساحة الشريك (م²)</label>
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 14,
                        textAlign: "center",
                        color: "#0f172a",
                      }}
                    >
                      {calcPartnerArea > 0 ? calcPartnerArea.toLocaleString() + " م²" : "0.00 م²"}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "#14532d" }}>
                      حصة الشريك من رأس المال
                    </label>
                    <div
                      style={{
                        background: "#166534",
                        color: "#ffffff",
                        fontWeight: 900,
                        fontSize: 15,
                        padding: "8px 12px",
                        borderRadius: 6,
                        textAlign: "center",
                      }}
                    >
                      {calcPartnerCapitalShare > 0 ? formatCurrency(calcPartnerCapitalShare) : "0.00 ج.م"}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>الأقساط المتبقية (سنوات)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      placeholder="3"
                      value={remainingYears}
                      onChange={(e) => setRemainingYears(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>
                </div>

                {/* ROW 2: % دفعة الاستكمال وقيمة دفعة الاستكمال */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>% دفعة الاستكمال</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="16.5"
                      value={completionPercent}
                      onChange={(e) => setCompletionPercent(e.target.value)}
                      style={{ textAlign: "center", fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>قيمة دفعة الاستكمال</label>
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 14,
                        textAlign: "center",
                        color: "#1d4ed8",
                      }}
                    >
                      {calcCompletionAmount > 0 ? formatCurrency(calcCompletionAmount) : "0.00 ج.م"}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ملاحظات إضافية */}
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>
                  ملاحظات إضافية
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="أي شروط أو بنود إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ borderRadius: 6 }}
                />
              </div>

              {/* FOOTER ACTIONS (LEFT ALIGNED) */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={submitting}
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
                  {submitting ? <span className="spinner" /> : (
                    <>
                      <span>💾</span>
                      <span>حفظ المذكرة</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
      {/* 2. PRINT INVESTMENT MEMORANDUM MODAL */}
      {/* ========================================================================= */}
      {showPrintModal && activeSheetForPrint && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880, background: "#ffffff" }}>
            <div className="modal-header no-print" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <h2 className="modal-title" style={{ color: "#0f172a" }}>🖨️ طباعة مذكرة شروط الاستثمار والشراكة</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ fontWeight: 800 }}>
                  🖨️ طباعة المذكرة
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPrintModal(false)}>✕</button>
              </div>
            </div>

            <div className="modal-body print-area" ref={printRef} style={{ color: "#000000", background: "#ffffff", padding: "28px 32px" }}>
              {/* PRINT HEADER */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double #000", paddingBottom: 14, marginBottom: 18 }}>
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#000" }}>{companyName}</h1>
                  <div style={{ fontSize: 12, marginTop: 4, color: "#333" }}>للمقاولات العامة والاستثمار والتطوير العقاري</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: "#555" }}>هاتف: {companyPhone}</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <img
                    src={companyLogo}
                    alt="Logo"
                    style={{ height: 55, width: 55, objectFit: "contain", borderRadius: 8 }}
                    onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                  />
                  <div style={{ fontSize: 15, fontWeight: 900, marginTop: 4 }}>مذكرة شروط واستثمار عقاري</div>
                </div>

                <div style={{ textAlign: "left", fontSize: 11, color: "#333" }}>
                  <div><strong>تاريخ التحرير:</strong> {formatDateShort(activeSheetForPrint.createdAt)}</div>
                  <div><strong>المشروع:</strong> {activeSheetForPrint.projectName || "مشروع عام"}</div>
                  <div><strong>الأطراف:</strong> {activeSheetForPrint.parties || "-"}</div>
                </div>
              </div>

              {/* TITLE */}
              <div style={{ textAlign: "center", background: "#f8fafc", border: "1px solid #000", borderRadius: 6, padding: "10px 14px", marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{activeSheetForPrint.title}</h2>
              </div>

              {/* 1. تفاصيل الأرض */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 900, borderBottom: "1.5px solid #000", paddingBottom: 4, marginBottom: 8 }}>
                  🗺️ أولاً: بيانات وتفاصيل الأرض
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", textAlign: "center", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: 8 }}>مساحة الأرض (م²)</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>سعر المتر المربع</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>إجمالي قيمة الأرض</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>مقابل التنازل / الأوفر</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 800 }}>{activeSheetForPrint.landArea?.toLocaleString()} م²</td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>{formatCurrency(activeSheetForPrint.meterPrice || 0)}</td>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 900, color: "#1d4ed8" }}>{formatCurrency(activeSheetForPrint.totalLandValue || 0)}</td>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 800 }}>{formatCurrency(activeSheetForPrint.overprice || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. الهيكلة المالية ورأس مال الدخول */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 900, borderBottom: "1.5px solid #000", paddingBottom: 4, marginBottom: 8 }}>
                  💰 ثانياً: الهيكلة المالية ورأس مال الدخول
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", textAlign: "center", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: 8 }}>نسبة الدفعة المقدمة</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>قيمة الدفعة المقدمة</th>
                      <th style={{ border: "1px solid #000", padding: 8, background: "#fef3c7" }}>إجمالي رأس مال الدخول (المقدم + الأوفر)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 800 }}>{activeSheetForPrint.downPaymentPercent}%</td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>{formatCurrency(activeSheetForPrint.downPaymentAmount || 0)}</td>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 900, fontSize: 13, background: "#fef3c7" }}>
                        {formatCurrency(activeSheetForPrint.totalEntryCapital || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. شروط الشراكة والدفعات */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 900, borderBottom: "1.5px solid #000", paddingBottom: 4, marginBottom: 8 }}>
                  🤝 ثالثاً: شروط الشراكة وحصص رأس المال
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", textAlign: "center", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: 8 }}>نسبة الشريك %</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>مساحة الشريك (م²)</th>
                      <th style={{ border: "1px solid #000", padding: 8, background: "#dcfce7" }}>حصة الشريك من رأس المال</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>الأقساط المتبقية</th>
                      <th style={{ border: "1px solid #000", padding: 8 }}>دفعة الاستكمال ({activeSheetForPrint.completionPercent}%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 800 }}>{activeSheetForPrint.partnerPercent}%</td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>{activeSheetForPrint.partnerArea?.toLocaleString()} م²</td>
                      <td style={{ border: "1px solid #000", padding: 8, fontWeight: 900, fontSize: 13, background: "#dcfce7" }}>
                        {formatCurrency(activeSheetForPrint.partnerCapitalShare || 0)}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>{activeSheetForPrint.remainingYears} سنوات</td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>{formatCurrency(activeSheetForPrint.completionAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. شروط وبنود إضافية */}
              {activeSheetForPrint.notes && (
                <div style={{ border: "1px solid #000", borderRadius: 6, padding: 12, marginBottom: 25, fontSize: 12, lineHeight: 1.8 }}>
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>📋 شروط وبنود وملاحظات إضافية:</div>
                  <div>{activeSheetForPrint.notes}</div>
                </div>
              )}

              {/* SIGNATURES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center", marginTop: 40, borderTop: "1px dashed #94a3b8", paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>الطرف الأول (الشركة / المطور)</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>الطرف الثاني (الشريك / المستثمر)</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>اعتماد الإدارة والاستثمار</div>
                  <div style={{ height: 40 }}></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>الختم والتوقيع: .....................</div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPrintModal(false)}>إغلاق</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة المذكرة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
