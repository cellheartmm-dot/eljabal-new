"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

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

const paymentMethods = [
  "نقدي",
  "تحويل بنكي",
  "شيك",
  "محفظة إلكترونية",
];

function CreateProjectExpenseForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const initialProjectId = searchParams.get("projectId") || "";
  const isEditing = Boolean(editId);

  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [type, setType] = useState("مواد بناء");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statement, setStatement] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");

  // NEW REQUIREMENT: Disbursed By / Paid By Field (القائم بالصرف)
  const [paidByOption, setPaidByOption] = useState("شركة الجبل");
  const [investorNameInput, setInvestorNameInput] = useState("");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(isEditing);

  useEffect(() => {
    // Fetch live projects list
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.projects || [];
        setProjects(list);
        if (!projectId && list.length > 0 && !isEditing) {
          setProjectId(list[0].id);
        }
      })
      .catch(console.error);

    if (isEditing && editId) {
      fetch("/api/project-expenses")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const target = data.find((e: any) => e.id === editId);
            if (target) {
              setProjectId(target.projectId || "");
              setType(target.type || "مواد بناء");
              setAmount(String(target.amount || 0));
              setStatement(target.statement || "");
              setNotes(target.notes || "");
              setPaymentMethod(target.paymentMethod || "نقدي");

              if (target.paidBy && target.paidBy.includes("المستثمر:")) {
                setPaidByOption("مستثمر");
                setInvestorNameInput(target.paidBy.replace("المستثمر:", "").trim());
              } else if (target.paidBy) {
                setPaidByOption(target.paidBy);
              }
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingExpense(false));
    }
  }, [editId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !amount) return;

    const finalPaidBy = paidByOption === "مستثمر" ? `المستثمر: ${investorNameInput || "شريك لم يسمى"}` : paidByOption;

    setSubmitting(true);
    try {
      const res = await fetch("/api/project-expenses", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId || undefined,
          projectId,
          type,
          date,
          statement,
          amount,
          paymentMethod,
          paidBy: finalPaidBy,
          description: notes,
        }),
      });

      if (res.ok) {
        showToast(isEditing ? "تم تحديث بيانات المصروف بنجاح 🎉" : "تم تسجيل وحفظ المصروف وتوثيق القائم بالصرف بنجاح 🎉", "success");
        router.push("/project-expenses");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExpense) {
    return (
      <div className="empty-state" style={{ minHeight: "350px" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل بيانات المصروف للتعديل...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 1. Project Selection */}
      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label className="form-label">
          المشروع <span className="text-danger">*</span>
        </label>
        <select
          className="form-control"
          required
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="" disabled>
            اختر المشروع من النظام
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name} ({p.client || "بدون عميل"})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Disbursed By / Paid By (NEW REQUIREMENT FOR INVESTORS & COMPANY) */}
      <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
            القائم بالصرف (جهة التمويل/الدافع) <span className="text-danger">*</span>
          </label>
          <select
            className="form-control"
            style={{ fontWeight: 700 }}
            value={paidByOption}
            onChange={(e) => setPaidByOption(e.target.value)}
          >
            <option value="شركة الجبل">شركة الجبل (خزينة الشركة)</option>
            <option value="مستثمر">مستثمر / شريك بالمشروع</option>
          </select>
        </div>

        {paidByOption === "مستثمر" ? (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
              اسم المستثمر / الشريك الدافع <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="أدخل اسم المستثمر (مثال: م. أحمد محمود)"
              required
              value={investorNameInput}
              onChange={(e) => setInvestorNameInput(e.target.value)}
            />
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">طريقة الدفع</label>
            <select
              className="form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Expense Type & Date */}
      <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            نوع المصروف <span className="text-danger">*</span>
          </label>
          <select
            className="form-control"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {expenseTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">التاريخ</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* 4. Statement & Amount */}
      <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">البيان</label>
          <input
            type="text"
            className="form-control"
            placeholder="مثال: فاتورة توريد حديد 10 طن"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            القيمة (جنيه) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            className="form-control"
            placeholder="0.00"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      {/* 5. Notes */}
      <div className="form-group" style={{ marginBottom: "24px" }}>
        <label className="form-label">ملاحظات</label>
        <textarea
          className="form-control"
          rows={3}
          placeholder="أية ملاحظات إضافية حول المورد أو تفاصيل الصرف..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center" style={{ borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: "20px" }}>
        <Link href="/project-expenses" className="btn btn-ghost">
          إلغاء
        </Link>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: "12px 28px", fontSize: "15px" }}>
          {submitting ? <span className="spinner" /> : isEditing ? "تحديث المصروف والتأكيد" : "حفظ المصروف وتحديد الصرف"}
        </button>
      </div>
    </form>
  );
}

export default function CreateProjectExpensePage() {
  return (
    <div style={{ maxWidth: 850, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">💸 إدارة مصروف المشروع والقائم بالصرف</h1>
          <p className="page-subtitle">تحديد القائم بالصرف (خزينة الشركة أو المستثمر) لضبط وتوثيق كشف حساب الشركاء</p>
        </div>
        <Link href="/project-expenses" className="btn btn-ghost">
          ← العودة لمصروفات المشاريع
        </Link>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: "28px" }}>
          <Suspense fallback={<div className="empty-state"><span className="spinner" /></div>}>
            <CreateProjectExpenseForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
