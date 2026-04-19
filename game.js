const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const scoreEl = document.getElementById("score");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreEl = document.getElementById("final-score");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const W = 960;
const H = 540;
canvas.width = W;
canvas.height = H;

let gameState = "start";
let score = 0;
let distance = 0;
let lastTime = 0;
let spawnTimer = 0;
let worldSpeed = 220;
let bridgeTimer = 8;
let waveTime = 0;
let lastSpeedBoost = 0;

const input = {
  up: false,
  down: false,
  pointerY: null
};

const boat = {
  x: W * 0.28,
  y: H * 0.56,
  w: 46,
  h: 20,
  vy: 0,
  bob: 0,
  angle: 0
};

let obstacles = [];
let particles = [];

function resetGame() {
  gameState = "playing";
  score = 0;
  distance = 0;
  lastTime = 0;
  spawnTimer = 0;
  bridgeTimer = 8;
  waveTime = 0;
  lastSpeedBoost = 0;
  worldSpeed = 220;
  obstacles = [];
  particles = [];
  boat.y = H * 0.56;
  boat.vy = 0;
  boat.bob = 0;
  boat.angle = 0;
  scoreEl.textContent = `Score: 0 | Speed: ${Math.floor(worldSpeed)}`;
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  requestAnimationFrame(loop);
}

