"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
        setLoading(false);
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("تعذر الاتصال بالسيرفر: " + (err?.message || "خطأ غير معروف"));
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🏗️</div>
          <h1>الجبل الذهبي للمقاولات</h1>
          <p>نظام إدارة المقاولات المتكامل</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "hsla(0 72% 51% / 0.15)",
                border: "1px solid hsla(0 72% 51% / 0.4)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "hsl(0 72% 65%)",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">اسم المستخدم</label>
            <input
              id="username"
              type="text"
              className="form-control"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ padding: "12px", fontSize: "15px", marginTop: "8px", justifyContent: "center" }}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>🔐 تسجيل الدخول</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
