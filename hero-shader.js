export const HERO_SHADER_CONFIG = Object.freeze({
  speed: 0.2,
  intensity: 0.82,
  maxFramesPerSecond: 30,
  maxDevicePixelRatio: 1.25,
  colors: Object.freeze({
    blush: "#dca297",
    champagne: "#e5c59e",
    sand: "#ccb095",
    clay: "#a97564",
    light: "#fffaf4",
  }),
});

const VERTEX_SHADER = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_intensity;
  uniform vec3 u_blush;
  uniform vec3 u_champagne;
  uniform vec3 u_sand;
  uniform vec3 u_clay;
  uniform vec3 u_light;

  float softEllipse(vec2 point, vec2 centre, vec2 radius) {
    vec2 offset = (point - centre) / radius;
    return exp(-dot(offset, offset) * 1.8);
  }

  float softBand(float distanceFromCurve, float width) {
    float scaled = distanceFromCurve / width;
    return exp(-scaled * scaled);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float time = u_time;
    float portraitLayout = step(u_resolution.x, u_resolution.y);

    float photographGlow = softEllipse(
      uv,
      mix(vec2(0.86, 0.52), vec2(0.70, 0.22), portraitLayout),
      mix(vec2(0.44, 0.72), vec2(0.56, 0.36), portraitLayout)
    );
    float champagneGlow = softEllipse(uv, vec2(0.04, 0.12), vec2(0.56, 0.46));
    float edgeGlow = smoothstep(0.12, 0.50, abs(uv.x - 0.5));

    float desktopCurveA = uv.x - (
      0.69 + 0.105 * sin(uv.y * 3.45 + time * 0.72)
      + 0.026 * sin(uv.y * 7.8 - time * 0.38)
    );
    float desktopCurveB = uv.x - (
      0.88 + 0.070 * sin(uv.y * 4.35 - time * 0.58)
      + 0.020 * sin(uv.y * 8.6 + time * 0.31)
    );
    float desktopCurveC = uv.y - (
      0.13 + 0.052 * sin(uv.x * 5.1 + time * 0.46)
      + 0.018 * sin(uv.x * 10.2 - time * 0.27)
    );

    float portraitCurveA = uv.y - (
      0.39 + 0.078 * sin(uv.x * 4.15 + time * 0.72)
      + 0.024 * sin(uv.x * 8.9 - time * 0.36)
    );
    float portraitCurveB = uv.y - (
      0.20 + 0.062 * sin(uv.x * 5.05 - time * 0.58)
      + 0.018 * sin(uv.x * 10.4 + time * 0.29)
    );
    float portraitCurveC = uv.x - (
      0.91 + 0.042 * sin(uv.y * 5.0 + time * 0.46)
      + 0.014 * sin(uv.y * 10.0 - time * 0.24)
    );

    float curveA = mix(desktopCurveA, portraitCurveA, portraitLayout);
    float curveB = mix(desktopCurveB, portraitCurveB, portraitLayout);
    float curveC = mix(desktopCurveC, portraitCurveC, portraitLayout);

    float bodyA = softBand(curveA, mix(0.115, 0.105, portraitLayout));
    float bodyB = softBand(curveB, mix(0.090, 0.078, portraitLayout));
    float bodyC = softBand(curveC, 0.068);
    float crestA = softBand(curveA + 0.026, 0.020);
    float crestB = softBand(curveB + 0.019, 0.014);
    float crestC = softBand(curveC + 0.015, 0.012);
    float shadowA = softBand(curveA - 0.052, 0.034);
    float shadowB = softBand(curveB - 0.038, 0.026);
    float shadowC = softBand(curveC - 0.030, 0.021);

    float desktopFocus = smoothstep(0.45, 0.69, uv.x);
    float portraitFocus = clamp(
      (1.0 - smoothstep(0.38, 0.66, uv.y))
      + smoothstep(0.30, 0.48, abs(uv.x - 0.5)) * 0.36,
      0.0,
      1.0
    );
    float foldFocus = mix(desktopFocus, portraitFocus, portraitLayout);
    float foldBody = clamp((bodyA * 0.78 + bodyB * 0.64 + bodyC * 0.42) * (0.32 + foldFocus * 0.68), 0.0, 1.0);
    float foldCrest = clamp((crestA * 0.82 + crestB * 0.68 + crestC * 0.46) * (0.30 + foldFocus * 0.70), 0.0, 1.0);
    float foldShadow = clamp((shadowA * 0.72 + shadowB * 0.62 + shadowC * 0.42) * (0.28 + foldFocus * 0.72), 0.0, 1.0);

    vec2 textCentre = mix(vec2(0.30, 0.53), vec2(0.50, 0.70), portraitLayout);
    vec2 textScale = mix(vec2(0.46, 0.62), vec2(0.42, 0.38), portraitLayout);
    vec2 textOffset = (uv - textCentre) / textScale;
    float textQuiet = exp(-dot(textOffset, textOffset) * 1.35);

    vec3 colour = mix(u_light, u_champagne, 0.10 + champagneGlow * 0.22 * u_intensity);
    colour = mix(colour, u_blush, photographGlow * 0.34 * u_intensity);
    colour = mix(colour, u_sand, edgeGlow * 0.16 * u_intensity);

    colour = mix(colour, u_blush, foldBody * 0.44 * u_intensity);
    colour = mix(colour, u_champagne, bodyB * foldFocus * 0.16 * u_intensity);
    colour = mix(colour, u_clay, foldShadow * 0.30 * u_intensity);
    colour = mix(colour, u_light, foldCrest * 0.58);
    colour = mix(colour, u_light, textQuiet * 0.58);

    gl_FragColor = vec4(colour, 1.0);
  }
