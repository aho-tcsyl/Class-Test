# 🎨 Generative Art Canvas

A clean, standalone generative art project built with vanilla HTML, JavaScript, and CSS.

It generates procedural flow-field artworks by tracing particles through multi-octave harmonic trigonometric vector fields.

---

## 📁 Files

- **`index.html`**: Clean semantic HTML structure with canvas viewport and control toolbar.
- **`style.css`**: Dark modern styling with responsive layout and glassmorphism touches.
- **`script.js`**: Vanilla JS procedural vector field engine, particle simulator, and high-DPI canvas renderer.

---

## 🚀 How to Run

You can open `index.html` directly in any web browser:

```bash
# On macOS:
open Generative/index.html

# Or with a local server:
cd Generative
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

---

## 🕹️ Features & Controls

- **🎲 Generate New (`Spacebar`)**: Generates a completely new algorithmic composition with randomized mathematical seeds and color palettes.
- **▶ Animate / Pause**: Toggles real-time animated flow where particles continuously evolve through time.
- **👆 Interactive Warp**: Click anywhere on the canvas to inject a localized gravitational vortex into the flow field.
- **💾 Save PNG**: Exports the current generative artwork as a high-resolution PNG image.
- **5 Curated Color Palettes**: *Neon Cosmic*, *Sunset Mirage*, *Emerald Aurora*, *Cyberpunk*, and *Golden Echoes*.

