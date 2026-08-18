"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

const expenseTypes = [
  "مواد بناء",
  "حديد وأسمنت",
  "نجارة",
  "سباكة",
  "كهرباء",
  "بلاط وتشطيبات",
  "حفر وتربة",
  "معدات",
  "مقاولات فرعية",
  "أخرى",
];

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("data");
  const [phasesList, setPhasesList] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);

  // Edit phase modal states
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [editModelName, setEditModelName] = useState("");
  const [editPhaseName, setEditPhaseName] = useState("");
  const [editUnit, setEditUnit] = useState("م² (متر مربع)");
  const [editProgressPercent, setEditProgressPercent] = useState("0");
  const [editNotes, setEditNotes] = useState("");
  const [editBuildings, setEditBuildings] = useState<any[]>([]);

  // Edit expense modal states
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editExpType, setEditExpType] = useState("مواد بناء");
  const [editExpAmount, setEditExpAmount] = useState("");
  const [editExpDescription, setEditExpDescription] = useState("");
  const [savingExp, setSavingExp] = useState(false);

  const [projectFilesList, setProjectFilesList] = useState<any[]>([]);
  const [uploadingProjectFile, setUploadingProjectFile] = useState(false);

  // Investors State & Handlers
  const [investorsList, setInvestorsList] = useState<any[]>([]);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<any>(null);
  const [invName, setInvName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invSharePercent, setInvSharePercent] = useState("50");
  const [invCapital, setInvCapital] = useState("0");

  const saveInvestorsToStorage = (newList: any[]) => {
    setInvestorsList(newList);
    try {
      localStorage.setItem(`investors_${projectId}`, JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAddInvestor = () => {
    setEditingInvestor(null);
    setInvName("");
    setInvPhone("");
    setInvSharePercent("50");
    setInvCapital("0");
    setShowInvestorModal(true);
  };

  const handleSaveInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName) return;

    if (editingInvestor) {
      const updated = investorsList.map((inv) =>
        inv.id === editingInvestor.id
          ? {
              ...inv,
              name: invName,
              phone: invPhone,
              sharePercent: parseFloat(invSharePercent) || 0,
              initialCapital: parseFloat(invCapital) || 0,
            }
          : inv
      );
      saveInvestorsToStorage(updated);
    } else {
      const newInv = {
        id: "inv-" + Date.now(),
        name: invName,
        phone: invPhone,
        sharePercent: parseFloat(invSharePercent) || 0,
        initialCapital: parseFloat(invCapital) || 0,
      };
      saveInvestorsToStorage([...investorsList, newInv]);
    }
    setShowInvestorModal(false);
  };

  const handleDeleteInvestor = (invId: string, name: string) => {
    if (!confirm(`هل أنت تأكد من حذف المستثمر (${name}) من المشروع؟`)) return;
    const updated = investorsList.filter((inv) => inv.id !== invId);
    saveInvestorsToStorage(updated);
  };

  const fetchProjectFiles = async () => {
    try {
      const res = await fetch(`/api/project-files?projectId=${projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) setProjectFilesList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // 1. Fetch project info
      const res = await fetch("/api/projects");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.projects || [];
      const found = list.find((p: any) => p.id === projectId);
      setProject(found || null);

      // 2. Fetch project phases live from API & LocalStorage
      let apiPhases: any[] = [];
      try {
        const pRes = await fetch(`/api/project-phases?projectId=${projectId}`);
        const pData = await pRes.json();
        if (Array.isArray(pData)) apiPhases = pData;
      } catch (e) {
        console.error(e);
      }

      let localPhases: any[] = [];
      try {
        const stored = localStorage.getItem(`phases_${projectId}`);
        if (stored) localPhases = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }

      const combinedPhases = [...apiPhases];
      localPhases.forEach((lp) => {
        if (!combinedPhases.some((cp) => cp.id === lp.id)) {
          combinedPhases.push(lp);
        }
      });
      setPhasesList(combinedPhases);

      // 3. Fetch project expenses
      try {
        const expRes = await fetch("/api/project-expenses");
        const expData = await expRes.json();
        if (Array.isArray(expData)) {
          const filteredExp = expData.filter((e: any) => e.projectId === projectId);
          setExpensesList(filteredExp);
        }
      } catch (e) {
        console.error(e);
      }

      // 4. Fetch project files
      fetchProjectFiles();

      // 5. Fetch project investors
      try {
        const storedInv = localStorage.getItem(`investors_${projectId}`);
        if (storedInv) {
          setInvestorsList(JSON.parse(storedInv));
        } else {
          setInvestorsList([
            { id: "inv-1", name: "م. أحمد محمود", sharePercent: 50, phone: "01012345678", initialCapital: 100000 }
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProjectFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("projectId", projectId);
        fd.append("file", files[i]);
        await fetch("/api/project-files", { method: "POST", body: fd }).catch(console.error);
      }
      fetchProjectFiles();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingProjectFile(false);
    }
  };

  const handleDeleteProjectFile = async (fileKey: string, filename: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف ملف (${filename}) من ملفات المشروع؟`)) return;

    try {
      const res = await fetch(`/api/project-files?key=${encodeURIComponent(fileKey)}`, { method: "DELETE" });
      if (res.ok) {
        setProjectFilesList((prev) => prev.filter((f) => f.key !== fileKey && f.id !== fileKey));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Handlers for Phase Delete and Edit
  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف هذه المرحلة؟")) return;

    try {
      await fetch(`/api/project-phases?id=${phaseId}`, { method: "DELETE" }).catch(console.error);

      try {
        const stored = localStorage.getItem(`phases_${projectId}`);
        if (stored) {
          const list = JSON.parse(stored).filter((p: any) => p.id !== phaseId);
          localStorage.setItem(`phases_${projectId}`, JSON.stringify(list));
        }
      } catch (e) {
        console.error(e);
      }

      setPhasesList((prev) => prev.filter((p) => p.id !== phaseId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditPhase = (phase: any) => {
    setEditingPhase(phase);
    setEditModelName(phase.modelName || "");
    setEditPhaseName(phase.phaseName || "");
    setEditUnit(phase.unit || "م² (متر مربع)");
    setEditProgressPercent(phase.progressPercent?.toString() || "0");
    setEditNotes(phase.notes || "");
    setEditBuildings(
      phase.buildings && phase.buildings.length > 0
        ? JSON.parse(JSON.stringify(phase.buildings))
        : [{ id: "1", buildingName: "عمارة 1", totalQty: phase.totalSurveyedQty || 0, unit: "م²", notes: "" }]
    );
  };

  const handleAddEditBuilding = () => {
    setEditBuildings([
      ...editBuildings,
      {
        id: Date.now().toString(),
        buildingName: `عمارة ${editBuildings.length + 1}`,
        totalQty: 0,
        unit: editUnit.split(" ")[0] || "م²",
        notes: "",
      },
    ]);
  };

  const handleRemoveEditBuilding = (bId: string) => {
    if (editBuildings.length === 1) return;
    setEditBuildings(editBuildings.filter((b) => b.id !== bId));
  };

  const handleEditBuildingChange = (bId: string, field: string, val: any) => {
    setEditBuildings(
      editBuildings.map((b) => (b.id === bId ? { ...b, [field]: val } : b))
    );
  };

  const handleSaveEditPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase || !editPhaseName) return;

    const totalSurveyedQty = editBuildings.reduce((acc, curr) => acc + (parseFloat(curr.totalQty) || 0), 0);
    const executedQty = (totalSurveyedQty * (parseFloat(editProgressPercent) || 0)) / 100;

    const updatedPhase = {
      ...editingPhase,
      modelName: editModelName,
      phaseName: editPhaseName,
      unit: editUnit,
      progressPercent: editProgressPercent,
      totalSurveyedQty,
      executedQty,
      buildings: editBuildings,
      notes: editNotes,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch("/api/project-phases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPhase),
      }).catch(console.error);

      try {
        const stored = localStorage.getItem(`phases_${projectId}`);
        if (stored) {
          const list = JSON.parse(stored).map((p: any) => (p.id === updatedPhase.id ? updatedPhase : p));
          localStorage.setItem(`phases_${projectId}`, JSON.stringify(list));
        }
      } catch (e) {
        console.error(e);
      }

      setPhasesList((prev) => prev.map((p) => (p.id === updatedPhase.id ? updatedPhase : p)));
      setEditingPhase(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers for Expense Delete and Edit
  const handleDeleteExpense = async (expenseId: string, expAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف هذا المصروف بقيمة (${formatCurrency(expAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/project-expenses?id=${expenseId}`, { method: "DELETE" });
      if (res.ok) {
        setExpensesList((prev) => prev.filter((e) => e.id !== expenseId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setEditExpType(expense.type || "أخرى");
    setEditExpAmount(expense.amount?.toString() || "");
    setEditExpDescription(expense.description || "");
  };

  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editExpAmount) return;

    setSavingExp(true);
    try {
      const payload = {
        id: editingExpense.id,
        projectId,
        type: editExpType,
        amount: parseFloat(editExpAmount) || 0,
        description: editExpDescription,
      };

      const res = await fetch("/api/project-expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setExpensesList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setEditingExpense(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingExp(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14, fontSize: 14 }}>جاري فتح ملف المشروع...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <div className="empty-state-icon">🏗️</div>
        <div className="empty-state-text">لم يتم العثور على ملف هذا المشروع</div>
        <Link href="/projects" className="btn btn-primary mt-4">← العودة لقائمة المشاريع</Link>
      </div>
    );
  }

  const totalExp = expensesList.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  const totalDailies = project.workerDailies ? project.workerDailies.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0;
  const totalCosts = totalExp + totalDailies;
  const netProfit = (project.value || 0) - totalCosts;

  const totalEditSurveyedQty = editBuildings.reduce((acc, curr) => acc + (parseFloat(curr.totalQty) || 0), 0);
  const totalEditExecutedQty = (totalEditSurveyedQty * (parseFloat(editProgressPercent) || 0)) / 100;

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-primary" style={{ fontSize: 12, padding: "3px 10px" }}>{project.code}</span>
            <h1 className="page-title" style={{ fontSize: 20 }}>{project.name}</h1>
          </div>
          <p className="page-subtitle" style={{ fontSize: 13, marginTop: 4 }}>
            العميل: {project.client || "غير محدد"} • الحالة: <span className="badge badge-success" style={{ fontSize: 11 }}>{project.status}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ طباعة</button>
          <Link href="/projects" className="btn btn-ghost btn-sm">← المشاريع</Link>
        </div>
      </div>

      {/* 4 Compact Overview Stat Cards */}
      <div className="stats-grid" style={{ gap: 12, marginBottom: 18 }}>
        <div className="stat-card stat-card-blue" style={{ padding: "16px 18px" }}>
          <div className="stat-card-top-row">
            <div className="stat-card-label" style={{ fontSize: 12 }}>قيمة العقد الإجمالية</div>
            <div className="stat-card-icon-wrap" style={{ width: 32, height: 32, fontSize: 16 }}>💰</div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 19, marginTop: 6 }}>{formatCurrency(project.value || 0)}</div>
          <div className="stat-card-sub" style={{ fontSize: 11 }}>قيمة المشروع المتعاقد عليها</div>
        </div>

        <div className="stat-card stat-card-orange" style={{ padding: "16px 18px" }}>
          <div className="stat-card-top-row">
            <div className="stat-card-label" style={{ fontSize: 12 }}>إجمالي المصروفات</div>
            <div className="stat-card-icon-wrap" style={{ width: 32, height: 32, fontSize: 16 }}>💸</div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 19, marginTop: 6 }}>{formatCurrency(totalCosts)}</div>
          <div className="stat-card-sub" style={{ fontSize: 11 }}>خامات + عمالة + تشغيل</div>
        </div>

        <div className="stat-card stat-card-purple" style={{ padding: "16px 18px" }}>
          <div className="stat-card-top-row">
            <div className="stat-card-label" style={{ fontSize: 12 }}>يوميات الموقع</div>
            <div className="stat-card-icon-wrap" style={{ width: 32, height: 32, fontSize: 16 }}>👷</div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 19, marginTop: 6 }}>{formatCurrency(totalDailies)}</div>
          <div className="stat-card-sub" style={{ fontSize: 11 }}>مجموع حضور وعمالة الموقع</div>
        </div>

        <div className={`stat-card ${netProfit >= 0 ? "stat-card-green" : "stat-card-red"}`} style={{ padding: "16px 18px" }}>
          <div className="stat-card-top-row">
            <div className="stat-card-label" style={{ fontSize: 12 }}>صافي الربح التقديري</div>
            <div className="stat-card-icon-wrap" style={{ width: 32, height: 32, fontSize: 16 }}>📈</div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 19, marginTop: 6 }}>{formatCurrency(netProfit)}</div>
          <div className="stat-card-sub" style={{ fontSize: 11 }}>العقد - التكاليف الحالية</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          paddingBottom: 12,
          marginBottom: 16,
          borderBottom: "1px solid hsl(var(--border-subtle))",
        }}
      >
        {[
          { id: "data", label: "📌 البيانات الأساسية" },
          { id: "phases", label: `🏗️ مراحل المشروع (${phasesList.length})` },
          { id: "workers", label: "👷 العمال" },
          { id: "supervisors", label: "👔 المشرفون" },
          { id: "expenses", label: `💸 المصروفات (${expensesList.length})` },
          { id: "dailies", label: "📅 يوميات العمال" },
          { id: "investors", label: "💼 المستثمرون" },
          { id: "subcontractors", label: "🔧 مقاولو الباطن" },
          { id: "docs", label: "📋 المستخلصات" },
          { id: "files", label: `📁 الملفات الخاصة بالمشروع (${projectFilesList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 8,
              lineHeight: 1.2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <div className="card">
        <div className="card-body" style={{ padding: 20 }}>
          {/* 1. Basic Data */}
          {activeTab === "data" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>البيانات الأساسية للمشروع</h3>
                <Link href={`/projects/create?edit=${project.id}`} className="btn btn-primary btn-sm">
                  ✏️ تعديل بيانات المشروع
                </Link>
              </div>
              <div className="grid-3" style={{ gap: 14 }}>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>كود المشروع</label>
                  <div style={{ fontWeight: 800, color: "hsl(var(--gold))", fontSize: 14, marginTop: 2 }}>{project.code}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>اسم المشروع</label>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{project.name}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>العميل / الجهة المالكة</label>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{project.client || "غير محدد"}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>تاريخ البداية</label>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{project.startDate ? formatDateShort(project.startDate) : "-"}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>تاريخ التسليم المتوقع</label>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{project.endDate ? formatDateShort(project.endDate) : "-"}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8 }}>
                  <label className="text-muted" style={{ fontSize: 11 }}>حالة التنفيذ</label>
                  <div style={{ marginTop: 2 }}><span className="badge badge-success">{project.status}</span></div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label className="text-muted" style={{ fontSize: 11 }}>العنوان التفصيلي والملاحظات</label>
                <div style={{ padding: 12, borderRadius: 8, background: "hsl(var(--bg-elevated))", marginTop: 4, fontSize: 13, whiteSpace: "pre-wrap" }}>
                  {project.notes || "لا توجد ملاحظات إضافية مدونة"}
                </div>
              </div>
            </div>
          )}

          {/* 2. Phases Tab */}
          {activeTab === "phases" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>مراحل تنفيذ ونماذج مشروع {project.name}</h3>
                <Link href={`/projects/${project.id}/phases/create`} className="btn btn-primary btn-sm">
                  + إضافة نموذج/مرحلة للمشروع
                </Link>
              </div>

              {phasesList.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px 10px" }}>
                  <div className="empty-state-icon" style={{ fontSize: 28 }}>🏗️</div>
                  <div className="empty-state-text" style={{ fontSize: 13 }}>لم يتم إضافة مراحل أو نماذج تنفيذية لهذا المشروع بعد</div>
                  <Link href={`/projects/${project.id}/phases/create`} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                    + إضافة أول نموذج/مرحلة للمشروع
                  </Link>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم النموذج</th>
                        <th>البيان / المرحلة</th>
                        <th>الوحدة</th>
                        <th>سعر الوحدة</th>
                        <th>إجمالي كمية الحصر</th>
                        <th>إجمالي التكلفة المقدرة</th>
                        <th>نسبة التنفيذ %</th>
                        <th>الكمية المنفذة</th>
                        <th>المقاول المنفذ للنسبة واسمه</th>
                        <th>ملاحظات</th>
                        <th style={{ width: 120, textAlign: "center" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phasesList.map((p, idx) => {
                        const uPrice = parseFloat(p.unitPrice) || 0;
                        const totalQty = parseFloat(p.totalSurveyedQty) || 0;
                        const estCost = totalQty * uPrice;
                        return (
                          <tr key={p.id}>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                            <td>{p.modelName || "-"}</td>
                            <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{p.phaseName}</td>
                            <td><span className="badge badge-info">{p.unit}</span></td>
                            <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{uPrice ? formatCurrency(uPrice) : "-"}</td>
                            <td style={{ fontWeight: 700 }}>{totalQty}</td>
                            <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{estCost ? formatCurrency(estCost) : "-"}</td>
                            <td><span className="badge badge-warning" style={{ fontWeight: 800 }}>{p.progressPercent || 0}%</span></td>
                            <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>{p.executedQty || 0}</td>
                            <td>
                              {p.subcontractorName ? (
                                <span className="badge badge-primary" style={{ fontWeight: 800, padding: "5px 10px" }}>🔧 {p.subcontractorName}</span>
                              ) : (
                                <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>غير محدد (لم يُسجل مستخلص)</span>
                              )}
                            </td>
                            <td>{p.notes || "-"}</td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                                  title="تعديل المرحلة"
                                  onClick={() => handleOpenEditPhase(p)}
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                                  title="حذف المرحلة"
                                  onClick={() => handleDeletePhase(p.id)}
                                >
                                  🗑️ حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. Workers */}
          {activeTab === "workers" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>عمال مشروع {project.name}</h3>
                <Link href={`/workers/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + إضافة / تعيين عامل للمشروع
                </Link>
              </div>
              <div className="empty-state" style={{ padding: "24px 10px" }}>
                <div className="empty-state-icon" style={{ fontSize: 28 }}>👷</div>
                <div className="empty-state-text" style={{ fontSize: 13 }}>قائمة وتوزيع عمال الموقع المسندين لمشروع {project.name}</div>
              </div>
            </div>
          )}

          {/* 4. Supervisors */}
          {activeTab === "supervisors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>مشرفو ومهندسو مشروع {project.name}</h3>
                <Link href={`/supervisors/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + إضافة / تعيين مشرف للمشروع
                </Link>
              </div>
              <div className="empty-state" style={{ padding: "24px 10px" }}>
                <div className="empty-state-icon" style={{ fontSize: 28 }}>👔</div>
                <div className="empty-state-text" style={{ fontSize: 13 }}>طاقم المهندسين والمشرفين القائمين على إدارة المشروع</div>
              </div>
            </div>
          )}

          {/* 5. Expenses */}
          {activeTab === "expenses" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>مصروفات مشروع {project.name}</h3>
                  <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                    إجمالي المصروفات المسجلة: <strong style={{ color: "#ef4444" }}>{formatCurrency(totalExp)}</strong>
                  </span>
                </div>
                <Link href={`/project-expenses/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + تسجيل مصروف جديد للمشروع
                </Link>
              </div>

              {expensesList.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px 10px" }}>
                  <div className="empty-state-icon" style={{ fontSize: 28 }}>💸</div>
                  <div className="empty-state-text" style={{ fontSize: 13 }}>لم يتم تسجيل أي مصروفات خاصة بهذا المشروع حتى الآن</div>
                  <Link href={`/project-expenses/create?projectId=${project.id}`} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                    + تسجيل أول مصروف للمشروع
                  </Link>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>نوع المصروف</th>
                        <th>البيان والملاحظات</th>
                        <th>المبلغ (جنيه)</th>
                        <th>تاريخ التسجيل</th>
                        <th style={{ width: 120, textAlign: "center" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesList.map((exp, idx) => (
                        <tr key={exp.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td><span className="badge badge-info">{exp.type || "أخرى"}</span></td>
                          <td>{exp.description || "-"}</td>
                          <td className="text-danger" style={{ fontWeight: 800 }}>
                            {formatCurrency(exp.amount || 0)}
                          </td>
                          <td>{exp.createdAt ? formatDateShort(exp.createdAt) : "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              <button
                                className="btn btn-sm"
                                style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                                title="تعديل المصروف"
                                onClick={() => handleOpenEditExpense(exp)}
                              >
                                ✏️ تعديل
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                                title="حذف المصروف"
                                onClick={() => handleDeleteExpense(exp.id, exp.amount)}
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 6. Dailies */}
          {activeTab === "dailies" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>سجل يوميات وحضور الموقع لمشروع {project.name}</h3>
                <Link href={`/worker-daily/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + تسجيل يومية جديدة للمشروع
                </Link>
              </div>
              <div className="empty-state" style={{ padding: "20px" }}>
                <div className="empty-state-text" style={{ fontSize: 13 }}>مجموع مستحقات اليوميات المسجلة: {formatCurrency(totalDailies)}</div>
              </div>
            </div>
          )}

          {/* 7. Investors (NEW REQUIREMENT: DISBURSED BY & FINANCIAL STATEMENT) */}
          {activeTab === "investors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))" }}>
                    💼 شركاء ومستثمرو مشروع {project.name}
                  </h3>
                  <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                    كشف حساب تفصيلي وحساب مستحقات والتزامات الشركاء (له وما عليه) بناءً على القائم بالصرف
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleOpenAddInvestor}>
                    + إضافة مستثمر / شريك جديد
                  </button>
                  <Link href={`/project-expenses/create?projectId=${project.id}`} className="btn btn-gold btn-sm">
                    + إضافة مصروف بقائم بالصرف
                  </Link>
                </div>
              </div>

              {/* Summary Stats Row */}
              <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: "12px 16px", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي تكاليف المشروع الفعلية</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginTop: 2 }}>{formatCurrency(totalExp)}</div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: "12px 16px", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>إجمالي مصروفات المدفوعة بواسطة المستثمرين</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "hsl(var(--gold))", marginTop: 2 }}>
                    {formatCurrency(
                      expensesList
                        .filter((e) => e.paidBy && e.paidBy.includes("المستثمر"))
                        .reduce((sum, e) => sum + (e.amount || 0), 0)
                    )}
                  </div>
                </div>
                <div style={{ background: "hsl(var(--bg-elevated))", padding: "12px 16px", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>مصروفات خزينة الشركة (شركة الجبل)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "hsl(var(--info))", marginTop: 2 }}>
                    {formatCurrency(
                      expensesList
                        .filter((e) => !e.paidBy || !e.paidBy.includes("المستثمر"))
                        .reduce((sum, e) => sum + (e.amount || 0), 0)
                    )}
                  </div>
                </div>
              </div>

              {investorsList.length === 0 ? (
                <div className="empty-state" style={{ padding: "32px 10px" }}>
                  <div className="empty-state-icon" style={{ fontSize: 32 }}>💼</div>
                  <div className="empty-state-text" style={{ fontSize: 14 }}>لم يتم إضافة مستثمرين أو شركاء لهذا المشروع بعد</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAddInvestor}>
                    + إضافة أول مستثمر بالمشروع
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم المستثمر / الشريك</th>
                        <th>رقم الهاتف</th>
                        <th>نسبة الشراكة %</th>
                        <th>المسدد منه كمصروفات ("له")</th>
                        <th>حصته من التكاليف ("عليه")</th>
                        <th>صافي الموقف المالي (له / عليه)</th>
                        <th style={{ textAlign: "center" }}>الحالة المستحقة</th>
                        <th style={{ width: 140, textAlign: "center" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investorsList.map((inv, idx) => {
                        // Calculate total paid by this investor from project expenses
                        const paidByExpenses = expensesList
                          .filter((e) => e.paidBy && e.paidBy.includes(inv.name))
                          .reduce((sum, e) => sum + (e.amount || 0), 0);

                        const totalPaidByInv = paidByExpenses + (parseFloat(inv.initialCapital) || 0);
                        const invSharePercent = parseFloat(inv.sharePercent) || 0;
                        const shareOfCost = totalExp * (invSharePercent / 100);
                        const netBalance = totalPaidByInv - shareOfCost;

                        return (
                          <tr key={inv.id || idx}>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span>💼</span>
                                <span>{inv.name}</span>
                              </div>
                            </td>
                            <td>{inv.phone || "-"}</td>
                            <td>
                              <span className="badge badge-info">{invSharePercent}%</span>
                            </td>
                            <td style={{ fontWeight: 800, color: "hsl(var(--success))" }}>
                              {formatCurrency(totalPaidByInv)}
                            </td>
                            <td style={{ fontWeight: 800, color: "#ef4444" }}>
                              {formatCurrency(shareOfCost)}
                            </td>
                            <td style={{ fontWeight: 900, fontSize: 14, color: netBalance >= 0 ? "hsl(var(--gold))" : "#ef4444" }}>
                              {netBalance >= 0 ? `+${formatCurrency(netBalance)}` : formatCurrency(netBalance)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {netBalance > 0 ? (
                                <span className="badge badge-success">مستحق له (استرداد)</span>
                              ) : netBalance < 0 ? (
                                <span className="badge badge-danger">عليه سداد فارق التكلفة</span>
                              ) : (
                                <span className="badge badge-info">متوازن (خالص)</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                                  title="طباعة كشف حساب المستثمر"
                                  onClick={() => window.print()}
                                >
                                  🖨️ كشف حساب
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                                  title="حذف المستثمر"
                                  onClick={() => handleDeleteInvestor(inv.id, inv.name)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 8. Subcontractors */}
          {activeTab === "subcontractors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>مقاولو الباطن لمشروع {project.name}</h3>
                <Link href={`/subcontractors/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + تعيين / إضافة مقاول باطن
                </Link>
              </div>
              <div className="empty-state" style={{ padding: "24px 10px" }}>
                <div className="empty-state-icon" style={{ fontSize: 28 }}>🔧</div>
                <div className="empty-state-text" style={{ fontSize: 13 }}>مقاولو الباطن وشركات التشطيبات الفرعية للمشروع</div>
              </div>
            </div>
          )}

          {/* 9. Docs */}
          {activeTab === "docs" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>مستخلصات عقد مشروع {project.name}</h3>
                <Link href={`/subcontractor-docs/create?projectId=${project.id}`} className="btn btn-primary btn-sm">
                  + إضافة مستخلص جديد للمشروع
                </Link>
              </div>
              <div className="empty-state" style={{ padding: "24px 10px" }}>
                <div className="empty-state-icon" style={{ fontSize: 28 }}>📋</div>
                <div className="empty-state-text" style={{ fontSize: 13 }}>مستخلصات الدفعات والعقود الصادرة والواردة لـ {project.name}</div>
              </div>
            </div>
          )}

          {/* 10. Project Files (NEW REQUIREMENT) */}
          {activeTab === "files" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))" }}>
                    📁 الملفات والرسومات التنفيذية الخاصة بالمشروع
                  </h3>
                  <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                    مستندات وعقود ورسومات هندسية مخزنة بسحابة Cloudflare R2 المؤمنة
                  </span>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type="file"
                    multiple
                    id="project-file-upload-input"
                    style={{ display: "none" }}
                    onChange={handleUploadProjectFile}
                  />
                  <label
                    htmlFor="project-file-upload-input"
                    className="btn btn-primary btn-sm"
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {uploadingProjectFile ? <span className="spinner" /> : "+ رفع ملفات جديدة للمشروع"}
                  </label>
                </div>
              </div>

              {projectFilesList.length === 0 ? (
                <div className="empty-state" style={{ padding: "32px 10px" }}>
                  <div className="empty-state-icon" style={{ fontSize: 32 }}>📁</div>
                  <div className="empty-state-text" style={{ fontSize: 14 }}>لا توجد ملفات أو رسومات هندسية مرفوعة لهذا المشروع بعد</div>
                  <label
                    htmlFor="project-file-upload-input"
                    className="btn btn-gold btn-sm"
                    style={{ marginTop: 12, cursor: "pointer" }}
                  >
                    + رفع أول ملف للمشروع (Cloudflare R2)
                  </label>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم الملف المرفوع</th>
                        <th>حجم الملف</th>
                        <th>تاريخ الرفع</th>
                        <th style={{ textAlign: "center", width: 200 }}>الإجراءات والمعاينة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectFilesList.map((file, idx) => (
                        <tr key={file.key || file.id || idx}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span>📄</span>
                              <span>{file.filename}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info">
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "تخزين سحابي"}
                            </span>
                          </td>
                          <td>{file.createdAt ? formatDateShort(file.createdAt) : "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              <a
                                href={`/api/project-files?key=${encodeURIComponent(file.key)}&download=true`}
                                className="btn btn-sm btn-primary"
                                style={{ padding: "4px 10px", fontSize: 12, textDecoration: "none" }}
                                download
                                target="_blank"
                                rel="noreferrer"
                              >
                                📥 تحميل / فتح الملف
                              </a>
                              <button
                                className="btn btn-sm"
                                style={{ padding: "4px 10px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                                onClick={() => handleDeleteProjectFile(file.key || file.id, file.filename)}
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDIT PHASE MODAL */}
      {editingPhase && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 800,
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              borderRadius: 16,
            }}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ fontSize: 18 }}>✏️ تعديل بيانات المرحلة / النموذج</h2>
              <button
                onClick={() => setEditingPhase(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "hsl(var(--text-secondary))" }}
              >
                ✕
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveEditPhase}>
                <div className="grid-2" style={{ gap: "16px", marginBottom: "16px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">اسم النموذج</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModelName}
                      onChange={(e) => setEditModelName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      البيان / اسم المرحلة <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editPhaseName}
                      onChange={(e) => setEditPhaseName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-3" style={{ gap: "16px", marginBottom: "16px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">الكمية المنفذة (محسوبة)</label>
                    <div
                      style={{
                        background: "#eab308",
                        color: "#000000",
                        fontWeight: 900,
                        fontSize: 15,
                        height: 40,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {totalEditExecutedQty}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">نسبة التنفيذ %</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editProgressPercent}
                      onChange={(e) => setEditProgressPercent(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">الوحدة</label>
                    <select
                      className="form-control"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                    >
                      <option value="متر مسطح (م.مسطح)">متر مسطح (م.مسطح)</option>
                      <option value="م² (متر مربع)">م² (متر مربع)</option>
                      <option value="م³ (متر مكعب)">م³ (متر مكعب)</option>
                      <option value="م.ط (متر طولي)">م.ط (متر طولي)</option>
                      <option value="عدد">عدد</option>
                      <option value="طن">طن</option>
                      <option value="كجم">كجم</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    borderTop: "1px solid hsl(var(--border-subtle))",
                    paddingTop: 16,
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>🏢 المباني والكميات المخصصة</h3>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: "#10b981", color: "#ffffff", fontWeight: 700 }}
                    onClick={handleAddEditBuilding}
                  >
                    + إضافة مبنى
                  </button>
                </div>

                <div className="table-container" style={{ borderRadius: 8, border: "1px solid hsl(var(--border-subtle))", marginBottom: 20 }}>
                  <table style={{ width: "100%", margin: 0 }}>
                    <thead>
                      <tr style={{ background: "hsl(var(--bg-elevated))" }}>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم المبنى</th>
                        <th>كمية الحصر</th>
                        <th>ملاحظات</th>
                        <th style={{ width: 50, textAlign: "center" }}>إزالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editBuildings.map((b, index) => (
                        <tr key={b.id}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{index + 1}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              value={b.buildingName}
                              onChange={(e) => handleEditBuildingChange(b.id, "buildingName", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={b.totalQty}
                              onChange={(e) => handleEditBuildingChange(b.id, "totalQty", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              value={b.notes}
                              onChange={(e) => handleEditBuildingChange(b.id, "notes", e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditBuilding(b.id)}
                              style={{
                                background: "#ef4444",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: 6,
                                width: 28,
                                height: 28,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    style={{
                      background: "#fef08a",
                      color: "#854d0e",
                      padding: "10px 16px",
                      fontWeight: 900,
                      fontSize: 14,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>إجمالي كمية الحصر:</span>
                    <span>{totalEditSurveyedQty}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: 16 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingPhase(null)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: "8px 24px" }}>
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      {editingExpense && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 550,
              borderRadius: 16,
            }}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ fontSize: 17 }}>✏️ تعديل بيانات المصروف</h2>
              <button
                onClick={() => setEditingExpense(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "hsl(var(--text-secondary))" }}
              >
                ✕
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveEditExpense}>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">نوع المصروف</label>
                  <select
                    className="form-control"
                    value={editExpType}
                    onChange={(e) => setEditExpType(e.target.value)}
                  >
                    {expenseTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">
                    المبلغ (جنيه) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={editExpAmount}
                    onChange={(e) => setEditExpAmount(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label">البيان والملاحظات</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={editExpDescription}
                    onChange={(e) => setEditExpDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: 16 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingExpense(null)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingExp} style={{ padding: "8px 24px" }}>
                    {savingExp ? "جاري الحفظ..." : "تحديث المصروف"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT INVESTOR MODAL (NEW REQUIREMENT) */}
      {showInvestorModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 550,
              borderRadius: 16,
            }}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ fontSize: 17, color: "hsl(var(--gold))" }}>
                💼 {editingInvestor ? "تعديل بيانات المستثمر" : "إضافة مستثمر / شريك بالمشروع"}
              </h2>
              <button
                onClick={() => setShowInvestorModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "hsl(var(--text-secondary))" }}
              >
                ✕
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveInvestor}>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">
                    اسم المستثمر / الشريك <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: م. أحمد محمود"
                    required
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: "16px", marginBottom: "16px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="010XXXXXXXX"
                      value={invPhone}
                      onChange={(e) => setInvPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      نسبة الشراكة (%) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="50"
                      required
                      value={invSharePercent}
                      onChange={(e) => setInvSharePercent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label">رأس المال المبدئي المدفوع مسبقاً (إن وجد)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    value={invCapital}
                    onChange={(e) => setInvCapital(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>يتم إضافته لرصيد مدفوعات المستثمر ("له")</span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: 16 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowInvestorModal(false)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: "8px 24px" }}>
                    حفظ المستثمر
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
