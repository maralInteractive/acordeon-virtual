'use strict';

/* ==========================================================================
   1. Datos musicales
   ========================================================================== */

const NOTE_INDEX = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

const SOLFEGE = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

function noteFrequency(note, octave) {
  const midi = (octave + 1) * 12 + NOTE_INDEX[note];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Fila inferior de melodía (más cerca del cuerpo del acordeón)
const MELODY_LOWER = [
  { key: 'a', note: 'C', octave: 4 },
  { key: 's', note: 'D', octave: 4 },
  { key: 'd', note: 'E', octave: 4 },
  { key: 'f', note: 'F', octave: 4 },
  { key: 'g', note: 'G', octave: 4 },
  { key: 'h', note: 'A', octave: 4 },
  { key: 'j', note: 'B', octave: 4 },
  { key: 'k', note: 'C', octave: 5 },
  { key: 'l', note: 'D', octave: 5 },
];

// Fila superior: misma disposición, una octava más aguda
const MELODY_UPPER = [
  { key: 'q', note: 'C', octave: 5 },
  { key: 'w', note: 'D', octave: 5 },
  { key: 'e', note: 'E', octave: 5 },
  { key: 'r', note: 'F', octave: 5 },
  { key: 't', note: 'G', octave: 5 },
  { key: 'y', note: 'A', octave: 5 },
  { key: 'u', note: 'B', octave: 5 },
  { key: 'i', note: 'C', octave: 6 },
  { key: 'o', note: 'D', octave: 6 },
  { key: 'p', note: 'E', octave: 6 },
];

const BASS_NOTES = [
  { key: 'z', note: 'C', octave: 2 },
  { key: 'x', note: 'D', octave: 2 },
  { key: 'c', note: 'E', octave: 2 },
  { key: 'v', note: 'F', octave: 2 },
  { key: 'b', note: 'G', octave: 2 },
  { key: 'n', note: 'A', octave: 2 },
  { key: 'm', note: 'B', octave: 2 },
];

const CHORDS = [
  { key: '1', name: 'Do Mayor', notes: [['C', 3], ['E', 3], ['G', 3]] },
  { key: '2', name: 'Re menor', notes: [['D', 3], ['F', 3], ['A', 3]] },
  { key: '3', name: 'Mi menor', notes: [['E', 3], ['G', 3], ['B', 3]] },
  { key: '4', name: 'Fa Mayor', notes: [['F', 3], ['A', 3], ['C', 4]] },
  { key: '5', name: 'Sol Mayor', notes: [['G', 3], ['B', 3], ['D', 4]] },
  { key: '6', name: 'La menor', notes: [['A', 3], ['C', 4], ['E', 4]] },
  { key: '7', name: 'Si disminuido', notes: [['B', 3], ['D', 4], ['F', 4]] },
];

/* ==========================================================================
   2. Motor de audio (Web Audio API)
   ========================================================================== */

let audioCtx = null;
let masterGain = null;

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(volumeSlider.value);
  masterGain.connect(audioCtx.destination);
}

// Timbre de acordeón: dos osciladores en diente de sierra ligeramente
// desafinados entre sí (efecto "musette" de las lengüetas dobles),
// pasados por un filtro pasa-bajos y una envolvente de ataque rápido.
function startReed(frequency) {
  const now = audioCtx.currentTime;

  const oscA = audioCtx.createOscillator();
  oscA.type = 'sawtooth';
  oscA.frequency.setValueAtTime(frequency, now);

  const oscB = audioCtx.createOscillator();
  oscB.type = 'sawtooth';
  oscB.frequency.setValueAtTime(frequency * Math.pow(2, 8 / 1200), now);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(frequency * 6, 3800), now);
  filter.Q.value = 0.6;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.24, now + 0.018);
  gain.gain.linearRampToValueAtTime(0.17, now + 0.14);

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  oscA.start(now);
  oscB.start(now);

  return {
    stop() {
      const t = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.16);
      oscA.stop(t + 0.2);
      oscB.stop(t + 0.2);
    },
  };
}

