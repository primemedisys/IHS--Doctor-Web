/** Resolve after `ms` — used to simulate network latency for the dummy dataset. */
export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
