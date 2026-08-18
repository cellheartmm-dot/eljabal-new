"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateShort } from "@/lib/utils";

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState<"backup" | "reset" | "autobackup">("backup");

  // Tab 1 & 2 states
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Tab 3: Cloud Auto Backup states
  const [r2Backups, setR2Backups] = useState<any[]>([]);
  const [loadingR2List, setLoadingR2List] = useState(false);
  const [triggeringR2Backup, setTriggeringR2Backup] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState("daily"); // daily, weekly, monthly

  const fetchR2Backups = async () => {
    setLoadingR2List(true);
    try {
      const res = await fetch("/api/backup/r2");
      const data = await res.json();
      if (Array.isArray(data)) setR2Backups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingR2List(false);
    }
  };

  useEffect(() => {
    if (activeTab === "autobackup") {
      fetchR2Backups();
    }
  }, [activeTab]);

  // Tab 1: Handle Download Local Backup JSON
  const handleDownloadBackup = async () => {
    setLoadingBackup(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eljabal_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setActionMessage("✅ تم إنشاء وتنزيل ملف النسخة الاحتياطية بنجاح");
    } catch (e: any) {
      console.error(e);
      setActionMessage("❌ حدث خطأ أثناء إنشاء النسخة الاحتياطية");
    } finally {
      setLoadingBackup(false);
    }
  };

  // Tab 1: Handle Restore JSON Backup
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!confirm("هل أنت تأكد من رغبتك في استعادة قاعدة البيانات؟ قد يتم استبدال البيانات الحالية بالبيانات الموجودة بملف النسخة.")) return;

    setLoadingRestore(true);
    setActionMessage(null);
    try {
      const text = await selectedFile.text();
      const jsonData = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      if (res.ok) {
        setActionMessage("✅ تمت استعادة قاعدة البيانات بنجاح، جاري إنعاش الشاشة...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (e: any) {
      console.error(e);
      setActionMessage("❌ ملف النسخة الاحتياطية المرفوع غير صالح أو تالف");
    } finally {
      setLoadingRestore(false);
    }
  };

  // Tab 2: Handle Reset All / Table
  const handleReset = async (tableName?: string, labelName?: string) => {
    const isAll = !tableName;
    const confirmPrompt = isAll
      ? "⚠️ حذار! هل أنت تأكد تماماً من رغبتك في تصفير ومسح النظام بالكامل؟ سيتم مسح كافة العمال والمشاريع والمصروفات والإيرادات!"
      : `⚠️ هل أنت تأكد من رغبتك في تصفير وقذف جدول (${labelName})؟`;

    if (!confirm(confirmPrompt)) return;

    setActionMessage(null);
    try {
      const url = isAll ? "/api/backup?all=true" : `/api/backup?table=${tableName}`;
      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        const resData = await res.json();
        setActionMessage(`✅ ${resData.message || "تم التصفير بنجاح"}`);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (e: any) {
      console.error(e);
      setActionMessage("❌ حدث خطأ أثناء عملية التصفير");
    }
  };

  // Tab 3: Handle Trigger Auto Backup
  const handleTriggerR2Backup = async () => {
    setTriggeringR2Backup(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/backup/r2", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("✅ تم إنشاء النسخة التلقائية ورفعها إلى التخزين السحابي بنجاح ☁️");
        fetchR2Backups();
      } else {
        setActionMessage(`❌ ${data.error || "فشل رفع النسخة الاحتياطية للتخزين السحابي"}`);
      }
    } catch (e: any) {
      console.error(e);
      setActionMessage("❌ تعذر الاتصال بخوادم التخزين السحابي");
    } finally {
      setTriggeringR2Backup(false);
    }
  };

  // Tab 3: Handle Delete Backup File
  const handleDeleteR2Backup = async (key: string, filename: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف النسخة الاحتياطية (${filename}) من التخزين السحابي؟`)) return;

    setActionMessage(null);
    try {
      const res = await fetch(`/api/backup/r2?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (res.ok) {
        setActionMessage("✅ تم حذف الملف من التخزين السحابي بنجاح");
        fetchR2Backups();
      }
    } catch (e) {
      console.error(e);
      setActionMessage("❌ حدث خطأ أثناء حذف الملف");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🗄️ إدارة قاعدة البيانات والنسخ الاحتياطي السحابي</h1>
          <p className="page-subtitle">تصدير واستعادة نسخ قاعدة البيانات، تصفير الجداول، والرفع التلقائي للتخزين السحابي</p>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 800,
            background: actionMessage.startsWith("✅") ? "#10b98115" : "#ef444415",
            color: actionMessage.startsWith("✅") ? "#10b981" : "#ef4444",
            border: actionMessage.startsWith("✅") ? "1px solid #10b98140" : "1px solid #ef444440",
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* TABS HEADER NAVIGATION */}
      <div style={{ display: "flex", gap: 10, borderBottom: "2px solid hsl(var(--border-subtle))", marginBottom: 24, paddingBottom: 2 }}>
        <button
          className={`btn ${activeTab === "backup" ? "btn-primary" : "btn-ghost"}`}
          style={{ borderRadius: "10px 10px 0 0", padding: "10px 20px", fontWeight: 800 }}
          onClick={() => setActiveTab("backup")}
        >
          💾 النسخ الاحتياطي والاستعادة
        </button>

        <button
          className={`btn ${activeTab === "reset" ? "btn-primary" : "btn-ghost"}`}
          style={{
            borderRadius: "10px 10px 0 0",
            padding: "10px 20px",
            fontWeight: 800,
            background: activeTab === "reset" ? "#ef4444" : undefined,
            borderColor: activeTab === "reset" ? "#ef4444" : undefined,
          }}
          onClick={() => setActiveTab("reset")}
        >
          ⚠️ تصفير النظام والبيانات
        </button>

        <button
          className={`btn ${activeTab === "autobackup" ? "btn-primary" : "btn-ghost"}`}
          style={{
            borderRadius: "10px 10px 0 0",
            padding: "10px 20px",
            fontWeight: 800,
            background: activeTab === "autobackup" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : undefined,
            borderColor: activeTab === "autobackup" ? "#f59e0b" : undefined,
            color: activeTab === "autobackup" ? "#fff" : undefined,
          }}
          onClick={() => setActiveTab("autobackup")}
        >
          ☁️ النسخ التلقائي السحابي
        </button>
      </div>

      {/* TAB 1: BACKUP & RESTORE */}
      {activeTab === "backup" && (
        <div className="grid-2" style={{ gap: 20 }}>
          {/* Card A: Create & Download Backup */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>💾</span>
              <h2 className="card-title" style={{ margin: 0 }}>تصدير نسخة احتياطية جديدة</h2>
            </div>
            <p style={{ fontSize: 13, color: "hsl(var(--text-muted))", marginBottom: 20, lineHeight: 1.6 }}>
              قم بتنزيل نسخة احتياطية شاملة تحتوي على كافة العمال والمشاريع والمصروفات والإيرادات والمستخلصات والمعدات في ملف JSON على جهازك فوراً.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, fontWeight: 800 }}
              onClick={handleDownloadBackup}
              disabled={loadingBackup}
            >
              {loadingBackup ? <span className="spinner" /> : "⬇️ تنزيل نسخة احتياطية كاملة (JSON)"}
            </button>
          </div>

          {/* Card B: Restore Backup */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>🔄</span>
              <h2 className="card-title" style={{ margin: 0 }}>استعادة قاعدة البيانات من ملف</h2>
            </div>
            <p style={{ fontSize: 13, color: "hsl(var(--text-muted))", marginBottom: 16, lineHeight: 1.6 }}>
              ارفع ملف النسخة الاحتياطية (بصيغة JSON) لاستعادة البيانات والسجلات السابقة بالنظام.
            </p>
            <form onSubmit={handleRestoreSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <input
                  type="file"
                  accept=".json"
                  className="form-control"
                  required
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, fontWeight: 800 }}
                disabled={loadingRestore || !selectedFile}
              >
                {loadingRestore ? <span className="spinner" /> : "⬆️ رفع واستعادة قاعدة البيانات"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: RESET SYSTEM & INDIVIDUAL TABLES */}
      {activeTab === "reset" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Danger Card: Reset Entire System */}
          <div className="card" style={{ border: "2px solid #ef4444", background: "#ef444408", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#ef4444", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🚨</span>
                  <span>تصفير النظام بالكامل (حذف كافة البيانات)</span>
                </h2>
                <p style={{ fontSize: 13, color: "hsl(var(--text-muted))", marginTop: 6, margin: 0 }}>
                  تنبيه خطير: سيتم تفريغ كافة الجداول والبيانات بالنظام (عمال، مشاريع، مصروفات، إيرادات، مقاولين، مشرفين، معدات). لا يمكن التراجع بعد الضغط.
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ background: "#ef4444", borderColor: "#ef4444", fontWeight: 900, padding: "12px 24px", fontSize: 15, whiteSpace: "nowrap" }}
                onClick={() => handleReset()}
              >
                💥 تصفير النظام بالكامل
              </button>
            </div>
          </div>

          {/* Individual Tables Reset Grid */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 16 }}>
              🗑️ تصفير وتفريغ كل جدول على حدة:
            </h3>

            <div className="grid-3" style={{ gap: 14 }}>
              {/* Table 1: Workers */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>👷 جدول العمال واليوميات</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>العمال، سجل اليوميات والسلف والخصومات</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("workers", "العمال واليوميات")}>
                  🗑️ تصفير جدول العمال
                </button>
              </div>

              {/* Table 2: Projects */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>🏢 جدول المشاريع والمصروفات</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>المشاريع، ميزانيات وخامات المشاريع</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("projects", "المشاريع والمصروفات")}>
                  🗑️ تصفير جدول المشاريع
                </button>
              </div>

              {/* Table 3: Supervisors */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>👤 جدول المشرفين والرواتب</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>بيانات المشرفين وسجلات رواتبهم</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("supervisors", "المشرفين والرواتب")}>
                  🗑️ تصفير جدول المشرفين
                </button>
              </div>

              {/* Table 4: Subcontractors */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📜 جدول المقاولين والمستخلصات</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>مقاولو الباطن ومستخلصات الأعمال والدفعات</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("subcontractors", "المقاولين والمستخلصات")}>
                  🗑️ تصفير جدول المقاولين
                </button>
              </div>

              {/* Table 5: Equipment */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>🚛 جدول المعدات والمصروفات</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>آلات ومعدات الشركة ومصروفات الوقود والصيانة</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("equipment", "المعدات والمصروفات")}>
                  🗑️ تصفير جدول المعدات
                </button>
              </div>

              {/* Table 6: Revenues */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📈 جدول الإيرادات والمقبوضات</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>سجلات المقبوضات والدفعات الواردة</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("revenues", "الإيرادات")}>
                  🗑️ تصفير جدول الإيرادات
                </button>
              </div>

              {/* Table 7: General Expenses */}
              <div style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📉 جدول المصروفات العامة</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>مصروفات المقر الرئيسي والإيجارات والمرافق</div>
                <button className="btn btn-sm btn-ghost" style={{ color: "#ef4444", border: "1px solid #ef444440", width: "100%", justifyContent: "center" }} onClick={() => handleReset("generalExpenses", "المصروفات العامة")}>
                  🗑️ تصفير المصروفات العامة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CLOUD AUTOMATIC BACKUP & DOWNLOADS */}
      {activeTab === "autobackup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cloud Storage Connection Banner */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              color: "#fff",
              padding: 24,
              borderRadius: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>☁️</span>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#f59e0b", margin: 0 }}>
                    مستودع التخزين السحابي المؤمن
                  </h2>
                  <span className="badge badge-success" style={{ fontSize: 11 }}>متصل ومستقر 🟢</span>
                </div>
                <p style={{ fontSize: 12, opacity: 0.8, margin: 0 }}>
                  حفظ وتأمين كافة بيانات وسجلات شركة الجبل الذهبي تلقائياً على خوادم التخزين السحابي
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select
                    className="form-control"
                    style={{ fontSize: 12, padding: "6px 12px", background: "#334155", color: "#fff", border: "1px solid #475569" }}
                    value={autoSchedule}
                    onChange={(e) => setAutoSchedule(e.target.value)}
                  >
                    <option value="daily">🔄 الجدولة التلقائية: يومياً</option>
                    <option value="weekly">🔄 الجدولة التلقائية: أسبوعياً</option>
                    <option value="monthly">🔄 الجدولة التلقائية: شهرياً</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    borderColor: "#f59e0b",
                    fontWeight: 900,
                    padding: "10px 18px",
                  }}
                  onClick={handleTriggerR2Backup}
                  disabled={triggeringR2Backup}
                >
                  {triggeringR2Backup ? <span className="spinner" /> : "⚡ إجراء نسخ تلقائي فوري"}
                </button>
              </div>
            </div>
          </div>

          {/* Cloud Backups List Table */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title">📦 ملفات النسخ الاحتياطي السحابية</h2>
              <button className="btn btn-ghost btn-sm" onClick={fetchR2Backups}>
                🔄 تحديث القائمة
              </button>
            </div>

            <div className="table-container">
              {loadingR2List ? (
                <div className="empty-state">
                  <span className="spinner" style={{ width: 30, height: 30 }} />
                  <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل ملفات النسخ السحابية...</div>
                </div>
              ) : r2Backups.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-state-icon">☁️</div>
                  <div className="empty-state-text">لا توجد ملفات نسخ احتياطية مسجلة بالتخزين السحابي حالياً</div>
                  <button className="btn btn-gold btn-sm" style={{ marginTop: 12 }} onClick={handleTriggerR2Backup}>
                    + إجراء أول نسخ احتياطي سحابي
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: "center" }}>#</th>
                      <th>اسم ملف النسخة (JSON)</th>
                      <th>حجم الملف</th>
                      <th>تاريخ الحفظ والرفع</th>
                      <th style={{ textAlign: "center", width: 220 }}>الإجراءات والتنزيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r2Backups.map((b, idx) => (
                      <tr key={b.key || idx}>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
                          <code>{b.filename}</code>
                        </td>
                        <td><span className="badge badge-info">{(b.size / 1024).toFixed(1)} KB</span></td>
                        <td>{formatDateShort(b.lastModified)}</td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <a
                              href={`/api/backup/r2?key=${encodeURIComponent(b.key)}&download=true`}
                              className="btn btn-sm btn-primary"
                              style={{ padding: "4px 10px", fontSize: 12, textDecoration: "none" }}
                              download
                            >
                              📥 تحميل النسخة
                            </a>
                            <button
                              className="btn btn-sm"
                              style={{ padding: "4px 10px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                              onClick={() => handleDeleteR2Backup(b.key, b.filename)}
                            >
                              🗑️ حذف
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
      )}
    </div>
  );
}
