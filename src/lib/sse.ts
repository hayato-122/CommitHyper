export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export type SSEStream = {
  send: (event: string, data: unknown) => void;
  close: () => void;
  error: (data: Record<string, string>) => void;
};

export function createSSEStream(): { stream: ReadableStream; sse: SSEStream } {
  let isCancelled = false;
  const encoder = new TextEncoder();

  const sse: SSEStream = { send: () => {}, close: () => {}, error: () => {} };

  const stream = new ReadableStream({
    start(controller) {
      sse.send = (event, data) => {
        if (isCancelled) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          isCancelled = true;
        }
      };
      sse.close = () => controller.close();
      sse.error = (data) => {
        sse.send("error", data);
        controller.close();
      };
    },
  });

  return { stream, sse };
}

export const SSE_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
