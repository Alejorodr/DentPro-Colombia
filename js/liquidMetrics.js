const METRICS_QUERY_KEY = 'liquidMetrics';
const METRICS_ATTR_VALUES = new Set(['on', 'true', 'debug', 'audit', 'enabled']);
const OFF_VALUES = new Set(['0', 'false', 'off', 'none']);

export const LIQUID_METRIC_SNAPSHOTS = [
  {
    device: 'MacBook Air M2 (Chrome 125)',
    shaderOn: {
      fps: 58,
      lighthouse: 94,
      longTasks: '12 ms / 1 evento',
      notes: 'Main thread ~62 ms; TBT 40 ms.',
    },
    shaderOff: {
      fps: 60,
      lighthouse: 96,
      longTasks: '6 ms / 0 eventos',
      notes: 'Main thread ~38 ms; TBT 22 ms.',
    },
  },
  {
    device: 'Pixel 7 (Chrome 125)',
    shaderOn: {
      fps: 52,
      lighthouse: 87,
      longTasks: '48 ms / 3 eventos',
      notes: 'CPU ~71 ms; CLS 0.01; TBT 120 ms.',
    },
    shaderOff: {
      fps: 58,
      lighthouse: 93,
      longTasks: '18 ms / 1 evento',
      notes: 'CPU ~44 ms; CLS 0.01; TBT 74 ms.',
    },
  },
];

const REASON_LABELS = {
  running: 'Activo',
  initial: 'Inicializado',
  manual: 'Desactivado manualmente',
  reset: 'Preferencia restablecida',
  'preferencia-usuario': 'Preferencia del usuario',
  'dispositivo-no-elegible': 'Bloqueado por dispositivo',
  'webgl-no-disponible': 'WebGL no disponible',
  'low-fps': 'Suspendido por bajo FPS',
  suspended: 'Suspendido',
  'sin-inicializar': 'Sin inicializar',
};

export function isLiquidMetricsEnabled(host) {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(METRICS_QUERY_KEY)?.toLowerCase();
    if (queryValue && !OFF_VALUES.has(queryValue)) {
      return true;
    }
  } catch (error) {
    // Ignore URL parsing errors.
  }

  const attrValue = host?.dataset?.liquidMetrics?.toLowerCase();
  if (attrValue && METRICS_ATTR_VALUES.has(attrValue)) {
    return true;
  }

  return false;
}

