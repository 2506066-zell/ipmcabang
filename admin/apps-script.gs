const DEFAULTS_ = {
  QUESTIONS_SHEET: 'Questions',
  RESULTS_SHEET: 'Results',
  PUBLIC_ACTION: 'questions',
};

/**
 * Login admin diset di sini (pakai array).
 * GANTI username/password sebelum deploy ke publik.
 */
const ADMINS_ = [
  { username: 'admin', password: 'admin123' },
  // { username: 'admin2', password: 'passwordKuat' },
];

const ADMIN_SESSION_TTL_SECONDS_ = 60 * 60 * 6; // 6 jam
const ADMIN_SESSION_PREFIX_ = 'admin_session:';

/**
 * Jalankan sekali dari Apps Script editor (Run) untuk membuat sheet header otomatis.
 * Ini tidak wajib, tapi membantu kalau spreadsheet masih kosong.
 */
function setup_() {
  const { questionsSheet, resultsSheet } = getSheets_();
  ensureQuestionsHeader_(questionsSheet);
  ensureResultsHeader_(resultsSheet);
  Logger.log('Setup OK. Admin usernames: %s', ADMINS_.map(a => a.username).join(', '));
}

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || DEFAULTS_.PUBLIC_ACTION).trim();
  try {
    switch (action) {
      case 'health':
        return json_({ status: 'success', service: 'ipm-quiz', time: new Date().toISOString() });
      case 'getResults':
        return handlePublicResultsGet_();
      case DEFAULTS_.PUBLIC_ACTION:
        return handlePublicQuestionsGet_();
      default:
        return json_({ status: 'error', message: 'Unknown action.' });
    }
  } catch (err) {
    return json_({ status: 'error', message: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String((body && body.action) || '').trim();

    if (action === 'submitQuiz') return handleSubmitQuizPost_(body);
    if (action === 'adminLogin') return handleAdminLoginPost_(body);
    if (action === 'adminQuestions') return handleAdminQuestionsPost_(body);
    if (action === 'adminResults') return handleAdminResultsPost_(body);
    if (action === 'adminUpsertQuestion') return handleAdminUpsertQuestionPost_(body);
    if (action === 'adminDeleteQuestion') return handleAdminDeleteQuestionPost_(body);

    return json_({ status: 'error', message: 'Unknown action.' });
  } catch (err) {
    return json_({ status: 'error', message: String(err && err.message ? err.message : err) });
  }
}

function handlePublicQuestionsGet_() {
  const { questionsSheet } = getSheets_();
  const header = ensureQuestionsHeader_(questionsSheet);
  const map = buildQuestionsMap_(header);

  const values = questionsSheet.getDataRange().getValues();
  const questions = values
    .slice(1)
    .map(row => rowToQuestion_(row, map))
    .filter(q => q && q.active)
    .map(q => ({ id: q.id, question: q.question, options: q.options }));

  return json_({ status: 'success', questions });
}

function handleSubmitQuizPost_(body) {
  const username = String(body.username || '').trim();
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : null;
  if (!username) return json_({ status: 'error', message: 'Nama wajib diisi.' });
  if (!answers) return json_({ status: 'error', message: 'Jawaban tidak valid.' });

  const { questionsSheet, resultsSheet } = getSheets_();
  const header = ensureQuestionsHeader_(questionsSheet);
  const map = buildQuestionsMap_(header);

  const values = questionsSheet.getDataRange().getValues();
  const allQuestions = values
    .slice(1)
    .map(row => rowToQuestion_(row, map))
    .filter(Boolean)
    .filter(q => q.active);

  const total = allQuestions.length;
  if (total === 0) return json_({ status: 'error', message: 'Belum ada soal aktif.' });

  let score = 0;
  allQuestions.forEach(q => {
    const answer = String(answers[String(q.id)] || '').trim().toLowerCase();
    if (answer && answer === String(q.correct_answer || '').toLowerCase()) score += 1;
  });

  const percent = Math.round((score / total) * 100);
  appendResult_(resultsSheet, { username, score, total, percent, time_spent });

  return json_({ status: 'success', score, total, percent });
}

function handleAdminLoginPost_(body) {
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) return json_({ status: 'error', message: 'Username dan password wajib diisi.' });

  const admin = findAdmin_(username);
  if (!admin) return json_({ status: 'error', message: 'Username atau password salah.' });
  if (!verifyAdminPassword_(admin, password)) return json_({ status: 'error', message: 'Username atau password salah.' });

  const session = createAdminSession_(admin.username);
  return json_({ status: 'success', session, username: admin.username });
}

