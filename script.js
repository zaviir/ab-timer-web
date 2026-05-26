const defaults = {
  moves: [
    "Hollow Body Crunches",
    "Straight-Leg Reverse Crunches",
    "Russian Twists",
    "V-Ups",
  ],
  work: 30,
  rest: 10,
  setRest: 60,
  ready: 10,
  sets: 3,
};

const STORAGE_KEY = "ab-timer-settings";

const state = {
  moves: [...defaults.moves],
  work: defaults.work,
  rest: defaults.rest,
  setRest: defaults.setRest,
  sets: defaults.sets,
  phaseIndex: 0,
  remaining: defaults.work,
  running: false,
  timerId: null,
  lastTick: 0,
  lastCountdownSecond: null,
};

const sound = {
  context: null,
};

const speech = {
  voice: null,
};

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    speech.voice = null;
    getSpeechVoice();
  };
}

const saved = loadSavedSettings();
if (saved) {
  state.moves = saved.moves;
  state.work = saved.work;
  state.rest = saved.rest;
  state.setRest = saved.setRest;
  state.sets = saved.sets;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}

async function registerServiceWorker() {
  try {
    let reloadQueued = false;
    const reloadForUpdate = () => {
      if (reloadQueued) return;
      reloadQueued = true;
      window.location.reload();
    };
    const activateWaitingWorker = (registration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    };

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      reloadForUpdate();
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "APP_UPDATED") {
        reloadForUpdate();
      }
    });

    const registration = await navigator.serviceWorker.register("./service-worker.js", {
      updateViaCache: "none",
    });
    await registration.update();
    activateWaitingWorker(registration);

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    window.addEventListener("focus", () => {
      registration.update().then(() => activateWaitingWorker(registration));
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        registration.update().then(() => activateWaitingWorker(registration));
      }
    });
  } catch {
    // The app still works when opened from file:// or a browser blocks registration.
  }
}

const els = {
  compactTotal: document.querySelector("#compactTotal"),
  tabButtons: document.querySelectorAll(".tab-button"),
  setCount: document.querySelector("#setCount"),
  workDuration: document.querySelector("#workDuration"),
  restDuration: document.querySelector("#restDuration"),
  setRestDuration: document.querySelector("#setRestDuration"),
  totalDuration: document.querySelector("#totalDuration"),
  totalBreakdown: document.querySelector("#totalBreakdown"),
  moveList: document.querySelector("#moveList"),
  phaseType: document.querySelector("#phaseType"),
  setLabel: document.querySelector("#setLabel"),
  timeDisplay: document.querySelector("#timeDisplay"),
  timeRing: document.querySelector("#timeRing"),
  nextLabel: document.querySelector("#nextLabel"),
  currentMove: document.querySelector("#currentMove"),
  elapsedTime: document.querySelector("#elapsedTime"),
  elapsedTotal: document.querySelector("#elapsedTotal"),
  upNext: document.querySelector("#upNext"),
  startPauseButton: document.querySelector("#startPauseButton"),
  skipButton: document.querySelector("#skipButton"),
  resetButton: document.querySelector("#resetButton"),
  restoreButton: document.querySelector("#restoreButton"),
  addMoveButton: document.querySelector("#addMoveButton"),
};

function setMobileView(view) {
  document.body.dataset.mobileView = view;
  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function buildPhases() {
  const phases = [
    {
      type: "ready",
      label: "Get Ready",
      duration: defaults.ready,
      set: 1,
      moveIndex: -1,
    },
  ];

  for (let set = 1; set <= state.sets; set += 1) {
    state.moves.forEach((move, index) => {
      phases.push({
        type: "work",
        label: move,
        duration: state.work,
        set,
        moveIndex: index,
      });

      const isLastMove = index === state.moves.length - 1;
      const isLastSet = set === state.sets;

      if (!isLastMove && state.rest > 0) {
        phases.push({
          type: "rest",
          label: "Rest",
          duration: state.rest,
          set,
          moveIndex: index,
        });
      }

      if (isLastMove && !isLastSet && state.setRest > 0) {
        phases.push({
          type: "set-rest",
          label: "Set Rest",
          duration: state.setRest,
          set,
          moveIndex: index,
        });
      }
    });
  }

  return phases;
}

function currentPhase() {
  const phases = buildPhases();
  return phases[Math.min(state.phaseIndex, phases.length - 1)];
}

function nextPhase() {
  return buildPhases()[state.phaseIndex + 1] || null;
}

function nextWorkPhase(fromIndex = state.phaseIndex) {
  return buildPhases()
    .slice(fromIndex + 1)
    .find((phase) => phase.type === "work");
}

function formatSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) return String(remainder);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function workoutTotals() {
  const phases = buildPhases();
  const totalSeconds = phases.reduce((total, phase) => total + phase.duration, 0);
  const completedSeconds = phases
    .slice(0, state.phaseIndex)
    .reduce((total, phase) => total + phase.duration, 0);
  const phaseElapsed = currentPhase() ? currentPhase().duration - state.remaining : 0;

  return {
    totalSeconds,
    elapsedSeconds: Math.max(0, Math.min(totalSeconds, completedSeconds + phaseElapsed)),
  };
}

