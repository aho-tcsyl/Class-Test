/**
 * Bouncing Ball Physics Simulation
 * Features:
 * - 2D physics integration (Euler method)
 * - Elastic boundary collisions with restitution
 * - 2-body elastic ball-on-ball collisions with mass & momentum conservation
 * - Slingshot drag-and-launch mechanism
 * - Web Audio API procedural bounce sound synthesis
 * - High-DPI Canvas support & Motion trails
 */

// --- Canvas & Audio Setup ---
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play procedural bounce sound based on impact velocity and ball size
function playBounceSound(speed, radius) {
  if (!controls.sound.checked) return;
  try {
    const actx = getAudioContext();
    if (!actx) return;

    const osc = actx.createOscillator();
    const gain = actx.createGain();

    // Larger balls produce deeper pitch, smaller balls higher pitch
    const baseFreq = Math.max(90, 500 - radius * 7);
    // Harder impact produces slightly brighter pitch
    const impactMod = Math.min(speed * 12, 180);
    const freq = baseFreq + impactMod;

    // Volume scales with impact speed (clamped)
    const volume = Math.min(Math.max((speed / 25) * 0.15, 0.01), 0.25);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), actx.currentTime + 0.08);

    gain.gain.setValueAtTime(volume, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(actx.destination);

    osc.start();
    osc.stop(actx.currentTime + 0.09);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

// --- DOM Controls ---
const controls = {
  gravity: document.getElementById('gravity'),
  gravityVal: document.getElementById('gravityVal'),
  restitution: document.getElementById('restitution'),
  restitutionVal: document.getElementById('restitutionVal'),
  friction: document.getElementById('friction'),
  frictionVal: document.getElementById('frictionVal'),
  ballRadius: document.getElementById('ballRadius'),
  ballRadiusVal: document.getElementById('ballRadiusVal'),
  trail: document.getElementById('trailToggle'),
  collision: document.getElementById('collisionToggle'),
  sound: document.getElementById('soundToggle'),
  addBallBtn: document.getElementById('addBallBtn'),
  burstBtn: document.getElementById('burstBtn'),
  clearBtn: document.getElementById('clearBtn'),
  ballCountBadge: document.getElementById('ballCountBadge'),
  fpsBadge: document.getElementById('fpsBadge'),
  presetButtons: document.querySelectorAll('.btn-preset')
};

// Update label helper
function updateControlLabels() {
  controls.gravityVal.textContent = parseFloat(controls.gravity.value).toFixed(2);
  controls.restitutionVal.textContent = parseFloat(controls.restitution.value).toFixed(2);
  controls.frictionVal.textContent = parseFloat(controls.friction.value).toFixed(3);
  controls.ballRadiusVal.textContent = `${controls.ballRadius.value} px`;
}

['gravity', 'restitution', 'friction', 'ballRadius'].forEach((id) => {
  controls[id].addEventListener('input', updateControlLabels);
});
updateControlLabels();

// --- Responsive Canvas Resizing ---
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;

  dpr = window.devicePixelRatio || 1;
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  // Keep balls within resized viewport
  balls.forEach(ball => ball.clampToBounds(canvasWidth, canvasHeight));
});

