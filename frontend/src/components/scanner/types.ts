// Shared event types for the scan terminal stream

export type EventKind = "init" | "probe" | "finding" | "complete" | "error";

export interface TerminalEvent {
  id: string;
  ts: number;
  kind: EventKind;

  // init | complete | error
  text?: string;

  // probe (simulated progress during scan)
  probeName?: string;
  probeIndex?: number;
  probeTotal?: number;

  // finding (from completed scan results)
  category?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  hitRate?: number;
  hits?: number;
  total?: number;
  owaspCategory?: string;
  owaspName?: string;
  adversarialPrompt?: string;
  modelResponse?: string;
  remediation?: string;
}