`;

function colourToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error("Shader compilation failed");
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Shader program allocation failed");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error("Shader program linking failed");
  }
  return program;
}

export function setupHeroShader(root = document, config = HERO_SHADER_CONFIG) {
  const canvas = root.querySelector("[data-hero-shader]");
  const hero = canvas?.closest(".hero");
  const view = root.defaultView || window;
  const reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)");

  if (!canvas || !hero || reducedMotion.matches) {
    if (canvas) canvas.dataset.shaderState = reducedMotion.matches ? "reduced-motion" : "fallback";
    return { status: reducedMotion.matches ? "reduced-motion" : "unavailable", destroy() {} };
  }

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    premultipliedAlpha: true,
  });

  if (!gl) {
    canvas.dataset.shaderState = "fallback";
    return { status: "unavailable", destroy() {} };
  }

  let program;
  try {
    program = createProgram(gl);
  } catch {
    canvas.dataset.shaderState = "fallback";
    return { status: "unavailable", destroy() {} };
  }

  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    gl.deleteProgram(program);
    canvas.dataset.shaderState = "fallback";
    return { status: "unavailable", destroy() {} };
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]), gl.STATIC_DRAW);
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    time: gl.getUniformLocation(program, "u_time"),
    intensity: gl.getUniformLocation(program, "u_intensity"),
    blush: gl.getUniformLocation(program, "u_blush"),
    champagne: gl.getUniformLocation(program, "u_champagne"),
    sand: gl.getUniformLocation(program, "u_sand"),
    clay: gl.getUniformLocation(program, "u_clay"),
    light: gl.getUniformLocation(program, "u_light"),
  };

  gl.uniform1f(uniforms.intensity, config.intensity);
  gl.uniform3fv(uniforms.blush, colourToRgb(config.colors.blush));
  gl.uniform3fv(uniforms.champagne, colourToRgb(config.colors.champagne));
  gl.uniform3fv(uniforms.sand, colourToRgb(config.colors.sand));
  gl.uniform3fv(uniforms.clay, colourToRgb(config.colors.clay));
  gl.uniform3fv(uniforms.light, colourToRgb(config.colors.light));

  let animationFrame = 0;
  let lastFrame = 0;
  let visible = true;
  let destroyed = false;
  const frameInterval = 1000 / config.maxFramesPerSecond;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(view.devicePixelRatio || 1, config.maxDevicePixelRatio);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const draw = (timestamp) => {
    animationFrame = 0;
    if (destroyed || !visible || root.hidden || reducedMotion.matches) return;
    if (timestamp - lastFrame >= frameInterval) {
      lastFrame = timestamp;
      resize();
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, timestamp * 0.001 * config.speed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    animationFrame = view.requestAnimationFrame(draw);
  };

  const start = () => {
    if (!animationFrame && !destroyed && visible && !root.hidden && !reducedMotion.matches) {
      animationFrame = view.requestAnimationFrame(draw);
    }
  };

  const stop = () => {
    if (animationFrame) view.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const handleVisibility = () => root.hidden ? stop() : start();
  const handleMotionPreference = () => {
    hero.classList.toggle("is-shader-ready", !reducedMotion.matches);
    if (reducedMotion.matches) stop(); else start();
  };
  const handleContextLoss = (event) => {
    event.preventDefault();
    stop();
    canvas.dataset.shaderState = "fallback";
    hero.classList.remove("is-shader-ready");
  };

  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(hero);

  const intersectionObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start(); else stop();
  }, { threshold: 0.01 });
  intersectionObserver?.observe(hero);

  root.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener("change", handleMotionPreference);
  canvas.addEventListener("webglcontextlost", handleContextLoss);
  resize();
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.time, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  canvas.dataset.shaderState = "webgl";
  hero.classList.add("is-shader-ready");
  start();

  return {
    status: "ready",
    destroy() {
      destroyed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      root.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      canvas.dataset.shaderState = "idle";
      hero.classList.remove("is-shader-ready");
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    },
  };
}
