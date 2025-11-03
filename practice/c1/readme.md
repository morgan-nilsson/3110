🌀 Challenge Problem 1: “The Fractal Galaxy”
Objective

Create a WebGL program that renders an animated “galaxy” scene combining parametric geometry, fractal generation, multiple shaders, and textures.

Detailed Requirements

Scene Setup

Use two canvases side by side:

Canvas A: displays a rotating fractal star system.

Canvas B: displays a textured nebula background with interactive color effects.

Canvas A — Fractal Stars

Generate a fractal star pattern using a recursive algorithm:

Start with a central point.

Recursively generate smaller orbiting stars at random angles and radii.

Each recursion level decreases the star size and increases brightness.

Each star should be rendered as a point primitive with a gradient color shader (color based on distance from center).

Apply continuous 3D rotation (around Y and Z axes).

Allow the user to toggle rotation direction with a keyboard key press.

Canvas B — Nebula Texture Field

Create a quad that covers the entire canvas.

Apply a procedural texture (e.g., Perlin noise texture or cloud image) as the base layer.

Overlay a multi-texture effect that blends two textures (e.g., nebula.jpg + starfield.png) using: