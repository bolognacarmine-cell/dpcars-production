const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');

const SITE = 'https://www.dpcars.it';

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function escapeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function fmtPrice(prezzo) {
  if (!prezzo && prezzo !== 0) return 'Prezzo su richiesta';
  if (prezzo <= 0) return 'Prezzo su richiesta';
  return prezzo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function fmtMeseAnno(v) {
  if (!v.annoImmatricolazione && !v.meseImmatricolazione) return null;
  if (!v.meseImmatricolazione) return String(v.annoImmatricolazione);
  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  return `${mesi[v.meseImmatricolazione - 1]} ${v.annoImmatricolazione}`;
}

function vehicleName(v) {
  return [v.marca, v.modello, v.versione].filter(Boolean).join(' ');
}

function vehicleDescription(v) {
  const bits = [];
  if (v.usato) bits.push(`${v.marca} ${v.modello} usato/a a Marcianise`);
  else bits.push(`${v.marca} ${v.modello} nuovo/a a Marcianise`);
  if (v.annoImmatricolazione) bits.push(`anno ${v.annoImmatricolazione}`);
  if (v.chilometri) bits.push(`${v.chilometri.toLocaleString('it-IT')} km`);
  if (v.carburante) bits.push(v.carburante.toLowerCase());
  if (v.trasmissione || v.cambio) bits.push((v.trasmissione || v.cambio).toLowerCase());
  return bits.join(', ') + '. Disponibile da DP CARS, concessionaria di auto e moto usate a Marcianise (CE).';
}

function makeMetaDescription(v) {
  const text = `${vehicleName(v)}${v.annoImmatricolazione ? ` (${v.annoImmatricolazione})` : ''}${v.chilometri ? ` – ${v.chilometri.toLocaleString('it-IT')} km` : ''}. ${fmtPrice(v.prezzo)}. Disponibile ora da DP CARS a Marcianise.`;
  return text.length > 160 ? text.slice(0, 157).trim() + '…' : text;
}

function buildProductJsonLd(v, canonical, images) {
  const isMoto = v.tipo === 'moto';
  const sold = v.statoVendita === 'venduto';

  const product = {
    '@context': 'https://schema.org',
    '@type': isMoto ? 'Motorcycle' : 'Car',
    name: vehicleName(v),
    brand: { '@type': 'Brand', name: v.marca },
    model: v.modello,
    description: vehicleDescription(v),
    image: images.length ? images : [`${SITE}/logo-og.jpg`],
    itemCondition: v.usato ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
  };

  if (v.annoImmatricolazione) product.vehicleModelDate = String(v.annoImmatricolazione);
  if (v.chilometri) {
    product.mileageFromOdometer = {
      '@type': 'QuantitativeValue',
      value: v.chilometri,
      unitCode: 'KMT',
    };
  }
  if (v.carburante) product.fuelType = v.carburante;
  if (v.trasmissione || v.cambio) product.vehicleTransmission = v.trasmissione || v.cambio;
  if (v.colore) product.color = v.colore;
  if (!isMoto && v.porte) product.numberOfDoors = v.porte;

  if (v.prezzo > 0) {
    product.offers = {
      '@type': 'Offer',
      price: v.prezzo,
      priceCurrency: 'EUR',
      availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: canonical,
      itemCondition: v.usato ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      seller: {
        '@type': 'AutoDealer',
        name: 'DP CARS',
        url: SITE,
      },
    };
  }

  return product;
}

router.get('/:slug', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ slug: req.params.slug }).lean();
    if (!vehicle || (vehicle.statoVendita === 'venduto' && vehicle.mostraVenduto === false)) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="robots" content="noindex,follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Veicolo non trovato | DP CARS</title></head>
