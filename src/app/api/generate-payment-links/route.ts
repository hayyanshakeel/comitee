import { NextResponse } from "next/server";
import { createPaymentLink } from "@/lib/razorpay";
import { getAllUsers, saveUserPaymentLink } from "@/lib/db"; // You must implement these

export async function GET() {
  const users = await getAllUsers();
  for (const user of users) {
    // Adjust the amount logic as needed
    const paymentLink = await createPaymentLink({
      amount: user.amount || 100, // fallback amount
      name: user.name,
      email: user.email,
      userId: user.id,
    });
    await saveUserPaymentLink(user.id, paymentLink.short_url, paymentLink.id);
  }
  return NextResponse.json({ success: true });
}