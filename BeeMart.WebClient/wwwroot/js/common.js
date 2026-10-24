const val = id => document.getElementById(id).value.trim();

function showToast(message, type = "error") {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.className = "show " + type;
  setTimeout(() => (t.className = ""), 3000);
}

async function apiPost(path, body) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Terjadi kesalahan");
  return data;
}

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