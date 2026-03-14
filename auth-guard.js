// ============================================================
//  auth-guard.js — importar en cada página protegida
// ============================================================
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
         query, orderBy, where, Timestamp, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function requireAuth(cb) {
  const localRaw = sessionStorage.getItem('localUser');
  if (localRaw) {
    const localUser = JSON.parse(localRaw);
    const fakeUser = { email: localUser.usuario, displayName: localUser.nombre, uid: 'local-admin', isLocal: true };
    const el = document.getElementById('currentUser');
    if (el) { el.textContent = localUser.nombre; const av = document.getElementById('userAvatar'); if (av) av.textContent = localUser.nombre.charAt(0).toUpperCase(); }
    if (cb) cb(fakeUser);
    return;
  }
  onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = 'login.html'; return; }
    const el = document.getElementById('currentUser');
    if (el) { const name = user.displayName || user.email.split('@')[0]; el.textContent = name; const av = document.getElementById('userAvatar'); if (av) av.textContent = name.charAt(0).toUpperCase(); }
    if (cb) cb(user);
  });
}

export async function logout() {
  sessionStorage.removeItem('localUser');
  try { await signOut(auth); } catch(e) {}
  window.location.href = 'login.html';
}

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

export const POLIZAS_COL  = 'polizas';
export const HISTORIAL_COL = 'historial';
// mantener compatibilidad
export const POLIZAS  = 'polizas';
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
  const ref = await addDoc(collection(db, POLIZAS), { ...data, creadoEn: Timestamp.now(), creadoPor: userEmail });
  await registrarHistorial('Alta', `Póliza ${data.noPoliza}`, userEmail);
  return ref.id;
}

export async function updatePoliza(id, data, userEmail) {
  await updateDoc(doc(db, POLIZAS, id), { ...data, actualizadoEn: Timestamp.now(), actualizadoPor: userEmail });
  await registrarHistorial('Actualización', `Póliza ${data.noPoliza}`, userEmail);
}

export async function deletePoliza(id, noPoliza, userEmail) {
  await deleteDoc(doc(db, POLIZAS, id));
  await registrarHistorial('Eliminación', `Póliza ${noPoliza}`, userEmail);
}

export async function registrarHistorial(accion, detalle, usuario) {
  await addDoc(collection(db, HISTORIAL), { accion, detalle, usuario, fecha: Timestamp.now() });
}

export async function getHistorial() {
  const q = query(collection(db, HISTORIAL), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}-${m}-${y}`;
}

export function formatMoney(n, moneda) {
  if (!n && n !== 0) return '—';
  const mon = moneda || 'MXN';
  if (mon === 'USD') return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
  if (mon === 'UDI') return Number(n).toLocaleString('es-MX', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + ' UDIs';
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function diasParaVencer(finPoliza) {
  if (!finPoliza) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fin = new Date(finPoliza + 'T00:00:00');
  return Math.round((fin - hoy) / 86400000);
}

export function badgeVencimiento(dias) {
  if (dias === null) return '';
  if (dias < 0)   return '<span class="badge badge-red">Vencida</span>';
  if (dias <= 30) return `<span class="badge badge-amber">⚠️ Vence en ${dias}d</span>`;
  if (dias <= 60) return `<span class="badge badge-rose">Vence en ${dias}d</span>`;
  if (dias <= 90) return `<span class="badge badge-rose">Vence en ${dias}d</span>`;
  return `<span class="badge badge-green">Vigente</span>`;
}

export function badgeEstatus(estatus) {
  const map = {
    'En Vigencia': 'badge-green',
    'Pendiente de Pago': 'badge-amber',
    'Pagada': 'badge-blue',
    'Pagada con Préstamo Automático': 'badge-rose',
    'Cancelada': 'badge-red',
    'Conversión': 'badge-gray',
  };
  return `<span class="badge ${map[estatus]||'badge-blue'}">${estatus||'—'}</span>`;
}

export function calcAntig(fechaEmision) {
  if (!fechaEmision) return '—';
  const inicio = new Date(fechaEmision + 'T00:00:00');
  const hoy = new Date();
  let years = hoy.getFullYear() - inicio.getFullYear();
  let months = hoy.getMonth() - inicio.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years}a ${months}m`;
  if (months > 0) return `${months} mes${months !== 1 ? 'es' : ''}`;
  return 'Menos de 1 mes';
}

// Catálogos
export const ASEGURADORAS   = ['Chubb','GNP','AXA','Mapfre','MetLife','Allianz','HDI','Qualitas','BBVA Seguros','Zurich','Monterrey New York Life','Seguros SURA','Insignia Life','Otros'];
export const TIPOS_SEGURO   = ['Vida','Gastos Médicos Mayores','Auto','Casa/Hogar','Empresarial','Responsabilidad Civil','Accidentes Personales','Otros'];
export const COBERTURAS     = ['Básica','Amplia','Plus','Premium','Personalizada','Conversión Garantizada','Deducible en Exceso','GMM','VPL','ORVI','Segubeca','Aliados Kids','PPR Plan Personal de Retiro'];
export const TIPOS_PAGO     = ['Anual','Semestral','Trimestral','Mensual'];
export const MONEDAS        = ['Peso','Dólar','UDI'];
export const MODOS_PAGO     = ['Cargo Automático','Modo Agente'];
export const PLANES         = ['INTEGRO','Básico','Estándar','Premium','Plus','Personalizado','Otros'];
export const ESTATUS_POLIZA = ['En Vigencia','Pendiente de Pago','Pagada','Pagada con Préstamo Automático','Cancelada','Conversión'];
export const MEDIOS_COBRO   = ['Agente','Banco','Cargo Automático','Domiciliación'];
