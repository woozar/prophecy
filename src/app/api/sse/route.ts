import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { sseEmitter } from '@/lib/sse/event-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const clientId = `${session.userId}-${Date.now()}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Register client
      sseEmitter.addClient(clientId, controller);

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        sseEmitter.removeClient(clientId);
      });
    },
    cancel() {
      sseEmitter.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
