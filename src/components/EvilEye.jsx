import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';
import { useEffect, useRef } from 'react';
import './EvilEye.css';

function hexToVec3(hex) {
  if (!hex || typeof hex !== 'string') return [1, 0.4, 0.2];
  const h = hex.replace('#', '');
  if (h.length < 6) return [1, 0.4, 0.2];
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

function generateNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);

  function hash(x, y, s) {
    let n = x * 374761393 + y * 668265263 + s * 1274126177;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function noise(px, py, freq, seed) {
    const fx = (px / size) * freq;
    const fy = (py / size) * freq;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const w = freq | 0;
    const v00 = hash(((ix % w) + w) % w, ((iy % w) + w) % w, seed);
    const v10 = hash((((ix + 1) % w) + w) % w, ((iy % w) + w) % w, seed);
    const v01 = hash(((ix % w) + w) % w, (((iy + 1) % w) + w) % w, seed);
    const v11 = hash((((ix + 1) % w) + w) % w, (((iy + 1) % w) + w) % w, seed);
    return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 0.4;
      let totalAmp = 0;
      for (let o = 0; o < 8; o++) {
        const f = 32 * (1 << o);
        v += amp * noise(x, y, f, o * 31);
        totalAmp += amp;
        amp *= 0.65;
      }
      v /= totalAmp;
      v = (v - 0.5) * 2.2 + 0.5;
      v = Math.max(0, Math.min(1, v));
      const val = Math.round(v * 255);
      const i = (y * size + x) * 4;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  }

  return data;
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform sampler2D uNoiseTexture;
uniform float uPupilSize;
uniform float uIrisWidth;
uniform float uGlowIntensity;
uniform float uIntensity;
uniform float uScale;
uniform float uNoiseScale;
uniform vec2 uMouse;
uniform float uPupilFollow;
uniform float uFlameSpeed;
uniform float uEyelidOpen;
uniform vec3 uEyeColor;
uniform vec3 uBgColor;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
  uv /= uScale;
  float ft = uTime * uFlameSpeed;

  // Organic Eyelid Aperture (0.01 = closed eyelid slit, 1.0 = fully open eye)
  float lidHeight = mix(0.015, 1.0, uEyelidOpen);
  vec2 eyeUv = uv;
  eyeUv.y /= lidHeight;
  float eyeAperture = clamp((1.0 - length(eyeUv * vec2(0.5, 1.4))) * 2.5, 0.0, 1.0);

  float polarRadius = length(uv) * 2.0;
  float polarAngle = (2.0 * atan(uv.x, uv.y)) / 6.28 * 0.3;
  vec2 polarUv = vec2(polarRadius, polarAngle);

  vec4 noiseA = texture2D(uNoiseTexture, polarUv * vec2(0.2, 7.0) * uNoiseScale + vec2(-ft * 0.1, 0.0));
  vec4 noiseB = texture2D(uNoiseTexture, polarUv * vec2(0.3, 4.0) * uNoiseScale + vec2(-ft * 0.2, 0.0));
  vec4 noiseC = texture2D(uNoiseTexture, polarUv * vec2(0.1, 5.0) * uNoiseScale + vec2(-ft * 0.1, 0.0));

  float distanceMask = 1.0 - length(uv);

  // Inner ring
  float innerRing = clamp(-1.0 * ((distanceMask - 0.7) / uIrisWidth), 0.0, 1.0);
  innerRing = (innerRing * distanceMask - 0.2) / 0.28;
  innerRing += noiseA.r - 0.5;
  innerRing *= 1.3;
  innerRing = clamp(innerRing, 0.0, 1.0);

  float outerRing = clamp(-1.0 * ((distanceMask - 0.5) / 0.2), 0.0, 1.0);
  outerRing = (outerRing * distanceMask - 0.1) / 0.38;
  outerRing += noiseC.r - 0.5;
  outerRing *= 1.3;
  outerRing = clamp(outerRing, 0.0, 1.0);

  innerRing += outerRing;

  // Inner eye
  float innerEye = distanceMask - 0.1 * 2.0;
  innerEye *= noiseB.r * 2.0;

  // Pupil with natural gaze tracking
  vec2 pupilOffset = uMouse * uPupilFollow * 0.12;
  vec2 pupilUv = uv - pupilOffset;
  float pupil = 1.0 - length(pupilUv * vec2(9.0, 2.3));
  pupil *= uPupilSize;
  pupil = clamp(pupil, 0.0, 1.0);
  pupil /= 0.35;

  // Outer eye
  float outerEyeGlow = 1.0 - length(uv * vec2(0.5, 1.5));
  outerEyeGlow = clamp(outerEyeGlow + 0.5, 0.0, 1.0);
  outerEyeGlow += noiseC.r - 0.5;
  float outerBgGlow = outerEyeGlow;
  outerEyeGlow = pow(outerEyeGlow, 2.0);
  outerEyeGlow += distanceMask;
  outerEyeGlow *= uGlowIntensity;
  outerEyeGlow = clamp(outerEyeGlow, 0.0, 1.0);
  outerEyeGlow *= pow(1.0 - distanceMask, 2.0) * 2.5;

  // Outer eye bg glow
  outerBgGlow += distanceMask;
  outerBgGlow = pow(outerBgGlow, 0.5);
  outerBgGlow *= 0.15;

  vec3 eyeGlow = uEyeColor * uIntensity * clamp(max(innerRing + innerEye, outerEyeGlow + outerBgGlow) - pupil, 0.0, 3.0);
  eyeGlow *= eyeAperture;

  vec3 finalColor = eyeGlow + uBgColor;
  float alpha = clamp(length(eyeGlow), 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function EvilEye({
  eyeColor = '#36F9C7',
  intensity = 1.6,
  pupilSize = 0.6,
  irisWidth = 0.25,
  glowIntensity = 0.35,
  scale = 0.8,
  noiseScale = 1.0,
  pupilFollow = 1.0,
  flameSpeed = 1.0,
  eyelidOpen = 1.0,
  backgroundColor = '#000000',
  className = '',
  style = {}
}) {
  const containerRef = useRef(null);
  const targetColorRef = useRef(hexToVec3(eyeColor));
  const currentColorRef = useRef(hexToVec3(eyeColor));
  const targetEyelidRef = useRef(eyelidOpen);
  const currentEyelidRef = useRef(eyelidOpen);

  // Update target color smoothly when prop changes
  useEffect(() => {
    targetColorRef.current = hexToVec3(eyeColor);
  }, [eyeColor]);

  // Update target eyelid state smoothly when prop changes
  useEffect(() => {
    targetEyelidRef.current = eyelidOpen;
  }, [eyelidOpen]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const noiseData = generateNoiseTexture(256);
    const noiseTexture = new Texture(gl, {
      image: noiseData,
      width: 256,
      height: 256,
      generateMipmaps: false,
      flipY: false,
    });
    noiseTexture.minFilter = gl.LINEAR;
    noiseTexture.magFilter = gl.LINEAR;
    noiseTexture.wrapS = gl.REPEAT;
    noiseTexture.wrapT = gl.REPEAT;

    // Organic real-eye saccades & gaze simulation
    const eyeTarget = { x: 0, y: 0 };
    const eyeCurrent = { x: 0, y: 0 };
    let lastSaccadeTime = 0;
    let saccadeInterval = 1500;

    function updateNaturalGaze(time) {
      if (time - lastSaccadeTime > saccadeInterval) {
        lastSaccadeTime = time;
        const isOpen = targetEyelidRef.current > 0.3;
        if (!isOpen || Math.random() < 0.3) {
          eyeTarget.x = 0;
          eyeTarget.y = 0;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.1 + Math.random() * 0.45;
          eyeTarget.x = Math.cos(angle) * radius;
          eyeTarget.y = Math.sin(angle) * radius;
        }
        saccadeInterval = isOpen ? (1200 + Math.random() * 2500) : (4000 + Math.random() * 3000);
      }
    }

    let program;

    function resize() {
      if (!container) return;
      const w = container.offsetWidth || 100;
      const h = container.offsetHeight || 100;
      renderer.setSize(w, h);
      if (program) {
        program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height];
      }
    }
    window.addEventListener('resize', resize);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height] },
        uNoiseTexture: { value: noiseTexture },
        uPupilSize: { value: pupilSize },
        uIrisWidth: { value: irisWidth },
        uGlowIntensity: { value: glowIntensity },
        uIntensity: { value: intensity },
        uScale: { value: scale },
        uNoiseScale: { value: noiseScale },
        uMouse: { value: [0, 0] },
        uPupilFollow: { value: pupilFollow },
        uFlameSpeed: { value: flameSpeed },
        uEyelidOpen: { value: currentEyelidRef.current },
        uEyeColor: { value: currentColorRef.current },
        uBgColor: { value: hexToVec3(backgroundColor) }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);

    let animationFrameId;

    function update(time) {
      animationFrameId = requestAnimationFrame(update);

      // Natural eye gaze movement speed
      updateNaturalGaze(time);
      const isOpen = targetEyelidRef.current > 0.3;
      const moveSpeed = isOpen ? 0.07 : 0.02;
      eyeCurrent.x += (eyeTarget.x - eyeCurrent.x) * moveSpeed;
      eyeCurrent.y += (eyeTarget.y - eyeCurrent.y) * moveSpeed;

      // Micro tremor
      const tremorX = isOpen ? (Math.sin(time * 0.012) + Math.cos(time * 0.024)) * 0.012 : 0;
      const tremorY = isOpen ? (Math.cos(time * 0.015) + Math.sin(time * 0.028)) * 0.012 : 0;

      // Smooth color transitions
      const targetVec = targetColorRef.current;
      currentColorRef.current[0] += (targetVec[0] - currentColorRef.current[0]) * 0.06;
      currentColorRef.current[1] += (targetVec[1] - currentColorRef.current[1]) * 0.06;
      currentColorRef.current[2] += (targetVec[2] - currentColorRef.current[2]) * 0.06;

      // Smooth eyelid open/close transitions
      currentEyelidRef.current += (targetEyelidRef.current - currentEyelidRef.current) * 0.07;

      program.uniforms.uEyelidOpen.value = currentEyelidRef.current;
      program.uniforms.uEyeColor.value = currentColorRef.current;
      program.uniforms.uMouse.value = [eyeCurrent.x + tremorX, eyeCurrent.y + tremorY];
      program.uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
    }
    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      if (gl.canvas && container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [intensity, pupilSize, irisWidth, glowIntensity, scale, noiseScale, pupilFollow, flameSpeed, backgroundColor]);

  return <div ref={containerRef} className={`evil-eye-container ${className}`} style={style} />;
}
