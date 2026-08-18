import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTheme } from "../../context/ThemeContext";

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
      {/* Mobile Top Navbar with Hamburger Toggle */}
      <header className="mobile-topbar">
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="فتح القائمة"
        >
          ☰
        </button>

        <div className="mobile-topbar-brand">
          <img src="/logo.jpeg" alt="الجبل الذهبي" className="mobile-topbar-logo" />
          <span className="mobile-topbar-title">الجبل الذهبي للمقاولات</span>
        </div>

        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
          style={{ padding: "4px 8px", fontSize: 13 }}
          title="تبديل وضع الألوان"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      {/* Sidebar Component */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content View */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
