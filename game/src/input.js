// Velvet Vault — keyboard and mouse. WASD/arrows move, Shift sneaks, Space
// cracks, Q drops smoke, F or a click throws a noise coin at the mouse, E
// fires the EMP, P pauses, M mutes, Enter starts, R restarts. Edge-triggered
// actions (smoke/coin/emp/pause) are flags the main loop consumes once.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    moveX: 0,
    moveY: 0,
    sneak: false,
    crack: false,
    smoke: false,
    coin: false,
    coinX: 0,
    coinY: 0,
    emp: false,
    pausePressed: false,
    startPressed: false,
    restartPressed: false,
    muted: false,
    mouseX: 0,
    mouseY: 0,
  };

  function refreshMovement() {
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    input.moveX = (right ? 1 : 0) - (left ? 1 : 0);
    input.moveY = (down ? 1 : 0) - (up ? 1 : 0);
    input.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.crack = keys.has('Space');
  }

  function logicalMouse(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyQ') input.smoke = true;
    if (event.code === 'KeyF') {
      input.coin = true;
      input.coinX = input.mouseX;
      input.coinY = input.mouseY;
    }
    if (event.code === 'KeyE') input.emp = true;
    if (event.code === 'KeyP' || event.code === 'Escape') input.pausePressed = true;
    if (event.code === 'Enter') input.startPressed = true;
    if (event.code === 'KeyR') input.restartPressed = true;
    if (event.code === 'KeyM') input.muted = !input.muted;
    refreshMovement();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
    refreshMovement();
  }

  function onMouseMove(event) {
    const p = logicalMouse(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  }

  function onMouseDown(event) {
    const p = logicalMouse(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.coin = true;
    input.coinX = p.x;
    input.coinY = p.y;
  }

  function onBlur() {
    keys.clear();
    refreshMovement();
  }

  function attach() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('blur', onBlur);
  }

  // Consume the edge-triggered flags after one world step.
  function consumeEdges() {
    input.smoke = false;
    input.coin = false;
    input.emp = false;
    input.pausePressed = false;
    input.startPressed = false;
    input.restartPressed = false;
  }

  attach();
  return { input, consumeEdges };
}
