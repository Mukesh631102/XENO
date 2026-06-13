import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page       = parseInt(searchParams.get('page')       || '1',  10);
    const limit      = parseInt(searchParams.get('limit')      || '50', 10);
    const status     = searchParams.get('status')     || '';
    const customerId = searchParams.get('customerId') || '';

    const where: any = {};
    if (status)     where.status     = status;
    if (customerId) where.customerId = customerId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
