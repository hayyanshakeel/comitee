import { db } from "./firebase"; // Replace with your Firestore import

export async function getAllUsers() {
  const snapshot = await db.collection("users").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
}

export async function saveUserPaymentLink(userId: string, url: string, paymentLinkId: string) {
  await db.collection("users").doc(userId).update({
    paymentLink: {
      url,
      id: paymentLinkId,
      generatedAt: new Date(),
    },
  });
}