// --- Color Palette Generator ---
const PALETTE = [
  { fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  { fill: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  { fill: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  { fill: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  { fill: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
  { fill: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
  { fill: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  { fill: '#f97316', glow: 'rgba(249, 115, 22, 0.4)' },
];

function getRandomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

// --- Ball Class ---
class Ball {
  constructor(x, y, radius, vx = 0, vy = 0, colorObj = null) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = vx;
    this.vy = vy;
    this.mass = Math.PI * radius * radius; // 2D mass proportional to area
    this.color = colorObj || getRandomColor();
    this.history = [];
    this.maxTrailLength = 10;
  }

  update(gravity, restitution, airDrag, width, height) {
    // Save history for motion blur/trail
    if (controls.trail.checked) {
      this.history.push({ x: this.x, y: this.y });
      if (this.history.length > this.maxTrailLength) {
        this.history.shift();
      }
    } else {
      this.history.length = 0;
    }

    // Apply gravity
    this.vy += gravity;

    // Apply air drag
    this.vx *= airDrag;
    this.vy *= airDrag;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wall collision checks
    let hitSpeed = 0;

    // Floor collision
    if (this.y + this.radius >= height) {
      hitSpeed = Math.abs(this.vy);
      this.y = height - this.radius;
      this.vy = -this.vy * restitution;
      // Floor rolling friction
      this.vx *= 0.985;

      // Rest threshold to prevent micro-jittering
      if (Math.abs(this.vy) < 0.25 && Math.abs(gravity) > 0.01) {
        this.vy = 0;
      }
      if (hitSpeed > 1.5) playBounceSound(hitSpeed, this.radius);
    }
    // Ceiling collision
    else if (this.y - this.radius <= 0) {
      hitSpeed = Math.abs(this.vy);
      this.y = this.radius;
      this.vy = -this.vy * restitution;
      if (hitSpeed > 1.5) playBounceSound(hitSpeed, this.radius);
    }

    // Right wall collision
    if (this.x + this.radius >= width) {
      hitSpeed = Math.abs(this.vx);
      this.x = width - this.radius;
      this.vx = -this.vx * restitution;
      if (hitSpeed > 1.5) playBounceSound(hitSpeed, this.radius);
    }
    // Left wall collision
    else if (this.x - this.radius <= 0) {
      hitSpeed = Math.abs(this.vx);
      this.x = this.radius;
      this.vx = -this.vx * restitution;
      if (hitSpeed > 1.5) playBounceSound(hitSpeed, this.radius);
    }
  }

  clampToBounds(width, height) {
    this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
  }

  draw(context) {
    // Render trail if enabled
    if (controls.trail.checked && this.history.length > 1) {
      for (let i = 0; i < this.history.length; i++) {
        const pt = this.history[i];
        const ratio = (i + 1) / this.history.length;
        const trailRadius = this.radius * ratio * 0.7;

        context.beginPath();
        context.arc(pt.x, pt.y, Math.max(1, trailRadius), 0, Math.PI * 2);
        context.fillStyle = this.color.fill;
        context.globalAlpha = ratio * 0.25;
        context.fill();
      }
      context.globalAlpha = 1.0;
    }

    // Outer glow
    context.save();
    context.shadowColor = this.color.glow;
    context.shadowBlur = 12;

    // Ball body with radial highlight
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    const grad = context.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, this.color.fill);
    grad.addColorStop(1, '#0f172a');

    context.fillStyle = grad;
    context.fill();

    // Subtle rim stroke
    context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }
}

// --- Ball-on-Ball Elastic Collision Resolver ---
function resolveCollisions(ballList) {
  if (!controls.collision.checked) return;

  const count = ballList.length;
  for (let i = 0; i < count; i++) {
    const b1 = ballList[i];
    for (let j = i + 1; j < count; j++) {
      const b2 = ballList[j];

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distSq = dx * dx + dy * dy;
      const minDist = b1.radius + b2.radius;

      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);

        // 1. Position Resolution (Separate overlapping balls)
        const overlap = (minDist - dist);
        const nx = dx / dist; // Unit normal vector
        const ny = dy / dist;

        const totalMass = b1.mass + b2.mass;
        const m1Ratio = b2.mass / totalMass;
        const m2Ratio = b1.mass / totalMass;

        b1.x -= nx * overlap * m1Ratio;
        b1.y -= ny * overlap * m1Ratio;
        b2.x += nx * overlap * m2Ratio;
        b2.y += ny * overlap * m2Ratio;

        // 2. Velocity Resolution (1D elastic collision along normal)
        // Tangent vector
        const tx = -ny;
        const ty = nx;

        // Dot product velocities with normal & tangent
        const v1n = b1.vx * nx + b1.vy * ny;
        const v1t = b1.vx * tx + b1.vy * ty;
        const v2n = b2.vx * nx + b2.vy * ny;
        const v2t = b2.vx * tx + b2.vy * ty;

        // Only collide if moving towards each other
        if (v1n - v2n > 0) {
          const restitution = parseFloat(controls.restitution.value);

          // 1D momentum conservation with coefficient of restitution
          const v1nPost = (v1n * (b1.mass - b2.mass) + (1 + restitution) * b2.mass * v2n) / totalMass;
          const v2nPost = (v2n * (b2.mass - b1.mass) + (1 + restitution) * b1.mass * v1n) / totalMass;

          // Recombine normal and unchanged tangential velocities
          b1.vx = v1nPost * nx + v1t * tx;
          b1.vy = v1nPost * ny + v1t * ty;
          b2.vx = v2nPost * nx + v2t * tx;
          b2.vy = v2nPost * ny + v2t * ty;

          const relativeSpeed = Math.abs(v1n - v2n);
          if (relativeSpeed > 1.5) {
            playBounceSound(relativeSpeed, (b1.radius + b2.radius) / 2);
          }
        }
      }
    }
  }
}

// --- Simulation State ---
const balls = [];

function spawnBall(x, y, vx = 0, vy = 0, customRadius = null) {
  const radius = customRadius || parseFloat(controls.ballRadius.value);
  const clampedX = Math.max(radius, Math.min(canvasWidth - radius, x));
  const clampedY = Math.max(radius, Math.min(canvasHeight - radius, y));
  const newBall = new Ball(clampedX, clampedY, radius, vx, vy);
  balls.push(newBall);
  updateBallBadge();
}

function updateBallBadge() {
  controls.ballCountBadge.textContent = `Balls: ${balls.length}`;
}

// --- Interactive Mouse & Touch Input ---
let isInteracting = false;
let startPos = { x: 0, y: 0 };
let currentPos = { x: 0, y: 0 };
let grabbedBall = null;
let lastGrabbedPositions = [];

function getCanvasCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function handlePointerDown(e) {
  e.preventDefault();
  getAudioContext(); // Resume audio on first user gesture

  const pos = getCanvasCoordinates(e);
  startPos = { ...pos };
  currentPos = { ...pos };
  isInteracting = true;

  // Check if clicked an existing ball
  grabbedBall = null;
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    if (dx * dx + dy * dy <= b.radius * b.radius) {
      grabbedBall = b;
      grabbedBall.vx = 0;
      grabbedBall.vy = 0;
      lastGrabbedPositions = [{ x: b.x, y: b.y, time: performance.now() }];
      break;
    }
  }
}

function handlePointerMove(e) {
  if (!isInteracting) return;
  currentPos = getCanvasCoordinates(e);

  if (grabbedBall) {
    grabbedBall.x = Math.max(grabbedBall.radius, Math.min(canvasWidth - grabbedBall.radius, currentPos.x));
    grabbedBall.y = Math.max(grabbedBall.radius, Math.min(canvasHeight - grabbedBall.radius, currentPos.y));

    // Track fling velocity
    const now = performance.now();
    lastGrabbedPositions.push({ x: grabbedBall.x, y: grabbedBall.y, time: now });
    if (lastGrabbedPositions.length > 5) lastGrabbedPositions.shift();
  }
}

function handlePointerUp(e) {
  if (!isInteracting) return;
  isInteracting = false;

  if (grabbedBall) {
    // Compute throw fling velocity
    if (lastGrabbedPositions.length >= 2) {
      const first = lastGrabbedPositions[0];
      const last = lastGrabbedPositions[lastGrabbedPositions.length - 1];
      const dt = (last.time - first.time) / 1000;
      if (dt > 0.01) {
        grabbedBall.vx = Math.min(Math.max((last.x - first.x) / (dt * 60), -35), 35);
        grabbedBall.vy = Math.min(Math.max((last.y - first.y) / (dt * 60), -35), 35);
      }
    }
    grabbedBall = null;
    lastGrabbedPositions = [];
  } else {
    // Slingshot / Launcher
    const dx = startPos.x - currentPos.x;
    const dy = startPos.y - currentPos.y;
    const dragDistance = Math.hypot(dx, dy);

    if (dragDistance > 8) {
      // Slingshot launch velocity proportional to pull vector
      const launchVx = (startPos.x - currentPos.x) * 0.18;
      const launchVy = (startPos.y - currentPos.y) * 0.18;
      spawnBall(startPos.x, startPos.y, launchVx, launchVy);
    } else {
      // Just a click: spawn a stationary or gentle random drift ball
      const randomVx = (Math.random() - 0.5) * 4;
      const randomVy = (Math.random() - 0.5) * 4;
      spawnBall(startPos.x, startPos.y, randomVx, randomVy);
    }
  }
}

canvas.addEventListener('mousedown', handlePointerDown);
window.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
window.addEventListener('touchmove', handlePointerMove, { passive: false });
window.addEventListener('touchend', handlePointerUp, { passive: false });

// --- Button Actions ---
controls.addBallBtn.addEventListener('click', () => {
  const r = parseFloat(controls.ballRadius.value);
  const x = Math.random() * (canvasWidth - 2 * r) + r;
  const y = r + 20;
  const vx = (Math.random() - 0.5) * 10;
  const vy = Math.random() * 2;
  spawnBall(x, y, vx, vy, r);
});

controls.burstBtn.addEventListener('click', () => {
  const count = 10;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 3;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 6 + Math.random() * 10;
    const r = Math.floor(12 + Math.random() * 18);
    spawnBall(
      centerX + Math.cos(angle) * 15,
      centerY + Math.sin(angle) * 15,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      r
    );
  }
});

controls.clearBtn.addEventListener('click', () => {
  balls.length = 0;
  updateBallBadge();
});

// --- Presets ---
const PRESETS = {
  earth: {
    gravity: 0.45,
    restitution: 0.8,
    friction: 0.999,
    ballsCount: 3
  },
  space: {
    gravity: 0.0,
    restitution: 0.98,
    friction: 1.0,
    ballsCount: 5
  },
  superball: {
    gravity: 0.45,
    restitution: 0.98,
    friction: 0.9995,
    ballsCount: 4
  },
  chaos: {
    gravity: 0.5,
    restitution: 0.92,
    friction: 0.999,
    ballsCount: 20
  }
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  controls.gravity.value = p.gravity;
  controls.restitution.value = p.restitution;
  controls.friction.value = p.friction;
  updateControlLabels();

  // Reset active button state
  controls.presetButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === name);
  });

  // Spawn preset balls
  balls.length = 0;
  for (let i = 0; i < p.ballsCount; i++) {
    const r = 16 + Math.random() * 18;
    const x = r + Math.random() * (canvasWidth - 2 * r);
    const y = r + Math.random() * (canvasHeight / 2);
    const vx = (Math.random() - 0.5) * 14;
    const vy = (Math.random() - 0.5) * 6;
    spawnBall(x, y, vx, vy, r);
  }
}

