module.exports=[93695,(a,b,c)=>{b.exports=a.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},71306,(a,b,c)=>{b.exports=a.r(18622)},79847,a=>{a.n(a.i(3343))},9185,a=>{a.n(a.i(29432))},72842,a=>{a.n(a.i(75164))},54897,a=>{a.n(a.i(30106))},56157,a=>{a.n(a.i(18970))},94331,a=>{a.n(a.i(60644))},15988,a=>{a.n(a.i(56952))},25766,a=>{a.n(a.i(77341))},29725,a=>{a.n(a.i(94290))},90833,a=>{a.n(a.i(46994))},5785,a=>{a.n(a.i(90588))},74793,a=>{a.n(a.i(33169))},85826,a=>{a.n(a.i(37111))},21565,a=>{a.n(a.i(41763))},65911,a=>{a.n(a.i(8950))},25128,a=>{a.n(a.i(91562))},40781,a=>{a.n(a.i(49670))},69411,a=>{a.n(a.i(75700))},63081,a=>{a.n(a.i(276))},62837,a=>{a.n(a.i(40795))},34607,a=>{a.n(a.i(11614))},96338,a=>{a.n(a.i(21751))},50642,a=>{a.n(a.i(12213))},32242,a=>{a.n(a.i(22693))},88530,a=>{a.n(a.i(10531))},8583,a=>{a.n(a.i(1082))},38534,a=>{a.n(a.i(98175))},70408,a=>{a.n(a.i(9095))},22922,a=>{a.n(a.i(96772))},78294,a=>{a.n(a.i(71717))},16625,a=>{a.n(a.i(85034))},88648,a=>{a.n(a.i(68113))},51914,a=>{a.n(a.i(66482))},25466,a=>{a.n(a.i(91505))},25657,a=>{"use strict";var b=a.i(7997);a.s(["default",0,function(){return(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)("div",{className:"admin-page-header",children:[(0,b.jsxs)("h1",{className:"admin-page-title",children:[(0,b.jsx)("i",{className:"fas fa-tachometer-alt"}),"Dashboard"]}),(0,b.jsx)("p",{className:"admin-page-subtitle",children:"Selamat datang di panel administrasi PC IPM Panawuan"})]}),(0,b.jsx)("div",{className:"admin-stats-grid",id:"admin-stats-grid",children:[{id:"total-users",label:"Total Kader",icon:"fa-users",color:"blue"},{id:"total-questions",label:"Bank Soal",icon:"fa-question-circle",color:"purple"},{id:"total-materials",label:"Materi",icon:"fa-book",color:"green"},{id:"active-sessions",label:"Sesi Aktif",icon:"fa-signal",color:"amber"}].map(a=>(0,b.jsxs)("div",{className:`stat-card stat-card--${a.color}`,children:[(0,b.jsx)("div",{className:"stat-card-icon",children:(0,b.jsx)("i",{className:`fas ${a.icon}`})}),(0,b.jsxs)("div",{className:"stat-card-body",children:[(0,b.jsx)("div",{className:"stat-card-value",id:a.id,children:"—"}),(0,b.jsx)("div",{className:"stat-card-label",children:a.label})]})]},a.id))}),(0,b.jsxs)("div",{className:"admin-section",children:[(0,b.jsx)("h2",{className:"admin-section-title",children:"Aksi Cepat"}),(0,b.jsxs)("div",{className:"admin-quick-actions",children:[(0,b.jsxs)("a",{href:"/admin/users",className:"quick-action-card",children:[(0,b.jsx)("i",{className:"fas fa-user-plus"}),(0,b.jsx)("span",{children:"Tambah Kader"})]}),(0,b.jsxs)("a",{href:"/admin/questions",className:"quick-action-card",children:[(0,b.jsx)("i",{className:"fas fa-plus-circle"}),(0,b.jsx)("span",{children:"Tambah Soal"})]}),(0,b.jsxs)("a",{href:"/admin/notifications",className:"quick-action-card",children:[(0,b.jsx)("i",{className:"fas fa-paper-plane"}),(0,b.jsx)("span",{children:"Kirim Notif"})]}),(0,b.jsxs)("a",{href:"/admin/attendance",className:"quick-action-card",children:[(0,b.jsx)("i",{className:"fas fa-clipboard-check"}),(0,b.jsx)("span",{children:"Monitor Absensi"})]}),(0,b.jsxs)("a",{href:"/admin/organization",className:"quick-action-card",children:[(0,b.jsx)("i",{className:"fas fa-sitemap"}),(0,b.jsx)("span",{children:"Update Struktur"})]}),(0,b.jsxs)("a",{href:"/admin/forms",className:"quick-action-card",children:[(0,b.jsx)("i",{className:"fas fa-wpforms"}),(0,b.jsx)("span",{children:"Kelola PKDTM1"})]})]})]}),(0,b.jsxs)("div",{className:"admin-section",children:[(0,b.jsx)("h2",{className:"admin-section-title",children:"Log Aktivitas Terbaru"}),(0,b.jsx)("div",{className:"admin-table-container",children:(0,b.jsxs)("table",{className:"admin-table",id:"activity-log-table",children:[(0,b.jsx)("thead",{children:(0,b.jsxs)("tr",{children:[(0,b.jsx)("th",{children:"Waktu"}),(0,b.jsx)("th",{children:"Aksi"}),(0,b.jsx)("th",{children:"Detail"})]})}),(0,b.jsx)("tbody",{id:"activity-log-body",children:(0,b.jsx)("tr",{children:(0,b.jsxs)("td",{colSpan:3,className:"admin-table-empty",children:[(0,b.jsx)("i",{className:"fas fa-spinner fa-spin"})," Memuat log..."]})})})]})})]}),(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:`
            // Load dashboard stats
            async function loadStats() {
              try {
                const session = localStorage.getItem('ipm_session') || '';
                const headers = { 'Authorization': 'Bearer ' + session };

                const [usersRes, questionsRes] = await Promise.all([
                  fetch('/api/users?action=extended', { headers }),
                  fetch('/api/admin/questions?size=1', { headers })
                ]);

                const users = await usersRes.json();
                const questions = await questionsRes.json();

                if (users.status === 'success') {
                  document.getElementById('total-users').textContent = users.users?.length ?? '—';
                  const active = users.users?.filter(u => u.active).length ?? 0;
                  document.getElementById('active-sessions').textContent = active;
                }
                if (questions.status === 'success') {
                  document.getElementById('total-questions').textContent = questions.total ?? '—';
                }
              } catch(e) {
                console.error('Stats load error:', e);
              }
            }

            // Load activity logs
            async function loadActivityLogs() {
              try {
                const session = localStorage.getItem('ipm_session') || '';
                const res = await fetch('/api/analytics?action=activityLogs&limit=20', {
                  headers: { 'Authorization': 'Bearer ' + session }
                });
                const data = await res.json();
                const tbody = document.getElementById('activity-log-body');
                if (data.status === 'success' && data.logs?.length) {
                  tbody.innerHTML = data.logs.map(log => \`
                    <tr>
                      <td class="text-muted" style="font-size:0.8rem">\${new Date(log.created_at).toLocaleString('id-ID')}</td>
                      <td><span class="badge badge-green">\${log.action || '-'}</span></td>
                      <td style="font-size:0.8rem">\${JSON.stringify(log.details || {}).slice(0, 100)}</td>
                    </tr>
                  \`).join('');
                } else {
                  tbody.innerHTML = '<tr><td colspan="3" class="admin-table-empty">Belum ada log aktivitas.</td></tr>';
                }
              } catch(e) {
                document.getElementById('activity-log-body').innerHTML = '<tr><td colspan="3" class="admin-table-empty text-muted">Gagal memuat log.</td></tr>';
              }
            }

            document.addEventListener('DOMContentLoaded', function() {
              loadStats();
              loadActivityLogs();
            });
          `}})]})},"metadata",0,{title:"Dashboard Admin"}])},50427,a=>{a.n(a.i(25657))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0652u95._.js.map