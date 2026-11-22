// Velvet Vault — all drawing and screens. One canvas, one logical field of
// 1280x720, drawn in layers: floor, carpets, loot, walls, cover, smoke,
// vision cones, wardens, cameras, the thief, then the HUD and the screens.
// The thief is drawn bigger than the wardens, with a gold ring and a MOTH
// tag, so she reads at a glance even when the frame is shrunk.
import { FIELD, FONT, PALETTE, PLAYER } from './config.js';
import { PHASE_CAUGHT, PHASE_OVER, PHASE_PLAY, PHASE_TITLE, PHASE_WIN } from './world.js';

const W = FIELD.width;
const H = FIELD.height;

function text(ctx, str, x, y, font, color, align = 'left', baseline = 'alphabetic') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
}

function money(n) {
  return `$${n.toLocaleString('en-US')}`;
}

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, W, H);
  const cell = 80;
  ctx.fillStyle = PALETTE.floorAlt;
  for (let y = 0; y < H / cell; y++) {
    for (let x = 0; x < W / cell; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // A soft vignette so the room's edges fall away into the dark.
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawCarpets(ctx, level) {
  for (const c of level.carpets) {
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = PALETTE.carpetEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.fillStyle = PALETTE.carpetPattern;
    const step = 46;
    for (let x = c.x + 22; x < c.x + c.w - 10; x += step) {
      for (let y = c.y + 22; y < c.y + c.h - 10; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWalls(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  }
}

function drawCover(ctx, level) {
  for (const c of level.cover) {
    if (c.kind === 'statue') {
      ctx.fillStyle = PALETTE.statueBase;
      ctx.fillRect(c.x + 4, c.y + c.h - 12, c.w - 8, 12);
      ctx.fillStyle = PALETTE.statue;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + 20, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(c.x + 8, c.y + c.h - 12);
      ctx.quadraticCurveTo(c.x + c.w / 2, c.y + 22, c.x + c.w - 8, c.y + c.h - 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.statueBase;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    } else if (c.kind === 'case') {
      ctx.fillStyle = PALETTE.cover;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(220, 230, 255, 0.28)';
      ctx.fillRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
      ctx.strokeStyle = PALETTE.loot;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    } else if (c.kind === 'desk') {
      ctx.fillStyle = PALETTE.cover;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = PALETTE.coverTop;
      ctx.fillRect(c.x, c.y, c.w, 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x + c.w / 2, c.y + 8);
      ctx.lineTo(c.x + c.w / 2, c.y + c.h);
      ctx.stroke();
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    } else if (c.kind === 'dome') {
      ctx.fillStyle = PALETTE.statue;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h - 6, c.w / 2 - 4, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.statueBase;
      ctx.fillRect(c.x, c.y + c.h - 8, c.w, 8);
    } else {
      // crate
      ctx.fillStyle = PALETTE.cover;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = PALETTE.coverTop;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x + 4, c.y + 4);
      ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4);
      ctx.moveTo(c.x + c.w - 4, c.y + 4);
      ctx.lineTo(c.x + 4, c.y + c.h - 4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    }
  }
}

function drawExit(ctx, level, open) {
  const e = level.exit;
  const skylight = e.label === 'SKYLIGHT';
  if (skylight) {
    ctx.fillStyle = open ? '#cfe8ff' : '#3a4a5e';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
    if (open) {
      ctx.fillStyle = 'rgba(207, 232, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(e.x + 8, e.y + e.h);
      ctx.lineTo(e.x + e.w - 8, e.y + e.h);
      ctx.lineTo(e.x + e.w + 40, e.y + e.h + 130);
      ctx.lineTo(e.x - 40, e.y + e.h + 130);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = open ? PALETTE.exit : '#4a3436';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = open ? '#a8e8c0' : PALETTE.exitLocked;
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
    ctx.fillStyle = open ? '#0a2a18' : '#d8a0a0';
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'OPEN' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2);
  }
  // The label sits below a skylight and above a floor-level door, so it
  // never lands under the HUD or the bottom bar.
  const labelY = skylight ? e.y + e.h + 16 : e.y - 12;
  text(ctx, e.label, e.x + e.w / 2, labelY, `bold 11px ${FONT}`, open ? PALETTE.exit : PALETTE.muted, 'center');
}

function drawLoot(ctx, state) {
  for (const l of state.loot) {
    if (l.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3 + l.x);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.35 * pulse;
    ctx.fillStyle = PALETTE.lootGlow;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 26 + 4 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The case itself: a gold diamond.
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y - 12);
    ctx.lineTo(l.x + 10, l.y);
    ctx.lineTo(l.x, l.y + 12);
    ctx.lineTo(l.x - 10, l.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.moveTo(l.x, l.y - 12);
    ctx.lineTo(l.x + 10, l.y);
    ctx.lineTo(l.x, l.y);
    ctx.lineTo(l.x - 10, l.y);
    ctx.closePath();
    ctx.fill();
    // The value sits below the case — unless the thief stands south of it,
    // when it flips above so she never stands over her own prize.
    const playerSouth = state.player.y > l.y + 10;
    text(ctx, money(l.value), l.x, playerSouth ? l.y - 22 : l.y + 28, `bold 12px ${FONT}`, PALETTE.loot, 'center');
    // The name sits above the case, unless the case is under the HUD band,
    // the thief is cracking it (the CRACKING label takes that spot), or the
    // value flipped up there instead.
    const beingCracked = state.cracking !== null && state.cracking.loot === l;
    if (l.y >= 110 && !beingCracked && !playerSouth) text(ctx, l.name.toUpperCase(), l.x, l.y - 22, `10px ${FONT}`, PALETTE.muted, 'center');
  }
  // The crack ring, filling as the thief works a case. The label sits on a
  // dark pill on the far side of the case from the thief, so she never
  // stands over her own label.
  if (state.cracking !== null) {
    const l = state.cracking.loot;
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.cracking.progress);
    ctx.stroke();
    const p = state.player;
    const ddx = l.x - p.x;
    const ddy = l.y - p.y;
    const len = Math.hypot(ddx, ddy) || 1;
    const cx = l.x + (ddx / len) * 56;
    const cy = l.y + (ddy / len) * 56;
    ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
    ctx.fillRect(cx - 46, cy - 10, 92, 20);
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 46, cy - 10, 92, 20);
    text(ctx, 'CRACKING…', cx, cy + 4, `bold 11px ${FONT}`, PALETTE.loot, 'center');
  }
}

function drawCone(ctx, x, y, angle, range, half, fill, edge) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - half) * range, y + Math.sin(angle - half) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + half) * range, y + Math.sin(angle + half) * range);
  ctx.stroke();
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    const alerted = g.mode !== 'patrol';
    drawCone(
      ctx, g.x, g.y, g.angle, 235, 0.56,
      alerted ? PALETTE.coneAlert : PALETTE.coneGuard,
      alerted ? 'rgba(232, 90, 90, 0.5)' : 'rgba(232, 210, 122, 0.35)',
    );
  }
  for (const g of state.guards) {
    const alerted = g.mode !== 'patrol';
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    // The visor: where the warden is looking.
    ctx.strokeStyle = '#e8f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * 5, g.y + Math.sin(g.angle) * 5);
    ctx.lineTo(g.x + Math.cos(g.angle) * 14, g.y + Math.sin(g.angle) * 14);
    ctx.stroke();
    // The name sits below the warden, so it never collides with the
    // thief's MOTH tag when she is caught right beside one.
    text(ctx, g.name.replace('Warden ', '').toUpperCase(), g.x, g.y + 30, `bold 10px ${FONT}`, '#9ab4d8', 'center');
    if (alerted) {
      text(ctx, g.mode === 'chase' ? '!' : '?', g.x, g.y - 38, `bold 18px ${FONT}`, PALETTE.danger, 'center');
    }
  }
}

