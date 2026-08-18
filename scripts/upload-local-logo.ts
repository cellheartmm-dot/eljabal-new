import fs from "fs";
import path from "path";
import { uploadLogoToR2 } from "../lib/r2";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Reading logo from logo directory...");
  const logoDir = path.join(process.cwd(), "logo");
  if (!fs.existsSync(logoDir)) {
    console.error("logo directory not found!");
    return;
  }

  const files = fs.readdirSync(logoDir);
  const logoFile = files.find((f) => /\.(png|jpe?g|svg|webp)$/i.test(f));
  if (!logoFile) {
    console.error("No logo image found in logo directory!");
    return;
  }

  const filePath = path.join(logoDir, logoFile);
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(logoFile).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";

  console.log(`Uploading ${logoFile} to Cloudflare R2...`);
  const r2Result = await uploadLogoToR2(logoFile, buffer, contentType);
  console.log("R2 Upload URL:", r2Result.url);

  console.log("Updating database Setting key companyLogo...");
  await prisma.setting.upsert({
    where: { key: "companyLogo" },
    update: { value: r2Result.url },
    create: { key: "companyLogo", value: r2Result.url },
  });

  console.log("✅ Company logo uploaded to R2 & updated in DB successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
