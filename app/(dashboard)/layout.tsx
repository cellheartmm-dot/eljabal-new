import { auth } from "@/lib/auth";
import DashboardLayoutClient from "@/components/layout/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userName = "مدير النظام";
  try {
    const session = await auth();
    if (session?.user?.name) {
      userName = session.user.name;
    }
  } catch (e) {
    // Fallback gracefully
  }

  return (
    <DashboardLayoutClient userName={userName}>
      {children}
    </DashboardLayoutClient>
  );
}
