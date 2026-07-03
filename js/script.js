// ================================================================
// script.js – Lógica principal de Piura Tours
// ================================================================

const API_URL = "http://127.0.0.1:3000/api"; // ¡Asegúrate de que coincida con tu puerto!

// Mapeo de IDs de destino a nombres de archivo HTML
const MAPA_DESTINOS = {
  1: "destino-colan.html",
  2: "destino.peroles.html",
  3: "destino-manglares.html",
  4: "destino-sechura.html",
  5: "destino-tortugas.html",
  6: "destino-caracucho.html",
};

// ==================== AUTENTICACIÓN ====================
const token = localStorage.getItem("token");
const userData = JSON.parse(localStorage.getItem("user") || "null");

function actualizarUIUsuario() {
  const authLinks = document.getElementById("auth-links");
  const userInfo = document.getElementById("user-info");
  const userNameSpan = document.getElementById("user-name");
  if (token && userData) {
    authLinks.style.display = "none";
    userInfo.style.display = "flex";
    userNameSpan.textContent = userData.nombre;
  } else {
    authLinks.style.display = "flex";
    userInfo.style.display = "none";
  }
}

// Cerrar sesión
document.addEventListener("click", function (e) {
  if (e.target.id === "logout-link") {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    actualizarUIUsuario();
    window.location.href = "login.html";
  }
});

// ==================== LOGIN / REGISTRO ====================
if (window.location.pathname.includes("login.html")) {
  const loginForm = document.getElementById("login-form");
  const registroForm = document.getElementById("registro-form");
  const loginError = document.getElementById("login-error");
  const registroError = document.getElementById("registro-error");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      const tab = this.dataset.tab;
      loginForm.style.display = tab === "login" ? "block" : "none";
      registroForm.style.display = tab === "registro" ? "block" : "none";
    });
  });

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    loginError.textContent = "";
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error en login");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "index.html";
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  registroForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const nombre = document.getElementById("reg-nombre").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    registroError.textContent = "";
    try {
      const response = await fetch(`${API_URL}/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error en registro");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "index.html";
    } catch (error) {
      registroError.textContent = error.message;
    }
  });
}

// ==================== DESTINOS ====================
async function cargarDestinos() {
  try {
    const response = await fetch(`${API_URL}/destinos`);
    if (!response.ok) throw new Error("Error al cargar destinos");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

function renderizarTarjetas(destinos) {
  const container = document.getElementById("cards-container");
  if (!container) {
    console.error("No se encontró #cards-container");
    return;
  }
  container.innerHTML = "";
  destinos.forEach((d) => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = d.id;
    card.innerHTML = `
      <div class="card-image">
        <img src="${d.imagen_fondo || "../img/default.jpg"}" alt="${d.nombre}">
        <span class="badge">${d.badge || ""}</span>
      </div>
      <div class="card-content">
        <h3>${d.nombre}</h3>
        <p>${d.descripcion ? d.descripcion.substring(0, 80) + "..." : "Sin descripción"}</p>
        <p class="location"><span class="highlight">Ubicación:</span> ${d.ubicacion || "No especificada"}</p>
        <hr class="gradient-line">
        <p class="slogan">✨ ${d.slogan || ""} ✨</p>
      </div>
    `;
    card.addEventListener("click", function () {
      this.style.transition = "transform 0.3s, opacity 0.3s";
      this.style.transform = "scale(0.9)";
      this.style.opacity = "0";
      setTimeout(() => {
        const destinoPage = MAPA_DESTINOS[d.id];
        if (destinoPage) {
          window.location.href = destinoPage;
        } else {
          window.location.href = `destino.html?id=${d.id}`;
        }
      }, 300);
    });
    container.appendChild(card);
  });
}

// ==================== BÚSQUEDA ====================
let destinosGlobal = [];
let ultimaBusqueda = "";

async function initIndex() {
  actualizarUIUsuario();
  const container = document.getElementById("cards-container");
  if (!container) {
    console.error("No se encontró #cards-container");
    return;
  }

  container.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
      <div style="font-size:2rem; animation: spin 1s linear infinite;">⏳</div>
      <p>Cargando destinos...</p>
    </div>
  `;

  try {
    const destinos = await cargarDestinos();
    destinosGlobal = destinos;
    renderizarTarjetas(destinos);
  } catch (error) {
    console.error("Error al cargar destinos:", error);
    container.innerHTML = `
      <p style="color: #f87171; text-align:center; grid-column:1/-1; padding:2rem;">
        ❌ No se pudieron cargar los destinos.
        <br><button onclick="initIndex()" style="margin-top:1rem; padding:0.5rem 1.5rem; background:#ff7e5f; border:none; border-radius:8px; color:#fff; cursor:pointer; font-weight:600;">Reintentar</button>
      </p>
    `;
    return;
  }

  // Configurar búsqueda
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    newInput.addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();
      ultimaBusqueda = query;
      const filtrados = destinosGlobal.filter(
        (d) =>
          d.nombre.toLowerCase().includes(query) ||
          (d.descripcion && d.descripcion.toLowerCase().includes(query)),
      );
      renderizarTarjetas(filtrados);
      mostrarMensajeNoResultados(filtrados, query);
    });
  }

  // Configurar ordenamiento
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    const newSort = sortSelect.cloneNode(true);
    sortSelect.parentNode.replaceChild(newSort, sortSelect);
    newSort.addEventListener("change", function () {
      const criterio = this.value;
      let base = destinosGlobal;
      if (ultimaBusqueda.length > 0) {
        base = destinosGlobal.filter(
          (d) =>
            d.nombre.toLowerCase().includes(ultimaBusqueda) ||
            (d.descripcion &&
              d.descripcion.toLowerCase().includes(ultimaBusqueda)),
        );
      }
      const copia = [...base];
      if (criterio === "nombre") {
        copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
      } else if (criterio === "ubicacion") {
        copia.sort((a, b) =>
          (a.ubicacion || "").localeCompare(b.ubicacion || ""),
        );
      }
      renderizarTarjetas(copia);
      mostrarMensajeNoResultados(copia, ultimaBusqueda);
    });
  }
}

