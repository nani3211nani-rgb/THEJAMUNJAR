const PRODUCTS = [
  {
    id: "classic-6",
    name: "Classic Gulab Jamun",
    qtyLabel: "6 Pieces",
    price: 149,
    rating: "★★★★★",
    ratingValue: 5,
    category: "classic",
    description: "Soft, juicy and delicious classic Gulab Jamuns.",
    image: "assets/product1.jpg",
    alt: "Jar of classic Gulab Jamuns, six pieces"
  },
  {
    id: "classic-12",
    name: "Classic Gulab Jamun",
    qtyLabel: "12 Pieces",
    price: 269,
    rating: "★★★★★",
    ratingValue: 5,
    category: "classic",
    description: "Perfect for sharing with family and friends.",
    image: "assets/product2.jpg",
    alt: "Jar of classic Gulab Jamuns, twelve pieces"
  },
  {
    id: "premium-12",
    name: "Premium Gulab Jamun",
    qtyLabel: "12 Pieces",
    price: 329,
    rating: "★★★★★",
    ratingValue: 5,
    category: "premium",
    description: "Premium-sized Gulab Jamuns made for special occasions.",
    image: "assets/product3.jpg",
    alt: "Premium-sized Gulab Jamuns in a glass jar"
  },
  {
    id: "chocolate-12",
    name: "Chocolate Gulab Jamun",
    qtyLabel: "12 Pieces",
    price: 349,
    rating: "★★★★★",
    ratingValue: 5,
    category: "chocolate",
    description: "A modern chocolate twist on the classic Indian dessert.",
    image: "assets/product4.jpg",
    alt: "Chocolate Gulab Jamuns in a premium jar"
  },
  {
    id: "mixed-2",
    name: "Mixed Dessert Jar",
    qtyLabel: "2 Jars",
    price: 399,
    rating: "★★★★★",
    ratingValue: 5,
    category: "gift",
    description: "A delicious combination perfect for gifting and celebrations.",
    image: "assets/product5.jpg",
    alt: "Two mixed Indian dessert jars for gifting"
  }
];

const STORAGE_KEY = "jamunJarCart";
const COUPON_KEY = "jamunJarCoupon";
const COUPON_CODE = "JAMUN10";
const rupee = (n) => `₹${n}`;

const els = {
  grid: document.getElementById("productGrid"),
  noProducts: document.getElementById("noProducts"),
  search: document.getElementById("productSearch"),
  cartCount: document.getElementById("cartCount"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartBody: document.getElementById("cartBody"),
  cartFooter: document.getElementById("cartFooter"),
  cartTotals: document.getElementById("cartTotals"),
  overlay: document.getElementById("overlay"),
  couponInput: document.getElementById("couponInput"),
  couponMsg: document.getElementById("couponMsg"),
  checkoutModal: document.getElementById("checkoutModal"),
  successModal: document.getElementById("successModal"),
  orderIdText: document.getElementById("orderIdText"),
  toast: document.getElementById("toast"),
  menuToggle: document.getElementById("menuToggle"),
  navLinks: document.getElementById("navLinks"),
  checkoutError: document.getElementById("checkoutError")
};

let cart = loadCart();
let couponApplied = localStorage.getItem(COUPON_KEY) === COUPON_CODE;
let activeFilter = "all";
let toastTimer = null;

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.qty === "number" &&
      item.qty > 0 &&
      PRODUCTS.some((p) => p.id === item.id)
    );
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  if (couponApplied) {
    localStorage.setItem(COUPON_KEY, COUPON_CODE);
  } else {
    localStorage.removeItem(COUPON_KEY);
  }
}