function phaseName(phase) {
  if (!phase) return "Complete";
  if (phase.type === "ready") return "Ready";
  if (phase.type === "work") return "Work";
  if (phase.type === "set-rest") return "Set Rest";
  return "Rest";
}

function describeNext(phase) {
  if (!phase) return "Workout complete";
  if (phase.type === "work") return phase.label;
  if (phase.type === "ready") return `${phase.duration} sec countdown`;
  return `${phase.duration} sec ${phaseName(phase).toLowerCase()}`;
}

function syncSettingsFromInputs() {
  state.sets = clampNumber(els.setCount.value, 1, 12, defaults.sets);
  state.work = clampNumber(els.workDuration.value, 5, 180, defaults.work);
  state.rest = clampNumber(els.restDuration.value, 0, 90, defaults.rest);
  state.setRest = clampNumber(els.setRestDuration.value, 0, 300, defaults.setRest);
  saveSettings();
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function resetTimer(keepRunning = false) {
  clearInterval(state.timerId);
  syncSettingsFromInputs();
  state.phaseIndex = 0;
  state.remaining = currentPhase().duration;
  state.running = keepRunning;
  state.lastTick = performance.now();
  state.lastCountdownSecond = Math.ceil(state.remaining);

  if (keepRunning) {
    state.timerId = window.setInterval(tick, 250);
  }

  render();
}

function loadSavedSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || !Array.isArray(parsed.moves)) return null;
    const savedMoves = parsed.moves
      .filter((move) => typeof move === "string" && move.trim())
      .map((move) => move.trim());

    return {
      moves: savedMoves.length ? savedMoves : [...defaults.moves],
      work: clampNumber(parsed.work, 5, 180, defaults.work),
      rest: clampNumber(parsed.rest, 0, 90, defaults.rest),
      setRest: clampNumber(parsed.setRest, 0, 300, defaults.setRest),
      sets: clampNumber(parsed.sets, 1, 12, defaults.sets),
    };
  } catch {
    return null;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        moves: state.moves,
        work: state.work,
        rest: state.rest,
        setRest: state.setRest,
        sets: state.sets,
      }),
    );
  } catch {
    // The timer still works if browser storage is unavailable.
  }
}

function completePhase() {
  const phases = buildPhases();
  const nextIndex = state.phaseIndex + 1;

  if (nextIndex >= phases.length) {
    playCue("complete");
    announce("Workout done.");
    clearInterval(state.timerId);
    state.running = false;
    state.phaseIndex = phases.length - 1;
    state.remaining = 0;
    render(true);
    return;
  }

  state.phaseIndex = nextIndex;
  state.remaining = phases[nextIndex].duration;
  state.lastTick = performance.now();
  state.lastCountdownSecond = Math.ceil(state.remaining);
  playCue(phases[nextIndex].type);
  announcePhase(phases[nextIndex], nextWorkPhase(nextIndex));
  render();
}

function tick() {
  const now = performance.now();
  const elapsed = (now - state.lastTick) / 1000;
  state.lastTick = now;
  state.remaining -= elapsed;

  if (state.remaining <= 0) {
    completePhase();
    return;
  }

  playCountdownCue();
  render();
}

function playCountdownCue() {
  const phase = currentPhase();
  const wholeSecond = Math.ceil(state.remaining);

  if (phase?.type !== "ready" || wholeSecond > 3 || wholeSecond === state.lastCountdownSecond) {
    return;
  }

  state.lastCountdownSecond = wholeSecond;
  playCue(wholeSecond === 1 ? "countdown-final" : "countdown");
  announce(String(wholeSecond), { rate: 1.12, pitch: 0.92 });
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  sound.context ||= new AudioContext();
  if (sound.context.state === "suspended") {
    sound.context.resume();
  }
  return sound.context;
}

