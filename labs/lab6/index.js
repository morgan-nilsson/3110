/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 * @import * from './scene.js'
 * @import * from './shapes.js'
 */

const VSHADER = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_TransformMatrix;

    attribute vec4 a_Color;
    varying vec4 v_Color;

    attribute vec3 a_Normal;
    uniform mat3 u_NormalMatrix;

    uniform vec3 u_AmbientColor;

    // Directional lights
    uniform vec3 u_DirectionalColor;
    uniform vec3 u_DirectionalDir;

    // Point lights
    uniform vec3 u_PointColor;
    uniform vec3 u_PointPos;

    void main() {

        vec4 worldPos = u_ModelMatrix * a_Position;
        gl_Position = u_TransformMatrix * worldPos;
        
        vec3 normal = normalize(u_NormalMatrix * a_Normal);

        // Ambient
        vec3 lighting = u_AmbientColor;

        // Directional
        vec3 L = normalize(-u_DirectionalDir);
        float diff = max(dot(normal, L), 0.0);
        lighting += u_DirectionalColor * diff;

        // Point
        vec3 Lp = normalize(u_PointPos - worldPos.xyz);
        float diffP = max(dot(normal, Lp), 0.0);
        lighting += u_PointColor * diffP;

        v_Color = vec4(a_Color.rgb * lighting, a_Color.a);
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

    const u_TransformMatrix = gl.getUniformLocation(gl.program, 'u_TransformMatrix');
    if (!u_TransformMatrix) {
        console.log('Failed to get the storage location of u_TransformMatrix');
        return;
    }

    gl.enable(gl.DEPTH_TEST);

    const u_AmbientColor = gl.getUniformLocation(gl.program, 'u_AmbientColor');
    if (!u_AmbientColor) {
        console.log('Failed to get the storage location of u_AmbientColor');
        return;
    }

    const u_DirectionalColor = gl.getUniformLocation(gl.program, 'u_DirectionalColor');
    if (!u_DirectionalColor) {
        console.log('Failed to get the storage location of u_DirectionalColor');
        return;
    }
    const u_DirectionalDir = gl.getUniformLocation(gl.program, 'u_DirectionalDir');
    if (!u_DirectionalDir) {
        console.log('Failed to get the storage location of u_DirectionalDir');
        return;
    }

    const u_PointColor = gl.getUniformLocation(gl.program, 'u_PointColor');
    if (!u_PointColor) {
        console.log('Failed to get the storage location of u_PointColor');
        return;
    }
    const u_PointPos = gl.getUniformLocation(gl.program, 'u_PointPos');
    if (!u_PointPos) {
        console.log('Failed to get the storage location of u_PointPos');
        return;
    }

    const a_normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_normal < 0) {
        console.log('Failed to get the storage location of a_Normal');
        return;
    }
    const u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    if (!u_NormalMatrix) {
        console.log('Failed to get the storage location of u_NormalMatrix');
        return;
    }

    scene = new Scene(
        gl,
        a_Position,
        a_Color,
        u_ModelMatrix,
        u_TransformMatrix,
        u_AmbientColor,
        u_DirectionalColor,
        u_DirectionalDir,
        u_PointColor,
        u_PointPos,
        a_normal,
        u_NormalMatrix,
    );

    scene.ambient_light_color = [1, 1, 1];
    scene.ambient_light_intensity = 0;
    const directional_light_source = scene.addDirectionalLightSource([0, -1, 0], [1, 1.0, 1.0], 0.8);
    const light_source = scene.addLightSource([3, 4, 3], [1, 1, 1], 1);

    // draw the plane on the ground
    const planeVertices = createPlaneVertices(80, [0, 0.5, 0, 1.0]);
    const planeModel = new Model(gl, planeVertices);
    const planeEntity = scene.spawnEntity(planeModel);
    planeEntity.position = [0, -3, 0];

    // add spheres in plane
    const sphereVertices = createSphereVertices(1, 10, 10, [0.2, 0.7, 0.2, 1.0]);
    const sphereModel = new Model(gl, sphereVertices);
    for (let x = -40; x <= 40; x += 8) {
        for (let z = -40; z <= 40; z += 8) {
            const sphereEntity = scene.spawnEntity(sphereModel);
            sphereEntity.position = [x, -2, z];
        }
    }

    const penguinVertices = createPenguinVertices();
    const penguinModel = new Model(gl, penguinVertices);

    const penguinEntity = scene.spawnEntity(penguinModel);
    penguinEntity.position = [0, 0, 0];

    scene.camera.position = [0, 0, 5];
    scene.drawScene();

    const near_slider = document.getElementById('near');
    const far_slider = document.getElementById('far');
    const fov_slider = document.getElementById('fov');
    
    near_slider.oninput = function() {
        scene.camera.near = parseFloat(this.value);
        scene.drawScene();
    };

    far_slider.oninput = function() {
        scene.camera.far = parseFloat(this.value);
        scene.drawScene();
    };

    fov_slider.oninput = function() {
        scene.camera.fov = parseFloat(this.value);
        scene.drawScene();
    };

    const penguin_x_slider = document.getElementById('penguin_x');
    const penguin_y_slider = document.getElementById('penguin_y');
    const penguin_z_slider = document.getElementById('penguin_z');

    penguin_x_slider.oninput = function() {
        penguinEntity.position[0] = parseFloat(this.value) / 10;
        scene.drawScene();
    };

    penguin_y_slider.oninput = function() {
        penguinEntity.position[1] = parseFloat(this.value) / 10;
        scene.drawScene();
    };

    penguin_z_slider.oninput = function() {
        penguinEntity.position[2] = parseFloat(this.value) / 10;
        scene.drawScene();
    };

    const camera_x_slider = document.getElementById('camera_x');
    const camera_y_slider = document.getElementById('camera_y');
    const camera_z_slider = document.getElementById('camera_z');

    camera_x_slider.oninput = function() {
        scene.camera.position[0] = parseFloat(this.value) / 10;
        scene.drawScene();
    };

    camera_y_slider.oninput = function() {
        scene.camera.position[1] = parseFloat(this.value) / 10;
        scene.drawScene();
    };

    camera_z_slider.oninput = function() {
        scene.camera.position[2] = parseFloat(this.value) / 10;
        scene.drawScene();
    };

    const light_x_slider = document.getElementById('light_x');
    const light_y_slider = document.getElementById('light_y');
    const light_z_slider = document.getElementById('light_z');
    const light_intensity_slider = document.getElementById('light_intensity');

    light_x_slider.oninput = function() {
        light_source.position[0] = parseFloat(this.value);
        scene.drawScene();
    };

    light_y_slider.oninput = function() {
        light_source.position[1] = parseFloat(this.value);
        scene.drawScene();
    };

    light_z_slider.oninput = function() {
        light_source.position[2] = parseFloat(this.value);
        scene.drawScene();
    };

    light_intensity_slider.oninput = function() {
        light_source.intensity = parseFloat(this.value);
        scene.drawScene();
    };

    const directional_light_x_slider = document.getElementById('dir_x');
    const directional_light_y_slider = document.getElementById('dir_y');
    const directional_light_z_slider = document.getElementById('dir_z');
    const directional_light_intensity_slider = document.getElementById('dir_intensity');

    directional_light_x_slider.oninput = function() {
        directional_light_source.direction[0] = parseFloat(this.value);
        scene.drawScene();
    };

    directional_light_y_slider.oninput = function() {
        directional_light_source.direction[1] = parseFloat(this.value);
        scene.drawScene();
    };

    directional_light_z_slider.oninput = function() {
        directional_light_source.direction[2] = parseFloat(this.value);
        scene.drawScene();
    };

    directional_light_intensity_slider.oninput = function() {
        directional_light_source.intensity = parseFloat(this.value);
        scene.drawScene();
    };

    const ambient_light_intensity_slider = document.getElementById('ambient_intensity');
    ambient_light_intensity_slider.oninput = function() {
        scene.ambient_light_intensity = parseFloat(this.value);
        scene.drawScene();
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
    vertices.push(...createSphereVertices(0.2, 10, 10, [1, 0.65, 0, 1], [ 0.8, 0.1, 0.5]));
    vertices.push(...createSphereVertices(0.2, 10, 10, [1, 0.65, 0, 1], [-0.8, 0.1, 0.5]));

    // arms
    vertices.push(...createCylinderVertices(0.2, 0.6, 10, [0.74, 0, 0, 1], [ 0.5, 0.1, 0.3], [1, 0, 1]));
    vertices.push(...createCylinderVertices(0.2, 0.6, 10, [0.74, 0, 0, 1], [-0.5, 0.1, 0.3], [1, 0, -1]));

    // coat connect arms and hands
    vertices.push(...createTorusVertices(0.15, 0.09, 20, 20, [1, 1, 1, 1], [0.8, 0.1, 0.5], [0.6, 0, 1.4]));
    vertices.push(...createTorusVertices(0.15, 0.09, 20, 20, [1, 1, 1, 1], [-0.8, 0.1, 0.5], [0.6, 0, -1.4]));

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
