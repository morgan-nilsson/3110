Practice 9: Multi-Texture Blend

Goal: Combine multiple textures using shaders.

Objective:
Render a spinning cube or rectangle that blends two textures (e.g., your photo + a pattern texture).

Use two texture samplers (sampler2D tex1, tex2).

Blend them in the fragment shader:
gl_FragColor = mix(texture2D(tex1, uv), texture2D(tex2, uv), 0.5);