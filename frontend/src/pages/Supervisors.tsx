import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Supervisor {
  id: string;
  name: string;
  phone?: string;
  salaryType: string;
  salary: number;
  hireDate?: string;
  projectId?: string;
  project?: { id: string; name: string; code: string };
  isActive: boolean;
}

export default function SupervisorsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSupervisors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Supervisor")
        .select("*, project:Project(id, name, code)")
        .order("name", { ascending: true });

      if (error) throw error;
      setSupervisors(data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل قائمة المشرفين من Supabase", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المشرف (${name})؟`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("Supervisor").delete().eq("id", id);
      if (error) throw error;
      showToast(`تم حذف المشرف ${name} بنجاح ✅`, "success");
      fetchSupervisors();
    } catch (e: any) {
      showToast(e.message || "فشل في حذف المشرف", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = supervisors.filter((sup) => {
    const s = searchTerm.toLowerCase();
    return (
      sup.name.toLowerCase().includes(s) ||
      (sup.phone && sup.phone.includes(s)) ||
      (sup.project && sup.project.name.toLowerCase().includes(s))
    );
  });

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">👔 المهندسون والمشرفون</h1>
          <p className="page-subtitle">إدارة طاقم التجميع الهندسي والإشرافي للمواقع وحساب الرواتب واليوميات</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/supervisor-salaries" className="btn btn-gold">
            🏦 رواتب المشرفين
          </Link>
          <Link to="/supervisors/create" className="btn btn-primary">
            + إضافة مشرف جديد
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 بحث باسم المشرف، الهاتف، أو اسم المشروع الموكل له..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل قائمة المشرفين...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👔</div>
              <div className="empty-state-text">
                {searchTerm ? "لا توجد نتائج تطابق البحث" : "لم يتم تسجيل أي مشرفين في النظام بعد"}
              </div>
              <Link to="/supervisors/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + إضافة أول مشرف
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>اسم المشرف / المهندس</th>
                  <th>الهاتف</th>
                  <th>نظام التعاقد</th>
                  <th>الراتب / الأجر</th>
                  <th>المشروع الموكل له</th>
                  <th>تاريخ التعيين</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sup, idx) => (
                  <tr key={sup.id}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700 }}>{sup.name}</td>
                    <td>{sup.phone || "-"}</td>
                    <td><span className="badge badge-info">{sup.salaryType || "شهري"}</span></td>
                    <td className="text-gold" style={{ fontWeight: 800 }}>{formatCurrency(sup.salary)}</td>
                    <td style={{ fontWeight: 700 }}>{sup.project?.name || "مشرف عام"}</td>
                    <td>{formatDateShort(sup.hireDate)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${sup.isActive ? "badge-success" : "badge-danger"}`}>
                        {sup.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <Link to={`/supervisors/create?edit=${sup.id}`} className="btn-icon-centered" title="تعديل">
                          ✏️
                        </Link>
                        <button
                          onClick={() => handleDelete(sup.id, sup.name)}
                          disabled={deletingId === sup.id}
                          className="btn-icon-centered text-danger"
                          title="حذف"
                        >
                          {deletingId === sup.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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
    </div>
  );
}