function playTone({ frequency, start = 0, duration = 0.16, type = "sine", volume = 0.15 }) {
  const context = getAudioContext();
  if (!context) return;

  const startsAt = context.currentTime + start;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.frequency.value = frequency;
  oscillator.type = type;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.04);
}

function playCue(name) {
  const cues = {
    countdown: [{ frequency: 740, duration: 0.08, type: "triangle", volume: 0.12 }],
    "countdown-final": [{ frequency: 980, duration: 0.14, type: "triangle", volume: 0.16 }],
    work: [
      { frequency: 523.25, duration: 0.12, type: "triangle", volume: 0.13 },
      { frequency: 659.25, start: 0.1, duration: 0.14, type: "triangle", volume: 0.13 },
      { frequency: 783.99, start: 0.2, duration: 0.18, type: "triangle", volume: 0.15 },
    ],
    rest: [
      { frequency: 587.33, duration: 0.12, type: "sine", volume: 0.12 },
      { frequency: 392, start: 0.12, duration: 0.2, type: "sine", volume: 0.13 },
    ],
    "set-rest": [
      { frequency: 440, duration: 0.11, type: "triangle", volume: 0.12 },
      { frequency: 349.23, start: 0.11, duration: 0.12, type: "triangle", volume: 0.12 },
      { frequency: 293.66, start: 0.22, duration: 0.22, type: "triangle", volume: 0.14 },
    ],
    complete: [
      { frequency: 523.25, duration: 0.12, type: "triangle", volume: 0.13 },
      { frequency: 659.25, start: 0.11, duration: 0.12, type: "triangle", volume: 0.13 },
      { frequency: 783.99, start: 0.22, duration: 0.12, type: "triangle", volume: 0.13 },
      { frequency: 1046.5, start: 0.34, duration: 0.36, type: "triangle", volume: 0.15 },
    ],
  };

  (cues[name] || cues.work).forEach(playTone);
}

function getSpeechVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  speech.voice ||=
    voices.find((voice) => voice.lang.startsWith("en") && /samantha|alex|daniel/i.test(voice.name)) ||
    voices.find((voice) => voice.lang.startsWith("en")) ||
    null;
  return speech.voice;
}

function prepareSpeech() {
  if (!("speechSynthesis" in window)) return;
  getSpeechVoice();
  window.speechSynthesis.resume();
}

function announce(text, options = {}) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = getSpeechVoice();
  utterance.volume = options.volume ?? 1;
  utterance.rate = options.rate ?? 0.94;
  utterance.pitch = options.pitch ?? 0.86;
  window.speechSynthesis.speak(utterance);
}

function announcePhase(phase, upcomingWork) {
  if (phase.type === "work") {
    announce("Go.", { rate: 0.95, pitch: 0.9 });
    return;
  }

  if (phase.type === "rest") {
    announce(`Rest. Next: ${upcomingWork?.label || "work"}.`, { rate: 0.92, pitch: 0.82 });
    return;
  }

  if (phase.type === "set-rest") {
    announce(`Set rest. Next: ${upcomingWork?.label || "work"}.`, { rate: 0.9, pitch: 0.82 });
  }
}

function render(done = false) {
  const phase = currentPhase();
  const next = nextPhase();
  const duration = phase?.duration || 1;
  const elapsedPercent = done ? 100 : ((duration - state.remaining) / duration) * 100;
  const activeMoveIndex = phase?.type === "work" ? phase.moveIndex : -1;
  const totals = workoutTotals();

  els.phaseType.textContent = done ? "Done" : phaseName(phase);
  els.setLabel.textContent = `Set ${Math.min(phase?.set || 1, state.sets)} of ${state.sets}`;
  els.timeDisplay.textContent = done ? "0" : formatSeconds(state.remaining);
  els.currentMove.textContent = done ? "Workout Complete" : phase.label;
  els.nextLabel.textContent = done ? "Nice work" : describeNext(phase);
  els.elapsedTime.textContent = formatDuration(done ? totals.totalSeconds : totals.elapsedSeconds);
  els.elapsedTotal.textContent = `/ ${formatDuration(totals.totalSeconds)}`;
  els.upNext.textContent = done ? "All sets finished" : `Next: ${describeNext(next)}`;
  els.timeRing.style.setProperty("--progress", Math.max(0, Math.min(100, elapsedPercent)));
  els.timeRing.classList.toggle("break", phase?.type === "rest");
  els.timeRing.classList.toggle("set-break", phase?.type === "set-rest");
  els.timeRing.classList.toggle("ready", phase?.type === "ready");
  els.startPauseButton.textContent = state.running ? "Pause" : done ? "Start Over" : "Start";
  els.startPauseButton.classList.toggle("running", state.running);
  renderWorkoutTotal();

  document.querySelectorAll(".move-card").forEach((card, index) => {
    card.classList.toggle("active", index === activeMoveIndex);
  });
}

