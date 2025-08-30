import * as THREE from '../vendor/three.module.js';

// Lazy load loaders only when needed.
let GLTFLoader;

let instance = null;

export class AssetManager {
    constructor() {
        if (instance) {
            return instance;
        }
        this.textureLoader = new THREE.TextureLoader();
        this.audioLoader = new THREE.AudioLoader();
        this.gltfLoader = null;
        this.textureCache = new Map();
        this.audioCache = new Map();
        this.modelCache = new Map();
        instance = this;
    }

    async _ensureGltfLoader() {
        if (!this.gltfLoader) {
            // This dynamic import will only run when loadModel is first called.
            const loaderModule = await import('../vendor/addons/loaders/GLTFLoader.js');
            this.gltfLoader = new loaderModule.GLTFLoader();
        }
    }

    async loadModel(url) {
        if (this.modelCache.has(url)) {
            return this.modelCache.get(url);
        }
        await this._ensureGltfLoader();
        return await new Promise((resolve, reject) => {
            this.gltfLoader.load(url,
                (gltf) => {
                    this.modelCache.set(url, gltf);
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load model: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    loadTexture(url) {
        if (this.textureCache.has(url)) {
            return Promise.resolve(this.textureCache.get(url));
        }
        return new Promise((resolve, reject) => {
            this.textureLoader.load(url,
                (texture) => {
                    this.textureCache.set(url, texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load texture: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    loadAudio(url) {
        if (this.audioCache.has(url)) {
            return Promise.resolve(this.audioCache.get(url));
        }
        return new Promise((resolve, reject) => {
            this.audioLoader.load(url,
                (buffer) => {
                    this.audioCache.set(url, buffer);
                    resolve(buffer);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load audio: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    getTexture(url) {
        return this.textureCache.get(url);
    }

    getAudio(url) {
        return this.audioCache.get(url);
    }
}
