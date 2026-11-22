// Velvet Vault — seeded randomness. One tiny generator (mulberry32) so a
// `?seed=N` run is bit-for-bit reproducible: guard starts, camera phases and
// every patrol choice come from it, never from Math.random or the clock.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small helper bag around one generator: next() in [0,1), int(n) in
// [0,n), pick(array) and range(a,b).
export function makeRandom(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int(n) {
      return Math.floor(next() * n);
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    range(a, b) {
      return a + next() * (b - a);
    },
  };
}
