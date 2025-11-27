const EntityType = Object.freeze({
    STATIC: 'static',
    DYNAMIC: 'dynamic',
});

class Entity {

    /** @type {Model} */
    #model;

    /** @type {number[]} */
    #position;

    /** @type {number[]} */
    #rotation;

    /** @type {number[]} */
    #scale;

    /** @type {string} */
    #entity_type;

    constructor(model, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], entity_type) {
        this.model = model;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.#entity_type = entity_type;
    }

    get model() {
        return this.#model;
    }

    set model(value) {
        this.#model = value;
    }

    get position() {
        return this.#position;
    }

    set position(value) {
        if (value.length !== 3) {
            throw new Error("Position must be a 3D vector");
        }
        this.#position = value;
    }

    get rotation() {
        return this.#rotation;
    }

    set rotation(value) {
        if (value.length !== 3) {
            throw new Error("Rotation must be a 3D vector");
        }
        this.#rotation = value;
    }

    get scale() {
        return this.#scale;
    }

    set scale(value) {
        if (value.length !== 3) {
            throw new Error("Scale must be a 3D vector");
        }
        this.#scale = value;
    }

    get entity_type() {
        return this.#entity_type;
    }

    getModelMatrix() {
        const modelMatrix = new Matrix4();
        modelMatrix.setTranslate(this.position[0], this.position[1], this.position[2]);
        modelMatrix.rotate(this.rotation[0], 1, 0, 0);
        modelMatrix.rotate(this.rotation[1], 0, 1, 0);
        modelMatrix.rotate(this.rotation[2], 0, 0, 1);
        modelMatrix.scale(this.scale[0], this.scale[1], this.scale[2]);
        return modelMatrix;
    }
}

class Model {
    /**
     * 
     * @param {WebGLContext} gl 
     * @param {Vertex[]} vertices 
     */
    constructor(gl, vertices) {
        this.vertexCount = vertices.length;

        const positions = [];
        const colors = [];
        const normals = [];

        for (let v of vertices) {
            positions.push(...v.position);
            colors.push(...(v.color ?? [1,1,1,1]));
        }

        for (let i = 0; i < this.vertexCount; i += 3) {
            const normal = computeFaceNormalOfTriangle(
                positions.slice((i + 0) * 3, (i + 0) * 3 + 3),
                positions.slice((i + 1) * 3, (i + 1) * 3 + 3),
                positions.slice((i + 2) * 3, (i + 2) * 3 + 3),
            );
            normals.splice((i + 0) * 3, 3, ...normal);
            normals.splice((i + 1) * 3, 3, ...normal);
            normals.splice((i + 2) * 3, 3, ...normal);
        }

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    }
}

class Vertex {
    /**
     * 
     * @param {number[]} position 
     * @param {number[] | undefined} color 
     * @param {number[] | undefined} normal 
     * @param {number[] | undefined} uv 
     */
    constructor(position, color = undefined, uv = undefined) {
        this.position = position;
        this.color = color;
        this.normal = undefined;
        this.uv = uv;
    }
}

/**
 * 
 * @param {number[]} v1 
 * @param {number[]} v2 
 * @param {number[]} v3 
 * @returns {number[]}
 */
function computeFaceNormalOfTriangle(v1, v2, v3) {
    const U = [
        v2[0] - v1[0],
        v2[1] - v1[1],
        v2[2] - v1[2],
    ];
    const V = [
        v3[0] - v1[0],
        v3[1] - v1[1],
        v3[2] - v1[2],
    ];

    const normal = [
        U[1] * V[2] - U[2] * V[1],
        U[2] * V[0] - U[0] * V[2],
        U[0] * V[1] - U[1] * V[0],
    ];

    const length = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
    return normal.map(n => n / length);
}
