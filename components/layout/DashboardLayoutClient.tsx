"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userName: string;
}

export default function DashboardLayoutClient({
  children,
  userName,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const pathname = usePathname();

  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem("eljabal_theme") as "dark" | "light") || "dark";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("eljabal_theme", nextTheme);
    } catch (e) {
      console.error(e);
    }
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Automatically close mobile sidebar menu whenever path changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar with mobile open/close state */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar with Mobile Navigation Toggle Button */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              id="mobile-sidebar-toggle"
              className="btn btn-ghost mobile-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="القائمة الجانبية"
              style={{
                fontSize: 22,
                padding: "4px 10px",
                lineHeight: 1,
                border: "1px solid hsl(var(--border-subtle))",
                borderRadius: 8,
              }}
            >
              ☰
            </button>
            <h1 className="topbar-title" style={{ fontSize: 16, margin: 0 }}>
              الجبل الذهبي للمقاولات
            </h1>
          </div>

          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "التحويل للوضع الفاتح (Light Mode)" : "التحويل للوضع الداكن (Dark Mode)"}
              style={{
                background: "hsl(var(--bg-elevated))",
                border: "1px solid hsl(var(--border-subtle))",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "hsl(var(--text-primary))",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease",
              }}
            >
              {theme === "dark" ? (
                <>
                  <span>☀️</span> <span>وضع فاتح</span>
                </>
              ) : (
                <>
                  <span>🌙</span> <span>وضع داكن</span>
                </>
              )}
            </button>

            <div className="topbar-user">
              <span className="topbar-user-name">{userName}</span>
              <div className="topbar-user-avatar">
                {userName[0] || "م"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
