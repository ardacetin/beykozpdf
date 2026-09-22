const moduleVersion = new URL(import.meta.url).searchParams.get("v");
const moduleSuffix = moduleVersion
  ? `?v=${encodeURIComponent(moduleVersion)}`
  : "";
const [{ categories, tools }, { icon }] = await Promise.all([
  import(`./tools.js${moduleSuffix}`),
  import(`./icons.js${moduleSuffix}`),
]);
const base = document.documentElement.dataset.base;
const $ = (s) => document.querySelector(s);
let favorites;
try {
  const stored = JSON.parse(
    localStorage.getItem("beykoz-pdf-favorites") || "[]",
  );
  favorites = new Set(
    Array.isArray(stored)
      ? stored.filter((id) => tools.some((t) => t.id === id))
      : [],
  );
} catch {
  favorites = new Set();
}
let category = "all";
let query = "";
let previousFocus;
const fold = (value) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i");
for (const node of document.querySelectorAll("[data-icon]"))
  node.innerHTML = icon(node.dataset.icon);
const nav = $("#category-nav");
nav.innerHTML = categories
  .map(
    (c) =>
      `<button class="category-button" data-category="${c.id}" aria-pressed="${c.id === "all"}">${icon(c.icon)}<span>${c.label}</span>${c.id === "all" ? `<small>${tools.length}</small>` : ""}</button>`,
  )
  .join("");
