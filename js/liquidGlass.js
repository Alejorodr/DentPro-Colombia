const noop = () => {};

const fallbackController = {
  destroy: noop,
  onLowFps: () => noop,
  isActive: () => false,
};

function hasWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl') ||
      canvas.getContext('webgl2');
    return !!context;
  } catch (error) {
    return false;
  }
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[liquidGlass] shader compilation failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    console.warn('[liquidGlass] program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

function applyDprSize(canvas, gl, host) {
  const dpr = window.devicePixelRatio || 1;
  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    gl.viewport(0, 0, width, height);
  }
  return { width, height };
}

function attachMediaListener(mediaQuery, handler) {
  if (!mediaQuery) return () => {};
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }
  return () => {};
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function mountLiquidGlass({ targetEl, iconsEl = null, backgroundSrc = null } = {}) {
  if (!targetEl) {
    return fallbackController;
  }

  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (motionQuery?.matches || !hasWebGLSupport()) {
    return fallbackController;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-glass-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '0',
    mixBlendMode: 'screen',
    opacity: '0.8',
  });

  const hostPosition = getComputedStyle(targetEl).position;
  const restoreHostPosition = hostPosition === 'static';
  if (restoreHostPosition) {
    targetEl.style.position = 'relative';
  }
  targetEl.classList.add('liquid-glass-host');
  targetEl.prepend(canvas);

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });

  if (!gl) {
    if (restoreHostPosition) {
      targetEl.style.position = '';
    }
    canvas.remove();
    return fallbackController;
  }

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform sampler2D u_texture;
    uniform float u_textureMix;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 centered = uv - 0.5;
      centered.y *= u_resolution.y / u_resolution.x;

      float time = u_time * 0.45;
      float swirl = noise(centered * 3.5 + time);
      float ripple = sin((uv.x + time) * 6.2831) * 0.05;
      float wave = sin((uv.y + time * 0.6) * 12.0) * 0.035;

      float highlight = smoothstep(0.45, 0.0, distance(uv, u_pointer));
      vec3 baseA = vec3(0.08, 0.62, 0.78);
      vec3 baseB = vec3(0.25, 0.28, 0.65);
      vec3 grad = mix(baseA, baseB, uv.y + ripple + wave);
      vec3 glow = vec3(0.25, 0.65, 0.9) * highlight * 0.6;
      vec3 pattern = grad + glow + swirl * 0.08;

      vec3 texColor = texture2D(u_texture, uv).rgb;
      vec3 finalColor = mix(pattern, texColor, u_textureMix);

      gl_FragColor = vec4(finalColor, 0.55 + highlight * 0.25);
    }
  `;

  const program = createProgram(gl, vertexSource, fragmentSource);
  if (!program) {
    if (restoreHostPosition) {
      targetEl.style.position = '';
    }
    canvas.remove();
    return fallbackController;
  }

  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const timeUniform = gl.getUniformLocation(program, 'u_time');
  const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
  const pointerUniform = gl.getUniformLocation(program, 'u_pointer');
  const textureUniform = gl.getUniformLocation(program, 'u_texture');
  const textureMixUniform = gl.getUniformLocation(program, 'u_textureMix');

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  let texture = null;
  let hasTexture = false;

  if (backgroundSrc) {
    const background = new Image();
    background.decoding = 'async';
    background.loading = 'lazy';
    background.crossOrigin = 'anonymous';
    background.src = backgroundSrc;
    background.addEventListener('load', () => {
      const tex = gl.createTexture();
      if (!tex) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, background);
      texture = tex;
      hasTexture = true;
    });
  }

  const pointerTarget = { x: 0.5, y: 0.5 };
  const pointer = { x: 0.5, y: 0.5 };

  const pointerListener = (event) => {
    const rect = targetEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    pointerTarget.x = clamp(relativeX, 0, 1);
    pointerTarget.y = clamp(1 - relativeY, 0, 1);
  };

  const pointerLeave = () => {
    pointerTarget.x = 0.5;
    pointerTarget.y = 0.5;
  };

  targetEl.addEventListener('pointermove', pointerListener);
  targetEl.addEventListener('pointerleave', pointerLeave);

  const iconsContainer = iconsEl || targetEl;
  const iconNodes = iconsContainer
    ? Array.from(iconsContainer.querySelectorAll('[data-liquid-icon]'))
    : [];
  const iconOffsets = iconNodes.map((_, index) => ({
    amplitude: 6 + (index % 4) * 2,
    speed: 0.6 + index * 0.07,
  }));

  let rafId = 0;
  let destroyed = false;
  let lowFpsTriggered = false;
  let lastFrame = 0;
  const frameIntervals = [];
  let lowFpsCounter = 0;
  const lowFpsHandlers = new Set();

  const cleanMotionListener = attachMediaListener(motionQuery, (event) => {
    if (event.matches) {
      triggerLowFps(0);
    }
  });

  function triggerLowFps(fps) {
    if (lowFpsTriggered) return;
    lowFpsTriggered = true;
    lowFpsHandlers.forEach((handler) => {
      try {
        handler({ fps });
      } catch (error) {
        console.error('[liquidGlass] low FPS handler failed', error);
      }
    });
  }

  function updateIcons(now) {
    iconNodes.forEach((node, index) => {
      const meta = iconOffsets[index];
      if (!meta) return;
      const tx = Math.sin(now * 0.0006 * meta.speed + index * 0.8) * meta.amplitude;
      const ty = Math.cos(now * 0.0005 * meta.speed + index * 0.5) * (meta.amplitude * 0.6);
      node.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    });
  }

  function updatePointer() {
    pointer.x += (pointerTarget.x - pointer.x) * 0.08;
    pointer.y += (pointerTarget.y - pointer.y) * 0.08;
  }

  function updateFps(now) {
    if (!lastFrame) {
      lastFrame = now;
      return { fps: 60, low: false };
    }
    const delta = now - lastFrame;
    lastFrame = now;
    frameIntervals.push(delta);
    if (frameIntervals.length > 60) {
      frameIntervals.shift();
    }
    const total = frameIntervals.reduce((sum, value) => sum + value, 0);
    const averageDelta = total / frameIntervals.length || 16.67;
    const fps = 1000 / averageDelta;
    const low = frameIntervals.length >= 20 && fps < 30;
    if (low) {
      lowFpsCounter += 1;
    } else {
      lowFpsCounter = 0;
    }
    if (lowFpsCounter > 15) {
      triggerLowFps(fps);
    }
    return { fps, low };
  }

  function render(now) {
    if (destroyed || lowFpsTriggered) {
      return;
    }

    updatePointer();
    updateIcons(now);
    updateFps(now);

    const { width, height } = applyDprSize(canvas, gl, targetEl);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform1f(timeUniform, now * 0.001);
    gl.uniform2f(resolutionUniform, width, height);
    gl.uniform2f(pointerUniform, pointer.x, pointer.y);

    if (hasTexture && texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureUniform, 0);
      gl.uniform1f(textureMixUniform, 0.35);
    } else {
      gl.uniform1f(textureMixUniform, 0.0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = window.requestAnimationFrame(render);
  }

  rafId = window.requestAnimationFrame(render);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.cancelAnimationFrame(rafId);
    targetEl.removeEventListener('pointermove', pointerListener);
    targetEl.removeEventListener('pointerleave', pointerLeave);
    cleanMotionListener();
    iconNodes.forEach((node) => {
      node.style.transform = '';
    });
    if (canvas.parentElement === targetEl) {
      targetEl.removeChild(canvas);
    }
    if (restoreHostPosition) {
      targetEl.style.position = '';
    }
    targetEl.classList.remove('liquid-glass-host');
    if (texture) {
      gl.deleteTexture(texture);
    }
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }

  function onLowFps(handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }
    lowFpsHandlers.add(handler);
    return () => {
      lowFpsHandlers.delete(handler);
    };
  }

  return {
    destroy,
    onLowFps,
    isActive: () => !destroyed && !lowFpsTriggered,
  };
}
