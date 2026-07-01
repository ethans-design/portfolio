// project1.js — cowboys with swords
// Fixed-timestep platformer: A/D move, W/Space jump (hold = higher, release = cut),
// S drop through thin platforms, J parry, K sword, R restart.

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

function assetsReady() {
  return bgFar.complete && bgFar.naturalWidth > 0 && playerImg.complete && playerImg.naturalWidth > 0;
}

// ---- Input ----
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
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
function wantsDown() { return keys["s"] || keys["arrowdown"]; }

// =====================
// FEEL — tuned for a fixed 60Hz step
// =====================
const STEP = 1000 / 60;

const MOVE_SPEED = 3.4;
const GROUND_ACCEL = 0.5;
const AIR_ACCEL = 0.32;
const GROUND_FRICTION = 0.78;
const AIR_DRAG = 0.96;

const GRAVITY = 0.5;
const HOLD_GRAVITY_MULT = 0.5;   // holding jump while rising = floatier apex
const FALL_GRAVITY_MULT = 1.25;  // fall faster than you rise — snappy landings
const MAX_FALL_SPEED = 11;
const JUMP_VY = -10.5;
const JUMP_CUT = 0.45;           // releasing jump early trims the arc

const COYOTE_MS = 130;
const JUMP_BUFFER_MS = 150;

const CAMERA_LERP = 0.1;
const CAMERA_LOOKAHEAD = 70;

// Combat
const PARRY_WINDOW = 210;
const PARRY_COOLDOWN = 140;
const PARRY_RADIUS = 54;

const SWORD_ACTIVE_MS = 120;
const SWORD_COOLDOWN_MS = 140;
const SWORD_RANGE = 66;
const SWORD_HEIGHT = 30;
const SWORD_DAMAGE = 5;

const BULLET_SPEED = 3.0;
const BULLET_R = 5;

const MAX_HP = 3;
const HURT_INVULN_MS = 1000;

// =====================
// WORLD
// =====================
const THIN = 14;
const GROUND = 18;
const WALL_W = 28;
const GY = 720 - GROUND; // 702

function ground(x, w) { return { x, y: GY, w, h: GROUND, solid: true }; }
function wall(x, h) { return { x, y: GY - h, w: WALL_W, h, solid: true }; }
function thin(x, y, w) { return { x, y, w, h: THIN }; }
function mover(x, y, w, axis, amp, period) {
  return { baseX: x, baseY: y, x, y, w, h: THIN, motion: { axis, amp, period } };
}