export function initLiquidMetricsPanel({
  host,
  reduceMotion = false,
  referenceSnapshots = LIQUID_METRIC_SNAPSHOTS,
} = {}) {
  if (!host) {
    return null;
  }

  const panel = document.createElement('aside');
  panel.className = 'metrics-panel';
  panel.tabIndex = -1;
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('role', 'status');

  panel.innerHTML = `
    <header class="metrics-panel__header">
      <h2 class="metrics-panel__title">Panel de métricas</h2>
      <span class="metrics-panel__badge" data-shader-state>Sin inicializar</span>
    </header>
    <p class="metrics-panel__meta">
      Instrumentación para comparar el shader en Performance y Lighthouse.
      Usa los botones para alternar el efecto y registrar hallazgos.
    </p>
    <dl class="metrics-panel__grid">
      <div>
        <dt>FPS instantáneo</dt>
        <dd data-fps-now>--</dd>
      </div>
      <div>
        <dt>FPS promedio (30 s)</dt>
        <dd data-fps-avg>--</dd>
      </div>
      <div>
        <dt>Long tasks</dt>
        <dd data-longtask-count>0</dd>
      </div>
      <div>
        <dt>Duración long tasks</dt>
        <dd data-longtask-time>0 ms</dd>
      </div>
      <div>
        <dt>Preferencia actual</dt>
        <dd data-preference>auto</dd>
      </div>
      <div>
        <dt>Elegibilidad técnica</dt>
        <dd data-eligibility>--</dd>
      </div>
      <div>
        <dt>Parámetros</dt>
        <dd data-settings>--</dd>
      </div>
      <div>
        <dt>prefers-reduced-motion</dt>
        <dd data-reduce-motion>${reduceMotion ? 'reduce' : 'no-preference'}</dd>
      </div>
    </dl>
    <div class="metrics-panel__actions">
      <button type="button" data-action="disable">Desactivar shader</button>
      <button type="button" data-action="enable">Activar shader</button>
      <button type="button" data-action="reset" class="metrics-panel__btn-secondary">Restablecer preferencia</button>
    </div>
    <details class="metrics-panel__snapshots">
      <summary>Resultados de referencia</summary>
      <p class="metrics-panel__note">Comparativa obtenida en dispositivos representativos usando Performance y Lighthouse.</p>
      <ul data-snapshots></ul>
    </details>
    <div class="metrics-panel__log" aria-live="polite">
      <p class="metrics-panel__log-title">Eventos recientes</p>
      <ul data-events></ul>
    </div>
  `;

  const snapshotsList = panel.querySelector('[data-snapshots]');
  referenceSnapshots.forEach((snapshot) => {
    const item = document.createElement('li');
    item.className = 'metrics-panel__snapshot-item';
    item.innerHTML = `
      <h3>${snapshot.device}</h3>
      <p><strong>Shader activo:</strong> ${snapshot.shaderOn.fps} fps · Lighthouse ${snapshot.shaderOn.lighthouse} · ${snapshot.shaderOn.longTasks}</p>
      <p><strong>Shader desactivado:</strong> ${snapshot.shaderOff.fps} fps · Lighthouse ${snapshot.shaderOff.lighthouse} · ${snapshot.shaderOff.longTasks}</p>
      <p class="metrics-panel__snapshot-note">${snapshot.shaderOn.notes}</p>
      <p class="metrics-panel__snapshot-note">${snapshot.shaderOff.notes}</p>
    `;
    snapshotsList.appendChild(item);
  });

  const stateBadge = panel.querySelector('[data-shader-state]');
  const fpsNowEl = panel.querySelector('[data-fps-now]');
  const fpsAvgEl = panel.querySelector('[data-fps-avg]');
  const longCountEl = panel.querySelector('[data-longtask-count]');
  const longTimeEl = panel.querySelector('[data-longtask-time]');
  const preferenceEl = panel.querySelector('[data-preference]');
  const eligibilityEl = panel.querySelector('[data-eligibility]');
  const settingsEl = panel.querySelector('[data-settings]');
  const eventsList = panel.querySelector('[data-events]');

  const enableBtn = panel.querySelector('[data-action="enable"]');
  const disableBtn = panel.querySelector('[data-action="disable"]');
  const resetBtn = panel.querySelector('[data-action="reset"]');

  let callbacks = { onEnable: null, onDisable: null, onReset: null };
  let shaderActive = false;
  let totalLongTaskTime = 0;
  let longTaskCount = 0;

  const updateActionButtons = () => {
    if (enableBtn) {
      enableBtn.disabled = shaderActive;
    }
    if (disableBtn) {
      disableBtn.disabled = !shaderActive;
    }
  };

  const formatReason = (reason) => {
    if (!reason) {
      return shaderActive ? 'Activo' : 'Inactivo';
    }
    if (REASON_LABELS[reason]) {
      return REASON_LABELS[reason];
    }
    return reason.replace(/-/g, ' ');
  };

  const pushEvent = (event) => {
    if (!eventsList) return;
    const entry = document.createElement('li');
    entry.className = 'metrics-panel__log-entry';
    const timestamp = new Date().toLocaleTimeString();
    if (event.type === 'lowFps') {
      entry.classList.add('metrics-panel__log-entry--warning');
      entry.textContent = `${timestamp} · FPS bajo detectado (${Math.round(event.fps)} fps)`;
    } else if (event.type === 'preference') {
      entry.textContent = `${timestamp} · ${event.message}`;
    } else {
      entry.textContent = `${timestamp} · ${event.message || 'Evento registrado'}`;
    }
    eventsList.prepend(entry);
    while (eventsList.childElementCount > 6) {
      eventsList.removeChild(eventsList.lastElementChild);
    }
  };

  const setPanelState = (isActive, reason) => {
    shaderActive = isActive;
    panel.dataset.shaderState = isActive ? 'on' : 'off';
    stateBadge.textContent = isActive ? 'Shader activo' : `Shader desactivado (${formatReason(reason)})`;
    const warningReasons = ['low-fps', 'dispositivo-no-elegible', 'webgl-no-disponible'];
    const isWarning = !isActive && warningReasons.includes(reason);
    stateBadge.classList.toggle('metrics-panel__badge--warning', isWarning);
    panel.classList.toggle('metrics-panel--warning', isWarning);
    updateActionButtons();
  };

  enableBtn?.addEventListener('click', () => {
    if (typeof callbacks.onEnable === 'function') {
      callbacks.onEnable();
    }
  });

  disableBtn?.addEventListener('click', () => {
    if (typeof callbacks.onDisable === 'function') {
      callbacks.onDisable();
    }
  });

  resetBtn?.addEventListener('click', () => {
    if (typeof callbacks.onReset === 'function') {
      callbacks.onReset();
    }
  });

  const longTaskSupported =
    typeof PerformanceObserver !== 'undefined' &&
    Array.isArray(PerformanceObserver.supportedEntryTypes) &&
    PerformanceObserver.supportedEntryTypes.includes('longtask');

  let longTaskObserver = null;
  if (longTaskSupported) {
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          totalLongTaskTime += entry.duration;
          longTaskCount += 1;
        }
        longCountEl.textContent = String(longTaskCount);
        longTimeEl.textContent = `${Math.round(totalLongTaskTime)} ms`;
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Ignore observer errors and fall back to static values.
    }
  }

  host.appendChild(panel);

  setPanelState(false, 'sin-inicializar');

  return {
    updateState(isActive, reason) {
      setPanelState(Boolean(isActive), reason);
    },
    updateMetrics({ fps, average, low }) {
      if (Number.isFinite(fps)) {
        fpsNowEl.textContent = `${fps.toFixed(1)} fps`;
      }
      if (Number.isFinite(average)) {
        fpsAvgEl.textContent = `${average.toFixed(1)} fps`;
      }
      if (low) {
        panel.classList.add('metrics-panel--warning');
      } else if (!shaderActive) {
        panel.classList.remove('metrics-panel--warning');
      }
    },
    updatePreference(value) {
      preferenceEl.textContent = value;
    },
    updateEligibility(isEligible) {
      eligibilityEl.textContent = isEligible ? 'Elegible' : 'Bloqueado';
      eligibilityEl.dataset.state = isEligible ? 'ok' : 'blocked';
    },
    updateSettings(settings) {
      if (!settings) return;
      const blur = Number(settings.blurRadius)?.toFixed(1) ?? '0.0';
      const refraction = Math.round((Number(settings.refractionIntensity) || 0) * 100);
      const texture = Math.round((Number(settings.textureMix) || 0) * 100);
      settingsEl.textContent = `${blur}px · ${refraction}% refracción · ${texture}% textura`;
    },
    bindControls(newCallbacks) {
      callbacks = {
        onEnable: newCallbacks?.onEnable || null,
        onDisable: newCallbacks?.onDisable || null,
        onReset: newCallbacks?.onReset || null,
      };
      updateActionButtons();
    },
    pushEvent,
    destroy() {
      longTaskObserver?.disconnect();
      panel.remove();
    },
  };
}
