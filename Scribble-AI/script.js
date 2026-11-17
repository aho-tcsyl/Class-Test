/**
 * Scribble to Image AI • Google Nano Banana
 * -----------------------------------------
 * Front-end drawing studio & inference client for `google/nano-banana`
 * hosted via Replicate and routed through the NYU ITP/IMA Replicate Proxy.
 *
 * https://replicate.com/google/nano-banana
 * https://itp-ima-replicate-proxy.web.app/
 */

// --- Settings & State ---
const DEFAULT_SETTINGS = {
  proxyUrl: 'https://itp-ima-replicate-proxy.web.app/api/create_n_get',
  model: 'google/nano-banana',
  authToken: '',
  outputFormat: 'png',
  aspectRatio: '1:1'
};

let settings = { ...DEFAULT_SETTINGS };

// Load settings from localStorage
try {
  const saved = localStorage.getItem('nano_banana_settings');
  if (saved) {
    const parsed = JSON.parse(saved);
    settings = { ...DEFAULT_SETTINGS, ...parsed };
    if (!settings.model) settings.model = DEFAULT_SETTINGS.model;
  }
} catch (e) {
  console.warn('Could not read settings from localStorage', e);
}

// --- DOM Elements ---
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const canvasOverlayHint = document.getElementById('canvasOverlayHint');

const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const penTool = document.getElementById('penTool');
const eraserTool = document.getElementById('eraserTool');
const brushSizeSlider = document.getElementById('brushSize');
const brushSizeVal = document.getElementById('brushSizeVal');
const colorModeBtn = document.getElementById('colorModeBtn');
const customColorPicker = document.getElementById('customColorPicker');
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');

// Result Panel Elements
const resultActions = document.getElementById('resultActions');
const toggleCompareBtn = document.getElementById('toggleCompareBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyToCanvasBtn = document.getElementById('copyToCanvasBtn');

// Result States
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const imageState = document.getElementById('imageState');
const errorState = document.getElementById('errorState');
const generatedImg = document.getElementById('generatedImg');
const sketchCompareImg = document.getElementById('sketchCompareImg');
const captionPrompt = document.getElementById('captionPrompt');
const loadingStatusText = document.getElementById('loadingStatusText');
const timerDisplay = document.getElementById('timerDisplay');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const errorRetryBtn = document.getElementById('errorRetryBtn');
const historyGrid = document.getElementById('historyGrid');
const historyCount = document.getElementById('historyCount');

// Settings Modal Elements
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const proxyUrlInput = document.getElementById('proxyUrlInput');
const modelInput = document.getElementById('modelInput');
const authTokenInput = document.getElementById('authTokenInput');
const outputFormatSelect = document.getElementById('outputFormatSelect');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');

// --- Drawing Engine State ---
let isDrawing = false;
let currentTool = 'pen'; // 'pen' or 'eraser'
let currentColor = '#000000';
let currentBgColor = '#ffffff';
let brushSize = parseInt(brushSizeSlider.value, 10) || 8;
let lastX = 0;
let lastY = 0;
const undoStack = [];
const MAX_UNDO = 25;
let sessionHistory = [];
let timerInterval = null;
let currentGeneratedUrl = '';
let currentSketchBase64 = '';
let isComparing = false;

// Initialize Canvas
function initCanvas() {
  canvas.width = 512;
  canvas.height = 512;
  fillCanvasBackground(currentBgColor);
  saveCanvasState();
}

function fillCanvasBackground(color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function saveCanvasState() {
  if (undoStack.length >= MAX_UNDO) {
    undoStack.shift();
  }
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function restoreLastCanvasState() {
  if (undoStack.length > 1) {
    undoStack.pop(); // Remove current state
    const previous = undoStack[undoStack.length - 1];
    ctx.putImageData(previous, 0, 0);
  } else if (undoStack.length === 1) {
    ctx.putImageData(undoStack[0], 0, 0);
  }
}

// Coordinate Helper (supports responsive scaling & high DPI)
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// Drawing Event Handlers
function startStroke(e) {
  e.preventDefault();
  isDrawing = true;
  canvasOverlayHint.classList.add('hidden');

  const coords = getCanvasCoords(e);
  lastX = coords.x;
  lastY = coords.y;

  // Single dot support on click/tap
  ctx.beginPath();
  ctx.arc(lastX, lastY, (currentTool === 'eraser' ? brushSize * 1.5 : brushSize) / 2, 0, Math.PI * 2);
  ctx.fillStyle = currentTool === 'eraser' ? currentBgColor : currentColor;
  ctx.fill();
}

function drawStroke(e) {
  if (!isDrawing) return;
  e.preventDefault();

  const coords = getCanvasCoords(e);

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(coords.x, coords.y);

  if (currentTool === 'eraser') {
    ctx.strokeStyle = currentBgColor;
    ctx.lineWidth = brushSize * 2.2;
  } else {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  lastX = coords.x;
  lastY = coords.y;
}

function finishStroke(e) {
  if (!isDrawing) return;
  isDrawing = false;
  saveCanvasState();
}

canvas.addEventListener('pointerdown', startStroke);
canvas.addEventListener('pointermove', drawStroke);
canvas.addEventListener('pointerup', finishStroke);
canvas.addEventListener('pointercancel', finishStroke);
canvas.addEventListener('pointerleave', finishStroke);

// --- Drawing Toolbar Actions ---
undoBtn.addEventListener('click', restoreLastCanvasState);

clearBtn.addEventListener('click', () => {
  fillCanvasBackground(currentBgColor);
  saveCanvasState();
  canvasOverlayHint.classList.remove('hidden');
});

penTool.addEventListener('click', () => {
  currentTool = 'pen';
  penTool.classList.add('active');
  eraserTool.classList.remove('active');
});

eraserTool.addEventListener('click', () => {
  currentTool = 'eraser';
  eraserTool.classList.add('active');
  penTool.classList.remove('active');
});

brushSizeSlider.addEventListener('input', () => {
  brushSize = parseInt(brushSizeSlider.value, 10);
  brushSizeVal.textContent = `${brushSize}px`;
});

// Color Swatches
document.querySelectorAll('.color-swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');
    currentColor = swatch.dataset.color;
    customColorPicker.value = currentColor;

    // Auto-switch to pen if eraser was active
    if (currentTool === 'eraser') {
      currentTool = 'pen';
      penTool.classList.add('active');
      eraserTool.classList.remove('active');
    }
  });
});

