import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page    = parseInt(searchParams.get('page')    || '1',  10);
    const limit   = parseInt(searchParams.get('limit')   || '50', 10);
    const search  = searchParams.get('search')  || '';
    const city    = searchParams.get('city')    || '';
    const channel = searchParams.get('channel') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city)    where.city              = { equals: city,    mode: 'insensitive' };
    if (channel) where.preferredChannel  = channel;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        // Use only fields that exist on the Prisma Customer model
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          preferredChannel: true,
          totalSpent: true,
          orderCount: true,
          lastPurchaseDate: true,
          createdAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('GET /api/customers error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
