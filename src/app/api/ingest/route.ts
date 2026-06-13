import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BulkIngestSchema, formatZodIssues } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = BulkIngestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: formatZodIssues(parseResult.error) },
        { status: 400 }
      );
    }

    const { customers, orders } = parseResult.data;

    if (customers.length === 0 && orders.length === 0) {
      return NextResponse.json({ success: false, message: 'No data provided.' }, { status: 400 });
    }

    let insertedCustomers = 0;
    let insertedOrders = 0;

    await prisma.$transaction(async (tx) => {
      if (customers.length > 0) {
        const result = await tx.customer.createMany({
          data: customers.map((c) => ({
            name: c.name,
            email: c.email,
            phone: c.phone ?? null,
            city: c.city ?? null,
            preferredChannel: c.preferredChannel ?? 'Email',
            totalSpent: c.totalSpent ?? 0,
            orderCount: c.orderCount ?? 0,
            lastPurchaseDate: c.lastPurchaseDate ?? null,
          })),
          skipDuplicates: true,
        });
        insertedCustomers = result.count;
      }

      if (orders.length > 0) {
        const result = await tx.order.createMany({
          data: orders.map((o) => ({
            customerId: o.customerId,
            amount: o.amount,
            status: o.status,
            createdAt: o.createdAt ?? new Date(),
          })),
        });
        insertedOrders = result.count;
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Ingestion completed successfully',
      data: { customersProcessed: customers.length, insertedCustomers, ordersProcessed: orders.length, insertedOrders },
    });
  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during ingestion', error: error.message },
      { status: 500 }
    );
  }
}
