import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReceiptSchema, formatZodIssues } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = ReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: formatZodIssues(parsed.error) },
        { status: 400 }
      );
    }

    const { logId, campaignId, status, timestamp } = parsed.data;
    const ts = timestamp ? new Date(timestamp) : new Date();

    const logUpdate: any = { status };
    if (status === 'DELIVERED') logUpdate.deliveredAt = ts;
    if (status === 'OPENED')    { logUpdate.deliveredAt = ts; logUpdate.openedAt = ts; }
    if (status === 'CLICKED')   { logUpdate.deliveredAt = ts; logUpdate.openedAt = ts; logUpdate.clickedAt = ts; }

    await prisma.communicationLog.update({ where: { id: logId }, data: logUpdate });

    const campaignUpdate: any = {};
    if (status === 'DELIVERED') campaignUpdate.totalDelivered = { increment: 1 };
    if (status === 'FAILED')    campaignUpdate.totalFailed    = { increment: 1 };
    if (status === 'OPENED')    { campaignUpdate.totalDelivered = { increment: 1 }; campaignUpdate.totalOpened = { increment: 1 }; }
    if (status === 'CLICKED')   { campaignUpdate.totalDelivered = { increment: 1 }; campaignUpdate.totalOpened = { increment: 1 }; campaignUpdate.totalClicked = { increment: 1 }; }

    if (Object.keys(campaignUpdate).length > 0) {
      await prisma.campaign.update({ where: { id: campaignId }, data: campaignUpdate });
    }

    return NextResponse.json({ success: true, logId, status });
  } catch (error: any) {
    console.error('POST /api/receipt error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
