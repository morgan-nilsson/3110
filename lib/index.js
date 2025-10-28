/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 */

let VSHADER = `
attribute vec4 a_Position;
void main(void) {
    gl_Position = a_Position;
    gl_PointSize = 10.0;
}
`;

let FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;
void main(void) {
    gl_FragColor = u_FragColor;
}
`;

function main() {
    const canvas = document.getElementById('canvas');
    const gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    const u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const points = [];
    for (let t = 0; t < 10 * Math.PI; t += 0.1) {
        const r = t / (10 * Math.PI);
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        points.push(x, y);
    }

    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];

        gl.vertexAttrib3f(a_Position, x, y, 0.0);

        const r = (x + 1) / 2;
        const g = (y + 1) / 2;
        const b = 0.5;
        gl.uniform4f(u_FragColor, r, g, b, 1.0);

        gl.drawArrays(gl.POINTS, 0, 1);
    }

}