// modules/telemetry.js
//
// Lightweight performance telemetry for Eternal Momentum VR. This module
// tracks average frames per second and exposes a hook for sending metrics
// to external analytics services.

export const Telemetry = {
  frames: 0,
  lastTime: 0,
  reportCallback: null,
  interval: null,

  /**
   * Begin capturing frame data.
   * @param {Function} [reportFn] Optional callback that receives {fps, ts}.
   */
  start(reportFn) {
    this.reportCallback = reportFn;
    this.frames = 0;
    this.lastTime = performance.now();
    this.interval = setInterval(() => {
      const now = performance.now();
      const fps = (this.frames / (now - this.lastTime)) * 1000;
      const payload = { fps: Math.round(fps * 10) / 10, ts: Date.now() };
      console.log('[Telemetry]', payload);
      if (typeof this.reportCallback === 'function') {
        try { this.reportCallback(payload); } catch(e) {}
      }
      this.frames = 0;
      this.lastTime = now;
    }, 5000);
  },

  /** Record a rendered frame. Call once per RAF tick. */
  recordFrame() {
    this.frames++;
  },

  /** Stop telemetry collection. */
  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
};

/**
 * Upload telemetry payload to the remote analytics service.
 * This uses a simple POST request and ignores errors.
 * @param {{fps:number,ts:number}} data
 */
export async function uploadTelemetry(data){
  try{
    await fetch('https://example.com/api/telemetry',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }catch(err){
    console.warn('Telemetry upload failed', err);
  }
}
