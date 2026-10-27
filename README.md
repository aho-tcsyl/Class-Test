# ⚡ Bouncing Ball Physics Simulation

An interactive 2D physics project demonstrating real-time kinematics, boundary bounces, and two-body elastic collisions.

This repository includes two implementations:
1. **Interactive Web App** (`index.html`, `style.css`, `script.js`): High-DPI HTML5 Canvas, Web Audio API sound synthesis, slingshot launcher, mouse fling, motion trails, and live physics sliders.
2. **Python Desktop App** (`bouncing_ball.py`): Zero-dependency Python 3 application using Tkinter.

---

## 🚀 Quick Start

### 1. Web Application (Recommended)
You can open `index.html` directly in any modern web browser:
```bash
# On macOS:
open index.html

# Or start a local development server:
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

### 2. Python Application
Run the standalone Python Tkinter script:
```bash
python3 bouncing_ball.py
```

---

## 🕹️ Controls & Interaction

### Web App
- **Click & Drag in empty space**: Slingshot aiming line to aim and shoot a ball with custom velocity.
- **Click on empty space**: Spawn a ball with random velocity.
- **Click & Drag an existing ball**: Grab and throw/fling the ball.
- **Sliders**: Adjust Gravity ($g$), Restitution (bounciness $e$), Air resistance, and Ball size in real time.
- **Toggles**: Toggle Motion Trails, Ball Collisions, and Procedural Audio.
- **Presets**:
  - **Earth**: Standard gravity ($g = 0.45$), natural damping.
  - **Zero-G**: Orbiting/bouncing particles in zero gravity.
  - **Superball**: Near 100% elastic bounce.
  - **Chaos**: 20 high-speed colliding particles.

### Python App
- **Left Click**: Spawn ball at mouse position.
- **Mouse Drag**: Continuous spawning stream.
- **Spacebar**: Spawn an explosive burst of 8 balls.
- **G**: Toggle gravity on/off.
- **C**: Clear all balls.
- **R**: Reset to default preset.

---

## 📐 Physics Concepts Explained

### 1. Velocity and Acceleration (Euler Integration)
Each frame, the vertical velocity updates due to gravitational acceleration $g$:
$$v_y(t + \Delta t) = v_y(t) + g$$
Position updates according to velocity:
$$x(t + \Delta t) = x(t) + v_x$$
$$y(t + \Delta t) = y(t) + v_y$$

### 2. Wall Collisions & Coefficient of Restitution ($e$)
When a ball strikes a boundary (floor, ceiling, or walls), its normal velocity reverses and is scaled by the restitution coefficient $e \in [0, 1]$:
$$v_{\text{after}} = -e \cdot v_{\text{before}}$$
- When $e = 1.0$: Perfectly elastic collision (no kinetic energy lost).
- When $e < 1.0$: Inelastic collision (energy dissipated as heat or sound).

### 3. Two-Body Elastic Collisions
When two balls of radii $r_1, r_2$ and masses $m_1, m_2$ intersect:
1. **Positional Correction**: Overlapping spheres are separated along the collision normal $\vec{n} = \frac{\vec{p}_2 - \vec{p}_1}{\|\vec{p}_2 - \vec{p}_1\|}$ proportional to their inverse mass.
2. **Momentum & Energy Conservation**: Velocities are projected onto the collision normal $\vec{n}$ and tangent $\vec{t}$. The 1D elastic collision equations determine the new normal velocities:
$$v_{1n}' = \frac{v_{1n}(m_1 - m_2) + 2 m_2 v_{2n}}{m_1 + m_2}$$
$$v_{2n}' = \frac{v_{2n}(m_2 - m_1) + 2 m_1 v_{1n}}{m_1 + m_2}$$
Tangential velocities remain unaffected by the frictionless impact.

---

## 📁 Project Structure

```
Class Test/
├── index.html        # Web app structure and controls UI
├── style.css         # Glassmorphism styling and responsive layout
├── script.js         # Physics engine, collision solver, canvas rendering & sound
├── bouncing_ball.py  # Standalone Python Tkinter implementation
└── README.md         # Project documentation and physics explanation
```

