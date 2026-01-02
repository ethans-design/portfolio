// Overgrown Dusk Parry – HARD MODE + textured platforms + pits (no spikes)
// Controls: A/D move, W/Space jump (hold = floatier), J parry, K sword

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

ctx.imageSmoothingEnabled = false;

const SCREEN_W = canvas.width;
const SCREEN_H = canvas.height;

// ---- Background image (put file at: assets/bg_far.png) ----
const bgFar = new Image();
bgFar.src = "assets/bg_far.png";

const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " ") e.preventDefault();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rectHit(a, b) {
  return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}
function circleRect(cx, cy, r, rect) {
  const x = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const y = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - x, dy = cy - y;
  return dx*dx + dy*dy <= r*r;
}
function wantsJump(){ return keys["w"] || keys[" "] || keys["arrowup"]; }

// =====================
// FEEL (air time ~2x, height ~20% lower)
// =====================
const MOVE_SPEED = 4.0;

// Slower overall airtime (floatier) + lower height
const GRAVITY = 0.42;            // lower gravity = more hang time
const FALL_GRAVITY_MULT = 0.55;  // even slower descent
const JUMP_VY = -7.2;            // lower height than before
const HOLD_GRAVITY_MULT = 0.10;  // floaty ascent when holding jump
const MAX_FALL_SPEED = 9.5;      // slows fall a lot

// Still “hard”, but not twitchy
const COYOTE_MS = 190;
const JUMP_BUFFER_MS = 180;

// Parry: tighter window
const PARRY_WINDOW = 110;
const PARRY_COOLDOWN = 420;
const PARRY_RADIUS = 52;

// Sword
const SWORD_ACTIVE_MS = 110;
const SWORD_COOLDOWN_MS = 220;
const SWORD_RANGE = 44;
const SWORD_HEIGHT = 34;
const SWORD_DAMAGE = 1;

// Enemy bullets
const BULLET_SPEED = 6.6;
const BULLET_R = 6;

// =====================
// WORLD (pits = gaps in ground)
// =====================
const world = {
  width: 7800,
  height: 720,

  // Platforms can optionally move. We track dx/dy each frame for carry.
  platforms: [
    // Ground chunks (gaps = pits)
    { x: 0,    y: 672, w: 760,  h: 48 },
    { x: 1340, y: 672, w: 520,  h: 48 },
    { x: 2550, y: 672, w: 640,  h: 48 },
    { x: 3920, y: 672, w: 620,  h: 48 },
    { x: 5200, y: 672, w: 560,  h: 48 },
    { x: 6200, y: 672, w: 1600, h: 48 },

    // Section 1
    { x: 220,  y: 560, w: 220, h: 24 },
    { x: 520,  y: 500, w: 190, h: 24 },
    { x: 820,  y: 430, w: 160, h: 24 },
    { x: 1080, y: 560, w: 200, h: 24 },

    // Moving platform over a pit (vertical)
    { baseX: 1400, baseY: 520, x: 1400, y: 520, w: 150, h: 24, motion: { axis: "y", amp: 60, speed: 0.0012 } },
    { x: 1660, y: 440, w: 160, h: 24 },

    // Section 2
    { x: 1980, y: 600, w: 140, h: 24 },
    { x: 2220, y: 520, w: 130, h: 24 },
    { x: 2440, y: 440, w: 120, h: 24 },
    { x: 2650, y: 560, w: 150, h: 24 },

    // Moving horizontal platform (IMPORTANT: carries player)
    { baseX: 2920, baseY: 500, x: 2920, y: 500, w: 170, h: 24, motion: { axis: "x", amp: 150, speed: 0.0011 } },
    { x: 3230, y: 420, w: 150, h: 24 },

    // Section 3
    { x: 3520, y: 600, w: 170, h: 24 },
    { x: 3780, y: 520, w: 160, h: 24 },
    { x: 4060, y: 450, w: 150, h: 24 },
    { x: 4350, y: 560, w: 170, h: 24 },

    // Long gap + moving rescue platform (vertical)
    { baseX: 4700, baseY: 600, x: 4700, y: 600, w: 160, h: 24, motion: { axis: "y", amp: 80, speed: 0.00135 } },
    { x: 4980, y: 500, w: 150, h: 24 },

    // End stretch
    { x: 5280, y: 420, w: 190, h: 24 },
    { x: 5600, y: 520, w: 150, h: 24 },
    { x: 5880, y: 600, w: 220, h: 24 },
  ]
};

