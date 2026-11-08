/* =====================================================================
   CONFIGURACIÓN DE AURA  (lo único que normalmente necesitas cambiar)
   ---------------------------------------------------------------------
   · whatsapp: número con indicativo de país, SOLO números (Colombia = 57).
   · telefono: cómo se muestra el número en la página.
   · precios: en pesos colombianos, SOLO números. Sin "$" y sin puntos.
       Correcto: 45000   |   Incorrecto: $45.000
       Si dejas un 0, la página muestra "Precio por confirmar".
   ===================================================================== */
const CONFIG = {
  negocio: 'AURA',
  whatsapp: '573217034158',
  telefono: '+57 321 7034158',
  precios: {
    labial: 5000,
    base: 10000,
    paleta: 45000,
    mascara: 30000,
    rubor: 25000
  }
};
/* ===================================================================== */

(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => '$' + Number(n).toLocaleString('es-CO');
  const cleanPrice = (v) => Number(String(v).replace(/\D/g, '')) || 0;
  const wa = (text) => 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);

  /* ---------- productos leídos del HTML ---------- */
  const products = $$('.product').map((el) => ({
    id: el.dataset.id,
    name: el.dataset.name,
    el,
    price: cleanPrice(CONFIG.precios[el.dataset.id])
  }));
  const qty = {};
  products.forEach((p) => { qty[p.id] = 0; });

  /* ---------- enlaces de WhatsApp ---------- */
  const generalMsg = '¡Hola ' + CONFIG.negocio + '! Quisiera información sobre sus productos de maquillaje.';
  $$('[data-wa="general"]').forEach((a) => { a.href = wa(generalMsg); });
  $$('[data-wa-label]').forEach((a) => { a.textContent = CONFIG.telefono; });

  /* ---------- carrito ---------- */
  const badge = $('#cartBadge');
  const drawer = $('#drawer');
  const scrim = $('#scrim');
  const lines = $('#cartLines');
  const toast = $('#toast');
  let lastFocus = null;
  let toastTimer = null;

  function totals() {
    const items = products.filter((p) => qty[p.id] > 0);
    const units = items.reduce((a, p) => a + qty[p.id], 0);
    const allPriced = items.length > 0 && items.every((p) => p.price > 0);
    const total = items.reduce((a, p) => a + p.price * qty[p.id], 0);
    return { items, units, allPriced, total };
  }

  function render() {
    // tarjetas de producto
    products.forEach((p) => {
      $('.qty', p.el).textContent = qty[p.id];
      $('[data-price]', p.el).textContent = p.price > 0 ? money(p.price) : 'Precio por confirmar';
    });

    const t = totals();
    badge.textContent = t.units;
    badge.classList.toggle('on', t.units > 0);

    // líneas del carrito
    lines.innerHTML = t.items.map((p) => {
      const sub = p.price > 0 ? ' · ' + money(p.price * qty[p.id]) : '';
      return '<li class="line"><div><b>' + p.name + '</b><span>' + qty[p.id] + (qty[p.id] === 1 ? ' unidad' : ' unidades') + sub + '</span></div>' +
        '<div class="stepper"><button type="button" data-act="cart-dec" data-id="' + p.id + '" aria-label="Quitar uno de ' + p.name + '">−</button>' +
        '<button type="button" data-act="cart-inc" data-id="' + p.id + '" aria-label="Agregar uno de ' + p.name + '">+</button></div></li>';
    }).join('');

    $('#cartEmpty').hidden = t.units > 0;
    $('#cartFoot').hidden = t.units === 0;
    $('#totUnits').textContent = t.units;
    $('#totMoneyRow').hidden = !t.allPriced;
    $('#totMoney').textContent = money(t.total);
    $('#totNote').hidden = t.allPriced;

    // mensaje del pedido
    let msg = '¡Hola ' + CONFIG.negocio + '! Quisiera hacer el siguiente pedido:\n';
    t.items.forEach((p) => { msg += '• ' + qty[p.id] + ' × ' + p.name + '\n'; });
    msg += 'Total de productos: ' + t.units + '\n';
    if (t.allPriced) msg += 'Valor estimado: ' + money(t.total) + '\n';
    msg += '¿Me confirman disponibilidad, tonos, precio y entrega?';
    $('#orderLink').href = wa(msg);
  }

  function change(id, d) {
    qty[id] = Math.max(0, Math.min(99, (qty[id] || 0) + d));
    render();
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function openCart() {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#closeCart').focus(), 50);
  }
  function closeCart() {
    drawer.classList.remove('open');
    scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- menú móvil ---------- */
  const mnav = $('#mnav');
  const burger = $('.burger');
  function toggleMenu(force) {
    const open = typeof force === 'boolean' ? force : !mnav.classList.contains('open');
    mnav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /* ---------- clics (delegación) ---------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.product');
    switch (btn.dataset.act) {
      case 'inc': change(card.dataset.id, 1); break;
      case 'dec': change(card.dataset.id, -1); break;
      case 'add':
        change(card.dataset.id, 1);
        badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
        showToast(card.dataset.name + ' agregado al carrito');
        break;
      case 'cart-inc': change(btn.dataset.id, 1); break;
      case 'cart-dec': change(btn.dataset.id, -1); break;
      case 'clear': products.forEach((p) => { qty[p.id] = 0; }); render(); break;
      case 'open-cart': openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'menu': toggleMenu(); break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (drawer.classList.contains('open')) closeCart();
    if (mnav.classList.contains('open')) toggleMenu(false);
  });

  /* ---------- formulario de contacto -> WhatsApp ---------- */
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const msg = '¡Hola ' + CONFIG.negocio + '! Soy ' + f.nombre.value.trim() + '.\n' +
      'Motivo: ' + f.motivo.value + '\n' + f.mensaje.value.trim() + '\n' +
      'Contacto: ' + [f.tel.value.trim(), f.correo.value.trim()].filter(Boolean).join(' · ');
    window.open(wa(msg), '_blank', 'noopener');
  });

  /* ---------- encabezado al hacer scroll ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- aparición suave de secciones ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  render();
})();
