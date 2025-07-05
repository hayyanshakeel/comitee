import { db } from "./firebase"; // Adjust the import to match your setup

export async function getAllUsers() {
  if (!db) throw new Error("Firestore DB not initialized");
  const snapshot = await db.collection("users").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
}

export async function saveUserPaymentLink(userId: string, url: string, paymentLinkId: string) {
  if (!db) throw new Error("Firestore DB not initialized");
  await db.collection("users").doc(userId).update({
    paymentLink: {
      url,
      id: paymentLinkId,
      generatedAt: new Date(),
    },
  });
}
