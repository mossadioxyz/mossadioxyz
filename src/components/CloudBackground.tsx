"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./CloudBackground.css";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uVideoPrimary;
  uniform sampler2D uVideoSecondary;
  uniform float uMix;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uVideoAspect;

  varying vec2 vUv;

  // Simple pseudo-random noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Hexagon distance function
  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.866025, 0.5)), p.y);
  }

  // Hexagonal grid - returns cell center offset and edge distance
  vec4 hexGrid(vec2 uv, float scale) {
    vec2 r = vec2(1.0, 1.732);
    vec2 h = r * 0.5;
    vec2 a = mod(uv * scale, r) - h;
    vec2 b = mod(uv * scale - h, r) - h;
    vec2 gv = length(a) < length(b) ? a : b;
    float edgeDist = 0.5 - hexDist(gv);
    return vec4(gv, edgeDist, 0.0);
  }

  void main() {
    // Cover-fit the video: adjust UVs so the video covers the screen
    float screenAspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;

    if (screenAspect > uVideoAspect) {
      float scale = screenAspect / uVideoAspect;
      uv.y = (uv.y - 0.5) / scale + 0.5;
    } else {
      float scale = uVideoAspect / screenAspect;
      uv.x = (uv.x - 0.5) / scale + 0.5;
    }

    // Pixelation filter — snap UVs to a coarse grid for a blocky retro look
    float pixelCols = 400.0; // pixels across the screen
    vec2 pixelGrid = vec2(pixelCols, pixelCols / uVideoAspect);
    uv = (floor(uv * pixelGrid) + 0.5) / pixelGrid;

    vec4 videoColor = mix(
      texture2D(uVideoPrimary, uv),
      texture2D(uVideoSecondary, uv),
      uMix
    );

    // Subtle color grading — cool blue/purple shift
    videoColor.r *= 0.85;
    videoColor.g *= 0.88;
    videoColor.b *= 1.08;

    // Slight contrast boost
    videoColor.rgb = (videoColor.rgb - 0.5) * 1.12 + 0.5;

    // Heavy saturation boost
    float luma = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
    videoColor.rgb = mix(vec3(luma), videoColor.rgb, 10.2);

    // Reactivity: hexes appear based on brightness/color in the video
    float brightness = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
    // Trigger on bright areas (clouds catching light)
    float trigger = smoothstep(0.7, 0.92, brightness);

    // Holographic hexagonal grid overlay
    float hexScale = 120.0;
    vec4 hex = hexGrid(vUv, hexScale);
    float edge = smoothstep(0.0, 0.04, hex.z);

    // Rainbow hologram color shift based on position and time
    float holo = vUv.x * 3.0 + vUv.y * 2.0 + uTime * 0.4;
    vec3 holoColor = vec3(
      10.5 + 0.5 * sin(holo),
      10.5 + 0.5 * sin(holo + 2.094),
      10.5 + 0.5 * sin(holo + 4.189)
    );

    // Glowing holographic hex edges — only where triggered
    float hexGlow = (1.0 - edge) * 0.4 * trigger;
    videoColor.rgb += holoColor * hexGlow;

    // Bright holographic edge lines with shimmer — only where triggered
    float hexLine = smoothstep(0.02, 0.0, hex.z);
    float shimmer = 0.6 + 0.4 * sin(uTime * 1.5 + hex.x * 10.0 + hex.y * 10.0);
    videoColor.rgb += holoColor * hexLine * 0.15 * shimmer * trigger;

    // Iridescent inner fill — only where triggered
    float innerGlow = smoothstep(0.3, 0.1, hex.z);
    videoColor.rgb += holoColor * innerGlow * 0.015 * trigger;

    gl_FragColor = videoColor;
  }
`;

export default function CloudBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Two video elements for a seamless crossfade loop (no visible cut)
    const FADE_DURATION = 1.2; // seconds of crossfade at the loop point

    const makeVideo = () => {
      const v = document.createElement("video");
      v.src = "/videos/clouds.mp4";
      v.crossOrigin = "anonymous";
      v.loop = false; // looping is managed manually so we can crossfade
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      return v;
    };

    const videoA = makeVideo();
    const videoB = makeVideo();

    const makeTexture = (v: HTMLVideoElement) => {
      const t = new THREE.VideoTexture(v);
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.format = THREE.RGBAFormat;
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const textureA = makeTexture(videoA);
    const textureB = makeTexture(videoB);

    // Roles: primary is showing; secondary fades in as primary nears its end
    let primaryVideo = videoA;
    let secondaryVideo = videoB;
    let videoDuration = 0;

    const uniforms = {
      uVideoPrimary: { value: textureA },
      uVideoSecondary: { value: textureB },
      uMix: { value: 0 },
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      uVideoAspect: { value: 16 / 9 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    // Fullscreen triangle (more efficient than a quad)
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Update video aspect & duration once metadata loads
    videoA.addEventListener("loadedmetadata", () => {
      uniforms.uVideoAspect.value = videoA.videoWidth / videoA.videoHeight;
      videoDuration = videoA.duration;
    });

    // Start playback of the primary clip
    const playVideo = () => {
      primaryVideo.play().catch(() => {
        // Retry on user interaction
        const handleInteraction = () => {
          primaryVideo.play();
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("touchstart", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);
      });
    };
    playVideo();

    // Handle resize
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();

      // Seamless crossfade loop — fade the incoming clip in before the
      // current one ends, then swap roles so there is never a hard cut.
      if (videoDuration > 0) {
        const t = primaryVideo.currentTime;
        const fadeStart = videoDuration - FADE_DURATION;

        if (t >= fadeStart) {
          if (secondaryVideo.paused) {
            secondaryVideo.currentTime = 0;
            secondaryVideo.play().catch(() => {});
          }
          uniforms.uMix.value = Math.min((t - fadeStart) / FADE_DURATION, 2);
        } else {
          uniforms.uMix.value = 0;
        }

        // Once the primary clip finishes the fade, swap primary/secondary
        if (primaryVideo.ended || t >= videoDuration - 0.05) {
          const finishedVideo = primaryVideo;
          const primaryTex = uniforms.uVideoPrimary.value;

          primaryVideo = secondaryVideo;
          secondaryVideo = finishedVideo;

          uniforms.uVideoPrimary.value = uniforms.uVideoSecondary.value;
          uniforms.uVideoSecondary.value = primaryTex;
          uniforms.uMix.value = 0;

          // Reset the finished clip so it's ready for the next crossfade
          finishedVideo.pause();
          finishedVideo.currentTime = 0;
        }
      }

      textureA.needsUpdate = true;
      textureB.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
      videoA.pause();
      videoB.pause();
      videoA.src = "";
      videoB.src = "";
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      textureA.dispose();
      textureB.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="cloud-background" />;
}
