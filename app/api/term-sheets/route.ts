import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Persistent store for Investment Term Sheets
let globalTermSheets: any[] = [
  {
    id: "ts-1",
    docTitle: "مذكرة شروط واستثمار (Investment Term Sheet - V3)",
    subject: "مقترح مشاركة واستثمار عقاري لشراء أرض - حدائق العاصمة",
    date: "2026-07",
    dateFormatted: "يوليو 2026",
    docNature: "العرض المالي والهيكلة التمويلية المعدلة (أوفر 12 مليون)",

    // Section 1: Land Details & Values
    landArea: 2000,
    pricePerMeter: 30000,
    totalLandPrice: 60000000,
    advancePercent: 10,
    advancePayment: 6000000,
    overprice: 12000000,
    totalRequiredLiquidity: 18000000,

    // Section 2: Investment Partnership Structure
    partnerSharePercent: 50,
    partnerAreaShare: 1000,
    partnerEntryAmount: 9000000,

    // Section 3: Next Financial Obligations & Installments
    completionPercent: 16.5,
    bookingCompletionAmount: 9900000,
    partnerBookingCompletionShare: 0,
    installmentsPeriod: "على 3 سنوات",
    installmentsNotes: "يُسدد المتبقي على 3 سنوات + 1.5% ضريبة على كل قسط",

    footerNote:
      "تنويه: تُعد هذه المذكرة إطاراً مالياً واستثمارياً مبدئياً للاتفاق، وتخضع للمراجعة والتدقيق القانوني والمالي قبل توقيع العقود الرسمية.",
    createdAt: new Date().toISOString(),
  },
];

function calculateTermSheet(data: any) {
  const landArea = parseFloat(data.landArea) || 0;
  const pricePerMeter = parseFloat(data.pricePerMeter) || 0;
  const totalLandPrice = landArea * pricePerMeter;

  let advancePercent = parseFloat(data.advancePercent) || 0;
  let advancePayment = parseFloat(data.advancePayment) || 0;

  if (advancePayment > 0 && (!advancePercent || advancePercent === 0)) {
    advancePercent = totalLandPrice > 0 ? (advancePayment / totalLandPrice) * 100 : 0;
  } else if (advancePercent > 0 && (!advancePayment || advancePayment === 0)) {
    advancePayment = totalLandPrice * (advancePercent / 100);
  } else if (!advancePercent && !advancePayment) {
    advancePercent = 10;
    advancePayment = totalLandPrice * 0.1;
  }

  const overprice = parseFloat(data.overprice) || 0;
  const totalRequiredLiquidity = advancePayment + overprice;

  const partnerSharePercent = parseFloat(data.partnerSharePercent) || 50;
  const partnerAreaShare = landArea * (partnerSharePercent / 100);
  const partnerEntryAmount = totalRequiredLiquidity * (partnerSharePercent / 100);

  const completionPercent = parseFloat(data.completionPercent) || 16.5;
  const taxPercent = data.taxPercent !== undefined ? parseFloat(data.taxPercent) || 0 : 1.5;
  const bookingCompletionAmount = totalLandPrice * (completionPercent / 100);
  const partnerBookingCompletionShare =
    data.partnerBookingCompletionShare !== undefined
      ? parseFloat(data.partnerBookingCompletionShare) || 0
      : bookingCompletionAmount * (partnerSharePercent / 100);

  return {
    ...data,
    landArea,
    pricePerMeter,
    totalLandPrice,
    advancePercent,
    advancePayment,
    overprice,
    totalRequiredLiquidity,
    partnerSharePercent,
    partnerAreaShare,
    partnerEntryAmount,
    completionPercent,
    taxPercent,
    bookingCompletionAmount,
    partnerBookingCompletionShare,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const found = globalTermSheets.find((t) => t.id === id);
      if (!found) return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
      return NextResponse.json(found);
    }

    return NextResponse.json(globalTermSheets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newSheet = calculateTermSheet({
      id: "ts-" + Date.now(),
      docTitle: body.docTitle || "مذكرة شروط واستثمار (Investment Term Sheet - V3)",
      subject: body.subject || "مقترح مشاركة واستثمار عقاري لشراء أرض",
      date: body.date || new Date().toISOString().substring(0, 7),
      dateFormatted: body.dateFormatted || "يوليو 2026",
      docNature: body.docNature || "العرض المالي والهيكلة التمويلية المعدلة",

      landArea: body.landArea,
      pricePerMeter: body.pricePerMeter,
      advancePercent: body.advancePercent,
      overprice: body.overprice,

      partnerSharePercent: body.partnerSharePercent,

      completionPercent: body.completionPercent,
      partnerBookingCompletionShare: body.partnerBookingCompletionShare,
      installmentsPeriod: body.installmentsPeriod || "على 3 سنوات",
      installmentsNotes: body.installmentsNotes || "يُسدد المتبقي على 3 سنوات + 1.5% ضريبة على كل قسط",

      footerNote:
        body.footerNote ||
        "تنويه: تُعد هذه المذكرة إطاراً مالياً واستثمارياً مبدئياً للاتفاق، وتخضع للمراجعة والتدقيق القانوني والمالي قبل توقيع العقود الرسمية.",
      createdAt: new Date().toISOString(),
    });

    globalTermSheets.unshift(newSheet);

    return NextResponse.json(newSheet, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const index = globalTermSheets.findIndex((t) => t.id === body.id);
    if (index !== -1) {
      const updated = calculateTermSheet({
        ...globalTermSheets[index],
        ...body,
        updatedAt: new Date().toISOString(),
      });
      globalTermSheets[index] = updated;
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      globalTermSheets = globalTermSheets.filter((t) => t.id !== id);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