function mostrarMensajeNoResultados(destinos, query) {
  const container = document.getElementById("cards-container");
  if (!container) return;
  let msg = document.getElementById("no-resultados");
  if (destinos.length === 0 && query.length > 0) {
    if (!msg) {
      msg = document.createElement("div");
      msg.id = "no-resultados";
      msg.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-muted);
        background: rgba(255,255,255,0.03);
        border-radius: 24px;
        border: 2px dashed rgba(255,255,255,0.15);
        backdrop-filter: blur(4px);
        animation: fadeInUp 0.5s ease;
      `;
      container.appendChild(msg);
    }
    msg.innerHTML = `
      <p style="font-size:1.3rem; margin-bottom:0.5rem;">
        🔍 No encontramos destinos para "<strong style="color:#ff7e5f;">${query}</strong>"
      </p>
      <p style="margin-bottom:1.5rem;">¿Quieres sugerir un nuevo lugar turístico?</p>
      <a href="sugerir.html" class="btn" style="display:inline-block; padding:0.8rem 2rem; background: linear-gradient(135deg, #ff7e5f, #feb47b);">
        ✏️ Sugerir destino
      </a>
    `;
    msg.style.display = "block";
  } else {
    if (msg) msg.style.display = "none";
  }
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", function () {
  const path = window.location.pathname;
  if (path.includes("index.html") || path === "/" || path === "") {
    initIndex();
  } else if (
    path.includes("destino-") ||
    path.includes("destino.peroles.html")
  ) {
    const id = obtenerIdDesdeNombreArchivo();
    if (id) cargarDestinoPorId(id);
    actualizarUIUsuario();
  } else if (path.includes("login.html")) {
    // la lógica ya está arriba
  } else if (path.includes("sugerir.html")) {
    actualizarUIUsuario();
  } else if (path.includes("destino.html")) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) cargarDestinoPorId(parseInt(id));
    actualizarUIUsuario();
  }
});
