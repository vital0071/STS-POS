const plans = {
  free: {
    name: "Starter",
    price: "500 GDES",
    monthly: 500,
    users: 1,
    ai: false,
    features: ["1 utilisateur", "7 jours essai gratuit", "Caisse simple", "Rapports de base"],
  },
  premium: {
    name: "Premium",
    price: "900 GDES",
    monthly: 900,
    users: 3,
    ai: true,
    features: ["3 utilisateurs", "7 jours essai gratuit", "Nom produit par IA", "Exports Excel/PDF"],
  },
  gold: {
    name: "Gold",
    price: "1300 GDES",
    monthly: 1300,
    users: 10,
    ai: true,
    features: ["10 utilisateurs", "7 jours essai gratuit", "IA produit illimitée", "Rôles et accès avancés"],
  },
};

const defaultRoles = [
  { id: crypto.randomUUID(), name: "Admin", permissions: ["Caisse", "Produits", "Rapports", "Utilisateurs", "Paramètres"] },
  { id: crypto.randomUUID(), name: "Manager", permissions: ["Caisse", "Produits", "Rapports"] },
  { id: crypto.randomUUID(), name: "Caissier", permissions: ["Caisse"] },
];

const seedProducts = [
  { id: crypto.randomUUID(), name: "Cola Tropical 12 oz", category: "Boisson", price: 125, stock: 32, sku: "COL-12", image: "", color: "#d9f0ff" },
  { id: crypto.randomUUID(), name: "Riz Local 5 lb", category: "Épicerie", price: 480, stock: 18, sku: "RIZ-5", image: "", color: "#fff1d6" },
  { id: crypto.randomUUID(), name: "Savon Citron", category: "Hygiène", price: 90, stock: 8, sku: "SAV-CIT", image: "", color: "#dff7ea" },
  { id: crypto.randomUUID(), name: "Café Lakay", category: "Épicerie", price: 350, stock: 14, sku: "CAF-LKY", image: "", color: "#ffe1dd" },
];

const seedClients = [
  {
    id: crypto.randomUUID(),
    store: "STS Demo Market",
    owner: "Admin",
    email: "admin@sts-pos.ht",
    plan: "gold",
    status: "active",
    access: true,
    requestedPlan: "",
    paymentProof: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    store: "Boutique Lakay",
    owner: "Maya Louis",
    email: "maya@boutiquelakay.ht",
    plan: "premium",
    status: "trial",
    access: true,
    requestedPlan: "gold",
    paymentProof: { transaction: "MC-2026-001", phone: "+509 48 48 74 23", paidTo: "Vital-Herne Zéphy", createdAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
  },
];

const appName = "STS-POS";

const defaultState = {
  storeName: "STS Demo Market",
  plan: "gold",
  language: "fr",
  trialStartedAt: new Date().toISOString(),
  accounts: [
    { id: crypto.randomUUID(), name: "Admin", email: "admin@sts-pos.ht", password: "admin123", phone: "", photo: "", type: "merchant" },
    { id: crypto.randomUUID(), name: "STS Admin", email: "commercial@sts-pos.ht", password: "admin123", phone: "", photo: "", type: "superAdmin" },
  ],
  sessionAccountId: "",
  catalogView: "grid",
  inventoryView: "table",
  planRequest: "",
  clients: seedClients,
  roles: defaultRoles,
  users: [
    { id: crypto.randomUUID(), name: "Admin", role: "Admin" },
    { id: crypto.randomUUID(), name: "Maya", role: "Manager" },
    { id: crypto.randomUUID(), name: "Jean", role: "Caissier" },
    { id: crypto.randomUUID(), name: "Nadia", role: "Caissier" },
    { id: crypto.randomUUID(), name: "Samuel", role: "Caissier" },
  ],
  activeUserId: "",
  products: seedProducts,
  sales: [],
};
defaultState.sessionAccountId = defaultState.accounts[0].id;
defaultState.activeUserId = defaultState.users[0].id;

let state = loadState();
let cart = [];
let cameraStream = null;
let capturedImage = "";
let latestSaleId = "";
let currentView = "checkout";
let currentAdminView = "adminDashboard";

const translations = {
  fr: {
    checkout: "Caisse",
    products: "Produits",
    users: "Équipe",
    plans: "Plans",
    reports: "Rapports",
    settings: "Paramètres",
    clients: "Admin clients",
    pos: "Point de vente",
    reset: "Réinitialiser",
    logout: "Déconnexion",
    login: "Connexion",
    signup: "Inscription",
    profileSaved: "Profil sauvegardé.",
  },
  ht: {
    checkout: "Kes",
    products: "Pwodwi",
    users: "Ekip",
    plans: "Plan yo",
    reports: "Rapò",
    settings: "Paramèt",
    clients: "Admin kliyan",
    pos: "Pwen lavant",
    reset: "Rekòmanse",
    logout: "Dekoneksyon",
    login: "Koneksyon",
    signup: "Enskripsyon",
    profileSaved: "Profil la sove.",
  },
  en: {
    checkout: "Checkout",
    products: "Products",
    users: "Team",
    plans: "Plans",
    reports: "Reports",
    settings: "Settings",
    clients: "Client admin",
    pos: "Point of sale",
    reset: "Reset",
    logout: "Log out",
    login: "Log in",
    signup: "Sign up",
    profileSaved: "Profile saved.",
  },
};

const money = new Intl.NumberFormat("fr-HT", {
  style: "currency",
  currency: "HTG",
  currencyDisplay: "code",
});

const $ = (selector) => document.querySelector(selector);

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadState() {
  const saved = localStorage.getItem("stsPosState") || localStorage.getItem("iziSalesState") || localStorage.getItem("posNovaState");
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const accounts = parsed.accounts?.length ? parsed.accounts : structuredClone(defaultState.accounts);
    accounts.forEach((account) => {
      if (account.email === "admin@izisales.ht") account.email = "admin@sts-pos.ht";
      if (!account.type) account.type = account.email === "commercial@sts-pos.ht" ? "superAdmin" : "merchant";
    });
    if (!accounts.some((account) => account.type === "superAdmin")) {
      accounts.push(structuredClone(defaultState.accounts[1]));
    }
    const sales = parsed.sales || structuredClone(defaultState.sales);
    sales.forEach((sale) => {
      if (sale.receiptNo?.startsWith("IZI-")) sale.receiptNo = sale.receiptNo.replace("IZI-", "STS-");
    });
    return {
      ...structuredClone(defaultState),
      ...parsed,
      accounts,
      sales,
      roles: parsed.roles?.length ? parsed.roles : structuredClone(defaultRoles),
      clients: parsed.clients?.length ? parsed.clients : structuredClone(seedClients),
      catalogView: parsed.catalogView || "grid",
      inventoryView: parsed.inventoryView || "table",
      planRequest: parsed.planRequest || "",
      language: parsed.language || "fr",
      trialStartedAt: parsed.trialStartedAt || new Date().toISOString(),
      storeName: parsed.storeName || "STS Demo Market",
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem("stsPosState", JSON.stringify(state));
}

function currentAccount() {
  return state.accounts.find((account) => account.id === state.sessionAccountId);
}

function showApp(isLoggedIn) {
  const account = currentAccount();
  const isAdmin = isLoggedIn && account?.type === "superAdmin";
  $("#authScreen").classList.toggle("hidden", isLoggedIn);
  $("#appShell").classList.toggle("hidden", !isLoggedIn || isAdmin);
  $("#adminShell").classList.toggle("hidden", !isAdmin);
  if (isAdmin) renderAdmin();
  else if (isLoggedIn) renderLayout();
  else applyLanguage();
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2600);
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function renderProductThumb(product) {
  if (product.image) {
    return `<img class="product-thumb" src="${esc(product.image)}" alt="${esc(product.name)}">`;
  }
  return `<div class="product-thumb" style="background:${esc(product.color || "#d9f0ff")}">${esc(initials(product.name))}</div>`;
}

function renderLayout() {
  const plan = plans[state.plan];
  $("#storeNameText").textContent = state.storeName;
  $("#activePlanChip").innerHTML = `<strong>${esc(plan.name)}</strong><span>${plan.users} utilisateur(s) inclus</span>`;
  $("#activeUserSelect").innerHTML = state.users
    .map((user) => `<option value="${esc(user.id)}" ${user.id === state.activeUserId ? "selected" : ""}>${esc(user.name)} · ${esc(user.role)}</option>`)
    .join("");
  renderRoleOptions();
  renderCheckout();
  renderInventory();
  renderUsers();
  renderPlans();
  renderReports();
  renderSettings();
  applyLanguage();
}

function applyLanguage() {
  const t = translations[state.language] || translations.fr;
  document.documentElement.lang = state.language === "ht" ? "ht" : state.language;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const label = t[button.dataset.view] || button.dataset.view;
    const labelNode = button.querySelector("span:last-child");
    if (labelNode) labelNode.textContent = label;
    button.title = label;
  });
  $("#viewTitle").textContent = t[currentView] || t.checkout;
  $(".eyebrow").textContent = t.pos;
  $("#resetDemoButton").textContent = t.reset;
  $("#logoutButton").textContent = t.logout;
  document.querySelector('[data-auth-tab="login"]').textContent = t.login;
  document.querySelector('[data-auth-tab="signup"]').textContent = t.signup;
}

