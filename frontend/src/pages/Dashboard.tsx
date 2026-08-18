import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";

interface Stats {
  projectsCount: number;
  activeProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  workersCount: number;
  employeesCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    projectsCount: 0,
    activeProjects: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    workersCount: 0,
    employeesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("Project").select("id, status"),
      supabase.from("Revenue").select("amount"),
      supabase.from("ProjectExpense").select("amount"),
      supabase.from("Worker").select("id"),
      supabase.from("Employee").select("id"),
    ])
      .then(([projRes, revRes, expRes, workerRes, empRes]) => {
        const projects = projRes.data || [];
        const revenues = revRes.data || [];
        const expenses = expRes.data || [];
        const workers = workerRes.data || [];
        const employees = empRes.data || [];

        const totalRev = revenues.reduce((s: number, r: any) => s + (r.amount || 0), 0);
        const totalExp = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

        setStats({
          projectsCount: projects.length,
          activeProjects: projects.filter((p: any) => p.status === "جاري").length,
          totalRevenue: totalRev,
          totalExpenses: totalExp,
          workersCount: workers.length,
          employeesCount: employees.length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "إجمالي المشاريع", value: stats.projectsCount, icon: "🏗️", color: "primary" },
    { label: "المشاريع الجارية", value: stats.activeProjects, icon: "⚡", color: "success" },
    { label: "إجمالي الإيرادات", value: formatCurrency(stats.totalRevenue), icon: "💰", color: "gold" },
    { label: "إجمالي المصروفات", value: formatCurrency(stats.totalExpenses), icon: "💸", color: "danger" },
    { label: "العمال المسجلون", value: stats.workersCount, icon: "👷", color: "info" },
    { label: "الموظفون (HR)", value: stats.employeesCount, icon: "👥", color: "warning" },
  ];

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: 300 }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل لوحة التحكم...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 لوحة التحكم</h1>
          <p className="page-subtitle">نظرة عامة على أداء الشركة</p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card stat-card-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
