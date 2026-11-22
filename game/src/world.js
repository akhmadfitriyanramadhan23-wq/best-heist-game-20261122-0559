// Velvet Vault — the rules and state. No drawing and no browser in here:
// step() advances one fixed step and returns event flags, so the caller can
// react (sounds, screens) without the world knowing about them. Guards
// patrol, investigate noises and chase what they see; cameras sweep; the
// alarm rises while anyone sees the thief and falls while nobody does.
import {
  ALARM,
  CAMERA,
  CAUGHT_PAUSE,
  CRACK_RANGE,
  CRACK_TIME,
  FIELD,
  GUARD,
  LIVES,
  PLAYER,
  ROOM_SPEED,
  SCORE,
  TOOLS,
} from './config.js';
import {
  angleDiff,
  circleHitsRect,
  inCone,
  losClear,
  moveCircle,
  smokeBlocks,
} from './geometry.js';
import { LEVELS } from './levels.js';
import { makeRandom } from './random.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_CAUGHT = 'caught';
export const PHASE_OVER = 'over';
export const PHASE_WIN = 'win';

export const EVENT_LOOT = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_ROOM = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_SPOTTED = 32;

export function ratingFor(catches) {
  if (catches === 0) return 'GHOST';
  if (catches === 1) return 'SHADOW';
  return 'LOUD, BUT RICH';
}