function renderRoleOptions() {
  const currentValue = $("#userRole")?.value || "Caissier";
  $("#userRole").innerHTML = state.roles
    .map((role) => `<option ${role.name === currentValue ? "selected" : ""}>${esc(role.name)}</option>`)
    .join("");
}

function renderCheckout() {
  const query = $("#productSearch")?.value?.toLowerCase() || "";
  const products = state.products.filter((product) => product.name.toLowerCase().includes(query));
  $("#checkoutProducts").className = `product-grid ${state.catalogView === "list" ? "list-mode" : ""}`;
  document.querySelectorAll("[data-catalog-view]").forEach((button) => button.classList.toggle("active", button.dataset.catalogView === state.catalogView));
  $("#checkoutProducts").innerHTML = products
    .map(
      (product) => `
        <button class="product-card" type="button" data-add="${esc(product.id)}">
          ${renderProductThumb(product)}
          <span class="product-card-body">
            <strong>${esc(product.name)}</strong>
            <span>${esc(product.category)} · ${product.stock} en stock</span>
            <strong>${money.format(product.price)}</strong>
          </span>
        </button>
      `,
    )
    .join("");

  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const stockTotal = state.products.reduce((sum, product) => sum + product.stock, 0);
  const revenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  $("#cartCountText").textContent = itemCount;
  $("#stockTotalText").textContent = stockTotal;
  $("#miniRevenueText").textContent = money.format(revenue);
  $("#cartMeta").textContent = itemCount ? `${itemCount} article(s)` : "Aucun article";
  $("#cartLines").innerHTML = cart.length
    ? cart
        .map(
          (item) => `
          <div class="cart-line">
            <div>
              <strong>${esc(item.name)}</strong>
              <span>${money.format(item.price)} · ${item.qty} unité(s)</span>
            </div>
            <div class="qty-tools">
              <button type="button" data-dec="${esc(item.id)}" title="Réduire">−</button>
              <strong>${item.qty}</strong>
              <button type="button" data-inc="${esc(item.id)}" title="Ajouter">+</button>
            </div>
          </div>
        `,
        )
        .join("")
    : `<p class="ai-status">Sélectionne un produit pour commencer une vente.</p>`;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.1;
  $("#subtotalText").textContent = money.format(subtotal);
  $("#taxText").textContent = money.format(tax);
  $("#totalText").textContent = money.format(subtotal + tax);
}

