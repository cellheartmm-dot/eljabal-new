"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_SPECIALTIES = [
  "نجار مسلح",
  "حداد مسلح",
  "بناء",
  "كهربائي",
  "سباك",
  "نقاش",
  "عامل عادي",
  "سائق معدات",
  "مبلط",
  "ملحي / مبيض محارة",
  "فني تكييف",
];

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Worker Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Worker Modal state
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Form states (Add / Edit)
  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(DEFAULT_SPECIALTIES);
  const [specialty, setSpecialty] = useState("نجار مسلح");
  const [isCustomSpecialty, setIsCustomSpecialty] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workers");
      const data = await res.json();
      if (Array.isArray(data)) setWorkers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();

    try {
      const stored = localStorage.getItem("worker_specialties");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const merged = Array.from(new Set([...DEFAULT_SPECIALTIES, ...parsed]));
          setSpecialties(merged);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSpecialtyChange = (val: string) => {
    if (val === "__ADD_NEW__") {
      setIsCustomSpecialty(true);
    } else {
      setIsCustomSpecialty(false);
      setSpecialty(val);
    }
  };

  const resetForm = () => {
    setName("");
    setSpecialty("نجار مسلح");
    setIsCustomSpecialty(false);
    setCustomSpecialty("");
    setDailyRate("");
    setPhone("");
    setNationalId("");
    setIsActive(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSpecialty = specialty;
    if (isCustomSpecialty) {
      const trimmed = customSpecialty.trim();
      if (!trimmed) return;
      finalSpecialty = trimmed;

      if (!specialties.includes(trimmed)) {
        const updated = [...specialties, trimmed];
        setSpecialties(updated);
        try {
          localStorage.setItem("worker_specialties", JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          specialty: finalSpecialty,
          dailyRate,
          phone,
          nationalId,
          isActive,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchWorkers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (w: any) => {
    setEditingWorker(w);
    setName(w.name || "");
    setSpecialty(w.specialty || "نجار مسلح");
    setIsCustomSpecialty(false);
    setCustomSpecialty("");
    setDailyRate(w.dailyRate?.toString() || "");
    setPhone(w.phone || "");
    setNationalId(w.nationalId || "");
    setIsActive(w.isActive ?? true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;

    let finalSpecialty = specialty;
    if (isCustomSpecialty) {
      const trimmed = customSpecialty.trim();
      if (!trimmed) return;
      finalSpecialty = trimmed;

      if (!specialties.includes(trimmed)) {
        const updated = [...specialties, trimmed];
        setSpecialties(updated);
        try {
          localStorage.setItem("worker_specialties", JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch("/api/workers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingWorker.id,
          name,
          specialty: finalSpecialty,
          dailyRate,
          phone,
          nationalId,
          isActive,
        }),
      });
      if (res.ok) {
        setEditingWorker(null);
        resetForm();
        fetchWorkers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteWorker = async (wId: string, wName: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف العامل (${wName}) نهائيًا؟`)) return;

    try {
      const res = await fetch(`/api/workers?id=${wId}`, { method: "DELETE" });
      if (res.ok) {
        setWorkers((prev) => prev.filter((w) => w.id !== wId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👷 الموارد البشرية - العمال</h1>
          <p className="page-subtitle">إدارة وتسجيل عمال الموقع واليوميات والسلف المنسوبة لكافة المهن</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          + إضافة عامل جديد
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل قائمة العمال...</div>
            </div>
          ) : workers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👷</div>
              <div className="empty-state-text">لم يتم إدخال أي عمال في النظام بعد</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { resetForm(); setShowAddModal(true); }}>
                + إضافة أول عامل
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>اسم العامل</th>
                  <th>رقم الهوية</th>
                  <th>الهاتف</th>
                  <th>المهنة / التخصص</th>
                  <th>سعر اليومية</th>
                  <th>إجمالي المدفوع</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th style={{ textAlign: "center", minWidth: 320 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w, idx) => (
                  <tr key={w.id}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>
                      {idx + 1}
                    </td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{w.name}</td>
                    <td>{w.nationalId || "-"}</td>
                    <td>{w.phone || "-"}</td>
                    <td><span className="badge badge-info">{w.specialty || "عامل"}</span></td>
                    <td className="text-gold" style={{ fontWeight: 800 }}>{formatCurrency(w.dailyRate || 0)}</td>
                    <td className="text-danger" style={{ fontWeight: 800 }}>{formatCurrency(w.totalPaid || 0)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${w.isActive ? "badge-success" : "badge-danger"}`}>
                        {w.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
                        {/* 📄 كشف حساب */}
                        <Link
                          href={`/workers/${w.id}/statement`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          title="كشف حساب العامل"
                        >
                          📄 كشف حساب
                        </Link>

                        {/* 📅 يوميات */}
                        <Link
                          href={`/workers/${w.id}/daily`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          title="يوميات العامل"
                        >
                          📅 يوميات
                        </Link>

                        {/* 💵 سلف */}
                        <Link
                          href={`/workers/${w.id}/advances`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          title="سلف العامل"
                        >
                          💵 سلف
                        </Link>

                        {/* ✏️ تعديل */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          title="تعديل بيانات العامل"
                          onClick={() => handleOpenEdit(w)}
                        >
                          ✏️ تعديل
                        </button>

                        {/* 🗑️ حذف */}
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          title="حذف العامل"
                          onClick={() => handleDeleteWorker(w.id, w.name)}
                        >
                          🗑️ حذف
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

      {/* ADD WORKER MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">إضافة عامل جديد</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم العامل بالكامل *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: أحمد محمد علي"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="form-label">التخصص / المهنة *</label>
                      {!isCustomSpecialty && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: "0 6px", color: "hsl(var(--gold))" }}
                          onClick={() => setIsCustomSpecialty(true)}
                        >
                          + مهنة جديدة
                        </button>
                      )}
                    </div>

                    {!isCustomSpecialty ? (
                      <select
                        className="form-control"
                        value={specialty}
                        onChange={(e) => handleSpecialtyChange(e.target.value)}
                      >
                        {specialties.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="__ADD_NEW__">➕ إضافة تخصص / مهنة جديدة...</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="المهنة الجديدة"
                          required
                          value={customSpecialty}
                          onChange={(e) => setCustomSpecialty(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomSpecialty(false);
                            setCustomSpecialty("");
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">الأجر اليومي (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="01xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم القومي</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="14 رقم"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submittingAdd}>
                  {submittingAdd ? <span className="spinner" /> : "حفظ البيانات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORKER MODAL */}
      {editingWorker && (
        <div className="modal-overlay" onClick={() => setEditingWorker(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل بيانات العامل</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingWorker(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم العامل بالكامل *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="form-label">التخصص / المهنة *</label>
                      {!isCustomSpecialty && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: "0 6px", color: "hsl(var(--gold))" }}
                          onClick={() => setIsCustomSpecialty(true)}
                        >
                          + مهنة جديدة
                        </button>
                      )}
                    </div>

                    {!isCustomSpecialty ? (
                      <select
                        className="form-control"
                        value={specialty}
                        onChange={(e) => handleSpecialtyChange(e.target.value)}
                      >
                        {specialties.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="__ADD_NEW__">➕ إضافة تخصص / مهنة جديدة...</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="المهنة الجديدة"
                          required
                          value={customSpecialty}
                          onChange={(e) => setCustomSpecialty(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                          onClick={() => {
                            setIsCustomSpecialty(false);
                            setCustomSpecialty("");
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">الأجر اليومي (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم القومي</label>
                    <input
                      type="text"
                      className="form-control"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الحالة</label>
                  <select
                    className="form-control"
                    value={isActive ? "true" : "false"}
                    onChange={(e) => setIsActive(e.target.value === "true")}
                  >
                    <option value="true">نشط (يعمل بالشركة)</option>
                    <option value="false">غير نشط (متوقف)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingWorker(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submittingEdit}>
                  {submittingEdit ? <span className="spinner" /> : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
