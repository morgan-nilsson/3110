/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 * @import * from './scene.js'
 * @import * from './shapes.js'
 */

let scene = null;
let cameraController = null;

class CameraController {
    constructor(camera, canvas) {
        this.camera = camera;
        this.canvas = canvas;
        
        // Camera settings
        this.moveSpeed = 0.4;
        this.mouseSensitivity = 0.002;
        this.flyMode = false; // true for flying
        this.walkingHeight = 2.0; // Fixed Y position for walking mode
        
        // Camera rotation
        this.yaw = 0; // Left-right rotation (around Y-axis)
        this.pitch = 0; // Up-down rotation (around X-axis)
        
        this.keys = {};
        this.mouseDown = false;
        
        this.setupEventListeners();
        this.updateCameraTarget();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Toggle camera mode with 'F' key
            if (e.code === 'KeyF') {
                this.flyMode = !this.flyMode;
                if (!this.flyMode) {
                    this.camera.position[1] = this.walkingHeight;
                }
                console.log(this.flyMode ? 'Flying mode enabled' : 'Walking mode enabled');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.canvas.requestPointerLock();
        });
        
        document.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        // Mouse movement for looking around
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                const deltaX = e.movementX;
                const deltaY = e.movementY;
                
                this.yaw -= deltaX * this.mouseSensitivity;
                this.pitch -= deltaY * this.mouseSensitivity;
                
                // Clamp pitch to prevent over-rotation
                this.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.pitch));
                
                this.updateCameraTarget();
                scene.drawScene();
            }
        });
        
        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== this.canvas) {
                this.mouseDown = false;
            }
        });
        
        // Start movement update loop
        this.update();
    }
    
    update() {
        this.handleMovement();
        requestAnimationFrame(() => this.update());
    }
    
    handleMovement() {
        let movement = [0, 0, 0];
        let moved = false;
        
        // Get direction vectors
        let forward = this.getForwardVector();
        const right = this.getRightVector();
        
        // In walking mode, make forward movement horizontal only
        if (!this.flyMode) {
            // Normalize the horizontal component of forward vector
            const forwardLength = Math.sqrt(forward[0] * forward[0] + forward[2] * forward[2]);
            if (forwardLength > 0) {
                forward = [forward[0] / forwardLength, 0, forward[2] / forwardLength];
            }
        }
        
        // Handle forward/backward movement (W/S keys)
        if (this.keys['KeyW']) {
            movement[0] += forward[0];
            movement[1] += this.flyMode ? forward[1] : 0; // Only move Y in fly mode
            movement[2] += forward[2];
            moved = true;
        }
        if (this.keys['KeyS']) {
            movement[0] -= forward[0];
            movement[1] -= this.flyMode ? forward[1] : 0; // Only move Y in fly mode
            movement[2] -= forward[2];
            moved = true;
        }
        
        // Handle strafing (A/D keys)
        if (this.keys['KeyA']) {
            movement[0] -= right[0];
            movement[2] -= right[2];
            moved = true;
        }
        if (this.keys['KeyD']) {
            movement[0] += right[0];
            movement[2] += right[2];
            moved = true;
        }

        
        // Handle vertical movement in fly mode (Space/Shift)
        if (this.flyMode) {
            if (this.keys['Space']) {
                movement[1] += 1;
                moved = true;
            }
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
                movement[1] -= 1;
                moved = true;
            }
        }
        
        // Apply movement if any keys were pressed
        if (moved) {
            // Normalize movement vector to prevent faster diagonal movement
            const length = Math.sqrt(movement[0] * movement[0] + movement[1] * movement[1] + movement[2] * movement[2]);
            if (length > 0) {
                movement[0] = (movement[0] / length) * this.moveSpeed;
                movement[1] = (movement[1] / length) * this.moveSpeed;
                movement[2] = (movement[2] / length) * this.moveSpeed;
            }
            
            // Update camera position
            this.camera.position[0] += movement[0];
            this.camera.position[1] += movement[1];
            this.camera.position[2] += movement[2];

            const xMaxes = 35 / 2;
            const zMaxes = 20 / 2;

            // clamp inside of room
            if (this.camera.position[0] > xMaxes) this.camera.position[0] = xMaxes - 0.2
            if (this.camera.position[0] < -xMaxes) this.camera.position[0] = -xMaxes + 0.2
            if (this.camera.position[2] > zMaxes) this.camera.position[2] = zMaxes - 0.2
            if (this.camera.position[2] < -zMaxes) this.camera.position[2] = -zMaxes + 0.2
            
            if (!this.flyMode) {
                this.camera.position[1] = this.walkingHeight;
            }
            
            // Update camera target to follow the new position
            this.updateCameraTarget();

            console.log(`Camera position: (${this.camera.position[0].toFixed(2)}, ${this.camera.position[1].toFixed(2)}, ${this.camera.position[2].toFixed(2)})`);
            
            // Redraw the scene
            scene.drawScene();
        }
    }
    
    /**
     * Calculate the forward direction vector from yaw and pitch
     * This is where the camera is looking
     */
    getForwardVector() {
        return [
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        ];
    }
    
    /**
     * Calculate the right direction vector from yaw
     */
    getRightVector() {
        return [
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        ];
    }
    
    /**
     * Update the camera's target based on current position and rotation
     */
    updateCameraTarget() {
        const forward = this.getForwardVector();
        this.camera.target = [
            this.camera.position[0] + forward[0],
            this.camera.position[1] + forward[1],
            this.camera.position[2] + forward[2]
        ];
    }
}

