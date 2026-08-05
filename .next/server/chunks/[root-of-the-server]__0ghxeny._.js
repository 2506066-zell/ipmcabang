module.exports=[70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},54799,(e,t,a)=>{t.exports=e.x("crypto",()=>require("crypto"))},86651,(e,t,a)=>{let r=e.r(54799);function s(e){e.setHeader("X-Content-Type-Options","nosniff"),e.setHeader("X-Frame-Options","DENY"),e.setHeader("Referrer-Policy","strict-origin-when-cross-origin"),e.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()"),e.setHeader("Cross-Origin-Opener-Policy","same-origin"),e.setHeader("Cross-Origin-Resource-Policy","same-site"),e.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains; preload")}t.exports={json:function(e,t,a,i){let n=JSON.stringify(a??{}),u=r.createHash("sha1").update(n).digest("hex");s(e),e.setHeader("Content-Type","application/json"),e.setHeader("ETag",u),i&&Object.entries(i).forEach(([t,a])=>e.setHeader(t,a)),e.status(t).send(n)},cacheHeaders:function(e){let t=Number(e||60);return{"Cache-Control":`public, s-maxage=${t}, stale-while-revalidate=${5*t}`}},getBearerToken:function(e){let t=String(e?.headers?.authorization||"");return t.startsWith("Bearer ")?t.slice(7).trim():""},parseJsonBody:function(e){let t=e&&void 0!==e.body?e.body:{};if("string"==typeof t)try{return JSON.parse(t||"{}")}catch{return{}}return t||{}},applySecurityHeaders:s}},55168,(e,t,a)=>{t.exports=e.x("pg-587764f78a6c7a9c",()=>require("pg-587764f78a6c7a9c"))},14534,(e,t,a)=>{t.exports={DEFAULT_ORG_BIDANG:[{id:"ketuaUmum",name:"Ketua Umum",image:"images/bidang/umum.jpeg",color:"#2C5F4F"},{id:"sekretaris",name:"Sekretaris",image:"images/bidang/sekretaris.jpg",color:"#4A7C5D"},{id:"bendahara",name:"Bendahara",image:"images/bidang/bendahara.jpg",color:"#F39C12"},{id:"perkaderan",name:"Perkaderan",image:"images/bidang/pkd.png",color:"#E74C3C"},{id:"pengkajianIlmu",name:"Pengkajian Ilmu Pengetahuan",image:"images/bidang/pengkajianIlmu.jpeg",color:"#3498DB"},{id:"kajianDakwah",name:"Kajian Dakwah Islam",image:"images/bidang/kajianDakwah.jpg",color:"#9B59B6"},{id:"apresiasiBudaya",name:"Apresiasi Budaya & Olahraga",image:"images/bidang/apresiasiBudaya.jpg",color:"#1ABC9C"},{id:"advokasi",name:"Advokasi",image:"images/bidang/advokasi.jpeg",color:"#E67E22"},{id:"ipmawati",name:"Ipmawati",image:"images/bidang/ipmawati.jpeg",color:"#D946A6"}],DEFAULT_ORG_MEMBERS:[{name:"Anwar Miftah",role:"Ketua Umum",quote:"Kepemimpinan adalah tanggung jawab.",photo:"images/members/",bidangId:"ketuaUmum"},{name:"Nauval",role:"Sekretaris",quote:"Administrasi adalah fondasi organisasi yang kuat.",photo:"images/members/hendra-gunawan.jpg",bidangId:"sekretaris"},{name:"Yasifa Permata",role:"Bendahara Umum",quote:"Transparansi keuangan adalah kunci kepercayaan.",photo:"",bidangId:"bendahara",instagram:"https://www.instagram.com/username"},{name:"Syifa Nursafitri",role:"Bendahara I",quote:"Transparansi keuangan adalah kunci kepercayaan.",photo:"",bidangId:"bendahara"},{name:"Arief Bijaksana",role:"Ketua",quote:"",photo:"",bidangId:"perkaderan"},{name:"Hafiy Muhammad Fhaza",role:"Sekretaris",quote:"",photo:"",bidangId:"perkaderan"},{name:"Moch Ridwan Nulhakim",role:"Anggota",quote:"",photo:"",bidangId:"perkaderan"},{name:"Ajril Ahmad Fazar",role:"Anggota",quote:"",photo:"",bidangId:"perkaderan"},{name:"Gilang Muhammad Riziq",role:"Ketua Bidang",quote:"",photo:"images/members/gilang1.jpeg",bidangId:"pengkajianIlmu"},{name:"Zaldy Muhammad Fazri",role:"Sekretaris Bidang",quote:"",photo:"images/members/zaldy.jpeg",bidangId:"pengkajianIlmu"},{name:"Sudarisman",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Fathir Nasrulhaq",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Muhammad Fadilah",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Ayudia Cempaka Gratia",role:"Anggota",quote:"",photo:"images/members/ayudia.jpeg",bidangId:"pengkajianIlmu"},{name:"Halida Muna Nurmufidah",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Haura Azkya",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Debi Rahmawati",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Ahsan Hadian Assidiqi",role:"Ketua Bidang",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Syifa Khoerunnisa",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Siti Rahmawati",role:"Anggota",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Muhammad Iqbal",role:"Anggota",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Hasna Aurora Ginan Nurillah",role:"Ketua Bidang",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Najril Muhammad Solfa",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Ganjar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"asep",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"wiri",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Tegar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"anwar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Muhammad Yopi",role:"Ketua Bidang",quote:"",photo:"images/members/yopi.jpeg",bidangId:"advokasi"},{name:"Rehan Nurfahmi",role:"Sekretaris Bidang",quote:"",photo:"images/members/rehan.jpeg",bidangId:"advokasi"},{name:"Raisa Hidayatul Marwah",role:"Anggota",quote:"",photo:"",bidangId:"advokasi"},{name:"Raida Rahma Annastasya",role:"Ketua Bidang",quote:"",photo:"",bidangId:"ipmawati"},{name:"Sira Tiara Wangi",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"ipmawati"},{name:"Shabrina Diwamah Rifki 33",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Ramira Ramandita",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Ismi Nurazizah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Iklia Wahdiah Nurfitriah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Kheisya Zahra Oktavia",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Anida Uswah Mujahidah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"}],DEFAULT_ORG_PROGRAMS:[{bidangId:"ketuaUmum",name:"",desc:"",status:""},{bidangId:"ketuaUmum",name:"",desc:"",status:""},{bidangId:"sekretaris",name:"",desc:"",status:""},{bidangId:"bendahara",name:"",desc:"",status:""},{bidangId:"perkaderan",name:"",desc:"",status:""},{bidangId:"perkaderan",name:"",desc:"",status:""},{bidangId:"pengkajianIlmu",name:"",desc:"",status:""},{bidangId:"pengkajianIlmu",name:"",desc:"",status:""},{bidangId:"kajianDakwah",name:"",desc:"",status:""},{bidangId:"apresiasiBudaya",name:"",desc:"",status:""},{bidangId:"advokasi",name:"",desc:"",status:""},{bidangId:"ipmawati",name:"",desc:"",status:""},{bidangId:"ipmawati",name:"",desc:"",status:""}]}},23908,(e,t,a)=>{let{query:r}=e.r(35716),{getBearerToken:s}=e.r(86651);function i(e){let t={},a=e.headers?.cookie;return a&&a.split(";").forEach(e=>{let a=e.split("=");t[a.shift().trim()]=decodeURI(a.join("="))}),t}function n(e){return!["GET","HEAD","OPTIONS"].includes(String(e?.method||"GET").toUpperCase())}async function u(e){return(await r`SELECT u.id, u.username, u.nama_panjang, u.pimpinan, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${e} AND s.expires_at > NOW()`).rows[0]||null}t.exports={getSessionUser:async function(e){let t=s(e),a=t,r=i(e).session_token;if(n(e)&&!t||(a||(a=r),!a))return null;let o=await u(a);return o||(r&&r!==a?await u(r):null)},requireAdminAuth:async function(e){let t=s(e),a=t,u=i(e).session_token;if(n(e)&&!t)throw Error("Unauthorized: Bearer token required for state-changing requests");if(a||(a=u),!a)throw Error("Unauthorized: No token provided");let o=async e=>(await r`SELECT s.user_id AS id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${e} AND s.expires_at > NOW() AND u.role='admin'`).rows[0],d=await o(a);if(!d&&u&&u!==a&&(d=await o(u)),!d)throw Error("Unauthorized: Invalid token or not admin");return{id:d.id}}}},19708,(e,t,a)=>{t.exports=e.x("web-push-5043b119f048bede",()=>require("web-push-5043b119f048bede"))},42551,(e,t,a)=>{let r=e.r(19708),{query:s}=e.r(35716),i=Math.max(1,Number(process.env.PUSH_SEND_CONCURRENCY||20)),n=Math.max(30,Number(process.env.PUSH_TTL_SECONDS||300)),u=Math.max(3e3,Number(process.env.PUSH_TIMEOUT_MS||1e4)),o="PC IPM Panawuan",d={quiz:"/app/media/notifications/reminder-quiz.png",form:"/app/media/notifications/reminder-forms.png",attendance:"/app/media/notifications/reminder-attendance.png",materials:"/app/media/notifications/reminder-materials.png",discussions:"/app/media/notifications/reminder-discussions.png",general:"/app/media/notifications/reminder-home.png"},l=d.general;function m(){let e=process.env.VAPID_PUBLIC_KEY,t=process.env.VAPID_PRIVATE_KEY,a=process.env.VAPID_SUBJECT||"mailto:admin@ipm.local";return e&&t?{publicKey:e,privateKey:t,subject:a}:null}function c(){let e=m();return e?(r.setVapidDetails(e.subject,e.publicKey,e.privateKey),e):null}async function g(e){e&&await s`DELETE FROM push_subscriptions WHERE endpoint=${e}`}function p(e){let t=e&&"object"==typeof e?{...e}:{};return t.title||(t.title=o),t.icon||(t.icon="/app/media/brand/ipm-logo.png"),t.badge||(t.badge="/icons/icon-192-maskable.png"),t.image||!1===t.useLargeImage||(t.image=l),t.tag||(t.tag="ipm-general"),void 0===t.renotify&&(t.renotify=!1),void 0===t.requireInteraction&&(t.requireInteraction=!1),Array.isArray(t.vibrate)||(t.vibrate=[180,60,180]),t.timestamp||(t.timestamp=Date.now()),t.appName=o,t.trustLabel=t.trustLabel||"Sumber resmi PC IPM Panawuan",t.context=t.context||"Informasi terverifikasi dari aplikasi IPM",t}async function E(e,t){if(!c())return console.error("Push Notification Error: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing in environment variables."),{sent:0,failed:0,error:"Konfigurasi VAPID Keys di Server (Vercel) belum lengkap."};let a=JSON.stringify(p(t)),s=0,o=0,d=0,l=Array.from({length:Math.min(i,e.length||0)},async()=>{for(;;){let t=d++;if(t>=e.length)return;let i=e[t],l={endpoint:i.endpoint,keys:{p256dh:i.p256dh,auth:i.auth}};try{await r.sendNotification(l,a,{TTL:n,urgency:"high",timeout:u}),s++}catch(e){o++,(404===e.statusCode||410===e.statusCode)&&await g(i.endpoint)}}});return await Promise.all(l),{sent:s,failed:o}}t.exports={withNotificationBranding:p,getVapid:m,initWebPush:c,saveSubscription:async function({endpoint:e,keys:t,user_id:a}){return!!e&&!!t?.p256dh&&!!t?.auth&&(await s`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id)
    VALUES (${e}, ${t.p256dh}, ${t.auth}, ${a||null})
    ON CONFLICT (endpoint)
    DO UPDATE SET
      p256dh=EXCLUDED.p256dh,
      auth=EXCLUDED.auth,
      user_id=COALESCE(EXCLUDED.user_id, push_subscriptions.user_id),
      updated_at=NOW()
  `,!0)},removeSubscription:g,sendToUser:async function(e,t){if(!e)return{sent:0,failed:0};let a=(await s`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=${e}`).rows;return a.length?await E(a,t):{sent:0,failed:0}},sendToUsers:async function(t,a){if(!Array.isArray(t)||0===t.length)return{sent:0,failed:0};let{rawQuery:r}=e.r(35716),s=(await r("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::int[])",[t])).rows||[];return s.length?await E(s,a):{sent:0,failed:0}},sendToAll:async function(e){let t=(await s`SELECT endpoint, p256dh, auth FROM push_subscriptions`).rows;return t.length?await E(t,e):{sent:0,failed:0}},REMINDER_IMAGES:d}},96682,(e,t,a)=>{let r=e.r(54799);function s(){return r.randomBytes(16).toString("hex")}function i(e,t){let a=String(e||""),s=String(t||"");if(!a||!s||a.length!==s.length)return!1;try{return r.timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(s,"hex"))}catch{return!1}}function n(e,t){return new Promise((a,s)=>{r.scrypt(String(e||""),String(t||""),64,(e,t)=>{if(e)return s(e);a(t.toString("hex"))})})}t.exports={hashPassword:async function(e,t=s()){let a=String(t||s()),r=await n(e,a);return{salt:a,hash:r}},verifyPassword:async function(e,t,a){let s=String(t||""),u=String(a||"");return s&&u?i(await n(e,s),u)?{ok:!0,legacy:!1}:i(await new Promise((t,a)=>{r.pbkdf2(String(e||""),String(s||""),1e3,64,"sha512",(e,r)=>{if(e)return a(e);t(r.toString("hex"))})}),u)?{ok:!0,legacy:!0}:{ok:!1,legacy:!1}:{ok:!1,legacy:!1}}}},24573,(e,t,a)=>{let{query:r,rawQuery:s}=e.r(35716),{json:i}=e.r(86651);t.exports=async(e,t)=>{try{if(e.query=e.query||{},"GET"!==e.method)return i(t,405,{status:"error",message:"Method not allowed"});let a=e.query.category?String(e.query.category).trim():"",r=e.query.search?String(e.query.search).trim():"",n=e.query.page?Number(e.query.page):1,u=e.query.size?Number(e.query.size):20,o=Math.max(1,Math.min(100,u)),d=Math.max(0,(n-1)*o),l=["active = true"],m=[],c=1;a&&"all"!==a&&(l.push(`LOWER(category) = $${c++}`),m.push(a.toLowerCase())),r&&(l.push(`(LOWER(title) LIKE $${c} OR LOWER(description) LIKE $${c})`),m.push(`%${r.toLowerCase()}%`),c++);let g="WHERE "+l.join(" AND "),p=await s(`SELECT COUNT(*)::int as total FROM materials ${g}`,m),E=p.rows[0]?.total||0,h=await s(`SELECT * FROM materials ${g} ORDER BY updated_at DESC LIMIT ${o} OFFSET ${d}`,m);return i(t,200,{status:"success",materials:h.rows,total:E,page:n})}catch(e){return i(t,500,{status:"error",message:e.message})}}},34205,(e,t,a)=>{let r=(()=>{let e=Error("Cannot find module '../controllers/ArticleController'");throw e.code="MODULE_NOT_FOUND",e})(),{json:s}=e.r(86651);t.exports=async(e,t)=>{if(t.setHeader("Access-Control-Allow-Origin","*"),t.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS"),t.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization"),"OPTIONS"===e.method)return t.status(200).end();try{switch(e.method){case"GET":if(e.query.id||e.query.slug)return await r.show(e,t);return await r.index(e,t);case"POST":return await r.store(e,t);case"PUT":return await r.update(e,t);case"DELETE":return await r.destroy(e,t);default:return s(t,405,{status:"error",message:"Method Not Allowed"})}}catch(e){return console.error("API Error:",e),s(t,500,{status:"error",message:"Internal Server Error"})}}},41680,(e,t,a)=>{let{query:r}=e.r(35716),{json:s,cacheHeaders:i,parseJsonBody:n}=e.r(86651),{requireAdminAuth:u}=e.r(23908);function o(e,t=500){return String(e||"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,t)}async function d(e,t){let a=n(e)||{},i=o(a.source_page||"struktur-organisasi",80)||"struktur-organisasi",u=o(a.subject||"",140),d=o(a.sender_name||a.name||"",80),l=o(a.sender_contact||a.contact||"",120),m=function(e,t=2e3){return String(e||"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g," ").trim().slice(0,t)}(a.message||"",2e3),c=function(e){let t=String(e?.headers?.["x-forwarded-for"]||"").trim();if(t)return t.split(",")[0].trim().slice(0,120);let a=String(e?.headers?.["x-real-ip"]||"").trim();return a?a.slice(0,120):""}(e),g=function(e){if(!e||"object"!=typeof e)return{};let t={};return e.bidang&&(t.bidang=o(e.bidang,120)),e.page_url&&(t.page_url=o(e.page_url,500)),e.user_agent&&(t.user_agent=o(e.user_agent,300)),t}(a.context);if(m.length<10)return s(t,400,{status:"error",message:"Pesan minimal 10 karakter."});if(c){let e=(await r`
      SELECT COUNT(*)::int AS c
      FROM feedback_messages
      WHERE source_ip=${c}
      AND created_at > NOW() - INTERVAL '30 seconds'
    `).rows[0];if(Number(e?.c||0)>=3)return s(t,429,{status:"error",message:"Terlalu banyak kiriman. Coba lagi sebentar."})}return await r`
    INSERT INTO feedback_messages (
      source_page, subject, sender_name, sender_contact, message, context_json, source_ip, status
    ) VALUES (
      ${i},
      ${u||null},
      ${d||null},
      ${l||null},
      ${m},
      ${g||{}},
      ${c||null},
      'open'
    )
  `,s(t,201,{status:"success",message:"Kritik & saran berhasil dikirim."})}async function l(t,a){let r;try{await u(t)}catch(e){return s(a,401,{status:"error",message:e.message||"Unauthorized"})}let n=Math.max(1,Number(t.query?.page||1)||1),o=Math.min(100,Math.max(1,Number(t.query?.size||20)||20)),d=(n-1)*o,l="open"===(r=String(t.query?.status||"all").trim().toLowerCase())||"resolved"===r?r:"all",m="all"===l?"":`WHERE status='${l}'`,{rawQuery:c}=e.r(35716),g=await c(`SELECT id, source_page, subject, sender_name, sender_contact, message, context_json, source_ip, status, created_at, resolved_at, resolved_by
     FROM feedback_messages
     ${m}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,[o,d]),p=await c(`SELECT COUNT(*)::int AS c FROM feedback_messages ${m}`,[]);return s(a,200,{status:"success",items:g.rows||[],total:Number(p.rows?.[0]?.c||0),page:n,size:o},i(0))}async function m(e,t){let a=null;try{a=await u(e)}catch(e){return s(t,401,{status:"error",message:e.message||"Unauthorized"})}let i=n(e)||{},o=Number(i.id||0);if(!o)return s(t,400,{status:"error",message:"ID tidak valid."});let d=!1!==i.resolved;return d?await r`
      UPDATE feedback_messages
      SET status='resolved', resolved_at=NOW(), resolved_by=${a.id}
      WHERE id=${o}
    `:await r`
      UPDATE feedback_messages
      SET status='open', resolved_at=NULL, resolved_by=NULL
      WHERE id=${o}
    `,await r`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${a.id}, 'UPDATE_FEEDBACK_STATUS', ${{feedback_id:o,resolved:d}})
  `,s(t,200,{status:"success"})}async function c(e,t){let a=null;try{a=await u(e)}catch(e){return s(t,401,{status:"error",message:e.message||"Unauthorized"})}let i=Number((n(e)||{}).id||e.query?.id||0);return i?(await r`DELETE FROM feedback_messages WHERE id=${i}`,await r`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${a.id}, 'DELETE_FEEDBACK', ${{feedback_id:i}})
  `,s(t,200,{status:"success"})):s(t,400,{status:"error",message:"ID tidak valid."})}t.exports=async(e,t)=>{try{let a=String(e.query?.action||"").trim();if("POST"===e.method&&!a)return await d(e,t);if("GET"===e.method&&"list"===a)return await l(e,t);if("POST"===e.method&&"resolve"===a)return await m(e,t);if("DELETE"===e.method&&"delete"===a)return await c(e,t);return s(t,405,{status:"error",message:"Method not allowed"})}catch(e){return s(t,500,{status:"error",message:String(e.message||e)})}}},856,(e,t,a)=>{let{query:r}=e.r(35716),{sendToAll:s}=e.r(42551),i="/ipm%20(2).png";function n(e){let t=String(e?.slug||"").trim();return t?`/articles/${encodeURIComponent(t)}`:`/articles?id=${encodeURIComponent(e?.id||"")}`}function u(e,t){let a,r,s=(a=String(t?.headers?.["x-forwarded-proto"]||"https").split(",")[0].trim(),(r=String(t?.headers?.["x-forwarded-host"]||t?.headers?.host||"").split(",")[0].trim())?`${a}://${r}`:""),n=String(e?.slug||"").trim();return n&&s?`${s}/api/article-share-image/${encodeURIComponent(n)}.jpg`:n?`/api/article-share-image/${encodeURIComponent(n)}.jpg`:s?`${s}${i}`:i}async function o(e){return e?(await r`
    INSERT INTO notifications (user_id, message)
    SELECT id, ${e}
    FROM users
    WHERE role='user' OR role IS NULL
  `,1):0}async function d(e){return!!e&&!!(await r`SELECT id FROM article_notification_logs WHERE article_id=${Number(e)} LIMIT 1`).rows[0]}async function l(e,t){await r`
    INSERT INTO article_notification_logs (article_id, title_snapshot, push_sent, push_failed, notified_at, created_at)
    VALUES (
      ${Number(e.id)},
      ${String(e.title||"").trim()},
      ${Number(t?.sent||0)},
      ${Number(t?.failed||0)},
      NOW(),
      NOW()
    )
    ON CONFLICT (article_id)
    DO NOTHING
  `}async function m(e,t){var a;let i,m;if(!e?.id)return{status:"skipped",reason:"missing-article"};let c=new Date(e.publish_date||e.created_at||Date.now());if(Number.isNaN(c.getTime()))return{status:"skipped",reason:"invalid-publish-date"};if(c.getTime()>Date.now())return{status:"skipped",reason:"future-publish-date"};if(await d(e.id))return{status:"skipped",reason:"already-notified"};let g=`Artikel baru: ${String(e.title||"Artikel terbaru").trim()}`,p=(a=e,i=String(a?.category||"").trim(),(m=String(a?.summary||a?.excerpt||a?.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,140))||(i?`Bacaan terbaru kategori ${i} sudah tersedia.`:"Baca artikel terbaru dari PC IPM Panawuan sekarang.")),E=n(e),h=u(e,t),_=`${g} - ${p}`;await o(_);let w=await s({title:g,body:p,url:E,image:h,tag:`article-${Number(e.id)}`,renotify:!1,context:"Artikel terbit resmi di kanal informasi PC IPM Panawuan",trustLabel:"Konten resmi organisasi"});await l(e,w);try{await r`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (${null}, 'AUTO_ARTICLE_NOTIFICATION', ${{article_id:e.id,title:e.title,push_sent:Number(w?.sent||0),push_failed:Number(w?.failed||0)}})
    `}catch{}return{status:"sent",article_id:Number(e.id),push_sent:Number(w?.sent||0),push_failed:Number(w?.failed||0),url:E,image:h}}async function c(e){let t=(await r`
    SELECT a.*
    FROM articles a
    LEFT JOIN article_notification_logs anl ON anl.article_id = a.id
    WHERE anl.id IS NULL
      AND COALESCE(a.publish_date, a.created_at, NOW()) <= NOW()
    ORDER BY COALESCE(a.publish_date, a.created_at, NOW()) DESC
    LIMIT 10
  `).rows,a=0,s=0;for(let r of t)try{let t=await m(r,e);"sent"===t.status&&(a+=Number(t.push_sent||0),s+=Number(t.push_failed||0))}catch{s+=1}return{pending:t.length,sent:a,failed:s}}t.exports={buildArticleUrl:n,buildArticleImageUrl:u,notifyPublishedArticle:m,processPendingArticleNotifications:c}},41743,(e,t,a)=>{let{query:r,rawQuery:s}=e.r(35716),{json:i,cacheHeaders:n}=e.r(86651),{getSessionUser:u}=e.r(23908);async function o(e,t){let a=e.query.mode?String(e.query.mode).trim():"",o=await u(e),d={enabled:!0,timer_seconds:20,xp_base:10,streak_bonus:2,streak_cap:5,quest_daily_target:3,quest_highscore_target:2,highscore_percent:80};if("summary"===a){let e=(await r`
      SELECT quiz_set, COUNT(*)::int as count 
      FROM questions 
      WHERE active = true 
      GROUP BY quiz_set 
      ORDER BY quiz_set ASC
    `).rows,a=[];o&&(a=(await r`SELECT quiz_set FROM results WHERE user_id=${o.id}`).rows.map(e=>e.quiz_set));let s=[];try{s=(await r`
          SELECT 
            u.username, 
            best_attempts.score, 
            best_attempts.total, 
            best_attempts.percent, 
            best_attempts.quiz_set, 
            best_attempts.created_at, 
            best_attempts.time_spent
          FROM (
            SELECT DISTINCT ON (user_id) user_id, score, total, percent, quiz_set, created_at, time_spent
            FROM results
            ORDER BY user_id, percent DESC, score DESC, time_spent ASC, created_at ASC
          ) as best_attempts
          JOIN users u ON best_attempts.user_id = u.id
          ORDER BY best_attempts.percent DESC, best_attempts.score DESC, best_attempts.time_spent ASC
          LIMIT 1
        `).rows}catch(e){console.error("Failed to fetch top scores:",e)}let u=null;try{u=(await r`
          SELECT
            title,
            description,
            start_time,
            end_time,
            show_in_quiz,
            CASE WHEN start_time > (NOW() AT TIME ZONE 'Asia/Bangkok') THEN 'upcoming' ELSE 'active' END AS schedule_state,
            CASE
              WHEN start_time > (NOW() AT TIME ZONE 'Asia/Bangkok') THEN start_time
              ELSE COALESCE(end_time, start_time)
            END AS countdown_target,
            (
              EXTRACT(
                EPOCH FROM (
                  CASE
                    WHEN start_time > (NOW() AT TIME ZONE 'Asia/Bangkok') THEN start_time
                    ELSE COALESCE(end_time, start_time)
                  END
                ) AT TIME ZONE 'Asia/Bangkok'
              ) * 1000
            )::bigint AS countdown_target_ms
          FROM quiz_schedules
          WHERE
            active = true
            AND (show_in_quiz = true OR show_in_quiz IS NULL)
            AND (
              start_time > (NOW() AT TIME ZONE 'Asia/Bangkok')
              OR (
                start_time <= (NOW() AT TIME ZONE 'Asia/Bangkok')
                AND (end_time IS NULL OR end_time > (NOW() AT TIME ZONE 'Asia/Bangkok'))
              )
            )
          ORDER BY
            CASE WHEN start_time > (NOW() AT TIME ZONE 'Asia/Bangkok') THEN 0 ELSE 1 END,
            CASE WHEN start_time > (NOW() AT TIME ZONE 'Asia/Bangkok') THEN start_time END ASC,
            CASE WHEN start_time <= (NOW() AT TIME ZONE 'Asia/Bangkok') THEN start_time END DESC
          LIMIT 1
        `).rows[0]}catch(e){console.error("Failed to fetch schedule:",e)}let d=null;return u&&(d={title:u.title,topic:u.description||"Event Mendatang",countdown_target:u.countdown_target||u.start_time,countdown_target_ms:u.countdown_target_ms?Number(u.countdown_target_ms):null,state:u.schedule_state||"upcoming"}),i(t,200,{status:"success",sets:e.map(e=>({...e,attempted:a.includes(e.quiz_set)})),top_scores:s,next_quiz:d},n(0))}if("gamification"===a){let e=d;try{let t=(await r`SELECT value FROM system_settings WHERE key='gamification_settings'`).rows[0];if(t&&t.value){let a=JSON.parse(t.value);e={...d,...a||{}}}}catch{}return i(t,200,{status:"success",settings:e},n(60))}if("categories"===a)return i(t,200,{status:"success",categories:(await r`
      SELECT DISTINCT category 
      FROM questions 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `).rows.map(e=>e.category)},n(300));if("schedules"===a)return i(t,200,{status:"success",schedules:(await r`
      SELECT title, description, start_time, end_time, show_in_quiz, show_in_notif 
      FROM quiz_schedules 
      WHERE (end_time IS NULL OR end_time > (NOW() AT TIME ZONE 'Asia/Bangkok')) 
      ORDER BY start_time ASC
    `).rows},n(60));let l=e.query.set?Number(e.query.set):null,m=e.query.category?String(e.query.category).trim():"",c=e.query.search?String(e.query.search).trim():"",g=e.query.page?Number(e.query.page):1,p=Math.max(1,Math.min(500,e.query.size?Number(e.query.size):50)),E=Math.max(0,(g-1)*p),h=["active = true"],_=[],w=1;l&&(h.push(`quiz_set = $${w++}`),_.push(l)),m&&"all"!==m&&(h.push(`LOWER(category) = $${w++}`),_.push(m.toLowerCase())),c&&(h.push(`(LOWER(question) LIKE $${w} OR LOWER(options::text) LIKE $${w})`),_.push(`%${c.toLowerCase()}%`),w++);let f="WHERE "+h.join(" AND "),S=await s(`SELECT COUNT(*)::int as total FROM questions ${f}`,_),y=S.rows[0]?.total||0;return i(t,200,{status:"success",questions:(await s(`SELECT id, question, options, category, quiz_set FROM questions ${f} ORDER BY id DESC LIMIT ${p} OFFSET ${E}`,_)).rows,total:y,page:g,size:p},n(0))}t.exports=async(e,t)=>{try{if(e.query=e.query||{},"GET"===e.method)return await o(e,t);return i(t,405,{status:"error",message:"Method not allowed"})}catch(e){return i(t,500,{status:"error",message:"Internal Server Error"})}}},39303,(e,t,a)=>{let{query:r,rawQuery:s}=e.r(35716),{getSessionUser:i}=e.r(23908),{json:n,parseJsonBody:u,applySecurityHeaders:o}=e.r(86651);function d(e,t=500){return String(e||"").replace(/[\u0000-\u001F\u007F]/g," ").replace(/[<>]/g," ").trim().slice(0,t)}async function l(e,t){let a=new URL(e.url,`http://${e.headers.host||"localhost"}`),r=Math.min(Number(a.searchParams.get("limit"))||20,50),i=Math.max(Number(a.searchParams.get("offset"))||0,0),u=d(a.searchParams.get("q")||"",100),o=`
    SELECT 
      d.id, d.title, d.content, d.category, d.views, d.created_at, d.updated_at,
      u.username, u.nama_panjang, u.role as user_role,
      (SELECT COUNT(*)::int FROM discussion_replies r WHERE r.discussion_id = d.id) as reply_count
    FROM discussions d
    JOIN users u ON d.user_id = u.id
  `,l=[];u&&(o+=" WHERE d.title ILIKE $1 OR d.content ILIKE $1",l.push(`%${u}%`)),o+=` ORDER BY d.updated_at DESC, d.created_at DESC LIMIT $${l.length+1} OFFSET $${l.length+2}`,l.push(r,i);let m=await s(o,l),c="SELECT COUNT(*)::int AS total FROM discussions",g=[];u&&(c+=" WHERE title ILIKE $1 OR content ILIKE $1",g.push(`%${u}%`));let p=await s(c,g),E=p.rows[0]?.total||0;return n(t,200,{status:"success",discussions:m.rows,total:E,limit:r,offset:i})}async function m(e,t){let a=Number(new URL(e.url,`http://${e.headers.host||"localhost"}`).searchParams.get("id"));if(!a)return n(t,400,{status:"error",message:"ID diskusi tidak valid"});await r`UPDATE discussions SET views = views + 1 WHERE id = ${a}`;let s=await r`
    SELECT d.id, d.title, d.content, d.category, d.views, d.created_at, d.updated_at,
           d.user_id,
           u.username, u.nama_panjang, u.role as user_role
    FROM discussions d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = ${a}
  `;if(0===s.rows.length)return n(t,404,{status:"error",message:"Diskusi tidak ditemukan"});let i=await r`
    SELECT r.id, r.content, r.created_at,
           u.username, u.nama_panjang, u.role as user_role
    FROM discussion_replies r
    JOIN users u ON r.user_id = u.id
    WHERE r.discussion_id = ${a}
    ORDER BY r.created_at ASC
  `;return n(t,200,{status:"success",discussion:s.rows[0],replies:i.rows})}async function c(e,t){let a=await i(e);if(!a)return n(t,401,{status:"error",message:"Silakan login untuk membuat diskusi."});let s=u(e),o=d(s.title,150),l=d(s.content,5e3),m=d(s.category||"Umum",50);return!o||o.length<3?n(t,400,{status:"error",message:"Judul diskusi minimal 3 karakter."}):!l||l.length<5?n(t,400,{status:"error",message:"Isi diskusi minimal 5 karakter."}):n(t,201,{status:"success",message:"Diskusi berhasil diposting",discussion_id:(await r`
    INSERT INTO discussions (user_id, title, content, category)
    VALUES (${a.id}, ${o}, ${l}, ${m})
    RETURNING id, created_at
  `).rows[0].id})}async function g(e,t){let a=await i(e);if(!a)return n(t,401,{status:"error",message:"Silakan login untuk membalas."});let s=u(e),o=Number(s.discussion_id),l=d(s.content,3e3);if(!o)return n(t,400,{status:"error",message:"ID diskusi tidak valid."});if(!l||l.length<2)return n(t,400,{status:"error",message:"Balasan minimal 2 karakter."});if(!(await r`SELECT id FROM discussions WHERE id = ${o}`).rows[0])return n(t,404,{status:"error",message:"Diskusi tidak ditemukan."});let m=await r`
    INSERT INTO discussion_replies (discussion_id, user_id, content)
    VALUES (${o}, ${a.id}, ${l})
    RETURNING id, created_at
  `;return await r`UPDATE discussions SET updated_at = NOW() WHERE id = ${o}`,n(t,201,{status:"success",message:"Balasan terkirim",reply_id:m.rows[0].id})}async function p(e,t){let a=await i(e);if(!a)return n(t,401,{status:"error",message:"Unauthorized"});let s=new URL(e.url,`http://${e.headers.host||"localhost"}`),u=s.searchParams.get("action"),o=Number(s.searchParams.get("id"));if("reply"===u){let e=Number(s.searchParams.get("reply_id"));if(!e)return n(t,400,{status:"error",message:"reply_id wajib diisi"});let i=(await r`SELECT user_id FROM discussion_replies WHERE id = ${e}`).rows[0];return i?"admin"!==a.role&&Number(i.user_id)!==Number(a.id)?n(t,403,{status:"error",message:"Kamu hanya bisa menghapus balasan sendiri."}):(await r`DELETE FROM discussion_replies WHERE id = ${e}`,n(t,200,{status:"success",message:"Balasan dihapus"})):n(t,404,{status:"error",message:"Balasan tidak ditemukan"})}if(o){let e=(await r`SELECT user_id FROM discussions WHERE id = ${o}`).rows[0];return e?"admin"!==a.role&&Number(e.user_id)!==Number(a.id)?n(t,403,{status:"error",message:"Kamu hanya bisa menghapus diskusi sendiri."}):(await r`DELETE FROM discussions WHERE id = ${o}`,n(t,200,{status:"success",message:"Diskusi dihapus"})):n(t,404,{status:"error",message:"Diskusi tidak ditemukan"})}return n(t,400,{status:"error",message:"Parameter tidak lengkap."})}t.exports=async(e,t)=>{try{o(t),e.query=e.query||{};let a=new URL(e.url,`http://${e.headers.host||"localhost"}`),r=a.searchParams.get("action"),s=a.searchParams.get("id");if("GET"===e.method){if(s)return await m(e,t);return await l(e,t)}if("POST"===e.method){if("reply"===r)return await g(e,t);return await c(e,t)}if("DELETE"===e.method)return await p(e,t);return n(t,405,{status:"error",message:"Method not allowed"})}catch(e){return console.error("Discussions API Error:",e),n(t,500,{status:"error",message:"Internal server error: "+(e.message||e)})}}},46061,(e,t,a)=>{let{query:r}=e.r(35716),{sendToAll:s}=e.r(42551),{REMINDER_IMAGES:i}=e.r(42551);function n(e,t=180){return String(e||"").replace(/\s+/g," ").trim().slice(0,t)}async function u(){return!!(await r`
    SELECT id
    FROM daily_digest_logs
    WHERE digest_type='public_daily'
      AND digest_date=CURRENT_DATE
    LIMIT 1
  `).rows[0]}async function o(){let[e,t,a,s,i,n]=await Promise.all([r`
      SELECT id, title, description, start_time, end_time
      FROM quiz_schedules
      WHERE active=true
        AND show_in_notif=true
        AND start_time <= NOW()
        AND (end_time IS NULL OR end_time >= NOW())
      ORDER BY start_time ASC
      LIMIT 1
    `,r`
      SELECT id, title, slug, type, description, updated_at, start_at, end_at
      FROM form_templates
      WHERE status='published'
        AND (start_at IS NULL OR start_at <= NOW())
        AND (end_at IS NULL OR end_at >= NOW())
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,r`
      SELECT COUNT(*)::int AS count
      FROM attendance_events
      WHERE status='active'
        AND event_date=CURRENT_DATE
    `,r`
      SELECT id, title, slug, category, image, publish_date, created_at, content
      FROM articles
      WHERE COALESCE(publish_date, created_at, NOW()) <= NOW()
      ORDER BY COALESCE(publish_date, created_at, NOW()) DESC
      LIMIT 1
    `,r`
      SELECT id, title, description, file_type, category, updated_at
      FROM materials
      WHERE active=true
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,r`
      SELECT id, title, content, category, updated_at, created_at
      FROM discussions
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `]);return{quiz:e.rows[0]||null,form:t.rows[0]||null,attendanceCount:Number(a.rows[0]?.count||0),article:s.rows[0]||null,material:i.rows[0]||null,discussion:n.rows[0]||null}}function d(e){let t=[];if(e.quiz&&t.push("quiz aktif"),e.form&&t.push("form siap diisi"),e.attendanceCount>0&&t.push(`${e.attendanceCount} absensi aktif`),e.article&&t.push("artikel terbaru"),e.material&&t.push("ebook perpustakaan"),e.discussion&&t.push("diskusi terbaru"),e.quiz)return{title:"Reminder IPM malam ini",body:`Quiz sedang aktif. Buka aplikasi malam ini dan cek ${t.slice(0,3).join(", ")} yang tersedia.`.replace(/\s+/g," ").trim(),url:"/quiz-gamified.html?source=daily-digest",summary:"quiz",image:i.quiz,context:"Ringkasan aktivitas malam ini dari fitur quiz IPM"};if(e.form){let t="posttest"===e.form.type?"posttest":"pretest";return{title:"Reminder IPM malam ini",body:`${t.toUpperCase()} "${n(e.form.title,64)}" sudah tersedia. Buka aplikasi malam ini untuk mengisinya.`.replace(/\s+/g," ").trim(),url:`/forms.html?source=daily-digest&slug=${encodeURIComponent(n(e.form.slug,180))}`,summary:"form",image:i.form,context:"Pengingat formulir resmi yang siap diisi malam ini"}}if(e.attendanceCount>0)return{title:"Reminder IPM malam ini",body:`${e.attendanceCount} room absensi masih aktif. Cek agenda dan pastikan status kehadiranmu malam ini.`,url:"/absen.html?source=daily-digest",summary:"attendance",image:i.attendance,context:"Informasi kehadiran resmi yang masih aktif di aplikasi IPM"};if(e.article){var a;let t,r,s=(t=[],e.article&&t.push({type:"article",ts:new Date(e.article.publish_date||e.article.created_at||Date.now()).getTime(),data:e.article}),e.material&&t.push({type:"material",ts:new Date(e.material.updated_at||Date.now()).getTime(),data:e.material}),e.discussion&&t.push({type:"discussion",ts:new Date(e.discussion.updated_at||e.discussion.created_at||Date.now()).getTime(),data:e.discussion}),t.sort((e,t)=>t.ts-e.ts),t[0]||null);if(s?.type==="material"){let e=n(s.data.file_type,20).toLowerCase();return{title:"Reminder IPM malam ini",body:`${"ebook"===e?"E-book terbaru":"Materi perpustakaan terbaru"} "${n(s.data.title,72)}" siap dibuka. Luangkan waktu malam ini untuk membaca.`,url:"/materi.html?source=daily-digest",summary:"materials",image:i.materials,context:"Koleksi perpustakaan digital yang direkomendasikan malam ini"}}if(s?.type==="discussion"){let e=n(s.data.category,32);return{title:"Reminder IPM malam ini",body:`${e?`${e} \xb7 `:""}"${n(s.data.title,72)}" sedang dibahas. Masuk ke diskusi malam ini untuk ikut menanggapi.`,url:"/discussions.html?source=daily-digest",summary:"discussions",image:i.discussions,context:"Topik diskusi resmi yang sedang ramai dibahas malam ini"}}let u=n(e.article.category,40),o=n(String(e.article.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),84);return{title:"Reminder IPM malam ini",body:`${u?`${u} \xb7 `:""}${o||`Baca "${n(e.article.title,72)}" di aplikasi IPM malam ini.`}`,url:`${a=e.article,(r=n(a?.slug,180))?`/articles/${encodeURIComponent(r)}`:"/articles"}?source=daily-digest`,summary:"article",image:function(e){let t=String(e?.image||"").trim();if(/^data:image\//i.test(t)||/^(https?:)?\/\//i.test(t)||t.startsWith("/"))return t;let a=n(e?.slug,180);return a?`/api/article-share-image/${encodeURIComponent(a)}.jpg`:i.general}(e.article),context:"Artikel pilihan resmi yang direkomendasikan malam ini"}}return e.material?{title:"Reminder IPM malam ini",body:`"${n(e.material.title,72)}" tersedia untuk dibaca. Buka perpustakaan malam ini dan lanjutkan bacaanmu.`,url:"/materi.html?source=daily-digest",summary:"materials",image:i.materials,context:"Koleksi perpustakaan digital yang siap dibuka malam ini"}:e.discussion?{title:"Reminder IPM malam ini",body:`"${n(e.discussion.title,72)}" bisa kamu baca malam ini. Masuk ke diskusi untuk mengikuti percakapan terbaru.`,url:"/discussions.html?source=daily-digest",summary:"discussions",image:i.discussions,context:"Percakapan komunitas IPM yang patut kamu ikuti malam ini"}:{title:"Reminder IPM malam ini",body:"Buka aplikasi IPM malam ini untuk cek artikel, quiz, form, dan info organisasi terbaru.",url:"/?source=daily-digest",summary:"general",image:i.general,context:"Ringkasan aktivitas resmi dari aplikasi PC IPM Panawuan"}}async function l(e){await r`
    INSERT INTO notifications (user_id, message)
    SELECT id, ${e}
    FROM users
    WHERE role='user' OR role IS NULL
  `}async function m(e,t){await r`
    INSERT INTO daily_digest_logs (digest_type, digest_date, title_snapshot, body_snapshot, target_url, push_sent, push_failed, created_at)
    VALUES (
      'public_daily',
      CURRENT_DATE,
      ${e.title},
      ${e.body},
      ${e.url},
      ${Number(t?.sent||0)},
      ${Number(t?.failed||0)},
      NOW()
    )
    ON CONFLICT (digest_type, digest_date) DO NOTHING
  `}t.exports={processDailyDigestNotifications:async function(){if(await u())return{sent:0,failed:0,skipped:!0,reason:"already-sent"};let e=d(await o()),t=`${e.title} - ${e.body}`;await l(t);let a=await s({title:e.title,body:e.body,url:e.url,image:e.image,tag:`daily-digest-${new Date().toISOString().slice(0,10)}`,renotify:!1,context:e.context||"Reminder harian resmi dari aplikasi PC IPM Panawuan",trustLabel:"Disusun otomatis oleh sistem"});await m(e,a);try{await r`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (${null}, 'AUTO_DAILY_DIGEST', ${{summary:e.summary,title:e.title,url:e.url,push_sent:Number(a?.sent||0),push_failed:Number(a?.failed||0)}})
    `}catch{}return{sent:Number(a?.sent||0),failed:Number(a?.failed||0),skipped:!1,summary:e.summary,title:e.title,url:e.url}},buildDailyReminderPayload:d}},6541,(e,t,a)=>{let{query:r,rawQuery:s}=e.r(35716),{json:i,cacheHeaders:n,parseJsonBody:u}=e.r(86651),{requireAdminAuth:o}=e.r(23908),d=/^\d{4}-\d{2}$/;function l(e){return d.test(String(e||"").trim())}async function m(e){await r`INSERT INTO system_settings (key, value, updated_at)
        VALUES ('ranking_reset_ym', ${e}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`}async function c(e){l(e)&&await r`
        WITH ranked AS (
            SELECT
                r.user_id,
                COALESCE(NULLIF(TRIM(r.username), ''), 'Anonim') AS username_snapshot,
                COALESCE(NULLIF(TRIM(u.pimpinan), ''), '-') AS pimpinan_snapshot,
                COALESCE(r.score, 0) AS score,
                COALESCE(r.total, 0) AS total,
                COALESCE(r.percent, 0) AS percent,
                COALESCE(r.time_spent, 0) AS time_spent,
                r.quiz_set,
                r.created_at AS result_created_at,
                ROW_NUMBER() OVER (
                    ORDER BY COALESCE(r.score, 0) DESC, COALESCE(r.time_spent, 0) ASC, r.created_at ASC, r.id ASC
                ) AS rank_position
            FROM results r
            LEFT JOIN users u ON u.id = r.user_id
            WHERE COALESCE(NULLIF(TRIM(r.username), ''), '') <> ''
        )
        INSERT INTO ranking_monthly_archive (
            ym, rank_position, user_id, username_snapshot, pimpinan_snapshot,
            score, total, percent, time_spent, quiz_set, result_created_at, archived_at
        )
        SELECT
            ${e},
            ranked.rank_position,
            ranked.user_id,
            ranked.username_snapshot,
            ranked.pimpinan_snapshot,
            ranked.score,
            ranked.total,
            ranked.percent,
            ranked.time_spent,
            ranked.quiz_set,
            ranked.result_created_at,
            NOW()
        FROM ranked
        WHERE ranked.rank_position <= 3
        ON CONFLICT (ym, rank_position) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            username_snapshot = EXCLUDED.username_snapshot,
            pimpinan_snapshot = EXCLUDED.pimpinan_snapshot,
            score = EXCLUDED.score,
            total = EXCLUDED.total,
            percent = EXCLUDED.percent,
            time_spent = EXCLUDED.time_spent,
            quiz_set = EXCLUDED.quiz_set,
            result_created_at = EXCLUDED.result_created_at,
            archived_at = NOW()
    `}async function g(){let e,t,a,s=(t=(e=new Date).getUTCFullYear(),a=String(e.getUTCMonth()+1).padStart(2,"0"),`${t}-${a}`),i=(await r`SELECT value FROM system_settings WHERE key='ranking_reset_ym'`).rows[0],n=String(i?.value||"").trim();n?n!==s&&(await c(n),await r`DELETE FROM results`,await m(s)):await m(s)}async function p(e,t){let a=e.query.page?Number(e.query.page):1,r=Math.max(1,Math.min(500,e.query.size?Number(e.query.size):200)),u=Math.max(0,(Math.max(1,a)-1)*r),o=`
        SELECT r.id, r.created_at AS ts, r.username, u.pimpinan, r.score, r.total, r.percent, r.time_spent
        FROM results r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.username IS NOT NULL AND r.username != ''
        ORDER BY r.score DESC, r.time_spent ASC, r.created_at ASC
        LIMIT $1 OFFSET $2
    `;return i(t,200,{status:"success",results:(await s(o,[r,u])).rows,page:Math.max(1,a),size:r},n(0))}async function E(e,t){return i(t,200,{status:"success",months:(await r`
        SELECT
            a.ym,
            MAX(a.archived_at) AS archived_at,
            MAX(CASE WHEN a.rank_position = 1 THEN a.username_snapshot END) AS champion_name,
            MAX(CASE WHEN a.rank_position = 1 THEN a.score END)::INT AS champion_score,
            MAX(CASE WHEN a.rank_position = 1 THEN a.time_spent END)::BIGINT AS champion_time
        FROM ranking_monthly_archive a
        GROUP BY a.ym
        ORDER BY a.ym DESC
    `).rows,hall_of_fame:(await r`
        SELECT
            a.username_snapshot AS username,
            COUNT(*)::INT AS title_count,
            MIN(a.ym) AS first_win_ym,
            MAX(a.ym) AS last_win_ym
        FROM ranking_monthly_archive a
        WHERE a.rank_position = 1
        GROUP BY a.username_snapshot
        ORDER BY title_count DESC, last_win_ym DESC, username ASC
        LIMIT 8
    `).rows},n(0))}async function h(e,t){let a=String(e.query.ym||"").trim();if(a&&!l(a))return i(t,400,{status:"error",message:"Format ym tidak valid. Gunakan YYYY-MM."});if(!a){let e=(await r`SELECT ym FROM ranking_monthly_archive ORDER BY ym DESC LIMIT 1`).rows[0];if(!(a=String(e?.ym||"").trim()))return i(t,200,{status:"success",ym:"",archives:[]},n(0))}let s=(await r`
        SELECT
            ym,
            rank_position,
            user_id,
            username_snapshot,
            pimpinan_snapshot,
            score,
            total,
            percent,
            time_spent,
            quiz_set,
            result_created_at,
            archived_at
        FROM ranking_monthly_archive
        WHERE ym = ${a}
        ORDER BY rank_position ASC
    `).rows;return i(t,200,{status:"success",ym:a,archives:s},n(0))}async function _(e,t){return i(t,200,{status:"success",champions:(await r`
        SELECT
            a.username_snapshot AS username,
            COUNT(*)::INT AS title_count,
            MIN(a.ym) AS first_win_ym,
            MAX(a.ym) AS last_win_ym
        FROM ranking_monthly_archive a
        WHERE a.rank_position = 1
        GROUP BY a.username_snapshot
        ORDER BY title_count DESC, last_win_ym DESC, username ASC
        LIMIT 20
    `).rows},n(0))}async function w(e,t){try{await g()}catch(e){console.error("Monthly reset failed:",e)}try{let a=String(e.query.mode||"").trim().toLowerCase();if("archive"===a||"monthly_archive"===a)return await h(e,t);if("archivemonths"===a||"archive_months"===a)return await E(e,t);if("halloffame"===a||"hall_of_fame"===a)return await _(e,t);return await p(e,t)}catch(e){return i(t,500,{status:"error",message:e.message})}}async function f(e,t){try{await g()}catch(e){console.error("Monthly reset failed:",e)}let a=u(e),s=String(a.session||"").trim(),n=Number(a.quiz_set||1),o=Number(a.time_spent||0),d=a.answers||{};if(!s)return i(t,401,{status:"error",message:"Unauthorized"});let l=(await r`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${s} AND s.expires_at > NOW()`).rows[0];if(!l)return i(t,401,{status:"error",message:"Unauthorized"});let m=(await r`SELECT id, correct_answer FROM questions WHERE quiz_set=${n} AND active=true`).rows;if(!m.length)return i(t,400,{status:"error",message:"Set soal tidak ditemukan atau tidak aktif."});let c=0,p=m.length;m.forEach(e=>{let t=(d[e.id]||"").toLowerCase().trim(),a=(e.correct_answer||"").toLowerCase().trim();t&&a&&t===a&&c++});let E=Math.round(c/p*100),h=Date.now(),_=(await r`SELECT id FROM results WHERE user_id=${l.id} AND quiz_set=${n} AND score=${c} AND created_at > NOW() - INTERVAL '10 seconds'`).rows[0];if(_)return i(t,200,{status:"success",id:_.id,score:c,total:p,percent:E,idempotent:!0});if((await r`SELECT id FROM results WHERE user_id=${l.id} AND quiz_set=${n} LIMIT 1`).rows[0])return i(t,409,{status:"error",message:"Anda sudah mencoba kuis ini. Hubungi admin untuk reset."});let w=(await r`SELECT finished_at FROM results WHERE user_id=${l.id} ORDER BY id DESC LIMIT 1`).rows[0];if(w&&Number(w.finished_at||0)>0){let e=h-Number(w.finished_at);if(e>=0&&e<1e4)return i(t,429,{status:"error",message:"Terlalu cepat. Harap tunggu sebentar."})}return i(t,201,{status:"success",id:(await r`INSERT INTO results (username, user_id, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${l.username}, ${l.id}, ${c}, ${p}, ${E}, ${o}, ${n}, ${h-1e3*o}, ${h}) RETURNING id`).rows[0].id,score:c,total:p,percent:E})}async function S(e,t){try{await o(e)}catch{return i(t,401,{status:"error",message:"Unauthorized"})}return await r`DELETE FROM results`,i(t,200,{status:"success"})}t.exports=async(e,t)=>{try{if(e.query=e.query||{},"GET"===e.method)return await w(e,t);if("POST"===e.method)return await f(e,t);if("DELETE"===e.method)return await S(e,t);return i(t,405,{status:"error",message:"Method not allowed"})}catch(e){return i(t,500,{status:"error",message:String(e.message||e)})}}},71392,(e,t,a)=>{let{query:r}=e.r(35716),{getSessionUser:s,requireAdminAuth:i}=e.r(23908),{json:n,applySecurityHeaders:u}=e.r(86651),{ensureSchema:o}=e.r(44285),d=new Set(["pending","verified","rejected"]),l=!1;async function m(){l||(await o(),l=!0)}function c(e){return!!e&&(e.startsWith("https://")||e.startsWith("data:"))}async function g(e,t){let a,i=await s(e);if(!i)return n(t,401,{status:"error",message:"Unauthorized"});try{let t=[];for await(let a of e)t.push(a);a=JSON.parse(Buffer.concat(t).toString())}catch{return n(t,400,{status:"error",message:"Invalid JSON body"})}let u=String(a.nama||"").trim(),o=String(a.asal_pimpinan||"").trim(),d=String(a.sertifikat_url||"").trim(),l=String(a.foto_url||"").trim(),m=String(a.motivasi_url||"").trim(),g=String(a.kta_url||"").trim()||null,p=String(a.surat_mandat_url||"").trim();if(!u)return n(t,400,{status:"error",message:"Nama wajib diisi"});if(u.length>200)return n(t,400,{status:"error",message:"Nama terlalu panjang (maks 200 karakter)"});if(!o)return n(t,400,{status:"error",message:"Asal Pimpinan wajib diisi"});if(!d)return n(t,400,{status:"error",message:"Sertifikat wajib diupload"});if(!l)return n(t,400,{status:"error",message:"Foto wajib diupload"});if(!m)return n(t,400,{status:"error",message:"Motivasi (PDF) wajib diupload"});if(!p)return n(t,400,{status:"error",message:"Surat Mandat wajib diupload"});if(!c(d))return n(t,400,{status:"error",message:"URL sertifikat tidak valid"});if(!c(l))return n(t,400,{status:"error",message:"URL foto tidak valid"});if(!c(m))return n(t,400,{status:"error",message:"URL motivasi tidak valid"});if(!c(p))return n(t,400,{status:"error",message:"URL surat mandat tidak valid"});if(g&&!c(g))return n(t,400,{status:"error",message:"URL KTA tidak valid"});let E=(await r`SELECT id, status FROM registrations_pkdtm1 WHERE user_id = ${i.id}`).rows[0];return E?"rejected"===E.status?(await r`UPDATE registrations_pkdtm1 SET
        nama = ${u},
        asal_pimpinan = ${o},
        sertifikat_url = ${d},
        foto_url = ${l},
        motivasi_url = ${m},
        kta_url = ${g},
        surat_mandat_url = ${p},
        status = 'pending',
        admin_note = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = NOW()
      WHERE id = ${E.id}`,n(t,200,{status:"success",message:"Pendaftaran berhasil diperbarui"})):n(t,409,{status:"error",message:"Anda sudah terdaftar pada PKDTM1"}):(await r`INSERT INTO registrations_pkdtm1 (user_id, nama, asal_pimpinan, sertifikat_url, foto_url, motivasi_url, kta_url, surat_mandat_url)
    VALUES (${i.id}, ${u}, ${o}, ${d}, ${l}, ${m}, ${g}, ${p})`,n(t,201,{status:"success",message:"Pendaftaran PKDTM1 berhasil dikirim!"}))}async function p(e,t){let a=await s(e);return a?n(t,200,{status:"success",registration:(await r`SELECT id, nama, asal_pimpinan, sertifikat_url, foto_url, motivasi_url, kta_url, surat_mandat_url, essay_url, essay_submitted_at, status, admin_note, created_at, updated_at
    FROM registrations_pkdtm1 WHERE user_id = ${a.id}`).rows[0]||null}):n(t,401,{status:"error",message:"Unauthorized"})}async function E(e,t){let a,i=await s(e);if(!i)return n(t,401,{status:"error",message:"Unauthorized"});let u=(await r`SELECT id, status, essay_url FROM registrations_pkdtm1 WHERE user_id = ${i.id}`).rows[0];if(!u)return n(t,404,{status:"error",message:"Anda belum terdaftar pada PKDTM1"});if("verified"!==u.status)return n(t,403,{status:"error",message:"Anda harus lolos verifikasi terlebih dahulu untuk submit essay"});try{let t=[];for await(let a of e)t.push(a);a=JSON.parse(Buffer.concat(t).toString())}catch{return n(t,400,{status:"error",message:"Invalid JSON body"})}let o=String(a.essay_url||"").trim();return o?c(o)?(await r`UPDATE registrations_pkdtm1 SET
    essay_url = ${o},
    essay_submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = ${u.id}`,n(t,200,{status:"success",message:"Essay berhasil disubmit!"})):n(t,400,{status:"error",message:"URL essay tidak valid"}):n(t,400,{status:"error",message:"File essay wajib diupload"})}async function h(e,t){let a,s;await i(e);let u=e.query||{},o=String(u.status||"all").trim().toLowerCase(),l=String(u.search||"").trim(),m=Math.max(1,Number(u.page)||1),c=Math.min(100,Math.max(1,Number(u.limit)||25)),g=(m-1)*c;"all"!==o&&d.has(o)?l?(a=await r`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1 r WHERE r.status = ${o} AND (r.nama ILIKE ${"%"+l+"%"} OR r.asal_pimpinan ILIKE ${"%"+l+"%"})`,s=await r`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id WHERE r.status = ${o} AND (r.nama ILIKE ${"%"+l+"%"} OR r.asal_pimpinan ILIKE ${"%"+l+"%"}) ORDER BY r.created_at DESC LIMIT ${c} OFFSET ${g}`):(a=await r`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1 r WHERE r.status = ${o}`,s=await r`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id WHERE r.status = ${o} ORDER BY r.created_at DESC LIMIT ${c} OFFSET ${g}`):l?(a=await r`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1 r WHERE r.nama ILIKE ${"%"+l+"%"} OR r.asal_pimpinan ILIKE ${"%"+l+"%"}`,s=await r`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id WHERE r.nama ILIKE ${"%"+l+"%"} OR r.asal_pimpinan ILIKE ${"%"+l+"%"} ORDER BY r.created_at DESC LIMIT ${c} OFFSET ${g}`):(a=await r`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1`,s=await r`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT ${c} OFFSET ${g}`);let p=a.rows[0]?.c||0;return n(t,200,{status:"success",registrations:s.rows,total:p,page:m,totalPages:Math.ceil(p/c)})}async function _(t,a){let s,u=await i(t);try{let e=[];for await(let a of t)e.push(a);s=JSON.parse(Buffer.concat(e).toString())}catch{return n(a,400,{status:"error",message:"Invalid JSON body"})}let o=Number(s.id),l=String(s.status||"").trim().toLowerCase(),m=String(s.admin_note||"").trim()||null;if(!o||!d.has(l))return n(a,400,{status:"error",message:"ID dan status (pending/verified/rejected) diperlukan"});if(!(await r`SELECT id FROM registrations_pkdtm1 WHERE id = ${o}`).rows[0])return n(a,404,{status:"error",message:"Registrasi tidak ditemukan"});await r`UPDATE registrations_pkdtm1 SET
    status = ${l},
    admin_note = ${m},
    reviewed_by = ${u.id},
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = ${o}`,await r`INSERT INTO activity_logs (admin_id, action, details) 
              VALUES (${u.id}, ${"PKDTM1_STATUS_UPDATE"}, ${JSON.stringify({registration_id:o,new_status:l,note:m})})`;try{let t=(await r`SELECT user_id, nama FROM registrations_pkdtm1 WHERE id = ${o}`).rows[0];if(t){let a="Update Pendaftaran PKDTM1",s=`Halo ${t.nama}, pendaftaran Anda sekarang berstatus: ${l.toUpperCase()}.`,i="info";"verified"===l?(a="Pendaftaran Lolos Verifikasi! 🎉",s=`Selamat ${t.nama}! Anda lolos verifikasi tahap 1. Silakan lanjut ke Tahap 2 (Essay) sekarang.`,i="success"):"rejected"===l&&(a="Pendaftaran Perlu Perbaikan ⚠️",s=`Maaf ${t.nama}, pendaftaran Anda ditolak. Catatan admin: ${m||"Periksa kelengkapan berkas"}.`,i="warning"),await r`INSERT INTO notifications (user_id, title, message, type, action_url) 
                  VALUES (${t.user_id}, ${a}, ${s}, ${i}, '/pendaftaran-pkdtm1.html')`;let{sendToUser:n}=e.r(42551);n(t.user_id,{title:a,body:s,url:"/pendaftaran-pkdtm1.html",image:"/images/pkdtm1-banner-v3.png",tag:"pkdtm1-notification",useLargeImage:!0}).catch(()=>{})}}catch(e){console.error("[PKDTM1] Notification trigger failed:",e)}return n(a,200,{status:"success",message:`Status berhasil diubah ke ${l}`})}async function w(e,t){await i(e);let a=Number(e.query?.id);return a?(await r`SELECT id FROM registrations_pkdtm1 WHERE id = ${a}`).rows[0]?(await r`DELETE FROM registrations_pkdtm1 WHERE id = ${a}`,n(t,200,{status:"success",message:"Registrasi berhasil dihapus"})):n(t,404,{status:"error",message:"Registrasi tidak ditemukan"}):n(t,400,{status:"error",message:"ID diperlukan"})}async function f(e,t){return await i(e),n(t,200,{status:"success",stats:(await r`SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
    COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
    COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
  FROM registrations_pkdtm1`).rows[0]})}t.exports=async(e,t)=>{u(t),await m();let a=String((e.query||{}).action||"").trim().toLowerCase();try{if("submit"===a&&"POST"===e.method)return await g(e,t);if("my-status"===a&&"GET"===e.method)return await p(e,t);if("submit-essay"===a&&"POST"===e.method)return await E(e,t);if("admin-list"===a&&"GET"===e.method)return await h(e,t);if("admin-update"===a&&("POST"===e.method||"PUT"===e.method))return await _(e,t);if("admin-delete"===a&&"DELETE"===e.method)return await w(e,t);if("admin-stats"===a&&"GET"===e.method)return await f(e,t);return n(t,400,{status:"error",message:`Unknown action: ${a}`})}catch(e){return console.error("[PKDTM1] Error:",e),n(t,500,{status:"error",message:String(e.message||"Internal server error")})}}},2963,(e,t,a)=>{let{json:r,parseJsonBody:s}=e.r(86651),{getSessionUser:i,requireAdminAuth:n}=e.r(23908),{getVapid:u,saveSubscription:o,removeSubscription:d,sendToAll:l,sendToUser:m}=e.r(42551);function c(e){let t=String(e||"").trim();if(!t||/^(javascript|data|vbscript):/i.test(t))return"/";let a=/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(t),r=/^https?:\/\//i.test(t)||t.startsWith("/")?t:a?`https://${t}`:t;try{if(/^https?:\/\//i.test(r))return new URL(r).href;let e=new URL(r,"http://local.app"),t=`${e.pathname}${e.search}${e.hash}`;return t.startsWith("/")?t:`/${t}`}catch{let e=t.replace(/^\.?\//,"").trim();return e?`/${e}`:"/"}}t.exports=async(e,t)=>{try{let a=e.query.action||"";if("GET"===e.method&&"publicKey"===a){let e=u();if(!e)return r(t,200,{status:"disabled",publicKey:null,message:"VAPID not configured"});return r(t,200,{status:"success",publicKey:e.publicKey})}if("POST"===e.method&&"subscribe"===a){let a=await i(e),n=s(e)||{},u=n.subscription||n;if(!u||!u.endpoint)return r(t,400,{status:"error",message:"Invalid subscription"});return await o({endpoint:u.endpoint,keys:u.keys,user_id:a?a.id:null}),r(t,200,{status:"success"})}if("POST"===e.method&&"unsubscribe"===a){let a=s(e)||{},i=a.endpoint||a.subscription?.endpoint;if(!i)return r(t,400,{status:"error",message:"Endpoint required"});return await d(i),r(t,200,{status:"success"})}if("POST"===e.method&&"broadcast"===a){try{await n(e)}catch{return r(t,401,{status:"error",message:"Unauthorized"})}let a=s(e)||{},i={title:a.title||"Notifikasi IPM",body:a.body||"Ada pembaruan baru.",url:c(a.url||"/")},u=await l(i);return r(t,200,{status:"success",result:u})}if("POST"===e.method&&"notifyUser"===a){try{await n(e)}catch{return r(t,401,{status:"error",message:"Unauthorized"})}let a=s(e)||{},i=Number(a.user_id||0);if(!i)return r(t,400,{status:"error",message:"user_id required"});let u={title:a.title||"Notifikasi IPM",body:a.body||"Ada pembaruan baru.",url:c(a.url||"/")},o=await m(i,u);return r(t,200,{status:"success",result:o})}return r(t,405,{status:"error",message:"Method not allowed"})}catch(e){return r(t,500,{status:"error",message:String(e.message||e)})}}},3515,(e,t,a)=>{let r=e.r(54799),{query:s}=e.r(35716),{json:i,parseJsonBody:n}=e.r(86651),{ensureSchema:u}=e.r(44285),{requireAdminAuth:o,getSessionUser:d}=e.r(23908);function l(e,t=400){return String(e||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,t)}async function m(e,t){var a;let u,o;if("1"===String(e.headers?.dnt||"").trim())return i(t,204,{ok:!0,skipped:"dnt"});let m=l(e.headers?.["user-agent"],600);if((u=String(m||"").toLowerCase())&&/(bot|spider|crawler|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|bingpreview|preview)/i.test(u))return i(t,204,{ok:!0,skipped:"bot"});let c=await d(e),g=n(e)||{},p=l(g.event_name||g.event||"pageview",80).toLowerCase(),E=function(e){let t=String(e||"").trim();if(!t)return"/";try{let e=new URL(t,"http://local.app");return l(`${e.pathname}${e.search}`||"/",500)}catch{return l(t.startsWith("/")?t:`/${t}`,500)}}(g.path||g.pathname||"/"),h=l(g.title||"",200)||null,_=l(g.referrer||"",500)||null,w=l(g.session_id||"",120)||null,f=(a=String(e.headers?.["x-forwarded-for"]||"").split(",")[0].trim()||String(e.socket?.remoteAddress||"").trim()||"",o=String(process.env.ANALYTICS_SALT||"ipm-panawuan-analytics-v1"),a?r.createHash("sha256").update(`${o}:${a}`).digest("hex"):null),S=g.props&&"object"==typeof g.props?g.props:{};return await s`
    INSERT INTO analytics_events (event_name, path, title, referrer, user_id, session_id, ip_hash, ua, props, created_at)
    VALUES (${p}, ${E}, ${h}, ${_}, ${c?Number(c.id):null}, ${w}, ${f}, ${m||null}, ${S}, NOW())
  `,i(t,200,{status:"success"})}async function c(e,t){let a;try{await o(e)}catch(e){return i(t,401,{status:"error",message:e.message||"Unauthorized"})}let r=Number.isFinite(a=Number(e.query?.days))?Math.min(Math.max(Math.floor(a),1),365):30,n=(await s`
      SELECT
        COUNT(*)::int AS events,
        COUNT(*) FILTER (WHERE event_name='pageview')::int AS pageviews,
        COUNT(DISTINCT ip_hash)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events
      WHERE created_at >= NOW() - (${r} || ' days')::interval
    `).rows[0],u=(await s`
      SELECT path, COUNT(*)::int AS pageviews
      FROM analytics_events
      WHERE created_at >= NOW() - (${r} || ' days')::interval
        AND event_name='pageview'
      GROUP BY path
      ORDER BY pageviews DESC, path ASC
      LIMIT 12
    `).rows,d=(await s`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE event_name='pageview')::int AS pageviews,
             COUNT(DISTINCT ip_hash)::int AS visitors
      FROM analytics_events
      WHERE created_at >= NOW() - (${r} || ' days')::interval
      GROUP BY 1
      ORDER BY day ASC
    `).rows;return i(t,200,{status:"success",summary:{days:r,pageviews:Number(n?.pageviews||0),sessions:Number(n?.sessions||0),unique_visitors:Number(n?.unique_visitors||0),events:Number(n?.events||0)},top_pages:u.map(e=>({path:e.path,pageviews:Number(e.pageviews||0)})),daily:d.map(e=>({day:e.day,pageviews:Number(e.pageviews||0),visitors:Number(e.visitors||0)}))})}t.exports=async(e,t)=>{await u(),e.query=e.query||{};let a=String(e.query.action||"").trim();return new URL(e.url||"/api/analytics",`http://${e.headers?.host||"localhost"}`).pathname.includes("/api/admin/analytics")?"GET"===e.method&&"summary"===a?await c(e,t):i(t,404,{status:"error",message:`Unknown action: ${a||"none"}`}):"POST"===e.method&&"track"===a?await m(e,t):i(t,404,{status:"error",message:`Unknown action: ${a||"none"}`})}},63102,(e,t,a)=>{let r=e.g.__IPM_RATE_LIMIT_BUCKETS||new Map;e.g.__IPM_RATE_LIMIT_BUCKETS=r,t.exports={getClientIp:function(e){let t=String(e?.headers?.["x-forwarded-for"]||"").split(",")[0].trim();return t||String(e?.socket?.remoteAddress||"unknown")},checkRateLimit:function({key:e,id:t,limit:a,windowMs:s}){let i=Date.now(),n=`${String(e||"global")}::${String(t||"unknown")}`,u=r.get(n);if(!u||u.resetAt<=i){let e=i+s;return r.set(n,{count:1,resetAt:e}),{ok:!0,remaining:Math.max(0,a-1),resetAt:e}}return u.count>=a?{ok:!1,remaining:0,resetAt:u.resetAt}:(u.count+=1,r.set(n,u),{ok:!0,remaining:Math.max(0,a-u.count),resetAt:u.resetAt})},setRateLimitHeaders:function(e,t,a){let r=Math.max(1,Math.ceil((t.resetAt-Date.now())/1e3));e.setHeader("X-RateLimit-Limit",String(a)),e.setHeader("X-RateLimit-Remaining",String(t.remaining)),e.setHeader("X-RateLimit-Reset",String(Math.floor(t.resetAt/1e3))),t.ok||e.setHeader("Retry-After",String(r))}}},75812,(e,t,a)=>{let r;try{({put:r}=(()=>{let e=Error("Cannot find module '@vercel/blob'");throw e.code="MODULE_NOT_FOUND",e})())}catch(e){r=null,console.warn("Missing @vercel/blob dependency.")}let{requireAdminAuth:s,getSessionUser:i}=e.r(23908),{applySecurityHeaders:n}=e.r(86651),{getClientIp:u,checkRateLimit:o,setRateLimitHeaders:d}=e.r(63102),l=(e,t,a)=>{n(e),e.setHeader("Content-Type","application/json"),e.statusCode=t,e.end(JSON.stringify(a))};async function m(e){let t=[];for await(let a of e)t.push(a);return Buffer.concat(t)}t.exports=async(e,t)=>{if("POST"!==e.method)return l(t,405,{error:"Method not allowed"});try{var a;let n=e.headers||{},c=String(n["x-upload-scope"]||"").trim().toLowerCase(),g=o({key:"upload",id:u(e),limit:25,windowMs:6e5});if(d(t,g,25),!g.ok)return l(t,429,{status:"error",message:"Too many upload requests. Try again later.",error:"Too many requests"});let p=null,E="admin";if("attendance-selfie"===c){if(!(p=await i(e)))return l(t,401,{status:"error",message:"Unauthorized",error:"Unauthorized"});E=`attendance/user-${p.id}`}else if("pkdtm1-registration"===c){if(!(p=await i(e)))return l(t,401,{status:"error",message:"Unauthorized",error:"Unauthorized"});E=`pkdtm1/user-${p.id}`}else try{p=await s(e)}catch{return l(t,401,{status:"error",message:"Unauthorized",error:"Unauthorized"})}if(Number(n["content-length"]||0)>5242880){let e="File terlalu besar (maksimal 5MB).";return l(t,413,{status:"error",message:e,error:e})}let h=(a=n["x-filename"],String(a||"upload").replace(/[\\/]/g,"-").replace(/[^a-zA-Z0-9._-]/g,"-").slice(0,120)||`upload-${Date.now()}`),_=String(n["content-type"]||"application/octet-stream");if("attendance-selfie"===c&&!_.startsWith("image/")){let e="Upload selfie harus berupa file gambar.";return l(t,400,{status:"error",message:e,error:e})}if("pkdtm1-registration"===c&&!_.startsWith("image/")&&"application/pdf"!==_&&"application/msword"!==_&&"application/vnd.openxmlformats-officedocument.wordprocessingml.document"!==_){let e="File PKDTM1 harus berupa gambar, PDF, atau dokumen Word.";return l(t,400,{status:"error",message:e,error:e})}if(!r||!process.env.BLOB_READ_WRITE_TOKEN){let a=await m(e);if(a.length>524288)return l(t,413,{status:"error",message:"Blob storage tidak terkonfigurasi. File terlalu besar untuk dikirim sebagai teks (maks 512KB tanpa blob storage).",error:"Payload too large (no blob storage)"});if(a.length>5242880)return l(t,413,{status:"error",message:"File terlalu besar untuk database.",error:"Payload too large"});let r=a.toString("base64"),s=`data:${_};base64,${r}`;return console.log(`[Upload] Using Database Fallback for ${c} (${a.length} bytes)`),l(t,201,{status:"success",url:s,uploaded_by:p?.id||null})}let w=await r(`${E}/${Date.now()}-${h}`,e,{access:"public",contentType:_});return l(t,201,{status:"success",url:w.url,uploaded_by:p?.id||null})}catch(a){console.error("Upload Error:",a);let e=String(a?.message||a||"Upload gagal");return l(t,500,{status:"error",message:e,error:e})}}},89013,e=>{"use strict";let t=e.r(75812);async function a(e,a){return t(e,a)}e.s(["default",0,a])},85163,(e,t,a)=>{let{query:r}=e.r(35716),{json:s,cacheHeaders:i,parseJsonBody:n}=e.r(86651),{requireAdminAuth:u,getSessionUser:o}=e.r(23908),{hashPassword:d}=e.r(96682);async function l(e,t){if(e.query?.action==="notifications"){let a=await o(e);return a?s(t,200,{status:"success",notifications:(await r`SELECT id, message, is_read, created_at FROM notifications WHERE user_id=${a.id} ORDER BY created_at DESC LIMIT 20`).rows},i(0)):s(t,401,{status:"error",message:"Unauthorized"})}let a=await o(e);if(!a)return s(t,401,{status:"error",message:"Unauthorized"});let n=e.query?.username?String(e.query.username).trim().toLowerCase():"",u=[];if(n){let e=String(a.username||"").toLowerCase()===n,i="admin"===String(a.role||"");if(!e&&!i)return s(t,403,{status:"error",message:"Forbidden"});u=(await r`SELECT id, username, nama_panjang, pimpinan, created_at FROM users WHERE LOWER(username)=${n} ORDER BY id DESC`).rows}else{if("admin"!==String(a.role||""))return s(t,403,{status:"error",message:"Forbidden"});u=(await r`SELECT id, username, nama_panjang, pimpinan, created_at FROM users ORDER BY id DESC`).rows}s(t,200,{status:"success",users:u},i(60))}async function m(e,t){let a=await o(e);return a?(await r`UPDATE notifications SET is_read=TRUE WHERE user_id=${a.id}`,s(t,200,{status:"success"})):s(t,401,{status:"error",message:"Unauthorized"})}async function c(e,t){try{await u(e)}catch(e){return s(t,401,{status:"error",message:e.message||"Unauthorized"})}return s(t,200,{status:"success",users:(await r`
        SELECT
            u.id,
            u.username,
            u.email,
            u.nama_panjang,
            u.role,
            u.created_at,
            COUNT(r.id)::int AS total_quizzes,
            COALESCE(AVG(r.score), 0)::float AS avg_score,
            MAX(r.created_at) AS last_quiz_at,
            EXISTS(
                SELECT 1
                FROM sessions s
                WHERE s.user_id = u.id
                  AND s.expires_at > NOW()
            ) AS active
        FROM users u
        LEFT JOIN results r ON u.id = r.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `).rows})}async function g(e,t){try{await u(e)}catch(e){return s(t,401,{status:"error",message:e.message||"Unauthorized"})}let a=(await r`SELECT id, username, nama_panjang, role FROM users ORDER BY username ASC`).rows,i=(await r`SELECT user_id, quiz_set, score, total FROM results`).rows,n={};return i.forEach(e=>{n[e.user_id]||(n[e.user_id]={}),n[e.user_id][e.quiz_set]={score:e.score,total:e.total}}),s(t,200,{status:"success",users:a.map(e=>({id:e.id,username:e.username,nama_panjang:e.nama_panjang,attempts:n[e.id]||{}}))})}async function p(t,a){let i=null;try{i=(await u(t)).id}catch(e){return s(a,401,{status:"error",message:e.message||"Unauthorized"})}let o=n(t),d=Number(o.user_id),l=Number(o.quiz_set);if(!d||!l)return s(a,400,{status:"error",message:"User ID dan Quiz Set wajib diisi"});try{await r`INSERT INTO activity_logs (admin_id, action, details) VALUES (${i}, 'RESET_ATTEMPT', ${{target_user_id:d,quiz_set:l}})`}catch(e){}try{let t=`Admin telah mereset status pengerjaan Kuis Set ${l} Anda. Anda dapat mengerjakannya kembali.`;await r`INSERT INTO notifications (user_id, message) VALUES (${d}, ${t})`;let{sendToUser:a}=e.r(42551);a(d,{title:"Kuis Di-reset",body:t,url:"/quiz-gamified.html"}).catch(()=>{})}catch(e){}return await r`DELETE FROM results WHERE user_id=${d} AND quiz_set=${l}`,s(a,200,{status:"success",message:"Attempt berhasil direset."})}async function E(e,t){let a=null;try{a=(await u(e)).id}catch{return s(t,401,{status:"error",message:"Unauthorized"})}let i=n(e),o=String(i.username||"").trim(),l=String(i.password||"").trim(),m=i.email?String(i.email).trim():null,c="admin"===i.role?"admin":"user",g=String(i.nama_panjang||"").trim();if(!o)return s(t,400,{status:"error",message:"Username required"});let p=null;if(!l)return s(t,400,{status:"error",message:"Password wajib diisi"});p=await d(l);try{let e=await r`INSERT INTO users (username, password_salt, password_hash, email, role, nama_panjang) VALUES (${o}, ${p.salt}, ${p.hash}, ${m}, ${c}, ${g}) RETURNING id, username`;return await r`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'CREATE_USER', ${{username:o,role:c}})`,s(t,201,{status:"success",user:e.rows[0]})}catch(e){if(e.message.includes("unique"))return s(t,400,{status:"error",message:"Username sudah digunakan"});throw e}}async function h(t,a){let i=null;try{i=(await u(t)).id}catch{return s(a,401,{status:"error",message:"Unauthorized"})}let o=n(t),l=Number(o.id||0);if(!l)return s(a,400,{status:"error",message:"Missing id"});let m=[],c=[],g=1;if(o.username&&(m.push(`username = $${g++}`),c.push(String(o.username).trim())),void 0!==o.email&&(m.push(`email = $${g++}`),c.push(String(o.email).trim()||null)),o.role&&(m.push(`role = $${g++}`),c.push("admin"===o.role?"admin":"user")),void 0!==o.nama_panjang&&(m.push(`nama_panjang = $${g++}`),c.push(String(o.nama_panjang).trim())),o.password){let e=await d(String(o.password));m.push(`password_salt = $${g++}`),c.push(e.salt),m.push(`password_hash = $${g++}`),c.push(e.hash)}if(0===m.length)return s(a,400,{status:"error",message:"No fields"});c.push(l);let{rawQuery:p}=e.r(35716);return await p(`UPDATE users SET ${m.join(", ")} WHERE id = $${g}`,c),await r`INSERT INTO activity_logs (admin_id, action, details) VALUES (${i}, 'UPDATE_USER', ${{target_user_id:l,fields:Object.keys(o)}})`,s(a,200,{status:"success"})}async function _(e,t){let a=null;try{a=(await u(e)).id}catch{return s(t,401,{status:"error",message:"Unauthorized"})}let i=Number(e.query.id||n(e).user_id||0);if(!i)return s(t,400,{status:"error",message:"Missing id"});if(i===a)return s(t,400,{status:"error",message:"Tidak dapat menghapus akun sendiri"});try{return await r`DELETE FROM results WHERE user_id=${i}`,await r`DELETE FROM sessions WHERE user_id=${i}`,await r`DELETE FROM notifications WHERE user_id=${i}`,await r`DELETE FROM users WHERE id=${i}`,await r`INSERT INTO activity_logs (admin_id, action, details) VALUES (${a}, 'DELETE_USER', ${{target_user_id:i}})`,s(t,200,{status:"success"})}catch(e){return s(t,500,{status:"error",message:"Gagal menghapus user: "+e.message})}}t.exports=async(e,t)=>{try{let a=e.query?.action;if("GET"===e.method){if("extended"===a)return await c(e,t);if("status"===a)return await g(e,t);return l(e,t)}if("POST"===e.method){if("markNotificationsRead"===a)return await m(e,t);if("resetAttempt"===a)return await p(e,t);let r=n(e);if(r&&r.id)return await h(e,t);return await E(e,t)}if("PUT"===e.method)return await h(e,t);if("DELETE"===e.method)return await _(e,t);return s(t,405,{status:"error",message:"Method not allowed"})}catch(e){return s(t,500,{status:"error",message:String(e.message||e)})}}},66072,(e,t,a)=>{let{query:r}=e.r(35716),{json:s,parseJsonBody:i}=e.r(86651),n=e.r(54799),{hashPassword:u,verifyPassword:o}=e.r(96682),{getSessionUser:d}=e.r(23908),{getClientIp:l,checkRateLimit:m,setRateLimitHeaders:c}=e.r(63102);async function g(e,t){let a=new Date(Date.now()-6e5).toISOString(),s=(await r`SELECT COUNT(*)::int AS c FROM login_attempts WHERE success=false AND attempted_at > ${a} AND (LOWER(username)=${String(e||"").toLowerCase()} OR ip=${t})`).rows[0];return("number"==typeof s?.c?s.c:Number(s?.c||0))>=5}function p(e,t,a){let r=Math.floor((a.getTime()-Date.now())/1e3),s=`session_token=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${r}; Secure`;e.setHeader("Set-Cookie",s)}function E(e,t,a,r,i){let n=m({key:a,id:l(e),limit:r,windowMs:i});return c(t,n,r),!!n.ok||(s(t,429,{status:"error",message:"Too many requests. Try again later."}),!1)}async function h(e,t){if("POST"!==e.method)return s(t,405,{status:"error",message:"Method not allowed"});if(!E(e,t,"auth:login",30,6e5))return;let a=i(e),d=e.headers||{},l=String(a.username||"").trim().toLowerCase(),m=String(a.password||""),c=String((d["x-forwarded-for"]||"").toString().split(",")[0]||e.socket?.remoteAddress||"unknown");if(!l||!m)return s(t,400,{status:"error",message:"Username & password wajib"});if(await g(l,c))return s(t,429,{status:"error",message:"Too many failed attempts. Try again later."});let h=(await r`SELECT id, username, nama_panjang, pimpinan, password_salt, password_hash, role FROM users WHERE LOWER(username)=${l}`).rows[0],_=!1,w=!1;if(h){let e=await o(m,h.password_salt,h.password_hash);e.ok&&(_=!0,w=e.legacy)}if(await r`INSERT INTO login_attempts (username, ip, attempted_at, success) VALUES (${l}, ${c}, ${new Date().toISOString()}, ${_})`,!_)return s(t,401,{status:"error",message:"Username atau password salah"});if(w)try{let e=await u(m);await r`UPDATE users SET password_salt=${e.salt}, password_hash=${e.hash} WHERE id=${h.id}`}catch(e){console.warn("Password rehash migration failed for user:",h.id,e.message||e)}let f=n.randomBytes(24).toString("hex"),S=new Date(Date.now()+6048e5),y=h.role||"user";return await r`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${h.id}, ${f}, ${y}, ${S.toISOString()})`,p(t,f,S),s(t,200,{status:"success",session:f,username:h.username,nama_panjang:h.nama_panjang,pimpinan:h.pimpinan,role:y})}async function _(e,t){if("POST"!==e.method)return s(t,405,{status:"error",message:"Method not allowed"});if(!E(e,t,"auth:register",20,6e5))return;let a=i(e),n=String(a.username||"").trim().toLowerCase(),o=String(a.password||""),d=a.nama_panjang?String(a.nama_panjang):null,l=a.pimpinan?String(a.pimpinan):null;if(!n||!o)return s(t,400,{status:"error",message:"Username & password wajib"});if((await r`SELECT id FROM users WHERE LOWER(username)=${n}`).rows[0])return s(t,409,{status:"error",message:"Username sudah terpakai"});let m=await u(o);return s(t,201,{status:"success",user:(await r`INSERT INTO users (username, nama_panjang, pimpinan, password_salt, password_hash) VALUES (${n}, ${d}, ${l}, ${m.salt}, ${m.hash}) RETURNING id, username, nama_panjang, pimpinan`).rows[0]})}async function w(e,t){if("POST"!==e.method)return s(t,405,{status:"error",message:"Method not allowed"});if(!E(e,t,"auth:promoteAdmin",10,6e5))return;let a=i(e),u=String(a.username||"").trim().toLowerCase(),d=String(a.password||"");if(!u||!d)return s(t,400,{status:"error",message:"Username & password wajib"});let l=(await r`SELECT COUNT(*)::int AS c FROM users WHERE role='admin'`).rows[0];if(("number"==typeof l?.c?l.c:Number(l?.c||0))>0)return s(t,403,{status:"error",message:"Admin sudah ada"});let m=(await r`SELECT id, username, password_salt, password_hash FROM users WHERE LOWER(username)=${u}`).rows[0];if(!m)return s(t,404,{status:"error",message:"User tidak ditemukan"});if(!(await o(d,m.password_salt,m.password_hash)).ok)return s(t,401,{status:"error",message:"Password salah"});await r`UPDATE users SET role=${"admin"} WHERE id=${m.id}`;let c=n.randomBytes(24).toString("hex"),g=new Date(Date.now()+6048e5);return await r`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${m.id}, ${c}, ${"admin"}, ${g.toISOString()})`,p(t,c,g),s(t,200,{status:"success",session:c,username:m.username,role:"admin"})}async function f(e,t){if("POST"!==e.method)return s(t,405,{status:"error",message:"Method not allowed"});if(!E(e,t,"auth:seedAdmins",10,6e5))return;let a=i(e),d=Array.isArray(a.admins)?a.admins:[];if(!d.length)return s(t,400,{status:"error",message:"Payload kosong"});let l=(await r`SELECT COUNT(*)::int AS c FROM users WHERE role='admin'`).rows[0];if(("number"==typeof l?.c?l.c:Number(l?.c||0))>0)return s(t,403,{status:"error",message:"Admin sudah ada"});let m=[];for(let e of d){let a=String(e?.username||"").trim().toLowerCase(),i=String(e?.password||"");if(!a||!i)continue;let d=(await r`SELECT id, username, password_salt, password_hash, role FROM users WHERE LOWER(username)=${a}`).rows[0];if(d){if(!(await o(i,d.password_salt,d.password_hash)).ok)return s(t,401,{status:"error",message:`Password salah untuk ${a}`});"admin"!==String(d.role||"")&&await r`UPDATE users SET role=${"admin"} WHERE id=${d.id}`}else{let e=await u(i);d=(await r`INSERT INTO users (username, password_salt, password_hash, role) VALUES (${a}, ${e.salt}, ${e.hash}, ${"admin"}) RETURNING id, username`).rows[0]}let l=n.randomBytes(24).toString("hex"),c=new Date(Date.now()+6048e5);await r`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${d.id}, ${l}, ${"admin"}, ${c.toISOString()})`,m.push({username:a,session:l})}return s(t,200,{status:"success",accounts:m})}async function S(e,t){if("GET"!==e.method)return s(t,405,{status:"error",message:"Method not allowed"});let a=(await r`SELECT value FROM system_settings WHERE key='pimpinan_options'`).rows[0],i=[];if(a&&a.value)try{let e=JSON.parse(a.value);Array.isArray(e)&&(i=e.map(e=>String(e||"").trim()).filter(Boolean))}catch{}return s(t,200,{status:"success",options:i})}async function y(e,t){if("GET"!==e.method)return s(t,405,{status:"error",message:"Method not allowed"});let a=await d(e);return a?s(t,200,{status:"success",user:{id:a.id,username:a.username,nama_panjang:a.nama_panjang,pimpinan:a.pimpinan,role:a.role}}):s(t,401,{status:"error",message:"Unauthorized"})}t.exports=async(e,t)=>{try{let a=e.query?.action;switch(a){case"login":return await h(e,t);case"register":return await _(e,t);case"pimpinanOptions":return await S(e,t);case"me":return await y(e,t);case"promoteAdmin":return await w(e,t);case"seedAdmins":return await f(e,t);default:return s(t,404,{status:"error",message:`Unknown action: ${a}`})}}catch(r){let e,a=(e=String(r?.message||r||"").toLowerCase()).includes("postgres connection string not configured")||e.includes("invalid postgres_url format")||e.includes("database error:")||e.includes("database schema error:")?{status:503,message:"Layanan login belum siap. Konfigurasi database production belum lengkap atau database sedang tidak dapat diakses."}:null;if(a)return s(t,a.status,{status:"error",message:a.message});return s(t,500,{status:"error",message:String(r.message||r)})}}},13098,(e,t,a)=>{let{json:r}=e.r(86651),s={auth:e.r(66072),auth_handler:e.r(66072),"admin/questions":e.r(64987),"admin/dashboard":e.r(64987),"admin/auth":e.r(64987),"admin/analytics":e.r(3515),"admin/materials":e.r(64987),"admin/organization":e.r(61015),"admin/users":e.r(85163),admin_handler:e.r(64987),admin:e.r(64987),organization:e.r(61015),articles:e.r(34205),materials:e.r(24573),questions:e.r(41743),results:e.r(6541),users:e.r(85163),feedback:e.r(41680),forms:e.r(27625),"admin/forms":e.r(27625),analytics:e.r(3515),push:e.r(2963),attendance:e.r(31071),discussions:e.r(39303),pkdtm1:e.r(71392),webauthn:async(e,t)=>(()=>{let e=Error("Cannot find module as expression is too dynamic");throw e.code="MODULE_NOT_FOUND",e})()(e,t),upload:e.r(89013)};t.exports=async(t,a)=>{try{let i=t.query||{},n=i.action||"";if("GET"===t.method&&"health"===n)return r(a,200,{status:"success",ok:!0,time:new Date().toISOString()});if("GET"===t.method&&"dbHealth"===n){let{query:t}=e.r(35716),s=(await t`SELECT NOW() AS now`).rows[0]?.now;return r(a,200,{status:"success",db:"ok",now:s})}let u=new URL(t.url||"/api",`http://${t.headers?.host||"localhost"}`).pathname.split("/").filter(e=>e),o=u.indexOf("api"),d=-1!==o&&u[o+1]?u[o+1]:null,l=-1!==o&&u[o+2]?u[o+2]:null,m=i.segment?String(i.segment):"";(!d||"index"===d)&&m&&(d=m);let c=s[d];if("admin"===d&&l&&(s[`admin/${l}`]?c=s[`admin/${l}`]:s[l]&&(c=s[l])),"admin_handler"===d&&(c=s.admin),"auth_handler"===d&&(c=s.auth),c)return await c(t,a);return r(a,404,{status:"error",message:`Route /api/${d||""} not found`})}catch(e){return console.error("Router Error:",e),r(a,500,{status:"error",message:"Internal Server Error"})}}},73412,e=>{"use strict";var t=e.i(26747),a=e.i(90406),r=e.i(44898),s=e.i(62950),i=e.i(13098),n=e.i(7031),u=e.i(81927),o=e.i(46432);let d=(0,s.hoist)(i,"default"),l=(0,s.hoist)(i,"config"),m=new r.PagesAPIRouteModule({definition:{kind:a.RouteKind.PAGES_API,page:"/api/index",pathname:"/api",bundlePath:"",filename:""},userland:i,distDir:".next",relativeProjectDir:""});async function c(e,a,r){r.requestMeta&&(0,o.setRequestMeta)(e,r.requestMeta),m.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let s="/api/index";s=s.replace(/\/index$/,"")||"/";let i=await m.prepare(e,a,{srcPage:s});if(!i){a.statusCode=400,a.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve());return}let{query:d,params:l,prerenderManifest:c,routerServerContext:g}=i;try{let t,r=e.method||"GET",i=(0,n.getTracer)(),o=i.getActiveScopeSpan(),p=!!(null==g?void 0:g.isWrappedByNextServer),E=m.instrumentationOnRequestError.bind(m),h=async n=>m.render(e,a,{query:{...d,...l},params:l,allowedRevalidateHeaderKeys:[],multiZoneDraftMode:!1,trustHostHeader:!1,previewProps:c.preview,propagateError:!1,dev:m.isDev,page:"/api/index",internalRevalidate:null==g?void 0:g.revalidate,onError:(...t)=>E(e,...t)}).finally(()=>{if(!n)return;n.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let e=i.getRootSpanAttributes();if(!e)return;if(e.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${e.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=e.get("next.route");if(o){let e=`${r} ${o}`;n.setAttributes({"next.route":o,"http.route":o,"next.span_name":e}),n.updateName(e),t&&t!==n&&(t.setAttribute("http.route",o),t.updateName(e))}else n.updateName(`${r} ${s}`)});p&&o?await h(o):(t=i.getActiveScopeSpan(),await i.withPropagatedContext(e.headers,()=>i.trace(u.BaseServerSpan.handleRequest,{spanName:`${r} ${s}`,kind:n.SpanKind.SERVER,attributes:{"http.method":r,"http.target":e.url}},h),void 0,!p))}catch(e){if(m.isDev)throw e;(0,t.sendError)(a,500,"Internal Server Error")}finally{null==r.waitUntil||r.waitUntil.call(r,Promise.resolve())}}e.s(["config",0,l,"default",0,d,"handler",0,c])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ghxeny._.js.map