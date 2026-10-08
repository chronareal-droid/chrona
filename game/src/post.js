// Cinematic post-processing with quality presets (Low → Ultra/4K).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const PRESETS = {
  low: { label: 'Low', ratio: 0.75, shadow: 1024, ao: false, bloom: false, smaa: false, dof: false, grassScale: 0.4 },
  medium: { label: 'Medium', ratio: 1, shadow: 2048, ao: false, bloom: true, smaa: true, dof: true, grassScale: 0.7 },
  high: { label: 'High', ratio: 1.5, shadow: 2048, ao: true, bloom: true, smaa: true, dof: true, grassScale: 1 },
  ultra: { label: 'Ultra · 4K', ratio: 2.5, shadow: 4096, ao: true, bloom: true, smaa: true, dof: true, grassScale: 1 },
};

// Film grade: warm highlights, teal-ish shadows, contrast curve, vignette, grain, faint chromatic fringe,
// plus the golden "Spirit" tint and a red pulse when hurt.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uSpirit: { value: 0 }, uHurt: { value: 0 },
    uVignette: { value: 0.9 }, uGrain: { value: 0.045 }, uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uSpirit, uHurt, uVignette, uGrain; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      float ca = 0.0012 + uHurt*0.006;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c*ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c*ca).b;
      float l = dot(col, vec3(.299,.587,.114));
      // split tone
      col = mix(col, col * vec3(0.92, 1.0, 1.08), smoothstep(0.5, 0.0, l) * 0.35);
      col = mix(col, col * vec3(1.08, 1.0, 0.88), smoothstep(0.35, 0.9, l) * 0.35);
      // S-curve contrast & saturation
      col = mix(vec3(l), col, 1.12);
      col = col*col*(3.0-2.0*col)*0.35 + col*0.65;
      // The Spirit: golden luminance lift and soft glow from the edges in
      float sp = uSpirit;
      col = mix(col, vec3(l)*vec3(1.25,1.05,0.7) + col*0.35, sp*0.45);
      col += vec3(1.0,0.85,0.5) * sp * 0.18 * smoothstep(0.2, 0.75, length(c));
      // hurt
      col = mix(col, col*vec3(1.4,0.55,0.5), uHurt * smoothstep(0.15, 0.7, length(c)));
      // vignette
      col *= mix(1.0, smoothstep(0.85, 0.2, length(c*vec2(1.0, 0.9))), uVignette);
      // grain
      col += (hash(uv*uRes + fract(uTime)*100.) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  composer.addPass(render);
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.blendIntensity = 0.85;
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 8 });
  // Ambient occlusion is soft by nature: compute it at half resolution (about a quarter of the cost).
  const aoSetSize = ao.setSize.bind(ao);
  ao.setSize = (w, h) => aoSetSize(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.6, 0.85);
  composer.addPass(bloom);
  const dof = new BokehPass(scene, camera, { focus: 10, aperture: 0.0025, maxblur: 0.008 });
  dof.enabled = false;
  composer.addPass(dof);
  const output = new OutputPass();
  composer.addPass(output);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  const smaa = new SMAAPass(innerWidth, innerHeight);
  composer.addPass(smaa);

  const post = { composer, bloom, ao, dof, grade, preset: 'high', cineFocus: null, scale: 1, autoRes: true };
  const setRatio = () => {
    const p = PRESETS[post.preset] || PRESETS.high;
    // Ultra renders at up to 2.5× CSS pixels, so a 1080p-CSS window on a 4K display renders native 4K.
    const ratio = Math.min(p.ratio, Math.max(devicePixelRatio, post.preset === 'ultra' ? 2 : 1)) * post.scale;
    renderer.setPixelRatio(ratio);
    composer.setPixelRatio(ratio);
    post.resize();
  };
  // Dynamic resolution: when frames run long, render fewer pixels (down to 60%); recover when there is headroom.
  // Keeps High and Ultra smooth on machines that can't hold them at full resolution.
  let acc = 0, n = 0, timer = 0;
  post.adapt = (ms, dt) => {
    if (!post.autoRes) return;
    acc += ms; n++; timer += dt;
    if (timer < 1.2) return;
    const avg = acc / n; acc = 0; n = 0; timer = 0;
    const prev = post.scale;
    if (avg > 21 && post.scale > 0.6) post.scale = Math.max(0.6, post.scale - 0.1);
    else if (avg < 14 && post.scale < 1) post.scale = Math.min(1, post.scale + 0.05);
    if (post.scale !== prev) setRatio();
  };
  post.apply = (name, sun) => {
    const p = PRESETS[name] || PRESETS.high;
    post.preset = name; post.scale = 1;
    setRatio();
    ao.enabled = p.ao; bloom.enabled = p.bloom; smaa.enabled = p.smaa;
    post.dofAllowed = p.dof;
    if (sun && sun.shadow.mapSize.x !== p.shadow) {
      sun.shadow.mapSize.set(p.shadow, p.shadow);
      sun.shadow.map?.dispose(); sun.shadow.map = null;
    }
  };
  post.resize = () => {
    composer.setSize(innerWidth, innerHeight);
    const pr = renderer.getPixelRatio();
    grade.uniforms.uRes.value.set(innerWidth * pr, innerHeight * pr);
  };
  post.render = (t, { spirit = 0, hurt = 0, cine = false, focus = 10 } = {}) => {
    grade.uniforms.uTime.value = t;
    grade.uniforms.uSpirit.value = spirit;
    grade.uniforms.uHurt.value = hurt;
    dof.enabled = post.dofAllowed && cine;
    if (dof.enabled) dof.uniforms.focus.value = focus;
    bloom.strength = 0.32 + spirit * 0.5;
    composer.render();
  };
  return post;
}
