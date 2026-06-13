import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateCampaignSchema, formatZodIssues } from '@/lib/validations';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { id: true, name: true, audienceCount: true } },
        _count:  { select: { communicationLogs: true } },
      },
    });
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = CreateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: formatZodIssues(parsed.error) },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name:            parsed.data.name,
        objective:       parsed.data.objective,
        segmentId:       parsed.data.segmentId,
        channel:         parsed.data.channel,
        messageTemplate: parsed.data.messageTemplate,
        status:          parsed.data.status ?? 'DRAFT',
      },
      include: { segment: true },
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
