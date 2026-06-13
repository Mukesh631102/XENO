import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Testing Prisma database connection inside workspace...');
  
  // 1. Create a customer
  const email = `test_${Date.now()}@example.com`;
  console.log(`Creating customer with email: ${email}`);
  const customer = await prisma.customer.create({
    data: {
      name: 'Jane Doe',
      email,
      phone: '+15550199',
      totalSpent: 120.50,
      lastPurchaseDate: new Date(),
    },
  });
  console.log('Created Customer:', customer);
  
  // 2. Create an order associated with the customer
  console.log(`Creating order for customer: ${customer.id}`);
  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      amount: 45.75,
      status: 'COMPLETED',
    },
  });
  console.log('Created Order:', order);
  
  // 3. Query the customer with their orders
  console.log('Retrieving customer from database...');
  const retrieved = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: { orders: true },
  });
  console.log('Retrieved Customer with Orders:', JSON.stringify(retrieved, null, 2));

  // 4. Cleanup test data
  console.log('Cleaning up test data...');
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log('Cleanup completed successfully.');
}

main()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
