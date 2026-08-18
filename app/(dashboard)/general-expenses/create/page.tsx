"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateGeneralExpensePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form fields matching explicit user prompt:
  // التاريخ (07/28/2026)
  // نوع المصروف * - اختر
  // البيان
  // القيمة *
  // طريقة الدفع - نقدى او شيك
  // ملاحظات
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/general-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          description: description || `مصروف ${type}`,
          amount,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/general-expenses");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📉 تسجيل مصروف عام وإداري جديد</h1>
          <p className="page-subtitle">إدخال كافة بيانات وتفاصيل المصروف العام وتوثيقه بالنظام</p>
        </div>
        <Link href="/general-expenses" className="btn btn-ghost">
          ← العودة للمصروفات العامة
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* 1. التاريخ */}
            <div className="form-group">
              <label className="form-label">التاريخ *</label>
              <input
                type="date"
                className="form-control"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* 2. نوع المصروف * + 5. طريقة الدفع */}
            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">نوع المصروف *</label>
                <select
                  className="form-control"
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="" disabled>اختر نوع المصروف</option>
                  <option value="إيجارات ومرافق">إيجارات ومرافق (كهرباء/مياه)</option>
                  <option value="رواتب وأجور إدارية">رواتب وأجور إدارية</option>
                  <option value="صيانة ومهمات مكتبية">صيانة ومهمات مكتبية</option>
                  <option value="نثريات وضيافة">نثريات وضيافة</option>
                  <option value="رسوم وتراخيص حكومية">رسوم وتراخيص حكومية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">طريقة الدفع</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="نقدي">نقدي</option>
                  <option value="شيك بنكي">شيك بنكي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                </select>
              </div>
            </div>

            {/* 3. البيان */}
            <div className="form-group">
              <label className="form-label">البيان</label>
              <input
                type="text"
                className="form-control"
                placeholder="شرح وتفاصيل المصروف..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 4. القيمة * */}
            <div className="form-group">
              <label className="form-label">القيمة (جنيه) *</label>
              <input
                type="number"
                className="form-control"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* 6. ملاحظات */}
            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <input
                type="text"
                className="form-control"
                placeholder="أي ملاحظات أو رقم الفاتورة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/general-expenses" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ المصروف والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
