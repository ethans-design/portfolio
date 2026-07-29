// THE DEAD MARSHAL — Milestone 1: atmosphere, the ruined street, movement,
// dodge-roll, greatsword swing, revolver aim/fire, and the Marshal looming.
// Combat/AI (damage, telegraphs, gun-parry stagger, phases) come next milestone.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// ---------------------------------------------------------------------------
// TUNING
// ---------------------------------------------------------------------------
const STREET_HALF = 6.5;
const Z_FRONT = 10;      // player spawn end
const Z_BACK = -48;      // marshal end
const WALK = 3.4, SPRINT = 6.6;
const ROLL_SPEED = 10, ROLL_TIME = 0.5, ROLL_IFRAME = [0.08, 0.42];
const MAX_STAM = 100, STAM_SPRINT = 22, STAM_ROLL = 28, STAM_SWING = 26, STAM_REGEN = 34;
const SUN_DIR = new THREE.Vector3(0.14, 0.20, -1).normalize(); // sun blazing down the street, beyond the marshal

// ---------------------------------------------------------------------------
// CORE
// ---------------------------------------------------------------------------
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const SUNSET_HAZE = new THREE.Color(0xb9764a);
scene.fog = new THREE.FogExp2(0x6b4a3a, 0.018);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 3, Z_FRONT + 6);

// Post-processing (bloom = the "pops of color from sun and lighting")
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.7, 0.72);
composer.addPass(bloom);

// ---------------------------------------------------------------------------
// SKY — sunset gradient with a warm glow toward the sun
// ---------------------------------------------------------------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x241033) },
      mid: { value: new THREE.Color(0x8a3d2c) },
      horizon: { value: new THREE.Color(0xf0a24b) },
      sunColor: { value: new THREE.Color(0xffd27a) },
      sunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top, mid, horizon, sunColor, sunDir;
      void main(){
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.02, 0.42, h));
        col = mix(col, top, smoothstep(0.42, 0.85, h));
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(s, 8.0) * 0.9;
        col += sunColor * pow(s, 220.0) * 3.0; // the sun disc bloom seed
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// LIGHTS
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffb060, 3.1);
sun.position.copy(SUN_DIR.clone().multiplyScalar(60));
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 0, -10);

scene.add(new THREE.HemisphereLight(0x9fb0d8, 0x2a2320, 0.55)); // cool sky fill / warm-grey ground
const fillAmbient = new THREE.AmbientLight(0x40342e, 0.5);
scene.add(fillAmbient);

// Glowing sun disc down the street (for bloom)
const sunDisc = new THREE.Mesh(
  new THREE.CircleGeometry(9, 40),
  new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.95, fog: false })
);
sunDisc.position.copy(SUN_DIR.clone().multiplyScalar(150));
sunDisc.position.y = 8;
sunDisc.lookAt(0, 8, 0);
scene.add(sunDisc);

// ---------------------------------------------------------------------------
// GROUND
// ---------------------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x4a3f38, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// packed dirt street strip (slightly lighter)
const street = new THREE.Mesh(
  new THREE.PlaneGeometry(STREET_HALF * 2 + 1, 200),
  new THREE.MeshStandardMaterial({ color: 0x5b4d42, roughness: 1 })
);
street.rotation.x = -Math.PI / 2;
street.position.y = 0.01;
street.receiveShadow = true;
scene.add(street);

// ---------------------------------------------------------------------------
// RUINED FRONTIER TOWN — facades down both sides, greyed and broken
// ---------------------------------------------------------------------------
function rand(a, b) { return a + Math.random() * (b - a); }
const greys = [0x3c332e, 0x463b34, 0x342c28, 0x50443b];

