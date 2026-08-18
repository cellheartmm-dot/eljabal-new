import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// ─── Helper: safely locate the global term-sheets store ───────────────────────
// The route.ts in the parent folder keeps its store in module scope.
// We re-fetch from the same GET endpoint so we share the same in-memory data.

// ─── Color constants (matching the on-screen design) ──────────────────────────
const DARK_NAVY   = "FF0B2238"; // section headers background
const NAVY_HEADER = "FF1E293B"; // table column headers
const GOLD_BORDER = "FFD97706";
const GOLD_BG     = "FFFEF3C7";
const GOLD_TEXT   = "FF92400E";
const GREEN_BG    = "FFECFDF5";
const GREEN_BORDER= "FF10B981";
const GREEN_TEXT  = "FF065F46";
const LIGHT_GRAY  = "FFF1F5F9";
const BORDER_COLOR= "FFCBD5E1";
const WHITE       = "FFFFFFFF";
const DARK_TEXT   = "FF0F172A";
const MUTED_TEXT  = "FF475569";

function border(color = BORDER_COLOR): Partial<ExcelJS.Border> {
  return { style: "thin", color: { argb: color } };
}

function fullBorder(color = BORDER_COLOR): Partial<ExcelJS.Borders> {
  const b = border(color);
  return { top: b, bottom: b, left: b, right: b };
}

function setFill(row: ExcelJS.Row, bgArgb: string) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
  });
}

