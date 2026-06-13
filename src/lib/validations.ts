import { z } from 'zod';

export const CustomerIngestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  preferredChannel: z.enum(['Email', 'WhatsApp', 'SMS', 'RCS']).optional().default('Email'),
  totalSpent: z.coerce.number().min(0).optional().default(0),
  orderCount: z.coerce.number().int().min(0).optional().default(0),
  lastPurchaseDate: z.coerce.date().nullable().optional(),
});

export const OrderIngestSchema = z.object({
  customerId: z.string().uuid('Customer ID must be a valid UUID'),
  amount: z.coerce.number().positive('Amount must be positive'),
  status: z.string().min(1, 'Status is required'),
  createdAt: z.coerce.date().optional(),
});

export const BulkIngestSchema = z.object({
  customers: z.array(CustomerIngestSchema).optional().default([]),
  orders: z.array(OrderIngestSchema).optional().default([]),
});

export const CreateSegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  // Use z.record with explicit value type (Zod v4 requires explicit key/value)
  criteria: z.record(z.string(), z.unknown()),
  sqlQuery: z.string().optional().default(''),
  audienceCount: z.number().int().optional().default(0),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  objective: z.string().optional().default(''),
  segmentId: z.string().uuid('Invalid segment ID'),
  channel: z.enum(['Email', 'WhatsApp', 'SMS', 'RCS']),
  messageTemplate: z.string().min(1, 'Message template is required'),
  status: z.enum(['DRAFT', 'SENT', 'SCHEDULED']).optional().default('DRAFT'),
});

export const SendCampaignSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
});

export const ReceiptSchema = z.object({
  logId: z.string().uuid(),
  campaignId: z.string().uuid(),
  customerId: z.string().uuid(),
  status: z.enum(['DELIVERED', 'FAILED', 'OPENED', 'CLICKED']),
  timestamp: z.string().optional(),
});

export const AiPromptSchema = z.object({
  prompt: z.string().min(1),
});

// Zod v4: use .issues instead of .errors
export function formatZodIssues(err: z.ZodError) {
  return err.issues.map((i) => ({ path: i.path, message: i.message }));
}

export type CustomerIngestInput = z.infer<typeof CustomerIngestSchema>;
export type OrderIngestInput = z.infer<typeof OrderIngestSchema>;
export type BulkIngestInput = z.infer<typeof BulkIngestSchema>;
export type CreateSegmentInput = z.infer<typeof CreateSegmentSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
