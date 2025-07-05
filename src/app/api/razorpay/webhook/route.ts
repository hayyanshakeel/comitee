import { NextRequest, NextResponse } from "next/server";

// Optionally verify signature if needed
export async function POST(req: NextRequest) {
  const body = await req.json();

  // TODO: Optionally verify signature with process.env.RAZORPAY_WEBHOOK_SECRET

  // Example: handle payment link paid event
  if (body.event === "payment_link.paid") {
    const paymentLinkId = body.payload.payment_link.entity.id;
    const userEmail = body.payload.payment_link.entity.customer.email;
    // TODO: Update your DB to mark this user's payment as complete
    // Example: await markUserPaymentAsComplete(paymentLinkId, userEmail);
  }

  return NextResponse.json({ received: true });
}