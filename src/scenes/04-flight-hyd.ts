/** Transit · Kolkata → Hyderabad: takeoff, then the route arcs across India to Hyderabad. */
import type { SceneModule } from '../engine/types';
import { bindFlight } from './shared';

let fly: ((hold: number) => void) | null = null;

const scene: SceneModule = {
  id: '04-flight-hyd',
  prepare(svg) {
    fly = bindFlight(svg);
  },
  update({ hold }) {
    fly?.(hold);
  },
};

export default scene;
