import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard Admin' };

export default function AdminDashboardPage() {
  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <i className="fas fa-tachometer-alt"></i>
          Dashboard
        </h1>
        <p className="admin-page-subtitle">Selamat datang di panel administrasi PC IPM Panawuan</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid" id="admin-stats-grid">
        {[
          { id: 'total-users', label: 'Total Kader', icon: 'fa-users', color: 'blue' },
          { id: 'total-questions', label: 'Bank Soal', icon: 'fa-question-circle', color: 'purple' },
          { id: 'total-materials', label: 'Materi', icon: 'fa-book', color: 'green' },
          { id: 'active-sessions', label: 'Sesi Aktif', icon: 'fa-signal', color: 'amber' },
        ].map((stat) => (
          <div key={stat.id} className={`stat-card stat-card--${stat.color}`}>
            <div className="stat-card-icon">
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="stat-card-body">
              <div className="stat-card-value" id={stat.id}>—</div>
              <div className="stat-card-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="admin-section">
        <h2 className="admin-section-title">Aksi Cepat</h2>
        <div className="admin-quick-actions">
          <a href="/admin/users" className="quick-action-card">
            <i className="fas fa-user-plus"></i>
            <span>Tambah Kader</span>
          </a>
          <a href="/admin/questions" className="quick-action-card">
            <i className="fas fa-plus-circle"></i>
            <span>Tambah Soal</span>
          </a>
          <a href="/admin/notifications" className="quick-action-card">
            <i className="fas fa-paper-plane"></i>
            <span>Kirim Notif</span>
          </a>
          <a href="/admin/attendance" className="quick-action-card">
            <i className="fas fa-clipboard-check"></i>
            <span>Monitor Absensi</span>
          </a>
          <a href="/admin/organization" className="quick-action-card">
            <i className="fas fa-sitemap"></i>
            <span>Update Struktur</span>
          </a>
          <a href="/admin/forms" className="quick-action-card">
            <i className="fas fa-wpforms"></i>
            <span>Kelola PKDTM1</span>
          </a>
        </div>
      </div>

      {/* Recent Activity Logs */}
      <div className="admin-section">
        <h2 className="admin-section-title">Log Aktivitas Terbaru</h2>
        <div className="admin-table-container">
          <table className="admin-table" id="activity-log-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aksi</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody id="activity-log-body">
              <tr>
                <td colSpan={3} className="admin-table-empty">
                  <i className="fas fa-spinner fa-spin"></i> Memuat log...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />
    </>
  );
}
