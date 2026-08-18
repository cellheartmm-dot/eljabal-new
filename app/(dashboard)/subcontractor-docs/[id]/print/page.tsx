"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function PrintClaimPage() {
  const params = useParams();
  const docId = params?.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/subcontractor-docs?id=${docId}`);
        const data = await res.json();
        if (data && !data.error) setDoc(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [docId]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      {/* Top Header Buttons (Hidden on Print) */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🖨️ طباعة مستخلص مقاول باطن</h1>
          <p className="page-subtitle">طباعة مستخلص تنفيذ الأعمال الرسمية المعتمده</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ طباعة المستخلص
          </button>
          <Link href={`/subcontractor-docs/${docId}/payments`} className="btn btn-gold">
            📜 سجل الدفعات
          </Link>
          <Link href="/subcontractor-docs" className="btn btn-ghost">
            ← العودة للمستخلصات
          </Link>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL CLAIM SHEET */}
      <div className="card" style={{ padding: 32, background: "#fff", color: "#1e293b", border: "1px solid #cbd5e1" }}>
        {/* Official Header */}
        <div style={{ borderBottom: "3px double #d97706", paddingBottom: 16, marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#b45309", margin: 0 }}>شركة الجبل الذهبي للمقاولات العامة</h1>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 6, textDecoration: "underline" }}>
            مستخلص تنفيذ أعمال مقاول باطن
          </h2>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginTop: 12 }}>
            <span>رقم المستخلص: <strong style={{ color: "#b45309", fontSize: 16 }}>{doc?.docNo || "SC0001"}</strong></span>
            <span>تاريخ المستخلص: <strong>{formatDateShort(doc?.date || new Date().toISOString())}</strong></span>
          </div>
        </div>

        {/* Claim Info Grid */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div className="grid-3" style={{ gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>المقاول:</span>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{doc?.subcontractorName || "مقاول باطن"}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>المشروع:</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#2563eb" }}>{doc?.projectName || "المشروع الرئيسي"}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>فترة التنفيذ:</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {doc?.periodFrom ? `من ${formatDateShort(doc.periodFrom)} إلى ${formatDateShort(doc.periodTo || doc.date)}` : "غير محدد"}
              </div>
            </div>
          </div>
        </div>

        {/* Claim Items Table */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>بيان بنود الأعمال المنفذة:</h3>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20 }}>جاري تحميل البنود...</div>
          ) : !doc?.items || doc.items.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>{doc?.description || "لا يوجد بيان تفصيلي للبنود"}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "center" }}>#</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>البند</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>النموذج</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>رقم المبنى</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>الدور</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>الوحدة</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>كمية الحصر</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>نسبة التنفيذ%</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>الكمية المنفذة</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>سعر الوحدة</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "left" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((row: any, idx: number) => (
                  <tr key={row.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", fontWeight: 700 }}>{row.itemDesc}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.modelName || "-"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.buildingNo || "-"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.floorNo || "-"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.unit || "م²"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.totalQty || 0}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.execPercent || 100}%</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{row.execQty || 0}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{formatCurrency(row.unitPrice || 0)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "left", fontWeight: 800, color: "#0f172a" }}>
                      {formatCurrency(row.rowTotal || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payments History Table (Separate Section Under Items Table) */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#047857", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💵</span> سجل الدفعات المسددة للمستخلص:
          </h3>
          {!doc?.payments || doc.payments.length === 0 ? (
            <div style={{ padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#64748b", textAlign: "center" }}>
              لا توجد دفعات مسددة حتى تاريخه لهذا المستخلص
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#ecfdf5", borderBottom: "2px solid #a7f3d0" }}>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "center" }}>#</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>تاريخ الدفعة</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>مبلغ الدفعة</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>طريقة السداد</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>سلم بواسطة</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>ملاحظات / البيان</th>
                </tr>
              </thead>
              <tbody>
                {doc.payments.map((p: any, idx: number) => (
                  <tr key={p.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", fontWeight: 700 }}>{formatDateShort(p.date)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", fontWeight: 800, color: "#047857" }}>{formatCurrency(p.amount || 0)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{p.method || "نقداً"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{p.paidBy || "شركة الجبل"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", color: "#475569" }}>{p.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Claim Financial Summary Cards */}
        <div className="grid-3" style={{ gap: 14, marginBottom: 24 }}>
          <div style={{ border: "2px solid #3b82f6", borderRadius: 10, padding: 12, textAlign: "center", background: "#eff6ff" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af" }}>الإجمالي الكلي للمستخلص</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8", marginTop: 2 }}>{formatCurrency(doc?.totalAmount || 0)}</div>
          </div>

          <div style={{ border: "2px solid #10b981", borderRadius: 10, padding: 12, textAlign: "center", background: "#ecfdf5" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#065f46" }}>إجمالي المسدد</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#047857", marginTop: 2 }}>{formatCurrency(doc?.paidAmount || 0)}</div>
          </div>

          <div style={{ border: "2px solid #ef4444", borderRadius: 10, padding: 12, textAlign: "center", background: "#fef2f2" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>المتبقي المستحق</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#b91c1c", marginTop: 2 }}>{formatCurrency(doc?.remainingAmount || 0)}</div>
          </div>
        </div>

        {/* Footer Signatures */}
        <div style={{ marginTop: 40, borderTop: "2px dashed #cbd5e1", paddingTop: 20, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>المقاول المنفذ:</div>
            <div style={{ height: 35 }}></div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>.......................................</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>مهندس الموقع / الحاسب:</div>
            <div style={{ height: 35 }}></div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>.......................................</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>اعتماد إدارة الشركة:</div>
            <div style={{ height: 35 }}></div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>.......................................</div>
          </div>
        </div>
      </div>
    </div>
  );
}