function handleAdminQuestionsPost_(body) {
  const session = String(body.session || '').trim();
  assertAdminSession_(session);

  const { questionsSheet } = getSheets_();
  const header = ensureQuestionsHeader_(questionsSheet);
  const map = buildQuestionsMap_(header);
  const values = questionsSheet.getDataRange().getValues();

  const questions = values
    .slice(1)
    .map(row => rowToQuestion_(row, map))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

  return json_({ status: 'success', questions });
}

function handleAdminResultsPost_(body) {
  const session = String(body.session || '').trim();
  assertAdminSession_(session);

  const { resultsSheet } = getSheets_();
  const values = resultsSheet.getDataRange().getValues();
  if (values.length <= 1) return json_({ status: 'success', results: [] });

  const header = values[0].map(v => String(v || '').trim().toLowerCase());
  const map = buildResultsMap_(header);
  const tz = Session.getScriptTimeZone();

  const results = values
    .slice(1)
    .filter(r => r.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .slice(-200)
    .reverse()
    .map(row => ({
      timestamp: formatTs_(row[map.timestamp], tz),
      username: String(row[map.username] || ''),
      score: toNumber_(row[map.score]),
      total: toNumber_(row[map.total]),
      percent: toNumber_(row[map.percent]),
    }));

  return json_({ status: 'success', results });
}

function handleAdminUpsertQuestionPost_(body) {
  const session = String(body.session || '').trim();
  assertAdminSession_(session);

  const input = body.question || {};
  const id = input.id ? Number(input.id) : null;
  const question = String(input.question || '').trim();
  const options = input.options && typeof input.options === 'object' ? input.options : {};
  const a = String(options.a || '').trim();
  const b = String(options.b || '').trim();
  const c = String(options.c || '').trim();
  const d = String(options.d || '').trim();
  const correct = String(input.correct_answer || '').trim().toLowerCase();
  const active = input.active === false ? false : true;

  if (!question) return json_({ status: 'error', message: 'Pertanyaan wajib diisi.' });
  if (!a || !b || !d) return json_({ status: 'error', message: 'Opsi A, B, dan D wajib diisi.' });
  if (!['a', 'b', 'c', 'd'].includes(correct)) return json_({ status: 'error', message: 'Jawaban benar harus A/B/C/D.' });

  const { questionsSheet } = getSheets_();
  const header = ensureQuestionsHeader_(questionsSheet);
  const map = buildQuestionsMap_(header);
  const values = questionsSheet.getDataRange().getValues();

  const dataRows = values.slice(1);
  const currentIds = dataRows.map(r => toNumber_(getByIndices_(r, map.id)) || 0).filter(n => n > 0);
  const nextId = currentIds.length ? Math.max.apply(null, currentIds) + 1 : 1;

  const finalId = id && id > 0 ? id : nextId;

  let rowIndex = -1;
  for (let i = 0; i < dataRows.length; i++) {
    const rowId = toNumber_(getByIndices_(dataRows[i], map.id));
    if (rowId === finalId) {
      rowIndex = i + 2;
      break;
    }
  }

  const now = new Date();
  const row = rowIndex > 0 ? questionsSheet.getRange(rowIndex, 1, 1, header.length).getValues()[0] : new Array(header.length).fill('');

  setByIndices_(row, map.id, finalId);
  setByIndices_(row, map.question, question);
  setByIndices_(row, map.a, a);
  setByIndices_(row, map.b, b);
  setByIndices_(row, map.c, c);
  setByIndices_(row, map.d, d);
  setByIndices_(row, map.correct_answer, correct);
  setByIndices_(row, map.active, active);
  setByIndices_(row, map.updated_at, now);

  if (rowIndex > 0) {
    questionsSheet.getRange(rowIndex, 1, 1, header.length).setValues([row]);
  } else {
    questionsSheet.appendRow(row);
  }

  const saved = rowToQuestion_(row, map);
  return json_({ status: 'success', question: saved });
}

function handleAdminDeleteQuestionPost_(body) {
  const session = String(body.session || '').trim();
  assertAdminSession_(session);

  const id = Number(body.id);
  if (!id || id <= 0) return json_({ status: 'error', message: 'ID tidak valid.' });

  const { questionsSheet } = getSheets_();
  const header = ensureQuestionsHeader_(questionsSheet);
  const map = buildQuestionsMap_(header);
  const values = questionsSheet.getDataRange().getValues();
  const dataRows = values.slice(1);

  let rowIndex = -1;
  for (let i = 0; i < dataRows.length; i++) {
    const rowId = toNumber_(getByIndices_(dataRows[i], map.id));
    if (rowId === id) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex <= 0) return json_({ status: 'error', message: 'Soal tidak ditemukan.' });
  questionsSheet.deleteRow(rowIndex);
  return json_({ status: 'success' });
}

function handlePublicResultsGet_() {
  const { resultsSheet } = getSheets_();
  const values = resultsSheet.getDataRange().getValues();
  if (values.length <= 1) return json_([]);

  const header = values[0].map(v => String(v || '').trim().toLowerCase());
  const map = buildResultsMap_(header);

  if (map.username === -1 || map.percent === -1 || map.timestamp === -1) {
    return json_({ status: 'error', message: 'Header kolom tidak sesuai di sheet Results. Pastikan ada "username", "percent", dan "timestamp".' });
  }

  const rankingData = values
    .slice(1)
    .map(row => ({
      username: String(row[map.username] || ''),
      score: toNumber_(row[map.score]),
      total: toNumber_(row[map.total]),
      percent: toNumber_(row[map.percent]),
      timestamp: row[map.timestamp]
    }))
    .filter(r => r.username);

  return json_(rankingData);
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const raw = String(e.postData.contents || '');
  return raw ? JSON.parse(raw) : {};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheets_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  const questionsSheetName = String(props.getProperty('QUESTIONS_SHEET') || DEFAULTS_.QUESTIONS_SHEET).trim();
  const resultsSheetName = String(props.getProperty('RESULTS_SHEET') || DEFAULTS_.RESULTS_SHEET).trim();

  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak ditemukan. Set Script Property SPREADSHEET_ID atau gunakan bound script.');

  const questionsSheet = getOrCreateSheet_(ss, questionsSheetName);
  const resultsSheet = getOrCreateSheet_(ss, resultsSheetName);

  ensureResultsHeader_(resultsSheet);

  return { ss, questionsSheet, resultsSheet };
}

function getOrCreateSheet_(ss, name) {
  const desired = String(name || '').trim();
  if (!desired) throw new Error('Nama sheet kosong.');

  const direct = ss.getSheetByName(desired);
  if (direct) return direct;

  const desiredLower = desired.toLowerCase();
  const match = ss.getSheets().find(s => String(s.getName() || '').trim().toLowerCase() === desiredLower);
  if (match) return match;

  return ss.insertSheet(desired);
}

const QUESTIONS_FIELD_ALIASES_ = {
  id: ['id'],
  question: ['question', 'pertanyaan'],
  a: ['a', 'opsi a', 'option a', 'pilihan a'],
  b: ['b', 'opsi b', 'option b', 'pilihan b'],
  c: ['c', 'opsi c', 'option c', 'pilihan c'],
  d: ['d', 'opsi d', 'option d', 'pilihan d'],
  correct_answer: ['correct_answer', 'jawaban benar', 'jawaban', 'answer'],
  active: ['active', 'aktif', 'status'],
  updated_at: ['updated_at', 'updated at', 'updated', 'last_update', 'last update'],
};

function ensureQuestionsHeader_(sheet) {
  const required = ['id', 'question', 'a', 'b', 'c', 'd', 'correct_answer', 'active', 'updated_at'];
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 1);

  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return required;
  }

  const headerRange = sheet.getRange(1, 1, 1, lastCol).getValues();
  const current = (headerRange[0] || []).map(v => String(v || '').trim().toLowerCase());

  const missing = required.filter(field => {
    const aliases = QUESTIONS_FIELD_ALIASES_[field] || [field];
    return !current.some(h => aliases.includes(h));
  });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    return current.concat(missing);
  }

  return current;
}

