document.getElementById("btnRegister").addEventListener("click", register);

async function register() {
  const body = {
    username: val("username"),
    fullName: val("fullName"),
    password: document.getElementById("password").value,
    rePassword: document.getElementById("rePassword").value,
    role: val("role")
  };

  if (!body.username || !body.fullName || !body.password || !body.rePassword) {
    showToast("Username, Full Name, Password & Re-Password harus diisi");
    return;
  }
  if (body.password !== body.rePassword) {
    showToast("Password dan Re-Password tidak sama");
    return;
  }

  try {
    const data = await apiPost("/auth/register", body);
    showToast(data.message, "success");
    setTimeout(() => (window.location.href = "/Account/Login"), 1200);
  } catch (err) {
    showToast(err.message);
  }
}