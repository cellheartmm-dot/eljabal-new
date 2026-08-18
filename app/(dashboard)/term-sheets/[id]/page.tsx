"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function ViewTermSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/term-sheets?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setSheet(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const exportDocumentToExcel = async () => {
    if (!sheet) return;
    try {
      const res = await fetch(`/api/term-sheets/export?id=${sheet.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("فشل تصدير الملف: " + (err.error || res.statusText));
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href  = url;
      const cleanSubject = (sheet.subject || "مذكرة_شروط").replace(/[\s\/\\]+/g, "_");
      link.setAttribute("download", `${cleanSubject}_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("حدث خطأ أثناء التصدير: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "400px" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text">جاري تحميل مذكرة الشروط والاستثمار...</div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="empty-state" style={{ minHeight: "400px" }}>
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-text">لم يتم العثور على مذكرة الشروط المطلوبة</div>
        <Link href="/term-sheets" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
          ← العودة لمذكرات الشروط
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Top Action Bar (Hidden during printing) */}
      <div className="page-header print:hidden" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">📑 معاينة وطباعة مذكرة الشروط والاستثمار</h1>
          <p className="page-subtitle">عرض المذكرة بنفس التنسيق المالي المعتمد لشركة الجبل الذهبي وتصديرها إكسيل أو طباعتها PDF</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-gold" onClick={() => window.print()}>
            🖨️ طباعة المستند (PDF)
          </button>
          <button
            className="btn"
            style={{ background: "#10b981", color: "#fff", border: "1.5px solid #10b981", fontWeight: 800 }}
            onClick={exportDocumentToExcel}
          >
            📊 تصدير المستند إكسيل (Excel)
          </button>
          <Link href={`/term-sheets/create?edit=${sheet.id}`} className="btn btn-primary">
            ✏️ تعديل المذكرة
          </Link>
          <Link href="/term-sheets" className="btn btn-ghost">
            ← العودة للمذكرات
          </Link>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL TERM SHEET DOCUMENT (EXACT DESIGN MATCHING IMAGE) */}
      <div
        className="term-sheet-print-container"
        style={{
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 8,
          padding: "24px 28px",
          border: "2px solid #1e293b",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          fontFamily: "var(--font-sans), 'Inter', sans-serif",
          direction: "rtl",
        }}
      >
        {/* DOCUMENT TOP HEADER (GMC LOGO & TITLE) */}
        <div
          style={{
            background: "#0b2238",
            color: "#ffffff",
            padding: "16px 20px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            borderBottom: "3px solid #d97706",
          }}
        >
          {/* GMC Logo Block */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 48,
                height: 48,
                background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 24,
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              GMC
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b", letterSpacing: 0.5 }}>الجبل الذهبي</div>
              <div style={{ fontSize: 10, color: "#cbd5e1" }}>GOLDEN MOUNTAIN CONTRACTING</div>
            </div>
          </div>

          {/* Document Title */}
          <h1
            style={{
              fontSize: 19,
              fontWeight: 900,
              color: "#ffffff",
              margin: 0,
              textAlign: "center",
            }}
          >
            {sheet.docTitle || "مذكرة شروط واستثمار (Investment Term Sheet - V3)"}
          </h1>
        </div>

        {/* TOP METADATA TABLE */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 16,
            fontSize: 13,
            border: "1px solid #1e293b",
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "15%",
                  background: "#f1f5f9",
                  fontWeight: 900,
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                الموضوع:
              </td>
              <td
                style={{
                  width: "85%",
                  fontWeight: 800,
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                {sheet.subject}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  background: "#f1f5f9",
                  fontWeight: 900,
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                التاريخ:
              </td>
              <td
                style={{
                  fontWeight: 700,
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                {sheet.dateFormatted || sheet.date}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  background: "#f1f5f9",
                  fontWeight: 900,
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                طبيعة المستند:
              </td>
              <td
                style={{
                  fontWeight: 700,
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                }}
              >
                {sheet.docNature}
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 1 HEADER */}
        <div
          style={{
            background: "#0b2238",
            color: "#ffffff",
            padding: "8px 14px",
            fontWeight: 900,
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
          }}
        >
          <span>.1 تفاصيل قطعة الأرض والقيمة الإجمالية</span>
        </div>

        {/* SECTION 1 TABLE */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 20,
            fontSize: 13,
            border: "1px solid #1e293b",
          }}
        >
          <thead>
            <tr style={{ background: "#1e293b", color: "#ffffff" }}>
              <th style={{ padding: "8px 12px", textAlign: "right", width: "45%", border: "1px solid #334155" }}>
                البيان
              </th>
              <th style={{ padding: "8px 12px", textAlign: "center", width: "25%", border: "1px solid #334155" }}>
                التفاصيل والقيمة
              </th>
              <th style={{ padding: "8px 12px", textAlign: "right", width: "30%", border: "1px solid #334155" }}>
                ملاحظات وتوضيحات
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>مساحة الأرض</td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                {(sheet.landArea || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>متر مربع</td>
            </tr>

            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                سعر المتر المحدد من جهاز المدينة
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                {(sheet.pricePerMeter || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>جنيه مصري / م²</td>
            </tr>

            <tr style={{ background: "#f8fafc" }}>
              <td style={{ padding: "8px 12px", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                إجمالي ثمن الأرض من الجهاز
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, fontSize: 14, border: "1px solid #cbd5e1" }}>
                {(sheet.totalLandPrice || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                جنيه مصري ({(sheet.landArea || 0).toLocaleString()} م² × {(sheet.pricePerMeter || 0).toLocaleString()} ج.م)
              </td>
            </tr>

            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                الدفعة المقدمة المدفوعة للجهاز ({sheet.advancePercent || 10}%)
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                {(sheet.advancePayment || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>
                جنيه مصري ({((sheet.advancePayment || 0) / 1000000).toFixed(1)} ملايين)
              </td>
            </tr>

            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                مقابل التنازل / الأوفر للشركة (Overprice)
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                {(sheet.overprice || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>
                جنيه مصري ({((sheet.overprice || 0) / 1000000).toFixed(1)} مليون)
              </td>
            </tr>

            <tr style={{ background: "#fef3c7" }}>
              <td style={{ padding: "10px 12px", fontWeight: 900, border: "1px solid #d97706", color: "#92400e" }}>
                إجمالي السيولة المطلوبة لتملك العقد الحالي
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: 16,
                  border: "1px solid #d97706",
                  color: "#92400e",
                }}
              >
                {(sheet.totalRequiredLiquidity || 0).toLocaleString()}
              </td>
              <td style={{ padding: "10px 12px", fontWeight: 900, border: "1px solid #d97706", color: "#92400e" }}>
                جنيه مصري (مقدم + أوفر)
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 2 HEADER */}
        <div
          style={{
            background: "#0b2238",
            color: "#ffffff",
            padding: "8px 14px",
            fontWeight: 900,
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
          }}
        >
          <span>.2 شروط وهيكلة الشراكة الاستثمارية (حصة النصف - {sheet.partnerSharePercent || 50}%)</span>
        </div>

        {/* SECTION 2 TABLE */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 20,
            fontSize: 13,
            border: "1px solid #1e293b",
          }}
        >
          <thead>
            <tr style={{ background: "#1e293b", color: "#ffffff" }}>
              <th style={{ padding: "8px 12px", textAlign: "right", width: "45%", border: "1px solid #334155" }}>
                بند الشراكة
              </th>
              <th style={{ padding: "8px 12px", textAlign: "center", width: "25%", border: "1px solid #334155" }}>
                القيمة المستحقة على الشريك ({sheet.partnerSharePercent || 50}%)
              </th>
              <th style={{ padding: "8px 12px", textAlign: "right", width: "30%", border: "1px solid #334155" }}>
                ملاحظات السداد
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                حصة المساحة المستهدفة للشريك
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                {(sheet.partnerAreaShare || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>
                متر مربع (تساوي {sheet.partnerSharePercent || 50}% من المساحة)
              </td>
            </tr>

            <tr style={{ background: "#ecfdf5" }}>
              <td style={{ padding: "10px 12px", fontWeight: 900, border: "1px solid #10b981", color: "#065f46" }}>
                مبلغ الدخول في الشراكة المستحق
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: 16,
                  border: "1px solid #10b981",
                  color: "#065f46",
                }}
              >
                {(sheet.partnerEntryAmount || 0).toLocaleString()}
              </td>
              <td style={{ padding: "10px 12px", fontWeight: 900, border: "1px solid #10b981", color: "#065f46" }}>
                جنيه مصري (نصف السيولة المطلوبة - {((sheet.partnerEntryAmount || 0) / 1000000).toFixed(1)} ملايين)
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 3 HEADER */}
        <div
          style={{
            background: "#0b2238",
            color: "#ffffff",
            padding: "8px 14px",
            fontWeight: 900,
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
          }}
        >
          <span>.3 الالتزامات المالية التالية والأقساط للجهاز</span>
        </div>

        {/* SECTION 3 TABLE */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 20,
            fontSize: 13,
            border: "1px solid #1e293b",
          }}
        >
          <thead>
            <tr style={{ background: "#1e293b", color: "#ffffff" }}>
              <th style={{ padding: "8px 12px", textAlign: "right", width: "45%", border: "1px solid #334155" }}>
                البيان والالتزام المالي
              </th>
              <th style={{ padding: "8px 12px", textAlign: "center", width: "25%", border: "1px solid #334155" }}>
                النسبة / القيمة الإجمالية
              </th>
              <th style={{ padding: "8px 12px", textAlign: "right", width: "30%", border: "1px solid #334155" }}>
                التفاصيل وآلية السداد
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                دفعة استكمال جدية الحجز ({sheet.completionPercent || 16.5}%)
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                {(sheet.bookingCompletionAmount || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>
                استكمال ثمن الأرض + {sheet.taxPercent !== undefined ? sheet.taxPercent : 1.5}% ضريبة ومصاريف إدارية
              </td>
            </tr>

            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                حصة الشريك من دفعة الاستكمال
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                {(sheet.partnerBookingCompletionShare || 0).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>
                تُقسم بين الشريكين بنسبة 50% لكل منهما
              </td>
            </tr>

            <tr>
              <td style={{ padding: "8px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                الأقساط المتبقية للجهاز (75%)
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                {sheet.installmentsPeriod || "على 3 سنوات"}
              </td>
              <td style={{ padding: "8px 12px", color: "#475569", border: "1px solid #cbd5e1" }}>
                {sheet.installmentsNotes || "يُسدد المتبقي على 3 سنوات + 1.5% ضريبة على كل قسط"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* FOOTER NOTE BOX */}
        <div
          style={{
            background: "#e2e8f0",
            color: "#334155",
            padding: "10px 16px",
            borderRadius: 6,
            fontSize: 12,
            fontStyle: "italic",
            textAlign: "center",
            border: "1px solid #cbd5e1",
            fontWeight: 700,
          }}
        >
          {sheet.footerNote ||
            "تنويه: تُعد هذه المذكرة إطاراً مالياً واستثمارياً مبدئياً للاتفاق، وتخضع للمراجعة والتدقيق القانوني والمالي قبل توقيع العقود الرسمية."}
        </div>
      </div>
    </div>
  );
}
