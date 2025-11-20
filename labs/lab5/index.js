/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 * @import * from './scene.js'
 * @import * from './shapes.js'
 */

const VSHADER = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_transformMatrix;
    varying vec4 v_Color;
    void main() {
        gl_Position = u_transformMatrix * u_ModelMatrix * a_Position;
        v_Color = a_Color;
    }
`

const FSHADER = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
        gl_FragColor = v_Color;
    }
`

let scene = null;

function main() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.log('Failed to retrieve the canvas element');
        return;
    }

    const gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    const a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return;
    }

    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    const u_transformMatrix = gl.getUniformLocation(gl.program, 'u_transformMatrix');
    if (!u_transformMatrix) {
        console.log('Failed to get the storage location of u_transformMatrix');
        return;
    }

    gl.enable(gl.DEPTH_TEST);

    scene = new Scene();

    // draw the plane on the ground
    const planeVertices = createPlaneVertices(80, [0, 0.5, 0, 1.0]);
    const planeModel = new Model(gl, planeVertices);
    const planeEntity = scene.spawnEntity(planeModel);
    planeEntity.position = [0, -1, 0];

    // add spheres in plane
    const sphereVertices = createSphereVertices(1, 10, 10, [0.2, 0.7, 0.2, 1.0]);
    const sphereModel = new Model(gl, sphereVertices);
    for (let x = -100; x <= 100; x += 8) {
        for (let z = -100; z <= 100; z += 8) {
            const sphereEntity = scene.spawnEntity(sphereModel);
            sphereEntity.position = [x, 1, z];
        }
    }

    const penguinVertices = createPenguinVertices();
    const penguinModel = new Model(gl, penguinVertices);

    const penguinEntity = scene.spawnEntity(penguinModel);
    penguinEntity.position = [0, 0, 0];

    scene.camera.position = [0, 0, 5];
    scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);

    changeCamera = function() {
        const nearInput = document.getElementById('near').value;
        const farInput = document.getElementById('far').value;
        const fovInput = document.getElementById('fov').value;

        const near = parseFloat(nearInput);
        const far = parseFloat(farInput);
        const fov = parseFloat(fovInput);

        scene.camera.near = near;
        scene.camera.far = far;
        scene.camera.fov = fov;
    
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };

    const penguin_x_slider = document.getElementById('penguin_x');
    const penguin_y_slider = document.getElementById('penguin_y');
    const penguin_z_slider = document.getElementById('penguin_z');

    penguin_x_slider.oninput = function() {
        penguinEntity.position[0] = parseFloat(this.value) / 10;
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };

    penguin_y_slider.oninput = function() {
        penguinEntity.position[1] = parseFloat(this.value) / 10;
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };

    penguin_z_slider.oninput = function() {
        penguinEntity.position[2] = parseFloat(this.value) / 10;
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };

    const camera_x_slider = document.getElementById('camera_x');
    const camera_y_slider = document.getElementById('camera_y');
    const camera_z_slider = document.getElementById('camera_z');

    camera_x_slider.oninput = function() {
        scene.camera.position[0] = parseFloat(this.value) / 10;
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };

    camera_y_slider.oninput = function() {
        scene.camera.position[1] = parseFloat(this.value) / 10;
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };

    camera_z_slider.oninput = function() {
        scene.camera.position[2] = parseFloat(this.value) / 10;
        scene.drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix);
    };
}

