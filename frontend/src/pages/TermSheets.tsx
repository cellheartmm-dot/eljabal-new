import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface TermSheet {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
}

export default function TermSheetsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [sheets, setSheets] = useState<TermSheet[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TermSheet | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("عقود تنفيذ");
  const [content, setContent] = useState("");

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Setting")
        .select("*")
        .eq("key", "term_sheets")
        .single();

      if (error && error.code !== "PGRST116") {
        // ignore not found error
      }

      if (data && data.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed)) setSheets(parsed);
        } catch (e) {
          console.error(e);
        }
      } else {
        // Load fallback sample sheets
        const stored = localStorage.getItem("term_sheets");
        if (stored) setSheets(JSON.parse(stored));
      }
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل مذكرات الشروط", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const saveSheetsToSupabase = async (newList: TermSheet[]) => {
    setSheets(newList);
    localStorage.setItem("term_sheets", JSON.stringify(newList));

    try {
      await supabase.from("Setting").upsert({
        key: "term_sheets",
        value: JSON.stringify(newList),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCategory("عقود تنفيذ");
    setContent("");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (sheet: TermSheet) => {
    setEditingItem(sheet);
    setTitle(sheet.title || "");
    setCategory(sheet.category || "عقود تنفيذ");
    setContent(sheet.content || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setSubmitting(true);
    try {
      let updated: TermSheet[];
      if (editingItem) {
        updated = sheets.map((s) => (s.id === editingItem.id ? { ...s, title, category, content } : s));
        showToast("تم تحديث مذكرة الشروط بنجاح ✅", "success");
      } else {
        const newSheet: TermSheet = {
          id: "sheet-" + Date.now(),
          title,
          category,
          content,
          createdAt: new Date().toISOString(),
        };
        updated = [newSheet, ...sheets];
        showToast("تم إدخال مذكرة الشروط بنجاح ✅", "success");
      }

      await saveSheetsToSupabase(updated);
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, sheetTitle: string) => {
    if (!confirm(`هل أنت متأكد من حذف مذكرة الشروط (${sheetTitle})؟`)) return;
    const updated = sheets.filter((s) => s.id !== id);
    await saveSheetsToSupabase(updated);
    showToast("تم الحذف بنجاح ✅", "success");
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📋 مذكرات الشروط والبنود العقدية</h1>
          <p className="page-subtitle">صياغة الشروط والبنود العقدية القياسية للمشاريع ومقاولي الباطن والعملاء</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة مذكرة شروط جديدة
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل المذكرات...</div>
            </div>
          ) : sheets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">لم يتم صياغة أي مذكرات شروط بعد</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول مذكرة شروط
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>عنوان المذكرة / البند</th>
                  <th>التصنيف</th>
                  <th>محتوى الشروط والبنود</th>
                  <th>تاريخ الإنشاء</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet, idx) => (
                  <tr key={sheet.id}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700 }}>{sheet.title}</td>
                    <td><span className="badge badge-info">{sheet.category || "عام"}</span></td>
                    <td style={{ whiteSpace: "pre-wrap", maxWidth: 400 }}>{sheet.content}</td>
                    <td>{formatDateShort(sheet.createdAt)}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button onClick={() => handleOpenEdit(sheet)} className="btn-icon-centered" title="تعديل">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(sheet.id, sheet.title)} className="btn-icon-centered text-danger" title="حذف">
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? "✏️ تعديل مذكرة شروط" : "📋 إضافة مذكرة شروط جديدة"}</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">عنوان المذكرة / البند *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: شروط السلامة والصحة المهنية بالموقع"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">التصنيف *</label>
                  <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="عقود تنفيذ">عقود تنفيذ ومقاولين</option>
                    <option value="عقود عملاء">عقود ملاك وعملاء</option>
                    <option value="سلامة وموقع">سلامة وأمن الموقع</option>
                    <option value="شروط توريد">شروط توريد خامات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">محتوى البنود والشروط تفصيلياً *</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="اكتب البنود والشروط بالكامل هنا..."
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ المذكرة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
