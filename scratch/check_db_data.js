const { query } = require('../api/_db');

async function checkData() {
    try {
        const members = await query`SELECT COUNT(*) FROM org_members`;
        const bidang = await query`SELECT COUNT(*) FROM org_bidang`;
        const rooms = await query`SELECT id, pimpinan FROM attendance_rooms`;
        
        console.log('--- DATABASE HEALTH CHECK ---');
        console.log('Total Members (org_members):', members.rows[0].count);
        console.log('Total Sectors (org_bidang):', bidang.rows[0].count);
        console.log('Total Rooms (attendance_rooms):', rooms.rows.length);
        rooms.rows.forEach(r => console.log(` - ID ${r.id}: ${r.pimpinan}`));
        
        if (members.rows[0].count == 0) {
            console.log('\nWARNING: org_members TABLE IS EMPTY!');
        }
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        process.exit();
    }
}

checkData();
