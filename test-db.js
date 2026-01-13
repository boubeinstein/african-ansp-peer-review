const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.motbjvhhrcqgslqpjypw:uOKWnV6OtJ1VFTYc@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
});

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then((res) => {
    console.log('Database time:', res.rows[0].now);
    client.end();
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    client.end();
  });
