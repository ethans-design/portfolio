// project1.js
// Longer + more vertical + more enemies + thinner platforms + sunset-themed textures
// Controls: A/D move, W/Space jump (hold = floatier), J parry, K sword

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

ctx.imageSmoothingEnabled = false;

const SCREEN_W = canvas.width;
const SCREEN_H = canvas.height;

// ---- Images ----
const bgFar = new Image();
bgFar.src = "assets/bg_far.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

// Simple loading status
function assetsReady() {
  return bgFar.complete && bgFar.naturalWidth > 0 && playerImg.complete && playerImg.naturalWidth > 0;
}

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " ") e.preventDefault();
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rectHit(a, b) {
  return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}
function circleRect(cx, cy, r, rect) {
  const x = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const y = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - x, dy = cy - y;
  return dx * dx + dy * dy <= r * r;
}
function wantsJump() { return keys["w"] || keys[" "] || keys["arrowup"]; }

// =====================
// FEEL (keep your floaty hang)
// =====================
const MOVE_SPEED = 2.5;

const GRAVITY = 0.42;
const FALL_GRAVITY_MULT = 0.55;
const JUMP_VY = -7.2;
const HOLD_GRAVITY_MULT = 0.23;
const MAX_FALL_SPEED = 9.5;

const COYOTE_MS = 190;
const JUMP_BUFFER_MS = 180;

// Parry
const PARRY_WINDOW = 210;
const PARRY_COOLDOWN = 120;
const PARRY_RADIUS = 52;

// Sword
const SWORD_ACTIVE_MS = 110;
const SWORD_COOLDOWN_MS = 120;
const SWORD_RANGE = 64;
const SWORD_HEIGHT = 24;
const SWORD_DAMAGE = 5;

// Enemy bullets
const BULLET_SPEED = 5.5;
const BULLET_R = 5;

// =====================
// WORLD (thinner platforms, longer, more vertical beats)
// =====================
const THIN = 14;
const GROUND = 18;
const WALL_W = 28;

const world = {
  width: 12500,
  height: 720,
  platforms: [
    // Ground chunks (pits between)
    { x: 0,    y: 720 - GROUND, w: 820,  h: GROUND },
    { x: 1320, y: 720 - GROUND, w: 620,  h: GROUND },
    { x: 2480, y: 720 - GROUND, w: 740,  h: GROUND },
    { x: 3860, y: 720 - GROUND, w: 700,  h: GROUND },
    { x: 5200, y: 720 - GROUND, w: 620,  h: GROUND },
    { x: 6480, y: 720 - GROUND, w: 760,  h: GROUND },
    { x: 8000, y: 720 - GROUND, w: 820,  h: GROUND },
    { x: 9500, y: 720 - GROUND, w: 760,  h: GROUND },
    { x: 10900,y: 720 - GROUND, w: 1600, h: GROUND },

    // Section A
    { x: 220,  y: 560, w: 240, h: THIN },
    { x: 560,  y: 500, w: 200, h: THIN },
    { x: 880,  y: 430, w: 170, h: THIN },
    { x: 1140, y: 560, w: 220, h: THIN },

    // Wall gate + climb
    { x: 1500, y: 720 - GROUND - 220, w: WALL_W, h: 220 },
    { x: 1420, y: 520, w: 120, h: THIN },
    { x: 1565, y: 470, w: 150, h: THIN },
    { x: 1760, y: 420, w: 170, h: THIN },
    { x: 1980, y: 520, w: 200, h: THIN },

    // Moving rescue over pit
    { baseX: 2260, baseY: 560, x: 2260, y: 560, w: 160, h: THIN, motion: { axis: "y", amp: 70, speed: 0.000125 } },
    { x: 2520, y: 470, w: 160, h: THIN },

    // Taller climb
    { x: 2860, y: 600, w: 150, h: THIN },
    { x: 3100, y: 540, w: 140, h: THIN },
    { x: 3330, y: 480, w: 130, h: THIN },
    { x: 3560, y: 420, w: 150, h: THIN },
    { x: 3800, y: 360, w: 180, h: THIN },

    // Wall + drop section
    { x: 4140, y: 720 - GROUND - 260, w: WALL_W, h: 260 },
    { x: 3980, y: 420, w: 140, h: THIN },
    { x: 4185, y: 520, w: 170, h: THIN },
    { x: 4420, y: 610, w: 220, h: THIN },

    // Horizontal moving platform carry test
    { baseX: 4780, baseY: 520, x: 4780, y: 520, w: 180, h: THIN, motion: { axis: "x", amp: 190, speed: 0.00105 } },
    { x: 5120, y: 460, w: 170, h: THIN },
    { x: 5400, y: 400, w: 200, h: THIN },

    // Tower climb
    { x: 5860, y: 620, w: 160, h: THIN },
    { x: 6100, y: 560, w: 150, h: THIN },
    { x: 6340, y: 500, w: 140, h: THIN },
    { x: 6580, y: 440, w: 150, h: THIN },
    { x: 6840, y: 380, w: 180, h: THIN },

    // Wall cap + drop
    { x: 7200, y: 720 - GROUND - 300, w: WALL_W, h: 300 },
    { x: 7020, y: 420, w: 160, h: THIN },
    { x: 7245, y: 370, w: 180, h: THIN },
    { x: 7500, y: 520, w: 220, h: THIN },

    // Long pit chain
    { x: 7920, y: 560, w: 170, h: THIN },
    { x: 8200, y: 500, w: 150, h: THIN },
    { x: 8460, y: 440, w: 150, h: THIN },
    { x: 8740, y: 520, w: 170, h: THIN },
    { x: 9020, y: 600, w: 220, h: THIN },

    // Final climb + moving
    { baseX: 9600, baseY: 560, x: 9600, y: 560, w: 170, h: THIN, motion: { axis: "y", amp: 90, speed: 0.00013 } },
    { x: 9880, y: 480, w: 170, h: THIN },
    { x: 10140,y: 400, w: 200, h: THIN },
    { x: 10460,y: 520, w: 220, h: THIN },

    // Last wall + top ledges
    { x: 10760, y: 720 - GROUND - 240, w: WALL_W, h: 240 },
    { x: 10580, y: 450, w: 160, h: THIN },
    { x: 10805, y: 410, w: 200, h: THIN },
    { x: 11110, y: 370, w: 240, h: THIN },
  ],
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

  standingOn: null,
};