<body style="font-family:sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding:4rem 1rem;">
<h1 style="color:#e11d48;">Veicolo non trovato</h1>
<p>Il veicolo che cerchi non è più disponibile o non esiste.</p>
<p><a href="/#inventory" style="color:#60a5fa;">Sfoglia l'inventario</a> · <a href="/" style="color:#60a5fa;">Torna alla Home</a></p>
</body></html>`);
    }

    const name = vehicleName(vehicle);
    const title = `${name} | ${vehicle.tipo === 'moto' ? 'Moto usate Caserta' : 'Auto usate Marcianise'} | DP CARS`;
    const description = makeMetaDescription(vehicle);
    const canonical = `${SITE}/veicolo/${vehicle.slug}`;
    const images = (vehicle.immagini || []).map((img) =>
      (typeof img === 'string' ? img : img.url).replace('/upload/', '/upload/f_auto,q_auto/')
    );
    const image = images[0] || `${SITE}/logo-og.jpg`;
    const sold = vehicle.statoVendita === 'venduto';

    const productJsonLd = buildProductJsonLd(vehicle, canonical, images);

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Inventario', item: `${SITE}/#inventory` },
        { '@type': 'ListItem', position: 3, name, item: canonical },
      ],
    };

    const specs = [
      fmtMeseAnno(vehicle) && { icon: 'fa-calendar-alt', label: fmtMeseAnno(vehicle) },
      vehicle.chilometri && { icon: 'fa-tachometer-alt', label: `${vehicle.chilometri.toLocaleString('it-IT')} km` },
      (vehicle.cambio || vehicle.trasmissione) && { icon: 'fa-cog', label: [vehicle.cambio, vehicle.marce ? `(${vehicle.marce})` : ''].filter(Boolean).join(' ') },
      vehicle.carburante && { icon: 'fa-gas-pump', label: vehicle.carburante },
      vehicle.potenza && { icon: 'fa-bolt', label: vehicle.potenza },
      vehicle.colore && { icon: 'fa-palette', label: vehicle.colore },
      vehicle.porte && vehicle.tipo !== 'moto' && { icon: 'fa-car-side', label: `${vehicle.porte} porte` },
      vehicle.tipoAuto && { icon: 'fa-tag', label: vehicle.tipoAuto },
    ].filter(Boolean);

    const whatsappText = encodeURIComponent(`Ciao, sono interessato a ${name}${vehicle.prezzo > 0 ? ` (${fmtPrice(vehicle.prezzo)})` : ''}: ${canonical}`);

    const carouselHtml = images.length
      ? `<div id="vehicle-carousel" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-inner">
        ${images.map((img, i) => `
        <div class="carousel-item${i === 0 ? ' active' : ''}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(name)} – immagine ${i + 1}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} width="1600" height="900">
        </div>`).join('')}
      </div>
      ${images.length > 1 ? `
      <button class="carousel-control-prev" type="button" data-bs-target="#vehicle-carousel" data-bs-slide="prev" aria-label="Immagine precedente">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#vehicle-carousel" data-bs-slide="next" aria-label="Immagine successiva">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
      </button>` : ''}
    </div>`
      : `<div class="vehicle-no-image"><i class="fas fa-${vehicle.tipo === 'moto' ? 'motorcycle' : 'car'} fa-4x"></i></div>`;

    const html = `<!DOCTYPE html>
<html lang="it" data-bs-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="/theme-loader.js"></script>
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow">
  <meta property="og:locale" content="it_IT">
  <meta property="og:site_name" content="DP CARS">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <script type="application/ld+json">${escapeJson(productJsonLd)}</script>
  <script type="application/ld+json">${escapeJson(breadcrumb)}</script>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist/darkly/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="/style.css">
  <style id="theme-vars">
    :root { --primary-sport: #e11d48; }
    body { background:#0a0a0a; color:#fff; padding-top:100px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
    .navbar { background:rgba(10,10,10,0.95) !important; backdrop-filter:blur(10px); border-bottom:1px solid rgba(255,255,255,0.1); }
    .brand-logo { height:50px; border-radius:8px; border:2px solid rgba(255,23,68,0.45); }
    .navbar-brand .brand-name { font-weight:900; font-size:1.5rem; letter-spacing:0.12em; color:#ff1744 !important; text-shadow:0 0 16px rgba(255,23,68,0.9); }
    .navbar-brand .brand-tagline { font-weight:700; font-size:0.75rem; letter-spacing:0.25em; color:#fff !important; }
    .vehicle-panel { background:linear-gradient(145deg,#1a1a1a,#0f0f0f); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; margin-bottom:3rem; }
    .vehicle-panel .carousel-item, .vehicle-no-image { height:clamp(260px,45vw,480px); background:#000; }
    .vehicle-panel .carousel-item img { width:100%; height:100%; object-fit:cover; }
    .vehicle-no-image { display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.25); }
    .vehicle-body { padding:2rem; }
    .vehicle-body h1 { color:#fff; font-weight:800; font-size:clamp(1.6rem,3vw,2.2rem); margin-bottom:0.5rem; }
    .vehicle-body h1 .versione { display:block; font-size:1rem; font-weight:500; color:rgba(255,255,255,0.6); }
    .specs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin:1.5rem 0; }
    .spec-item { display:flex; align-items:center; gap:10px; color:rgba(255,255,255,0.75); font-size:0.95rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:0.65rem 0.9rem; }
    .spec-item i { color:#ff1744; width:18px; text-align:center; }
    .price-row { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1rem; border-top:1px solid rgba(255,255,255,0.08); padding-top:1.5rem; margin-top:1.5rem; }
    .price { font-size:1.9rem; font-weight:900; color:#fff; }
    .btn-back, .btn-cta { background:linear-gradient(135deg,#ff1744,#d32f2f); border:none; padding:0.75rem 1.8rem; font-weight:600; border-radius:50px; text-decoration:none; color:#fff; display:inline-flex; align-items:center; gap:0.5rem; }
    .btn-back:hover, .btn-cta:hover { color:#fff; }
    .btn-cta-outline { border:1px solid rgba(255,255,255,0.25); background:transparent; padding:0.75rem 1.8rem; font-weight:600; border-radius:50px; text-decoration:none; color:#fff; display:inline-flex; align-items:center; gap:0.5rem; }
    .btn-cta-outline:hover { color:#fff; border-color:#ff1744; }
    .descrizioni p { line-height:1.8; color:rgba(255,255,255,0.85); }
    .sold-stamp { position:absolute; top:1rem; left:1rem; z-index:5; background:rgba(220,38,38,0.9); color:#fff; font-weight:800; letter-spacing:2px; padding:0.4rem 1rem; border-radius:6px; text-transform:uppercase; }
    .vehicle-media { position:relative; }
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
    <div class="container">
      <a href="/" class="navbar-brand d-flex align-items-center">
        <img src="/logo-og.jpg" alt="DP CARS Logo" class="brand-logo me-3" width="50" height="50">
        <div class="brand-text d-flex flex-column">
          <span class="brand-name">DP CARS</span>
          <span class="brand-tagline">MARCIANISE</span>
        </div>
      </a>
      <a href="/#inventory" class="btn-back"><i class="fas fa-arrow-left"></i> Inventario</a>
    </div>
  </nav>

  <main class="container py-5">
    <article class="vehicle-panel">
      <div class="vehicle-media">
        ${sold ? '<div class="sold-stamp">Venduto</div>' : ''}
        ${carouselHtml}
      </div>
      <div class="vehicle-body">
        <h1>${escapeHtml(vehicle.marca)} ${escapeHtml(vehicle.modello)}${vehicle.versione ? `<span class="versione">${escapeHtml(vehicle.versione)}</span>` : ''}</h1>
        <span class="badge ${sold ? 'bg-danger' : 'bg-success'} text-uppercase" style="letter-spacing:1px; font-size:0.7rem;">${escapeHtml(vehicle.statoVendita || 'disponibile')}</span>

        <div class="specs-grid">
          ${specs.map((s) => `<div class="spec-item"><i class="fas ${s.icon}"></i><span>${escapeHtml(s.label)}</span></div>`).join('')}
        </div>

        ${(vehicle.descrizioni && vehicle.descrizioni.length) ? `
        <div class="descrizioni">
          ${vehicle.descrizioni.map((d) => `<p>${escapeHtml(d)}</p>`).join('')}
        </div>` : ''}

        <div class="price-row">
          <div class="price">${escapeHtml(fmtPrice(vehicle.prezzo))}</div>
          <div class="d-flex flex-wrap gap-3">
            <a href="tel:+393333330834" class="btn-cta-outline"><i class="fas fa-phone-alt"></i> Chiama</a>
            <a href="https://wa.me/393333330834?text=${whatsappText}" target="_blank" rel="noopener noreferrer" class="btn-cta"><i class="fab fa-whatsapp"></i> Scrivi su WhatsApp</a>
          </div>
        </div>
      </div>
    </article>

    <div class="text-center">
      <a href="/#inventory" class="btn-back"><i class="fas fa-arrow-left"></i> Tutti i veicoli disponibili</a>
    </div>
  </main>

  <footer class="main-footer mt-5">
    <div class="container text-center">
      <div class="footer-bottom border-0 pt-0 mt-0">
        <div class="mb-3">
          <a href="/note-legali.html" class="footer-legal-link mx-2">Note Legali</a>
          <span class="mx-2 opacity-25">•</span>
          <a href="/privacy.html" class="footer-legal-link mx-2">Privacy Policy</a>
          <span class="mx-2 opacity-25">•</span>
          <a href="/cookie-policy.html" class="footer-legal-link mx-2">Cookie Policy</a>
        </div>
        <p class="small text-white-50 mb-0">© 2026 <strong>DP CARS S.r.l.</strong> | Tutti i diritti riservati</p>
      </div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
