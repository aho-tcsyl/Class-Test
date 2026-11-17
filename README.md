# 🍌 Scribble to Image AI (Google Nano Banana + ITP Replicate Proxy)

An interactive web browser application that lets anyone sketch a drawing on an HTML5 canvas and have **Google's Nano Banana model** (`google/nano-banana`) on Replicate produce an artwork inspired by the sketch.

The application communicates directly via the [NYU ITP/IMA Replicate Proxy](https://itp-ima-replicate-proxy.web.app/) (`/api/create_n_get`), eliminating the need to expose private API keys in client-side code.

---

## 🚀 Live Links & References

- **Replicate Model**: [`google/nano-banana`](https://replicate.com/google/nano-banana)
- **API Proxy**: [NYU ITP/IMA Replicate Proxy](https://itp-ima-replicate-proxy.web.app/) (`https://itp-ima-replicate-proxy.web.app/api/create_n_get`)

---

## 💻 How to Run

You can open the web app directly in any modern browser:

### Option 1: Open Directly in Browser (macOS)
```bash
open "Scribble-AI/index.html"
```

### Option 2: Local HTTP Server (Recommended)
```bash
cd Scribble-AI
python3 -m http.server 8080
```
Then visit [`http://localhost:8080`](http://localhost:8080) in your web browser.

---

## ✨ Features

- **Smooth HTML5 Canvas Drawing Studio**:
  - Pen & Eraser tools with dynamic brush size slider (2px–36px).
  - Multi-color palette (Black, White, Red, Blue, Green, Yellow, Purple) + native HTML5 color picker.
  - Background invert button (Black on White / White on Black) with automatic pixel inversion.
  - Undo stack (Ctrl+Z / Cmd+Z) and Clear Canvas.
  - Touch, mouse, and stylus/pen support with `PointerEvents`.
- **1-Click Preset Scribbles**:
  - Instant presets to test immediately: 🐱 Cat, 🏠 House, ⛵ Sailboat, 🚗 Car, 🌳 Tree, 🚀 Rocket, and ☕ Coffee Mug.
- **Prompt & Style Guidance**:
  - **Promptless Mode**: If you leave the prompt blank, Nano Banana automatically transforms your sketch into a complete artwork.
  - **Custom Prompt**: Type whatever you want to guide the subject.
  - **Quick Style Chips**: 📸 Photo, 🎨 Oil Painting, 🌌 Cyberpunk, ✨ Anime / Ghibli, 🧸 3D Pixar, 🖌️ Watercolor, 🐉 Fantasy.
- **Result Darkroom**:
  - **Live Timer & Status**: Displays elapsed GPU synthesis time.
  - **Compare Sketch (👁️)**: Toggle between your original drawing and the generated AI artwork.
  - **Save Image (💾)**: Download high-resolution PNG or JPG.
  - **Load to Canvas (🔄)**: Load the generated artwork back onto the drawing canvas to draw over it and iterate.
  - **Session Gallery**: Thumbnails of all generated images within the session.
- **Configurable Settings**:
  - Endpoint: `https://itp-ima-replicate-proxy.web.app/api/create_n_get`
  - Model: `google/nano-banana`
  - Optional NYU Auth Token (for extended daily request quotas).
  - Configurable output format (`png` / `jpg`) and aspect ratio.

---

## 🛠️ API & Proxy Integration Details

### Request Payload to ITP Proxy:
```json
{
  "model": "google/nano-banana",
  "input": {
    "prompt": "Transform this sketch into a vivid, highly detailed, beautifully rendered artwork...",
    "image_input": [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    ],
    "output_format": "png"
  }
}
```

### Proxy Endpoint:
- `POST https://itp-ima-replicate-proxy.web.app/api/create_n_get`
- Header: `Content-Type: application/json`
- Optional Header: `Authorization: Bearer <NYU_TOKEN>` (for users who sign in via NYU Google Account on the proxy page to get 500 requests/day).

---

## 📁 File Structure

```
Scribble-AI/
├── index.html   # Semantic UI with drawing studio, result panel, and settings
├── style.css    # Responsive dark UI with glowing accents, swatches, and responsive grid
├── script.js    # Drawing engine, Replicate proxy API pipeline, compare toggle, and history
└── README.md    # Documentation and quickstart instructions
```
