async function main() {
  console.log('Sending test payload to /api/ingest...');
  
  const payload = {
    customers: [
      {
        name: 'Alice Smith',
        email: `alice_${Date.now()}@example.com`,
        phone: '+15550100',
        totalSpent: 250.00,
        lastPurchaseDate: new Date().toISOString()
      },
      {
        name: 'Bob Johnson',
        email: `bob_${Date.now()}@example.com`,
        phone: null,
        totalSpent: 0.00
      }
    ],
    orders: [] // We will test orders in a separate run after we get a valid customer UUID
  };

  try {
    const response = await fetch('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log(`Response Status: ${response.status}`);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('Customer ingestion test passed!');
    } else {
      console.error('Customer ingestion test failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('API Test Request failed:', error);
    process.exit(1);
  }
}

main();
