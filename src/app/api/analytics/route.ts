import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      totalCustomers,
      totalOrders,
      totalCampaigns,
      totalLogs,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.campaign.count(),
      prisma.communicationLog.count(),
    ]);

    // Active shoppers (purchased in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeShoppers = await prisma.customer.count({
      where: { lastPurchaseDate: { gte: thirtyDaysAgo } },
    });

    // Dormant shoppers (no purchase in 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dormantShoppers = await prisma.customer.count({
      where: {
        OR: [
          { lastPurchaseDate: { lt: ninetyDaysAgo } },
          { lastPurchaseDate: null },
        ],
      },
    });

    // Communication stats
    const [deliveredCount, failedCount, openedCount, clickedCount] = await Promise.all([
      prisma.communicationLog.count({ where: { status: { in: ['DELIVERED', 'OPENED', 'CLICKED'] } } }),
      prisma.communicationLog.count({ where: { status: 'FAILED' } }),
      prisma.communicationLog.count({ where: { status: { in: ['OPENED', 'CLICKED'] } } }),
      prisma.communicationLog.count({ where: { status: 'CLICKED' } }),
    ]);

    const deliveryRate = totalLogs > 0 ? Math.round((deliveredCount / totalLogs) * 100) : 0;
    const openRate = deliveredCount > 0 ? Math.round((openedCount / deliveredCount) * 100) : 0;
    const clickRate = openedCount > 0 ? Math.round((clickedCount / openedCount) * 100) : 0;

    // Revenue from completed orders
    const revenueResult = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalRevenue = Number(revenueResult._sum.amount || 0);

    // Recent campaigns with performance stats
    const recentCampaigns = await prisma.campaign.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { name: true } },
        _count: { select: { communicationLogs: true } },
      },
    });

    // Channel distribution
    const channelStats = await prisma.communicationLog.groupBy({
      by: ['channel'],
      _count: { id: true },
    });

    // Daily send volumes for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyLogs = await prisma.communicationLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
    });

    // Build daily breakdown
    const dailyMap: Record<string, { date: string; sent: number; delivered: number; opened: number; clicked: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, sent: 0, delivered: 0, opened: 0, clicked: 0 };
    }
    for (const log of dailyLogs) {
      const key = log.createdAt.toISOString().split('T')[0];
      if (!dailyMap[key]) continue;
      dailyMap[key].sent++;
      if (['DELIVERED', 'OPENED', 'CLICKED'].includes(log.status)) dailyMap[key].delivered++;
      if (['OPENED', 'CLICKED'].includes(log.status)) dailyMap[key].opened++;
      if (log.status === 'CLICKED') dailyMap[key].clicked++;
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          totalOrders,
          totalCampaigns,
          totalMessages: totalLogs,
          activeShoppers,
          dormantShoppers,
          totalRevenue,
        },
        performance: {
          deliveryRate,
          openRate,
          clickRate,
          deliveredCount,
          failedCount,
          openedCount,
          clickedCount,
        },
        recentCampaigns,
        channelStats,
        dailyTrend: Object.values(dailyMap),
      },
    });
  } catch (error: any) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
