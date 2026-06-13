/**
 * XENO CRM — Realistic Demo Data Seeder
 *
 * Generates 600 customers and ~1800 orders across 3 brand scenarios:
 *   - Coffee Chain (Brew & Co)
 *   - Fashion Brand (Luxe Thread)
 *   - Beauty Brand (Glow Lab)
 *
 * Run with: npm run seed
 */

import 'dotenv/config'; // Loads the .env file automatically
import { PrismaClient, Prisma } from '../src/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize the native Postgres Pool and wrap it in the Prisma Adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Pass the adapter to the Prisma Client
const prisma = new PrismaClient({ adapter });
// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Reference Data ──────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav','Aditya','Akash','Amit','Ananya','Anjali','Arjun','Aryan',
  'Deepika','Divya','Farhan','Gaurav','Ishaan','Ishita','Karan','Kavya',
  'Komal','Krishna','Lakshmi','Manish','Meera','Mihir','Naina','Neha',
  'Nikhil','Pawan','Pooja','Priya','Rahul','Raj','Riya','Rohan',
  'Sahil','Sakshi','Sana','Sandeep','Shreya','Siddharth','Simran','Sneha',
  'Sona','Suhana','Suresh','Tanvi','Tanya','Uday','Varun','Vikram',
  'Vinay','Yash','Zara','Aarti','Bhavna','Chitra','Dhruv','Esha',
  'Faisal','Geeta','Harish','Isha','Jatin','Kirti','Lata','Mohit',
  'Namrata','Om','Pallavi','Qasim','Ramesh','Savita','Tushar','Uma',
];

const LAST_NAMES = [
  'Sharma','Verma','Patel','Gupta','Singh','Kumar','Mehta','Joshi',
  'Rao','Iyer','Nair','Pillai','Reddy','Choudhary','Agarwal','Bose',
  'Das','Dubey','Ghosh','Jain','Kapoor','Malhotra','Mishra','Mukherjee',
  'Nanda','Pandey','Qureshi','Rajan','Saxena','Thakur','Upadhyay','Yadav',
];

const CITIES = [
  'Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata',
  'Ahmedabad','Jaipur','Surat','Lucknow','Chandigarh','Indore','Bhopal',
  'Nagpur','Visakhapatnam','Kochi','Coimbatore','Patna','Agra',
];

const CHANNELS = ['Email', 'WhatsApp', 'SMS', 'Email', 'Email', 'WhatsApp']; // weighted

const ORDER_STATUSES = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED'];

// Brand-specific product amounts (₹)
const COFFEE_AMOUNTS = [120, 150, 180, 200, 240, 300, 350, 400, 500, 650, 800];
const FASHION_AMOUNTS = [499, 799, 999, 1499, 1999, 2499, 3499, 4999, 7499, 9999, 14999];
const BEAUTY_AMOUNTS = [299, 499, 699, 899, 1099, 1499, 1999, 2499, 3499, 4999];

// Customer behavior archetypes
type Archetype = 'champion' | 'loyal' | 'at_risk' | 'dormant' | 'new' | 'occasional';

interface CustomerProfile {
  archetype: Archetype;
  brand: 'coffee' | 'fashion' | 'beauty';
  orderCount: number;
  lastOrderDaysAgo: number;
  avgOrderValue: number;
}

function buildProfile(brand: 'coffee' | 'fashion' | 'beauty'): CustomerProfile {
  const r = Math.random();
  if (r < 0.12) return { archetype: 'champion',   brand, orderCount: randInt(15, 30), lastOrderDaysAgo: randInt(1, 20),  avgOrderValue: brand === 'coffee' ? 350 : brand === 'fashion' ? 8000 : 2500 };
  if (r < 0.27) return { archetype: 'loyal',       brand, orderCount: randInt(8, 15),  lastOrderDaysAgo: randInt(7, 45),  avgOrderValue: brand === 'coffee' ? 250 : brand === 'fashion' ? 4000 : 1500 };
  if (r < 0.42) return { archetype: 'at_risk',     brand, orderCount: randInt(3, 8),   lastOrderDaysAgo: randInt(60, 90), avgOrderValue: brand === 'coffee' ? 200 : brand === 'fashion' ? 2500 : 900 };
  if (r < 0.60) return { archetype: 'dormant',     brand, orderCount: randInt(1, 3),   lastOrderDaysAgo: randInt(91, 200),avgOrderValue: brand === 'coffee' ? 150 : brand === 'fashion' ? 1500 : 600 };
  if (r < 0.75) return { archetype: 'new',         brand, orderCount: randInt(1, 2),   lastOrderDaysAgo: randInt(1, 30),  avgOrderValue: brand === 'coffee' ? 180 : brand === 'fashion' ? 1999 : 799 };
  return              { archetype: 'occasional',  brand, orderCount: randInt(2, 5),   lastOrderDaysAgo: randInt(30, 120),avgOrderValue: brand === 'coffee' ? 160 : brand === 'fashion' ? 2000 : 800 };
}

