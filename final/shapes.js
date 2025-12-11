/**
 * Create a plane
 */
function createPlaneVertices(size = 1, color = [1,1,1,1]) {
    return [
        { position: [-size,0,-size], color, uv: [0, 0], normal: [0, 1, 0] },
        { position: [ size,0,-size], color, uv: [1, 0], normal: [0, 1, 0] },
        { position: [ size,0, size], color, uv: [1, 1], normal: [0, 1, 0] },

        { position: [-size,0,-size], color, uv: [0, 0], normal: [0, 1, 0] },
        { position: [ size,0, size], color, uv: [1, 1], normal: [0, 1, 0] },
        { position: [-size,0, size], color, uv: [0, 1], normal: [0, 1, 0] },
    ];
}

/**
 * Rodrigues rotation helper
 * @param {[number, number, number]} v Vector to rotate
 * @param {[number, number, number]} axis Rotation axis (normalized)
 * @param {number} angle Rotation angle in radians
 * @returns {[number, number, number]} Rotated vector
 */
function rotateVector(v, axis, angle) {
    const [x, y, z] = v;
    const [ux, uy, uz] = axis;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dot = ux*x + uy*y + uz*z;
    return [
        x*cosA + (uy*z - uz*y)*sinA + ux*dot*(1 - cosA),
        y*cosA + (uz*x - ux*z)*sinA + uy*dot*(1 - cosA),
        z*cosA + (ux*y - uy*x)*sinA + uz*dot*(1 - cosA),
    ];
}

/**
 * Compute rotation axis and angle from Y-axis to a given direction
 * @param {[number, number, number]} dir Target direction
 * @returns {{axis: [number, number, number], angle: number}}
 */
function computeRotationToDirection(dir) {
    const yAxis = [0, 1, 0];
    const len = Math.hypot(...dir);
    const normalized = dir.map(v => v / len);
    const dot = yAxis[0]*normalized[0] + yAxis[1]*normalized[1] + yAxis[2]*normalized[2];
    const angle = Math.acos(dot);
    const axis = [
        yAxis[1]*normalized[2] - yAxis[2]*normalized[1],
        yAxis[2]*normalized[0] - yAxis[0]*normalized[2],
        yAxis[0]*normalized[1] - yAxis[1]*normalized[0]
    ];
    const axisLen = Math.hypot(...axis);
    return { axis: axisLen === 0 ? [0,0,1] : axis.map(v => v / axisLen), angle };
}

/**
 * Create a circle
 */
function createCircleVertices(radius = 1, segments = 20, color = [1,1,1,1], offset=[0,0,0], facing=[0,1,0]) {
    const vertices = [];
    const { axis, angle } = computeRotationToDirection(facing);

    const center = rotateVector([0,0,0], axis, angle).map((v,i)=>v+offset[i]);

    for(let i=0; i<segments; i++){
        const theta1 = (i/segments)*2*Math.PI;
        const theta2 = ((i+1)/segments)*2*Math.PI;

        const p1 = rotateVector([radius*Math.cos(theta1),0,radius*Math.sin(theta1)], axis, angle)
            .map((v,i)=>v+offset[i]);
        const p2 = rotateVector([radius*Math.cos(theta2),0,radius*Math.sin(theta2)], axis, angle)
            .map((v,i)=>v+offset[i]);

        vertices.push({ position:center, color });
        vertices.push({ position:p1, color });
        vertices.push({ position:p2, color });
    }

    return vertices;
}

/**
 * Create a cylinder
 */
