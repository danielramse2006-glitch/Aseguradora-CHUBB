// mobile-menu.js — incluir en todos los HTML con sidebar
export function initMobileMenu() {
  const sidebar  = document.querySelector('.sidebar');
  const hamburger = document.getElementById('hamburger');
  if (!sidebar || !hamburger) return;

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Cerrar al hacer clic en nav-item en móvil
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  });
}