function startVoice(frequencies) {
  const reeds = frequencies.map(startReed);
  return { stop: () => reeds.forEach((r) => r.stop()) };
}

/* ==========================================================================
   3. Estado de reproducción
   ========================================================================== */

const activeVoices = new Map();  // id -> { stop }
const activePointers = new Map(); // pointerId -> id | null
let octaveShift = 0; // en octavas completas, aplicado a todas las notas

function currentFactor() {
  return Math.pow(2, octaveShift);
}

function pressStart(id, baseFrequencies, el) {
  if (activeVoices.has(id)) return;
  initAudio();
  const factor = currentFactor();
  const voice = startVoice(baseFrequencies.map((f) => f * factor));
  activeVoices.set(id, voice);
  if (el) {
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');
  }
  updateBellows();
}

function pressEnd(id) {
  const voice = activeVoices.get(id);
  if (!voice) return;
  voice.stop();
  activeVoices.delete(id);
  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (el) {
    el.classList.remove('active');
    el.setAttribute('aria-pressed', 'false');
  }
  updateBellows();
}

function panic() {
  activeVoices.forEach((voice) => voice.stop());
  activeVoices.clear();
  activePointers.clear();
  document.querySelectorAll('.key.active').forEach((el) => {
    el.classList.remove('active');
    el.setAttribute('aria-pressed', 'false');
  });
  updateBellows();
}

/* ==========================================================================
   4. Fuelle: retroalimentación visual del número de notas activas
   ========================================================================== */

const bellowsEl = document.getElementById('bellows');

function updateBellows() {
  const count = activeVoices.size;
  const openness = Math.min(1, 0.25 + count / 8);
  document.documentElement.style.setProperty('--bellows-open', openness.toFixed(2));
  bellowsEl.classList.toggle('playing', count > 0);
}

/* ==========================================================================
   5. Construcción de los botones
   ========================================================================== */

const KEY_MAP = new Map(); // tecla física -> { id, frequencies, el }

function makeKeyButton({ container, id, physicalKey, hint, label, frequencies, className }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `key ${className}`;
  button.dataset.id = id;
  button.dataset.freqs = JSON.stringify(frequencies);
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', label);

  const hintEl = document.createElement('span');
  hintEl.className = 'key__hint';
  hintEl.textContent = hint;
  const labelEl = document.createElement('span');
  labelEl.className = 'key__label';
  labelEl.textContent = physicalKey.toUpperCase();

  button.append(hintEl, labelEl);
  container.appendChild(button);

  if (physicalKey) {
    KEY_MAP.set(physicalKey, { id, frequencies });
  }

  registerPointerHandlers(button, id, frequencies);
  return button;
}

function buildMelodyRow(container, defs) {
  defs.forEach((def) => {
    const freq = noteFrequency(def.note, def.octave);
    const id = `melody-${def.key}`;
    makeKeyButton({
      container,
      id,
      physicalKey: def.key,
      hint: SOLFEGE[def.note],
      label: `Nota ${SOLFEGE[def.note]} octava ${def.octave}, tecla ${def.key.toUpperCase()}`,
      frequencies: [freq],
      className: 'key--melody',
    });
  });
}

function buildBassRow(container, defs) {
  defs.forEach((def) => {
    const freq = noteFrequency(def.note, def.octave);
    const id = `bass-${def.key}`;
    makeKeyButton({
      container,
      id,
      physicalKey: def.key,
      hint: SOLFEGE[def.note],
      label: `Bajo ${SOLFEGE[def.note]}, tecla ${def.key.toUpperCase()}`,
      frequencies: [freq],
      className: 'key--bass',
    });
  });
}

function buildChordRow(container, defs) {
  defs.forEach((def) => {
    const frequencies = def.notes.map(([note, octave]) => noteFrequency(note, octave));
    const id = `chord-${def.key}`;
    makeKeyButton({
      container,
      id,
      physicalKey: def.key,
      hint: def.name.split(' ')[0],
      label: `Acorde de ${def.name}, tecla ${def.key}`,
      frequencies,
      className: 'key--bass key--chord',
    });
  });
}

