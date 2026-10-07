// Keyboard + mouse (pointer lock) + touch (virtual stick, drag-to-look, buttons).
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    moveX: 0, moveY: 0, lookDX: 0, lookDY: 0,
    sprint: false, aim: false,
    pressed: new Set(), // one-shot actions this frame: jump, attack, interact, fire, roll, skip
    touch: matchMedia('(pointer: coarse)').matches,
    enabled: true,
  };
  const press = (a) => input.pressed.add(a);

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space') { press('jump'); press('advance'); e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'Enter') { press('interact'); press('advance'); }
    if (e.code === 'KeyC' || e.code === 'ControlLeft') press('roll');
    if (e.code === 'KeyF') input.aimToggle = !input.aimToggle;
    if (e.code === 'Escape' || e.code === 'KeyP') press('pause');
    if (e.code === 'KeyV') press('camera');
    if (e.code === 'KeyQ') press('spirit');
    if (e.code === 'Tab') { press('journal'); e.preventDefault(); }
    if (e.code === 'KeyR') press('pray');
    if (e.code === 'Digit1') press('choice1');
    if (e.code === 'Digit2') press('choice2');
    if (e.code === 'Digit3') press('choice3');
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    if (input.touch) return;
    if (document.pointerLockElement !== canvas && input.enabled) canvas.requestPointerLock?.();
    if (e.button === 0) { press('attack'); press('fire'); }
    if (e.button === 2) input.rmb = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 2) input.rmb = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) { input.lookDX += e.movementX; input.lookDY += e.movementY; }
  });

  // --- Touch UI ---
  const ui = document.getElementById('touch');
  if (input.touch) {
    ui.hidden = false;
    const stick = ui.querySelector('.stick'), knob = ui.querySelector('.knob');
    let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
    const R = 50;
    ui.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        const btn = t.target.closest('[data-act]');
        if (btn) {
          const a = btn.dataset.act;
          if (a === 'aim') input.aimToggle = !input.aimToggle;
          else if (a === 'sprint') input.touchSprint = !input.touchSprint;
          else { press(a); if (a === 'attack') press('fire'); if (a === 'interact' || a === 'jump') press('advance'); }
          btn.classList.toggle('on', a === 'aim' ? input.aimToggle : a === 'sprint' ? input.touchSprint : false);
          continue;
        }
        if (t.clientX < innerWidth * 0.45 && stickId === null) {
          stickId = t.identifier; sx = t.clientX; sy = t.clientY;
          stick.style.left = sx + 'px'; stick.style.top = sy + 'px'; stick.classList.add('active');
        } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; press('advance'); }
      }
      e.preventDefault();
    }, { passive: false });
    ui.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          input.tx = dx / R; input.ty = -dy / R;
        } else if (t.identifier === lookId) {
          input.lookDX += (t.clientX - lx) * 2.2; input.lookDY += (t.clientY - ly) * 2.2;
          lx = t.clientX; ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; input.tx = input.ty = 0; knob.style.transform = ''; stick.classList.remove('active'); }
        if (t.identifier === lookId) lookId = null;
      }
    };
    ui.addEventListener('touchend', end); ui.addEventListener('touchcancel', end);
  }

  input.poll = () => {
    let x = 0, y = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (input.tx || input.ty) { x = input.tx; y = input.ty; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    input.moveX = x; input.moveY = y;
    input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || !!input.touchSprint;
    input.aim = !!input.rmb || !!input.aimToggle;
  };
  // UI-consumed presses (advance/choice) survive the frame; the dialogue code consumes them.
  const keep = new Set(['advance', 'choice1', 'choice2', 'choice3']);
  input.endFrame = () => {
    for (const a of input.pressed) if (!keep.has(a)) input.pressed.delete(a);
    input.lookDX = 0; input.lookDY = 0;
  };
  input.clearUI = () => keep.forEach((a) => input.pressed.delete(a));
  return input;
}
