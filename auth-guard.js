// ============================================================
//  auth-guard.js — Versión PostgreSQL (API Flask)
// ============================================================

const API_BASE = ''; // Se usa ruta relativa si el HTML es servido por Flask

export function requireAuth(cb) {
  const localRaw = sessionStorage.getItem('localUser');
  if (localRaw) {
    const localUser = JSON.parse(localRaw);
    const fakeUser = { 
        email: localUser.email, 
        displayName: localUser.nombre, 
        rol: localUser.rol || 'usuario',
        uid: 'pg-user', 
        isLocal: true,
        metadata: { lastSignInTime: new Date().toISOString() } 
    };
    
    const el = document.getElementById('currentUser');
    if (el) { 
        el.textContent = localUser.nombre; 
        const av = document.getElementById('userAvatar'); 
        if (av) av.textContent = localUser.nombre.charAt(0).toUpperCase(); 
    }

    // Lógica de protección de interfaz por Rol
    const isAdmin = localUser.rol === 'admin';
    
    // Ocultar sección de Administración si no es admin
    const sidebarAdminSection = document.querySelector('.sidebar-section:nth-of-type(2)');
    if (sidebarAdminSection && !isAdmin) {
        // Buscamos todos los elementos de la sección admin
        let next = sidebarAdminSection;
        while (next) {
            let current = next;
            next = next.nextElementSibling;
            if (current.classList.contains('sidebar-section') && current !== sidebarAdminSection) break;
            if (!current.classList.contains('sidebar-footer')) {
                current.style.display = 'none';
            }
        }
    }

    // Redirigir si intenta entrar a usuarios.html o historial.html sin ser admin
    const page = window.location.pathname.split('/').pop();
    if (['usuarios.html', 'historial.html'].includes(page) && !isAdmin) {
        window.location.href = 'index.html';
        return;
    }

    if (cb) cb(fakeUser);
    return;
  }
  
  // Si no hay sesión en sessionStorage, redirigir al login
  window.location.href = 'login.html';
}

export async function logout() {
  sessionStorage.removeItem('localUser');
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

// --- FUNCIONES DE API (POSTGRESQL) ---

export async function getPolizas() {
  const res = await fetch(`${API_BASE}/api/polizas`);
  return await res.json();
}

export async function getPoliza(id) {
  const res = await fetch(`${API_BASE}/api/polizas/${id}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function addPoliza(data, userEmail) {
  const res = await fetch(`${API_BASE}/api/polizas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, userEmail })
  });
  const result = await res.json();
  return result.id;
}

export async function updatePoliza(id, data, userEmail) {
  await fetch(`${API_BASE}/api/polizas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, userEmail })
  });
}

export async function deletePoliza(id, noPoliza, userEmail) {
  await fetch(`${API_BASE}/api/polizas/${id}?userEmail=${userEmail}`, {
    method: 'DELETE'
  });
}

export async function getHistorial() {
  const res = await fetch(`${API_BASE}/api/historial`);
  return await res.json();
}

// --- UTILERÍAS ---

export function formatDate(str) {
  if (!str) return '—';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  const [y, m, d] = parts;
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

// Catálogos (se mantienen igual)
export const ASEGURADORAS   = ['Chubb','GNP','AXA','Mapfre','MetLife','Allianz','HDI','Qualitas','BBVA Seguros','Zurich','Monterrey New York Life','Seguros SURA','Insignia Life','Otros'];
export const TIPOS_SEGURO   = ['Vida','Gastos Médicos Mayores','Auto','Casa/Hogar','Empresarial','Responsabilidad Civil','Accidentes Personales','Otros'];
export const COBERTURAS     = ['Básica','Amplia','Plus','Premium','Personalizada','Conversión Garantizada','Deducible en Exceso','GMM','VPL','ORVI','Segubeca','Aliados Kids','PPR Plan Personal de Retiro'];
export const TIPOS_PAGO     = ['Anual','Semestral','Trimestral','Mensual'];
export const MONEDAS        = ['Peso','Dólar','UDI'];
export const MODOS_PAGO     = ['Cargo Automático','Modo Agente'];
export const PLANES         = ['INTEGRO','Básico','Estándar','Premium','Plus','Personalizado','Otros'];
export const ESTATUS_POLIZA = ['En Vigencia','Pendiente de Pago','Pagada','Pagada con Préstamo Automático','Cancelada','Conversión'];
export const MEDIOS_COBRO   = ['Agente','Banco','Cargo Automático','Domiciliación'];
