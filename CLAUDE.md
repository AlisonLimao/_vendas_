# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A static, multi-page marketing website for **Quitanda Toninho & Ana**, a small produce/greengrocer shop. Each page is a self-contained `index.html` (markup, CSS in a `<style>` block, inline JavaScript) with no build step, no framework, no backend, and no dependencies to install. The repo also doubles as a study project.

Deployed via GitHub Pages at `https://alisonlimao.github.io/_vendas_/`. All asset/banner URLs in the HTML are absolute and point at this Pages URL, so they only resolve correctly when deployed there.

### Why multiple pages (the core idea)

The site is shared as links on WhatsApp. WhatsApp reads Open Graph tags from the **server-returned HTML only** — it does not run JavaScript, so `og:image` cannot be swapped client-side, and anchor fragments (`#bananas`) do not produce a different preview. Therefore each shareable destination is a **separate directory with its own `index.html`** carrying its own `og:*` / Twitter-card meta tags. Pages:

- `/` → [index.html](index.html) — banner geral (`banner-quitanda-og.jpg`, na raiz)
- `/bananas/` → [bananas/index.html](bananas/index.html) — banner `bananas/banner-bananas.jpg`
- `/promocoes/` → [promocoes/index.html](promocoes/index.html) — banner `promocoes/banner-promocoes.jpg`
- `/novidades/` → [novidades/index.html](novidades/index.html) — banner `novidades/banner-novidades.jpg`

Each subpage's banner JPG (1200×630, JPG) lives **next to that page's `index.html`**, inside its own folder. The page's `og:image`, `twitter:image`, and `.banner` `<img src>` all point to the same absolute Pages URL (e.g. `https://alisonlimao.github.io/_vendas_/bananas/banner-bananas.jpg`). To change a page's preview image, replace the `banner-*.jpg` in that folder with a new file of the same name — no HTML edit needed (then clear the WhatsApp/Facebook cache).

## Working in this codebase

There is no build, lint, or test tooling. To preview changes, open the relevant `index.html` directly in a browser, or push to `main` and view on GitHub Pages. Each page is edited independently; there is no shared template file — the styling/JS is duplicated per page, so a change to the look-and-feel must be applied to all four files.

## Architecture notes

Each page follows the same structure (head → consent/GA scripts → OG/Twitter meta → `<style>` → banner img → back link → hero → seções → footer):

- **Head script order (important, do not reorder)** — this sequence must be preserved on every page:
  1. Create `dataLayer` + `gtag` and set Consent Mode V2 defaults to `denied` with `wait_for_update: 500`.
  2. Load Google Analytics (`gtag/js?id=G-P22B9BLHBR`).
  3. Run `gtag('config', 'G-P22B9BLHBR')` and define `registrarCliqueWhatsApp(nome)`.
  4. Load TermsFeed cookie-consent script, then `cookieconsent.run({...})` on `DOMContentLoaded`.
  5. Consent callbacks update consent: `tracking` → `analytics_storage: granted`; `targeting` → `ad_storage`/`ad_user_data`/`ad_personalization: granted`. The site still works if cookies are refused; GA just stays consent-limited.
- **Open Graph / Twitter cards** — each page has its own `og:title`, `og:description`, `og:image`, `og:url` (absolute Pages URL ending with `/`), `og:type`, plus `twitter:card`/`twitter:title`/`twitter:description`/`twitter:image`. These are static in the HTML — that's what makes the WhatsApp preview work.
- **Styling** — inline `<style>` block per page. Palette: greens (`#2f5d34`, `#2f7d32`), warm/cream backgrounds (`#f8f3e8`, `#fffaf0`), orange/earth accent (`#b35c1e`). Layout uses CSS Grid (`auto-fit` cards) and a mobile breakpoint at `max-width: 600px`. Reusable class names: `.hero`, `.secao`, `.cards`, `.card`, `.faixa`, `.info`, `.botoes`, `.botao`, `.selo`, `.subtitulo`, `.voltar`, `.banner`.
- **Two contacts** — Toninho (`553591435086`) and Ana (`553592688524`), each with a `wa.me` deep link. Both buttons appear in the hero and again in the "Onde estamos" section. Subpages use pre-filled WhatsApp messages themed to the page (e.g. "quero saber as bananas disponíveis hoje").
- **WhatsApp click tracking** — every WhatsApp button calls `registrarCliqueWhatsApp('Toninho'|'Ana')` via `onclick`, firing a `clique_whatsapp` GA event (`event_category: whatsapp`, `event_label`: contact name, `transport_type: beacon`) before navigation.
- **Navigation** — subpages link back to the root via `../` (the `.voltar` link in the top bar and footer). The root page has a `.nav-paginas` bar linking to `bananas/`, `promocoes/`, `novidades/`.

When adding a new shareable page: create `<slug>/index.html` by copying an existing subpage, then update the OG/Twitter meta (title, description, image, url), the `<title>`, the banner `src`, the `selo`/`h1`/hero copy, the WhatsApp pre-filled message, and add a new `banner-<slug>.jpg` (1200×630 JPG) inside the `<slug>/` folder next to the new `index.html`. The `og:image`/`twitter:image`/`<img src>` must all point to that file's absolute Pages URL (`https://alisonlimao.github.io/_vendas_/<slug>/banner-<slug>.jpg`). Add a link to it in the root page's `.nav-paginas`.

## Identity (keep consistent across pages)

- **Nome:** Quitanda Toninho & Ana
- **Endereço:** Avenida Gutemala, 149 — Jardim América
- **Horário:** Aberto das 8h às 18h
- **WhatsApp:** Toninho `553591435086`, Ana `553592688524`
- **Frases-base:** "Da roça para a quitanda. Da quitanda para a sua mesa." / "Produtos frescos para o seu dia a dia." / "Frescor, proximidade e confiança." / "Chame no WhatsApp e saiba o que chegou hoje."