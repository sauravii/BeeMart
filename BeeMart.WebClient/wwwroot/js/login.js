document.getElementById("btnLogin").addEventListener("click", login);
document.addEventListener("keydown", e => { if (e.key === "Enter") login(); });

async function login() {
  const username = val("username");
  const password = document.getElementById("password").value;
  const role = val("role");

  if (!username || !password) {
    showToast("Username dan Password wajib diisi");
    return;
  }

  try {
    const data = await apiPost("/auth/login", { username, password, role });
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify({
      idUser: data.idUser, username: data.username,
      fullName: data.fullName, role: data.role
    }));
    window.location.href = "/Transaction";
  } catch (err) {
    showToast(err.message);
  }
}