import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "يرجى تقديم كلمة المرور الحالية والجديدة" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل" }, { status: 400 });
    }

    let user = null;

    // 1. Try NextAuth session
    try {
      const session = await auth();
      if (session?.user?.id) {
        user = await prisma.user.findUnique({ where: { id: session.user.id } });
      } else if (session?.user?.email) {
        user = await prisma.user.findUnique({ where: { username: session.user.email } });
      }
    } catch (e) {
      // session lookup failed or not set
    }

    // 2. Try custom session-token cookie
    if (!user) {
      const cookieStore = await cookies();
      const token = cookieStore.get("next-auth.session-token")?.value || cookieStore.get("__Secure-next-auth.session-token")?.value;
      if (token && token.startsWith("authenticated-")) {
        const userId = token.replace("authenticated-", "");
        user = await prisma.user.findUnique({ where: { id: userId } });
      }
    }

    // 3. Fallback to default admin user
    if (!user) {
      user = await prisma.user.findUnique({ where: { username: "admin" } });
    }

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // Check current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ بالسيرفر أثناء تغيير كلمة المرور" }, { status: 500 });
  }
}
