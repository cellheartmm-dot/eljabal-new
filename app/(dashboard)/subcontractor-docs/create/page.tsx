"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface ClaimItem {
  id: string;
  phaseId?: string;
  itemDesc: string;
  modelName?: string;
  buildingNo: string;
  floorNo?: string;
  unit: string;
  totalQty: number;
  execPercent: number;
  execQty: number;
  unitPrice: number;
  rowTotal: number;
}

function getNextDocNo(docsList: any[]) {
  let maxNum = 0;
  docsList.forEach((d) => {
    const code = d.docNo || "";
    const match = code.match(/SC(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `SC${String(nextNum).padStart(4, "0")}`;
}

export default function CreateSubcontractorDocPage() {
  const router = useRouter();
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectPhases, setProjectPhases] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Creation Mode Selector: "phase_linked" vs "manual"
  const [creationMode, setCreationMode] = useState<"phase_linked" | "manual">("phase_linked");

  const [docNo, setDocNo] = useState("SC0001");
  const [subcontractorId, setSubcontractorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("مستخلص");
  const [status, setStatus] = useState("مدفوع");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ClaimItem[]>([
    {
      id: "item-1",
      phaseId: "",
      itemDesc: "",
      modelName: "",
      buildingNo: "",
      floorNo: "",
      unit: "م²",
      totalQty: 0,
      execPercent: 100,
      execQty: 0,
      unitPrice: 0,
      rowTotal: 0,
    },
  ]);

  useEffect(() => {
    fetch("/api/subcontractor-docs")
      .then((res) => res.json())
      .then((docsData) => {
        if (Array.isArray(docsData)) {
          setDocNo(getNextDocNo(docsData));
        }
      })
      .catch(console.error);

    fetch("/api/subcontractors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubcontractors(data);
          if (data.length > 0) setSubcontractorId(data[0].id);
        }
      })
      .catch(console.error);

    fetch("/api/projects")
      .then((res) => res.json())
      .then((pData) => {
        const pList = Array.isArray(pData) ? pData : pData?.projects || [];
        setProjects(pList);
        if (pList.length > 0) setProjectId(pList[0].id);
      })
      .catch(console.error);
  }, []);

  // Fetch project phases whenever selected projectId changes
  useEffect(() => {
    if (!projectId) {
      setProjectPhases([]);
      return;
    }

    fetch(`/api/project-phases?projectId=${projectId}`)
      .then((res) => res.json())
      .then((apiPhases) => {
        let combined = Array.isArray(apiPhases) ? apiPhases : [];
        try {
          const stored = localStorage.getItem(`phases_${projectId}`);
          if (stored) {
            const localPhases = JSON.parse(stored);
            localPhases.forEach((lp: any) => {
              if (!combined.some((cp) => cp.id === lp.id)) {
                combined.push(lp);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }
        setProjectPhases(combined);
      })
      .catch((err) => {
        console.error("Error fetching project phases:", err);
      });
  }, [projectId]);

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        id: "item-" + Date.now() + Math.random(),
        phaseId: "",
        itemDesc: "",
        modelName: "",
        buildingNo: "",
        floorNo: "",
        unit: "م²",
        totalQty: 0,
        execPercent: 100,
        execQty: 0,
        unitPrice: 0,
        rowTotal: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Selection of a Project Phase to auto-fill fields
  const handleSelectPhase = (index: number, selectedPhaseId: string) => {
    const updated = [...items];
    const row = { ...updated[index] };

    const selectedPhase = projectPhases.find((p) => p.id === selectedPhaseId);
    if (selectedPhase) {
      row.phaseId = selectedPhase.id;
      row.itemDesc = selectedPhase.phaseName || row.itemDesc;
      row.modelName = selectedPhase.modelName || "";

      const firstBuilding = selectedPhase.buildings?.[0]?.buildingName || "";
      const firstFloor = selectedPhase.buildings?.[0]?.floorNumber || "";
      row.buildingNo = firstBuilding;
      row.floorNo = firstFloor;
      row.unit = selectedPhase.unit ? selectedPhase.unit.split(" ")[0] : row.unit;
      row.totalQty = parseFloat(selectedPhase.totalSurveyedQty) || 0;
      row.execPercent = parseFloat(selectedPhase.progressPercent) || 100;
      row.unitPrice = parseFloat(selectedPhase.unitPrice) || row.unitPrice || 0;

      const total = row.totalQty || 0;
      const pct = row.execPercent || 0;
      const price = row.unitPrice || 0;
      row.execQty = Math.round(total * (pct / 100) * 100) / 100;
      row.rowTotal = Math.round(row.execQty * price * 100) / 100;
    } else {
      row.phaseId = "";
    }

    updated[index] = row;
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof ClaimItem, value: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    if (field === "totalQty" || field === "execPercent" || field === "unitPrice") {
      const total = parseFloat(row.totalQty as any) || 0;
      const pct = parseFloat(row.execPercent as any) || 0;
      const price = parseFloat(row.unitPrice as any) || 0;

      const calcExecQty = total * (pct / 100);
      row.execQty = Math.round(calcExecQty * 100) / 100;
      row.rowTotal = Math.round(row.execQty * price * 100) / 100;
    }

    updated[index] = row;
    setItems(updated);
  };

  const grandTotal = items.reduce((acc, row) => acc + (row.rowTotal || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcontractorId) return;

    const targetSub = subcontractors.find((s) => s.id === subcontractorId);
    const descText = items.map((i) => i.itemDesc).filter(Boolean).join(" - ") || `مستخلص رقم ${docNo}`;
    const finalAmount = grandTotal > 0 ? grandTotal : 0;

    setSubmitting(true);
    try {
      // 1. Create Subcontractor Claim/Doc
      const res = await fetch("/api/subcontractor-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNo,
          subcontractorId,
          subcontractorName: targetSub ? targetSub.name : "",
          projectId: projectId || null,
          type,
          description: descText,
          amount: finalAmount,
          status,
          date,
          periodFrom,
          periodTo,
          items,
          notes,
        }),
      });

      // 2. Synchronize progress % and Subcontractor Name back to Project Phases if phase linked
      if (creationMode === "phase_linked") {
        for (const item of items) {
          const targetPhase = projectPhases.find(
            (p) => p.id === item.phaseId || (p.phaseName && p.phaseName.trim() === item.itemDesc.trim())
          );

          if (targetPhase) {
            const newProgressPercent = String(item.execPercent || targetPhase.progressPercent || "0");
            const calcExecQty = item.execQty || (targetPhase.totalSurveyedQty * parseFloat(newProgressPercent)) / 100;

            const updatedPhasePayload = {
              id: targetPhase.id,
              projectId,
              progressPercent: newProgressPercent,
              executedQty: calcExecQty,
              subcontractorId: targetSub ? targetSub.id : null,
              subcontractorName: targetSub ? targetSub.name : "",
            };

            await fetch("/api/project-phases", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedPhasePayload),
            }).catch(console.error);
          }
        }
      }

      if (res.ok) {
        router.push("/subcontractor-docs");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 إضافة مستخلص مقاول باطن جديد</h1>
          <p className="page-subtitle">تحديد طريقة الإنشاء (ربط بمراحل المشروع أو إدخال يدوي) والتسميع التلقائي في حساب المشروع</p>
        </div>
        <Link href="/subcontractor-docs" className="btn btn-ghost">
          ← العودة للمستخلصات
        </Link>
      </div>

      {/* MODE SELECTOR (HIGH VISIBILITY BORDER CARDS) */}
      <div style={{ background: "hsl(var(--bg-elevated))", border: "2px solid hsl(var(--border-subtle))", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: "hsl(var(--gold))", marginBottom: 12 }}>
          🎯 اختر طريقة إنشاء المستخلص:
        </h3>

        <div className="grid-2" style={{ gap: 16 }}>
          {/* Mode 1: Phase Linked */}
          <div
            onClick={() => setCreationMode("phase_linked")}
            style={{
              cursor: "pointer",
              padding: 16,
              borderRadius: 12,
              border: creationMode === "phase_linked" ? "2.5px solid hsl(var(--gold))" : "1.5px solid hsl(var(--border-subtle))",
              background: creationMode === "phase_linked" ? "rgba(217, 119, 6, 0.08)" : "hsl(var(--bg-subtle))",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>🏗️</span>
              <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: creationMode === "phase_linked" ? "hsl(var(--gold))" : "inherit" }}>
                استيراد وتعبئة تلقائية من مراحل المشروع (موصى به)
              </h4>
            </div>
            <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: 0, lineHeight: 1.5 }}>
              اختيار بند المرحلة من المشروع لتعبئة اسم البند، الكميات، ورقم المبنى وسعر الوحدة آلياً، وتحديث نسبة تنفيد المرحلة باسم المقاول فورياً، والتسميع في حساب المشروع.
            </p>
          </div>

          {/* Mode 2: Manual Entry */}
          <div
            onClick={() => setCreationMode("manual")}
            style={{
              cursor: "pointer",
              padding: 16,
              borderRadius: 12,
              border: creationMode === "manual" ? "2.5px solid #3b82f6" : "1.5px solid hsl(var(--border-subtle))",
              background: creationMode === "manual" ? "rgba(59, 130, 246, 0.08)" : "hsl(var(--bg-subtle))",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>✍️</span>
              <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: creationMode === "manual" ? "#3b82f6" : "inherit" }}>
                إدخال يدوي مباشر (التنسيق المباشر)
              </h4>
            </div>
            <p style={{ fontSize: 12, color: "hsl(var(--text-muted))", margin: 0, lineHeight: 1.5 }}>
              إدخال تفاصيل البنود والأسعار والمبالغ يدوياً بدون الربط بمراحل المشروع، مع التسميع التلقائي أيضاً في حساب وتكاليف المشروع فور الحفظ.
            </p>
          </div>
        </div>
      </div>

      {/* FORM CONTAINER WITH CLEAR BORDERS */}
      <div className="card" style={{ border: "2px solid hsl(var(--border-subtle))" }}>
        <div className="card-body" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit}>
            {/* Header Info Block */}
            <div style={{ background: "hsl(var(--bg-subtle))", padding: 18, borderRadius: 10, marginBottom: 20, border: "1px solid hsl(var(--border-subtle))" }}>
              <div className="grid-3" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>رقم المستخلص *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontWeight: 800, color: "hsl(var(--gold))" }}
                    required
                    value={docNo}
                    onChange={(e) => setDocNo(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>المقاول المستفيد *</label>
                  <select
                    className="form-control"
                    style={{ fontWeight: 700 }}
                    required
                    value={subcontractorId}
                    onChange={(e) => setSubcontractorId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المقاول --</option>
                    {subcontractors.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        🔧 {sub.name} ({sub.specialty || "أعمال عامة"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>المشروع المستهدف *</label>
                  <select
                    className="form-control"
                    style={{ fontWeight: 700 }}
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المشروع --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>🏗️ {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-3" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">تاريخ المستخلص</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">الفترة من</label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">الفترة إلى</label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Items Section Banner */}
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: "hsl(var(--gold))", margin: 0 }}>
                  📋 بنود المستخلص والكميات المنفذة ({creationMode === "phase_linked" ? "مربوطة بمراحل المشروع" : "إدخال يدوي"})
                </h3>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={handleAddItemRow} style={{ fontSize: 12, fontWeight: 800 }}>
                + إضافة بند جديد
              </button>
            </div>

            {/* Items Breakdown Table with High Visibility Borders */}
            <div style={{ overflowX: "auto", border: "2px solid hsl(var(--border-subtle))", borderRadius: 10, marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "hsl(var(--bg-elevated))", borderBottom: "2px solid hsl(var(--border-subtle))" }}>
                    <th style={{ width: 35, padding: "10px 6px", textAlign: "center" }}>#</th>
                    {creationMode === "phase_linked" && (
                      <th style={{ padding: "10px 6px", minWidth: 140 }}>اختيار مرحلة المشروع</th>
                    )}
                    <th style={{ padding: "10px 6px", minWidth: 140 }}>اسم البند / التفاصيل *</th>
                    <th style={{ width: 100, padding: "10px 6px" }}>النموذج</th>
                    <th style={{ width: 100, padding: "10px 6px" }}>رقم المبنى</th>
                    <th style={{ width: 85, padding: "10px 6px" }}>الدور</th>
                    <th style={{ width: 85, padding: "10px 6px" }}>الوحدة</th>
                    <th style={{ width: 85, padding: "10px 6px" }}>إجمالي الكمية</th>
                    <th style={{ width: 85, padding: "10px 6px" }}>نسبة الإنجاز%</th>
                    <th style={{ width: 90, padding: "10px 6px" }}>الكمية المنفذة</th>
                    <th style={{ width: 90, padding: "10px 6px" }}>سعر الوحدة</th>
                    <th style={{ width: 100, padding: "10px 6px", textAlign: "left" }}>الإجمالي</th>
                    <th style={{ width: 40, padding: "10px 6px", textAlign: "center" }}>🗑️</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>

                      {creationMode === "phase_linked" && (
                        <td style={{ padding: 4 }}>
                          <select
                            className="form-control"
                            style={{ padding: "6px 8px", fontSize: 11, borderColor: row.phaseId ? "hsl(var(--gold))" : undefined, fontWeight: 700 }}
                            value={row.phaseId || ""}
                            onChange={(e) => handleSelectPhase(idx, e.target.value)}
                          >
                            <option value="">-- اختر مرحلة لاستيراد بياناتها --</option>
                            {projectPhases.map((phase) => (
                              <option key={phase.id} value={phase.id}>
                                🏗️ {phase.phaseName} ({phase.totalSurveyedQty} {phase.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                      )}

                      <td style={{ padding: 4 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="وصف البند..."
                          required
                          value={row.itemDesc}
                          onChange={(e) => handleItemChange(idx, "itemDesc", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="النموذج"
                          value={row.modelName || ""}
                          onChange={(e) => handleItemChange(idx, "modelName", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="رقم المبنى"
                          value={row.buildingNo || ""}
                          onChange={(e) => handleItemChange(idx, "buildingNo", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          placeholder="الدور"
                          value={row.floorNo || ""}
                          onChange={(e) => handleItemChange(idx, "floorNo", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <select
                          className="form-control"
                          style={{ padding: "6px 6px", fontSize: 12 }}
                          value={row.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        >
                          <option value="متر مسطح">متر مسطح</option>
                          <option value="م.مسطح">م.مسطح</option>
                          <option value="م²">م²</option>
                          <option value="م³">م³</option>
                          <option value="طن">طن</option>
                          <option value="عدد">عدد</option>
                          <option value="يومية">يومية</option>
                          <option value="مقطوعية">مقطوعية</option>
                        </select>
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ padding: "6px 6px", fontSize: 12 }}
                          value={row.totalQty || ""}
                          onChange={(e) => handleItemChange(idx, "totalQty", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ padding: "6px 6px", fontSize: 12, fontWeight: 800, color: "hsl(var(--gold))" }}
                          value={row.execPercent || ""}
                          onChange={(e) => handleItemChange(idx, "execPercent", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ padding: "6px 6px", fontSize: 12, background: "hsl(var(--bg-elevated))" }}
                          readOnly
                          value={row.execQty || 0}
                        />
                      </td>

                      <td style={{ padding: 4 }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ padding: "6px 6px", fontSize: 12 }}
                          value={row.unitPrice || ""}
                          onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                        />
                      </td>

                      <td style={{ padding: 4, textAlign: "left", fontWeight: 900, color: "hsl(var(--gold))" }}>
                        {formatCurrency(row.rowTotal || 0)}
                      </td>

                      <td style={{ textAlign: "center", padding: 4 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ padding: "2px 6px", color: "#ef4444" }}
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={items.length <= 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary Box with Clear Border */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                color: "#ffffff",
                padding: "16px 20px",
                borderRadius: 12,
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "2px solid hsl(var(--gold))",
              }}
            >
              <div>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#cbd5e1" }}>الإجمالي الكلي للمستخلص:</span>
                <div style={{ fontSize: 11, opacity: 0.8 }}>يسمّع آلياً في كشف حساب وتكاليف المشروع والمركز المالي</div>
              </div>
              <span style={{ fontWeight: 900, color: "hsl(var(--gold))", fontSize: 24 }}>{formatCurrency(grandTotal)}</span>
            </div>

            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800 }}>حالة التسديد والاعتماد *</label>
                <select className="form-control" style={{ fontWeight: 700 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="مدفوع">مدفوع / مسدد بالكامل</option>
                  <option value="معلق">معلق / غير مسدد</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات المستخلص</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ملاحظات تفصيلية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/subcontractor-docs" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: "12px 26px", fontSize: 15 }}>
                {submitting ? <span className="spinner" /> : "حفظ المستخلص والتسميع في حساب المشروع"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
