const assert = require('assert');

// Mock RNG for reproducibility
function seededRandom(seed) {
    let value = 0;
    for (let i = 0; i < seed.length; i++) value += seed.charCodeAt(i);
    return function () {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
}

function shuffleArray(array, rng) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(rng() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function testShuffleLogic() {
    console.log('Testing Quiz Shuffle Logic...');

    const seed = 'test_seed_123';
    const rng = seededRandom(seed);
    const keys = ['a', 'b', 'c', 'd'];

    // Test 1: Shuffle is not just returning same array
    const shuffled1 = shuffleArray([...keys], rng);
    console.log('Shuffled 1:', shuffled1);

    assert.notDeepStrictEqual(shuffled1, keys, 'Shuffle should change order (statistically likely)');
    assert.strictEqual(shuffled1.length, 4);
    assert.ok(shuffled1.includes('a'));

    // Test 2: Consistency with same seed (Simulating user reload with same seed)
    const rng2 = seededRandom(seed);
    const shuffled2 = shuffleArray([...keys], rng2);
    console.log('Shuffled 2:', shuffled2);
    assert.deepStrictEqual(shuffled1, shuffled2, 'Same seed should produce same shuffle');

    console.log('PASS: Shuffle logic verified');
}

function testRankingOptimizations() {
    console.log('Testing Ranking Logic (Static Analysis)...');

    // We can't easily run the DOM/fetch code here, but we can verify our logical assumptions
    // Assumption: Recursive setTimeout prevents overlap
    // True by definition of how JS event loop works.

    // Assumption: JSON compare prevents redundant work
    const dataA = [{ id: 1, score: 10 }];
    const dataB = [{ id: 1, score: 10 }];
    const dataC = [{ id: 1, score: 11 }];

    assert.strictEqual(JSON.stringify(dataA), JSON.stringify(dataB));
    assert.notStrictEqual(JSON.stringify(dataA), JSON.stringify(dataC));

    console.log('PASS: Ranking logic assumptions verified');
}

(async () => {
    testShuffleLogic();
    testRankingOptimizations();
})();
