const assert = require('assert');
const { buildDailyReminderPayload } = require('../api/_daily_digest');

function testGeneralReminderFallback() {
  const payload = buildDailyReminderPayload({
    quiz: null,
    form: null,
    attendanceCount: 0,
    article: null,
    material: null,
    discussion: null
  });

  assert.strictEqual(payload.title, 'Reminder IPM malam ini');
  assert.strictEqual(payload.summary, 'general');
  assert.strictEqual(payload.url, '/?source=daily-digest');
  assert.ok(payload.body.includes('Buka aplikasi IPM malam ini'));
}

function testQuizReminderPriority() {
  const payload = buildDailyReminderPayload({
    quiz: { id: 1, title: 'Quiz Kader' },
    form: null,
    attendanceCount: 0,
    article: null,
    material: null,
    discussion: null
  });

  assert.strictEqual(payload.title, 'Reminder IPM malam ini');
  assert.strictEqual(payload.summary, 'quiz');
  assert.strictEqual(payload.url, '/quiz-gamified.html?source=daily-digest');
  assert.ok(payload.body.includes('Quiz sedang aktif'));
}

function run() {
  testGeneralReminderFallback();
  testQuizReminderPriority();
  console.log('PASS: daily reminder payload stays available for users every day');
}

run();
