import './glass.css';
export function Lights({ paused }: { paused: boolean }) {
  return <div aria-hidden className="cc-lights" data-paused={paused} />;
}
