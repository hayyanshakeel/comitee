import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Optionally verify signature here

  if (body.event === "payment_link.paid") {
    const paymentLinkId = body.payload.payment_link.entity.id;
    const userEmail = body.payload.payment_link.entity.customer.email;
    // TODO: Update your DB to mark payment as complete
  }

  return NextResponse.json({ received: true });
}
