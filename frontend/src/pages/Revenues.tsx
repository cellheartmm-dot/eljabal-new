import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Revenue {
  id: string;
  projectId?: string;
  source: string;
  type?: string;
  paymentMethod?: string;
  description?: string;
  amount: number;
  date: string;
  notes?: string;
  project?: { id: string; name: string; code: string };
}

export default function RevenuesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRevenues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Revenue")
        .select("*, project:Project(id, name, code)")
        .order("date", { ascending: false });

      if (error) throw error;
      setRevenues(data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل الإيرادات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenues();
  }, []);

  const totalRevenues = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);

  const filtered = revenues.filter((r) => {
    const s = searchTerm.toLowerCase();
    return (
      (r.source && r.source.toLowerCase().includes(s)) ||
      (r.description && r.description.toLowerCase().includes(s)) ||
      (r.project?.name && r.project.name.toLowerCase().includes(s))
    );
  });

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">💰 سجل الإيرادات والتحصيلات</h1>
          <p className="page-subtitle">متابعة كافة التحصيلات والدفعات المستلمة من الشركات المالكة والمصادر الأخرى</p>
        </div>
        <Link to="/revenues/create" className="btn btn-primary">
          + تسجيل دفعة إيراد جديدة
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>إجمالي الإيرادات والتحصيلات</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalRevenues)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{revenues.length} عملية تحصيل مسجلة</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 بحث في الإيرادات والبيان والمشروع..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
              <div className="empty-state-icon">💰</div>
              <div className="empty-state-text">لا توجد إيرادات مسجلة تطابق البحث</div>
              <Link to="/revenues/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + تسجيل أول دفعة
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>م.</th>
                  <th>التاريخ</th>
                  <th>المشروع / الجهة</th>
                  <th>المصدر</th>
                  <th>النوع</th>
                  <th>البيان</th>
                  <th>طريقة الدفع</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(r.date)}</td>
                    <td style={{ fontWeight: 700 }}>{r.project?.name || "عام / غير محدد"}</td>
                    <td>{r.source || "الشركة المالكة"}</td>
                    <td><span className="badge badge-info">{r.type || "مستخلص"}</span></td>
                    <td>{r.description || r.notes || "—"}</td>
                    <td>{r.paymentMethod || "تحويل بنكي"}</td>
                    <td style={{ fontWeight: 800, color: "#10b981", fontSize: 14 }}>{formatCurrency(r.amount)}</td>
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
