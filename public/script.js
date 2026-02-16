console.log('🚀 SCRIPT.JS CARICATO!');

/* =========================================================
   CONFIG
========================================================= */
const CONFIG = {
  API_URL: '',  // ← VUOTO! Usa percorsi relativi
  LIMIT_VEHICLES: 999,  // ← MOSTRA TUTTI
  // ... resto uguale
};

/* =========================================================
   STATE
========================================================= */
const state = {
  currentPage: 1,
  filters: {
    type: 'all',
    search: '',
    sort: 'price-asc'
  },
  searchTimeout: null,

  // 🔹 RECENSIONI DINAMICHE
  recensioni: [
    { autore: "Mario Rossi", testo: "Ottimo servizio e veicoli di qualità!", data: "Feb 2026" },
    { autore: "Lucia Bianchi", testo: "Personale disponibile e prezzi competitivi.", data: "Gen 2026" },
    { autore: "Giuseppe Verdi", testo: "Ho trovato l'auto dei miei sogni!", data: "Dic 2025" }
  ]
};

/* =========================================================
   UTILS
========================================================= */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* =========================================================
   YEAR
========================================================= */
function updateYear() {
  const el = $('#year') || $('.year');
  if (el) el.textContent = new Date().getFullYear();
}

/* =========================================================
   API
========================================================= */
// ✅ CORRETTO - MOSTRA TUTTI:
async function fetchVehicles() {
  try {
    // SEMPLICE, SENZA FILTRI/PAGINAZIONE
    const res = await fetch('/veicoli');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return data; // Backend manda array diretto
  } catch (err) {
    console.error('❌ API error:', err);
    return [];
  }
}

/* =========================================================
   LOAD VEHICLES
========================================================= */
async function loadVehicles() {
  const grid = $('#vehicles-grid');
  if (!grid) return;

  grid.innerHTML = `<p style="grid-column:1/-1;text-align:center">Caricamento...</p>`;
  const vehicles = await fetchVehicles();
  renderVehicles(vehicles);
}

/* =========================================================
   RENDER VEHICLES
========================================================= */
function renderVehicles(vehicles) {
  console.log(`🎨 Rendering ${vehicles.length} veicoli...`);
  
  const grid = $('#vehicles-grid');
  if (!grid) {
    console.error('❌ #vehicles-grid NON TROVATO!');
    return;
  }

  if (!vehicles.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center">Nessun veicolo trovato</p>`;
    return;
  }

  grid.innerHTML = vehicles.map((v, i) => {
    // ✅ SAFE: gestisce campi mancanti
    const imgs = Array.isArray(v.immagini) ? v.immagini.slice(0, CONFIG.MAX_IMAGES) : [];
    const imagesHTML = imgs.length 
      ? imgs.map((img, n) => `<img src="${img.url || img}" class="slide ${n === 0 ? 'active' : ''}" loading="lazy">`).join('')
      : `<div class="no-image">Foto non disponibile</div>`;

    const prezzo = Number(v.prezzo || 0);
    const prezzoHTML = isNaN(prezzo) ? 'Prezzo su richiesta' : `€${prezzo.toLocaleString()}`;

    return `
<article class="vehicle-card" data-aos="fade-up" data-aos-delay="${i * 80}">
  <div class="slider">
    <div class="slides">${imagesHTML}</div>
    ${imgs.length > 1 ? `
      <button class="prev">❮</button>
      <button class="next">❯</button>
      <div class="dots"></div>` : ''}
  </div>

  <div class="vehicle-details">
    <div class="info">
      <span class="badge">${(v.tipo || 'AUTO').toUpperCase()}</span>
      <h3>${v.marca || '?'} ${v.modello || 'Modello'}</h3>
      <p class="vehicle-descrizione">${v.descrizione || v.descrizioni?.[0] || 'Veicolo premium'}</p>
    </div>

    <div class="specs">
      <span>${v.annoImmatricolazione || v.anno || 'N/D'}</span>
      <span>${v.chilometri?.toLocaleString() || 'N/D'} km</span>
      <span>${v.carburante || 'N/D'}</span>
    </div>

    <div class="price">${prezzoHTML}</div>

    <div class="actions">
      <a href="tel:+393921234567" class="btn call">📞 Chiama</a>
      <a href="https://wa.me/393921234567?text=Interessato ${v.marca || ''} ${v.modello || ''}" target="_blank" class="btn whatsapp">💬 WhatsApp</a>
      <button class="btn info js-show-indicazioni">📝 Indicazioni</button>
    </div>

    <div class="indicazioni hidden">
      <ul>
        <li><b>Marca:</b> ${v.marca || '—'}</li>
        <li><b>Modello:</b> ${v.modello || '—'}</li>
        <li><b>Anno:</b> ${v.annoImmatricolazione || v.anno || '—'}</li>
        <li><b>Km:</b> ${v.chilometri?.toLocaleString() || '—'}</li>
        <li><b>Prezzo:</b> ${prezzoHTML}</li>
      </ul>
    </div>
  </div>
</article>`;
  }).join('');

  console.log(`✅ Renderizzati ${vehicles.length} veicoli`);
  setTimeout(initSliders, 50);
  initIndicazioniButtons();
}

