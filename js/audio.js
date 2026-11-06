/**
 * NEXUS - Synthesized Audio Feedback via Web Audio API
 * Zero external sound files. Pure holographic synthesizer.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Audio = (function() {
  let ctx = null;

  function getAudioContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function isEnabled() {
    const settings = window.NexusApp.State ? window.NexusApp.State.getSettings() : window.NexusApp.Config.DEFAULT_SETTINGS;
    return Boolean(settings && settings.soundEnabled);
  }

  function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.06) {
    if (!isEnabled()) return;
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  return {
    click: function() {
      playTone(1150, 'sine', 0.035, 0.04);
    },

    complete: function() {
      if (!isEnabled()) return;
      try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // B5

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      } catch (e) {}
    },

    delete: function() {
      playTone(200, 'sine', 0.08, 0.05);
    },

    alert: function() {
      if (!isEnabled()) return;
      try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.07);

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } catch (e) {}
    },

    hubOpen: function() {
      if (!isEnabled()) return;
      try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const notes = [440, 554.37, 659.25]; // A major triad
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const start = now + (idx * 0.04);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.05, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(start);
          osc.stop(start + 0.2);
        });
      } catch (e) {}
    },

    boot: function() {
      if (!isEnabled()) return;
      try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const notes = [329.63, 440, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const start = now + (idx * 0.08);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.05, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(start);
          osc.stop(start + 0.25);
        });
      } catch (e) {}
    }
  };
})();
