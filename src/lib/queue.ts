import { Queue, Worker, Job } from 'bullmq';

// Redis connection — use host/port format (not url string) for ioredis compatibility
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null, // Required by BullMQ
};

export const MESSAGE_QUEUE_NAME = 'xeno-messages';

// Singleton queue instance for producers (API routes)
export const messageQueue = new Queue(MESSAGE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Factory to create a BullMQ Worker.
 * Called only in the worker process (messageWorker.ts), never in Next.js routes.
 *
 * ARCHITECTURE NOTE:
 * At enterprise scale, this worker would run on a dedicated EC2/Cloud Run instance
 * completely separate from the Next.js web server. That way:
 *   - Campaign sends don't block HTTP request handling
 *   - Workers can scale independently based on queue depth
 *   - Failures in workers don't crash the web tier
 */
export function createMessageWorker(
  processor: (job: Job<any, any, string>) => Promise<any>
) {
  return new Worker(MESSAGE_QUEUE_NAME, processor, {
    connection: redisConnection,
    concurrency: 10, // Process 10 messages in parallel
    limiter: {
      max: 100,       // Max 100 jobs per duration
      duration: 1000, // Per second
    },
  });
}

export { redisConnection };
