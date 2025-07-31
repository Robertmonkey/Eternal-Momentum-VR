import * as THREE from '../vendor/three.module.js';

export const AudioManager = {
  listener: null,
  loader: new THREE.AudioLoader(),
  unlocked: false,
  userMuted: false,
  sfxVolume: 0.75,
  musicVolume: 0.4,
  sfxGain: null,
  musicGain: null,
  soundBuffers: {},
  loopingSounds: {},
  musicPlaylist: ['bgMusic_01', 'bgMusic_02', 'bgMusic_03', 'bgMusic_04', 'bgMusic_05'],
  currentTrackIndex: -1,
  currentMusic: null,
  soundBtn: null,

  attachListener(camera) {
    if (this.listener || !camera) return;
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    const ctx = this.listener.context;
    this.musicGain = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.sfxGain.gain.value = this.sfxVolume;
    this.musicGain.connect(this.listener.getInput());
    this.sfxGain.connect(this.listener.getInput());
  },

  setup(camera, soundBtn) {
    this.attachListener(camera);
    this.soundBtn = soundBtn;
    this.updateButtonIcon();
  },

  unlockAudio() {
    this.unlocked = true;
    this.playMusic();
  },

  toggleMute() {
    if (!this.unlocked) this.unlockAudio();
    this.userMuted = !this.userMuted;
    if (this.musicGain) this.musicGain.gain.value = this.userMuted ? 0 : this.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = this.userMuted ? 0 : this.sfxVolume;
    this.updateButtonIcon();
  },

  updateButtonIcon() {
    if (!this.soundBtn) return;
    if (this.soundBtn.tagName && this.soundBtn.tagName.toLowerCase() === 'a-text') {
      this.soundBtn.setAttribute('value', this.userMuted ? '🔇' : '🔊');
    } else {
      this.soundBtn.innerText = this.userMuted ? '🔇' : '🔊';
    }
  },

  _loadBuffer(id, cb) {
    if (this.soundBuffers[id]) { cb(this.soundBuffers[id]); return; }
    this.loader.load(`assets/${id}.mp3`, buffer => {
      this.soundBuffers[id] = buffer;
      cb(buffer);
    });
  },

  playSfx(id, object3d = null) {
    if (!this.unlocked || this.userMuted || !this.listener) return;
    this._loadBuffer(id, buffer => {
      const sound = object3d ? new THREE.PositionalAudio(this.listener) : new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setVolume(1);
      sound.gain.disconnect();
      if (this.sfxGain) sound.gain.connect(this.sfxGain);
      if (object3d) {
        object3d.add(sound);
      }
      sound.play();
    });
  },

  playLoopingSfx(id, object3d = null) {
    if (!this.unlocked || this.userMuted || !this.listener) return;
    if (this.loopingSounds[id]) return;
    this._loadBuffer(id, buffer => {
      const sound = object3d ? new THREE.PositionalAudio(this.listener) : new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(1);
      sound.gain.disconnect();
      if (this.sfxGain) sound.gain.connect(this.sfxGain);
      if (object3d) object3d.add(sound);
      sound.play();
      this.loopingSounds[id] = sound;
    });
  },

  stopLoopingSfx(id) {
    const sound = this.loopingSounds[id];
    if (sound) {
      sound.stop();
      if (sound.parent) sound.parent.remove(sound);
      delete this.loopingSounds[id];
    }
  },

  _playMusicTrack(id) {
    this._loadBuffer(id, buffer => {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(1);
      sound.gain.disconnect();
      if (this.musicGain) sound.gain.connect(this.musicGain);
      sound.play();
      this.currentMusic = sound;
    });
  },

  playMusicForStage(stage) {
    if (!this.unlocked) this.unlockAudio();
    const trackIndex = this.musicPlaylist.findIndex((t, i) => stage <= (i + 1) * 5);
    this.currentTrackIndex = trackIndex >= 0 ? trackIndex : 0;
    if (this.currentMusic) this.currentMusic.stop();
    this._playMusicTrack(this.musicPlaylist[this.currentTrackIndex]);
  },

  playMusic() {
    if (this.musicPlaylist.length === 0 || this.currentMusic) return;
    this.currentTrackIndex = 0;
    this._playMusicTrack(this.musicPlaylist[0]);
  },

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = this.userMuted ? 0 : v;
  },

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = this.userMuted ? 0 : v;
  }
};