// =====================
// ENEMIES
// =====================
const enemies = [
  { x: 620,  y: 500 - 48, w: 32, h: 48, hp: 3, nextShot: 0, shootEveryMs: 820 },
  { x: 1260, y: 560 - 48, w: 32, h: 48, hp: 3, nextShot: 0, shootEveryMs: 760 },
  { x: 1740, y: 420 - 48, w: 32, h: 48, hp: 4, nextShot: 0, shootEveryMs: 720 },
  { x: 2050, y: 520 - 48, w: 32, h: 48, hp: 4, nextShot: 0, shootEveryMs: 680 },
  { x: 3120, y: 540 - 48, w: 32, h: 48, hp: 4, nextShot: 0, shootEveryMs: 650 },
  { x: 3820, y: 360 - 48, w: 32, h: 48, hp: 5, nextShot: 0, shootEveryMs: 620 },
  { x: 4420, y: 610 - 48, w: 32, h: 48, hp: 4, nextShot: 0, shootEveryMs: 640 },
  { x: 5400, y: 400 - 48, w: 32, h: 48, hp: 5, nextShot: 0, shootEveryMs: 610 },
  { x: 6100, y: 560 - 48, w: 32, h: 48, hp: 4, nextShot: 0, shootEveryMs: 680 },
  { x: 6840, y: 380 - 48, w: 32, h: 48, hp: 6, nextShot: 0, shootEveryMs: 590 },
  { x: 8740, y: 520 - 48, w: 32, h: 48, hp: 5, nextShot: 0, shootEveryMs: 620 },
  { x: 9020, y: 600 - 48, w: 32, h: 48, hp: 5, nextShot: 0, shootEveryMs: 600 },
  { x: 10140, y: 400 - 48, w: 32, h: 48, hp: 6, nextShot: 0, shootEveryMs: 580 },
  { x: 11250, y: 370 - 48, w: 32, h: 48, hp: 7, nextShot: 0, shootEveryMs: 560 },
];

let bullets = [];
let cameraX = 0;

// =====================
// PLATFORM TEXTURE
// =====================
function makeSunsetPlatformPattern() {
  const c = document.createElement("canvas");
  c.width = 48; c.height = 24;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;

  g.fillStyle = "#4a2a56";
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = "rgba(255, 182, 102, 0.18)";
  for (let i = 0; i < 10; i++) {
    const x = (i * 11) % c.width;
    const y = (i * 7) % c.height;
    g.fillRect(x, y, 8, 1);
    if (i % 2 === 0) g.fillRect(x + 3, y + 6, 10, 1);
  }

  g.fillStyle = "rgba(10, 6, 14, 0.22)";
  for (let i = 0; i < 14; i++) {
    const x = (i * 9) % c.width;
    const y = (i * 5) % c.height;
    g.fillRect(x, y, 1, 6);
  }

  g.fillStyle = "rgba(214, 120, 206, 0.22)";
  for (let i = 0; i < 36; i++) {
    const x = (i * 13) % c.width;
    const y = (i * 17) % c.height;
    g.fillRect(x, y, 1, 1);
  }

  return ctx.createPattern(c, "repeat");
}
const platformPattern = makeSunsetPlatformPattern();

