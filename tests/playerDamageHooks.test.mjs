import assert from 'assert';
import fs from 'fs';

const files = [
  'AnnihilatorAI.js',
  'CenturionAI.js',
  'MiasmaAI.js',
  'ReflectorAI.js',
  'SwarmLinkAI.js'
];

for (const f of files) {
  const src = fs.readFileSync(`./modules/agents/${f}`, 'utf8');
  assert(src.includes('CoreManager.onPlayerDamage'), `${f} hooks player damage`);
}

console.log('player damage hooks test passed');
