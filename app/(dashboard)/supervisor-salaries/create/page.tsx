"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const ARABIC_MONTHS: { [key: string]: string } = {
  "1": "يناير",
  "2": "فبراير",
  "3": "مارس",
  "4": "أبريل",
  "5": "مايو",
  "6": "يونيو",
  "7": "يوليو",
  "8": "أغسطس",
  "9": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

interface ProjectAllocation {
  projectId: string;
  projectName: string;
  days: number;
  amount: number;
}

export default function CreateSupervisorSalaryPage() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [supervisorId, setSupervisorId] = useState("");
  const [monthInput, setMonthInput] = useState((new Date().getMonth() + 1).toString());
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [baseSalaryInput, setBaseSalaryInput] = useState("");
  const [bonusesInput, setBonusesInput] = useState("0");
  const [deductionsInput, setDeductionsInput] = useState("0");
  const [paidAtInput, setPaidAtInput] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Attendance & Project Cost Allocations
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/supervisors").then((res) => res.json()),
      fetch("/api/projects").then((res) => res.json()),
    ])
      .then(([supData, projData]) => {
        if (Array.isArray(supData)) {
          setSupervisors(supData);
          if (supData.length > 0) {
            setSupervisorId(supData[0].id);
            setBaseSalaryInput(supData[0].salary?.toString() || "");
          }
        }
        const pList = Array.isArray(projData) ? projData : projData?.projects || [];
        setProjects(pList);
      })
      .catch(console.error);
  }, []);

  const calcNetSalary = Math.max(
    0,
    (parseFloat(baseSalaryInput) || 0) + (parseFloat(bonusesInput) || 0) - (parseFloat(deductionsInput) || 0)
  );

  // Fetch supervisor attendance and calculate project allocations
  useEffect(() => {
    if (!supervisorId) return;

    setLoadingAllocations(true);
    fetch(`/api/supervisor-dailies?supervisorId=${supervisorId}&month=${monthInput}&year=${yearInput}`)
      .then((res) => res.json())
      .then((dailies) => {
        const dList = Array.isArray(dailies) ? dailies : [];
        const map = new Map<string, { name: string; days: number }>();

        dList.forEach((d: any) => {
          if (d.projectId) {
            const current = map.get(d.projectId) || { name: d.projectName || "مشروع", days: 0 };
            current.days += parseFloat(d.daysCount) || 1;
            map.set(d.projectId, current);
          }
        });

        // Calculate total days worked across all projects
        let totalDays = 0;
        map.forEach((val) => (totalDays += val.days));

        const allocs: ProjectAllocation[] = [];
        if (totalDays > 0 && map.size > 0) {
          map.forEach((val, pId) => {
            const share = val.days / totalDays;
            const allocatedAmount = Math.round(calcNetSalary * share * 100) / 100;
            allocs.push({
              projectId: pId,
              projectName: val.name,
              days: val.days,
              amount: allocatedAmount,
            });
          });
        } else if (projects.length > 0) {
          // Default fallback split across existing projects if no dailies recorded yet
          const equalDays = 30 / projects.length;
          projects.forEach((p: any) => {
            allocs.push({
              projectId: p.id,
              projectName: p.name,
              days: equalDays,
              amount: Math.round((calcNetSalary / projects.length) * 100) / 100,
            });
          });
        }

        setProjectAllocations(allocs);
      })
      .catch(console.error)
      .finally(() => setLoadingAllocations(false));
  }, [supervisorId, monthInput, yearInput, calcNetSalary, projects]);

  const handleSupervisorSelect = (id: string) => {
    setSupervisorId(id);
    const target = supervisors.find((sup) => sup.id === id);
    if (target?.salary) {
      setBaseSalaryInput(target.salary.toString());
    }
  };

  const handleAllocationDaysChange = (pId: string, daysVal: number) => {
    const updated = projectAllocations.map((a) => (a.projectId === pId ? { ...a, days: daysVal } : a));
    const totalDays = updated.reduce((sum, a) => sum + (a.days || 0), 0);

    const reallocated = updated.map((a) => {
      const share = totalDays > 0 ? a.days / totalDays : 0;
      return {
        ...a,
        amount: Math.round(calcNetSalary * share * 100) / 100,
      };
    });

    setProjectAllocations(reallocated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorId) return;

    const targetSup = supervisors.find((sup) => sup.id === supervisorId);
    setSubmitting(true);
    try {
      const res = await fetch("/api/supervisor-salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId,
          supervisorName: targetSup ? targetSup.name : "مشرف",
          month: monthInput,
          year: yearInput,
          baseSalary: baseSalaryInput,
          bonuses: bonusesInput,
          deductions: deductionsInput,
          amount: calcNetSalary,
          paidAt: paidAtInput,
          projectAllocations,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/supervisor-salaries");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAllocatedDays = projectAllocations.reduce((sum, a) => sum + (a.days || 0), 0);
  const totalAllocatedAmount = projectAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 تسجيل وصرف راتب المشرف وتوزيعه على المشاريع</h1>
          <p className="page-subtitle">صرف الراتب كاملاً للشؤون وتوزيع كلفته آلياً على المشاريع بحسب أيّام العمل بالمواقع</p>
        </div>
        <Link href="/supervisor-salaries" className="btn btn-ghost">
          ← العودة للرواتب
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">المشرف *</label>
              <select
                className="form-control"
                required
                value={supervisorId}
                onChange={(e) => handleSupervisorSelect(e.target.value)}
              >
                <option value="" disabled>-- اختر المشرف من القائمة --</option>
                {supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.salaryType || "شهري"}) - الراتب: {sup.salary} ج.م
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">الشهر *</label>
                <select className="form-control" value={monthInput} onChange={(e) => setMonthInput(e.target.value)}>
                  {Object.entries(ARABIC_MONTHS).map(([val, nameStr]) => (
                    <option key={val} value={val}>
                      {nameStr} ({val})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">السنة *</label>
                <select className="form-control" value={yearInput} onChange={(e) => setYearInput(e.target.value)}>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">الأساسي (جنيه) *</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  value={baseSalaryInput}
                  onChange={(e) => setBaseSalaryInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">المكافآت (جنيه)</label>
                <input
                  type="number"
                  className="form-control"
                  value={bonusesInput}
                  onChange={(e) => setBonusesInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الخصومات (جنيه)</label>
                <input
                  type="number"
                  className="form-control"
                  value={deductionsInput}
                  onChange={(e) => setDeductionsInput(e.target.value)}
                />
              </div>
            </div>

            <div style={{ background: "hsl(var(--bg-elevated))", padding: 14, borderRadius: 10, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-muted" style={{ fontSize: 13 }}>إجمالي الراتب الصافي للمشرف (للإدارة والشؤون):</span>
              <span style={{ fontWeight: 900, color: "#10b981", fontSize: 22 }}>{formatCurrency(calcNetSalary)}</span>
            </div>

            {/* PROJECT COST ALLOCATION TABLE (REQUIREMENT: ALLOCATE SALARY TO PROJECTS BASED ON DAYS) */}
            <div style={{ marginBottom: 24, border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16, background: "hsl(var(--bg-elevated))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))", margin: 0 }}>
                  🏗️ توزيع تكلفة الراتب على المشاريع (بناءً على الحضور بالمواقع)
                </h3>
                <Link href="/supervisor-dailies" className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>
                  🗓️ تعديل الحضور اليومي
                </Link>
              </div>

              {loadingAllocations ? (
                <div style={{ padding: 12, textAlign: "center" }}><span className="spinner" /></div>
              ) : projectAllocations.length === 0 ? (
                <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>لا توجد مشاريع مسجلة لتوزيع التكلفة عليها</div>
              ) : (
                <div className="table-container" style={{ margin: 0 }}>
                  <table style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: "center" }}>#</th>
                        <th>اسم المشروع</th>
                        <th style={{ width: 130 }}>أيام العمل بالموقع</th>
                        <th style={{ width: 100 }}>نسبة التحميل %</th>
                        <th>المبلغ المحمل على كلفة المشروع (جنيه)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectAllocations.map((alloc, idx) => {
                        const pct = totalAllocatedDays > 0 ? (alloc.days / totalAllocatedDays) * 100 : 0;
                        return (
                          <tr key={alloc.projectId || idx}>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>{alloc.projectName}</td>
                            <td>
                              <input
                                type="number"
                                step="0.5"
                                className="form-control"
                                style={{ padding: "4px 8px", fontSize: 12, fontWeight: 700 }}
                                value={alloc.days}
                                onChange={(e) => handleAllocationDaysChange(alloc.projectId, parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <span className="badge badge-info">{pct.toFixed(1)}%</span>
                            </td>
                            <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>
                              {formatCurrency(alloc.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "hsl(var(--bg-subtle))", fontWeight: 800, fontSize: 13, borderTop: "1px solid hsl(var(--border-subtle))" }}>
                    <span>إجمالي الأيام والتكاليف الموزعة:</span>
                    <span style={{ color: "hsl(var(--gold))" }}>
                      {totalAllocatedDays} يوم ➔ {formatCurrency(totalAllocatedAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ صرف الراتب</label>
              <input
                type="date"
                className="form-control"
                value={paidAtInput}
                onChange={(e) => setPaidAtInput(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <input
                type="text"
                className="form-control"
                placeholder="ملاحظات حول طريقة الصرف أو أية تفاصيل أُخرى..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/supervisor-salaries" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "تأكيد الصرف وتوزيع الراتب على المشاريع"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