function renderInventory() {
  $("#inventoryMeta").textContent = `${state.products.length} produit(s) enregistré(s)`;
  document.querySelectorAll("[data-inventory-view]").forEach((button) => button.classList.toggle("active", button.dataset.inventoryView === state.inventoryView));
  $(".table-wrap").classList.toggle("hidden", state.inventoryView !== "table");
  $("#inventoryCards").classList.toggle("hidden", state.inventoryView !== "grid");
  $("#inventoryTable").innerHTML = state.products
    .map(
      (product) => `
      <tr>
        <td><strong>${esc(product.name)}</strong><br><span>${esc(product.sku)}</span></td>
        <td>${esc(product.category)}</td>
        <td>${money.format(product.price)}</td>
        <td>${product.stock}</td>
        <td><button class="icon-button" type="button" data-delete-product="${esc(product.id)}" title="Supprimer">×</button></td>
      </tr>
    `,
    )
    .join("");
  $("#inventoryCards").innerHTML = state.products
    .map(
      (product) => `
        <article class="inventory-card">
          ${renderProductThumb(product)}
          <div>
            <strong>${esc(product.name)}</strong>
            <span>${esc(product.category)} · ${esc(product.sku)}</span>
            <b>${money.format(product.price)}</b>
            <small>${product.stock} en stock</small>
          </div>
          <button class="icon-button" type="button" data-delete-product="${esc(product.id)}" title="Supprimer">×</button>
        </article>
      `,
    )
    .join("");
}

function renderUsers() {
  const limit = plans[state.plan].users;
  $("#userLimitText").textContent = `${state.users.length}/${limit} utilisateur(s) selon le plan ${plans[state.plan].name}`;
  $("#userList").innerHTML = state.users
    .map(
      (user) => `
        <div class="user-row">
          <div><strong>${esc(user.name)}</strong><span>${esc(user.role)}</span></div>
          <select data-user-role="${esc(user.id)}" aria-label="Rôle de ${esc(user.name)}">
            ${state.roles.map((role) => `<option ${role.name === user.role ? "selected" : ""}>${esc(role.name)}</option>`).join("")}
          </select>
          <button class="icon-button" type="button" data-delete-user="${esc(user.id)}" title="Retirer">×</button>
        </div>
      `,
    )
    .join("");
}

function renderPlans() {
  $("#plansGrid").innerHTML = Object.entries(plans)
    .map(
      ([id, plan]) => `
        <article class="plan-card ${state.plan === id ? "active" : ""}">
          <div>
            <h2>${esc(plan.name)}</h2>
            <div class="plan-price">${esc(plan.price)}</div>
          </div>
          <ul>${plan.features.map((feature) => `<li>${esc(feature)}</li>`).join("")}</ul>
          <button class="${state.plan === id ? "secondary-button" : "primary-button"}" data-request-plan="${esc(id)}" type="button">
            ${state.plan === id ? "Plan actif" : state.planRequest === id ? "Demande envoyée" : "Demander ce plan"}
          </button>
        </article>
      `,
    )
    .join("");
}

function renderReports() {
  const revenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  $("#salesCount").textContent = state.sales.length;
  $("#revenueTotal").textContent = money.format(revenue);
  $("#productCount").textContent = state.products.length;
  $("#lowStockCount").textContent = state.products.filter((product) => product.stock <= 5).length;
  renderReportBody($("#reportTypeSelect")?.value || "sales");
}

function renderReportBody(type) {
  $("#reportChart").innerHTML = buildChart(type);
  $("#receiptList").innerHTML = buildReportRows(type);
}

function buildChart(type) {
  const rows = reportRows(type);
  const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
  return rows
    .slice(0, 8)
    .map(
      (row) => `
        <div class="chart-row">
          <span>${esc(row.label)}</span>
          <div><i style="width:${Math.max(6, ((Number(row.value) || 0) / max) * 100)}%"></i></div>
          <strong>${row.money ? money.format(row.value) : esc(row.value)}</strong>
        </div>
      `,
    )
    .join("");
}

function buildReportRows(type) {
  if (type === "sales") {
    return state.sales.length
      ? state.sales
          .slice()
          .reverse()
          .map(
            (sale) => `
              <button class="receipt-row" type="button" data-receipt="${esc(sale.id)}">
                <div>
                  <strong>${esc(sale.method)} · ${sale.items.length} article(s)</strong>
                  <span>${new Date(sale.createdAt).toLocaleString("fr-FR")} · ${esc(sale.user)}</span>
                </div>
                <strong>${money.format(sale.total)}</strong>
              </button>
            `,
          )
          .join("")
      : `<p class="ai-status">Aucune vente enregistrée pour le moment.</p>`;
  }
  return reportRows(type)
    .map(
      (row) => `
        <div class="receipt-row">
          <div><strong>${esc(row.label)}</strong><span>${esc(row.meta || "")}</span></div>
          <strong>${row.money ? money.format(row.value) : esc(row.value)}</strong>
        </div>
      `,
    )
    .join("");
}

function buildReportPrintRows(type) {
  if (type === "sales") {
    return state.sales.length
      ? state.sales
          .slice()
          .reverse()
          .map(
            (sale) => `
              <div>
                <strong>${esc(sale.receiptNo || sale.id)} · ${esc(sale.method)}</strong>
                <span>${new Date(sale.createdAt).toLocaleString("fr-FR")} · ${sale.items.map((item) => `${esc(item.name)} x${item.qty}`).join(", ")}</span>
                <b>${money.format(sale.total)}</b>
              </div>
            `,
          )
          .join("")
      : "<p>Aucune vente.</p>";
  }
  return reportRows(type)
    .map(
      (row) => `
        <div>
          <strong>${esc(row.label)}</strong>
          <span>${esc(row.meta || "")}</span>
          <b>${row.money ? money.format(row.value) : esc(row.value)}</b>
        </div>
      `,
    )
    .join("");
}