function drawPlatform(p) {
  const sx = p.x - cameraX;
  if (sx + p.w < -160 || sx > SCREEN_W + 160) return;

  ctx.fillStyle = platformPattern;
  ctx.fillRect(sx, p.y, p.w, p.h);

  ctx.fillStyle = "rgba(255, 205, 140, 0.22)";
  ctx.fillRect(sx, p.y, p.w, 2);

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(sx, p.y + p.h - 3, p.w, 3);

  ctx.strokeStyle = "rgba(20, 10, 30, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
}

// =====================
// BG (infinite)
// =====================
function drawInfiniteBg(img, parallax = 0.16) {
  if (!img.complete || img.naturalWidth === 0) return;

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
// MOVING PLATFORMS
// =====================
function updatePlatforms(t) {
  for (const p of world.platforms) {
    p.prevX = p.x;
    p.prevY = p.y;

    if (!p.motion) { p.dx = 0; p.dy = 0; continue; }

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
  return { cx: player.x + player.w / 2, cy: player.y + player.h / 2 };
}
function swordHitbox() {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const w = SWORD_RANGE;
  const h = SWORD_HEIGHT;
  const x = (player.facing === 1) ? (px + 8) : (px - 8 - w);
  const y = py - h / 2;
  return { x, y, w, h };
}

// =====================
// INPUT + PHYSICS
// =====================
function handleMovement(t) {
  if (keys["a"] || keys["arrowleft"]) { player.vx = -MOVE_SPEED; player.facing = -1; }
  else if (keys["d"] || keys["arrowright"]) { player.vx = MOVE_SPEED; player.facing = 1; }
  else player.vx *= player.onGround ? 0.70 : 0.92;

  if (wantsJump() && !player.jumpLock) { player.jumpBufferedAt = t; player.jumpLock = true; }
  if (!wantsJump()) player.jumpLock = false;

  if (keys["j"] && t > player.parryCooldown) {
    player.parryUntil = t + PARRY_WINDOW;
    player.parryCooldown = player.parryUntil + PARRY_COOLDOWN;
  }

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
  if (holding && rising) g *= HOLD_GRAVITY_MULT;
  if (!rising) g *= FALL_GRAVITY_MULT;

  player.vy += g;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);
}

// =====================
// RESPAWN
// =====================
function respawn(t) {
  player.x = 120; player.y = 300;
  player.vx = 0; player.vy = 0;
  player.lastGroundedAt = t;
  player.standingOn = null;
  bullets.length = 0;
}

// =====================
// COLLISION (includes side walls)
// =====================
function carryWithPlatform() {
  if (!player.onGround || !player.standingOn) return;
  const p = player.standingOn;
  if (p.dx || p.dy) { player.x += p.dx; player.y += p.dy; }
}

function moveAndCollide(t) {
  player.standingOn = null;

  const prevX = player.x;
  const prevY = player.y;

  // X move + side collisions
  player.x += player.vx;
  player.x = clamp(player.x, 0, world.width - player.w);

  for (const p of world.platforms) {
    if (!rectHit(player, p)) continue;
    if (prevX + player.w <= p.x + 0.5) { player.x = p.x - player.w; player.vx = 0; }
    else if (prevX >= p.x + p.w - 0.5) { player.x = p.x + p.w; player.vx = 0; }
  }

  // Y move + floor/ceiling
  player.y += player.vy;
  player.onGround = false;

  for (const p of world.platforms) {
    if (!rectHit(player, p)) continue;

    if (player.vy > 0 && prevY + player.h <= p.y + 2) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.lastGroundedAt = t;
      player.standingOn = p;
    } else if (player.vy < 0 && prevY >= p.y + p.h - 2) {
      player.y = p.y + p.h;
      player.vy = 0;
    }
  }

  carryWithPlatform();

  const canCoyote = (t - player.lastGroundedAt) <= COYOTE_MS;
  const buffered = (t - player.jumpBufferedAt) <= JUMP_BUFFER_MS;

  if (buffered && (player.onGround || canCoyote)) {
    player.vy = JUMP_VY;
    player.onGround = false;
    player.jumpBufferedAt = -9999;
    player.lastGroundedAt = -9999;
    player.standingOn = null;
  }

  if (player.y > world.height + 220) respawn(t);
}

