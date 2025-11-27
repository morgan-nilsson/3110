/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 */

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

    /** @type {WebGLUniformLocation} */
    #u_ModelMatrix;

    /** @type {WebGLUniformLocation} */
    #u_transformMatrix;

    /** @type {WebGLUniformLocation} */
    #u_AmbientColor;

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

    /**
     * 
     * @param {WebGLContext} gl 
     * @param {number} a_Position 
     * @param {number} a_Color 
     * @param {WebGLUniformLocation} u_ModelMatrix 
     * @param {WebGLUniformLocation} u_transformMatrix 
     * @param {WebGLUniformLocation} u_AmbientColor
     * @param {WebGLUniformLocation} u_DirectionalColor 
     * @param {WebGLUniformLocation} u_DirectionalDir 
     * @param {WebGLUniformLocation} u_PointColor 
     * @param {WebGLUniformLocation} u_PointPos 
     */
    constructor(gl, 
            a_Position, 
            a_Color, 
            u_ModelMatrix, 
            u_transformMatrix, 
            u_AmbientColor,
            u_DirectionalColor, 
            u_DirectionalDir, 
            u_PointColor, 
            u_PointPos,
            a_normal,
            u_NormalMatrix
        ) {
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

        this.#gl = gl;
        this.#a_Position = a_Position;
        this.#a_Color = a_Color;
        this.#u_ModelMatrix = u_ModelMatrix;
        this.#u_transformMatrix = u_transformMatrix;
        this.#u_AmbientColor = u_AmbientColor;
        this.#u_DirectionalColor = u_DirectionalColor;
        this.#u_DirectionalDir = u_DirectionalDir;
        this.#u_PointColor = u_PointColor;
        this.#u_PointPos = u_PointPos;
        this.#a_normal = a_normal;
        this.#u_NormalMatrix = u_NormalMatrix;
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

    drawScene() {
        const viewMatrix = this.camera.getViewMatrix();

        const gl = this.#gl;

        // set the ambient light
        gl.uniform3fv(this.#u_AmbientColor, this.#ambient_light_color.map(c => c * this.#ambient_light_intensity));

        // set the directional light
        if (this.directional_light_sources.length > 0) {
            const dirLight = this.directional_light_sources[0];
            console.log(dirLight);
            gl.uniform3fv(this.#u_DirectionalColor, dirLight.color.map(c => c * dirLight.intensity));
            gl.uniform3fv(this.#u_DirectionalDir, dirLight.direction);
        } else {
            gl.uniform3fv(this.#u_DirectionalColor, [0.0, 0.0, 0.0]);
            gl.uniform3fv(this.#u_DirectionalDir, [0.0, 0.0, 0.0]);
        }

        // set the point light
        if (this.light_sources.length > 0) {
            const pointLight = this.light_sources[0];
            console.log(pointLight);
            gl.uniform3fv(this.#u_PointColor, pointLight.color.map(c => c * pointLight.intensity));
            gl.uniform3fv(this.#u_PointPos, pointLight.position);
        } else {
            gl.uniform3fv(this.#u_PointColor, [0.0, 0.0, 0.0]);
            gl.uniform3fv(this.#u_PointPos, [0.0, 0.0, 0.0]);
        }

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

    spawnEntity(model) {
        const entity = new Entity(model);
        this.entities.push(entity);
        return entity;
    }
    
    addDirectionalLightSource(direction, color, intensity) {
        const dirLight = new DirectionalLightSource(direction, color, intensity);
        this.directional_light_sources.push(dirLight);
        return dirLight;
    }

    addLightSource(position, color, intensity) {
        const light = new LightSource(position, color, intensity);
        this.light_sources.push(light);
        return light;
    }

    #drawModel(gl, model, a_Position, a_Color, a_Normal) {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
        gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Color);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

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