buildChordRow(document.getElementById('row-chords'), CHORDS);
buildBassRow(document.getElementById('row-bass'), BASS_NOTES);
buildMelodyRow(document.getElementById('row-upper'), MELODY_UPPER);
buildMelodyRow(document.getElementById('row-lower'), MELODY_LOWER);

/* ==========================================================================
   6. Eventos de puntero (mouse, táctil y lápiz, con deslizamiento)
   ========================================================================== */

function registerPointerHandlers(button, id, frequencies) {
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    try { button.releasePointerCapture(e.pointerId); } catch (err) { /* no-op */ }
    activePointers.set(e.pointerId, id);
    pressStart(id, frequencies, button);
  });
}

window.addEventListener('pointermove', (e) => {
  if (!activePointers.has(e.pointerId)) return;
  const oldId = activePointers.get(e.pointerId);
  const elUnder = document.elementFromPoint(e.clientX, e.clientY);
  const keyEl = elUnder ? elUnder.closest('.key') : null;
  const newId = keyEl ? keyEl.dataset.id : null;

  if (newId === oldId) return;

  if (oldId) pressEnd(oldId);
  if (newId && keyEl) {
    const frequencies = JSON.parse(keyEl.dataset.freqs);
    pressStart(newId, frequencies, keyEl);
  }
  activePointers.set(e.pointerId, newId);
}, { passive: true });

function releasePointer(e) {
  if (!activePointers.has(e.pointerId)) return;
  const id = activePointers.get(e.pointerId);
  if (id) pressEnd(id);
  activePointers.delete(e.pointerId);
}

window.addEventListener('pointerup', releasePointer);
window.addEventListener('pointercancel', releasePointer);

/* ==========================================================================
   7. Teclado físico
   ========================================================================== */

const heldKeys = new Set();

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  const entry = KEY_MAP.get(k);
  if (!entry) return;
  e.preventDefault();
  heldKeys.add(k);
  const el = document.querySelector(`[data-id="${CSS.escape(entry.id)}"]`);
  pressStart(entry.id, entry.frequencies, el);
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  const entry = KEY_MAP.get(k);
  if (!entry) return;
  heldKeys.delete(k);
  pressEnd(entry.id);
});

window.addEventListener('blur', panic);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) panic();
});

/* ==========================================================================
   8. Controles: volumen, octava, silenciar todo
   ========================================================================== */

const volumeSlider = document.getElementById('volume');
volumeSlider.addEventListener('input', () => {
  if (masterGain) masterGain.gain.value = parseFloat(volumeSlider.value);
});

const octaveValueEl = document.getElementById('octave-value');
document.getElementById('octave-down').addEventListener('click', () => {
  octaveShift = Math.max(-2, octaveShift - 1);
  octaveValueEl.textContent = octaveShift;
});
document.getElementById('octave-up').addEventListener('click', () => {
  octaveShift = Math.min(2, octaveShift + 1);
  octaveValueEl.textContent = octaveShift;
});

document.getElementById('panic').addEventListener('click', panic);

/* ==========================================================================
   9. Leyenda de teclado (generada desde los mismos datos)
   ========================================================================== */

function fillLegendTable(tableEl, defs, labelFn) {
  defs.forEach((def) => {
    const row = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.textContent = def.key.toUpperCase();
    const tdLabel = document.createElement('td');
    tdLabel.textContent = labelFn(def);
    row.append(tdKey, tdLabel);
    tableEl.appendChild(row);
  });
}

fillLegendTable(
  document.getElementById('legend-upper'),
  MELODY_UPPER,
  (d) => `${SOLFEGE[d.note]} ${d.octave}`
);
fillLegendTable(
  document.getElementById('legend-lower'),
  MELODY_LOWER,
  (d) => `${SOLFEGE[d.note]} ${d.octave}`
);
fillLegendTable(
  document.getElementById('legend-bass'),
  BASS_NOTES,
  (d) => `${SOLFEGE[d.note]} ${d.octave}`
);
fillLegendTable(
  document.getElementById('legend-chords'),
  CHORDS,
  (d) => d.name
);
