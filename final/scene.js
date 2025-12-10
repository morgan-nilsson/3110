/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 * @import * from './entity.js'
 */

const VSHADER = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_TransformMatrix;

    attribute vec4 a_Color;
    varying vec4 v_Color;

    attribute vec3 a_Normal;
    uniform mat3 u_NormalMatrix;

    uniform vec3 u_AmbientColor;

    // Multiple light support
    #define MAX_POINT_LIGHTS 8
    #define MAX_DIRECTIONAL_LIGHTS 4

    uniform int u_numPointLights;
    uniform int u_numDirectionalLights;

    // Point lights arrays
    uniform vec3 u_pointLightPositions[MAX_POINT_LIGHTS];
    uniform vec3 u_pointLightColors[MAX_POINT_LIGHTS];
    uniform float u_pointLightIntensities[MAX_POINT_LIGHTS];

    // Directional lights arrays
    uniform vec3 u_directionalLightDirections[MAX_DIRECTIONAL_LIGHTS];
    uniform vec3 u_directionalLightColors[MAX_DIRECTIONAL_LIGHTS];
    uniform float u_directionalLightIntensities[MAX_DIRECTIONAL_LIGHTS];

    // Texture mapping
    attribute vec2 a_TexCoord;
    varying vec2 v_TexCoord;
    uniform bool u_UseTexture;

    void main() {
        vec4 worldPos = u_ModelMatrix * a_Position;
        gl_Position = u_TransformMatrix * worldPos;
        
        vec3 normal = normalize(u_NormalMatrix * a_Normal);

        // Start with ambient lighting
        vec3 lighting = u_AmbientColor;

        // Calculate directional lights
        for (int i = 0; i < MAX_DIRECTIONAL_LIGHTS; i++) {
            if (i >= u_numDirectionalLights) break;
            
                        vec3 lightDir = normalize(-u_directionalLightDirections[i]);
            float diff = max(dot(normal, lightDir), 0.0);
            lighting += u_directionalLightColors[i] * u_directionalLightIntensities[i] * diff;
        }

        // Calculate point lights
        for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
            if (i >= u_numPointLights) break;
            
            vec3 lightDir = normalize(u_pointLightPositions[i] - worldPos.xyz);
            float distance = length(u_pointLightPositions[i] - worldPos.xyz);
            float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);
            
            float diff = max(dot(normal, lightDir), 0.0);
            lighting += u_pointLightColors[i] * u_pointLightIntensities[i] * diff * attenuation;
        }

        if (u_UseTexture) {
            v_TexCoord = a_TexCoord;
        }

        v_Color = vec4(a_Color.rgb * lighting, a_Color.a);
    }
`

const FSHADER = `
    precision mediump float;
    varying vec4 v_Color;
    varying vec2 v_TexCoord;

    uniform sampler2D u_Sampler;
    uniform bool u_UseTexture;

    void main() {
        if (u_UseTexture) {
            gl_FragColor = texture2D(u_Sampler, v_TexCoord);
        } else {
            gl_FragColor = v_Color;
        }
    }
