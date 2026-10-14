const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

const SITE = 'https://www.dpcars.it';

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeDescription(html, max = 160) {
  const text = stripHtml(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

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

router.get('/:slug', async (req, res, next) => {
  try {
    const articolo = await Blog.findOne({ slug: req.params.slug }).lean();
    if (!articolo) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="robots" content="noindex,follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Articolo non trovato | DP CARS</title></head>
<body style="font-family:sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding:4rem 1rem;">
<h1 style="color:#e11d48;">Articolo non trovato</h1>
<p>L'articolo che cerchi non esiste o è stato rimosso.</p>
<p><a href="/blog.html" style="color:#60a5fa;">Vai al Blog</a> · <a href="/" style="color:#60a5fa;">Torna alla Home</a></p>
</body></html>`);
    }

    const title = articolo.titolo;
    const description = makeDescription(articolo.contenuto, 160);
    const canonical = `${SITE}/blog/${articolo.slug}`;
    const image = articolo.immagine || `${SITE}/logo-og.jpg`;
    const dateISO = new Date(articolo.data).toISOString();
    const dataFormattata = new Date(articolo.data).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const blogPosting = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      image: [image],
      datePublished: dateISO,
      dateModified: dateISO,
      inLanguage: 'it-IT',
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: { '@type': 'Organization', name: 'DP CARS', url: SITE },
      publisher: {
        '@type': 'Organization',
        name: 'DP CARS',
        logo: { '@type': 'ImageObject', url: `${SITE}/immagini/logo.jpg` },
      },
    };

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog.html` },
        { '@type': 'ListItem', position: 3, name: title, item: canonical },
      ],
    };

    const contenutoHtml = String(articolo.contenuto || '').replace(/\n/g, '<br>');

    const html = `<!DOCTYPE html>
<html lang="it" data-bs-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="/theme-loader.js"></script>
  <title>${escapeHtml(title)} | Blog DP CARS</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow">
  <meta property="og:locale" content="it_IT">
  <meta property="og:site_name" content="DP CARS">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <script type="application/ld+json">${escapeJson(blogPosting)}</script>
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
    .blog-article { background:linear-gradient(145deg,#1a1a1a,#0f0f0f); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:2.5rem; margin-bottom:3rem; }
    .blog-article h1 { color:var(--primary-sport); font-weight:800; font-size:2.2rem; margin-bottom:1rem; }
    .meta { color:rgba(255,255,255,0.6); font-size:0.9rem; margin-bottom:2rem; display:flex; align-items:center; gap:1rem; }
    .meta i { color:var(--primary-sport); }
    .blog-article img { width:100%; max-height:500px; object-fit:cover; border-radius:12px; margin-bottom:2rem; box-shadow:0 10px 30px rgba(0,0,0,0.5); }
    .contenuto-full { line-height:1.8; font-size:1.1rem; color:rgba(255,255,255,0.9); }
    .btn-back { background:linear-gradient(135deg,#ff1744,#d32f2f); border:none; padding:0.8rem 2rem; font-weight:600; border-radius:50px; text-decoration:none; color:#fff; display:inline-flex; align-items:center; gap:0.5rem; }
    .btn-back:hover { color:#fff; }
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
      <a href="/blog.html" class="btn-back d-none d-lg-flex"><i class="fas fa-arrow-left"></i> Torna al Blog</a>
    </div>
  </nav>

  <main class="container py-5">
    <article class="blog-article">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        <span><i class="fas fa-tag"></i> ${escapeHtml(articolo.argomento || 'Generale')}</span>
        <span><i class="fas fa-calendar-alt"></i> ${dataFormattata}</span>
      </div>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}
      <div class="contenuto-full">${contenutoHtml}</div>
    </article>
    <div class="text-center mt-4">
      <a href="/blog.html" class="btn-back"><i class="fas fa-arrow-left"></i> Tutti gli articoli</a>
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
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
