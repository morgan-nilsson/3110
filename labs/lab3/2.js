const VSHADER = `
attribute vec4 a_Position;
attribute float a_GradientFactor;
uniform mat4 u_TransformMatrix;
varying float v_GradientFactor;
void main(void) {
    v_GradientFactor = a_GradientFactor;
    gl_Position = u_TransformMatrix * vec4(a_Position.xy, 0.0, 1.0);
    gl_PointSize = 5.0;
}
`;

const FSHADER = `
precision mediump float;
varying float v_GradientFactor;
void main(void) {
    vec4 startColor = vec4(1.0, 0.0, 0.0, 1.0);
    vec4 endColor = vec4(0.0, 0.0, 1.0, 1.0);
    vec4 color = mix(startColor, endColor, v_GradientFactor);
    gl_FragColor = vec4(color);
}
`
function draw_scene(gl, a_Position, a_GradientFactor, u_TransformMatrix, a, b, start_theta, end_theta, delta_theta, rotation_radians) {
    let gl_points = [];
    let theta = start_theta;
    while (theta <= end_theta) {
        let r = a + b * theta;
        let x = r * Math.cos(theta);
        let y = r * Math.sin(theta);
        gl_points.push(x, y);
        // push gradient factor
        gl_points.push((theta - start_theta) / (end_theta - start_theta));
        theta += delta_theta;
    }

    let verticies = buffer_points(gl, a_GradientFactor, gl_points, a_Position);

    let transformMatrix = new Matrix4();
    transformMatrix.setIdentity();
    transformMatrix.rotate(rotation_radians * 180 / Math.PI, 0, 1, 0);
    gl.uniformMatrix4fv(u_TransformMatrix, false, transformMatrix.elements)

    gl.drawArrays(gl.LINE_STRIP, 0, verticies);
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

    const a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("Could not get a_Position");
        return;
    }

    const a_GradientFactor = gl.getAttribLocation(gl.program, "a_GradientFactor");
    if (a_GradientFactor < 0) {
        console.log("Could not get a_GradientFactor");
        return;
    }

    const u_TransformMatrix = gl.getUniformLocation(gl.program, "u_TransformMatrix");
    if (!u_TransformMatrix) {
        console.log("Could not get u_TransformMatrix");
        return;
    }

    const a = 0.01;
    const b = 0.05;
    const start_theta = 0;
    let end_theta = 2 * 2 * Math.PI;
    const delta_theta = Math.PI / 32;
    let theta = Math.PI / 4;

    let rotating = false;
    let intervalId = null;

    document.addEventListener("keydown", (event) => {
        if (event.key == "+") {
            end_theta = end_theta + 2 * Math.PI;
        } else if (event.key == "-") {
            end_theta = end_theta - 2 * Math.PI;
            if (end_theta <= 0) end_theta = Math.PI;
        }
        gl.clear(gl.COLOR_BUFFER_BIT)
        draw_scene(gl, a_Position, a_GradientFactor, u_TransformMatrix, a, b, start_theta, end_theta, delta_theta, theta);
    })

    document.addEventListener("keydown", (event) => {

        if (event.key.toLowerCase() === "r") {
            rotating = !rotating;
    
            if (rotating) {
                intervalId = setInterval(() => {
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    draw_scene(gl, a_Position, a_GradientFactor, u_TransformMatrix, a, b, start_theta, end_theta, delta_theta, theta);
                    theta += delta_theta;
                    if (theta >= 2 * Math.PI) {
                        theta = 0;
                    } else if (theta <= 0) {
                        theta = Math.PI * 2;
                    }
                }, 50);
            } else {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
    })

    // initial render
    gl.clear(gl.COLOR_BUFFER_BIT)
    draw_scene(gl, a_Position, a_GradientFactor, u_TransformMatrix, a, b, start_theta, end_theta, delta_theta, theta);

}

function buffer_points(gl, a_GradientFactor, gl_points, a_Position) {
    let vertexBuf = gl.createBuffer();
    if (!vertexBuf) {
        throw new Error("Failed creating vertexBuffer");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gl_points), gl.STATIC_DRAW);

    // first 8 bytes are position
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(a_Position);

    // last 4 bytes are gradient factor
    gl.vertexAttribPointer(a_GradientFactor, 1, gl.FLOAT, false, 12, 8);
    gl.enableVertexAttribArray(a_GradientFactor);

    return gl_points.length / 3;
}