import { db } from "./firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

// Get all users from the "users" collection
export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

// Save or update a user's payment link
export async function saveUserPaymentLink(userId: string, url: string, paymentLinkId: string) {
  await updateDoc(doc(db, "users", userId), {
    paymentLink: {
      url,
      id: paymentLinkId,
      generatedAt: new Date(),
    },
  });
}
