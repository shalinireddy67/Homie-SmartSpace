/**
 * Simulation engine configuration and telemetry state models.
 */

export type SimulationSpeed = 1 | 2 | 5 | 10;

export interface SimulationState {
  running: boolean;
  speed: SimulationSpeed;
  seed: number;
  virtualTime: number;
  failNextCommand: boolean;
  failureProbability: number;
}

