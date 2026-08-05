module.exports=[86651,(e,a,t)=>{let i=e.r(54799);function n(e){e.setHeader("X-Content-Type-Options","nosniff"),e.setHeader("X-Frame-Options","DENY"),e.setHeader("Referrer-Policy","strict-origin-when-cross-origin"),e.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()"),e.setHeader("Cross-Origin-Opener-Policy","same-origin"),e.setHeader("Cross-Origin-Resource-Policy","same-site"),e.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains; preload")}a.exports={json:function(e,a,t,r){let o=JSON.stringify(t??{}),s=i.createHash("sha1").update(o).digest("hex");n(e),e.setHeader("Content-Type","application/json"),e.setHeader("ETag",s),r&&Object.entries(r).forEach(([a,t])=>e.setHeader(a,t)),e.status(a).send(o)},cacheHeaders:function(e){let a=Number(e||60);return{"Cache-Control":`public, s-maxage=${a}, stale-while-revalidate=${5*a}`}},getBearerToken:function(e){let a=String(e?.headers?.authorization||"");return a.startsWith("Bearer ")?a.slice(7).trim():""},parseJsonBody:function(e){let a=e&&void 0!==e.body?e.body:{};if("string"==typeof a)try{return JSON.parse(a||"{}")}catch{return{}}return a||{}},applySecurityHeaders:n}},55168,(e,a,t)=>{a.exports=e.x("pg-587764f78a6c7a9c",()=>require("pg-587764f78a6c7a9c"))},70406,(e,a,t)=>{a.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},54799,(e,a,t)=>{a.exports=e.x("crypto",()=>require("crypto"))},14534,(e,a,t)=>{a.exports={DEFAULT_ORG_BIDANG:[{id:"ketuaUmum",name:"Ketua Umum",image:"images/bidang/umum.jpeg",color:"#2C5F4F"},{id:"sekretaris",name:"Sekretaris",image:"images/bidang/sekretaris.jpg",color:"#4A7C5D"},{id:"bendahara",name:"Bendahara",image:"images/bidang/bendahara.jpg",color:"#F39C12"},{id:"perkaderan",name:"Perkaderan",image:"images/bidang/pkd.png",color:"#E74C3C"},{id:"pengkajianIlmu",name:"Pengkajian Ilmu Pengetahuan",image:"images/bidang/pengkajianIlmu.jpeg",color:"#3498DB"},{id:"kajianDakwah",name:"Kajian Dakwah Islam",image:"images/bidang/kajianDakwah.jpg",color:"#9B59B6"},{id:"apresiasiBudaya",name:"Apresiasi Budaya & Olahraga",image:"images/bidang/apresiasiBudaya.jpg",color:"#1ABC9C"},{id:"advokasi",name:"Advokasi",image:"images/bidang/advokasi.jpeg",color:"#E67E22"},{id:"ipmawati",name:"Ipmawati",image:"images/bidang/ipmawati.jpeg",color:"#D946A6"}],DEFAULT_ORG_MEMBERS:[{name:"Anwar Miftah",role:"Ketua Umum",quote:"Kepemimpinan adalah tanggung jawab.",photo:"images/members/",bidangId:"ketuaUmum"},{name:"Nauval",role:"Sekretaris",quote:"Administrasi adalah fondasi organisasi yang kuat.",photo:"images/members/hendra-gunawan.jpg",bidangId:"sekretaris"},{name:"Yasifa Permata",role:"Bendahara Umum",quote:"Transparansi keuangan adalah kunci kepercayaan.",photo:"",bidangId:"bendahara",instagram:"https://www.instagram.com/username"},{name:"Syifa Nursafitri",role:"Bendahara I",quote:"Transparansi keuangan adalah kunci kepercayaan.",photo:"",bidangId:"bendahara"},{name:"Arief Bijaksana",role:"Ketua",quote:"",photo:"",bidangId:"perkaderan"},{name:"Hafiy Muhammad Fhaza",role:"Sekretaris",quote:"",photo:"",bidangId:"perkaderan"},{name:"Moch Ridwan Nulhakim",role:"Anggota",quote:"",photo:"",bidangId:"perkaderan"},{name:"Ajril Ahmad Fazar",role:"Anggota",quote:"",photo:"",bidangId:"perkaderan"},{name:"Gilang Muhammad Riziq",role:"Ketua Bidang",quote:"",photo:"images/members/gilang1.jpeg",bidangId:"pengkajianIlmu"},{name:"Zaldy Muhammad Fazri",role:"Sekretaris Bidang",quote:"",photo:"images/members/zaldy.jpeg",bidangId:"pengkajianIlmu"},{name:"Sudarisman",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Fathir Nasrulhaq",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Muhammad Fadilah",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Ayudia Cempaka Gratia",role:"Anggota",quote:"",photo:"images/members/ayudia.jpeg",bidangId:"pengkajianIlmu"},{name:"Halida Muna Nurmufidah",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Haura Azkya",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Debi Rahmawati",role:"Anggota",quote:"",photo:"",bidangId:"pengkajianIlmu"},{name:"Ahsan Hadian Assidiqi",role:"Ketua Bidang",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Syifa Khoerunnisa",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Siti Rahmawati",role:"Anggota",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Muhammad Iqbal",role:"Anggota",quote:"",photo:"",bidangId:"kajianDakwah"},{name:"Hasna Aurora Ginan Nurillah",role:"Ketua Bidang",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Najril Muhammad Solfa",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Ganjar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"asep",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"wiri",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Tegar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"anwar",role:"Anggota",quote:"",photo:"",bidangId:"apresiasiBudaya"},{name:"Muhammad Yopi",role:"Ketua Bidang",quote:"",photo:"images/members/yopi.jpeg",bidangId:"advokasi"},{name:"Rehan Nurfahmi",role:"Sekretaris Bidang",quote:"",photo:"images/members/rehan.jpeg",bidangId:"advokasi"},{name:"Raisa Hidayatul Marwah",role:"Anggota",quote:"",photo:"",bidangId:"advokasi"},{name:"Raida Rahma Annastasya",role:"Ketua Bidang",quote:"",photo:"",bidangId:"ipmawati"},{name:"Sira Tiara Wangi",role:"Sekretaris Bidang",quote:"",photo:"",bidangId:"ipmawati"},{name:"Shabrina Diwamah Rifki 33",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Ramira Ramandita",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Ismi Nurazizah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Iklia Wahdiah Nurfitriah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Kheisya Zahra Oktavia",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"},{name:"Anida Uswah Mujahidah",role:"Anggota",quote:"",photo:"",bidangId:"ipmawati"}],DEFAULT_ORG_PROGRAMS:[{bidangId:"ketuaUmum",name:"",desc:"",status:""},{bidangId:"ketuaUmum",name:"",desc:"",status:""},{bidangId:"sekretaris",name:"",desc:"",status:""},{bidangId:"bendahara",name:"",desc:"",status:""},{bidangId:"perkaderan",name:"",desc:"",status:""},{bidangId:"perkaderan",name:"",desc:"",status:""},{bidangId:"pengkajianIlmu",name:"",desc:"",status:""},{bidangId:"pengkajianIlmu",name:"",desc:"",status:""},{bidangId:"kajianDakwah",name:"",desc:"",status:""},{bidangId:"apresiasiBudaya",name:"",desc:"",status:""},{bidangId:"advokasi",name:"",desc:"",status:""},{bidangId:"ipmawati",name:"",desc:"",status:""},{bidangId:"ipmawati",name:"",desc:"",status:""}]}},83875,(e,a,t)=>{let{query:i,rawQuery:n}=e.r(35716);a.exports=class{static async generateSlug(e,a=null){let t=e.toLowerCase().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"");t||(t="article-"+Date.now());let i=t,r=1;for(;;){let e="SELECT id FROM articles WHERE slug = $1",o=[i];if(a&&(e+=" AND id != $2",o.push(a)),!(await n(e,o)).rows[0])break;i=`${t}-${r}`,r++}return i}static async findAll({search:e,category:a,sort:t,page:i=1,limit:r=10}){let o=[],s=[],d=1;if(e&&(s.push(`(LOWER(title) LIKE $${d} OR LOWER(author) LIKE $${d})`),o.push(`%${e.toLowerCase()}%`),d++),a&&"all"!==a){let e=String(a).trim().toLowerCase();e.startsWith("!")&&e.length>1?(s.push(`LOWER(category) <> $${d}`),o.push(e.slice(1).trim())):(s.push(`LOWER(category) = $${d}`),o.push(e)),d++}let l=s.length?`WHERE ${s.join(" AND ")}`:"",m="ORDER BY publish_date DESC";"popular"===t&&(m="ORDER BY views DESC, publish_date DESC"),"oldest"===t&&(m="ORDER BY publish_date ASC");let g=parseInt((await n(`SELECT COUNT(id) as total FROM articles ${l}`,o)).rows[0].total||0),p=`LIMIT $${d} OFFSET $${d+1}`;o.push(r,(i-1)*r);let u=`SELECT * FROM articles ${l} ${m} ${p}`,{rows:c}=await n(u,o);return{articles:c,total:g,page:i,limit:r,totalPages:Math.ceil(g/r)}}static async findById(e){let{rows:a}=await i`SELECT * FROM articles WHERE id=${e}`;return a[0]}static async findBySlug(e){let{rows:a}=await i`SELECT * FROM articles WHERE slug=${e}`;return a[0]}static async create(e){let a=await this.generateSlug(e.title),{rows:t}=await i`
            INSERT INTO articles (title, slug, content, author, image, publish_date, category)
            VALUES (${e.title}, ${a}, ${e.content}, ${e.author}, ${e.image}, ${e.publish_date}, ${e.category})
            RETURNING *
        `;return t[0]}static async update(e,a){let t=[],i=[],r=1;if(a.title){let n=await this.generateSlug(a.title,e);t.push(`title=$${r++}`),i.push(a.title),t.push(`slug=$${r++}`),i.push(n)}if(a.content&&(t.push(`content=$${r++}`),i.push(a.content)),a.author&&(t.push(`author=$${r++}`),i.push(a.author)),a.image&&(t.push(`image=$${r++}`),i.push(a.image)),a.publish_date&&(t.push(`publish_date=$${r++}`),i.push(a.publish_date)),a.category&&(t.push(`category=$${r++}`),i.push(a.category)),0===t.length)return null;i.push(e);let o=`UPDATE articles SET ${t.join(", ")} WHERE id=$${r} RETURNING *`,{rows:s}=await n(o,i);return s[0]}static async delete(e){return await i`DELETE FROM articles WHERE id=${e}`,!0}static async incrementViews(e){return await i`UPDATE articles SET views = views + 1 WHERE id=${e}`,!0}}},34777,(e,a,t)=>{let i=e.r(83875),{applySecurityHeaders:n}=e.r(86651),r=/<!--\s*HOOK_SUMMARY:([\s\S]*?)-->/gi;function o(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function s(e,a,t){n(e),e.setHeader("Content-Type","text/html; charset=utf-8"),e.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=1800"),e.status(a).send(t)}a.exports=async(e,a)=>{var t,d,l,m;let g,p;if("GET"!==e.method&&"HEAD"!==e.method)return n(a),a.status(405).send("Method Not Allowed");let u=String(e.query&&e.query.slug||"").trim();if(!u)return s(a,200,`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Artikel - PC IPM Panawuan</title>
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Slug artikel tidak ditemukan.</p>
  <p><a href="/articles">Kembali ke daftar artikel</a></p>
</body>
</html>`);let c=(g=String(e.headers["x-forwarded-proto"]||"https").split(",")[0].trim(),p=String(e.headers["x-forwarded-host"]||e.headers.host||"").split(",")[0].trim(),`${g}://${p}`),h=`/articles/${encodeURIComponent(u)}`;try{let e,n,g,p,w,y,b=await i.findBySlug(u);if(!b){let e="Artikel Tidak Ditemukan - PC IPM Panawuan",t="Artikel yang kamu cari tidak tersedia.",i=new URL("/ipm%20(2).png",c).toString(),n=new URL(h,c).toString(),r=`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${o(e)}</title>
  <meta name="description" content="${o(t)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${o(e)}">
  <meta property="og:description" content="${o(t)}">
  <meta property="og:image" content="${o(i)}">
  <meta property="og:image:url" content="${o(i)}">
  <meta property="og:image:secure_url" content="${o(i)}">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:url" content="${o(n)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${o(e)}">
  <meta name="twitter:description" content="${o(t)}">
  <meta name="twitter:image" content="${o(i)}">
  <meta name="twitter:image:alt" content="${o(e)}">
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Artikel tidak ditemukan.</p>
  <p><a href="/articles">Kembali ke daftar artikel</a></p>
</body>
</html>`;return s(a,404,r)}let k=String(b.slug||u).trim(),$=`/articles/${encodeURIComponent(k)}`,I=`/articles?slug=${encodeURIComponent(String(k||"").trim())}`,f=`${b.title||"Artikel Organisasi"} - PC IPM Panawuan`,S=(g=(m=(l=b).content||"",e="",n=String(m||"").replace(r,(a,t)=>{if(!e)try{e=decodeURIComponent(String(t||"").trim())}catch{e=String(t||"").trim()}return""}),{summary:String(e||"").replace(/\s+/g," ").trim(),content:String(n||"").trim()}),(p=String(l.summary||l.excerpt||g.summary||g.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())?p.length<=180?p:`${p.slice(0,180).trim()}...`:"Baca artikel terbaru dari PC IPM Panawuan."),R=new URL(`/api/article-share-image/${encodeURIComponent(k)}.jpg`,c).toString(),A=(t=b.image,w=String(t||"").trim(),/^data:image\/png/i.test(w)?"image/png":/^data:image\/webp/i.test(w)?"image/webp":/^data:image\/gif/i.test(w)?"image/gif":/^data:image\/jpeg/i.test(w)||/^data:image\/jpg/i.test(w)?"image/jpeg":/\.png(\?|$)/i.test(w)?"image/png":/\.webp(\?|$)/i.test(w)?"image/webp":/\.gif(\?|$)/i.test(w)?"image/gif":"image/jpeg"),E=new URL($,c).toString(),q=(d=b.publish_date||b.created_at||Date.now(),y=new Date(d||Date.now()),Number.isNaN(y.getTime())?new Date().toISOString():y.toISOString()),j=`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${o(f)}</title>
  <meta name="description" content="${o(S)}">
  <link rel="canonical" href="${o(E)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${o(f)}">
  <meta property="og:site_name" content="PC IPM Panawuan">
  <meta property="og:description" content="${o(S)}">
  <meta property="og:image" content="${o(R)}">
  <meta property="og:image:url" content="${o(R)}">
  <meta property="og:image:secure_url" content="${o(R)}">
  <meta property="og:image:type" content="${o(A)}">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:image:alt" content="${o(b.title||"Thumbnail artikel PC IPM Panawuan")}">
  <meta property="og:url" content="${o(E)}">
  <meta property="article:published_time" content="${o(q)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${o(f)}">
  <meta name="twitter:description" content="${o(S)}">
  <meta name="twitter:image" content="${o(R)}">
  <meta name="twitter:image:alt" content="${o(b.title||"Thumbnail artikel PC IPM Panawuan")}">
  <meta name="twitter:url" content="${o(E)}">
  <script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:b.title||"Artikel Organisasi",author:b.author||"Redaksi IPM Panawuan",datePublished:q,image:[R],mainEntityOfPage:E})}</script>
</head>
<body>
  <script>
    (function () {
      try {
        window.location.replace(${JSON.stringify(I)});
      } catch (e) {}
    })();
  </script>
  <noscript>
    <p>Mengarahkan ke artikel...</p>
    <p><a href="${o(I)}">Buka artikel</a></p>
  </noscript>
  <p>Preview artikel siap dibagikan.</p>
  <p><a href="${o(I)}">Buka artikel</a></p>
</body>
</html>`;return s(a,200,j)}catch(e){return console.error("article-share error",e),s(a,500,`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Artikel - PC IPM Panawuan</title>
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Gagal memuat preview artikel.</p>
  <p><a href="${o(h)}">Buka artikel</a></p>
</body>
</html>`)}}},35193,e=>{"use strict";var a=e.i(26747),t=e.i(90406),i=e.i(44898),n=e.i(62950),r=e.i(34777),o=e.i(7031),s=e.i(81927),d=e.i(46432);let l=(0,n.hoist)(r,"default"),m=(0,n.hoist)(r,"config"),g=new i.PagesAPIRouteModule({definition:{kind:t.RouteKind.PAGES_API,page:"/api/_article-share",pathname:"/api/_article-share",bundlePath:"",filename:""},userland:r,distDir:".next",relativeProjectDir:""});async function p(e,t,i){i.requestMeta&&(0,d.setRequestMeta)(e,i.requestMeta),g.isDev&&(0,d.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let n="/api/_article-share";n=n.replace(/\/index$/,"")||"/";let r=await g.prepare(e,t,{srcPage:n});if(!r){t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve());return}let{query:l,params:m,prerenderManifest:p,routerServerContext:u}=r;try{let a,i=e.method||"GET",r=(0,o.getTracer)(),d=r.getActiveScopeSpan(),c=!!(null==u?void 0:u.isWrappedByNextServer),h=g.instrumentationOnRequestError.bind(g),w=async o=>g.render(e,t,{query:{...l,...m},params:m,allowedRevalidateHeaderKeys:[],multiZoneDraftMode:!1,trustHostHeader:!1,previewProps:p.preview,propagateError:!1,dev:g.isDev,page:"/api/_article-share",internalRevalidate:null==u?void 0:u.revalidate,onError:(...a)=>h(e,...a)}).finally(()=>{if(!o)return;o.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let e=r.getRootSpanAttributes();if(!e)return;if(e.get("next.span_type")!==s.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${e.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let d=e.get("next.route");if(d){let e=`${i} ${d}`;o.setAttributes({"next.route":d,"http.route":d,"next.span_name":e}),o.updateName(e),a&&a!==o&&(a.setAttribute("http.route",d),a.updateName(e))}else o.updateName(`${i} ${n}`)});c&&d?await w(d):(a=r.getActiveScopeSpan(),await r.withPropagatedContext(e.headers,()=>r.trace(s.BaseServerSpan.handleRequest,{spanName:`${i} ${n}`,kind:o.SpanKind.SERVER,attributes:{"http.method":i,"http.target":e.url}},w),void 0,!c))}catch(e){if(g.isDev)throw e;(0,a.sendError)(t,500,"Internal Server Error")}finally{null==i.waitUntil||i.waitUntil.call(i,Promise.resolve())}}e.s(["config",0,m,"default",0,l,"handler",0,p])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__09dff60._.js.map