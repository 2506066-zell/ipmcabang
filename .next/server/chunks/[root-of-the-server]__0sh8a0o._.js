module.exports=[70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},54799,(e,t,a)=>{t.exports=e.x("crypto",()=>require("crypto"))},86651,(e,t,a)=>{let r=e.r(54799);function i(e){e.setHeader("X-Content-Type-Options","nosniff"),e.setHeader("X-Frame-Options","DENY"),e.setHeader("Referrer-Policy","strict-origin-when-cross-origin"),e.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()"),e.setHeader("Cross-Origin-Opener-Policy","same-origin"),e.setHeader("Cross-Origin-Resource-Policy","same-site"),e.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains; preload")}t.exports={json:function(e,t,a,n){let o=JSON.stringify(a??{}),l=r.createHash("sha1").update(o).digest("hex");i(e),e.setHeader("Content-Type","application/json"),e.setHeader("ETag",l),n&&Object.entries(n).forEach(([t,a])=>e.setHeader(t,a)),e.status(t).send(o)},cacheHeaders:function(e){let t=Number(e||60);return{"Cache-Control":`public, s-maxage=${t}, stale-while-revalidate=${5*t}`}},getBearerToken:function(e){let t=String(e?.headers?.authorization||"");return t.startsWith("Bearer ")?t.slice(7).trim():""},parseJsonBody:function(e){let t=e&&void 0!==e.body?e.body:{};if("string"==typeof t)try{return JSON.parse(t||"{}")}catch{return{}}return t||{}},applySecurityHeaders:i}},34777,(e,t,a)=>{let r=(()=>{let e=Error("Cannot find module '../models/ArticleModel'");throw e.code="MODULE_NOT_FOUND",e})(),{applySecurityHeaders:i}=e.r(86651),n=/<!--\s*HOOK_SUMMARY:([\s\S]*?)-->/gi;function o(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function l(e,t,a){i(e),e.setHeader("Content-Type","text/html; charset=utf-8"),e.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=1800"),e.status(t).send(a)}t.exports=async(e,t)=>{var a,s,p,c;let m,d;if("GET"!==e.method&&"HEAD"!==e.method)return i(t),t.status(405).send("Method Not Allowed");let g=String(e.query&&e.query.slug||"").trim();if(!g)return l(t,200,`<!doctype html>
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
</html>`);let u=(m=String(e.headers["x-forwarded-proto"]||"https").split(",")[0].trim(),d=String(e.headers["x-forwarded-host"]||e.headers.host||"").split(",")[0].trim(),`${m}://${d}`),h=`/articles/${encodeURIComponent(g)}`;try{let e,i,m,d,y,w,f=await r.findBySlug(g);if(!f){let e="Artikel Tidak Ditemukan - PC IPM Panawuan",a="Artikel yang kamu cari tidak tersedia.",r=new URL("/ipm%20(2).png",u).toString(),i=new URL(h,u).toString(),n=`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${o(e)}</title>
  <meta name="description" content="${o(a)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${o(e)}">
  <meta property="og:description" content="${o(a)}">
  <meta property="og:image" content="${o(r)}">
  <meta property="og:image:url" content="${o(r)}">
  <meta property="og:image:secure_url" content="${o(r)}">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:url" content="${o(i)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${o(e)}">
  <meta name="twitter:description" content="${o(a)}">
  <meta name="twitter:image" content="${o(r)}">
  <meta name="twitter:image:alt" content="${o(e)}">
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Artikel tidak ditemukan.</p>
  <p><a href="/articles">Kembali ke daftar artikel</a></p>
</body>
</html>`;return l(t,404,n)}let $=String(f.slug||g).trim(),S=`/articles/${encodeURIComponent($)}`,P=`/articles?slug=${encodeURIComponent(String($||"").trim())}`,b=`${f.title||"Artikel Organisasi"} - PC IPM Panawuan`,k=(m=(c=(p=f).content||"",e="",i=String(c||"").replace(n,(t,a)=>{if(!e)try{e=decodeURIComponent(String(a||"").trim())}catch{e=String(a||"").trim()}return""}),{summary:String(e||"").replace(/\s+/g," ").trim(),content:String(i||"").trim()}),(d=String(p.summary||p.excerpt||m.summary||m.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())?d.length<=180?d:`${d.slice(0,180).trim()}...`:"Baca artikel terbaru dari PC IPM Panawuan."),v=new URL(`/api/article-share-image/${encodeURIComponent($)}.jpg`,u).toString(),x=(a=f.image,y=String(a||"").trim(),/^data:image\/png/i.test(y)?"image/png":/^data:image\/webp/i.test(y)?"image/webp":/^data:image\/gif/i.test(y)?"image/gif":/^data:image\/jpeg/i.test(y)||/^data:image\/jpg/i.test(y)?"image/jpeg":/\.png(\?|$)/i.test(y)?"image/png":/\.webp(\?|$)/i.test(y)?"image/webp":/\.gif(\?|$)/i.test(y)?"image/gif":"image/jpeg"),R=new URL(S,u).toString(),C=(s=f.publish_date||f.created_at||Date.now(),w=new Date(s||Date.now()),Number.isNaN(w.getTime())?new Date().toISOString():w.toISOString()),I=`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${o(b)}</title>
  <meta name="description" content="${o(k)}">
  <link rel="canonical" href="${o(R)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${o(b)}">
  <meta property="og:site_name" content="PC IPM Panawuan">
  <meta property="og:description" content="${o(k)}">
  <meta property="og:image" content="${o(v)}">
  <meta property="og:image:url" content="${o(v)}">
  <meta property="og:image:secure_url" content="${o(v)}">
  <meta property="og:image:type" content="${o(x)}">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:image:alt" content="${o(f.title||"Thumbnail artikel PC IPM Panawuan")}">
  <meta property="og:url" content="${o(R)}">
  <meta property="article:published_time" content="${o(C)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${o(b)}">
  <meta name="twitter:description" content="${o(k)}">
  <meta name="twitter:image" content="${o(v)}">
  <meta name="twitter:image:alt" content="${o(f.title||"Thumbnail artikel PC IPM Panawuan")}">
  <meta name="twitter:url" content="${o(R)}">
  <script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:f.title||"Artikel Organisasi",author:f.author||"Redaksi IPM Panawuan",datePublished:C,image:[v],mainEntityOfPage:R})}</script>
</head>
<body>
  <script>
    (function () {
      try {
        window.location.replace(${JSON.stringify(P)});
      } catch (e) {}
    })();
  </script>
  <noscript>
    <p>Mengarahkan ke artikel...</p>
    <p><a href="${o(P)}">Buka artikel</a></p>
  </noscript>
  <p>Preview artikel siap dibagikan.</p>
  <p><a href="${o(P)}">Buka artikel</a></p>
</body>
</html>`;return l(t,200,I)}catch(e){return console.error("article-share error",e),l(t,500,`<!doctype html>
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
</html>`)}}},91784,e=>{"use strict";var t=e.i(26747),a=e.i(90406),r=e.i(44898),i=e.i(62950);let n=e.r(34777);async function o(e,t){return n(e,t)}e.s(["default",0,o],33022);var l=e.i(33022),s=e.i(7031),p=e.i(81927),c=e.i(46432);let m=(0,i.hoist)(l,"default"),d=(0,i.hoist)(l,"config"),g=new r.PagesAPIRouteModule({definition:{kind:a.RouteKind.PAGES_API,page:"/api/article-share",pathname:"/api/article-share",bundlePath:"",filename:""},userland:l,distDir:".next",relativeProjectDir:""});async function u(e,a,r){r.requestMeta&&(0,c.setRequestMeta)(e,r.requestMeta),g.isDev&&(0,c.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let i="/api/article-share";i=i.replace(/\/index$/,"")||"/";let n=await g.prepare(e,a,{srcPage:i});if(!n){a.statusCode=400,a.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve());return}let{query:o,params:l,prerenderManifest:m,routerServerContext:d}=n;try{let t,r=e.method||"GET",n=(0,s.getTracer)(),c=n.getActiveScopeSpan(),u=!!(null==d?void 0:d.isWrappedByNextServer),h=g.instrumentationOnRequestError.bind(g),y=async s=>g.render(e,a,{query:{...o,...l},params:l,allowedRevalidateHeaderKeys:[],multiZoneDraftMode:!1,trustHostHeader:!1,previewProps:m.preview,propagateError:!1,dev:g.isDev,page:"/api/article-share",internalRevalidate:null==d?void 0:d.revalidate,onError:(...t)=>h(e,...t)}).finally(()=>{if(!s)return;s.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let e=n.getRootSpanAttributes();if(!e)return;if(e.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${e.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=e.get("next.route");if(o){let e=`${r} ${o}`;s.setAttributes({"next.route":o,"http.route":o,"next.span_name":e}),s.updateName(e),t&&t!==s&&(t.setAttribute("http.route",o),t.updateName(e))}else s.updateName(`${r} ${i}`)});u&&c?await y(c):(t=n.getActiveScopeSpan(),await n.withPropagatedContext(e.headers,()=>n.trace(p.BaseServerSpan.handleRequest,{spanName:`${r} ${i}`,kind:s.SpanKind.SERVER,attributes:{"http.method":r,"http.target":e.url}},y),void 0,!u))}catch(e){if(g.isDev)throw e;(0,t.sendError)(a,500,"Internal Server Error")}finally{null==r.waitUntil||r.waitUntil.call(r,Promise.resolve())}}e.s(["config",0,d,"default",0,m,"handler",0,u],91784)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0sh8a0o._.js.map