function ensureResultsHeader_(sheet) {
  const required = ['timestamp', 'username', 'score', 'total', 'percent'];
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 1);

  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  const headerRange = sheet.getRange(1, 1, 1, lastCol).getValues();
  const current = (headerRange[0] || []).map(v => String(v || '').trim().toLowerCase());

  const missing = required.filter(h => !current.includes(h));
  if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
}

function findHeaderIndices_(header, candidates) {
  const wanted = new Set((candidates || []).map(c => String(c || '').trim().toLowerCase()).filter(Boolean));
  const indices = [];
  header.forEach((h, idx) => {
    if (wanted.has(String(h || '').trim().toLowerCase())) indices.push(idx);
  });
  return indices;
}

function buildQuestionsMap_(header) {
  const get = field => findHeaderIndices_(header, QUESTIONS_FIELD_ALIASES_[field] || [field]);
  return {
    id: get('id'),
    question: get('question'),
    a: get('a'),
    b: get('b'),
    c: get('c'),
    d: get('d'),
    correct_answer: get('correct_answer'),
    active: get('active'),
    updated_at: get('updated_at'),
  };
}

function buildResultsMap_(header) {
  const idx = name => header.indexOf(name);
  return {
    timestamp: Math.max(idx('timestamp'), 0),
    username: Math.max(idx('username'), 1),
    score: Math.max(idx('score'), 2),
    total: Math.max(idx('total'), 3),
    percent: Math.max(idx('percent'), 4),
  };
}

