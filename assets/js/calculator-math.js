(function () {
  'use strict';
  function duration(seconds, speedPercent = 0, multiplier = 1) {
    const safe = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    return Math.max(0, safe(seconds)) / (1 + Math.max(0, safe(speedPercent)) / 100) * Math.max(0.01, safe(multiplier));
  }
  window.WOS = window.WOS || {}; window.WOS.math = { duration };
})();