async function main() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.log('Failed to retrieve the canvas element');
        return;
    }

    scene = new Scene(canvas);

    scene.camera.far = 40;
    
    cameraController = new CameraController(scene.camera, canvas);

    scene.ambient_light_color = [1, 1, 1];
    scene.ambient_light_intensity = 0.15;
    
    // Create office textures
    const floorTexture = createFloorTexture(scene.gl);
    const wallTexture = createWallTexture(scene.gl);
    const ceilingTexture = createCeilingTexture(scene.gl);
    const kitchenFloorTexture = createKitchenFloorTexture(scene.gl);
    const cabinetTexture = createCabinetTexture(scene.gl);
    
    const pictureTexture1 = await createTexture(scene.gl, 'textures/blueflower.jpg');
    const pictureTexture2 = await createTexture(scene.gl, 'textures/redflower.jpg');
    const pictureTexture3 = await createTexture(scene.gl, 'textures/yellowflower.jpg');
    const pictureTexture4 = await createTexture(scene.gl, 'textures/sky.jpg');

    const officeWidth = 35;
    const officeDepth = 20;
    const wallHeight = 3.5;

    const tileRepeat = 8; // Number of times to repeat texture across each dimension
    const floorVertices = [
        { position: [-1, 0, -1], color: [1, 1, 1, 1], uv: [0, 0] },
        { position: [1, 0, -1], color: [1, 1, 1, 1], uv: [tileRepeat, 0] },
        { position: [1, 0, 1], color: [1, 1, 1, 1], uv: [tileRepeat, tileRepeat] },

        { position: [-1, 0, -1], color: [1, 1, 1, 1], uv: [0, 0] },
        { position: [1, 0, 1], color: [1, 1, 1, 1], uv: [tileRepeat, tileRepeat] },
        { position: [-1, 0, 1], color: [1, 1, 1, 1], uv: [0, tileRepeat] },
    ];
    const floorModel = new Model(scene.gl, floorVertices, floorTexture);
    const floorEntity = scene.spawnEntity(floorModel);
    floorEntity.position = [0, 0, 0];
    floorEntity.scale = [officeWidth / 2, 1, officeDepth / 2];

    // Create ceiling
    const ceilingVertices = createPlaneVertices(1, [1, 1, 1, 1]);
    const ceilingModel = new Model(scene.gl, ceilingVertices, ceilingTexture);
    const ceilingEntity = scene.spawnEntity(ceilingModel);
    ceilingEntity.position = [0, wallHeight, 0];
    ceilingEntity.scale = [officeWidth / 2, 1, officeDepth / 2];
    ceilingEntity.rotation = [180, 0, 0];

    // Create walls using box vertices for proper texturing
    const wallThickness = 0.1;

    const frontWallVertices = createBoxVertices(officeWidth, wallHeight, wallThickness, [1, 1, 1, 1]);
    const frontWallModel = new Model(scene.gl, frontWallVertices, wallTexture);
    const frontWallEntity = scene.spawnEntity(frontWallModel);
    frontWallEntity.position = [0, wallHeight / 2, officeDepth / 2];

    const backWallVertices = createBoxVertices(officeWidth, wallHeight, wallThickness, [1, 1, 1, 1]);
    const backWallModel = new Model(scene.gl, backWallVertices, wallTexture);
    const backWallEntity = scene.spawnEntity(backWallModel);
    backWallEntity.position = [0, wallHeight / 2, -officeDepth / 2];

    const leftWallVertices = createBoxVertices(wallThickness, wallHeight, officeDepth, [1, 1, 1, 1]);
    const leftWallModel = new Model(scene.gl, leftWallVertices, wallTexture);
    const leftWallEntity = scene.spawnEntity(leftWallModel);
    leftWallEntity.position = [-officeWidth / 2, wallHeight / 2, 0];

    const rightWallVertices = createBoxVertices(wallThickness, wallHeight, officeDepth, [1, 1, 1, 1]);
    const rightWallModel = new Model(scene.gl, rightWallVertices, wallTexture);
    const rightWallEntity = scene.spawnEntity(rightWallModel);
    rightWallEntity.position = [officeWidth / 2, wallHeight / 2, 0];

    const pictureWidth = 2.5;
    const pictureHeight = 1.8;
    const pictureYPosition = wallHeight / 2;

    const picture1Vertices = createPictureVertices(pictureWidth, pictureHeight, 0.1, [0, 0, 0]);
    const picture1Model = new Model(scene.gl, picture1Vertices, pictureTexture1);
    const picture1Entity = scene.spawnEntity(picture1Model);
    picture1Entity.position = [-6, pictureYPosition, -officeDepth / 2 + 0.05];

    const picture2Vertices = createPictureVertices(pictureWidth, pictureHeight, 0.1, [0, 0, 0]);
    const picture2Model = new Model(scene.gl, picture2Vertices, pictureTexture2);
    const picture2Entity = scene.spawnEntity(picture2Model);
    picture2Entity.position = [6, pictureYPosition, -officeDepth / 2 + 0.05];

    const picture3Vertices = createPictureVertices(pictureWidth, pictureHeight, 0.1, [0, 0, 0]);
    const picture3Model = new Model(scene.gl, picture3Vertices, pictureTexture3);
    const picture3Entity = scene.spawnEntity(picture3Model);
    picture3Entity.position = [-officeWidth / 2 + 0.05, pictureYPosition, -1];
    picture3Entity.rotation = [0, 90, 0];

    const picture4Vertices = createPictureVertices(pictureWidth, pictureHeight, 0.1, [0, 0, 0]);
    const picture4Model = new Model(scene.gl, picture4Vertices, pictureTexture4);
    const picture4Entity = scene.spawnEntity(picture4Model);
    picture4Entity.position = [-officeWidth / 2 + 0.05, pictureYPosition, 6];
    picture4Entity.rotation = [0, 90, 0];

    const picture5Entity = scene.spawnEntity(picture1Model);
    picture5Entity.position = [-officeWidth / 2 + 0.05, pictureYPosition, -8];
    picture5Entity.rotation = [0, 90, 0];

    const interiorWallHeight = wallHeight;
    const interiorWallThickness = 0.08;

    // Create the main wall that separates the open area from the meeting rooms
    const meetingRoomsSectionWidth = 8;
    const meetingRoomsSectionDepth = 20;
    const meetingRoomsX = -officeWidth/2 + meetingRoomsSectionWidth/2;
    const meetingRoomsZ = -officeDepth/2 + meetingRoomsSectionDepth/2;
    
    // Split into segments to create door openings
    const dividingWallLength = meetingRoomsSectionDepth;
    const meetingDoorWidth = 1.0; // Width of each door opening
    const wallSegmentLength = (dividingWallLength - (3 * meetingDoorWidth)) / 4;
    
    // Create wall segments with door openings
    const wall1SegmentVertices = createBoxVertices(interiorWallThickness, interiorWallHeight, wallSegmentLength, [1, 1, 1, 1]);
    const wall1SegmentModel = new Model(scene.gl, wall1SegmentVertices, wallTexture);
    const wall1SegmentEntity = scene.spawnEntity(wall1SegmentModel);
    wall1SegmentEntity.position = [
        meetingRoomsX + meetingRoomsSectionWidth/2, 
        interiorWallHeight / 2, 
        meetingRoomsZ - dividingWallLength/2 + wallSegmentLength/2
    ];

    // Wall segment 2 between first and second door
    const wall2SegmentVertices = createBoxVertices(interiorWallThickness, interiorWallHeight, wallSegmentLength, [1, 1, 1, 1]);
    const wall2SegmentModel = new Model(scene.gl, wall2SegmentVertices, wallTexture);
    const wall2SegmentEntity = scene.spawnEntity(wall2SegmentModel);
    wall2SegmentEntity.position = [
        meetingRoomsX + meetingRoomsSectionWidth/2, 
        interiorWallHeight / 2, 
        meetingRoomsZ - dividingWallLength/2 + wallSegmentLength + meetingDoorWidth + wallSegmentLength/2
    ];

    // Wall segment 3 between second and third door
    const wall3SegmentVertices = createBoxVertices(interiorWallThickness, interiorWallHeight, wallSegmentLength, [1, 1, 1, 1]);
    const wall3SegmentModel = new Model(scene.gl, wall3SegmentVertices, wallTexture);
    const wall3SegmentEntity = scene.spawnEntity(wall3SegmentModel);
    wall3SegmentEntity.position = [
        meetingRoomsX + meetingRoomsSectionWidth/2, 
        interiorWallHeight / 2, 
        meetingRoomsZ - dividingWallLength/2 + 2*wallSegmentLength + 2*meetingDoorWidth + wallSegmentLength/2
    ];

    // Wall segment 4 after third door
    const wall4SegmentVertices = createBoxVertices(interiorWallThickness, interiorWallHeight, wallSegmentLength, [1, 1, 1, 1]);
    const wall4SegmentModel = new Model(scene.gl, wall4SegmentVertices, wallTexture);
    const wall4SegmentEntity = scene.spawnEntity(wall4SegmentModel);
    wall4SegmentEntity.position = [
        meetingRoomsX + meetingRoomsSectionWidth/2, 
        interiorWallHeight / 2, 
        meetingRoomsZ - dividingWallLength/2 + 3*wallSegmentLength + 3*meetingDoorWidth + wallSegmentLength/2
    ];

    // Add door frames
    const meetingDoorHeight = 2.5;
    const doorFrameThickness = 0.05;
    const doorFrameWidth = 0.1;
    
    for (let i = 0; i < 3; i++) {
        const doorZ = meetingRoomsZ - dividingWallLength/2 + wallSegmentLength + meetingDoorWidth/2 + i * (wallSegmentLength + meetingDoorWidth);
        const doorX = meetingRoomsX + meetingRoomsSectionWidth/2;
        
        // Door frame - left side
        const leftFrameVertices = createBoxVertices(doorFrameWidth, meetingDoorHeight, doorFrameThickness, [0.6, 0.4, 0.2, 1]);
        const leftFrameModel = new Model(scene.gl, leftFrameVertices);
        const leftFrameEntity = scene.spawnEntity(leftFrameModel);
        leftFrameEntity.position = [doorX, meetingDoorHeight/2, doorZ - meetingDoorWidth/2];

        // Door frame - right side
        const rightFrameVertices = createBoxVertices(doorFrameWidth, meetingDoorHeight, doorFrameThickness, [0.6, 0.4, 0.2, 1]);
        const rightFrameModel = new Model(scene.gl, rightFrameVertices);
        const rightFrameEntity = scene.spawnEntity(rightFrameModel);
        rightFrameEntity.position = [doorX, meetingDoorHeight/2, doorZ + meetingDoorWidth/2];

        // Door frame - top
        const topFrameVertices = createBoxVertices(doorFrameWidth, doorFrameThickness, meetingDoorWidth, [0.6, 0.4, 0.2, 1]);
        const topFrameModel = new Model(scene.gl, topFrameVertices);
        const topFrameEntity = scene.spawnEntity(topFrameModel);
        topFrameEntity.position = [doorX, meetingDoorHeight, doorZ];

        // Wall above door (fills gap between door top and ceiling)
        const wallAboveDoorHeight = interiorWallHeight - meetingDoorHeight;
        const wallAboveDoorVertices = createBoxVertices(interiorWallThickness, wallAboveDoorHeight, meetingDoorWidth, [1, 1, 1, 1]);
        const wallAboveDoorModel = new Model(scene.gl, wallAboveDoorVertices, wallTexture);
        const wallAboveDoorEntity = scene.spawnEntity(wallAboveDoorModel);
        wallAboveDoorEntity.position = [doorX, meetingDoorHeight + wallAboveDoorHeight/2, doorZ];
    }

    // Individual meeting room dimensions
    const roomWidth = meetingRoomsSectionWidth;
    const roomDepth = meetingRoomsSectionDepth / 3;
    
    // Wall between room 1 and room 2
    const wall1Z = meetingRoomsZ - meetingRoomsSectionDepth/2 + roomDepth;
    const wall1Vertices = createBoxVertices(roomWidth, interiorWallHeight, interiorWallThickness, [1, 1, 1, 1]);
    const wall1Model = new Model(scene.gl, wall1Vertices, wallTexture);
    const wall1Entity = scene.spawnEntity(wall1Model);
    wall1Entity.position = [meetingRoomsX, interiorWallHeight / 2, wall1Z];

    // Wall between room 2 and room 3
    const wall2Z = meetingRoomsZ - meetingRoomsSectionDepth/2 + (2 * roomDepth);
    const wall2Vertices = createBoxVertices(roomWidth, interiorWallHeight, interiorWallThickness, [1, 1, 1, 1]);
    const wall2Model = new Model(scene.gl, wall2Vertices, wallTexture);
    const wall2Entity = scene.spawnEntity(wall2Model);
    wall2Entity.position = [meetingRoomsX, interiorWallHeight / 2, wall2Z];

    // MEETING ROOM 1 (Front room)
    const room1X = meetingRoomsX;
    const room1Z = meetingRoomsZ - meetingRoomsSectionDepth/2 + roomDepth/2;
    
    // Meeting table for room 1
    const meetingTableWidth = 1.0;
    const meetingTableDepth = 2.5;
    const meetingTableHeight = 0.75;
    const meetingTableTopThickness = 0.05;
    
    // Room 1 table
    const room1TableTopVertices = createBoxVertices(meetingTableWidth, meetingTableTopThickness, meetingTableDepth, [0.6, 0.4, 0.2, 1]);
    const room1TableTopModel = new Model(scene.gl, room1TableTopVertices);
    const room1TableTopEntity = scene.spawnEntity(room1TableTopModel);
    room1TableTopEntity.position = [room1X, meetingTableHeight - meetingTableTopThickness/2, room1Z];

    // Table legs for room 1
    const tableMainLegWidth = 0.08;
    const tableMainLegHeight = meetingTableHeight - meetingTableTopThickness;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legX = room1X - meetingTableWidth/2 + 0.2 + (i * (meetingTableWidth - 0.4));
            const legZ = room1Z - meetingTableDepth/2 + 0.2 + (j * (meetingTableDepth - 0.4));
            
            const legVertices = createBoxVertices(tableMainLegWidth, tableMainLegHeight, tableMainLegWidth, [0.5, 0.3, 0.15, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, tableMainLegHeight/2, legZ];
        }
    }

    // Chairs for room 1
    const chairOffset = 1.8; // Distance from table center to chair
    
    //// Chair 1 (front of table)
    //const room1Chair1Vertices = createOfficeChairVertices(
    //    [0.2, 0.2, 0.2, 1.0],
    //    [0.1, 0.3, 0.1, 1.0],
    //    [0, 0, 0],
    //    0
    //);
    //const room1Chair1Model = new Model(scene.gl, room1Chair1Vertices);
    //const room1Chair1Entity = scene.spawnEntity(room1Chair1Model);
    //room1Chair1Entity.position = [room1X, 0, room1Z - chairOffset];

    //// Chair 2 (back of table)
    //const room1Chair2Vertices = createOfficeChairVertices(
    //    [0.2, 0.2, 0.2, 1.0],
    //    [0.1, 0.3, 0.1, 1.0],
    //    [0, 0, 0],
    //    180
    //);
    //const room1Chair2Model = new Model(scene.gl, room1Chair2Vertices);
    //const room1Chair2Entity = scene.spawnEntity(room1Chair2Model);
    //room1Chair2Entity.position = [room1X, 0, room1Z + chairOffset];

    // MEETING ROOM 2 (Middle room)
    const room2X = meetingRoomsX;
    const room2Z = meetingRoomsZ;
    
    // Room 2 table
    const room2TableTopVertices = createBoxVertices(meetingTableWidth, meetingTableTopThickness, meetingTableDepth, [0.6, 0.4, 0.2, 1]);
    const room2TableTopModel = new Model(scene.gl, room2TableTopVertices);
    const room2TableTopEntity = scene.spawnEntity(room2TableTopModel);
    room2TableTopEntity.position = [room2X, meetingTableHeight - meetingTableTopThickness/2, room2Z];

    // Table legs for room 2
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legX = room2X - meetingTableWidth/2 + 0.2 + (i * (meetingTableWidth - 0.4));
            const legZ = room2Z - meetingTableDepth/2 + 0.2 + (j * (meetingTableDepth - 0.4));
            
            const legVertices = createBoxVertices(tableMainLegWidth, tableMainLegHeight, tableMainLegWidth, [0.5, 0.3, 0.15, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, tableMainLegHeight/2, legZ];
        }
    }

    // Chairs for room 2
    const room2Chair1Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.3, 0.1, 0.1, 1.0],
        [0, 0, 0],
        0
    );
    const room2Chair1Model = new Model(scene.gl, room2Chair1Vertices);
    const room2Chair1Entity = scene.spawnEntity(room2Chair1Model);
    room2Chair1Entity.position = [room2X, 0, room2Z - chairOffset];

    //// Chair 2 (back of table)
    //const room2Chair2Vertices = createOfficeChairVertices(
    //    [0.2, 0.2, 0.2, 1.0],
    //    [0.3, 0.1, 0.1, 1.0],
    //    [0, 0, 0],
    //    180
    //);
    //const room2Chair2Model = new Model(scene.gl, room2Chair2Vertices);
    //const room2Chair2Entity = scene.spawnEntity(room2Chair2Model);
    //room2Chair2Entity.position = [room2X, 0, room2Z + chairOffset];

    // MEETING ROOM 3 (Back room)
    const room3X = meetingRoomsX;
    const room3Z = meetingRoomsZ + meetingRoomsSectionDepth/2 - roomDepth/2;
    
    // Room 3 table
    const room3TableTopVertices = createBoxVertices(meetingTableWidth, meetingTableTopThickness, meetingTableDepth, [0.6, 0.4, 0.2, 1]);
    const room3TableTopModel = new Model(scene.gl, room3TableTopVertices);
    const room3TableTopEntity = scene.spawnEntity(room3TableTopModel);
    room3TableTopEntity.position = [room3X, meetingTableHeight - meetingTableTopThickness/2, room3Z];

    // Table legs for room 3
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legX = room3X - meetingTableWidth/2 + 0.2 + (i * (meetingTableWidth - 0.4));
            const legZ = room3Z - meetingTableDepth/2 + 0.2 + (j * (meetingTableDepth - 0.4));
            
            const legVertices = createBoxVertices(tableMainLegWidth, tableMainLegHeight, tableMainLegWidth, [0.5, 0.3, 0.15, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, tableMainLegHeight/2, legZ];
        }
    }

    //// Chairs for room 3
    //const room3Chair1Vertices = createOfficeChairVertices(
    //    [0.2, 0.2, 0.2, 1.0],
    //    [0.1, 0.1, 0.3, 1.0],
    //    [0, 0, 0],
    //    0
    //);
    //const room3Chair1Model = new Model(scene.gl, room3Chair1Vertices);
    //const room3Chair1Entity = scene.spawnEntity(room3Chair1Model);
    //room3Chair1Entity.position = [room3X, 0, room3Z - chairOffset];

    //// Chair 2 (back of table)
    //const room3Chair2Vertices = createOfficeChairVertices(
    //    [0.2, 0.2, 0.2, 1.0],
    //    [0.1, 0.1, 0.3, 1.0],
    //    [0, 0, 0],
    //    180
    //);
    //const room3Chair2Model = new Model(scene.gl, room3Chair2Vertices);
    //const room3Chair2Entity = scene.spawnEntity(room3Chair2Model);
    //room3Chair2Entity.position = [room3X, 0, room3Z + chairOffset];

    const kitchenWidth = 12; // Width of kitchen area
    const kitchenDepth = 8;  // Depth of kitchen area
    const kitchenX = officeWidth/2 - kitchenWidth/2;
    const kitchenZ = officeDepth/2 - kitchenDepth/2;
    
    // Kitchen floor with different texture
    const kitchenTileRepeat = 4; // Fewer repetitions for larger kitchen tiles
    const kitchenFloorVertices = [
        { position: [-1, 0.01, -1], color: [1, 1, 1, 1], uv: [0, 0] },
        { position: [1, 0.01, -1], color: [1, 1, 1, 1], uv: [kitchenTileRepeat, 0] },
        { position: [1, 0.01, 1], color: [1, 1, 1, 1], uv: [kitchenTileRepeat, kitchenTileRepeat] },

        { position: [-1, 0.01, -1], color: [1, 1, 1, 1], uv: [0, 0] },
        { position: [1, 0.01, 1], color: [1, 1, 1, 1], uv: [kitchenTileRepeat, kitchenTileRepeat] },
        { position: [-1, 0.01, 1], color: [1, 1, 1, 1], uv: [0, kitchenTileRepeat] },
    ];
    const kitchenFloorModel = new Model(scene.gl, kitchenFloorVertices, kitchenFloorTexture);
    const kitchenFloorEntity = scene.spawnEntity(kitchenFloorModel);
    kitchenFloorEntity.position = [kitchenX, 0, kitchenZ];
    kitchenFloorEntity.scale = [kitchenWidth / 2, 1, kitchenDepth / 2];

    // Create half wall
    const halfWallHeight = wallHeight * 0.35;
    const halfWallLength = kitchenWidth;

    const halfWallThickness = interiorWallThickness * 4;
    
    const halfWallVertices = createBoxVertices(halfWallLength, halfWallHeight, halfWallThickness, [1, 1, 1, 1]);
    const halfWallModel = new Model(scene.gl, halfWallVertices, wallTexture);
    const halfWallEntity = scene.spawnEntity(halfWallModel);
    halfWallEntity.position = [kitchenX, halfWallHeight / 2, kitchenZ - kitchenDepth / 2];

    // Kitchen Cabinets
    const cabinetHeight = 0.9;
    const cabinetDepth = 0.6;
    const cabinetWidth = 6.0;
    const counterHeight = 0.05;
    
    // counter position
    const counterX = kitchenX;
    const counterZ = kitchenZ + kitchenDepth/2 - cabinetDepth/2;

    const basicCabinetVertices = createBoxVertices(cabinetWidth, cabinetHeight, cabinetDepth, [1, 1, 1, 1]);
    const basicCabinetModel = new Model(scene.gl, basicCabinetVertices, cabinetTexture);
    const basicCabinetEntity = scene.spawnEntity(basicCabinetModel);
    basicCabinetEntity.position = [counterX, cabinetHeight / 2, counterZ];

    // Counter top for the cabinet
    const basicCounterVertices = createBoxVertices(cabinetWidth + 0.1, counterHeight, cabinetDepth + 0.1, [0.9, 0.9, 0.9, 1]);
    const basicCounterModel = new Model(scene.gl, basicCounterVertices);
    const basicCounterEntity = scene.spawnEntity(basicCounterModel);
    basicCounterEntity.position = [counterX, cabinetHeight + counterHeight/2, counterZ];

    // Doors to the counter
    const cabinetDoorWidth = cabinetWidth / 4;
    const cabinetDoorHeight = cabinetHeight * 0.8;
    const cabinetDoorThickness = 0.02;
    
    // 4 doors across the length of the counter
    for (let i = 0; i < 4; i++) {
        const doorX = counterX - cabinetWidth/2 + cabinetDoorWidth/2 + (i * cabinetDoorWidth);
        const doorY = cabinetHeight/2;
        const doorZ = counterZ - cabinetDepth/2 - cabinetDoorThickness/2;

        // Door panel
        const doorVertices = createBoxVertices(cabinetDoorWidth * 0.9, cabinetDoorHeight, cabinetDoorThickness, [1, 1, 1, 1]);
        const doorModel = new Model(scene.gl, doorVertices, cabinetTexture);
        const doorEntity = scene.spawnEntity(doorModel);
        doorEntity.position = [doorX, doorY, doorZ];

        //// Door handle
        //const handleVertices = createCylinderVertices(0.015, 0.08, 8, [0.8, 0.8, 0.8, 1]);
        //const handleModel = new Model(scene.gl, handleVertices);
        //const handleEntity = scene.spawnEntity(handleModel);
        //handleEntity.position = [doorX + cabinetDoorWidth * 0.3, doorY, doorZ - cabinetDoorThickness - 0.02];
    }

    const sideCabinetX = kitchenX + kitchenWidth/2 - cabinetDepth/2;
    const sideCabinetZ = kitchenZ + kitchenDepth/2 - 1;

    // Side cabinet box
    const sideCabinetVertices = createBoxVertices(cabinetDepth, cabinetHeight, 1.5, [1, 1, 1, 1]);
    const sideCabinetModel = new Model(scene.gl, sideCabinetVertices, cabinetTexture);
    const sideCabinetEntity = scene.spawnEntity(sideCabinetModel);
    sideCabinetEntity.position = [sideCabinetX, cabinetHeight / 2, sideCabinetZ];

    // Side counter top
    const sideCounterVertices = createBoxVertices(cabinetDepth + 0.1, counterHeight, 1.5 + 0.1, [0.9, 0.9, 0.9, 1]);
    const sideCounterModel = new Model(scene.gl, sideCounterVertices);
    const sideCounterEntity = scene.spawnEntity(sideCounterModel);
    sideCounterEntity.position = [sideCabinetX, cabinetHeight + counterHeight/2, sideCabinetZ];

    // Side cabinet door
    const sideDoorVertices = createBoxVertices(cabinetDoorThickness, cabinetDoorHeight, 1.3, [1, 1, 1, 1]);
    const sideDoorModel = new Model(scene.gl, sideDoorVertices, cabinetTexture);
    const sideDoorEntity = scene.spawnEntity(sideDoorModel);
    sideDoorEntity.position = [sideCabinetX - cabinetDepth/2 - cabinetDoorThickness/2, cabinetHeight/2, sideCabinetZ];

    //// Side door handle
    //const sideHandleVertices = createCylinderVertices(0.015, 0.08, 8, [0.8, 0.8, 0.8, 1]);
    //const sideHandleModel = new Model(scene.gl, sideHandleVertices);
    //const sideHandleEntity = scene.spawnEntity(sideHandleModel);
    //sideHandleEntity.position = [sideCabinetX - cabinetDepth/2 - cabinetDoorThickness - 0.02, cabinetHeight/2, sideCabinetZ - 0.2];
    //sideHandleEntity.rotation = [0, 0, 90];

    // Add full lower cabinets along the right wall
    const rightWallCabinetWidth = 5.0; // Length along the right wall
    const rightWallCabinetX = kitchenX + kitchenWidth/2 - cabinetDepth/2;
    const rightWallCabinetZ = kitchenZ;

    // Right wall cabinet box
    const rightCabinetVertices = createBoxVertices(cabinetDepth, cabinetHeight, rightWallCabinetWidth, [1, 1, 1, 1]);
    const rightCabinetModel = new Model(scene.gl, rightCabinetVertices, cabinetTexture);
    const rightCabinetEntity = scene.spawnEntity(rightCabinetModel);
    rightCabinetEntity.position = [rightWallCabinetX, cabinetHeight / 2, rightWallCabinetZ];

    // Right wall counter top
    const rightCounterVertices = createBoxVertices(cabinetDepth + 0.1, counterHeight, rightWallCabinetWidth + 0.1, [0.9, 0.9, 0.9, 1]);
    const rightCounterModel = new Model(scene.gl, rightCounterVertices);
    const rightCounterEntity = scene.spawnEntity(rightCounterModel);
    rightCounterEntity.position = [rightWallCabinetX, cabinetHeight + counterHeight/2, rightWallCabinetZ];

    // 3 doors along the right wall cabinets
    const rightWallDoorWidth = rightWallCabinetWidth / 3;
    for (let i = 0; i < 3; i++) {
        const rightDoorX = rightWallCabinetX - cabinetDepth/2 - cabinetDoorThickness/2;
        const rightDoorY = cabinetHeight/2;
        const rightDoorZ = rightWallCabinetZ - rightWallCabinetWidth/2 + rightWallDoorWidth/2 + (i * rightWallDoorWidth);

        // Right wall door panel
        const rightWallDoorVertices = createBoxVertices(cabinetDoorThickness, cabinetDoorHeight, rightWallDoorWidth * 0.9, [1, 1, 1, 1]);
        const rightWallDoorModel = new Model(scene.gl, rightWallDoorVertices, cabinetTexture);
        const rightWallDoorEntity = scene.spawnEntity(rightWallDoorModel);
        rightWallDoorEntity.position = [rightDoorX, rightDoorY, rightDoorZ];

        // Right wall door handle
        const rightWallHandleVertices = createCylinderVertices(0.015, 0.08, 8, [0.8, 0.8, 0.8, 1]);
        const rightWallHandleModel = new Model(scene.gl, rightWallHandleVertices);
        const rightWallHandleEntity = scene.spawnEntity(rightWallHandleModel);
        rightWallHandleEntity.position = [rightDoorX - cabinetDoorThickness - 0.02, rightDoorY, rightDoorZ + rightWallDoorWidth * 0.3];
        rightWallHandleEntity.rotation = [0, 0, 90];
    }

    const upperCabinetHeight = 0.6;
    const upperCabinetY = cabinetHeight + 0.8;

    const upperCabinetVertices = createBoxVertices(cabinetWidth, upperCabinetHeight, cabinetDepth/2, [1, 1, 1, 1]);
    const upperCabinetModel = new Model(scene.gl, upperCabinetVertices, cabinetTexture);
    const upperCabinetEntity = scene.spawnEntity(upperCabinetModel);
    upperCabinetEntity.position = [counterX, upperCabinetY, counterZ + cabinetDepth/4];

    // Upper cabinet doors
    for (let i = 0; i < 4; i++) {
        const upperDoorWidth = cabinetWidth / 4;
        const upperDoorX = counterX - cabinetWidth/4 + (i * upperDoorWidth) - 0.7;
        const upperDoorY = upperCabinetY;
        const upperDoorZ = counterZ - cabinetDepth/4 + cabinetDepth/4 - cabinetDoorThickness/2;

        const upperDoorVertices = createBoxVertices(upperDoorWidth * 0.9, upperCabinetHeight * 0.8, cabinetDoorThickness, [1, 1, 1, 1]);
        const upperDoorModel = new Model(scene.gl, upperDoorVertices, cabinetTexture);
        const upperDoorEntity = scene.spawnEntity(upperDoorModel);
        upperDoorEntity.position = [upperDoorX, upperDoorY, upperDoorZ];

        // Upper door handles
        const upperHandleVertices = createCylinderVertices(0.012, 0.06, 8, [0.8, 0.8, 0.8, 1]);
        const upperHandleModel = new Model(scene.gl, upperHandleVertices);
        const upperHandleEntity = scene.spawnEntity(upperHandleModel);
        upperHandleEntity.position = [upperDoorX + upperDoorWidth * 0.3, upperDoorY - upperCabinetHeight * 0.2, upperDoorZ - cabinetDoorThickness - 0.015];
    }

    // Stove
    const stoveWidth = 0.8;
    const stoveHeight = 0.95; // Counter height to match cabinets
    const stoveDepth = 0.7;
    const stoveX = kitchenX - kitchenWidth/2 + stoveWidth + 1.5;
    const stoveY = stoveHeight / 2;
    const stoveZ = kitchenZ + kitchenDepth/2 - stoveDepth/2;

    // Stove body
    const stoveBodyVertices = createBoxVertices(stoveWidth, stoveHeight, stoveDepth, [1, 1, 1, 1]);
    const stoveBodyModel = new Model(scene.gl, stoveBodyVertices); 
    const stoveBodyEntity = scene.spawnEntity(stoveBodyModel);
    stoveBodyEntity.position = [stoveX, stoveY, stoveZ];

    // Stove top
    const cooktopHeight = 0.03;
    const cooktopVertices = createBoxVertices(stoveWidth + 0.02, cooktopHeight, stoveDepth + 0.02, [0.2, 0.2, 0.2, 1]);
    const cooktopModel = new Model(scene.gl, cooktopVertices);
    const cooktopEntity = scene.spawnEntity(cooktopModel);
    cooktopEntity.position = [stoveX, stoveHeight + cooktopHeight/2, stoveZ];

    // 4 burners on top
    const burnerRadius = 0.08;
    const burnerHeight = 0.01;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const burnerX = stoveX - stoveWidth/4 + (i * stoveWidth/2);
            const burnerZ = stoveZ - stoveDepth/4 + (j * stoveDepth/2);
            
            // Burner grate
            const burnerVertices = createCylinderVertices(burnerRadius, burnerHeight, 16, [0.3, 0.3, 0.3, 1]);
            const burnerModel = new Model(scene.gl, burnerVertices);
            const burnerEntity = scene.spawnEntity(burnerModel);
            burnerEntity.position = [burnerX, stoveHeight + cooktopHeight + burnerHeight/2, burnerZ];
        }
    }

    // Oven door
    const ovenDoorWidth = stoveWidth * 0.9;
    const ovenDoorHeight = stoveHeight * 0.6;
    const ovenDoorThickness = 0.03;
    const ovenDoorY = stoveHeight * 0.3;

    const ovenDoorVertices = createBoxVertices(ovenDoorWidth, ovenDoorHeight, ovenDoorThickness, [0.9, 0.9, 0.9, 1]);
    const ovenDoorModel = new Model(scene.gl, ovenDoorVertices);
    const ovenDoorEntity = scene.spawnEntity(ovenDoorModel);
    ovenDoorEntity.position = [stoveX, ovenDoorY, stoveZ - stoveDepth/2 - ovenDoorThickness/2];

    //// Oven door handle
    //const ovenHandleVertices = createCylinderVertices(0.015, 0.4, 8, [0.2, 0.2, 0.2, 1]);
    //const ovenHandleModel = new Model(scene.gl, ovenHandleVertices);
    //const ovenHandleEntity = scene.spawnEntity(ovenHandleModel);
    //ovenHandleEntity.position = [stoveX, ovenDoorY + ovenDoorHeight * 0.35, stoveZ - stoveDepth/2 - ovenDoorThickness - 0.02];
    //ovenHandleEntity.rotation = [0, 0, 90];

    // knobs
    //for (let i = 0; i < 4; i++) {
    //    const knobX = stoveX - stoveWidth/3 + (i * stoveWidth/4.5);
    //    const knobY = stoveHeight - 0.1;
    //    const knobZ = stoveZ - stoveDepth/2 - 0.02;
    //    
    //    // Control knob
    //    const knobVertices = createCylinderVertices(0.025, 0.02, 12, [0.3, 0.3, 0.3, 1]);
    //    const knobModel = new Model(scene.gl, knobVertices);
    //    const knobEntity = scene.spawnEntity(knobModel);
    //    knobEntity.position = [knobX, knobY, knobZ];
    //}

    // Circular kitchen table in the open area
    const tableRadius = 1.2; // Radius of the circular table top
    const tableHeight = 0.75; // Standard dining table height
    const tableTopThickness = 0.05; // Thickness of the table top
    const pedestalRadius = 0.3; // Radius of the pedestal base
    const pedestalHeight = tableHeight - tableTopThickness; // Height of the pedestal
    
    // Position the table in the open kitchen area
    const tableX = kitchenX - 2; // Position it towards the left side of the kitchen area
    const tableZ = kitchenZ - 1; // Position it in front of the half wall

    // Circular table top
    const tableTopVertices = createCylinderVertices(tableRadius, tableTopThickness, 32, [0.8, 0.6, 0.4, 1]);
    const tableTopModel = new Model(scene.gl, tableTopVertices);
    const tableTopEntity = scene.spawnEntity(tableTopModel);
    tableTopEntity.position = [tableX, tableHeight - tableTopThickness/2, tableZ];

    // Cylindrical pedestal base
    const pedestalVertices = createCylinderVertices(pedestalRadius, pedestalHeight, 16, [0.7, 0.5, 0.3, 1]);
    const pedestalModel = new Model(scene.gl, pedestalVertices);
    const pedestalEntity = scene.spawnEntity(pedestalModel);
    const pedestalHeightHalf = pedestalHeight/2;
    pedestalEntity.position = [tableX, pedestalHeightHalf, tableZ];

    // Circular base plate
    const basePlateRadius = pedestalRadius * 1.8;
    const basePlateThickness = 0.08;
    const basePlateVertices = createCylinderVertices(basePlateRadius, basePlateThickness, 24, [0.6, 0.4, 0.2, 1]);
    const basePlateModel = new Model(scene.gl, basePlateVertices);
    const basePlateEntity = scene.spawnEntity(basePlateModel);
    basePlateEntity.position = [tableX, basePlateThickness/2, tableZ];

    // Add two office chairs at the kitchen table
    const chairDistance = 1.8; // Distance from table center to chairs
    
    // c1 positioned on one side of the table, facing the table
    const chair1Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.1, 0.1, 0.3, 1.0],
        [0, 0, 0],
        90
    );
    const chair1Model = new Model(scene.gl, chair1Vertices);
    const chair1Entity = scene.spawnEntity(chair1Model);
    chair1Entity.position = [tableX + chairDistance, 0, tableZ];

    //// c2 positioned on the opposite side of the table, facing the table
    //const chair2Vertices = createOfficeChairVertices(
    //    [0.2, 0.2, 0.2, 1.0],
    //    [0.1, 0.1, 0.3, 1.0],
    //    [0, 0, 0],
    //    270
    //);
    //const chair2Model = new Model(scene.gl, chair2Vertices);
    //const chair2Entity = scene.spawnEntity(chair2Model);
    //chair2Entity.position = [tableX - chairDistance, 0, tableZ];

    const recRoomWidth = 12; // Width of rec room area
    const recRoomDepth = 8;  // Depth of rec room area
    const recRoomX = officeWidth/2 - recRoomWidth/2;
    const recRoomZ = -officeDepth/2 + recRoomDepth/2;
    
    // Create a different floor texture for the rec room area (carpet)
    const carpetTileRepeat = 2;
    const recRoomFloorVertices = [
        { position: [-1, 0.005, -1], color: [0.8, 0.7, 0.6, 1], uv: [0, 0] },
        { position: [1, 0.005, -1], color: [0.8, 0.7, 0.6, 1], uv: [carpetTileRepeat, 0] },
        { position: [1, 0.005, 1], color: [0.8, 0.7, 0.6, 1], uv: [carpetTileRepeat, carpetTileRepeat] },

        { position: [-1, 0.005, -1], color: [0.8, 0.7, 0.6, 1], uv: [0, 0] },
        { position: [1, 0.005, 1], color: [0.8, 0.7, 0.6, 1], uv: [carpetTileRepeat, carpetTileRepeat] },
        { position: [-1, 0.005, 1], color: [0.8, 0.7, 0.6, 1], uv: [0, carpetTileRepeat] },
    ];
    const recRoomFloorModel = new Model(scene.gl, recRoomFloorVertices);
    const recRoomFloorEntity = scene.spawnEntity(recRoomFloorModel);
    recRoomFloorEntity.position = [recRoomX, 0, recRoomZ];
    recRoomFloorEntity.scale = [recRoomWidth / 2, 1, recRoomDepth / 2];

    // rec room half wall
    const recHalfWallHeight = wallHeight * 0.35;
    const recHalfWallLength = recRoomWidth;

    const recHalfWallVertices = createBoxVertices(recHalfWallLength, recHalfWallHeight, halfWallThickness, [1, 1, 1, 1]);
    const recHalfWallModel = new Model(scene.gl, recHalfWallVertices, wallTexture);
    const recHalfWallEntity = scene.spawnEntity(recHalfWallModel);
    recHalfWallEntity.position = [recRoomX, recHalfWallHeight / 2, recRoomZ + recRoomDepth / 2];

    // Large sectional couch
    const couchSeatHeight = 0.45;
    const couchBackHeight = 0.8;
    const couchSeatDepth = 0.8;
    const couchSeatThickness = 0.15;
    const couchBackThickness = 0.12;
    
    // Main couch section
    const mainCouchWidth = 4.0;
    const mainCouchX = recRoomX - 2;
    const mainCouchZ = recRoomZ + 2;

    // Couch seat
    const mainSeatVertices = createBoxVertices(mainCouchWidth, couchSeatThickness, couchSeatDepth, [0.3, 0.2, 0.1, 1]);
    const mainSeatModel = new Model(scene.gl, mainSeatVertices);
    const mainSeatEntity = scene.spawnEntity(mainSeatModel);
    mainSeatEntity.position = [mainCouchX, couchSeatHeight - couchSeatThickness/2, mainCouchZ];

    // Couch back
    const mainBackVertices = createBoxVertices(mainCouchWidth, couchBackHeight, couchBackThickness, [0.25, 0.15, 0.08, 1]);
    const mainBackModel = new Model(scene.gl, mainBackVertices);
    const mainBackEntity = scene.spawnEntity(mainBackModel);
    mainBackEntity.position = [mainCouchX, couchBackHeight/2, mainCouchZ + couchSeatDepth/2 + couchBackThickness/2];

    // Couch arms
    const armWidth = 0.15;
    const armHeight = couchBackHeight * 0.8;
    
    // Left arm
    const leftArmVertices = createBoxVertices(armWidth, armHeight, couchSeatDepth + couchBackThickness, [0.25, 0.15, 0.08, 1]);
    const leftArmModel = new Model(scene.gl, leftArmVertices);
    const leftArmEntity = scene.spawnEntity(leftArmModel);
    leftArmEntity.position = [mainCouchX - mainCouchWidth/2 - armWidth/2, armHeight/2, mainCouchZ + couchBackThickness/2];

    // Right arm
    const rightArmVertices = createBoxVertices(armWidth, armHeight, couchSeatDepth + couchBackThickness, [0.25, 0.15, 0.08, 1]);
    const rightArmModel = new Model(scene.gl, rightArmVertices);
    const rightArmEntity = scene.spawnEntity(rightArmModel);
    rightArmEntity.position = [mainCouchX + mainCouchWidth/2 + armWidth/2, armHeight/2, mainCouchZ + couchBackThickness/2];

    // Add couch cushions
    const cushionWidth = 0.8;
    const cushionDepth = 0.7;
    const cushionHeight = 0.08;
    
    // Couch cushions
    for (let i = 0; i < 4; i++) {
        const cushionX = mainCouchX - mainCouchWidth/2 + cushionWidth/2 + (i * cushionWidth * 1.1);
        const cushionVertices = createBoxVertices(cushionWidth, cushionHeight, cushionDepth, [0.35, 0.25, 0.12, 1]);
        const cushionModel = new Model(scene.gl, cushionVertices);
        const cushionEntity = scene.spawnEntity(cushionModel);
        cushionEntity.position = [cushionX, couchSeatHeight + cushionHeight/2, mainCouchZ];
    }

    // Coffee table in front of the couch
    const coffeeTableWidth = 2.5;
    const coffeeTableDepth = 1.2;
    const coffeeTableHeight = 0.4;
    const coffeeTableTopThickness = 0.05;
    const coffeeTableX = mainCouchX + 0.5;
    const coffeeTableZ = mainCouchZ - 1.8;

    // Coffee table top
    const coffeeTableTopVertices = createBoxVertices(coffeeTableWidth, coffeeTableTopThickness, coffeeTableDepth, [0.6, 0.4, 0.2, 1]);
    const coffeeTableTopModel = new Model(scene.gl, coffeeTableTopVertices);
    const coffeeTableTopEntity = scene.spawnEntity(coffeeTableTopModel);
    coffeeTableTopEntity.position = [coffeeTableX, coffeeTableHeight - coffeeTableTopThickness/2, coffeeTableZ];

    // Coffee table legs
    const legWidth = 0.08;
    const legHeight = coffeeTableHeight - coffeeTableTopThickness;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legX = coffeeTableX - coffeeTableWidth/2 + 0.2 + (i * (coffeeTableWidth - 0.4));
            const legZ = coffeeTableZ - coffeeTableDepth/2 + 0.2 + (j * (coffeeTableDepth - 0.4));
            
            const legVertices = createBoxVertices(legWidth, legHeight, legWidth, [0.5, 0.3, 0.15, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, legHeight/2, legZ];
        }
    }

    // Armchair positioned to face the couch
    const armchairX = recRoomX + 3;
    const armchairZ = recRoomZ + 3;
    const armchairSeatWidth = 1.2;
    const armchairSeatDepth = 1.0;
    
    // Armchair seat
    const armchairSeatVertices = createBoxVertices(armchairSeatWidth, couchSeatThickness, armchairSeatDepth, [0.2, 0.3, 0.5, 1]);
    const armchairSeatModel = new Model(scene.gl, armchairSeatVertices);
    const armchairSeatEntity = scene.spawnEntity(armchairSeatModel);
    const armchairSeatHeight = couchSeatHeight - couchSeatThickness/2;
    armchairSeatEntity.position = [armchairX, armchairSeatHeight, armchairZ];

    // Armchair back
    const armchairBackVertices = createBoxVertices(armchairSeatWidth, couchBackHeight, couchBackThickness, [0.18, 0.25, 0.45, 1]);
    const armchairBackModel = new Model(scene.gl, armchairBackVertices);
    const armchairBackEntity = scene.spawnEntity(armchairBackModel);
    armchairBackEntity.position = [armchairX, couchBackHeight/2, armchairZ + armchairSeatDepth/2 + couchBackThickness/2];

    // Armchair arms
    const armchairArmWidth = 0.2;
    const armchairArmHeight = armHeight;
    
    // Left armchair arm
    const leftChairArmVertices = createBoxVertices(armchairArmWidth, armchairArmHeight, armchairSeatDepth + couchBackThickness, [0.18, 0.25, 0.45, 1]);
    const leftChairArmModel = new Model(scene.gl, leftChairArmVertices);
    const leftChairArmEntity = scene.spawnEntity(leftChairArmModel);
    leftChairArmEntity.position = [armchairX - armchairSeatWidth/2 - armchairArmWidth/2, armchairArmHeight/2, armchairZ + couchBackThickness/2];

    // Right armchair arm
    const rightChairArmVertices = createBoxVertices(armchairArmWidth, armchairArmHeight, armchairSeatDepth + couchBackThickness, [0.18, 0.25, 0.45, 1]);
    const rightChairArmModel = new Model(scene.gl, rightChairArmVertices);
    const rightChairArmEntity = scene.spawnEntity(rightChairArmModel);
    rightChairArmEntity.position = [armchairX + armchairSeatWidth/2 + armchairArmWidth/2, armchairArmHeight/2, armchairZ + couchBackThickness/2];

    // Armchair cushion
    const chairCushionVertices = createBoxVertices(armchairSeatWidth * 0.9, cushionHeight, armchairSeatDepth * 0.9, [0.22, 0.35, 0.55, 1]);
    const chairCushionModel = new Model(scene.gl, chairCushionVertices);
    const chairCushionEntity = scene.spawnEntity(chairCushionModel);
    chairCushionEntity.position = [armchairX, couchSeatHeight + cushionHeight/2, armchairZ];

    //// Side table next to armchair
    //const sideTableSize = 0.5;
    //const sideTableHeight = 0.55;
    //const sideTableX = armchairX + armchairSeatWidth/2 + armchairArmWidth + sideTableSize;
    //const sideTableZ = armchairZ + armchairSeatDepth/2;
    
    //// Side table top
    //const sideTableTopVertices = createBoxVertices(sideTableSize, coffeeTableTopThickness, sideTableSize, [0.6, 0.4, 0.2, 1]);
    //const sideTableTopModel = new Model(scene.gl, sideTableTopVertices);
    //const sideTableTopEntity = scene.spawnEntity(sideTableTopModel);
    //sideTableTopEntity.position = [sideTableX, sideTableHeight - coffeeTableTopThickness/2, sideTableZ];

    //// Side table legs
    //const sideTableLegHeight = sideTableHeight - coffeeTableTopThickness;
    //for (let i = 0; i < 2; i++) {
    //    for (let j = 0; j < 2; j++) {
    //        const legX = sideTableX - sideTableSize/2 + 0.1 + (i * (sideTableSize - 0.2));
    //        const legZ = sideTableZ - sideTableSize/2 + 0.1 + (j * (sideTableSize - 0.2));
    //        
    //        const legVertices = createBoxVertices(legWidth, sideTableLegHeight, legWidth, [0.5, 0.3, 0.15, 1]);
    //        const legModel = new Model(scene.gl, legVertices);
    //        const legEntity = scene.spawnEntity(legModel);
    //        legEntity.position = [legX, sideTableLegHeight/2, legZ];
    //    }
    //}

    // Floor lamp
    const lampX = recRoomX - recRoomWidth/2 + 1;
    const lampZ = recRoomZ + recRoomDepth/2 - 1;
    const lampHeight = 1.8;
    const poleRadius = 0.03;
    
    // Lamp base
    const lampBaseVertices = createCylinderVertices(0.2, 0.1, 16, [0.2, 0.2, 0.2, 1]);
    const lampBaseModel = new Model(scene.gl, lampBaseVertices);
    const lampBaseEntity = scene.spawnEntity(lampBaseModel);
    lampBaseEntity.position = [lampX, 0.05, lampZ];

    // Lamp pole
    const lampPoleVertices = createCylinderVertices(poleRadius, lampHeight, 8, [0.3, 0.3, 0.3, 1]);
    const lampPoleModel = new Model(scene.gl, lampPoleVertices);
    const lampPoleEntity = scene.spawnEntity(lampPoleModel);
    lampPoleEntity.position = [lampX, lampHeight/2, lampZ];

    // Lamp shade
    const lampShadeVertices = createCylinderVertices(0.3, 0.4, 16, [0.9, 0.9, 0.8, 1]);
    const lampShadeModel = new Model(scene.gl, lampShadeVertices);
    const lampShadeEntity = scene.spawnEntity(lampShadeModel);
    lampShadeEntity.position = [lampX, lampHeight - 0.2, lampZ];

    //const penguinVertices = createPenguinVertices();
    //const penguinModel = new Model(scene.gl, penguinVertices);
    //const penguinEntity = scene.spawnEntity(penguinModel);

    //penguinEntity.position = [recRoomX + 4.5, 0.7, recRoomZ + 3.4];
    //penguinEntity.scale = [0.4, 0.4, 0.4];
    //penguinEntity.rotation = [0, 180, 0];

    const workingAreaX = -2;
    const workingAreaZ = 0;

    const confTableWidth = 2.5;
    const confTableDepth = 6.0;
    const confTableHeight = 0.75;
    const confTableTopThickness = 0.06;
    const confTableX = workingAreaX;
    const confTableZ = workingAreaZ - 1;

    // Conference table top
    const confTableTopVertices = createBoxVertices(confTableWidth, confTableTopThickness, confTableDepth, [0.6, 0.4, 0.2, 1]);
    const confTableTopModel = new Model(scene.gl, confTableTopVertices);
    const confTableTopEntity = scene.spawnEntity(confTableTopModel);
    confTableTopEntity.position = [confTableX, confTableHeight - confTableTopThickness/2, confTableZ];

    // Conference table legs
    const confTableLegWidth = 0.12;
    const confTableLegHeight = confTableHeight - confTableTopThickness;
    
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
            const legX = confTableX - confTableWidth/2 + 0.3 + (i * (confTableWidth - 0.6));
            const legZ = confTableZ - confTableDepth/2 + 0.5 + (j * (confTableDepth - 1) / 2);
            
            const legVertices = createBoxVertices(confTableLegWidth, confTableLegHeight, confTableLegWidth, [0.5, 0.3, 0.15, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, confTableLegHeight/2, legZ];
        }
    }

    const confChairOffset = 0.8; // Distance from table edge to chair
    const confChairSpacing = 1.5; // Spacing between chairs along the table
    
    // Chairs along the long sides of the table
    const numChairsPerSide = 2;
    
    // Chairs on the left side
    for (let i = 0; i < numChairsPerSide; i++) {
        const chairX = confTableX - confTableWidth/2 - confChairOffset;
        const chairZ = confTableZ - (numChairsPerSide - 1) * confChairSpacing/2 + (i * confChairSpacing);
        
        const chairVertices = createOfficeChairVertices(
            [0.2, 0.2, 0.2, 1.0],
            [0.2, 0.2, 0.3, 1.0],
            [0, 0, 0],
            270
        );
        const chairModel = new Model(scene.gl, chairVertices);
        const chairEntity = scene.spawnEntity(chairModel);
        chairEntity.position = [chairX, 0, chairZ];
    }
    
    // Chairs on the right side
    for (let i = 0; i < numChairsPerSide; i++) {
        const chairX = confTableX + confTableWidth/2 + confChairOffset;
        const chairZ = confTableZ - (numChairsPerSide - 1) * confChairSpacing/2 + (i * confChairSpacing);
        
        const chairVertices = createOfficeChairVertices(
            [0.2, 0.2, 0.2, 1.0],
            [0.2, 0.2, 0.3, 1.0],
            [0, 0, 0],
            90
        );
        const chairModel = new Model(scene.gl, chairVertices);
        const chairEntity = scene.spawnEntity(chairModel);
        chairEntity.position = [chairX, 0, chairZ];
    }
    
    const headChair1Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.3, 0.1, 0.1, 1.0],
        [0, 0, 0],
        0
    );
    const headChair1Model = new Model(scene.gl, headChair1Vertices);
    const headChair1Entity = scene.spawnEntity(headChair1Model);
    headChair1Entity.position = [confTableX, 0, confTableZ - confTableDepth/2 - confChairOffset];
    
    // Chair at positive Z end
    const headChair2Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.3, 0.1, 0.1, 1.0],
        [0, 0, 0],
        180
    );
    const headChair2Model = new Model(scene.gl, headChair2Vertices);
    const headChair2Entity = scene.spawnEntity(headChair2Model);
    headChair2Entity.position = [confTableX, 0, confTableZ + confTableDepth/2 + confChairOffset];

    const confTable2X = -5.10;
    const confTable2Y = 0;
    const confTable2Z = 7.42;
    const confTable2Width = 6.0;
    const confTable2Depth = 2.5;
    const confTable2Height = 0.75;
    const confTable2TopThickness = 0.06;

    // Conference table 2 top
    const confTable2TopVertices = createBoxVertices(confTable2Width, confTable2TopThickness, confTable2Depth, [0.6, 0.4, 0.2, 1]);
    const confTable2TopModel = new Model(scene.gl, confTable2TopVertices);
    const confTable2TopEntity = scene.spawnEntity(confTable2TopModel);
    confTable2TopEntity.position = [confTable2X, confTable2Height - confTable2TopThickness/2, confTable2Z];

    // Conference table 2 legs
    const confTable2LegWidth = 0.12;
    const confTable2LegHeight = confTable2Height - confTable2TopThickness;
    
    for (let i = 0; i < 3; i++) { // 3 legs along the length
        for (let j = 0; j < 2; j++) { // 2 legs along the width
            const legX = confTable2X - confTable2Width/2 + 0.5 + (i * (confTable2Width - 1) / 2);
            const legZ = confTable2Z - confTable2Depth/2 + 0.3 + (j * (confTable2Depth - 0.6));
            
            const legVertices = createBoxVertices(confTable2LegWidth, confTable2LegHeight, confTable2LegWidth, [0.5, 0.3, 0.15, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, confTable2LegHeight/2, legZ];
        }
    }

    const confChair2Offset = 0.8; // Distance from table edge to chair
    const confChair2Spacing = 1.5; // Spacing between chairs along the table
    
    // Chairs along the long sides of table 2 (now front and back)
    const numChairs2PerSide = 2;
    
    // Chairs on the front side of table 2
    for (let i = 0; i < numChairs2PerSide; i++) {
        const chairX = confTable2X - (numChairs2PerSide - 1) * confChair2Spacing/2 + (i * confChair2Spacing);
        const chairZ = confTable2Z - confTable2Depth/2 - confChair2Offset;
        
        const chairVertices = createOfficeChairVertices(
            [0.2, 0.2, 0.2, 1.0],
            [0.1, 0.2, 0.3, 1.0],
            [0, 0, 0],
            0
        );
        const chairModel = new Model(scene.gl, chairVertices);
        const chairEntity = scene.spawnEntity(chairModel);
        chairEntity.position = [chairX, 0, chairZ];
    }
    
    // Chairs on the back side of table 2
    for (let i = 0; i < numChairs2PerSide; i++) {
        const chairX = confTable2X - (numChairs2PerSide - 1) * confChair2Spacing/2 + (i * confChair2Spacing);
        const chairZ = confTable2Z + confTable2Depth/2 + confChair2Offset;
        
        const chairVertices = createOfficeChairVertices(
            [0.2, 0.2, 0.2, 1.0],
            [0.1, 0.2, 0.3, 1.0],
            [0, 0, 0],
            180
        );
        const chairModel = new Model(scene.gl, chairVertices);
        const chairEntity = scene.spawnEntity(chairModel);
        chairEntity.position = [chairX, 0, chairZ];
    }
    
    // Head chairs for table 2
    const headChair3Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.3, 0.1, 0.1, 1.0],
        [0, 0, 0],
        270
    );
    const headChair3Model = new Model(scene.gl, headChair3Vertices);
    const headChair3Entity = scene.spawnEntity(headChair3Model);
    headChair3Entity.position = [confTable2X - confTable2Width/2 - confChair2Offset, 0, confTable2Z];
    
    // Chair at positive X end of table 2
    const headChair4Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.3, 0.1, 0.1, 1.0],
        [0, 0, 0],
        90
    );
    const headChair4Model = new Model(scene.gl, headChair4Vertices);
    const headChair4Entity = scene.spawnEntity(headChair4Model);
    headChair4Entity.position = [confTable2X + confTable2Width/2 + confChair2Offset, 0, confTable2Z];

    // Picture on the wall next to the second conference table
    const picture6Width = 2.5;
    const picture6Height = 1.8;
    const picture6YPosition = wallHeight / 2;
    
    const picture6Vertices = createPictureVertices(picture6Width, picture6Height, 0.1, [0, 0, 0]);
    const picture6Model = new Model(scene.gl, picture6Vertices, pictureTexture4);
    const picture6Entity = scene.spawnEntity(picture6Model);
    picture6Entity.position = [4, picture6YPosition, 9];
    picture6Entity.rotation = [0, 180, 0];

    const doorX = 17.5;
    const doorY = 1;
    const doorZ = 0;
    const doorWidth = 1.4;
    const doorHeight = 3;
    const doorThickness = 0.05;
    const frameThickness = 0.08;
    const frameWidth = 0.12;
    
    // Door panel (wooden door)
    const doorPanelVertices = createBoxVertices(doorWidth, doorHeight, doorThickness, [0.6, 0.4, 0.2, 1]);
    const doorPanelModel = new Model(scene.gl, doorPanelVertices, cabinetTexture);
    const doorPanelEntity = scene.spawnEntity(doorPanelModel);
    doorPanelEntity.position = [doorX - 0.05, doorY, doorZ];
    doorPanelEntity.rotation = [0, 90, 0];
    
    // Door frame - left side
    const leftDoorFrameVertices = createBoxVertices(frameWidth, doorHeight + frameWidth, frameThickness + 0.02, [0.5, 0.3, 0.15, 1]);
    const leftDoorFrameModel = new Model(scene.gl, leftDoorFrameVertices);
    const leftDoorFrameEntity = scene.spawnEntity(leftDoorFrameModel);
    leftDoorFrameEntity.position = [doorX, doorY, doorZ - doorWidth/2 - frameWidth/2];
    
    // Door frame - right side
    const rightDoorFrameVertices = createBoxVertices(frameWidth, doorHeight + frameWidth, frameThickness + 0.02, [0.5, 0.3, 0.15, 1]);
    const rightDoorFrameModel = new Model(scene.gl, rightDoorFrameVertices);
    const rightDoorFrameEntity = scene.spawnEntity(rightDoorFrameModel);
    rightDoorFrameEntity.position = [doorX, doorY, doorZ + doorWidth/2 + frameWidth/2];
    
    // Door frame - top
    const topDoorFrameVertices = createBoxVertices(frameWidth, frameWidth, doorWidth + frameWidth*2, [0.5, 0.3, 0.15, 1]);
    const topDoorFrameModel = new Model(scene.gl, topDoorFrameVertices);
    const topDoorFrameEntity = scene.spawnEntity(topDoorFrameModel);
    topDoorFrameEntity.position = [doorX, doorY + doorHeight/2 + frameWidth/2, doorZ];
    
    // Door handle
    const handleVertices = createCylinderVertices(0.02, 0.12, 8, [0.8, 0.8, 0.8, 1]);
    const handleModel = new Model(scene.gl, handleVertices);
    const handleEntity = scene.spawnEntity(handleModel);
    handleEntity.position = [doorX - doorThickness - 0.03, doorY + 0.3, doorZ - doorWidth/3];
    handleEntity.rotation = [0, 0, 90];
    
    //const lockPlateVertices = createBoxVertices(0.08, 0.15, 0.01, [0.7, 0.7, 0.7, 1]);
    //const lockPlateModel = new Model(scene.gl, lockPlateVertices);
    //const lockPlateEntity = scene.spawnEntity(lockPlateModel);
    //lockPlateEntity.position = [doorX - doorThickness - 0.01, doorY, doorZ - doorWidth/3];

    const workstation1X = workingAreaX - 6;
    const workstation1Z = workingAreaZ - 8;
    const deskWidth = 1.8;
    const deskDepth = 1.0;
    const deskHeight = 0.75;
    const deskTopThickness = 0.04;

    // Workstation 1 desk top
    const desk1TopVertices = createBoxVertices(deskWidth, deskTopThickness, deskDepth, [0.7, 0.5, 0.3, 1]);
    const desk1TopModel = new Model(scene.gl, desk1TopVertices);
    const desk1TopEntity = scene.spawnEntity(desk1TopModel);
    desk1TopEntity.position = [workstation1X, deskHeight - deskTopThickness/2, workstation1Z];

    // Workstation 1 legs
    const deskLegWidth = 0.06;
    const deskLegHeight = deskHeight - deskTopThickness;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legX = workstation1X - deskWidth/2 + 0.15 + (i * (deskWidth - 0.3));
            const legZ = workstation1Z - deskDepth/2 + 0.15 + (j * (deskDepth - 0.3));
            
            const legVertices = createCylinderVertices(deskLegWidth, deskLegHeight, 8, [0.3, 0.3, 0.3, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, deskLegHeight/2, legZ];
        }
    }

    // Workstation 1 chair
    const workChair1Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.1, 0.3, 0.1, 1.0],
        [0, 0, 0],
        0
    );
    const workChair1Model = new Model(scene.gl, workChair1Vertices);
    const workChair1Entity = scene.spawnEntity(workChair1Model);
    workChair1Entity.position = [workstation1X, 0, workstation1Z - deskDepth/2 - 0.8];

    //// Monitor on workstation 1
    //const monitorWidth = 0.5;
    //const monitorHeight = 0.35;
    //const monitorDepth = 0.08;
    //const monitorStandHeight = 0.15;
    
    //// Monitor screen
    //const monitorVertices = createBoxVertices(monitorWidth, monitorHeight, monitorDepth, [0.1, 0.1, 0.1, 1]);
    //const monitorModel = new Model(scene.gl, monitorVertices);
    //const monitorEntity = scene.spawnEntity(monitorModel);
    //monitorEntity.position = [workstation1X, deskHeight + monitorStandHeight + monitorHeight/2, workstation1Z + deskDepth/2 - monitorDepth];
    
    //// Monitor stand
    //const standVertices = createCylinderVertices(0.08, monitorStandHeight, 8, [0.3, 0.3, 0.3, 1]);
    //const standModel = new Model(scene.gl, standVertices);
    //const standEntity = scene.spawnEntity(standModel);
    //standEntity.position = [workstation1X, deskHeight + monitorStandHeight/2, workstation1Z + deskDepth/2 - monitorDepth];

    const workstation2X = workingAreaX + 6;
    const workstation2Z = workingAreaZ - 8;

    // Workstation 2 desk top
    const desk2TopVertices = createBoxVertices(deskWidth, deskTopThickness, deskDepth, [0.7, 0.5, 0.3, 1]);
    const desk2TopModel = new Model(scene.gl, desk2TopVertices);
    const desk2TopEntity = scene.spawnEntity(desk2TopModel);
    const desk2TopHeight = deskHeight - deskTopThickness/2;
    desk2TopEntity.position = [workstation2X, desk2TopHeight, workstation2Z];

    // Workstation 2 legs
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legX = workstation2X - deskWidth/2 + 0.15 + (i * (deskWidth - 0.3));
            const legZ = workstation2Z - deskDepth/2 + 0.15 + (j * (deskDepth - 0.3));
            
            const legVertices = createCylinderVertices(deskLegWidth, deskLegHeight, 8, [0.3, 0.3, 0.3, 1]);
            const legModel = new Model(scene.gl, legVertices);
            const legEntity = scene.spawnEntity(legModel);
            legEntity.position = [legX, deskLegHeight/2, legZ];
        }
    }

    // Workstation 2 chair
    const workChair2Vertices = createOfficeChairVertices(
        [0.2, 0.2, 0.2, 1.0],
        [0.3, 0.1, 0.3, 1.0],
        [0, 0, 0],
        0
    );
    const workChair2Model = new Model(scene.gl, workChair2Vertices);
    const workChair2Entity = scene.spawnEntity(workChair2Model);
    workChair2Entity.position = [workstation2X, 0, workstation2Z - deskDepth/2 - 0.8];

    //// Monitor and stand for workstation 2
    //const monitor2Vertices = createBoxVertices(monitorWidth, monitorHeight, monitorDepth, [0.1, 0.1, 0.1, 1]);
    //const monitor2Model = new Model(scene.gl, monitor2Vertices);
    //const monitor2Entity = scene.spawnEntity(monitor2Model);
    //monitor2Entity.position = [workstation2X, deskHeight + monitorStandHeight + monitorHeight/2, workstation2Z + deskDepth/2 - monitorDepth];
    
    //const stand2Vertices = createCylinderVertices(0.08, monitorStandHeight, 8, [0.3, 0.3, 0.3, 1]);
    //const stand2Model = new Model(scene.gl, standVertices);
    //const stand2Entity = scene.spawnEntity(stand2Model);
    //stand2Entity.position = [workstation2X, deskHeight + monitorStandHeight/2, workstation2Z + deskDepth/2 - monitorDepth];

    // Create ceiling lights throughout the office
    createCeilingLights(scene, wallHeight);

    scene.camera.position = [13, 2, 0];
    scene.camera.target = [0, 0, 0];
    scene.drawScene();
}

