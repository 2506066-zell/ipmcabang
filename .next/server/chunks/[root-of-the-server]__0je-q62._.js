module.exports=[86651,(a,e,t)=>{let r=a.r(54799);function i(a){a.setHeader("X-Content-Type-Options","nosniff"),a.setHeader("X-Frame-Options","DENY"),a.setHeader("Referrer-Policy","strict-origin-when-cross-origin"),a.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()"),a.setHeader("Cross-Origin-Opener-Policy","same-origin"),a.setHeader("Cross-Origin-Resource-Policy","same-site"),a.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains; preload")}e.exports={json:function(a,e,t,n){let s=JSON.stringify(t??{}),o=r.createHash("sha1").update(s).digest("hex");i(a),a.setHeader("Content-Type","application/json"),a.setHeader("ETag",o),n&&Object.entries(n).forEach(([e,t])=>a.setHeader(e,t)),a.status(e).send(s)},cacheHeaders:function(a){let e=Number(a||60);return{"Cache-Control":`public, s-maxage=${e}, stale-while-revalidate=${5*e}`}},getBearerToken:function(a){let e=String(a?.headers?.authorization||"");return e.startsWith("Bearer ")?e.slice(7).trim():""},parseJsonBody:function(a){let e=a&&void 0!==a.body?a.body:{};if("string"==typeof e)try{return JSON.parse(e||"{}")}catch{return{}}return e||{}},applySecurityHeaders:i}},55168,(a,e,t)=>{e.exports=a.x("pg-587764f78a6c7a9c",()=>require("pg-587764f78a6c7a9c"))},70406,(a,e,t)=>{e.exports=a.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},54799,(a,e,t)=>{e.exports=a.x("crypto",()=>require("crypto"))},14534,(a,e,t)=>{e.exports={DEFAULT_ORG_BIDANG:[{id:"ketuaUmum",name:"Ketua Umum",image:"images/bidang/umum.jpeg",color:"#2C5F4F"},{id:"sekretaris",name:"Sekretaris",image:"images/bidang/sekretaris.jpg",color:"#4A7C5D"},{id:"bendahara",name:"Bendahara",image:"images/bidang/bendahara.jpg",color:"#F39C12"},{id:"perkaderan",name:"Perkaderan",image:"images/bidang/pkd.png",color:"#E74C3C"},{id:"pengkajianIlmu",name:"Pengkajian Ilmu Pengetahuan",image:"images/bidang/pengkajianIlmu.jpeg",color:"#3498DB"},{id:"kajianDakwah",name:"Kajian Dakwah Islam",image:"images/bidang/kajianDakwah.jpg",color:"#9B59B6"},{id:"apresiasiBudaya",name:"Apresiasi Budaya & Olahraga",image:"images/bidang/apresiasiBudaya.jpg",color:"#1ABC9C"},{id:"advokasi",name:"Advokasi",image:"images/bidang/advokasi.jpeg",color:"#E67E22"},{id:"ipmawati",name:"Ipmawati",image:"images/bidang/ipmawati.jpeg",color:"#D946A6"}],DEFAULT_ORG_MEMBERS:[{name:"Anwar Miftah",role:"Ketua Umum",quote:"Kepemimpinan adalah tanggung jawab.",photo:"images/members/",bidangId:"ketuaUmum"},{name:"Nauval",role:"Sekretaris",quote:"Administrasi adalah fondasi organisasi yang kuat.",photo:"images/members/hendra-gunawan.jpg",bidangId:"sekretaris"},{name:"Yasifa Permata",role:"Bendahara Umum",quote:"Transparansi keuangan adalah kunci kepercayaan.",photo:"",bidangId:"bendahara",instagram:"https://www.instagram.com/username"},{name:"Syifa Nursafitri",role:"Bendahara I",quote:"Transparansi keuangan adalah kunci kepercayaan.",photo:"",bidangId:"bendahara"},{name:"Arief Bijaksana",role:"Ketua",quote:"",photo:"",bidangId:"perkaderan"},{name:"Hafiy Muhammad Fhaza",role:"Sekretaris",quote:"",photo:"",bidangId:"perkaderan"},{name:"Moch Ridwan Nulhakim",role:"Anggota",quote:"",photo:"",bidangId:"perkaderan"},{name:"Ajril Ahmad Fazar",role:"Anggota",quote:"",photo:"",bidangId:"perkaderan"},{name:"Gilang Muhammad Riziq",role:"Ketua Bidang",quote:"",photo:"images/members/gilang1.jpeg",bidangId:"pengkajianIlmu"},{name:"Zaldy Muhammad Fazri",role:"Sekretaris Bidang",quote:"",photo:"images/members/zaldy.jpeg",bidangId:"pengkajianIlmu"},{name:"Sudarisman",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Fathir Nasrulhaq",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Muhammad Fadilah",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Ayudia Cempaka Gratia",role:"Anggota",quote:"",photo:"images/members/ayudia.jpeg",bidangId:"pengkajianIlmu"},{name:"Halida Muna Nurmufidah",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Haura Azkya",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Debi Rahmawati",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Ahsan Hadian Assidiqi",role:"Ketua Bidang",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Syifa Khoerunnisa",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Siti Rahmawati",role:"Anggota",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Muhammad Iqbal",role:"Anggota",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Hasna Aurora Ginan Nurillah",role:"Ketua Bidang",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Najril Muhammad Solfa",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Ganjar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"asep",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"wiri",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Tegar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"anwar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Muhammad Yopi",role:"Ketua Bidang",quote:"",photo:"images/members/yopi.jpeg",bidangId:"advokasi"},{name:"Rehan Nurfahmi",role:"Sekretaris Bidang",quote:"",photo:"images/members/rehan.jpeg",bidangId:"advokasi"},{name:"Raisa Hidayatul Marwah",role:"Anggota",quote:"",photo:"",bidangId:"advokasi"},{name:"Raida Rahma Annastasya",role:"Ketua Bidang",quote:"",photo:"",bidangId:"ipmawati"},{name:"Sira Tiara Wangi",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"ipmawati"},{name:"Shabrina Diwamah Rifki 33",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Ramira Ramandita",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Ismi Nurazizah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Iklia Wahdiah Nurfitriah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Kheisya Zahra Oktavia",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Anida Uswah Mujahidah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"}],DEFAULT_ORG_PROGRAMS:[{bidangId:"ketuaUmum",name:"",desc:"",status:""},{bidangId:"ketuaUmum",name:"",desc:"",status:""},{bidangId:"sekretaris",name:"",desc:"",status:""},{bidangId:"bendahara",name:"",desc:"",status:""},{bidangId:"perkaderan",name:"",desc:"",status:""},{bidangId:"perkaderan",name:"",desc:"",status:""},{bidangId:"pengkajianIlmu",name:"",desc:"",status:""},{bidangId:"pengkajianIlmu",name:"",desc:"",status:""},{bidangId:"kajianDakwah",name:"",desc:"",status:""},{bidangId:"apresiasiBudaya",name:"",desc:"",status:""},{bidangId:"advokasi",name:"",desc:"",status:""},{bidangId:"ipmawati",name:"",desc:"",status:""},{bidangId:"ipmawati",name:"",desc:"",status:""}]}},23908,(a,e,t)=>{let{query:r}=a.r(35716),{getBearerToken:i}=a.r(86651);function n(a){let e={},t=a.headers?.cookie;return t&&t.split(";").forEach(a=>{let t=a.split("=");e[t.shift().trim()]=decodeURI(t.join("="))}),e}function s(a){return!["GET","HEAD","OPTIONS"].includes(String(a?.method||"GET").toUpperCase())}async function o(a){return(await r`SELECT u.id, u.username, u.nama_panjang, u.pimpinan, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${a} AND s.expires_at > NOW()`).rows[0]||null}e.exports={getSessionUser:async function(a){let e=i(a),t=e,r=n(a).session_token;if(s(a)&&!e||(t||(t=r),!t))return null;let u=await o(t);return u||(r&&r!==t?await o(r):null)},requireAdminAuth:async function(a){let e=i(a),t=e,o=n(a).session_token;if(s(a)&&!e)throw Error("Unauthorized: Bearer token required for state-changing requests");if(t||(t=o),!t)throw Error("Unauthorized: No token provided");let u=async a=>(await r`SELECT s.user_id AS id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${a} AND s.expires_at > NOW() AND u.role='admin'`).rows[0],d=await u(t);if(!d&&o&&o!==t&&(d=await u(o)),!d)throw Error("Unauthorized: Invalid token or not admin");return{id:d.id}}}},6541,(a,e,t)=>{let{query:r,rawQuery:i}=a.r(35716),{json:n,cacheHeaders:s,parseJsonBody:o}=a.r(86651),{requireAdminAuth:u}=a.r(23908),d=/^\d{4}-\d{2}$/;function m(a){return d.test(String(a||"").trim())}async function p(a){await r`INSERT INTO system_settings (key, value, updated_at)
        VALUES ('ranking_reset_ym', ${a}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`}async function l(a){m(a)&&await r`
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
            ${a},
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
    `}async function g(){let a,e,t,i=(e=(a=new Date).getUTCFullYear(),t=String(a.getUTCMonth()+1).padStart(2,"0"),`${e}-${t}`),n=(await r`SELECT value FROM system_settings WHERE key='ranking_reset_ym'`).rows[0],s=String(n?.value||"").trim();s?s!==i&&(await l(s),await r`DELETE FROM results`,await p(i)):await p(i)}async function h(a,e){let t=a.query.page?Number(a.query.page):1,r=Math.max(1,Math.min(500,a.query.size?Number(a.query.size):200)),o=Math.max(0,(Math.max(1,t)-1)*r),u=`
        SELECT r.id, r.created_at AS ts, r.username, u.pimpinan, r.score, r.total, r.percent, r.time_spent
        FROM results r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.username IS NOT NULL AND r.username != ''
        ORDER BY r.score DESC, r.time_spent ASC, r.created_at ASC
        LIMIT $1 OFFSET $2
    `;return n(e,200,{status:"success",results:(await i(u,[r,o])).rows,page:Math.max(1,t),size:r},s(0))}async function c(a,e){return n(e,200,{status:"success",months:(await r`
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
    `).rows},s(0))}async function E(a,e){let t=String(a.query.ym||"").trim();if(t&&!m(t))return n(e,400,{status:"error",message:"Format ym tidak valid. Gunakan YYYY-MM."});if(!t){let a=(await r`SELECT ym FROM ranking_monthly_archive ORDER BY ym DESC LIMIT 1`).rows[0];if(!(t=String(a?.ym||"").trim()))return n(e,200,{status:"success",ym:"",archives:[]},s(0))}let i=(await r`
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
        WHERE ym = ${t}
        ORDER BY rank_position ASC
    `).rows;return n(e,200,{status:"success",ym:t,archives:i},s(0))}async function _(a,e){return n(e,200,{status:"success",champions:(await r`
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
    `).rows},s(0))}async function k(a,e){try{await g()}catch(a){console.error("Monthly reset failed:",a)}try{let t=String(a.query.mode||"").trim().toLowerCase();if("archive"===t||"monthly_archive"===t)return await E(a,e);if("archivemonths"===t||"archive_months"===t)return await c(a,e);if("halloffame"===t||"hall_of_fame"===t)return await _(a,e);return await h(a,e)}catch(a){return n(e,500,{status:"error",message:a.message})}}async function S(a,e){try{await g()}catch(a){console.error("Monthly reset failed:",a)}let t=o(a),i=String(t.session||"").trim(),s=Number(t.quiz_set||1),u=Number(t.time_spent||0),d=t.answers||{};if(!i)return n(e,401,{status:"error",message:"Unauthorized"});let m=(await r`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${i} AND s.expires_at > NOW()`).rows[0];if(!m)return n(e,401,{status:"error",message:"Unauthorized"});let p=(await r`SELECT id, correct_answer FROM questions WHERE quiz_set=${s} AND active=true`).rows;if(!p.length)return n(e,400,{status:"error",message:"Set soal tidak ditemukan atau tidak aktif."});let l=0,h=p.length;p.forEach(a=>{let e=(d[a.id]||"").toLowerCase().trim(),t=(a.correct_answer||"").toLowerCase().trim();e&&t&&e===t&&l++});let c=Math.round(l/h*100),E=Date.now(),_=(await r`SELECT id FROM results WHERE user_id=${m.id} AND quiz_set=${s} AND score=${l} AND created_at > NOW() - INTERVAL '10 seconds'`).rows[0];if(_)return n(e,200,{status:"success",id:_.id,score:l,total:h,percent:c,idempotent:!0});if((await r`SELECT id FROM results WHERE user_id=${m.id} AND quiz_set=${s} LIMIT 1`).rows[0])return n(e,409,{status:"error",message:"Anda sudah mencoba kuis ini. Hubungi admin untuk reset."});let k=(await r`SELECT finished_at FROM results WHERE user_id=${m.id} ORDER BY id DESC LIMIT 1`).rows[0];if(k&&Number(k.finished_at||0)>0){let a=E-Number(k.finished_at);if(a>=0&&a<1e4)return n(e,429,{status:"error",message:"Terlalu cepat. Harap tunggu sebentar."})}return n(e,201,{status:"success",id:(await r`INSERT INTO results (username, user_id, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${m.username}, ${m.id}, ${l}, ${h}, ${c}, ${u}, ${s}, ${E-1e3*u}, ${E}) RETURNING id`).rows[0].id,score:l,total:h,percent:c})}async function A(a,e){try{await u(a)}catch{return n(e,401,{status:"error",message:"Unauthorized"})}return await r`DELETE FROM results`,n(e,200,{status:"success"})}e.exports=async(a,e)=>{try{if(a.query=a.query||{},"GET"===a.method)return await k(a,e);if("POST"===a.method)return await S(a,e);if("DELETE"===a.method)return await A(a,e);return n(e,405,{status:"error",message:"Method not allowed"})}catch(a){return n(e,500,{status:"error",message:String(a.message||a)})}}},94869,a=>{"use strict";var e=a.i(26747),t=a.i(90406),r=a.i(44898),i=a.i(62950);let n=a.r(6541);async function s(a,e){return n(a,e)}a.s(["default",0,s],64673);var o=a.i(64673),u=a.i(7031),d=a.i(81927),m=a.i(46432);let p=(0,i.hoist)(o,"default"),l=(0,i.hoist)(o,"config"),g=new r.PagesAPIRouteModule({definition:{kind:t.RouteKind.PAGES_API,page:"/api/results",pathname:"/api/results",bundlePath:"",filename:""},userland:o,distDir:".next",relativeProjectDir:""});async function h(a,t,r){r.requestMeta&&(0,m.setRequestMeta)(a,r.requestMeta),g.isDev&&(0,m.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let i="/api/results";i=i.replace(/\/index$/,"")||"/";let n=await g.prepare(a,t,{srcPage:i});if(!n){t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve());return}let{query:s,params:o,prerenderManifest:p,routerServerContext:l}=n;try{let e,r=a.method||"GET",n=(0,u.getTracer)(),m=n.getActiveScopeSpan(),h=!!(null==l?void 0:l.isWrappedByNextServer),c=g.instrumentationOnRequestError.bind(g),E=async u=>g.render(a,t,{query:{...s,...o},params:o,allowedRevalidateHeaderKeys:[],multiZoneDraftMode:!1,trustHostHeader:!1,previewProps:p.preview,propagateError:!1,dev:g.isDev,page:"/api/results",internalRevalidate:null==l?void 0:l.revalidate,onError:(...e)=>c(a,...e)}).finally(()=>{if(!u)return;u.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=n.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=a.get("next.route");if(s){let a=`${r} ${s}`;u.setAttributes({"next.route":s,"http.route":s,"next.span_name":a}),u.updateName(a),e&&e!==u&&(e.setAttribute("http.route",s),e.updateName(a))}else u.updateName(`${r} ${i}`)});h&&m?await E(m):(e=n.getActiveScopeSpan(),await n.withPropagatedContext(a.headers,()=>n.trace(d.BaseServerSpan.handleRequest,{spanName:`${r} ${i}`,kind:u.SpanKind.SERVER,attributes:{"http.method":r,"http.target":a.url}},E),void 0,!h))}catch(a){if(g.isDev)throw a;(0,e.sendError)(t,500,"Internal Server Error")}finally{null==r.waitUntil||r.waitUntil.call(r,Promise.resolve())}}a.s(["config",0,l,"default",0,p,"handler",0,h],94869)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0je-q62._.js.map