// Version 2.0
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
    #define MAX_POINT_LIGHTS 20
    #define MAX_DIRECTIONAL_LIGHTS 4
    
    uniform int u_numPointLights;
    uniform vec3 u_pointLightPositions[MAX_POINT_LIGHTS];
    uniform vec3 u_pointLightColors[MAX_POINT_LIGHTS];
    uniform float u_pointLightIntensities[MAX_POINT_LIGHTS];

    uniform int u_numDirectionalLights;
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
        vec3 lighting = u_AmbientColor;

        // Calculate directional lights
        for (int i = 0; i < MAX_DIRECTIONAL_LIGHTS; i++) {
            if (i >= u_numDirectionalLights) break;
            
            vec3 lightDir = normalize(-u_directionalLightDirections[i]);
            float diff = max(dot(normal, lightDir), 0.0);
            lighting += u_directionalLightColors[i] * u_directionalLightIntensities[i] * diff;
        }

        // Calculate point lights with attenuation
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
`;

const FSHADER = `
    precision mediump float;
    varying vec4 v_Color;
    varying vec2 v_TexCoord;
    uniform sampler2D u_Sampler;
    uniform bool u_UseTexture;

    void main() {
        if (u_UseTexture) {
            vec4 textureColor = texture2D(u_Sampler, v_TexCoord);
            gl_FragColor = vec4(textureColor.rgb * v_Color.rgb, textureColor.a);
        } else {
            gl_FragColor = v_Color;
        }
    }
