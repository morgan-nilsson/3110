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
`

let FSHADER2 = `
void main(void) {
    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
}
`;

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

    let u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
    if (!u_FragColor) {
        console.log("Could not get u_FragColor");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl2.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl2.clear(gl2.COLOR_BUFFER_BIT)

    document.onclick = function(ev) { 
        click(ev, a_Position, canvas, gl, u_FragColor) 
        click2(ev, a_Position, canvas2, gl2)
    }
}

const g_points = [];
function click(event, a_Position, canvas, gl, u_FragColor) {
    if (canvas != event.target) {
        return;
    }

    let x = event.clientX;
    let y = event.clientY;

    let bound = event.target.getBoundingClientRect();

    x = ((x - bound.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - bound.top)) / (canvas.height / 2);

    g_points.push(x);
    g_points.push(y);

    gl.clear(gl.COLOR_BUFFER_BIT);

    let len = g_points.length;
    gl.uniform4f(u_FragColor, Math.random(), Math.random(), Math.random(), 1.0)
    for (let i = 0; i < len; i += 2) {
        gl.vertexAttrib3f(a_Position, g_points[i], g_points[i + 1], 0.0);

        gl.drawArrays(gl.POINTS, 0, 1);
    }

}

const g_points2 = [];
function click2(event, a_Position, canvas, gl) {
    if (canvas != event.target) {
        return;
    }

    let x = event.clientX;
    let y = event.clientY;

    let bound = event.target.getBoundingClientRect();

    x = ((x - bound.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - bound.top)) / (canvas.height / 2);

    g_points2.push(x);
    g_points2.push(y);

    let vertexBuf = gl.createBuffer();
    if (!vertexBuf) {
        throw new Error("Failed creating vertexBuffer");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g_points2), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(a_Position);

    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.drawArrays(gl.LINES, 0, g_points2.length / 2);
    gl.drawArrays(gl.POINTS, 0, g_points2.length / 2);
}