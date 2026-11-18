/* =================================
   CAMPUS CAFE - MAIN JAVASCRIPT
   Features: search, category filter, add to cart,
   quantity controls, totals, place order, saved cart
================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* ---------- SETTINGS ---------- */
    const DELIVERY_FEE = 0;          // campus pickup is free
    const DISCOUNT_MIN = 300;        // discount applies above this subtotal
    const DISCOUNT_PERCENT = 10;     // 10% off
    const STORAGE_KEY = "campusCafeCart";

    /* ---------- ELEMENTS ---------- */
    const searchInput = document.querySelector(".search-box input");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const foodCards = document.querySelectorAll(".food-card");
    const menuGrid = document.querySelector(".menu-grid");

    const cartItemsBox = document.querySelector(".cart-items");
    const cartCount = document.querySelector(".cart-header span");
    const emptyCart = document.querySelector(".empty-cart");
    const summaryRows = document.querySelectorAll(".summary-row");
    const totalAmount = document.querySelector(".summary-total span:last-child");
    const checkoutBtn = document.querySelector(".checkout-btn");
    const navCartLink = document.querySelector('nav a[href="#cart"]');

    const subtotalEl = summaryRows[0].lastElementChild;
    const deliveryEl = summaryRows[1].lastElementChild;
    const discountEl = summaryRows[2].lastElementChild;

    /* ---------- STATE ---------- */
    let activeCategory = "all items";
    let cart = loadCart();

    /* Container for cart rows (created by JS, placed after the header) */
    const cartList = document.createElement("div");
    cartList.className = "cart-list";
    emptyCart.before(cartList);

    /* "No results" message for search */
    const noResults = document.createElement("p");
    noResults.className = "no-results";
    noResults.textContent = "No food items found. Try a different search.";
    noResults.style.display = "none";
    menuGrid.after(noResults);

    /* ================================
       SEARCH + CATEGORY FILTER
    ================================ */

    function filterMenu() {
        const term = searchInput.value.trim().toLowerCase();
        let visible = 0;

        foodCards.forEach(card => {
            const name = card.querySelector("h3").textContent.toLowerCase();
            const desc = card.querySelector(".food-info p").textContent.toLowerCase();
            const category = card.querySelector(".category").textContent.trim().toLowerCase();

            const matchesCategory = activeCategory === "all items" || category === activeCategory;
            const matchesSearch = name.includes(term) || desc.includes(term);

            const show = matchesCategory && matchesSearch;
            card.style.display = show ? "" : "none";
            if (show) visible++;
        });

        noResults.style.display = visible === 0 ? "block" : "none";
    }

    searchInput.addEventListener("input", filterMenu);

    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = btn.textContent.trim().toLowerCase();
            filterMenu();
        });
    });

    /* ================================
       ADD TO CART
    ================================ */

    foodCards.forEach(card => {
        const btn = card.querySelector(".order-btn");
        const stockLabel = card.querySelector(".availability");

        // Disable button if item is not in stock
        if (stockLabel && !stockLabel.textContent.toLowerCase().includes("in stock")) {
            btn.disabled = true;
            btn.textContent = "Unavailable";
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            return;
        }

        btn.addEventListener("click", () => {
            const name = card.querySelector("h3").textContent.trim();
            const price = parseInt(card.querySelector(".price").textContent.replace(/[^\d]/g, ""), 10);
            const img = card.querySelector("img").getAttribute("src");

            const existing = cart.find(item => item.name === name);
            if (existing) {
                existing.qty++;
            } else {
                cart.push({ name, price, img, qty: 1 });
            }

            saveCart();
            renderCart();

            // Small button feedback
            btn.textContent = "Added ✓";
            setTimeout(() => (btn.textContent = "Add to Cart"), 900);
        });
    });

    /* ================================
       CART ACTIONS (+ / - / remove)
    ================================ */

    cartList.addEventListener("click", e => {
        const button = e.target.closest("button");
        if (!button) return;

        const name = button.dataset.name;
        const action = button.dataset.action;
        const item = cart.find(i => i.name === name);
        if (!item) return;

        if (action === "increase") {
            item.qty++;
        } else if (action === "decrease") {
            item.qty--;
            if (item.qty <= 0) cart = cart.filter(i => i.name !== name);
        } else if (action === "remove") {
            cart = cart.filter(i => i.name !== name);
        }

        saveCart();
        renderCart();
    });

    /* ================================
       RENDER CART + TOTALS
    ================================ */

    function renderCart() {
        const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const discount = subtotal >= DISCOUNT_MIN ? Math.round(subtotal * DISCOUNT_PERCENT / 100) : 0;
        const delivery = cart.length ? DELIVERY_FEE : 0;
        const total = subtotal + delivery - discount;

        // Header count + nav link count
        cartCount.textContent = totalItems + (totalItems === 1 ? " Item" : " Items");
        navCartLink.textContent = totalItems ? `My Cart (${totalItems}) 🛒` : "My Cart 🛒";

        // Empty vs filled
        emptyCart.style.display = cart.length ? "none" : "block";
        cartList.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.img}" alt="${escapeHTML(item.name)}">
                <div class="cart-item-info">
                    <h4>${escapeHTML(item.name)}</h4>
                    <span class="cart-item-price">₹${item.price} each</span>
                </div>
                <div class="qty-controls">
                    <button type="button" data-action="decrease" data-name="${escapeHTML(item.name)}" aria-label="Decrease quantity">−</button>
                    <span>${item.qty}</span>
                    <button type="button" data-action="increase" data-name="${escapeHTML(item.name)}" aria-label="Increase quantity">+</button>
                </div>
                <strong class="cart-item-total">₹${item.price * item.qty}</strong>
                <button type="button" class="remove-btn" data-action="remove" data-name="${escapeHTML(item.name)}" aria-label="Remove item">✕</button>
            </div>
        `).join("");

        // Summary
        subtotalEl.textContent = "₹" + subtotal;
        deliveryEl.textContent = delivery === 0 ? "Free" : "₹" + delivery;
        discountEl.textContent = discount ? "-₹" + discount : "₹0";
        totalAmount.textContent = "₹" + total;

        checkoutBtn.disabled = cart.length === 0;
    }

    /* ================================
       PLACE ORDER
    ================================ */

    checkoutBtn.addEventListener("click", () => {
        if (!cart.length) return;

        const orderNo = "CC" + Math.floor(1000 + Math.random() * 9000);
        const summary = cart.map(i => `${i.name} x ${i.qty}`).join("\n");

        alert(
            `✅ Order placed successfully!\n\n` +
            `Order No: ${orderNo}\n\n${summary}\n\n` +
            `Total: ${totalAmount.textContent}\n\n` +
            `Please collect your order from the counter.`
        );

        cart = [];
        saveCart();
        renderCart();
    });

    /* ================================
       HELPERS (save / load / escape)
    ================================ */

    function saveCart() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) { /* storage not available */ }
    }

    function loadCart() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[ch]));
    }

    /* ---------- INITIAL RENDER ---------- */
    renderCart();
    filterMenu();
});