# NOTE SEO / AEO — DP CARS

Ultimo aggiornamento: 14 ottobre 2026

## Repository
- Repo: `https://github.com/bolognacarmine-cell/dpcars-production.git`
- Branch: `main`
- Ultimo commit pubblicato su GitHub: `98f7345` (note SEO/AEO)
- Commit locali pronti da pushare: `6974c04`, `e0c54cf`, `2b4b6cd` (vedi tabella)
- Deploy: Render fa auto-deploy ad ogni push su `main`
- Sito: https://www.dpcars.it
- Search Console: proprietà `https://www.dpcars.it/`

## Cronologia interventi
| Commit | Cosa |
|---|---|
| `260e505` | Sitemap: rimossa URL blog rotte, aggiunta guida, lastmod reali |
| `d0a98c1` | Blog SSR `/blog/:slug`, canonical mancanti, 404 reali, card crawlabili |
| `93af159` | Sitemap dinamica dal DB, rimossa sitemap statica e fragment `#` |
| `98f7345` | Note SEO/AEO e storico interventi |
| `6974c04` | Pulizia: rimossi file spazzatura committati per errore |
| `e0c54cf` | FAQ visibili in home (coerenti col JSON-LD FAQPage), `openingHours` come array |
| `2b4b6cd` | Schede veicolo SSR `/veicolo/:slug` (schema Car/Motorcycle + Offer + Breadcrumb), slug auto, sitemap dinamica |

## File toccati
- `server.js` → route sitemap dinamica + 404 finale + mount `/veicolo` + veicoli in sitemap
- `public/sitemap.xml` → RIMOSSO (ora generato dal server)
- `routes/blogPage.js` → NUOVO (pagine articolo SEO, render lato server)
- `routes/vehiclePage.js` → NUOVO (schede veicolo SEO, render lato server)
- `utils/slug.js` → NUOVO (generazione slug)
- `models/Vehicle.js` → campo `slug` + hook di generazione + indice unique/sparse + `ensureSlug`
- `routes/veicoli.js` → backfill slug per veicoli storici
- `public/index.html` → card blog crawlabili, FAQ visibili, link schede veicolo, JSON-LD `openingHours` array
- `public/mondo-auto.html`, `public/guida-auto-usate-marcianise.html` → canonical aggiunto

## Come continuare a lavorare
```bash
git clone https://github.com/bolognacarmine-cell/dpcars-production.git
cd dpcars-production
# modifica i file...
git add -A
git commit -m "descrizione modifica"
git push origin main
```
Per il push serve un Personal Access Token (scope `repo`).
Revocarlo/rigenerarlo quando non serve più.

## Verifiche live rapide
```bash
curl -s https://www.dpcars.it/sitemap.xml | grep "<loc>"
curl -s -o /dev/null -w "%{http_code}\n" https://www.dpcars.it/blog/novita-auto-2026-marcianise   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://www.dpcars.it/pagina-inesistente                 # 404
curl -s https://www.dpcars.it/sitemap.xml | grep "/veicolo/" | head
```

## Note tecniche utili
- La sitemap (`/sitemap.xml`) è generata da `server.js` e legge articoli blog E veicoli dal DB MongoDB.
  Aggiungendo un articolo o un veicolo dall'admin, appare automaticamente in sitemap.
- Pagine articolo: `/blog/<slug>` (render lato server con title, description, canonical, Open Graph,
  schema `BlogPosting` + `BreadcrumbList`).
- Schede veicolo: `/veicolo/<slug>` (render lato server con title, description, canonical, Open Graph,
  schema `Car`/`Motorcycle` + `Offer` + `BreadcrumbList`).
- Lo `slug` del veicolo è generato automaticamente (`marca-modello-versione-anno`) alla creazione e resta
  STABILE (per non rompere la SEO). I veicoli storici senza slug lo ricevono al primo caricamento di
  `/veicoli` (backfill automatico in `routes/veicoli.js`).
- Il catch-all finale restituisce un VERO 404 (niente più soft-404).
- URL non più validi (rubriche/percorsi inesistenti) ⇒ 404 corretto.

## Cosa resta da fare (quando vuoi)
1. Search Console: riscarica `sitemap.xml` + richiedi indicizzazione di articoli e schede veicolo.
2. ~~AEO: schema `Vehicle`/`Product` + `Offer` sui veicoli; rendere visibili le FAQ nella pagina.~~ ✅ FATTO
3. ~~Contenuti: scheda/pagina dedicata per ogni veicolo.~~ ✅ FATTO (`/veicolo/:slug`)
4. ~~Bonifica minori: `openingHours` come array nel JSON-LD.~~ ✅ FATTO
5. Da valutare: `aggregateRating` in home (5.0 / 150 recensioni) — verificare che aderisca alle linee guida
   Google sulle recensioni prima di mantenerlo.
