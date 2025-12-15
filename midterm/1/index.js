/**
 * Tell jsdoc to include these files for intellisense
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 */

const VSHADER = `
attribute vec4 a_Position;
uniform vec4 u_Translation;
void main(void) {
    gl_Position = a_Position + u_Translation;
    gl_PointSize = 10.0;
}
`;

const FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;
void main(void) {
    gl_FragColor = u_FragColor;
}
`;

function main() {
    const canvas = document.getElementById("canvas");
    if (canvas == null) {
        console.log("Could not get canvas");
        return;
    }

    const gl = getWebGLContext(canvas);
    if (gl == null) {
        console.log("Could not get gl");
        return;
    }

    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Could not init shaders");
        return;
    }

    const a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("Could not get a_Position");
        return;
    }

    const u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
    if (u_FragColor == null) {
        console.log("Cannot get u_Frag color");
        return;
    }


    let u_Translation = gl.getUniformLocation(gl.program, "u_Translation");
    if (u_Translation < 0) {
        console.log("Could not get u_Translation");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const points = [
        -0.9, 0.9, // top left
        -0.6, 0.9, // top right
        -0.6, 0.6, // bottom right
        -0.9, 0.6, // bottom left
    ];

    for (let i = 0; i < 16; i++) {

        const column = i % 4;
        const row = Math.floor(i / 4);

        // give gaps between squares
        gl.uniform4f(u_Translation, 0.45 * column, -0.45 * row, 0.0, 0.0)
        // random colors
        gl.uniform4f(u_FragColor, Math.random(), Math.random(), Math.random(), 1.0)

        const n = buffer_points(gl, points, a_Position)

        gl.drawArrays(gl.TRIANGLE_FAN, 0, n)

    }
}

/**
 * 
 * @param {WebGLContext} gl 
 * @param {number[]} g_points 
 * @param {number} a_Position 
 * @returns {number} the amount of vertices
 */
function buffer_points(gl, g_points, a_Position) {
    let vertexBuf = gl.createBuffer();
    if (!vertexBuf) {
        throw new Error("Failed creating vertexBuffer");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g_points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(a_Position);

    return g_points.length / 2;
}