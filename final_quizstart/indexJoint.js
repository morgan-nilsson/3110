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
        .ambientLight(0.3, [1, 1, 1]);

    scene.pointLight()
        .position(3, 3, 3)
        .color(1, 1, 1)
        .intensity(0.8)
        .spawn();

    scene.camera()
        .position(6, 3, 6)
        .lookAt(0, 0, 0)
        .fov(45)
        .build();

    const basePart = await scene.cylinder(0.3, 2, 16)
        .position(0, 0, 0)
        .namedColor('red')
        .spawn();

    const movingPart = await scene.cube()
        .position(0, 1.5, 0) // Position above the base
        .scale(0.5, 2, 0.5)
        .namedColor('blue')
        .spawn();

    const thirdPart = await scene.cube()
        .position(0, 1.8, 0)
        .scale(0.3, 1.5, 0.3)
        .namedColor('yellow')
        .spawn();

    basePart.addChild(movingPart);
    
    movingPart.addChild(thirdPart);

    let time = 0;
    let baseRotation = 0;
    setInterval(() => {
        time += 0.05;
        baseRotation += 0.5;
        
        const jointAngle = Math.sin(time) * 90;
        
        basePart.rotation = [0, baseRotation, 0];
        
        movingPart.rotation = [0, 0, jointAngle];
        
        const thirdBoxAngle = jointAngle; // Same angle as blue box
        thirdPart.rotation = [0, 0, thirdBoxAngle];
        
        scene.renderFrame();
    }, 16);
}