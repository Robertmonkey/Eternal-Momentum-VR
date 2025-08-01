import * as THREE from '../vendor/three.module.js';

let instance = null;

export class AssetManager {
    constructor() {
        if (instance) {
            return instance;
        }
        this.textureLoader = new THREE.TextureLoader();
        this.audioLoader = new THREE.AudioLoader();
        this.textureCache = new Map();
        this.audioCache = new Map();
        instance = this;
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
