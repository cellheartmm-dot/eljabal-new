"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function WorkerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workerId = resolvedParams.id;

  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkerStatement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workers/${workerId}`);
      const data = await res.json();
      if (res.ok) setWorker(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerStatement();
  }, [workerId]);

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تحميل كشف حساب العامل...</div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <div className="empty-state-icon">👷</div>
        <div className="empty-state-text">لم يتم العثور على سجل هذا العامل</div>
        <Link href="/workers" className="btn btn-primary mt-4">← العودة للعمال</Link>
      </div>
    );
  }

  // Combine daily records & advances into a chronological ledger
  const dailyTxns = (worker.dailyRecords || []).map((d: any) => ({
    id: d.id,
    date: d.date || d.createdAt,
    type: "يومية موقع",
    description: `${d.project ? `مشروع: ${d.project.name} | ` : ""}${d.status || "حاضر"} ${d.notes ? `- ${d.notes}` : ""}`,
    credit: d.amount || 0, // مستحق للعامل
    debit: 0,
  }));

  const advanceTxns = (worker.advances || []).map((a: any) => ({
    id: a.id,
    date: a.date || a.createdAt,
    type: "سلفة مالية",
    description: `سلفة نقدية مسحوبة ${a.notes ? `- ${a.notes}` : ""}`,
    credit: 0,
    debit: a.amount || 0, // مسحوب من العامل
  }));

  const combinedLedger = [...dailyTxns, ...advanceTxns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let runningBalance = 0;
  // Calculate running balance from oldest to newest for ledger accuracy
  const ledgerWithBalance = [...combinedLedger].reverse().map((item) => {
    runningBalance += item.credit - item.debit;
    return { ...item, runningBalance };
  }).reverse();

  return (
    <div style={{ maxWidth: 950, margin: "0 auto" }}>
      {/* Action Header */}
      <div className="page-header print:hidden" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">📄 كشف حساب العامل - {worker.name}</h1>
          <p className="page-subtitle">تقرير مالي تفصيلي لمستحقات اليوميات والسلف المسحوبة</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ طباعة كشف الحساب
          </button>
          <Link href="/workers" className="btn btn-ghost">
            ← العودة لجدول العمال
          </Link>
        </div>
      </div>

      {/* Printable Statement Container */}
      <div className="card" style={{ padding: 28 }}>
        {/* Company & Worker Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid hsl(var(--border-subtle))", paddingBottom: 20, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "hsl(var(--gold))" }}>الجبل الذهبي للمقاولات العامة</h2>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>تقرير كشف حساب تفصيلي للعامل</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>تاريخ التقرير: {new Date().toLocaleDateString("ar-EG")}</div>
            <div className="badge badge-info" style={{ marginTop: 6, fontSize: 12 }}>{worker.specialty || "عامل"}</div>
          </div>
        </div>

        {/* Worker Personal Info Grid */}
        <div className="grid-4" style={{ gap: 14, background: "hsl(var(--bg-elevated))", padding: 16, borderRadius: 10, marginBottom: 20 }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>اسم العامل:</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{worker.name}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>المهنة / التخصص:</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{worker.specialty || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>سعر اليومية:</div>
            <div style={{ fontWeight: 800, color: "hsl(var(--gold))", fontSize: 14, marginTop: 2 }}>{formatCurrency(worker.dailyRate || 0)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>رقم الهاتف / الهوية:</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{worker.phone || worker.nationalId || "-"}</div>
          </div>
        </div>

        {/* 3 Summary Financial Cards */}
        <div className="grid-3" style={{ gap: 14, marginBottom: 24 }}>
          <div style={{ background: "#10b98115", border: "1px solid #10b98140", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>إجمالي مستحقات اليوميات (+)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#10b981", marginTop: 4 }}>
              {formatCurrency(worker.totalDailyAmount || 0)}
            </div>
          </div>

          <div style={{ background: "#ef444415", border: "1px solid #ef444440", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>إجمالي السلف المسحوبة (-)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#ef4444", marginTop: 4 }}>
              {formatCurrency(worker.totalAdvanceAmount || 0)}
            </div>
          </div>

          <div style={{ background: "#eab30815", border: "1px solid #eab30840", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#d97706", fontWeight: 700 }}>الرصيد المتبقي المستحق</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#d97706", marginTop: 4 }}>
              {formatCurrency(worker.remainingBalance || 0)}
            </div>
          </div>
        </div>

        {/* Combined Ledger Table */}
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📋 سجل الحركة المالية اليومية</h3>
        <div className="table-container">
          {ledgerWithBalance.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-text">لا توجد حركة يوميات أو سلف مسجلة لهذا العامل بعد</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>نوع الحركة</th>
                  <th>البيان والتفاصيل</th>
                  <th style={{ color: "#10b981" }}>له (مستحق +)</th>
                  <th style={{ color: "#ef4444" }}>عليه (مسحوب -)</th>
                  <th>الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody>
                {ledgerWithBalance.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(item.date)}</td>
                    <td>
                      <span className={`badge ${item.credit > 0 ? "badge-success" : "badge-danger"}`}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{item.description}</td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>
                      {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                    </td>
                    <td style={{ fontWeight: 800, color: "#ef4444" }}>
                      {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                    </td>
                    <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>
                      {formatCurrency(item.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signatures for Printing */}
        <div className="print-only" style={{ marginTop: 40, display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: "1px dashed #ccc" }}>
          <div>توقيع توثيق العامل: ........................</div>
          <div>توقيع المحاسب المسئول: ........................</div>
          <div>اعتماد إدارة الشركة: ........................</div>
        </div>
      </div>
    </div>
  );
}
