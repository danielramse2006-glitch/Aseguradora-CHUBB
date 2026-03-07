// ============================================================
//  CONFIGURACIÓN FIREBASE — reemplaza con tus datos reales
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtIagFFJBFRjvg5usXTm575YqOeeDE1G0",
  authDomain: "mi-inventario-51f82.firebaseapp.com",
  projectId: "mi-inventario-51f82",
  storageBucket: "mi-inventario-51f82.firebasestorage.app",
  messagingSenderId: "794197755416",
  appId: "1:794197755416:web:e1bbab46cda2bdbb5da56d",
  measurementId: "G-P1PRV5HE93"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
