import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export async function getSession() {
  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getToken() {
  if (auth.currentUser) return await auth.currentUser.getIdToken();
  
  return new Promise<string | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(await user.getIdToken());
      } else {
        resolve(null);
      }
    });
  });
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