function buildFacade(x, z, side) {
  const g = new THREE.Group();
  const w = rand(4, 6.5), h = rand(3.4, 7.5), d = rand(3.5, 6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: greys[(Math.random() * greys.length) | 0], roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // false front (the tall flat western facade)
  if (Math.random() < 0.7) {
    const fh = h + rand(0.6, 2);
    const front = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, fh, 0.4), bodyMat);
    front.position.set(0, fh / 2, (d / 2) * (side > 0 ? -1 : 1));
    front.castShadow = true;
    g.add(front);
  }

  // porch posts + roof over the boardwalk
  const porchZ = (d / 2 + 1.1) * (side > 0 ? -1 : 1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x2a221d, roughness: 1 }));
  roof.position.set(0, h * 0.62, porchZ);
  roof.castShadow = true; g.add(roof);
  for (const px of [-w / 2 + 0.3, w / 2 - 0.3]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, h * 0.62, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 1 }));
    post.position.set(px, h * 0.31, porchZ);
    post.castShadow = true; g.add(post);
  }

  // a couple dark window holes
  const winMat = new THREE.MeshStandardMaterial({ color: 0x0d0908, roughness: 1 });
  for (let i = 0; i < 2; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.1), winMat);
    win.position.set(rand(-w / 2 + 1, w / 2 - 1), rand(1.4, h - 1), (d / 2) * (side > 0 ? -1 : 1) + 0.05 * side);
    g.add(win);
  }

  g.position.set(x, 0, z);
  g.rotation.y = rand(-0.05, 0.05); // slight lean/decay
  scene.add(g);
}

for (let z = Z_FRONT; z > Z_BACK - 4; z -= rand(6.5, 8.5)) {
  buildFacade(-(STREET_HALF + rand(2.4, 3.4)), z + rand(-1, 1), -1);
  buildFacade((STREET_HALF + rand(2.4, 3.4)), z + rand(-1, 1), 1);
}

// scattered debris / barrels for grounding
for (let i = 0; i < 22; i++) {
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.38, 0.9, 10),
    new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 1 })
  );
  barrel.position.set(rand(-STREET_HALF + 0.5, STREET_HALF - 0.5), 0.45, rand(Z_BACK, Z_FRONT));
  barrel.rotation.y = rand(0, 6.28);
  if (Math.random() < 0.4) { barrel.rotation.z = Math.PI / 2; barrel.position.y = 0.38; }
  barrel.castShadow = true; barrel.receiveShadow = true;
  scene.add(barrel);
}

// ---------------------------------------------------------------------------
// DUST MOTES catching the light
// ---------------------------------------------------------------------------
const dustN = 700;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3] = rand(-STREET_HALF - 4, STREET_HALF + 4);
  dustPos[i * 3 + 1] = rand(0.2, 9);
  dustPos[i * 3 + 2] = rand(Z_BACK - 4, Z_FRONT + 4);
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xffcaa0, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, fog: true,
}));
scene.add(dust);

// ---------------------------------------------------------------------------
// FIGURES — masked wanderer (player) & the Dead Marshal
// ---------------------------------------------------------------------------
const SILHOUETTE = new THREE.MeshStandardMaterial({ color: 0x14100f, roughness: 0.75, metalness: 0.15 });
const METAL = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.4, metalness: 0.85 });

function makeWanderer(scale) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * scale, 0.7 * scale, 4, 10), SILHOUETTE);
  torso.position.y = 1.15 * scale; g.add(torso);
  // flared duster
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * scale, 0.62 * scale, 1.0 * scale, 12, 1, true), SILHOUETTE);
  coat.position.y = 0.75 * scale; g.add(coat);
  // legs hint
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.22 * scale, 0.6 * scale, 8), SILHOUETTE);
  legs.position.y = 0.3 * scale; g.add(legs);
  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 12, 10), SILHOUETTE);
  head.position.y = 1.72 * scale; g.add(head);
  // wide-brim hat
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.42 * scale, 0.04 * scale, 16), SILHOUETTE);
  brim.position.y = 1.8 * scale; g.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.25 * scale, 0.3 * scale, 12), SILHOUETTE);
  crown.position.y = 1.95 * scale; g.add(crown);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

// Player + greatsword
const player = makeWanderer(1);
player.position.set(0, 0, Z_FRONT);
player.rotation.y = Math.PI; // face down the street toward the Marshal
scene.add(player);

const swordPivot = new THREE.Group();          // pivot at the hands
swordPivot.position.set(0.42, 1.1, 0.15);
player.add(swordPivot);
const sword = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.03), METAL);
blade.position.y = 0.9; blade.castShadow = true;
const guard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.09), new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.6, metalness: 0.5 }));
guard.position.y = 0.12;
const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), new THREE.MeshStandardMaterial({ color: 0x140f0d, roughness: 1 }));
grip.position.y = -0.08;
sword.add(blade, guard, grip);
swordPivot.add(sword);
const SWORD_REST = new THREE.Euler(0.5, 0.1, 0.35);   // slung at the side
swordPivot.rotation.copy(SWORD_REST);

