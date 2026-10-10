export const HERO_SHADER_CONFIG = Object.freeze({
  speed: 0.16,
  intensity: 0.46,
  maxFramesPerSecond: 30,
  maxDevicePixelRatio: 1.25,
  colors: Object.freeze({
    mist: "#dbe3dc",
    sand: "#e7ded5",
    clay: "#c9b8a6",
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
  uniform vec3 u_mist;
  uniform vec3 u_sand;
  uniform vec3 u_clay;
  uniform vec3 u_light;

  float softField(vec2 point, vec2 centre, float softness) {
    vec2 offset = point - centre;
    return exp(-dot(offset, offset) * softness);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 point = uv - 0.5;
    point.x *= u_resolution.x / u_resolution.y;

    float time = u_time;
    vec2 firstCentre = vec2(
      -0.24 + 0.18 * sin(time * 0.73),
      0.18 + 0.14 * cos(time * 0.51)
    );
    vec2 secondCentre = vec2(
      0.31 + 0.16 * cos(time * 0.47),
      -0.18 + 0.13 * sin(time * 0.67)
    );
    vec2 thirdCentre = vec2(
      0.02 + 0.24 * sin(time * 0.31),
      0.02 + 0.18 * cos(time * 0.39)
    );

    float first = softField(point, firstCentre, 4.1);
    float second = softField(point, secondCentre, 4.8);
    float third = softField(point, thirdCentre, 3.5);
    float drift = 0.5 + 0.5 * sin(point.x * 2.0 - point.y * 1.35 + time * 0.42);

    vec3 colour = mix(u_light, u_mist, clamp(first * 0.72 + drift * 0.14, 0.0, 1.0));
    colour = mix(colour, u_sand, clamp(second * 0.56, 0.0, 0.72));
    colour = mix(colour, u_clay, clamp(third * 0.24, 0.0, 0.32));

    float alpha = (0.12 + first * 0.22 + second * 0.16 + third * 0.12) * u_intensity;
    gl_FragColor = vec4(colour, alpha);
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
    return { status: reducedMotion.matches ? "reduced-motion" : "unavailable", destroy() {} };
  }

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    premultipliedAlpha: true,
  });

  if (!gl) return { status: "unavailable", destroy() {} };

  let program;
  try {
    program = createProgram(gl);
  } catch {
    return { status: "unavailable", destroy() {} };
  }

  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    gl.deleteProgram(program);
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
    mist: gl.getUniformLocation(program, "u_mist"),
    sand: gl.getUniformLocation(program, "u_sand"),
    clay: gl.getUniformLocation(program, "u_clay"),
    light: gl.getUniformLocation(program, "u_light"),
  };

  gl.uniform1f(uniforms.intensity, config.intensity);
  gl.uniform3fv(uniforms.mist, colourToRgb(config.colors.mist));
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
      hero.classList.remove("is-shader-ready");
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    },
  };
}
