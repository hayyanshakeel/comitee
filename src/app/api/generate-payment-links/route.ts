import { NextResponse } from "next/server";
import { getAllUsers, saveUserPaymentLink } from "@/lib/db";
import { createPaymentLink } from "@/lib/razorpay";

export async function GET() {
  const users = await getAllUsers();
  for (const user of users) {
    const paymentLink = await createPaymentLink({
      amount: user.amount || 100,
      name: user.name,
      email: user.email,
      userId: user.id,
    });
    await saveUserPaymentLink(user.id, paymentLink.short_url, paymentLink.id);
  }
  return NextResponse.json({ success: true });
}
