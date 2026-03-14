// ============================================================
//  CONFIGURACIÓN FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCp3Ii_M2E8MPuj0yqLSY6YEtssmKc6aDo",
  authDomain: "seguros-polizas.firebaseapp.com",
  projectId: "seguros-polizas",
  storageBucket: "seguros-polizas.firebasestorage.app",
  messagingSenderId: "258311010009",
  appId: "1:258311010009:web:d699d0d220be11535fb0c8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
