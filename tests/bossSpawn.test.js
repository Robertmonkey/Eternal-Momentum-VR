import test from 'node:test';
import assert from 'node:assert/strict';
import { initGameHelpers } from '../modules/gameHelpers.js';
import { state } from '../modules/state.js';
import { BaseAgent } from '../modules/BaseAgent.js';
import { AethelUmbraAI } from '../modules/agents/AethelUmbraAI.js';
import { AnnihilatorAI } from '../modules/agents/AnnihilatorAI.js';
import { ArchitectAI } from '../modules/agents/ArchitectAI.js';
import { BasiliskAI } from '../modules/agents/BasiliskAI.js';
import { CenturionAI } from '../modules/agents/CenturionAI.js';
import { EMPOverloadAI } from '../modules/agents/EMPOverloadAI.js';
import { EpochEnderAI } from '../modules/agents/EpochEnderAI.js';
import { FractalHorrorAI } from '../modules/agents/FractalHorrorAI.js';
import { GlitchAI } from '../modules/agents/GlitchAI.js';
import { GravityAI } from '../modules/agents/GravityAI.js';
import { HelixWeaverAI } from '../modules/agents/HelixWeaverAI.js';
import { JuggernautAI } from '../modules/agents/JuggernautAI.js';
import { LoopingEyeAI } from '../modules/agents/LoopingEyeAI.js';
import { MiasmaAI } from '../modules/agents/MiasmaAI.js';
import { MirrorMirageAI } from '../modules/agents/MirrorMirageAI.js';
import { ObeliskAI } from '../modules/agents/ObeliskAI.js';
import { PantheonAI } from '../modules/agents/PantheonAI.js';
import { ParasiteAI } from '../modules/agents/ParasiteAI.js';
import { PuppeteerAI } from '../modules/agents/PuppeteerAI.js';
import { QuantumShadowAI } from '../modules/agents/QuantumShadowAI.js';
import { ReflectorAI } from '../modules/agents/ReflectorAI.js';
import { SentinelPairAI } from '../modules/agents/SentinelPairAI.js';
import { ShaperOfFateAI } from '../modules/agents/ShaperOfFateAI.js';
import { SingularityAI } from '../modules/agents/SingularityAI.js';
import { SplitterAI } from '../modules/agents/SplitterAI.js';
import { SwarmLinkAI } from '../modules/agents/SwarmLinkAI.js';
import { SyphonAI } from '../modules/agents/SyphonAI.js';
import { TemporalParadoxAI } from '../modules/agents/TemporalParadoxAI.js';
import { TimeEaterAI } from '../modules/agents/TimeEaterAI.js';
import { VampireAI } from '../modules/agents/VampireAI.js';

// Prevent long-running timers from holding the test open
const realSetTimeout = global.setTimeout;
global.setTimeout = (...args) => {
  const t = realSetTimeout(...args);
  if (t && typeof t.unref === 'function') t.unref();
  return t;
};

initGameHelpers({
  play: () => {},
  playLooping: () => {},
  stopLoopingSfx: () => {},
  addEssence: () => {},
  spawnEnemy: () => new BaseAgent(),
  addStatusEffect: () => {},
  updateHud: () => {},
});

state.player.position.set(0, 0, 50);
state.player.r = 1;

const constructors = [
  () => new AethelUmbraAI('Aethel'),
  () => { const b = new AnnihilatorAI(); b.lastBeamTime = Date.now(); return b; },
  () => new ArchitectAI(),
  () => new BasiliskAI(),
  () => new CenturionAI(),
  () => new EMPOverloadAI(),
  () => new EpochEnderAI(),
  () => new FractalHorrorAI(),
  () => new GlitchAI(),
  () => new GravityAI(),
  () => new HelixWeaverAI(),
  () => new JuggernautAI(),
  () => new LoopingEyeAI(),
  () => new MiasmaAI(),
  () => new MirrorMirageAI(),
  () => new ObeliskAI(),
  () => new PantheonAI(),
  () => new ParasiteAI(),
  () => new PuppeteerAI(),
  () => new QuantumShadowAI(),
  () => new ReflectorAI(),
  () => new SentinelPairAI(),
  () => new ShaperOfFateAI(),
  () => new SingularityAI(),
  () => new SplitterAI(),
  () => new SwarmLinkAI(),
  () => new SyphonAI(),
  () => new TemporalParadoxAI(),
  () => new TimeEaterAI(),
  () => new VampireAI(),
];

test('boss constructors and updates do not crash', () => {
  for (const create of constructors) {
    state.enemies = [];
    state.effects = [];
    const boss = create();
    assert.ok(boss, 'boss constructed');
    boss.position.set(0, 0, 45);
    boss.update(16);
  }
});
