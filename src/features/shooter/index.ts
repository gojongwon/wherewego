export { InputLayer } from './InputLayer';
export { createAimState, type AimState } from './aimState';
export { usePull, type PullHandlers } from './usePull';
export {
  computeShot,
  pullToRange,
  pullRatio,
  flightTime,
  easeOut,
  heightAt,
  gaussian,
  sampleEvent,
  eventRateForWind,
  parseEventParam,
  EVENT_KINDS,
  EVENT_LABEL,
  type ShotGeometry,
  type FlightEvent,
  type EventKind,
} from './physics';