export function createWorld(seed = 1) {
  const random = makeRandom(seed);
  const state = {
    roomIndex: 0,
    level: LEVELS[0],
    phase: PHASE_TITLE,
    player: {
      x: PLAYER.spawn.x,
      y: PLAYER.spawn.y,
      angle: -Math.PI / 2,
      sneaking: false,
      grace: 0,
      moving: false,
    },
    guards: [],
    cameras: [],
    loot: [],
    smoke: [],
    coins: [],
    tools: { smoke: TOOLS.smokeStart, coin: TOOLS.coinStart, emp: TOOLS.empStart },
    empTimer: 0,
    alarm: 0,
    lives: LIVES,
    catches: 0,
    score: 0,
    lootValue: 0,
    time: 0,
    exitOpen: false,
    cracking: null,
    caughtTimer: 0,
    spotted: false,
    message: '',
    messageTimer: 0,
    rating: '',
    seed,
  };

  // Solids are walls plus cover: both block movement and sight.
  function solids() {
    return state.level.walls.concat(state.level.cover);
  }

  function loadRoom(index) {
    const level = LEVELS[index];
    state.roomIndex = index;
    state.level = level;
    state.player.x = PLAYER.spawn.x;
    state.player.y = PLAYER.spawn.y;
    state.player.angle = -Math.PI / 2;
    state.player.grace = 0;
    state.guards = level.guards.map((g) => {
      const start = random.int(g.waypoints.length);
      const [sx, sy] = g.waypoints[start];
      const [nx, ny] = g.waypoints[(start + 1) % g.waypoints.length];
      return {
        name: g.name,
        waypoints: g.waypoints,
        x: sx,
        y: sy,
        angle: Math.atan2(ny - sy, nx - sx),
        mode: 'patrol',
        wp: (start + 1) % g.waypoints.length,
        targetX: nx,
        targetY: ny,
        wait: 0,
        chaseLost: 0,
        lastSeenX: sx,
        lastSeenY: sy,
        visited: new Set([start]),
        speedMul: ROOM_SPEED[index],
      };
    });
    state.cameras = level.cameras.map((c) => ({
      x: c.x,
      y: c.y,
      baseAngle: c.angle,
      angle: c.angle,
      phase: random.next() * Math.PI * 2,
    }));
    state.loot = level.loot.map((l) => ({ ...l, taken: false }));
    state.smoke = [];
    state.coins = [];
    state.exitOpen = false;
    state.cracking = null;
    state.caughtTimer = 0;
  }

  function reset() {
    state.tools = { smoke: TOOLS.smokeStart, coin: TOOLS.coinStart, emp: TOOLS.empStart };
    state.empTimer = 0;
    state.alarm = 0;
    state.lives = LIVES;
    state.catches = 0;
    state.score = 0;
    state.lootValue = 0;
    state.time = 0;
    state.message = '';
    state.messageTimer = 0;
    state.rating = '';
    state.phase = PHASE_TITLE;
    loadRoom(0);
  }

  function startGame() {
    reset();
    state.phase = PHASE_PLAY;
  }

  // Move a guard toward (tx, ty) at `speed`, sliding along solids. Returns
  // true when it arrives (within 6 px).
  function moveGuard(g, tx, ty, speed, dt) {
    const dx = tx - g.x;
    const dy = ty - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) return true;
    const step = Math.min(d, speed * dt);
    const moved = moveCircle(g.x, g.y, GUARD.radius, (dx / d) * step, (dy / d) * step, solids());
    g.x = moved.x;
    g.y = moved.y;
    g.angle = Math.atan2(dy, dx);
    return d - step < 6;
  }

  function nearestWaypointIndex(g) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < g.waypoints.length; i++) {
      const [wx, wy] = g.waypoints[i];
      const d = Math.hypot(wx - g.x, wy - g.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  // Would anyone see the thief standing at (px, py) right now? Used by the
  // autopilot to pick a safe step, and by the tests.
  function wouldBeSeen(px, py) {
    if (state.phase === PHASE_CAUGHT || state.phase === PHASE_OVER || state.phase === PHASE_WIN) return false;
    const blockers = solids();
    for (const g of state.guards) {
      if (
        inCone(g.x, g.y, g.angle, GUARD.sightRange, GUARD.halfAngle, px, py) &&
        losClear(g.x, g.y, px, py, blockers) &&
        !smokeBlocks(g.x, g.y, px, py, state.smoke)
      ) {
        return true;
      }
    }
    if (state.empTimer <= 0) {
      for (const c of state.cameras) {
        if (
          inCone(c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle, px, py) &&
          losClear(c.x, c.y, px, py, blockers) &&
          !smokeBlocks(c.x, c.y, px, py, state.smoke)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function updateGuards(dt) {
    for (const g of state.guards) {
      if (g.mode === 'patrol') {
        const [tx, ty] = g.waypoints[g.wp];
        if (moveGuard(g, tx, ty, GUARD.patrolSpeed * g.speedMul, dt)) {
          g.visited.add(g.wp);
          g.wp = (g.wp + 1) % g.waypoints.length;
        }
      } else if (g.mode === 'investigate') {
        if (g.wait > 0) {
          g.wait -= dt;
          g.angle += dt * 0.9;
          if (g.wait <= 0) {
            g.mode = 'patrol';
            g.wp = nearestWaypointIndex(g);
          }
        } else if (moveGuard(g, g.targetX, g.targetY, GUARD.investigateSpeed * g.speedMul, dt)) {
          g.wait = GUARD.investigateStare;
        }
      } else if (g.mode === 'chase') {
        moveGuard(g, g.lastSeenX, g.lastSeenY, GUARD.chaseSpeed * g.speedMul, dt);
        const arrived = Math.hypot(g.lastSeenX - g.x, g.lastSeenY - g.y) < 8;
        if (arrived) {
          g.chaseLost += dt;
          if (g.chaseLost >= GUARD.chaseGiveUp) {
            g.mode = 'patrol';
            g.wp = nearestWaypointIndex(g);
            g.chaseLost = 0;
          }
        }
      }
    }
  }

  function updateCameras(dt) {
    for (const c of state.cameras) {
      c.phase += (Math.PI * 2 * dt) / CAMERA.sweepPeriod;
      c.angle = c.baseAngle + CAMERA.sweep * Math.sin(c.phase);
    }
  }

  // One fixed step. `input` is { moveX, moveY, sneak, crack, smoke, coin,
  // coinX, coinY, emp }. With `harmless` set (the title screen's backdrop)
  // wardens patrol and cameras sweep but nothing is seen, cracked or caught.
  function step(dt, input, harmless = false) {
    let events = 0;
    const p = state.player;

    updateCameras(dt);
    for (const c of state.smoke) c.t -= dt;
    state.smoke = state.smoke.filter((c) => c.t > 0);
    for (const c of state.coins) c.t -= dt;
    state.coins = state.coins.filter((c) => c.t > 0);
    if (state.empTimer > 0) state.empTimer = Math.max(0, state.empTimer - dt);
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) state.message = '';
    }

    if (state.phase === PHASE_CAUGHT) {
      updateGuards(dt);
      state.caughtTimer -= dt;
      if (state.caughtTimer <= 0) {
        p.x = PLAYER.spawn.x;
        p.y = PLAYER.spawn.y;
        p.grace = PLAYER.graceAfterCaught;
        for (const g of state.guards) {
          g.mode = 'patrol';
          g.wp = nearestWaypointIndex(g);
        }
        state.cracking = null;
        state.phase = PHASE_PLAY;
      }
      return events;
    }
    if (state.phase !== PHASE_PLAY) {
      if (state.phase === PHASE_TITLE) updateGuards(dt);
      return events;
    }

    state.time += dt;
    if (p.grace > 0) p.grace = Math.max(0, p.grace - dt);

    // --- tools (edge-triggered flags from the input layer) ---
    if (input.smoke && state.tools.smoke > 0) {
      state.tools.smoke -= 1;
      state.smoke.push({ x: p.x, y: p.y, t: TOOLS.smokeDuration, radius: TOOLS.smokeRadius });
    }
    if (input.coin && state.tools.coin > 0) {
      state.tools.coin -= 1;
      const cx = input.coinX ?? p.x;
      const cy = input.coinY ?? p.y;
      state.coins.push({ x: cx, y: cy, t: 1.2 });
      for (const g of state.guards) {
        if (Math.hypot(cx - g.x, cy - g.y) <= TOOLS.coinHearing && g.mode !== 'chase') {
          g.mode = 'investigate';
          g.targetX = cx;
          g.targetY = cy;
          g.wait = 0;
        }
      }
    }
    if (input.emp && state.tools.emp > 0) {
      state.tools.emp -= 1;
      state.empTimer = TOOLS.empDuration;
    }

    // --- movement: axis-separated circle-vs-rect, clamped to the field ---
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    p.sneaking = !!input.sneak;
    const mx = input.moveX || 0;
    const my = input.moveY || 0;
    const len = Math.hypot(mx, my);
    p.moving = len > 0;
    if (len > 0) {
      const nx = mx / len;
      const ny = my / len;
      const moved = moveCircle(p.x, p.y, PLAYER.radius, nx * speed * dt, ny * speed * dt, solids());
      p.x = Math.max(FIELD.border + PLAYER.radius, Math.min(FIELD.width - FIELD.border - PLAYER.radius, moved.x));
      p.y = Math.max(FIELD.border + PLAYER.radius, Math.min(FIELD.height - FIELD.border - PLAYER.radius, moved.y));
      p.angle = Math.atan2(ny, nx);
    }

    // --- cracking: nearest loot within range, standing still, Space held ---
    let nearest = null;
    let nearestD = CRACK_RANGE;
    for (const l of state.loot) {
      if (l.taken) continue;
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = l;
      }
    }
    if (nearest !== null && input.crack && !p.moving) {
      if (state.cracking === null || state.cracking.loot !== nearest) {
        state.cracking = { loot: nearest, progress: 0 };
      }
      state.cracking.progress += dt / CRACK_TIME[nearest.kind];
      if (state.cracking.progress >= 1) {
        nearest.taken = true;
        state.lootValue += nearest.value;
        state.score += nearest.value;
        state.cracking = null;
        events |= EVENT_LOOT;
        if (state.loot.every((l) => l.taken)) {
          state.exitOpen = true;
          state.message = 'Every case cracked — the exit is open!';
          state.messageTimer = 3;
        }
      }
    } else {
      state.cracking = null;
    }

    // --- guards move, then vision ---
    updateGuards(dt);
    let seenByGuard = false;
    let seenByCamera = false;
    if (!harmless && p.grace <= 0) {
      const blockers = solids();
      for (const g of state.guards) {
        if (
          inCone(g.x, g.y, g.angle, GUARD.sightRange, GUARD.halfAngle, p.x, p.y) &&
          losClear(g.x, g.y, p.x, p.y, blockers) &&
          !smokeBlocks(g.x, g.y, p.x, p.y, state.smoke)
        ) {
          seenByGuard = true;
          g.mode = 'chase';
          g.lastSeenX = p.x;
          g.lastSeenY = p.y;
          g.chaseLost = 0;
        }
      }
      if (state.empTimer <= 0) {
        for (const c of state.cameras) {
          if (
            inCone(c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle, p.x, p.y) &&
            losClear(c.x, c.y, p.x, p.y, blockers) &&
            !smokeBlocks(c.x, c.y, p.x, p.y, state.smoke)
          ) {
            seenByCamera = true;
          }
        }
      }
    }
    state.spotted = seenByGuard || seenByCamera;
    if (state.spotted) events |= EVENT_SPOTTED;

    // --- alarm ---
    if (seenByGuard || seenByCamera) {
      let rate = 0;
      if (seenByGuard) rate += ALARM.guardRate;
      if (seenByCamera) rate += ALARM.cameraRate;
      if (p.sneaking) rate *= ALARM.sneakFactor;
      state.alarm = Math.min(ALARM.caughtAt, state.alarm + rate * dt);
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    }

    // --- caught ---
    if (state.alarm >= ALARM.caughtAt) {
      state.lives -= 1;
      state.catches += 1;
      state.alarm = ALARM.afterCatch;
      state.cracking = null;
      events |= EVENT_CAUGHT;
      if (state.lives <= 0) {
        state.phase = PHASE_OVER;
        events |= EVENT_OVER;
      } else {
        state.phase = PHASE_CAUGHT;
        state.caughtTimer = CAUGHT_PAUSE;
      }
      return events;
    }

    // --- exit ---
    if (state.exitOpen && circleHitsRect(p.x, p.y, PLAYER.radius, state.level.exit)) {
      if (state.roomIndex < LEVELS.length - 1) {
        state.tools.smoke += TOOLS.smokePerRoom;
        state.tools.coin += TOOLS.coinPerRoom;
        state.tools.emp += TOOLS.empPerRoom;
        loadRoom(state.roomIndex + 1);
        state.message = `${state.level.name} — ${state.level.subtitle}`;
        state.messageTimer = 4;
        events |= EVENT_ROOM;
      } else {
        const bonus = Math.max(0, SCORE.timeBonusStart - SCORE.timeBonusPerSecond * Math.floor(state.time));
        state.score += bonus;
        state.rating = ratingFor(state.catches);
        state.message = '';
        state.messageTimer = 0;
        state.phase = PHASE_WIN;
        events |= EVENT_WIN;
      }
    }
    return events;
  }

  // --- helpers for screenshots and tests ---
  function collectAllLoot() {
    for (const l of state.loot) {
      if (!l.taken) {
        l.taken = true;
        state.lootValue += l.value;
        state.score += l.value;
      }
    }
    state.exitOpen = true;
  }

  function teleport(x, y) {
    state.player.x = x;
    state.player.y = y;
  }

  function setAlarm(value) {
    state.alarm = value;
  }

  function advanceToRoom(index) {
    loadRoom(index);
  }

  reset();
  return {
    state,
    reset,
    startGame,
    step,
    wouldBeSeen,
    collectAllLoot,
    teleport,
    setAlarm,
    advanceToRoom,
  };
}
