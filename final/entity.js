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
     * @param {WebGLTexture | null} texture - Optional texture to use instead of vertex colors
     */
    constructor(gl, vertices, texture = null) {
        this.vertexCount = vertices.length;
        this.texture = texture;

        const positions = [];
        const colors = [];
        const normals = [];
        const uvs = [];

        for (let v of vertices) {
            positions.push(...v.position);
            colors.push(...(v.color ?? [1,1,1,1]));
            normals.push(...(v.normal ?? [0,0,0]));
            uvs.push(...(v.uv ?? [0,0]));
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

        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
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
    constructor(position, color = undefined, normal = undefined, uv = undefined) {
        this.position = position;
        this.color = color;
        this.normal = normal;
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

/**
 * Create a texture from an image URL
 * @param {WebGLRenderingContext} gl 
 * @param {string} imageUrl 
 * @returns {Promise<WebGLTexture>}
 */
function createTexture(gl, imageUrl) {
    return new Promise((resolve, reject) => {
        const texture = gl.createTexture();
        const image = new Image();
        
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
            // Set texture parameters
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
            
            resolve(texture);
        };
        
        image.onerror = function() {
            reject(new Error('Failed to load image: ' + imageUrl));
        };
        
        image.src = imageUrl;
    });
}

/**
 * Create a texture from a canvas with procedurally generated content
 * @param {WebGLRenderingContext} gl 
 * @param {number} width 
 * @param {number} height 
 * @param {function(CanvasRenderingContext2D, number, number): void} drawFunction 
 * @returns {WebGLTexture}
 */
function createProceduralTexture(gl, width, height, drawFunction) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    drawFunction(ctx, width, height);
    
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    
    // Set texture parameters
    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    
    return texture;
}

/**
 * Check if a value is a power of 2
 * @param {number} value 
 * @returns {boolean}
 */
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}
