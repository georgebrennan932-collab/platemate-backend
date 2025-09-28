import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDwnkp9YJdK9XKmFCtNXxpbSll-tynZFfc",
  authDomain: "platemate2.firebaseapp.com",
  projectId: "platemate2",
  storageBucket: "platemate2.appspot.com",
  messagingSenderId: "616928432923",
  appId: "1:616928432923:web:34d4f9b46820ffd82839be",
  measurementId: "G-0VZV7KDWCH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export { auth };