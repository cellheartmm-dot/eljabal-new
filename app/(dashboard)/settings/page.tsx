"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات");
  const [phone, setPhone] = useState("01000000000");
  const [companyLogo, setCompanyLogo] = useState<string | null>("/api/settings/logo");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // 1. Check LocalStorage fallback
    try {
      const cachedLogo = localStorage.getItem("eljabal_company_logo");
      const cachedName = localStorage.getItem("eljabal_company_name");
      const cachedPhone = localStorage.getItem("eljabal_company_phone");

      if (cachedLogo) setCompanyLogo(cachedLogo);
      if (cachedName) setCompanyName(cachedName);
      if (cachedPhone) setPhone(cachedPhone);
    } catch (e) {
      console.error(e);
    }

    // 2. Fetch from DB via /api/settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyName) setCompanyName(data.companyName);
        if (data.phone) setPhone(data.phone);
        if (data.companyLogo) {
          setCompanyLogo(data.companyLogo);
          try {
            localStorage.setItem("eljabal_company_logo", data.companyLogo);
          } catch (e) {}
        }
      })
      .catch((e) => console.error("Failed to load settings:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(null);

    try {
      const formData = new FormData();
      formData.append("companyName", companyName);
      formData.append("phone", phone);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حفظ الإعدادات والشعار");
      } else {
        setSavedMessage("✓ تم حفظ بيانات الشعار والإعدادات في السحابة بنجاح ☁️");
        if (data.companyLogo) {
          setCompanyLogo(data.companyLogo);
          try {
            localStorage.setItem("eljabal_company_logo", data.companyLogo);
            localStorage.setItem("eljabal_company_name", companyName);
            localStorage.setItem("eljabal_company_phone", phone);
          } catch (e) {}
        }
        setLogoFile(null);
        setTimeout(() => setSavedMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء الاتصال بالخادم ورسوم الشعار");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword !== confirmPassword) {
      setPassMessage({ type: "error", text: "كلمة المرور الجديدة وتأكيدها غير متطابقين" });
      return;
    }

    if (newPassword.length < 6) {
      setPassMessage({ type: "error", text: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }

    setPassLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPassMessage({ type: "error", text: data.error || "حدث خطأ أثناء تغيير كلمة المرور" });
      } else {
        setPassMessage({ type: "success", text: data.message || "تم تغيير كلمة المرور بنجاح!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPassMessage({ type: "error", text: "عذراً، حدث خطأ في الاتصال بالخادم" });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ إعدادات النظام وشعار الشركة</h1>
          <p className="page-subtitle">تعديل بيانات الشركة والشعار والرفع السحابي وإعدادات كلمة المرور</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Company Settings Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">معلومات وشعار الشركة الأساسي</h2>
          </div>
          <div className="card-body">
            {savedMessage && (
              <div className="badge badge-success mb-4 w-full" style={{ padding: 10, justifyContent: "center", fontSize: 13 }}>
                {savedMessage}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">اسم الشركة</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف التواصل</label>
                <input
                  type="text"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">شعار الشركة (اللوجو)</label>

                {/* LOGO PREVIEW */}
                {companyLogo && (
                  <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, background: "hsl(var(--bg-elevated))", padding: 10, borderRadius: 8, border: "1px solid hsl(var(--border-subtle))" }}>
                    <img
                      src={companyLogo}
                      alt="شعار الشركة"
                      style={{ maxWidth: 80, maxHeight: 80, objectFit: "contain", borderRadius: 6, background: "#fff", padding: 4 }}
                    />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>✓ الشعار الحالي مرفوع على السحابة</div>
                      <a href={companyLogo} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#3b82f6", textDecoration: "underline" }}>
                        معاينة الصورة الأصلية
                      </a>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <span className="text-muted" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                  اختر صورة جديدة لشعار الشركة وسيتم رفعها وتثبيتها فورياً على سحابة R2.
                </span>
              </div>

              <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
                {saving ? <span className="spinner" /> : "حفظ وتثبيت الشعار والتغييرات ☁️"}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔒 تغيير كلمة المرور</h2>
          </div>
          <div className="card-body">
            {passMessage && (
              <div
                className={`badge ${passMessage.type === "success" ? "badge-success" : "badge-danger"} mb-4 w-full`}
                style={{ padding: 10, justifyContent: "center", fontSize: 13 }}
              >
                {passMessage.type === "success" ? "✓ " : "⚠️ "}
                {passMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">كلمة المرور الحالية</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary mt-4" disabled={passLoading}>
                {passLoading ? "جاري التغيير..." : "تحديث كلمة المرور"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