// muzzle flash for revolver
const muzzle = new THREE.PointLight(0xffd27a, 0, 6);
muzzle.position.set(0.5, 1.15, 0.3);
player.add(muzzle);

// The Dead Marshal
const marshal = makeWanderer(2.35);
marshal.position.set(0, 0, Z_BACK);
marshal.rotation.y = Math.PI; // face the player
scene.add(marshal);
// tarnished star badge (emissive → catches bloom)
const badge = new THREE.Mesh(
  new THREE.CircleGeometry(0.22, 5),
  new THREE.MeshStandardMaterial({ color: 0xffcf6a, emissive: 0xffb03a, emissiveIntensity: 2.2, metalness: 1, roughness: 0.3 })
);
badge.position.set(0, 3.0, -0.75);
badge.rotation.y = Math.PI;
marshal.add(badge);

// ---------------------------------------------------------------------------
// INPUT
// ---------------------------------------------------------------------------
const keys = {};
let yaw = 0, pitch = -0.12, locked = false, aiming = false;
addEventListener("keydown", (e) => { keys[e.code] = true; if (e.code === "Space") e.preventDefault(); });
addEventListener("keyup", (e) => { keys[e.code] = false; });
addEventListener("mousedown", (e) => {
  if (!locked) return;
  if (e.button === 0) startSwing();
  if (e.button === 2) aiming = true;
});
addEventListener("mouseup", (e) => { if (e.button === 2) aiming = false; });
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("mousemove", (e) => {
  if (!locked) return;
  yaw -= e.movementX * 0.0025;
  pitch = Math.max(-0.6, Math.min(0.35, pitch - e.movementY * 0.0022));
});
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === canvas; });

const startEl = document.getElementById("start");
document.getElementById("load").classList.add("hidden");
startEl.addEventListener("click", () => { canvas.requestPointerLock(); startEl.classList.add("hidden"); });
if (location.search.includes("shot")) startEl.classList.add("hidden"); // preview/screenshot mode

// keyboard extras
addEventListener("keydown", (e) => { if (e.code === "KeyF") fireRevolver(); });

// ---------------------------------------------------------------------------
// PLAYER STATE
// ---------------------------------------------------------------------------
let stam = MAX_STAM, hp = 100;
let rolling = 0, iFrame = false, swinging = 0, ammo = 3;
const vel = new THREE.Vector3();
const tmp = new THREE.Vector3();
const rollDir = new THREE.Vector3(0, 0, 1);

function startSwing() {
  if (swinging > 0 || rolling > 0 || stam < STAM_SWING) return;
  swinging = 0.62; stam -= STAM_SWING;
}
function startRoll(dir) {
  if (rolling > 0 || stam < STAM_ROLL) return;
  rolling = ROLL_TIME; stam -= STAM_ROLL;
  rollDir.copy(dir.lengthSq() > 0.01 ? dir : tmp.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1));
}
function fireRevolver() {
  if (!locked || ammo <= 0) return;
  ammo--; renderAmmo();
  muzzle.intensity = 6;
  // (gun-parry stagger vs the Marshal arrives in the combat milestone)
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
const hpFill = document.querySelector("#hp .fill");
const stamFill = document.querySelector("#stam .fill");
const bossEl = document.getElementById("boss");
const ammoEl = document.getElementById("ammo");
function renderAmmo() {
  ammoEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const r = document.createElement("div");
    r.className = "round" + (i >= ammo ? " spent" : "");
    ammoEl.appendChild(r);
  }
}
renderAmmo();

// ---------------------------------------------------------------------------
// LOOP
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

