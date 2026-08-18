"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function ReportsPage() {
  // Data lists for dropdowns
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [subDocs, setSubDocs] = useState<any[]>([]);

  // Form states for Card 1: Workers Reports
  const [selectedWorkerStatementId, setSelectedWorkerStatementId] = useState("");
  const [statementFromDate, setStatementFromDate] = useState("2026-07-01");
  const [statementToDate, setStatementToDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedWorkerDailyId, setSelectedWorkerDailyId] = useState("");

  // Form states for Card 2: Projects Reports
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectExpenseId, setSelectedProjectExpenseId] = useState("");

  // Form states for Card 3: Equipment Reports
  const [selectedEquipmentExpenseId, setSelectedEquipmentExpenseId] = useState("");

  // Form states for Card 4: Supervisor Reports
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState("كل الشهور");
  const [selectedSalaryYear, setSelectedSalaryYear] = useState("كل السنوات");

  // Form states for Card 5: Movement Reports
  const [dailyMoveDate, setDailyMoveDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthlyMoveMonth, setMonthlyMoveMonth] = useState("يوليو");
  const [monthlyMoveYear, setMonthlyMoveYear] = useState("2026");
  const [rangeFromDate, setRangeFromDate] = useState("2026-07-01");
  const [rangeToDate, setRangeToDate] = useState(new Date().toISOString().split("T")[0]);

  // Form states for NEW REQUIREMENT: Subcontractor Claims Reports
  const [subDocProjectId, setSubDocProjectId] = useState(""); // "" means ALL projects
  const [subDocSubcontractorId, setSubDocSubcontractorId] = useState(""); // "" means ALL subcontractors
  const [activeSubDocReport, setActiveSubDocReport] = useState<any>(null); // For active preview modal

  useEffect(() => {
    // Fetch dropdown data
    fetch("/api/workers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkers(data);
      })
      .catch(console.error);

    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.projects || [];
        setProjects(list);
      })
      .catch(console.error);

    fetch("/api/equipment")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.equipment || [];
        setEquipmentList(list);
      })
      .catch(console.error);

    fetch("/api/supervisors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSupervisors(data);
      })
      .catch(console.error);

    fetch("/api/subcontractors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSubcontractors(data);
      })
      .catch(console.error);

    fetch("/api/subcontractor-docs")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSubDocs(data);
      })
      .catch(console.error);
  }, []);

  const handlePrint = (reportTitle: string) => {
    window.print();
  };

  const handlePrintSubcontractorDocReport = () => {
    // Filter docs by chosen project & subcontractor
    const filtered = subDocs.filter((d) => {
      if (subDocProjectId && d.projectId !== subDocProjectId) return false;
      if (subDocSubcontractorId && d.subcontractorId !== subDocSubcontractorId) return false;
      return true;
    });

    const targetProject = projects.find((p) => p.id === subDocProjectId);
    const targetSub = subcontractors.find((s) => s.id === subDocSubcontractorId);

    setActiveSubDocReport({
      projectName: targetProject ? targetProject.name : "جميع المشاريع",
      subcontractorName: targetSub ? targetSub.name : "جميع المقاولين",
      docs: filtered,
    });

    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📊 التقارير والكشوفات الرسمية</h1>
          <p className="page-subtitle">استخراج وطباعة كشوفات مستخلصات مقاولو الباطن والحسابات والتقارير المالية</p>
        </div>
      </div>

      {/* GRID OF REPORT CARDS */}
      <div
        className="grid-2 print:hidden"
        style={{
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* ==================================================== */}
        {/* NEW REQUIREMENT CARD: تقارير مستخلصات مقاولو الباطن (GOLD HEADER) */}
        {/* ==================================================== */}
        <div className="card" style={{ gridColumn: "span 2", padding: 0, overflow: "hidden", border: "2px solid hsl(var(--gold))" }}>
          <div style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: "#fff" }}>تقرير مستخلصات مقاولو الباطن</h2>
                <span style={{ fontSize: 11, opacity: 0.9 }}>تحديد المشروع (أو كل المشاريع) والمقاول واحتساب المبالغ والمسدد والمتبقي</span>
              </div>
            </div>
            <span className="badge badge-warning" style={{ fontWeight: 800 }}>جديد 🌟</span>
          </div>

          <div style={{ padding: 20 }}>
            <div className="grid-3" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
                  تحديد المشروع <span className="text-danger">*</span>
                </label>
                <select
                  className="form-control"
                  style={{ fontWeight: 700 }}
                  value={subDocProjectId}
                  onChange={(e) => setSubDocProjectId(e.target.value)}
                >
                  <option value="">-- جميع المشاريع (كل المشاريع) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      🏗️ {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>تحديد مقاول الباطن</label>
                <select
                  className="form-control"
                  value={subDocSubcontractorId}
                  onChange={(e) => setSubDocSubcontractorId(e.target.value)}
                >
                  <option value="">-- جميع المقاولين --</option>
                  {subcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      🔧 {s.name} ({s.specialty || "أعمال عامة"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button
                  className="btn btn-gold"
                  style={{ width: "100%", padding: "11px 18px", fontSize: 14, fontWeight: 900, justifyContent: "center" }}
                  onClick={handlePrintSubcontractorDocReport}
                >
                  🖨️ طباعة تقرير المستخلصات
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 1: تقارير العمال (GREEN HEADER) */}
        {/* ==================================================== */}
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #10b98140" }}>
          <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>☘️</span>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>تقارير العمال</h2>
          </div>

          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <button
              className="btn btn-ghost"
              style={{
                width: "100%",
                border: "1.5px dashed #10b981",
                color: "#10b981",
                fontWeight: 800,
                justifyContent: "center",
                padding: "10px 14px",
              }}
              onClick={() => handlePrint("تقرير جميع العمال")}
            >
              🖨️ تقرير جميع العمال
            </button>

            <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📑</span>
                <span>كشف حساب عامل (يوميات + سلف + خصومات)</span>
              </div>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 13 }}
                  value={selectedWorkerStatementId}
                  onChange={(e) => setSelectedWorkerStatementId(e.target.value)}
                >
                  <option value="">اختر العامل...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.jobTitle || "عامل"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: 12 }}
                    value={statementFromDate}
                    onChange={(e) => setStatementFromDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: 12 }}
                    value={statementToDate}
                    onChange={(e) => setStatementToDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{
                  width: "100%",
                  background: "#10b981",
                  borderColor: "#10b981",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
                onClick={() => handlePrint("كشف حساب عامل")}
              >
                🖨️ طباعة كشف الحساب
              </button>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>تقرير يوميات عامل:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 13, flex: 1 }}
                  value={selectedWorkerDailyId}
                  onChange={(e) => setSelectedWorkerDailyId(e.target.value)}
                >
                  <option value="">جميع العمال</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  style={{ background: "#10b981", borderColor: "#10b981", whiteSpace: "nowrap" }}
                  onClick={() => handlePrint("تقرير يوميات عامل")}
                >
                  🖨️ طباعة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 2: تقارير المشاريع (BLUE HEADER) */}
        {/* ==================================================== */}
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #3b82f640" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>☁️</span>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>تقارير المشاريع العامة</h2>
          </div>

          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>تقرير مشروع محدد:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 13, flex: 1 }}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">اختر المشروع...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  style={{ background: "#3b82f6", borderColor: "#3b82f6", whiteSpace: "nowrap" }}
                  onClick={() => handlePrint("تقرير مشروع محدد")}
                >
                  🖨️ طباعة
                </button>
              </div>
            </div>

            <button
              className="btn btn-ghost"
              style={{
                width: "100%",
                border: "1.5px dashed #3b82f6",
                color: "#3b82f6",
                fontWeight: 800,
                justifyContent: "center",
                padding: "10px 14px",
              }}
              onClick={() => handlePrint("تقرير جميع المشاريع")}
            >
              🖨️ تقرير جميع المشاريع
            </button>

            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>تقرير مصروفات مشروع محدد:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 13, flex: 1 }}
                  value={selectedProjectExpenseId}
                  onChange={(e) => setSelectedProjectExpenseId(e.target.value)}
                >
                  <option value="">جميع المشاريع</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  style={{ background: "#3b82f6", borderColor: "#3b82f6", whiteSpace: "nowrap" }}
                  onClick={() => handlePrint("تقرير مصروفات مشروع محدد")}
                >
                  🖨️ طباعة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 3: تقارير المعدات (YELLOW HEADER) */}
        {/* ==================================================== */}
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #f59e0b40" }}>
          <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚚</span>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>تقارير المعدات</h2>
          </div>

          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <button
              className="btn btn-ghost"
              style={{
                width: "100%",
                border: "1.5px dashed #f59e0b",
                color: "#d97706",
                fontWeight: 800,
                justifyContent: "center",
                padding: "10px 14px",
              }}
              onClick={() => handlePrint("تقرير المعدات")}
            >
              🖨️ تقرير المعدات
            </button>

            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>تقرير مصروفات معدة:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 13, flex: 1 }}
                  value={selectedEquipmentExpenseId}
                  onChange={(e) => setSelectedEquipmentExpenseId(e.target.value)}
                >
                  <option value="">جميع المعدات</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code || ""})
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  style={{ background: "#f59e0b", borderColor: "#f59e0b", whiteSpace: "nowrap" }}
                  onClick={() => handlePrint("تقرير مصروفات معدة")}
                >
                  🖨️ طباعة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 4: تقارير المشرفين (PURPLE HEADER) */}
        {/* ==================================================== */}
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #8b5cf640" }}>
          <div style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>تقارير المشرفين</h2>
          </div>

          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <button
              className="btn btn-ghost"
              style={{
                width: "100%",
                border: "1.5px dashed #8b5cf6",
                color: "#8b5cf6",
                fontWeight: 800,
                justifyContent: "center",
                padding: "10px 14px",
              }}
              onClick={() => handlePrint("تقرير المشرفين")}
            >
              🖨️ تقرير المشرفين
            </button>

            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>تقرير الرواتب والتوزيع:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 13, flex: 1 }}
                  value={selectedSalaryMonth}
                  onChange={(e) => setSelectedSalaryMonth(e.target.value)}
                >
                  <option value="كل الشهور">كل الشهور</option>
                  <option value="1">يناير (1)</option>
                  <option value="2">فبراير (2)</option>
                  <option value="3">مارس (3)</option>
                  <option value="4">أبريل (4)</option>
                  <option value="5">مايو (5)</option>
                  <option value="6">يونيو (6)</option>
                  <option value="7">يوليو (7)</option>
                  <option value="8">أغسطس (8)</option>
                  <option value="9">سبتمبر (9)</option>
                  <option value="10">أكتوبر (10)</option>
                  <option value="11">نوفمبر (11)</option>
                  <option value="12">ديسمبر (12)</option>
                </select>

                <select
                  className="form-control"
                  style={{ fontSize: 13, flex: 1 }}
                  value={selectedSalaryYear}
                  onChange={(e) => setSelectedSalaryYear(e.target.value)}
                >
                  <option value="كل السنوات">كل السنوات</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>

                <button
                  className="btn btn-primary"
                  style={{ background: "#8b5cf6", borderColor: "#8b5cf6", whiteSpace: "nowrap" }}
                  onClick={() => handlePrint("تقرير رواتب المشرفين")}
                >
                  🖨️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE SUBCONTRACTOR DOCS REPORT LAYOUT */}
      {activeSubDocReport && (
        <div style={{ marginTop: 24 }} className="print-area">
          <div style={{ background: "hsl(var(--bg-elevated))", padding: 24, borderRadius: 16, border: "1px solid hsl(var(--border-subtle))" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid hsl(var(--gold))", paddingBottom: 14, marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: "hsl(var(--gold))", margin: 0 }}>
                  🏛️ الجبل الذهبي للمقاولات العامة
                </h1>
                <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                  📋 تقرير مستخلصات مقاولو الباطن ({activeSubDocReport.projectName})
                </h2>
                <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                  المقاول المستهدف: <strong>{activeSubDocReport.subcontractorName}</strong> | تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}
                </span>
              </div>
              <button className="btn btn-gold print:hidden" onClick={() => window.print()}>
                🖨️ طباعة هذا التقرير
              </button>
            </div>

            {/* Summary Stats */}
            {(() => {
              const totalAmount = activeSubDocReport.docs.reduce((acc: number, d: any) => acc + (d.amount || 0), 0);
              const paidAmount = activeSubDocReport.docs
                .filter((d: any) => d.status === "مدفوع")
                .reduce((acc: number, d: any) => acc + (d.amount || 0), 0);
              const remainingAmount = Math.max(0, totalAmount - paidAmount);

              return (
                <div className="grid-4" style={{ gap: 14, marginBottom: 20 }}>
                  <div style={{ background: "hsl(var(--bg-subtle))", padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي عدد المستخلصات</div>
                    <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{activeSubDocReport.docs.length} مستخلص</div>
                  </div>
                  <div style={{ background: "hsl(var(--bg-subtle))", padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي قيمة المستخلصات</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "hsl(var(--gold))", marginTop: 2 }}>{formatCurrency(totalAmount)}</div>
                  </div>
                  <div style={{ background: "hsl(var(--bg-subtle))", padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي المبالغ المسددة</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981", marginTop: 2 }}>{formatCurrency(paidAmount)}</div>
                  </div>
                  <div style={{ background: "hsl(var(--bg-subtle))", padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي المبالغ المتبقية</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#ef4444", marginTop: 2 }}>{formatCurrency(remainingAmount)}</div>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Table */}
            <div className="table-container">
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "hsl(var(--bg-subtle))" }}>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th>رقم المستخلص</th>
                    <th>اسم مقاول الباطن</th>
                    <th>المشروع التابع</th>
                    <th>نوع البند</th>
                    <th>البيان / الشرح</th>
                    <th>القيمة الإجمالية</th>
                    <th>تاريخ المستخلص</th>
                    <th style={{ textAlign: "center" }}>حالة التسديد</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubDocReport.docs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "hsl(var(--text-muted))" }}>
                        لا توجد مستخلصات مسجلة تطابق هذه المحددات
                      </td>
                    </tr>
                  ) : (
                    activeSubDocReport.docs.map((doc: any, idx: number) => (
                      <tr key={doc.id || idx}>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{doc.docNo || "SC00" + (idx + 1)}</td>
                        <td style={{ fontWeight: 700 }}>🔧 {doc.subcontractorName || doc.subcontractor?.name || "مقاول باطن"}</td>
                        <td>🏗️ {doc.projectName || doc.project?.name || "عام"}</td>
                        <td><span className="badge badge-info">{doc.type}</span></td>
                        <td>{doc.description || "-"}</td>
                        <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>{formatCurrency(doc.amount || 0)}</td>
                        <td>{doc.date ? formatDateShort(doc.date) : "-"}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`badge ${doc.status === "مدفوع" ? "badge-success" : "badge-danger"}`}>
                            {doc.status || "معلق"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