function endGame() {
  gameState = "gameOver";
  finalScoreEl.textContent = `Final Score: ${Math.floor(score)}`;
  gameOverScreen.classList.remove("hidden");
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function riverCenterAt(x, t) {
  return H * 0.58
    + Math.sin((x * 0.003) + t * 0.7) * 16
    + Math.sin((x * 0.007) + t * 1.3) * 10;
}

function riverHalfHeightAt(x, t) {
  return 92
    + Math.sin((x * 0.004) + t * 0.4) * 10;
}

function riverBoundsAt(x, t) {
  const center = riverCenterAt(x, t);
  const half = riverHalfHeightAt(x, t);
  return {
    top: center - half,
    bottom: center + half
  };
}

function addObstacle(x, y, w, h, type) {
  obstacles.push({ x, y, w, h, type });
}

function spawnBuoyGate() {
  const x = W + 80;
  const bounds = riverBoundsAt(x, waveTime);
  const gapY = lerp(bounds.top + 40, bounds.bottom - 40, Math.random());
  const gap = 90;

  addObstacle(x, bounds.top - 10, 18, Math.max(10, gapY - gap / 2 - bounds.top), "post-top");
  addObstacle(x, gapY + gap / 2, 18, Math.max(10, bounds.bottom - (gapY + gap / 2)), "post-bottom");
}

function spawnBarge(topSide = true) {
  const x = W + 80;
  const bounds = riverBoundsAt(x, waveTime);
  const w = 120 + Math.random() * 80;
  const h = 34;

  if (topSide) {
    addObstacle(x, bounds.top + 4, w, h, "barge");
  } else {
    addObstacle(x, bounds.bottom - h - 4, w, h, "barge");
  }
}

function spawnDebrisCluster() {
  const x = W + 80;
  const bounds = riverBoundsAt(x, waveTime);
  for (let i = 0; i < 3; i++) {
    addObstacle(
      x + i * 28,
      lerp(bounds.top + 20, bounds.bottom - 20, Math.random()),
      24,
      14,
      "debris"
    );
  }
}

function spawnBridgeSection() {
  const x = W + 120;
  const bounds = riverBoundsAt(x, waveTime);
  const gapY = (bounds.top + bounds.bottom) * 0.5;
  const gap = 84;

  addObstacle(x, 0, 42, Math.max(10, gapY - gap / 2), "pier");
  addObstacle(x, gapY + gap / 2, 42, H - (gapY + gap / 2), "pier");
}

function spawnPattern() {
  const roll = Math.random();

  if (bridgeTimer <= 0) {
    spawnBridgeSection();
    bridgeTimer = 10 + Math.random() * 4;
    return;
  }

  if (roll < 0.35) spawnBuoyGate();
  else if (roll < 0.65) spawnBarge(Math.random() > 0.5);
  else spawnDebrisCluster();
}

function updateBoat(dt) {
  let target = 0;

  if (input.up) target = -1;
  if (input.down) target = 1;

  if (input.pointerY !== null) {
    const dy = input.pointerY - boat.y;
    target = clamp(dy / 70, -1, 1);
  }

  boat.vy += target * 620 * dt;
  boat.vy *= 0.92;
  boat.vy += Math.sin(waveTime * 5) * 4 * dt;
  boat.y += boat.vy * dt;

  const here = riverBoundsAt(boat.x, waveTime);
  const bankPadding = 6;
  const hitboxHalf = (boat.h * 0.56) / 2;

  boat.y = clamp(
    boat.y,
    here.top + bankPadding + hitboxHalf,
    here.bottom - bankPadding - hitboxHalf
  );

  boat.bob += dt * 6;
  boat.angle = lerp(boat.angle, clamp(boat.vy * 0.0035, -0.25, 0.25), 0.12);
}

function updateObstacles(dt) {
  for (const ob of obstacles) {
    ob.x -= worldSpeed * dt;
  }
  obstacles = obstacles.filter(ob => ob.x + ob.w > -80);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x -= worldSpeed * dt * 0.4;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function emitWake() {
  particles.push({
    x: boat.x - boat.w * 0.45,
    y: boat.y + 2,
    vy: -8 + Math.random() * 16,
    life: 0.35 + Math.random() * 0.25,
    r: 2 + Math.random() * 3
  });
}

function checkCollisions() {
  const hitbox = {
    x: boat.x - boat.w * 0.34,
    y: boat.y - boat.h * 0.28,
    w: boat.w * 0.68,
    h: boat.h * 0.56
  };

  const river = riverBoundsAt(boat.x, waveTime);
  const bankPadding = 6;

  if (
    hitbox.y < river.top + bankPadding ||
    hitbox.y + hitbox.h > river.bottom - bankPadding
  ) {
    console.log("BANK HIT", hitbox, river);
    endGame();
    return;
  }

  for (const ob of obstacles) {
    if (ob.x + ob.w < 0 || ob.x > W) continue;

    const riverNow = riverBoundsAt(ob.x, waveTime);

    // Skip obstacles that are fully outside the visible river bounds.
    if (ob.y > riverNow.bottom || ob.y + ob.h < riverNow.top) {
      continue;
    }

    let obHitbox = {
      x: ob.x + 4,
      y: ob.y + 4,
      w: ob.w - 8,
      h: ob.h - 8
    };

    if (ob.type === "debris") {
      obHitbox = {
        x: ob.x + 3,
        y: ob.y + 2,
        w: ob.w - 6,
        h: ob.h - 4
      };
    }

    if (ob.type === "post-top" || ob.type === "post-bottom") {
      obHitbox = {
        x: ob.x + 2,
        y: ob.y,
        w: ob.w - 4,
        h: ob.h
      };
    }

    if (rectsOverlap(hitbox, obHitbox)) {
      console.log("OBSTACLE HIT", ob.type, hitbox, obHitbox);
      endGame();
      return;
    }
  }
}

function update(dt) {
  if (gameState !== "playing") return;

  waveTime += dt;
  distance += worldSpeed * dt;
  score += dt * 10;

  const currentMilestone = Math.floor(score / 20);
  if (currentMilestone > lastSpeedBoost) {
    worldSpeed = Math.min(420, worldSpeed + 30);
    lastSpeedBoost = currentMilestone;
  }

  scoreEl.textContent = `Score: ${Math.floor(score)} | Speed: ${Math.floor(worldSpeed)}`;

  spawnTimer -= dt;
  bridgeTimer -= dt;

  updateBoat(dt);
  updateObstacles(dt);
  updateParticles(dt);
  emitWake();

  if (spawnTimer <= 0) {
    spawnPattern();
    spawnTimer = Math.max(0.8, 1.5 - score * 0.01);
  }

  checkCollisions();
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#4CAF50");
  g.addColorStop(1, "#006400");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawSkyline() {
  ctx.fillStyle = "#7f8791";
  for (let i = 0; i < 20; i++) {
    const x = (i * 90 - (distance * 0.12) % 90);
    const h = 40 + (i % 5) * 14;
    ctx.fillRect(x, 170 - h, 42, h);
  }
}

function drawBridgeBack() {
  const x = W - ((distance * 0.55) % (W + 240));
  ctx.strokeStyle = "#5a616b";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, 235, 90, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 180, 235, 90, Math.PI, 0);
  ctx.stroke();
}

function drawRiverAndBanks() {
  const land = ctx.createLinearGradient(0, 0, 0, H);
  land.addColorStop(0, "#2e8b57");
  land.addColorStop(1, "#1f5f1f");
  ctx.fillStyle = land;
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const { top } = riverBoundsAt(x, waveTime);
    if (x === 0) ctx.moveTo(x, top);
    else ctx.lineTo(x, top);
  }
  for (let x = W; x >= 0; x -= 8) {
    const { bottom } = riverBoundsAt(x, waveTime);
    ctx.lineTo(x, bottom);
  }
  ctx.closePath();

  const water = ctx.createLinearGradient(0, H * 0.35, 0, H);
  water.addColorStop(0, "#6f7f89");
  water.addColorStop(1, "#4c5f69");
  ctx.fillStyle = water;
  ctx.fill();

  ctx.strokeStyle = "#d7e3d1";
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const { top } = riverBoundsAt(x, waveTime);
    if (x === 0) ctx.moveTo(x, top);
    else ctx.lineTo(x, top);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const { bottom } = riverBoundsAt(x, waveTime);
    if (x === 0) ctx.moveTo(x, bottom);
    else ctx.lineTo(x, bottom);
  }
  ctx.stroke();
}