// =====================
// PLAYER
// =====================
const player = {
  x: 120, y: 300,
  w: 32, h: 48,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1,

  parryUntil: 0,
  parryCooldown: 0,

  lastGroundedAt: 0,
  jumpBufferedAt: -9999,
  jumpLock: false,

  swordUntil: 0,
  swordCooldown: 0,
  swordLock: false,

  standingOn: null, // platform reference when grounded
};

// =====================
// ENEMIES
// =====================
const enemies = [
  { x: 1120, y: 560 - 48, w: 32, h: 48, hp: 3, nextShot: 0, shootEveryMs: 650 },
  { x: 3720, y: 520 - 48, w: 32, h: 48, hp: 4, nextShot: 0, shootEveryMs: 580 },
  { x: 6600, y: 672 - 48, w: 32, h: 48, hp: 6, nextShot: 0, shootEveryMs: 520 },
];

let bullets = [];
let cameraX = 0;

// =====================
// TEXTURED PLATFORM PATTERN
// =====================
function makePlatformPattern() {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;

  // base metal
  g.fillStyle = "#232a3b";
  g.fillRect(0, 0, 32, 32);

  // panel seams
  g.fillStyle = "rgba(255,255,255,0.06)";
  g.fillRect(0, 10, 32, 1);
  g.fillRect(0, 22, 32, 1);
  g.fillRect(15, 0, 1, 32);

  // rivets
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (let y of [6, 18, 28]) {
    for (let x of [6, 26]) g.fillRect(x, y, 2, 2);
  }

  // moss specks
  g.fillStyle = "rgba(120,255,200,0.18)";
  for (let i = 0; i < 26; i++) {
    const x = (i * 7) % 32;
    const y = (i * 11) % 32;
    g.fillRect(x, y, 1, 1);
  }

  return ctx.createPattern(c, "repeat");
}
const platformPattern = makePlatformPattern();

function drawPlatform(p) {
  const sx = p.x - cameraX;
  if (sx + p.w < -120 || sx > SCREEN_W + 120) return;

  ctx.fillStyle = platformPattern;
  ctx.fillRect(sx, p.y, p.w, p.h);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(sx, p.y, p.w, 3);

  ctx.fillStyle = "rgba(120,255,200,0.10)";
  for (let x = 0; x < p.w; x += 12) ctx.fillRect(sx + x, p.y + 2, 6, 2);

  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.fillRect(sx, p.y + p.h - 4, p.w, 4);
}

// =====================
// BACKGROUND (infinite)
// =====================
function drawInfiniteBg(img, parallax = 0.22) {
  if (!img.complete) return;

  const scale = SCREEN_H / img.height;
  const drawW = Math.floor(img.width * scale);
  const drawH = SCREEN_H;

  let x = -((cameraX * parallax) % drawW);
  if (x > 0) x -= drawW;

  for (; x < SCREEN_W; x += drawW) ctx.drawImage(img, x, 0, drawW, drawH);
}

// =====================
// CAMERA
// =====================
function updateCamera() {
  const target = player.x - (SCREEN_W * 0.42);
  cameraX = clamp(target, 0, world.width - SCREEN_W);
}

// =====================
// MOVING PLATFORMS (with dx/dy tracking)
// =====================
function updatePlatforms(t) {
  for (const p of world.platforms) {
    // track previous position
    p.prevX = p.x;
    p.prevY = p.y;

    if (!p.motion) {
      p.dx = 0; p.dy = 0;
      continue;
    }

    const m = p.motion;
    const s = Math.sin(t * m.speed * Math.PI * 2);

    if (m.axis === "x") {
      p.x = p.baseX + s * m.amp;
      p.y = p.baseY;
    } else {
      p.x = p.baseX;
      p.y = p.baseY + s * m.amp;
    }

    p.dx = p.x - p.prevX;
    p.dy = p.y - p.prevY;
  }
}

// =====================
// COMBAT HELPERS
// =====================
function playerCenter() {
  return { cx: player.x + player.w/2, cy: player.y + player.h/2 };
}
function swordHitbox() {
  const px = player.x + player.w/2;
  const py = player.y + player.h/2;

  const w = SWORD_RANGE;
  const h = SWORD_HEIGHT;
  const x = (player.facing === 1) ? (px + 8) : (px - 8 - w);
  const y = py - h/2;

  return { x, y, w, h };
}