function renderProducts() {
  const query = (els.search.value || "").trim().toLowerCase();
  const list = PRODUCTS.filter((p) => {
    const matchesFilter = activeFilter === "all" || p.category === activeFilter;
    const hay = `${p.name} ${p.qtyLabel} ${p.description}`.toLowerCase();
    const matchesQuery = !query || hay.includes(query);
    return matchesFilter && matchesQuery;
  });

  els.grid.innerHTML = list.map((p) => `
    <article class="product-card">
      <div class="product-media">
        <img src="${p.image}" alt="${p.alt}" loading="lazy">
      </div>
      <div class="product-body">
        <p class="qty-tag">${p.qtyLabel}</p>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="stars" aria-label="${p.ratingValue} out of 5 stars">${p.rating}</div>
        <div class="price-row">
          <span class="price">${rupee(p.price)}</span>
          <button class="btn btn-gold sm" type="button" data-add="${p.id}" aria-label="Add ${p.name} to Cart">Add to Cart</button>
        </div>
      </div>
    </article>
  `).join("");

  els.noProducts.classList.toggle("hidden", list.length > 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function subtotal() {
  return cart.reduce((sum, item) => {
    const product = PRODUCTS.find((p) => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function discountAmount(sub) {
  if (couponApplied && sub >= 499) {
    return Math.round(sub * 0.1);
  }
  return 0;
}

function deliveryFee(sub) {
  if (sub === 0) return 0;
  return sub < 500 ? 40 : 0;
}

function totals() {
  const sub = subtotal();
  // Auto-revoke coupon if subtotal drops below ₹499
  if (couponApplied && sub < 499) {
    couponApplied = false;
    saveCart();
  }
  const discount = discountAmount(sub);
  const delivery = deliveryFee(sub);
  const grand = sub - discount + delivery;
  return { sub, discount, delivery, grand };
}

function updateCartCount() {
  els.cartCount.textContent = String(cartCount());
  els.cartCount.classList.remove("pop");
  void els.cartCount.offsetWidth;
  els.cartCount.classList.add("pop");
}

function addToCart(id) {
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
  updateCartCount();
  renderCart();
  const product = PRODUCTS.find((p) => p.id === id);
  showToast(product ? `${product.name} added to cart` : "Added to cart");
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }
  if (cart.length === 0) {
    couponApplied = false;
  }
  saveCart();
  updateCartCount();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  if (cart.length === 0) {
    couponApplied = false;
  }
  saveCart();
  updateCartCount();
  renderCart();
  showToast("Item removed from cart");
}

function renderCart() {
  const couponForm = document.getElementById("couponForm");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (cart.length === 0) {
    els.cartBody.innerHTML = `
      <div class="empty-cart">
        <i class="fa-solid fa-basket-shopping empty-cart-icon" aria-hidden="true"></i>
        <p><strong>Your cart is empty</strong></p>
        <p class="empty-cart-sub">Explore our signature jars and add your favorite sweetness.</p>
        <a class="btn btn-gold sm" href="#products" id="emptyCartShopBtn">Browse Sweets</a>
      </div>
    `;
    couponForm.classList.add("hidden");
    checkoutBtn.classList.add("hidden");
    els.cartTotals.innerHTML = "";
    els.couponMsg.textContent = "";
    couponApplied = false;
    saveCart();
    const emptyBtn = document.getElementById("emptyCartShopBtn");
    if (emptyBtn) emptyBtn.addEventListener("click", closeCart);
    return;
  }

  couponForm.classList.remove("hidden");
  checkoutBtn.classList.remove("hidden");

  els.cartBody.innerHTML = cart.map((item) => {
    const p = PRODUCTS.find((prod) => prod.id === item.id);
    if (!p) return "";
    return `
      <article class="cart-item">
        <img src="${p.image}" alt="${p.alt}">
        <div>
          <strong>${p.name}</strong>
          <div>${p.qtyLabel} · ${rupee(p.price)}</div>
          <div class="qty-controls">
            <button type="button" data-qty="${p.id}" data-delta="-1" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button type="button" data-qty="${p.id}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-item" type="button" data-remove="${p.id}">Remove</button>
        </div>
        <div><strong>${rupee(p.price * item.qty)}</strong></div>
      </article>
    `;
  }).join("");

  const t = totals();
  const originalLine = t.discount
    ? `<dt>Subtotal</dt><dd class="strike">${rupee(t.sub)}</dd>
       <dt class="discount-label">Coupon Discount (10%)</dt><dd class="discount-val">− ${rupee(t.discount)}</dd>`
    : `<dt>Subtotal</dt><dd>${rupee(t.sub)}</dd>`;

  const deliveryNotice = t.delivery === 0
    ? `<span class="free-tag">FREE</span>`
    : `${rupee(t.delivery)}`;

  els.cartTotals.innerHTML = `
    ${originalLine}
    <dt>Delivery (${t.sub >= 500 ? "Free over ₹500" : "Orders under ₹500"})</dt><dd>${deliveryNotice}</dd>
    <dt class="grand">Final Total</dt><dd class="grand">${rupee(t.grand)}</dd>
  `;

  if (couponApplied && t.discount > 0) {
    els.couponMsg.textContent = "JAMUN10 applied — 10% OFF";
    els.couponMsg.className = "coupon-msg success";
    els.couponInput.value = COUPON_CODE;
  } else if (!couponApplied) {
    if (els.couponMsg.textContent.includes("applied")) {
      els.couponMsg.textContent = "";
    }
  }
}

function applyCoupon(code) {
  const value = (code || "").trim().toUpperCase();
  const sub = subtotal();

  if (!value) {
    els.couponMsg.textContent = "Please enter a coupon code.";
    els.couponMsg.className = "coupon-msg error";
    return;
  }

  if (value !== COUPON_CODE) {
    els.couponMsg.textContent = "Invalid coupon code. Use JAMUN10.";
    els.couponMsg.className = "coupon-msg error";
    return;
  }

  if (couponApplied) {
    els.couponMsg.textContent = "Coupon JAMUN10 is already applied!";
    els.couponMsg.className = "coupon-msg info";
    return;
  }

  if (sub < 499) {
    els.couponMsg.textContent = "Add items worth ₹499 or more to use JAMUN10.";
    els.couponMsg.className = "coupon-msg error";
    return;
  }

  couponApplied = true;
  saveCart();
  renderCart();
  els.couponMsg.textContent = "Coupon JAMUN10 applied! 10% discount added.";
  els.couponMsg.className = "coupon-msg success";
}

function openCart() {
  els.cartDrawer.hidden = false;
  els.overlay.hidden = false;
  renderCart();
}

function closeCart() {
  els.cartDrawer.hidden = true;
  if (els.checkoutModal.hidden && els.successModal.hidden) {
    els.overlay.hidden = true;
  }
}

function openCheckout() {
  if (cart.length === 0) {
    showToast("Your cart is empty!");
    return;
  }
  closeCart();
  const t = totals();
  const itemCount = cartCount();
  const itemEl = document.getElementById("checkoutItemCount");
  const grandEl = document.getElementById("checkoutGrandTotal");
  if (itemEl) itemEl.textContent = `${itemCount} item${itemCount > 1 ? "s" : ""}`;
  if (grandEl) grandEl.textContent = rupee(t.grand);

  els.checkoutError.classList.add("hidden");
  els.checkoutError.textContent = "";
  els.overlay.hidden = false;
  els.checkoutModal.hidden = false;
}

function closeCheckout() {
  els.checkoutModal.hidden = true;
  els.overlay.hidden = true;
}

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("show");
    toastTimer = null;
  }, 2200);
}

function generateOrderId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TJJ${y}${m}${d}-${randomSuffix}`;
}

function validateCheckout(form) {
  const name = form.fullName.value.trim();
  const rawMobile = form.mobile.value.trim();
  const email = form.email.value.trim();
  const address = form.address.value.trim();
  const city = form.city.value.trim();
  const pincode = form.pincode.value.trim().replace(/\s+/g, "");
  const payment = form.payment.value;

  // Clean mobile number (strip spaces, hyphens, and optional +91)
  const cleanMobile = rawMobile.replace(/[\s-]/g, "").replace(/^\+91/, "");

  if (!name || name.length < 2) return "Please enter your full name.";
  if (!/^[0-9]{10}$/.test(cleanMobile)) return "Enter a valid 10-digit mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (!address || address.length < 5) return "Please enter your delivery address.";
  if (!city) return "Please enter your city.";
  if (!/^[0-9]{6}$/.test(pincode)) return "Enter a valid 6-digit pincode.";
  if (!payment) return "Please choose a payment option.";
  return "";
}

function placeOrder(form) {
  const error = validateCheckout(form);
  if (error) {
    els.checkoutError.textContent = error;
    els.checkoutError.classList.remove("hidden");
    return;
  }
  els.checkoutError.classList.add("hidden");
  const orderId = generateOrderId();
  els.orderIdText.textContent = `Order ID: ${orderId}`;
  cart = [];
  couponApplied = false;
  saveCart();
  updateCartCount();
  renderCart();
  els.checkoutModal.hidden = true;
  els.successModal.hidden = false;
  form.reset();
  const cityInput = document.getElementById("city");
  if (cityInput) cityInput.value = "Hyderabad";
}

function closeAllOverlays() {
  els.cartDrawer.hidden = true;
  els.checkoutModal.hidden = true;
  els.successModal.hidden = true;
  els.overlay.hidden = true;
}

// Button & Modal Event Listeners
document.getElementById("cartOpenBtn").addEventListener("click", openCart);
document.getElementById("cartCloseBtn").addEventListener("click", closeCart);
document.getElementById("continueShopping").addEventListener("click", closeCart);
document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
document.getElementById("checkoutCloseBtn").addEventListener("click", closeCheckout);
document.getElementById("successCloseBtn").addEventListener("click", closeAllOverlays);
els.overlay.addEventListener("click", closeAllOverlays);

// Modal Backdrop Click Handling
[els.checkoutModal, els.successModal].forEach((modal) => {
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAllOverlays();
    });
  }
});

// Product Grid Delegation
els.grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (btn) addToCart(btn.dataset.add);
});

// Cart Body Delegation
els.cartBody.addEventListener("click", (e) => {
  const qtyBtn = e.target.closest("[data-qty]");
  const removeBtn = e.target.closest("[data-remove]");
  if (qtyBtn) changeQty(qtyBtn.dataset.qty, Number(qtyBtn.dataset.delta));
  if (removeBtn) removeItem(removeBtn.dataset.remove);
});

// Coupon Form
document.getElementById("couponForm").addEventListener("submit", (e) => {
  e.preventDefault();
  applyCoupon(els.couponInput.value);
});

// Click coupon pill to pre-fill or apply
document.querySelectorAll(".coupon-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    els.couponInput.value = COUPON_CODE;
    openCart();
    applyCoupon(COUPON_CODE);
  });
});

// Checkout Form
document.getElementById("checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  placeOrder(e.currentTarget);
});

// Contact Form
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();
    const success = document.getElementById("contactSuccess");
    const error = document.getElementById("contactError");

    success.classList.add("hidden");
    error.classList.add("hidden");

    if (!name) {
      error.textContent = "Please enter your name.";
      error.classList.remove("hidden");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = "Please enter a valid email address.";
      error.classList.remove("hidden");
      return;
    }
    if (!message || message.length < 5) {
      error.textContent = "Please enter a message (at least 5 characters).";
      error.classList.remove("hidden");
      return;
    }

    error.classList.add("hidden");
    success.classList.remove("hidden");
    contactForm.reset();
  });
}

// Search Field
els.search.addEventListener("input", renderProducts);

// Filter Chips
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderProducts();
  });
});

// Mobile Menu Toggle
els.menuToggle.addEventListener("click", () => {
  const open = els.navLinks.classList.toggle("open");
  els.menuToggle.setAttribute("aria-expanded", String(open));
  els.menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

// Close Mobile Menu on Nav Link Click
els.navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    els.navLinks.classList.remove("open");
    els.menuToggle.setAttribute("aria-expanded", "false");
    els.menuToggle.setAttribute("aria-label", "Open menu");
  }
});

// Header Shadow on Scroll
window.addEventListener("scroll", () => {
  const header = document.querySelector(".site-header");
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
});

// Keyboard Esc to Close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllOverlays();
});

// Initial Render
renderProducts();
updateCartCount();
renderCart();
