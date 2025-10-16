const VSHADER = `
attribute vec4 a_Position;
void main(void) {
    gl_Position = a_Position;
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

const SQUARE_R = 0.0;
const SQUARE_G = 1.0;
const SQUARE_B = 1.0;

const DIAMOND_R = 1.0;
const DIAMOND_G = 0.0;
const DIAMOND_B = 1.0;

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

/**
 * 
 * @param {number[]} x_y 
 * @param {number} theta_radians 
 * @returns {number[]}
 */
function rotate_z_2d(x_y, theta_radians) {
    const x = x_y[0];
    const y = x_y[1];

    const x_prime = x * Math.cos(theta_radians) - y * Math.sin(theta_radians);
    const y_prime = x * Math.sin(theta_radians) + y * Math.cos(theta_radians);

    return [x_prime, y_prime];
}

/**
 * 
 * @param {number[]} gl_points 
 * @param {[number[]]} points 
 * @param {number} theta_radians 
 * @param {Function} rotation_function 
 * @returns {number[]}
 */
function translate_points_with_rotation(points, points_per_vertex, theta_radians, rotation_function) {
    const arr = []
    for (let point_index = 0; point_index < points.length; point_index += points_per_vertex) {
        const points_prime = rotation_function(points.slice(point_index, point_index + points_per_vertex), theta_radians)
        arr.push(...points_prime)
    }
    return arr
}

function draw_scene(gl, canvas_width, canvas_height, a_Position, u_FragColor, level_of_nesting, theta_of_rotation) {

    let gl_points = [];

    let width_of_last_draw_square = 2.0 / 1.5;

    for (let i = 0; i < level_of_nesting; i++) {

        const half_width = width_of_last_draw_square / 2;
        // draw outside square
        gl_points.push(half_width, half_width);
        gl_points.push(half_width, -half_width);
        gl_points.push(-half_width, -half_width);
        gl_points.push(-half_width, half_width);
        

        // draw inside diamond
        gl_points.push(half_width, 0);
        gl_points.push(0, -half_width);
        gl_points.push(-half_width, 0);
        gl_points.push(0, half_width);


        width_of_last_draw_square = half_width;
    }

    gl_points = translate_points_with_rotation(gl_points, 2, theta_of_rotation, rotate_z_2d);

    // draw the shapes to canvas
    buffer_points(gl, gl_points, a_Position);

    // per 8 pointes that need to be drawn take up 16 numbers
    for (let i = 0; i * 16 < gl_points.length; i++) {

        // draw square
        gl.uniform4f(u_FragColor, 1.0, 1.0, 0.0, 1.0);
        gl.drawArrays(gl.LINE_LOOP, i * 8, 4)

        // draw diamond
        gl.uniform4f(u_FragColor, 0.0, 1.0, 1.0, 1.0);
        gl.drawArrays(gl.LINE_LOOP, i * 8 + 4, 4);
    }

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
    if (u_FragColor < 0) {
        console.log("Could not get u_FragColor");
        return;
    }

    let delta_theta = Math.PI / 128
    let theta = 0;
    let rotating = false;
    let intervalId = null;
    let level_of_detail = 3;
    const rendering_interval = 20;

    document.addEventListener("keydown", (event) => {
        if (event.key == "+") {
            level_of_detail += 1;
        } else if (event.key == "-") {
            level_of_detail -= 1;
            if (level_of_detail <= 0) level_of_detail = 1;
        } else if (event.key == ">") {
            delta_theta -= Math.PI / 128;
        } else if (event.key == "<") {
            delta_theta += Math.PI / 128;
        } else return;
        gl.clear(gl.COLOR_BUFFER_BIT)
        draw_scene(gl, canvas.width, canvas.height, a_Position, u_FragColor, level_of_detail, theta);
    })

    document.addEventListener("keydown", (event) => {

        if (event.key.toLowerCase() === "r") {
            rotating = !rotating;
    
            if (rotating) {
                intervalId = setInterval(() => {
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    draw_scene(gl, canvas.width, canvas.height, a_Position, u_FragColor, level_of_detail, theta);
                    theta += delta_theta;
                    if (theta >= Math.PI) {
                        theta = 0;
                    } else if (theta <= 0) {
                        theta = Math.PI;
                    }
                }, rendering_interval);
            } else {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
    })

    // initial render
    gl.clear(gl.COLOR_BUFFER_BIT)
    draw_scene(gl, canvas.width, canvas.height, a_Position, u_FragColor, level_of_detail, 0);

}

