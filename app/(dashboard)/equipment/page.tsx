"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateShort } from "@/lib/utils";

function getNextCode(list: any[]) {
  let maxNum = 0;
  list.forEach((item) => {
    const codeStr = item.code || "";
    const match = codeStr.match(/EQ-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `EQ-${String(nextNum).padStart(3, "0")}`;
}

export default function EquipmentPage() {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEquip, setEditingEquip] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states matching explicit requirements:
  // اسم المعدة * (حفار، رافعة، خلاطة...)
  // الكود (EQ-001)
  // الحالة (يعمل)
  // تاريخ الشراء (mm/dd/yyyy)
  // ملاحظات
  const [name, setName] = useState("");
  const [code, setCode] = useState("EQ-001");
  const [status, setStatus] = useState("يعمل");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/equipment");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.equipment || [];
      setEquipmentList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setCode(getNextCode(equipmentList));
    setStatus("يعمل");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (eq: any) => {
    setEditingEquip(eq);
    setName(eq.name || "");
    setCode(eq.code || getNextCode(equipmentList));
    setStatus(eq.status || "يعمل");
    setPurchaseDate(eq.purchaseDate || new Date().toISOString().split("T")[0]);
    setNotes(eq.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          status,
          purchaseDate,
          notes,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquip || !name) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEquip.id,
          name,
          code,
          status,
          purchaseDate,
          notes,
        }),
      });

      if (res.ok) {
        setEditingEquip(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eqId: string, eqName: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف المعدة (${eqName})؟`)) return;

    try {
      const res = await fetch(`/api/equipment?id=${eqId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered List
  const filteredEquipment = equipmentList.filter((eq) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      !search ||
      eq.name?.toLowerCase().includes(search) ||
      eq.code?.toLowerCase().includes(search) ||
      eq.notes?.toLowerCase().includes(search);

    if (!matchSearch) return false;
    if (statusFilter && eq.status !== statusFilter) return false;

    return true;
  });

  const workingCount = equipmentList.filter((eq) => eq.status === "يعمل").length;
  const maintenanceCount = equipmentList.filter((eq) => eq.status === "تحت الصيانة").length;

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🚛 المعدات والآلات</h1>
          <p className="page-subtitle">إدارة وتتبع سجل ومعدات وآلات الشركة وتواريخ الشراء والحالة والمصروفات</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة معدة جديدة
          </button>
          <Link href="/equipment/create" className="btn btn-gold">
            📝 صفحة إدخال معدة
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المعدات:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{equipmentList.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>إجمالي الآلات والمعدات المتاحة بالشركة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>المعدات الفعالة (تعمل):</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{workingCount}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>معدة حالية بحالة تشغيل جيدة بالواقع</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>تحت الصيانة / متوقفة:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{maintenanceCount}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>معدة تجري لها أعمال صيانة حالياً</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR (Side-by-Side Row) */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 230px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث باسم المعدة، الكود، أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>⚡ فلتر الحالة</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">جميع الحالات</option>
              <option value="يعمل">يعمل</option>
              <option value="تحت الصيانة">تحت الصيانة</option>
              <option value="متوقف">متوقف</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE WITH ACTIONS */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل قائمة المعدات...</div>
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚛</div>
              <div className="empty-state-text">
                {searchTerm || statusFilter ? "لا توجد معدات تتماشى مع الفلترة والبحث" : "لا توجد معدات مسجلة حالياً"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول معدة
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>الكود</th>
                  <th>اسم المعدة</th>
                  <th>تاريخ الشراء</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 180, whiteSpace: "nowrap" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((eq, idx) => (
                  <tr key={eq.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>{eq.code || `EQ-00${idx + 1}`}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{eq.name}</td>
                    <td>{eq.purchaseDate ? formatDateShort(eq.purchaseDate) : "-"}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${eq.status === "يعمل" ? "badge-success" : eq.status === "تحت الصيانة" ? "badge-warning" : "badge-danger"}`}>
                        {eq.status || "يعمل"}
                      </span>
                    </td>
                    <td>{eq.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" }}>
                        {/* 1. Dedicated Expenses Page */}
                        <Link
                          href={`/equipment/${eq.id}/expenses`}
                          className="btn btn-sm"
                          style={{ padding: "4px 10px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440", whiteSpace: "nowrap" }}
                          title="فتح صفحة كافة مصروفات المعدة"
                        >
                          💰 المصروفات
                        </Link>

                        {/* 2. Edit Equipment */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(eq)}
                          title="تعديل بيانات المعدة"
                        >
                          ✏️
                        </button>

                        {/* 3. Delete Equipment */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDelete(eq.id, eq.name)}
                          title="حذف المعدة"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD / EDIT EQUIPMENT MODAL */}
      {(showModal || editingEquip) && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingEquip(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEquip ? `✏️ تعديل بيانات المعدة (${editingEquip.code || "EQ-001"})` : `🚛 إضافة معدة جديد`}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingEquip(null); }}>✕</button>
            </div>
            <form onSubmit={editingEquip ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-body">
                {/* 1. اسم المعدة * */}
                <div className="form-group">
                  <label className="form-label">اسم المعدة *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: حفار، رافعة، خلاطة..."
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* 2. الكود + 3. الحالة */}
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">الكود</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="EQ-001"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الحالة</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="يعمل">يعمل</option>
                      <option value="تحت الصيانة">تحت الصيانة</option>
                      <option value="متوقف">متوقف</option>
                    </select>
                  </div>
                </div>

                {/* 4. تاريخ الشراء */}
                <div className="form-group">
                  <label className="form-label">تاريخ الشراء</label>
                  <input
                    type="date"
                    className="form-control"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>

                {/* 5. ملاحظات */}
                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="أي ملاحظات أو مواصفات فنية إضافية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingEquip(null); }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ المعدة والتأكيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
