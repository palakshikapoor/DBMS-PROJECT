document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.getElementById("loginMessage");
  message.textContent = "";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed.");
    window.location.href = "/admin";
  } catch (error) {
    message.textContent = error.message;
  }
});
