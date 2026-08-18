import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Check if admin user already exists
    let admin = await prisma.user.findUnique({
      where: { username: "admin" }
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash("22558877", 10);
      admin = await prisma.user.create({
        data: {
          username: "admin",
          password: hashedPassword,
          name: "مدير النظام",
          role: "admin"
        }
      });
    }

    return Response.json({ status: "success", message: "Seed database ready", user: admin.username });
  } catch (e: any) {
    return Response.json({ status: "error", error: e.message }, { status: 500 });
  }
}
