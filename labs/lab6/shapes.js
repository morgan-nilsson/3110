/**
 * Create a plane
 */
function createPlaneVertices(size = 1, color = [1, 1, 1, 1]) {
    return [
        { position: [-size, 0, -size], color },
        { position: [size, 0, -size], color },
        { position: [size, 0, size], color },

        { position: [-size, 0, -size], color },
        { position: [size, 0, size], color },
        { position: [-size, 0, size], color },
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
 * Create a circle
 */
function createCircleVertices(radius = 1, segments = 20, color = [1,1,1,1], offset = [0,0,0], facing = [0,1,0]) {
    const vertices = [];
    const { axis, angle } = computeRotationToDirection(facing);

    const center = rotateVector([0,0,0], axis, angle).map((v,i) => v + offset[i]);

    for (let i = 0; i < segments; i++) {
        const theta1 = (i / segments) * 2 * Math.PI;
        const theta2 = ((i + 1) / segments) * 2 * Math.PI;
        const p1 = rotateVector([radius*Math.cos(theta1), 0, radius*Math.sin(theta1)], axis, angle)
                      .map((v,i)=>v+offset[i]);
        const p2 = rotateVector([radius*Math.cos(theta2), 0, radius*Math.sin(theta2)], axis, angle)
                      .map((v,i)=>v+offset[i]);

        vertices.push({ position: center, color }, { position: p1, color }, { position: p2, color });
    }
    return vertices;
}

/**
 * Create a cylinder
 */
function createCylinderVertices(radius = 1, height = 1, segments = 20, color = [1,1,1,1], offset = [0,0,0], facing = [0,1,0]) {
    const vertices = [];
    const halfHeight = height / 2;
    const { axis, angle } = computeRotationToDirection(facing);

    const circlePoints = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * 2 * Math.PI;
        circlePoints.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }

    for (let i = 0; i < segments; i++) {
        const [x0,z0] = circlePoints[i];
        const [x1,z1] = circlePoints[i+1];

        const p1 = rotateVector([x0, -halfHeight, z0], axis, angle).map((v,i)=>v+offset[i]);
        const p2 = rotateVector([x0, halfHeight, z0], axis, angle).map((v,i)=>v+offset[i]);
        const p3 = rotateVector([x1, halfHeight, z1], axis, angle).map((v,i)=>v+offset[i]);
        const p4 = rotateVector([x1, -halfHeight, z1], axis, angle).map((v,i)=>v+offset[i]);

        // sides
        vertices.push({ position: p1, color }, { position: p2, color }, { position: p3, color });
        vertices.push({ position: p1, color }, { position: p3, color }, { position: p4, color });

        // top cap
        const topCenter = rotateVector([0, halfHeight, 0], axis, angle).map((v,i)=>v+offset[i]);
        const top1 = rotateVector([x0, halfHeight, z0], axis, angle).map((v,i)=>v+offset[i]);
        const top2 = rotateVector([x1, halfHeight, z1], axis, angle).map((v,i)=>v+offset[i]);
        vertices.push({ position: topCenter, color }, { position: top1, color }, { position: top2, color });

        // bottom cap
        const bottomCenter = rotateVector([0, -halfHeight, 0], axis, angle).map((v,i)=>v+offset[i]);
        const bottom1 = rotateVector([x0, -halfHeight, z0], axis, angle).map((v,i)=>v+offset[i]);
        const bottom2 = rotateVector([x1, -halfHeight, z1], axis, angle).map((v,i)=>v+offset[i]);
        vertices.push({ position: bottomCenter, color }, { position: bottom2, color }, { position: bottom1, color });
    }

    return vertices;
}

/**
 * Create a sphere
 */
function createSphereVertices(radius = 1, latitudeBands = 20, longitudeBands = 20, color = [1,1,1,1], offset = [0,0,0]) {
    const vertices = [];
    for (let lat = 0; lat < latitudeBands; lat++) {
        const theta1 = (lat / latitudeBands) * Math.PI;
        const theta2 = ((lat + 1) / latitudeBands) * Math.PI;
        for (let lon = 0; lon < longitudeBands; lon++) {
            const phi1 = (lon / longitudeBands) * 2 * Math.PI;
            const phi2 = ((lon + 1) / longitudeBands) * 2 * Math.PI;

            const p1 = [radius*Math.sin(theta1)*Math.cos(phi1)+offset[0], radius*Math.cos(theta1)+offset[1], radius*Math.sin(theta1)*Math.sin(phi1)+offset[2]];
            const p2 = [radius*Math.sin(theta2)*Math.cos(phi1)+offset[0], radius*Math.cos(theta2)+offset[1], radius*Math.sin(theta2)*Math.sin(phi1)+offset[2]];
            const p3 = [radius*Math.sin(theta2)*Math.cos(phi2)+offset[0], radius*Math.cos(theta2)+offset[1], radius*Math.sin(theta2)*Math.sin(phi2)+offset[2]];
            const p4 = [radius*Math.sin(theta1)*Math.cos(phi2)+offset[0], radius*Math.cos(theta1)+offset[1], radius*Math.sin(theta1)*Math.sin(phi2)+offset[2]];

            vertices.push({ position: p1, color }, { position: p2, color }, { position: p3, color });
            vertices.push({ position: p1, color }, { position: p3, color }, { position: p4, color });
        }
    }
    return vertices;
}

/**
 * Create a star in XY-plane
 */
function createStarVertices(outerRadius = 1, color = [1,1,0,1], offset = [0,0,0]) {
    const vertices = [];
    const points = 5;
    const innerRatio = Math.sin(Math.PI / 10) / Math.sin(3 * Math.PI / 10);
    const total = points * 2;
    const angleStep = (2 * Math.PI) / total;
    const center = [...offset];
    const perimeter = [];

    for (let i = 0; i < total; i++) {
        const r = (i % 2 === 0) ? outerRadius : outerRadius * innerRatio;
        perimeter.push([r * Math.cos(i*angleStep) + offset[0], r * Math.sin(i*angleStep) + offset[1], offset[2]]);
    }

    for (let i = 0; i < total; i++) {
        const p1 = perimeter[i];
        const p2 = perimeter[(i+1)%total];
        vertices.push({ position: center, color }, { position: p1, color }, { position: p2, color });
    }

    return vertices;
}

/**
 * Create a torus
 */
function createTorusVertices(majorRadius = 1, minorRadius = 0.3, radialSegments = 32, tubularSegments = 16, color = [1,1,1,1], offset = [0,0,0], facing = [0,1,0]) {
    const vertices = [];
    const { axis, angle } = computeRotationToDirection(facing);

    for (let i = 0; i < radialSegments; i++) {
        const theta1 = (i / radialSegments) * 2 * Math.PI;
        const theta2 = ((i + 1) / radialSegments) * 2 * Math.PI;

        for (let j = 0; j < tubularSegments; j++) {
            const phi1 = (j / tubularSegments) * 2 * Math.PI;
            const phi2 = ((j + 1) / tubularSegments) * 2 * Math.PI;

            const points = [
                [(majorRadius + minorRadius*Math.cos(phi1))*Math.cos(theta1), minorRadius*Math.sin(phi1), (majorRadius + minorRadius*Math.cos(phi1))*Math.sin(theta1)],
                [(majorRadius + minorRadius*Math.cos(phi1))*Math.cos(theta2), minorRadius*Math.sin(phi1), (majorRadius + minorRadius*Math.cos(phi1))*Math.sin(theta2)],
                [(majorRadius + minorRadius*Math.cos(phi2))*Math.cos(theta2), minorRadius*Math.sin(phi2), (majorRadius + minorRadius*Math.cos(phi2))*Math.sin(theta2)],
                [(majorRadius + minorRadius*Math.cos(phi2))*Math.cos(theta1), minorRadius*Math.sin(phi2), (majorRadius + minorRadius*Math.cos(phi2))*Math.sin(theta1)],
            ].map(p => rotateVector(p, axis, angle).map((v,i)=>v+offset[i]));

            vertices.push({ position: points[0], color }, { position: points[1], color }, { position: points[2], color });
            vertices.push({ position: points[0], color }, { position: points[2], color }, { position: points[3], color });
        }
    }

    return vertices;
}

/**
 * Create a single triangle
 */
function createTriangleVertices(p1, p2, p3, color = [1,1,1,1]) {
    return [
        { position: p1, color },
        { position: p2, color },
        { position: p3, color },
    ];
}
