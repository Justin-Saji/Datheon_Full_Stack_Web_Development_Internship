/* ---------- Config ---------- */
const API_URL = "https://fakestoreapi.com/products";
const USD_TO_INR = 95;          // approximate rate - change this to update all prices
const TAX_RATE = 0.08;
const SHIPPING_FLAT = 99;       // in rupees
const FREE_SHIPPING_OVER = 5000; // in rupees
const DEAL_UNDER = 1900;        // "Great Deal" badge threshold in rupees
const CART_KEY = "shopease_cart";

/* ---------- State ---------- */
let products = [];
let cart = loadCart(); // [{ id, qty }]
let state = { category: "all", search: "", sort: "default" };

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const grid = $("productGrid");
const statusEl = $("status");

/* ---------- Helpers ---------- */
const inrFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const money = (n) => inrFormat.format(n);
const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function categoryLabel(cat) {
  if (cat === "jewelery") return "Jewelry";
  if (cat.includes("clothing")) return "Clothing";
  return "Electronics";
}
function matchesCategory(p) {
  if (state.category === "all") return true;
  if (state.category === "clothing") return p.category.includes("clothing");
  return p.category === state.category;
}
function stars(rate) {
  const full = Math.round(rate);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
function badgesFor(p) {
  const b = [];
  if (p.rating.rate >= 4.5) b.push('<span class="badge top">Top Rated</span>');
  if (p.rating.count >= 400) b.push('<span class="badge best">Best Seller</span>');
  if (p.price < DEAL_UNDER) b.push('<span class="badge deal">Great Deal</span>');
  return b.join("");
}

/* ---------- Fetch ---------- */
async function fetchProducts() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    // Convert API prices (USD) to whole rupees
    products = data.map((p) => ({ ...p, price: Math.round(p.price * USD_TO_INR) }));
    $("shippingHint").textContent = "Free shipping on orders over " + money(FREE_SHIPPING_OVER);
    statusEl.classList.add("hidden");
    renderProducts();
    renderCart(); // now that we know product details
  } catch (err) {
    statusEl.textContent = "Could not load products. Check your internet connection and refresh.";
    statusEl.classList.add("error");
    console.error(err);
  }
}

/* ---------- Render products ---------- */
function renderProducts() {
  let list = products.filter(matchesCategory);
  const q = state.search.trim().toLowerCase();
  if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));

  if (state.sort === "low") list.sort((a, b) => a.price - b.price);
  if (state.sort === "high") list.sort((a, b) => b.price - a.price);
  if (state.sort === "rating") list.sort((a, b) => b.rating.rate - a.rating.rate);

  if (!list.length) {
    grid.innerHTML = '<p class="status">No products found.</p>';
    return;
  }
  grid.innerHTML = list
    .map(
      (p) => `
    <article class="card">
      <div class="badges">${badgesFor(p)}</div>
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" />
      <span class="cat">${categoryLabel(p.category)}</span>
      <h3 title="${escapeHTML(p.title)}">${escapeHTML(p.title)}</h3>
      <div class="rating"><span class="stars">${stars(p.rating.rate)}</span> ${p.rating.rate} (${p.rating.count})</div>
      <div class="card-footer">
        <span class="price">${money(p.price)}</span>
        <button class="add-btn" data-add="${p.id}">Add to Cart</button>
      </div>
    </article>`
    )
    .join("");
}

/* ---------- Cart logic ---------- */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(id) {
  const item = cart.find((i) => i.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function updateQuantity(id, change) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += change;
  if (item.qty <= 0) return removeFromCart(id);
  saveCart();
  renderCart();
}

function calculateTotal() {
  const subtotal = cart.reduce((sum, i) => {
    const p = products.find((x) => x.id === i.id);
    return sum + (p ? p.price * i.qty : 0);
  }, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  return { subtotal, tax, shipping, total: subtotal + tax + shipping };
}

/* ---------- Render cart ---------- */
function renderCart() {
  const count = cart.reduce((n, i) => n + i.qty, 0);
  $("cartBadge").textContent = count;

  const box = $("cartItems");
  if (!cart.length) {
    box.innerHTML = '<p class="empty">Your cart is empty 🛍️</p>';
  } else if (products.length) {
    box.innerHTML = cart
      .map((i) => {
        const p = products.find((x) => x.id === i.id);
        if (!p) return "";
        return `
        <div class="cart-item">
          <img src="${escapeHTML(p.image)}" alt="" />
          <div class="ci-info">
            <div class="ci-title">${escapeHTML(p.title)}</div>
            <div class="ci-price">${money(p.price)} each</div>
            <div class="qty">
              <button data-dec="${p.id}" aria-label="Decrease quantity">−</button>
              <span>${i.qty}</span>
              <button data-inc="${p.id}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="ci-right">
            <strong>${money(p.price * i.qty)}</strong>
            <button class="remove-btn" data-remove="${p.id}">Remove</button>
          </div>
        </div>`;
      })
      .join("");
  }

  const t = calculateTotal();
  $("subtotal").textContent = money(t.subtotal);
  $("tax").textContent = money(t.tax);
  $("shipping").textContent = t.shipping === 0 && t.subtotal > 0 ? "FREE" : money(t.shipping);
  $("total").textContent = money(t.total);
  $("checkoutBtn").disabled = cart.length === 0;
}

/* ---------- Drawer open/close ---------- */
function openCart() {
  $("cartDrawer").classList.add("open");
  $("overlay").classList.add("show");
  $("cartDrawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("cartDrawer").classList.remove("open");
  $("overlay").classList.remove("show");
  $("cartDrawer").setAttribute("aria-hidden", "true");
}

/* ---------- Checkout modal ---------- */
function openCheckout() {
  $("modalTotal").textContent = money(calculateTotal().total);
  $("checkoutStep").classList.remove("hidden");
  $("confirmStep").classList.add("hidden");
  $("modal").classList.add("show");
}
function closeCheckout() {
  $("modal").classList.remove("show");
}
function placeOrder(e) {
  e.preventDefault();
  const form = e.target;
  $("confirmName").textContent = form.name.value;
  $("confirmEmail").textContent = form.email.value;
  $("orderId").textContent = "#" + Math.floor(100000 + Math.random() * 900000);
  cart = [];
  saveCart();
  renderCart();
  form.reset();
  $("checkoutStep").classList.add("hidden");
  $("confirmStep").classList.remove("hidden");
}

/* ---------- Events ---------- */
$("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.category = btn.dataset.category;
  renderProducts();
});
$("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderProducts();
});
$("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderProducts();
});
grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  addToCart(Number(btn.dataset.add));
  btn.textContent = "Added ✓";
  setTimeout(() => (btn.textContent = "Add to Cart"), 800);
});
$("cartItems").addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.inc) updateQuantity(Number(t.dataset.inc), 1);
  if (t.dataset.dec) updateQuantity(Number(t.dataset.dec), -1);
  if (t.dataset.remove) removeFromCart(Number(t.dataset.remove));
});
$("cartBtn").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
$("overlay").addEventListener("click", closeCart);
$("clearCartBtn").addEventListener("click", () => { cart = []; saveCart(); renderCart(); });
$("checkoutBtn").addEventListener("click", () => { closeCart(); openCheckout(); });
$("cancelCheckout").addEventListener("click", closeCheckout);
$("checkoutForm").addEventListener("submit", placeOrder);
$("doneBtn").addEventListener("click", closeCheckout);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeCart(); closeCheckout(); }
});

/* ---------- Init ---------- */
renderCart();
fetchProducts();