/**
 * @param {Scene} scene 
 */
function createCeilingLights(scene, wallHeight) {
    const lightHeight = wallHeight - 0.2; // Slightly below ceiling
    const lightWidth = 2.5;
    const lightDepth = 0.6;
    const lightThickness = 0.15;
    
    // Main office area lights - exact same positions as point lights
    const mainAreaLights = [
        [-8, -6], [-8, 0], [-8, 6],
        //[-2, -6], [-2, 0], [-2, 6],
        [2, -6], [2, 0], [2, 6]
        //[8, -6], [8, 0], [8, 6]
    ];
    
    mainAreaLights.forEach(([x, z]) => {
        createSingleCeilingLight(x, lightHeight, z, lightWidth, lightDepth, lightThickness, wallHeight);
        // yeah I know the only one light is working but thats all I want so im not fixing the bug
        addLightCeilingLightsToScene(scene, x, lightHeight - 0.1, z);
    });
    
    // Kitchen area lights - exact same positions as point lights
    const kitchenLights = [
        [11, 6]// [15, 6],
    ];
    
    kitchenLights.forEach(([x, z]) => {
        createSingleCeilingLight(x, lightHeight, z, lightWidth, lightDepth, lightThickness, wallHeight);
    });
    
    // Recreation room lights - exact same positions as point lights
    const recRoomLights = [
        [11, -6]// [15, -6]
    ];
    
    recRoomLights.forEach(([x, z]) => {
        createSingleCeilingLight(x, lightHeight, z, lightWidth, lightDepth, lightThickness, wallHeight);
    });
    
    // Meeting room lights - exact same positions as point lights
    const meetingRoomLights = [
        [-13, -6], // Room 1
        [-13, 0],  // Room 2  
        [-13, 6]   // Room 3
    ];
    
    meetingRoomLights.forEach(([x, z]) => {
        createSingleCeilingLight(x, lightHeight, z, lightWidth * 0.8, lightDepth, lightThickness, wallHeight);
    });
}

