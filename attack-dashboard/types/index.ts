export type Environment = 'vulnerable' | 'aws';

export type AttackResult = {
  attempt: number;
  status: number;
  latency: number;
  blocked: boolean;
  label?: string;   // 예: "BLOCKED", "REACHED", "ERROR"
  error?: string;
};

export type AttackEvent =
  | { type: 'start' }
  | {
      type: 'result';
      env: Environment;
      attempt: number;
      status: number;
      latency: number;
      blocked: boolean;
      label?: string;
      error?: string;
    }
  | { type: 'complete' }
  | { type: 'error'; message: string };

export type AttackPhase = 'idle' | 'running' | 'complete' | 'error';

export type EnvConfig = {
  url: string;
  s3Url?: string;
  configured: boolean;
};

export type DashboardConfig = {
  vulnerable: EnvConfig;
  aws: EnvConfig;
};
