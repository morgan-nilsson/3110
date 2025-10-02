const VSHADER = `
attribute vec4 a_Position;
uniform vec4 u_Translation;
void main(void) {
    gl_Position = a_Position + u_Translation;
    gl_PointSize = 5.0;
}
`;

const FSHADER = `
void main(void) {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
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

    const points = [
        -0.10,  0.20, // V0
        -0.25,  0.05,
        -0.10, -0.05,
         0.05, -0.10,
         0.15,  0.05,
         0.05,  0.15, // V5
    ];

    // Triangle strips have a different drawing order
    const strip_points = [
        -0.25,  0.05, // V1
        -0.10, -0.05, // V2
        -0.10,  0.20, // V0
         0.05, -0.10, // V3
         0.05,  0.15, // V5
         0.15,  0.05, // V4
    ];

    const arr = [
        undefined, gl.POINTS, undefined, 
        gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
        gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN
    ];

    for (let mode_index = 0; mode_index < arr.length; mode_index++) {

        // if using triangle strip use strip points
        const local_points = mode_index == 7 ? strip_points : points;

        const mode = arr[mode_index];

        if (mode === undefined) continue;

        // calculate translation
        const tx = mode_index % 3 * 0.66 - 0.66;
        const ty = -Math.floor(mode_index / 3) * 0.66 + 0.66;

        gl.uniform4f(u_Translation, tx, ty, 0.0, 0.0);

        buffer_points(gl, local_points, a_Position);

        gl.drawArrays(mode, 0, local_points.length / 2);
    }
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