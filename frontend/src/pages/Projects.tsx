import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";
import { PROJECT_TYPES_CONFIG, type ProjectTypeKey } from "./ProjectCreate";

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  value: number;
  status: string;
  startDate: string | null;
  notes?: string;
  type?: string;
  expenses: { amount: number }[];
}

export default function ProjectsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Project")
        .select("*, expenses:ProjectExpense(amount)")
        .order("createdAt", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل المشاريع", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مشروع "${name}"؟`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("Project").delete().eq("id", id);
      if (error) throw error;
      showToast(`تم حذف مشروع "${name}" بنجاح ✅`, "success");
      fetchProjects();
    } catch (e: any) {
      showToast(e.message || "فشل في حذف المشروع", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to extract project type key
  const getProjectTypeKey = (p: Project): ProjectTypeKey => {
    if (p.notes && p.notes.includes("[meta:")) {
      const match = p.notes.match(/type=([^\|\]]+)/);
      if (match && (match[1] as ProjectTypeKey) in PROJECT_TYPES_CONFIG) {
        return match[1] as ProjectTypeKey;
      }
    }
    if (p.type && p.type in PROJECT_TYPES_CONFIG) {
      return p.type as ProjectTypeKey;
    }
    return "GENERAL_CONTRACTING";
  };

  const filtered = projects.filter((p) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      p.name?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s) || p.client?.toLowerCase().includes(s);
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    const pType = getProjectTypeKey(p);
    const matchType = typeFilter === "ALL" || pType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">🏗️ إدارة المشاريع</h1>
          <p className="page-subtitle">عرض وإضافة ومتابعة كافة مشاريع الشركة مصنفة حسب نوع التشغيل والتعاقد</p>
        </div>
        <Link to="/projects/create" className="btn btn-primary">
          + إضافة مشروع جديد
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 بحث باسم المشروع، كود، أو العميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select className="form-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">🏷️ جميع أنواع المشاريع</option>
            <option value="GENERAL_CONTRACTING">🏢 مقاولات وتنفيذ شركات</option>
            <option value="SUPERVISOR_METER_RATE">📐 فرق سعر المتر لمشرف</option>
            <option value="INVESTMENT_PARTNERSHIP">🤝 استثماري وشراكة (+10%)</option>
          </select>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">📌 جميع الحالات</option>
            <option value="جاري">جاري</option>
            <option value="مخطط">مخطط</option>
            <option value="منتهي">منتهي</option>
            <option value="متوقف">متوقف</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <div className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري التحميل...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏗️</div>
              <div className="empty-state-text">
                {searchTerm || statusFilter !== "ALL" || typeFilter !== "ALL"
                  ? "لا توجد نتائج تطابق البحث والفلتر"
                  : "لم يتم إضافة مشاريع بعد"}
              </div>
              <Link to="/projects/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + إضافة أول مشروع
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>م.</th>
                  <th>الكود</th>
                  <th>اسم المشروع</th>
                  <th>نوع المشروع</th>
                  <th>العميل / الشركاء</th>
                  <th>المصروفات</th>
                  <th>قيمة العقد / المتر</th>
                  <th>تاريخ البداية</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const expenses = p.expenses?.reduce((s, e) => s + (e.amount || 0), 0) ?? 0;
                  const typeKey = getProjectTypeKey(p);
                  const typeConfig = PROJECT_TYPES_CONFIG[typeKey];

                  return (
                    <tr key={p.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                      <td><span className="badge badge-primary">{p.code}</span></td>
                      <td style={{ fontWeight: 700 }}>
                        <Link to={`/projects/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          {p.name}
                        </Link>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 800,
                            padding: "3px 9px",
                            borderRadius: "8px",
                            background: `${typeConfig.color}18`,
                            color: typeConfig.color,
                            border: `1px solid ${typeConfig.color}40`,
                          }}
                        >
                          <span>{typeConfig.icon}</span>
                          <span>{typeConfig.badge}</span>
                        </span>
                      </td>
                      <td>{p.client || "—"}</td>
                      <td className="text-danger" style={{ fontWeight: 800 }}>{formatCurrency(expenses)}</td>
                      <td className="text-gold" style={{ fontWeight: 800 }}>{formatCurrency(p.value)}</td>
                      <td>{formatDateShort(p.startDate)}</td>
                      <td>
                        <span className={`badge badge-${p.status === "جاري" ? "success" : p.status === "منتهي" ? "info" : p.status === "مخطط" ? "warning" : "danger"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Link to={`/projects/${p.id}`} className="btn-icon-centered" title="عرض تفاصيل المشروع">
                            👁️
                          </Link>
                          <Link to={`/projects/create?edit=${p.id}`} className="btn-icon-centered" title="تعديل المشروع">
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deletingId === p.id}
                            className="btn-icon-centered text-danger"
                            title="حذف"
                          >
                            {deletingId === p.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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
    </div>
  );
}

