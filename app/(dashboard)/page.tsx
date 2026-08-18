import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 0; // Dynamic rendering for fresh dashboard stats

export default async function DashboardPage() {
  let totalProjectsCount = 0;
  let activeProjectsCount = 0;
  let activeSupervisorsCount = 0;
  let activeWorkersCount = 0;
  let totalExpenses = 0;
  let totalRevenues = 0;
  let runningProjects: any[] = [];
  let recentProjectExpenses: any[] = [];

  try {
    const [
      totalProjects,
      activeProjects,
      activeSupervisors,
      activeWorkers,
      totalExpensesAgg,
      totalRevenuesAgg,
      rProjects,
      rExpenses
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: "جاري" } }),
      prisma.supervisor.count({ where: { isActive: true } }),
      prisma.worker.count({ where: { isActive: true } }),
      prisma.projectExpense.aggregate({ _sum: { amount: true } }),
      prisma.revenue.aggregate({ _sum: { amount: true } }),
      prisma.project.findMany({
        where: { status: "جاري" },
        take: 5,
        include: {
          expenses: { select: { amount: true } },
          revenues: { select: { amount: true } }
        }
      }),
      prisma.projectExpense.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { project: { select: { name: true } } }
      })
    ]);

    totalProjectsCount = totalProjects;
    activeProjectsCount = activeProjects;
    activeSupervisorsCount = activeSupervisors;
    activeWorkersCount = activeWorkers;
    totalExpenses = totalExpensesAgg._sum.amount || 0;
    totalRevenues = totalRevenuesAgg._sum.amount || 0;
    runningProjects = rProjects;
    recentProjectExpenses = rExpenses;
  } catch (e) {
    console.error("Dashboard fetch error:", e);
  }

  const netProfitLoss = totalRevenues - totalExpenses;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">أهلاً بك في نظام إدارة المقاولات - الجبل الذهبي</p>
        </div>
      </div>

      {/* Top 4 Rich Gradient Colorful Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-card-top-row">
            <div className="stat-card-label">إجمالي المشاريع</div>
            <div className="stat-card-icon-wrap">🏗️</div>
          </div>
          <div className="stat-card-value">{totalProjectsCount}</div>
          <div className="stat-card-sub">جاري: {activeProjectsCount} | منتهي: {totalProjectsCount - activeProjectsCount}</div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-card-top-row">
            <div className="stat-card-label">عدد العمال النشطين</div>
            <div className="stat-card-icon-wrap">👷</div>
          </div>
          <div className="stat-card-value">{activeWorkersCount}</div>
          <div className="stat-card-sub">مقدمي الخدمة اليومية</div>
        </div>

        <div className="stat-card stat-card-purple">
          <div className="stat-card-top-row">
            <div className="stat-card-label">عدد المشرفين النشطين</div>
            <div className="stat-card-icon-wrap">👔</div>
          </div>
          <div className="stat-card-value">{activeSupervisorsCount}</div>
          <div className="stat-card-sub">متابعة مواقع العمل</div>
        </div>

        <div className="stat-card stat-card-orange">
          <div className="stat-card-top-row">
            <div className="stat-card-label">إجمالي المصروفات</div>
            <div className="stat-card-icon-wrap">💸</div>
          </div>
          <div className="stat-card-value">{formatCurrency(totalExpenses)}</div>
          <div className="stat-card-sub">مشاريع وعامة ومعدات</div>
        </div>
      </div>

      {/* Second Row Gradient Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="stat-card stat-card-cyan">
          <div className="stat-card-label">إجمالي الإيرادات</div>
          <div className="stat-card-value" style={{ marginTop: "10px" }}>{formatCurrency(totalRevenues)}</div>
        </div>

        <div className={`stat-card ${netProfitLoss >= 0 ? "stat-card-green" : "stat-card-red"}`}>
          <div className="stat-card-label">صافي (الربح / الخسارة)</div>
          <div className="stat-card-value" style={{ marginTop: "10px" }}>
            {formatCurrency(netProfitLoss)}
          </div>
        </div>

        <div className="stat-card stat-card-indigo">
          <div className="stat-card-label">المشاريع الجارية</div>
          <div className="stat-card-value" style={{ marginTop: "10px" }}>{activeProjectsCount}</div>
        </div>
      </div>

      {/* Main Grid: Projects Table + Recent Activities */}
      <div className="grid-2" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px", marginTop: "24px" }}>
        {/* Active Projects Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🏗️ المشاريع الجارية</h2>
            <Link href="/projects" className="btn btn-ghost btn-sm">عرض الكل</Link>
          </div>
          <div className="table-container">
            {runningProjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏗️</div>
                <div className="empty-state-text">لا توجد مشاريع جارية حالياً</div>
                <Link href="/projects" className="btn btn-primary btn-sm" style={{ marginTop: "12px" }}>+ إضافة مشروع</Link>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>المشروع</th>
                    <th>العميل</th>
                    <th>المصروفات</th>
                    <th>قيمة العقد</th>
                  </tr>
                </thead>
                <tbody>
                  {runningProjects.map((p) => {
                    const projectExpSum = p.expenses ? p.expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0;
                    return (
                      <tr key={p.id}>
                        <td><span className="badge badge-primary">{p.code}</span></td>
                        <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{p.name}</td>
                        <td>{p.client}</td>
                        <td className="text-danger">{formatCurrency(projectExpSum)}</td>
                        <td className="text-gold" style={{ fontWeight: 700 }}>{formatCurrency(p.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Operations Log */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⏱️ آخر المصروفات</h2>
            <Link href="/project-expenses" className="btn btn-ghost btn-sm">الحسابات</Link>
          </div>
          <div className="card-body" style={{ padding: "12px" }}>
            {recentProjectExpenses.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 10px" }}>
                <div className="empty-state-text">لا توجد عمليات مسجلة حديثاً</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentProjectExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "hsl(var(--bg-elevated))",
                      border: "1px solid hsl(var(--border-subtle))"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>{exp.description}</div>
                      <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>{exp.project?.name || "مشروع"} • {exp.type}</div>
                    </div>
                    <div className="text-danger" style={{ fontWeight: 800, fontSize: "13px" }}>
                      {formatCurrency(exp.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
