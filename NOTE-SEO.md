# NOTE SEO / AEO — DP CARS

Ultimo aggiornamento: 14 ottobre 2026

## Repository
- Repo: `https://github.com/bolognacarmine-cell/dpcars-production.git`
- Branch: `main`
- Ultimo commit pubblicato: `93af159` (sito già aggiornato)
- Deploy: Render fa auto-deploy ad ogni push su `main`
- Sito: https://www.dpcars.it
- Search Console: proprietà `https://www.dpcars.it/`

## Cronologia interventi
| Commit | Cosa |
|---|---|
| `260e505` | Sitemap: rimossa URL blog rotte, aggiunta guida, lastmod reali |
| `d0a98c1` | Blog SSR `/blog/:slug`, canonical mancanti, 404 reali, card crawlabili |
| `93af159` | Sitemap dinamica dal DB, rimossa sitemap statica e fragment `#` |

## File toccati
- `server.js` → route sitemap dinamica + 404 finale
- `public/sitemap.xml` → RIMOSSO (ora generato dal server)
- `routes/blogPage.js` → NUOVO (pagine articolo SEO, render lato server)
- `public/index.html` → card blog come link crawlabili
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
```

## Note tecniche utili
- La sitemap (`/sitemap.xml`) è generata da `server.js` e legge gli articoli blog dal DB MongoDB.
  Aggiungendo un articolo dall'admin, appare automaticamente in sitemap.
- Pagine articolo: `/blog/<slug>` (render lato server con title, description, canonical, Open Graph,
  schema `BlogPosting` + `BreadcrumbList`).
- Il catch-all finale restituisce un VERO 404 (niente più soft-404).
- URL non più validi (rubriche/percorsi inesistenti) ⇒ 404 corretto.

## Cosa resta da fare (quando vuoi)
1. Search Console: riscarica `sitemap.xml` + richiedi indicizzazione dei 3 articoli.
2. AEO: schema `Vehicle`/`Product` + `Offer` sui veicoli; rendere visibili le FAQ nella pagina.
3. Contenuti: scheda/pagina dedicata per ogni veicolo.
4. Bonifica minori: `openingHours` come array nel JSON-LD; valutare `aggregateRating`.