function createCylinderVertices(radius = 1, height = 1, segments = 20, color=[1,1,1,1], offset=[0,0,0], facing=[0,1,0]){
    const vertices = [];
    const halfHeight = height/2;
    const { axis, angle } = computeRotationToDirection(facing);

    const circlePoints = [];
    for(let i=0;i<=segments;i++){
        const a = (i/segments)*2*Math.PI;
        circlePoints.push([Math.cos(a)*radius, Math.sin(a)*radius]);
    }

    for(let i=0;i<segments;i++){
        const [x0,z0] = circlePoints[i];
        const [x1,z1] = circlePoints[i+1];

        const p1 = rotateVector([x0,-halfHeight,z0], axis, angle).map((v,j)=>v+offset[j]);
        const p2 = rotateVector([x0, halfHeight,z0], axis, angle).map((v,j)=>v+offset[j]);
        const p3 = rotateVector([x1, halfHeight,z1], axis, angle).map((v,j)=>v+offset[j]);
        const p4 = rotateVector([x1,-halfHeight,z1], axis, angle).map((v,j)=>v+offset[j]);

        // sides
        vertices.push({ position:p1, color });
        vertices.push({ position:p2, color });
        vertices.push({ position:p3, color });
        vertices.push({ position:p1, color });
        vertices.push({ position:p3, color });
        vertices.push({ position:p4, color });

        // top cap
        const topCenter = rotateVector([0,halfHeight,0], axis, angle).map((v,j)=>v+offset[j]);
        const top1 = rotateVector([x0,halfHeight,z0], axis, angle).map((v,j)=>v+offset[j]);
        const top2 = rotateVector([x1,halfHeight,z1], axis, angle).map((v,j)=>v+offset[j]);
        vertices.push({ position:topCenter, color });
        vertices.push({ position:top1, color });
        vertices.push({ position:top2, color });

        // bottom cap
        const bottomCenter = rotateVector([0,-halfHeight,0], axis, angle).map((v,j)=>v+offset[j]);
        const bottom1 = rotateVector([x0,-halfHeight,z0], axis, angle).map((v,j)=>v+offset[j]);
        const bottom2 = rotateVector([x1,-halfHeight,z1], axis, angle).map((v,j)=>v+offset[j]);
        vertices.push({ position:bottomCenter, color });
        vertices.push({ position:bottom2, color });
        vertices.push({ position:bottom1, color });
    }

    return vertices;
}

/**
 * Create a sphere
 */
function createSphereVertices(radius=1, latBands=20, lonBands=20, color=[1,1,1,1], offset=[0,0,0]){
    const vertices = [];
    for(let lat=0;lat<latBands;lat++){
        const theta1 = lat/latBands*Math.PI;
        const theta2 = (lat+1)/latBands*Math.PI;

        for(let lon=0;lon<lonBands;lon++){
            const phi1 = lon/lonBands*2*Math.PI;
            const phi2 = (lon+1)/lonBands*2*Math.PI;

            const p1 = [radius*Math.sin(theta1)*Math.cos(phi1)+offset[0], radius*Math.cos(theta1)+offset[1], radius*Math.sin(theta1)*Math.sin(phi1)+offset[2]];
            const p2 = [radius*Math.sin(theta2)*Math.cos(phi1)+offset[0], radius*Math.cos(theta2)+offset[1], radius*Math.sin(theta2)*Math.sin(phi1)+offset[2]];
            const p3 = [radius*Math.sin(theta2)*Math.cos(phi2)+offset[0], radius*Math.cos(theta2)+offset[1], radius*Math.sin(theta2)*Math.sin(phi2)+offset[2]];
            const p4 = [radius*Math.sin(theta1)*Math.cos(phi2)+offset[0], radius*Math.cos(theta1)+offset[1], radius*Math.sin(theta1)*Math.sin(phi2)+offset[2]];

            vertices.push({ position:p1, color });
            vertices.push({ position:p2, color });
            vertices.push({ position:p3, color });
            vertices.push({ position:p1, color });
            vertices.push({ position:p3, color });
            vertices.push({ position:p4, color });
        }
    }
    return vertices;
}

/**
 * Create a star
 */
function createStarVertices(outerRadius=1, color=[1,1,0,1], offset=[0,0,0]){
    const vertices = [];
    const points = 5;
    const innerRatio = Math.sin(Math.PI/10)/Math.sin(3*Math.PI/10);
    const total = points*2;
    const angleStep = 2*Math.PI/total;
    const center = [...offset];

    const perimeter = [];
    for(let i=0;i<total;i++){
        const r = i%2===0?outerRadius:outerRadius*innerRatio;
        perimeter.push([r*Math.cos(i*angleStep)+offset[0], r*Math.sin(i*angleStep)+offset[1], offset[2]]);
    }

    for(let i=0;i<total;i++){
        const p1 = perimeter[i];
        const p2 = perimeter[(i+1)%total];
        vertices.push({ position:center, color }, { position:p1, color }, { position:p2, color });
    }

    return vertices;
}

/**
 * Create a torus
 */
