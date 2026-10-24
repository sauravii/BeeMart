let searchResults = [];  
let selected = null;     
let cart = [];            

const me = getUser();
if (me) init();

const formatWeight = w => (w >= 1000 ? (w / 1000) + " Kg" : w + " g");
const lineTotal = c => c.price * c.qty * (1 - c.discount / 100);

async function init() {
  startClock();
  bindEvents();
  renderCart();
  try {
    await Promise.all([loadPaymentMethods(), loadInvoice()]);
  } catch (err) {
    showToast(err.message);
  }
}

function startClock() {
  const tick = () => {
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    document.getElementById("sessionInfo").textContent = now + " | Kasir: " + me.username;
  };
  tick();
  setInterval(tick, 1000);
}

function bindEvents() {
  document.getElementById("search").addEventListener("keydown", e => {
    if (e.key === "Enter") searchProducts();
  });
  document.getElementById("resultBody").addEventListener("click", e => {
    const btn = e.target.closest("button[data-i]");
    if (btn) selectProduct(searchResults[Number(btn.dataset.i)]);
  });
  document.getElementById("btnAddCart").addEventListener("click", addToCart);
  document.getElementById("cartBody").addEventListener("click", e => {
    const btn = e.target.closest("button[data-i]");
    if (btn) removeFromCart(Number(btn.dataset.i));
  });
  document.getElementById("btnSubmit").addEventListener("click", submitTransaction);
}

async function loadPaymentMethods() {
  const list = await apiGet("/payment-methods");
  document.getElementById("payment").innerHTML = list
    .map(p => `<option value="${p.idPaymentMethod}">${escapeHtml(p.methodName)}</option>`)
    .join("");
}

async function loadInvoice() {
  const data = await apiGet("/transactions/next-invoice");
  document.getElementById("invoiceNo").textContent = data.invoiceNo;
}

async function searchProducts() {
  const keyword = val("search");
  hidePick();
  if (!keyword) {
    showToast("Masukkan kata kunci pencarian");
    return;
  }
  try {
    searchResults = await apiGet("/products?search=" + encodeURIComponent(keyword));
    renderResults();
  } catch (err) {
    showToast(err.message);
  }
}

function renderResults() {
  document.getElementById("resultBox").classList.remove("hidden");
  const body = document.getElementById("resultBody");

  if (searchResults.length === 0) {
    body.innerHTML = '<tr><td colspan="6">Barang tidak ditemukan</td></tr>';
    return;
  }

  body.innerHTML = searchResults.map((p, i) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${formatWeight(p.weight)}</td>
      <td>${p.stock}</td>
      <td>${formatRupiah(p.price)}</td>
      <td>${Number(p.discount)}%</td>
      <td><button class="btn-blue btn-sm" data-i="${i}">Pilih</button></td>
    </tr>`).join("");
}

function selectProduct(p) {
  if (!p) return;
  if (p.stock <= 0) {
    showToast("Stok barang habis");
    return;
  }
  selected = p;
  document.getElementById("pickName").textContent = p.name;
  document.getElementById("pickPrice").textContent = formatRupiah(p.price);
  document.getElementById("pickStock").textContent = p.stock;
  document.getElementById("pickQty").value = 1;
  document.getElementById("pickPanel").classList.remove("hidden");
}

function hidePick() {
  selected = null;
  document.getElementById("pickPanel").classList.add("hidden");
}

function addToCart() {
  if (!selected) return;

  const qty = parseInt(document.getElementById("pickQty").value, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    showToast("Qty harus berupa angka minimal 1");
    return;
  }

  // Barang yang sama digabung, stok dicek terhadap total qty di keranjang
  const existing = cart.find(c => c.idProduct === selected.idProduct);
  const totalQty = qty + (existing ? existing.qty : 0);
  if (totalQty > selected.stock) {
    showToast("Jumlah barang yang dimasukkan melebihi sisa stok.");
    return;
  }

  if (existing) {
    existing.qty = totalQty;
  } else {
    cart.push({
      idProduct: selected.idProduct,
      name: selected.name,
      price: selected.price,
      discount: selected.discount,
      qty
    });
  }

  clearSearch();
  renderCart();
}

function removeFromCart(i) {
  cart.splice(i, 1);
  renderCart();
}

function clearSearch() {
  document.getElementById("search").value = "";
  searchResults = [];
  document.getElementById("resultBox").classList.add("hidden");
  hidePick();
}

function renderCart() {
  document.getElementById("cartBody").innerHTML = cart.map((c, i) => `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${formatRupiah(c.price)}</td>
      <td>${Number(c.discount)}%</td>
      <td>${c.qty}</td>
      <td>${formatRupiah(lineTotal(c))}</td>
      <td><button class="btn-red btn-sm" data-i="${i}">Hapus</button></td>
    </tr>`).join("");

  const total = cart.reduce((sum, c) => sum + lineTotal(c), 0);
  document.getElementById("totalText").textContent = "Total: " + formatRupiah(total);
}

async function submitTransaction() {
  if (cart.length === 0) {
    showToast("Daftar belanjaan masih kosong");
    return;
  }

  const btn = document.getElementById("btnSubmit");
  btn.disabled = true;  
  try {
    const data = await apiPost("/transactions", {
      idPaymentMethod: Number(document.getElementById("payment").value),
      items: cart.map(c => ({ idProduct: c.idProduct, qty: c.qty }))
    });

    showToast("Transaksi berhasil: " + data.invoiceNo, "success");

    cart = [];
    clearSearch();
    renderCart();
    document.getElementById("payment").selectedIndex = 0;
    document.getElementById("invoiceNo").textContent = data.nextInvoiceNo;
  } catch (err) {
    showToast(err.message);
  } finally {
    btn.disabled = false;
  }
}