const world = {
  width: 14000,
  height: 720,
  platforms: [
    // --- Ground chunks (pits between) ---
    ground(0, 900),        // G1
    ground(1350, 720),     // G2
    ground(2620, 720),     // G3
    ground(3890, 720),     // G4
    ground(5160, 720),     // G5
    ground(6430, 820),     // G6 arena
    ground(7800, 720),     // G7
    ground(9070, 720),     // G8
    ground(10340, 720),    // G9
    ground(11610, 2390),   // G10 finale

    // --- 1: tutorial ridge ---
    thin(200, 590, 180),
    thin(480, 520, 150),
    thin(720, 450, 140),

    // pit 1
    thin(950, 610, 120),
    thin(1150, 550, 130),

    // --- 2: wall gate climb ---
    wall(1980, 200),
    thin(1700, 560, 130),
    thin(1850, 480, 130),
    thin(1960, 400, 150),

    // pit 2 — vertical mover rescue
    mover(2170, 560, 150, "y", 60, 5200),
    thin(2380, 480, 130),
    thin(2530, 560, 110),

    // --- 3: zigzag tower (sniper on top) ---
    thin(2700, 600, 140),
    thin(2920, 520, 130),
    thin(3140, 440, 130),
    thin(2980, 360, 150),
    thin(2760, 300, 160),

    // pit 3 — horizontal ferry
    mover(3460, 560, 150, "x", 150, 5600),
    thin(3740, 480, 130),

    // --- 4: double wall canyon ---
    wall(4100, 220),
    thin(3950, 560, 120),
    thin(4060, 470, 140),
    wall(4460, 220),
    thin(4310, 540, 130),
    thin(4420, 450, 140),

    // pit 4
    thin(4660, 600, 110),
    thin(4840, 520, 120),
    thin(5020, 580, 120),

    // --- 5: elevator tower ---
    wall(5750, 280),
    mover(5450, 560, 140, "y", 100, 6400),
    thin(5610, 470, 130),
    thin(5740, 390, 150),

    // pit 5
    thin(5930, 600, 110),
    thin(6110, 520, 120),
    thin(6290, 580, 120),

    // --- 6: the arena ---
    thin(6760, 560, 160),
    thin(7010, 470, 160),
    thin(6880, 360, 140),
    wall(7180, 160),

    // pit 6 — ferry
    mover(7330, 550, 150, "x", 160, 6000),
    thin(7620, 470, 130),

    // --- 7: sniper descent ---
    thin(7860, 420, 140),
    thin(8060, 500, 140),
    thin(8260, 580, 150),

    // pit 7
    thin(8570, 600, 110),
    thin(8750, 520, 120),
    thin(8930, 580, 120),

    // --- 8: watchtower ---
    thin(9130, 600, 130),
    thin(9330, 520, 130),
    thin(9530, 440, 130),
    thin(9330, 360, 140),
    thin(9130, 280, 150),
    wall(9700, 300),

    // pit 8 — elevator
    mover(9840, 560, 150, "y", 90, 5600),
    thin(10080, 480, 130),
    thin(10240, 560, 120),

    // --- 9: twin gates ---
    wall(10500, 200),
    thin(10380, 560, 120),
    thin(10540, 470, 150),
    wall(10850, 260),
    thin(10740, 520, 130),
    thin(10900, 420, 150),

    // pit 9
    thin(11110, 600, 110),
    thin(11290, 520, 120),
    thin(11470, 580, 120),

    // --- 10: final gauntlet ---
    thin(12150, 560, 160),
    thin(12400, 470, 160),
    thin(12650, 380, 170),
  ],
};

const checkpoints = [
  { x: 1420 }, { x: 2700 }, { x: 3950 }, { x: 5230 }, { x: 6500 },
  { x: 7860 }, { x: 9140 }, { x: 10400 }, { x: 11680 },
];
const GOAL_X = 13700;

// =====================
// STATE
// =====================
const player = {
  x: 120, y: 600, w: 32, h: 48,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1,
  hp: MAX_HP,
  invulnUntil: 0,

  parryUntil: 0,
  parryStartedAt: 0,
  parryCooldown: 0,

  lastGroundedAt: 0,
  jumpBufferedAt: -9999,
  jumpLock: false,
  jumpCutDone: true,
  dropUntil: 0,

  swordUntil: 0,
  swordCooldown: 0,
  swordLock: false,

  standingOn: null,
  wasOnGround: false,
};

