const VSHADER = `
attribute vec4 a_Position;
uniform vec4 u_Translation;
void main(void) {
    gl_Position = a_Position + u_Translation;
    gl_PointSize = 5.0;
}
`;

const FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;
void main(void) {
    gl_FragColor = u_FragColor;
}
`

function main() {
    const canvas = document.getElementById("canvas");

    const gl = getWebGLContext(canvas);
    if (!gl) {
        console.log("Could not getWebGLContext");
        return;
    }

    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Could not initShaders");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("Could not get a_Position");
        return;
    }

    let u_Translation = gl.getUniformLocation(gl.program, "u_Translation");
    if (u_Translation < 0) {
        console.log("Could not get u_Translation");
        return;
    }

    let u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
    if (!u_FragColor) {
        console.log("Could not get u_FragColor");
        return;
    }

    // Set the color to blue
    gl.uniform4f(u_FragColor, 0.0, 1.0, 1.0, 1.0);

    const points = [
        -0.10,  0.20, // V0
        -0.25,  0.05,
        -0.10, -0.05,
         0.05, -0.10,
         0.15,  0.05,
         0.05,  0.15, // V5
    ];

    const verticies = points.length / 2;

    const arr = [
        undefined, gl.POINTS, undefined, 
        gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
        gl.TRIANGLES, undefined, gl.TRIANGLE_FAN
    ];

    for (let mode_index = 0; mode_index < arr.length; mode_index++) {

        const mode = arr[mode_index];

        if (mode === undefined) continue;

        // calculate translation
        const tx = mode_index % 3 * 0.66 - 0.66;
        const ty = -Math.floor(mode_index / 3) * 0.66 + 0.66;

        gl.uniform4f(u_Translation, tx, ty, 0.0, 0.0);

        buffer_points(gl, points, a_Position);

        gl.drawArrays(mode, 0, verticies);

        // Create and draw lines from the v0 to every vertex
        if (mode === gl.TRIANGLE_FAN) {

            let TRIANGLE_FAN_lines = [];
            for (let i = 1; i < verticies; i++) {
                TRIANGLE_FAN_lines.push(points[0], points[1]);
                TRIANGLE_FAN_lines.push(points[i * 2], points[i * 2 + 1]);
            }
            console.log(TRIANGLE_FAN_lines);

            buffer_points(gl, TRIANGLE_FAN_lines, a_Position);

            gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);

            gl.drawArrays(gl.LINES, 0, TRIANGLE_FAN_lines.length / 2);

            gl.uniform4f(u_FragColor, 0.0, 1.0, 1.0, 1.0);

        }

    }

    // Triangle strips have a different drawing order
    const strip_points = [
        -0.25,  0.05, // V1
        -0.10, -0.05, // V2
        -0.10,  0.20, // V0
         0.05, -0.10, // V3
         0.05,  0.15, // V5
         0.15,  0.05, // V4
    ];

    buffer_points(gl, strip_points, a_Position);

    // hardcode translation
    const tx = 0.0;
    const ty = -0.66;

    gl.uniform4f(u_Translation, tx, ty, 0.0, 0.0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, strip_points.length / 2);

    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);

    gl.drawArrays(gl.LINE_STRIP, 0, verticies);

}

function buffer_points(gl, g_points, a_Position) {
    let vertexBuf = gl.createBuffer();
    if (!vertexBuf) {
        throw new Error("Failed creating vertexBuffer");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g_points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(a_Position);
}