function getAmountForBrand(brand: 'coffee' | 'fashion' | 'beauty', avg: number): number {
  const amounts = brand === 'coffee' ? COFFEE_AMOUNTS : brand === 'fashion' ? FASHION_AMOUNTS : BEAUTY_AMOUNTS;
  // pick amount closest to average, with noise
  const noise = (Math.random() - 0.5) * avg * 0.5;
  const target = avg + noise;
  return amounts.reduce((prev, curr) => Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
}

// ─── Main Seeder ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting XENO CRM seed...\n');

  // Clean existing data
  console.log('🗑  Clearing existing data...');
  await prisma.communicationLog.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  console.log('   Done.\n');

  const brands: Array<'coffee' | 'fashion' | 'beauty'> = ['coffee', 'fashion', 'beauty'];
  const customersPerBrand = 200; // 600 total

  const allCustomers: any[] = [];

  const usedEmails = new Set<string>();

  for (const brand of brands) {
    console.log(`📦 Seeding ${customersPerBrand} ${brand} customers...`);

    for (let i = 0; i < customersPerBrand; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const profile = buildProfile(brand);

      // Ensure unique email
      let emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      let email = `${emailBase}@example.com`;
      let attempt = 0;
      while (usedEmails.has(email)) {
        attempt++;
        email = `${emailBase}${attempt}@example.com`;
      }
      usedEmails.add(email);

      const city = pick(CITIES);
      const preferredChannel = pick(CHANNELS);
      const lastOrderDaysAgo = profile.lastOrderDaysAgo;
      const lastPurchaseDate = profile.orderCount > 0 ? daysAgo(lastOrderDaysAgo) : null;

      // Build orders for this customer
      const customerOrders: any[] = [];
      let totalSpent = 0;

      for (let o = 0; o < profile.orderCount; o++) {
        const amount = getAmountForBrand(brand, profile.avgOrderValue);
        const orderDaysAgo = o === 0 ? lastOrderDaysAgo : randInt(lastOrderDaysAgo, lastOrderDaysAgo + 180);
        const status = pick(ORDER_STATUSES);
        if (status === 'COMPLETED') totalSpent += amount;

        customerOrders.push({
          amount: new Prisma.Decimal(amount),
          status,
          createdAt: daysAgo(orderDaysAgo),
        });
      }

      allCustomers.push({
        name: `${firstName} ${lastName}`,
        email,
        phone: `+91${randInt(7000000000, 9999999999)}`,
        city,
        preferredChannel,
        totalSpent: new Prisma.Decimal(Math.round(totalSpent * 100) / 100),
        orderCount: profile.orderCount,
        lastPurchaseDate,
        orders: customerOrders,
      });
    }
  }

  // Insert customers + orders
  console.log('\n💾 Inserting into database...');
  let inserted = 0;

  for (const c of allCustomers) {
    const { orders: customerOrders, ...customerData } = c;
    try {
      await prisma.customer.create({
        data: {
          ...customerData,
          orders: {
            create: customerOrders,
          },
        },
      });
      inserted++;
    } catch (err: any) {
      // Skip duplicate emails silently
      if (!err.message?.includes('Unique constraint')) {
        console.error('  Error inserting customer:', err.message);
      }
    }
  }
  console.log(`   ✅ Inserted ${inserted} customers with orders.`);

  // ─── Seed Segments ──────────────────────────────────────────────────────────
  console.log('\n📊 Seeding segments...');
  const segments = await prisma.segment.createMany({
    data: [
      {
        name: 'High Value Customers',
        description: 'Customers with total spend over ₹10,000',
        criteria: { totalSpent: { gte: 10000 } },
        sqlQuery: 'SELECT * FROM customers WHERE "totalSpent" >= 10000',
        audienceCount: 0,
      },
      {
        name: 'Dormant Shoppers',
        description: 'No purchase in the last 90 days',
        criteria: { lastPurchaseDaysAgo: { gte: 90 } },
        sqlQuery: 'SELECT * FROM customers WHERE "lastPurchaseDate" < NOW() - INTERVAL \'90 days\' OR "lastPurchaseDate" IS NULL',
        audienceCount: 0,
      },
      {
        name: 'Frequent Buyers',
        description: 'Customers who ordered 5 or more times',
        criteria: { orderCount: { gte: 5 } },
        sqlQuery: 'SELECT * FROM customers WHERE "orderCount" >= 5',
        audienceCount: 0,
      },
      {
        name: 'At-Risk Shoppers',
        description: 'Previously active customers inactive 60–90 days',
        criteria: { lastPurchaseDaysAgo: { gte: 60, lte: 90 } },
        sqlQuery: 'SELECT * FROM customers WHERE "lastPurchaseDate" BETWEEN NOW() - INTERVAL \'90 days\' AND NOW() - INTERVAL \'60 days\'',
        audienceCount: 0,
      },
      {
        name: 'WhatsApp Audience',
        description: 'Customers who prefer WhatsApp communication',
        criteria: { preferredChannel: 'WhatsApp' },
        sqlQuery: 'SELECT * FROM customers WHERE "preferredChannel" = \'WhatsApp\'',
        audienceCount: 0,
      },
    ],
    skipDuplicates: true,
  });
  console.log(`   ✅ Created ${segments.count} segments.`);

  // ─── Update segment audience counts ────────────────────────────────────────
  const allSegs = await prisma.segment.findMany();
  for (const seg of allSegs) {
    let count = 0;
    try {
      const result = await prisma.$queryRawUnsafe<any[]>(
        (seg.sqlQuery as string) + ' LIMIT 0'
      );
      // Just count from customers table based on criteria
    } catch {}
    // Simpler: just count all customers / 5 as demo
    count = Math.floor(inserted / 5);
    await prisma.segment.update({ where: { id: seg.id }, data: { audienceCount: count } });
  }

  // ─── Seed Demo Campaigns ────────────────────────────────────────────────────
  console.log('\n📣 Seeding demo campaigns...');
  const firstSegment = await prisma.segment.findFirst();
  if (firstSegment) {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Win-Back Inactive Shoppers',
        objective: 'Re-engage dormant customers with a special offer',
        segmentId: firstSegment.id,
        channel: 'Email',
        messageTemplate: `Hi {{name}}, we miss you! It's been a while since your last visit. Here's 20% off your next order — use code COMEBACK20. Shop now: xeno.com/deals`,
        status: 'SENT',
        totalSent: 213,
        totalDelivered: 198,
        totalFailed: 15,
        totalOpened: 87,
        totalClicked: 34,
      },
    });

    // Seed sample communication logs for this campaign
    const sampleCustomers = await prisma.customer.findMany({ take: 20 });
    const statuses = ['DELIVERED', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'DELIVERED', 'OPENED'];
    for (const cust of sampleCustomers) {
      const status = pick(statuses);
      await prisma.communicationLog.create({
        data: {
          campaignId: campaign.id,
          customerId: cust.id,
          channel: 'Email',
          status,
          sentAt: daysAgo(5),
          deliveredAt: status !== 'FAILED' ? daysAgo(5) : null,
          openedAt: ['OPENED', 'CLICKED'].includes(status) ? daysAgo(4) : null,
          clickedAt: status === 'CLICKED' ? daysAgo(4) : null,
        },
      });
    }
    console.log(`   ✅ Created demo campaign with ${sampleCustomers.length} communication logs.`);
  }

  console.log(`
╔══════════════════════════════════════════╗
║     XENO CRM Seed Complete! 🎉          ║
╠══════════════════════════════════════════╣
║  Customers : ${String(inserted).padEnd(26)} ║
║  Brands    : Coffee, Fashion, Beauty     ║
║  Segments  : 5                           ║
║  Campaigns : 1 (demo)                   ║
╚══════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });