import 'dotenv/config';

interface GeneratedQuery {
  name: string;
  description: string;
  sql: string;
  explanation: string;
}

interface MessageTemplate {
  channel: 'Email' | 'WhatsApp';
  subject?: string;
  body: string;
}

const SCHEMA_SUMMARY = `
We have the following PostgreSQL tables and columns:

1. Table "customers"
   - "id": UUID (Primary Key, e.g. 'ac025664-5a8f-4b1a-bbe0-87fe0e80cdb3')
   - "name": VARCHAR/TEXT
   - "email": VARCHAR/TEXT (Unique)
   - "phone": VARCHAR/TEXT (Nullable)
   - "total_spent": NUMERIC/DECIMAL (e.g. 250.00)
   - "last_purchase_date": TIMESTAMP WITH TIME ZONE (Nullable, e.g. '2026-06-01T12:00:00Z')
   - "created_at": TIMESTAMP WITH TIME ZONE
   - "updated_at": TIMESTAMP WITH TIME ZONE

2. Table "orders"
   - "id": UUID (Primary Key)
   - "customer_id": UUID (Foreign Key references "customers"."id")
   - "amount": NUMERIC/DECIMAL
   - "status": VARCHAR/TEXT (e.g. 'COMPLETED', 'PENDING', 'FAILED')
   - "created_at": TIMESTAMP WITH TIME ZONE

Write a read-only PostgreSQL SELECT query to solve the marketer's prompt. 
- Return only columns from the "customers" table, or "customers.*" if selecting all customer columns.
- For date math, use standard PostgreSQL math, e.g. "NOW() - INTERVAL '30 days'".
- Ensure you query from the mapped table names "customers" and "orders" (in lowercase).
`;

const SYSTEM_PROMPT_SQL = `
You are a PostgreSQL expert and database translator for a CRM system.
Your job is to translate natural language prompts from marketers into clean, read-only PostgreSQL SELECT queries.

${SCHEMA_SUMMARY}

Rules:
1. ONLY return a JSON object with the following keys:
   - "name": A descriptive name for the segment (max 5 words).
   - "description": A concise description of the criteria.
   - "sql": The exact, executable PostgreSQL query.
   - "explanation": Brief explanation of the logic.
2. The SQL query MUST only contain read-only SELECT statements. No inserts, updates, deletes, alters, drops, etc.
3. Only query from "customers" and "orders" tables.
4. Return ONLY valid JSON. Do not include markdown code block backticks (like \`\`\`json). Just return the raw JSON object string.
`;

const SYSTEM_PROMPT_COPY = `
You are a senior conversion copywriter.
Based on a segment's description, write 3 personalized marketing messages tailored to that audience.
- You can draft for Email or WhatsApp channels.
- Keep them engaging, persuasive, and highly aligned with the audience's behavioral attributes.
- Use placeholders like {{name}} or {{totalSpent}} for personalization.

Return a JSON array containing exactly 3 objects. Each object must have these keys:
- "channel": Either "Email" or "WhatsApp".
- "subject": (Only required for Email channel, null or omit for WhatsApp) A catchy email subject line.
- "body": The text of the message template.

Return ONLY valid JSON. Do not include markdown code block backticks.
`;

// Helper to clean JSON response (strips markdown code blocks if the LLM ignores instructions)
function cleanJsonResponse(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '');
  }
  return cleaned.trim();
}

export async function generateSQLQuery(prompt: string): Promise<GeneratedQuery> {
  const apiKey = process.env.GROQ_API_KEY;

  // Fallback Mock Mode if API Key is not set
  if (!apiKey) {
    console.log('GROQ_API_KEY is not set. Running in Mock Mode...');
    const normalizedPrompt = prompt.toLowerCase();
    
    if (normalizedPrompt.includes('500') || normalizedPrompt.includes('30 days')) {
      return {
        name: 'VIP Customers Inactive 30 Days',
        description: 'Customers with total spent > $500 and last purchase older than 30 days',
        sql: `SELECT * FROM customers WHERE total_spent > 500 AND (last_purchase_date IS NULL OR last_purchase_date < NOW() - INTERVAL '30 days')`,
        explanation: 'Filters customers whose total spent is greater than $500 and last purchase date was either never or more than 30 days ago.',
      };
    }
    
    // Default generic mock
    return {
      name: 'All Customers Segment',
      description: 'Default fallback segment returning all customers',
      sql: `SELECT * FROM customers`,
      explanation: 'Returns all customers without filters.',
    };
  }

  // Active Groq API Call
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_SQL },
          { role: 'user', content: `Prompt: "${prompt}"` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '';
    const cleanedContent = cleanJsonResponse(rawContent);
    
    return JSON.parse(cleanedContent) as GeneratedQuery;
  } catch (error) {
    console.error('LLM SQL Generation Error:', error);
    throw new Error(`Failed to generate SQL query from LLM: ${(error as any).message}`);
  }
}

export async function generateTemplates(segmentName: string, segmentDescription: string): Promise<MessageTemplate[]> {
  const apiKey = process.env.GROQ_API_KEY;

  // Fallback Mock Mode if API Key is not set
  if (!apiKey) {
    console.log('GROQ_API_KEY is not set. Running in Mock Mode for Copywriter...');
    return [
      {
        channel: 'Email',
        subject: "We miss you, {{name}}! Here's $50 off your next purchase",
        body: "Hi {{name}},\n\nWe noticed you haven't shopped with us recently, and we miss having you around. Since you are one of our VIP customers, we'd love to invite you back with a special gift: use code VIP50 to get $50 off your next purchase of $200 or more!\n\nShop our new arrivals now: xeno.com/shop"
      },
      {
        channel: 'WhatsApp',
        body: "Hey {{name}}! 👋 We notice it's been over a month since your last visit. We'd love to see you again! Here's a special 15% off code: VIP15. Check out our fresh stock: xeno.com/new"
      },
      {
        channel: 'Email',
        subject: "Exclusive Preview: New Collection Access for {{name}}",
        body: "Dear {{name}},\n\nIt's been a while, but we wanted to make sure you didn't miss out. As a premier shopper, you have exclusive early access to our new premium collection.\n\nBrowse here: xeno.com/vip-early-access"
      }
    ];
  }

  // Active Groq API Call
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_COPY },
          { role: 'user', content: `Segment Name: "${segmentName}"\nDescription: "${segmentDescription}"` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '';
    const cleanedContent = cleanJsonResponse(rawContent);

    return JSON.parse(cleanedContent) as MessageTemplate[];
  } catch (error) {
    console.error('LLM Copywriter Error:', error);
    throw new Error(`Failed to generate copywriter templates: ${(error as any).message}`);
  }
}
