module.exports=[70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},54799,(e,t,a)=>{t.exports=e.x("crypto",()=>require("crypto"))},86651,(e,t,a)=>{let r=e.r(54799);function n(e){e.setHeader("X-Content-Type-Options","nosniff"),e.setHeader("X-Frame-Options","DENY"),e.setHeader("Referrer-Policy","strict-origin-when-cross-origin"),e.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()"),e.setHeader("Cross-Origin-Opener-Policy","same-origin"),e.setHeader("Cross-Origin-Resource-Policy","same-site"),e.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains; preload")}t.exports={json:function(e,t,a,i){let o=JSON.stringify(a??{}),s=r.createHash("sha1").update(o).digest("hex");n(e),e.setHeader("Content-Type","application/json"),e.setHeader("ETag",s),i&&Object.entries(i).forEach(([t,a])=>e.setHeader(t,a)),e.status(t).send(o)},cacheHeaders:function(e){let t=Number(e||60);return{"Cache-Control":`public, s-maxage=${t}, stale-while-revalidate=${5*t}`}},getBearerToken:function(e){let t=String(e?.headers?.authorization||"");return t.startsWith("Bearer ")?t.slice(7).trim():""},parseJsonBody:function(e){let t=e&&void 0!==e.body?e.body:{};if("string"==typeof t)try{return JSON.parse(t||"{}")}catch{return{}}return t||{}},applySecurityHeaders:n}},14747,(e,t,a)=>{t.exports=e.x("path",()=>require("path"))},22734,(e,t,a)=>{t.exports=e.x("fs",()=>require("fs"))},26014,(e,t,a)=>{let{applySecurityHeaders:r}=e.r(86651);function n(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}e.r(22734),e.r(14747),t.exports=async(e,t)=>{let a,i;if("GET"!==e.method&&"HEAD"!==e.method)return r(t),t.status(405).send("Method Not Allowed");let o=(a=String(e.headers["x-forwarded-proto"]||"https").split(",")[0].trim(),i=String(e.headers["x-forwarded-host"]||e.headers.host||"").split(",")[0].trim(),`${a}://${i}`),s="Daftar PKDTM 1 — Membumikan Identitas, Melahirkan Peradaban",p="Ayo bergabung dalam Pelatihan Kader Dasar Taruna Melati 1 (PKDTM1) - PC IPM Panawuan. Jadilah kader dasar yang militan! Daftar sekarang!",l=`${o}/pkdtm1-banner-16-9.png`,d=`${o}/pendaftaran-pkdtm1.html`,c="/pendaftaran-pkdtm1.html",m=`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${n(s)}</title>
  <meta name="description" content="${n(p)}">
  <link rel="canonical" href="${n(d)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${n(s)}">
  <meta property="og:site_name" content="PC IPM Panawuan">
  <meta property="og:description" content="${n(p)}">
  <meta property="og:image" content="${n(l)}">
  <meta property="og:image:url" content="${n(l)}">
  <meta property="og:image:secure_url" content="${n(l)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:image:alt" content="PKDTM 1 - Membumikan Identitas, Melahirkan Peradaban">
  <meta property="og:url" content="${n(d)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${n(s)}">
  <meta name="twitter:description" content="${n(p)}">
  <meta name="twitter:image" content="${n(l)}">
  <meta name="twitter:image:alt" content="PKDTM 1 - Membumikan Identitas, Melahirkan Peradaban">
  <meta name="twitter:url" content="${n(d)}">
</head>
<body>
  <script>
    (function () {
      try {
        window.location.replace(${JSON.stringify(c)});
      } catch (e) {}
    })();
  </script>
  <noscript>
    <p>Mengarahkan ke halaman pendaftaran...</p>
    <p><a href="${n(c)}">Buka halaman pendaftaran PKDTM1</a></p>
  </noscript>
  <p><a href="${n(c)}">Buka halaman pendaftaran PKDTM1</a></p>
</body>
</html>`;r(t),t.setHeader("Content-Type","text/html; charset=utf-8"),t.setHeader("Cache-Control","public, s-maxage=600, stale-while-revalidate=3600"),t.status(200).send(m)}},14698,e=>{"use strict";var t=e.i(26747),a=e.i(90406),r=e.i(44898),n=e.i(62950),i=e.i(26014),o=e.i(7031),s=e.i(81927),p=e.i(46432);let l=(0,n.hoist)(i,"default"),d=(0,n.hoist)(i,"config"),c=new r.PagesAPIRouteModule({definition:{kind:a.RouteKind.PAGES_API,page:"/api/_pkdtm1-share",pathname:"/api/_pkdtm1-share",bundlePath:"",filename:""},userland:i,distDir:".next",relativeProjectDir:""});async function m(e,a,r){r.requestMeta&&(0,p.setRequestMeta)(e,r.requestMeta),c.isDev&&(0,p.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let n="/api/_pkdtm1-share";n=n.replace(/\/index$/,"")||"/";let i=await c.prepare(e,a,{srcPage:n});if(!i){a.statusCode=400,a.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve());return}let{query:l,params:d,prerenderManifest:m,routerServerContext:u}=i;try{let t,r=e.method||"GET",i=(0,o.getTracer)(),p=i.getActiveScopeSpan(),h=!!(null==u?void 0:u.isWrappedByNextServer),g=c.instrumentationOnRequestError.bind(c),y=async o=>c.render(e,a,{query:{...l,...d},params:d,allowedRevalidateHeaderKeys:[],multiZoneDraftMode:!1,trustHostHeader:!1,previewProps:m.preview,propagateError:!1,dev:c.isDev,page:"/api/_pkdtm1-share",internalRevalidate:null==u?void 0:u.revalidate,onError:(...t)=>g(e,...t)}).finally(()=>{if(!o)return;o.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let e=i.getRootSpanAttributes();if(!e)return;if(e.get("next.span_type")!==s.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${e.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let p=e.get("next.route");if(p){let e=`${r} ${p}`;o.setAttributes({"next.route":p,"http.route":p,"next.span_name":e}),o.updateName(e),t&&t!==o&&(t.setAttribute("http.route",p),t.updateName(e))}else o.updateName(`${r} ${n}`)});h&&p?await y(p):(t=i.getActiveScopeSpan(),await i.withPropagatedContext(e.headers,()=>i.trace(s.BaseServerSpan.handleRequest,{spanName:`${r} ${n}`,kind:o.SpanKind.SERVER,attributes:{"http.method":r,"http.target":e.url}},y),void 0,!h))}catch(e){if(c.isDev)throw e;(0,t.sendError)(a,500,"Internal Server Error")}finally{null==r.waitUntil||r.waitUntil.call(r,Promise.resolve())}}e.s(["config",0,d,"default",0,l,"handler",0,m])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__095dqdh._.js.map