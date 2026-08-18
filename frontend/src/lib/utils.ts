// ===== API base URL (existing Next.js backend on Vercel) =====
// We call the existing API for file uploads & logo until a full Supabase migration is done
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ===== Currency Formatter =====
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "0.00 ج.م";
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

// ===== Date Formatters =====
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateShort(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateISO(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

// ===== Unique code generator =====
export function generateCode(prefix: string, existingCodes: string[], count: number): string {
  let n = count + 1;
  let candidate = `${prefix}${String(n).padStart(4, "0")}`;
  while (existingCodes.includes(candidate)) {
    n++;
    candidate = `${prefix}${String(n).padStart(4, "0")}`;
  }
  return candidate;
}

// ===== Truncate text =====
export function truncate(text: string, maxLen = 60): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}
