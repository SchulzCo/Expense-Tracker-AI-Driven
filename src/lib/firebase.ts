import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUbjCu6QkG2izFM2lH037m5LvYQ3qZ-iw",
  authDomain: "expensetracker-f6ebe.firebaseapp.com",
  projectId: "expensetracker-f6ebe",
  storageBucket: "expensetracker-f6ebe.firebasestorage.app",
  messagingSenderId: "362690546953",
  appId: "1:362690546953:web:ccc3b50e11b58920fd17d8",
  measurementId: "G-NZ0SPSVMEQ"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
