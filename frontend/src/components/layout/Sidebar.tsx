import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { to: "/", icon: "📊", label: "لوحة التحكم" },
  { to: "/projects", icon: "🏗️", label: "المشاريع" },
  { to: "/project-expenses", icon: "💸", label: "مصروفات المشرفين والاعتماد" },
  { to: "/revenues", icon: "💰", label: "الإيرادات" },
  { to: "/employees", icon: "👥", label: "إدارة الموظفين (HR)" },
  { to: "/subcontractors", icon: "🤝", label: "المقاولون الفرعيون" },
  { to: "/subcontractor-invoices", icon: "📑", label: "مستخلصات المقاولين" },
  { to: "/equipment", icon: "🚛", label: "المعدات" },
  { to: "/general-expenses", icon: "🧾", label: "المصروفات العامة" },
  { to: "/term-sheets", icon: "📈", label: "مذكرات الاستثمار" },
  { to: "/reports", icon: "📑", label: "الحسابات والمركز المالي الشامل" },
  { to: "/settings", icon: "⚙️", label: "الإعدادات" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>("/logo.jpeg");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.companyLogo && !d.companyLogo.includes("cloudflarestorage.com")) {
          setLogoUrl(d.companyLogo);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar${isOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <img
            src={logoUrl}
            alt="شعار الشركة"
            className="sidebar-logo"
            onError={(e) => {
              e.currentTarget.src = "/logo.jpeg";
            }}
          />
          <div style={{ flex: 1 }}>
            <div className="sidebar-company">الجبل الذهبي للمقاولات</div>
            <div className="sidebar-subtitle">نظام إدارة المقاولات</div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="إغلاق القائمة">
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{
              width: "100%",
              justifyContent: "center",
              marginBottom: 10,
              gap: 8,
              border: "1px solid hsl(var(--border-subtle))",
              background: "hsl(var(--bg-elevated))",
              color: "hsl(var(--text-primary))",
            }}
          >
            {theme === "dark" ? "☀️ الوضع الفاتح (Light Mode)" : "🌙 الوضع الداكن (Dark Mode)"}
          </button>

          {user && (
            <div className="sidebar-user">
              <span className="user-avatar">👤</span>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            🚪 تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