customColorPicker.addEventListener('input', (e) => {
  currentColor = e.target.value;
  document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
  if (currentTool === 'eraser') {
    currentTool = 'pen';
    penTool.classList.add('active');
    eraserTool.classList.remove('active');
  }
});

// Canvas Background Inversion
colorModeBtn.addEventListener('click', () => {
  invertCanvas();
  saveCanvasState();
});

function invertCanvas() {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];       // R
    d[i + 1] = 255 - d[i + 1]; // G
    d[i + 2] = 255 - d[i + 2]; // B
  }
  ctx.putImageData(imgData, 0, 0);

  currentBgColor = currentBgColor === '#ffffff' ? '#000000' : '#ffffff';
  document.getElementById('canvasBox').style.background = currentBgColor;

  // Invert current drawing color if it matches the background
  if (currentColor === '#000000' && currentBgColor === '#000000') {
    currentColor = '#ffffff';
  } else if (currentColor === '#ffffff' && currentBgColor === '#ffffff') {
    currentColor = '#000000';
  }
}

// --- Preset Scribbles ---
const PRESET_SCRIBBLES = {
  cat: (c) => {
    c.beginPath();
    c.arc(256, 270, 110, 0, Math.PI * 2);
    // Ears
    c.moveTo(170, 200); c.lineTo(150, 100); c.lineTo(220, 170);
    c.moveTo(290, 170); c.lineTo(360, 100); c.lineTo(340, 200);
    // Eyes
    c.moveTo(200, 250); c.arc(210, 250, 12, 0, Math.PI * 2);
    c.moveTo(290, 250); c.arc(300, 250, 12, 0, Math.PI * 2);
    // Nose & mouth
    c.moveTo(250, 280); c.lineTo(262, 280); c.lineTo(256, 290); c.closePath();
    c.moveTo(256, 290); c.quadraticCurveTo(240, 315, 220, 305);
    c.moveTo(256, 290); c.quadraticCurveTo(272, 315, 292, 305);
    // Whiskers
    c.moveTo(180, 280); c.lineTo(100, 270);
    c.moveTo(180, 290); c.lineTo(95, 295);
    c.moveTo(330, 280); c.lineTo(410, 270);
    c.moveTo(330, 290); c.lineTo(415, 295);
    c.stroke();
  },
  house: (c) => {
    c.beginPath();
    c.strokeRect(150, 240, 210, 180);
    c.moveTo(130, 240); c.lineTo(255, 130); c.lineTo(380, 240); c.closePath();
    c.strokeRect(225, 320, 60, 100);
    c.strokeRect(175, 270, 45, 45);
    c.moveTo(197, 270); c.lineTo(197, 315);
    c.moveTo(175, 292); c.lineTo(220, 292);
    c.strokeRect(310, 150, 30, 50);
    c.moveTo(325, 140); c.quadraticCurveTo(340, 110, 325, 90);
    c.quadraticCurveTo(310, 70, 335, 50);
    c.stroke();
  },
  boat: (c) => {
    c.beginPath();
    c.moveTo(120, 340); c.lineTo(390, 340);
    c.lineTo(340, 410); c.lineTo(170, 410); c.closePath();
    c.moveTo(256, 340); c.lineTo(256, 120);
    c.moveTo(256, 130); c.lineTo(360, 310); c.lineTo(256, 310); c.closePath();
    c.moveTo(246, 150); c.lineTo(160, 310); c.lineTo(246, 310); c.closePath();
    c.moveTo(80, 430); c.quadraticCurveTo(140, 410, 200, 430);
    c.quadraticCurveTo(260, 450, 320, 430);
    c.quadraticCurveTo(380, 410, 440, 430);
    c.stroke();
  },
  car: (c) => {
    c.beginPath();
    c.moveTo(90, 320); c.lineTo(140, 320);
    c.quadraticCurveTo(180, 240, 240, 230);
    c.lineTo(340, 230);
    c.quadraticCurveTo(380, 250, 430, 310);
    c.lineTo(445, 340); c.lineTo(90, 340); c.closePath();
    c.moveTo(240, 240); c.lineTo(330, 240); c.lineTo(325, 290); c.lineTo(235, 290); c.closePath();
    c.moveTo(140, 340); c.arc(170, 345, 32, 0, Math.PI * 2);
    c.moveTo(330, 340); c.arc(360, 345, 32, 0, Math.PI * 2);
    c.moveTo(60, 380); c.lineTo(470, 380);
    c.stroke();
  },
  tree: (c) => {
    c.beginPath();
    c.moveTo(240, 440); c.quadraticCurveTo(250, 340, 230, 270);
    c.moveTo(270, 440); c.quadraticCurveTo(265, 340, 280, 270);
    c.moveTo(150, 240); c.arc(190, 220, 50, 0, Math.PI * 2);
    c.moveTo(230, 180); c.arc(260, 170, 60, 0, Math.PI * 2);
    c.moveTo(300, 220); c.arc(330, 210, 55, 0, Math.PI * 2);
    c.moveTo(200, 270); c.arc(260, 250, 55, 0, Math.PI * 2);
    c.strokeRect(210, 440, 90, 35);
    c.stroke();
  },
  rocket: (c) => {
    c.beginPath();
    // Rocket fuselage
    c.moveTo(256, 110);
    c.quadraticCurveTo(210, 190, 215, 330);
    c.lineTo(297, 330);
    c.quadraticCurveTo(302, 190, 256, 110);
    // Fins
    c.moveTo(215, 300); c.lineTo(165, 360); c.lineTo(215, 345);
    c.moveTo(297, 300); c.lineTo(347, 360); c.lineTo(297, 345);
    // Window
    c.moveTo(256, 200); c.arc(256, 215, 22, 0, Math.PI * 2);
    // Exhaust flames
    c.moveTo(230, 345); c.lineTo(256, 410); c.lineTo(282, 345);
    c.stroke();
  },
  coffee: (c) => {
    c.beginPath();
    // Mug body
    c.moveTo(180, 230);
    c.lineTo(190, 370);
    c.quadraticCurveTo(256, 390, 322, 370);
    c.lineTo(332, 230);
    c.closePath();
    // Handle
    c.moveTo(330, 260);
    c.quadraticCurveTo(395, 270, 390, 330);
    c.quadraticCurveTo(385, 360, 324, 350);
    // Steam
    c.moveTo(225, 200); c.quadraticCurveTo(210, 170, 230, 140);
    c.moveTo(256, 195); c.quadraticCurveTo(270, 160, 250, 130);
    c.moveTo(285, 200); c.quadraticCurveTo(270, 170, 290, 140);
    c.stroke();
  }
};