// =====================
// ENEMIES + BULLETS
// =====================
function enemyShoot(t) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;

  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (t < e.nextShot) continue;

    const distToCam = Math.abs((e.x - cameraX) - SCREEN_W * 0.55);
    if (distToCam > 410) { e.nextShot = t + 220; continue; }

    e.nextShot = t + e.shootEveryMs;

    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;

    const dx = px - ex;
    const dy = py - ey;
    const len = Math.hypot(dx, dy) || 1;

    bullets.push({
      x: ex, y: ey,
      vx: (dx / len) * BULLET_SPEED,
      vy: (dy / len) * BULLET_SPEED,
      r: BULLET_R,
      from: "enemy",
    });
  }
}

function updateBullets(t) {
  const { cx, cy } = playerCenter();

  bullets = bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;

    if (b.x < -160 || b.x > world.width + 160 || b.y < -160 || b.y > world.height + 220) return false;

    for (const p of world.platforms) {
      if (circleRect(b.x, b.y, b.r, p)) return false;
    }

    if (t < player.parryUntil && b.from === "enemy") {
      if (Math.hypot(b.x - cx, b.y - cy) < PARRY_RADIUS) {
        let target = null;
        let best = Infinity;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          const d = Math.hypot(ex - b.x, ey - b.y);
          if (d < best) { best = d; target = { ex, ey }; }
        }
        if (!target) target = { ex: b.x + 1, ey: b.y };

        const tx = target.ex - b.x;
        const ty = target.ey - b.y;
        const tlen = Math.hypot(tx, ty) || 1;

        const newSpeed = Math.hypot(b.vx, b.vy) * 1.30;
        b.vx = (tx / tlen) * newSpeed;
        b.vy = (ty / tlen) * newSpeed;
        b.from = "player";
      }
    }

    if (b.from === "player") {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (circleRect(b.x, b.y, b.r, e)) { e.hp--; return false; }
      }
    }

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
    if (rectHit(hb, e)) { e.hp -= SWORD_DAMAGE; player.swordUntil = 0; break; }
  }
}

// =====================
// DRAW
// =====================
function drawPlayerSprite() {
  const x = player.x - cameraX;
  const y = player.y;

  if (!playerImg.complete || playerImg.naturalWidth === 0) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, player.w, player.h);
    return;
  }

  if (player.facing === 1) {
    ctx.drawImage(playerImg, x, y, player.w, player.h);
  } else {
    ctx.save();
    ctx.translate(x + player.w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(playerImg, 0, 0, player.w, player.h);
    ctx.restore();
  }
}

function draw(t) {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

  drawInfiniteBg(bgFar, 0.16);

  for (const p of world.platforms) drawPlatform(p);

  // enemies (placeholder blocks)
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const sx = e.x - cameraX;
    if (sx < -160 || sx > SCREEN_W + 160) continue;
    ctx.fillStyle = "rgba(120, 50, 150, 0.9)";
    ctx.fillRect(sx, e.y, e.w, e.h);
    ctx.fillStyle = "rgba(255, 120, 240, 0.35)";
    ctx.fillRect(sx, e.y + 6, e.w, 2);
  }

  drawPlayerSprite();

  // parry ring
  const pcx = (player.x - cameraX) + player.w / 2;
  const pcy = player.y + player.h / 2;
  if (t < player.parryUntil) {
    ctx.beginPath();
    ctx.arc(pcx, pcy, PARRY_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(238, 255, 0, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // sword hitbox debug
  if (t < player.swordUntil) {
    const hb = swordHitbox();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(hb.x - cameraX, hb.y, hb.w, hb.h);
  }

  for (const b of bullets) {
    const sx = b.x - cameraX;
    if (sx < -140 || sx > SCREEN_W + 140) continue;
    ctx.beginPath();
    ctx.arc(sx, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.from === "enemy" ? "rgba(0, 17, 255, 0.95)" : "rgba(180, 120, 255, 0.95)";
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

  if (!assetsReady()) {
    const bgOk = bgFar.complete && bgFar.naturalWidth > 0;
    const plOk = playerImg.complete && playerImg.naturalWidth > 0;
    statusEl.textContent = `Loading… bg_far.png: ${bgOk ? "OK" : "MISSING"} • player.png: ${plOk ? "OK" : "MISSING"}`;
    return;
  }

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
