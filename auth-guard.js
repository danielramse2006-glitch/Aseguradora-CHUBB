// ============================================================
//  auth-guard.js — importar en cada página protegida
// ============================================================
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
         query, orderBy, where, Timestamp, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── AUTH GUARD ───────────────────────────────────────────────
export function requireAuth(cb) {
  onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'login.html'; return; }
    // Mostrar email en header
    const el = document.getElementById('currentUser');
    if (el) {
      const name = user.displayName || user.email.split('@')[0];
      el.textContent = name;
      const av = document.getElementById('userAvatar');
      if (av) av.textContent = name.charAt(0).toUpperCase();
    }
    if (cb) cb(user);
  });
}

// ── LOGOUT ───────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  window.location.href = 'login.html';
}

// ── TOAST ────────────────────────────────────────────────────
export function toast(msg, type = 'default') {
  let wrap = document.getElementById('toast');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  const icons = { success: '✅', error: '❌', default: 'ℹ️' };
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${msg}`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── FIRESTORE HELPERS ─────────────────────────────────────────
export const POLIZAS = 'polizas';
export const HISTORIAL = 'historial';

export async function getPolizas() {
  const q = query(collection(db, POLIZAS), orderBy('fechaEmision', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPoliza(id) {
  const snap = await getDoc(doc(db, POLIZAS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addPoliza(data, userEmail) {
  const ref = await addDoc(collection(db, POLIZAS), {
    ...data,
    creadoEn: Timestamp.now(),
    creadoPor: userEmail
  });
  await registrarHistorial('Alta', `Póliza ${data.noPoliza}`, userEmail);
  return ref.id;
}

export async function updatePoliza(id, data, userEmail) {
  await updateDoc(doc(db, POLIZAS, id), {
    ...data,
    actualizadoEn: Timestamp.now(),
    actualizadoPor: userEmail
  });
  await registrarHistorial('Actualización', `Póliza ${data.noPoliza}`, userEmail);
}

export async function deletePoliza(id, noPoliza, userEmail) {
  await deleteDoc(doc(db, POLIZAS, id));
  await registrarHistorial('Eliminación', `Póliza ${noPoliza}`, userEmail);
}

export async function registrarHistorial(accion, detalle, usuario) {
  await addDoc(collection(db, HISTORIAL), {
    accion, detalle, usuario,
    fecha: Timestamp.now()
  });
}

export async function getHistorial() {
  const q = query(collection(db, HISTORIAL), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── UTILERÍAS ─────────────────────────────────────────────────
export function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMoney(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function diasParaVencer(finPoliza) {
  if (!finPoliza) return null;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const fin  = new Date(finPoliza + 'T00:00:00');
  return Math.round((fin - hoy) / 86400000);
}

export function badgeVencimiento(dias) {
  if (dias === null) return '';
  if (dias < 0)   return '<span class="badge badge-red">Vencida</span>';
  if (dias <= 30) return `<span class="badge badge-amber">Vence en ${dias}d</span>`;
  if (dias <= 90) return `<span class="badge badge-rose">Vence en ${dias}d</span>`;
  return `<span class="badge badge-green">Vigente</span>`;
}

export const ASEGURADORAS = ['Chubb','GNP','AXA','Mapfre','MetLife','Allianz','HDI','Qualitas','BBVA Seguros','Zurich','Otros'];
export const TIPOS_SEGURO = ['Vida','Gastos Médicos Mayores','Auto','Casa/Hogar','Empresarial','Responsabilidad Civil','Accidentes Personales','Otros'];
export const COBERTURAS   = ['Básica','Amplia','Plus','Premium','Personalizada'];
export const TIPOS_PAGO   = ['Anual','Semestral','Trimestral','Mensual'];
