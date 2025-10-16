const VSHADER = `
attribute vec4 a_Position;
uniform mat4 u_TransformMatrix;
void main(void) {
    gl_Position = u_TransformMatrix * a_Position;
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

function buffer_points(gl, gl_points, a_Position) {
    let vertexBuf = gl.createBuffer();
    if (!vertexBuf) {
        throw new Error("Failed creating vertexBuffer");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gl_points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    return gl_points.length / 2;
}

/**
 * 
 * @param {number[]} my_points in order top, left, right
 * @param {*} level 
 * @param {*} gl 
 * @param {*} a_Position 
 * @param {*} u_FragColor 
 * @param {*} u_TransformMatrix 
 * @param {*} rbg 
 * @returns 
 */
function drawSTriangle(my_points, level, gl, a_Position, u_FragColor, u_TransformMatrix, rotation_radians) {

    if (level == 0) {
        const n = buffer_points(gl, my_points, a_Position);

        // centroid of triangle
        const avg_x = my_points[0];
        const avg_y = (my_points[1] + my_points[3]) / 2;

        const r = (0.2 - avg_x * 2)
        const g = (0.2 + avg_x * 2) 
        const b = (0.9 + avg_y * 2)
        gl.uniform4f(u_FragColor, r, g, b, 1.0);

        const transformMatrix = new Matrix4();
        transformMatrix.setIdentity();
        transformMatrix.rotate(rotation_radians * 180 / Math.PI, 1, 0, 0);
        gl.uniformMatrix4fv(u_TransformMatrix, false, transformMatrix.elements);

        gl.drawArrays(gl.TRIANGLES, 0, n);
        return;
    }

    AC_x = (my_points[0] + my_points[4]) / 2;
    AC_y = (my_points[1] + my_points[5]) / 2;

    AB_x = (my_points[0] + my_points[2]) / 2;
    AB_y = (my_points[1] + my_points[3]) / 2;

    BC_x = (my_points[2] + my_points[4]) / 2;
    BC_y = (my_points[3] + my_points[5]) / 2;

    const top_child = [my_points[0], my_points[1], AB_x, AB_y, AC_x, AC_y];
    const left_child = [AB_x, AB_y, my_points[2], my_points[3], BC_x, BC_y];
    const right_child = [AC_x, AC_y, BC_x, BC_y, my_points[4], my_points[5]];

    const color_change = 0.4;

    drawSTriangle(
        top_child,
        level - 1,
        gl,
        a_Position,
        u_FragColor,
        u_TransformMatrix,
        rotation_radians
    );

    drawSTriangle(
        left_child,
        level - 1,
        gl,
        a_Position,
        u_FragColor,
        u_TransformMatrix,
        rotation_radians
    );

    drawSTriangle(
        right_child,
        level - 1,
        gl,
        a_Position,
        u_FragColor,
        u_TransformMatrix,
        rotation_radians
    )


}

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

    let u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
    if (!u_FragColor) {
        console.log("Could not get u_FragColor");
        return;
    }

    let u_TransformMatrix = gl.getUniformLocation(gl.program, "u_TransformMatrix")
    if (!u_TransformMatrix) {
        console.log("Could not get u_TransformMatrix")
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const initial_points = [0.0, 0.6, -0.6, -0.6, 0.6, -0.6];
    let depth = 2;
    let rotation_radians = 0;

    document.addEventListener("keydown", (event) => {
        if (event.key == "+") {
            depth += 1;
        } else if (event.key == "-") {
            depth -= 1;
            if (depth <= 0) depth = 0;
        } else return;
        gl.clear(gl.COLOR_BUFFER_BIT)
        drawSTriangle(initial_points, depth, gl, a_Position, u_FragColor, u_TransformMatrix, rotation_radians)
    })

    let rotating = false;
    const rendering_interval = 50;
    const delta_theta = Math.PI / 32;

    document.addEventListener("keydown", (event) => {

        if (event.key.toLowerCase() === "r") {
            rotating = !rotating;
    
            if (rotating) {
                intervalId = setInterval(() => {
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    drawSTriangle(initial_points, depth, gl, a_Position, u_FragColor, u_TransformMatrix, rotation_radians);
                    rotation_radians += delta_theta;
                    if (rotation_radians >= 2 * Math.PI) {
                        rotation_radians = 0;
                    } else if (rotation_radians <= 0) {
                        rotation_radians = 2 * Math.PI;
                    }
                }, rendering_interval);
            } else {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
    })

    drawSTriangle(initial_points, depth, gl, a_Position, u_FragColor, u_TransformMatrix, rotation_radians);
}