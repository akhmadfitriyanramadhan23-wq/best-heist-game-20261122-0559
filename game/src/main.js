// Velvet Vault — boot, the fixed-step loop and the screens. The simulation
// always advances in 1/60 s steps whatever the display rate. With ?shot= in
// the URL the game stages that screenshot scene from the seed and freezes
// the frame for the camera; otherwise it is the playable game.
import { FIELD } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { drawWorld } from './render.js';
import { runShot, SHOT_NAMES } from './shots.js';
import {
  EVENT_CAUGHT,
  EVENT_LOOT,
  EVENT_OVER,
  EVENT_ROOM,
  EVENT_SPOTTED,
  EVENT_WIN,
  PHASE_OVER,
  PHASE_PLAY,
  PHASE_TITLE,
  PHASE_WIN,
  createWorld,
} from './world.js';

const DT = 1 / 60;
const BEST_KEY = 'velvet-vault.best';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || 1;
const shot = params.get('shot');

const audio = createAudio();
const { input, consumeEdges } = createInput(canvas);

let best = 0;
try {
  best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
} catch {
  best = 0;
}

function saveBest(score) {
  if (score <= best) return;
  best = score;
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode: the best score just does not persist.
  }
}

// Fit the 1280x720 field into the window without stretching it.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - FIELD.width * scale) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - FIELD.height * scale) / 2)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

// --- screenshot mode: stage the scene from the seed, then hold the frame ---
if (shot !== null && SHOT_NAMES.includes(shot)) {
  const { world } = runShot(shot, seed);
  document.title = `Velvet Vault — ${shot}`;
  announce(`Velvet Vault screenshot: ${shot}`);
  const render = () => {
    drawWorld(ctx, world.state, { best });
    window.requestAnimationFrame(render);
  };
  render();
} else {
  // --- the playable game ---
  const world = createWorld(seed);
  const IDLE = { moveX: 0, moveY: 0, sneak: false, crack: false };
  let paused = false;
  let prevSpotted = false;
  let lastPhase = world.state.phase;
  let accumulator = 0;
  let lastTime = performance.now();

  function react(events) {
    if (events & EVENT_SPOTTED && !prevSpotted) audio.spotted();
    prevSpotted = !!(events & EVENT_SPOTTED);
    if (events & EVENT_LOOT) audio.loot();
    if (events & EVENT_CAUGHT) audio.caught();
    if (events & EVENT_ROOM) audio.roomClear();
    if (events & EVENT_WIN) {
      audio.win();
      saveBest(world.state.score);
    }
    if (events & EVENT_OVER) {
      audio.over();
      saveBest(world.state.score);
    }
    const phase = world.state.phase;
    if (phase !== lastPhase) {
      lastPhase = phase;
      if (phase === PHASE_PLAY) announce('Playing Velvet Vault.');
      else if (phase === PHASE_OVER) announce(`Game over. Score ${world.state.score}.`);
      else if (phase === PHASE_WIN) announce(`The getaway! Score ${world.state.score}, rating ${world.state.rating}.`);
    }
  }

  function frame(now) {
    const elapsed = Math.min(0.25, (now - lastTime) / 1000);
    lastTime = now;
    audio.setMuted(input.muted);

    if (input.pausePressed && world.state.phase === PHASE_PLAY) {
      paused = !paused;
      audio.click();
    }
    if (input.startPressed) {
      audio.unlock();
      if (world.state.phase === PHASE_TITLE) {
        world.startGame();
        audio.click();
        announce('Playing Velvet Vault.');
      }
    }
    if (input.restartPressed) {
      audio.unlock();
      if (world.state.phase === PHASE_OVER || world.state.phase === PHASE_WIN || world.state.phase === PHASE_PLAY) {
        world.startGame();
        paused = false;
        audio.click();
      }
    }

    if (!paused) {
      accumulator += elapsed;
      while (accumulator >= DT) {
        accumulator -= DT;
        let events = 0;
        if (world.state.phase === PHASE_TITLE) {
          events = world.step(DT, IDLE, true);
        } else {
          events = world.step(DT, input);
          consumeEdges();
        }
        react(events);
      }
    } else {
      consumeEdges();
    }

    drawWorld(ctx, world.state, { best, paused });
    window.requestAnimationFrame(frame);
  }

  announce('Velvet Vault. Press Enter to begin.');
  window.requestAnimationFrame(frame);
}
