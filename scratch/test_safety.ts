// Copy of the safety checking function from the API route for unit testing
function isSafeSQL(sql: string): boolean {
  // Remove string literals to avoid checking content within quotes (e.g. name = 'Create')
  const sqlWithoutStrings = sql.replace(/'([^'\\]|\\.)*'/g, "''");
  
  const normalized = sqlWithoutStrings.trim().toUpperCase();

  // 1. Must start with SELECT or WITH
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
    return false;
  }

  // 2. Blacklisted SQL commands
  const blacklist = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
    'CREATE', 'REPLACE', 'GRANT', 'REVOKE', 'RENAME', 'EXECUTE',
    '--', '/*', '*/'
  ];

  for (const keyword of blacklist) {
    if (normalized.includes(keyword)) {
      const regex = new RegExp(`\\b${keyword}\\b`);
      if (regex.test(normalized)) {
        return false;
      }
    }
  }

  // 3. Prevent multiple queries
  const statements = sqlWithoutStrings.split(';').map(s => s.trim()).filter(Boolean);
  if (statements.length > 1) {
    return false;
  }

  return true;
}

function runTestCase(sql: string, expectedSafe: boolean) {
  const result = isSafeSQL(sql);
  const status = result === expectedSafe ? '✅ PASSED' : '❌ FAILED';
  console.log(`Query: "${sql.replace(/\n/g, ' ')}"`);
  console.log(`Expected: ${expectedSafe ? 'SAFE' : 'UNSAFE'}, Got: ${result ? 'SAFE' : 'UNSAFE'} -> ${status}\n`);
  if (result !== expectedSafe) {
    process.exit(1);
  }
}

async function main() {
  console.log('Running SQL Safety Checker Unit Tests...\n');

  // Positive cases (should be safe)
  runTestCase('SELECT * FROM customers', true);
  runTestCase('SELECT c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.name', true);
  runTestCase("SELECT * FROM customers WHERE name = 'Create'", true); // "Create" as string value, allowed now by string stripping
  runTestCase("SELECT * FROM customers WHERE email = 'delete_me@test.com'", true); // "delete" as email prefix, allowed
  runTestCase('WITH inactive AS (SELECT id FROM customers WHERE last_purchase_date < NOW() - INTERVAL \'30 days\') SELECT * FROM inactive', true);

  // Negative cases (should be blocked)
  runTestCase('DELETE FROM customers', false);
  runTestCase('DROP TABLE customers', false);
  runTestCase('SELECT * FROM customers; DROP TABLE orders', false); // Chained queries
  runTestCase('INSERT INTO customers (name, email) VALUES (\'John\', \'john@xeno.com\')', false);
  runTestCase('UPDATE customers SET total_spent = 9999', false);
  runTestCase('SELECT * FROM customers -- comment', false); // Comments blocked
  runTestCase('SELECT * FROM customers /* block comment */', false); // Block comments blocked

  console.log('All safety checker unit tests passed successfully!');
}

main();
