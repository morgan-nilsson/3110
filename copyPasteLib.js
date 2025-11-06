/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 */

const VSHADER = `
attribute vec4 a_Position;
uniform vec4 u_Translation;
uniform mat4 u_TransformMatrix;
attribute vec2 a_TexCoord;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
void main(void) {
    gl_Position = u_TransformationMatrix * a_Position;
    v_TexCoord = a_TexCoord;
    gl_PointSize = 10.0;
}
`;

const FSHADER = `
precision mediump float;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
void main(void) {
    gl_FragColor = ;
}
`;

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

    let u_Translation = gl.getUniformLocation(gl.program, "u_Translation");
    if (u_Translation < 0) {
        console.log("Could not get u_Translation");
        return;
    }

    const u_TransformationMatrix = gl.getUniformLocation(gl.program, "u_TransformationMatrix");
    if (u_TransformationMatrix == null) {
        console.log("Could not get u_TransformationMatrix");
        return;
    }

    const u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
    if (u_FragColor == null) {
        console.log("Cannot get u_Frag color");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);

gl.POINTS
// EXAMPLE: draw a bunch of points
// each vertex is drawn as a single point

gl.LINES
// EXAMPLE: draw some lines unconnected
// uses 2 vertices to make a line
// every pair of vertices forms an independent line

gl.LINE_STRIP 
// EXAMPLE: draw a bunch of lines connected
// uses 2 vertices initially to draw a line
// each next vertex connects to the previous one

gl.LINE_LOOP 
// EXAMPLE: circumference - anything connecting back to itself
// uses 2 vertices initially, each next vertex connects to the previous
// and the final vertex connects back to the first

gl.TRIANGLES
// EXAMPLE: draw a series of separate triangles
// uses 3 vertices per triangle
// every group of 3 vertices forms an independent triangle

gl.TRIANGLE_STRIP
// EXAMPLE: draw connected triangles sharing edges
// uses 3 vertices to draw the first triangle
// each additional vertex forms a new triangle with the previous two

gl.TRIANGLE_FAN
// EXAMPLE: draw triangles sharing a common central vertex (like a pie slice)
// uses the first vertex as the center
// each additional vertex forms a triangle with the center and previous vertex


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

        callback(callbackArgs)
    };

    return true;
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

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);