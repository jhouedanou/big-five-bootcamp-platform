import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.jyycgendzegiazltvarx:fu.6uVa8%G-cStZ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  
  // Add the analyse column
  await client.query('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS analyse TEXT');
  console.log('Column "analyse" added successfully');
  
  // Add comment
  await client.query("COMMENT ON COLUMN campaigns.analyse IS 'Analyse stratégique de la campagne'");
  console.log('Comment added');
  
  // Verify
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'campaigns' 
    ORDER BY ordinal_position
  `);
  console.log('\n=== COLONNES CAMPAIGNS (' + res.rows.length + ') ===');
  res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
