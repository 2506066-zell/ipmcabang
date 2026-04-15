const { query, rawQuery } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { ensureSchema } = require('./_bootstrap');
const { requireAdminAuth, getSessionUser } = require('./_auth');

const FIELD_TYPES = new Set(['short_text', 'paragraph', 'single_choice', 'multiple_choice', 'dropdown']);
const FORM_TYPES = new Set(['pretest', 'posttest']);
const FORM_STATUSES = new Set(['draft', 'published', 'archived']);
const WORKFLOW_STATUSES = new Set(['unread', 'follow_up', 'done']);
const WORKFLOW_ITEM_TYPES = new Set(['submission', 'inbox']);
const ARCHIVE_STATUSES = new Set(['active_archive', 'inactive_archive', 'destroy_scheduled']);
const CONFIDENTIALITY_LEVELS = new Set(['internal', 'restricted', 'secret']);

function sanitizeText(value, maxLen = 255) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeParagraph(value, maxLen = 5000) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function slugify(value) {
  const base = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `form-${Date.now()}`;
}

function normalizeFormType(value) {
  const type = String(value || '').trim().toLowerCase();
  return FORM_TYPES.has(type) ? type : 'pretest';
}

function normalizeFormStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return FORM_STATUSES.has(status) ? status : 'draft';
}

function normalizeFieldType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (!FIELD_TYPES.has(type)) throw new Error(`Tipe field tidak didukung: ${type || 'kosong'}`);
  return type;
}

function normalizeArchiveStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (!ARCHIVE_STATUSES.has(status)) throw new Error('archive_status tidak valid.');
  return status;
}

function normalizeConfidentialityLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  if (!CONFIDENTIALITY_LEVELS.has(level)) throw new Error('confidentiality_level tidak valid.');
  return level;
}

function normalizeRetentionYears(value) {
  const years = Number(value);
  if (!Number.isInteger(years) || years < 1 || years > 25) {
    throw new Error('retention_years harus bilangan bulat antara 1 sampai 25.');
  }
  return years;
}