function drawWaterLines() {
  ctx.strokeStyle = "rgba(210,230,235,0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const y = H * 0.44 + i * 22 + Math.sin(waveTime * 2 + i) * 5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const yy = y + Math.sin((x * 0.02) + waveTime * 3 + i) * 3;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function px(x, y, c, s, ox, oy) {
  ctx.fillStyle = c;
  ctx.fillRect(ox + x * s, oy + y * s, s, s);
}

function drawGrandmaRpgSprite(ox, oy, s = 3) {
  const p = [
    [5,0,"#d8d8d8"], [6,0,"#d8d8d8"],
    [4,1,"#cfcfcf"], [5,1,"#e7e7e7"], [6,1,"#e7e7e7"], [7,1,"#cfcfcf"],
    [3,2,"#c8c8c8"], [4,2,"#efefef"], [5,2,"#efefef"], [6,2,"#efefef"], [7,2,"#efefef"], [8,2,"#c8c8c8"],
    [4,3,"#f2c8a2"], [5,3,"#f2c8a2"], [6,3,"#f2c8a2"], [7,3,"#f2c8a2"],
    [3,4,"#f2c8a2"], [4,4,"#222"], [5,4,"#222"], [6,4,"#222"], [7,4,"#222"], [8,4,"#f2c8a2"],
    [3,5,"#b06bb8"], [4,5,"#c27acd"], [5,5,"#c27acd"], [6,5,"#c27acd"], [7,5,"#c27acd"], [8,5,"#b06bb8"],
    [3,6,"#9d5aa7"], [4,6,"#c27acd"], [5,6,"#c27acd"], [6,6,"#c27acd"], [7,6,"#c27acd"], [8,6,"#9d5aa7"],
    [3,7,"#8b4f94"], [4,7,"#b86fc2"], [5,7,"#b86fc2"], [6,7,"#b86fc2"], [7,7,"#b86fc2"], [8,7,"#8b4f94"],
    [2,6,"#f2c8a2"], [9,6,"#f2c8a2"],
    [4,8,"#666"], [5,8,"#777"], [6,8,"#777"], [7,8,"#666"],
    [4,9,"#3d3d3d"], [5,9,"#3d3d3d"], [6,9,"#3d3d3d"], [7,9,"#3d3d3d"]
  ];

  for (const [x, y, c] of p) {
    px(x, y, c, s, ox, oy);
  }
}

function drawBoat() {
  ctx.save();
  ctx.translate(boat.x, boat.y + Math.sin(boat.bob) * 2);
  ctx.rotate(boat.angle);

  // hull
  ctx.fillStyle = "#c84b3a";
  ctx.beginPath();
  ctx.moveTo(-24, 3);
  ctx.lineTo(-14, -8);
  ctx.lineTo(19, -8);
  ctx.lineTo(26, 3);
  ctx.lineTo(12, 11);
  ctx.lineTo(-16, 11);
  ctx.closePath();
  ctx.fill();

  // inside trim
  ctx.fillStyle = "#f0e3c8";
  ctx.fillRect(-14, -4, 29, 4);

  // seat
  ctx.fillStyle = "#6a4a36";
  ctx.fillRect(-5, 0, 12, 4);

  // grandma sprite in RPG-like pixel style
  drawGrandmaRpgSprite(-18, -34, 3);

  // wake
  ctx.strokeStyle = "rgba(235,245,248,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-25, 3);
  ctx.lineTo(-35, 0);
  ctx.moveTo(-22, 7);
  ctx.lineTo(-33, 8);
  ctx.stroke();

  ctx.restore();
}

function drawObstacles() {
  for (const ob of obstacles) {
    if (ob.type === "pier") {
      ctx.fillStyle = "#4f5358";
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    } else if (ob.type === "barge") {
      ctx.fillStyle = "#2f3b46";
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = "#56616b";
      ctx.fillRect(ob.x + 12, ob.y + 6, ob.w - 24, ob.h - 12);
    } else if (ob.type === "debris") {
      ctx.fillStyle = "#70563c";
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    } else {
      ctx.fillStyle = "#cf7a2a";
      ctx.beginPath();
      ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles() {
  ctx.fillStyle = "rgba(235,245,248,0.7)";
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawSky();
  drawSkyline();
  drawBridgeBack();
  drawRiverAndBanks();
  drawWaterLines();
  drawObstacles();
  drawParticles();
  drawBoat();
}

function loop(t) {
  if (gameState !== "playing") return;

  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime) / 1000, 0.033);
  lastTime = t;

  update(dt);
  render();

  if (gameState === "playing") {
    requestAnimationFrame(loop);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") input.up = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") input.down = true;
  if (e.code === "Space" && gameState === "gameOver") resetGame();
});

document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") input.up = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") input.down = false;
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  input.pointerY = ((e.touches[0].clientY - rect.top) / rect.height) * H;
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  input.pointerY = ((e.touches[0].clientY - rect.top) / rect.height) * H;
}, { passive: false });

canvas.addEventListener("touchend", () => {
  input.pointerY = null;
});

startBtn.addEventListener("click", resetGame);
restartBtn.addEventListener("click", resetGame);

render();