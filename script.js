/* =========================================================
   KINETIC 01 — live binary timepiece
   ========================================================= */

(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const elements = {
    watchBits: $$("[data-watch-bit]"),
    miniBits: $$("[data-mini-bit]"),
    digitalHour: $("#digitalHour"),
    digitalMinute: $("#digitalMinute"),
    digitalSeconds: $("#digitalSeconds"),
    digitalMeridiem: $("#digitalMeridiem"),
    liveAnnouncement: $("#liveAnnouncement"),
    hourTotal: $("#hourTotal"),
    minuteTotal: $("#minuteTotal"),
    hourFormula: $("#hourFormula"),
    minuteFormula: $("#minuteFormula"),
    dialHourCaption: $("#dialHourCaption"),
    panelDate: $("#panelDate"),
    panelZone: $("#panelZone"),
    headerTime: $("#headerTime"),
    footerTime: $("#footerTime"),
    formatToggle: $("#formatToggle"),
    formatLabel: $("#formatLabel"),
    crownButton: $("#crownButton"),
    toast: $("#toast"),
    watchStage: $("#watchStage"),
    watchRig: $("#watchRig")
  };

  const HOUR_WEIGHTS = [8, 4, 2, 1];
  const MINUTE_WEIGHTS = [32, 16, 8, 4, 2, 1];
  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const STORAGE_KEY = "kinetic01.format";

  let use24Hour = true;
  let lastRenderedSecond = -1;
  let toastTimer = 0;

  /* ---------- persistence ---------- */

  function readStoredFormat() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "12") return false;
      if (stored === "24") return true;
    } catch (error) {
      /* localStorage can be unavailable on file:// — defaults are fine. */
    }
    return true;
  }

  function storeFormat() {
    try {
      window.localStorage.setItem(STORAGE_KEY, use24Hour ? "24" : "12");
    } catch (error) {
      /* Non-essential enhancement only. */
    }
  }

  /* ---------- helpers ---------- */

  const pad2 = (value) => String(value).padStart(2, "0");

  function bitValue(value, weight) {
    return (value & weight) === weight ? 1 : 0;
  }

  function activeWeights(value, weights) {
    return weights.filter((weight) => (value & weight) === weight);
  }

  function setBitState(node, isOn) {
    node.classList.toggle("is-on", isOn);
  }

  function updateFormula(node, value, weights) {
    const active = activeWeights(value, weights);
    const expression = active.length ? active.join(" + ") : "0";
    node.innerHTML = `${expression} = <b>${value}</b>`;
  }

  function getTimezoneLabel(now) {
    const totalMinutes = -now.getTimezoneOffset();
    const sign = totalMinutes >= 0 ? "+" : "-";
    const hours = Math.floor(Math.abs(totalMinutes) / 60);
    const minutes = Math.abs(totalMinutes) % 60;
    return `UTC${sign}${pad2(hours)}${minutes ? `:${pad2(minutes)}` : ""}`;
  }

  function getDateLabel(now) {
    return `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())} · ${WEEKDAYS[now.getDay()]}`;
  }

  function getHourValue(hours24) {
    if (use24Hour) return hours24;
    return hours24 % 12 || 12;
  }

  /* ---------- render ---------- */

  function render(now = new Date()) {
    const hours24 = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const displayHour = getHourValue(hours24);
    const meridiem = hours24 < 12 ? "AM" : "PM";
    const hourBits = HOUR_WEIGHTS.map((weight) => bitValue(displayHour, weight));
    const minuteBits = MINUTE_WEIGHTS.map((weight) => bitValue(minutes, weight));

    elements.watchBits.forEach((node) => {
      const group = node.dataset.watchBit;
      const weight = Number(node.dataset.weight);
      const sourceValue = group === "hour" ? displayHour : minutes;
      setBitState(node, (sourceValue & weight) === weight);
    });

    elements.miniBits.forEach((node) => {
      const group = node.dataset.miniBit;
      const weight = Number(node.dataset.weight);
      const sourceValue = group === "hour" ? displayHour : minutes;
      setBitState(node, (sourceValue & weight) === weight);
    });

    elements.digitalHour.textContent = pad2(displayHour);
    elements.digitalMinute.textContent = pad2(minutes);
    elements.digitalSeconds.textContent = pad2(seconds);

    elements.digitalMeridiem.textContent = meridiem;
    elements.digitalMeridiem.hidden = use24Hour;

    elements.hourTotal.textContent = String(displayHour);
    elements.minuteTotal.textContent = pad2(minutes);
    elements.dialHourCaption.textContent = use24Hour ? "HOURS · 24H" : `HOURS · ${meridiem}`;

    updateFormula(elements.hourFormula, displayHour, HOUR_WEIGHTS);
    updateFormula(elements.minuteFormula, minutes, MINUTE_WEIGHTS);

    elements.panelDate.textContent = getDateLabel(now);
    elements.panelZone.textContent = getTimezoneLabel(now);

    const time = `${pad2(hours24)}:${pad2(minutes)}:${pad2(seconds)}`;
    elements.headerTime.textContent = time;
    elements.headerTime.dateTime = now.toISOString();
    elements.footerTime.textContent = `LOCAL · ${time}`;
    elements.liveAnnouncement.textContent = `当前时间 ${pad2(displayHour)}:${pad2(minutes)}${use24Hour ? "" : ` ${meridiem}`}`;

    // Expose the current readout for lightweight inspection and testing.
    document.documentElement.dataset.hourBits = hourBits.join("");
    document.documentElement.dataset.minuteBits = minuteBits.join("");
  }

  /* ---------- format switch ---------- */

  function syncFormatUI() {
    elements.formatToggle.setAttribute("aria-pressed", String(use24Hour));
    elements.formatLabel.textContent = use24Hour ? "24 小时制" : "12 小时制";
    const nextFormat = use24Hour ? "12" : "24";
    elements.formatToggle.setAttribute("aria-label", `切换为 ${nextFormat} 小时制`);
    elements.crownButton.setAttribute("aria-label", `切换为 ${nextFormat} 小时制`);
    elements.crownButton.title = `切换为 ${nextFormat} 小时制`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2200);
  }

  function toggleFormat() {
    use24Hour = !use24Hour;
    storeFormat();
    syncFormatUI();
    render();
    showToast(use24Hour ? "已切换为 24 小时制" : "已切换为 12 小时制");
  }

  /* ---------- clock loop ---------- */

  function tick() {
    const now = new Date();
    if (now.getSeconds() !== lastRenderedSecond) {
      lastRenderedSecond = now.getSeconds();
      render(now);
    }
  }

  /* ---------- pointer tilt ---------- */

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const defaultTilt = { x: 1.5, y: -3.5 };

  function resetTilt() {
    elements.watchRig.style.setProperty("--tilt-x", `${defaultTilt.x}deg`);
    elements.watchRig.style.setProperty("--tilt-y", `${defaultTilt.y}deg`);
    elements.watchRig.style.setProperty("--glare-x", "30%");
    elements.watchRig.style.setProperty("--glare-y", "18%");
  }

  function bindTilt() {
    if (!elements.watchStage || !elements.watchRig) return;

    elements.watchStage.addEventListener("pointermove", (event) => {
      if (reducedMotion.matches || event.pointerType === "touch") return;

      const rect = elements.watchStage.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) - 0.5;
      const ny = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) - 0.5;

      const tiltX = (defaultTilt.x - ny * 5.2).toFixed(2);
      const tiltY = (defaultTilt.y + nx * 8.6).toFixed(2);
      const glareX = (30 + nx * 34).toFixed(1);
      const glareY = (18 + ny * 26).toFixed(1);

      elements.watchRig.style.setProperty("--tilt-x", `${tiltX}deg`);
      elements.watchRig.style.setProperty("--tilt-y", `${tiltY}deg`);
      elements.watchRig.style.setProperty("--glare-x", `${glareX}%`);
      elements.watchRig.style.setProperty("--glare-y", `${glareY}%`);
    });

    elements.watchStage.addEventListener("pointerleave", resetTilt);
    elements.watchStage.addEventListener("pointercancel", resetTilt);
    resetTilt();
  }

  /* ---------- lifecycle ---------- */

  function init() {
    use24Hour = readStoredFormat();
    syncFormatUI();
    render();
    lastRenderedSecond = new Date().getSeconds();

    elements.formatToggle.addEventListener("click", toggleFormat);
    elements.crownButton.addEventListener("click", toggleFormat);
    bindTilt();

    window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        lastRenderedSecond = -1;
        tick();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
