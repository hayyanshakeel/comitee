import { db } from "./firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function saveUserPaymentLink(userId: string, url: string, paymentLinkId: string) {
  await updateDoc(doc(db, "users", userId), {
    paymentLink: {
      url,
      id: paymentLinkId,
      generatedAt: new Date(),
    },
  });
}
