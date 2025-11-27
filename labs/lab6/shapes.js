/**
 * Create a plane with correct normals
 */
function createPlaneVertices(size = 1, color = [1,1,1,1]) {
    const normal = [0,1,0];
    return [
        { position: [-size,0,-size], color, normal },
        { position: [ size,0,-size], color, normal },
        { position: [ size,0, size], color, normal },

        { position: [-size,0,-size], color, normal },
        { position: [ size,0, size], color, normal },
        { position: [-size,0, size], color, normal },
    ];
}

/**
 * Rodrigues rotation helper
 * @param {[number, number, number]} v - Vector to rotate
 * @param {[number, number, number]} axis - Rotation axis (normalized)
 * @param {number} angle - Rotation angle in radians
 * @returns {[number, number, number]} - Rotated vector
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
 * @param {[number, number, number]} dir - Target direction
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
 * Create a circle in XY-plane with normals
 */
function createCircleVertices(radius = 1, segments = 20, color = [1,1,1,1], offset=[0,0,0], facing=[0,1,0]) {
    const vertices = [];
    const { axis, angle } = computeRotationToDirection(facing);

    const center = rotateVector([0,0,0], axis, angle).map((v,i)=>v+offset[i]);
    const normal = rotateVector([0,1,0], axis, angle);

    for(let i=0; i<segments; i++){
        const theta1 = (i/segments)*2*Math.PI;
        const theta2 = ((i+1)/segments)*2*Math.PI;

        const p1 = rotateVector([radius*Math.cos(theta1),0,radius*Math.sin(theta1)], axis, angle)
                    .map((v,i)=>v+offset[i]);
        const p2 = rotateVector([radius*Math.cos(theta2),0,radius*Math.sin(theta2)], axis, angle)
                    .map((v,i)=>v+offset[i]);

        vertices.push({ position:center, color, normal });
        vertices.push({ position:p1, color, normal });
        vertices.push({ position:p2, color, normal });
    }

    return vertices;
}

/**
 * Cylinder with correct normals and winding
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

        const n1 = rotateVector([x0,0,z0].map(v=>v/radius), axis, angle);
        const n2 = rotateVector([x0,0,z0].map(v=>v/radius), axis, angle);
        const n3 = rotateVector([x1,0,z1].map(v=>v/radius), axis, angle);
        const n4 = rotateVector([x1,0,z1].map(v=>v/radius), axis, angle);

        // sides
        vertices.push({ position:p1, color, normal:n1 });
        vertices.push({ position:p2, color, normal:n2 });
        vertices.push({ position:p3, color, normal:n3 });
        vertices.push({ position:p1, color, normal:n1 });
        vertices.push({ position:p3, color, normal:n3 });
        vertices.push({ position:p4, color, normal:n4 });

        // top cap
        const topCenter = rotateVector([0,halfHeight,0], axis, angle).map((v,j)=>v+offset[j]);
        const topNormal = rotateVector([0,1,0], axis, angle);
        const top1 = rotateVector([x0,halfHeight,z0], axis, angle).map((v,j)=>v+offset[j]);
        const top2 = rotateVector([x1,halfHeight,z1], axis, angle).map((v,j)=>v+offset[j]);
        vertices.push({ position:topCenter, color, normal:topNormal });
        vertices.push({ position:top1, color, normal:topNormal });
        vertices.push({ position:top2, color, normal:topNormal });

        // bottom cap
        const bottomCenter = rotateVector([0,-halfHeight,0], axis, angle).map((v,j)=>v+offset[j]);
        const bottomNormal = rotateVector([0,-1,0], axis, angle);
        const bottom1 = rotateVector([x0,-halfHeight,z0], axis, angle).map((v,j)=>v+offset[j]);
        const bottom2 = rotateVector([x1,-halfHeight,z1], axis, angle).map((v,j)=>v+offset[j]);
        vertices.push({ position:bottomCenter, color, normal:bottomNormal });
        vertices.push({ position:bottom2, color, normal:bottomNormal });
        vertices.push({ position:bottom1, color, normal:bottomNormal });
    }

    return vertices;
}

/**
 * Sphere with per-vertex normals
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

            const n1 = [(p1[0]-offset[0])/radius, (p1[1]-offset[1])/radius, (p1[2]-offset[2])/radius];
            const n2 = [(p2[0]-offset[0])/radius, (p2[1]-offset[1])/radius, (p2[2]-offset[2])/radius];
            const n3 = [(p3[0]-offset[0])/radius, (p3[1]-offset[1])/radius, (p3[2]-offset[2])/radius];
            const n4 = [(p4[0]-offset[0])/radius, (p4[1]-offset[1])/radius, (p4[2]-offset[2])/radius];

            vertices.push({ position:p1, color, normal:n1 });
            vertices.push({ position:p2, color, normal:n2 });
            vertices.push({ position:p3, color, normal:n3 });
            vertices.push({ position:p1, color, normal:n1 });
            vertices.push({ position:p3, color, normal:n3 });
            vertices.push({ position:p4, color, normal:n4 });
        }
    }
    return vertices;
}

/**
 * Star in XY-plane (flat normals)
 */
function createStarVertices(outerRadius=1, color=[1,1,0,1], offset=[0,0,0]){
    const vertices = [];
    const points = 5;
    const innerRatio = Math.sin(Math.PI/10)/Math.sin(3*Math.PI/10);
    const total = points*2;
    const angleStep = 2*Math.PI/total;
    const center = [...offset];
    const normal = [0,0,1];

    const perimeter = [];
    for(let i=0;i<total;i++){
        const r = i%2===0?outerRadius:outerRadius*innerRatio;
        perimeter.push([r*Math.cos(i*angleStep)+offset[0], r*Math.sin(i*angleStep)+offset[1], offset[2]]);
    }

    for(let i=0;i<total;i++){
        const p1 = perimeter[i];
        const p2 = perimeter[(i+1)%total];
        vertices.push({ position:center, color, normal }, { position:p1, color, normal }, { position:p2, color, normal });
    }

    return vertices;
}

/**
 * Torus with per-vertex normals
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

            const normals = points.map(p=>{
                const cx = p[0]-offset[0];
                const cy = p[1]-offset[1];
                const cz = p[2]-offset[2];
                const nx = cx - (majorRadius*Math.cos(Math.atan2(cz,cx)));
                const nz = cz - (majorRadius*Math.sin(Math.atan2(cz,cx)));
                const ny = cy;
                const len = Math.hypot(nx,ny,nz);
                return len===0?[0,1,0]:[nx/len,ny/len,nz/len];
            });

            vertices.push({ position:points[0], color, normal:normals[0] });
            vertices.push({ position:points[1], color, normal:normals[1] });
            vertices.push({ position:points[2], color, normal:normals[2] });

            vertices.push({ position:points[0], color, normal:normals[0] });
            vertices.push({ position:points[2], color, normal:normals[2] });
            vertices.push({ position:points[3], color, normal:normals[3] });
        }
    }

    return vertices;
}

/**
 * Single triangle with normal
 */
function createTriangleVertices(p1,p2,p3,color=[1,1,1,1]){
    const normal = computeFaceNormalOfTriangle(p1,p2,p3);
    return [
        { position:p1, color, normal },
        { position:p2, color, normal },
        { position:p3, color, normal },
    ];
}
