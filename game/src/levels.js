// Velvet Vault — the three rooms. Walls and cover block movement and sight
// alike; carpets are decoration and never block. Every guard patrol is a
// loop of waypoints in open lanes, never through a wall. The player spawns
// at (90, 620) in every room; a 24 px border wall frames the whole field.
// Angles: 0 is east, PI/2 is south (down the screen), PI is west.
import { FIELD } from './config.js';

function borderWalls() {
  const b = FIELD.border;
  const w = FIELD.width;
  const h = FIELD.height;
  return [
    { x: 0, y: 0, w, h: b },
    { x: 0, y: h - b, w, h: b },
    { x: 0, y: 0, w: b, h },
    { x: w - b, y: 0, w: b, h },
  ];
}

// A rectangular patrol loop from a corner pair: (x1,y1) to (x2,y2).
function rectPatrol(x1, y1, x2, y2) {
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ];
}

export const LEVELS = [
  {
    name: 'Room 1 — The Halcyon Gallery',
    subtitle: 'Slip past the wardens. Crack every case, then reach the door.',
    walls: [
      ...borderWalls(),
      { x: 420, y: 180, w: 440, h: 24 },
      { x: 900, y: 300, w: 24, h: 220 },
    ],
    cover: [
      { x: 300, y: 360, w: 56, h: 56, kind: 'statue' },
      { x: 640, y: 420, w: 56, h: 56, kind: 'statue' },
      { x: 965, y: 295, w: 56, h: 56, kind: 'statue' },
      { x: 560, y: 240, w: 120, h: 60, kind: 'case' },
      { x: 180, y: 480, w: 140, h: 56, kind: 'desk' },
      { x: 1080, y: 520, w: 90, h: 70, kind: 'crate' },
    ],
    carpets: [
      { x: 570, y: 24, w: 140, h: 672 },
      { x: 100, y: 300, w: 200, h: 90 },
    ],
    guards: [
      { name: 'Warden Hale', waypoints: rectPatrol(150, 150, 380, 320) },
      { name: 'Warden Okafor', waypoints: rectPatrol(1050, 120, 1150, 480) },
    ],
    cameras: [{ x: 640, y: 30, angle: Math.PI / 2 }],
    loot: [
      { name: 'Portrait of the Duchess', kind: 'painting', value: 800, x: 300, y: 60 },
      { name: 'The Halcyon Sapphire', kind: 'gem', value: 1500, x: 1000, y: 420 },
      { name: 'Still Life with Silver', kind: 'painting', value: 700, x: 1180, y: 400 },
    ],
    exit: { x: 600, y: 660, w: 80, h: 36, label: 'SERVICE DOOR' },
  },
  {
    name: 'Room 2 — The Vault Hall',
    subtitle: 'The Aurelian Vault sits behind its own chamber. Mind the lenses.',
    walls: [
      ...borderWalls(),
      // The vault chamber, top centre: open at the bottom.
      { x: 480, y: 60, w: 24, h: 200 },
      { x: 776, y: 60, w: 24, h: 200 },
      { x: 480, y: 60, w: 320, h: 24 },
      { x: 180, y: 380, w: 300, h: 24 },
      { x: 1020, y: 380, w: 24, h: 140 },
    ],
    cover: [
      { x: 300, y: 200, w: 56, h: 56, kind: 'statue' },
      { x: 950, y: 220, w: 56, h: 56, kind: 'statue' },
      { x: 600, y: 450, w: 120, h: 56, kind: 'case' },
      { x: 150, y: 560, w: 140, h: 56, kind: 'desk' },
      { x: 1060, y: 600, w: 140, h: 56, kind: 'desk' },
      { x: 830, y: 600, w: 90, h: 70, kind: 'crate' },
    ],
    carpets: [
      { x: 560, y: 300, w: 160, h: 360 },
      { x: 900, y: 60, w: 200, h: 90 },
    ],
    guards: [
      { name: 'Warden Hale', waypoints: rectPatrol(140, 140, 420, 300) },
      { name: 'Warden Okafor', waypoints: rectPatrol(900, 120, 1180, 560) },
      { name: 'Warden Ibsen', waypoints: rectPatrol(540, 340, 740, 600) },
    ],
    cameras: [
      { x: 640, y: 30, angle: Math.PI / 2 },
      { x: 1256, y: 360, angle: Math.PI },
    ],
    loot: [
      { name: 'The Aurelian Vault', kind: 'vault', value: 4000, x: 640, y: 150 },
      { name: 'Emerald of the East', kind: 'gem', value: 1200, x: 250, y: 500 },
      { name: 'The Night Watcher', kind: 'painting', value: 900, x: 1100, y: 200 },
      { name: 'The Jade Fox', kind: 'relic', value: 1800, x: 950, y: 620 },
    ],
    exit: { x: 600, y: 660, w: 80, h: 36, label: 'SERVICE DOOR' },
  },
  {
    name: 'Room 3 — The Rooftop Getaway',
    subtitle: 'One last sweep of the terrace. Then the skylight, and gone.',
    walls: [
      ...borderWalls(),
      { x: 300, y: 200, w: 200, h: 24 },
      { x: 150, y: 420, w: 200, h: 24 },
    ],
    cover: [
      { x: 200, y: 380, w: 90, h: 70, kind: 'crate' },
      { x: 600, y: 150, w: 90, h: 70, kind: 'crate' },
      { x: 1000, y: 300, w: 90, h: 70, kind: 'crate' },
      { x: 150, y: 500, w: 90, h: 70, kind: 'crate' },
      { x: 950, y: 550, w: 90, h: 70, kind: 'crate' },
      { x: 595, y: 300, w: 90, h: 70, kind: 'dome' },
    ],
    carpets: [{ x: 480, y: 420, w: 320, h: 90 }],
    guards: [
      { name: 'Warden Hale', waypoints: rectPatrol(140, 140, 560, 320) },
      { name: 'Warden Okafor', waypoints: rectPatrol(720, 120, 1180, 480) },
      { name: 'Warden Ibsen', waypoints: rectPatrol(420, 420, 880, 620) },
    ],
    cameras: [
      { x: 300, y: 30, angle: Math.PI / 2 },
      { x: 980, y: 30, angle: Math.PI / 2 },
      { x: 1256, y: 400, angle: Math.PI },
    ],
    loot: [
      { name: 'The Crown of Tides', kind: 'relic', value: 2500, x: 640, y: 90 },
      { name: 'The Black Opal', kind: 'gem', value: 1600, x: 180, y: 350 },
      { name: 'Moon over the Docks', kind: 'painting', value: 1000, x: 1180, y: 250 },
      { name: 'The Rooftop Safe', kind: 'vault', value: 3500, x: 1100, y: 620 },
    ],
    exit: { x: 1160, y: 24, w: 80, h: 30, label: 'SKYLIGHT' },
  },
];
