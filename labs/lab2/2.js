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

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

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

    draw_top_left(gl, a_Position, u_Translation, u_FragColor);
    draw_top_right(gl, a_Position, u_Translation, u_FragColor);
    draw_bottom_left(gl, a_Position, u_Translation, u_FragColor);
    draw_bottom_right(gl, a_Position, u_Translation, u_FragColor);
}

function draw_top_left(gl, a_Position, u_Translation, u_FragColor) {
    gl.uniform4f(u_Translation, -0.5, 0.5, 0.0, 0.0);

    // Set the color to red
    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);


    let z_points = [
        -0.30,  0.30,
         0.30,  0.30,
        -0.30, -0.30,
         0.30, -0.30,
    ];

    buffer_points(gl, z_points, a_Position);

    gl.drawArrays(gl.LINE_STRIP, 0, z_points.length / 2);
}

function draw_top_right(gl, a_Position, u_Translation, u_FragColor) {

    // draw the top right thing
    gl.uniform4f(u_Translation, 0.5, 0.5, 0.0, 0.0);

    // Set the color to blue
    gl.uniform4f(u_FragColor, 0.0, 0.0, 1.0, 1.0);

    const number_of_lines = 5;
    for (let i = 0; i < number_of_lines; i++) {

        const points = [
            -0.30,  0.30 - i * 0.5 / number_of_lines,
             0.30,  0.30 - i * 0.5 / number_of_lines,

        ];

        buffer_points(gl, points, a_Position);

        gl.drawArrays(gl.LINES, 0, points.length / 2);

    }

    // triangles
    const tri_points = [
        -0.15, -0.10,
        -0.25, -0.30,
        -0.05, -0.30,

         0.15, -0.10,
         0.25, -0.30,
         0.05, -0.30,
    ];

    // color yellow
    gl.uniform4f(u_FragColor, 1.0, 1.0, 0.0, 1.0);

    buffer_points(gl, tri_points, a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, tri_points.length / 2);
}

function draw_bottom_left(gl, a_Position, u_Translation, u_FragColor) {

    const vertexCount = 360;
    const centerX = 0.0;
    const centerY = 0.0;
    const radius = 0.4;

    let circle_data = [];
    for (let i = 0; i <= vertexCount; i++) {
        let angle = i / vertexCount * 2 * Math.PI;
        circle_data.push(centerX + radius * Math.cos(angle));
        circle_data.push(centerY + radius * Math.sin(angle));
    }

    buffer_points(gl, circle_data, a_Position);

    gl.uniform4f(u_Translation, -0.5, -0.5, 0.0, 0.0);

    // Set color to black
    gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, circle_data.length / 2);
}

function draw_bottom_right(gl, a_Position, u_Translation, u_FragColor) {

    // color green
    gl.uniform4f(u_FragColor, 0.0, 1.0, 0.0, 1.0);

    gl.uniform4f(u_Translation, 0.5, -0.5, 0.0, 0.0);

    const points = [
        -0.40,  0.40,
         0.40,  0.40,
         0.40, -0.40,

        -0.40,  0.40,
        -0.40, -0.40,
         0.00,  0.00,
    ];

    buffer_points(gl, points, a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, points.length / 2);

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