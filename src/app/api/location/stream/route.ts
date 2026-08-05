import { NextRequest } from 'next/server';
import { redisSubscriber } from '@/lib/redis';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Set max listeners to 0 (unlimited) to prevent memory leak warnings
// since we have one listener per connected client.
if (typeof redisSubscriber.setMaxListeners === 'function') {
  redisSubscriber.setMaxListeners(0);
}

// Ensure we are subscribed only once per server instance
let isSubscribed = false;

export async function GET(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      if (!isSubscribed) {
        redisSubscriber.subscribe('location_updates', (err) => {
          if (err) console.error('SSE Subscribe Error:', err);
        });
        isSubscribed = true;
      }

      const listener = (channel: string, message: string) => {
        if (channel === 'location_updates') {
          try {
            controller.enqueue(`data: ${message}\n\n`);
          } catch (e) {
            // Stream might be closed, ignore
          }
        }
      };

      redisSubscriber.on('message', listener);

      // Keep-alive heartbeat every 15 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(`:\n\n`);
        } catch (e) {
          clearInterval(interval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        redisSubscriber.off('message', listener);
        try {
          controller.close();
        } catch (e) {
          // Ignore close errors
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
