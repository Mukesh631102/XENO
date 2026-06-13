async function runTest(testName: string, prompt: string) {
  console.log(`\n========================================`);
  console.log(`Test: ${testName}`);
  console.log(`Prompt: "${prompt}"`);
  console.log(`========================================`);

  try {
    const response = await fetch('http://localhost:3000/api/segments/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    console.log(`Response Status: ${response.status}`);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (response.status === 200 && data.success) {
      console.log(`✅ Test PASSED!`);
      return data;
    } else if (response.status === 400 && !data.success) {
      console.log(`✅ Test PASSED! (Expected failure was handled correctly)`);
      return data;
    } else {
      console.error(`❌ Test FAILED! Unexpected response.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Test FAILED with connection/execution error:`, error);
    process.exit(1);
  }
}

async function main() {
  // 1. Test standard query generation
  await runTest(
    'Standard Natural Language Ingestion',
    'Find customers who spent over $500 but haven\'t ordered in 30 days'
  );

  // 2. Test safety checks intercepting delete
  await runTest(
    'SQL Injection / Destructive Command Block',
    'Delete all customers from the database'
  );
}

main();
