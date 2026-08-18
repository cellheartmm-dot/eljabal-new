"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";

export default function CreateProjectPhasePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const { showToast } = useToast();

  const [modelName, setModelName] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [unit, setUnit] = useState("م² (متر مربع)");
  const [unitPrice, setUnitPrice] = useState("0"); // NEW REQUIREMENT: Unit Price for Project Phase
  const [progressPercent, setProgressPercent] = useState("0");
  const [phaseNotes, setPhaseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Building rows
  const [buildings, setBuildings] = useState<any[]>([
    { id: "1", buildingName: "عمارة 1", floorNumber: "", totalQty: 0, unit: "م²", notes: "" }
  ]);

  const handleAddBuilding = () => {
    setBuildings([
      ...buildings,
      {
        id: Date.now().toString(),
        buildingName: `عمارة ${buildings.length + 1}`,
        floorNumber: "",
        totalQty: 0,
        unit: unit.split(" ")[0] || "م²",
        notes: ""
      }
    ]);
  };

  const handleRemoveBuilding = (id: string) => {
    if (buildings.length === 1) return;
    setBuildings(buildings.filter((b) => b.id !== id));
  };

  const handleBuildingChange = (id: string, field: string, val: any) => {
    setBuildings(
      buildings.map((b) => (b.id === id ? { ...b, [field]: val } : b))
    );
  };

  const totalSurveyedQty = buildings.reduce((acc, curr) => acc + (parseFloat(curr.totalQty) || 0), 0);
  const executedQty = (totalSurveyedQty * (parseFloat(progressPercent) || 0)) / 100;
  const numericUnitPrice = parseFloat(unitPrice) || 0;
  const totalPhaseCost = totalSurveyedQty * numericUnitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseName) return;

    setSubmitting(true);
    try {
      const payload = {
        id: Date.now().toString(),
        projectId,
        modelName,
        phaseName,
        unit,
        unitPrice: numericUnitPrice,
        progressPercent,
        executedQty,
        totalSurveyedQty,
        buildings,
        notes: phaseNotes,
        createdAt: new Date().toISOString(),
      };

      // 1. Save to API
      await fetch("/api/project-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(console.error);

      // 2. Backup in localStorage
      try {
        const stored = localStorage.getItem(`phases_${projectId}`);
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(payload);
        localStorage.setItem(`phases_${projectId}`, JSON.stringify(list));
      } catch (err) {
        console.error(err);
      }

      showToast("تم إنشاء وإضافة المرحلة/النموذج بنجاح 🎉", "success");
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">🏗️ إضافة نموذج/مرحلة للمشروع</h1>
          <p className="page-subtitle">تحديد كميات الحصر وسعر الوحدة الخاص بالبند ونسب التنفيذ والمباني</p>
        </div>
        <Link href={`/projects/${projectId}`} className="btn btn-ghost">
          ← العودة لملف المشروع
        </Link>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: "28px" }}>
          <form onSubmit={handleSubmit}>
            {/* Row 1: Model Name & Phase Statement */}
            <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  اسم النموذج (مثال: نموذج V2، نجارة عادية)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="اختياري - اسم مجموعة المباني"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  البيان / اسم المرحلة <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: حدادة، بناء، تشطيب..."
                  required
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Unit Price (NEW), Unit, Progress %, Executed Qty */}
            <div className="grid-4" style={{ gap: "16px", marginBottom: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
                  سعر الوحدة (جنيه) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="0.00"
                  style={{ fontWeight: 800, color: "hsl(var(--gold))" }}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
                <span style={{ fontSize: 10, color: "hsl(var(--text-muted))" }}>خاط بالبند (ليس له علاقة بمستخلصات المقاولين)</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الوحدة</label>
                <select
                  className="form-control"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>
                  نسبة التنفيذ % <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>(تبدأ 0% وتتحدث آلياً من المستخلص)</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  style={{ fontWeight: 800 }}
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الكمية المنفذة (محسوبة)</label>
                <div
                  style={{
                    background: "#eab308",
                    color: "#000000",
                    fontWeight: 900,
                    fontSize: 15,
                    height: 42,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {executedQty}
                </div>
              </div>
            </div>

            {/* Row 3: Notes */}
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">ملاحظات</label>
              <input
                type="text"
                className="form-control"
                placeholder="ملاحظات تفصيلية حول المرحلة"
                value={phaseNotes}
                onChange={(e) => setPhaseNotes(e.target.value)}
              />
            </div>

            {/* Buildings Section Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                borderTop: "1px solid hsl(var(--border-subtle))",
                paddingTop: 20,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                🏢 المباني والكميات
              </h3>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: "#10b981", color: "#ffffff", fontWeight: 700 }}
                onClick={handleAddBuilding}
              >
                + إضافة مبنى
              </button>
            </div>

            {/* Buildings Dynamic Table */}
            <div className="table-container" style={{ borderRadius: 10, border: "1px solid hsl(var(--border-subtle))", marginBottom: 24 }}>
              <table style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr style={{ background: "hsl(var(--bg-elevated))" }}>
                    <th style={{ width: 50, textAlign: "center" }}>#</th>
                    <th>رقم/اسم المبنى</th>
                    <th style={{ width: 100 }}>الدور</th>
                    <th>كمية الحصر</th>
                    <th style={{ width: 80, textAlign: "center" }}>الوحدة</th>
                    <th>إجمالي تكلفة المبنى (محسوبة)</th>
                    <th>ملاحظات</th>
                    <th style={{ width: 60, textAlign: "center" }}>إزالة</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((b, index) => {
                    const buildingQty = parseFloat(b.totalQty) || 0;
                    const buildingCost = buildingQty * numericUnitPrice;
                    return (
                      <tr key={b.id}>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            value={b.buildingName}
                            onChange={(e) => handleBuildingChange(b.id, "buildingName", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="مثال: دور 3"
                            value={b.floorNumber}
                            onChange={(e) => handleBuildingChange(b.id, "floorNumber", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            value={b.totalQty}
                            onChange={(e) => handleBuildingChange(b.id, "totalQty", e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="badge badge-info">
                            {unit.split(" ")[0] || "م²"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
                          {formatCurrency(buildingCost)}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="اختياري"
                            value={b.notes}
                            onChange={(e) => handleBuildingChange(b.id, "notes", e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveBuilding(b.id)}
                            style={{
                              background: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              width: 32,
                              height: 32,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Total Row */}
              <div
                style={{
                  background: "hsl(var(--bg-elevated))",
                  color: "hsl(var(--text-primary))",
                  padding: "12px 20px",
                  fontWeight: 900,
                  fontSize: 15,
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid hsl(var(--border-subtle))",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span>إجمالي كمية الحصر: </span>
                  <span style={{ fontSize: 18, color: "hsl(var(--gold))" }}>{totalSurveyedQty}</span>
                </div>
                <div>
                  <span>إجمالي التكلفة المقدرة للمرحلة: </span>
                  <span style={{ fontSize: 18, color: "hsl(var(--gold))" }}>{formatCurrency(totalPhaseCost)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center" style={{ borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: "20px" }}>
              <Link href={`/projects/${projectId}`} className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: "12px 28px", fontSize: "15px" }}>
                {submitting ? <span className="spinner" /> : "حفظ المرحلة والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