function drawCameras(ctx, state) {
  const dark = state.empTimer > 0;
  for (const c of state.cameras) {
    if (!dark) drawCone(ctx, c.x, c.y, c.angle, 285, 0.46, PALETTE.coneCamera, 'rgba(110, 160, 255, 0.35)');
  }
  for (const c of state.cameras) {
    ctx.fillStyle = dark ? '#5a5a66' : PALETTE.cameraBody;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark ? '#3a3a44' : '#2e3a4e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = dark ? '#8a8a96' : PALETTE.danger;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 4, c.y + Math.sin(c.angle) * 4, 3, 0, Math.PI * 2);
    ctx.fill();
    if (dark) text(ctx, 'EMP', c.x, c.y - 16, `bold 10px ${FONT}`, '#c8c8d8', 'center');
  }
}

function drawSmokeAndCoins(ctx, state) {
  for (const c of state.smoke) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(230, 230, 240, 0.25)';
    ctx.beginPath();
    ctx.arc(c.x - 18, c.y - 10, c.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of state.coins) {
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6 + (1.2 - c.t) * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (state.phase === PHASE_OVER) return;
  const blink = p.grace > 0 && Math.floor(p.grace * 8) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.45;
  // A soft gold glow under her feet.
  ctx.fillStyle = 'rgba(232, 210, 122, 0.18)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
  ctx.fill();
  // The gold ring that marks the thief at a glance.
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  // Body: gold, with a dark cloak.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 10, p.y + Math.sin(p.angle) * 10);
  ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
  ctx.stroke();
  ctx.restore();
  // The MOTH tag sits above her, unless she is up under the HUD band —
  // then it goes below her instead. On the win and game-over screens the
  // panel speaks for her, so no tag at all.
  if (state.phase !== PHASE_WIN && state.phase !== PHASE_OVER) {
    const tagBelow = p.y < 95;
    text(ctx, 'MOTH', p.x, tagBelow ? p.y + PLAYER.radius + 16 : p.y - PLAYER.radius - 12, `bold 11px ${FONT}`, PALETTE.player, 'center');
    if (p.sneaking) text(ctx, 'SNEAKING', p.x, p.y + PLAYER.radius + (tagBelow ? 32 : 18), `10px ${FONT}`, PALETTE.muted, 'center');
  }
}

function drawHUD(ctx, state) {
  // Top bar.
  ctx.fillStyle = 'rgba(10, 10, 18, 0.72)';
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = 'rgba(232, 210, 122, 0.25)';
  ctx.fillRect(0, 60, W, 1);

  const taken = state.loot.filter((l) => l.taken).length;
  text(ctx, `LOOT  ${money(state.lootValue)}`, 26, 26, `bold 20px ${FONT}`, PALETTE.loot);
  text(ctx, `${taken} / ${state.loot.length} CASES CRACKED`, 26, 48, `12px ${FONT}`, PALETTE.muted);

  text(ctx, state.level.name.toUpperCase(), W / 2, 24, `bold 15px ${FONT}`, PALETTE.text, 'center');
  // The alarm bar, centred.
  const barX = W / 2 - 140;
  const barY = 36;
  const barW = 280;
  const barH = 12;
  text(ctx, 'ALARM', barX - 10, barY + 11, `bold 12px ${FONT}`, PALETTE.muted, 'right');
  ctx.fillStyle = '#262233';
  ctx.fillRect(barX, barY, barW, barH);
  const frac = state.alarm / 100;
  ctx.fillStyle = frac < 0.5 ? PALETTE.ok : frac < 0.8 ? PALETTE.warn : PALETTE.danger;
  ctx.fillRect(barX, barY, barW * frac, barH);
  ctx.strokeStyle = 'rgba(232, 228, 216, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  const hearts = '♥'.repeat(state.lives) + '♡'.repeat(Math.max(0, 3 - state.lives));
  text(ctx, hearts, W - 26, 26, `bold 18px ${FONT}`, PALETTE.danger, 'right');
  text(ctx, `SCORE  ${state.score.toLocaleString('en-US')}`, W - 26, 48, `bold 14px ${FONT}`, PALETTE.text, 'right');
  text(ctx, `TIME  ${clock(state.time)}`, W - 190, 26, `13px ${FONT}`, PALETTE.muted, 'right');

  // Bottom bar: tools on the left, the hint centred.
  ctx.fillStyle = 'rgba(10, 10, 18, 0.72)';
  ctx.fillRect(0, H - 44, W, 44);
  ctx.fillStyle = 'rgba(232, 210, 122, 0.25)';
  ctx.fillRect(0, H - 44, W, 1);
  text(
    ctx,
    `Q  SMOKE ×${state.tools.smoke}      F / CLICK  COIN ×${state.tools.coin}      E  EMP ×${state.tools.emp}${state.empTimer > 0 ? `  (DARK ${state.empTimer.toFixed(0)}s)` : ''}`,
    26, H - 16, `bold 13px ${FONT}`, PALETTE.text,
  );
  text(
    ctx,
    'WASD move · Shift sneak · Space crack · P pause · M mute',
    W / 2, H - 16, `12px ${FONT}`, PALETTE.muted, 'center',
  );

  // The room-clear banner.
  if (state.message !== '') {
    ctx.fillStyle = PALETTE.panel;
    const mw = 560;
    ctx.fillRect(W / 2 - mw / 2, 74, mw, 34);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W / 2 - mw / 2, 74, mw, 34);
    text(ctx, state.message, W / 2, 96, `bold 14px ${FONT}`, PALETTE.loot, 'center');
  }

  // The SPOTTED! tint: a red frame while anyone sees the thief.
  if (state.spotted && state.phase === PHASE_PLAY) {
    ctx.strokeStyle = 'rgba(232, 90, 90, 0.75)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    text(ctx, 'SPOTTED!', W / 2, 130, `bold 26px ${FONT}`, PALETTE.danger, 'center');
  }
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(10, 10, 18, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawTitle(ctx, state, best) {
  dim(ctx, 0.62);
  text(ctx, 'VELVET VAULT', W / 2, 170, `bold 68px ${FONT}`, PALETTE.player, 'center');
  text(ctx, 'A TOP-DOWN STEALTH HEIST', W / 2, 210, `bold 18px ${FONT}`, PALETTE.text, 'center');
  text(ctx, 'Moth has one night, three rooms and a skylight to reach.', W / 2, 244, `16px ${FONT}`, PALETTE.muted, 'center');

  panel(ctx, W / 2 - 330, 290, 660, 190);
  text(ctx, 'HOW TO PLAY', W / 2, 322, `bold 15px ${FONT}`, PALETTE.loot, 'center');
  const lines = [
    'WASD / arrows — move      Shift — sneak (slower, half the alarm)',
    'Space — crack a case (stand still beside it)',
    'Q — smoke pellet      F or click — throw a noise coin      E — EMP the cameras',
    'Crack every case to open the exit. Reach the skylight and vanish.',
    'Seen by a warden or a lens, the alarm climbs. At 100, you are caught.',
  ];
  lines.forEach((line, i) => text(ctx, line, W / 2, 352 + i * 24, `14px ${FONT}`, PALETTE.text, 'center'));

  text(ctx, 'PRESS ENTER TO BEGIN', W / 2, 540, `bold 22px ${FONT}`, PALETTE.player, 'center');
  if (best > 0) text(ctx, `BEST SCORE  ${best.toLocaleString('en-US')}`, W / 2, 574, `14px ${FONT}`, PALETTE.muted, 'center');
  text(ctx, 'Three rooms. Three wardens. One way out.', W / 2, 640, `13px ${FONT}`, PALETTE.muted, 'center');
}

function drawCaught(ctx, state) {
  ctx.fillStyle = 'rgba(180, 30, 30, 0.22)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, W / 2 - 300, H / 2 - 90, 600, 180);
  text(ctx, 'SPOTTED!', W / 2, H / 2 - 28, `bold 52px ${FONT}`, PALETTE.danger, 'center');
  text(ctx, 'The wardens found Moth. One life lost — the alarm falls back.', W / 2, H / 2 + 16, `15px ${FONT}`, PALETTE.text, 'center');
  text(ctx, `LIVES LEFT: ${state.lives}`, W / 2, H / 2 + 52, `bold 16px ${FONT}`, PALETTE.loot, 'center');
}

function drawOver(ctx, state) {
  dim(ctx, 0.78);
  text(ctx, 'CAUGHT FOR GOOD', W / 2, 250, `bold 56px ${FONT}`, PALETTE.danger, 'center');
  text(ctx, 'The gallery keeps its treasures tonight.', W / 2, 296, `16px ${FONT}`, PALETTE.muted, 'center');
  text(ctx, `LOOT  ${money(state.lootValue)}      SCORE  ${state.score.toLocaleString('en-US')}`, W / 2, 360, `bold 20px ${FONT}`, PALETTE.text, 'center');
  text(ctx, 'PRESS R TO TRY AGAIN', W / 2, 440, `bold 20px ${FONT}`, PALETTE.player, 'center');
}

function drawWin(ctx, state) {
  dim(ctx, 0.55);
  panel(ctx, W / 2 - 340, 130, 680, 400);
  text(ctx, 'THE GETAWAY', W / 2, 200, `bold 56px ${FONT}`, PALETTE.player, 'center');
  text(ctx, 'Moth slips through the skylight and is gone before dawn.', W / 2, 238, `16px ${FONT}`, PALETTE.muted, 'center');
  text(ctx, `LOOT  ${money(state.lootValue)}`, W / 2, 300, `bold 24px ${FONT}`, PALETTE.loot, 'center');
  text(ctx, `SCORE  ${state.score.toLocaleString('en-US')}`, W / 2, 340, `bold 24px ${FONT}`, PALETTE.text, 'center');
  text(ctx, `RATING  ${state.rating}`, W / 2, 392, `bold 30px ${FONT}`, PALETTE.exit, 'center');
  text(
    ctx,
    state.rating === 'GHOST' ? 'Never once seen. A perfect night.' : state.rating === 'SHADOW' ? 'Seen once — but never held.' : 'Loud, but rich. Worth every alarm.',
    W / 2, 428, `14px ${FONT}`, PALETTE.muted, 'center',
  );
  text(ctx, 'PRESS R TO PLAY AGAIN', W / 2, 486, `bold 18px ${FONT}`, PALETTE.player, 'center');
}

function drawPaused(ctx) {
  dim(ctx, 0.6);
  text(ctx, 'PAUSED', W / 2, H / 2 - 10, `bold 52px ${FONT}`, PALETTE.text, 'center');
  text(ctx, 'Press P to resume', W / 2, H / 2 + 36, `16px ${FONT}`, PALETTE.muted, 'center');
}

// The whole frame: the world, the HUD and whichever screen is up.
export function drawWorld(ctx, state, opts = {}) {
  const level = state.level;
  drawFloor(ctx);
  drawCarpets(ctx, level);
  drawExit(ctx, level, state.exitOpen);
  drawLoot(ctx, state);
  drawWalls(ctx, level);
  drawCover(ctx, level);
  drawSmokeAndCoins(ctx, state);
  drawGuards(ctx, state);
  drawCameras(ctx, state);
  drawPlayer(ctx, state);
  drawHUD(ctx, state);
  if (state.phase === PHASE_TITLE) drawTitle(ctx, state, opts.best || 0);
  else if (state.phase === PHASE_CAUGHT) drawCaught(ctx, state);
  else if (state.phase === PHASE_OVER) drawOver(ctx, state);
  else if (state.phase === PHASE_WIN) drawWin(ctx, state);
  if (opts.paused && state.phase === PHASE_PLAY) drawPaused(ctx);
}
