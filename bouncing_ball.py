#!/usr/bin/env python3
"""
Bouncing Ball Physics Simulation (Python Tkinter)
------------------------------------------------
A standalone 2D physics simulation with gravity, velocity vectors,
damping/restitution, and ball-to-ball elastic collisions.

Requirements:
- Python 3 (Tkinter is included in standard Python)

Controls:
- Left Click: Spawn a ball at cursor with random velocity
- Spacebar / Middle Click: Spawn a burst of 5 balls
- G: Toggle Gravity on/off
- C: Clear all balls
- R: Reset simulation
"""

import math
import random
import tkinter as tk
from dataclasses import dataclass, field
from typing import List, Tuple

# Simulation Constants
CANVAS_WIDTH = 800
CANVAS_HEIGHT = 600
DEFAULT_GRAVITY = 0.4
DEFAULT_RESTITUTION = 0.82  # Elasticity (energy retained on bounce)
DEFAULT_AIR_DRAG = 0.999    # Air friction factor

COLORS = [
    "#38bdf8",  # Sky Blue
    "#f43f5e",  # Rose Red
    "#a855f7",  # Purple
    "#22c55e",  # Green
    "#fbbf24",  # Amber
    "#ec4899",  # Pink
    "#06b6d4",  # Cyan
    "#f97316",  # Orange
]


@dataclass
class Ball:
    x: float
    y: float
    vx: float
    vy: float
    radius: float
    color: str
    mass: float = field(init=False)
    canvas_id: int = 0

    def __post_init__(self):
        # 2D mass proportional to area
        self.mass = math.pi * (self.radius ** 2)

    def update(self, gravity: float, restitution: float, drag: float, width: int, height: int):
        # Apply gravity & drag
        self.vy += gravity
        self.vx *= drag
        self.vy *= drag

        # Update position
        self.x += self.vx
        self.y += self.vy

        # Floor collision
        if self.y + self.radius >= height:
            self.y = height - self.radius
            self.vy = -self.vy * restitution
            self.vx *= 0.985  # Floor friction
            if abs(self.vy) < 0.25 and abs(gravity) > 0.01:
                self.vy = 0  # Rest threshold to prevent jitter

        # Ceiling collision
        elif self.y - self.radius <= 0:
            self.y = self.radius
            self.vy = -self.vy * restitution

        # Right wall collision
        if self.x + self.radius >= width:
            self.x = width - self.radius
            self.vx = -self.vx * restitution

        # Left wall collision
        elif self.x - self.radius <= 0:
            self.x = self.radius
            self.vx = -self.vx * restitution


def resolve_collisions(balls: List[Ball], restitution: float):
    """Resolves elastic collisions between pairs of balls."""
    n = len(balls)
    for i in range(n):
        b1 = balls[i]
        for j in range(i + 1, n):
            b2 = balls[j]

            dx = b2.x - b1.x
            dy = b2.y - b1.y
            dist_sq = dx * dx + dy * dy
            min_dist = b1.radius + b2.radius

            if 0 < dist_sq < min_dist * min_dist:
                dist = math.sqrt(dist_sq)

                # 1. Positional correction (prevent overlap)
                overlap = min_dist - dist
                nx = dx / dist
                ny = dy / dist

                total_mass = b1.mass + b2.mass
                m1_ratio = b2.mass / total_mass
                m2_ratio = b1.mass / total_mass

                b1.x -= nx * overlap * m1_ratio
                b1.y -= ny * overlap * m1_ratio
                b2.x += nx * overlap * m2_ratio
                b2.y += ny * overlap * m2_ratio

                # 2. Velocity resolution (elastic collision along collision normal)
                tx = -ny
                ty = nx

                v1n = b1.vx * nx + b1.vy * ny
                v1t = b1.vx * tx + b1.vy * ty
                v2n = b2.vx * nx + b2.vy * ny
                v2t = b2.vx * tx + b2.vy * ty

                # Only collide if moving towards each other
                if v1n - v2n > 0:
                    v1n_post = (v1n * (b1.mass - b2.mass) + (1 + restitution) * b2.mass * v2n) / total_mass
                    v2n_post = (v2n * (b2.mass - b1.mass) + (1 + restitution) * b1.mass * v1n) / total_mass

                    b1.vx = v1n_post * nx + v1t * tx
                    b1.vy = v1n_post * ny + v1t * ty
                    b2.vx = v2n_post * nx + v2t * tx
                    b2.vy = v2n_post * ny + v2t * ty


class BouncingBallApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Python Bouncing Ball Simulation")
        self.root.geometry(f"{CANVAS_WIDTH}x{CANVAS_HEIGHT + 70}")
        self.root.resizable(False, False)
        self.root.configure(bg="#0f172a")

        # Physics settings
        self.gravity = DEFAULT_GRAVITY
        self.restitution = DEFAULT_RESTITUTION
        self.air_drag = DEFAULT_AIR_DRAG
        self.gravity_enabled = True

        # Canvas
        self.canvas = tk.Canvas(
            root,
            width=CANVAS_WIDTH,
            height=CANVAS_HEIGHT,
            bg="#090d16",
            highlightthickness=1,
            highlightbackground="#334155"
        )
        self.canvas.pack(pady=10)

        # Status HUD
        self.hud_label = tk.Label(
            root,
            text="",
            font=("Helvetica", 12, "bold"),
            fg="#94a3b8",
            bg="#0f172a"
        )
        self.hud_label.pack()

        # State
        self.balls: List[Ball] = []

        # Event bindings
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.root.bind("<space>", lambda e: self.spawn_burst(CANVAS_WIDTH // 2, CANVAS_HEIGHT // 3))
        self.root.bind("g", lambda e: self.toggle_gravity())
        self.root.bind("G", lambda e: self.toggle_gravity())
        self.root.bind("c", lambda e: self.clear_balls())
        self.root.bind("C", lambda e: self.clear_balls())
        self.root.bind("r", lambda e: self.reset_preset())
        self.root.bind("R", lambda e: self.reset_preset())

        # Seed initial balls
        self.reset_preset()

        # Start animation loop (~60 FPS -> 16 ms)
        self.animate()

    def reset_preset(self):
        self.clear_balls()
        for _ in range(5):
            radius = random.uniform(14, 26)
            x = random.uniform(radius + 20, CANVAS_WIDTH - radius - 20)
            y = random.uniform(radius + 20, CANVAS_HEIGHT // 2)
            vx = random.uniform(-6, 6)
            vy = random.uniform(-2, 4)
            color = random.choice(COLORS)
            self.add_ball(x, y, vx, vy, radius, color)

    def add_ball(self, x: float, y: float, vx: float, vy: float, radius: float, color: str):
        ball = Ball(x=x, y=y, vx=vx, vy=vy, radius=radius, color=color)
        ball.canvas_id = self.canvas.create_oval(
            x - radius, y - radius, x + radius, y + radius,
            fill=color, outline="#ffffff", width=1
        )
        self.balls.append(ball)

    def spawn_burst(self, cx: float, cy: float):
        for _ in range(8):
            angle = random.uniform(0, math.pi * 2)
            speed = random.uniform(5, 12)
            radius = random.uniform(12, 22)
            self.add_ball(
                cx, cy,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                radius,
                random.choice(COLORS)
            )

    def on_click(self, event):
        radius = random.uniform(14, 24)
        vx = random.uniform(-5, 5)
        vy = random.uniform(-6, 1)
        self.add_ball(event.x, event.y, vx, vy, radius, random.choice(COLORS))

    def on_drag(self, event):
        # Throttle continuous dragging spawn
        if random.random() < 0.25 and len(self.balls) < 80:
            radius = random.uniform(10, 18)
            self.add_ball(event.x, event.y, random.uniform(-3, 3), random.uniform(-3, 3), radius, random.choice(COLORS))

    def toggle_gravity(self):
        self.gravity_enabled = not self.gravity_enabled
        self.gravity = DEFAULT_GRAVITY if self.gravity_enabled else 0.0

    def clear_balls(self):
        for b in self.balls:
            self.canvas.delete(b.canvas_id)
        self.balls.clear()

    def update_hud(self):
        g_status = f"ON ({self.gravity:.2f})" if self.gravity_enabled else "OFF (Zero-G)"
        self.hud_label.config(
            text=f"Balls: {len(self.balls)}  |  Gravity: {g_status} [G]  |  [Space] Burst  |  [C] Clear  |  [R] Reset"
        )

    def animate(self):
        # Physics update
        for ball in self.balls:
            ball.update(self.gravity, self.restitution, self.air_drag, CANVAS_WIDTH, CANVAS_HEIGHT)

        # Ball-to-ball collisions
        resolve_collisions(self.balls, self.restitution)

        # Sync Canvas ovals
        for ball in self.balls:
            r = ball.radius
            self.canvas.coords(
                ball.canvas_id,
                ball.x - r, ball.y - r,
                ball.x + r, ball.y + r
            )

        self.update_hud()
        self.root.after(16, self.animate)


if __name__ == "__main__":
    tk_root = tk.Tk()
    app = BouncingBallApp(tk_root)
    tk_root.mainloop()

