import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface EquipmentExpenseItem {
  id: string;
  equipmentId: string;
  projectId?: string;
  project?: { id: string; name: string };
  type: string; // "إيجار يومية المعدة", "سولار وجاز وبنزين", "صيانة وإصلاحات", "نثريات وقطع غيار"
  description: string;
  amount: number;
  driverName?: string;
  date: string;
}

interface Equipment {
  id: string;
  name: string;
  type?: string;
  plateNumber?: string;
  status: string;
  notes?: string;
  expenses?: EquipmentExpenseItem[];
}

interface Project {
  id: string;
  code: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  jobRole: string;
}

export default function EquipmentPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [driversList, setDriversList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add / Edit Equipment Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("حفارة");
  const [plateNumber, setPlateNumber] = useState("");
  const [status, setStatus] = useState("يعمل");
  const [notes, setNotes] = useState("");

  // Operating Expense Log Modal (مصروفات وقود/يوميات/صيانة وتصفية مشروع)
  const [showExpModal, setShowExpModal] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState("");
  const [expProjectId, setExpProjectId] = useState("");
  const [expType, setExpType] = useState("سولار وجاز وبنزين");
  const [expAmount, setExpAmount] = useState("");
  const [expDriverName, setExpDriverName] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expNotes, setExpNotes] = useState("");
  const [submittingExp, setSubmittingExp] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eqRes, projRes, empRes] = await Promise.all([
        supabase.from("Equipment").select("*, expenses:EquipmentExpense(*)").order("name", { ascending: true }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
        supabase.from("Employee").select("id, name, jobRole").order("name", { ascending: true }),
      ]);

      if (eqRes.data) setEquipmentList(eqRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (empRes.data) {
        // Drivers & Supervisors who act as Drivers
        setDriversList(empRes.data.filter((e) => e.jobRole === "سائق" || e.jobRole === "مشرف"));
      }
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل بيانات المعدات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setType("حفارة");
    setPlateNumber("");
    setStatus("يعمل");
    setNotes("");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (eq: Equipment) => {
    setEditingItem(eq);
    setName(eq.name || "");
    setType(eq.type || "حفارة");
    setPlateNumber(eq.plateNumber || "");
    setStatus(eq.status || "يعمل");
    setNotes(eq.notes || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const payload = { name, type, plateNumber, status, notes };

      if (editingItem) {
        const { error } = await supabase.from("Equipment").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        showToast("تم تحديث المعدة بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("Equipment").insert([payload]);
        if (error) throw error;
        showToast("تم إضافة المعدة بنجاح ✅", "success");
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Save Operating Expense & Auto-Post to Project Expense
  const handleSaveOperatingExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId || !expAmount) {
      showToast("برجاء اختيار المعدة وإدخال قيمة المصروف", "warning");
      return;
    }

    setSubmittingExp(true);
    try {
      const amt = parseFloat(expAmount);
      const selectedEq = equipmentList.find((eq) => eq.id === selectedEqId);
      const eqNameStr = selectedEq ? selectedEq.name : "معدة";

      const formattedNotes = `[meta:driver=${expDriverName}|projectId=${expProjectId}] ${expNotes}`.trim();
      const descStr = `${expType} للمعدة (${eqNameStr})${expDriverName ? " - السائق: " + expDriverName : ""}`;

      // 1. Insert into EquipmentExpense
      const { error: eqErr } = await supabase.from("EquipmentExpense").insert([
        {
          equipmentId: selectedEqId,
          type: expType,
          amount: amt,
          description: descStr,
          date: new Date(expDate).toISOString(),
        },
      ]);
      if (eqErr) throw eqErr;

      // 2. If Project Selected, Post Directly to ProjectExpense as well!
      if (expProjectId) {
        await supabase.from("ProjectExpense").insert([
          {
            projectId: expProjectId,
            type: "إيجار معدات",
            amount: amt,
            description: `تشغيل معدات بالموقع: ${descStr}`,
            notes: `[meta:supervisor=${expDriverName || "المشرف"}|targetCategory=خامات ومصروف موقع|status=✅ معتمد ومرحل] ${expNotes}`,
            date: new Date(expDate).toISOString(),
          },
        ]);
      }

      showToast("تم تسجيل مصروف تشغيل المعدة وتسميعه في حساب المشروع بنجاح ⛽✅", "success");
      setShowExpModal(false);
      setExpAmount("");
      setExpNotes("");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في تسجيل مصروف المعدة", "error");
    } finally {
      setSubmittingExp(false);
    }
  };

  const handleDelete = async (id: string, eqName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المعدة (${eqName})؟`)) return;
    try {
      const { error } = await supabase.from("Equipment").delete().eq("id", id);
      if (error) throw error;
      showToast("تم الحذف بنجاح ✅", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filtered = equipmentList.filter((eq) => {
    const s = searchTerm.toLowerCase();
    return (
      eq.name.toLowerCase().includes(s) ||
      (eq.plateNumber && eq.plateNumber.includes(s)) ||
      (eq.type && eq.type.toLowerCase().includes(s))
    );
  });

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🚛 إدارة المعدات والسيارات ومصروفات التشغيل</h1>
          <p className="page-subtitle">تتبع تشغيل المعدات، يوميات الوقود والجاز، السائقين، وتصفية التكاليف على المشاريع</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-gold" onClick={() => setShowExpModal(true)}>
            ⛽ + تسجيل مصروف تشغيل معدة (وقود/يومية/صيانة)
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة معدة جديدة
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 بحث باسم المعدة، رقم اللوحة، أو النوع..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجل المعدات...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚛</div>
              <div className="empty-state-text">
                {searchTerm ? "لا توجد نتائج تطابق البحث" : "لم يتم تسجيل أي معدات بالشركة بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول معدة
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>اسم المعدة / الآلية</th>
                  <th>النوع</th>
                  <th>رقم اللوحة / الشاسي</th>
                  <th>إجمالي مصروفات التشغيل والوقود</th>
                  <th style={{ textAlign: "center" }}>حالة التشغيل</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات والتسجيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq, idx) => {
                  const totalExp = eq.expenses ? eq.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
                  return (
                    <tr key={eq.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 800 }}>{eq.name}</td>
                      <td><span className="badge badge-info">{eq.type || "معدة"}</span></td>
                      <td>{eq.plateNumber || "-"}</td>
                      <td className="text-danger" style={{ fontWeight: 900, fontSize: 15 }}>{formatCurrency(totalExp)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${eq.status === "يعمل" ? "badge-success" : eq.status === "صيانة" ? "badge-warning" : "badge-danger"}`}>
                          {eq.status}
                        </span>
                      </td>
                      <td>{eq.notes || "-"}</td>
                      <td className="print:hidden" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            className="btn btn-gold btn-sm"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            onClick={() => {
                              setSelectedEqId(eq.id);
                              setShowExpModal(true);
                            }}
                            title="تسجيل مصروف تشغيل وقود أو صيانة لهذه المعدة"
                          >
                            ⛽ + مصروف
                          </button>
                          <button className="btn-icon-centered" onClick={() => handleOpenEdit(eq)} title="تعديل">
                            ✏️
                          </button>
                          <button className="btn-icon-centered text-danger" onClick={() => handleDelete(eq.id, eq.name)} title="حذف">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD/EDIT EQUIPMENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? "✏️ تعديل بيانات المعدة" : "🚛 إضافة معدة / سيارة جديدة"}</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم المعدة / الآلية *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: حفارة كوماتسو 200..."
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المعدة</label>
                    <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="حفارة">حفارة</option>
                      <option value="لودر">لودر</option>
                      <option value="سيارة نقل / شاحنة">سيارة نقل / شاحنة</option>
                      <option value="خلاطة خرسانة">خلاطة خرسانة</option>
                      <option value="مولد كهربائي">مولد كهربائي</option>
                      <option value="رافعات / أوناش">رافعات / أوناش</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم اللوحة / الشاسي</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: أ ب ج 1234..."
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">حالة التشغيل *</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="يعمل">يعمل جيدة بالموقع</option>
                    <option value="صيانة">تحت الصيانة والإصلاح</option>
                    <option value="متوقف">متوقف / عاطل</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات وصفية</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="أدخل أي ملاحظات عن حالة المعدة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : editingItem ? "حفظ التعديلات" : "إضافة المعدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPERATING EXPENSE & FUEL LOG MODAL (تسميع في المصروفات والمشروع) */}
      {showExpModal && (
        <div className="modal-overlay" onClick={() => setShowExpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">⛽ تسجيل مصروف تشغيل معدة (وقود/يوميات/صيانة)</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowExpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveOperatingExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اختر المعدة / الآلية *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedEqId}
                    onChange={(e) => setSelectedEqId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المعدة --</option>
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.name} ({eq.type})</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">المشروع المستفيد (تصفية التكلفة) *</label>
                    <select
                      className="form-control"
                      required
                      value={expProjectId}
                      onChange={(e) => setExpProjectId(e.target.value)}
                    >
                      <option value="" disabled>-- اختر المشروع --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع مصروف التشغيل *</label>
                    <select className="form-control" value={expType} onChange={(e) => setExpType(e.target.value)}>
                      <option value="سولار وجاز وبنزين">سولار وجاز وبنزين (وقود)</option>
                      <option value="إيجار يومية المعدة">إيجار يومية تشغيل المعدة</option>
                      <option value="صيانة وإصلاحات">صيانة وإصلاحات قطع غيار</option>
                      <option value="نثريات وتزييت">نثريات وتزييت وزيوت</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">قيمة المصروف (جنيه) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">السائق / المشرف القائم بالتشغيل</label>
                  <input
                    type="text"
                    list="drivers-list"
                    className="form-control"
                    placeholder="اختر أو اكتب اسم السائق / المشرف..."
                    value={expDriverName}
                    onChange={(e) => setExpDriverName(e.target.value)}
                  />
                  <datalist id="drivers-list">
                    {driversList.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.jobRole})</option>
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات وبيان الفاتورة</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: تعبئة 50 لتر سولار بموقع المشروع..."
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowExpModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-gold" disabled={submittingExp}>
                  {submittingExp ? <span className="spinner" /> : "⛽ تسجيل المصروف وتصفية المشروع"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
