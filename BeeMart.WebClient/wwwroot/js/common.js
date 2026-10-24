const val = id => document.getElementById(id).value.trim();

const formatRupiah = n =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const escapeHtml = s =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function showToast(message, type = "error") {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.className = "show " + type;
  setTimeout(() => (t.className = ""), 3000);
}

async function apiRequest(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = sessionStorage.getItem("token");
  if (token) headers["Authorization"] = "Bearer " + token;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server");
  }

  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    logout();
    throw new Error("Sesi berakhir, silakan login kembali");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Terjadi kesalahan");
  return data;
}

const apiGet = path => apiRequest("GET", path);
const apiPost = (path, body) => apiRequest("POST", path, body);

function getUser() {
  try { return JSON.parse(sessionStorage.getItem("user")); }
  catch { return null; }
}

function requireLogin() {
  const user = getUser();
  if (!user || !sessionStorage.getItem("token")) {
    window.location.href = "/Account/Login";
    return null;
  }
  return user;
}

function logout() {
  sessionStorage.clear();
  window.location.href = "/Account/Login";
}