function reportRows(type) {
  if (type === "products") {
    return state.products.map((product) => ({ label: product.name, meta: product.category, value: product.price, money: true }));
  }
  if (type === "clients") {
    return state.clients.map((client) => ({ label: client.store, meta: `${client.owner} · ${client.status}`, value: plans[client.plan]?.monthly || 0, money: true }));
  }
  if (type === "inventory") {
    return state.products.map((product) => ({ label: product.name, meta: product.sku, value: product.stock, money: false }));
  }
  return state.sales.map((sale) => ({ label: sale.receiptNo || sale.id, meta: sale.method, value: sale.total, money: true }));
}

function trialDaysLeft() {
  const started = new Date(state.trialStartedAt).getTime();
  const elapsed = Math.floor((Date.now() - started) / 86400000);
  return Math.max(0, 7 - elapsed);
}

function renderSettings() {
  const account = currentAccount() || state.accounts[0];
  if (!account) return;
  $("#profileName").value = account.name || "";
  $("#profileEmail").value = account.email || "";
  $("#profilePhone").value = account.phone || "";
  $("#profileStore").value = state.storeName || "";
  $("#languageSelect").value = state.language || "fr";
  $("#profilePhotoPreview").style.display = account.photo ? "block" : "none";
  $("#profilePhotoFallback").style.display = account.photo ? "none" : "grid";
  if (account.photo) $("#profilePhotoPreview").src = account.photo;
  $("#profilePhotoFallback").textContent = initials(account.name || "IZ") || "IZ";

  $("#roleList").innerHTML = state.roles
    .map(
      (role) => `
        <div class="role-card">
          <div>
            <strong>${esc(role.name)}</strong>
            <span>${role.permissions.map(esc).join(" · ")}</span>
          </div>
          <button class="icon-button" type="button" data-delete-role="${esc(role.id)}" title="Supprimer rôle">×</button>
        </div>
      `,
    )
    .join("");

  $("#subscriptionStrip").innerHTML = Object.entries(plans)
    .map(
      ([id, plan]) => `
        <button class="subscription-card ${state.plan === id ? "active" : ""}" type="button" data-request-plan="${esc(id)}">
          <span>${esc(plan.name)}</span>
          <strong>${plan.monthly} GDES / mois</strong>
          <small>${state.plan === id ? "Plan actif" : state.planRequest === id ? "Demande envoyée à STS" : `${trialDaysLeft()} jour(s) essai gratuit`}</small>
        </button>
      `,
    )
    .join("");
  $("#proofPlan").value = state.planRequest || state.plan;
}

function renderClients() {
  $("#clientsMeta").textContent = `${state.clients.length} client(s) dans STS-POS`;
  $("#clientList").innerHTML = state.clients
    .map(
      (client) => `
        <article class="client-card">
          <div>
            <strong>${esc(client.store)}</strong>
            <span>${esc(client.owner)} · ${esc(client.email)}</span>
            <small>${client.requestedPlan ? `Demande: ${esc(plans[client.requestedPlan]?.name || client.requestedPlan)}` : "Aucune demande de changement"}</small>
          </div>
          <select data-client-plan="${esc(client.id)}" aria-label="Plan ${esc(client.store)}">
            ${Object.entries(plans).map(([id, plan]) => `<option value="${esc(id)}" ${client.plan === id ? "selected" : ""}>${esc(plan.name)} · ${plan.monthly} GDES</option>`).join("")}
          </select>
          <select data-client-status="${esc(client.id)}" aria-label="Statut ${esc(client.store)}">
            <option value="trial" ${client.status === "trial" ? "selected" : ""}>Essai</option>
            <option value="active" ${client.status === "active" ? "selected" : ""}>Actif</option>
            <option value="blocked" ${client.status === "blocked" ? "selected" : ""}>Bloqué</option>
          </select>
          <label class="access-toggle">
            <input type="checkbox" data-client-access="${esc(client.id)}" ${client.access ? "checked" : ""} />
            Accès
          </label>
          <button class="icon-button" type="button" data-delete-client="${esc(client.id)}" title="Retirer client">×</button>
        </article>
      `,
    )
    .join("");
}

function renderAdmin() {
  const activeClients = state.clients.filter((client) => client.status === "active" && client.access);
  const requests = state.clients.filter((client) => client.requestedPlan || client.paymentProof);
  const mrr = activeClients.reduce((sum, client) => sum + (plans[client.plan]?.monthly || 0), 0);
  $("#adminClientCount").textContent = state.clients.length;
  $("#adminActiveCount").textContent = activeClients.length;
  $("#adminRequestCount").textContent = requests.length;
  $("#adminMrrText").textContent = money.format(mrr);
  renderClients();
  renderRequests();
  renderAdminReports();
}

function renderRequests() {
  const requests = state.clients.filter((client) => client.requestedPlan || client.paymentProof);
  $("#requestList").innerHTML = requests.length
    ? requests
        .map(
          (client) => `
            <article class="request-card">
              <div>
                <strong>${esc(client.store)}</strong>
                <span>${esc(client.owner)} · ${esc(client.email)}</span>
                <small>Plan demandé: ${esc(plans[client.requestedPlan]?.name || "Non défini")}</small>
                <small>MonCash: +509 48 48 74 23 · Vital-Herne Zéphy</small>
                <small>Référence: ${esc(client.paymentProof?.transaction || "En attente")} · Téléphone: ${esc(client.paymentProof?.phone || "En attente")}</small>
              </div>
              <button class="primary-button" type="button" data-approve-request="${esc(client.id)}">Approuver</button>
              <button class="danger-button" type="button" data-reject-request="${esc(client.id)}">Rejeter</button>
            </article>
          `,
        )
        .join("")
    : `<p class="ai-status">Aucune demande en attente.</p>`;
}