function applyBorders(row: ExcelJS.Row, color = BORDER_COLOR) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = fullBorder(color);
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    // ── Fetch sheet data from the main term-sheets API ─────────────────────
    const baseUrl = new URL(req.url).origin;
    const res = await fetch(`${baseUrl}/api/term-sheets?id=${id}`);
    if (!res.ok) {
      return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
    }
    const sheet = await res.json();
    if (sheet.error) {
      return NextResponse.json({ error: sheet.error }, { status: 404 });
    }

    const fmt = (n: number) => n.toLocaleString("ar-EG");

    // ── Create workbook & worksheet ────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "الجبل الذهبي - GMC";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("مذكرة الشروط والاستثمار", {
      properties: { defaultColWidth: 20 },
      views: [{ rightToLeft: true }],
    });

    // Column widths
    ws.getColumn(1).width = 38;
    ws.getColumn(2).width = 26;
    ws.getColumn(3).width = 38;

    let rowIdx = 1;

    // ══════════════════════════════════════════════════════════════════════
    // ROW 1 – DOCUMENT TITLE (spanning all 3 columns, dark navy background)
    // ══════════════════════════════════════════════════════════════════════
    const titleRow = ws.addRow([
      sheet.docTitle || "مذكرة شروط واستثمار (Investment Term Sheet - V3)",
      "",
      "الجبل الذهبي - GMC",
    ]);
    ws.mergeCells(`A${rowIdx}:B${rowIdx}`);
    titleRow.height = 36;
    titleRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_NAVY } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 14, name: "Arial" };
      cell.border = fullBorder(GOLD_BORDER);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
    });
    // Company name cell (col C)
    titleRow.getCell(3).font  = { bold: true, color: { argb: "FFFFF0A0" }, size: 13, name: "Arial" };
    titleRow.getCell(3).alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    rowIdx++;

    // ══════════════════════════════════════════════════════════════════════
    // ROWS 2-4 – METADATA
    // ══════════════════════════════════════════════════════════════════════
    const metaRows = [
      ["الموضوع:", sheet.subject || ""],
      ["التاريخ:", sheet.dateFormatted || sheet.date || ""],
      ["طبيعة المستند:", sheet.docNature || ""],
    ];
    for (const [label, value] of metaRows) {
      const r = ws.addRow([label, value, ""]);
      ws.mergeCells(`B${rowIdx}:C${rowIdx}`);
      r.height = 22;
      r.getCell(1).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
      r.getCell(1).font   = { bold: true, size: 11, name: "Arial", color: { argb: DARK_TEXT } };
      r.getCell(2).font   = { bold: false, size: 11, name: "Arial", color: { argb: DARK_TEXT } };
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = fullBorder();
        cell.alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl" };
      });
      rowIdx++;
    }

    // Empty spacer
    ws.addRow([]);
    rowIdx++;

    // ══════════════════════════════════════════════════════════════════════
    // SECTION 1 – LAND DETAILS
    // ══════════════════════════════════════════════════════════════════════
    // Section header
    const s1Header = ws.addRow([".1 تفاصيل قطعة الأرض والقيمة الإجمالية", "", ""]);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
    s1Header.height = 26;
    s1Header.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_NAVY } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 12, name: "Arial" };
      cell.border = fullBorder(DARK_NAVY);
      cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
    });
    rowIdx++;

    // Column headers
    const s1ColHeader = ws.addRow(["البيان", "التفاصيل والقيمة", "ملاحظات وتوضيحات"]);
    s1ColHeader.height = 22;
    s1ColHeader.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 11, name: "Arial" };
      cell.border = fullBorder("FF334155");
      cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    });
    rowIdx++;

    // Data rows
    const s1Data = [
      ["مساحة الأرض",                                    fmt(sheet.landArea || 0),           "متر مربع",                null],
      ["سعر المتر المحدد من جهاز المدينة",               fmt(sheet.pricePerMeter || 0),       "جنيه مصري / م²",          null],
      ["إجمالي ثمن الأرض من الجهاز",                     fmt(sheet.totalLandPrice || 0),      `جنيه مصري (${fmt(sheet.landArea||0)} م² × ${fmt(sheet.pricePerMeter||0)} ج.م)`, LIGHT_GRAY],
      [`الدفعة المقدمة المدفوعة للجهاز (${sheet.advancePercent||10}%)`, fmt(sheet.advancePayment || 0), `جنيه مصري (${((sheet.advancePayment||0)/1000000).toFixed(1)} ملايين)`, null],
      ["مقابل التنازل / الأوفر للشركة (Overprice)",      fmt(sheet.overprice || 0),           `جنيه مصري (${((sheet.overprice||0)/1000000).toFixed(1)} مليون)`, null],
    ];

    for (const [label, value, note, bg] of s1Data) {
      const r = ws.addRow([label, value, note]);
      r.height = 20;
      if (bg) setFill(r, bg as string);
      r.getCell(1).font = { bold: true, size: 10, name: "Arial", color: { argb: DARK_TEXT } };
      r.getCell(2).font = { bold: true, size: 11, name: "Arial", color: { argb: DARK_TEXT } };
      r.getCell(3).font = { size: 10, name: "Arial", color: { argb: MUTED_TEXT } };
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = fullBorder();
        cell.alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl", wrapText: true };
      });
      r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      rowIdx++;
    }

    // TOTAL ROW (gold highlight)
    const totalRow = ws.addRow([
      "إجمالي السيولة المطلوبة لتملك العقد الحالي",
      fmt(sheet.totalRequiredLiquidity || 0),
      "جنيه مصري (مقدم + أوفر)",
    ]);
    totalRow.height = 24;
    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_BG } };
      cell.font   = { bold: true, size: 12, name: "Arial", color: { argb: GOLD_TEXT } };
      cell.border = fullBorder(GOLD_BORDER);
      cell.alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl", wrapText: true };
    });
    totalRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    rowIdx++;

    // spacer
    ws.addRow([]);
    rowIdx++;

    // ══════════════════════════════════════════════════════════════════════
    // SECTION 2 – PARTNERSHIP STRUCTURE
    // ══════════════════════════════════════════════════════════════════════
    const s2Header = ws.addRow([
      `.2 شروط وهيكلة الشراكة الاستثمارية (حصة النصف - ${sheet.partnerSharePercent||50}%)`,
      "", "",
    ]);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
    s2Header.height = 26;
    s2Header.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_NAVY } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 12, name: "Arial" };
      cell.border = fullBorder(DARK_NAVY);
      cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
    });
    rowIdx++;

    // Column headers
    const s2ColHeader = ws.addRow([
      "بند الشراكة",
      `القيمة المستحقة على الشريك (${sheet.partnerSharePercent||50}%)`,
      "ملاحظات السداد",
    ]);
    s2ColHeader.height = 22;
    s2ColHeader.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 11, name: "Arial" };
      cell.border = fullBorder("FF334155");
      cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    });
    rowIdx++;

    // Partner area row
    const s2r1 = ws.addRow([
      "حصة المساحة المستهدفة للشريك",
      fmt(sheet.partnerAreaShare || 0),
      `متر مربع (تساوي ${sheet.partnerSharePercent||50}% من المساحة)`,
    ]);
    s2r1.height = 20;
    s2r1.getCell(1).font = { bold: true, size: 10, name: "Arial", color: { argb: DARK_TEXT } };
    s2r1.getCell(2).font = { bold: true, size: 11, name: "Arial", color: { argb: DARK_TEXT } };
    s2r1.getCell(3).font = { size: 10, name: "Arial", color: { argb: MUTED_TEXT } };
    s2r1.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = fullBorder();
      cell.alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl", wrapText: true };
    });
    s2r1.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    rowIdx++;

    // Partner entry amount (green highlight)
    const s2Total = ws.addRow([
      "مبلغ الدخول في الشراكة المستحق",
      fmt(sheet.partnerEntryAmount || 0),
      `جنيه مصري (نصف السيولة المطلوبة - ${((sheet.partnerEntryAmount||0)/1000000).toFixed(1)} ملايين)`,
    ]);
    s2Total.height = 24;
    s2Total.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_BG } };
      cell.font   = { bold: true, size: 12, name: "Arial", color: { argb: GREEN_TEXT } };
      cell.border = fullBorder(GREEN_BORDER);
      cell.alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl", wrapText: true };
    });
    s2Total.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    rowIdx++;

    // spacer
    ws.addRow([]);
    rowIdx++;

    // ══════════════════════════════════════════════════════════════════════
    // SECTION 3 – FINANCIAL OBLIGATIONS
    // ══════════════════════════════════════════════════════════════════════
    const s3Header = ws.addRow([".3 الالتزامات المالية التالية والأقساط للجهاز", "", ""]);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
    s3Header.height = 26;
    s3Header.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_NAVY } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 12, name: "Arial" };
      cell.border = fullBorder(DARK_NAVY);
      cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
    });
    rowIdx++;

    // Column headers
    const s3ColHeader = ws.addRow(["البيان والالتزام المالي", "النسبة / القيمة الإجمالية", "التفاصيل وآلية السداد"]);
    s3ColHeader.height = 22;
    s3ColHeader.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
      cell.font   = { bold: true, color: { argb: WHITE }, size: 11, name: "Arial" };
      cell.border = fullBorder("FF334155");
      cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    });
    rowIdx++;

    const s3Data = [
      [
        `دفعة استكمال جدية الحجز (${sheet.completionPercent||16.5}%)`,
        fmt(sheet.bookingCompletionAmount || 0),
        `استكمال ثمن الأرض + ${sheet.taxPercent !== undefined ? sheet.taxPercent : 1.5}% ضريبة ومصاريف إدارية`,
      ],
      [
        "حصة الشريك من دفعة الاستكمال",
        fmt(sheet.partnerBookingCompletionShare || 0),
        "تُقسم بين الشريكين بنسبة 50% لكل منهما",
      ],
      [
        "الأقساط المتبقية للجهاز (75%)",
        sheet.installmentsPeriod || "على 3 سنوات",
        sheet.installmentsNotes || "يُسدد المتبقي على 3 سنوات + 1.5% ضريبة على كل قسط",
      ],
    ];

    for (const [label, value, note] of s3Data) {
      const r = ws.addRow([label, value, note]);
      r.height = 22;
      r.getCell(1).font = { bold: true, size: 10, name: "Arial", color: { argb: DARK_TEXT } };
      r.getCell(2).font = { bold: true, size: 11, name: "Arial", color: { argb: DARK_TEXT } };
      r.getCell(3).font = { size: 10, name: "Arial", color: { argb: MUTED_TEXT } };
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = fullBorder();
        cell.alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl", wrapText: true };
      });
      r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      rowIdx++;
    }

    // spacer
    ws.addRow([]);
    rowIdx++;

    // ══════════════════════════════════════════════════════════════════════
    // FOOTER NOTE
    // ══════════════════════════════════════════════════════════════════════
    const footerRow = ws.addRow([
      sheet.footerNote ||
        "تنويه: تُعد هذه المذكرة إطاراً مالياً واستثمارياً مبدئياً للاتفاق، وتخضع للمراجعة والتدقيق القانوني والمالي قبل توقيع العقود الرسمية.",
      "",
      "",
    ]);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
    footerRow.height = 36;
    footerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.font   = { italic: true, bold: true, size: 10, name: "Arial", color: { argb: "FF334155" } };
      cell.border = fullBorder();
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
    });

    // ── Generate buffer & respond ──────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();

    const cleanSubject = (sheet.subject || "مذكرة_شروط").replace(/[\s\/\\]+/g, "_");
    const fileName = `${cleanSubject}_${new Date().toISOString().split("T")[0]}.xlsx`;
    const encodedName = encodeURIComponent(fileName);

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Excel export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