function update(dt) {
  // ---- movement intent (camera-relative) ----
  const fwd = tmp.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(-1);
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const move = new THREE.Vector3();
  if (keys["KeyW"]) move.add(fwd);
  if (keys["KeyS"]) move.sub(fwd);
  if (keys["KeyD"]) move.add(right);
  if (keys["KeyA"]) move.sub(right);
  const moving = move.lengthSq() > 0.01;
  if (moving) move.normalize();

  // ---- roll ----
  if (keys["Space"]) startRoll(move);
  if (rolling > 0) {
    const t = ROLL_TIME - rolling;
    iFrame = t > ROLL_IFRAME[0] && t < ROLL_IFRAME[1];
    const curve = Math.sin((rolling / ROLL_TIME) * Math.PI); // ease in/out
    vel.copy(rollDir).multiplyScalar(ROLL_SPEED * curve);
    // forward flip animation
    player.rotation.x = -Math.sin((t / ROLL_TIME) * Math.PI) * 1.9;
    rolling -= dt;
    if (rolling <= 0) { player.rotation.x = 0; iFrame = false; }
  } else {
    player.rotation.x = 0;
    let speed = WALK;
    if (keys["ShiftLeft"] && moving && stam > 1) { speed = SPRINT; stam -= STAM_SPRINT * dt; }
    if (swinging > 0) speed *= 0.28; // rooted during a swing
    vel.copy(move).multiplyScalar(speed);
  }

  // ---- integrate + collide ----
  player.position.addScaledVector(vel, dt);
  player.position.x = Math.max(-STREET_HALF + 0.4, Math.min(STREET_HALF - 0.4, player.position.x));
  player.position.z = Math.max(Z_BACK + 3.2, Math.min(Z_FRONT + 4, player.position.z));
  // don't walk through the Marshal
  const dm = player.position.distanceTo(marshal.position);
  if (dm < 2.2) player.position.addScaledVector(tmp.copy(player.position).sub(marshal.position).setY(0).normalize(), (2.2 - dm));

  // ---- facing ----
  let faceDir;
  if (aiming) faceDir = fwd;
  else if (moving && rolling <= 0) faceDir = move;
  else if (rolling > 0) faceDir = rollDir;
  if (faceDir) {
    const targetYaw = Math.atan2(faceDir.x, faceDir.z);
    player.rotation.y += shortAngle(player.rotation.y, targetYaw) * Math.min(1, dt * 12);
  }

  // ---- swing anim ----
  if (swinging > 0) {
    const p = 1 - swinging / 0.62;
    const arc = p < 0.35 ? (p / 0.35) * -1.2 : 1 - ((p - 0.35) / 0.65); // wind up then chop
    swordPivot.rotation.set(SWORD_REST.x - arc * 2.4, SWORD_REST.y, SWORD_REST.z + arc * 0.3);
    swinging -= dt;
    if (swinging <= 0) swordPivot.rotation.copy(SWORD_REST);
  }

  // ---- stamina regen ----
  if (!(keys["ShiftLeft"] && moving) && rolling <= 0) stam += STAM_REGEN * dt;
  stam = Math.max(0, Math.min(MAX_STAM, stam));

  // ---- muzzle flash decay ----
  if (muzzle.intensity > 0) muzzle.intensity = Math.max(0, muzzle.intensity - dt * 40);

  // ---- camera (third person, over-shoulder when aiming) ----
  const dist = aiming ? 3.0 : 6.4;
  const height = aiming ? 2.0 : 3.1;
  const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(dist);
  camPos.copy(player.position).add(back);
  camPos.y = player.position.y + height + pitch * 3;
  camera.position.lerp(camPos, Math.min(1, dt * 9));
  camTarget.copy(player.position).add(new THREE.Vector3(aiming ? 0.6 : 0, 1.5 + pitch * 2, 0));
  camera.lookAt(camTarget);

  // ---- ambient life ----
  marshal.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.04;
  marshal.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.02;
  badge.material.emissiveIntensity = 2 + Math.sin(clock.elapsedTime * 2.4) * 0.5;
  dust.rotation.y += dt * 0.01;
  const dp = dust.geometry.attributes.position;
  for (let i = 1; i < dustN * 3; i += 3) { dp.array[i] += dt * 0.12; if (dp.array[i] > 9) dp.array[i] = 0.2; }
  dp.needsUpdate = true;

  // ---- HUD ----
  hpFill.style.transform = `scaleX(${hp / 100})`;
  stamFill.style.transform = `scaleX(${stam / MAX_STAM})`;
  bossEl.style.opacity = dm < 26 ? 1 : 0;
}

function shortAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  composer.render();
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
