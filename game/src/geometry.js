// Velvet Vault — the geometry: circle-vs-rect collision, vision cones and
// line of sight. Walls and cover block movement and sight alike; carpets
// never block anything. No drawing and no browser in here.
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// The smallest signed turn from angle a to angle b, in [-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when a circle touches or overlaps a rectangle {x, y, w, h}.
export function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// True when two rectangles {x, y, w, h} overlap.
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Move a circle by (dx, dy), axis by axis, so it slides along walls instead
// of sticking: try x first, then y, bouncing off any solid it would touch.
export function moveCircle(x, y, r, dx, dy, solids) {
  let nx = x + dx;
  let hitX = false;
  for (const s of solids) {
    if (circleHitsRect(nx, y, r, s)) {
      hitX = true;
      nx = dx > 0 ? s.x - r : dx < 0 ? s.x + s.w + r : nx;
      if (circleHitsRect(nx, y, r, s)) nx = x;
      break;
    }
  }
  let ny = y + dy;
  let hitY = false;
  for (const s of solids) {
    if (circleHitsRect(nx, ny, r, s)) {
      hitY = true;
      ny = dy > 0 ? s.y - r : dy < 0 ? s.y + s.h + r : ny;
      if (circleHitsRect(nx, ny, r, s)) ny = y;
      break;
    }
  }
  return { x: nx, y: ny, hitX, hitY };
}

// True when the point (px, py) sits inside a watcher's cone: within range
// and within halfAngle of the watcher's facing angle.
export function inCone(wx, wy, angle, range, halfAngle, px, py) {
  const d = dist(wx, wy, px, py);
  if (d > range) return false;
  if (d < 1) return true;
  const to = Math.atan2(py - wy, px - wx);
  return Math.abs(angleDiff(angle, to)) <= halfAngle;
}

// True when the segment (x1,y1)-(x2,y2) touches a rectangle: Liang-Barsky.
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.x, rect.x + rect.w - x1, y1 - rect.y, rect.y + rect.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

// True when the segment (x1,y1)-(x2,y2) touches a circle (cx, cy, r).
export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const nx = x1 + dx * t;
  const ny = y1 + dy * t;
  const ddx = cx - nx;
  const ddy = cy - ny;
  return ddx * ddx + ddy * ddy <= r * r;
}

// True when nothing blocks the view from (x1,y1) to (x2,y2): no wall or
// cover rectangle in the way.
export function losClear(x1, y1, x2, y2, blockers) {
  for (const b of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

// True when a smoke cloud hides the thief from a watcher at (x1,y1): the
// sight line crosses a cloud, or the thief stands inside one.
export function smokeBlocks(x1, y1, x2, y2, clouds) {
  for (const c of clouds) {
    if (segmentHitsCircle(x1, y1, x2, y2, c.x, c.y, c.radius)) return true;
  }
  return false;
}
