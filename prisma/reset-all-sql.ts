/**
 * Full Reset using raw SQL - handles all foreign key constraints
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fullResetSQL() {
  console.log("🧹 Full database reset via SQL...\n");

  const client = await pool.connect();
  
  try {
    // First, check the actual column name in organizations
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND column_name LIKE '%team%'
    `);
    console.log("Team column in organizations:", colCheck.rows);

    // Delete data without transaction (so failures don't block subsequent deletes)
    const deletions = [
      'DELETE FROM corrective_action_plans',
      'DELETE FROM assessment_responses',
      'DELETE FROM response_documents',
      'DELETE FROM reviewer_languages',
      'DELETE FROM reviewer_certifications',
      'DELETE FROM reviewer_coi',
      'DELETE FROM coi_override',
      'DELETE FROM audit_logs',
      'DELETE FROM notifications',
      'DELETE FROM password_resets',
      'DELETE FROM findings',
      'DELETE FROM assessments',
      'DELETE FROM documents',
      'DELETE FROM review_team_members',
      'DELETE FROM review_reports',
      'DELETE FROM reviews',
      'DELETE FROM join_requests',
      'DELETE FROM reviewer_profiles',
      'DELETE FROM users',
    ];

    for (const sql of deletions) {
      try {
        const result = await client.query(sql);
        const match = sql.match(/(?:FROM|UPDATE)\s+(\w+)/i);
        const tableName = match ? match[1] : 'unknown';
        console.log(`  ✅ ${tableName}: ${result.rowCount} rows`);
      } catch (e: any) {
        const match = sql.match(/(?:FROM|UPDATE)\s+(\w+)/i);
        const tableName = match ? match[1] : 'unknown';
        if (e.code === '42P01') {
          console.log(`  ⚠️ ${tableName}: table doesn't exist`);
        } else {
          console.log(`  ❌ ${tableName}: ${e.message}`);
        }
      }
    }

    // Handle organizations and teams with correct column name
    const teamCol = colCheck.rows[0]?.column_name || 'regional_team_id';
    console.log(`\nUsing team column: ${teamCol}`);

    try {
      await client.query(`UPDATE organizations SET ${teamCol} = NULL`);
      console.log(`  ✅ organizations: team reference cleared`);
    } catch (e: any) {
      console.log(`  ⚠️ organizations team clear: ${e.message}`);
    }

    try {
      await client.query('DELETE FROM peer_support_teams');
      console.log(`  ✅ peer_support_teams: deleted`);
    } catch (e: any) {
      console.log(`  ⚠️ peer_support_teams: ${e.message}`);
    }

    try {
      await client.query('DELETE FROM regional_teams');
      console.log(`  ✅ regional_teams: deleted`);
    } catch (e: any) {
      console.log(`  ⚠️ regional_teams: ${e.message}`);
    }

    try {
      const result = await client.query('DELETE FROM organizations');
      console.log(`  ✅ organizations: ${result.rowCount} rows deleted`);
    } catch (e: any) {
      console.log(`  ❌ organizations: ${e.message}`);
    }

    console.log("\n✅ Reset complete");

    // Verify questionnaires remain
    const qResult = await client.query('SELECT COUNT(*) FROM questionnaires');
    const questions = await client.query('SELECT COUNT(*) FROM questions');
    console.log(`\n📊 Preserved data:`);
    console.log(`  Questionnaires: ${qResult.rows[0].count}`);
    console.log(`  Questions: ${questions.rows[0].count}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fullResetSQL();