function makeEnemies() {
  return [
    // section 1-2
    { x: 640, y: GY - 48, hp: 3, shootEveryMs: 850 },
    { x: 1550, y: GY - 48, hp: 3, shootEveryMs: 800 },
    { x: 2010, y: 400 - 48, hp: 4, shootEveryMs: 760 },
    // section 3 tower
    { x: 2810, y: 300 - 48, hp: 4, shootEveryMs: 700 },
    { x: 3200, y: GY - 48, hp: 4, shootEveryMs: 740 },
    // section 4 canyon
    { x: 4260, y: GY - 48, hp: 4, shootEveryMs: 700 },
    { x: 4470, y: 450 - 48, hp: 4, shootEveryMs: 680 },
    // section 5
    { x: 5300, y: GY - 48, hp: 5, shootEveryMs: 680 },
    { x: 5790, y: 390 - 48, hp: 5, shootEveryMs: 650 },
    // section 6 arena
    { x: 6550, y: GY - 48, hp: 4, shootEveryMs: 660 },
    { x: 6810, y: 560 - 48, hp: 4, shootEveryMs: 640 },
    { x: 6930, y: 360 - 48, hp: 5, shootEveryMs: 620 },
    { x: 7080, y: 470 - 48, hp: 4, shootEveryMs: 640 },
    // section 7
    { x: 7900, y: 420 - 48, hp: 5, shootEveryMs: 640 },
    { x: 8400, y: GY - 48, hp: 5, shootEveryMs: 640 },
    // section 8 watchtower
    { x: 9180, y: 280 - 48, hp: 5, shootEveryMs: 600 },
    { x: 9560, y: 440 - 48, hp: 5, shootEveryMs: 620 },
    // section 9 gates
    { x: 10650, y: GY - 48, hp: 5, shootEveryMs: 600 },
    { x: 10950, y: 420 - 48, hp: 6, shootEveryMs: 580 },
    // section 10 finale
    { x: 11900, y: GY - 48, hp: 5, shootEveryMs: 600 },
    { x: 12210, y: 560 - 48, hp: 5, shootEveryMs: 580 },
    { x: 12460, y: 470 - 48, hp: 6, shootEveryMs: 560 },
    { x: 12720, y: 380 - 48, hp: 6, shootEveryMs: 560 },
    { x: 13100, y: GY - 48, hp: 10, shootEveryMs: 480 },
  ].map((e) => ({ ...e, w: 32, h: 48, nextShot: 0, lastShotAt: -9999 }));
}

let enemies = makeEnemies();
let bullets = [];
let particles = [];
let cameraX = 0;
let respawnPoint = { x: 120, y: 600 };
let reachedCheckpoint = -1;
let checkpointToastUntil = 0;
let shakeUntil = 0;
let shakeMag = 0;
let gameState = "play"; // play | won
let simTime = 0;

function resetGame() {
  enemies = makeEnemies();
  bullets = [];
  particles = [];
  respawnPoint = { x: 120, y: 600 };
  reachedCheckpoint = -1;
  player.hp = MAX_HP;
  gameState = "play";
  respawn();
}

function respawn() {
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  player.vx = 0; player.vy = 0;
  player.lastGroundedAt = simTime;
  player.standingOn = null;
  player.invulnUntil = simTime + 800;
  bullets.length = 0;
  if (player.hp <= 0) player.hp = MAX_HP;
}

// =====================
// PARTICLES + SHAKE
// =====================
function burst(x, y, count, color, speed = 2.5, life = 26) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      color,
      size: 2 + Math.random() * 2,
    });
  }
}

function landDust(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 24, y,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -Math.random() * 1.2,
      life: 18, maxLife: 18,
      color: "rgba(220,190,160,",
      size: 2 + Math.random() * 2,
    });
  }
}

function updateParticles() {
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    return p.life > 0;
  });
}

function shake(mag, ms) {
  shakeMag = Math.max(shakeMag, mag);
  shakeUntil = Math.max(shakeUntil, simTime + ms);
}

// =====================
// PLATFORM TEXTURE (unchanged sunset look)
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

// Procedural mid-distance hills for extra parallax depth
function makeHillsLayer() {
  const c = document.createElement("canvas");
  c.width = 960; c.height = SCREEN_H;
  const g = c.getContext("2d");

  g.fillStyle = "rgba(38, 20, 52, 0.85)";
  g.beginPath();
  g.moveTo(0, SCREEN_H);
  let y = 480;
  for (let x = 0; x <= c.width; x += 40) {
    y = clamp(y + (Math.sin(x * 0.021) * 26 + Math.sin(x * 0.007) * 40) * 0.22, 380, 560);
    g.lineTo(x, y);
  }
  g.lineTo(c.width, SCREEN_H);
  g.closePath();
  g.fill();

  return c;
}
const hillsLayer = makeHillsLayer();

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

function drawInfiniteBg(img, parallax = 0.16) {
  if (!img.complete || img.naturalWidth === 0) return;

  const scale = SCREEN_H / img.height;
  const drawW = Math.floor(img.width * scale);

  let x = -((cameraX * parallax) % drawW);
  if (x > 0) x -= drawW;

  for (; x < SCREEN_W; x += drawW) ctx.drawImage(img, x, 0, drawW, SCREEN_H);
}

function drawHills(parallax = 0.32) {
  const w = hillsLayer.width;
  let x = -((cameraX * parallax) % w);
  if (x > 0) x -= w;
  for (; x < SCREEN_W; x += w) ctx.drawImage(hillsLayer, x, 0);
}

// =====================
// CAMERA — smoothed with look-ahead
// =====================
function updateCamera() {
  const target = clamp(
    player.x + player.facing * CAMERA_LOOKAHEAD - SCREEN_W * 0.42,
    0, world.width - SCREEN_W
  );
  cameraX += (target - cameraX) * CAMERA_LERP;
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
    const s = Math.sin((t / m.period) * Math.PI * 2);

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

function hurtPlayer(fromX) {
  if (simTime < player.invulnUntil) return;
  player.hp--;
  player.invulnUntil = simTime + HURT_INVULN_MS;
  player.vx = (player.x + player.w / 2 < fromX) ? -3 : 3;
  player.vy = -3.5;
  const { cx, cy } = playerCenter();
  burst(cx, cy, 8, "rgba(255,90,90,", 3);
  shake(4, 180);
  if (player.hp <= 0) respawn();
}

// =====================
// INPUT + PHYSICS
// =====================
function handleMovement(t) {
  const left = keys["a"] || keys["arrowleft"];
  const right = keys["d"] || keys["arrowright"];

  let target = 0;
  if (left && !right) { target = -MOVE_SPEED; player.facing = -1; }
  else if (right && !left) { target = MOVE_SPEED; player.facing = 1; }

  if (target !== 0) {
    const accel = player.onGround ? GROUND_ACCEL : AIR_ACCEL;
    player.vx += clamp(target - player.vx, -accel, accel);
  } else {
    player.vx *= player.onGround ? GROUND_FRICTION : AIR_DRAG;
    if (Math.abs(player.vx) < 0.05) player.vx = 0;
  }

  if (wantsJump() && !player.jumpLock) { player.jumpBufferedAt = t; player.jumpLock = true; }
  if (!wantsJump()) player.jumpLock = false;

  // Jump cut: release while rising trims the jump
  if (!wantsJump() && !player.jumpCutDone && player.vy < -2) {
    player.vy *= JUMP_CUT;
    player.jumpCutDone = true;
  }

  // Drop through thin platforms
  if (wantsDown() && player.onGround && player.standingOn && !player.standingOn.solid) {
    player.dropUntil = t + 200;
    player.y += 2;
    player.onGround = false;
    player.standingOn = null;
  }

  if (keys["j"] && t > player.parryCooldown) {
    player.parryStartedAt = t;
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
  if (rising && holding) g *= HOLD_GRAVITY_MULT;
  if (!rising) g *= FALL_GRAVITY_MULT;

  player.vy += g;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);
}

// =====================
// COLLISION — solid walls/ground, one-way thin platforms
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

  // X move — only solids block sideways
  player.x += player.vx;
  player.x = clamp(player.x, 0, world.width - player.w);

  for (const p of world.platforms) {
    if (!p.solid) continue;
    if (!rectHit(player, p)) continue;
    if (prevX + player.w <= p.x + 0.5) { player.x = p.x - player.w; player.vx = 0; }
    else if (prevX >= p.x + p.w - 0.5) { player.x = p.x + p.w; player.vx = 0; }
  }

  // Y move
  player.y += player.vy;
  player.onGround = false;

  const dropping = t < player.dropUntil;

  for (const p of world.platforms) {
    if (!rectHit(player, p)) continue;

    const oneWay = !p.solid;
    if (oneWay && dropping) continue;

    if (player.vy >= 0 && prevY + player.h <= p.y + Math.max(2, p.dy ? Math.abs(p.dy) + 2 : 2)) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.lastGroundedAt = t;
      player.standingOn = p;
    } else if (!oneWay && player.vy < 0 && prevY >= p.y + p.h - 2) {
      player.y = p.y + p.h;
      player.vy = 0;
    }
  }

  carryWithPlatform();

  // Landing dust
  if (player.onGround && !player.wasOnGround) {
    landDust(player.x + player.w / 2, player.y + player.h);
  }
  player.wasOnGround = player.onGround;

  const canCoyote = (t - player.lastGroundedAt) <= COYOTE_MS;
  const buffered = (t - player.jumpBufferedAt) <= JUMP_BUFFER_MS;

  if (buffered && (player.onGround || canCoyote)) {
    player.vy = JUMP_VY;
    player.onGround = false;
    player.jumpBufferedAt = -9999;
    player.lastGroundedAt = -9999;
    player.standingOn = null;
    player.jumpCutDone = false;
  }

  // Fell in a pit
  if (player.y > world.height + 120) {
    player.hp--;
    shake(5, 220);
    respawn();
  }
}

// =====================
// CHECKPOINTS + GOAL
// =====================
function updateCheckpoints() {
  for (let i = reachedCheckpoint + 1; i < checkpoints.length; i++) {
    if (player.x + player.w / 2 >= checkpoints[i].x) {
      reachedCheckpoint = i;
      respawnPoint = { x: checkpoints[i].x, y: GY - player.h - 4 };
      checkpointToastUntil = simTime + 1400;
      burst(checkpoints[i].x + 4, GY - 50, 10, "rgba(140,255,170,", 2.2);
    }
  }

  if (player.x + player.w / 2 >= GOAL_X && gameState === "play") {
    gameState = "won";
    burst(GOAL_X + 4, GY - 60, 26, "rgba(255,215,120,", 3.4, 40);
  }
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

    const sx = e.x - cameraX;
    if (sx < -80 || sx > SCREEN_W + 80) { e.nextShot = t + 250; continue; }

    e.nextShot = t + e.shootEveryMs;
    e.lastShotAt = t;

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
      if (p.solid && circleRect(b.x, b.y, b.r, p)) {
        burst(b.x, b.y, 3, "rgba(200,170,140,", 1.6, 14);
        return false;
      }
    }

    // Parry deflect
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

        const newSpeed = Math.hypot(b.vx, b.vy) * 1.35;
        b.vx = (tx / tlen) * newSpeed;
        b.vy = (ty / tlen) * newSpeed;
        b.from = "player";
        burst(b.x, b.y, 6, "rgba(120,240,255,", 2.4, 18);
        shake(2, 100);
      }
    }

    if (b.from === "player") {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (circleRect(b.x, b.y, b.r, e)) {
          e.hp--;
          burst(b.x, b.y, 5, "rgba(255,140,220,", 2.2, 20);
          if (e.hp <= 0) killEnemy(e);
          return false;
        }
      }
    }

    if (b.from === "enemy" && t >= player.invulnUntil && circleRect(b.x, b.y, b.r, player)) {
      hurtPlayer(b.x - b.vx * 4);
      return false;
    }

    return true;
  });
}

function killEnemy(e) {
  burst(e.x + e.w / 2, e.y + e.h / 2, 14, "rgba(255,170,90,", 3, 30);
  shake(3, 140);
}

function updateSword(t) {
  if (!(t < player.swordUntil)) return;
  const hb = swordHitbox();
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (rectHit(hb, e)) {
      e.hp -= SWORD_DAMAGE;
      burst(e.x + e.w / 2, e.y + e.h / 2, 8, "rgba(255,220,140,", 2.6, 22);
      shake(2, 100);
      if (e.hp <= 0) killEnemy(e);
      player.swordUntil = 0;
      break;
    }
  }
}

