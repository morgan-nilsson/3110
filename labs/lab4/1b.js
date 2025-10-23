const VSHADER = `
attribute vec4 a_Position;
uniform mat4 u_TransformMatrix;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;
void main(void) {
    gl_Position = u_TransformMatrix * a_Position;
    v_TexCoord = a_TexCoord;
}
`;

const FSHADER = `
precision mediump float;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
void main(void) {
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
}
`
const texture_filtering_cache = [];

function initVertexBuffers(gl, a_Position, coords, n) {
    const vertexTexCoordBuffer = gl.createBuffer();
    if (!vertexTexCoordBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);

    const FSIZE = Float32Array.BYTES_PER_ELEMENT;

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
    gl.enableVertexAttribArray(a_Position);

    const a_TexCoord = gl.getAttribLocation(gl.program, "a_TexCoord");
    if (a_TexCoord < 0) {
        console.log("Failed to get the storage location of a_TexCoord");
        return -1;
    }

    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    gl.enableVertexAttribArray(a_TexCoord);

    return n;
}

function initTextures(gl, initial_points, depth, a_Position, u_TransformMatrix, rotation_radians) {
    const texture = gl.createTexture();
    if (!texture) {
        console.log("Failed to create the texture object");
        return false;
    }

    const u_Sampler = gl.getUniformLocation(gl.program, "u_Sampler");
    if (!u_Sampler) {
        console.log("Failed to get the storage location of u_Sampler");
        return false;
    }

    const image = new Image();
    image.src = "../resources/sky.jpg";

    image.onload = function() {
        loadTexture(gl, texture, u_Sampler, image);

        drawSTriangle(initial_points, depth, gl, a_Position, u_TransformMatrix, rotation_radians);
    };

    return true;
}

function loadTexture(gl, texture, u_Sampler, image) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.uniform1i(u_Sampler, 0);
}

function drawSTriangle(my_points, level, gl, a_Position, u_TransformMatrix, rotation_radians) {

    if (level == 0) {
        const transformMatrix = new Matrix4();
        transformMatrix.setIdentity();
        transformMatrix.rotate(rotation_radians * 180 / Math.PI, 1, 0, 0);
        gl.uniformMatrix4fv(u_TransformMatrix, false, transformMatrix.elements);

        const coords = [
            my_points[0], my_points[1], 1.0, 2.0,
            my_points[2], my_points[3], 0.0, 0.0,
            my_points[4], my_points[5], 2.0, 0.0
        ];

        const n = initVertexBuffers(gl, a_Position, coords, 3);

        const [wrapS, wrapT] = texture_filtering_cache[0];
        texture_filtering_cache.shift();
        texture_filtering_cache.push([wrapS, wrapT]);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);


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

    drawSTriangle(
        top_child,
        level - 1,
        gl,
        a_Position,
        u_TransformMatrix,
        rotation_radians
    );

    drawSTriangle(
        left_child,
        level - 1,
        gl,
        a_Position,
        u_TransformMatrix,
        rotation_radians
    );

    drawSTriangle(
        right_child,
        level - 1,
        gl,
        a_Position,
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

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("Could not get a_Position");
        return;
    }

    let u_TransformMatrix = gl.getUniformLocation(gl.program, "u_TransformMatrix")
    if (!u_TransformMatrix) {
        console.log("Could not get u_TransformMatrix")
    }

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
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
        texture_filtering_cache.length = 0;
        for (let i = 0; i < Math.floor(Math.pow(3, depth)); i++) {
            const wrapModes = [gl.CLAMP_TO_EDGE, gl.MIRRORED_REPEAT, gl.REPEAT];
            const wrapS = wrapModes[Math.floor(Math.random() * wrapModes.length)];
            const wrapT = wrapModes[Math.floor(Math.random() * wrapModes.length)];
            texture_filtering_cache.push([wrapS, wrapT]);
        }
        gl.clear(gl.COLOR_BUFFER_BIT)
        drawSTriangle(initial_points, depth, gl, a_Position, u_TransformMatrix, rotation_radians)
    })

    let rotating = false;
    const rendering_interval = 50;
    const delta_theta = Math.PI / 32;

    if (!initTextures(gl, initial_points, depth, a_Position, u_TransformMatrix, rotation_radians)) {
        console.log("Could not initTextures");
        return;
    }

    texture_filtering_cache.length = 0;
    for (let i = 0; i < Math.floor(Math.pow(3, depth)); i++) {
        const wrapModes = [gl.CLAMP_TO_EDGE, gl.MIRRORED_REPEAT, gl.REPEAT];
        const wrapS = wrapModes[Math.floor(Math.random() * wrapModes.length)];
        const wrapT = wrapModes[Math.floor(Math.random() * wrapModes.length)];
        texture_filtering_cache.push([wrapS, wrapT]);
    }

    document.addEventListener("keydown", (event) => {

        if (event.key.toLowerCase() === "r") {
            rotating = !rotating;
    
            if (rotating) {
                intervalId = setInterval(() => {
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    drawSTriangle(initial_points, depth, gl, a_Position, u_TransformMatrix, rotation_radians);
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

    drawSTriangle(initial_points, depth, gl, a_Position, u_TransformMatrix, rotation_radians);
}