function createPenguinVertices() {
    const vertices = [];
    // coat
    vertices.push(...createSphereVertices(0.6, 10, 10, [0.74, 0, 0, 1], [0, 0, -0.3])); // outer coat

    // coat white edge thing
    vertices.push(...createTorusVertices(0.5, 0.10, 20, 20, [1, 1, 1, 1], [0, 0, 0], [0, 0, 1]));

    vertices.push(...createSphereVertices(0.5, 10, 10, [0, 0, 1, 1], [0, 0, 0])); // body
    vertices.push(...createSphereVertices(0.3, 10, 10, [0, 0, 1, 1], [0, 0.75, 0])); // head
    // toque
    vertices.push(...createSphereVertices(0.25, 20, 20, [1, 0, 0, 1], [0, 0.90, 0]));
    // toque pompom
    vertices.push(...createSphereVertices(0.1, 10, 10, [1, 1, 1, 1], [0, 1.15, -0.1]));
    // edge of toque
    vertices.push(...createTorusVertices(0.27, 0.05, 20, 20, [1, 1, 0.1, 1], [0, 0.9, 0]));
    // sphere thing on edge of toque
    vertices.push(...createSphereVertices(0.08, 10, 10, [1, 1, 0.1, 1], [0, 0.9, 0.4]));

    // eyes
    vertices.push(...createSphereVertices(0.1, 5, 10, [1, 1, 1, 1], [ 0.15, 0.8, 0.18]));
    vertices.push(...createSphereVertices(0.1, 5, 10, [1, 1, 1, 1], [-0.15, 0.8, 0.18]));

    // pupils
    vertices.push(...createSphereVertices(0.05, 5, 10, [0, 0, 0, 1], [ 0.15, 0.8, 0.25]));
    vertices.push(...createSphereVertices(0.05, 5, 10, [0, 0, 0, 1], [-0.15, 0.8, 0.25]));

    // beak
    // two triangles forming a flat beak
    vertices.push(...createTriangleVertices(
        [ 0, 0.75, 0.3001],
        [ 0.15, 0.7, 0.3001],
        [-0.15, 0.7, 0.3001],
        [1, 0.8, 0, 1]
    ));
    vertices.push(...createTriangleVertices(
        [ 0, 0.65, 0.3001],
        [ 0.15, 0.7, 0.3001],
        [-0.15, 0.7, 0.3001],
        [1, 0.8, 0, 1]
    ));

    // legs
    vertices.push(...createSphereVertices(0.2, 10, 10, [1, 0.65, 0, 1], [0.25, -0.5, 0.2]));
    vertices.push(...createSphereVertices(0.2, 10, 10, [1, 0.65, 0, 1], [-0.25, -0.5, 0.2]));

    // hands
    vertices.push(...createSphereVertices(0.2, 10, 10, [1, 0.65, 0, 1], [ 0.8, 0, 0.5]));
    vertices.push(...createSphereVertices(0.2, 10, 10, [1, 0.65, 0, 1], [-0.8, 0, 0.5]));

    // arms
    vertices.push(...createCylinderVertices(0.2, 0.6, 10, [0.74, 0, 0, 1], [ 0.5, 0.1, 0.3], [1, 0, 1]));
    vertices.push(...createCylinderVertices(0.2, 0.6, 10, [0.74, 0, 0, 1], [-0.5, 0.1, 0.3], [1, 0, -1]));

    // coat connect arms and hands
    vertices.push(...createTorusVertices(0.15, 0.09, 20, 20, [1, 1, 1, 1], [0.8, 0, 0.5], [0.6, 0, 1.4]));
    vertices.push(...createTorusVertices(0.15, 0.09, 20, 20, [1, 1, 1, 1], [-0.8, 0, 0.5], [0.6, 0, -1.4]));

    // hammer
    vertices.push(...createCylinderVertices(0.12, 0.8, 10, [0.55, 0.27, 0.07, 1], [-0.8, 0.2, 0.7])); // handle
    vertices.push(...createCylinderVertices(0.3, 0.6, 10, [0.55, 0.27, 0.07, 1], [-0.8, 0.6, 0.7], [0, 0, -1])); // head facing -z
    // red covers over hammer ends
    vertices.push(...createCircleVertices(0.3, 10, [0.74, 0, 0, 1], [-0.8, 0.6, 0.399], [0, 0, 0.5]));
    vertices.push(...createCircleVertices(0.3, 10, [0.74, 0, 0, 1], [-0.8, 0.6, 1.001], [0, 0, -0.5]));
    // stars
    vertices.push(...createStarVertices(0.3, [1, 1, 0, 1], [-0.8, 0.6, 0.398]));
    vertices.push(...createStarVertices(0.3, [1, 1, 0, 1], [-0.8, 0.6, 1.002]));

    // belt
    vertices.push(...createTriangleVertices(
        [-0.4, -0.1, 0.4],
        [-0.6, -0.3, 0.1],
        [-0.2, -0.3, 0.4],
        [1, 0, 0, 1]
    ));

    vertices.push(...createTriangleVertices(
        [-0.2, -0.3, 0.4],
        [-0.4, -0.1, 0.4],
        [0, -0.1, 0.5],
        [1, 1, 0, 1]
    ));

    vertices.push(...createTriangleVertices(
        [0, -0.1, 0.5],
        [0.2, -0.3, 0.4],
        [-0.2, -0.3, 0.4],
        [1, 0, 0, 1]
    ));

    vertices.push(...createTriangleVertices(
        [0.2, -0.3, 0.4],
        [0.4, -0.1, 0.4],
        [0, -0.1, 0.5],
        [1, 1, 0, 1]
    ));

    vertices.push(...createTriangleVertices(
        [0.4, -0.1, 0.4],
        [0.6, -0.3, 0.1],
        [0.2, -0.3, 0.4],
        [1, 0, 0, 1]
    ));

    return vertices;
}