function renderAdminReports() {
  const grouped = Object.entries(plans).map(([id, plan]) => ({
    label: plan.name,
    value: state.clients.filter((client) => client.plan === id).length,
  }));
  const max = Math.max(1, ...grouped.map((item) => item.value));
  $("#adminChart").innerHTML = grouped
    .map(
      (item) => `
        <div class="chart-row">
          <span>${esc(item.label)}</span>
          <div><i style="width:${Math.max(6, (item.value / max) * 100)}%"></i></div>
          <strong>${item.value}</strong>
        </div>
      `,
    )
    .join("");
  $("#adminReportList").innerHTML = state.clients
    .map(
      (client) => `
        <div class="receipt-row">
          <div><strong>${esc(client.store)}</strong><span>${esc(plans[client.plan]?.name)} · ${esc(client.status)}</span></div>
          <strong>${money.format(plans[client.plan]?.monthly || 0)}</strong>
        </div>
      `,
    )
    .join("");
}

function addToCart(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product || product.stock <= 0) {
    toast("Stock indisponible.");
    return;
  }
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    if (existing.qty >= product.stock) {
      toast("Quantité maximale atteinte.");
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  renderCheckout();
}

function changeQty(id, delta) {
  const product = state.products.find((item) => item.id === id);
  const item = cart.find((line) => line.id === id);
  if (!item || !product) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((line) => line.id !== id);
  if (item.qty > product.stock) item.qty = product.stock;
  renderCheckout();
}

function checkout() {
  if (!cart.length) {
    toast("Le panier est vide.");
    return;
  }
  const activeUser = state.users.find((user) => user.id === state.activeUserId) || state.users[0];
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  cart.forEach((line) => {
    const product = state.products.find((item) => item.id === line.id);
    if (product) product.stock = Math.max(0, product.stock - line.qty);
  });
  const sale = {
    id: crypto.randomUUID(),
    receiptNo: "STS-" + String(Date.now()).slice(-7),
    items: structuredClone(cart),
    subtotal,
    tax,
    total,
    method: $("#paymentMethod").value,
    user: activeUser.name,
    createdAt: new Date().toISOString(),
  };
  state.sales.push(sale);
  latestSaleId = sale.id;
  cart = [];
  saveState();
  renderLayout();
  openReceipt(sale.id);
  toast("Vente enregistrée.");
}

function openReceipt(saleId) {
  const sale = state.sales.find((item) => item.id === saleId);
  if (!sale) return;
  const date = new Date(sale.createdAt);
  $("#receiptPaper").innerHTML = `
    <div class="receipt-header">
      <img class="receipt-logo" src="assets/sts-logo.png" alt="${appName} logo" />
      <strong>${appName}</strong>
      <span>${esc(state.storeName)}</span>
      <small>Reçu ${esc(sale.receiptNo || sale.id.slice(0, 8))}</small>
    </div>
    <div class="receipt-meta">
      <span>Date</span><strong>${date.toLocaleString("fr-FR")}</strong>
      <span>Caissier</span><strong>${esc(sale.user)}</strong>
      <span>Paiement</span><strong>${esc(sale.method)}</strong>
    </div>
    <div class="receipt-items">
      ${sale.items
        .map(
          (item) => `
          <div>
            <span>${esc(item.name)} x ${item.qty}</span>
            <strong>${money.format(item.price * item.qty)}</strong>
          </div>
        `,
        )
        .join("")}
    </div>
    <div class="receipt-total">
      <div><span>Sous-total</span><strong>${money.format(sale.subtotal)}</strong></div>
      <div><span>Taxe</span><strong>${money.format(sale.tax ?? sale.total - sale.subtotal)}</strong></div>
      <div class="receipt-grand"><span>Total</span><strong>${money.format(sale.total)}</strong></div>
    </div>
    <p class="receipt-thanks">Merci pour votre achat.</p>
  `;
  if (!$("#receiptDialog").open) $("#receiptDialog").showModal();
}

function resetProductForm() {
  $("#productForm").reset();
  $("#photoPreview").style.display = "none";
  $("#cameraPlaceholder").style.display = "grid";
  capturedImage = "";
  $("#aiStatus").textContent = "Ajoute une photo, puis lance l’identification.";
}

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    $("#cameraPreview").srcObject = cameraStream;
    $("#cameraPreview").style.display = "block";
    $("#photoPreview").style.display = "none";
    $("#cameraPlaceholder").style.display = "none";
  } catch {
    toast("Caméra non disponible. Utilise Importer.");
  }
}

function takePhoto() {
  const video = $("#cameraPreview");
  if (!cameraStream || !video.videoWidth) {
    toast("Démarre la caméra avant la capture.");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  capturedImage = canvas.toDataURL("image/jpeg", 0.86);
  showCapturedImage(capturedImage);
}

function showCapturedImage(src) {
  $("#photoPreview").src = src;
  $("#photoPreview").style.display = "block";
  $("#cameraPreview").style.display = "none";
  $("#cameraPlaceholder").style.display = "none";
}

function inferNameFromPhoto() {
  if (!plans[state.plan].ai) {
    toast("La génération IA est disponible sur Premium et Gold.");
    return;
  }
  if (!capturedImage) {
    toast("Ajoute d’abord une photo.");
    return;
  }
  $("#aiStatus").textContent = "Analyse IA en cours...";
  window.setTimeout(() => {
    const inputName = $("#photoInput").files[0]?.name || "";
    const cleaned = inputName
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b(img|image|photo|product|produit)\b/gi, "")
      .trim();
    const generated = cleaned || ["Boisson fraîche", "Produit épicerie", "Article premium", "Produit boutique"][Date.now() % 4];
    $("#productName").value = generated.replace(/\b\w/g, (char) => char.toUpperCase());
    $("#aiStatus").textContent = "Nom proposé. En production, le backend branchera OCR + vision IA sur cette action.";
  }, 650);
}

