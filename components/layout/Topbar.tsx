import { auth } from "@/lib/auth";

const pageTitles: Record<string, string> = {
  "/": "لوحة التحكم",
  "/projects": "المشاريع",
  "/project-expenses": "مصروفات المشاريع",
  "/workers": "العمال",
  "/worker-daily": "يوميات العمال",
  "/worker-advances": "سلف العمال",
  "/supervisors": "المشرفون",
  "/supervisor-salaries": "رواتب المشرفين",
  "/subcontractors": "مقاولو الباطن",
  "/subcontractor-docs": "مستخلصات المقاولين",
  "/equipment": "المعدات",
  "/equipment-expenses": "مصروفات المعدات",
  "/revenues": "الإيرادات",
  "/general-expenses": "المصروفات العامة",
  "/accounts": "الحسابات",
  "/reports": "التقارير",
  "/settings": "الإعدادات",
};

export default async function Topbar({ pathname }: { pathname: string }) {
  let userName = "مدير النظام";
  try {
    const session = await auth();
    if (session?.user?.name) {
      userName = session.user.name;
    }
  } catch (e) {
    // Fallback gracefully
  }

  const title = pageTitles[pathname] || "الجبل الذهبي للمقاولات";

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        <div className="topbar-user">
          <span className="topbar-user-name">{userName}</span>
          <div className="topbar-user-avatar">
            {userName[0] || "م"}
          </div>
        </div>
      </div>
    </header>
  );
}
