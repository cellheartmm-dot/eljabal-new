"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function AccountsPage() {
  const [loading, setLoading] = useState(true);

  // Raw fetched datasets
  const [projects, setProjects] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<any[]>([]);
  const [workerDailies, setWorkerDailies] = useState<any[]>([]);
  const [workerAdvances, setWorkerAdvances] = useState<any[]>([]);
  const [supervisorSalaries, setSupervisorSalaries] = useState<any[]>([]);
  const [subDocs, setSubDocs] = useState<any[]>([]);
  const [equipmentExpenses, setEquipmentExpenses] = useState<any[]>([]);
  const [generalExpenses, setGeneralExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllFinancialData = async () => {
      setLoading(true);
      try {
        const [pRes, rRes, peRes, wdRes, waRes, ssRes, sdRes, eeRes, geRes] = await Promise.all([
          fetch("/api/projects").then((r) => r.json()).catch(() => []),
          fetch("/api/revenues").then((r) => r.json()).catch(() => []),
          fetch("/api/project-expenses").then((r) => r.json()).catch(() => []),
          fetch("/api/worker-daily").then((r) => r.json()).catch(() => []),
          fetch("/api/worker-advances").then((r) => r.json()).catch(() => []),
          fetch("/api/supervisor-salaries").then((r) => r.json()).catch(() => []),
          fetch("/api/subcontractor-docs").then((r) => r.json()).catch(() => []),
          fetch("/api/equipment-expenses").then((r) => r.json()).catch(() => []),
          fetch("/api/general-expenses").then((r) => r.json()).catch(() => []),
        ]);

        const pList = Array.isArray(pRes) ? pRes : pRes?.projects || [];
        setProjects(pList);
        if (Array.isArray(rRes)) setRevenues(rRes);
        if (Array.isArray(peRes)) setProjectExpenses(peRes);
        if (Array.isArray(wdRes)) setWorkerDailies(wdRes);
        if (Array.isArray(waRes)) setWorkerAdvances(waRes);
        if (Array.isArray(ssRes)) setSupervisorSalaries(ssRes);
        if (Array.isArray(sdRes)) setSubDocs(sdRes);
        if (Array.isArray(eeRes)) setEquipmentExpenses(eeRes);
        if (Array.isArray(geRes)) setGeneralExpenses(geRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAllFinancialData();
  }, []);

  // 1. Calculations for Financial Summary Cards
  const totalRevenuesVal = revenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  // Project Expenses (materials, direct project costs, auto-allocated supervisor & equipment costs)
  const totalProjExpVal = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Worker Dailies & Advances
  const totalWorkerDailiesVal = workerDailies.reduce((sum, w) => sum + (parseFloat(w.dailyRate) || parseFloat(w.amount) || 0), 0);
  const totalWorkerAdvancesVal = workerAdvances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

  // Supervisor Monthly Salaries
  const totalSupervisorSalariesVal = supervisorSalaries.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  // Subcontractor Docs & Claims
  const totalSubDocsVal = subDocs.reduce((sum, d) => sum + (parseFloat(d.totalAmount) || parseFloat(d.amount) || 0), 0);
  const totalSubPaidVal = subDocs.reduce((sum, d) => {
    if (d.status === "مدفوع") return sum + (parseFloat(d.totalAmount) || parseFloat(d.amount) || 0);
    return sum + (parseFloat(d.paidAmount) || 0);
  }, 0);
  const totalSubRemainingVal = Math.max(0, totalSubDocsVal - totalSubPaidVal);

  // General Equipment Expenses (without project allocation to prevent double-counting)
  const unallocatedEquipExpenses = equipmentExpenses.filter((e) => !e.projectId || e.projectName === "معدة عامة / بدون مشروع");
  const totalGenEquipExpVal = unallocatedEquipExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalAllEquipExpVal = equipmentExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // General Corporate Expenses
  const totalGenExpVal = generalExpenses.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);

  // Total System Costs
  const totalCostsVal =
    totalProjExpVal +
    totalWorkerDailiesVal +
    totalWorkerAdvancesVal +
    totalSubDocsVal +
    totalGenEquipExpVal +
    totalGenExpVal;

  const netProfitLoss = totalRevenuesVal - totalCostsVal;
  const dailiesAndSalariesVal = totalWorkerDailiesVal + totalWorkerAdvancesVal + totalSupervisorSalariesVal;

  // 2. Monthly Cash Flow Data for 2026
  const monthsNames = [
    "يناير 2026", "فبراير 2026", "مارس 2026", "أبريل 2026",
    "مايو 2026", "يونيو 2026", "يوليو 2026", "أغسطس 2026",
    "سبتمبر 2026", "أكتوبر 2026", "نوفمبر 2026", "ديسمبر 2026"
  ];

  const monthlyData = monthsNames.map((monthName, mIdx) => {
    const mRevs = revenues
      .filter((r) => new Date(r.date || r.createdAt).getMonth() === mIdx)
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const mPE = projectExpenses
      .filter((e) => new Date(e.date || e.createdAt).getMonth() === mIdx)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const mWD = workerDailies
      .filter((w) => new Date(w.date || w.createdAt).getMonth() === mIdx)
      .reduce((sum, w) => sum + (parseFloat(w.dailyRate) || parseFloat(w.amount) || 0), 0);

    const mWA = workerAdvances
      .filter((a) => new Date(a.date || a.createdAt).getMonth() === mIdx)
      .reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    const mSD = subDocs
      .filter((d) => new Date(d.date || d.createdAt).getMonth() === mIdx)
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) || parseFloat(d.amount) || 0), 0);

    const mEE = unallocatedEquipExpenses
      .filter((e) => new Date(e.date || e.createdAt).getMonth() === mIdx)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const mGE = generalExpenses
      .filter((g) => new Date(g.date || g.createdAt).getMonth() === mIdx)
      .reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);

    const mCosts = mPE + mWD + mWA + mSD + mEE + mGE;
    const mNet = mRevs - mCosts;

    return {
      month: monthName,
      revenues: mRevs,
      costs: mCosts,
      net: mNet,
    };
  });

  // 3. Project Summary Matrix (Accurate cost breakdown per project)
  const projectSummaries = projects.map((p) => {
    const pRevs = revenues.filter((r) => r.projectId === p.id).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const pPE = projectExpenses.filter((e) => e.projectId === p.id).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const pWD = workerDailies.filter((w) => w.projectId === p.id).reduce((sum, w) => sum + (parseFloat(w.dailyRate) || parseFloat(w.amount) || 0), 0);
    const pWA = workerAdvances.filter((a) => a.projectId === p.id).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const pSD = subDocs.filter((d) => d.projectId === p.id).reduce((sum, d) => sum + (parseFloat(d.totalAmount) || parseFloat(d.amount) || 0), 0);

    const pTotalCost = pPE + pWD + pWA + pSD;
    const pNet = pRevs - pTotalCost;

    return {
      id: p.id,
      name: p.name,
      status: p.status || "جاري",
      revenues: pRevs,
      projExpenses: pPE,
      dailies: pWD + pWA,
      subcontractors: pSD,
      totalCost: pTotalCost,
      net: pNet,
    };
  });

  // 4. Combined Financial Transactions Log (All 8 Financial Sources)
  const allTransactions: any[] = [];

  revenues.forEach((r) => {
    allTransactions.push({
      id: "rev-" + r.id,
      date: r.date || r.createdAt,
      type: "إيراد مقبوض",
      isRevenue: true,
      description: `${r.type || "إيراد"} - ${r.projectName || r.project?.name || "مشروع"} ${r.description ? " | " + r.description : ""}`,
      amount: parseFloat(r.amount) || 0,
    });
  });

  projectExpenses.forEach((e) => {
    allTransactions.push({
      id: "pe-" + e.id,
      date: e.date || e.createdAt,
      type: "مصروف مشروع",
      isRevenue: false,
      description: `${e.type || "مصروف"} - ${e.projectName || e.project?.name || "مشروع"} | ${e.description || ""}`,
      amount: parseFloat(e.amount) || 0,
    });
  });

  workerDailies.forEach((w) => {
    allTransactions.push({
      id: "wd-" + w.id,
      date: w.date || w.createdAt,
      type: "يومية عمالة",
      isRevenue: false,
      description: `يومية العامل: ${w.workerName || "عامل"} | ${w.projectName || "موقع"} | ${w.notes || "أعمال موقع"}`,
      amount: parseFloat(w.dailyRate) || parseFloat(w.amount) || 0,
    });
  });

  workerAdvances.forEach((a) => {
    allTransactions.push({
      id: "wa-" + a.id,
      date: a.date || a.createdAt,
      type: "سلفة عمالة",
      isRevenue: false,
      description: `سلفة العامل: ${a.workerName || "عامل"} | ${a.notes || "سلفة مسبقة"}`,
      amount: parseFloat(a.amount) || 0,
    });
  });

  supervisorSalaries.forEach((s) => {
    allTransactions.push({
      id: "ss-" + s.id,
      date: s.paidAt || s.createdAt,
      type: "راتب مشرف",
      isRevenue: false,
      description: `راتب المشرف: ${s.supervisorName || "مشرف"} | الشهر: ${s.month || ""}`,
      amount: parseFloat(s.amount) || 0,
    });
  });

  subDocs.forEach((d) => {
    allTransactions.push({
      id: "sd-" + d.id,
      date: d.date || d.createdAt,
      type: "مستخلص مقاول",
      isRevenue: false,
      description: `مستخلص رقم (${d.docNo || ""}) | المقاول: ${d.subcontractorName || "مقاول باطن"} | المشروع: ${d.projectName || "عام"}`,
      amount: parseFloat(d.totalAmount) || parseFloat(d.amount) || 0,
    });
  });

  equipmentExpenses.forEach((e) => {
    allTransactions.push({
      id: "ee-" + e.id,
      date: e.date || e.createdAt,
      type: "مصروف معدات",
      isRevenue: false,
      description: `معدة: ${e.equipmentName || "معدة"} | ${e.projectName ? "موقع: " + e.projectName + " | " : ""}${e.type || ""} | ${e.description || ""}`,
      amount: parseFloat(e.amount) || 0,
    });
  });

  generalExpenses.forEach((g) => {
    allTransactions.push({
      id: "ge-" + g.id,
      date: g.date || g.createdAt,
      type: "مصروف عام",
      isRevenue: false,
      description: `مصروف عام: ${g.type || ""} | ${g.description || ""}`,
      amount: parseFloat(g.amount) || 0,
    });
  });

  // Sort transactions chronologically descending
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🧾 الحسابات والمركز المالي الشامل</h1>
          <p className="page-subtitle">تجميع وتسميع تلقائي موحد لكافة الإيرادات وتكاليف المشاريع والعمالة والمعدات والمصروفات</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ طباعة السجل والتقرير المالي
          </button>
        </div>
      </div>

      {/* SECTION 1: TOP 4 STATS CARDS */}
      <div
        className="print:hidden"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          alignItems: "stretch",
        }}
      >
        {/* 1. إجمالي الإيرادات */}
        <div
          style={{
            flex: "1 1 220px",
            minWidth: 220,
            background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
            color: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي الإيرادات المقبوضة</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalRevenuesVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع المقبوضات والدفعات الواردة بالنظام</div>
        </div>

        {/* 2. إجمالي التكاليف */}
        <div
          style={{
            flex: "1 1 220px",
            minWidth: 220,
            background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            color: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي التكاليف والمصروفات</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalCostsVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع المصروفات واليوميات والمستخلصات والمعدات</div>
        </div>

        {/* 3. صافي الأرباح / الخسارة */}
        <div
          style={{
            flex: "1 1 220px",
            minWidth: 220,
            background: netProfitLoss >= 0 ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            color: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: netProfitLoss >= 0 ? "0 4px 12px rgba(59, 130, 246, 0.2)" : "0 4px 12px rgba(220, 38, 38, 0.2)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{netProfitLoss >= 0 ? "صافي الأرباح" : "صافي الخسارة"}</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(Math.abs(netProfitLoss))}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{netProfitLoss >= 0 ? "الصافي الإيجابي الفعلي" : "العجز / صافي الخسارة المالية"}</div>
        </div>

        {/* 4. إجمالي الرواتب والعمالة */}
        <div
          style={{
            flex: "1 1 220px",
            minWidth: 220,
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>يوميات ورواتب الكوادر</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(dailiesAndSalariesVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>يوميات وسلف العمال + رواتب المشرفين</div>
        </div>
      </div>

      {/* SECTION 2: DETAILED COST BREAKDOWN */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">📊 تفصيل التكاليف والمصروفات بالكامل</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>#</th>
                <th>بند التكلفة والمصروف</th>
                <th>المبلغ المستقطع (EGP)</th>
                <th>النسبة من إجمالي التكاليف</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700 }}>1</td>
                <td style={{ fontWeight: 700 }}>مصروفات المشاريع (مواد، خامات، معدات بالموقع، رواتب مخصصة)</td>
                <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(totalProjExpVal)}</td>
                <td><span className="badge badge-info">{totalCostsVal > 0 ? ((totalProjExpVal / totalCostsVal) * 100).toFixed(1) : 0}%</span></td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700 }}>2</td>
                <td style={{ fontWeight: 700 }}>يوميات وسلف عمالة الموقع</td>
                <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(totalWorkerDailiesVal + totalWorkerAdvancesVal)}</td>
                <td><span className="badge badge-info">{totalCostsVal > 0 ? (((totalWorkerDailiesVal + totalWorkerAdvancesVal) / totalCostsVal) * 100).toFixed(1) : 0}%</span></td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700 }}>3</td>
                <td style={{ fontWeight: 700 }}>رواتب ومكافآت المشرفين</td>
                <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(totalSupervisorSalariesVal)}</td>
                <td><span className="badge badge-info">{totalCostsVal > 0 ? ((totalSupervisorSalariesVal / totalCostsVal) * 100).toFixed(1) : 0}%</span></td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700 }}>4</td>
                <td style={{ fontWeight: 700 }}>مستخلصات وعقود مقاولي الباطن</td>
                <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(totalSubDocsVal)}</td>
                <td><span className="badge badge-info">{totalCostsVal > 0 ? ((totalSubDocsVal / totalCostsVal) * 100).toFixed(1) : 0}%</span></td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700 }}>5</td>
                <td style={{ fontWeight: 700 }}>مصروفات أسطول المعدات العامة (وقود وصيانة)</td>
                <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(totalAllEquipExpVal)}</td>
                <td><span className="badge badge-info">{totalCostsVal > 0 ? ((totalAllEquipExpVal / totalCostsVal) * 100).toFixed(1) : 0}%</span></td>
              </tr>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700 }}>6</td>
                <td style={{ fontWeight: 700 }}>المصروفات العامة والإدارية للمقر</td>
                <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(totalGenExpVal)}</td>
                <td><span className="badge badge-info">{totalCostsVal > 0 ? ((totalGenExpVal / totalCostsVal) * 100).toFixed(1) : 0}%</span></td>
              </tr>
              <tr style={{ background: "hsl(var(--bg-elevated))", borderTop: "2px solid hsl(var(--gold))" }}>
                <td colSpan={2} style={{ fontWeight: 900, fontSize: 15 }}>الإجمالي الكلي للتكاليف:</td>
                <td style={{ fontWeight: 900, color: "#ef4444", fontSize: 18 }}>{formatCurrency(totalCostsVal)}</td>
                <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: MONTHLY CASH FLOW - 2026 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">📅 التدفقات المالية والحركة الشهرية - 2026</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الشهر</th>
                <th>الإيرادات المقبوضة</th>
                <th>إجمالي التكاليف والمصروفات</th>
                <th>الصافي (أرباح / خسائر)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{m.month}</td>
                  <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(m.revenues)}</td>
                  <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(m.costs)}</td>
                  <td style={{ fontWeight: 900, color: m.net >= 0 ? "#10b981" : "#ef4444" }}>
                    {formatCurrency(m.net)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "hsl(var(--bg-elevated))", borderTop: "2px solid hsl(var(--border-subtle))" }}>
                <td style={{ fontWeight: 900, fontSize: 15 }}>المجموع الكلي:</td>
                <td style={{ fontWeight: 900, color: "#10b981", fontSize: 16 }}>{formatCurrency(totalRevenuesVal)}</td>
                <td style={{ fontWeight: 900, color: "#ef4444", fontSize: 16 }}>{formatCurrency(totalCostsVal)}</td>
                <td style={{ fontWeight: 900, color: netProfitLoss >= 0 ? "#10b981" : "#ef4444", fontSize: 16 }}>
                  {formatCurrency(netProfitLoss)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: PROJECT COST BREAKDOWN MATRIX */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">🏢 ملخص التكاليف والربحية لكل مشروع على حدة</h2>
        </div>
        <div className="table-container">
          {projects.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>لا توجد مشاريع مسجلة حالياً</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th>الإيرادات</th>
                  <th>م.مشروع (مواد/معدات/رواتب)</th>
                  <th>يوميات وسلف العمال</th>
                  <th>مستخلصات المقاولين</th>
                  <th>إجمالي التكلفة</th>
                  <th>الصافي والربحية</th>
                </tr>
              </thead>
              <tbody>
                {projectSummaries.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>{p.name}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${p.status === "مكتمل" ? "badge-success" : "badge-info"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(p.revenues)}</td>
                    <td>{formatCurrency(p.projExpenses)}</td>
                    <td>{formatCurrency(p.dailies)}</td>
                    <td>{formatCurrency(p.subcontractors)}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(p.totalCost)}</td>
                    <td style={{ fontWeight: 900, color: p.net >= 0 ? "#10b981" : "#ef4444" }}>
                      {formatCurrency(p.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 5: SUBCONTRACTORS CLAIMS SUMMARY */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>📜 مستخلصات المقاولين والالتزامات المالية</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
          <div style={{ flex: "1 1 220px", minWidth: 220, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>إجمالي المستخلصات والعقود:</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "hsl(var(--gold))", marginTop: 4 }}>{formatCurrency(totalSubDocsVal)}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>القيمة الكلية المعتمدة للمستخلصات والعقود</div>
          </div>

          <div style={{ flex: "1 1 220px", minWidth: 220, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>المدفوع للمقاولين:</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#10b981", marginTop: 4 }}>{formatCurrency(totalSubPaidVal)}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>مجموع المبالغ المسددة بالفعل للمقاولين</div>
          </div>

          <div style={{ flex: "1 1 220px", minWidth: 220, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>المتبقي المستحق عليهم / لهم:</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444", marginTop: 4 }}>{formatCurrency(totalSubRemainingVal)}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>المبالغ المتبقية المستحقة غير المسددة</div>
          </div>
        </div>
      </div>

      {/* SECTION 6: FULL FINANCIAL TRANSACTIONS LOG WITH PRINT */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="card-title">📜 سجل المعاملات والسيولة الكلية ({allTransactions.length} حركة)</h2>
          <button className="btn btn-primary btn-sm print:hidden" onClick={() => window.print()}>
            🖨️ طباعة السجل الكامل
          </button>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجل الحركات المالية...</div>
            </div>
          ) : allTransactions.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>لا توجد حركات مالية مسجلة بالنظام</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th style={{ textAlign: "center" }}>النوع</th>
                  <th>البيان والشرح</th>
                  <th style={{ textAlign: "left" }}>المبلغ (EGP)</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(tx.date)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${tx.isRevenue ? "badge-success" : "badge-warning"}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{tx.description}</td>
                    <td style={{ textAlign: "left", fontWeight: 900, color: tx.isRevenue ? "#10b981" : "#ef4444" }}>
                      {tx.isRevenue ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
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