`

class Scene {

    /** @type {Entity[]} */
    #entities;

    /** @type {Camera} */
    #camera;

    /** @type {number[]} */
    #sky_box_color;

    /** @type {DirectionalLightSource[]} */
    #directional_light_sources;

    /** @type {LightSource[]} */
    #light_sources;

    /** @type {number} */
    #ambient_light_intensity;

    /** @type {number[]} */
    #ambient_light_color;

    /** @type {WebGLContext} */
    #gl;

    /** @type {number} */
    #a_Position;
    
    /** @type {number} */
    #a_Color;

    /** @type {number} */
    #a_TexCoord;

    /** @type {WebGLUniformLocation} */
    #u_ModelMatrix;

    /** @type {WebGLUniformLocation} */
    #u_transformMatrix;

    /** @type {WebGLUniformLocation} */
    #u_AmbientColor;

    /** @type {WebGLUniformLocation} */
    #u_UseTexture;

    /** @type {WebGLUniformLocation} */
    #u_Sampler;

    /** @type {number} */
    #NUM_DIRECTIONAL_LIGHTS;

    /** @type {WebGLUniformLocation} */
    #u_DirectionalColor;

    /** @type {WebGLUniformLocation} */
    #u_DirectionalDir;

    /** @type {number} */
    #NUM_POINT_LIGHTS;

    /** @type {WebGLUniformLocation} */
    #u_PointColor;

    /** @type {WebGLUniformLocation} */
    #u_PointPos;

    #a_normal;
    
    #u_NormalMatrix;

    #u_numPointLights;
    #u_numDirectionalLights;
    #u_pointLightPositions;
    #u_pointLightColors;
    #u_pointLightIntensities;
    #u_directionalLightDirections;
    #u_directionalLightColors;
    #u_directionalLightIntensities;

    /**
     * Initialize Scene with WebGL context and shaders
     * @param {HTMLCanvasElement} canvas - The canvas element
     */
    constructor(canvas) {
        // Initialize WebGL context
        this.#gl = getWebGLContext(canvas);
        if (!this.#gl) {
            throw new Error('Failed to get the rendering context for WebGL');
        }

        // Initialize shaders
        if (!initShaders(this.#gl, VSHADER, FSHADER)) {
            throw new Error('Failed to initialize shaders.');
        }

        // Get attribute locations
        this.#a_Position = this.#gl.getAttribLocation(this.#gl.program, 'a_Position');
        if (this.#a_Position < 0) {
            throw new Error('Failed to get the storage location of a_Position');
        }

        this.#a_Color = this.#gl.getAttribLocation(this.#gl.program, 'a_Color');
        if (this.#a_Color < 0) {
            throw new Error('Failed to get the storage location of a_Color');
        }

        this.#a_normal = this.#gl.getAttribLocation(this.#gl.program, 'a_Normal');
        if (this.#a_normal < 0) {
            throw new Error('Failed to get the storage location of a_Normal');
        }

        this.#a_TexCoord = this.#gl.getAttribLocation(this.#gl.program, 'a_TexCoord');
        if (this.#a_TexCoord < 0) {
            throw new Error('Failed to get the storage location of a_TexCoord');
        }

        // Get uniform locations
        this.#u_ModelMatrix = this.#gl.getUniformLocation(this.#gl.program, 'u_ModelMatrix');
        if (!this.#u_ModelMatrix) {
            throw new Error('Failed to get the storage location of u_ModelMatrix');
        }

        this.#u_transformMatrix = this.#gl.getUniformLocation(this.#gl.program, 'u_TransformMatrix');
        if (!this.#u_transformMatrix) {
            throw new Error('Failed to get the storage location of u_TransformMatrix');
        }

        this.#u_AmbientColor = this.#gl.getUniformLocation(this.#gl.program, 'u_AmbientColor');
        if (!this.#u_AmbientColor) {
            throw new Error('Failed to get the storage location of u_AmbientColor');
        }

        this.#u_NormalMatrix = this.#gl.getUniformLocation(this.#gl.program, 'u_NormalMatrix');
        if (!this.#u_NormalMatrix) {
            throw new Error('Failed to get the storage location of u_NormalMatrix');
        }

        this.#u_UseTexture = this.#gl.getUniformLocation(this.#gl.program, 'u_UseTexture');
        if (!this.#u_UseTexture) {
            throw new Error('Failed to get the storage location of u_UseTexture');
        }

        this.#u_Sampler = this.#gl.getUniformLocation(this.#gl.program, 'u_Sampler');
        if (!this.#u_Sampler) {
            throw new Error('Failed to get the storage location of u_Sampler');
        }

        // Get multiple light uniform locations
        this.#u_numPointLights = this.#gl.getUniformLocation(this.#gl.program, 'u_numPointLights');
        this.#u_numDirectionalLights = this.#gl.getUniformLocation(this.#gl.program, 'u_numDirectionalLights');
        
        this.#u_pointLightPositions = this.#gl.getUniformLocation(this.#gl.program, 'u_pointLightPositions');
        this.#u_pointLightColors = this.#gl.getUniformLocation(this.#gl.program, 'u_pointLightColors');
        this.#u_pointLightIntensities = this.#gl.getUniformLocation(this.#gl.program, 'u_pointLightIntensities');
        
        this.#u_directionalLightDirections = this.#gl.getUniformLocation(this.#gl.program, 'u_directionalLightDirections');
        this.#u_directionalLightColors = this.#gl.getUniformLocation(this.#gl.program, 'u_directionalLightColors');
        this.#u_directionalLightIntensities = this.#gl.getUniformLocation(this.#gl.program, 'u_directionalLightIntensities');

        // Set up WebGL state
        this.#gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.#gl.enable(this.#gl.DEPTH_TEST);

        // Initialize scene properties
        this.#entities = [];
        this.#camera = new Camera(
            [0, 0, 5],
            [0, 0, 0],
            [0, 1, 0],
            45,
            1.0,
            0.1,
            100
        );
        this.sky_box_color = [0.5, 0.7, 1.0, 1.0];
        this.#directional_light_sources = [];
        this.#light_sources = [];
        this.#ambient_light_intensity = 0.2;
        this.#ambient_light_color = [1.0, 1.0, 1.0];
        
        // Set maximum light limits
        this.maxPointLights = 8;
        this.maxDirectionalLights = 4;
    }

    get ambient_light_intensity() {
        return this.#ambient_light_intensity;
    }

    set ambient_light_intensity(value) {
        this.#ambient_light_intensity = value;
    }

    get ambient_light_color() {
        return this.#ambient_light_color;
    }

    set ambient_light_color(value) {
        this.#ambient_light_color = value;
    }

    get entities() {
        return this.#entities;
    }

    get camera() {
        return this.#camera;
    }
    
    get sky_box_color() {
        return this.#sky_box_color;
    }

    set sky_box_color(value) {
        this.#sky_box_color = value;
    }

    get directional_light_sources() {
        return this.#directional_light_sources;
    }

    get light_sources() {
        return this.#light_sources;
    }

    get gl() {
        return this.#gl;
    }

    /**
     * Add a directional light source to the scene
     * @param {number[]} direction - Light direction vector
     * @param {number[]} color - Light color [r, g, b]
     * @param {number} intensity - Light intensity
     * @returns {DirectionalLightSource} - The created directional light source
     */
    addDirectionalLightSource(direction, color, intensity) {
        const light = new DirectionalLightSource(direction, color, intensity);
        this.#directional_light_sources.push(light);
        return light;
    }

    /**
     * Add a point light source to the scene
     * @param {number[]} position - Light position [x, y, z]
     * @param {number[]} color - Light color [r, g, b]
     * @param {number} intensity - Light intensity
     * @returns {LightSource} - The created point light source
     */
    addLightSource(position, color, intensity) {
        const light = new LightSource(position, color, intensity);
        this.#light_sources.push(light);
        return light;
    }

    drawScene() {
        const viewMatrix = this.camera.getViewMatrix();
        const gl = this.#gl;

        // Set the ambient light
        gl.uniform3fv(this.#u_AmbientColor, this.#ambient_light_color.map(c => c * this.#ambient_light_intensity));

        // Update multiple light uniforms
        this.#updateLightUniforms();

        // Set the perspective-view matrix
        const vpMatrix = new Matrix4();
        vpMatrix.setPerspective(
            this.camera.fov,
            this.camera.aspect,
            this.camera.near,
            this.camera.far
        );
        vpMatrix.multiply(viewMatrix);
        gl.uniformMatrix4fv(this.#u_transformMatrix, false, vpMatrix.elements);

        gl.clearColor(...this.sky_box_color);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw each entity
        for (let entity of this.entities) {
            const modelMatrix = entity.getModelMatrix();
            gl.uniformMatrix4fv(this.#u_ModelMatrix, false, modelMatrix.elements);
        
            // Compute model-view matrix
            const modelViewMatrix = new Matrix4();
            modelViewMatrix.set(viewMatrix).multiply(modelMatrix);
        
            // Normal matrix: 3x3 inverse transpose of model-view matrix
            const normalMatrix = new Matrix4();
            normalMatrix.setInverseOf(modelViewMatrix);
            normalMatrix.transpose();
        
            // Convert 4x4 to 3x3 for shader
            const normalMatrix3 = new Float32Array([
                normalMatrix.elements[0], normalMatrix.elements[1], normalMatrix.elements[2],
                normalMatrix.elements[4], normalMatrix.elements[5], normalMatrix.elements[6],
                normalMatrix.elements[8], normalMatrix.elements[9], normalMatrix.elements[10]
            ]);
            gl.uniformMatrix3fv(this.#u_NormalMatrix, false, normalMatrix3);
        
            this.#drawModel(
                this.#gl, 
                entity.model, 
                this.#a_Position, 
                this.#a_Color, 
                this.#a_normal, 
                this.#u_NormalMatrix
            );
        }
    }

    #updateLightUniforms() {
        const gl = this.#gl;

        // Set number of active lights
        gl.uniform1i(this.#u_numPointLights, Math.min(this.light_sources.length, this.maxPointLights));
        gl.uniform1i(this.#u_numDirectionalLights, Math.min(this.directional_light_sources.length, this.maxDirectionalLights));

        // Update point light arrays
        const pointPositions = new Float32Array(this.maxPointLights * 3);
        const pointColors = new Float32Array(this.maxPointLights * 3);
        const pointIntensities = new Float32Array(this.maxPointLights);

        for (let i = 0; i < Math.min(this.light_sources.length, this.maxPointLights); i++) {
            const light = this.light_sources[i];
            pointPositions.set(light.position, i * 3);
            pointColors.set(light.color, i * 3);
            pointIntensities[i] = light.intensity;
        }

        gl.uniform3fv(this.#u_pointLightPositions, pointPositions);
        gl.uniform3fv(this.#u_pointLightColors, pointColors);
        gl.uniform1fv(this.#u_pointLightIntensities, pointIntensities);

        // Update directional light arrays
        const dirDirections = new Float32Array(this.maxDirectionalLights * 3);
        const dirColors = new Float32Array(this.maxDirectionalLights * 3);
        const dirIntensities = new Float32Array(this.maxDirectionalLights);

        for (let i = 0; i < Math.min(this.directional_light_sources.length, this.maxDirectionalLights); i++) {
            const light = this.directional_light_sources[i];
            dirDirections.set(light.direction, i * 3);
            dirColors.set(light.color, i * 3);
            dirIntensities[i] = light.intensity;
        }

        gl.uniform3fv(this.#u_directionalLightDirections, dirDirections);
        gl.uniform3fv(this.#u_directionalLightColors, dirColors);
        gl.uniform1fv(this.#u_directionalLightIntensities, dirIntensities);
    }

    /**
     * Generate normals for a triangle-based mesh
     * @param {Float32Array} vertices - Vertex positions (x,y,z for each vertex)
     * @returns {Float32Array} - Generated normals
     */
    #generateFlatNormals(vertices) {
        const normals = new Float32Array(vertices.length);
        
        // Process triangles (3 vertices per triangle, 3 components per vertex)
        for (let i = 0; i < vertices.length; i += 9) {
            // Get triangle vertices
            const v0 = [vertices[i], vertices[i + 1], vertices[i + 2]];
            const v1 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
            const v2 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];
            
            // Calculate face normal using cross product
            const normal = this.#calculateFaceNormal(v0, v1, v2);
            
            // Assign the same normal to all 3 vertices of the triangle
            for (let j = 0; j < 3; j++) {
                const baseIndex = i + j * 3;
                normals[baseIndex] = normal[0];
                normals[baseIndex + 1] = normal[1];
                normals[baseIndex + 2] = normal[2];
            }
        }
        
        return normals;
    }

    /**
     * Calculate face normal for a triangle
     * @param {number[]} v0 - First vertex
     * @param {number[]} v1 - Second vertex  
     * @param {number[]} v2 - Third vertex
     * @returns {number[]} - Normalized face normal
     */
    #calculateFaceNormal(v0, v1, v2) {
        // Calculate edge vectors
        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        
        // Cross product
        const normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ];
        
        // Normalize
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        if (length > 0) {
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
        }
        
        return normal;
    }

    /**
     * Generate smooth normals by averaging face normals at shared vertices
     * @param {Float32Array} vertices - Vertex positions
     * @param {number} tolerance - Distance tolerance for considering vertices as shared
     * @returns {Float32Array} - Smooth normals
     */
    #generateSmoothNormals(vertices, tolerance = 0.0001) {
        const vertexCount = vertices.length / 3;
        const normals = new Float32Array(vertices.length);
        
        // Build vertex groups for shared vertices
        const vertexGroups = [];
        for (let i = 0; i < vertexCount; i++) {
            const v = [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]];
            
            // Find existing group or create new one
            let foundGroup = false;
            for (let group of vertexGroups) {
                const representative = group[0];
                const repV = [vertices[representative * 3], vertices[representative * 3 + 1], vertices[representative * 3 + 2]];
                
                // Check if vertices are close enough to be considered the same
                const dist = Math.sqrt(
                    Math.pow(v[0] - repV[0], 2) +
                    Math.pow(v[1] - repV[1], 2) +
                    Math.pow(v[2] - repV[2], 2)
                );
                
                if (dist < tolerance) {
                    group.push(i);
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                vertexGroups.push([i]);
            }
        }
        
        // Calculate face normals and accumulate for each vertex group
        for (let i = 0; i < vertices.length; i += 9) {
            const v0 = [vertices[i], vertices[i + 1], vertices[i + 2]];
            const v1 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
            const v2 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];
            
            const faceNormal = this.#calculateFaceNormal(v0, v1, v2);
            
            // Add face normal to all vertices in this triangle's groups
            for (let j = 0; j < 3; j++) {
                const vertexIndex = (i / 3) + j;
                normals[vertexIndex * 3] += faceNormal[0];
                normals[vertexIndex * 3 + 1] += faceNormal[1];
                normals[vertexIndex * 3 + 2] += faceNormal[2];
            }
        }
        
        // Normalize accumulated normals for each vertex group
        for (let group of vertexGroups) {
            // Calculate average normal for the group
            let avgNormal = [0, 0, 0];
            for (let vertexIndex of group) {
                avgNormal[0] += normals[vertexIndex * 3];
                avgNormal[1] += normals[vertexIndex * 3 + 1];
                avgNormal[2] += normals[vertexIndex * 3 + 2];
            }
            
            const length = Math.sqrt(avgNormal[0] ** 2 + avgNormal[1] ** 2 + avgNormal[2] ** 2);
            if (length > 0) {
                avgNormal[0] /= length;
                avgNormal[1] /= length;
                avgNormal[2] /= length;
            }
            
            // Apply the averaged normal to all vertices in the group
            for (let vertexIndex of group) {
                normals[vertexIndex * 3] = avgNormal[0];
                normals[vertexIndex * 3 + 1] = avgNormal[1];
                normals[vertexIndex * 3 + 2] = avgNormal[2];
            }
        }
        
        return normals;
    }

    /**
     * Check if a model has valid normals
     * @param {Vertex[]} vertices - Array of vertex objects
     * @returns {boolean} - True if all vertices have valid normals
     */
    #hasValidNormals(vertices) {
        return vertices.every(vertex => 
            vertex.normal && 
            vertex.normal.length === 3 && 
            vertex.normal.some(n => n !== 0)
        );
    }

    /**
     * Enhanced spawn entity that can auto-generate normals
     * @param {Object} model - The model object or vertex array
     * @param {Object} options - Options for normal generation
     * @param {boolean} options.autoNormals - Whether to auto-generate normals
     * @param {boolean} options.smooth - Whether to use smooth normals
     * @param {number} options.tolerance - Tolerance for smooth normal vertex merging
     * @returns {Entity} - The spawned entity
     */
    spawnEntity(model, options = {}) {
        const { autoNormals = true, smooth = false, tolerance = 0.0001 } = options;
        
        // Handle both Model objects and raw vertex arrays
        let finalModel = model;
        if (Array.isArray(model)) {
            // It's a vertex array, create a Model object
            const needsNormals = autoNormals && !this.#hasValidNormals(model);
            
            if (needsNormals) {
                // Extract positions for normal generation
                const positions = [];
                model.forEach(vertex => {
                    positions.push(...vertex.position);
                });
                
                // Generate normals
                const positionsArray = new Float32Array(positions);
                const generatedNormals = smooth ? 
                    this.#generateSmoothNormals(positionsArray, tolerance) : 
                    this.#generateFlatNormals(positionsArray);
                
                // Apply generated normals to vertices
                const enhancedVertices = model.map((vertex, index) => ({
                    ...vertex,
                    normal: [
                        generatedNormals[index * 3],
                        generatedNormals[index * 3 + 1],
                        generatedNormals[index * 3 + 2]
                    ]
                }));
                
                finalModel = new Model(this.#gl, enhancedVertices);
            } else {
                finalModel = new Model(this.#gl, model);
            }
        }
        
        const entity = new Entity(finalModel);
        this.entities.push(entity);
        return entity;
    }

    #drawModel(gl, model, a_Position, a_Color, a_Normal) {
        // Set up position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Set up color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
        gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Color);

        // Set up normal attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        // Set up texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, model.uvBuffer);
        gl.vertexAttribPointer(this.#a_TexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.#a_TexCoord);

        // Handle texture or color rendering
        if (model.texture) {
            // Use texture
            gl.uniform1i(this.#u_UseTexture, true);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, model.texture);
            gl.uniform1i(this.#u_Sampler, 0);
        } else {
            // Use vertex colors
            gl.uniform1i(this.#u_UseTexture, false);
        }

        gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
    }
}


class Camera {

    /** @type {number[]} */
    #position;

    /** @type {number[]} */
    #target;

    /** @type {number[]} */
    #up;

    /** @type {number} */
    #fov;

    /** @type {number} */
    #aspect;

    /** @type {number} */
    #near;

    /** @type {number} */
    #far;

    /**
     * @param {number[]} position 
     * @param {number[]} target 
     * @param {number[]} up 
     * @param {number} fov 
     * @param {number} aspect 
     * @param {number} near 
     * @param {number} far 
     */
    constructor(position, target, up, fov, aspect, near, far) {
        this.position = position;
        this.target = target;
        this.up = up;
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
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
    
    get target() {
        return this.#target;
    }

    set target(value) {
        if (value.length !== 3) {
            throw new Error("Target must be a 3D vector");
        }
        this.#target = value;
    }
    
    get up() {
        return this.#up;
    }

    set up(value) {
        if (value.length !== 3) {
            throw new Error("Up must be a 3D vector");
        }
        this.#up = value;
    }

    get fov() {
        return this.#fov;
    }
    
    set fov(value) {
        if (value <= 0 || value >= 180) {
            throw new Error("FOV must be between 0 and 180 degrees");
        }
        this.#fov = value;
    }

    get aspect() {
        return this.#aspect;
    }

    set aspect(value) {
        if (value <= 0) {
            throw new Error("Aspect ratio must be greater than 0");
        }
        this.#aspect = value;
    }

    get near() {
        return this.#near;
    }

    set near(value) {
        if (value <= 0) {
            throw new Error("Near plane must be greater than 0");
        }
        if (value >= this.far) {
            throw new Error("Near plane must be less than far plane");
        }
        this.#near = value;
    }

    get far() {
        return this.#far;
    }

    set far(value) {
        if (value <= 0) {
            throw new Error("Far plane must be greater than 0");
        }
        if (value <= this.near) {
            throw new Error("Far plane must be greater than near plane");
        }
        this.#far = value;
    }

    getViewMatrix() {
        const viewMatrix = new Matrix4();
        viewMatrix.setLookAt(
            this.position[0], this.position[1], this.position[2],
            this.target[0], this.target[1], this.target[2],
            this.up[0], this.up[1], this.up[2]
        );
        return viewMatrix;
    }
}

class DirectionalLightSource {
    /**
     * 
     * @param {number[]} direction 
     * @param {number[]} color 
     * @param {number} intensity 
     */
    constructor(direction, color, intensity) {
        this.direction = direction;
        this.color = color;
        this.intensity = intensity;
    }
}

class LightSource {
    /**
     * 
     * @param {number[]} position 
     * @param {number[]} color 
     * @param {number} intensity 
     */
    constructor(position, color, intensity) {
        this.position = position;
        this.color = color;
        this.intensity = intensity;
    }
}