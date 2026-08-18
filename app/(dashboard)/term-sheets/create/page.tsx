"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";

function TermSheetForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const [submitting, setSubmitting] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);

  // Form inputs
  const [docTitle, setDocTitle] = useState("مذكرة شروط واستثمار (Investment Term Sheet - V3)");
  const [subject, setSubject] = useState("مقترح مشاركة واستثمار عقاري لشراء أرض - حدائق العاصمة");
  const [dateFormatted, setDateFormatted] = useState("يوليو 2026");
  const [docNature, setDocNature] = useState("العرض المالي والهيكلة التمويلية المعدلة (أوفر 12 مليون)");

  // Section 1: Land details
  const [landArea, setLandArea] = useState("2000");
  const [pricePerMeter, setPricePerMeter] = useState("30000");
  const [advancePercent, setAdvancePercent] = useState("10");
  const [advanceAmount, setAdvanceAmount] = useState("6000000");
  const [overprice, setOverprice] = useState("12000000");

  // Section 2: Partnership
  const [partnerSharePercent, setPartnerSharePercent] = useState("50");

  // Section 3: Next Obligations
  const [completionPercent, setCompletionPercent] = useState("16.5");
  const [taxPercent, setTaxPercent] = useState("1.5");
  const [partnerBookingCompletionShare, setPartnerBookingCompletionShare] = useState("0");
  const [installmentsPeriod, setInstallmentsPeriod] = useState("على 3 سنوات");
  const [installmentsNotes, setInstallmentsNotes] = useState("يُسدد المتبقي على 3 سنوات + 1.5% ضريبة على كل قسط");
  const [footerNote, setFooterNote] = useState(
    "تنويه: تُعد هذه المذكرة إطاراً مالياً واستثمارياً مبدئياً للاتفاق، وتخضع للمراجعة والتدقيق القانوني والمالي قبل توقيع العقود الرسمية."
  );

  useEffect(() => {
    if (isEditing && editId) {
      fetch(`/api/term-sheets?id=${editId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setDocTitle(data.docTitle || "مذكرة شروط واستثمار (Investment Term Sheet - V3)");
            setSubject(data.subject || "");
            setDateFormatted(data.dateFormatted || "يوليو 2026");
            setDocNature(data.docNature || "");

            const area = data.landArea || 2000;
            const price = data.pricePerMeter || 30000;
            const total = area * price;
            const pct = data.advancePercent !== undefined ? data.advancePercent : 10;
            const amt = data.advancePayment !== undefined ? data.advancePayment : total * (pct / 100);

            setLandArea(String(area));
            setPricePerMeter(String(price));
            setAdvancePercent(String(pct));
            setAdvanceAmount(String(amt));
            setOverprice(String(data.overprice || 12000000));

            setPartnerSharePercent(String(data.partnerSharePercent || 50));

            setCompletionPercent(String(data.completionPercent || 16.5));
            setTaxPercent(String(data.taxPercent !== undefined ? data.taxPercent : 1.5));
            setPartnerBookingCompletionShare(String(data.partnerBookingCompletionShare || 0));
            setInstallmentsPeriod(data.installmentsPeriod || "على 3 سنوات");
            setInstallmentsNotes(data.installmentsNotes || "");
            setFooterNote(data.footerNote || "");
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDoc(false));
    }
  }, [editId, isEditing]);

  // LIVE AUTOMATIC FORMULA CALCULATIONS
  const numericArea = parseFloat(landArea) || 0;
  const numericPrice = parseFloat(pricePerMeter) || 0;
  const totalLandPrice = numericArea * numericPrice;

  const numericAdvancePct = parseFloat(advancePercent) || 0;
  const advancePayment = parseFloat(advanceAmount) || (totalLandPrice * (numericAdvancePct / 100));

  const handleLandAreaChange = (val: string) => {
    setLandArea(val);
    const area = parseFloat(val) || 0;
    const total = area * numericPrice;
    if (numericAdvancePct > 0) {
      setAdvanceAmount(total > 0 ? String(total * (numericAdvancePct / 100)) : "0");
    }
  };

  const handlePricePerMeterChange = (val: string) => {
    setPricePerMeter(val);
    const price = parseFloat(val) || 0;
    const total = numericArea * price;
    if (numericAdvancePct > 0) {
      setAdvanceAmount(total > 0 ? String(total * (numericAdvancePct / 100)) : "0");
    }
  };

  const handleAdvancePercentChange = (val: string) => {
    setAdvancePercent(val);
    const pct = parseFloat(val) || 0;
    if (totalLandPrice > 0) {
      const calcAmt = totalLandPrice * (pct / 100);
      setAdvanceAmount(calcAmt ? String(calcAmt) : "0");
    }
  };

  const handleAdvanceAmountChange = (val: string) => {
    setAdvanceAmount(val);
    const amt = parseFloat(val) || 0;
    if (totalLandPrice > 0) {
      const calcPct = (amt / totalLandPrice) * 100;
      setAdvancePercent(calcPct ? String(Math.round(calcPct * 100) / 100) : "0");
    }
  };

  const numericOverprice = parseFloat(overprice) || 0;
  const totalRequiredLiquidity = advancePayment + numericOverprice;

  const numericPartnerSharePct = parseFloat(partnerSharePercent) || 0;
  const partnerAreaShare = numericArea * (numericPartnerSharePct / 100);
  const partnerEntryAmount = totalRequiredLiquidity * (numericPartnerSharePct / 100);

  const numericCompletionPct = parseFloat(completionPercent) || 0;
  const bookingCompletionAmount = totalLandPrice * (numericCompletionPct / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;

    setSubmitting(true);
    try {
      const payload = {
        id: editId || undefined,
        docTitle,
        subject,
        dateFormatted,
        docNature,

        landArea: numericArea,
        pricePerMeter: numericPrice,
        advancePercent: numericAdvancePct,
        advancePayment: advancePayment,
        overprice: numericOverprice,

        partnerSharePercent: numericPartnerSharePct,

        completionPercent: numericCompletionPct,
        taxPercent: parseFloat(taxPercent) || 0,
        partnerBookingCompletionShare: parseFloat(partnerBookingCompletionShare) || 0,
        installmentsPeriod,
        installmentsNotes,
        footerNote,
      };

      const res = await fetch("/api/term-sheets", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(isEditing ? "تم تحديث مذكرة الشروط بنجاح 🎉" : "تم حفظ وإنشاء مذكرة الشروط والاستثمار بنجاح 🎉", "success");
        router.push("/term-sheets");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="empty-state" style={{ minHeight: "350px" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text">جاري تحميل بيانات المذكرة للتعديل...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header Inputs */}
      <div style={{ background: "hsl(var(--bg-elevated))", padding: 18, borderRadius: 12, marginBottom: 24, border: "1px solid hsl(var(--border-subtle))" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 14 }}>
          📌 البيانات العامة للترويسة والموضوع
        </h3>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">عنوان المذكرة الرئيسي</label>
          <input
            type="text"
            className="form-control"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />
        </div>

        <div className="grid-3" style={{ gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الموضوع <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="مثال: مقترح مشاركة واستثمار عقاري لشراء أرض..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">التاريخ الصريح</label>
            <input
              type="text"
              className="form-control"
              placeholder="مثال: يوليو 2026"
              value={dateFormatted}
              onChange={(e) => setDateFormatted(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">طبيعة المستند</label>
            <input
              type="text"
              className="form-control"
              placeholder="العرض المالي والهيكلة التمويلية..."
              value={docNature}
              onChange={(e) => setDocNature(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: LAND & VALUES */}
      <div style={{ background: "hsl(var(--bg-elevated))", padding: 18, borderRadius: 12, marginBottom: 24, border: "1px solid hsl(var(--border-subtle))" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 14 }}>
          1. تفاصيل قطعة الأرض والقيمة الإجمالية (معادلات محسوبة تلقائياً)
        </h3>

        <div className="grid-2" style={{ gap: 16, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">مساحة الأرض (متر مربع - م²)</label>
            <input
              type="number"
              className="form-control"
              value={landArea}
              onChange={(e) => handleLandAreaChange(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">سعر المتر المحدد من جهاز المدينة (جنيه / م²)</label>
            <input
              type="number"
              className="form-control"
              value={pricePerMeter}
              onChange={(e) => handlePricePerMeterChange(e.target.value)}
            />
          </div>
        </div>

        {/* Calculated Result Card for Total Land Price */}
        <div style={{ background: "hsl(var(--bg-subtle))", padding: "12px 16px", borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>إجمالي ثمن الأرض من الجهاز (مساحة × سعر المتر):</span>
          <span style={{ fontWeight: 900, color: "hsl(var(--gold))", fontSize: 18 }}>{formatCurrency(totalLandPrice)}</span>
        </div>

        {/* Dual Input for Advance Payment (% vs EGP) */}
        <div style={{ background: "hsl(var(--bg-subtle))", padding: 14, borderRadius: 10, marginBottom: 16, border: "1px solid hsl(var(--border-subtle))" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "hsl(var(--gold))", marginBottom: 10 }}>
            ⚡ الدفعة المقدمة المدفوعة للجهاز (يمكنك إدخال النسبة % أو المبلغ بالجنيه وسيتم التحديث التلقائي بينهما):
          </div>

          <div className="grid-2" style={{ gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>1️⃣ النسبة المئوية للدفعة (%)</label>
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="مثال: 10"
                value={advancePercent}
                onChange={(e) => handleAdvancePercentChange(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>2️⃣ أو المبلغ بالجنيه (جنيه مصري)</label>
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="مثال: 6000000"
                value={advanceAmount}
                onChange={(e) => handleAdvanceAmountChange(e.target.value)}
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 8 }}>
            💡 قيمة الدفعة المقدمة: <strong>{formatCurrency(advancePayment)}</strong> (تغطي نسبة <strong>{advancePercent || 0}%</strong> من ثمن الأرض)
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">مقابل التنازل / الأوفر للشركة (Overprice)</label>
          <input
            type="number"
            className="form-control"
            value={overprice}
            onChange={(e) => setOverprice(e.target.value)}
          />
        </div>

        <div style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", padding: "14px 18px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>إجمالي السيولة المطلوبة لتملك العقد الحالي (مقدم + أوفر):</span>
          <span style={{ fontWeight: 900, fontSize: 22 }}>{formatCurrency(totalRequiredLiquidity)}</span>
        </div>
      </div>

      {/* SECTION 2: PARTNERSHIP STRUCTURE */}
      <div style={{ background: "hsl(var(--bg-elevated))", padding: 18, borderRadius: 12, marginBottom: 24, border: "1px solid hsl(var(--border-subtle))" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 14 }}>
          2. شروط وهيكلة الشراكة الاستثمارية (حصة النصف - 50%)
        </h3>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">نسبة الشراكة المستهدفة للشريك (%)</label>
          <input
            type="number"
            step="any"
            className="form-control"
            value={partnerSharePercent}
            onChange={(e) => setPartnerSharePercent(e.target.value)}
          />
        </div>

        <div className="grid-2" style={{ gap: 14 }}>
          <div style={{ background: "hsl(var(--bg-subtle))", padding: 14, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>حصة المساحة المستهدفة للشريك</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "hsl(var(--gold))", marginTop: 4 }}>
              {partnerAreaShare.toLocaleString()} م² <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>(تساوي {partnerSharePercent}% من المساحة)</span>
            </div>
          </div>

          <div style={{ background: "hsl(var(--bg-subtle))", padding: 14, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>مبلغ الدخول المستحق على الشريك (50%)</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981", marginTop: 4 }}>
              {formatCurrency(partnerEntryAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: FUTURE OBLIGATIONS */}
      <div style={{ background: "hsl(var(--bg-elevated))", padding: 18, borderRadius: 12, marginBottom: 24, border: "1px solid hsl(var(--border-subtle))" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 14 }}>
          3. الالتزامات المالية التالية والأقساط للجهاز
        </h3>

        <div className="grid-3" style={{ gap: 16, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">نسبة دفعة استكمال جدية الحجز (%)</label>
            <input
              type="number"
              step="any"
              className="form-control"
              value={completionPercent}
              onChange={(e) => setCompletionPercent(e.target.value)}
            />
            <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>قيمة دفعة الاستكمال: {formatCurrency(bookingCompletionAmount)}</span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">نسبة الضريبة والمصاريف الإدارية (%)</label>
            <input
              type="number"
              step="any"
              className="form-control"
              placeholder="مثال: 1.5"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
            />
            <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>نسبة الضريبة القابلة للتعديل</span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">حصة الشريك من دفعة الاستكمال (جنيه)</label>
            <input
              type="number"
              className="form-control"
              value={partnerBookingCompletionShare}
              onChange={(e) => setPartnerBookingCompletionShare(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-2" style={{ gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الأقساط المتبقية للجهاز (فترة السداد)</label>
            <input
              type="text"
              className="form-control"
              value={installmentsPeriod}
              onChange={(e) => setInstallmentsPeriod(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ملاحظات وآلية سداد الأقساط</label>
            <input
              type="text"
              className="form-control"
              value={installmentsNotes}
              onChange={(e) => setInstallmentsNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">تنويه الهامش أسفل المذكرة</label>
        <textarea
          className="form-control"
          rows={2}
          value={footerNote}
          onChange={(e) => setFooterNote(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center" style={{ borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: 20 }}>
        <Link href="/term-sheets" className="btn btn-ghost">
          إلغاء
        </Link>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: "12px 28px", fontSize: "15px" }}>
          {submitting ? <span className="spinner" /> : isEditing ? "تحديث المذكرة والتأكيد" : "حفظ المذكرة وإنشاء المستند"}
        </button>
      </div>
    </form>
  );
}

export default function CreateTermSheetPage() {
  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">📑 إضافة/تعديل مذكرة شروط واستثمار</h1>
          <p className="page-subtitle">حاسبة ديناميكية لهيكلة التمويل وتقسيم حصص الشركاء وأقساط جهاز المدينة</p>
        </div>
        <Link href="/term-sheets" className="btn btn-ghost">
          ← العودة لمذكرات الشروط
        </Link>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 28 }}>
          <Suspense fallback={<div className="empty-state"><span className="spinner" /></div>}>
            <TermSheetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
