const { query } = require('../api/_db');

async function deduplicate() {
    console.log('--- Database Cleanup Started ---');
    try {
        // 1. Delete duplicates keep only one ID per (name, bidang)
        console.log('Deduplicating org_members...');
        await query(`
            DELETE FROM org_members 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM org_members 
                GROUP BY full_name, bidang_id
            )
        `);
        console.log('Deduplication successful.');

        // 2. Add Unique Constraint to prevent future duplicates
        console.log('Adding Unique Constraint to org_members...');
        try {
            await query(`
                ALTER TABLE org_members 
                ADD CONSTRAINT unique_member_identity UNIQUE (full_name, bidang_id)
            `);
            console.log('Constraint added.');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('Constraint already exists.');
            } else {
                throw e;
            }
        }

        console.log('--- Database Cleanup Finished ---');
    } catch (err) {
        console.error('Cleanup Failed:', err);
    }
}

deduplicate().then(() => process.exit(0));
