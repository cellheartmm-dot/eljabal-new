import "dotenv/config";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Creating default admin account in Supabase DB...");
  const hashedPassword = await bcrypt.hash("22558877", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      password: hashedPassword,
    },
    create: {
      username: "admin",
      password: hashedPassword,
      name: "مدير النظام",
      role: "admin",
    },
  });

  console.log("✅ Admin account created successfully!");
  console.log("Username: admin");
  console.log("Password: 22558877");
}

main()
  .catch((e) => {
    console.error("Error creating admin user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
