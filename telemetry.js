// modules/telemetry.js
//
// Lightweight performance telemetry for Eternal Momentum VR. This module
// tracks average frames per second and exposes a hook for storing metrics
// in localStorage for later review. No network requests are ever made.

export const Telemetry = {
  frames: 0,
  lastTime: 0,
  reportCallback: null,
  interval: null,
  enabled: false,

  /**
   * Begin capturing frame data.
   * @param {Function} [reportFn] Optional callback that receives {fps, ts}.
   */
  start(reportFn) {
    if (this.enabled) return;
    this.enabled = true;
    this.reportCallback = reportFn;
    this.frames = 0;
    this.lastTime = performance.now();
    this.interval = setInterval(() => {
      const now = performance.now();
      const fps = (this.frames / (now - this.lastTime)) * 1000;
      const payload = { fps: Math.round(fps * 10) / 10, ts: Date.now() };
      if (typeof this.reportCallback === 'function') {
        try { this.reportCallback(payload); } catch(e) {}
      }
      this.frames = 0;
      this.lastTime = now;
    }, 5000);
  },

  /** Record a rendered frame. Call once per RAF tick. */
  recordFrame() {
    if (this.enabled) this.frames++;
  },

  /** Stop telemetry collection. */
  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.enabled = false;
  }
};

/**
 * Persist telemetry payload to localStorage.
 * Keeps the most recent 50 entries under the `telemetryLogs` key.
 * @param {{fps:number,ts:number}} data
 */
export function storeTelemetry(data){
  const key = 'telemetryLogs';
  try {
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    logs.push(data);
    if (logs.length > 50) logs.shift();
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.warn('Telemetry storage failed', err);
  }
}