function getByIndices_(row, indices) {
  const list = Array.isArray(indices) ? indices : [];
  for (let i = 0; i < list.length; i++) {
    const idx = list[i];
    if (idx === null || idx === undefined) continue;
    if (idx < 0 || idx >= row.length) continue;
    const v = row[idx];
    if (v === '' || v === null || v === undefined) continue;
    return v;
  }
  return '';
}

function setByIndices_(row, indices, value) {
  const list = Array.isArray(indices) ? indices : [];
  list.forEach(idx => {
    if (idx === null || idx === undefined) return;
    if (idx < 0 || idx >= row.length) return;
    row[idx] = value;
  });
}

function rowToQuestion_(row, map) {
  const id = toNumber_(getByIndices_(row, map.id));
  if (!id) return null;
  const question = String(getByIndices_(row, map.question) || '').trim();
  const correct = String(getByIndices_(row, map.correct_answer) || '').trim().toLowerCase();
  const active = toBool_(getByIndices_(row, map.active), true);

  return {
    id,
    question,
    options: {
      a: String(getByIndices_(row, map.a) || '').trim(),
      b: String(getByIndices_(row, map.b) || '').trim(),
      c: String(getByIndices_(row, map.c) || '').trim(),
      d: String(getByIndices_(row, map.d) || '').trim(),
    },
    correct_answer: correct,
    active,
  };
}

function appendResult_(resultsSheet, entry) {
  const row = [new Date(), entry.username, entry.score, entry.total, entry.percent, entry.time_spent];
  resultsSheet.appendRow(row);
}

function toNumber_(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

function toBool_(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined || value === '') return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'aktif', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'nonaktif', 'off'].includes(s)) return false;
  return defaultValue;
}

function formatTs_(value, tz) {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return String(value);
  }
}

function findAdmin_(username) {
  const needle = String(username || '').trim().toLowerCase();
  if (!needle) return null;
  return ADMINS_.find(a => String(a.username || '').trim().toLowerCase() === needle) || null;
}

function verifyAdminPassword_(admin, password) {
  const provided = String(password || '');
  if (!provided) return false;

  const hash = String(admin.passwordHash || '').trim();
  if (hash) return sha256Hex_(provided) === hash;

  return String(admin.password || '') === provided;
}

function sha256Hex_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b & 0xff).toString(16))).slice(-2)).join('');
}

function createAdminSession_(username) {
  const session = Utilities.getUuid();
  CacheService.getScriptCache().put(ADMIN_SESSION_PREFIX_ + session, String(username || ''), ADMIN_SESSION_TTL_SECONDS_);
  return session;
}

function assertAdminSession_(session) {
  const token = String(session || '').trim();
  if (!token) throw new Error('Belum login. Silakan login.');

  const username = CacheService.getScriptCache().get(ADMIN_SESSION_PREFIX_ + token);
  if (!username) throw new Error('Session habis. Silakan login ulang.');

  return username;
}