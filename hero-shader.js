export const HERO_SHADER_CONFIG = Object.freeze({
  speed: 0.13,
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

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 point = uv - 0.5;

    float time = u_time;
    float portraitLayout = step(u_resolution.x, u_resolution.y);
    vec2 blushCentre = vec2(
      mix(0.84, 0.78, portraitLayout) + 0.05 * sin(time * 0.54),
      mix(0.58, 0.24, portraitLayout) + 0.05 * cos(time * 0.43)
    );
    vec2 champagneCentre = vec2(
      0.08 + 0.04 * cos(time * 0.38),
      0.16 + 0.05 * sin(time * 0.49)
    );
    vec2 clayCentre = vec2(
      mix(0.94, 0.08, portraitLayout) + 0.03 * sin(time * 0.31),
      mix(0.20, 0.72, portraitLayout) + 0.04 * cos(time * 0.35)
    );

    float blushField = softEllipse(uv, blushCentre, mix(vec2(0.42, 0.50), vec2(0.42, 0.30), portraitLayout));
    float champagneField = softEllipse(uv, champagneCentre, mix(vec2(0.44, 0.42), vec2(0.46, 0.30), portraitLayout));
    float clayField = softEllipse(uv, clayCentre, mix(vec2(0.24, 0.38), vec2(0.26, 0.32), portraitLayout));

    float foldA = 0.5 + 0.5 * sin(
      point.x * 5.2 - point.y * 2.4 + time * 0.62 + sin(point.y * 3.1 - time * 0.23) * 0.72
    );
    float foldB = 0.5 + 0.5 * sin(
      point.x * 3.0 + point.y * 4.3 - time * 0.47 + sin(point.x * 2.2 + time * 0.18) * 0.58
    );
    float silk = smoothstep(0.25, 0.88, foldA * 0.58 + foldB * 0.42);
    float lowerRibbon = exp(-pow(uv.y - (0.20 + 0.07 * sin(uv.x * 4.0 + time * 0.36)), 2.0) * 54.0);
    float sideRibbon = exp(-pow(uv.x - (0.84 + 0.05 * sin(uv.y * 4.4 - time * 0.31)), 2.0) * 66.0);

    float sideColour = smoothstep(0.08, 0.58, abs(uv.x - 0.5));
    float lowerColour = smoothstep(0.36, 0.94, 1.0 - uv.y);
    float edgeAtmosphere = clamp(sideColour * 0.52 + lowerColour * portraitLayout * 0.34, 0.0, 0.72);

    vec2 textCentre = mix(vec2(0.30, 0.53), vec2(0.50, 0.70), portraitLayout);
    vec2 textScale = mix(vec2(0.46, 0.62), vec2(0.42, 0.38), portraitLayout);
    vec2 textOffset = (uv - textCentre) / textScale;
    float textQuiet = exp(-dot(textOffset, textOffset) * 1.35);

    vec3 colour = mix(u_light, u_champagne, 0.10 + champagneField * 0.42 * u_intensity);
    colour = mix(colour, u_blush, blushField * (0.46 + silk * 0.20) * u_intensity);
    colour = mix(colour, u_sand, (edgeAtmosphere * 0.42 + silk * 0.10 + lowerRibbon * 0.14) * u_intensity);
    colour = mix(colour, u_clay, clayField * (0.25 + silk * 0.14) * u_intensity);
    colour = mix(colour, u_blush, sideRibbon * 0.14 * u_intensity);

    float silkHighlight = smoothstep(0.58, 0.94, silk) * 0.13 + lowerRibbon * 0.06 + sideRibbon * 0.05;
    colour = mix(colour, u_light, silkHighlight + textQuiet * 0.58);

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
