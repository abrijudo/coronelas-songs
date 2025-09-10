import { supabase } from "../db/supabase.js";
import { startTimer, stopTimerUI } from "./timer.js";

const $listOn   = document.getElementById("listOn");
const $listOff  = document.getElementById("listOff");
const $countOn  = document.getElementById("countOn");
const $countOff = document.getElementById("countOff");
const $resetBtn = document.getElementById("resetBtn");
const $resultBtns = document.getElementById("resultBtns");
const $btnAcierto = document.getElementById("btnAcierto");
const $btnFallado = document.getElementById("btnFallado");

let jugadoresActivos = [];
let jugadorActual = null;

// 🔹 Función para sumar/restar puntos en "marcador"
async function cambiarPuntosJugador(nombre, delta) {
  if (!nombre) return;
  const { data: row } = await supabase
    .from("marcador")
    .select("id, puntos")
    .eq("jugador", nombre)
    .maybeSingle();

  if (row) {
    const nuevo = (row.puntos ?? 0) + delta;
    await supabase.from("marcador").update({ puntos: nuevo }).eq("id", row.id);
  } else {
    await supabase.from("marcador").insert({
      jugador: nombre,
      puntos: delta,
      created_at: new Date().toISOString()
    });
  }
}

// 🔹 Funciones de control
async function marcarAcierto() {
  if (!jugadorActual) return;
  await cambiarPuntosJugador(jugadorActual, +1);
  await supabase.from("pulsador").update({ activado: false }).not("id", "is", null);
  stopTimerUI();
  $resultBtns?.classList.add("hidden");
  jugadorActual = null;
}

async function marcarFallado() {
  if (!jugadorActual) return;
  await cambiarPuntosJugador(jugadorActual, -1);
  await supabase.from("pulsador").update({ activado: false }).eq("usuario", jugadorActual);
  stopTimerUI();
  $resultBtns?.classList.add("hidden");
  jugadorActual = null;
}

async function resetear() {
  stopTimerUI();
  jugadoresActivos = [];
  jugadorActual = null;
  $resultBtns?.classList.add("hidden");
  await supabase.from("pulsador").update({ activado: false }).not("id", "is", null);
}

// 🔹 Render de jugadores
async function cargar() {
  const { data, error } = await supabase
    .from("pulsador")
    .select("usuario, activado, created_at")
    .order("created_at", { ascending: true });

  if (error) return console.error(error);

  let on = 0, off = 0;
  $listOn.innerHTML = "";
  $listOff.innerHTML = "";
  const nuevaCola = [];

  (data || []).forEach(r => {
    const p = document.createElement("p");
    p.textContent = r.usuario ?? "(sin nombre)";
    if (r.activado) {
      $listOn.appendChild(p); on++;
      nuevaCola.push(r.usuario);
    } else {
      $listOff.appendChild(p); off++;
    }
  });

  $countOn.textContent = String(on);
  $countOff.textContent = String(off);

  if (!jugadorActual && nuevaCola.length > 0) {
    jugadorActual = nuevaCola[0];
    startTimer();
  }
}

// 🔹 Eventos
$resetBtn?.addEventListener("click", resetear);
$btnAcierto?.addEventListener("click", marcarAcierto);
$btnFallado?.addEventListener("click", marcarFallado);

// 🔹 Inicial + realtime
cargar();
const ch = supabase
  .channel("pulsador-live")
  .on("postgres_changes", { event: "*", schema: "public", table: "pulsador" }, cargar)
  .subscribe();

window.addEventListener("beforeunload", () => supabase.removeChannel?.(ch));
