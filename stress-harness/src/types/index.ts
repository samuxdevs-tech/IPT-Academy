export type StepName = 'REGISTER' | 'LOGIN' | 'HOME_DASHBOARD' | 'COURSE_VIEWER' | 'LESSON_INTERACTION';

export interface UserPersona {
  id: string;
  index: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  readingSpeedWpm: number;
  jitterFactorMs: number;
  profileArchetype: 'FAST_READER' | 'METHODICAL' | 'CASUAL';
}

export interface StepMetric {
  step: StepName;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
  httpStatus?: number;
  errorMessage?: string;
}

export interface UserSimulationResult {
  personaId: string;
  email: string;
  archetype: string;
  totalDurationMs: number;
  success: boolean;
  steps: StepMetric[];
  errors: string[];
}

export interface StepAggregate {
  step: StepName;
  count: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface StressRunSummary {
  targetBaseUrl: string;
  startedAt: string;
  finishedAt: string;
  totalDurationSec: number;
  totalUsersTarget: number;
  totalCompletedUsers: number;
  successfulUsers: number;
  failedUsers: number;
  successRatePercent: number;
  overallThroughputUsersPerSec: number;
  overallLatencyStats: {
    avgMs: number;
    minMs: number;
    maxMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
    stdDevMs: number;
  };
  stepBreakdown: Record<StepName, StepAggregate>;
  failures: Array<{
    personaId: string;
    email: string;
    step: StepName;
    errorMessage: string;
  }>;
}

export interface HarnessOptions {
  totalUsers: number;
  maxConcurrency: number;
  rampUpBatchSize: number;
  baseUrl: string;
  headless: boolean;
  slowMoMs: number;
}
