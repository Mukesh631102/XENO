import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.CHANNEL_SERVICE_PORT || '3001', 10);
const CRM_RECEIPT_URL = process.env.CRM_RECEIPT_URL || 'http://localhost:3000/api/receipt';

/**
 * Simulated channel send endpoint.
 * Body: { logId, campaignId, channel, to, message }
 * Responds instantly with 200, then asynchronously sends a receipt
 * back to the CRM after a random short delay to simulate delivery.
 */
app.post('/send', async (req, res) => {
  const { logId, campaignId, channel, to, message } = req.body;
  if (!logId || !campaignId || !channel || !to) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Immediate ack
  res.json({ success: true, logId });

  // Simulate async delivery after 0.5‑2s
  const delay = Math.random() * 1500 + 500;
  setTimeout(async () => {
    // Randomly decide status
    const r = Math.random();
    let status: 'DELIVERED' | 'FAILED' | 'OPENED' | 'CLICKED' = 'DELIVERED';
    if (r < 0.05) status = 'FAILED';
    else if (r < 0.15) status = 'OPENED';
    else if (r < 0.20) status = 'CLICKED';

    try {
      await axios.post(CRM_RECEIPT_URL, {
        logId,
        campaignId,
        status,
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ Receipt posted for log ${logId} – ${status}`);
    } catch (e) {
      console.error('Failed to post receipt', e);
    }
  }, delay);
});

app.listen(PORT, () => {
  console.log(`📡 Channel Service listening on http://localhost:${PORT}`);
});