// =====================
// DRAW
// =====================
function drawPlayerSprite(t) {
  const x = player.x - cameraX;
  const y = player.y;

  // Invulnerability flicker
  if (t < player.invulnUntil && Math.floor(t / 90) % 2 === 0) return;

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

function drawEnemy(e, t) {
  const sx = e.x - cameraX;
  if (sx < -160 || sx > SCREEN_W + 160) return;

  const facing = (player.x > e.x) ? 1 : -1;

  // body
  ctx.fillStyle = "#5b3350";
  ctx.fillRect(sx, e.y + 12, e.w, e.h - 12);

  // head
  ctx.fillStyle = "#c99a76";
  ctx.fillRect(sx + 7, e.y + 4, 18, 12);

  // hat
  ctx.fillStyle = "#241820";
  ctx.fillRect(sx + 2, e.y + 2, 28, 4);
  ctx.fillRect(sx + 8, e.y - 6, 16, 8);

  // gun
  ctx.fillStyle = "#1c1420";
  const gy = e.y + 24;
  if (facing === 1) ctx.fillRect(sx + e.w - 2, gy, 12, 4);
  else ctx.fillRect(sx - 10, gy, 12, 4);

  // muzzle flash
  if (t - e.lastShotAt < 70) {
    ctx.fillStyle = "rgba(255, 220, 130, 0.9)";
    const fx = facing === 1 ? sx + e.w + 10 : sx - 12;
    ctx.beginPath();
    ctx.arc(fx, gy + 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // hp bar
  const maxHp = e.maxHp || (e.maxHp = e.hp);
  if (e.hp < maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(sx - 2, e.y - 14, e.w + 4, 5);
    ctx.fillStyle = "#ff6a5e";
    ctx.fillRect(sx - 1, e.y - 13, (e.w + 2) * (e.hp / maxHp), 3);
  }
}

function drawFlag(x, active, gold = false) {
  const sx = x - cameraX;
  if (sx < -80 || sx > SCREEN_W + 80) return;

  ctx.fillStyle = "rgba(30, 20, 40, 0.9)";
  ctx.fillRect(sx, GY - (gold ? 90 : 64), 4, gold ? 90 : 64);

  ctx.fillStyle = gold
    ? "rgba(255, 210, 90, 0.95)"
    : active ? "rgba(120, 240, 160, 0.95)" : "rgba(150, 140, 170, 0.7)";
  ctx.beginPath();
  const top = GY - (gold ? 88 : 62);
  ctx.moveTo(sx + 4, top);
  ctx.lineTo(sx + (gold ? 36 : 28), top + (gold ? 9 : 7));
  ctx.lineTo(sx + 4, top + (gold ? 18 : 14));
  ctx.closePath();
  ctx.fill();
}

function drawHeart(x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.bezierCurveTo(8, 1, 4, 0, 2.5, 2.5);
  ctx.bezierCurveTo(0.5, 5.5, 3, 9, 8, 13);
  ctx.bezierCurveTo(13, 9, 15.5, 5.5, 13.5, 2.5);
  ctx.bezierCurveTo(12, 0, 8, 1, 8, 4);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = "#ff5a6a";
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(t) {
  // hearts
  for (let i = 0; i < MAX_HP; i++) drawHeart(16 + i * 22, 14, i < player.hp);

  // enemies left
  const alive = enemies.reduce((n, e) => n + (e.hp > 0 ? 1 : 0), 0);
  ctx.font = "700 14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`outlaws left: ${alive}`, 16, 52);

  // parry indicator
  const ready = t > player.parryCooldown;
  ctx.fillStyle = ready ? "rgba(120,240,255,0.9)" : "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(22, 68, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(ready ? "parry ready" : "parry…", 34, 73);

  // progress bar
  const progress = clamp(player.x / GOAL_X, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(SCREEN_W / 2 - 130, 18, 260, 6);
  ctx.fillStyle = "rgba(255, 205, 140, 0.9)";
  ctx.fillRect(SCREEN_W / 2 - 130, 18, 260 * progress, 6);

  // checkpoint toast
  if (t < checkpointToastUntil) {
    const a = Math.min(1, (checkpointToastUntil - t) / 400);
    ctx.fillStyle = `rgba(140, 255, 170, ${a})`;
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("checkpoint!", SCREEN_W / 2, 48);
    ctx.textAlign = "left";
  }
}

function drawWinOverlay() {
  ctx.fillStyle = "rgba(8, 5, 14, 0.72)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd25a";
  ctx.font = "800 52px system-ui, sans-serif";
  ctx.fillText("you made it, cowboy", SCREEN_W / 2, SCREEN_H / 2 - 20);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.fillText("press R to ride again", SCREEN_W / 2, SCREEN_H / 2 + 28);
  ctx.textAlign = "left";
}

function draw(t) {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

  ctx.save();
  if (t < shakeUntil) {
    ctx.translate((Math.random() - 0.5) * shakeMag * 2, (Math.random() - 0.5) * shakeMag * 2);
  } else {
    shakeMag = 0;
  }

  drawInfiniteBg(bgFar, 0.16);
  drawHills(0.32);

  for (const p of world.platforms) drawPlatform(p);

  for (const cp of checkpoints) {
    drawFlag(cp.x, checkpoints.indexOf(cp) <= reachedCheckpoint);
  }
  drawFlag(GOAL_X, false, true);

  for (const e of enemies) {
    if (e.hp <= 0) continue;
    drawEnemy(e, t);
  }

  drawPlayerSprite(t);

  // parry ring — expands over the window
  const pcx = (player.x - cameraX) + player.w / 2;
  const pcy = player.y + player.h / 2;
  if (t < player.parryUntil) {
    const prog = (t - player.parryStartedAt) / PARRY_WINDOW;
    const r = 30 + prog * (PARRY_RADIUS - 22);
    ctx.beginPath();
    ctx.arc(pcx, pcy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120, 240, 255, ${0.85 - prog * 0.5})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // sword slash arc — sweeps downward through the active window
  if (t < player.swordUntil) {
    const prog = 1 - (player.swordUntil - t) / SWORD_ACTIVE_MS;
    const mid = player.facing === 1 ? 0 : Math.PI; // straight ahead
    const sweep = -0.9 + prog * 1.8;               // -0.9 → +0.9 rad around mid
    ctx.beginPath();
    ctx.arc(pcx + player.facing * 8, pcy, SWORD_RANGE - 8,
      mid + player.facing * (sweep - 0.5),
      mid + player.facing * (sweep + 0.5),
      player.facing === -1);
    ctx.strokeStyle = `rgba(255, 235, 180, ${0.9 - prog * 0.5})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // bullets with glow
  for (const b of bullets) {
    const sx = b.x - cameraX;
    if (sx < -140 || sx > SCREEN_W + 140) continue;
    const enemyShot = b.from === "enemy";

    ctx.beginPath();
    ctx.arc(sx, b.y, b.r + 4, 0, Math.PI * 2);
    ctx.fillStyle = enemyShot ? "rgba(255, 120, 70, 0.25)" : "rgba(120, 240, 255, 0.3)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = enemyShot ? "rgba(255, 150, 80, 0.95)" : "rgba(140, 240, 255, 0.95)";
    ctx.fill();
  }

  // particles
  for (const p of particles) {
    const sx = p.x - cameraX;
    if (sx < -40 || sx > SCREEN_W + 40) continue;
    ctx.fillStyle = p.color + (p.life / p.maxLife) + ")";
    ctx.fillRect(sx - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }

  drawHud(t);

  ctx.restore();

  if (gameState === "won") drawWinOverlay();
}

// =====================
// LOOP — fixed timestep for identical feel on every refresh rate
// =====================
function update(t) {
  updatePlatforms(t);

  if (gameState === "play") {
    handleMovement(t);
    applyGravity();
    moveAndCollide(t);
    updateCheckpoints();
    enemyShoot(t);
    updateBullets(t);
    updateSword(t);
  }

  updateParticles();
  updateCamera();

  if (keys["r"]) resetGame();

  if (!assetsReady()) {
    statusEl.textContent = "Loading assets…";
    return;
  }

  const alive = enemies.reduce((n, e) => n + (e.hp > 0 ? 1 : 0), 0);
  statusEl.textContent =
    gameState === "won"
      ? "cleared! press R to play again"
      : `outlaws left: ${alive} • progress: ${Math.round(clamp(player.x / GOAL_X, 0, 1) * 100)}%`;
}

let last = performance.now();
let acc = 0;

function loop(now) {
  acc += now - last;
  last = now;
  acc = Math.min(acc, 100); // avoid spiral of death on tab switch

  while (acc >= STEP) {
    simTime += STEP;
    update(simTime);
    acc -= STEP;
  }

  draw(simTime);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
