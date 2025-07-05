import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createPaymentLink({
  amount,
  name,
  email,
  userId,
}: {
  amount: number;
  name: string;
  email: string;
  userId: string;
}) {
  return await razorpay.paymentLink.create({
    amount: amount * 100,
    currency: "INR",
    accept_partial: false,
    description: "Monthly subscription",
    customer: {
      name,
      email,
    },
    notify: {
      email: true,
    },
    reminder_enable: true,
    reference_id: `monthly-${userId}-${Date.now()}`,
    callback_url: "https://your-domain.com/api/razorpay/webhook",
    callback_method: "post",
  });
}