/* =========================================================
   INDICAZIONI TOGGLE
========================================================= */
function initIndicazioniButtons() {
  $$('.js-show-indicazioni').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.vehicle-card');
      const box = card.querySelector('.indicazioni');
      box.classList.toggle('hidden');
      btn.textContent = box.classList.contains('hidden')
        ? '📝 Indicazioni'
        : 'Nascondi indicazioni';
    });
  });
}

/* =========================================================
   SLIDER
========================================================= */
function initSliders() {
  $$('.slider').forEach(slider => {
    const slides = slider.querySelectorAll('.slide');
    if (slides.length <= 1) return;

    const dots = slider.querySelector('.dots');
    const prev = slider.querySelector('.prev');
    const next = slider.querySelector('.next');

    let index = 0;
    let timer;

    dots.innerHTML = slides
      .map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`)
      .join('');

    const update = i => {
      slides.forEach((s, n) => s.classList.toggle('active', n === i));
      dots.querySelectorAll('.dot').forEach((d, n) => d.classList.toggle('active', n === i));
      index = i;
    };

    prev.onclick = () => update((index - 1 + slides.length) % slides.length);
    next.onclick = () => update((index + 1) % slides.length);

    dots.onclick = e => {
      if (e.target.classList.contains('dot')) {
        update(+e.target.dataset.i);
      }
    };

    timer = setInterval(() => next.click(), CONFIG.AUTO_SLIDE_DELAY);
    slider.onmouseenter = () => clearInterval(timer);
    slider.onmouseleave = () =>
      timer = setInterval(() => next.click(), CONFIG.AUTO_SLIDE_DELAY);
  });
}

/* =========================================================
   MODAL DETTAGLI
========================================================= */
let currentModal = null;

document.addEventListener('click', e => {
  const btn = e.target.closest('.js-details');
  if (!btn) return;

  const vehicle = JSON.parse(decodeURIComponent(btn.dataset.vehicle));
  openDetails(vehicle);
});

function openDetails(v) {
  closeDetails();

  const modal = document.createElement('div');
  modal.className = 'vehicle-modal';

  modal.innerHTML = `
    <div class="backdrop"></div>
    <div class="box">
      <button class="close">✕</button>
      <h2>${v.marca} ${v.modello}</h2>
      <div class="price">€${parseInt(v.prezzo).toLocaleString()}</div>
      <ul class="specs">
        <li><b>Anno:</b> ${v.anno}</li>
        <li><b>Km:</b> ${v.chilometri?.toLocaleString()}</li>
        <li><b>Carburante:</b> ${v.carburante}</li>
        <li><b>Cambio:</b> ${v.cambio}</li>
        <li><b>Potenza:</b> ${v.potenza || '—'} CV</li>
      </ul>
      <div class="desc">${v.descrizione || 'Descrizione disponibile in sede'}</div>
    </div>
  `;

  modal.querySelector('.close').onclick =
  modal.querySelector('.backdrop').onclick = closeDetails;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  currentModal = modal;
}

function closeDetails() {
  if (!currentModal) return;
  currentModal.remove();
  document.body.style.overflow = '';
  currentModal = null;
}

/* =========================================================
   FILTERS
========================================================= */
function initFilters() {
  $('#typeFilter')?.addEventListener('change', e => {
    state.filters.type = e.target.value;
    loadVehicles();
  });

  $('#sortFilter')?.addEventListener('change', e => {
    state.filters.sort = e.target.value;
    loadVehicles();
  });

  $('#searchInput')?.addEventListener('input', e => {
    clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value;
      loadVehicles();
    }, CONFIG.DEBOUNCE_DELAY);
  });
}

/* =========================================================
   RENDER RECENSIONI
========================================================= */
function renderRecensioni() {
  const grid = $('#recensioni-grid');
  if (!grid) return;

  if (!state.recensioni.length) {
    grid.innerHTML = `<p style="text-align:center">Ancora nessuna recensione</p>`;
    return;
  }

  grid.innerHTML = state.recensioni.map((r, i) => `
    <article class="recensione-card" data-aos="fade-up" data-aos-delay="${i * 80}">
      <div class="recensione-body">
        <p>"${r.testo}"</p>
        <h4>${r.autore}</h4>
        <span>${r.data}</span>
      </div>
    </article>
  `).join('');
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  updateYear();
  initFilters();
  loadVehicles();
  renderRecensioni(); // 🔹 Recensioni
});
