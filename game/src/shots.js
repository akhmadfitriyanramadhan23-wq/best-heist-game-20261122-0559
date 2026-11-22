// Velvet Vault — staged screenshot scenes and the autopilot. Every shot is
// a real run of the game's own rules from ?seed=1: the autopilot plays the
// thief forward, cracks cases and dodges cones, and the frame the browser
// screenshots is the state the rules produced. No DOM in here: runShot
// returns the world, and main.js renders it.
import { CRACK_RANGE, PLAYER } from './config.js';
import { angleDiff } from './geometry.js';
import { createWorld, EVENT_CAUGHT, EVENT_ROOM, EVENT_WIN } from './world.js';

const DT = 1 / 60;

// One autopilot decision: head for the target case (or a preferred one),
// crack when close, otherwise step toward it — but if the spot 0.45 s ahead
// would be seen, try sidestepping left, right or back instead; if every way
// is seen, wait sneaking. `ap` is the autopilot's memory: when the thief
// makes no progress toward the target for a second (a wall is in the way),
// it commits to a detour along the wall instead of dithering in place.
export function makeAutopilot() {
  return { bestD: Infinity, stuckT: 0, detourX: 0, detourY: 0, detourT: 0 };
}

export function autopilotInput(world, preferredIndex = -1, ap = null) {
  const state = world.state;
  const p = state.player;
  const input = { moveX: 0, moveY: 0, sneak: false, crack: false };

  let target = null;
  if (preferredIndex >= 0 && !state.loot[preferredIndex].taken) {
    target = state.loot[preferredIndex];
  } else {
    let best = Infinity;
    for (const l of state.loot) {
      if (l.taken) continue;
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < best) {
        best = d;
        target = l;
      }
    }
  }
  if (target === null) {
    target = {
      x: state.level.exit.x + state.level.exit.w / 2,
      y: state.level.exit.y + state.level.exit.h / 2,
    };
  }

  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d <= CRACK_RANGE - 4 && target.value !== undefined) {
    input.crack = true;
    return input;
  }
  if (d < 4) return input;

  const speed = PLAYER.walkSpeed;
  const ahead = (dirX, dirY) => ({
    x: p.x + dirX * speed * 0.45,
    y: p.y + dirY * speed * 0.45,
  });
  const tryDir = (dirX, dirY) => {
    const spot = ahead(dirX, dirY);
    if (!world.wouldBeSeen(spot.x, spot.y)) {
      input.moveX = dirX;
      input.moveY = dirY;
      return true;
    }
    return false;
  };

  const ux = dx / d;
  const uy = dy / d;

  // Wall-following: commit to a perpendicular detour when stuck.
  if (ap !== null) {
    if (ap.detourT > 0) {
      ap.detourT -= 1;
      if (tryDir(ap.detourX, ap.detourY)) return input;
      if (tryDir(-ap.detourX, -ap.detourY)) return input;
      input.sneak = true;
      return input;
    }
    if (d < ap.bestD - 2) {
      ap.bestD = d;
      ap.stuckT = 0;
    } else {
      ap.stuckT += 1;
    }
    if (ap.stuckT > 60) {
      // Pick the perpendicular whose far end is closer to the target.
      const left = { x: -uy, y: ux };
      const right = { x: uy, y: -ux };
      const leftD = Math.hypot(target.x - (p.x + left.x * 120), target.y - (p.y + left.y * 120));
      const rightD = Math.hypot(target.x - (p.x + right.x * 120), target.y - (p.y + right.y * 120));
      const pick = leftD <= rightD ? left : right;
      ap.detourX = pick.x;
      ap.detourY = pick.y;
      ap.detourT = 75;
      ap.stuckT = 0;
      ap.bestD = d;
      if (tryDir(pick.x, pick.y)) return input;
      input.sneak = true;
      return input;
    }
  }

  // Straight at the case first, then sidesteps, then back.
  if (tryDir(ux, uy)) return input;
  const left = { x: -uy, y: ux };
  const right = { x: uy, y: -ux };
  // Prefer the sidestep that keeps the case closer.
  const leftScore = Math.hypot(target.x - (p.x + left.x * 60), target.y - (p.y + left.y * 60));
  const rightScore = Math.hypot(target.x - (p.x + right.x * 60), target.y - (p.y + right.y * 60));
  const first = leftScore <= rightScore ? left : right;
  const second = leftScore <= rightScore ? right : left;
  if (tryDir(first.x, first.y)) return input;
  if (tryDir(second.x, second.y)) return input;
  if (tryDir(-ux, -uy)) return input;
  // Every way is seen: hold still and sneak until a cone sweeps past.
  input.sneak = true;
  return input;
}

function stepAutopilot(world, seconds, preferredIndex = -1, stopWhen = null) {
  const ap = makeAutopilot();
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    if (world.state.phase !== 'play') break;
    world.step(DT, autopilotInput(world, preferredIndex, ap));
    if (stopWhen !== null && stopWhen(world)) break;
  }
}

// The four staged shots, in shots.json order. Each returns { name, world }.
export function runShot(name, seed = 1) {
  const world = createWorld(seed);
  world.startGame();

  if (name === 'cover') {
    // Head for the Sapphire (room 1's richest case) and stop the moment the
    // thief starts cracking it, so all three cases stay visible with her
    // mid-room cracking the most valuable one. 12 s is the cap, not the goal.
    const sapphire = world.state.loot[1];
    stepAutopilot(world, 12, 1, (w) => w.state.cracking !== null && w.state.cracking.loot === sapphire);
    return { name, world };
  }
  if (name === 'sneak') {
    // Play until the first case is cracked and the thief has crossed into
    // the carpet under the camera's sweep (x > 480): caught mid-room beside
    // a camera cone, 2 of 3 loot still visible. 14 s is the cap.
    const ap = makeAutopilot();
    for (let i = 0; i < 14 * 60; i++) {
      if (world.state.phase !== 'play') break;
      world.step(DT, autopilotInput(world, -1, ap));
      const taken = world.state.loot.filter((l) => l.taken).length;
      if (taken >= 1 && world.state.player.x > 480) break;
    }
    return { name, world };
  }
  if (name === 'caught') {
    // Teleport the thief 45 px in front of the first guard, inside its cone,
    // then let the rules catch her.
    const g = world.state.guards[0];
    world.teleport(g.x + Math.cos(g.angle) * 45, g.y + Math.sin(g.angle) * 45);
    let events = 0;
    for (let i = 0; i < 60 * 10 && !(events & EVENT_CAUGHT); i++) {
      events |= world.step(DT, { moveX: 0, moveY: 0, sneak: false, crack: false });
    }
    return { name, world };
  }
  if (name === 'win') {
    // Every room's loot collected and the exit reached in turn, until the
    // getaway screen: GHOST when never caught.
    for (let room = 0; room < 3; room++) {
      world.collectAllLoot();
      const exit = world.state.level.exit;
      world.teleport(exit.x + exit.w / 2, exit.y + exit.h / 2);
      let events = 0;
      for (let i = 0; i < 120 && !(events & (EVENT_ROOM | EVENT_WIN)); i++) {
        events |= world.step(DT, { moveX: 0, moveY: 0, sneak: false, crack: false });
      }
      if (world.state.phase === 'win') break;
    }
    return { name, world };
  }
  throw new Error(`unknown shot: ${name}`);
}

// The ?shot= values main.js understands, in shots.json order.
export const SHOT_NAMES = ['cover', 'sneak', 'caught', 'win'];
