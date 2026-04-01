console.log('🚀 SCRIPT.JS CARICATO!');

/* =========================================================
   CONFIG
========================================================= */
const CONFIG = {
  API_URL: '',
  LIMIT_VEHICLES: 999,
  MAX_IMAGES: 5,           
  AUTO_SLIDE_DELAY: 4000,  
  DEBOUNCE_DELAY: 300,     

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
async function fetchVehicles() {
  try {
    const res = await fetch('/api/vehicles');  // ← /api/vehicles invece /vehicles
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    console.log(`📊 Trovati ${data.length} veicoli`);
    return data;
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
    const prezzoHTML = (isNaN(prezzo) || prezzo === 0) ? 'Prezzo su richiesta' : `€${prezzo.toLocaleString()}`;

    const isSold = v.statoVendita === 'venduto';
    const soldStampHTML = isSold ? `<div class="sold-stamp"></div>` : '';

    return `
<article class="vehicle-card ${isSold ? 'is-sold' : ''}" data-aos="fade-up" data-aos-delay="${i * 80}">
  <div class="slider">
    ${soldStampHTML}
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
  <span class="marce">${v.marce ? v.marce + ' marce' : 'N/D'}</span>
  <span>${v.colore || 'N/D'}</span>
  <span>${v.carburante || 'N/D'}</span>
  <span>${v.cambio || 'N/D'}</span>
  <span>${v.porte || '?'} porte</span>
  <span>${v.potenza || 'N/D'}</span>
  <span>${v.versione || '—'}</span>
</div>

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
  initIndicazioniButtons();
  initLazySliders();
}

/* =========================================================
   LAZY SLIDER INITIALIZATION (SMART AUTO-START)
========================================================= */
function initLazySliders() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slider = entry.target.querySelector('.slider');
        if (slider && !slider.classList.contains('initialized')) {
          initSlider(slider);
          slider.classList.add('initialized');
        }
      }
    });
  }, { threshold: 0.1 });

  $$('.vehicle-card').forEach(card => observer.observe(card));
}

/* =========================================================
   SINGLE SLIDER LOGIC
========================================================= */
function initSlider(slider) {
  const slides = slider.querySelectorAll('.slide');
  if (slides.length <= 1) return;

  const dotsContainer = slider.querySelector('.dots');
  const prevBtn = slider.querySelector('.prev');
  const nextBtn = slider.querySelector('.next');

  let index = 0;
  let timer;

  dotsContainer.innerHTML = Array.from(slides)
    .map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`)
    .join('');

  const dots = dotsContainer.querySelectorAll('.dot');

  const update = (newIndex) => {
    slides.forEach((s, n) => s.classList.toggle('active', n === newIndex));
    dots.forEach((d, n) => d.classList.toggle('active', n === newIndex));
    index = newIndex;
  };

  prevBtn.onclick = () => update((index - 1 + slides.length) % slides.length);
  nextBtn.onclick = () => update((index + 1) % slides.length);

  dotsContainer.onclick = (e) => {
    if (e.target.classList.contains('dot')) {
      update(Number(e.target.dataset.i));
    }
  };

  const startAutoplay = () => {
    clearInterval(timer);
    timer = setInterval(() => nextBtn.click(), CONFIG.AUTO_SLIDE_DELAY);
  };

  slider.onmouseenter = () => clearInterval(timer);
  slider.onmouseleave = startAutoplay;

  startAutoplay();
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
   MODAL DETTAGLI
========================================================= */

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

    const pVal = Number(v.prezzo || 0);
    const pHTML = (isNaN(pVal) || pVal === 0) ? 'Prezzo su richiesta' : `€${pVal.toLocaleString()}`;

  modal.innerHTML = `
    <div class="backdrop"></div>
    <div class="box">
      <button class="close">✕</button>
      <h2>${v.marca} ${v.modello}</h2>
      <div class="price">${pHTML}</div>
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