function normalizeOptions(fieldType, value) {
  if (!['single_choice', 'multiple_choice', 'dropdown'].includes(fieldType)) return [];
  const source = Array.isArray(value)
    ? value
    : String(value || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
  const cleaned = source
    .map((item) => sanitizeText(item, 160))
    .filter(Boolean);
  if (!cleaned.length) throw new Error('Field pilihan wajib memiliki minimal satu opsi.');
  return Array.from(new Set(cleaned));
}

function normalizeFields(rawFields) {
  const fields = Array.isArray(rawFields) ? rawFields : [];
  if (!fields.length) throw new Error('Minimal satu pertanyaan diperlukan.');
  return fields.map((field, index) => {
    const fieldType = normalizeFieldType(field.field_type);
    const label = sanitizeText(field.label, 300);
    if (!label) throw new Error(`Label pertanyaan ke-${index + 1} wajib diisi.`);
    return {
      id: Number(field.id || 0),
      label,
      field_type: fieldType,
      required: field.required !== false,
      placeholder: sanitizeText(field.placeholder, 240),
      options_json: normalizeOptions(fieldType, field.options_json || field.options || []),
      sort_order: index + 1,
      focus_inbox: field.focus_inbox === true
    };
  });
}

function serializeField(row) {
  const options = Array.isArray(row.options_json) ? row.options_json : [];
  return {
    id: Number(row.id),
    form_id: Number(row.form_id),
    label: row.label || '',
    field_type: row.field_type || 'short_text',
    required: row.required !== false,
    placeholder: row.placeholder || '',
    options_json: options,
    sort_order: Number(row.sort_order || 1),
    focus_inbox: row.focus_inbox === true
  };
}

async function ensureUniqueSlug(baseSlug, formId = 0) {
  let candidate = slugify(baseSlug);
  let attempt = 1;
  while (true) {
    const existing = (await query`
      SELECT id FROM form_templates WHERE slug=${candidate} AND id<>${Number(formId || 0)} LIMIT 1
    `).rows[0];
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${slugify(baseSlug).slice(0, 68)}-${attempt}`;
  }
}

async function getFormFields(formId) {
  const rows = (await query`
    SELECT id, form_id, label, field_type, required, placeholder, options_json, sort_order, focus_inbox
    FROM form_fields
    WHERE form_id=${formId}
    ORDER BY sort_order ASC, id ASC
  `).rows;
  return rows.map(serializeField);
}

async function getSubmissionCount(formId) {
  const row = (await query`
    SELECT COUNT(*)::int AS c FROM form_submissions WHERE form_id=${formId}
  `).rows[0];
  return Number(row?.c || 0);
}

async function getUserSubmission(formId, userId) {
  const row = (await query`
    SELECT id, submitted_at, status, submitter_name
    FROM form_submissions
    WHERE form_id=${formId} AND user_id=${userId}
    LIMIT 1
  `).rows[0];
  return row
    ? {
        id: Number(row.id),
        submitted_at: row.submitted_at,
        status: row.status || 'submitted',
        submitter_name: row.submitter_name || ''
      }
    : null;
}

async function buildPublishedFormsPayload(userId) {
  const rows = (await query`
    SELECT f.id, f.title, f.slug, f.type, f.description, f.status, f.allow_multiple, f.theme_variant, f.updated_at,
      COUNT(fs.id)::int AS submission_count
    FROM form_templates f
    LEFT JOIN form_submissions fs ON fs.form_id = f.id
    WHERE f.status='published'
    GROUP BY f.id
    ORDER BY f.updated_at DESC, f.id DESC
  `).rows;

  let submittedMap = new Map();
  if (userId) {
    const submittedRows = (await query`
      SELECT form_id, submitted_at, status
      FROM form_submissions
      WHERE user_id=${userId}
    `).rows;
    submittedMap = new Map(
      submittedRows.map((item) => [
        Number(item.form_id),
        {
          submitted_at: item.submitted_at,
          status: item.status || 'submitted'
        }
      ])
    );
  }

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title || '',
    slug: row.slug || '',
    type: row.type || 'pretest',
    description: row.description || '',
    status: row.status || 'draft',
    allow_multiple: row.allow_multiple === true,
    theme_variant: row.theme_variant || 'aurora-premium',
    updated_at: row.updated_at,
    submission_count: Number(row.submission_count || 0),
    already_submitted: submittedMap.has(Number(row.id)),
    my_submission: submittedMap.get(Number(row.id)) || null
  }));
}

async function handleListPublished(req, res) {
  const user = await getSessionUser(req);
  const items = await buildPublishedFormsPayload(user?.id || 0);
  return json(res, 200, { status: 'success', items });
}

async function handleDetail(req, res) {
  const slug = sanitizeText(req.query?.slug, 120);
  if (!slug) return json(res, 400, { status: 'error', message: 'Slug form wajib diisi.' });

  const user = await getSessionUser(req);
  const row = (await query`
    SELECT id, title, slug, type, description, status, allow_multiple, theme_variant, updated_at
    FROM form_templates
    WHERE slug=${slug}
    LIMIT 1
  `).rows[0];
  if (!row) return json(res, 404, { status: 'error', message: 'Form tidak ditemukan.' });
  if (row.status !== 'published') return json(res, 403, { status: 'error', message: 'Form belum dipublikasikan.' });

  const fields = await getFormFields(Number(row.id));
  const mySubmission = user ? await getUserSubmission(Number(row.id), user.id) : null;

  return json(res, 200, {
    status: 'success',
    form: {
      id: Number(row.id),
      title: row.title || '',
      slug: row.slug || '',
      type: row.type || 'pretest',
      description: row.description || '',
      status: row.status || 'draft',
      allow_multiple: row.allow_multiple === true,
      theme_variant: row.theme_variant || 'aurora-premium',
      updated_at: row.updated_at,
      fields,
      already_submitted: Boolean(mySubmission),
      my_submission: mySubmission
    }
  });
}

function normalizeAnswerValue(field, rawValue) {
  if (field.field_type === 'multiple_choice') {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    const cleaned = values.map((item) => sanitizeText(item, 200)).filter(Boolean);
    if (field.required && !cleaned.length) throw new Error(`Pertanyaan "${field.label}" wajib diisi.`);
    const invalid = cleaned.filter((item) => !field.options_json.includes(item));
    if (invalid.length) throw new Error(`Jawaban untuk "${field.label}" tidak valid.`);
    return { answer_text: cleaned.join(', '), answer_json: cleaned };
  }

  const text = field.field_type === 'paragraph'
    ? sanitizeParagraph(rawValue, 5000)
    : sanitizeText(rawValue, 500);

  if (field.required && !text) throw new Error(`Pertanyaan "${field.label}" wajib diisi.`);

  if (['single_choice', 'dropdown'].includes(field.field_type) && text && !field.options_json.includes(text)) {
    throw new Error(`Jawaban untuk "${field.label}" tidak valid.`);
  }

  return { answer_text: text, answer_json: null };
}

async function handleSubmit(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Silakan login untuk mengisi form.' });

  const body = parseJsonBody(req) || {};
  const formId = Number(body.form_id || 0);
  const submitterName = sanitizeText(body.submitter_name, 120);
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (!formId) return json(res, 400, { status: 'error', message: 'Form tidak valid.' });
  if (!submitterName) return json(res, 400, { status: 'error', message: 'Nama pengisi wajib diisi.' });

  const form = (await query`
    SELECT id, title, slug, status, allow_multiple
    FROM form_templates
    WHERE id=${formId}
    LIMIT 1
  `).rows[0];
  if (!form) return json(res, 404, { status: 'error', message: 'Form tidak ditemukan.' });
  if (form.status !== 'published') return json(res, 403, { status: 'error', message: 'Form belum dibuka untuk pengisian.' });

  const existing = await getUserSubmission(formId, user.id);
  if (existing) {
    return json(res, 409, { status: 'error', message: 'Akun ini sudah pernah mengisi form tersebut.' });
  }

  const fields = await getFormFields(formId);
  const fieldMap = new Map(fields.map((field) => [field.id, field]));
  const answerMap = new Map();
  for (const item of answers) {
    const fieldId = Number(item?.field_id || 0);
    if (!fieldId || !fieldMap.has(fieldId)) continue;
    answerMap.set(fieldId, item.value);
  }

  const normalizedAnswers = fields.map((field) => ({
    field_id: field.id,
    ...normalizeAnswerValue(field, answerMap.get(field.id))
  }));

  const submissionRow = (
    await query`
      INSERT INTO form_submissions (form_id, user_id, submitter_name, status, submitted_at, created_at, updated_at)
      VALUES (${formId}, ${user.id}, ${submitterName}, 'submitted', NOW(), NOW(), NOW())
      RETURNING id, submitted_at, status, submitter_name
    `
  ).rows[0];

  for (const item of normalizedAnswers) {
    await query`
      INSERT INTO form_answers (submission_id, field_id, answer_text, answer_json, created_at, updated_at)
      VALUES (${submissionRow.id}, ${item.field_id}, ${item.answer_text || null}, ${item.answer_json || null}, NOW(), NOW())
    `;
  }

  return json(res, 201, {
    status: 'success',
    submission: {
      id: Number(submissionRow.id),
      submitted_at: submissionRow.submitted_at,
      status: submissionRow.status || 'submitted',
      submitter_name: submissionRow.submitter_name || submitterName
    },
    message: 'Form berhasil dikirim.'
  });
}

async function handleMySubmissions(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Silakan login untuk melihat riwayat.' });

  const rows = (await query`
    SELECT s.id, s.submitted_at, s.status, s.submitter_name, f.id AS form_id, f.title, f.slug, f.type, f.theme_variant
    FROM form_submissions s
    JOIN form_templates f ON f.id = s.form_id
    WHERE s.user_id=${user.id}
    ORDER BY s.submitted_at DESC, s.id DESC
  `).rows;

  return json(res, 200, {
    status: 'success',
    items: rows.map((row) => ({
      id: Number(row.id),
      form_id: Number(row.form_id),
      title: row.title || '',
      slug: row.slug || '',
      type: row.type || 'pretest',
      theme_variant: row.theme_variant || 'aurora-premium',
      status: row.status || 'submitted',
      submitted_at: row.submitted_at,
      submitter_name: row.submitter_name || ''
    }))
  });
}

async function handleAdminList(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const rows = (await query`
    SELECT f.id, f.title, f.slug, f.type, f.description, f.status, f.allow_multiple, f.theme_variant, f.updated_at,
      COUNT(DISTINCT s.id)::int AS submission_count,
      COUNT(DISTINCT CASE WHEN ff.focus_inbox = true AND COALESCE(a.answer_text, '') <> '' THEN a.id END)::int AS inbox_count
    FROM form_templates f
    LEFT JOIN form_submissions s ON s.form_id = f.id
    LEFT JOIN form_fields ff ON ff.form_id = f.id
    LEFT JOIN form_answers a ON a.field_id = ff.id
    GROUP BY f.id
    ORDER BY f.updated_at DESC, f.id DESC
  `).rows;

  return json(res, 200, {
    status: 'success',
    items: rows.map((row) => ({
      id: Number(row.id),
      title: row.title || '',
      slug: row.slug || '',
      type: row.type || 'pretest',
      description: row.description || '',
      status: row.status || 'draft',
      allow_multiple: row.allow_multiple === true,
      theme_variant: row.theme_variant || 'aurora-premium',
      updated_at: row.updated_at,
      submission_count: Number(row.submission_count || 0),
      inbox_count: Number(row.inbox_count || 0)
    }))
  });
}

async function handleAdminDetail(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const formId = Number(req.query?.id || 0);
  if (!formId) return json(res, 400, { status: 'error', message: 'ID form tidak valid.' });

  const form = (await query`
    SELECT id, title, slug, type, description, status, allow_multiple, theme_variant, created_by, created_at, updated_at
    FROM form_templates
    WHERE id=${formId}
    LIMIT 1
  `).rows[0];
  if (!form) return json(res, 404, { status: 'error', message: 'Form tidak ditemukan.' });

  const fields = await getFormFields(formId);
  const submissionCount = await getSubmissionCount(formId);
  const inboxCount = Number(
    (
      await query`
        SELECT COUNT(a.id)::int AS c
        FROM form_answers a
        JOIN form_fields ff ON ff.id = a.field_id
        JOIN form_submissions s ON s.id = a.submission_id
        WHERE ff.form_id=${formId}
        AND ff.focus_inbox = true
        AND ff.field_type IN ('short_text', 'paragraph')
        AND COALESCE(a.answer_text, '') <> ''
      `
    ).rows[0]?.c || 0
  );

  return json(res, 200, {
    status: 'success',
    form: {
      id: Number(form.id),
      title: form.title || '',
      slug: form.slug || '',
      type: form.type || 'pretest',
      description: form.description || '',
      status: form.status || 'draft',
      allow_multiple: form.allow_multiple === true,
      theme_variant: form.theme_variant || 'aurora-premium',
      created_by: form.created_by ? Number(form.created_by) : null,
      created_at: form.created_at,
      updated_at: form.updated_at,
      fields,
      stats: {
        submission_count: submissionCount,
        inbox_count: inboxCount
      }
    }
  });
}

async function writeActivity(adminId, action, details) {
  try {
    await query`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (${adminId}, ${action}, ${details || {}})
    `;
  } catch {}
}

async function handleSaveTemplate(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req) || {};
  const id = Number(body.id || 0);
  const title = sanitizeText(body.title, 220);
  if (!title) return json(res, 400, { status: 'error', message: 'Judul form wajib diisi.' });

  const type = normalizeFormType(body.type);
  const status = normalizeFormStatus(body.status);
  const description = sanitizeParagraph(body.description, 1600);
  const allowMultiple = body.allow_multiple === true;
  const themeVariant = sanitizeText(body.theme_variant, 80) || 'aurora-premium';
  const fields = normalizeFields(body.fields);
  const desiredSlug = sanitizeText(body.slug, 120) || title;
  const slug = await ensureUniqueSlug(desiredSlug, id);

  let formRow = null;
  if (id > 0) {
    formRow = (
      await query`
        UPDATE form_templates
        SET title=${title},
            slug=${slug},
            type=${type},
            description=${description},
            status=${status},
            allow_multiple=${allowMultiple},
            theme_variant=${themeVariant},
            updated_at=NOW()
        WHERE id=${id}
        RETURNING id, title, slug, type, description, status, allow_multiple, theme_variant, updated_at
      `
    ).rows[0];
    if (!formRow) return json(res, 404, { status: 'error', message: 'Form tidak ditemukan.' });

    await query`DELETE FROM form_fields WHERE form_id=${id}`;
    await writeActivity(admin.id, 'UPDATE_FORM_TEMPLATE', { form_id: id, title, type, status });
  } else {
    formRow = (
      await query`
        INSERT INTO form_templates (title, slug, type, description, status, allow_multiple, theme_variant, created_by, created_at, updated_at)
        VALUES (${title}, ${slug}, ${type}, ${description}, ${status}, ${allowMultiple}, ${themeVariant}, ${admin.id}, NOW(), NOW())
        RETURNING id, title, slug, type, description, status, allow_multiple, theme_variant, updated_at
      `
    ).rows[0];
    await writeActivity(admin.id, 'CREATE_FORM_TEMPLATE', { form_id: formRow?.id, title, type, status });
  }

  for (const field of fields) {
    await query`
      INSERT INTO form_fields (form_id, label, field_type, required, placeholder, options_json, sort_order, focus_inbox, created_at, updated_at)
      VALUES (
        ${Number(formRow.id)},
        ${field.label},
        ${field.field_type},
        ${field.required},
        ${field.placeholder || null},
        ${field.options_json},
        ${field.sort_order},
        ${field.focus_inbox},
        NOW(),
        NOW()
      )
    `;
  }

  return json(res, 200, {
    status: 'success',
    form: {
      id: Number(formRow.id),
      title: formRow.title || '',
      slug: formRow.slug || '',
      type: formRow.type || 'pretest',
      description: formRow.description || '',
      status: formRow.status || 'draft',
      allow_multiple: formRow.allow_multiple === true,
      theme_variant: formRow.theme_variant || 'aurora-premium',
      updated_at: formRow.updated_at,
      fields: await getFormFields(Number(formRow.id))
    }
  });
}

async function handlePublish(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req) || {};
  const formId = Number(body.id || 0);
  const status = normalizeFormStatus(body.status);
  if (!formId) return json(res, 400, { status: 'error', message: 'ID form tidak valid.' });

  const form = (
    await query`
      UPDATE form_templates
      SET status=${status}, updated_at=NOW()
      WHERE id=${formId}
      RETURNING id, title, slug, status
    `
  ).rows[0];
  if (!form) return json(res, 404, { status: 'error', message: 'Form tidak ditemukan.' });

  await writeActivity(admin.id, 'PUBLISH_FORM_TEMPLATE', {
    form_id: Number(form.id),
    title: form.title || '',
    status
  });

  return json(res, 200, { status: 'success', form });
}

async function handleAdminSubmissions(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const formId = Number(req.query?.id || 0);
  if (!formId) return json(res, 400, { status: 'error', message: 'ID form tidak valid.' });

  const rows = (
    await query`
      SELECT s.id, s.form_id, s.user_id, s.status, s.submitted_at, s.submitter_name,
             s.archive_code, s.confidentiality_level, s.retention_years, s.archive_status,
             s.archive_note, s.archived_at, s.archive_due_at, s.archive_updated_by, s.archive_updated_at,
             u.username, u.nama_panjang, u.pimpinan
      FROM form_submissions s
      JOIN users u ON u.id = s.user_id
      WHERE s.form_id=${formId}
      ORDER BY s.submitted_at DESC, s.id DESC
    `
  ).rows;

  const answersRows = (
    await query`
      SELECT a.submission_id, a.answer_text, a.answer_json,
             ff.id AS field_id, ff.label, ff.field_type, ff.focus_inbox, ff.sort_order
      FROM form_answers a
      JOIN form_fields ff ON ff.id = a.field_id
      JOIN form_submissions s ON s.id = a.submission_id
      WHERE s.form_id=${formId}
      ORDER BY a.submission_id DESC, ff.sort_order ASC, ff.id ASC
    `
  ).rows;

  const answersMap = new Map();
  for (const row of answersRows) {
    const key = Number(row.submission_id);
    if (!answersMap.has(key)) answersMap.set(key, []);
    answersMap.get(key).push({
      field_id: Number(row.field_id),
      label: row.label || '',
      field_type: row.field_type || 'short_text',
      focus_inbox: row.focus_inbox === true,
      answer_text: row.answer_text || '',
      answer_json: row.answer_json || null
    });
  }

  const submissionIds = rows.map((row) => Number(row.id)).filter(Boolean);
  let workflowMap = new Map();
  if (submissionIds.length) {
    const workflowRows = (
      await rawQuery(
        `SELECT item_id, workflow_status
         FROM form_submission_workflow
         WHERE form_id = $1 AND item_type = 'submission' AND item_id = ANY($2::int[])`,
        [formId, submissionIds]
      )
    ).rows;
    workflowMap = new Map(workflowRows.map((row) => [Number(row.item_id), String(row.workflow_status || 'unread')]));
  }

  return json(res, 200, {
    status: 'success',
    items: rows.map((row) => ({
      id: Number(row.id),
      form_id: Number(row.form_id),
      user_id: Number(row.user_id),
      status: row.status || 'submitted',
      submitted_at: row.submitted_at,
      submitter_name: row.submitter_name || '',
      archive_code: row.archive_code || '',
      confidentiality_level: row.confidentiality_level || 'internal',
      retention_years: Number(row.retention_years || 2),
      archive_status: row.archive_status || 'active_archive',
      archive_note: row.archive_note || '',
      archived_at: row.archived_at || null,
      archive_due_at: row.archive_due_at || null,
      archive_updated_by: row.archive_updated_by ? Number(row.archive_updated_by) : null,
      archive_updated_at: row.archive_updated_at || null,
      username: row.username || '',
      nama_panjang: row.nama_panjang || '',
      pimpinan: row.pimpinan || '',
      workflow_status: workflowMap.get(Number(row.id)) || 'unread',
      answers: answersMap.get(Number(row.id)) || []
    }))
  });
}

async function handleUpdateArchiveMeta(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req) || {};
  const formId = Number(body.form_id || 0);
  const submissionId = Number(body.submission_id || 0);
  const archiveCode = sanitizeText(body.archive_code, 120);
  const confidentialityLevel = normalizeConfidentialityLevel(body.confidentiality_level || 'internal');
  const retentionYears = normalizeRetentionYears(body.retention_years ?? 2);
  const archiveStatus = normalizeArchiveStatus(body.archive_status || 'active_archive');
  const archiveNote = sanitizeParagraph(body.archive_note, 1200);

  if (!formId || !submissionId) {
    return json(res, 400, { status: 'error', message: 'form_id dan submission_id wajib diisi.' });
  }

  const existing = (
    await query`
      SELECT id, archive_code, confidentiality_level, retention_years, archive_status, archive_note
      FROM form_submissions
      WHERE id=${submissionId} AND form_id=${formId}
      LIMIT 1
    `
  ).rows[0];
  if (!existing) {
    return json(res, 404, { status: 'error', message: 'Submission tidak ditemukan.' });
  }

  const updated = (
    await query`
      UPDATE form_submissions
      SET archive_code=${archiveCode || null},
          confidentiality_level=${confidentialityLevel},
          retention_years=${retentionYears},
          archive_status=${archiveStatus},
          archive_note=${archiveNote || null},
          archived_at=CASE
            WHEN ${archiveStatus} IN ('active_archive', 'inactive_archive') THEN COALESCE(archived_at, NOW())
            ELSE archived_at
          END,
          archive_due_at=NOW() + (${retentionYears} * INTERVAL '1 year'),
          archive_updated_by=${admin.id},
          archive_updated_at=NOW(),
          updated_at=NOW()
      WHERE id=${submissionId} AND form_id=${formId}
      RETURNING id, form_id, archive_code, confidentiality_level, retention_years, archive_status,
                archive_note, archived_at, archive_due_at, archive_updated_by, archive_updated_at
    `
  ).rows[0];

  await writeActivity(admin.id, 'UPDATE_FORM_ARCHIVE_META', {
    form_id: formId,
    submission_id: submissionId,
    before: {
      archive_code: existing.archive_code || '',
      confidentiality_level: existing.confidentiality_level || 'internal',
      retention_years: Number(existing.retention_years || 2),
      archive_status: existing.archive_status || 'active_archive',
      archive_note: existing.archive_note || ''
    },
    after: {
      archive_code: updated.archive_code || '',
      confidentiality_level: updated.confidentiality_level || 'internal',
      retention_years: Number(updated.retention_years || 2),
      archive_status: updated.archive_status || 'active_archive',
      archive_note: updated.archive_note || ''
    }
  });

  return json(res, 200, {
    status: 'success',
    item: {
      id: Number(updated.id),
      form_id: Number(updated.form_id),
      archive_code: updated.archive_code || '',
      confidentiality_level: updated.confidentiality_level || 'internal',
      retention_years: Number(updated.retention_years || 2),
      archive_status: updated.archive_status || 'active_archive',
      archive_note: updated.archive_note || '',
      archived_at: updated.archived_at || null,
      archive_due_at: updated.archive_due_at || null,
      archive_updated_by: updated.archive_updated_by ? Number(updated.archive_updated_by) : null,
      archive_updated_at: updated.archive_updated_at || null
    }
  });
}

async function handleArchiveSummary(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const formId = Number(req.query?.id || 0);
  if (!formId) return json(res, 400, { status: 'error', message: 'ID form tidak valid.' });

  const grouped = (
    await query`
      SELECT archive_status, COUNT(*)::int AS c
      FROM form_submissions
      WHERE form_id=${formId}
      GROUP BY archive_status
    `
  ).rows;
  const confidentialityRows = (
    await query`
      SELECT confidentiality_level, COUNT(*)::int AS c
      FROM form_submissions
      WHERE form_id=${formId}
      GROUP BY confidentiality_level
    `
  ).rows;
  const dueSoonRow = (
    await query`
      SELECT COUNT(*)::int AS c
      FROM form_submissions
      WHERE form_id=${formId}
        AND archive_due_at IS NOT NULL
        AND archive_due_at <= NOW() + INTERVAL '30 days'
    `
  ).rows[0];

  const archiveStatus = { active_archive: 0, inactive_archive: 0, destroy_scheduled: 0 };
  grouped.forEach((row) => {
    const key = String(row.archive_status || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(archiveStatus, key)) archiveStatus[key] = Number(row.c || 0);
  });

  const confidentiality = { internal: 0, restricted: 0, secret: 0 };
  confidentialityRows.forEach((row) => {
    const key = String(row.confidentiality_level || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(confidentiality, key)) confidentiality[key] = Number(row.c || 0);
  });

  return json(res, 200, {
    status: 'success',
    summary: {
      archive_status: archiveStatus,
      confidentiality,
      due_in_30_days: Number(dueSoonRow?.c || 0)
    }
  });
}

async function handleAdminInbox(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const formId = Number(req.query?.id || 0);
  if (!formId) return json(res, 400, { status: 'error', message: 'ID form tidak valid.' });

  const rows = (
    await query`
      SELECT a.id, a.answer_text, s.id AS submission_id, s.submitted_at, ff.label, ff.field_type,
             s.submitter_name, u.username, u.nama_panjang, f.title AS form_title
      FROM form_answers a
      JOIN form_fields ff ON ff.id = a.field_id
      JOIN form_submissions s ON s.id = a.submission_id
      JOIN users u ON u.id = s.user_id
      JOIN form_templates f ON f.id = s.form_id
      WHERE s.form_id=${formId}
      AND ff.focus_inbox = true
      AND ff.field_type IN ('short_text', 'paragraph')
      AND COALESCE(a.answer_text, '') <> ''
      ORDER BY s.submitted_at DESC, a.id DESC
    `
  ).rows;

  const inboxIds = rows.map((row) => Number(row.id)).filter(Boolean);
  let workflowMap = new Map();
  if (inboxIds.length) {
    const workflowRows = (
      await rawQuery(
        `SELECT item_id, workflow_status
         FROM form_submission_workflow
         WHERE form_id = $1 AND item_type = 'inbox' AND item_id = ANY($2::int[])`,
        [formId, inboxIds]
      )
    ).rows;
    workflowMap = new Map(workflowRows.map((row) => [Number(row.item_id), String(row.workflow_status || 'unread')]));
  }

  return json(res, 200, {
    status: 'success',
    items: rows.map((row) => ({
      id: Number(row.id),
      submission_id: Number(row.submission_id),
      submitted_at: row.submitted_at,
      form_title: row.form_title || '',
      field_label: row.label || '',
      field_type: row.field_type || 'short_text',
      answer_text: row.answer_text || '',
      submitter_name: row.submitter_name || '',
      username: row.username || '',
      nama_panjang: row.nama_panjang || '',
      workflow_status: workflowMap.get(Number(row.id)) || 'unread'
    }))
  });
}

async function handleMarkWorkflow(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req) || {};
  const formId = Number(body.form_id || 0);
  const itemType = String(body.item_type || '').trim().toLowerCase();
  const itemId = Number(body.item_id || 0);
  const workflowStatus = String(body.status || '').trim().toLowerCase();

  if (!formId || !itemId) return json(res, 400, { status: 'error', message: 'form_id dan item_id wajib diisi.' });
  if (!WORKFLOW_ITEM_TYPES.has(itemType)) return json(res, 400, { status: 'error', message: 'item_type tidak valid.' });
  if (!WORKFLOW_STATUSES.has(workflowStatus)) return json(res, 400, { status: 'error', message: 'status workflow tidak valid.' });

  if (itemType === 'submission') {
    const exists = (
      await query`
        SELECT id FROM form_submissions
        WHERE id=${itemId} AND form_id=${formId}
        LIMIT 1
      `
    ).rows[0];
    if (!exists) return json(res, 404, { status: 'error', message: 'Submission tidak ditemukan.' });
  } else {
    const exists = (
      await query`
        SELECT a.id
        FROM form_answers a
        JOIN form_fields ff ON ff.id = a.field_id
        JOIN form_submissions s ON s.id = a.submission_id
        WHERE a.id=${itemId}
          AND s.form_id=${formId}
          AND ff.focus_inbox = true
        LIMIT 1
      `
    ).rows[0];
    if (!exists) return json(res, 404, { status: 'error', message: 'Item inbox tidak ditemukan.' });
  }

  await query`
    INSERT INTO form_submission_workflow (form_id, item_type, item_id, workflow_status, updated_by, updated_at)
    VALUES (${formId}, ${itemType}, ${itemId}, ${workflowStatus}, ${admin.id}, NOW())
    ON CONFLICT (form_id, item_type, item_id)
    DO UPDATE SET workflow_status=${workflowStatus}, updated_by=${admin.id}, updated_at=NOW()
  `;

  await writeActivity(admin.id, 'MARK_FORM_WORKFLOW', {
    form_id: formId,
    item_type: itemType,
    item_id: itemId,
    workflow_status: workflowStatus
  });

  return json(res, 200, {
    status: 'success',
    item: {
      form_id: formId,
      item_type: itemType,
      item_id: itemId,
      workflow_status: workflowStatus
    }
  });
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    req.query = req.query || {};
    const action = String(req.query.action || '').trim();
    const pathname = new URL(req.url || '/api/forms', `http://${req.headers?.host || 'localhost'}`).pathname;
    const isAdminRoute = pathname.includes('/api/admin/forms');

    if (!isAdminRoute) {
      if (req.method === 'GET' && action === 'listPublished') return await handleListPublished(req, res);
      if (req.method === 'GET' && action === 'detail') return await handleDetail(req, res);
      if (req.method === 'GET' && action === 'mySubmissions') return await handleMySubmissions(req, res);
      if (req.method === 'POST' && action === 'submit') return await handleSubmit(req, res);
      return json(res, 404, { status: 'error', message: `Unknown action: ${action || 'none'}` });
    }

    if (req.method === 'GET' && action === 'list') return await handleAdminList(req, res);
    if (req.method === 'GET' && action === 'detail') return await handleAdminDetail(req, res);
    if (req.method === 'GET' && action === 'submissions') return await handleAdminSubmissions(req, res);
    if (req.method === 'GET' && action === 'inbox') return await handleAdminInbox(req, res);
    if (req.method === 'GET' && action === 'archiveSummary') return await handleArchiveSummary(req, res);
    if (req.method === 'POST' && action === 'saveTemplate') return await handleSaveTemplate(req, res);
    if (req.method === 'POST' && action === 'publish') return await handlePublish(req, res);
    if (req.method === 'POST' && action === 'markWorkflow') return await handleMarkWorkflow(req, res);
    if (req.method === 'POST' && action === 'updateArchiveMeta') return await handleUpdateArchiveMeta(req, res);

    return json(res, 404, { status: 'error', message: `Unknown action: ${action || 'none'}` });
  } catch (e) {
    const message = String(e.message || e);
    if (/duplicate key/i.test(message) && /form_submissions/.test(message)) {
      return json(res, 409, { status: 'error', message: 'Akun ini sudah pernah mengisi form tersebut.' });
    }
    
    // Catch common validation error phrases to return 400 instead of 500
    const isValidationError = /wajib diisi|tidak didukung|minimal satu|tidak valid/i.test(message);
    const statusCode = isValidationError ? 400 : 500;
    
    return json(res, statusCode, { status: 'error', message });
  }
};