`;

class Scene {
    /**
     * Creates a new scene with WebGL context
     * @param {HTMLCanvasElement} canvas - The HTML canvas element
     */
    constructor(canvas) {
        this.gl = getWebGLContext(canvas);
        if (!this.gl) {
            throw new Error('Failed to get WebGL context');
        }

        if (!initShaders(this.gl, VSHADER, FSHADER)) {
            throw new Error('Failed to initialize shaders');
        }

        this._initializeAttributes();
        this._initializeUniforms();
        this._setupWebGL();
        this._initializeSceneState();
    }

    /** Initialize shader attribute locations */
    _initializeAttributes() {
        const gl = this.gl;
        this.a_Position = gl.getAttribLocation(gl.program, 'a_Position');
        this.a_Color = gl.getAttribLocation(gl.program, 'a_Color');
        this.a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
        this.a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    }

    /** Initialize shader uniform locations */
    _initializeUniforms() {
        const gl = this.gl;
        this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
        this.u_TransformMatrix = gl.getUniformLocation(gl.program, 'u_TransformMatrix');
        this.u_AmbientColor = gl.getUniformLocation(gl.program, 'u_AmbientColor');
        this.u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
        this.u_UseTexture = gl.getUniformLocation(gl.program, 'u_UseTexture');
        this.u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
        
        // Point light uniforms
        this.u_numPointLights = gl.getUniformLocation(gl.program, 'u_numPointLights');
        this.u_pointLightPositions = gl.getUniformLocation(gl.program, 'u_pointLightPositions');
        this.u_pointLightColors = gl.getUniformLocation(gl.program, 'u_pointLightColors');
        this.u_pointLightIntensities = gl.getUniformLocation(gl.program, 'u_pointLightIntensities');
        
        // Directional light uniforms
        this.u_numDirectionalLights = gl.getUniformLocation(gl.program, 'u_numDirectionalLights');
        this.u_directionalLightDirections = gl.getUniformLocation(gl.program, 'u_directionalLightDirections');
        this.u_directionalLightColors = gl.getUniformLocation(gl.program, 'u_directionalLightColors');
        this.u_directionalLightIntensities = gl.getUniformLocation(gl.program, 'u_directionalLightIntensities');
    }

    /** Configure WebGL settings */
    _setupWebGL() {
        const gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    /** Initialize scene state variables */
    _initializeSceneState() {
        this.entities = [];
        this.camera = new Camera([0, 0, 5], [0, 0, 0], [0, 1, 0], 45, 1.0, 0.1, 100);
        this.sky_box_color = [0.5, 0.7, 1.0, 1.0];
        this.light_sources = [];
        this.directional_light_sources = [];
        this.ambient_light_intensity = 0.2;
        this.ambient_light_color = [1.0, 1.0, 1.0];
        this.lightsDirty = true;
        this.maxPointLights = 20;
        this.maxDirectionalLights = 4;
    }

    /**
     * Add point light to scene
     * @param {number[]} position - Light position [x, y, z]
     * @param {number[]} color - Light color [r, g, b]
     * @param {number} intensity - Light intensity
     */
    addLightSource(position, color, intensity) {
        this.light_sources.push({ position, color, intensity });
        this.lightsDirty = true;
    }

    /**
     * Add directional light to scene
     * @param {number[]} direction - Light direction [x, y, z]
     * @param {number[]} color - Light color [r, g, b]
     * @param {number} intensity - Light intensity
     */
    addDirectionalLightSource(direction, color, intensity) {
        this.directional_light_sources.push({ direction, color, intensity });
        this.lightsDirty = true;
    }

    /** Render the scene */
    drawScene() {
        const gl = this.gl;
        const viewMatrix = this.camera.getViewMatrix();

        // Set ambient light
        const ambientColor = this.ambient_light_color.map(c => c * this.ambient_light_intensity);
        gl.uniform3fv(this.u_AmbientColor, ambientColor);

        // Update lights
        this._updateLights();

        // Set view-projection matrix
        const vpMatrix = new Matrix4();
        vpMatrix.setPerspective(this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
        vpMatrix.multiply(viewMatrix);
        gl.uniformMatrix4fv(this.u_TransformMatrix, false, vpMatrix.elements);

        // Clear screen
        gl.clearColor(...this.sky_box_color);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let entity of this.entities) {
            if (!entity.parent) {
                this._drawEntityHierarchy(entity, viewMatrix);
            }
        }
    }

    /**
     * Draw entity and children recursively
     * @param {Entity} entity - The entity to draw
     * @param {Matrix4} viewMatrix - View transformation matrix
     * @param {Matrix4} parentMatrix - Parent transformation matrix
     */
    _drawEntityHierarchy(entity, viewMatrix, parentMatrix = null) {
        const gl = this.gl;
        
        // Calculate this entity's model matrix
        const modelMatrix = entity.getModelMatrix(parentMatrix);
        
        // Draw this entity if it has a model
        if (entity.model) {
            gl.uniformMatrix4fv(this.u_ModelMatrix, false, modelMatrix.elements);
            
            const normalMatrix = this._computeNormalMatrix(viewMatrix, modelMatrix);
            gl.uniformMatrix3fv(this.u_NormalMatrix, false, normalMatrix);
            
            this._drawModel(entity.model);
        }
        
        // Draw all children
        for (const child of entity.children) {
            this._drawEntityHierarchy(child, viewMatrix, modelMatrix);
        }
    }

    /** Update light uniforms if dirty */
    _updateLights() {
        if (!this.lightsDirty) return;
        
        const gl = this.gl;
        
        // Update point lights
        const numPointLights = Math.min(this.light_sources.length, this.maxPointLights);
        gl.uniform1i(this.u_numPointLights, numPointLights);
        
        if (numPointLights > 0) {
            const positions = new Float32Array(this.maxPointLights * 3);
            const colors = new Float32Array(this.maxPointLights * 3);
            const intensities = new Float32Array(this.maxPointLights);
            
            for (let i = 0; i < numPointLights; i++) {
                const light = this.light_sources[i];
                positions.set(light.position, i * 3);
                colors.set(light.color, i * 3);
                intensities[i] = light.intensity;
            }
            
            gl.uniform3fv(this.u_pointLightPositions, positions);
            gl.uniform3fv(this.u_pointLightColors, colors);
            gl.uniform1fv(this.u_pointLightIntensities, intensities);
        }
        
        // Update directional lights
        const numDirectionalLights = Math.min(this.directional_light_sources.length, this.maxDirectionalLights);
        gl.uniform1i(this.u_numDirectionalLights, numDirectionalLights);
        
        if (numDirectionalLights > 0) {
            const directions = new Float32Array(this.maxDirectionalLights * 3);
            const colors = new Float32Array(this.maxDirectionalLights * 3);
            const intensities = new Float32Array(this.maxDirectionalLights);
            
            for (let i = 0; i < numDirectionalLights; i++) {
                const light = this.directional_light_sources[i];
                directions.set(light.direction, i * 3);
                colors.set(light.color, i * 3);
                intensities[i] = light.intensity;
            }
            
            gl.uniform3fv(this.u_directionalLightDirections, directions);
            gl.uniform3fv(this.u_directionalLightColors, colors);
            gl.uniform1fv(this.u_directionalLightIntensities, intensities);
        }
        
        this.lightsDirty = false;
    }

    /**
     * Compute normal matrix for lighting
     * @param {Matrix4} viewMatrix - View matrix
     * @param {Matrix4} modelMatrix - Model matrix
     * @returns {Float32Array} Normal matrix
     */
    _computeNormalMatrix(viewMatrix, modelMatrix) {
        const modelViewMatrix = new Matrix4();
        modelViewMatrix.set(viewMatrix).multiply(modelMatrix);
        
        const normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(modelViewMatrix);
        normalMatrix.transpose();
        
        return new Float32Array([
            normalMatrix.elements[0], normalMatrix.elements[1], normalMatrix.elements[2],
            normalMatrix.elements[4], normalMatrix.elements[5], normalMatrix.elements[6], 
            normalMatrix.elements[8], normalMatrix.elements[9], normalMatrix.elements[10]
        ]);
    }

    /**
     * Render a model with textures
     * @param {Model} model - The model to render
     */
    _drawModel(model) {
        const gl = this.gl;
        
        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
        gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
        gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_Color);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
        gl.vertexAttribPointer(this.a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_Normal);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.uvBuffer);
        gl.vertexAttribPointer(this.a_TexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.a_TexCoord);

        // Handle multi-texture models
        if (model.isMultiTexture) {
            this._drawMultiTextureModel(model);
        } else {
            // Single texture or no texture
            if (model.texture) {
                gl.uniform1i(this.u_UseTexture, true);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, model.texture);
                gl.uniform1i(this.u_Sampler, 0);
            } else {
                gl.uniform1i(this.u_UseTexture, false);
            }

            gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
        }
    }

    /**
     * Render multi-texture model
     * @param {Model} model - Multi-texture model
     */
    _drawMultiTextureModel(model) {
        const gl = this.gl;
        const materialGroups = model.getMaterialGroups();
        
        for (let materialIndex = 0; materialIndex < materialGroups.length; materialIndex++) {
            const materialGroup = materialGroups[materialIndex];
            
            if (materialGroup.texture) {
                gl.uniform1i(this.u_UseTexture, true);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, materialGroup.texture);
                gl.uniform1i(this.u_Sampler, 0);
            } else {
                gl.uniform1i(this.u_UseTexture, false);
            }
            
            let vertexStart = 0;
            let vertexCount = 0;
            
            for (let i = 0; i < model.vertexCount; i++) {
                const faceIndex = Math.floor(i / 6);
                if (faceIndex === materialIndex) {
                    if (vertexCount === 0) {
                        vertexStart = i;
                    }
                    vertexCount++;
                } else if (vertexCount > 0) {
                    break;
                }
            }
            
            if (vertexCount > 0) {
                gl.drawArrays(gl.TRIANGLES, vertexStart, vertexCount);
            }
        }
    }
}

class Camera {
    /**
     * Creates a new camera
     * @param {number[]} position - Camera position [x, y, z]
     * @param {number[]} target - Look-at target [x, y, z]
     * @param {number[]} up - Up vector [x, y, z]
     * @param {number} fov - Field of view in degrees
     * @param {number} aspect - Aspect ratio
     * @param {number} near - Near clipping plane
     * @param {number} far - Far clipping plane
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

    /**
     * Get view transformation matrix
     * @returns {Matrix4} View matrix
     */
    getViewMatrix() {
        const viewMatrix = new Matrix4();
        viewMatrix.setLookAt(
            ...this.position, ...this.target, ...this.up
        );
        return viewMatrix;
    }
}

class SceneBuilder {
    /**
     * Creates scene builder
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    constructor(canvas) {
        this.scene = new Scene(canvas);
        this.assets = new AssetManager(this.scene.gl);
    }

    /**
     * Set sky background color
     * @param {number} r - Red component
     * @param {number} g - Green component
     * @param {number} b - Blue component
     * @param {number} a - Alpha component
     * @returns {SceneBuilder} This builder
     */
    skyColor(r, g, b, a = 1.0) {
        this.scene.sky_box_color = [r, g, b, a];
        return this;
    }

    /**
     * Set ambient lighting
     * @param {number} intensity - Light intensity
     * @param {number[]} color - Light color [r, g, b]
     * @returns {SceneBuilder} This builder
     */
    ambientLight(intensity, color = [1, 1, 1]) {
        this.scene.ambient_light_intensity = intensity;
        this.scene.ambient_light_color = color;
        return this;
    }

    /**
     * Create camera builder
     * @returns {CameraBuilder} Camera builder
     */
    camera() {
        return new CameraBuilder(this);
    }

    /**
     * Create point light builder
     * @returns {PointLightBuilder} Point light builder
     */
    pointLight() {
        return new PointLightBuilder(this);
    }

    /**
     * Create directional light builder
     * @returns {DirectionalLightBuilder} Directional light builder
     */
    directionalLight() {
        return new DirectionalLightBuilder(this);
    }

    /**
     * Create cube builder
     * @returns {CubeBuilder} Cube builder
     */
    cube() {
        return new CubeBuilder(this);
    }

    /**
     * Create sphere builder
     * @param {number} radius - Sphere radius
     * @param {number} latBands - Latitude bands
     * @param {number} lonBands - Longitude bands
     * @returns {SphereBuilder} Sphere builder
     */
    sphere(radius = 1, latBands = 20, lonBands = 20) {
        return new SphereBuilder(this, radius, latBands, lonBands);
    }

    /**
     * Create plane builder
     * @param {number} size - Plane size
     * @returns {PlaneBuilder} Plane builder
     */
    plane(size = 1) {
        return new PlaneBuilder(this, size);
    }

    /**
     * Create cylinder builder
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @param {number} segments - Number of segments
     * @returns {CylinderBuilder} Cylinder builder
     */
    cylinder(radius = 1, height = 1, segments = 20) {
        return new CylinderBuilder(this, radius, height, segments);
    }

    /**
     * Create model builder
     * @returns {ModelBuilder} Model builder
     */
    model() {
        return new ModelBuilder(this);
    }

    /**
     * Create compound object builder
     * @returns {CompoundObjectBuilder} Compound builder
     */
    compound() {
        return new CompoundObjectBuilder(this);
    }

    /**
     * Create multi-texture cube builder
     * @returns {MultiTextureCubeBuilder} Multi-texture cube builder
     */
    multiTextureCube() {
        return new MultiTextureCubeBuilder(this);
    }

    /**
     * Apply default lighting setup
     * @returns {SceneBuilder} This builder
     */
    defaultLighting() {
        this.ambientLight(0.2, [1, 1, 1]);
        return this;
    }

    /**
     * Render single frame
     * @returns {SceneBuilder} This builder
     */
    renderFrame() {
        this.scene.drawScene();
        return this;
    }

    /**
     * Create new scene builder
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {SceneBuilder} New scene builder
     */
    static create(canvas) {
        return new SceneBuilder(canvas);
    }
}

class CameraBuilder {
    /**
     * Creates camera builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this.camera = sceneBuilder.scene.camera;
    }

    /**
     * Set camera position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {CameraBuilder} This builder
     */
    position(x, y, z) {
        this.camera.position = [x, y, z];
        return this;
    }

    /**
     * Set camera look-at target
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {CameraBuilder} This builder
     */
    lookAt(x, y, z) {
        this.camera.target = [x, y, z];
        return this;
    }

    /**
     * Set field of view
     * @param {number} degrees - FOV in degrees
     * @returns {CameraBuilder} This builder
     */
    fov(degrees) {
        this.camera.fov = degrees;
        return this;
    }

    /**
     * Set the near clipping plane
     * @param {number} near
     * @returns 
     */
    near(near) {
        this.camera.near = near;
        return this;
    }

    /**
     * Set the far clipping plane
     * @param {number} far
     * @returns 
     */
    far(far) {
        this.camera.far = far;
        return this;
    }

    /**
     * Position camera in orbit around point
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} centerZ - Center Z coordinate
     * @param {number} distance - Distance from center
     * @param {number} angleY - Y rotation angle
     * @param {number} angleX - X rotation angle
     * @returns {CameraBuilder} This builder
     */
    orbit(centerX, centerY, centerZ, distance, angleY = 0, angleX = 0) {
        const radY = angleY * Math.PI / 180;
        const radX = angleX * Math.PI / 180;
        
        const x = centerX + distance * Math.cos(radX) * Math.sin(radY);
        const y = centerY + distance * Math.sin(radX);
        const z = centerZ + distance * Math.cos(radX) * Math.cos(radY);
        
        this.position(x, y, z);
        this.lookAt(centerX, centerY, centerZ);
        return this;
    }

    /**
     * Build and return scene builder
     * @returns {SceneBuilder} Parent scene builder
     */
    build() {
        return this.sceneBuilder;
    }
}

class PointLightBuilder {
    /**
     * Creates point light builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this._position = [0, 0, 0];
        this._color = [1, 1, 1];
        this._intensity = 1.0;
    }

    /**
     * Set light position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {PointLightBuilder} This builder
     */
    position(x, y, z) {
        this._position = [x, y, z];
        return this;
    }

    /**
     * Set light color
     * @param {number} r - Red component
     * @param {number} g - Green component
     * @param {number} b - Blue component
     * @returns {PointLightBuilder} This builder
     */
    color(r, g, b) {
        this._color = [r, g, b];
        return this;
    }

    /**
     * Set light intensity
     * @param {number} value - Intensity value
     * @returns {PointLightBuilder} This builder
     */
    intensity(value) {
        this._intensity = value;
        return this;
    }

    /**
     * Add light to scene
     * @returns {SceneBuilder} Parent scene builder
     */
    spawn() {
        this.sceneBuilder.scene.addLightSource(this._position, this._color, this._intensity);
        return this.sceneBuilder;
    }
}

class DirectionalLightBuilder {
    /**
     * Creates directional light builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this._direction = [0, -1, 0];
        this._color = [1, 1, 1];
        this._intensity = 1.0;
    }

    /**
     * Set light direction
     * @param {number} x - X component
     * @param {number} y - Y component
     * @param {number} z - Z component
     * @returns {DirectionalLightBuilder} This builder
     */
    direction(x, y, z) {
        this._direction = [x, y, z];
        return this;
    }

    /**
     * Set light color
     * @param {number} r - Red component
     * @param {number} g - Green component
     * @param {number} b - Blue component
     * @returns {DirectionalLightBuilder} This builder
     */
    color(r, g, b) {
        this._color = [r, g, b];
        return this;
    }

    /**
     * Set light intensity
     * @param {number} value - Intensity value
     * @returns {DirectionalLightBuilder} This builder
     */
    intensity(value) {
        this._intensity = value;
        return this;
    }

    /**
     * Add light to scene
     * @returns {SceneBuilder} Parent scene builder
     */
    spawn() {
        this.sceneBuilder.scene.addDirectionalLightSource(this._direction, this._color, this._intensity);
        return this.sceneBuilder;
    }
}

class EntityBuilder {
    /**
     * Creates entity builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this._position = [0, 0, 0];
        this._rotation = [0, 0, 0];
        this._scale = [1, 1, 1];
        this._color = [1, 1, 1, 1];
        this._texture = null;
    }

    /**
     * Set entity position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {EntityBuilder} This builder
     */
    position(x, y, z) {
        this._position = [x, y, z];
        return this;
    }

    /**
     * Set entity rotation
     * @param {number} x - X rotation
     * @param {number} y - Y rotation
     * @param {number} z - Z rotation
     * @returns {EntityBuilder} This builder
     */
    rotation(x, y, z) {
        this._rotation = [x, y, z];
        return this;
    }

    /**
     * Set entity scale
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     * @returns {EntityBuilder} This builder
     */
    scale(x, y = x, z = x) {
        this._scale = [x, y, z];
        return this;
    }

    /**
     * Set entity color
     * @param {number} r - Red component
     * @param {number} g - Green component
     * @param {number} b - Blue component
     * @param {number} a - Alpha component
     * @returns {EntityBuilder} This builder
     */
    color(r, g, b, a = 1) {
        this._color = [r, g, b, a];
        return this;
    }

    /**
     * Set entity texture
     * @param {string|WebGLTexture} textureOrPath - Texture or path
     * @returns {EntityBuilder} This builder
     */
    texture(textureOrPath) {
        this._texture = textureOrPath;
        return this;
    }

    /**
     * Create and add entity to scene
     * @returns {Promise<Entity>} Created entity
     */
    async spawn() {
        const vertices = this._createVertices();
        
        let finalTexture = null;
        if (this._texture && typeof this._texture === 'string') {
            finalTexture = await this.sceneBuilder.assets.getTexture(this._texture);
        } else if (this._texture) {
            finalTexture = this._texture;
        }
        
        const model = new Model(this.sceneBuilder.scene.gl, vertices, finalTexture);
        const entity = new Entity(model, this._position, this._rotation, this._scale);
        this.sceneBuilder.scene.entities.push(entity);
        
        return entity;
    }

    /**
     * Create geometry vertices (override in subclasses)
     * @returns {Object[]} Vertex data
     */
    _createVertices() {
        throw new Error('Subclass must implement _createVertices()');
    }
}

class CubeBuilder extends EntityBuilder {
    /**
     * Creates cube builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     * @param {number} size - Cube size
     */
    constructor(sceneBuilder, size = 1) {
        super(sceneBuilder);
        this.size = size;
    }

    /** @returns {Object[]} Cube vertices */
    _createVertices() {
        return createBoxVertices(this.size, this.size, this.size, this._color);
    }
}

/**
 * Sphere entity builder
 */
class SphereBuilder extends EntityBuilder {
    /**
     * Creates sphere builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     * @param {number} radius - Sphere radius
     * @param {number} latBands - Latitude bands
     * @param {number} lonBands - Longitude bands
     */
    constructor(sceneBuilder, radius, latBands, lonBands) {
        super(sceneBuilder);
        this.radius = radius;
        this.latBands = latBands;
        this.lonBands = lonBands;
    }

    /** @returns {Object[]} Sphere vertices */
    _createVertices() {
        return createSphereVertices(this.radius, this.latBands, this.lonBands, this._color);
    }
}

class PlaneBuilder extends EntityBuilder {
    /**
     * Creates plane builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     * @param {number} size - Plane size
     */
    constructor(sceneBuilder, size) {
        super(sceneBuilder);
        this.size = size;
    }

    /** @returns {Object[]} Plane vertices */
    _createVertices() {
        return createPlaneVertices(this.size, this._color);
    }
}

class CylinderBuilder extends EntityBuilder {
    /**
     * Creates cylinder builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @param {number} segments - Number of segments
     */
    constructor(sceneBuilder, radius, height, segments) {
        super(sceneBuilder);
        this.radius = radius;
        this.height = height;
        this.segments = segments;
    }

    /** @returns {Object[]} Cylinder vertices */
    _createVertices() {
        return createCylinderVertices(this.radius, this.height, this.segments, this._color);
    }
}

class AssetManager {
    /**
     * Creates asset manager
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    constructor(gl) {
        this.gl = gl;
        this.textures = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Register texture asset
     * @param {string} name - Asset name
     * @param {string} path - Asset path
     * @returns {AssetManager} This manager
     */
    texture(name, path) {
        this.textures.set(name, { path, loaded: false, texture: null });
        return this;
    }

    /**
     * Load all registered assets
     * @returns {Promise<AssetManager>} This manager
     */
    async load() {
        const promises = [];
        for (const [name, asset] of this.textures) {
            if (!asset.loaded) {
                promises.push(this._loadTexture(name, asset.path));
            }
        }
        await Promise.all(promises);
        return this;
    }

    /**
     * Get loaded texture by name
     * @param {string} name - Texture name
     * @returns {Promise<WebGLTexture>} Texture object
     */
    async getTexture(name) {
        const asset = this.textures.get(name);
        if (!asset) {
            throw new Error(`Texture '${name}' not registered`);
        }

        if (asset.loaded) {
            return asset.texture;
        }

        if (this.loadingPromises.has(`texture_${name}`)) {
            return this.loadingPromises.get(`texture_${name}`);
        }

        const promise = this._loadTexture(name, asset.path);
        this.loadingPromises.set(`texture_${name}`, promise);
        return promise;
    }

    /**
     * Load texture from path
     * @param {string} name - Texture name
     * @param {string} path - Texture path
     * @returns {Promise<WebGLTexture>} Loaded texture
     */
    async _loadTexture(name, path) {
        try {
            const texture = await createTexture(this.gl, path);
            const asset = this.textures.get(name);
            asset.texture = texture;
            asset.loaded = true;
            this.loadingPromises.delete(`texture_${name}`);
            return texture;
        } catch (error) {
            console.error(`Failed to load texture '${name}' from '${path}':`, error);
            this.loadingPromises.delete(`texture_${name}`);
            throw error;
        }
    }

    /**
     * Create procedural texture
     * @param {string} name - Texture name
     * @param {number} width - Texture width
     * @param {number} height - Texture height
     * @param {Function} drawFunction - Drawing function
     * @returns {AssetManager} This manager
     */
    proceduralTexture(name, width, height, drawFunction) {
        const texture = createProceduralTexture(this.gl, width, height, drawFunction);
        this.textures.set(name, { path: null, loaded: true, texture });
        return this;
    }
}

class ModelBuilder {
    /**
     * Creates model builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this.gl = sceneBuilder.scene.gl;
        this.vertices = [];
        this.currentMaterial = new MaterialBuilder();
        this.transform = { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] };
    }

    /**
     * Add cube to model
     * @param {number} size - Cube size
     * @returns {ModelBuilder} This builder
     */
    addCube(size = 1) {
        const vertices = createBoxVertices(size, size, size, this.currentMaterial.getColor());
        this._addVerticesWithTransform(vertices);
        return this;
    }

    /**
     * Add sphere to model
     * @param {number} radius - Sphere radius
     * @param {number} latBands - Latitude bands
     * @param {number} lonBands - Longitude bands
     * @returns {ModelBuilder} This builder
     */
    addSphere(radius = 1, latBands = 20, lonBands = 20) {
        const vertices = createSphereVertices(radius, latBands, lonBands, this.currentMaterial.getColor());
        this._addVerticesWithTransform(vertices);
        return this;
    }

    /**
     * Add cylinder to model
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @param {number} segments - Number of segments
     * @returns {ModelBuilder} This builder
     */
    addCylinder(radius = 1, height = 1, segments = 20) {
        const vertices = createCylinderVertices(radius, height, segments, this.currentMaterial.getColor());
        this._addVerticesWithTransform(vertices);
        return this;
    }

    /**
     * Add plane to model
     * @param {number} size - Plane size
     * @returns {ModelBuilder} This builder
     */
    addPlane(size = 1) {
        const vertices = createPlaneVertices(size, this.currentMaterial.getColor());
        this._addVerticesWithTransform(vertices);
        return this;
    }

    /**
     * Set position for next shape
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {ModelBuilder} This builder
     */
    at(x, y, z) {
        this.transform.position = [x, y, z];
        return this;
    }

    /**
     * Set scale for next shape
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     * @returns {ModelBuilder} This builder
     */
    scaledBy(x, y = x, z = x) {
        this.transform.scale = [x, y, z];
        return this;
    }

    /**
     * Reset transformation matrix
     * @returns {ModelBuilder} This builder
     */
    resetTransform() {
        this.transform = { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] };
        return this;
    }

    /**
     * Set material for next shape
     * @param {number[]|string} color - Color array or name
     * @returns {ModelBuilder} This builder
     */
    material(color) {
        if (Array.isArray(color)) {
            this.currentMaterial = new MaterialBuilder().color(...color);
        } else if (typeof color === 'string') {
            this.currentMaterial = new MaterialBuilder().namedColor(color);
        }
        return this;
    }

    /**
     * Apply transform to vertices
     * @param {Object[]} vertices - Vertex data
     */
    _addVerticesWithTransform(vertices) {
        const [tx, ty, tz] = this.transform.position;
        const [sx, sy, sz] = this.transform.scale;
        
        const transformedVertices = vertices.map(vertex => {
            let [x, y, z] = vertex.position;
            x = x * sx + tx;
            y = y * sy + ty;
            z = z * sz + tz;
            return { ...vertex, position: [x, y, z] };
        });
        
        this.vertices.push(...transformedVertices);
    }

    /**
     * Create final model entity
     * @returns {Entity} Created entity
     */
    spawn() {
        if (this.vertices.length === 0) {
            console.warn('Model builder has no vertices');
            return null;
        }
        
        const model = new Model(this.gl, this.vertices);
        const entity = new Entity(model);
        this.sceneBuilder.scene.entities.push(entity);
        return entity;
    }
}

class MaterialBuilder {
    /** Creates material builder */
    constructor() {
        this._color = [1, 1, 1, 1];
    }

    /**
     * Set material color
     * @param {number} r - Red component
     * @param {number} g - Green component
     * @param {number} b - Blue component
     * @param {number} a - Alpha component
     * @returns {MaterialBuilder} This builder
     */
    color(r, g, b, a = 1) {
        this._color = [r, g, b, a];
        return this;
    }

    /**
     * Set color by name
     * @param {string} name - Color name
     * @returns {MaterialBuilder} This builder
     */
    namedColor(name) {
        const colors = {
            'red': [1, 0, 0, 1], 'green': [0, 1, 0, 1], 'blue': [0, 0, 1, 1],
            'yellow': [1, 1, 0, 1], 'white': [1, 1, 1, 1], 'black': [0, 0, 0, 1],
            'gray': [0.5, 0.5, 0.5, 1], 'brown': [0.4, 0.2, 0.1, 1],
            'orange': [1, 0.5, 0, 1], 'purple': [0.5, 0, 0.5, 1],
            'pink': [1, 0.5, 0.8, 1], 'cyan': [0, 1, 1, 1]
        };
        
        if (colors[name]) {
            this._color = colors[name];
        } else {
            console.warn(`Unknown color name: ${name}, using white`);
        }
        return this;
    }

    /**
     * Get current color
     * @returns {number[]} RGBA color array
     */
    getColor() {
        return this._color;
    }
}

class CompoundObjectBuilder {
    /**
     * Creates compound object builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this._position = [0, 0, 0];
        this._rotation = [0, 0, 0];
        this._scale = [1, 1, 1];
        this._children = [];
    }

    /**
     * Set compound position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {CompoundObjectBuilder} This builder
     */
    position(x, y, z) {
        this._position = [x, y, z];
        return this;
    }

    /**
     * Set compound rotation
     * @param {number} x - X rotation
     * @param {number} y - Y rotation
     * @param {number} z - Z rotation
     * @returns {CompoundObjectBuilder} This builder
     */
    rotation(x, y, z) {
        this._rotation = [x, y, z];
        return this;
    }

    /**
     * Set compound scale
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     * @returns {CompoundObjectBuilder} This builder
     */
    scale(x, y = x, z = x) {
        this._scale = [x, y, z];
        return this;
    }

    /**
     * Add cube child
     * @param {Object} options - Cube configuration
     * @returns {CompoundObjectBuilder} This builder
     */
    addCube(options = {}) {
        const cube = {
            type: 'cube',
            position: options.position || [0, 0, 0],
            rotation: options.rotation || [0, 0, 0],
            scale: options.scale || [1, 1, 1],
            color: options.color || [1, 1, 1, 1],
            texture: options.texture || null,
            size: options.size || 1
        };
        this._children.push(cube);
        return this;
    }

    /**
     * Add sphere child
     * @param {Object} options - Sphere configuration
     * @returns {CompoundObjectBuilder} This builder
     */
    addSphere(options = {}) {
        const sphere = {
            type: 'sphere',
            position: options.position || [0, 0, 0],
            rotation: options.rotation || [0, 0, 0],
            scale: options.scale || [1, 1, 1],
            color: options.color || [1, 1, 1, 1],
            texture: options.texture || null,
            radius: options.radius || 1,
            latBands: options.latBands || 20,
            lonBands: options.lonBands || 20
        };
        this._children.push(sphere);
        return this;
    }

    /**
     * Add cylinder child
     * @param {Object} options - Cylinder configuration
     * @returns {CompoundObjectBuilder} This builder
     */
    addCylinder(options = {}) {
        const cylinder = {
            type: 'cylinder',
            position: options.position || [0, 0, 0],
            rotation: options.rotation || [0, 0, 0],
            scale: options.scale || [1, 1, 1],
            color: options.color || [1, 1, 1, 1],
            texture: options.texture || null,
            radius: options.radius || 1,
            height: options.height || 1,
            segments: options.segments || 20
        };
        this._children.push(cylinder);
        return this;
    }

    /**
     * Create compound entity
     * @returns {Promise<Entity>} Root entity
     */
    async spawn() {
        // Create the root entity (invisible container)
        const rootEntity = new Entity(null, this._position, this._rotation, this._scale);
        
        // Create child entities
        for (const childSpec of this._children) {
            let childEntity;
            
            switch (childSpec.type) {
                case 'cube':
                    childEntity = await this.sceneBuilder.cube()
                        .position(...childSpec.position)
                        .rotation(...childSpec.rotation)
                        .scale(...childSpec.scale)
                        .color(...childSpec.color)
                        .texture(childSpec.texture)
                        .spawn();
                    break;
                    
                case 'sphere':
                    childEntity = await this.sceneBuilder.sphere(childSpec.radius, childSpec.latBands, childSpec.lonBands)
                        .position(...childSpec.position)
                        .rotation(...childSpec.rotation)
                        .scale(...childSpec.scale)
                        .color(...childSpec.color)
                        .texture(childSpec.texture)
                        .spawn();
                    break;
                    
                case 'cylinder':
                    childEntity = await this.sceneBuilder.cylinder(childSpec.radius, childSpec.height, childSpec.segments)
                        .position(...childSpec.position)
                        .rotation(...childSpec.rotation)
                        .scale(...childSpec.scale)
                        .color(...childSpec.color)
                        .texture(childSpec.texture)
                        .spawn();
                    break;
            }
            
            if (childEntity) {
                // Remove from scene entities (will be drawn through hierarchy)
                const index = this.sceneBuilder.scene.entities.indexOf(childEntity);
                if (index > -1) {
                    this.sceneBuilder.scene.entities.splice(index, 1);
                }
                
                rootEntity.addChild(childEntity);
            }
        }
        
        this.sceneBuilder.scene.entities.push(rootEntity);
        return rootEntity;
    }
}

class MultiTextureCubeBuilder {
    /**
     * Creates multi-texture cube builder
     * @param {SceneBuilder} sceneBuilder - Parent scene builder
     */
    constructor(sceneBuilder) {
        this.sceneBuilder = sceneBuilder;
        this._position = [0, 0, 0];
        this._rotation = [0, 0, 0];
        this._scale = [1, 1, 1];
        this._size = 1;
        this._textures = {
            front: null,
            back: null,
            left: null,
            right: null,
            top: null,
            bottom: null
        };
    }

    /**
     * Set cube position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {MultiTextureCubeBuilder} This builder
     */
    position(x, y, z) {
        this._position = [x, y, z];
        return this;
    }

    /**
     * Set cube rotation
     * @param {number} x - X rotation
     * @param {number} y - Y rotation
     * @param {number} z - Z rotation
     * @returns {MultiTextureCubeBuilder} This builder
     */
    rotation(x, y, z) {
        this._rotation = [x, y, z];
        return this;
    }

    /**
     * Set cube scale
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     * @returns {MultiTextureCubeBuilder} This builder
     */
    scale(x, y = x, z = x) {
        this._scale = [x, y, z];
        return this;
    }

    /**
     * Set cube size
     * @param {number} s - Cube size
     * @returns {MultiTextureCubeBuilder} This builder
     */
    size(s) {
        this._size = s;
        return this;
    }

    /**
     * Set front face texture
     * @param {string|WebGLTexture} texture - Texture reference
     * @returns {MultiTextureCubeBuilder} This builder
     */
    frontTexture(texture) {
        this._textures.front = texture;
        return this;
    }

    /**
     * Set back face texture
     * @param {string|WebGLTexture} texture - Texture reference
     * @returns {MultiTextureCubeBuilder} This builder
     */
    backTexture(texture) {
        this._textures.back = texture;
        return this;
    }

    /**
     * Set left face texture
     * @param {string|WebGLTexture} texture - Texture reference
     * @returns {MultiTextureCubeBuilder} This builder
     */
    leftTexture(texture) {
        this._textures.left = texture;
        return this;
    }

    /**
     * Set right face texture
     * @param {string|WebGLTexture} texture - Texture reference
     * @returns {MultiTextureCubeBuilder} This builder
     */
    rightTexture(texture) {
        this._textures.right = texture;
        return this;
    }

    /**
     * Set top face texture
     * @param {string|WebGLTexture} texture - Texture reference
     * @returns {MultiTextureCubeBuilder} This builder
     */
    topTexture(texture) {
        this._textures.top = texture;
        return this;
    }

    /**
     * Set bottom face texture
     * @param {string|WebGLTexture} texture - Texture reference
     * @returns {MultiTextureCubeBuilder} This builder
     */
    bottomTexture(texture) {
        this._textures.bottom = texture;
        return this;
    }

    /**
     * Set all face textures
     * @param {Object} textureMap - Texture mapping object
     * @returns {MultiTextureCubeBuilder} This builder
     */
    textures(textureMap) {
        Object.assign(this._textures, textureMap);
        return this;
    }

    /**
     * Create multi-texture cube entity
     * @returns {Promise<Entity>} Created entity
     */
    async spawn() {
        // Create the multi-texture cube vertices
        const vertices = createMultiTextureCubeVertices(this._size, [1, 1, 1, 1], [0, 0, 0]);
        
        // Load all textures
        const textureArray = [];
        const textureNames = ['front', 'back', 'top', 'bottom', 'right', 'left'];
        
        for (const textureName of textureNames) {
            const textureRef = this._textures[textureName];
            if (textureRef) {
                if (typeof textureRef === 'string') {
                    textureArray.push(await this.sceneBuilder.assets.getTexture(textureRef));
                } else {
                    textureArray.push(textureRef);
                }
            } else {
                textureArray.push(null);
            }
        }
        
        // Create material groups for the cube faces
        const materialGroups = textureNames.map((name, index) => 
            new MaterialGroup(index, textureArray[index])
        );
        
        // Create the model with multi-texture support
        const model = new Model(this.sceneBuilder.scene.gl, vertices, textureArray, materialGroups);
        
        // Create the entity
        const entity = new Entity(model, this._position, this._rotation, this._scale);
        this.sceneBuilder.scene.entities.push(entity);
        
        return entity;
    }
}