/**
 * 
 * @param {Scene} scene 
 */
function addLightCeilingLightsToScene(scene, x, y, z) {
    scene.addLightSource(
        [x, y, z],
        [1.0, 1.0, 0.9],
        0.6
    )
}

/**
 * Create a single ceiling light fixture
 */
function createSingleCeilingLight(x, y, z, width, depth, thickness, wallHeight) {
    // Light housing
    const housingVertices = createBoxVertices(width, thickness, depth, [0.85, 0.85, 0.9, 1]);
    const housingModel = new Model(scene.gl, housingVertices);
    const housingEntity = scene.spawnEntity(housingModel);
    housingEntity.position = [x, y, z];
    
    //const diffuserVertices = createBoxVertices(width * 0.95, thickness * 0.1, depth * 0.95, [0.95, 0.95, 1.0, 0.9]);
    //const diffuserModel = new Model(scene.gl, diffuserVertices);
    //const diffuserEntity = scene.spawnEntity(diffuserModel);
    //diffuserEntity.position = [x, y - thickness/2 + 0.02, z];
    
    // Support chains
    const chainRadius = 0.005;
    const chainLength = 0.3;
    const chainOffsets = [
        [-width/2 * 0.8, depth/2 * 0.8],
        [width/2 * 0.8, depth/2 * 0.8],
        [-width/2 * 0.8, -depth/2 * 0.8],
        [width/2 * 0.8, -depth/2 * 0.8]
    ];
    
    chainOffsets.forEach(([offsetX, offsetZ]) => {
        const chainVertices = createCylinderVertices(chainRadius, chainLength, 6, [0.4, 0.4, 0.4, 1]);
        const chainModel = new Model(scene.gl, chainVertices);
        const chainEntity = scene.spawnEntity(chainModel);
        chainEntity.position = [x + offsetX, y + thickness/2 + chainLength/2, z + offsetZ];
    });
    
    // Ceiling mounting points
    chainOffsets.forEach(([offsetX, offsetZ]) => {
        const mountVertices = createCylinderVertices(0.02, 0.01, 8, [0.3, 0.3, 0.3, 1]);
        const mountModel = new Model(scene.gl, mountVertices);
        const mountEntity = scene.spawnEntity(mountModel);
        mountEntity.position = [x + offsetX, wallHeight - 0.01, z + offsetZ];
    });
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
    vertices.push(...createSphereVertices(0.08, 10, 10, [1, 1, 0.1, 1], [0, 0.9, 0.3]));

    // eyes
    vertices.push(...createSphereVertices(0.1, 5, 10, [1, 1, 1, 1], [ 0.15, 0.8, 0.18]));
    vertices.push(...createSphereVertices(0.1, 5, 10, [1, 1, 1, 1], [-0.15, 0.8, 0.18]));

    //// pupils
    //vertices.push(...createSphereVertices(0.05, 5, 10, [0, 0, 0, 1], [ 0.15, 0.8, 0.25]));
    //vertices.push(...createSphereVertices(0.05, 5, 10, [0, 0, 0, 1], [-0.15, 0.8, 0.25]));

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