function addProduct(event) {
  event.preventDefault();
  const name = $("#productName").value.trim();
  const price = Number($("#productPrice").value);
  const stock = Number($("#productStock").value);
  if (!name || price < 0 || stock < 0) return;
  state.products.push({
    id: crypto.randomUUID(),
    name,
    category: $("#productCategory").value,
    price,
    stock,
    sku: $("#productSku").value.trim() || name.slice(0, 3).toUpperCase() + "-" + String(Date.now()).slice(-4),
    image: capturedImage,
    color: "#d9f0ff",
  });
  saveState();
  resetProductForm();
  renderLayout();
  toast("Produit enregistré.");
}

function addUser(event) {
  event.preventDefault();
  const limit = plans[state.plan].users;
  if (state.users.length >= limit) {
    toast(`Le plan ${plans[state.plan].name} limite à ${limit} utilisateur(s).`);
    return;
  }
  state.users.push({ id: crypto.randomUUID(), name: $("#userName").value.trim(), role: $("#userRole").value });
  $("#userForm").reset();
  saveState();
  renderLayout();
}

function saveProfile(event) {
  event.preventDefault();
  const account = currentAccount();
  if (!account) return;
  account.name = $("#profileName").value.trim();
  account.email = $("#profileEmail").value.trim();
  account.phone = $("#profilePhone").value.trim();
  state.storeName = $("#profileStore").value.trim();
  const adminUser = state.users.find((user) => user.role === "Admin");
  if (adminUser) adminUser.name = account.name;
  saveState();
  renderLayout();
  toast((translations[state.language] || translations.fr).profileSaved);
}

function addRole(event) {
  event.preventDefault();
  const name = $("#roleName").value.trim();
  const permissions = [...document.querySelectorAll('input[name="permission"]:checked')].map((input) => input.value);
  if (!name || !permissions.length) {
    toast("Ajoute un nom et au moins un accès.");
    return;
  }
  if (state.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
    toast("Ce rôle existe déjà.");
    return;
  }
  state.roles.push({ id: crypto.randomUUID(), name, permissions });
  $("#roleForm").reset();
  saveState();
  renderLayout();
  toast("Rôle créé.");
}

function addClient(event) {
  event.preventDefault();
  const client = {
    id: crypto.randomUUID(),
    store: $("#clientStore").value.trim(),
    owner: $("#clientOwner").value.trim(),
    email: $("#clientEmail").value.trim(),
    plan: $("#clientPlan").value,
    status: $("#clientStatus").value,
    access: $("#clientStatus").value !== "blocked",
    requestedPlan: "",
    createdAt: new Date().toISOString(),
  };
  state.clients.push(client);
  $("#clientForm").reset();
  saveState();
  renderAdmin();
  toast("Client ajouté.");
}

function submitPaymentProof(event) {
  event.preventDefault();
  const requestedPlan = $("#proofPlan").value;
  state.planRequest = requestedPlan;
  const primaryClient = state.clients[0];
  if (primaryClient) {
    primaryClient.requestedPlan = requestedPlan;
    primaryClient.paymentProof = {
      transaction: $("#proofTransaction").value.trim(),
      phone: $("#proofPhone").value.trim(),
      paidTo: "Vital-Herne Zéphy",
      moncash: "+509 48 48 74 23",
      createdAt: new Date().toISOString(),
    };
  }
  $("#paymentProofForm").reset();
  saveState();
  renderLayout();
  toast("Preuve envoyée à STS pour validation.");
}

function salesRows() {
  return state.sales.map((sale) => ({
    Recu: sale.receiptNo || sale.id,
    Date: new Date(sale.createdAt).toLocaleString("fr-FR"),
    Caissier: sale.user,
    Paiement: sale.method,
    Articles: sale.items.map((item) => `${item.name} x${item.qty}`).join(", "),
    SousTotal: sale.subtotal,
    Taxe: sale.tax ?? sale.total - sale.subtotal,
    Total: sale.total,
  }));
}

function inventoryRows() {
  return state.products.map((product) => ({
    Produit: product.name,
    Categorie: product.category,
    SKU: product.sku,
    Prix: product.price,
    Stock: product.stock,
    ValeurStock: product.price * product.stock,
  }));
}

function clientRows() {
  return state.clients.map((client) => ({
    Boutique: client.store,
    Responsable: client.owner,
    Email: client.email,
    Plan: plans[client.plan]?.name || client.plan,
    Statut: client.status,
    Acces: client.access ? "Oui" : "Non",
    Demande: plans[client.requestedPlan]?.name || "",
    Reference: client.paymentProof?.transaction || "",
  }));
}

