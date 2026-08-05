module.exports=[27625,(t,e,i)=>{let{query:a,rawQuery:r}=t.r(35716),{json:s,parseJsonBody:n}=t.r(86651),{ensureSchema:u}=t.r(44285),{requireAdminAuth:o,getSessionUser:d}=t.r(23908),_=new Set(["short_text","paragraph","single_choice","multiple_choice","dropdown"]),m=new Set(["pretest","posttest"]),l=new Set(["draft","published","archived"]),f=new Set(["unread","follow_up","done"]),c=new Set(["submission","inbox"]),p=new Set(["active_archive","inactive_archive","destroy_scheduled"]),w=new Set(["internal","restricted","secret"]);function b(t,e=255){return String(t||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,e)}function h(t,e=5e3){return String(t||"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g," ").trim().slice(0,e)}function N(t){return String(t||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||`form-${Date.now()}`}function E(t){let e=String(t||"").trim().toLowerCase();return l.has(e)?e:"draft"}function g(t){if(!t)return null;let e=new Date(t);if(Number.isNaN(e.getTime()))throw Error("Format tanggal/jam tidak valid.");return e.toISOString()}function y(t){let e=Array.isArray(t.options_json)?t.options_json:[];return{id:Number(t.id),form_id:Number(t.form_id),label:t.label||"",field_type:t.field_type||"short_text",required:!1!==t.required,placeholder:t.placeholder||"",options_json:e,answer_key_text:t.answer_key_text||"",score_weight:Number(t.score_weight||1),sort_order:Number(t.sort_order||1),focus_inbox:!0===t.focus_inbox}}function v(t,e,i){let a=String(t||"draft").trim().toLowerCase();if("draft"===a)return"draft";if("archived"===a)return"selesai";let r=Date.now(),s=e?new Date(e).getTime():null,n=i?new Date(i).getTime():null;return n&&!Number.isNaN(n)&&r>n?"kadaluarsa":s&&!Number.isNaN(s)&&r<s?"draft":"aktif"}function O(t){let e=t.created_at?new Date(t.created_at):null,i=e&&!Number.isNaN(e.getTime())?e.getFullYear():new Date().getFullYear(),a=e&&!Number.isNaN(e.getTime())?String(e.getMonth()+1).padStart(2,"0"):"01",r=e&&!Number.isNaN(e.getTime())?String(e.getDate()).padStart(2,"0"):"01",s=Number(t.version||1);return`${t.title||"Test Tanpa Judul"} • ${i}${a}${r} • v${s}`}function S(t){let e=String(t.field_type||"").trim().toLowerCase(),i=String(t.answer_key_text||"").trim(),a=Number(t.score_weight||1),r=Number.isFinite(a)&&a>0?Math.trunc(a):1;if(!i||!["single_choice","dropdown","multiple_choice"].includes(e))return{status:"perlu_review",score:0,score_max:0};if("multiple_choice"===e){let e=Array.isArray(t.answer_json)?t.answer_json.map(t=>String(t||"").trim()).filter(Boolean).sort():[],a=i.split("|").map(t=>String(t||"").trim()).filter(Boolean).sort();if(!a.length)return{status:"perlu_review",score:0,score_max:0};let s=e.length===a.length&&e.every((t,e)=>t===a[e]);return{status:s?"benar":"salah",score:s?r:0,score_max:r}}let s=String(t.answer_text||"").trim();if(!s)return{status:"salah",score:0,score_max:r};let n=s===i;return{status:n?"benar":"salah",score:n?r:0,score_max:r}}async function T(t,e=0){let i=N(t),r=1;for(;;){if(!(await a`
      SELECT id FROM form_templates WHERE slug=${i} AND id<>${Number(e||0)} LIMIT 1
    `).rows[0])return i;r+=1,i=`${N(t).slice(0,68)}-${r}`}}async function $(t){return(await a`
    SELECT id, form_id, label, field_type, required, placeholder, options_json, answer_key_text, score_weight, sort_order, focus_inbox
    FROM form_fields
    WHERE form_id=${t}
    ORDER BY sort_order ASC, id ASC
  `).rows.map(y)}async function R(t){let e=(await a`
    SELECT COUNT(*)::int AS c FROM form_submissions WHERE form_id=${t}
  `).rows[0];return Number(e?.c||0)}async function k(t,e){let i=(await a`
    SELECT id, submitted_at, status, submitter_name
    FROM form_submissions
    WHERE form_id=${t} AND user_id=${e}
    LIMIT 1
  `).rows[0];return i?{id:Number(i.id),submitted_at:i.submitted_at,status:i.status||"submitted",submitter_name:i.submitter_name||""}:null}async function A(t){let e=(await a`
    SELECT f.id, f.title, f.slug, f.type, f.description, f.status, f.allow_multiple, f.theme_variant, f.updated_at,
      COUNT(fs.id)::int AS submission_count
    FROM form_templates f
    LEFT JOIN form_submissions fs ON fs.form_id = f.id
    WHERE f.status='published'
    GROUP BY f.id
    ORDER BY f.updated_at DESC, f.id DESC
  `).rows,i=new Map;return t&&(i=new Map((await a`
      SELECT form_id, submitted_at, status
      FROM form_submissions
      WHERE user_id=${t}
    `).rows.map(t=>[Number(t.form_id),{submitted_at:t.submitted_at,status:t.status||"submitted"}]))),e.map(t=>({id:Number(t.id),title:t.title||"",slug:t.slug||"",type:t.type||"pretest",description:t.description||"",status:t.status||"draft",allow_multiple:!0===t.allow_multiple,theme_variant:t.theme_variant||"aurora-premium",updated_at:t.updated_at,submission_count:Number(t.submission_count||0),already_submitted:i.has(Number(t.id)),my_submission:i.get(Number(t.id))||null}))}async function C(t,e){let i=await d(t);return s(e,200,{status:"success",items:await A(i?.id||0)})}async function M(t,e){let i=b(t.query?.slug,120);if(!i)return s(e,400,{status:"error",message:"Slug form wajib diisi."});let r=await d(t),n=(await a`
    SELECT id, title, slug, type, description, status, allow_multiple, theme_variant, updated_at
    FROM form_templates
    WHERE slug=${i}
    LIMIT 1
  `).rows[0];if(!n)return s(e,404,{status:"error",message:"Form tidak ditemukan."});if("published"!==n.status)return s(e,403,{status:"error",message:"Form belum dipublikasikan."});let u=await $(Number(n.id)),o=r?await k(Number(n.id),r.id):null;return s(e,200,{status:"success",form:{id:Number(n.id),title:n.title||"",slug:n.slug||"",type:n.type||"pretest",description:n.description||"",status:n.status||"draft",allow_multiple:!0===n.allow_multiple,theme_variant:n.theme_variant||"aurora-premium",updated_at:n.updated_at,fields:u,already_submitted:!!o,my_submission:o}})}async function x(t,e){let i=await d(t);if(!i)return s(e,401,{status:"error",message:"Silakan login untuk mengisi form."});let r=n(t)||{},u=Number(r.form_id||0),o=b(r.submitter_name,120),_=Array.isArray(r.answers)?r.answers:[];if(!u)return s(e,400,{status:"error",message:"Form tidak valid."});if(!o)return s(e,400,{status:"error",message:"Nama pengisi wajib diisi."});let m=(await a`
    SELECT id, title, slug, status, allow_multiple
    FROM form_templates
    WHERE id=${u}
    LIMIT 1
  `).rows[0];if(!m)return s(e,404,{status:"error",message:"Form tidak ditemukan."});if("published"!==m.status)return s(e,403,{status:"error",message:"Form belum dibuka untuk pengisian."});if(await k(u,i.id))return s(e,409,{status:"error",message:"Akun ini sudah pernah mengisi form tersebut."});let l=await $(u),f=new Map(l.map(t=>[t.id,t])),c=new Map;for(let t of _){let e=Number(t?.field_id||0);e&&f.has(e)&&c.set(e,t.value)}let p=l.map(t=>({field_id:t.id,...function(t,e){if("multiple_choice"===t.field_type){let i=(Array.isArray(e)?e:[e]).map(t=>b(t,200)).filter(Boolean);if(t.required&&!i.length)throw Error(`Pertanyaan "${t.label}" wajib diisi.`);if(i.filter(e=>!t.options_json.includes(e)).length)throw Error(`Jawaban untuk "${t.label}" tidak valid.`);return{answer_text:i.join(", "),answer_json:i}}let i="paragraph"===t.field_type?h(e,5e3):b(e,500);if(t.required&&!i)throw Error(`Pertanyaan "${t.label}" wajib diisi.`);if(["single_choice","dropdown"].includes(t.field_type)&&i&&!t.options_json.includes(i))throw Error(`Jawaban untuk "${t.label}" tidak valid.`);return{answer_text:i,answer_json:null}}(t,c.get(t.id))})),w=(await a`
      INSERT INTO form_submissions (form_id, user_id, submitter_name, status, submitted_at, created_at, updated_at)
      VALUES (${u}, ${i.id}, ${o}, 'submitted', NOW(), NOW(), NOW())
      RETURNING id, submitted_at, status, submitter_name
    `).rows[0];for(let t of p)await a`
      INSERT INTO form_answers (submission_id, field_id, answer_text, answer_json, created_at, updated_at)
      VALUES (${w.id}, ${t.field_id}, ${t.answer_text||null}, ${t.answer_json||null}, NOW(), NOW())
    `;return s(e,201,{status:"success",submission:{id:Number(w.id),submitted_at:w.submitted_at,status:w.status||"submitted",submitter_name:w.submitter_name||o},message:"Form berhasil dikirim."})}async function L(t,e){let i=await d(t);return i?s(e,200,{status:"success",items:(await a`
    SELECT s.id, s.submitted_at, s.status, s.submitter_name, f.id AS form_id, f.title, f.slug, f.type, f.theme_variant
    FROM form_submissions s
    JOIN form_templates f ON f.id = s.form_id
    WHERE s.user_id=${i.id}
    ORDER BY s.submitted_at DESC, s.id DESC
  `).rows.map(t=>({id:Number(t.id),form_id:Number(t.form_id),title:t.title||"",slug:t.slug||"",type:t.type||"pretest",theme_variant:t.theme_variant||"aurora-premium",status:t.status||"submitted",submitted_at:t.submitted_at,submitter_name:t.submitter_name||""}))}):s(e,401,{status:"error",message:"Silakan login untuk melihat riwayat."})}async function D(t,e){try{await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}return s(e,200,{status:"success",items:(await a`
    SELECT
      f.id, f.title, f.slug, f.type, f.description, f.status, f.allow_multiple, f.theme_variant,
      f.version, f.target_participants, f.start_at, f.end_at, f.created_at, f.updated_at,
      (SELECT COUNT(*)::int FROM form_submissions s WHERE s.form_id = f.id) AS submission_count,
      (
        SELECT COUNT(a.id)::int
        FROM form_answers a
        JOIN form_fields ff ON ff.id = a.field_id
        JOIN form_submissions s ON s.id = a.submission_id
        WHERE s.form_id = f.id
          AND ff.focus_inbox = true
          AND ff.field_type IN ('short_text', 'paragraph')
          AND COALESCE(a.answer_text, '') <> ''
      ) AS inbox_count,
      (
        SELECT COUNT(*)::int
        FROM form_submission_workflow w
        WHERE w.form_id = f.id
          AND w.item_type = 'submission'
          AND w.workflow_status = 'done'
      ) AS reviewed_count
    FROM form_templates f
    ORDER BY f.updated_at DESC, f.id DESC
  `).rows.map(t=>{let e=Number(t.submission_count||0),i=Number(t.target_participants||0),a=i>0?Math.max(0,Math.min(100,Math.round(e/i*100))):0;return{id:Number(t.id),title:t.title||"",display_name:O(t),slug:t.slug||"",type:t.type||"pretest",description:t.description||"",status:t.status||"draft",lifecycle_status:v(t.status,t.start_at,t.end_at),allow_multiple:!0===t.allow_multiple,theme_variant:t.theme_variant||"aurora-premium",version:Number(t.version||1),target_participants:i,start_at:t.start_at||null,end_at:t.end_at||null,created_at:t.created_at||null,updated_at:t.updated_at,submission_count:e,reviewed_count:Number(t.reviewed_count||0),submission_progress_percent:a,inbox_count:Number(t.inbox_count||0)}})})}async function I(t,e){try{await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let i=Number(t.query?.id||0);if(!i)return s(e,400,{status:"error",message:"ID form tidak valid."});let r=(await a`
    SELECT id, title, slug, type, description, status, allow_multiple, theme_variant,
           version, target_participants, start_at, end_at, created_by, created_at, updated_at
    FROM form_templates
    WHERE id=${i}
    LIMIT 1
  `).rows[0];if(!r)return s(e,404,{status:"error",message:"Form tidak ditemukan."});let n=await $(i),u=await R(i),d=Number((await a`
        SELECT COUNT(a.id)::int AS c
        FROM form_answers a
        JOIN form_fields ff ON ff.id = a.field_id
        JOIN form_submissions s ON s.id = a.submission_id
        WHERE ff.form_id=${i}
        AND ff.focus_inbox = true
        AND ff.field_type IN ('short_text', 'paragraph')
        AND COALESCE(a.answer_text, '') <> ''
      `).rows[0]?.c||0),_=Number((await a`
        SELECT COUNT(*)::int AS c
        FROM form_submission_workflow
        WHERE form_id=${i}
          AND item_type='submission'
          AND workflow_status='done'
      `).rows[0]?.c||0),m=Number(r.target_participants||0),l=m>0?Math.max(0,Math.min(100,Math.round(u/m*100))):0;return s(e,200,{status:"success",form:{id:Number(r.id),title:r.title||"",slug:r.slug||"",type:r.type||"pretest",description:r.description||"",status:r.status||"draft",lifecycle_status:v(r.status,r.start_at,r.end_at),allow_multiple:!0===r.allow_multiple,theme_variant:r.theme_variant||"aurora-premium",version:Number(r.version||1),target_participants:m,start_at:r.start_at||null,end_at:r.end_at||null,display_name:O(r),created_by:r.created_by?Number(r.created_by):null,created_at:r.created_at,updated_at:r.updated_at,fields:n,stats:{submission_count:u,inbox_count:d,reviewed_count:_,submission_progress_percent:l}}})}async function F(t,e){try{await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let i=Number(t.query?.id||0);if(!i)return s(e,400,{status:"error",message:"ID form tidak valid."});if(!(await a`SELECT id, title, type, target_participants FROM form_templates WHERE id=${i}`).rows[0])return s(e,404,{status:"error",message:"Form tidak ditemukan."});let r=await $(i),n=(await a`SELECT id FROM form_submissions WHERE form_id=${i}`).rows.map(t=>t.id);if(!n.length)return s(e,200,{status:"success",stats:{total_submissions:0,average_score:0,field_analysis:[]}});let u=(await a`
    SELECT a.submission_id, a.field_id, a.answer_text, a.answer_json,
           ff.field_type, ff.answer_key_text, ff.score_weight
    FROM form_answers a
    JOIN form_fields ff ON ff.id = a.field_id
    WHERE a.submission_id = ANY(${n})
  `).rows,d=r.map(t=>{let e=u.filter(e=>e.field_id===t.id),i=e.length,a=0,r={};return e.forEach(e=>{if("benar"===S(e).status&&a++,["single_choice","dropdown"].includes(t.field_type)){let t=e.answer_text||"Kosong";r[t]=(r[t]||0)+1}else"multiple_choice"===t.field_type&&(Array.isArray(e.answer_json)?e.answer_json:[]).forEach(t=>{r[t]=(r[t]||0)+1})}),{field_id:t.id,label:t.label,field_type:t.field_type,total_answers:i,correct_count:a,correct_percent:i>0?Math.round(a/i*100):0,distribution:Object.entries(r).map(([t,e])=>({key:t,value:e,percent:Math.round(e/i*100)})),is_scorable:["single_choice","dropdown","multiple_choice"].includes(t.field_type)&&!!t.answer_key_text}}),_=n.map(t=>{let e=u.filter(e=>e.submission_id===t),i=0;return e.forEach(t=>{i+=S(t).score}),i}),m=n.length,l=m>0?(_.reduce((t,e)=>t+e,0)/m).toFixed(1):0;return s(e,200,{status:"success",stats:{total_submissions:m,average_score:Number(l),highest_score:Math.max(..._,0),lowest_score:Math.min(..._,0),field_analysis:d}})}async function W(t,e,i){try{await a`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (${t}, ${e}, ${i||{}})
    `}catch{}}async function U(t,e){let i,r=null;try{r=await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let u=n(t)||{},d=Number(u.id||0),l=b(u.title,220);if(!l)return s(e,400,{status:"error",message:"Judul form wajib diisi."});let f=(i=String(u.type||"").trim().toLowerCase(),m.has(i)?i:"pretest"),c=E(u.status),p=h(u.description,1600),w=!0===u.allow_multiple,N=b(u.theme_variant,80)||"aurora-premium",y=function(t){let e=Number(t||1);if(!Number.isInteger(e)||e<1||e>99)throw Error("Versi test harus bilangan bulat antara 1 sampai 99.");return e}(u.version||1),S=function(t){let e=Number(t||0);if(!Number.isInteger(e)||e<0||e>1e5)throw Error("Target peserta harus bilangan bulat antara 0 sampai 100000.");return e}(u.target_participants||0),R=g(u.start_at),k=g(u.end_at);if(R&&k&&new Date(R).getTime()>new Date(k).getTime())return s(e,400,{status:"error",message:"Tanggal mulai tidak boleh lebih besar dari tanggal selesai."});let A=function(t){let e=Array.isArray(t)?t:[];if(!e.length)throw Error("Minimal satu pertanyaan diperlukan.");return e.map((t,e)=>{let i=function(t){let e=String(t||"").trim().toLowerCase();if(!_.has(e))throw Error(`Tipe field tidak didukung: ${e||"kosong"}`);return e}(t.field_type),a=b(t.label,300);if(!a)throw Error(`Label pertanyaan ke-${e+1} wajib diisi.`);let r=function(t,e){if(!["single_choice","multiple_choice","dropdown"].includes(t))return[];let i=(Array.isArray(e)?e:String(e||"").split("\n").map(t=>t.trim()).filter(Boolean)).map(t=>b(t,160)).filter(Boolean);if(!i.length)throw Error("Field pilihan wajib memiliki minimal satu opsi.");return Array.from(new Set(i))}(i,t.options_json||t.options||[]),s=b(t.answer_key_text,200),n=Math.max(0,Math.min(100,Number(t.score_weight||1)));if(["single_choice","dropdown"].includes(i)&&s&&!r.includes(s))throw Error(`Kunci jawaban untuk pertanyaan ke-${e+1} harus salah satu opsi yang tersedia.`);return{id:Number(t.id||0),label:a,field_type:i,required:!1!==t.required,placeholder:b(t.placeholder,240),options_json:r,answer_key_text:s,score_weight:Number.isFinite(n)?Math.trunc(n):1,sort_order:e+1,focus_inbox:!0===t.focus_inbox}})}(u.fields),C=b(u.slug,120)||l,M=await T(C,d),x=null;if(d>0){if(!(x=(await a`
        UPDATE form_templates
        SET title=${l},
            slug=${M},
            type=${f},
            description=${p},
            status=${c},
            allow_multiple=${w},
            theme_variant=${N},
            version=${y},
            target_participants=${S},
            start_at=${R},
            end_at=${k},
            updated_at=NOW()
        WHERE id=${d}
        RETURNING id, title, slug, type, description, status, allow_multiple, theme_variant,
                  version, target_participants, start_at, end_at, created_at, updated_at
      `).rows[0]))return s(e,404,{status:"error",message:"Form tidak ditemukan."});await a`DELETE FROM form_fields WHERE form_id=${d}`,await W(r.id,"UPDATE_FORM_TEMPLATE",{form_id:d,title:l,type:f,status:c})}else x=(await a`
        INSERT INTO form_templates (
          title, slug, type, description, status, allow_multiple, theme_variant,
          version, target_participants, start_at, end_at, created_by, created_at, updated_at
        )
        VALUES (
          ${l}, ${M}, ${f}, ${p}, ${c}, ${w}, ${N},
          ${y}, ${S}, ${R}, ${k}, ${r.id}, NOW(), NOW()
        )
        RETURNING id, title, slug, type, description, status, allow_multiple, theme_variant,
                  version, target_participants, start_at, end_at, created_at, updated_at
      `).rows[0],await W(r.id,"CREATE_FORM_TEMPLATE",{form_id:x?.id,title:l,type:f,status:c});for(let t of A)await a`
      INSERT INTO form_fields (
        form_id, label, field_type, required, placeholder, options_json, answer_key_text, score_weight, sort_order, focus_inbox, created_at, updated_at
      )
      VALUES (
        ${Number(x.id)},
        ${t.label},
        ${t.field_type},
        ${t.required},
        ${t.placeholder||null},
        ${t.options_json},
        ${t.answer_key_text||null},
        ${t.score_weight},
        ${t.sort_order},
        ${t.focus_inbox},
        NOW(),
        NOW()
      )
    `;return s(e,200,{status:"success",form:{id:Number(x.id),title:x.title||"",slug:x.slug||"",type:x.type||"pretest",description:x.description||"",status:x.status||"draft",lifecycle_status:v(x.status,x.start_at,x.end_at),allow_multiple:!0===x.allow_multiple,theme_variant:x.theme_variant||"aurora-premium",version:Number(x.version||1),target_participants:Number(x.target_participants||0),start_at:x.start_at||null,end_at:x.end_at||null,display_name:O(x),updated_at:x.updated_at,fields:await $(Number(x.id))}})}async function j(t,e){let i=null;try{i=await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let r=n(t)||{},u=Number(r.id||0),d=E(r.status);if(!u)return s(e,400,{status:"error",message:"ID form tidak valid."});let _=(await a`
      UPDATE form_templates
      SET status=${d}, updated_at=NOW()
      WHERE id=${u}
      RETURNING id, title, slug, status
    `).rows[0];return _?(await W(i.id,"PUBLISH_FORM_TEMPLATE",{form_id:Number(_.id),title:_.title||"",status:d}),s(e,200,{status:"success",form:_})):s(e,404,{status:"error",message:"Form tidak ditemukan."})}async function H(t,e){try{await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let i=Number(t.query?.id||0);if(!i)return s(e,400,{status:"error",message:"ID form tidak valid."});let n=(await a`
      SELECT s.id, s.form_id, s.user_id, s.status, s.submitted_at, s.submitter_name,
             s.archive_code, s.confidentiality_level, s.retention_years, s.archive_status,
             s.archive_note, s.archived_at, s.archive_due_at, s.archive_updated_by, s.archive_updated_at,
             u.username, u.nama_panjang, u.pimpinan
      FROM form_submissions s
      JOIN users u ON u.id = s.user_id
      WHERE s.form_id=${i}
      ORDER BY s.submitted_at DESC, s.id DESC
    `).rows,u=(await a`
      SELECT a.submission_id, a.answer_text, a.answer_json,
             ff.id AS field_id, ff.label, ff.field_type, ff.focus_inbox, ff.sort_order, ff.answer_key_text, ff.score_weight
      FROM form_answers a
      JOIN form_fields ff ON ff.id = a.field_id
      JOIN form_submissions s ON s.id = a.submission_id
      WHERE s.form_id=${i}
      ORDER BY a.submission_id DESC, ff.sort_order ASC, ff.id ASC
    `).rows,d=new Map,_=new Map;for(let t of u){let e=Number(t.submission_id);d.has(e)||d.set(e,[]);let i=S(t);d.get(e).push({field_id:Number(t.field_id),label:t.label||"",field_type:t.field_type||"short_text",focus_inbox:!0===t.focus_inbox,answer_text:t.answer_text||"",answer_json:t.answer_json||null,answer_key_text:t.answer_key_text||"",score_weight:Number(t.score_weight||1),answer_status:i.status}),_.has(e)||_.set(e,{obtained:0,max:0});let a=_.get(e);a.obtained+=Number(i.score||0),a.max+=Number(i.score_max||0)}let m=n.map(t=>Number(t.id)).filter(Boolean),l=new Map;return m.length&&(l=new Map((await r(`SELECT item_id, workflow_status
         FROM form_submission_workflow
         WHERE form_id = $1 AND item_type = 'submission' AND item_id = ANY($2::int[])`,[i,m])).rows.map(t=>[Number(t.item_id),String(t.workflow_status||"unread")]))),s(e,200,{status:"success",items:n.map(t=>({id:Number(t.id),form_id:Number(t.form_id),user_id:Number(t.user_id),status:t.status||"submitted",submitted_at:t.submitted_at,submitter_name:t.submitter_name||"",archive_code:t.archive_code||"",confidentiality_level:t.confidentiality_level||"internal",retention_years:Number(t.retention_years||2),archive_status:t.archive_status||"active_archive",archive_note:t.archive_note||"",archived_at:t.archived_at||null,archive_due_at:t.archive_due_at||null,archive_updated_by:t.archive_updated_by?Number(t.archive_updated_by):null,archive_updated_at:t.archive_updated_at||null,username:t.username||"",nama_panjang:t.nama_panjang||"",pimpinan:t.pimpinan||"",workflow_status:l.get(Number(t.id))||"unread",score_obtained:Number(_.get(Number(t.id))?.obtained||0),score_max:Number(_.get(Number(t.id))?.max||0),answers:d.get(Number(t.id))||[]}))})}async function P(t,e){let i=null;try{i=await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let r=n(t)||{},u=Number(r.form_id||0),d=Number(r.submission_id||0),_=b(r.archive_code,120),m=function(t){let e=String(t||"").trim().toLowerCase();if(!w.has(e))throw Error("confidentiality_level tidak valid.");return e}(r.confidentiality_level||"internal"),l=function(t){let e=Number(t);if(!Number.isInteger(e)||e<1||e>25)throw Error("retention_years harus bilangan bulat antara 1 sampai 25.");return e}(r.retention_years??2),f=function(t){let e=String(t||"").trim().toLowerCase();if(!p.has(e))throw Error("archive_status tidak valid.");return e}(r.archive_status||"active_archive"),c=h(r.archive_note,1200);if(!u||!d)return s(e,400,{status:"error",message:"form_id dan submission_id wajib diisi."});let N=(await a`
      SELECT id, archive_code, confidentiality_level, retention_years, archive_status, archive_note
      FROM form_submissions
      WHERE id=${d} AND form_id=${u}
      LIMIT 1
    `).rows[0];if(!N)return s(e,404,{status:"error",message:"Submission tidak ditemukan."});let E=(await a`
      UPDATE form_submissions
      SET archive_code=${_||null},
          confidentiality_level=${m},
          retention_years=${l},
          archive_status=${f},
          archive_note=${c||null},
          archived_at=CASE
            WHEN ${f} IN ('active_archive', 'inactive_archive') THEN COALESCE(archived_at, NOW())
            ELSE archived_at
          END,
          archive_due_at=NOW() + (${l} * INTERVAL '1 year'),
          archive_updated_by=${i.id},
          archive_updated_at=NOW(),
          updated_at=NOW()
      WHERE id=${d} AND form_id=${u}
      RETURNING id, form_id, archive_code, confidentiality_level, retention_years, archive_status,
                archive_note, archived_at, archive_due_at, archive_updated_by, archive_updated_at
    `).rows[0];return await W(i.id,"UPDATE_FORM_ARCHIVE_META",{form_id:u,submission_id:d,before:{archive_code:N.archive_code||"",confidentiality_level:N.confidentiality_level||"internal",retention_years:Number(N.retention_years||2),archive_status:N.archive_status||"active_archive",archive_note:N.archive_note||""},after:{archive_code:E.archive_code||"",confidentiality_level:E.confidentiality_level||"internal",retention_years:Number(E.retention_years||2),archive_status:E.archive_status||"active_archive",archive_note:E.archive_note||""}}),s(e,200,{status:"success",item:{id:Number(E.id),form_id:Number(E.form_id),archive_code:E.archive_code||"",confidentiality_level:E.confidentiality_level||"internal",retention_years:Number(E.retention_years||2),archive_status:E.archive_status||"active_archive",archive_note:E.archive_note||"",archived_at:E.archived_at||null,archive_due_at:E.archive_due_at||null,archive_updated_by:E.archive_updated_by?Number(E.archive_updated_by):null,archive_updated_at:E.archive_updated_at||null}})}async function J(t,e){try{await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let i=Number(t.query?.id||0);if(!i)return s(e,400,{status:"error",message:"ID form tidak valid."});let r=(await a`
      SELECT archive_status, COUNT(*)::int AS c
      FROM form_submissions
      WHERE form_id=${i}
      GROUP BY archive_status
    `).rows,n=(await a`
      SELECT confidentiality_level, COUNT(*)::int AS c
      FROM form_submissions
      WHERE form_id=${i}
      GROUP BY confidentiality_level
    `).rows,u=(await a`
      SELECT COUNT(*)::int AS c
      FROM form_submissions
      WHERE form_id=${i}
        AND archive_due_at IS NOT NULL
        AND archive_due_at <= NOW() + INTERVAL '30 days'
    `).rows[0],d={active_archive:0,inactive_archive:0,destroy_scheduled:0};r.forEach(t=>{let e=String(t.archive_status||"").trim().toLowerCase();Object.prototype.hasOwnProperty.call(d,e)&&(d[e]=Number(t.c||0))});let _={internal:0,restricted:0,secret:0};return n.forEach(t=>{let e=String(t.confidentiality_level||"").trim().toLowerCase();Object.prototype.hasOwnProperty.call(_,e)&&(_[e]=Number(t.c||0))}),s(e,200,{status:"success",summary:{archive_status:d,confidentiality:_,due_in_30_days:Number(u?.c||0)}})}async function q(t,e){try{await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let i=Number(t.query?.id||0);if(!i)return s(e,400,{status:"error",message:"ID form tidak valid."});let n=(await a`
      SELECT a.id, a.answer_text, s.id AS submission_id, s.submitted_at, ff.label, ff.field_type,
             s.submitter_name, u.username, u.nama_panjang, f.title AS form_title
      FROM form_answers a
      JOIN form_fields ff ON ff.id = a.field_id
      JOIN form_submissions s ON s.id = a.submission_id
      JOIN users u ON u.id = s.user_id
      JOIN form_templates f ON f.id = s.form_id
      WHERE s.form_id=${i}
      AND ff.focus_inbox = true
      AND ff.field_type IN ('short_text', 'paragraph')
      AND COALESCE(a.answer_text, '') <> ''
      ORDER BY s.submitted_at DESC, a.id DESC
    `).rows,u=n.map(t=>Number(t.id)).filter(Boolean),d=new Map;return u.length&&(d=new Map((await r(`SELECT item_id, workflow_status
         FROM form_submission_workflow
         WHERE form_id = $1 AND item_type = 'inbox' AND item_id = ANY($2::int[])`,[i,u])).rows.map(t=>[Number(t.item_id),String(t.workflow_status||"unread")]))),s(e,200,{status:"success",items:n.map(t=>({id:Number(t.id),submission_id:Number(t.submission_id),submitted_at:t.submitted_at,form_title:t.form_title||"",field_label:t.label||"",field_type:t.field_type||"short_text",answer_text:t.answer_text||"",submitter_name:t.submitter_name||"",username:t.username||"",nama_panjang:t.nama_panjang||"",workflow_status:d.get(Number(t.id))||"unread"}))})}async function B(t,e){let i=null;try{i=await o(t)}catch(t){return s(e,401,{status:"error",message:t.message||"Unauthorized"})}let r=n(t)||{},u=Number(r.form_id||0),d=String(r.item_type||"").trim().toLowerCase(),_=Number(r.item_id||0),m=String(r.status||"").trim().toLowerCase();if(!u||!_)return s(e,400,{status:"error",message:"form_id dan item_id wajib diisi."});if(!c.has(d))return s(e,400,{status:"error",message:"item_type tidak valid."});if(!f.has(m))return s(e,400,{status:"error",message:"status workflow tidak valid."});if("submission"===d){if(!(await a`
        SELECT id FROM form_submissions
        WHERE id=${_} AND form_id=${u}
        LIMIT 1
      `).rows[0])return s(e,404,{status:"error",message:"Submission tidak ditemukan."})}else if(!(await a`
        SELECT a.id
        FROM form_answers a
        JOIN form_fields ff ON ff.id = a.field_id
        JOIN form_submissions s ON s.id = a.submission_id
        WHERE a.id=${_}
          AND s.form_id=${u}
          AND ff.focus_inbox = true
        LIMIT 1
      `).rows[0])return s(e,404,{status:"error",message:"Item inbox tidak ditemukan."});return await a`
    INSERT INTO form_submission_workflow (form_id, item_type, item_id, workflow_status, updated_by, updated_at)
    VALUES (${u}, ${d}, ${_}, ${m}, ${i.id}, NOW())
    ON CONFLICT (form_id, item_type, item_id)
    DO UPDATE SET workflow_status=${m}, updated_by=${i.id}, updated_at=NOW()
  `,await W(i.id,"MARK_FORM_WORKFLOW",{form_id:u,item_type:d,item_id:_,workflow_status:m}),s(e,200,{status:"success",item:{form_id:u,item_type:d,item_id:_,workflow_status:m}})}e.exports=async(t,e)=>{try{await u(),t.query=t.query||{};let i=String(t.query.action||"").trim();if(!new URL(t.url||"/api/forms",`http://${t.headers?.host||"localhost"}`).pathname.includes("/api/admin/forms")){if("GET"===t.method&&"listPublished"===i)return await C(t,e);if("GET"===t.method&&"detail"===i)return await M(t,e);if("GET"===t.method&&"mySubmissions"===i)return await L(t,e);if("POST"===t.method&&"submit"===i)return await x(t,e);return s(e,404,{status:"error",message:`Unknown action: ${i||"none"}`})}if("GET"===t.method&&"list"===i)return await D(t,e);if("GET"===t.method&&"detail"===i)return await I(t,e);if("GET"===t.method&&"submissions"===i)return await H(t,e);if("GET"===t.method&&"analysis"===i)return await F(t,e);if("GET"===t.method&&"inbox"===i)return await q(t,e);if("GET"===t.method&&"archiveSummary"===i)return await J(t,e);if("POST"===t.method&&"saveTemplate"===i)return await U(t,e);if("POST"===t.method&&"publish"===i)return await j(t,e);if("POST"===t.method&&"markWorkflow"===i)return await B(t,e);if("POST"===t.method&&"updateArchiveMeta"===i)return await P(t,e);return s(e,404,{status:"error",message:`Unknown action: ${i||"none"}`})}catch(i){let t=String(i.message||i);if(/duplicate key/i.test(t)&&/form_submissions/.test(t))return s(e,409,{status:"error",message:"Akun ini sudah pernah mengisi form tersebut."});return s(e,/wajib diisi|tidak didukung|minimal satu|tidak valid/i.test(t)?400:500,{status:"error",message:t})}}}];

//# sourceMappingURL=src_pages_api__handler_forms_0beld8j.js.map