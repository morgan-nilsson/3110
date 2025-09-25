// array of colors for the points

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
    // get canvas from html
    let canvas = document.getElementById("canvas");

    // get the gl rendering context
    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log("Unable to make rendering context");
        return;
    }

    // init shaders
    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Unable to init shaders");
        return;
    }

    // get a_Position
    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("a_Position cannot be less than one");
        return;
    }

    let u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
    if (!u_FragColor) {
        console.log("Could not get u_FragColor");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT)

    const points = [
        -0.35, -0.30, // left
        -0.30, -0.35,
        -0.25, -0.35,
        -0.20, -0.35,
        -0.15, -0.35,
        -0.10, -0.35,
        -0.05, -0.35,
        -0.00, -0.35,
        0.35, -0.30, // right
        0.30, -0.35,
        0.25, -0.35,
        0.20, -0.35,
        0.15, -0.35,
        0.10, -0.35,
        0.05, -0.35,
        0.00, -0.35,

        // eyes
        -0.25, 0.3,
        0.25, 0.3,

    ];

    for (let i = 0; i < points.length; i += 2) {

        gl.vertexAttrib3f(a_Position, points[i], points[i + 1], 0.0);

        gl.uniform4f(u_FragColor, Math.random(), Math.random(), Math.random(), 1.0);

        gl.drawArrays(gl.POINTS, 0, 1);
    }

}