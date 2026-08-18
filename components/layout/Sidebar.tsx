"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: "📊", section: null },
  { section: "إدارة المشاريع والاستثمار", items: [
    { href: "/projects", label: "المشاريع", icon: "🏗️" },
    { href: "/term-sheets", label: "مذكرة شروط واستثمار", icon: "📑" },
    { href: "/project-expenses", label: "مصروفات المشاريع", icon: "💸" },
  ]},
  { section: "الموارد البشرية", items: [
    { href: "/employees", label: "إدارة الموظفين (HR)", icon: "👥" },
    { href: "/workers", label: "العمال", icon: "👷" },
    { href: "/worker-daily", label: "يوميات العمال", icon: "📅" },
    { href: "/worker-advances", label: "سلف العمال", icon: "💵" },
    { href: "/supervisors", label: "المشرفون", icon: "👔" },
    { href: "/supervisor-salaries", label: "رواتب المشرفين", icon: "💰" },
  ]},
  { section: "مقاولو الباطن", items: [
    { href: "/subcontractors", label: "المقاولون", icon: "🔧" },
    { href: "/subcontractor-docs", label: "مستخلصات المقاولين", icon: "📋" },
  ]},
  { section: "المعدات", items: [
    { href: "/equipment", label: "المعدات", icon: "🚛" },
    { href: "/equipment-expenses", label: "مصروفات المعدات", icon: "⚙️" },
  ]},
  { section: "المالية", items: [
    { href: "/revenues", label: "الإيرادات", icon: "📈" },
    { href: "/general-expenses", label: "المصروفات العامة", icon: "📉" },
    { href: "/accounts", label: "الحسابات", icon: "🧾" },
  ]},
  { section: "التقارير", items: [
    { href: "/reports", label: "التقارير", icon: "📊" },
  ]},
  { section: "الإعدادات", items: [
    { href: "/settings", label: "إعدادات النظام", icon: "⚙️" },
    { href: "/backup", label: "النسخ الاحتياطي", icon: "🗄️" },
  ]},
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string>("/api/settings/logo");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyLogo) {
          setLogoUrl(data.companyLogo);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-logo">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "#fff", padding: 2 }}
          />
        ) : (
          <div className="sidebar-logo-icon">🏗️</div>
        )}
        <div className="sidebar-logo-text" style={{ flex: 1 }}>
          <h2>الجبل الذهبي</h2>
          <p>نظام إدارة المقاولات</p>
        </div>
        {onClose && (
          <button
            className="btn btn-ghost btn-sm btn-icon mobile-close-btn"
            onClick={onClose}
            style={{ fontSize: 18, padding: 4 }}
          >
            ✕
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {/* Dashboard link */}
        <Link
          href="/"
          className={`sidebar-link ${pathname === "/" ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="link-icon">📊</span>
          لوحة التحكم
        </Link>

        {/* Sectioned nav items */}
        {navItems.slice(1).map((group, i) => (
          <div key={i}>
            <div className="sidebar-section-title">{(group as any).section}</div>
            {((group as any).items as any[]).map((item: any) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")) ? "active" : ""}`}
                onClick={onClose}
              >
                <span className="link-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          id="logout-btn"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="sidebar-link"
          style={{ color: "hsl(0 72% 60%)", width: "100%" }}
        >
          <span className="link-icon">🚪</span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
