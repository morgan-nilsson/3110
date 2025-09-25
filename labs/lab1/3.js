// array of colors for the points

let VSHADER = `
attribute vec4 a_Position;
void main(void) {
    gl_Position = a_Position;
    gl_PointSize = 10.0;
}
`;

let FSHADER = `
void main(void) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

let FSHADER2 = `
precision mediump float;
uniform vec4 u_FragColor;
void main(void) {
    gl_FragColor = u_FragColor;
}
`


function main() {
    // get canvas from html
    let canvas = document.getElementById("canvas");
    let canvas2 = document.getElementById("canvas2");

    // get the gl rendering context
    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log("Unable to make rendering context");
        return;
    }
    let gl2 = getWebGLContext(canvas2);
    if (!gl2) {
        console.log("Unable to make rendering context");
        return;
    }

    // init shaders
    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Unable to init shaders");
        return;
    }
    if (!initShaders(gl2, VSHADER, FSHADER2)) {
        console.log("Unable to init shaders");
        return;
    }

    // get a_Position
    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("a_Position cannot be less than one");
        return;
    }

    let u_FragColor2 = gl2.getUniformLocation(gl2.program, "u_FragColor");
    if (!u_FragColor2) {
        console.log("Could not get u_FragColor");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl2.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl2.clear(gl2.COLOR_BUFFER_BIT)

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

    const points2 = [
        -0.35, -0.40, // left
        -0.30, -0.35,
        -0.25, -0.35,
        -0.20, -0.35,
        -0.15, -0.35,
        -0.10, -0.35,
        -0.05, -0.35,
        -0.00, -0.35,
         0.35, -0.40, // right
         0.30, -0.35,
         0.25, -0.35,
         0.20, -0.35,
         0.15, -0.35,
         0.10, -0.35,
         0.05, -0.35,
         0.00, -0.35,
        -0.35, -0.35, // left
        -0.30, -0.30,
        -0.25, -0.30,
        -0.20, -0.30,
        -0.15, -0.30,
        -0.10, -0.30,
        -0.05, -0.30,
        -0.00, -0.30,
         0.35, -0.35, // right
         0.30, -0.30,
         0.25, -0.30,
         0.20, -0.30,
         0.15, -0.30,
         0.10, -0.30,
         0.05, -0.30,
         0.00, -0.30,

        // eyes
        -0.25, 0.30,
        -0.30, 0.30,
        -0.25, 0.35,
        -0.30, 0.35,

         0.25, 0.30,
         0.30, 0.30,
         0.25, 0.35,
         0.30, 0.35,


    ]

    for (let i = 0; i < points.length; i += 2) {

        gl.vertexAttrib3f(a_Position, points[i], points[i + 1], 0.0);

        gl.drawArrays(gl.POINTS, 0, 1);
    }

    for (let i = 0; i < points2.length; i += 2) {

        gl2.vertexAttrib3f(a_Position, points2[i], points2[i + 1], 0.0);

        gl2.uniform4f(u_FragColor2, (points2[i] + 1) / 2, (points2[i + 1] + 1) / 2, 0, 1.0);
        

        gl2.drawArrays(gl2.POINTS, 0, 1);
    }

}