function createTorusVertices(majorRadius=1, minorRadius=0.3, radialSegments=32, tubularSegments=16, color=[1,1,1,1], offset=[0,0,0], facing=[0,1,0]){
    const vertices = [];
    const { axis, angle } = computeRotationToDirection(facing);

    for(let i=0;i<radialSegments;i++){
        const theta1 = i/radialSegments*2*Math.PI;
        const theta2 = (i+1)/radialSegments*2*Math.PI;

        for(let j=0;j<tubularSegments;j++){
            const phi1 = j/tubularSegments*2*Math.PI;
            const phi2 = (j+1)/tubularSegments*2*Math.PI;

            const p0 = [(majorRadius+minorRadius*Math.cos(phi1))*Math.cos(theta1), minorRadius*Math.sin(phi1), (majorRadius+minorRadius*Math.cos(phi1))*Math.sin(theta1)];
            const p1 = [(majorRadius+minorRadius*Math.cos(phi1))*Math.cos(theta2), minorRadius*Math.sin(phi1), (majorRadius+minorRadius*Math.cos(phi1))*Math.sin(theta2)];
            const p2 = [(majorRadius+minorRadius*Math.cos(phi2))*Math.cos(theta2), minorRadius*Math.sin(phi2), (majorRadius+minorRadius*Math.cos(phi2))*Math.sin(theta2)];
            const p3 = [(majorRadius+minorRadius*Math.cos(phi2))*Math.cos(theta1), minorRadius*Math.sin(phi2), (majorRadius+minorRadius*Math.cos(phi2))*Math.sin(theta1)];

            const points = [p0,p1,p2,p3].map(p=>rotateVector(p, axis, angle).map((v,i)=>v+offset[i]));

            vertices.push({ position:points[0], color });
            vertices.push({ position:points[1], color });
            vertices.push({ position:points[2], color });

            vertices.push({ position:points[0], color });
            vertices.push({ position:points[2], color });
            vertices.push({ position:points[3], color });
        }
    }

    return vertices;
}

/**
 * Create a triangle
 */
function createTriangleVertices(p1,p2,p3,color=[1,1,1,1]){
    return [
        { position:p1, color },
        { position:p2, color },
        { position:p3, color },
    ];
}

/**
 * @param {WebGLRenderingContext} gl 
 * @returns {WebGLTexture}
 */