function exportTable(rows, filename) {
  const headers = Object.keys(rows[0] || { Vide: "" });
  const bodyRows = rows.length ? rows : [{ Vide: "" }];
  const table = `
    <table>
      <thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead>
      <tbody>${bodyRows.map((row) => `<tr>${headers.map((header) => `<td>${esc(row[header] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
  const blob = new Blob([table], { type: "application/vnd.ms-excel" });
  downloadBlob(blob, filename);
}

function exportExcel() {
  const type = $("#reportTypeSelect")?.value || "sales";
  const rows = type === "inventory" || type === "products" ? inventoryRows() : type === "clients" ? clientRows() : salesRows();
  exportTable(rows, `sts-pos-${type}-${new Date().toISOString().slice(0, 10)}.xls`);
}

function exportInventory() {
  exportTable(inventoryRows(), `sts-pos-inventaire-${new Date().toISOString().slice(0, 10)}.xls`);
}

function openReportPdf() {
  const type = $("#reportTypeSelect")?.value || "sales";
  const total = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  $("#reportPaper").innerHTML = `
    <div class="report-cover">
      <img class="receipt-logo" src="assets/sts-logo.png" alt="${appName} logo" />
      <div>
        <strong>Rapport ${appName}</strong>
        <span>${esc(state.storeName)} · ${new Date().toLocaleString("fr-FR")}</span>
      </div>
    </div>
    <div class="report-kpis">
      <div><span>Type</span><strong>${esc(type)}</strong></div>
      <div><span>Ventes</span><strong>${state.sales.length}</strong></div>
      <div><span>Revenu</span><strong>${money.format(total)}</strong></div>
      <div><span>Stock</span><strong>${state.products.reduce((sum, product) => sum + product.stock, 0)}</strong></div>
    </div>
    <div class="report-chart print-chart">${buildChart(type)}</div>
    <div class="report-lines">${buildReportPrintRows(type)}</div>
  `;
  if (!$("#reportDialog").open) $("#reportDialog").showModal();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function setAuthTab(tabName) {
  document.querySelectorAll(".auth-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === tabName));
  $("#loginForm").classList.toggle("active", tabName === "login");
  $("#signupForm").classList.toggle("active", tabName === "signup");
}

document.addEventListener("click", (event) => {
  const authTab = event.target.closest("[data-auth-tab]");
  if (authTab) setAuthTab(authTab.dataset.authTab);

  const nav = event.target.closest("[data-view]");
  if (nav) {
    currentView = nav.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    nav.classList.add("active");
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    $(`#${nav.dataset.view}View`).classList.add("active");
    applyLanguage();
  }

  const adminNav = event.target.closest("[data-admin-view]");
  if (adminNav) {
    currentAdminView = adminNav.dataset.adminView;
    document.querySelectorAll("[data-admin-view]").forEach((item) => item.classList.remove("active"));
    adminNav.classList.add("active");
    document.querySelectorAll(".admin-view").forEach((view) => view.classList.remove("active"));
    $(`#${currentAdminView}View`).classList.add("active");
    $("#adminViewTitle").textContent = adminNav.querySelector("span:last-child")?.textContent || adminNav.textContent.trim();
    renderAdmin();
  }

  const add = event.target.closest("[data-add]");
  if (add) addToCart(add.dataset.add);

  const inc = event.target.closest("[data-inc]");
  if (inc) changeQty(inc.dataset.inc, 1);

  const dec = event.target.closest("[data-dec]");
  if (dec) changeQty(dec.dataset.dec, -1);

  const receipt = event.target.closest("[data-receipt]");
  if (receipt) openReceipt(receipt.dataset.receipt);

  const productDelete = event.target.closest("[data-delete-product]");
  if (productDelete) {
    state.products = state.products.filter((product) => product.id !== productDelete.dataset.deleteProduct);
    cart = cart.filter((line) => line.id !== productDelete.dataset.deleteProduct);
    saveState();
    renderLayout();
  }

  const userDelete = event.target.closest("[data-delete-user]");
  if (userDelete) {
    if (state.users.length === 1) {
      toast("Il faut garder au moins un utilisateur.");
      return;
    }
    state.users = state.users.filter((user) => user.id !== userDelete.dataset.deleteUser);
    state.activeUserId = state.users[0].id;
    saveState();
    renderLayout();
  }

  const roleDelete = event.target.closest("[data-delete-role]");
  if (roleDelete) {
    const role = state.roles.find((item) => item.id === roleDelete.dataset.deleteRole);
    if (!role) return;
    if (state.users.some((user) => user.role === role.name)) {
      toast("Ce rôle est encore utilisé par un utilisateur.");
      return;
    }
    state.roles = state.roles.filter((item) => item.id !== roleDelete.dataset.deleteRole);
    saveState();
    renderLayout();
  }

  const clientDelete = event.target.closest("[data-delete-client]");
  if (clientDelete) {
    state.clients = state.clients.filter((client) => client.id !== clientDelete.dataset.deleteClient);
    saveState();
    renderAdmin();
    toast("Client retiré.");
  }

  const requestPlanButton = event.target.closest("[data-request-plan]");
  if (requestPlanButton) {
    const requestedPlan = requestPlanButton.dataset.requestPlan;
    state.planRequest = requestedPlan === state.plan ? "" : requestedPlan;
    const primaryClient = state.clients[0];
    if (primaryClient) primaryClient.requestedPlan = state.planRequest;
    saveState();
    renderLayout();
    toast(state.planRequest ? "Demande envoyée à STS. Seul l'admin peut changer le plan." : "Plan déjà actif.");
  }

  const approveRequest = event.target.closest("[data-approve-request]");
  if (approveRequest) {
    const client = state.clients.find((item) => item.id === approveRequest.dataset.approveRequest);
    if (!client || !client.requestedPlan) return;
    client.plan = client.requestedPlan;
    client.requestedPlan = "";
    client.paymentProof = null;
    client.status = "active";
    client.access = true;
    if (client.id === state.clients[0]?.id) {
      state.plan = client.plan;
      state.planRequest = "";
    }
    saveState();
    renderAdmin();
    toast("Demande approuvée.");
  }

  const rejectRequest = event.target.closest("[data-reject-request]");
  if (rejectRequest) {
    const client = state.clients.find((item) => item.id === rejectRequest.dataset.rejectRequest);
    if (!client) return;
    client.requestedPlan = "";
    client.paymentProof = null;
    saveState();
    renderAdmin();
    toast("Demande rejetée.");
  }

  const catalogViewButton = event.target.closest("[data-catalog-view]");
  if (catalogViewButton) {
    state.catalogView = catalogViewButton.dataset.catalogView;
    saveState();
    renderCheckout();
  }

  const inventoryViewButton = event.target.closest("[data-inventory-view]");
  if (inventoryViewButton) {
    state.inventoryView = inventoryViewButton.dataset.inventoryView;
    saveState();
    renderInventory();
  }
});

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  const account = state.accounts.find((item) => item.email.toLowerCase() === email && item.password === password);
  if (!account) {
    toast("Email ou mot de passe incorrect.");
    return;
  }
  const primaryClient = state.clients[0];
  if (account.type !== "superAdmin" && primaryClient && (!primaryClient.access || primaryClient.status === "blocked")) {
    toast("Accès bloqué. Contacte STS pour réactiver le compte.");
    return;
  }
  state.sessionAccountId = account.id;
  saveState();
  showApp(true);
});