document.querySelectorAll('.preset-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const key = chip.dataset.preset;
    if (PRESET_SCRIBBLES[key]) {
      fillCanvasBackground(currentBgColor);
      canvasOverlayHint.classList.add('hidden');

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      PRESET_SCRIBBLES[key](ctx);
      saveCanvasState();
    }
  });
});

// --- Style Pills ---
document.querySelectorAll('.style-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    const style = pill.dataset.style;
    const current = promptInput ? promptInput.value.trim() : '';
    if (current && !current.includes(style)) {
      promptInput.value = `${current}, ${style}`;
    } else if (!current) {
      promptInput.value = style;
    }
    if (promptInput) promptInput.focus();
  });
});

// --- Switch Display States ---
function showResultState(stateEl) {
  [emptyState, loadingState, imageState, errorState].forEach((el) => {
    el.classList.remove('active');
  });
  stateEl.classList.add('active');

  resultActions.hidden = (stateEl !== imageState);
}

// Stopwatch Timer
function startTimer() {
  let seconds = 0;
  timerDisplay.textContent = '00:00';
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    seconds++;
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// --- Google Nano Banana Inference via ITP Replicate Proxy ---
async function generateArtwork() {
  const userPrompt = promptInput ? promptInput.value.trim() : '';
  
  // High quality prompt formulation for Nano Banana
  const finalPrompt = userPrompt || 'Transform this sketch drawing into a vivid, highly detailed, beautifully rendered complete artwork based directly on the shapes, lines, and subjects depicted in the sketch.';

  // Capture current canvas sketch
  currentSketchBase64 = canvas.toDataURL('image/png');
  sketchCompareImg.src = currentSketchBase64;

  // Set UI to loading state
  showResultState(loadingState);
  loadingStatusText.textContent = 'Packaging sketch & contacting ITP/IMA Proxy...';
  startTimer();
  generateBtn.disabled = true;
  generateBtn.querySelector('.spinner').hidden = false;
  generateBtn.querySelector('.btn-text').textContent = 'Generating with Nano Banana...';

  try {
    // Prepare payload adhering to Replicate google/nano-banana schema
    const payload = {
      model: settings.model || DEFAULT_SETTINGS.model,
      input: {
        prompt: finalPrompt,
        image_input: [currentSketchBase64],
        output_format: settings.outputFormat || 'png'
      }
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    if (settings.authToken && settings.authToken.trim()) {
      headers['Authorization'] = `Bearer ${settings.authToken.trim()}`;
    }

    loadingStatusText.textContent = 'Running google/nano-banana on Replicate GPU...';

    // Send request to ITP Proxy
    const response = await fetch(settings.proxyUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errDetail = response.statusText;
      try {
        const errJson = await response.json();
        errDetail = errJson.error || errJson.details || JSON.stringify(errJson);
      } catch (e) {
        errDetail = await response.text();
      }
      throw new Error(`Proxy error (${response.status}): ${errDetail}`);
    }

    const result = await response.json();
    console.log('Replicate Proxy Prediction Result:', result);

    if (result.error) {
      throw new Error(result.error + (result.details ? `: ${result.details}` : ''));
    }

    // Extract image URL from output
    let imageUrl = '';
    if (typeof result.output === 'string') {
      imageUrl = result.output;
    } else if (Array.isArray(result.output) && result.output.length > 0) {
      imageUrl = result.output[result.output.length - 1];
    }

    if (!imageUrl) {
      throw new Error('No output image URL returned by the model prediction.');
    }

    currentGeneratedUrl = imageUrl;
    loadingStatusText.textContent = 'Loading generated masterpiece...';

    // Preload image to avoid blank flashing
    const imgLoader = new Image();
    imgLoader.crossOrigin = 'anonymous';
    imgLoader.onload = () => {
      stopTimer();
      generatedImg.src = imageUrl;
      captionPrompt.textContent = userPrompt || 'Synthesized from sketch with google/nano-banana';
      showResultState(imageState);
      addToHistory(imageUrl, userPrompt || 'Nano Banana Artwork');
    };
    imgLoader.onerror = () => {
      stopTimer();
      generatedImg.src = imageUrl;
      captionPrompt.textContent = userPrompt || 'Synthesized from sketch with google/nano-banana';
      showResultState(imageState);
      addToHistory(imageUrl, userPrompt || 'Nano Banana Artwork');
    };
    imgLoader.src = imageUrl;

  } catch (err) {
    console.error('Generation Failed:', err);
    stopTimer();
    showResultState(errorState);
    errorTitle.textContent = 'Generation Failed';
    errorMessage.textContent = err.message || 'Unknown network or model prediction error.';
  } finally {
    generateBtn.disabled = false;
    generateBtn.querySelector('.spinner').hidden = true;
    generateBtn.querySelector('.btn-text').textContent = 'Generate With Nano Banana 🍌✨';
  }
}

generateBtn.addEventListener('click', generateArtwork);
errorRetryBtn.addEventListener('click', generateArtwork);

// Keyboard Shortcuts: Cmd+Enter / Ctrl+Enter to generate, Cmd+Z to undo
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    generateArtwork();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    restoreLastCanvasState();
  }
});

