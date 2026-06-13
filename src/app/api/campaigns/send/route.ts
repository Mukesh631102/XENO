import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SendCampaignSchema, formatZodIssues } from '@/lib/validations';

/**
 * POST /api/campaigns/send
 *
 * Serverless-safe producer: creates CommunicationLogs and marks the campaign SENT.
 * BullMQ/Redis queuing is skipped on Vercel (no Redis env). On a dedicated worker
 * host, import from @/lib/queue and call messageQueue.add(...) here.
 */
export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = SendCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: formatZodIssues(parsed.error) },
        { status: 400 }
      );
    }

    const { campaignId } = parsed.data;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { segment: true },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, message: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status === 'SENT') {
      return NextResponse.json({ success: false, message: 'Campaign already sent' }, { status: 400 });
    }

    // ── Build audience ──────────────────────────────────────────────────────
    type CustomerRow = { id: string; name: string; email: string; phone: string | null; preferredChannel: string };
    let customers: CustomerRow[] = [];

    try {
      const sqlQuery = (campaign.segment as any).sqlQuery as string | undefined;
      if (sqlQuery) {
        const raw = await prisma.$queryRawUnsafe<any[]>(sqlQuery);
        customers = raw.map((r) => ({
          id:               r.id,
          name:             r.name,
          email:            r.email,
          phone:            r.phone  ?? null,
          preferredChannel: r.preferred_channel ?? 'Email',
        }));
      }
    } catch { /* fall through to full list */ }

    if (customers.length === 0) {
      const allCustomers = await prisma.customer.findMany({
        select: { id: true, name: true, email: true, phone: true, preferredChannel: true },
        take: 1000,
      });
      customers = allCustomers;
    }

    // ── Create CommunicationLogs ───────────────────────────────────────────
    await Promise.all(
      customers.map((cust) =>
        prisma.communicationLog.create({
          data: {
            campaignId,
            customerId: cust.id,
            status: 'QUEUED',
          },
        })
      )
    );

    // ── Mark campaign sent ─────────────────────────────────────────────────
    await prisma.campaign.update({
      where: { id: campaignId },
      data:  { status: 'SENT' },
    });

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" launched — ${customers.length} messages queued.`,
      data:    { campaignId, queued: customers.length },
    });
  } catch (error: any) {
    console.error('POST /api/campaigns/send error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
