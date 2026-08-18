"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function SubcontractorStatementPage() {
  const params = useParams();
  const subId = params?.id as string;

  const [subcontractor, setSubcontractor] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const sRes = await fetch("/api/subcontractors");
        const sData = await sRes.json();
        if (Array.isArray(sData)) {
          const found = sData.find((item: any) => item.id === subId);
          if (found) setSubcontractor(found);
        }

        const dRes = await fetch(`/api/subcontractor-docs?subcontractorId=${subId}`);
        const dData = await dRes.json();
        if (Array.isArray(dData)) setDocs(dData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subId]);

  const totalContractsVal = docs.reduce((sum, d) => (d.type === "عقد" || d.type === "مستخلص" ? sum + (d.amount || 0) : sum), 0);
  const totalPaidVal = docs.reduce((sum, d) => (d.status === "مدفوع" || d.type === "دفعة" ? sum + (d.amount || 0) : sum), 0);
  const remainingVal = Math.max(0, totalContractsVal - totalPaidVal);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      {/* Top Header Buttons (Hidden on Print) */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📄 كشف حساب مقاول باطن</h1>
          <p className="page-subtitle">عرض وطباعة كشف الحساب التفصيلي الكامل لمقاول الباطن</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ طباعة كشف الحساب
          </button>
          <Link href={`/subcontractors/${subId}/docs`} className="btn btn-ghost">
            📜 مستخلصات المقاول
          </Link>
          <Link href="/subcontractors" className="btn btn-ghost">
            ← العودة للمقاولين
          </Link>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL ACCOUNT STATEMENT REPORT SHEET */}
      <div className="card" style={{ padding: 32, background: "#fff", color: "#1e293b", border: "1px solid #cbd5e1" }}>
        {/* Official Header */}
        <div style={{ borderBottom: "3px double #d97706", paddingBottom: 16, marginBottom: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#b45309", margin: 0 }}>شركة الجبل الذهبي للمقاولات العامة</h1>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 6, textDecoration: "underline" }}>
            كشف حساب تفصيلي لمقاول الباطن
          </h2>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginTop: 12 }}>
            <span>تاريخ إصدار التقرير: <strong>{new Date().toLocaleDateString("ar-EG")}</strong></span>
            <span>كود المقاول: <strong>{subcontractor?.id || subId}</strong></span>
          </div>
        </div>

        {/* Subcontractor Information Grid */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div className="grid-3" style={{ gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>اسم المقاول / الشركة:</span>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{subcontractor?.name || "جار التحميل..."}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>التخصص / طبيعة الأعمال:</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#2563eb" }}>{subcontractor?.specialty || "أعمال عامة"}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>رقم التواصل:</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{subcontractor?.phone || "-"}</div>
            </div>
          </div>
        </div>

        {/* Summary Financial Cards */}
        <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
          <div style={{ border: "2px solid #3b82f6", borderRadius: 12, padding: 16, textAlign: "center", background: "#eff6ff" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>إجمالي العقود والمستخلصات</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#1d4ed8", marginTop: 4 }}>{formatCurrency(totalContractsVal)}</div>
          </div>

          <div style={{ border: "2px solid #10b981", borderRadius: 12, padding: 16, textAlign: "center", background: "#ecfdf5" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>إجمالي المدفوعات المسددة</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#047857", marginTop: 4 }}>{formatCurrency(totalPaidVal)}</div>
          </div>

          <div style={{ border: "2px solid #f59e0b", borderRadius: 12, padding: 16, textAlign: "center", background: "#fffbeb" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>المتبقي المستحق للمقاول</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#b45309", marginTop: 4 }}>{formatCurrency(remainingVal)}</div>
          </div>
        </div>

        {/* Detailed Transactions Table */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>تفاصيل المستخلصات والعقود والمعاملات:</h3>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20 }}>جاري تحميل كشف الحساب...</div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>لا توجد معاملات مسجلة في كشف الحساب لهذا المقاول</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1", textAlign: "center" }}>#</th>
                  <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1" }}>التاريخ</th>
                  <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1" }}>النوع</th>
                  <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1" }}>البيان / تفاصيل العملية</th>
                  <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1", textAlign: "left" }}>المبلغ</th>
                  <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1", textAlign: "center" }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d, idx) => (
                  <tr key={d.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1" }}>{formatDateShort(d.date || d.createdAt)}</td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontWeight: 700 }}>{d.type}</td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1" }}>{d.description}</td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1", textAlign: "left", fontWeight: 800, color: "#0f172a" }}>
                      {formatCurrency(d.amount)}
                    </td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}>
                      {d.status === "مدفوع" ? "مدفوع" : "معلق"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signatures */}
        <div style={{ marginTop: 40, borderTop: "2px dashed #cbd5e1", paddingTop: 20, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>توقيع مقاول الباطن:</div>
            <div style={{ height: 40 }}></div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>.......................................</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>توقيع المحاسب المسؤول:</div>
            <div style={{ height: 40 }}></div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>.......................................</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>اعتماد إدارة الشركة:</div>
            <div style={{ height: 40 }}></div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>.......................................</div>
          </div>
        </div>
      </div>
    </div>
  );
}
