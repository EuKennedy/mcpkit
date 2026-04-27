/**
 * Lifecycle events emitted by a defined server. Subscribe via the `onEvent`
 * option of `defineServer` to plug in logging, metrics, or tracing without
 * polluting the tool handlers.
 */
export type ServerEvent =
  | { type: 'tool.start'; tool: string; input: unknown; requestId: string }
  | {
      type: 'tool.end';
      tool: string;
      requestId: string;
      durationMs: number;
      isError: boolean;
    }
  | {
      type: 'tool.error';
      tool: string;
      requestId: string;
      durationMs: number;
      error: Error;
    }
  | { type: 'resource.read'; uri: string }
  | { type: 'prompt.get'; name: string };

export type EventListener = (event: ServerEvent) => void;

/**
 * Format a server event into a single human-readable line. Useful when you
 * want simple stderr logging without pulling in a logging library.
 */
export function formatEvent(event: ServerEvent): string {
  switch (event.type) {
    case 'tool.start':
      return `→ ${event.tool}() [${event.requestId}]`;
    case 'tool.end': {
      const status = event.isError ? '✖' : '✔';
      return `${status} ${event.tool}() ${event.durationMs}ms [${event.requestId}]`;
    }
    case 'tool.error':
      return `✖ ${event.tool}() ${event.durationMs}ms [${event.requestId}] — ${event.error.message}`;
    case 'resource.read':
      return `↓ resource ${event.uri}`;
    case 'prompt.get':
      return `↓ prompt ${event.name}`;
  }
}

/**
 * A ready-made listener that writes one line per event to stderr. Stdout is
 * reserved for protocol traffic on stdio transports, so logging always goes
 * to stderr.
 */
export function consoleLogger(): EventListener {
  return (event) => {
    process.stderr.write(`${formatEvent(event)}\n`);
  };
}

/**
 * A listener that emits one JSON object per event to stderr. Pipe this into
 * your log aggregator of choice.
 */
export function jsonLogger(): EventListener {
  return (event) => {
    const payload =
      event.type === 'tool.error'
        ? {
            ...event,
            error: { name: event.error.name, message: event.error.message },
          }
        : event;
    process.stderr.write(`${JSON.stringify(payload)}\n`);
  };
}
