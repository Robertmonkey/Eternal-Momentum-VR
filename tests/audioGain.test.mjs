import assert from 'assert';

import { AudioManager } from '../modules/audio.js';

AudioManager.musicGain = { gain: { value: 1 } };
AudioManager.sfxGain = { gain: { value: 1 } };
AudioManager.unlocked = true;

AudioManager.setMusicVolume(0.8);
assert.strictEqual(AudioManager.musicGain.gain.value, 0.8);
AudioManager.setSfxVolume(0.25);
assert.strictEqual(AudioManager.sfxGain.gain.value, 0.25);

AudioManager.userMuted = false;
AudioManager.toggleMute();
assert.strictEqual(AudioManager.musicGain.gain.value, 0);
assert.strictEqual(AudioManager.sfxGain.gain.value, 0);
AudioManager.toggleMute();
assert.strictEqual(AudioManager.musicGain.gain.value, 0.8);
assert.strictEqual(AudioManager.sfxGain.gain.value, 0.25);

console.log('audio gain test passed');

