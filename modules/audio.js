// modules/audio.js

export const AudioManager = {
    unlocked: false,
    userMuted: false,
    sfxVolume: 0.75,
    musicVolume: 0.40,
    soundElements: {},
    musicPlaylist: [],
    currentTrackIndex: -1,
    currentMusic: null,
  isFading: false,
  stageMusicMap: [
    {min:1,  max:5,  track:'bgMusic_01'},
    {min:6,  max:10, track:'bgMusic_02'},
    {min:11, max:15, track:'bgMusic_03'},
    {min:16, max:20, track:'bgMusic_04'},
    {min:21, max:Infinity, track:'bgMusic_05'}
  ],
    
    setup(audioElements, soundBtn) {
        audioElements.forEach(el => {
            this.soundElements[el.id] = el;
            if (el.id.startsWith('bgMusic')) {
                this.musicPlaylist.push(el);
            }
        });
        this.musicPlaylist.sort(() => Math.random() - 0.5);
        this.soundBtn = soundBtn;
        this.normalizeVolumes();
        this.updateButtonIcon();
    },

    normalizeVolumes() {
        Object.values(this.soundElements).forEach(el => {
            if (el.loop) {
                el.volume = this.sfxVolume;
            } else {
                el.volume = Math.min(el.volume, this.sfxVolume);
            }
        });
    },
    
    unlockAudio() {
        if (this.unlocked) return;
        this.unlocked = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        this.playMusic();
    },
    
    toggleMute() {
        if (!this.unlocked) this.unlockAudio();
        this.userMuted = !this.userMuted;
        
        Object.values(this.soundElements).forEach(el => {
            if (el.loop) el.muted = this.userMuted;
        });
        
        if (this.userMuted) {
            if(this.currentMusic) this.currentMusic.pause();
        } else {
            if(this.currentMusic) this.currentMusic.play().catch(e => {});
        }
        
        this.updateButtonIcon();
    },

    updateButtonIcon() {
        if(this.soundBtn) this.soundBtn.innerText = this.userMuted ? "🔇" : "🔊";
    },

    setMusicVolume(vol) {
        this.musicVolume = Math.min(1, Math.max(0, vol));
        if (this.currentMusic) this.currentMusic.volume = this.musicVolume;
    },
    setSfxVolume(vol) {
        this.sfxVolume = Math.min(1, Math.max(0, vol));
        this.normalizeVolumes();
    },
    playSfx(soundId) {
        if (!this.unlocked || this.userMuted) return;
        const originalSfx = this.soundElements[soundId];
        if (originalSfx) {
            const sfxInstance = new Audio(originalSfx.src);
            sfxInstance.volume = this.sfxVolume;
            sfxInstance.play().catch(e => console.warn(`SFX instance for ${soundId} failed to play.`, e));
        } else {
            console.warn(`Sound with ID "${soundId}" not found.`);
        }
    },

  playLoopingSfx(soundId) {
        if (!this.unlocked || this.userMuted) return;
        const sfx = this.soundElements[soundId];
        if (sfx && sfx.paused) {
            sfx.volume = this.sfxVolume;
            sfx.play().catch(e => console.warn(`Looping SFX failed for: ${soundId}`, e));
        }
    },

    stopLoopingSfx(soundId) {
        const sfx = this.soundElements[soundId];
        if (sfx && !sfx.paused) {
            sfx.pause();
        }
    },

    getTrackForStage(stage){
        for(const m of this.stageMusicMap){
            if(stage >= m.min && stage <= m.max) return m.track;
        }
        return 'bgMusic_01';
    },

    playMusicForStage(stage){
        if(!this.unlocked) this.unlockAudio();
        const id = this.getTrackForStage(stage);
        const track = this.soundElements[id];
        if(!track) return;
        this.musicPlaylist = [track];
        this.currentTrackIndex = -1;
        this.currentMusic = null;
        this.playMusic();
    },
    
    handleVisibilityChange() {
        if (!this.unlocked) return;
        
        if (document.hidden) {
            if (this.currentMusic && !this.currentMusic.paused) {
                this.currentMusic.pause();
            }
            // --- FIX: Add Obelisk hum to the list of sounds to stop ---
            this.stopLoopingSfx('beamHumSound');
            this.stopLoopingSfx('obeliskHum');
        } else {
            if (!this.userMuted && this.currentMusic && this.currentMusic.paused) {
                this.currentMusic.play().catch(e => {});
            }
        }
    },

    _fade(audioElement, startVol, endVol, duration, onComplete) {
        if (duration <= 0) {
            audioElement.volume = endVol;
            if(onComplete) onComplete();
            return;
        }
        this.isFading = true;
        let currentVol = startVol;
        audioElement.volume = currentVol;
        const interval = 50;
        const step = (endVol - startVol) / (duration / interval);
        const fade = setInterval(() => {
            currentVol += step;
            if ((step > 0 && currentVol >= endVol) || (step < 0 && currentVol <= endVol)) {
                currentVol = endVol;
            }
            audioElement.muted = false; 
            audioElement.volume = currentVol;
            if (currentVol === endVol) {
                clearInterval(fade);
                this.isFading = false;
                if(onComplete) onComplete();
            }
        }, interval);
    },

    fadeOutMusic(duration = 2000) {
        if (this.currentMusic) {
            const trackToFade = this.currentMusic;
            this._fade(trackToFade, trackToFade.volume, 0, duration, () => {
                trackToFade.pause();
                if (this.currentMusic === trackToFade) {
                    this.currentMusic = null;
                }
            });
        }
    },

    crossfadeToNextTrack(duration = 3000) {
        if (this.isFading || this.userMuted) return;
        if (this.musicPlaylist.length === 0) return;
        if (this.currentMusic) {
             this.fadeOutMusic(duration);
        }
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicPlaylist.length;
        const nextTrack = this.musicPlaylist[this.currentTrackIndex];
        if (!nextTrack) return;
        this.currentMusic = nextTrack;
        nextTrack.currentTime = 0;
        nextTrack.play().catch(() => {});
        this._fade(nextTrack, 0, this.musicVolume, duration);
    },
    
    playMusic() {
        if (this.currentMusic || this.musicPlaylist.length === 0 || this.userMuted) return;
        this.crossfadeToNextTrack(1000); 
    }
};