// Compare Sketch Button (toggle between AI Artwork and Original Sketch)
toggleCompareBtn.addEventListener('click', () => {
  isComparing = !isComparing;
  if (isComparing) {
    sketchCompareImg.classList.remove('hidden');
    toggleCompareBtn.classList.add('active');
    toggleCompareBtn.textContent = '👁️ Show AI Artwork';
  } else {
    sketchCompareImg.classList.add('hidden');
    toggleCompareBtn.classList.remove('active');
    toggleCompareBtn.textContent = '👁️ Compare Sketch';
  }
});

// --- Download & Load to Canvas ---
downloadBtn.addEventListener('click', async () => {
  if (!currentGeneratedUrl) return;
  try {
    const res = await fetch(currentGeneratedUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nano-banana-art-${Date.now()}.${settings.outputFormat || 'png'}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    window.open(currentGeneratedUrl, '_blank');
  }
});

copyToCanvasBtn.addEventListener('click', () => {
  if (!currentGeneratedUrl) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    saveCanvasState();
    canvasOverlayHint.classList.add('hidden');
  };
  img.src = currentGeneratedUrl;
});

// --- History / Session Gallery ---
function addToHistory(url, label) {
  sessionHistory.unshift({ url, label });
  historyCount.textContent = sessionHistory.length;

  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.className = 'history-thumb';
  thumb.alt = label;
  thumb.title = label;

  thumb.addEventListener('click', () => {
    currentGeneratedUrl = url;
    generatedImg.src = url;
    captionPrompt.textContent = label;
    showResultState(imageState);
  });

  historyGrid.insertBefore(thumb, historyGrid.firstChild);
}

