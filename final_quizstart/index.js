/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 * @import * from './scene.js'
 * @import * from './shapes.js'
 */

async function main() {
    const canvas = document.getElementById('canvas');
    if (canvas == null) {
        console.log("Canvas is null")
        return;
    }

    const scene = SceneBuilder.create(canvas)
        .skyColor(0.1, 0.2, 0.4)
        .ambientLight(0.2, [1, 1, 1]);

    scene.pointLight()
        .position(2, 0, 2)
        .color(1, 1, 1)
        .intensity(0.8)
        .spawn();
    

    scene.camera()
        .position(5, 3, 8)
        .lookAt(0, 0, 0)
        .fov(45)
        .build();

    // Register textures with asset manager
    await scene.assets
        .texture('parasol', 'resources/parasol.jpg')
        .texture('particle', 'resources/particle.png')
        .texture('pinkflower', 'resources/pinkflower.jpg')
        .texture('redflower', 'resources/redflower.jpg')
        .texture('skyRoof', 'resources/sky_roof.jpg')
        .texture('skyCloud', 'resources/sky_cloud.jpg')
        .load();

    const multiTextureCube = await scene.multiTextureCube()
        .position(0, 0, 0)
        .textures({
            front: 'parasol',
            back: 'particle', 
            left: 'redflower',
            right: 'pinkflower',
            top: 'skyRoof',
            bottom: 'skyCloud'
        })
        .spawn();

    let rotation = 0;
    setInterval(() => {
        rotation += 1;
        multiTextureCube.rotation = [0, rotation, 0];

        scene.renderFrame();
    }, 16);
}