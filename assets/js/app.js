/* Vitrine de Atacado — render client-side sobre data/products.json (estático).
 * Sem framework, sem backend, sem coleta de dados. Todo CTA vira deep link do
 * Telegram (BANCO → WEB — este site nunca escreve em lugar nenhum).
 *
 * Páginas: body[data-page="home"] (index.html) e body[data-page="produto"].
 */
(function () {
  "use strict";

  var FRESH_DAYS = 7; // aviso de frescura a partir de 7 dias (decisão 31/08)
  var DEFAULT_BOT = "vitrine_vendasbot";
  var AVAILABILITY_LABELS = {
    pronta_entrega: "Pronta entrega",
    em_producao: "Em produção",
    sob_pedido: "Sob pedido",
  };
  var prefix = document.body.getAttribute("data-page") === "produto" ? "../" : "";

  function track(eventName, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, params || {});
  }

  function $(id) { return document.getElementById(id); }

  function esc(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtPrice(p) {
    var out = "R$ " + String(p.price).replace(".", ",");
    if (p.sale_type === "peca_unica") return out + ' <small>(peça única)</small>';
    if (p.minimum_order > 1) out += ' <small>(pedido mín. ' + p.minimum_order + " un)</small>";
    return out;
  }

  function availabilityBadge(p) {
    return AVAILABILITY_LABELS[p.availability]
      ? "<span class=\"badge\">" + esc(AVAILABILITY_LABELS[p.availability]) + "</span> "
      : "";
  }

  function freshnessBadge(p) {
    if (p.days_since_confirmation == null) return "";
    return p.days_since_confirmation >= FRESH_DAYS
      ? '<span class="badge badge-warn">Confirmar disponibilidade</span>'
      : "";
  }

  function saleBadge(p) {
    return p.sale_type === "peca_unica"
      ? '<span class="badge badge-sale">🏷️ PEÇA ÚNICA</span>'
      : "";
  }

  function freshText(p) {
    var d = p.days_since_confirmation;
    if (d == null) return "📅 Disponibilidade a confirmar";
    if (d >= FRESH_DAYS) {
      return "⚠️ Disponibilidade não confirmada há " + d +
        " dias — confirme com o fornecedor";
    }
    if (d === 0) return "✅ Disponibilidade confirmada hoje pelo fornecedor";
    return "✅ Disponibilidade confirmada há " + d + " dia" + (d > 1 ? "s" : "") +
      " pelo fornecedor";
  }

  function deepLink(kind, product) {
    var bot = window.__VDV_BOT__ || DEFAULT_BOT;
    var map = { procura: "procura", vender: "vender", home: "" };
    var param = product ? "produto_" + product.id : map[kind] || "";
    return "https://t.me/" + bot + (param ? "?start=" + param : "");
  }

  /* URL pública de compartilhamento do produto (página estática com OG
   * resolvido no export — VDV-20260901-04). É a URL que vai na mensagem
   * compartilhada, para o card de preview sair com foto/título do produto. */
  function shareUrl(product) {
    return new URL(prefix + "produto/" + product.id + "/", window.location.href).href;
  }

  function whatsappShareUrl(product) {
    var msg = product.title + " — " + fmtPriceText(product) + "\n" + shareUrl(product);
    return "https://wa.me/?text=" + encodeURIComponent(msg);
  }

  function fmtPriceText(p) {
    var out = "R$ " + String(p.price).replace(".", ",");
    if (p.sale_type === "peca_unica") return out + " (peça única)";
    if (p.minimum_order > 1) out += " (pedido mín. " + p.minimum_order + " un)";
    return out;
  }

  function renderStaticLinks(bot) {
    window.__VDV_BOT__ = bot;
    Array.prototype.forEach.call(document.querySelectorAll("[data-deep-link]"), function (el) {
      el.setAttribute("href", deepLink(el.getAttribute("data-deep-link")));
      el.addEventListener("click", function () {
        track("clique_telegram", {
          origem: el.getAttribute("data-ga-origin") || el.getAttribute("data-deep-link") || "nao_identificada",
          event_category: "telegram",
          event_label: el.getAttribute("data-ga-origin") || el.getAttribute("data-deep-link") || "nao_identificada",
          transport_type: "beacon"
        });
      });
    });
  }

  function cardEl(p) {
    var a = document.createElement("a");
    a.className = "card";
    a.href = "produto/index.html?id=" + encodeURIComponent(p.id);
    a.addEventListener("click", function () {
      track("abrir_produto", {
        produto_id: p.id,
        categoria: p.category.slug,
        seller_name: p.seller_name
      });
    });
    a.innerHTML =
      '<img loading="lazy" src="' + esc(prefix + p.image) + '" alt="' + esc(p.title) + '">' +
      '<div class="card-body">' +
      '<p class="card-title">' + esc(p.title) + "</p>" +
      '<p class="card-meta">' + esc(p.category.name) + " · " + esc(p.city) + "/" + esc(p.state) + "</p>" +
      '<p class="card-price">' + fmtPrice(p) + "</p>" +
      "<div>" + saleBadge(p) + freshnessBadge(p) + "</div>" +
      "</div>";
    return a;
  }

  function fill(grid, list) {
    grid.innerHTML = "";
    list.forEach(function (p) { grid.appendChild(cardEl(p)); });
  }

  // ------------------------------------------------------------------ home
  function initHome(catalog) {
    var products = catalog.products || [];
    var status = $("status");
    var sectionRecent = $("section-novidades");
    var sectionPronta = $("section-pronta");
    var sectionEmpty = $("section-empty");
    var results = $("results");

    status.textContent = "";
    fill($("grid-recent"), products.slice(0, 8));
    var pronta = products.filter(function (p) { return p.availability === "pronta_entrega"; });
    fill(sectionPronta.querySelector("[data-slot]"), pronta.slice(0, 4));

    var activeCat = "";
    var input = $("search");
    var clearBtn = $("clear-search");
    var catBox = $("categories");
    var seen = {};
    products.forEach(function (p) {
      if (!seen[p.category.slug]) {
        seen[p.category.slug] = true;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.setAttribute("aria-pressed", "false");
        chip.setAttribute("data-slug", p.category.slug);
        chip.textContent = p.category.name;
        chip.addEventListener("click", function () {
          activeCat = activeCat === p.category.slug ? "" : p.category.slug;
          Array.prototype.forEach.call(catBox.children, function (c) {
            c.setAttribute("aria-pressed", String(c.getAttribute("data-slug") === activeCat));
          });
          renderSearch();
        });
        catBox.appendChild(chip);
      }
    });

    function renderSearch() {
      var q = input.value.replace(/\s+/g, " ").trim().toLowerCase();
      var cat = activeCat;
      var searching = q !== "" || cat !== "";
      results.hidden = !searching;
      clearBtn.hidden = !searching;
      sectionPronta.hidden = searching || pronta.length === 0;
      sectionRecent.hidden = searching || products.length === 0;
      sectionEmpty.hidden = products.length > 0;
      if (!searching) return;
      var found = products.filter(function (p) {
        if (cat && p.category.slug !== cat) return false;
        if (!q) return true;
        var hay = (p.title + " " + p.description + " " + p.category.name + " " +
          p.city + " " + p.seller_name).toLowerCase();
        return q.split(" ").every(function (term) { return hay.indexOf(term) !== -1; });
      });
      $("results-title").textContent = found.length
        ? found.length + " oferta" + (found.length > 1 ? "s" : "") + " encontrada" + (found.length > 1 ? "s" : "")
        : "Nada encontrado — tente outro termo";
      fill($("results-grid"), found);
    }

    input.addEventListener("input", renderSearch);
    clearBtn.addEventListener("click", function () {
      input.value = "";
      activeCat = "";
      Array.prototype.forEach.call(catBox.children, function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      results.hidden = true;
      clearBtn.hidden = true;
      sectionPronta.hidden = pronta.length === 0;
      sectionRecent.hidden = products.length === 0;
    });

    if (products.length === 0) {
      sectionPronta.hidden = true;
      sectionRecent.hidden = true;
      sectionEmpty.hidden = false;
    }
  }

  // --------------------------------------------------------------- produto
  function initProduto(catalog) {
    var main = $("produto-main");
    var status = $("status");
    var productId = new URLSearchParams(window.location.search).get("id") || "";
    var product = null;
    for (var i = 0; i < (catalog.products || []).length; i++) {
      if (catalog.products[i].id === productId) { product = catalog.products[i]; break; }
    }

    if (!product) {
      status.textContent = "Produto não encontrado — pode ter sido pausado ou vendido.";
      var back = document.createElement("a");
      back.className = "btn btn-primary btn-cta";
      back.href = prefix + "index.html";
      back.textContent = "Ver ofertas";
      main.appendChild(back);
      document.title = "Produto não encontrado — VDV, Vitrine de Vendas";
      return;
    }

    status.hidden = true;
    document.title = product.title + " — VDV, Vitrine de Vendas";
    var isPecaUnica = product.sale_type === "peca_unica";
    setOg("og:title", product.title + " — " +
      (isPecaUnica ? "peça única" : "atacado") + " em " + product.city + "/" + product.state);
    setOg("og:description", product.description.slice(0, 160));
    var ogImg = document.querySelector('meta[property="og:image"]');
    if (!ogImg) {
      ogImg = document.createElement("meta");
      ogImg.setAttribute("property", "og:image");
      document.head.appendChild(ogImg);
    }
    ogImg.setAttribute("content", new URL(product.image, window.location.href).href);

    var qty = product.quantity ? " · " + product.quantity + " un em estoque" : "";
    var moLi = isPecaUnica
      ? "<li>🏷️ Peça única — valor da unidade</li>"
      : "<li>🧾 Pedido mínimo: " + product.minimum_order + " unidades</li>";
    main.innerHTML =
      '<img class="prod-photo" loading="lazy" width="640" height="640" src="' +
      esc(prefix + product.image) + '" alt="' + esc(product.title) + '">' +
      '<h1 class="prod-title">' + esc(product.title) + "</h1>" +
      '<p class="prod-price">' + fmtPrice(product) + "</p>" +
      '<ul class="prod-facts">' +
      "<li>🏪 Vendido por <strong>" + esc(product.seller_name) + "</strong> · " +
      esc(product.city) + "/" + esc(product.state) + "</li>" +
      "<li>📦 " + esc(AVAILABILITY_LABELS[product.availability] || "Disponível") + qty + "</li>" +
      moLi +
      "<li>🗓️ " + esc(freshText(product)) + "</li>" +
      "</ul>" +
      '<p class="prod-desc">' + esc(product.description) + "</p>" +
      '<a class="btn btn-primary btn-cta" href="' +
      esc(deepLink("interesse", product)) + '" data-ga-origin="produto_tenho_interesse">Tenho interesse — falar no Telegram</a>' +
      '<p class="share-row"><a class="btn btn-ghost" target="_blank" rel="noopener" href="' +
      esc(whatsappShareUrl(product)) + '" id="share-wa">Compartilhar no WhatsApp</a></p>' +
      '<p class="prod-seller">A negociação acontece direto no bot, sem cadastro neste site.</p>' +
      '<p class="prod-more">Gostou? <a href="' + prefix + 'index.html">Veja mais produtos na nossa vitrine</a></p>';

    var cta = main.querySelector('[data-ga-origin="produto_tenho_interesse"]');
    if (cta) {
      cta.addEventListener("click", function () {
        track("clique_telegram", {
          origem: "produto_tenho_interesse",
          event_category: "telegram",
          event_label: product.id,
          transport_type: "beacon"
        });
      });
    }

    var share = main.querySelector("#share-wa");
    if (share) {
      share.addEventListener("click", function () {
        track("compartilhar_produto", {
          produto_id: product.id,
          event_category: "compartilhamento",
          event_label: product.id,
          transport_type: "beacon"
        });
      });
    }
  }

  function setOg(prop, value) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (el) el.setAttribute("content", value);
  }

  // ------------------------------------------------------------------ boot
  document.addEventListener("DOMContentLoaded", function () {
    fetch(prefix + "data/products.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (catalog) {
        renderStaticLinks(catalog.bot_username || DEFAULT_BOT);
        if (document.body.getAttribute("data-page") === "produto") initProduto(catalog);
        else initHome(catalog);
      })
      .catch(function () {
        var s = $("status");
        if (s) s.textContent =
          "Não foi possível carregar o catálogo agora. Recarregue a página em alguns instantes.";
        ["section-novidades", "section-pronta"].forEach(function (id) {
          var el = $(id);
          if (el) el.hidden = true;
        });
      });
  });
})();
