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
        
        this.children = [];
        this.parent = null;
        this.localTransform = true; // Whether to use local or world coordinates
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

    /**
     * Add a child entity to this compound object
     * @param {Entity} child 
     */
    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        return this;
    }

    /**
     * Remove a child entity
     * @param {Entity} child 
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
        return this;
    }

    /**
     * Get all descendant entities (children, grandchildren, etc.)
     * @returns {Entity[]}
     */
    getAllDescendants() {
        const descendants = [];
        for (const child of this.children) {
            descendants.push(child);
            descendants.push(...child.getAllDescendants());
        }
        return descendants;
    }

    /**
     * Apply transformation relative to parent
     * @param {Matrix4} parentMatrix 
     * @returns {Matrix4}
     */
    getModelMatrix(parentMatrix = null) {
        const modelMatrix = new Matrix4();
        modelMatrix.setTranslate(this.position[0], this.position[1], this.position[2]);
        modelMatrix.rotate(this.rotation[0], 1, 0, 0);
        modelMatrix.rotate(this.rotation[1], 0, 1, 0);
        modelMatrix.rotate(this.rotation[2], 0, 0, 1);
        modelMatrix.scale(this.scale[0], this.scale[1], this.scale[2]);
        
        if (parentMatrix && this.localTransform) {
            const combinedMatrix = new Matrix4();
            combinedMatrix.set(parentMatrix);
            combinedMatrix.multiply(modelMatrix);
            return combinedMatrix;
        }
        
        return modelMatrix;
    }

    /**
     * Set rotation for this entity and optionally all children
     * @param {number[]} rotation 
     * @param {boolean} recursive 
     */
    setRotation(rotation, recursive = false) {
        this.rotation = rotation;
        if (recursive) {
            for (const child of this.children) {
                child.setRotation(rotation, recursive);
            }
        }
    }

    /**
     * Rotate this entity and optionally all children by delta amounts
     * @param {number[]} deltaRotation 
     * @param {boolean} recursive 
     */
    rotateBy(deltaRotation, recursive = false) {
        this.rotation = [
            this.rotation[0] + deltaRotation[0],
            this.rotation[1] + deltaRotation[1],
            this.rotation[2] + deltaRotation[2]
        ];
        
        if (recursive) {
            for (const child of this.children) {
                child.rotateBy(deltaRotation, recursive);
            }
        }
    }
}

class Model {
    /**
     * 
     * @param {WebGLContext} gl 
     * @param {Vertex[]} vertices 
     * @param {WebGLTexture | WebGLTexture[] | null} texture - Single texture, array of textures, or null
     * @param {MaterialGroup[] | null} materialGroups - Optional material groups for multi-texture support
     */
    constructor(gl, vertices, texture = null, materialGroups = null) {
        this.vertexCount = vertices.length;
        this.texture = texture;
        this.materialGroups = materialGroups;
        this.isMultiTexture = Array.isArray(texture) || (materialGroups && materialGroups.length > 0);

        const positions = [];
        const colors = [];
        const normals = [];
        const uvs = [];
        const materialIndices = [];

        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            positions.push(...v.position);
            colors.push(...(v.color ?? [1,1,1,1]));
            normals.push(...(v.normal ?? [0,0,0]));
            uvs.push(...(v.uv ?? [0,0]));
            // Add material index for multi-texture support
            materialIndices.push(v.materialIndex ?? 0);
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

        // Material index buffer
        this.materialIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.materialIndexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(materialIndices), gl.STATIC_DRAW);
    }

    /**
     * Get the appropriate texture for a given material index
     * @param {number} materialIndex 
     * @returns {WebGLTexture | null}
     */
    getTextureForMaterial(materialIndex) {
        if (!this.isMultiTexture) {
            return this.texture;
        }
        
        if (Array.isArray(this.texture)) {
            return this.texture[materialIndex] || this.texture[0] || null;
        }
        
        if (this.materialGroups && this.materialGroups[materialIndex]) {
            return this.materialGroups[materialIndex].texture;
        }
        
        return null;
    }

    /**
     * Get all unique textures used by this model
     * @returns {WebGLTexture[]}
     */
    getAllTextures() {
        if (!this.isMultiTexture) {
            return this.texture ? [this.texture] : [];
        }
        
        if (Array.isArray(this.texture)) {
            const textures = [];
            for (let i = 0; i < this.texture.length; i++) {
                if (this.texture[i] !== null) {
                    textures.push(this.texture[i]);
                }
            }
            return textures;
        }
        
        if (this.materialGroups) {
            const textures = [];
            for (let i = 0; i < this.materialGroups.length; i++) {
                if (this.materialGroups[i].texture !== null) {
                    textures.push(this.materialGroups[i].texture);
                }
            }
            return textures;
        }
        
        return [];
    }

    /**
     * Get material groups for rendering optimization
     * @returns {MaterialGroup[]}
     */
    getMaterialGroups() {
        if (this.materialGroups) {
            return this.materialGroups;
        }
        
        if (this.isMultiTexture && Array.isArray(this.texture)) {
            const groups = [];
            for (let i = 0; i < this.texture.length; i++) {
                groups.push(new MaterialGroup(i, this.texture[i]));
            }
            return groups;
        }
        
        return [new MaterialGroup(0, this.texture)];
    }
}

/**
 * Represents a group of vertices that share the same material/texture
 */
class MaterialGroup {
    /**
     * @param {number} materialIndex - Index of the material
     * @param {WebGLTexture | null} texture - Texture for this material
     * @param {number} startVertex - Starting vertex index (optional, for optimization)
     * @param {number} vertexCount - Number of vertices in this group (optional, for optimization)
     */
    constructor(materialIndex, texture, startVertex = 0, vertexCount = null) {
        this.materialIndex = materialIndex;
        this.texture = texture;
        this.startVertex = startVertex;
        this.vertexCount = vertexCount;
    }
}

class Vertex {
    /**
     * 
     * @param {number[]} position 
     * @param {number[] | undefined} color 
     * @param {number[] | undefined} normal 
     * @param {number[] | undefined} uv 
     * @param {number | undefined} materialIndex
     */
    constructor(position, color = undefined, normal = undefined, uv = undefined, materialIndex = 0) {
        this.position = position;
        this.color = color;
        this.normal = normal;
        this.uv = uv;
        this.materialIndex = materialIndex;
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
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
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
