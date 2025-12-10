/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 * @import * from './scene.js'
 * @import * from './shapes.js'
 */

let scene = null;

function main() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.log('Failed to retrieve the canvas element');
        return;
    }

    scene = new Scene(canvas);

    scene.ambient_light_color = [1, 1, 1];
    scene.ambient_light_intensity = 0.1;
    
    const sunLight = scene.addDirectionalLightSource([0, -1, 0], [1, 1.0, 0.9], 0.8);
    const moonLight = scene.addDirectionalLightSource([1, -0.5, 0.5], [0.7, 0.8, 1.0], 0.3);
    
    const mainLight = scene.addLightSource([3, 4, 3], [1, 1, 1], 1.0);
    const accentLight = scene.addLightSource([-2, 2, 5], [1, 0.5, 0.2], 0.6);
    const fillLight = scene.addLightSource([0, 6, -3], [0.2, 0.5, 1], 0.4);
    const rimLight = scene.addLightSource([5, 1, -2], [1, 0.2, 0.8], 0.5);

    // checkerboard texture
    const checkerboardTexture = createProceduralTexture(scene.gl, 256, 256, (ctx, width, height) => {
        const tileSize = 32;
        for (let x = 0; x < width; x += tileSize) {
            for (let y = 0; y < height; y += tileSize) {
                const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
                ctx.fillStyle = isEven ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    });

    // Create and add scene objects
    const planeVertices = createPlaneVertices(80, [0, 0.5, 0, 1.0]);
    const planeEntity = scene.spawnEntity(planeVertices);
    planeEntity.position = [0, -3, 0];

    const texturedPlaneVertices = createPlaneVertices(20, [1, 1, 1, 1.0]);
    const texturedPlaneModel = new Model(scene.gl, texturedPlaneVertices, checkerboardTexture);
    const texturedPlaneEntity = scene.spawnEntity(texturedPlaneModel);
    texturedPlaneEntity.position = [30, -1, 0];

    const sphereVertices = createSphereVertices(1, 10, 10, [0.2, 0.7, 0.2, 1.0]);
    for (let x = -40; x <= 40; x += 8) {
        for (let z = -40; z <= 40; z += 8) {
            const sphereEntity = scene.spawnEntity(sphereVertices, { smooth: true });
            sphereEntity.position = [x, -2, z];
        }
    }

    const penguinVertices = createPenguinVertices();
    const penguinEntity = scene.spawnEntity(penguinVertices, { smooth: true });
    penguinEntity.position = [0, 0, 0];

    scene.camera.position = [0, 0, 5];
    scene.drawScene();

    setupControls(scene, penguinEntity, mainLight, sunLight);
}

function setupControls(scene, penguinEntity, light_source, directional_light_source) {
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
