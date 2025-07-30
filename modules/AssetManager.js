import * as THREE from '../vendor/three.module.js';

const modelCache = new Map();
const textureCache = new Map();
const audioCache = new Map();

// Lazy load loaders only when needed so tests without three/examples won't fail
let gltfLoader;
let textureLoader;

async function ensureLoaders() {
  if (!gltfLoader) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      gltfLoader = new GLTFLoader();
    } catch (e) {
      // Fallback: if loader not available return null
      gltfLoader = null;
    }
  }
  if (!textureLoader) {
    textureLoader = new THREE.TextureLoader();
  }
}

export async function loadModel(url) {
  await ensureLoaders();
  if (modelCache.has(url)) return modelCache.get(url);
  if (!gltfLoader) throw new Error('GLTFLoader unavailable');
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, gltf => {
      modelCache.set(url, gltf);
      resolve(gltf);
    }, undefined, reject);
  });
}

export async function loadTexture(url) {
  await ensureLoaders();
  if (textureCache.has(url)) return textureCache.get(url);
  return new Promise((resolve, reject) => {
    textureLoader.load(url, tex => {
      textureCache.set(url, tex);
      resolve(tex);
    }, undefined, reject);
  });
}

export async function loadAudio(url) {
  if (audioCache.has(url)) return audioCache.get(url);
  const audio = new Audio(url);
  await new Promise((res, rej) => {
    audio.addEventListener('canplaythrough', res, { once: true });
    audio.addEventListener('error', () => rej(new Error('Failed to load ' + url)), { once: true });
  });
  audioCache.set(url, audio);
  return audio;
}

export function clearCaches() {
  modelCache.clear();
  textureCache.clear();
  audioCache.clear();
}
