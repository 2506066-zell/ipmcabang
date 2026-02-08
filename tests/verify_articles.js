const ArticleModel = require('../models/ArticleModel');

async function testArticles() {
    console.log('--- Starting Article Verification ---');

    // 1. Create
    console.log('1. Testing Create...');
    const newArt = await ArticleModel.create({
        title: 'Masa Depan IPM',
        content: 'Konten artikel dummy test...',
        author: 'Tester',
        image: '',
        publish_date: new Date(),
        category: 'Opini'
    });
    console.log('   Created:', newArt.id, newArt.slug);

    if (!newArt.id) throw new Error('Failed to create article');

    // 2. Find by Slug
    console.log('2. Testing FindBySlug...');
    const found = await ArticleModel.findBySlug(newArt.slug);
    console.log('   Found:', found.title);
    if (found.id !== newArt.id) throw new Error('Slug lookup failed');

    // 3. Update
    console.log('3. Testing Update...');
    const updated = await ArticleModel.update(newArt.id, { title: 'Masa Depan IPM (Updated)' });
    console.log('   Updated Slug:', updated.slug);
    if (updated.slug === newArt.slug) console.warn('   Warning: Slug did not update (might be intended or same base)');

    // 4. Increment Views
    console.log('4. Testing Increment Views...');
    await ArticleModel.incrementViews(newArt.id);
    const viewed = await ArticleModel.findById(newArt.id);
    console.log('   Views:', viewed.views);
    if (viewed.views !== 1) throw new Error('View increment failed');

    // 5. Delete
    console.log('5. Testing Delete...');
    await ArticleModel.delete(newArt.id);
    const deleted = await ArticleModel.findById(newArt.id);
    if (deleted) throw new Error('Delete failed');
    console.log('   Deleted successfully');

    console.log('--- Verification Passed ---');
    process.exit(0);
}

testArticles().catch(e => {
    console.error('Verification Failed:', e);
    process.exit(1);
});
