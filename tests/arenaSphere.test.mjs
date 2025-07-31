import assert from 'assert';
import fs from 'fs';

const sceneSrc = fs.readFileSync('./modules/scene.js', 'utf8');

assert(sceneSrc.includes('color: 0x1e1e2f'), 'dark gray color set');
assert(sceneSrc.includes('new THREE.MeshStandardMaterial'), 'MeshStandardMaterial used');
assert(sceneSrc.includes('AmbientLight'), 'ambient light created');
assert(sceneSrc.includes('DirectionalLight'), 'directional light created');

console.log('arena sphere test passed');
