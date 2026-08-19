import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

// Standard Items Pre-built Library
const STANDARD_ITEMS_LIBRARY = [
  // 1. أعمال المباني (قسم 042000)
  {
    category: "أعمال المباني",
    code: "أ-1",
    desc: "توريد وعمل مباني من الطوب الأسمنتي المصمت لزوم حوائط قصية الردم - بسمك 12 سم",
    unit: "م²",
    price: 370,
  },
  {
    category: "أعمال المباني",
    code: "ب-1",
    desc: "توريد وعمل مباني من الطوب الأسمنتي المصمت لزوم حوائط قصية الردم - بسمك 25 سم أو أكثر",
    unit: "م³",
    price: 2700,
  },
  {
    category: "أعمال المباني",
    code: "أ-2",
    desc: "توريد وعمل مباني من الطوب الطفلي المفرغ لزوم الحوائط والواجهات - بسمك 12 سم",
    unit: "م²",
    price: 360,
  },
  {
    category: "أعمال المباني",
    code: "ب-2",
    desc: "توريد وعمل مباني من الطوب الطفلي المفرغ لزوم الحوائط والواجهات - بسمك 25 سم أو أكثر",
    unit: "م³",
    price: 2700,
  },
  {
    category: "أعمال المباني",
    code: "أ-3",
    desc: "مباني طوب أسمنتي مصمت لزوم الحمامات والمطابخ (ارتفاع 1.25م) والدراوي - بسمك 12 سم",
    unit: "م²",
    price: 370,
  },
  {
    category: "أعمال المباني",
    code: "ب-3",
    desc: "مباني طوب أسمنتي مصمت لزوم الحمامات والمطابخ (ارتفاع 1.25م) والدراوي - بسمك 25 سم أو أكثر",
    unit: "م³",
    price: 2700,
  },
  {
    category: "أعمال المباني",
    code: "أ-4",
    desc: "مباني مفرغة (Cavity Wall) حائطين طوب طفلي مفرغ - بسمك كلي 40 سم (شامل الحائطين)",
    unit: "م²",
    price: 720,
  },
  {
    category: "أعمال المباني",
    code: "ب-4",
    desc: "مباني مفرغة (Cavity Wall) حائطين طوب طفلي مفرغ - بسمك كلي 50 سم (شامل الحائطين)",
    unit: "م²",
    price: 720,
  },
  {
    category: "أعمال المباني",
    code: "ج-4",
    desc: "مباني مفرغة (Cavity Wall) حائطين طوب طفلي مفرغ - بسمك كلي 60 سم (شامل الحائطين)",
    unit: "م²",
    price: 720,
  },
  {
    category: "أعمال المباني",
    code: "5",
    desc: "مباني مفرغة (Cavity Wall) حائطين أسمنتي مصمت عازل حريق 120 دقيقة - 37 سم (شامل الحائطين)",
    unit: "م²",
    price: 740,
  },
  {
    category: "أعمال المباني",
    code: "6",
    desc: "مباني طوب طفلي مثقب بسمك 25 سم مقاومة للحريق لمدة 60 دقيقة",
    unit: "م³",
    price: 2700,
  },
  {
    category: "أعمال المباني",
    code: "7",
    desc: "مباني طوب أسمنتي مصمت بسمك 25 سم مقاومة للحريق حتى 120 دقيقة",
    unit: "م³",
    price: 2700,
  },
  {
    category: "أعمال المباني",
    code: "8",
    desc: "مباني طوب أسمنتي مصمت بسمك 12 سم مقاومة للحريق حتى 120 دقيقة",
    unit: "م²",
    price: 370,
  },

  // 2. أعمال التشطيبات والبياض (قسم 092400)
  {
    category: "أعمال التشطيبات والبياض",
    code: "1",
    desc: "بالمتر المسطح توريد وعمل بياض أسمنتي بسمك 2 سم لزوم الحوائط الداخلية",
    unit: "م²",
    price: 250,
  },
  {
    category: "أعمال التشطيبات والبياض",
    code: "2",
    desc: "بالمتر المسطح توريد وعمل بياض أسمنتي بسمك 1.5 سم للأسقف الداخلية وبطنيات السلالم",
    unit: "م²",
    price: 250,
  },
  {
    category: "أعمال التشطيبات والبياض",
    code: "3",
    desc: "بالمتر المسطح توريد وعمل بياض أسمنتي سمك 2 سم واجهات (شامل السقالة 380 + 55)",
    unit: "م²",
    price: 435,
  },
  {
    category: "أعمال التشطيبات والبياض",
    code: "4",
    desc: "بالمتر المسطح ضهارة ملونة (دراي مكس / سافيتو) 2 مم واجهات (شامل السقالة 380 + 55)",
    unit: "م²",
    price: 435,
  },

  // 3. أعمال الحفر والخرسانات
  {
    category: "أعمال الخرسانات والحفر",
    code: "خ-1",
    desc: "حفر في جميع أنواع التربة لزوم الأساسات وقصية الردم بالمتر المكعب",
    unit: "م³",
    price: 85,
  },
  {
    category: "أعمال الخرسانات والحفر",
    code: "خ-2",
    desc: "خرسانة عادية لزوم الفرشات والقواعد العادية سمك 20/30 سم",
    unit: "م³",
    price: 1850,
  },
  {
    category: "أعمال الخرسانات والحفر",
    code: "خ-3",
    desc: "خرسانة مسلحة لزوم القواعد المسلحة والسملات شامل حديد التسليح والمصنعيات",
    unit: "م³",
    price: 5900,
  },
  {
    category: "أعمال الخرسانات والحفر",
    code: "خ-4",
    desc: "خرسانة مسلحة لزوم الأعمدة وحوائط القص شامل حديد التسليح والنجارة",
    unit: "م³",
    price: 6400,
  },
  {
    category: "أعمال الخرسانات والحفر",
    code: "خ-5",
    desc: "خرسانة مسلحة لزوم الأسقف والكمرات (Flat / Solid Slab) شامل النجارة والحديد",
    unit: "م³",
    price: 6100,
  },
];

