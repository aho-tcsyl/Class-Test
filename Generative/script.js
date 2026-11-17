/**
 * Generative Art Canvas - Vector Flow Field
 * -----------------------------------------
 * A procedural art generator that guides particles through a mathematical
 * vector field based on harmonic trigonometric functions.
 */

const canvas = document.getElementById('generativeCanvas');
const ctx = canvas.getContext('2d');

const regenerateBtn = document.getElementById('regenerateBtn');
const toggleAnimBtn = document.getElementById('toggleAnimBtn');
const downloadBtn = document.getElementById('downloadBtn');
const paletteLabel = document.getElementById('paletteLabel');

// Color Palettes
const PALETTES = [
  {
    name: 'Neon Cosmic',
    colors: ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#f43f5e']
  },
  {
    name: 'Sunset Mirage',
    colors: ['#f97316', '#fbbf24', '#f43f5e', '#a855f7', '#fb7185']
  },
  {
    name: 'Emerald Aurora',
    colors: ['#10b981', '#06b6d4', '#34d399', '#3b82f6', '#6ee7b7']
  },
  {
    name: 'Cyberpunk',
    colors: ['#ff007f', '#00f0ff', '#ffe600', '#7928ca', '#ffffff']
  },
  {
    name: 'Golden Echoes',
    colors: ['#fde047', '#eab308', '#ca8a04', '#f97316', '#ffffff']
  }
];

// Simulation Parameters
let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;

let particles = [];
const NUM_PARTICLES = 700;
const STEP_LENGTH = 2.2;
const MAX_STEPS = 120;

let currentPalette = PALETTES[0];
let isAnimating = false;
let animFrameId = null;
let timeOffset = 0;

// Random mathematical seeds for the flow field
let fieldParams = {
  freqX: 0.003,
  freqY: 0.003,
  multiplier: 4.0,
  noiseOffset: 0,
  vortex: null // {x, y, strength} when user clicks
};

// Resize Canvas with High-DPI support
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);
}

// Compute flow vector angle at any point (x, y)
function getFieldAngle(x, y, t = 0) {
  const nx = x * fieldParams.freqX;
  const ny = y * fieldParams.freqY;

  // Layered trigonometric harmonics
  let angle =
    Math.sin(nx * 2.5 + t) * Math.cos(ny * 2.5 + t) * fieldParams.multiplier +
    Math.sin(nx * 5.0 - ny * 3.0 + fieldParams.noiseOffset) * 1.5;

  // Add vortex distortion if user clicked
  if (fieldParams.vortex) {
    const dx = x - fieldParams.vortex.x;
    const dy = y - fieldParams.vortex.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 260) {
      const vortexInfluence = (1 - dist / 260) * fieldParams.vortex.strength;
      angle += Math.atan2(dy, dx) + Math.PI / 2 * vortexInfluence;
    }
  }

  return angle;
}

// Particle constructor
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.prevX = this.x;
    this.prevY = this.y;
    this.color = currentPalette.colors[Math.floor(Math.random() * currentPalette.colors.length)];
    this.life = Math.floor(Math.random() * (MAX_STEPS * 0.7)) + MAX_STEPS * 0.3;
    this.age = 0;
    this.speed = STEP_LENGTH * (0.8 + Math.random() * 0.6);
  }

  step(t = 0) {
    this.prevX = this.x;
    this.prevY = this.y;

    const angle = getFieldAngle(this.x, this.y, t);
    this.x += Math.cos(angle) * this.speed;
    this.y += Math.sin(angle) * this.speed;

    this.age++;

    // Wrap around boundaries
    if (this.x < 0) { this.x = width; this.prevX = width; }
    if (this.x > width) { this.x = 0; this.prevX = 0; }
    if (this.y < 0) { this.y = height; this.prevY = height; }
    if (this.y > height) { this.y = 0; this.prevY = 0; }
  }

  draw(context, alpha = 0.25) {
    context.beginPath();
    context.moveTo(this.prevX, this.prevY);
    context.lineTo(this.x, this.y);
    context.strokeStyle = this.color;
    context.globalAlpha = alpha;
    context.lineWidth = 1.2;
    context.stroke();
  }
}

// Initialize particles pool
function initParticles() {
  particles = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new Particle());
  }
}

// Randomize parameters & palette
function randomizeField() {
  currentPalette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  paletteLabel.textContent = `Palette: ${currentPalette.name}`;

  fieldParams.freqX = 0.002 + Math.random() * 0.004;
  fieldParams.freqY = 0.002 + Math.random() * 0.004;
  fieldParams.multiplier = 2.5 + Math.random() * 4.0;
  fieldParams.noiseOffset = Math.random() * Math.PI * 2;
  fieldParams.vortex = null;

  timeOffset = 0;
  initParticles();
}

// Draw a complete static flow painting
function renderStaticPiece() {
  // Clear with dark backdrop
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#06090e';
  ctx.fillRect(0, 0, width, height);

  // Trace particles through field
  for (let step = 0; step < MAX_STEPS; step++) {
    particles.forEach(p => {
      p.step(0);
      p.draw(ctx, 0.22);
    });
  }
}

// Real-time animation loop
function animate() {
  if (!isAnimating) return;

  // Gradual fading trail effect
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#06090e';
  ctx.fillRect(0, 0, width, height);

  timeOffset += 0.006;

  particles.forEach(p => {
    p.step(timeOffset);
    p.draw(ctx, 0.7);

    if (p.age > p.life) {
      p.reset();
    }
  });

  animFrameId = requestAnimationFrame(animate);
}

// Toggle Animation
function toggleAnimation() {
  isAnimating = !isAnimating;

  if (isAnimating) {
    toggleAnimBtn.textContent = '⏸ Pause';
    toggleAnimBtn.classList.add('active');
    animate();
  } else {
    toggleAnimBtn.textContent = '▶ Animate';
    toggleAnimBtn.classList.remove('active');
    cancelAnimationFrame(animFrameId);
  }
}

// Regenerate fresh art
function generateNew() {
  if (isAnimating) {
    toggleAnimation();
  }
  randomizeField();
  renderStaticPiece();
}

// Save PNG
function saveImage() {
  const link = document.createElement('a');
  link.download = `generative-art-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Event Listeners
window.addEventListener('resize', () => {
  resizeCanvas();
  if (!isAnimating) {
    renderStaticPiece();
  }
});

// Click on canvas to warp the vector field
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  fieldParams.vortex = {
    x: x,
    y: y,
    strength: (Math.random() > 0.5 ? 1 : -1) * (2.0 + Math.random() * 2.0)
  };

  if (isAnimating) {
    // Pulse particles toward vortex
    particles.forEach(p => {
      if (Math.random() < 0.4) {
        p.x = x + (Math.random() - 0.5) * 50;
        p.y = y + (Math.random() - 0.5) * 50;
        p.prevX = p.x;
        p.prevY = p.y;
      }
    });
  } else {
    renderStaticPiece();
  }
});

// Keyboard shortcut: Spacebar to generate new
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    generateNew();
  }
});

regenerateBtn.addEventListener('click', generateNew);
toggleAnimBtn.addEventListener('click', toggleAnimation);
downloadBtn.addEventListener('click', saveImage);

// Initial setup
resizeCanvas();
generateNew();