$("#filter-pills").innerHTML = categories
  .filter((c) => c.id !== "favorites")
  .map(
    (c) =>
      `<button class="filter-pill" data-category="${c.id}" aria-pressed="${c.id === "all"}">${c.label}</button>`,
  )
  .join("");
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").hidden = true), 2400);
}
function render() {
  const selected = categories.find((c) => c.id === category);
  $("#tools-title").replaceChildren(
    document.createTextNode(selected.label + " "),
    Object.assign(document.createElement("span"), { id: "tool-count" }),
  );
  $("#breadcrumb-title").textContent = selected.label;
  for (const button of document.querySelectorAll("[data-category]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.category === category),
    );
  const results = tools.filter(
    (t) =>
      (category === "all" ||
        (category === "favorites"
          ? favorites.has(t.id)
          : t.category === category)) &&
      fold(t.name + " " + t.description).includes(fold(query)),
  );
  $("#tool-count").textContent = results.length;
  $("#tool-grid").innerHTML = results
    .map(
      (t) =>
        `<article class="tool-card"><a href="?tool=${t.id}" class="tool-link"><div class="card-top"><span class="tool-icon ${t.color}">${icon(t.icon)}</span>${t.popular ? '<span class="popular-tag">POPÜLER</span>' : ""}</div><h3>${t.name}</h3><p>${t.description}</p><span class="card-arrow" aria-hidden="true">↗</span></a><button class="favorite-button ${favorites.has(t.id) ? "is-favorite" : ""}" data-favorite="${t.id}" aria-label="${t.name}: ${favorites.has(t.id) ? "favorilerden çıkar" : "favorilere ekle"}" aria-pressed="${favorites.has(t.id)}">${icon("star")}</button></article>`,
    )
    .join("");
  $("#empty-state").hidden = results.length > 0;
  $("#empty-title").textContent =
    category === "favorites" && !query
      ? "Favori araçlarınız burada."
      : "Aradığınız aracı bulamadık.";
  $("#empty-description").textContent =
    category === "favorites" && !query
      ? "Sık kullandığınız araçların yıldızına dokunarak favorilerinize ekleyin."
      : "Başka bir kelime deneyin veya tüm araçlara göz atın.";
  $("#category-description").textContent =
    category === "favorites"
      ? "En çok kullandıklarınız, bir adım daha yakın."
      : "İyi bir iş, doğru araçla başlar.";
  $("#result-announcement").textContent =
    `${results.length} araç gösteriliyor.`;
}
document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    category = categoryButton.dataset.category;
    if (!$("#tool-view").hidden) {
      history.pushState({}, "", `${base}/app.php`);
      showRoute();
    }
    render();
    document.body.classList.remove("menu-open");
    $("#menu-toggle").setAttribute("aria-expanded", "false");
  }
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    try {
      localStorage.setItem(
        "beykoz-pdf-favorites",
        JSON.stringify([...favorites]),
      );
    } catch {
      toast("Tercihleriniz bu tarayıcıda kaydedilemedi.");
    }
    render();
    document.querySelector(`[data-favorite="${id}"]`)?.focus();
  }
  const link = event.target.closest('a[href^="?tool="]');
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
    event.preventDefault();
    previousFocus = link;
    history.pushState({}, "", link.href);
    showRoute();
  }
});
$("#search").addEventListener("input", (e) => {
  query = e.target.value;
  render();
});
$("#clear-search").onclick = () => {
  category = "all";
  query = "";
  $("#search").value = "";
  render();
  $("#search").focus();
};
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !/INPUT|TEXTAREA/.test(document.activeElement.tagName) &&
    $("#tool-view").hidden &&
    !$("#info-dialog").open
  ) {
    e.preventDefault();
    $("#search").focus();
  }
  if (e.key === "Escape") {
    $("#user-menu").hidden = true;
    $("#user-menu-button").setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    $("#menu-toggle").setAttribute("aria-expanded", "false");
  }
});
function showRoute() {
  const id = new URLSearchParams(location.search).get("tool");
  const tool = tools.find((t) => t.id === id);
  const frame = $("#engine-frame");
  $("#dashboard").hidden = Boolean(tool);
  $("#tool-view").hidden = !tool;
  if (tool) {
    $("#breadcrumb-title").textContent = tool.name;
    document.title = `${tool.name} · PDF Düzenle`;
    $("#engine-loading").hidden = false;
    frame.title = tool.name;
    frame.src = `${base}/engine/${tool.id}.php`;
    frame.onload = () => {
      $("#engine-loading").hidden = true;
      try {
        const doc = frame.contentDocument;
        if (doc.querySelector(".login-page")) {
          location.assign(`${base}/`);
          return;
        }
        // Keep a bounded viewport: upstream tools use 100vh and fixed modals.
        // Resizing to their body height would create an endless growth loop.
        frame.style.height = "max(720px, calc(100dvh - 190px))";
      } catch {
        $("#engine-loading").hidden = false;
        $("#engine-loading").textContent =
          "Araç açılamadı. Lütfen sayfayı yenileyin.";
      }
    };
    $("#back-to-tools").focus();
  } else {
    frame.removeAttribute("src");
    frame.onload = null;
    document.title = "Çalışma alanı · PDF Düzenle";
    render();
    if (id) toast("Bu araç bulunamadı. Tüm araçları inceleyebilirsiniz.");
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}
$("#back-to-tools").onclick = () => {
  history.pushState({}, "", `${base}/app.php`);
  showRoute();
  previousFocus?.focus();
};
window.addEventListener("popstate", showRoute);
$("#menu-toggle").onclick = () => {
  document.body.classList.toggle("menu-open");
  $("#menu-toggle").setAttribute(
    "aria-expanded",
    String(document.body.classList.contains("menu-open")),
  );
};
$("#user-menu-button").onclick = () => {
  $("#user-menu").hidden = !$("#user-menu").hidden;
  $("#user-menu-button").setAttribute(
    "aria-expanded",
    String(!$("#user-menu").hidden),
  );
};
document.addEventListener("click", (e) => {
  if (!e.target.closest(".header-right")) {
    $("#user-menu").hidden = true;
    $("#user-menu-button").setAttribute("aria-expanded", "false");
  }
});
const dialog = $("#info-dialog");
function showInfo(content) {
  $("#dialog-content").innerHTML = content;
  dialog.showModal();
}
$("#help").onclick = () =>
  showInfo(
    '<span class="eyebrow">YARDIM VE DESTEK</span><h2>İşler kolaylaşsın.</h2><p><strong>1.</strong> İhtiyacınız olan aracı seçin.<br><strong>2.</strong> Belgenizi sürükleyin veya dosya seçiciden ekleyin.<br><strong>3.</strong> Ayarlarınızı yapın, işlemi başlatın ve sonucu indirin.</p><p>Büyük dosyalar için güncel bir masaüstü tarayıcısı kullanın. İşlem tamamlanmadan sekmeyi kapatmayın. Bazı gelişmiş araçlar ilk kullanımda ek bileşen indirebilir.</p><p>Kurumsal giriş ve teknik destek için Beykoz Üniversitesi Bilgi İşlem birimine başvurabilirsiniz.</p>',
  );
$("#about").onclick = () =>
  showInfo(
    '<span class="eyebrow">BEYKOZ ÜNİVERSİTESİ</span><h2>PDF Düzenle</h2><p>Üniversite hesabınızla erişebildiğiniz, belgelerinizi cihazınızda işleyen PDF çalışma alanınız.</p><p>UlakPDF ve BentoPDF temel alınarak hazırlanmıştır. BentoPDF motoru AGPL-3.0 lisanslıdır. Uygulama kaynak kodu, yerel değişiklikler ve lisanslar GitHub deposunda bulunur.</p><p><a class="primary" href="https://github.com/ardacetin/beykozpdf" target="_blank" rel="noopener noreferrer">Kaynak kodu GitHub’da görüntüle ↗</a></p><p>Oturum çerezi en fazla 8 saat saklanır. Favori araçlar yalnızca bu tarayıcıda tutulur. PDF dosyaları sunucuya gönderilmez.</p>',
  );
for (const button of dialog.querySelectorAll(".dialog-close,.dialog-ok"))
  button.onclick = () => dialog.close();
$("#today").textContent = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());
$("#year").textContent = new Date().getFullYear();
async function checkSession() {
  try {
    const response = await fetch(`${base}/me.php`, { cache: "no-store" });
    if (response.status === 401) return location.assign(`${base}/`);
    if (!response.ok) throw new Error();
    const user = await response.json();
    $("#user-email").textContent = user.email;
    $("#csrf").value = user.csrf;
    $("#user-menu-button").textContent = user.name
      .slice(0, 2)
      .toLocaleUpperCase("tr");
  } catch {
    toast("Oturum bilgisi alınamadı. Bağlantınızı kontrol edin.");
  }
}
await checkSession();
render();
showRoute();
setInterval(checkSession, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkSession();
});