// =====================
// INPUT + MOVEMENT
// =====================
function handleMovement(t) {
  if (keys["a"] || keys["arrowleft"]) { player.vx = -MOVE_SPEED; player.facing = -1; }
  else if (keys["d"] || keys["arrowright"]) { player.vx = MOVE_SPEED; player.facing = 1; }
  else player.vx *= player.onGround ? 0.70 : 0.92;

  // jump buffer
  if (wantsJump() && !player.jumpLock) {
    player.jumpBufferedAt = t;
    player.jumpLock = true;
  }
  if (!wantsJump()) player.jumpLock = false;

  // parry
  if (keys["j"] && t > player.parryCooldown) {
    player.parryUntil = t + PARRY_WINDOW;
    player.parryCooldown = player.parryUntil + PARRY_COOLDOWN;
  }

  // sword
  if (keys["k"] && !player.swordLock && t > player.swordCooldown) {
    player.swordUntil = t + SWORD_ACTIVE_MS;
    player.swordCooldown = player.swordUntil + SWORD_COOLDOWN_MS;
    player.swordLock = true;
  }
  if (!keys["k"]) player.swordLock = false;
}

function applyGravity() {
  const holding = wantsJump();
  const rising = player.vy < 0;

  let g = GRAVITY;

  // floaty ascent when holding jump
  if (holding && rising) g *= HOLD_GRAVITY_MULT;

  // floaty descent always (this is what doubles airtime)
  if (!rising) g *= FALL_GRAVITY_MULT;

  player.vy += g;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);
}

// =====================
// COLLISION / RESPAWN (pits only)
// =====================
function respawn(t) {
  player.x = 120; player.y = 300;
  player.vx = 0; player.vy = 0;
  player.lastGroundedAt = t;
  player.standingOn = null;
}

function carryWithPlatform() {
  if (!player.onGround || !player.standingOn) return;

  const p = player.standingOn;

  // If the platform moved, move the player with it
  if (p.dx || p.dy) {
    player.x += p.dx;
    player.y += p.dy;
  }
}

function moveAndCollide(t) {
  // clear standing platform each frame (reacquire on landing)
  player.standingOn = null;

  player.x += player.vx;
  player.x = clamp(player.x, 0, world.width - player.w);

  player.y += player.vy;

  player.onGround = false;

  for (const p of world.platforms) {
    if (!rectHit(player, p)) continue;

    const prevY = player.y - player.vy;

    // land on top
    if (player.vy > 0 && prevY + player.h <= p.y + 2) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.lastGroundedAt = t;
      player.standingOn = p; // keep reference for carry
    }
    // head bump
    else if (player.vy < 0 && prevY >= p.y + p.h - 2) {
      player.y = p.y + p.h;
      player.vy = 0;
    }
  }

  // Apply carry AFTER collision resolve so it feels glued to platform
  carryWithPlatform();

  // coyote + buffered jump
  const canCoyote = (t - player.lastGroundedAt) <= COYOTE_MS;
  const buffered = (t - player.jumpBufferedAt) <= JUMP_BUFFER_MS;

  if (buffered && (player.onGround || canCoyote)) {
    player.vy = JUMP_VY;
    player.onGround = false;
    player.jumpBufferedAt = -9999;
    player.lastGroundedAt = -9999;
    player.standingOn = null;
  }

  // pits = fall
  if (player.y > world.height + 200) respawn(t);
}

// =====================
// ENEMIES + BULLETS
// =====================
function enemyShoot(t) {
  const px = player.x + player.w/2;
  const py = player.y + player.h/2;

  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (t < e.nextShot) continue;

    // only shoot when near camera
    const distToCam = Math.abs((e.x - cameraX) - SCREEN_W * 0.6);
    if (distToCam > 1200) { e.nextShot = t + 250; continue; }

    e.nextShot = t + e.shootEveryMs;

    const ex = e.x + e.w/2;
    const ey = e.y + e.h/2;

    const dx = px - ex;
    const dy = py - ey;
    const len = Math.hypot(dx, dy) || 1;

    bullets.push({
      x: ex, y: ey,
      vx: (dx/len) * BULLET_SPEED,
      vy: (dy/len) * BULLET_SPEED,
      r: BULLET_R,
      from: "enemy",
    });
  }
}

