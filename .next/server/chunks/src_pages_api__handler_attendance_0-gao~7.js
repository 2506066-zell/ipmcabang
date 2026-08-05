module.exports=[31071,(e,t,a)=>{let i=e.r(54799),{query:r,rawQuery:n}=e.r(35716),{ensureSchema:s}=e.r(44285),{json:d,cacheHeaders:_,parseJsonBody:o}=e.r(86651),{getSessionUser:m,requireAdminAuth:u}=e.r(23908),c=new Set(["hadir","izin","sakit","alfa"]),l="Asia/Bangkok",p=["IPM CABANG PANAWUAN","PC IPM PANAWUAN","PIMPINAN CABANG IPM PANAWUAN"];function E(){return function(e=new Date,t=l){let a=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(e).map(e=>[e.type,e.value]));return`${a.year}-${a.month}-${a.day}`}(new Date,l)}function b(e,t=200){return String(e||"").trim().slice(0,t)}function g(e){return b(e,32).replace(/\s+/g,"").toUpperCase()}function w(e){let t=b(e,20).toLowerCase();return c.has(t)?t:""}function f(e){let t=Number(e);return Number.isFinite(t)?t:0}function y(e){return b(e,120).toUpperCase()}function N(e){return!function(e){let t=y(e);if(!t)return!1;if(p.some(e=>t===y(e)))return!0;let a=t.replace(/[^A-Z0-9]/g,""),i=a.includes("CABANG"),r=a.includes("IPM"),n=a.includes("PANAWUAN"),s=a.includes("PCIPM"),d=a.includes("PIMPINANCABANG");return i||d||n||s||r&&a.includes("PC")}("string"==typeof e?e:e?.pimpinan)?"account_identity":"org_member_select"}function O(e,t){let a=new Map((t||[]).map(e=>[Number(e.event_id),e])),i={total_events:0,hadir_count:0,izin_count:0,sakit_count:0,alfa_count:0,attendance_percent:0,activity_status:"pasif"};for(let t of e||[]){let e=a.get(Number(t.id)),r=w(e?.attendance_status);r||"closed"!==String(t.status||"").toLowerCase()||(r="alfa"),r&&(i.total_events+=1,"hadir"===r&&(i.hadir_count+=1),"izin"===r&&(i.izin_count+=1),"sakit"===r&&(i.sakit_count+=1),"alfa"===r&&(i.alfa_count+=1))}return i.total_events>0&&(i.attendance_percent=Math.round(i.hadir_count/i.total_events*100)),i.activity_status=i.attendance_percent>=75?"aktif":"pasif",i}async function h(){let e=(await r`SELECT value FROM system_settings WHERE key='pimpinan_options'`).rows[0],t=[];if(e?.value)try{let a=JSON.parse(e.value);Array.isArray(a)&&(t=a.map(e=>b(e,80)).filter(Boolean))}catch{}return t.length||(t=(await r`
      SELECT DISTINCT pimpinan
      FROM users
      WHERE COALESCE(TRIM(pimpinan), '') <> ''
      ORDER BY pimpinan ASC
    `).rows.map(e=>b(e.pimpinan,80)).filter(Boolean)),[...new Set(t)]}async function v(){for(let e of(await s(),await h())){let t=function(e){let t=b(e,30).toUpperCase().replace(/[^A-Z0-9]/g,""),a=(t||"ROOM").slice(0,4).padEnd(4,"X"),r=i.createHash("sha1").update(t||"ROOM").digest("hex").slice(0,4).toUpperCase();return`${a}-${r}`}(e);await r`
      INSERT INTO attendance_rooms (pimpinan, room_code, is_active, created_at, updated_at)
      VALUES (${e}, ${t}, ${!0}, NOW(), NOW())
      ON CONFLICT (pimpinan)
      DO NOTHING
    `}return(await r`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows}async function R(){return(await r`
    SELECT m.id, m.full_name, m.role_title, m.bidang_id, b.name AS bidang_name
    FROM org_members m
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE COALESCE(m.is_active, true) = true
    ORDER BY m.full_name ASC, m.id ASC
  `).rows}async function S(e){return(await r`
    SELECT m.id, m.full_name, m.role_title, m.bidang_id, b.name AS bidang_name, m.is_active
    FROM org_members m
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE m.id=${e}
  `).rows[0]||null}async function A(){await r`
    UPDATE attendance_events
    SET status='closed',
        closed_at=COALESCE(closed_at, NOW()),
        updated_at=NOW()
    WHERE status='active'
      AND (created_at < (NOW() - INTERVAL '24 hours') OR event_date < ${E()})
  `}async function C(e){let t=(await r`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    WHERE id=${e}
  `).rows[0]||null;return t?{...t,identity_mode:N(t)}:null}async function T(e,t,a){return e&&t&&a&&(await r`
    SELECT id, room_id, user_id, access_token, expires_at
    FROM attendance_room_sessions
    WHERE user_id=${e}
      AND room_id=${t}
      AND access_token=${a}
      AND expires_at > NOW()
  `).rows[0]||null}async function k(e,t,a){let i=b(e.headers?.["x-room-access"]||e.query?.room_token||"",120),r=await T(t.id,a,i);if(!r){let e=Error("Akses room tidak valid atau sudah kedaluwarsa");throw e.status=403,e}return r}async function L(e){return(await r`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_by, e.created_at, e.updated_at, e.closed_at,
           u.username AS created_by_username,
           u.nama_panjang AS created_by_name
    FROM attendance_events e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE e.room_id=${e}
      AND e.status='active'
      AND e.created_at >= (NOW() - INTERVAL '24 hours')
    ORDER BY e.created_at DESC
    LIMIT 1
  `).rows[0]||null}async function $(e,t=12){return(await r`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_at, e.closed_at,
           u.username AS created_by_username,
           COALESCE(COUNT(r.id), 0)::int AS submitted_count,
           COALESCE(SUM(CASE WHEN r.attendance_status='hadir' THEN 1 ELSE 0 END), 0)::int AS hadir_count
    FROM attendance_events e
    LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN attendance_records r ON r.event_id = e.id
    WHERE e.room_id=${e}
    GROUP BY e.id, u.username
    ORDER BY e.event_date DESC, e.created_at DESC
    LIMIT ${t}
  `).rows}async function D(e){let t=(await r`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_by, e.created_at, e.updated_at, e.closed_at,
           room.pimpinan,
           room.is_active AS room_active
    FROM attendance_events e
    JOIN attendance_rooms room ON room.id = e.room_id
    WHERE e.id=${e}
  `).rows[0]||null;return t?{...t,identity_mode:N(t)}:null}async function I(e){return(await r`
    SELECT id, room_id, title, description, event_date, status, created_by, created_at, updated_at, closed_at
    FROM attendance_events
    WHERE room_id=${e}
    ORDER BY event_date DESC, created_at DESC
  `).rows}async function W(e){return(await r`
    SELECT r.id, r.event_id, r.user_id, r.org_member_id, r.attendee_name_snapshot, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.submitted_by, r.note, r.created_at, r.updated_at
    FROM attendance_records r
    JOIN attendance_events e ON e.id = r.event_id
    WHERE e.room_id=${e}
    ORDER BY r.updated_at DESC, r.id DESC
  `).rows}async function M(e,t){let a=await I(e),i=(await r`
    SELECT id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    FROM attendance_records
    WHERE user_id=${t}
      AND event_id IN (
        SELECT id FROM attendance_events WHERE room_id=${e}
      )
    ORDER BY updated_at DESC, id DESC
  `).rows;return{summary:O(a,i),records:i}}async function U(e){let t=await I(e.id),a=await W(e.id);if("org_member_select"===N(e)){let i=(await R()).map(e=>{let i=O(t,a.filter(t=>Number(t.org_member_id)===Number(e.id)).map(t=>({...t,user_id:e.id})));return{id:e.id,username:"",nama_panjang:e.full_name,role_title:e.role_title,bidang_name:e.bidang_name||"",summary:i}});return{room_id:e.id,pimpinan:e.pimpinan,identity_mode:"org_member_select",total_members:i.length,active_members:i.filter(e=>"aktif"===e.summary.activity_status).length,passive_members:i.filter(e=>"pasif"===e.summary.activity_status).length,users:i}}let i=(await r`
    SELECT id, username, nama_panjang, pimpinan, role, created_at
    FROM users
    WHERE COALESCE(TRIM(pimpinan), '')=${b(e.pimpinan,80)}
    ORDER BY nama_panjang ASC NULLS LAST, username ASC
  `).rows.map(e=>{let i=O(t,a.filter(t=>Number(t.user_id)===Number(e.id)));return{id:e.id,username:e.username,nama_panjang:e.nama_panjang,pimpinan:e.pimpinan,summary:i}});return{room_id:e.id,pimpinan:e.pimpinan,identity_mode:"account_identity",total_members:i.length,active_members:i.filter(e=>"aktif"===e.summary.activity_status).length,passive_members:i.filter(e=>"pasif"===e.summary.activity_status).length,users:i}}async function F(e,t){let a=await m(e);if(!a)return d(t,401,{status:"error",message:"Unauthorized"});await v(),await A();let i=(await r`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows,n=(await r`
    SELECT room_id, access_token, expires_at
    FROM attendance_room_sessions
    WHERE user_id=${a.id}
      AND expires_at > NOW()
  `).rows,s=(await r`
    SELECT id, room_id, title, event_date, status, created_at
    FROM attendance_events
    WHERE status='active'
      AND created_at >= (NOW() - INTERVAL '24 hours')
  `).rows,o=new Map(n.map(e=>[Number(e.room_id),e])),u=new Map(s.map(e=>[Number(e.room_id),e]));return d(t,200,{status:"success",user:{id:a.id,username:a.username,nama_panjang:a.nama_panjang,pimpinan:a.pimpinan,role:a.role},rooms:i.map(e=>({id:e.id,pimpinan:e.pimpinan,identity_mode:N(e),is_active:!0===e.is_active||"true"===String(e.is_active).toLowerCase(),has_access:o.has(Number(e.id)),today_event:u.get(Number(e.id))||null}))},_(0))}async function j(e,t){if(!await m(e))return d(t,401,{status:"error",message:"Unauthorized"});await v();let a=f(e.query?.room_id);if(!a)return d(t,400,{status:"error",message:"room_id wajib diisi"});let i=await C(a);if(!i)return d(t,404,{status:"error",message:"Room tidak ditemukan"});if("org_member_select"!==i.identity_mode)return d(t,200,{status:"success",identity_mode:i.identity_mode,members:[]},_(0));let r=await R();return d(t,200,{status:"success",identity_mode:i.identity_mode,members:r.map(e=>({id:e.id,full_name:e.full_name||e.nama_panjang||e.username||"",role_title:e.role_title||e.role||"",bidang_name:e.bidang_name||b(i.pimpinan,80)||""}))},_(0))}async function H(e,t){let a=await m(e);if(!a)return d(t,401,{status:"error",message:"Unauthorized"});await v();let n=o(e),s=f(n.room_id),_=g(n.room_code);if(!s||!_)return d(t,400,{status:"error",message:"Room dan kode wajib diisi"});let u=await C(s);if(!u||!0!==u.is_active&&"true"!==String(u.is_active).toLowerCase())return d(t,404,{status:"error",message:"Room tidak ditemukan atau tidak aktif"});if(g(u.room_code)!==_)return d(t,403,{status:"error",message:"Kode room tidak sesuai"});let c=i.randomBytes(24).toString("hex"),l=new Date(Date.now()+432e5).toISOString();return await r`
    INSERT INTO attendance_room_sessions (room_id, user_id, access_token, expires_at, created_at, updated_at)
    VALUES (${u.id}, ${a.id}, ${c}, ${l}, NOW(), NOW())
    ON CONFLICT (room_id, user_id)
    DO UPDATE SET
      access_token=EXCLUDED.access_token,
      expires_at=EXCLUDED.expires_at,
      updated_at=NOW()
  `,d(t,200,{status:"success",room:{id:u.id,pimpinan:u.pimpinan,identity_mode:u.identity_mode,is_active:u.is_active},access_token:c,expires_at:l})}async function B(e,t){let a=await m(e);if(!a)return d(t,401,{status:"error",message:"Unauthorized"});await v(),await A();let i=f(e.query?.room_id);if(!i)return d(t,400,{status:"error",message:"room_id wajib diisi"});let n=await C(i);if(!n)return d(t,404,{status:"error",message:"Room tidak ditemukan"});try{await k(e,a,n.id)}catch(e){return d(t,e.status||403,{status:"error",message:e.message||"Forbidden"})}let s=await L(n.id),o=await $(n.id,14),u=await M(n.id,a.id),c="org_member_select"===N(n)?Number((await r`SELECT COUNT(*)::int AS c FROM org_members WHERE is_active = true`).rows[0]?.c||0):Number((await r`
      SELECT COUNT(*)::int AS c
      FROM users
      WHERE COALESCE(TRIM(pimpinan), '')=${b(n.pimpinan,80)}
    `).rows[0]?.c||0),l=s&&u.records.find(e=>Number(e.event_id)===Number(s.id))||null,p=[],E=0;return s&&(p=(await r`
      SELECT COALESCE(r.attendee_name_snapshot, m.full_name, u.nama_panjang, u.username) AS attendee_name,
             u.username,
             r.check_in_at
      FROM attendance_records r
      LEFT JOIN org_members m ON m.id = r.org_member_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.event_id=${s.id}
        AND r.attendance_status='hadir'
      ORDER BY r.check_in_at DESC
      LIMIT 10
    `).rows,E=Number((await r`
      SELECT COUNT(*)::int AS c
      FROM attendance_records
      WHERE event_id=${s.id}
        AND attendance_status='hadir'
    `).rows[0]?.c||0)),d(t,200,{status:"success",room:{id:n.id,pimpinan:n.pimpinan,identity_mode:n.identity_mode,is_active:n.is_active,member_count:c},permissions:{can_create_event:!0,can_self_check_in:!!a},current_event:s?{...s,identity_mode:n.identity_mode,attendees_count:E,recent_attendees:p,my_record:l?{id:l.id,org_member_id:l.org_member_id,attendee_name_snapshot:l.attendee_name_snapshot,attendance_status:l.attendance_status,photo_url:l.photo_url,check_in_at:l.check_in_at,submitted_by_admin:l.submitted_by_admin,note:l.note}:null}:null,history:o,my_summary:u.summary},_(0))}async function P(e,t){let a=await m(e);if(!a)return d(t,401,{status:"error",message:"Unauthorized"});await v(),await A();let i=o(e),n=f(i.room_id),s=b(i.title,140),_=b(i.description,500);if(!n||!s)return d(t,400,{status:"error",message:"Room dan judul rapat wajib diisi"});let u=await C(n);if(!u||!0!==u.is_active&&"true"!==String(u.is_active).toLowerCase())return d(t,404,{status:"error",message:"Room tidak ditemukan atau nonaktif"});try{await k(e,a,u.id)}catch(e){return d(t,e.status||403,{status:"error",message:e.message||"Forbidden"})}if(await L(u.id))return d(t,409,{status:"error",message:"Room ini sudah memiliki rapat aktif hari ini"});let c=E();return d(t,201,{status:"success",event:{...(await r`
    INSERT INTO attendance_events (room_id, title, description, event_date, status, created_by, created_at, updated_at)
    VALUES (${u.id}, ${s}, ${_||null}, ${c}, ${"active"}, ${a.id}, NOW(), NOW())
    RETURNING id, room_id, title, description, event_date, status, created_by, created_at, updated_at, closed_at
  `).rows[0],identity_mode:u.identity_mode}})}async function z(e,t){let a,i=await m(e);if(!i)return d(t,401,{status:"error",message:"Unauthorized"});await v(),await A();let n=o(e),s=f(n.event_id),_=b(n.photo_url,256e3),u=f(n.org_member_id),c=b(n.attendee_name,160);if(!s||!_)return d(t,400,{status:"error",message:"Rapat dan foto selfie wajib diisi"});let l=await D(s);if(!l)return d(t,404,{status:"error",message:"Rapat tidak ditemukan"});if("active"!==b(l.status,20).toLowerCase()||new Date-new Date(l.created_at)>864e5)return d(t,409,{status:"error",message:"Rapat tidak sedang aktif untuk absensi mandiri"});if(!i)return d(t,403,{status:"error",message:"Absensi mandiri hanya untuk anggota pimpinan room ini"});try{await k(e,i,l.room_id)}catch(e){return d(t,e.status||403,{status:"error",message:e.message||"Forbidden"})}let p=null,E=i.id,g=b(i.nama_panjang||i.username,160);if("org_member_select"===l.identity_mode){if(!u)return d(t,400,{status:"error",message:"Nama anggota organisasi wajib dipilih untuk room cabang"});let e=await S(u);if(!e||!1===e.is_active)return d(t,400,{status:"error",message:"Nama anggota organisasi tidak valid atau tidak aktif"});if((await r`
      SELECT id
      FROM attendance_records
      WHERE event_id=${l.id}
        AND org_member_id=${e.id}
    `).rows[0])return d(t,409,{status:"error",message:"Nama anggota ini sudah tercatat pada event yang sama"});p=e.id,g=b(e.full_name,160)}else{if(!c)return d(t,400,{status:"error",message:"Tulis nama kader yang akan diabsenkan"});if(E=null,g=c,(await r`
      SELECT id
      FROM attendance_records
      WHERE event_id=${l.id}
        AND LOWER(COALESCE(attendee_name_snapshot, '')) = LOWER(${g})
      LIMIT 1
    `).rows[0])return d(t,409,{status:"error",message:"Kader ini sudah tercatat pada event yang sama"})}try{a=(await r`
      INSERT INTO attendance_records (
        event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at,
        submitted_by_admin, submitted_by, note, created_at, updated_at
      )
      VALUES (
        ${l.id}, ${E}, ${p}, ${g}, ${"hadir"}, ${_}, NOW(),
        ${!1}, ${i.id}, ${null}, NOW(), NOW()
      )
      RETURNING id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    `).rows[0]}catch(a){let e=String(a?.message||"");if(e.includes("idx_attendance_records_event_org_member_unique")||e.includes("attendance_records_event_id_org_member_id"))return d(t,409,{status:"error",message:"Nama anggota ini sudah tercatat pada event yang sama"});if(e.includes("idx_attendance_records_event_user_account_unique")||e.includes("attendance_records_event_id_user_id_key"))return d(t,409,{status:"error",message:"Kader ini sudah tercatat pada event yang sama"});throw a}return d(t,201,{status:"success",record:a})}async function J(e,t){let a=await m(e);if(!a)return d(t,401,{status:"error",message:"Unauthorized"});await v(),await A();let i=(await r`
    SELECT id, pimpinan, room_code, is_active
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows,n=[];for(let e of i){let t=await M(e.id,a.id);n.push({room_id:e.id,pimpinan:e.pimpinan,identity_mode:N(e),summary:t.summary})}return d(t,200,{status:"success",summaries:n},_(0))}async function Y(e,t){try{await u(e)}catch(e){return d(t,401,{status:"error",message:e.message||"Unauthorized"})}await v(),await A();let a=(await r`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows,i=[];for(let e of a){let t=await U(e),a=await L(e.id),r=await $(e.id,6);i.push({id:e.id,pimpinan:e.pimpinan,identity_mode:N(e),room_code:e.room_code,is_active:e.is_active,active_event:a,latest_events:r,recap:{total_members:t.total_members,active_members:t.active_members,passive_members:t.passive_members}})}return d(t,200,{status:"success",rooms:i},_(0))}async function x(e,t){try{await u(e)}catch(e){return d(t,401,{status:"error",message:e.message||"Unauthorized"})}await v(),await A();let a=f(e.query?.event_id);if(!a)return d(t,400,{status:"error",message:"event_id wajib diisi"});let i=await D(a);if(!i)return d(t,404,{status:"error",message:"Event tidak ditemukan"});let n=(await r`
    SELECT r.id, r.event_id, r.user_id, r.org_member_id, r.attendee_name_snapshot, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.submitted_by, r.note, r.created_at, r.updated_at,
           submitter.username AS submitted_by_username,
           u.username,
           u.nama_panjang,
           m.full_name AS org_member_name,
           m.role_title AS org_member_role_title,
           b.name AS org_member_bidang_name
    FROM attendance_records r
    LEFT JOIN users submitter ON submitter.id = r.submitted_by
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN org_members m ON m.id = r.org_member_id
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE r.event_id=${i.id}
    ORDER BY r.updated_at DESC, r.id DESC
  `).rows,s=[];if("org_member_select"===i.identity_mode){let e=await R(),t=new Map(n.map(e=>[Number(e.org_member_id),e]));s=e.map(e=>{let a=t.get(Number(e.id))||null,r="closed"===b(i.status,20).toLowerCase()?"alfa":"belum";return{id:e.id,user_id:a?.user_id||null,org_member_id:e.id,username:a?.username||"",nama_panjang:e.full_name,display_name:a?.attendee_name_snapshot||e.full_name,role_title:e.role_title||"",bidang_name:e.bidang_name||"",pimpinan:i.pimpinan,attendance_status:a?a.attendance_status:r,photo_url:a?.photo_url||"",check_in_at:a?.check_in_at||null,source:a?a.submitted_by_admin?"admin manual":"self check-in":"belum absen",note:a?.note||"",record_id:a?.id||null,submitted_by_username:a?.submitted_by_username||""}})}else{let e=(await r`
      SELECT id, username, nama_panjang, pimpinan, role, created_at
      FROM users
      WHERE COALESCE(TRIM(pimpinan), '')=${b(i.pimpinan,80)}
      ORDER BY nama_panjang ASC NULLS LAST, username ASC
    `).rows,t=new Map(n.map(e=>[Number(e.user_id),e]));s=[...s=e.map(e=>{let a=t.get(Number(e.id))||null,r="closed"===b(i.status,20).toLowerCase()?"alfa":"belum";return{id:e.id,user_id:e.id,org_member_id:null,username:e.username,nama_panjang:e.nama_panjang,display_name:e.nama_panjang||e.username,role_title:"",bidang_name:"",pimpinan:e.pimpinan,attendance_status:a?a.attendance_status:r,photo_url:a?.photo_url||"",check_in_at:a?.check_in_at||null,source:a?a.submitted_by_admin?"admin manual":"self check-in":"belum absen",note:a?.note||"",record_id:a?.id||null,submitted_by_username:a?.submitted_by_username||""}}),...n.filter(e=>!e.user_id&&b(e.attendee_name_snapshot,160)).map(e=>({id:`manual-${e.id}`,user_id:null,org_member_id:null,username:"",nama_panjang:e.attendee_name_snapshot,display_name:e.attendee_name_snapshot,role_title:"",bidang_name:"",pimpinan:i.pimpinan,attendance_status:e.attendance_status||"belum",photo_url:e.photo_url||"",check_in_at:e.check_in_at||null,source:e.submitted_by_admin?"admin manual":"self check-in",note:e.note||"",record_id:e.id,submitted_by_username:e.submitted_by_username||""}))]}let o=s.reduce((e,t)=>{let a=w(t.attendance_status)||"belum";return e[a]=(e[a]||0)+1,e},{hadir:0,izin:0,sakit:0,alfa:0,belum:0});return d(t,200,{status:"success",event:{...i,identity_mode:i.identity_mode},participants:s,summary:o},_(0))}async function V(e,t){try{await u(e)}catch(e){return d(t,401,{status:"error",message:e.message||"Unauthorized"})}await v(),await A();let a=f(e.query?.room_id);if(!a)return d(t,400,{status:"error",message:"room_id wajib diisi"});let i=await C(a);if(!i)return d(t,404,{status:"error",message:"Room tidak ditemukan"});let r=await $(i.id,30),n=await U(i);return d(t,200,{status:"success",room:{id:i.id,pimpinan:i.pimpinan,identity_mode:i.identity_mode,room_code:i.room_code,is_active:i.is_active},events:r,recap:n},_(0))}async function G(e,t){let a=await m(e);if(!a)return d(t,401,{status:"error",message:"Unauthorized"});let i=f(e.query?.event_id);if(!i)return d(t,400,{status:"error",message:"event_id wajib diisi"});let n=await D(i);if(!n)return d(t,404,{status:"error",message:"Event tidak ditemukan"});let s=!1;try{await u(e),s=!0}catch{}if(!s)try{await k(e,a,n.room_id)}catch(e){return d(t,403,{status:"error",message:"Anda tidak memiliki akses untuk mengekspor data room ini"})}let _=(await r`
    SELECT r.id, r.event_id, r.user_id, r.org_member_id, r.attendee_name_snapshot, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.note, r.created_at,
           u.username, u.nama_panjang,
           m.full_name AS org_member_name,
           m.role_title AS org_member_role_title,
           b.name AS org_member_bidang_name
    FROM attendance_records r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN org_members m ON m.id = r.org_member_id
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE r.event_id=${n.id}
    ORDER BY r.check_in_at ASC, r.id ASC
  `).rows.map(e=>({nama:e.attendee_name_snapshot||e.org_member_name||e.nama_panjang||e.username||"-",jabatan:e.org_member_role_title||"-",bidang:e.org_member_bidang_name||"-",status:e.attendance_status,waktu_absen:e.check_in_at?new Date(e.check_in_at).toLocaleString("id-ID"):"-",sumber:e.submitted_by_admin?"Admin":"Mandiri",foto:e.photo_url||"-",catatan:e.note||"-"}));return d(t,200,{status:"success",event:{title:n.title,date:n.event_date,pimpinan:n.pimpinan},data:_})}async function q(e,t){let a=null;try{a=await u(e)}catch(e){return d(t,401,{status:"error",message:e.message||"Unauthorized"})}await v();let i=o(e),s=f(i.room_id),_=g(i.room_code),m=void 0===i.is_active?void 0:!!i.is_active;if(!s||!_)return d(t,400,{status:"error",message:"Room dan kode wajib diisi"});let c=["room_code = $1","updated_at = NOW()"],l=[_];return void 0!==m&&(c.push(`is_active = $${l.length+1}`),l.push(m)),l.push(s),await n(`UPDATE attendance_rooms SET ${c.join(", ")} WHERE id = $${l.length}`,l),await r`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${a.id}, ${"UPDATE_ATTENDANCE_ROOM"}, ${{room_id:s,room_code:_,is_active:m}})
  `,d(t,200,{status:"success",room:await C(s)})}async function K(e,t){let a=null;try{a=await u(e)}catch(e){return d(t,401,{status:"error",message:e.message||"Unauthorized"})}await v(),await A();let i=o(e),n=f(i.event_id),s=f(i.user_id),_=f(i.org_member_id),m=w(i.attendance_status),c=b(i.photo_url,256e3)||null,l=b(i.note,300)||null;if(!n||!m)return d(t,400,{status:"error",message:"Rapat dan status wajib diisi"});let p=await D(n);if(!p)return d(t,404,{status:"error",message:"Rapat tidak ditemukan"});let E=s||null,g=null,y="",N=null;if("org_member_select"===p.identity_mode){if(!_)return d(t,400,{status:"error",message:"Nama anggota organisasi wajib dipilih untuk room cabang"});let e=await S(_);if(!e||!1===e.is_active)return d(t,404,{status:"error",message:"Anggota organisasi tidak ditemukan"});g=e.id,y=b(e.full_name,160),N=(await r`
      SELECT id
      FROM attendance_records
      WHERE event_id=${p.id}
        AND org_member_id=${g}
    `).rows[0]}else{if(!s)return d(t,400,{status:"error",message:"User wajib dipilih untuk room ini"});let e=(await r`
      SELECT id, username, nama_panjang, pimpinan
      FROM users
      WHERE id=${s}
    `).rows[0];if(!e)return d(t,404,{status:"error",message:"User tidak ditemukan"});if(b(e.pimpinan,80)!==b(p.pimpinan,80))return d(t,400,{status:"error",message:"User tidak termasuk pimpinan room event ini"});E=e.id,y=b(e.nama_panjang||e.username,160),N=(await r`
      SELECT id
      FROM attendance_records
      WHERE event_id=${p.id}
        AND user_id=${E}
    `).rows[0]}let O=null;return O=N?(await r`
      UPDATE attendance_records
      SET user_id=${E},
          org_member_id=${g},
          attendee_name_snapshot=${y},
          attendance_status=${m},
          photo_url=${c},
          check_in_at=NOW(),
          submitted_by_admin=${!0},
          submitted_by=${a.id},
          note=${l},
          updated_at=NOW()
      WHERE id=${N.id}
      RETURNING id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    `).rows[0]:(await r`
      INSERT INTO attendance_records (
        event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at,
        submitted_by_admin, submitted_by, note, created_at, updated_at
      )
      VALUES (
        ${p.id}, ${E}, ${g}, ${y}, ${m}, ${c}, NOW(),
        ${!0}, ${a.id}, ${l}, NOW(), NOW()
      )
      RETURNING id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    `).rows[0],await r`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${a.id}, ${"MANUAL_ATTENDANCE_RECORD"}, ${{event_id:p.id,user_id:E,org_member_id:g,attendance_status:m}})
  `,d(t,200,{status:"success",record:O})}async function X(e,t){let a=null;try{a=await u(e)}catch(e){return d(t,401,{status:"error",message:e.message||"Unauthorized"})}let i=f(o(e).event_id);return i?(await r`
    UPDATE attendance_events
    SET status='closed', closed_at=NOW(), updated_at=NOW()
    WHERE id=${i}
  `,await r`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${a.id}, ${"CLOSE_ATTENDANCE_EVENT"}, ${{event_id:i}})
  `,d(t,200,{status:"success",event:await D(i)})):d(t,400,{status:"error",message:"event_id wajib diisi"})}t.exports=async(e,t)=>{try{let a=b(e.query?.action||"",60);if("GET"===e.method){if("rooms"===a)return await F(e,t);if("roomDetail"===a)return await B(e,t);if("memberOptions"===a||"members"===a)return await j(e,t);if("mySummary"===a)return await J(e,t);if("adminOverview"===a)return await Y(e,t);if("adminEventDetail"===a)return await x(e,t);if("adminRoomEvents"===a)return await V(e,t);if("exportEvent"===a)return await G(e,t);return d(t,404,{status:"error",message:`Unknown action: ${a}`})}if("POST"===e.method){if("verifyRoom"===a)return await H(e,t);if("createEvent"===a)return await P(e,t);if("checkIn"===a)return await z(e,t);if("updateRoomCode"===a)return await q(e,t);if("manualRecord"===a)return await K(e,t);if("closeEvent"===a)return await X(e,t);return d(t,404,{status:"error",message:`Unknown action: ${a}`})}return d(t,405,{status:"error",message:"Method not allowed"})}catch(e){return d(t,500,{status:"error",message:String(e?.message||e)})}}}];

//# sourceMappingURL=src_pages_api__handler_attendance_0-gao~7.js.map