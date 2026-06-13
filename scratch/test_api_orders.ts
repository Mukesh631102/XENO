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
  console.log('Starting order ingestion test...');
  
  // 1. Fetch the first customer to get a valid UUID
  const customer = await prisma.customer.findFirst();
  if (!customer) {
    console.error('No customers found in database. Run test_api.ts first.');
    process.exit(1);
  }
  
  console.log(`Found customer: ${customer.name} (${customer.id})`);
  
  // 2. Build order payload
  const payload = {
    customers: [],
    orders: [
      {
        customerId: customer.id,
        amount: 149.99,
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
      },
      {
        customerId: customer.id,
        amount: 25.50,
        status: 'PENDING'
      }
    ]
  };

  // 3. Post to Ingestion API
  console.log('Posting orders to /api/ingest...');
  const response = await fetch('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log(`Response Status: ${response.status}`);
  const result = await response.json();
  console.log('Response Body:', JSON.stringify(result, null, 2));

  if (!result.success) {
    console.error('API call failed');
    process.exit(1);
  }

  // 4. Verify orders are in the database
  console.log('Verifying orders in database...');
  const updatedCustomer = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: { orders: true }
  });

  console.log(`Customer ${updatedCustomer?.name} now has ${updatedCustomer?.orders.length} orders:`);
  console.log(JSON.stringify(updatedCustomer?.orders, null, 2));
}

main()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
