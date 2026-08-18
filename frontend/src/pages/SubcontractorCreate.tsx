import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Project {
  id: string;
  code: string;
  name: string;
}

const SPECIALTIES = [
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

const CONTRACT_TYPES = [
  "بالقاطع / بالمتر (م² أو م³)",
  "يومية (صنايعية ومساعدين)",
  "بالخشب (متضمن الخامات والشدة)",
  "بدون خشب (مصانع فقط)",
  "مقاول تشوين وتوريد",
];

export default function SubcontractorCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const editId = searchParams.get("edit");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("مباني");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [contractType, setContractType] = useState("بالقاطع / بالمتر (م² أو م³)");
  const [projectId, setProjectId] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const { data: projData } = await supabase
          .from("Project")
          .select("id, code, name")
          .order("name", { ascending: true });
        setProjects(projData || []);
      } catch (e) {}

      if (editId) {
        setLoading(true);
        try {
          const { data: item, error } = await supabase
            .from("Subcontractor")
            .select("*")
            .eq("id", editId)
            .single();

          if (error) throw error;
          if (item) {
            setName(item.name || "");
            if (SPECIALTIES.includes(item.specialty)) {
              setSpecialty(item.specialty);
            } else {
              setSpecialty("أخرى");
              setCustomSpecialty(item.specialty || "");
            }
            setPhone(item.phone || "");

            // Extract notes JSON metadata if present
            if (item.notes && item.notes.includes("[meta:")) {
              const ctMatch = item.notes.match(/contractType=([^\|\]]+)/);
              if (ctMatch) setContractType(ctMatch[1]);
              const pMatch = item.notes.match(/projectId=([^\|\]]+)/);
              if (pMatch) setProjectId(pMatch[1]);
              const cleanN = item.notes.replace(/\[meta:[^\]]+\]/, "").trim();
              setNotes(cleanN);
            } else {
              setNotes(item.notes || "");
            }
          }
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast("برجاء إدخال اسم مقاول الباطن", "warning");
      return;
    }

    const finalSpecialty = specialty === "أخرى" ? customSpecialty : specialty;
    if (!finalSpecialty) {
      showToast("برجاء تحديد مهنة وتخصص المقاول", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const metaNotes = `[meta:contractType=${contractType}|projectId=${projectId}] ${notes}`.trim();

      const payload = {
        name,
        specialty: finalSpecialty,
        phone,
        notes: metaNotes,
      };

      if (editId) {
        const { error } = await supabase.from("Subcontractor").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث بيانات المقاول بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("Subcontractor").insert([payload]);
        if (error) throw error;
        showToast("تم إضافة مقاول الباطن بنجاح ✅", "success");
      }

      setTimeout(() => {
        navigate("/subcontractors");
      }, 600);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ البيانات", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 750, margin: "0 auto" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{editId ? "✏️ تعديل بيانات مقاول الباطن" : "🤝 إضافة مقاول باطن جديد"}</h1>
          <p className="page-subtitle">تحديد تخصص المقاول من مهن الحصر، نظام التعاقد (باليومية/بالمتر/بالخشب)، والمشروع المسند</p>
        </div>
        <Link to="/subcontractors" className="btn btn-ghost">
          ← إلغاء والعودة
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 32, height: 32 }} />
            <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل بيانات المقاول...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">اسم المقاول / الشركة المنفذة *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: إبراهيم أبو علي..."
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف والتواصل</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">مهنة وتخصص المقاول * (قائمة منسدلة)</label>
                <select
                  className="form-control"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  {SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              {specialty === "أخرى" ? (
                <div className="form-group">
                  <label className="form-label">اكتب التخصص بالتفصيل *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: عزل وتأسيس..."
                    required
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">نظام التعاقد وطريقة الحساب *</label>
                  <select
                    className="form-control"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                  >
                    {CONTRACT_TYPES.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">المشروع التابع له المقاول</label>
              <select
                className="form-control"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">عام / جميع المشاريع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">ملاحظات وشروط إضافية للعقد</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="أدخل أي ملاحظات أو شروط خاصة بالتعاقد..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <Link to="/subcontractors" className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }} disabled={submitting}>
                {submitting ? <span className="spinner" /> : editId ? "💾 حفظ التعديلات" : "🤝 إضافة المقاول"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
