import { supabase } from "../../public/db/supabase.js";
import { startTimer } from "./timer.js";

const $body = document.getElementById("pp-body");
const $btn  = document.getElementById("pp-buzz");
const $hint = document.getElementById("pp-hint");

const esc = (s) =>
  (s ?? "").toString().replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[m]));

// 🔹 Render marcador
function renderMarcador(list = []) {
  if (!Array.isArray(list) || list.length === 0) {
    $body.innerHTML = `<tr><td class="empty" colspan="2">Sin jugadores aún.</td></tr>`;
    return;
  }
  $body.innerHTML = list.map((r) => `
    <tr>
      <td>${esc(r.jugador).toUpperCase() || "—"}</td>
      <td>${Number.isFinite(r.puntos) ? r.puntos : 0}</td>
    </tr>
  `).join("");
}

async function loadMarcador() {
  const { data, error } = await supabase
    .from("marcador")
    .select("jugador, puntos")
    .order("puntos", { ascending: false })
    .order("jugador", { ascending: true });

  if (error) {
    console.error(error);
    $body.innerHTML = `<tr><td class="empty" colspan="2">Error cargando el marcador.</td></tr>`;
    return;
  }
  renderMarcador(data || []);
}

// 🔹 Pulsar botón
$btn?.addEventListener("click", async () => {
  $btn.disabled = true;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    $hint.textContent = "Inicia sesión para poder pulsar.";
    $btn.disabled = false;
    return;
  }

  const nombre = user.user_metadata?.name || user.email?.split("@")[0] || "Jugador";

  const { data: row, error } = await supabase
    .from("pulsador")
    .select("id, activado")
    .eq("usuario", nombre)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error(error);
    $hint.textContent = "No se pudo comprobar tu estado.";
    $btn.disabled = false;
    return;
  }

  try {
    if (row) {
      if (row.activado) {
        $hint.textContent = "Ya has pulsado.";
      } else {
        await supabase.from("pulsador").update({ activado: true }).eq("id", row.id);
        $hint.textContent = "¡Hecho!";
      }
    } else {
      await supabase.from("pulsador").insert({
        usuario: nombre,
        activado: true,
        rol: "user",
        created_at: new Date().toISOString()
      });
      $hint.textContent = "¡Hecho!";
    }
    // 🔥 Arrancar temporizador en todos los clientes
    startTimer();
  } finally {
    $btn.disabled = false;
  }
});

// 🔹 Inicial + realtime
await loadMarcador();
const chMarcador = supabase
  .channel("marcador-live")
  .on("postgres_changes", { event: "*", schema: "public", table: "marcador" }, loadMarcador)
  .subscribe();

window.addEventListener("beforeunload", () => {
  supabase.removeChannel?.(chMarcador);
});
