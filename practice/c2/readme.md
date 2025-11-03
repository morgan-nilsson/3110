🔺 Challenge Problem 2: “The Portal of Transformations”
Objective

Design an interactive, animated scene where multiple 2D geometric patterns, textures, and shaders combine to create a “portal” visual effect that evolves based on user input.

Detailed Requirements

Core Scene

Use a single canvas divided into three layers (drawn using framebuffers or separate draw calls):

Background Layer: rotating parametric spiral (like a Fibonacci or Archimedean spiral).

Middle Layer: a Sierpiński triangle fractal, textured with your own image.

Foreground Layer: a nested pattern of rotating diamonds that form a “portal rim.”

Shaders

Implement three distinct shader programs:

Program 1 (Gradient Spiral): colors each point using a radial gradient (r, g, b) = (r, abs(sin(time)), abs(cos(time))).

Program 2 (Textured Fractal): applies a multi-texturing effect to each triangle in the Sierpiński pattern, blending two images based on recursion depth.

Program 3 (Animated Portal Rim): uses a time-driven distortion effect on vertex positions: