import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function SupervisorCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const editId = searchParams.get("edit");
  const defaultProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salaryType, setSalaryType] = useState("شهري");
  const [salary, setSalary] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from("Project")
          .select("id, name, code")
          .order("name", { ascending: true });
        if (error) throw error;
        setProjects(data || []);
      } catch (err: any) {
        showToast(err.message, "error");
      }

      if (editId) {
        setLoading(true);
        try {
          const { data: sup, error } = await supabase
            .from("Supervisor")
            .select("*")
            .eq("id", editId)
            .single();

          if (error) throw error;
          if (sup) {
            setName(sup.name || "");
            setPhone(sup.phone || "");
            setSalaryType(sup.salaryType || "شهري");
            setSalary(sup.salary?.toString() || "");
            setHireDate(sup.hireDate ? new Date(sup.hireDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
            setProjectId(sup.projectId || "");
            setIsActive(sup.isActive ?? true);
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
    if (!name || !salary) {
      showToast("برجاء إدخال اسم المشرف وقيمة الراتب", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        phone,
        salaryType,
        salary: parseFloat(salary) || 0,
        hireDate: new Date(hireDate).toISOString(),
        projectId: projectId || null,
        isActive,
      };

      if (editId) {
        const { error } = await supabase.from("Supervisor").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث بيانات المشرف بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("Supervisor").insert([payload]);
        if (error) throw error;
        showToast("تم إضافة المشرف بنجاح ✅", "success");
      }

      setTimeout(() => {
        navigate("/supervisors");
      }, 500);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ البيانات", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">{editId ? "✏️ تعديل بيانات المشرف" : "👔 إضافة مشرف / مهندس جديد"}</h1>
          <p className="page-subtitle">تسجيل بيانات الكادر الهيكلي والإشرافي للمواقع والشركة</p>
        </div>
        <Link to="/supervisors" className="btn btn-ghost">
          ← إلغاء والعودة
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 650, margin: "0 auto", padding: 24 }}>
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 30, height: 30 }} />
            <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل البيانات...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">اسم المشرف / المهندس بالكامل *</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: م. أحمد عبد العزيز"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="01xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">المشروع الموكل له (اختياري)</label>
                <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">-- مشرف عام / بدون مشروع --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">نظام الراتب *</label>
                <select className="form-control" value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
                  <option value="شهري">راتب شهري</option>
                  <option value="يومي">أجر يومي</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الراتب / الأجر (جنيه) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  required
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">تاريخ التعيين</label>
                <input type="date" className="form-control" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-control" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")}>
                  <option value="true">نشط (يعمل بالشركة)</option>
                  <option value="false">غير نشط (متوقف)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <Link to="/supervisors" className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : editId ? "تحديث التعديلات" : "حفظ البيانات"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
