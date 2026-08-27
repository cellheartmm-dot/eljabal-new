import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  projectId?: string;
  isNew?: boolean;
}

export default function ProjectExpensesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [defaultProjectId, setDefaultProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  // Company info for printing
  const [companyName, setCompanyName] = useState("شركة المقاولات والاستثمار العقاري");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyLogo, setCompanyLogo] = useState("/logo.jpeg");

  const getTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects to get a default projectId if needed
      const [projRes, expRes, settingRes] = await Promise.all([
        supabase.from("Project").select("id, name").order("createdAt", { ascending: false }).limit(1),
        supabase.from("ProjectExpense").select("*").order("date", { ascending: false }),
        supabase.from("Setting").select("*"),
      ]);

      if (projRes.data && projRes.data.length > 0) {
        setDefaultProjectId(projRes.data[0].id);
      }

      if (settingRes.data) {
        const nameS = settingRes.data.find((s: any) => s.key === "companyName");
        const phoneS = settingRes.data.find((s: any) => s.key === "phone");
        const logoS = settingRes.data.find((s: any) => s.key === "companyLogo");
        if (nameS?.value) setCompanyName(nameS.value);
        if (phoneS?.value) setCompanyPhone(phoneS.value);
        if (logoS?.value) setCompanyLogo(logoS.value);
      }

      if (expRes.data) {
        const mapped: ExpenseItem[] = expRes.data.map((item: any) => {
          let desc = item.description || "";
          if (item.notes && item.notes.includes("[meta:")) {
            const stateMatch = item.notes.match(/statement=([^\|\]]+)/);
            if (stateMatch) desc = stateMatch[1];
          }
          return {
            id: item.id,
            date: item.date ? item.date.split("T")[0] : getTodayDate(),
            description: desc,
            amount: Number(item.amount) || 0,
            projectId: item.projectId,
          };
        });
        setExpenses(mapped);
      } else {
        const stored = localStorage.getItem("site_project_expenses");
        if (stored) {
          try {
            setExpenses(JSON.parse(stored));
          } catch (e) {
            setExpenses([]);
          }
        }
      }
    } catch (e: any) {
      const stored = localStorage.getItem("site_project_expenses");
      if (stored) {
        try {
          setExpenses(JSON.parse(stored));
        } catch (err) {
          setExpenses([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle adding a new row inline into the table
  const handleAddNewRow = () => {
    // If already editing a new unsaved row, prevent adding another
    if (editingId && expenses.some((e) => e.id === editingId && e.isNew)) {
      showToast("يرجى إكمال وحفظ الصف الحالي أولاً", "warning");
      return;
    }

    const tempId = "temp-" + Date.now();
    const today = getTodayDate();
    const newDraftItem: ExpenseItem = {
      id: tempId,
      date: today,
      description: "",
      amount: 0,
      projectId: defaultProjectId,
      isNew: true,
    };

    setExpenses((prev) => [newDraftItem, ...prev]);
    setEditingId(tempId);
    setEditForm({
      date: today,
      description: "",
      amount: "",
    });
  };

  // Start editing an existing row inline
  const handleStartEdit = (item: ExpenseItem) => {
    setEditingId(item.id);
    setEditForm({
      date: item.date ? item.date.split("T")[0] : getTodayDate(),
      description: item.description || "",
      amount: item.amount ? item.amount.toString() : "",
    });
  };

  // Cancel inline edit
  const handleCancelEdit = (item: ExpenseItem) => {
    if (item.isNew) {
      setExpenses((prev) => prev.filter((e) => e.id !== item.id));
    }
    setEditingId(null);
  };

  // Save row (New or Edit)
  const handleSaveRow = async (item: ExpenseItem) => {
    if (!editForm.description.trim()) {
      showToast("برجاء إدخال السبب / البيان للمصروف", "warning");
      return;
    }

    const numericAmount = parseFloat(editForm.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast("برجاء إدخال مبلغ صحيح أكبر من الصفر", "warning");
      return;
    }

    setSavingId(item.id);
    try {
      const formattedDate = new Date(editForm.date).toISOString();

      if (item.isNew) {
        // Insert into database
        const payload: any = {
          type: "مصروفات عامة",
          description: editForm.description.trim(),
          amount: numericAmount,
          date: formattedDate,
          notes: `[meta:statement=${editForm.description.trim()}|status=✅ معتمد ومرحل]`,
        };

        if (defaultProjectId) {
          payload.projectId = defaultProjectId;
        }

        const { data, error } = await supabase
          .from("ProjectExpense")
          .insert([payload])
          .select()
          .single();

        const newId = data?.id || "exp-" + Date.now();

        const updatedList = expenses.map((e) =>
          e.id === item.id
            ? {
                id: newId,
                date: editForm.date,
                description: editForm.description.trim(),
                amount: numericAmount,
                projectId: defaultProjectId,
                isNew: false,
              }
            : e
        );

        setExpenses(updatedList);
        localStorage.setItem("site_project_expenses", JSON.stringify(updatedList));
        showToast("تمت إضافة المصروف بنجاح ✅", "success");
      } else {
        // Update existing item
        const payload: any = {
          description: editForm.description.trim(),
          amount: numericAmount,
          date: formattedDate,
          notes: `[meta:statement=${editForm.description.trim()}|status=✅ معتمد ومرحل]`,
        };

        const { error } = await supabase.from("ProjectExpense").update(payload).eq("id", item.id);

        const updatedList = expenses.map((e) =>
          e.id === item.id
            ? {
                ...e,
                date: editForm.date,
                description: editForm.description.trim(),
                amount: numericAmount,
              }
            : e
        );

        setExpenses(updatedList);
        localStorage.setItem("site_project_expenses", JSON.stringify(updatedList));
        showToast("تم حفظ التعديلات بنجاح ✅", "success");
      }

      setEditingId(null);
    } catch (err: any) {
      // Fallback save locally
      const updatedList = expenses.map((e) =>
        e.id === item.id
          ? {
              id: item.isNew ? "local-" + Date.now() : item.id,
              date: editForm.date,
              description: editForm.description.trim(),
              amount: numericAmount,
              isNew: false,
            }
          : e
      );
      setExpenses(updatedList);
      localStorage.setItem("site_project_expenses", JSON.stringify(updatedList));
      showToast("تم حفظ المصروف محلياً بنجاح ✅", "success");
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  };

  // Delete row
  const handleDeleteRow = async (id: string, desc: string) => {
    if (!confirm(`هل أنت متأكد من حذف المصروف: "${desc || "هذا السجل"}"؟`)) return;

    try {
      await supabase.from("ProjectExpense").delete().eq("id", id);
    } catch (err) {}

    const updatedList = expenses.filter((e) => e.id !== id);
    setExpenses(updatedList);
    localStorage.setItem("site_project_expenses", JSON.stringify(updatedList));
    showToast("تم حذف المصروف بنجاح 🗑️", "success");
  };

  // Total amount calculation
  const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Embedded Print Styling */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .print-hide, .page-header, .sidebar, .mobile-topbar, .toast-container {
            display: none !important;
          }
          .print-show {
            display: block !important;
          }
          .card {
            background: #fff !important;
            border: 1px solid #000 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            color: #000 !important;
          }
          th, td {
            border: 1px solid #333 !important;
            padding: 8px 10px !important;
            color: #000 !important;
            font-size: 12pt !important;
          }
          th {
            background-color: #f2f2f2 !important;
            font-weight: bold !important;
          }
          .total-row {
            background-color: #f9f9f9 !important;
            font-weight: bold !important;
          }
        }
        .print-show {
          display: none;
        }
      `}</style>

      {/* PRINT HEADER (ONLY VISIBLE DURING PRINT) */}
      <div className="print-show" style={{ marginBottom: 20, textAlign: "center", borderBottom: "2px solid #333", paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{companyName}</h2>
            {companyPhone && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>هاتف: {companyPhone}</div>}
          </div>
          {companyLogo && (
            <img
              src={companyLogo}
              alt="Logo"
              style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8 }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 14, textDecoration: "underline" }}>
          بيان وكشف المصاريف العامة
        </h3>
        <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
          تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
        </div>
      </div>

      {/* PAGE HEADER */}
      <div
        className="page-header print-hide"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>💸</span>
            <span>مصروفات المشرفين والاعتماد</span>
          </h1>
          <p className="page-subtitle">جدول تسجيل ومتابعة المصروفات العامة والتشغيلية</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleAddNewRow}
            className="btn btn-primary"
            style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6, padding: "9px 18px" }}
          >
            <span>➕</span>
            <span>إضافة مصروف جديد</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn btn-ghost"
            style={{
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              border: "1px solid hsl(var(--border-subtle))",
            }}
          >
            <span>🖨️</span>
            <span>طباعة المصاريف العامة</span>
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="card" style={{ borderRadius: 16, overflow: "hidden" }}>
        <div className="table-container">
          {loading ? (
            <div className="empty-state" style={{ padding: "50px 20px" }}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
              <div className="empty-state-text" style={{ marginTop: 14, fontWeight: 700 }}>
                جاري تحميل جدول المصروفات...
              </div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="empty-state" style={{ padding: "60px 20px" }}>
              <div className="empty-state-icon" style={{ fontSize: 44 }}>💸</div>
              <div className="empty-state-text" style={{ marginTop: 10, fontSize: 15, fontWeight: 800 }}>
                لا توجد مصروفات مسجلة حالياً
              </div>
              <p style={{ fontSize: 13, color: "hsl(var(--text-muted))", marginTop: 4, marginBottom: 16 }}>
                اضغط على زر إضافة مصروف جديد للبدء في التسجيل الفوري داخل الجدول
              </p>
              <button onClick={handleAddNewRow} className="btn btn-primary btn-sm" style={{ padding: "8px 18px" }}>
                ➕ إضافة مصروف جديد
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: "center", padding: "14px 12px" }}>المسلسل</th>
                  <th style={{ width: 160, padding: "14px 12px" }}>التاريخ</th>
                  <th style={{ padding: "14px 12px" }}>السبب/البيان</th>
                  <th style={{ width: 170, padding: "14px 12px" }}>المبلغ</th>
                  <th className="print-hide" style={{ width: 130, textAlign: "center", padding: "14px 12px" }}>
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item, idx) => {
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={item.id}
                        style={{
                          background: "hsla(var(--primary) / 0.08)",
                          borderBottom: "1px solid hsl(var(--border-subtle))",
                        }}
                      >
                        {/* 1. المسلسل */}
                        <td style={{ textAlign: "center", fontWeight: 800, color: "hsl(var(--gold))" }}>
                          {idx + 1}
                        </td>

                        {/* 2. التاريخ */}
                        <td>
                          <input
                            type="date"
                            className="form-control"
                            style={{ padding: "6px 10px", minHeight: 36, fontSize: 13 }}
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          />
                        </td>

                        {/* 3. السبب/البيان */}
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="اكتب السبب أو البيان هنا..."
                            style={{ padding: "6px 10px", minHeight: 36, fontSize: 13 }}
                            autoFocus
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(item);
                              if (e.key === "Escape") handleCancelEdit(item);
                            }}
                          />
                        </td>

                        {/* 4. المبلغ */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            placeholder="0.00"
                            style={{
                              padding: "6px 10px",
                              minHeight: 36,
                              fontSize: 14,
                              fontWeight: 800,
                              color: "#ef4444",
                            }}
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRow(item);
                              if (e.key === "Escape") handleCancelEdit(item);
                            }}
                          />
                        </td>

                        {/* 5. إجراء */}
                        <td className="print-hide" style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              onClick={() => handleSaveRow(item)}
                              disabled={savingId === item.id}
                              className="btn btn-primary btn-sm"
                              style={{
                                padding: "4px 10px",
                                fontSize: 12,
                                background: "#10b981",
                                borderColor: "#10b981",
                              }}
                              title="حفظ"
                            >
                              {savingId === item.id ? (
                                <span className="spinner" style={{ width: 12, height: 12 }} />
                              ) : (
                                "💾 حفظ"
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelEdit(item)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              title="إلغاء"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}>
                      {/* 1. المسلسل */}
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>
                        {idx + 1}
                      </td>

                      {/* 2. التاريخ */}
                      <td style={{ fontWeight: 600 }}>{formatDateShort(item.date)}</td>

                      {/* 3. السبب/البيان */}
                      <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                        {item.description || "-"}
                      </td>

                      {/* 4. المبلغ */}
                      <td style={{ fontWeight: 900, fontSize: 14, color: "#ef4444" }}>
                        {formatCurrency(item.amount)}
                      </td>

                      {/* 5. إجراء */}
                      <td className="print-hide" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="btn-icon-centered"
                            title="تعديل السطر"
                            style={{ width: 30, height: 30, fontSize: 12 }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteRow(item.id, item.description)}
                            className="btn-icon-centered text-danger"
                            title="حذف المصروف"
                            style={{ width: 30, height: 30, fontSize: 12 }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* FOOTER: LAST ROW FOR TOTAL GENERAL EXPENSES */}
              <tfoot>
                <tr
                  className="total-row"
                  style={{
                    background: "hsl(var(--bg-elevated))",
                    borderTop: "2px solid hsl(var(--border-strong))",
                  }}
                >
                  <td
                    colSpan={3}
                    style={{
                      textAlign: "right",
                      padding: "16px 20px",
                      fontSize: 15,
                      fontWeight: 900,
                      color: "hsl(var(--text-primary))",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🧾</span>
                      <span>إجمالى المصاريف العامة</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "16px 12px",
                      fontSize: 17,
                      fontWeight: 900,
                      color: "#ef4444",
                    }}
                  >
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="print-hide" style={{ textAlign: "center" }}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
