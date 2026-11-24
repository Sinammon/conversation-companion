import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { OrbArt } from './orb-art';
import { vert, frag } from './orb-shader';

export function Orb({ size, listening, track }: { size: number; listening?: boolean; track?: MediaStreamTrack }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const level = useRef(0);
  useEffect(() => {
    if (!listening || !track || track.readyState !== 'live' || !window.AudioContext) return;
    let audio: AudioContext | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      const stream = new MediaStream([track]);
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      audio.createMediaStreamSource(stream).connect(analyser);
      void audio.resume().catch(() => {});
      const samples = new Float32Array(analyser.fftSize);
      timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const energy = samples.reduce((sum, value) => sum + value * value, 0);
        level.current = Math.min(1, Math.sqrt(energy / samples.length) * 5);
      }, 80);
    } catch { /* The recognizer remains usable when audio analysis is unavailable. */ }
    return () => { clearInterval(timer); level.current = 0; void audio?.close().catch(() => {}); };
  }, [listening, track]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) return;
    const renderer = new Renderer({ canvas: el, webgl: 1, alpha: true, premultipliedAlpha: true, dpr: Math.min(devicePixelRatio, 2) });
    renderer.setSize(size, size);
    const geometry = new Triangle(renderer.gl);
    const uniforms = { iTime: { value: 0 }, iResolution: { value: [el.width, el.height, 1] },
      hue: { value: 0 }, rot: { value: 0 }, hover: { value: 0 }, hoverIntensity: { value: 0 } };
    const program = new Program(renderer.gl, { vertex: vert, fragment: frag, uniforms });
    const mesh = new Mesh(renderer.gl, { geometry, program });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function draw(time: number) {
      uniforms.iTime.value = motion.matches ? 1 : time * .00019;
      uniforms.hover.value = motion.matches ? 0 : level.current;
      uniforms.hoverIntensity.value = .65;
      renderer.render({ scene: mesh });
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function restart() { cancelAnimationFrame(frame); draw(performance.now()); }
    restart();
    motion.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', restart);
      geometry.remove(); program.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [size]);
  return <div aria-hidden style={{ width: size, height: size, position: 'relative', pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: '8%' }}><OrbArt size={size * .84} /></div>
    <canvas key={size} ref={canvas} style={{ position: 'absolute', inset: 0 }} />
  </div>;
}
