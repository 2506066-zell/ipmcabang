const { query } = require('./api/_db');

async function fixCorruptedPaths() {
    try {
        console.log('Starting cleanup of corrupted image paths...');
        
        // Fix org_members
        const resMembers = await query(
            "UPDATE org_members SET photo_url = SUBSTRING(photo_url FROM 2) WHERE photo_url LIKE '/data:image%'"
        );
        console.log(`Fixed ${resMembers.rowCount} members.`);

        // Fix org_bidang
        const resBidang = await query(
            "UPDATE org_bidang SET image_url = SUBSTRING(image_url FROM 2) WHERE image_url LIKE '/data:image%'"
        );
        console.log(`Fixed ${resBidang.rowCount} bidang.`);

        console.log('Cleanup completed.');
    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        process.exit(0);
    }
}

fixCorruptedPaths();
