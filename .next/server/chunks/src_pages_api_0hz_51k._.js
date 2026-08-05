module.exports=[4507,(r,t,a)=>{let e=r.r(54799),{query:i}=r.r(35716),{sendToAll:s}=r.r(42551);function n(r,t=180){return String(r||"").replace(/\s+/g," ").trim().slice(0,t)}function o({program:r,bidang:t,eventType:a}){let e,i,s=n(t?.name||"Bidang IPM",80),u=n(t?.code||"",80),d=n(r?.title||"Program kerja",84),g="create"===a?"Program kerja baru":"Pembaruan program kerja",m=(e=String(r?.status||"draft").trim().toLowerCase(),"create"===a?"Apa yang perlu didiskusikan lebih dulu, dan kritik apa yang bisa membuat program ini lebih relevan?":"terlaksana"===e?"Bagian mana yang paling berdampak, dan apa yang perlu dievaluasi atau dikritisi untuk tindak lanjutnya?":"rencana"===e?"Apa yang perlu dipersiapkan, dan sisi mana yang perlu dikritisi agar pelaksanaannya lebih realistis?":"Apa masukan awal yang perlu dibahas bersama, dan apa yang masih perlu diperjelas dari program ini?"),_=[`${g}: ${d}.`,n(r?.description||"",110)||`${s} sedang membuka ruang masukan untuk program ini.`,m].join(" "),c="terlaksana"===String(r?.status||"").trim().toLowerCase()?"feedback":"discussion",l=new URLSearchParams;return u&&l.set("bidang",u),r?.id&&l.set("program",String(Number(r.id))),l.set("segment","program"),l.set("focus",c),l.set("source","program-reminder"),{title:`${g}: ${d}`,body:_,url:`/struktur-organisasi.html?${l.toString()}`,image:(i=String(t?.image_url||"").trim())?/^data:image\//i.test(i)||/^(https?:)?\/\//i.test(i)||i.startsWith("/")?i:`/${i.replace(/^\.?\//,"")}`:"/app/media/notifications/reminder-home.png",tag:`org-program-${Number(r?.id||0)}-${a}`,renotify:!1,context:`${s} membuka ruang diskusi dan kritik untuk program kerja ini`,trustLabel:"Program kerja resmi organisasi",summary:"feedback"===c?"feedback":"discussion"}}async function u(r,t,a){return!!r&&!!t&&!!a&&!!(await i`
    SELECT id
    FROM org_program_notification_logs
    WHERE program_id=${Number(r)}
      AND event_type=${String(t)}
      AND payload_hash=${String(a)}
    LIMIT 1
  `).rows[0]}async function d(r){r&&await i`
    INSERT INTO notifications (user_id, message)
    SELECT id, ${r}
    FROM users
    WHERE role='user' OR role IS NULL
  `}async function g(r,t,a,e,s){await i`
    INSERT INTO org_program_notification_logs (
      program_id, event_type, payload_hash, title_snapshot, body_snapshot, target_url,
      push_sent, push_failed, notified_at, created_at
    ) VALUES (
      ${Number(r)},
      ${String(t)},
      ${String(a)},
      ${e.title},
      ${e.body},
      ${e.url},
      ${Number(s?.sent||0)},
      ${Number(s?.failed||0)},
      NOW(),
      NOW()
    )
  `}async function m({program:r,bidang:t,eventType:a,adminId:n=null}){if(!r?.id||!t?.id)return{status:"skipped",reason:"missing-program-context"};let _=o({program:r,bidang:t,eventType:a}),c=e.createHash("sha1").update(JSON.stringify({title:_.title,body:_.body,url:_.url,image:_.image,summary:_.summary})).digest("hex");if(await u(r.id,a,c))return{status:"skipped",reason:"already-notified",payload:_};await d(`${_.title} - ${_.body}`);let l=await s(_);await g(r.id,a,c,_,l);try{await i`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (
        ${n},
        'AUTO_ORG_PROGRAM_NOTIFICATION',
        ${{program_id:Number(r.id),bidang_id:Number(t.id),event_type:a,push_sent:Number(l?.sent||0),push_failed:Number(l?.failed||0),summary:_.summary}}
      )
    `}catch{}return{status:"sent",payload:_,push_sent:Number(l?.sent||0),push_failed:Number(l?.failed||0)}}t.exports={buildProgramNotificationPayload:o,notifyOrganizationProgram:m}},61015,(r,t,a)=>{let{query:e}=r.r(35716),{json:i,parseJsonBody:s}=r.r(86651),{requireAdminAuth:n,requireUserAuth:o}=r.r(23908),{notifyOrganizationProgram:u}=r.r(4507);function d(r,t=255){return String(r||"").replace(/[\u0000-\u001F\u007F]/g," ").replace(/[<>]/g," ").trim().slice(0,t)}function g(r){let t=String(r||"").trim();return!t||t.endsWith("/")||["images/bidang/sekretaris.jpg","images/bidang/bendahara.jpg","images/bidang/kajianDakwah.jpg","images/bidang/apresiasiBudaya.jpg","images/bidang/umum.jpeg","images/bidang/pengkajianIlmu.jpeg","images/bidang/pkd.png","images/bidang/advokasi.jpeg","images/bidang/ipmawati.jpeg"].some(r=>t.includes(r))?"":/^https?:\/\//i.test(t)||/^data:image\//i.test(t)?t:t.startsWith("/data:image")?t.substring(1):t.startsWith("/")?t:`/${t.replace(/^\.?\//,"")}`}function m(r){let t=String(r||"").trim();return t.startsWith("/data:image")?t.substring(1):t}function _(r){let t=String(r||"").trim().toLowerCase();return"draft"===t||"rencana"===t||"terlaksana"===t?t:"draft"}function c(r,t=1){let a=Number(r);return!Number.isFinite(a)||a<1?t:Math.floor(a)}async function l(r,t){let a=Number(r||0);if(a>0){let r=(await e`SELECT id FROM org_bidang WHERE id=${a} LIMIT 1`).rows[0];return r?Number(r.id):0}let i=d(t,80);if(!i)return 0;let s=(await e`SELECT id FROM org_bidang WHERE code=${i} LIMIT 1`).rows[0];return s?Number(s.id):0}function E(r,t,a){let e=new Map;for(let r of t){let t=Number(r.bidang_id);e.has(t)||e.set(t,[]),e.get(t).push({id:Number(r.id),bidang_id:t,full_name:r.full_name||"",role_title:r.role_title||"",quote:r.quote||"",photo_url:m(r.photo_url),instagram_url:r.instagram_url||"",sort_order:Number(r.sort_order||1),is_active:!1!==r.is_active})}let i=new Map;for(let r of a){let t=Number(r.bidang_id);i.has(t)||i.set(t,[]),i.get(t).push({id:Number(r.id),bidang_id:t,title:r.title||"",description:r.description||"",status:_(r.status),sort_order:Number(r.sort_order||1),progress_percent:Number(r.progress_percent||0),upvote_count:Number(r.upvote_count||0),is_active:!1!==r.is_active})}return r.map(r=>{let t=Number(r.id);return{id:t,code:r.code||"",name:r.name||"",color:r.color||"#4A7C5D",image_url:m(r.image_url),sort_order:Number(r.sort_order||1),is_core:!0===r.is_core,is_active:!1!==r.is_active,members:e.get(t)||[],programs:i.get(t)||[]}})}async function p(r,t){let a=(await e`
    SELECT id, code, name, color, image_url, sort_order, is_core, is_active
    FROM org_bidang
    WHERE is_active = true
    ORDER BY sort_order ASC, id ASC
  `).rows;return a.length?i(t,200,{status:"success",bidang:E(a,(await e`
    SELECT id, bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
    FROM org_members
    WHERE is_active = true
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows,(await e`
    SELECT id, bidang_id, title, description, status, sort_order, progress_percent, upvote_count, is_active
    FROM org_programs
    WHERE is_active = true
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows)}):i(t,200,{status:"success",bidang:[]})}async function b(r,t){try{await n(r)}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}return i(t,200,{status:"success",bidang:E((await e`
    SELECT id, code, name, color, image_url, sort_order, is_core, is_active
    FROM org_bidang
    ORDER BY sort_order ASC, id ASC
  `).rows,(await e`
    SELECT id, bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
    FROM org_members
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows,(await e`
    SELECT id, bidang_id, title, description, status, sort_order, progress_percent, upvote_count, is_active
    FROM org_programs
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows)})}async function R(r,t){let a,o=null;try{o=(await n(r)).id}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}let u=s(r),m=Number(u.id||0),_=d(u.name,160),l=String(u.code||u.slug||_||"").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80),E=(a=String(u.color||"").trim(),/^#[0-9a-f]{6}$/i.test(a)?a:"#0f6f4d"),p=g(u.image_url||u.image),b=!0===u.is_core||"true"===u.is_core;if(!_)return i(t,400,{status:"error",message:"Nama bidang wajib diisi"});if(!l)return i(t,400,{status:"error",message:"Kode bidang wajib diisi"});let R=c(u.sort_order,0);R<1&&(R=c((await e`SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_sort FROM org_bidang`).rows[0]?.next_sort,1));let w=null;if(m>0){if((await e`
      SELECT id FROM org_bidang
      WHERE code=${l} AND id<>${m}
      LIMIT 1
    `).rows[0])return i(t,409,{status:"error",message:"Kode bidang sudah dipakai bidang lain"});if(!(w=(await e`
      UPDATE org_bidang
      SET code=${l},
          name=${_},
          color=${E},
          image_url=${p},
          sort_order=${R},
          is_core=${b},
          is_active=true,
          updated_at=NOW()
      WHERE id=${m}
      RETURNING *
    `).rows[0]))return i(t,404,{status:"error",message:"Bidang tidak ditemukan"});try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${o}, 'UPDATE_ORG_BIDANG', ${{id:m,code:l,name:_}})`}catch{}}else{w=(await e`
      INSERT INTO org_bidang (code, name, color, image_url, sort_order, is_core, is_active)
      VALUES (${l}, ${_}, ${E}, ${p}, ${R}, ${b}, ${!0})
      RETURNING *
    `).rows[0];try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${o}, 'CREATE_ORG_BIDANG', ${{id:w?.id,code:l,name:_}})`}catch{}}return i(t,200,{status:"success",bidang:w})}async function w(r,t){let a=null;try{a=(await n(r)).id}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}let o=s(r),u=Number(o.id||0),m=await l(o.bidang_id,o.bidang_code);if(!m)return i(t,400,{status:"error",message:"Bidang tidak valid"});let _=d(o.full_name||o.name,160),E=d(o.role_title||o.role,160);if(!_)return i(t,400,{status:"error",message:"Nama anggota wajib diisi"});if(!E)return i(t,400,{status:"error",message:"Role anggota wajib diisi"});let p=d(o.quote,500),b=g(o.photo_url||o.photo),R="";try{R=function(r){let t,a=String(r||"").trim();if(!a)return"";a.includes("/")||a.startsWith("http")||(a=`https://www.instagram.com/${a.replace(/^@/,"")}`),/^https?:\/\//i.test(a)||(a=`https://${a}`);try{t=new URL(a)}catch{throw Error("URL Instagram tidak valid")}if(!String(t.hostname||"").toLowerCase().includes("instagram.com"))throw Error("URL harus mengarah ke domain Instagram");return a}(o.instagram_url||o.instagram)}catch(r){return i(t,400,{status:"error",message:r.message||"URL Instagram tidak valid"})}let w=c(o.sort_order,0);w<1&&(w=c((await e`SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_sort FROM org_members WHERE bidang_id=${m}`).rows[0]?.next_sort,1));let $=null;if(u>0){if(!($=(await e`
      UPDATE org_members
      SET bidang_id=${m},
          full_name=${_},
          role_title=${E},
          quote=${p},
          photo_url=${b},
          instagram_url=${R},
          sort_order=${w},
          is_active=true,
          updated_at=NOW()
      WHERE id=${u}
      RETURNING *
    `).rows[0]))return i(t,404,{status:"error",message:"Anggota tidak ditemukan"});try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'UPDATE_ORG_MEMBER', ${{id:u,full_name:_,bidang_id:m}})`}catch{}}else{$=(await e`
      INSERT INTO org_members (
        bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
      ) VALUES (
        ${m}, ${_}, ${E}, ${p}, ${b}, ${R}, ${w}, ${!0}
      )
      RETURNING *
    `).rows[0];try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'CREATE_ORG_MEMBER', ${{id:$?.id,full_name:_,bidang_id:m}})`}catch{}}return i(t,200,{status:"success",member:$})}async function $(r,t){let a=null;try{a=(await n(r)).id}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}let o=Number(s(r).id||0);if(!o)return i(t,400,{status:"error",message:"ID anggota tidak valid"});if(!(await e`DELETE FROM org_members WHERE id=${o} RETURNING id`).rows[0])return i(t,404,{status:"error",message:"Anggota tidak ditemukan"});try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'DELETE_ORG_MEMBER', ${{id:o}})`}catch{}return i(t,200,{status:"success"})}async function N(r,t){let a=null;try{a=(await n(r)).id}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}let o=s(r),g=Number(o.id||0),m=await l(o.bidang_id,o.bidang_code);if(!m)return i(t,400,{status:"error",message:"Bidang tidak valid"});let E=g>0?(await e`SELECT * FROM org_programs WHERE id=${g} LIMIT 1`).rows[0]:null,p=d(o.title||o.name,180),b=d(o.description||o.desc,700);if(!p)return i(t,400,{status:"error",message:"Judul program wajib diisi"});let R=_(o.status),w=Math.max(0,Math.min(100,Number(o.progress_percent||0))),$=c(o.sort_order,0);$<1&&($=c((await e`SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_sort FROM org_programs WHERE bidang_id=${m}`).rows[0]?.next_sort,1));let N=null;if(g>0){if(!(N=(await e`
      UPDATE org_programs
      SET bidang_id=${m},
          title=${p},
          description=${b},
          status=${R},
          progress_percent=${w},
          sort_order=${$},
          is_active=true,
          updated_at=NOW()
      WHERE id=${g}
      RETURNING *
    `).rows[0]))return i(t,404,{status:"error",message:"Program tidak ditemukan"});try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'UPDATE_ORG_PROGRAM', ${{id:g,title:p,bidang_id:m,status:R}})`}catch{}}else{N=(await e`
      INSERT INTO org_programs (
        bidang_id, title, description, status, sort_order, progress_percent, is_active
      ) VALUES (
        ${m}, ${p}, ${b}, ${R}, ${$}, ${w}, ${!0}
      )
      RETURNING *
    `).rows[0];try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'CREATE_ORG_PROGRAM', ${{id:N?.id,title:p,bidang_id:m,status:R}})`}catch{}}let S=(await e`
    SELECT id, code, name, image_url
    FROM org_bidang
    WHERE id=${m}
    LIMIT 1
  `).rows[0],f=!E||String(E.title||"")!==String(N?.title||"")||String(E.description||"")!==String(N?.description||"")||String(E.status||"")!==String(N?.status||"")||Number(E.progress_percent||0)!==Number(N?.progress_percent||0)||Number(E.bidang_id||0)!==Number(N?.bidang_id||0);if(N&&S&&f)try{await u({program:N,bidang:S,eventType:E?"update":"create",adminId:a})}catch(r){console.error("Program notification failed:",r)}return i(t,200,{status:"success",program:N})}async function S(r,t){let a=null;try{a=(await n(r)).id}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}let o=Number(s(r).id||0);if(!o)return i(t,400,{status:"error",message:"ID program tidak valid"});if(!(await e`DELETE FROM org_programs WHERE id=${o} RETURNING id`).rows[0])return i(t,404,{status:"error",message:"Program tidak ditemukan"});try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'DELETE_ORG_PROGRAM', ${{id:o}})`}catch{}return i(t,200,{status:"success"})}async function f(r,t){let a=Number(r.query.program_id||0);if(!a)return i(t,400,{status:"error",message:"ID program tidak valid"});let s=null;try{s=(await o(r)).id}catch(r){}let n=!1;return s&&(await e`SELECT 1 FROM org_program_upvotes WHERE program_id=${a} AND user_id=${s}`).rows[0]&&(n=!0),i(t,200,{status:"success",upvoted:n,comments:(await e`
    SELECT c.id, c.content, c.created_at, u.nama_panjang, u.username
    FROM org_program_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.program_id = ${a}
    ORDER BY c.created_at ASC
  `).rows})}async function T(r,t){let a;try{a=await o(r)}catch(r){return i(t,401,{status:"error",message:"Harus login untuk mendukung program."})}let n=Number(s(r).program_id||0);if(!n)return i(t,400,{status:"error",message:"Program invalid"});let u=(await e`SELECT 1 FROM org_program_upvotes WHERE program_id=${n} AND user_id=${a.id}`).rows[0],d=!1;u?(await e`DELETE FROM org_program_upvotes WHERE program_id=${n} AND user_id=${a.id}`,await e`UPDATE org_programs SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id=${n}`):(await e`INSERT INTO org_program_upvotes (program_id, user_id) VALUES (${n}, ${a.id})`,await e`UPDATE org_programs SET upvote_count = upvote_count + 1 WHERE id=${n}`,d=!0);let g=(await e`SELECT upvote_count FROM org_programs WHERE id=${n}`).rows[0];return i(t,200,{status:"success",upvoted:d,upvote_count:g?.upvote_count||0})}async function h(r,t){let a;try{a=await o(r)}catch(r){return i(t,401,{status:"error",message:"Harus login untuk berkomentar."})}let n=s(r),u=Number(n.program_id||0),g=d(n.content,1e3);if(!u||!g)return i(t,400,{status:"error",message:"Isi komentar tidak boleh kosong"});let m=(await e`
    INSERT INTO org_program_comments (program_id, user_id, content) 
    VALUES (${u}, ${a.id}, ${g}) 
    RETURNING id, content, created_at
  `).rows[0];return i(t,200,{status:"success",comment:{id:m.id,content:m.content,created_at:m.created_at,username:a.username,nama_panjang:a.nama_panjang}})}async function y(r,t){let a=null;try{a=(await n(r)).id}catch(r){return i(t,401,{status:"error",message:r.message||"Unauthorized"})}let o=Number(s(r).comment_id||0);if(!o)return i(t,400,{status:"error",message:"ID komentar tidak valid"});if(!(await e`DELETE FROM org_program_comments WHERE id=${o} RETURNING id`).rows[0])return i(t,404,{status:"error",message:"Komentar tidak ditemukan"});try{await e`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'DELETE_ORG_COMMENT', ${{id:o}})`}catch{}return i(t,200,{status:"success"})}t.exports=async(r,t)=>{try{r.query=r.query||{};let a=String(r.query.action||"").trim();if("GET"===r.method){if("snapshot"===a)return await b(r,t);if("getProgramDetails"===a)return await f(r,t);return await p(r,t)}if("POST"!==r.method)return i(t,405,{status:"error",message:"Method not allowed"});if("upsertMember"===a)return await w(r,t);if("upsertBidang"===a)return await R(r,t);if("deleteMember"===a)return await $(r,t);if("upsertProgram"===a)return await N(r,t);if("deleteProgram"===a)return await S(r,t);if("deleteProgramComment"===a)return await y(r,t);if("toggleUpvote"===a)return await T(r,t);if("addProgramComment"===a)return await h(r,t);return i(t,404,{status:"error",message:`Unknown action: ${a||"none"}`})}catch(r){return i(t,500,{status:"error",message:String(r.message||r)})}}}];

//# sourceMappingURL=src_pages_api_0hz_51k._.js.map