"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const LOCAL_STORAGE_KEY = "eljabal_subcontractors_data";

export default function SubcontractorsPage() {
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("أعمال المحارة والتشطيبات");
  const [phone, setPhone] = useState("");
  const [commercialRegNo, setCommercialRegNo] = useState("");
  const [status, setStatus] = useState("نشط");
  const [notes, setNotes] = useState("");

  const saveToLocalStorage = (list: any[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    let localItems: any[] = [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) localItems = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await fetch("/api/subcontractors");
      const apiData = await res.json();
      if (Array.isArray(apiData)) {
        const mergedMap = new Map();
        localItems.forEach((s) => mergedMap.set(s.id || s.name, s));
        apiData.forEach((s) => mergedMap.set(s.id || s.name, s));

        const finalMerged = Array.from(mergedMap.values());
        setSubcontractors(finalMerged);
        saveToLocalStorage(finalMerged);
      } else if (localItems.length > 0) {
        setSubcontractors(localItems);
      }
    } catch (e) {
      console.error(e);
      if (localItems.length > 0) setSubcontractors(localItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSubcontractors = subcontractors.filter((s) => {
    const search = searchTerm.toLowerCase();
    const subName = s.name || "";
    const subPhone = s.phone || "";
    const subNotes = s.notes || "";
    const subRegNo = s.commercialRegNo || "";

    const matchSearch =
      !search ||
      subName.toLowerCase().includes(search) ||
      subPhone.includes(search) ||
      subRegNo.includes(search) ||
      subNotes.toLowerCase().includes(search);

    if (!matchSearch) return false;

    if (statusFilter === "active" && s.status !== "نشط") return false;
    if (statusFilter === "inactive" && s.status === "نشط") return false;

    return true;
  });

  const resetForm = () => {
    setName("");
    setSpecialty("أعمال المحارة والتشطيبات");
    setPhone("");
    setCommercialRegNo("");
    setStatus("نشط");
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingSubcontractor(s);
    setName(s.name || "");
    setSpecialty(s.specialty || "أعمال المحارة والتشطيبات");
    setPhone(s.phone || "");
    setCommercialRegNo(s.commercialRegNo || "");
    setStatus(s.status || "نشط");
    setNotes(s.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    const newSubItem = {
      id: "sub-" + Date.now(),
      name,
      specialty,
      phone: phone || "",
      commercialRegNo: commercialRegNo || "",
      status: status || "نشط",
      notes: notes || "",
      docsCount: 0,
      totalContracts: 0,
      totalPaid: 0,
      remaining: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newSubItem, ...subcontractors];
    setSubcontractors(updatedList);
    saveToLocalStorage(updatedList);
    setShowModal(false);
    resetForm();

    try {
      const res = await fetch("/api/subcontractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          specialty,
          phone,
          commercialRegNo,
          status,
          notes,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("API call error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcontractor || !name) return;

    setSubmitting(true);
    const updatedItem = {
      ...editingSubcontractor,
      name,
      specialty,
      phone,
      commercialRegNo,
      status,
      notes,
    };

    const updatedList = subcontractors.map((s) => (s.id === editingSubcontractor.id ? updatedItem : s));
    setSubcontractors(updatedList);
    saveToLocalStorage(updatedList);
    setEditingSubcontractor(null);
    resetForm();

    try {
      const res = await fetch("/api/subcontractors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSubcontractor.id,
          name,
          specialty,
          phone,
          commercialRegNo,
          status,
          notes,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("API update error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubcontractor = async (sId: string, sName: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف مقاول الباطن (${sName})؟`)) return;

    const updatedList = subcontractors.filter((s) => s.id !== sId);
    setSubcontractors(updatedList);
    saveToLocalStorage(updatedList);

    try {
      await fetch(`/api/subcontractors?id=${sId}`, { method: "DELETE" });
    } catch (e) {
      console.error("API delete error:", e);
    }
  };

  return (
    <div>
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🔧 مقاولو الباطن والشركات المنفذة</h1>
          <p className="page-subtitle">دليل مقاولي الباطن والشركات وتتبع السجل التجاري والعقود والمستخلصات</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة مقاول باطن
          </button>
          <Link href="/subcontractors/create" className="btn btn-ghost">
            + صفحة إضافة منفصلة
          </Link>
        </div>
      </div>

      {/* SEARCH AND STATUS FILTER BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 250px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث باسم المقاول، السجل التجاري، التخصص، أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>⚡ فلتر الحالة</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الحالات (الكل)</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">متوقف فقط</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading && subcontractors.length === 0 ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل بيانات مقاولي الباطن...</div>
            </div>
          ) : filteredSubcontractors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔧</div>
              <div className="empty-state-text">
                {searchTerm || statusFilter !== "all"
                  ? "لا يوجد مقاولون يطابقون فلاتر والبحث المحددة"
                  : "لم يتم تسجيل أي مقاول باطن بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول مقاول
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>الاسم / الشركة</th>
                  <th>السجل التجاري</th>
                  <th>التخصص</th>
                  <th>الهاتف</th>
                  <th style={{ textAlign: "center" }}>عدد المستخلصات</th>
                  <th>إجمالي العقود</th>
                  <th>إجمالي المدفوع</th>
                  <th>المتبقي</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 260, whiteSpace: "nowrap" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubcontractors.map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{s.name}</td>
                    <td>
                      {s.commercialRegNo ? (
                        <span className="badge badge-warning" style={{ fontWeight: 700 }}>🏢 س.ت: {s.commercialRegNo}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>-</span>
                      )}
                    </td>
                    <td><span className="badge badge-info">{s.specialty || "أعمال عامة"}</span></td>
                    <td>{s.phone || "-"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      <span className="badge badge-gold">{s.docsCount || 0}</span>
                    </td>
                    <td style={{ fontWeight: 800 }}>{formatCurrency(s.totalContracts || s.totalAmount || 0)}</td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(s.totalPaid || s.paidAmount || 0)}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(s.remaining || s.remainingAmount || 0)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${s.status === "نشط" ? "badge-success" : "badge-danger"}`}>
                        {s.status || "نشط"}
                      </span>
                    </td>
                    <td className="print:hidden" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" }}>
                        <Link
                          href={`/subcontractors/${s.id}/docs`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f640", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="عرض وإدارة مستخلصات المقاول"
                        >
                          📜 مستخلصات
                        </Link>
                        <Link
                          href={`/subcontractors/${s.id}/statement`}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#f59e0b15", color: "#d97706", border: "1px solid #f59e0b40", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="طباعة كشف حساب كامل للمقاول"
                        >
                          📄 كشف حساب
                        </Link>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(s)}
                          title="تعديل بيانات المقاول"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteSubcontractor(s.id, s.name)}
                          title="حذف المقاول"
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

      {/* ADD SUBCONTRACTOR MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">+ إضافة مقاول باطن جديد</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم المقاول / اسم الشركة *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: شركة السلام للمقاولات والتوريدات"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">رقم السجل التجاري (اختياري - للشركات)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: 102984 (إن وجد)"
                      value={commercialRegNo}
                      onChange={(e) => setCommercialRegNo(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم التواصل</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="01xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">التخصص / نوع الأعمال</label>
                    <select className="form-control" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                      <option value="أعمال المحارة والتشطيبات">أعمال المحارة والتشطيبات</option>
                      <option value="أعمال السباكة والصحي">أعمال السباكة والصحي</option>
                      <option value="أعمال الكهرباء وتمديدات الشبكات">أعمال الكهرباء وتمديدات الشبكات</option>
                      <option value="أعمال العزل والرخام">أعمال العزل والرخام</option>
                      <option value="أعمال الحفر والردم">أعمال الحفر والردم</option>
                      <option value="أعمال الحداده">أعمال الحداده</option>
                      <option value="أعمال الحداده والمسلح">أعمال الحداده والمسلح</option>
                      <option value="أعمال النجاره">أعمال النجاره</option>
                      <option value="أعمال المبانى">أعمال المبانى</option>
                      <option value="أعمال الدهان">أعمال الدهان</option>
                      <option value="أعمال الفاير">أعمال الفاير</option>
                      <option value="أعمال الديكور">أعمال الديكور</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحالة *</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="نشط">نشط</option>
                      <option value="متوقف">متوقف</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات تفصيلية حول العقد أو الشركة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ بيانات المقاول"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBCONTRACTOR MODAL */}
      {editingSubcontractor && (
        <div className="modal-overlay" onClick={() => setEditingSubcontractor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل بيانات مقاول الباطن ({editingSubcontractor.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingSubcontractor(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم المقاول / اسم الشركة *</label>
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
                    <label className="form-label">رقم السجل التجاري (اختياري - للشركات)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: 102984 (إن وجد)"
                      value={commercialRegNo}
                      onChange={(e) => setCommercialRegNo(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم التواصل</label>
                    <input
                      type="text"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">التخصص / نوع الأعمال</label>
                    <select className="form-control" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                      <option value="أعمال المحارة والتشطيبات">أعمال المحارة والتشطيبات</option>
                      <option value="أعمال السباكة والصحي">أعمال السباكة والصحي</option>
                      <option value="أعمال الكهرباء وتمديدات الشبكات">أعمال الكهرباء وتمديدات الشبكات</option>
                      <option value="أعمال العزل والرخام">أعمال العزل والرخام</option>
                      <option value="أعمال الحفر والردم">أعمال الحفر والردم</option>
                      <option value="أعمال الحداده">أعمال الحداده</option>
                      <option value="أعمال الحداده والمسلح">أعمال الحداده والمسلح</option>
                      <option value="أعمال النجاره">أعمال النجاره</option>
                      <option value="أعمال المبانى">أعمال المبانى</option>
                      <option value="أعمال الدهان">أعمال الدهان</option>
                      <option value="أعمال الفاير">أعمال الفاير</option>
                      <option value="أعمال الديكور">أعمال الديكور</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحالة *</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="نشط">نشط</option>
                      <option value="متوقف">متوقف</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingSubcontractor(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تحديث بيانات المقاول"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
