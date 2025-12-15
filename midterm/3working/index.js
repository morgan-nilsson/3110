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
    gl_Position =  u_TransformMatrix * (a_Position + u_Translation);
    gl_PointSize = 10.0;
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
`;

const textureSources = [
    "redflower.jpg",
    "pinkflower.jpg",
    "sky_roof.jpg",
    "sky.jpg",
];
const textures = [];

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

    let u_Translation = gl.getUniformLocation(gl.program, "u_Translation");
    if (u_Translation < 0) {
        console.log("Could not get u_Translation");
        return;
    }

    const u_Sampler = gl.getUniformLocation(gl.program, "u_Sampler");
    if (u_Sampler == null) {
        console.log("Failed to get u_Sampler");
        return;
    }

    const u_TransformMatrix = gl.getUniformLocation(gl.program, "u_TransformMatrix");
    if (u_TransformMatrix == null) {
        console.log("Could not get u_TransformMatrix");
        return;
    }



    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const points = [
        // texture coords used to show the clamping effects
        -0.9, 0.9, 0, 2,// top left
        -0.6, 0.9, 2, 2,// top right
        -0.6, 0.6, 2, 0,// bottom right
        -0.9, 0.6, 0, 0,// bottom left
    ];

    for (let i = 0; i < textureSources.length; i++) {

        const texture = gl.createTexture();
        textures.push(texture);

        const image = new Image();
        image.src = textureSources[i];
        
        image.onload = function() {

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

            gl.activeTexture(gl.TEXTURE0 + i);

            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

            render(gl, u_Translation, a_Position, u_Sampler, points, u_TransformMatrix, 0)
        };
    }

    let time = 0;

    let intervalID = setInterval(() => {
        render(gl, u_Translation, a_Position, u_Sampler, points, u_TransformMatrix, time)
        time += 1;
    }, 50)
}
/**
 * 
 * @param {WebGLContext} gl 
 * @returns 
 */
function render(gl, u_Translation, a_Position, u_Sampler, coords, u_TransformMatrix, time) {

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < 16; i++) {

        const column = i % 4;
        const row = Math.floor(i / 4);

        gl.uniform4f(u_Translation, 0.45 * column, -0.45 * row, 0.0, 0.0)

        const n = initVertexBuffers(gl, a_Position, coords.length / 4)
        if (n == -1) {
            console.log("Error initVertex")
            return;
        }

        const mat4 = new Matrix4();
        mat4.setIdentity()

        // messy but works
        const theta = 2 * time;
        const translation_dist = 0.8 * Math.sin(time / 10) / 2
        if (row == 0) {
            mat4.rotate(theta, 0, 1, 0)
        } else if (row == 1) {
            gl.uniform4f(u_Translation, 0.45 * column, translation_dist -0.45, 0.0, 0.0)
        } else if (row == 2) {
            gl.uniform4f(u_Translation, 0.45 * column, -translation_dist - 0.90, 0.0, 0.0)
        } else if (row == 3) {
            mat4.rotate(theta, 1, 0, 0)
        }


        gl.uniformMatrix4fv(u_TransformMatrix, false, mat4.elements)

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);

        gl.activeTexture(gl.TEXTURE0 + row);
        gl.bindTexture(gl.TEXTURE_2D, textures[row]);
        gl.uniform1i(u_Sampler, row);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
    }
}

/**
 * This is for buffers that are structured gl_x, gl_y, tx_x, tx_y
 * @param {WebGLContext} gl 
 * @param {number} a_Position 
 */
function initVertexBuffers(gl, a_Position) {
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
}