// --- Settings Modal Logic ---
function openSettings() {
  proxyUrlInput.value = settings.proxyUrl;
  modelInput.value = settings.model;
  authTokenInput.value = settings.authToken || '';
  outputFormatSelect.value = settings.outputFormat || 'png';
  aspectRatioSelect.value = settings.aspectRatio || '1:1';
  settingsModal.hidden = false;
}

function closeSettings() {
  settingsModal.hidden = true;
}

function saveSettings() {
  settings.proxyUrl = proxyUrlInput.value.trim() || DEFAULT_SETTINGS.proxyUrl;
  settings.model = modelInput.value.trim() || DEFAULT_SETTINGS.model;
  settings.authToken = authTokenInput.value.trim();
  settings.outputFormat = outputFormatSelect.value || 'png';
  settings.aspectRatio = aspectRatioSelect.value || '1:1';

  try {
    localStorage.setItem('nano_banana_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save settings to localStorage', e);
  }

  closeSettings();
}

function resetSettings() {
  settings = { ...DEFAULT_SETTINGS };
  proxyUrlInput.value = settings.proxyUrl;
  modelInput.value = settings.model;
  authTokenInput.value = '';
  outputFormatSelect.value = settings.outputFormat;
  aspectRatioSelect.value = settings.aspectRatio;

  try {
    localStorage.removeItem('nano_banana_settings');
  } catch (e) {}
}

openSettingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
resetSettingsBtn.addEventListener('click', resetSettings);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// Initialize on page load
initCanvas();
