import { Worker, Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { messageQueue } from '@/lib/queue';
import axios from 'axios';

/**
 * Message Worker – processes jobs from the MESSAGE_QUEUE_NAME.
 * In a real deployment this would be a separate long‑running process.
 * For the assignment we keep it in the same code‑base and run via
 * `npm run worker` (see package.json scripts).
 */

const channelServiceUrl = process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';

async function sendMessageProcessor(job: Job) {
  const {
    logId,
    campaignId,
    customerId,
    channel,
    messageTemplate,
    recipientEmail,
    recipientName,
    recipientPhone,
  } = job.data as any;

  // Simple templating – replace {{name}} placeholder
  const rendered = messageTemplate.replace(/{{\s*name\s*}}/gi, recipientName || 'Customer');

  try {
    // Simulate sending via external channel service (stub)
    const response = await axios.post(`${channelServiceUrl}/send`, {
      logId,
      campaignId,
      channel,
      to: channel === 'SMS' ? recipientPhone : recipientEmail,
      message: rendered,
    });

    // Expect the stub to call back our receipt endpoint – but in case of error, mark FAILED
    if (response.status !== 200) {
      await prisma.communicationLog.update({
        where: { id: logId },
        data: { status: 'FAILED' },
      });
    }
  } catch (err) {
    console.error('Message worker error for log', logId, err);
    // Record failure in DB
    await prisma.communicationLog.update({
      where: { id: logId },
      data: { status: 'FAILED' },
    });
    // Rethrow to let BullMQ handle retries/backoff
    throw err;
  }
}

// Export a factory for the subagent to start the worker when needed
export function createMessageWorker() {
  return new Worker(messageQueue.name, sendMessageProcessor, {
    connection: messageQueue.opts.connection,
    concurrency: 10,
  });
}

// If this file is executed directly (node src/workers/messageWorker.ts), start the worker.
if (require.main === module) {
  const worker = createMessageWorker();
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });
  console.log('🚀 Message worker started, listening to', messageQueue.name);
}
