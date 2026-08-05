1:"$Sreact.fragment"
4:I[97367,["/_next/static/chunks/01xlw8hd842-c.js","/_next/static/chunks/0d3shmwh5_nmn.js"],"OutletBoundary"]
5:"$Sreact.suspense"
2:Tac9,
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
                  tbody.innerHTML = data.logs.map(log => `
                    <tr>
                      <td class="text-muted" style="font-size:0.8rem">${new Date(log.created_at).toLocaleString('id-ID')}</td>
                      <td><span class="badge badge-green">${log.action || '-'}</span></td>
                      <td style="font-size:0.8rem">${JSON.stringify(log.details || {}).slice(0, 100)}</td>
                    </tr>
                  `).join('');
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
          0:{"rsc":["$","$1","c",{"children":[[["$","div",null,{"className":"admin-page-header","children":[["$","h1",null,{"className":"admin-page-title","children":[["$","i",null,{"className":"fas fa-tachometer-alt"}],"Dashboard"]}],["$","p",null,{"className":"admin-page-subtitle","children":"Selamat datang di panel administrasi PC IPM Panawuan"}]]}],["$","div",null,{"className":"admin-stats-grid","id":"admin-stats-grid","children":[["$","div","total-users",{"className":"stat-card stat-card--blue","children":[["$","div",null,{"className":"stat-card-icon","children":["$","i",null,{"className":"fas fa-users"}]}],["$","div",null,{"className":"stat-card-body","children":[["$","div",null,{"className":"stat-card-value","id":"total-users","children":"—"}],["$","div",null,{"className":"stat-card-label","children":"Total Kader"}]]}]]}],["$","div","total-questions",{"className":"stat-card stat-card--purple","children":[["$","div",null,{"className":"stat-card-icon","children":["$","i",null,{"className":"fas fa-question-circle"}]}],["$","div",null,{"className":"stat-card-body","children":[["$","div",null,{"className":"stat-card-value","id":"total-questions","children":"—"}],["$","div",null,{"className":"stat-card-label","children":"Bank Soal"}]]}]]}],["$","div","total-materials",{"className":"stat-card stat-card--green","children":[["$","div",null,{"className":"stat-card-icon","children":["$","i",null,{"className":"fas fa-book"}]}],["$","div",null,{"className":"stat-card-body","children":[["$","div",null,{"className":"stat-card-value","id":"total-materials","children":"—"}],["$","div",null,{"className":"stat-card-label","children":"Materi"}]]}]]}],["$","div","active-sessions",{"className":"stat-card stat-card--amber","children":[["$","div",null,{"className":"stat-card-icon","children":["$","i",null,{"className":"fas fa-signal"}]}],["$","div",null,{"className":"stat-card-body","children":[["$","div",null,{"className":"stat-card-value","id":"active-sessions","children":"—"}],["$","div",null,{"className":"stat-card-label","children":"Sesi Aktif"}]]}]]}]]}],["$","div",null,{"className":"admin-section","children":[["$","h2",null,{"className":"admin-section-title","children":"Aksi Cepat"}],["$","div",null,{"className":"admin-quick-actions","children":[["$","a",null,{"href":"/admin/users","className":"quick-action-card","children":[["$","i",null,{"className":"fas fa-user-plus"}],["$","span",null,{"children":"Tambah Kader"}]]}],["$","a",null,{"href":"/admin/questions","className":"quick-action-card","children":[["$","i",null,{"className":"fas fa-plus-circle"}],["$","span",null,{"children":"Tambah Soal"}]]}],["$","a",null,{"href":"/admin/notifications","className":"quick-action-card","children":[["$","i",null,{"className":"fas fa-paper-plane"}],["$","span",null,{"children":"Kirim Notif"}]]}],["$","a",null,{"href":"/admin/attendance","className":"quick-action-card","children":[["$","i",null,{"className":"fas fa-clipboard-check"}],["$","span",null,{"children":"Monitor Absensi"}]]}],["$","a",null,{"href":"/admin/organization","className":"quick-action-card","children":[["$","i",null,{"className":"fas fa-sitemap"}],["$","span",null,{"children":"Update Struktur"}]]}],["$","a",null,{"href":"/admin/forms","className":"quick-action-card","children":[["$","i",null,{"className":"fas fa-wpforms"}],["$","span",null,{"children":"Kelola PKDTM1"}]]}]]}]]}],["$","div",null,{"className":"admin-section","children":[["$","h2",null,{"className":"admin-section-title","children":"Log Aktivitas Terbaru"}],["$","div",null,{"className":"admin-table-container","children":["$","table",null,{"className":"admin-table","id":"activity-log-table","children":[["$","thead",null,{"children":["$","tr",null,{"children":[["$","th",null,{"children":"Waktu"}],["$","th",null,{"children":"Aksi"}],["$","th",null,{"children":"Detail"}]]}]}],["$","tbody",null,{"id":"activity-log-body","children":["$","tr",null,{"children":["$","td",null,{"colSpan":3,"className":"admin-table-empty","children":[["$","i",null,{"className":"fas fa-spinner fa-spin"}]," Memuat log..."]}]}]}]]}]}]]}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$2"}}]],null,"$L3"]}],"isPartial":false,"staleTime":300,"varyParams":null,"buildId":"uLQQ5nC0YAy9ENQGnE9De"}
3:["$","$L4",null,{"children":["$","$5",null,{"name":"Next.MetadataOutlet","children":"$@6"}]}]
6:null