function renderWorkoutTotal() {
  const { totalSeconds } = workoutTotals();
  const workSeconds = state.moves.length * state.work * state.sets;
  const restSeconds = Math.max(0, totalSeconds - workSeconds - defaults.ready);

  els.totalDuration.textContent = formatDuration(totalSeconds);
  els.totalBreakdown.textContent = `${formatDuration(workSeconds)} work, ${formatDuration(restSeconds)} rest`;
  els.compactTotal.textContent = `${formatDuration(totalSeconds)} total`;
}

function renderMoves() {
  els.moveList.innerHTML = "";

  state.moves.forEach((move, index) => {
    const item = document.createElement("li");
    item.className = "move-card";

    const number = document.createElement("span");
    number.className = "move-index";
    number.textContent = index + 1;

    const label = document.createElement("label");
    const labelText = document.createElement("span");
    const input = document.createElement("input");
    const removeButton = document.createElement("button");

    labelText.textContent = "Move";
    input.type = "text";
    input.value = move;
    input.addEventListener("input", () => {
      state.moves[index] = input.value.trim() || defaults.moves[index] || "Core Move";
      saveSettings();
      if (!state.running) resetTimer(false);
    });

    removeButton.className = "remove-move-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.disabled = state.moves.length === 1;
    removeButton.addEventListener("click", () => {
      if (state.moves.length === 1) return;
      state.moves.splice(index, 1);
      saveSettings();
      renderMoves();
      resetTimer(state.running);
    });

    label.append(labelText, input);
    item.append(number, label, removeButton);
    els.moveList.append(item);
  });
}

els.startPauseButton.addEventListener("click", () => {
  getAudioContext();
  prepareSpeech();
  const done = state.remaining <= 0 && state.phaseIndex === buildPhases().length - 1;
  if (done) {
    resetTimer(true);
    return;
  }

  state.running = !state.running;

  if (state.running) {
    syncSettingsFromInputs();
    state.lastTick = performance.now();
    state.timerId = window.setInterval(tick, 250);
    if (currentPhase()?.type === "ready" && Math.ceil(state.remaining) === defaults.ready) {
      announce(`Get ready. First: ${nextWorkPhase(-1)?.label || "work"}.`, {
        rate: 0.94,
        pitch: 0.88,
      });
    }
  } else {
    clearInterval(state.timerId);
  }

  render();
});

els.skipButton.addEventListener("click", () => {
  completePhase();
});

els.resetButton.addEventListener("click", () => {
  resetTimer(false);
});

els.tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMobileView(button.dataset.view);
  });
});

els.restoreButton.addEventListener("click", () => {
  state.moves = [...defaults.moves];
  els.setCount.value = defaults.sets;
  els.workDuration.value = defaults.work;
  els.restDuration.value = defaults.rest;
  els.setRestDuration.value = defaults.setRest;
  saveSettings();
  renderMoves();
  resetTimer(false);
});

els.addMoveButton.addEventListener("click", () => {
  state.moves.push(`Move ${state.moves.length + 1}`);
  saveSettings();
  renderMoves();
  resetTimer(state.running);
  const inputs = els.moveList.querySelectorAll("input");
  const newestInput = inputs[inputs.length - 1];
  newestInput?.focus();
  newestInput?.select();
});

[els.setCount, els.workDuration, els.restDuration, els.setRestDuration].forEach((input) => {
  input.addEventListener("change", () => resetTimer(state.running));
});

renderMoves();
els.setCount.value = state.sets;
els.workDuration.value = state.work;
els.restDuration.value = state.rest;
els.setRestDuration.value = state.setRest;
setMobileView("timer");
resetTimer(false);
