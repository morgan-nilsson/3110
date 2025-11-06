/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 */

const VSHADER = `
attribute vec4 a_Position;
uniform mat4 u_TransformMatrix;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;
void main(void) {
    gl_Position = u_TransformMatrix * a_Position;
    gl_PointSize = 10.0;
    v_TexCoord = a_TexCoord;
}
`;

const FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
uniform bool useTexture;
void main(void) {
    if (useTexture) {
        gl_FragColor = texture2D(u_Sampler, v_TexCoord);
    } else {
        gl_FragColor = u_FragColor;
    }
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

    const u_TransformationMatrix = gl.getUniformLocation(gl.program, "u_TransformMatrix");
    if (u_TransformationMatrix == null) {
        console.log("Could not get u_TransformationMatrix");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const circleVertices = makeCircleVertices(0, 0, 0.8, 20)
    console.log(circleVertices)
    // zip the vertices in with tex coords
    const mapping = [];
    mapping.push(0, 0, 0, 0)

    for (let i = 0; i < circleVertices.length; i += 2) {
        mapping.push(circleVertices[i], circleVertices[i + 1])
        mapping.push(circleVertices[i], circleVertices[i + 1])
    }

    let hour = 9;
    let minute = 59;
    let rotation = 0;
    const delta_rotation = Math.PI / 32;
    let hm = make_hm(hour, minute)

    initTextures(gl, "pinkflower.jpg", render, gl, a_Position, mapping, hm[1], hm[0], u_TransformationMatrix, 0);

    intervalID = setInterval(() => {
        minute += 1
        if (minute == 60) {
            minute = 0;
            hour = (hour + 1) % 12
        }
        hm = make_hm(hour, minute)
        rotation += delta_rotation;
        render(gl, a_Position, mapping, hm[1], hm[0], u_TransformationMatrix, rotation)
    }, 50)

}

function make_hm(hour, minute) {
    const hour_hand_length = 0.65;
    const minute_hand_length = 0.75;

    const hour_theta =
      -2 * Math.PI * ((hour % 12) + minute / 60) / 12 + Math.PI / 2;
    const minute_theta =
      -2 * Math.PI * (minute / 60) + Math.PI / 2;

    const hours_points = [0, 0];
    const minutes_points = [0, 0];

    hours_points.push(
      Math.cos(hour_theta) * hour_hand_length,
      Math.sin(hour_theta) * hour_hand_length
    );
    minutes_points.push(
      Math.cos(minute_theta) * minute_hand_length,
      Math.sin(minute_theta) * minute_hand_length
    );

    return [hours_points, minutes_points]

}

/**
 * 
 * @param {WebGLContext} gl 
 */
function render(gl, a_Position, points, minutes_points, hours_points, u_TransformationMatrix, rotation_theta) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (initVertexBuffers(gl, a_Position, points.length / 4) == -1) {
        console.log("Error init vertex buffer");
        return null;
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    const transformMatrix = new Matrix4();
    transformMatrix.setIdentity()
    transformMatrix.rotate(rotation_theta * 180 / Math.PI, 1, 0, 0)
    gl.uniformMatrix4fv(u_TransformationMatrix, false, transformMatrix.elements)

    const use_texture = gl.getUniformLocation(gl.program, "useTexture");
    if (use_texture == null) {
        console.log("Connot get use texture");
        return;
    }
    // set useTexture to true;
    gl.uniform1i(use_texture, 1);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length / 4);

    // set useTexture false;
    gl.uniform1i(use_texture, 0);

    const minutes_and_hours = [...minutes_points, ...hours_points]
    const n = buffer_points(gl, minutes_and_hours, a_Position);

    const u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor")
    if (u_FragColor == null) {
        console.log("cannot get u_FragColor");
        return;
    }

    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);
    gl.drawArrays(gl.LINES, 0, n)
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

/**
 * 
 * @param {WebGLContext} gl 
 * @param {String} image_src
 * @param {(...any) => void} callback 
 * @param  {...any} callbackArgs 
 * @returns 
 */
function initTextures(gl, image_src, callback, ...callbackArgs) {
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
    image.src = image_src

    // When the image loads draw
    image.onload = function() {
        loadTexture(gl, texture, u_Sampler, image);

        callback(...callbackArgs)
    };

    return true;
}

/**
 * This is for buffers that are structured gl_x, gl_y, tx_x, tx_y
 * @param {WebGLContext} gl 
 * @param {number} a_Position 
 * @param {number} n 
 * @returns {number} -1 on error or n
 */
function initVertexBuffers(gl, a_Position, n) {
    const vertexTexCoordBuffer = gl.createBuffer();
    if (!vertexTexCoordBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);

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

/**
 * 
 * @param {WebGLContext} gl 
 * @param {WebGLTexture} texture 
 * @param {WebGLUniformLocation} u_Sampler 
 * @param {HTMLImageElement} image 
 */
function loadTexture(gl, texture, u_Sampler, image) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.uniform1i(u_Sampler, 0);
}

/**
 * 
 * @param {number} centerX 
 * @param {number} centerY 
 * @param {number} radius 
 * @param {number} vertexCount 
 * @returns {number[]} Array of vertices in form [x1, y1, x2, y2]
 */
function makeCircleVertices(centerX, centerY, radius, vertexCount) {

    const circleData = [];

    for (let i = 0; i <= vertexCount; i++) {
        const angle = i * 2 * Math.PI / vertexCount;
        circleData.push(centerX + radius * Math.cos(angle));
        circleData.push(centerY + radius * Math.sin(angle));
    }
    return circleData;
}