interface QuotationItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  totalPrice: number;
}

interface QuotationSection {
  id: string;
  sectionTitle: string; // e.g. الباب رقم (4) - أعمال المباني (قسم 042000)
  sectionNotes: string; // e.g. ملاحظات هامة للباب رقم (4): تشمل الأعتاب والكانات المجلفنة واشتراطات المصانع المعتمدة.
  items: QuotationItem[];
}

interface PriceQuotation {
  id: string;
  quotationNumber: string;
  title: string;
  clientName: string; // المالك / العميل
  projectName: string; // المشروع
  consultantName: string; // الاستشاري
  date: string; // التاريخ
  issueNumber: string; // رقم الإصدار (3)
  documentType: string; // جدول مقايسة بنود الأعمال المسعرة (Priced BOQ)
  sections: QuotationSection[];
  notes?: string;
  createdAt: string;
}

export default function PriceQuotationsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [quotations, setQuotations] = useState<PriceQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceQuotation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Print Preview Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeQuotationForPrint, setActiveQuotationForPrint] = useState<PriceQuotation | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [quotationNumber, setQuotationNumber] = useState("BOQ-001");
  const [title, setTitle] = useState("جدول مقايسة بنود الأعمال المسعرة (Priced BOQ)");
  const [clientName, setClientName] = useState("المخابرات العامة");
  const [projectName, setProjectName] = useState("المنصورة 6 - المسجد");
  const [consultantName, setConsultantName] = useState("صبور (SABBOUR)");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [issueNumber, setIssueNumber] = useState("إصدار : ( 3 )");
  const [notes, setNotes] = useState("");

  // Sections State
  const [sections, setSections] = useState<QuotationSection[]>([
    {
      id: "sec-1",
      sectionTitle: "الباب رقم (4) - أعمال المباني (قسم 042000)",
      sectionNotes: "ملاحظات هامة للباب رقم (4): تشمل الأعتاب والكانات المجلفنة واشتراطات المصانع المعتمدة.",
      items: [
        {
          id: "row-1",
          itemCode: "أ-1",
          description: "توريد وعمل مباني من الطوب الأسمنتي المصمت لزوم حوائط قصية الردم - بسمك 12 سم",
          unit: "م²",
          quantity: 30,
          unitPrice: 370,
          totalPrice: 11100,
        },
        {
          id: "row-2",
          itemCode: "ب-1",
          description: "توريد وعمل مباني من الطوب الأسمنتي المصمت لزوم حوائط قصية الردم - بسمك 25 سم أو أكثر",
          unit: "م³",
          quantity: 70,
          unitPrice: 2700,
          totalPrice: 189000,
        },
      ],
    },
  ]);

  // Company info for print
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات العامه");
  const [companyLogo, setCompanyLogo] = useState("/logo.jpeg");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("Setting").select("*").eq("key", "price_quotations").single();

      if (data && data.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed)) setQuotations(parsed);
        } catch (e) {}
      } else {
        const local = localStorage.getItem("price_quotations");
        if (local) setQuotations(JSON.parse(local));
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveQuotationsToDB = async (newList: PriceQuotation[]) => {
    setQuotations(newList);
    localStorage.setItem("price_quotations", JSON.stringify(newList));
    try {
      await supabase.from("Setting").upsert({
        key: "price_quotations",
        value: JSON.stringify(newList),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Section / Item Helpers
  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: "sec-" + Date.now(),
        sectionTitle: "الباب رقم (" + (prev.length + 1) + ") - بند أعمال جديد",
        sectionNotes: "",
        items: [
          {
            id: "row-" + Date.now(),
            itemCode: "1",
            description: "",
            unit: "م²",
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          },
        ],
      },
    ]);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (sections.length === 1) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const handleUpdateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, sectionTitle: title } : s)));
  };

  const handleUpdateSectionNotes = (sectionId: string, notes: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, sectionNotes: notes } : s)));
  };

  const handleAddItemToSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: [
            ...sec.items,
            {
              id: "row-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
              itemCode: (sec.items.length + 1).toString(),
              description: "",
              unit: "م²",
              quantity: 0,
              unitPrice: 0,
              totalPrice: 0,
            },
          ],
        };
      })
    );
  };

  const handleRemoveItemFromSection = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        if (sec.items.length === 1) return sec;
        return {
          ...sec,
          items: sec.items.filter((i) => i.id !== itemId),
        };
      })
    );
  };

  const handleUpdateItem = (sectionId: string, itemId: string, field: keyof QuotationItem, value: any) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((it) => {
            if (it.id !== itemId) return it;
            const updated = { ...it, [field]: value };
            const q = parseFloat(updated.quantity.toString()) || 0;
            const p = parseFloat(updated.unitPrice.toString()) || 0;
            updated.totalPrice = parseFloat((q * p).toFixed(2));
            return updated;
          }),
        };
      })
    );
  };

  const handleSelectStandardItem = (sectionId: string, itemId: string, stdItem: any) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((it) => {
            if (it.id !== itemId) return it;
            const q = parseFloat(it.quantity.toString()) || 1;
            const p = stdItem.price || 0;
            return {
              ...it,
              itemCode: stdItem.code || it.itemCode,
              description: stdItem.desc || it.description,
              unit: stdItem.unit || it.unit,
              unitPrice: p,
              totalPrice: parseFloat((q * p).toFixed(2)),
            };
          }),
        };
      })
    );
  };

  // Grand Total Calculation
  const calculateGrandTotal = (secs: QuotationSection[]) => {
    return secs.reduce((acc, s) => {
      const secSum = s.items.reduce((sAcc, i) => sAcc + (i.totalPrice || 0), 0);
      return acc + secSum;
    }, 0);
  };

  const currentGrandTotal = calculateGrandTotal(sections);

  const resetForm = () => {
    const nextCount = quotations.length + 1;
    setQuotationNumber("BOQ-" + nextCount.toString().padStart(3, "0"));
    setTitle("جدول مقايسة بنود الأعمال المسعرة (Priced BOQ)");
    setClientName("");
    setProjectName("");
    setConsultantName("صبور (SABBOUR)");
    setDate(new Date().toISOString().split("T")[0]);
    setIssueNumber("إصدار : ( 1 )");
    setNotes("");

    setSections([
      {
        id: "sec-1",
        sectionTitle: "الباب رقم (4) - أعمال المباني (قسم 042000)",
        sectionNotes: "ملاحظات هامة للباب رقم (4): تشمل الأعتاب والكانات المجلفنة واشتراطات المصانع المعتمدة.",
        items: [
          {
            id: "row-1",
            itemCode: "أ-1",
            description: "توريد وعمل مباني من الطوب الأسمنتي المصمت لزوم حوائط قصية الردم - بسمك 12 سم",
            unit: "م²",
            quantity: 30,
            unitPrice: 370,
            totalPrice: 11100,
          },
        ],
      },
    ]);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (q: PriceQuotation) => {
    setEditingItem(q);
    setQuotationNumber(q.quotationNumber || "BOQ-001");
    setTitle(q.title || "جدول مقايسة بنود الأعمال المسعرة (Priced BOQ)");
    setClientName(q.clientName || "");
    setProjectName(q.projectName || "");
    setConsultantName(q.consultantName || "");
    setDate(q.date || new Date().toISOString().split("T")[0]);
    setIssueNumber(q.issueNumber || "إصدار : ( 1 )");
    setNotes(q.notes || "");
    setSections(q.sections || []);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("برجاء إدخال عنوان المقايسة", "warning");
      return;
    }

    const payload: PriceQuotation = {
      id: editingItem ? editingItem.id : "boq-" + Date.now(),
      quotationNumber: quotationNumber.trim(),
      title: title.trim(),
      clientName: clientName.trim() || "العميل",
      projectName: projectName.trim() || "مشروع عام",
      consultantName: consultantName.trim() || "-",
      date,
      issueNumber: issueNumber.trim() || "إصدار : ( 1 )",
      documentType: "جدول مقايسة بنود الأعمال المسعرة (Priced BOQ)",
      sections,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      let updated: PriceQuotation[];
      if (editingItem) {
        updated = quotations.map((q) => (q.id === editingItem.id ? payload : q));
        showToast("تم تحديث مقايسة الأسعار بنجاح 📑✅", "success");
      } else {
        updated = [payload, ...quotations];
        showToast("تم حفظ مقايسة الأسعار وعرض السعر بنجاح 📑🎉", "success");
      }

      await saveQuotationsToDB(updated);
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ المقايسة", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (q: PriceQuotation) => {
    if (!confirm("هل أنت متأكد من حذف هذه المقايسة (" + q.title + ")؟")) return;
    const updated = quotations.filter((x) => x.id !== q.id);
    await saveQuotationsToDB(updated);
    showToast("تم حذف المقايسة بنجاح 🗑️", "success");
  };

  const handleOpenPrint = (q: PriceQuotation) => {
    setActiveQuotationForPrint(q);
    setShowPrintModal(true);
  };

  const filtered = quotations.filter((q) => {
    const s = searchTerm.toLowerCase();
    return (
      !s ||
      q.title.toLowerCase().includes(s) ||
      q.clientName.toLowerCase().includes(s) ||
      q.projectName.toLowerCase().includes(s) ||
      q.quotationNumber.toLowerCase().includes(s)
    );
  });

  const totalQuotationsCount = quotations.length;
  const totalQuotationsAmount = quotations.reduce((acc, q) => acc + calculateGrandTotal(q.sections || []), 0);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>📑</span>
            <span>عروض الأسعار ومقايسات بنود الأعمال المسعرة (Priced BOQ)</span>
          </h1>
          <p className="page-subtitle">
            إعداد وطباعة مقايسات المشاريع، تسعير الأبواب والبنود الإنشائية والتشطيبات، وحساب التكاليف الإجمالية
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/term-sheets" className="btn btn-ghost" style={{ fontWeight: 700 }}>
            📈 مذكرات الاستثمار
          </Link>
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>➕</span>
            <span>+ إنشاء مقايسة / عرض سعر جديد</span>
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1.5px solid #93c5fd",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.08)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", background: "#bfdbfe", padding: "2px 8px", borderRadius: 20, display: "inline-block" }}>
            📑 إجمالي المقايسات المسعرة
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1d4ed8", marginTop: 10 }}>
            {totalQuotationsCount} مقايسة
          </div>
          <div style={{ fontSize: 11, color: "#2563eb", marginTop: 4 }}>جاهزة للتقديم والطباعة الرسمية</div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1.5px solid #86efac",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", background: "#bbf7d0", padding: "2px 8px", borderRadius: 20, display: "inline-block" }}>
            💰 إجمالي قيم العروض والمقايسات
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#15803d", marginTop: 10 }}>
            {formatCurrency(totalQuotationsAmount)}
          </div>
          <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>شامل أعمال البناء والتشطيبات</div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 بحث برقم المقايسة، اسم العميل / المالك، أو اسم المشروع..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل عروض الأسعار والمقايسات...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span style={{ fontSize: 40 }}>📑</span>
              <div className="empty-state-text" style={{ marginTop: 12, fontWeight: 800 }}>
                {searchTerm ? "لا توجد نتائج تطابق البحث" : "لم يتم تسجيل أي عروض أسعار أو مقايسات بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleOpenAdd}>
                + إنشاء أول مقايسة / عرض سعر الآن
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>رقم المقايسة</th>
                  <th>عنوان المقايسة</th>
                  <th>المالك / العميل</th>
                  <th>المشروع</th>
                  <th>الاستشاري</th>
                  <th>التاريخ والإصدار</th>
                  <th>عدد الأبواب والبنود</th>
                  <th>إجمالي قيمة المقايسة</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 170 }}>الإجراءات والطباعة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, idx) => {
                  const gTotal = calculateGrandTotal(q.sections || []);
                  const totalItems = q.sections ? q.sections.reduce((acc, s) => acc + (s.items?.length || 0), 0) : 0;

                  return (
                    <tr key={q.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "3px 8px", borderRadius: 6, border: "1px solid #bfdbfe", fontSize: 12 }}>
                          {q.quotationNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>{q.title}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{q.clientName}</td>
                      <td>
                        <span className="badge badge-info">{q.projectName}</span>
                      </td>
                      <td>{q.consultantName || "-"}</td>
                      <td>
                        <div style={{ whiteSpace: "nowrap" }}>{formatDateShort(q.date)}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{q.issueNumber}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                          {q.sections?.length || 0} أبواب ({totalItems} بند)
                        </div>
                      </td>
                      <td style={{ fontWeight: 900, color: "#166534", fontSize: 14 }}>
                        {formatCurrency(gTotal)}
                      </td>
                      <td className="print:hidden" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>
                          {/* Print Exact 2.pdf */}
                          <button
                            onClick={() => handleOpenPrint(q)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 8px", fontSize: 11, fontWeight: 800 }}
                            title="طباعة المقايسة الرسمية (Priced BOQ)"
                          >
                            🖨️ طباعة
                          </button>

                          <button onClick={() => handleOpenEdit(q)} className="btn-icon-centered" title="تعديل المقايسة">
                            ✏️
                          </button>

                          <button onClick={() => handleDelete(q)} className="btn-icon-centered text-danger" title="حذف">
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
      {/* 1. ADD / EDIT PRICE QUOTATION MODAL */}
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
              maxWidth: 1200,
              maxHeight: "95vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* TOP BLUE HEADER */}
            <div
              style={{
                background: "#172554",
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
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 900 }}>
                <span>📑</span>
                <span>{editingItem ? "تعديل مقايسة بنود الأعمال المسعرة" : "إنشاء مقايسة بنود أعمال مسعرة (Priced BOQ)"}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
              {/* TOP HEADER CONTROLS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  background: "#f8fafc",
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  marginBottom: 20,
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>رقم المقايسة / الكود *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    style={{ fontWeight: 800, textAlign: "center" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>المالك / العميل *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="مثال: المخابرات العامة / شركة..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>المشروع *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="مثال: المنصورة 6 - المسجد"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>الاستشاري</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: صبور (SABBOUR)"
                    value={consultantName}
                    onChange={(e) => setConsultantName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>التاريخ</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>رقم الإصدار</label>
                  <input
                    type="text"
                    className="form-control"
                    value={issueNumber}
                    onChange={(e) => setIssueNumber(e.target.value)}
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>

              {/* SECTIONS & CHAPTERS BUILDER */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    style={{
                      background: "#1e3a8a",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    + إضافة باب / قسم جديد للمقايسة
                  </button>

                  <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>
                    📑 تفاصيل الأبواب وبنود الأعمال المسعرة
                  </div>
                </div>

                {sections.map((section, sIdx) => {
                  const sectionSubtotal = section.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);

                  return (
                    <div
                      key={section.id}
                      style={{
                        border: "1.5px solid #cbd5e1",
                        borderRadius: 10,
                        overflow: "hidden",
                        marginBottom: 20,
                        background: "#ffffff",
                      }}
                    >
                      {/* SECTION HEADER BAR */}
                      <div
                        style={{
                          background: "#1e3a8a",
                          color: "#ffffff",
                          padding: "10px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(section.id)}
                              style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}
                            >
                              حذف الباب
                            </button>
                          )}
                          <input
                            type="text"
                            value={section.sectionTitle}
                            onChange={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
                            style={{
                              background: "rgba(255,255,255,0.15)",
                              color: "#ffffff",
                              border: "1px solid rgba(255,255,255,0.3)",
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontWeight: 900,
                              fontSize: 13,
                              width: 420,
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddItemToSection(section.id)}
                          style={{
                            background: "#166534",
                            color: "#ffffff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 4,
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          + إضافة بند بهذا الباب
                        </button>
                      </div>

                      {/* SECTION NOTES INPUT */}
                      <div style={{ background: "#f8fafc", padding: "8px 16px", borderBottom: "1px solid #e2e8f0" }}>
                        <input
                          type="text"
                          placeholder="ملاحظات هامة للباب (مثال: تشمل الأعتاب والكانات المجلفنة، تقاس هندسياً...)"
                          value={section.sectionNotes}
                          onChange={(e) => handleUpdateSectionNotes(section.id, e.target.value)}
                          style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11 }}
                        />
                      </div>

                      {/* SECTION ITEMS TABLE */}
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1", fontWeight: 800, color: "#334155" }}>
                            <th style={{ padding: "8px 6px", width: 35, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>#</th>
                            <th style={{ padding: "8px 6px", width: 70, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>رقم البند</th>
                            <th style={{ padding: "8px 8px", borderLeft: "1px solid #e2e8f0" }}>بيان الأعمال والمواصفات</th>
                            <th style={{ padding: "8px 6px", width: 220, borderLeft: "1px solid #e2e8f0" }}>اختيار من المكتبة المعتمدة</th>
                            <th style={{ padding: "8px 6px", width: 75, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الوحدة</th>
                            <th style={{ padding: "8px 6px", width: 90, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الكمية</th>
                            <th style={{ padding: "8px 6px", width: 90, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الفئة (جنيه)</th>
                            <th style={{ padding: "8px 6px", width: 110, textAlign: "center", borderLeft: "1px solid #e2e8f0" }}>الإجمالي (جنيه)</th>
                            <th style={{ padding: "8px 6px", width: 40, textAlign: "center" }}>حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map((it, iIdx) => (
                            <tr key={it.id} style={{ borderBottom: "1px solid #e2e8f0", background: iIdx % 2 === 0 ? "#ffffff" : "#fcfcfd" }}>
                              <td style={{ textAlign: "center", fontWeight: 700, borderLeft: "1px solid #e2e8f0", color: "#64748b" }}>
                                {iIdx + 1}
                              </td>

                              <td style={{ padding: "4px", borderLeft: "1px solid #e2e8f0" }}>
                                <input
                                  type="text"
                                  placeholder="أ-1"
                                  value={it.itemCode}
                                  onChange={(e) => handleUpdateItem(section.id, it.id, "itemCode", e.target.value)}
                                  style={{ width: "100%", padding: "4px", textAlign: "center", borderRadius: 4, border: "1px solid #cbd5e1", fontWeight: 800 }}
                                />
                              </td>

                              <td style={{ padding: "4px 8px", borderLeft: "1px solid #e2e8f0" }}>
                                <input
                                  type="text"
                                  placeholder="اكتب وصف وتفاصيل البند..."
                                  value={it.description}
                                  onChange={(e) => handleUpdateItem(section.id, it.id, "description", e.target.value)}
                                  style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontWeight: 700 }}
                                />
                              </td>

                              <td style={{ padding: "4px", borderLeft: "1px solid #e2e8f0" }}>
                                <select
                                  style={{ width: "100%", padding: "4px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11 }}
                                  onChange={(e) => {
                                    const found = STANDARD_ITEMS_LIBRARY.find((std) => std.desc === e.target.value);
                                    if (found) handleSelectStandardItem(section.id, it.id, found);
                                  }}
                                  value=""
                                >
                                  <option value="" disabled>-- بنود قياسية جاهزة --</option>
                                  {STANDARD_ITEMS_LIBRARY.map((std, idx) => (
                                    <option key={idx} value={std.desc}>[{std.category}] {std.desc.slice(0, 45)}...</option>
                                  ))}
                                </select>
                              </td>

                              <td style={{ padding: "4px", borderLeft: "1px solid #e2e8f0" }}>
                                <select
                                  value={it.unit}
                                  onChange={(e) => handleUpdateItem(section.id, it.id, "unit", e.target.value)}
                                  style={{ width: "100%", padding: "4px", textAlign: "center", borderRadius: 4, border: "1px solid #cbd5e1", fontWeight: 800 }}
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

                              <td style={{ padding: "4px", borderLeft: "1px solid #e2e8f0" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.quantity}
                                  onChange={(e) => handleUpdateItem(section.id, it.id, "quantity", e.target.value)}
                                  style={{ width: "100%", padding: "4px", textAlign: "center", borderRadius: 4, border: "1px solid #cbd5e1", fontWeight: 800 }}
                                />
                              </td>

                              <td style={{ padding: "4px", borderLeft: "1px solid #e2e8f0" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.unitPrice}
                                  onChange={(e) => handleUpdateItem(section.id, it.id, "unitPrice", e.target.value)}
                                  style={{ width: "100%", padding: "4px", textAlign: "center", borderRadius: 4, border: "1px solid #cbd5e1", fontWeight: 800 }}
                                />
                              </td>

                              <td style={{ padding: "4px", textAlign: "center", fontWeight: 900, color: "#1e3a8a", borderLeft: "1px solid #e2e8f0" }}>
                                {it.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromSection(section.id, it.id)}
                                  style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 4, width: 24, height: 24, cursor: "pointer" }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* SECTION SUBTOTAL BAR */}
                      <div
                        style={{
                          background: "#f1f5f9",
                          padding: "8px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontWeight: 900,
                          fontSize: 13,
                          borderTop: "1.5px solid #cbd5e1",
                        }}
                      >
                        <span style={{ color: "#1e3a8a" }}>إجمالي {section.sectionTitle}:</span>
                        <span style={{ color: "#1e3a8a", fontSize: 14 }}>{formatCurrency(sectionSubtotal)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* GRAND TOTAL BAR */}
                <div
                  style={{
                    background: "#172554",
                    color: "#ffffff",
                    padding: "12px 20px",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  <span>الإجمالي العام للمقايسة (شامل جميع الأبواب والبنود):</span>
                  <span style={{ color: "#facc15", fontSize: 18 }}>{formatCurrency(currentGrandTotal)}</span>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
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
                      <span>حفظ المقايسة</span>
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
      {/* 2. PRINT PRICED BOQ MODAL (EXACT 2.pdf LAYOUT) */}
      {/* ========================================================================= */}
      {showPrintModal && activeQuotationForPrint && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960, background: "#ffffff", padding: 0, overflow: "hidden" }}>
            <div className="modal-header no-print" style={{ borderBottom: "1px solid #e2e8f0", padding: "14px 20px" }}>
              <h2 className="modal-title" style={{ color: "#0f172a", fontSize: 16 }}>🖨️ معاينة وطباعة جدول مقايسة بنود الأعمال المسعرة (Priced BOQ)</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ fontWeight: 800 }}>
                  🖨️ طباعة الآن (Print)
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPrintModal(false)}>✕</button>
              </div>
            </div>

            {/* EXACT 2.PDF DOCUMENT CONTAINER */}
            <div
              className="modal-body print-area"
              ref={printRef}
              style={{
                color: "#000000",
                background: "#ffffff",
                padding: "20px 28px",
                fontFamily: "Tajawal, Arial, sans-serif",
                direction: "rtl",
              }}
            >
              {/* TOP HEADER WITH LOGO (EXACT 2.PDF) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #172554", paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ width: 140 }}></div>
                <div style={{ textAlign: "center" }}>
                  <img
                    src={companyLogo}
                    alt="Logo"
                    style={{ height: 48, width: 48, objectFit: "contain", margin: "0 auto" }}
                    onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                  />
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#172554", marginTop: 2 }}>
                    {companyName}
                  </div>
                </div>
                <div style={{ width: 140 }}></div>
              </div>

              {/* METADATA GRID BOX (EXACT 2.PDF MATCH) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  padding: "8px 12px",
                  fontSize: 10.5,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div><strong>المالك :</strong> {activeQuotationForPrint.clientName} | <strong>المشروع :</strong> {activeQuotationForPrint.projectName}</div>
                  <div><strong>المستند :</strong> {activeQuotationForPrint.documentType}</div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div><strong>الاستشاري :</strong> {activeQuotationForPrint.consultantName || "عام"}</div>
                  <div><strong>التاريخ :</strong> {formatDateShort(activeQuotationForPrint.date)} | <strong>{activeQuotationForPrint.issueNumber}</strong></div>
                </div>
              </div>

              {/* SECTIONS & ITEMS TABLES (EXACT 2.PDF LAYOUT) */}
              {activeQuotationForPrint.sections?.map((sec, sIdx) => {
                const subtotal = sec.items?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) || 0;

                return (
                  <div key={sec.id || sIdx} style={{ marginBottom: 12 }}>
                    {/* SECTION TITLE BAR (NAVY #172554) */}
                    <div
                      style={{
                        background: "#172554",
                        color: "#ffffff",
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 900,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{sec.sectionTitle}</span>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: 10, textAlign: "right" }}>
                      <thead>
                        {/* SECTION NOTES ROW IF PRESENT */}
                        {sec.sectionNotes && (
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                            <td colSpan={6} style={{ padding: "4px 8px", fontSize: 9.5, color: "#334155" }}>
                              {sec.sectionNotes}
                            </td>
                          </tr>
                        )}
                        <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #172554", color: "#000", fontWeight: 900 }}>
                          <th style={{ padding: "5px 6px", width: 50, textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>رقم البند</th>
                          <th style={{ padding: "5px 8px", borderLeft: "1px solid #cbd5e1" }}>بيـــان الأعمــــال</th>
                          <th style={{ padding: "5px 6px", width: 55, textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>الوحدة</th>
                          <th style={{ padding: "5px 6px", width: 70, textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>الكمية</th>
                          <th style={{ padding: "5px 6px", width: 75, textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>الفئة (جنيه)</th>
                          <th style={{ padding: "5px 6px", width: 90, textAlign: "center" }}>الإجمالي (جنيه)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec.items?.map((it, iIdx) => (
                          <tr key={it.id || iIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 800, borderLeft: "1px solid #cbd5e1" }}>
                              {it.itemCode}
                            </td>
                            <td style={{ padding: "4px 8px", borderLeft: "1px solid #cbd5e1", lineHeight: 1.4 }}>
                              {it.description}
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>
                              {it.unit}
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center", borderLeft: "1px solid #cbd5e1", fontWeight: 700 }}>
                              {typeof it.quantity === "number" ? it.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 }) : it.quantity}
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center", borderLeft: "1px solid #cbd5e1", fontWeight: 700 }}>
                              {typeof it.unitPrice === "number" ? it.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : it.unitPrice}
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 900 }}>
                              {it.totalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {/* SECTION SUBTOTAL */}
                        <tr style={{ background: "#f8fafc", fontWeight: 900, borderTop: "1.5px solid #cbd5e1" }}>
                          <td colSpan={5} style={{ padding: "5px 8px", borderLeft: "1px solid #cbd5e1", textAlign: "left" }}>
                            إجمالي {sec.sectionTitle}:
                          </td>
                          <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 900, color: "#000" }}>
                            {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* GRAND TOTAL BAR (EXACT 2.PDF) */}
              <div
                style={{
                  background: "#172554",
                  color: "#ffffff",
                  padding: "8px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 900,
                  fontSize: 12,
                  marginTop: 10,
                }}
              >
                <span>الإجمالي العام للمقايسة (شامل أعمال المباني والتشطيبات):</span>
                <span style={{ fontSize: 13, color: "#facc15" }}>
                  {calculateGrandTotal(activeQuotationForPrint.sections || []).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>
            </div>

            <div className="modal-footer no-print" style={{ padding: "12px 20px" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPrintModal(false)}>إغلاق</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة المقايسة (Priced BOQ)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
