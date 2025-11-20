/**
 * @import * from './libs/cuon-utils.js'
 * @import * from './libs/cuon-matrix.js'
 */

class Scene {

    constructor() {
        /** @type {Entity[]} */
        this.entities = [];
        this.camera = new Camera(
            [0, 0, 5],
            [0, 0, 0],
            [0, 1, 0],
            45,
            1.0,
            0.1,
            100
        );
        this.skybox_color = [0.5, 0.7, 1.0, 1.0];
    }

    drawScene(gl, a_Position, a_Color, u_ModelMatrix, u_transformMatrix) {
        const viewMatrix = this.camera.getViewMatrix();

        const vpMatrix = new Matrix4();
        vpMatrix.setPerspective(
            this.camera.fov,
            this.camera.aspect,
            this.camera.near,
            this.camera.far
        );
        vpMatrix.multiply(viewMatrix);

        gl.uniformMatrix4fv(u_transformMatrix, false, vpMatrix.elements);
        
        gl.clearColor(...this.skybox_color);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let entity of this.entities) {
            gl.uniformMatrix4fv(u_ModelMatrix, false, entity.getModelMatrix().elements);
            this.#drawModel(gl, entity.model, a_Position, a_Color);
        }
    }

    spawnEntity(model) {
        const entity = new Entity(model);
        this.entities.push(entity);
        return entity;
    }

    #drawModel(gl, model, a_Position, a_Color) {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
        gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Color);

        gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
    }
}


class Camera {
    /**
     * 
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

class Entity {
    constructor(model, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
        this.model = model;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
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

        for (let v of vertices) {
            positions.push(...v.position);
            colors.push(...(v.color ?? [1,1,1,1]));
        }

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
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