controls.presetButtons.forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// --- Render Slingshot Aim Line ---
function drawAimLine() {
  if (isInteracting && !grabbedBall) {
    const dx = startPos.x - currentPos.x;
    const dy = startPos.y - currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      ctx.save();
      // Line from ball origin to drag point (rubber band)
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      // Forward trajectory guide
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(startPos.x + dx * 1.5, startPos.y + dy * 1.5);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();

      // Spawn preview circle
      const r = parseFloat(controls.ballRadius.value);
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }
  }
}

// --- Main Animation Loop ---
let lastFrameTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  // FPS calculation
  frameCount++;
  if (now - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    controls.fpsBadge.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Read current parameters
  const gravity = parseFloat(controls.gravity.value);
  const restitution = parseFloat(controls.restitution.value);
  const friction = parseFloat(controls.friction.value);

  // Update physics for each ball (skip physics for ball actively held by mouse)
  balls.forEach(ball => {
    if (ball !== grabbedBall) {
      ball.update(gravity, restitution, friction, canvasWidth, canvasHeight);
    }
  });

  // Resolve inter-ball collisions
  resolveCollisions(balls);

  // Render balls
  balls.forEach(ball => ball.draw(ctx));

  // Render aiming slingshot
  drawAimLine();
}

// Initialize simulation
resizeCanvas();
applyPreset('earth');
requestAnimationFrame(animate);

