"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function TermSheetsPage() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/term-sheets");
      const data = await res.json();
      if (Array.isArray(data)) setSheets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const handleDelete = async (id: string, subject: string) => {
    if (!confirm(`هل أنت تأكد من حذف مذكرة الشروط (${subject})؟`)) return;
    try {
      await fetch(`/api/term-sheets?id=${id}`, { method: "DELETE" });
      fetchSheets();
    } catch (e) {
      console.error(e);
    }
  };

  const exportToExcel = () => {
    if (sheets.length === 0) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "الموضوع,التاريخ,إجمالي ثمن الأرض,إجمالي السيولة المطلوبة,مبلغ الدخول بالشراكة,دفعة استكمال الحجز\n";

    sheets.forEach((s) => {
      const subj = `"${(s.subject || "").replace(/"/g, '""')}"`;
      const date = `"${s.dateFormatted || s.date || ""}"`;
      csvContent += `${subj},${date},${s.totalLandPrice || 0},${s.totalRequiredLiquidity || 0},${s.partnerEntryAmount || 0},${s.bookingCompletionAmount || 0}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `مذكرات_الشروط_والاستثمار_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSheets = sheets.filter(
    (s) =>
      !searchTerm ||
      (s.subject && s.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.docTitle && s.docTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 1150, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">📑 مذكرات الشروط والاستثمار (Investment Term Sheets)</h1>
          <p className="page-subtitle">إدارة وحساب مذكرات الشروط ومقترحات المشاركات العقارية وتصديرها وطباعتها</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-gold" onClick={exportToExcel} disabled={sheets.length === 0}>
            📊 تصدير إكسيل (Excel)
          </button>
          <Link href="/term-sheets/create" className="btn btn-primary">
            + إضافة مذكرة شروط جديدة
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 ابحث بالموضوع أو اسم المذكرة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            {loading ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <span className="spinner" style={{ width: 32, height: 32 }} />
                <div className="empty-state-text">جاري تحميل مذكرات الشروط...</div>
              </div>
            ) : filteredSheets.length === 0 ? (
              <div className="empty-state" style={{ padding: 36 }}>
                <div className="empty-state-icon" style={{ fontSize: 36 }}>📑</div>
                <div className="empty-state-text">لا توجد مذكرات شروط واستثمار مسجلة حالياً</div>
                <Link href="/term-sheets/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  + إضافة أول مذكرة شروط
                </Link>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: "hsl(var(--bg-elevated))" }}>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th>موضوع المقترح / أرض المشروع</th>
                    <th>التاريخ</th>
                    <th>إجمالي ثمن الأرض</th>
                    <th>إجمالي السيولة المطلوبة (مقدم + أوفر)</th>
                    <th>مبلغ الدخول بالشراكة (50%)</th>
                    <th style={{ width: 180, textAlign: "center" }}>الإجراءات والطباعة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSheets.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>
                        <Link href={`/term-sheets/${s.id}`} style={{ color: "inherit", textDecoration: "underline" }}>
                          {s.subject}
                        </Link>
                      </td>
                      <td><span className="badge badge-info">{s.dateFormatted || s.date}</span></td>
                      <td style={{ fontWeight: 800 }}>{formatCurrency(s.totalLandPrice)}</td>
                      <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>{formatCurrency(s.totalRequiredLiquidity)}</td>
                      <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(s.partnerEntryAmount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Link
                            href={`/term-sheets/${s.id}`}
                            className="btn btn-sm btn-primary"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            title="عرض وطباعة المستند الرسمية PDF"
                          >
                            🖨️ طباعة
                          </Link>
                          <Link
                            href={`/term-sheets/create?edit=${s.id}`}
                            className="btn btn-sm"
                            style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                            title="تعديل المذكرة"
                          >
                            ✏️ تعديل
                          </Link>
                          <button
                            className="btn btn-sm"
                            style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                            onClick={() => handleDelete(s.id, s.subject)}
                            title="حذف"
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
      </div>
    </div>
  );
}
