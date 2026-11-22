// Velvet Vault — every tuning number and colour in one place.
// The thief "Moth" crosses three rooms of a dark gallery, cracks loot cases
// and slips out through the skylight. All numbers here are the game's rules.
export const FIELD = { width: 1280, height: 720, border: 24 };

export const PLAYER = {
  radius: 16,
  walkSpeed: 205,
  sneakSpeed: 122,
  spawn: { x: 90, y: 620 },
  graceAfterCaught: 2,
};

export const LIVES = 3;

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  investigateSpeed: 112,
  chaseSpeed: 152,
  sightRange: 235,
  halfAngle: 0.56,
  investigateStare: 3.5,
  chaseGiveUp: 2,
};

export const CAMERA = {
  range: 285,
  halfAngle: 0.46,
  sweep: 0.62,
  sweepPeriod: 5,
};

export const ALARM = {
  guardRate: 46,
  cameraRate: 62,
  decay: 14,
  caughtAt: 100,
  afterCatch: 45,
  sneakFactor: 0.5,
};

// Hold Space beside a case, standing still, to crack it.
export const CRACK_TIME = { painting: 1.2, gem: 1.8, relic: 2.6, vault: 4 };
export const CRACK_RANGE = 48;

export const TOOLS = {
  smokeStart: 2,
  smokePerRoom: 1,
  smokeDuration: 5,
  smokeRadius: 92,
  coinStart: 3,
  coinPerRoom: 1,
  coinHearing: 430,
  empStart: 1,
  empPerRoom: 1,
  empDuration: 6,
};

export const SCORE = { timeBonusStart: 600, timeBonusPerSecond: 2 };

// Room guard speed multipliers: room 1 x1, room 2 x1.1, room 3 x1.25.
export const ROOM_SPEED = [1, 1.1, 1.25];

export const CAUGHT_PAUSE = 1.4;

// The palette: a dark gallery, not a tile set. Gold is the thief and the
// loot; steel blue is the wardens; deep red is carpet; pale lavender is
// marble. Cones are gold for wardens, blue for cameras, red when alerted.
export const PALETTE = {
  backdrop: '#0a0a12',
  floor: '#1c1a26',
  floorAlt: '#221f30',
  carpet: '#5d2430',
  carpetEdge: '#7d3242',
  carpetPattern: '#6e2b3a',
  wall: '#3a3450',
  wallTop: '#5a5280',
  wallEdge: '#2a2540',
  cover: '#6b4a2f',
  coverTop: '#8a623c',
  statue: '#b9a8d8',
  statueBase: '#8d7cb5',
  player: '#e8d27a',
  playerCloak: '#2e2a4a',
  guard: '#7fa8d8',
  guardDark: '#4a6a94',
  coneGuard: 'rgba(232, 210, 122, 0.20)',
  coneAlert: 'rgba(220, 60, 60, 0.30)',
  coneCamera: 'rgba(110, 160, 255, 0.18)',
  cameraBody: '#9ab4d8',
  loot: '#ffd94d',
  lootGlow: 'rgba(255, 217, 77, 0.35)',
  exit: '#46c07a',
  exitLocked: '#8a4a4a',
  smoke: 'rgba(205, 205, 215, 0.38)',
  text: '#e8e4d8',
  muted: '#9a94a8',
  danger: '#e85a5a',
  warn: '#e8c85a',
  ok: '#46c07a',
  panel: 'rgba(10, 10, 18, 0.82)',
  panelEdge: '#e8d27a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