function createDeskTexture(gl) {
    return createProceduralTexture(gl, 512, 512, (ctx, width, height) => {
        // Base wood color
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.3, '#A0522D');
        gradient.addColorStop(0.7, '#CD853F');
        gradient.addColorStop(1, '#DEB887');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // wood grain lines
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        
        for (let i = 0; i < 15; i++) {
            const y = (height / 15) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            
            for (let x = 0; x < width; x += 10) {
                const waveY = y + Math.sin(x * 0.02) * 3;
                ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
        
        ctx.fillStyle = '#5D4037';
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 15 + 5;
            
            ctx.beginPath();
            ctx.ellipse(x, y, radius, radius * 0.6, Math.random() * Math.PI, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // texture noise
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const brightness = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    });
}

/**
 * @param {WebGLRenderingContext} gl 
 * @returns {WebGLTexture}
 */
function createFloorTexture(gl) {
    return createProceduralTexture(gl, 512, 512, (ctx, width, height) => {
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(0, 0, width, height);
        
        const tileSize = 32;
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1.5;
        
        // vertical grid lines
        for (let x = 0; x < width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // horizontal grid lines
        for (let y = 0; y < height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Darker grout lines
        ctx.strokeStyle = '#BBBBBB';
        ctx.lineWidth = 0.5;
        
        for (let x = 0; x < width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // individual tile variations
        ctx.globalAlpha = 0.08;
        for (let x = 0; x < width; x += tileSize) {
            for (let y = 0; y < height; y += tileSize) {
                const brightness = Math.random() * 40 - 20; // -20 to +20
                ctx.fillStyle = `rgb(${224 + brightness}, ${224 + brightness}, ${224 + brightness})`;
                ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
            }
        }
        
        // subtle texture noise
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            const brightness = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, size, size);
        }
    });
}

/**
 * @param {WebGLRenderingContext} gl 
 * @returns {WebGLTexture}
 */
function createWallTexture(gl) {
    return createProceduralTexture(gl, 512, 512, (ctx, width, height) => {
        // Base wall color
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(0, 0, width, height);
        
        // vertical texture lines
        ctx.strokeStyle = '#EEEEEE';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        
        for (let i = 0; i < 20; i++) {
            const x = (width / 20) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // shading variation
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    });
}

/**
 * @param {WebGLRenderingContext} gl 
 * @returns {WebGLTexture}
 */
function createCeilingTexture(gl) {
    return createProceduralTexture(gl, 512, 512, (ctx, width, height) => {
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(0, 0, width, height);
        
        const tileSize = 42;
        ctx.strokeStyle = '#E8E8E8';
        ctx.lineWidth = 2;
        
        for (let x = 0; x < width; x += tileSize) {
            for (let y = 0; y < height; y += tileSize) {
                ctx.strokeRect(x, y, tileSize, tileSize);
                
                ctx.fillStyle = '#E0E0E0';
                ctx.globalAlpha = 0.6;
                for (let i = 0; i < 16; i++) {
                    const holeX = x + (Math.random() * (tileSize - 8)) + 4;
                    const holeY = y + (Math.random() * (tileSize - 8)) + 4;
                    ctx.beginPath();
                    ctx.arc(holeX, holeY, 0.8, 0, 2 * Math.PI);
                    ctx.fill();
                }
                
                // individual tile variation
                ctx.globalAlpha = 0.08;
                const brightness = Math.random() * 20 - 10; // -10 to +10
                ctx.fillStyle = `rgb(${250 + brightness}, ${250 + brightness}, ${250 + brightness})`;
                ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
            }
        }
        
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#D0D0D0';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
        
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    });
}

/**
 * Create a picture model
 * @param {number} width Picture width
 * @param {number} height Picture height 
 * @param {number} depth Picture depth (thickness)
 * @param {number[]} offset Position offset [x,y,z]
 * @returns {Vertex[]} Picture vertices
 */
function createPictureVertices(width = 2, height = 1.5, depth = 0.05, offset = [0, 0, 0]) {
    const vertices = [];
    
    vertices.push(...createBoxVertices(width, height, depth, [1, 1, 1, 1], offset));
    
    return vertices;
}

/**
 * Create a small office desk model
 * @param {number[]} color Base color for non-textured parts [r,g,b,a]
 * @param {number[]} offset Position offset [x,y,z]
 * @returns {Vertex[]} Desk vertices
 */
function createSmallDeskVertices(color = [0.4, 0.2, 0.1, 1.0], offset = [0, 0, 0]) {
    const vertices = [];
    const deskWidth = 1.5;
    const deskDepth = 0.8;
    const deskHeight = 0.75;
    const topThickness = 0.05;
    const legThickness = 0.05;
    
    // Desk top
    vertices.push(...createBoxVertices(
        deskWidth, topThickness, deskDepth,
        [0.6, 0.4, 0.2, 1.0],
        [offset[0], offset[1] + deskHeight - topThickness/2, offset[2]]
    ));
    
    // Four legs
    const legHeight = deskHeight - topThickness;
    const legPositions = [
        [offset[0] - deskWidth/2 + legThickness/2, offset[1] + legHeight/2, offset[2] - deskDepth/2 + legThickness/2],
        [offset[0] + deskWidth/2 - legThickness/2, offset[1] + legHeight/2, offset[2] - deskDepth/2 + legThickness/2],
        [offset[0] - deskWidth/2 + legThickness/2, offset[1] + legHeight/2, offset[2] + deskDepth/2 - legThickness/2],
        [offset[0] + deskWidth/2 - legThickness/2, offset[1] + legHeight/2, offset[2] + deskDepth/2 - legThickness/2]
    ];
    
    legPositions.forEach(pos => {
        vertices.push(...createBoxVertices(legThickness, legHeight, legThickness, color, pos));
    });
    
    // Drawer front
    const drawerWidth = deskWidth * 0.3;
    const drawerHeight = 0.15;
    const drawerDepth = 0.02;
    vertices.push(...createBoxVertices(
        drawerWidth, drawerHeight, drawerDepth,
        [0.3, 0.15, 0.05, 1.0],
        [offset[0] - deskWidth/4, offset[1] + deskHeight - topThickness - drawerHeight/2, offset[2] - deskDepth/2 + drawerDepth/2]
    ));
    
    // Drawer handle
    vertices.push(...createCylinderVertices(
        0.01, 0.06, 8,
        [0.8, 0.8, 0.8, 1.0], // Silver handle
        [offset[0] - deskWidth/4, offset[1] + deskHeight - topThickness - drawerHeight/2, offset[2] - deskDepth/2 + drawerDepth + 0.02],
        [0, 0, 1] // Horizontal handle
    ));
    
    return vertices;
}

/**
 * Helper function to create a box cube with proper UV coordinates and normals
 * @param {number} width 
 * @param {number} height 
 * @param {number} depth 
 * @param {number[]} color 
 * @param {number[]} offset 
 * @returns {Vertex[]}
 */
function createBoxVertices(width, height, depth, color = [1,1,1,1], offset = [0,0,0]) {
    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;
    const [x, y, z] = offset;
    
    return [
        // Front face (normal pointing toward +Z)
        { position: [x-w, y-h, z+d], color, uv: [0, 0], normal: [0, 0, 1] },
        { position: [x+w, y-h, z+d], color, uv: [1, 0], normal: [0, 0, 1] },
        { position: [x+w, y+h, z+d], color, uv: [1, 1], normal: [0, 0, 1] },
        { position: [x-w, y-h, z+d], color, uv: [0, 0], normal: [0, 0, 1] },
        { position: [x+w, y+h, z+d], color, uv: [1, 1], normal: [0, 0, 1] },
        { position: [x-w, y+h, z+d], color, uv: [0, 1], normal: [0, 0, 1] },
        
        // Back face (normal pointing toward -Z)
        { position: [x+w, y-h, z-d], color, uv: [0, 0], normal: [0, 0, -1] },
        { position: [x-w, y-h, z-d], color, uv: [1, 0], normal: [0, 0, -1] },
        { position: [x-w, y+h, z-d], color, uv: [1, 1], normal: [0, 0, -1] },
        { position: [x+w, y-h, z-d], color, uv: [0, 0], normal: [0, 0, -1] },
        { position: [x-w, y+h, z-d], color, uv: [1, 1], normal: [0, 0, -1] },
        { position: [x+w, y+h, z-d], color, uv: [0, 1], normal: [0, 0, -1] },
        
        // Top face (normal pointing toward +Y)
        { position: [x-w, y+h, z-d], color, uv: [0, 0], normal: [0, 1, 0] },
        { position: [x-w, y+h, z+d], color, uv: [1, 0], normal: [0, 1, 0] },
        { position: [x+w, y+h, z+d], color, uv: [1, 1], normal: [0, 1, 0] },
        { position: [x-w, y+h, z-d], color, uv: [0, 0], normal: [0, 1, 0] },
        { position: [x+w, y+h, z+d], color, uv: [1, 1], normal: [0, 1, 0] },
        { position: [x+w, y+h, z-d], color, uv: [0, 1], normal: [0, 1, 0] },
        
        // Bottom face (normal pointing toward -Y)
        { position: [x-w, y-h, z+d], color, uv: [0, 0], normal: [0, -1, 0] },
        { position: [x-w, y-h, z-d], color, uv: [1, 0], normal: [0, -1, 0] },
        { position: [x+w, y-h, z-d], color, uv: [1, 1], normal: [0, -1, 0] },
        { position: [x-w, y-h, z+d], color, uv: [0, 0], normal: [0, -1, 0] },
        { position: [x+w, y-h, z-d], color, uv: [1, 1], normal: [0, -1, 0] },
        { position: [x+w, y-h, z+d], color, uv: [0, 1], normal: [0, -1, 0] },
        
        // Right face (normal pointing toward +X)
        { position: [x+w, y-h, z+d], color, uv: [0, 0], normal: [1, 0, 0] },
        { position: [x+w, y-h, z-d], color, uv: [1, 0], normal: [1, 0, 0] },
        { position: [x+w, y+h, z-d], color, uv: [1, 1], normal: [1, 0, 0] },
        { position: [x+w, y-h, z+d], color, uv: [0, 0], normal: [1, 0, 0] },
        { position: [x+w, y+h, z-d], color, uv: [1, 1], normal: [1, 0, 0] },
        { position: [x+w, y+h, z+d], color, uv: [0, 1], normal: [1, 0, 0] },
        
        // Left face (normal pointing toward -X)
        { position: [x-w, y-h, z-d], color, uv: [0, 0], normal: [-1, 0, 0] },
        { position: [x-w, y-h, z+d], color, uv: [1, 0], normal: [-1, 0, 0] },
        { position: [x-w, y+h, z+d], color, uv: [1, 1], normal: [-1, 0, 0] },
        { position: [x-w, y-h, z-d], color, uv: [0, 0], normal: [-1, 0, 0] },
        { position: [x-w, y+h, z+d], color, uv: [1, 1], normal: [-1, 0, 0] },
        { position: [x-w, y+h, z-d], color, uv: [0, 1], normal: [-1, 0, 0] },
    ];
}

/**
 * Kitchen floor texture
 * @param {WebGLRenderingContext} gl 
 * @returns {WebGLTexture}
 */
function createKitchenFloorTexture(gl) {
    return createProceduralTexture(gl, 512, 512, (ctx, width, height) => {
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(0, 0, width, height);
        
        const tileSize = 64; // Larger tiles than office
        ctx.strokeStyle = '#A0A0A0';
        ctx.lineWidth = 2;
        
        // vertical grid lines
        for (let x = 0; x < width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // horizontal grid lines
        for (let y = 0; y < height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // darker grout lines
        ctx.strokeStyle = '#8A8A8A';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // individual tile variations
        ctx.globalAlpha = 0.1;
        for (let x = 0; x < width; x += tileSize) {
            for (let y = 0; y < height; y += tileSize) {
                const variation = Math.random() * 30 - 15; // -15 to +15
                const r = Math.min(255, Math.max(0, 210 + variation));
                const g = Math.min(255, Math.max(0, 180 + variation));
                const b = Math.min(255, Math.max(0, 140 + variation));
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
            }
        }
        
        // texture noise
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 1;
            const brightness = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, size, size);
        }
    });
}

/**
 * @param {WebGLRenderingContext} gl 
 * @returns {WebGLTexture}
 */
function createCabinetTexture(gl) {
    return createProceduralTexture(gl, 256, 256, (ctx, width, height) => {
        // Base cabinet color
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, width, height);
        
        // wood grain effect
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#654321');
        gradient.addColorStop(0.3, '#8B4513');
        gradient.addColorStop(0.7, '#A0522D');
        gradient.addColorStop(1, '#8B4513');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // wood grain lines
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        
        for (let i = 0; i < 20; i++) {
            const y = (height / 20) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            
            for (let x = 0; x < width; x += 8) {
                const waveY = y + Math.sin(x * 0.03) * 2;
                ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
        
        // panel frame effect
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, width - 20, height - 20);
        
        // inner panel
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;
        ctx.strokeRect(15, 15, width - 30, height - 30);
    });
}

/**
 * office chair model
 * @param {number[]} baseColor Base color for chair frame [r,g,b,a]
 * @param {number[]} seatColor Color for seat and backrest [r,g,b,a]
 * @param {number[]} offset Position offset [x,y,z]
 * @param {number} rotation Rotation in degrees (0 = backrest faces -Z, 90 = faces +X, etc.)
 * @returns {Vertex[]} Office chair vertices
 */
function createOfficeChairVertices(baseColor = [0.2, 0.2, 0.2, 1.0], seatColor = [0.3, 0.3, 0.3, 1.0], offset = [0, 0, 0], rotation = 0) {
    const vertices = [];
    const chairHeight = 0.9;
    const seatHeight = 0.46;
    const seatWidth = 0.52;
    const seatDepth = 0.48;
    const seatThickness = 0.1;
    const backrestHeight = 0.45;
    const backrestWidth = 0.5;
    const backrestThickness = 0.08;
    
    // Convert rotation to radians
    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    
    // Helper function to rotate a point around Y-axis and apply offset
    function rotateAndOffset(x, y, z) {
        const rotX = x * cos - z * sin;
        const rotZ = x * sin + z * cos;
        return [rotX + offset[0], y + offset[1], rotZ + offset[2]];
    }
    
    // Seat cushion
    const seatVertices = createBoxVertices(seatWidth, seatThickness, seatDepth, seatColor);
    seatVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + seatHeight, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...seatVertices);
    
    // Seat cushion border
    const seatBorderVertices = createBoxVertices(seatWidth + 0.02, seatThickness * 0.3, seatDepth + 0.02, [seatColor[0] * 0.8, seatColor[1] * 0.8, seatColor[2] * 0.8, seatColor[3]]);
    seatBorderVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + seatHeight + seatThickness/2, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...seatBorderVertices);
    
    // Backrest
    const backrestX = 0;
    const backrestY = seatHeight + backrestHeight/2;
    const backrestZ = -seatDepth/2 + backrestThickness/2 - 0.05;
    
    const backrestVertices = createBoxVertices(backrestWidth, backrestHeight, backrestThickness, seatColor);
    backrestVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0] + backrestX, vertex.position[1] + backrestY, vertex.position[2] + backrestZ);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...backrestVertices);
    
    // Lumbar support
    const lumbarVertices = createBoxVertices(backrestWidth * 0.7, backrestHeight * 0.3, backrestThickness * 0.5, [seatColor[0] * 1.1, seatColor[1] * 1.1, seatColor[2] * 1.1, seatColor[3]]);
    lumbarVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0] + backrestX, vertex.position[1] + seatHeight + 0.15, vertex.position[2] + backrestZ + 0.02);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...lumbarVertices);
    
    const postRadius = 0.028;
    const postHeight = seatHeight - 0.18;
    const postVertices = createCylinderVertices(postRadius, postHeight, 16, baseColor);
    postVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + postHeight/2 + 0.1, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...postVertices);
    
    const cylinderRadius = 0.045;
    const cylinderHeight = 0.18;
    const cylinderVertices = createCylinderVertices(cylinderRadius, cylinderHeight, 16, [0.8, 0.8, 0.9, 1.0]);
    cylinderVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + cylinderHeight/2 + 0.01, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...cylinderVertices);
    
    // circular base
    const baseRadius = 0.25;
    const baseHeight = 0.05;
    const baseVertices = createCylinderVertices(baseRadius, baseHeight, 16, baseColor);
    baseVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + baseHeight/2, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...baseVertices);
    
    const hubRadius = 0.07;
    const hubHeight = 0.05;
    const hubVertices = createCylinderVertices(hubRadius, hubHeight, 16, [baseColor[0] * 1.2, baseColor[1] * 1.2, baseColor[2] * 1.2, baseColor[3]]);
    hubVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + hubHeight/2, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...hubVertices);
    
    const supportWidth = 0.4;
    const supportDepth = 0.35;
    const supportHeight = 0.04;
    const supportVertices = createBoxVertices(supportWidth, supportHeight, supportDepth, baseColor);
    supportVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0], vertex.position[1] + seatHeight - seatThickness/2 - supportHeight/2, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...supportVertices);
    
    // armrests
    const armrestWidth = 0.08;
    const armrestLength = 0.25;
    const armrestHeight = 0.03;
    const armrestY = seatHeight + 0.18;
    
    // Left armrest
    const leftArmrestVertices = createBoxVertices(armrestWidth, armrestHeight, armrestLength, [baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8, baseColor[3]]);
    leftArmrestVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0] - seatWidth/2 - armrestWidth/2, vertex.position[1] + armrestY, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...leftArmrestVertices);
    
    // Right armrest
    const rightArmrestVertices = createBoxVertices(armrestWidth, armrestHeight, armrestLength, [baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8, baseColor[3]]);
    rightArmrestVertices.forEach(vertex => {
        const [newX, newY, newZ] = rotateAndOffset(vertex.position[0] + seatWidth/2 + armrestWidth/2, vertex.position[1] + armrestY, vertex.position[2]);
        vertex.position = [newX, newY, newZ];
    });
    vertices.push(...rightArmrestVertices);
    
    // Armrest support posts
    const armPostHeight = 0.15;
    const armPostRadius = 0.012;
    
    // Left armrest posts
    for (let i = 0; i < 2; i++) {
        const postZ = -armrestLength/3 + (i * armrestLength/1.5);
        const leftPostVertices = createCylinderVertices(armPostRadius, armPostHeight, 8, baseColor);
        leftPostVertices.forEach(vertex => {
            const [newX, newY, newZ] = rotateAndOffset(vertex.position[0] - seatWidth/2 - armrestWidth/2, vertex.position[1] + seatHeight + armPostHeight/2 + 0.03, vertex.position[2] + postZ);
            vertex.position = [newX, newY, newZ];
        });
        vertices.push(...leftPostVertices);
    }
    
    // Right armrest posts
    for (let i = 0; i < 2; i++) {
        const postZ = -armrestLength/3 + (i * armrestLength/1.5);
        const rightPostVertices = createCylinderVertices(armPostRadius, armPostHeight, 8, baseColor);
        rightPostVertices.forEach(vertex => {
            const [newX, newY, newZ] = rotateAndOffset(vertex.position[0] + seatWidth/2 + armrestWidth/2, vertex.position[1] + seatHeight + armPostHeight/2 + 0.03, vertex.position[2] + postZ);
            vertex.position = [newX, newY, newZ];
        });
        vertices.push(...rightPostVertices);
    }
    
    return vertices;
}