function updateBullets(t) {
  const { cx, cy } = playerCenter();

  bullets = bullets.filter(b => {
    b.x += b.vx;
    b.y += b.vy;

    // off world
    if (b.x < -120 || b.x > world.width + 120 || b.y < -120 || b.y > world.height + 120) return false;

    // hit platforms -> delete
    for (const p of world.platforms) {
      if (circleRect(b.x, b.y, b.r, p)) return false;
    }

    // parry reflect
    if (t < player.parryUntil && b.from === "enemy") {
      if (Math.hypot(b.x - cx, b.y - cy) < PARRY_RADIUS) {
        // reflect toward nearest alive enemy
        let target = null;
        let best = Infinity;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const ex = e.x + e.w/2;
          const ey = e.y + e.h/2;
          const d = Math.hypot(ex - b.x, ey - b.y);
          if (d < best) { best = d; target = { ex, ey }; }
        }
        if (!target) target = { ex: b.x + 1, ey: b.y };

        const tx = target.ex - b.x;
        const ty = target.ey - b.y;
        const tlen = Math.hypot(tx, ty) || 1;

        const newSpeed = Math.hypot(b.vx, b.vy) * 1.30;
        b.vx = (tx/tlen) * newSpeed;
        b.vy = (ty/tlen) * newSpeed;
        b.from = "player";
      }
    }

    // reflected hits enemies
    if (b.from === "player") {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (circleRect(b.x, b.y, b.r, e)) {
          e.hp--;
          return false;
        }
      }
    }

    // enemy bullet hits player = respawn
    if (b.from === "enemy" && circleRect(b.x, b.y, b.r, player)) {
      respawn(t);
      return false;
    }

    return true;
  });
}

function updateSword(t) {
  if (!(t < player.swordUntil)) return;

  const hb = swordHitbox();
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (rectHit(hb, e)) {
      e.hp -= SWORD_DAMAGE;
      player.swordUntil = 0; // one hit per swing
      break;
    }
  }
}

// =====================
// DRAW
// =====================
function draw(t) {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

  // infinite bg
  drawInfiniteBg(bgFar, 0.22);

  // platforms (textured)
  for (const p of world.platforms) drawPlatform(p);

  // enemies
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const sx = e.x - cameraX;
    if (sx < -120 || sx > SCREEN_W + 120) continue;
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(sx, e.y, e.w, e.h);
  }

  // player
  ctx.fillStyle = "#eaeaea";
  ctx.fillRect(player.x - cameraX, player.y, player.w, player.h);

  // parry ring
  const cx = (player.x - cameraX) + player.w/2;
  const cy = player.y + player.h/2;
  if (t < player.parryUntil) {
    ctx.beginPath();
    ctx.arc(cx, cy, PARRY_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // sword hitbox
  if (t < player.swordUntil) {
    const hb = swordHitbox();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(hb.x - cameraX, hb.y, hb.w, hb.h);
  }

  // bullets
  for (const b of bullets) {
    const sx = b.x - cameraX;
    if (sx < -100 || sx > SCREEN_W + 100) continue;
    ctx.beginPath();
    ctx.arc(sx, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.from === "enemy" ? "#ffd166" : "#4dd6ff";
    ctx.fill();
  }
}

// =====================
// LOOP
// =====================
function update(t) {
  updatePlatforms(t);
  handleMovement(t);
  applyGravity();
  moveAndCollide(t);
  enemyShoot(t);
  updateBullets(t);
  updateSword(t);
  updateCamera();

  const alive = enemies.reduce((n, e) => n + (e.hp > 0 ? 1 : 0), 0);
  const parryActive = t < player.parryUntil;
  const swordActive = t < player.swordUntil;
  const cdLeft = Math.max(0, player.parryCooldown - t);

  statusEl.textContent =
    `Enemies: ${alive} • ` +
    (swordActive ? "SLASH" : "") +
    (parryActive ? " PARRY!" : cdLeft > 0 ? ` Parry CD: ${Math.ceil(cdLeft)}ms` : " Parry Ready");
}

function loop(t) {
  update(t);
  draw(t);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