$("#signupForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#signupEmail").value.trim().toLowerCase();
  if (state.accounts.some((account) => account.email.toLowerCase() === email)) {
    toast("Ce compte existe déjà.");
    return;
  }
  const account = {
    id: crypto.randomUUID(),
    name: $("#signupName").value.trim(),
    email,
    password: $("#signupPassword").value,
  };
  state.storeName = $("#signupStore").value.trim();
  state.accounts.push(account);
  state.clients.unshift({
    id: crypto.randomUUID(),
    store: state.storeName,
    owner: account.name,
    email,
    plan: "free",
    status: "trial",
    access: true,
    requestedPlan: "",
    createdAt: new Date().toISOString(),
  });
  state.plan = "free";
  state.sessionAccountId = account.id;
  state.users[0].name = account.name;
  state.activeUserId = state.users[0].id;
  saveState();
  showApp(true);
});

$("#logoutButton").addEventListener("click", () => {
  state.sessionAccountId = "";
  saveState();
  showApp(false);
  toast("Déconnexion réussie.");
});
$("#adminLogoutButton").addEventListener("click", () => {
  state.sessionAccountId = "";
  saveState();
  showApp(false);
  toast("Déconnexion réussie.");
});

$("#productSearch").addEventListener("input", renderCheckout);
$("#checkoutButton").addEventListener("click", checkout);
$("#clearCartButton").addEventListener("click", () => {
  cart = [];
  renderCheckout();
});
$("#productForm").addEventListener("submit", addProduct);
$("#userForm").addEventListener("submit", addUser);
$("#profileForm").addEventListener("submit", saveProfile);
$("#roleForm").addEventListener("submit", addRole);
$("#clientForm").addEventListener("submit", addClient);
$("#paymentProofForm").addEventListener("submit", submitPaymentProof);
$("#startCameraButton").addEventListener("click", startCamera);
$("#takePhotoButton").addEventListener("click", takePhoto);
$("#aiNameButton").addEventListener("click", inferNameFromPhoto);
$("#activeUserSelect").addEventListener("change", (event) => {
  state.activeUserId = event.target.value;
  saveState();
});
document.addEventListener("change", (event) => {
  const roleSelect = event.target.closest("[data-user-role]");
  if (roleSelect) {
    const user = state.users.find((item) => item.id === roleSelect.dataset.userRole);
    if (!user) return;
    user.role = roleSelect.value;
    saveState();
    renderLayout();
    toast("Accès utilisateur mis à jour.");
    return;
  }

  const clientPlan = event.target.closest("[data-client-plan]");
  if (clientPlan) {
    const client = state.clients.find((item) => item.id === clientPlan.dataset.clientPlan);
    if (!client) return;
    client.plan = clientPlan.value;
    client.requestedPlan = "";
    if (client.id === state.clients[0]?.id) {
      state.plan = client.plan;
      state.planRequest = "";
    }
    saveState();
    currentAccount()?.type === "superAdmin" ? renderAdmin() : renderLayout();
    toast("Plan client mis à jour par STS.");
    return;
  }

  const clientStatus = event.target.closest("[data-client-status]");
  if (clientStatus) {
    const client = state.clients.find((item) => item.id === clientStatus.dataset.clientStatus);
    if (!client) return;
    client.status = clientStatus.value;
    client.access = client.status !== "blocked";
    saveState();
    currentAccount()?.type === "superAdmin" ? renderAdmin() : renderLayout();
    toast("Statut client mis à jour.");
    return;
  }

  const clientAccess = event.target.closest("[data-client-access]");
  if (clientAccess) {
    const client = state.clients.find((item) => item.id === clientAccess.dataset.clientAccess);
    if (!client) return;
    client.access = clientAccess.checked;
    saveState();
    currentAccount()?.type === "superAdmin" ? renderAdmin() : renderLayout();
    toast(client.access ? "Accès client activé." : "Accès client retiré.");
  }
});
$("#photoInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    capturedImage = reader.result;
    showCapturedImage(capturedImage);
    $("#aiStatus").textContent = "Photo importée. Lance Nom IA pour générer ou transcrire le nom.";
  };
  reader.readAsDataURL(file);
});
$("#profilePhotoInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const account = currentAccount();
  if (!file || !account) return;
  const reader = new FileReader();
  reader.onload = () => {
    account.photo = reader.result;
    saveState();
    renderSettings();
    toast("Photo profil mise à jour.");
  };
  reader.readAsDataURL(file);
});
$("#languageSelect").addEventListener("change", (event) => {
  state.language = event.target.value;
  saveState();
  applyLanguage();
  toast("Langue sauvegardée.");
});
$("#reportTypeSelect").addEventListener("change", (event) => renderReportBody(event.target.value));
$("#exportExcelButton").addEventListener("click", exportExcel);
$("#exportInventoryButton").addEventListener("click", exportInventory);
$("#exportPdfButton").addEventListener("click", openReportPdf);
$("#adminExportClientsButton").addEventListener("click", () => exportTable(clientRows(), `sts-pos-clients-${new Date().toISOString().slice(0, 10)}.xls`));
$("#resetDemoButton").addEventListener("click", () => {
  localStorage.removeItem("iziSalesState");
  localStorage.removeItem("stsPosState");
  localStorage.removeItem("posNovaState");
  state = structuredClone(defaultState);
  cart = [];
  saveState();
  showApp(true);
  toast("Données réinitialisées.");
});
$("#closeReceiptButton").addEventListener("click", () => $("#receiptDialog").close());
$("#printReceiptButton").addEventListener("click", () => window.print());
$("#closeReportButton").addEventListener("click", () => $("#reportDialog").close());
$("#printReportButton").addEventListener("click", () => window.print());

showApp(Boolean(currentAccount()));
