module.exports=[36102,a=>{"use strict";var b=a.i(7997);let c=[{href:"/admin",label:"Dashboard",icon:"fa-tachometer-alt",exact:!0},{href:"/admin/users",label:"Manajemen User",icon:"fa-users"},{href:"/admin/questions",label:"Bank Soal Quiz",icon:"fa-question-circle"},{href:"/admin/materials",label:"Materi",icon:"fa-book"},{href:"/admin/organization",label:"Struktur Org.",icon:"fa-sitemap"},{href:"/admin/attendance",label:"Absensi",icon:"fa-clipboard-check"},{href:"/admin/notifications",label:"Notifikasi",icon:"fa-bell"},{href:"/admin/forms",label:"Form & PKDTM1",icon:"fa-wpforms"},{href:"/admin/settings",label:"Pengaturan",icon:"fa-cog"}];a.s(["default",0,function({children:a}){return(0,b.jsxs)("div",{className:"admin-shell",children:[(0,b.jsxs)("aside",{className:"admin-sidebar",id:"admin-sidebar","aria-label":"Admin Navigation",children:[(0,b.jsxs)("div",{className:"admin-sidebar-header",children:[(0,b.jsxs)("div",{className:"admin-brand",children:[(0,b.jsx)("img",{src:"/ipm-logo.png",alt:"Logo IPM",className:"admin-brand-logo"}),(0,b.jsxs)("div",{className:"admin-brand-text",children:[(0,b.jsx)("span",{className:"admin-brand-name",children:"IPM Panawuan"}),(0,b.jsx)("span",{className:"admin-brand-role",children:"Panel Admin"})]})]}),(0,b.jsx)("button",{className:"admin-sidebar-close",id:"admin-sidebar-close","aria-label":"Tutup sidebar",children:(0,b.jsx)("i",{className:"fas fa-times"})})]}),(0,b.jsx)("nav",{className:"admin-nav","aria-label":"Admin menu",children:(0,b.jsx)("ul",{className:"admin-nav-list",children:c.map(a=>(0,b.jsx)("li",{children:(0,b.jsxs)("a",{href:a.href,className:"admin-nav-link","data-exact":a.exact?"true":void 0,children:[(0,b.jsx)("span",{className:"admin-nav-icon",children:(0,b.jsx)("i",{className:`fas ${a.icon}`})}),(0,b.jsx)("span",{className:"admin-nav-label",children:a.label})]})},a.href))})}),(0,b.jsxs)("div",{className:"admin-sidebar-footer",children:[(0,b.jsxs)("a",{href:"/",className:"admin-nav-link",target:"_blank",rel:"noopener",children:[(0,b.jsx)("span",{className:"admin-nav-icon",children:(0,b.jsx)("i",{className:"fas fa-external-link-alt"})}),(0,b.jsx)("span",{className:"admin-nav-label",children:"Lihat Website"})]}),(0,b.jsxs)("button",{className:"admin-nav-link admin-logout-btn",id:"admin-logout-btn",children:[(0,b.jsx)("span",{className:"admin-nav-icon",children:(0,b.jsx)("i",{className:"fas fa-sign-out-alt"})}),(0,b.jsx)("span",{className:"admin-nav-label",children:"Keluar"})]})]})]}),(0,b.jsx)("div",{className:"admin-sidebar-overlay",id:"admin-sidebar-overlay","aria-hidden":"true"}),(0,b.jsxs)("div",{className:"admin-main",children:[(0,b.jsxs)("header",{className:"admin-topbar",children:[(0,b.jsx)("button",{className:"admin-topbar-toggle",id:"admin-sidebar-toggle","aria-label":"Toggle sidebar",children:(0,b.jsx)("i",{className:"fas fa-bars"})}),(0,b.jsx)("div",{className:"admin-topbar-breadcrumb",id:"admin-breadcrumb",children:(0,b.jsx)("span",{children:"Admin"})}),(0,b.jsx)("div",{className:"admin-topbar-actions",children:(0,b.jsxs)("div",{className:"admin-user-chip",id:"admin-user-chip",children:[(0,b.jsx)("i",{className:"fas fa-user-shield"}),(0,b.jsx)("span",{id:"admin-username-display",children:"Admin"})]})})]}),(0,b.jsx)("main",{className:"admin-content",id:"admin-page-content",children:a})]}),(0,b.jsx)("link",{rel:"stylesheet",href:"/app/css/style.css"}),(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:`
            // Active nav link
            document.addEventListener('DOMContentLoaded', function() {
              const links = document.querySelectorAll('.admin-nav-link');
              const path = window.location.pathname;
              links.forEach(link => {
                const href = link.getAttribute('href');
                const isExact = link.dataset.exact === 'true';
                const isActive = isExact ? path === href : path.startsWith(href);
                if (isActive) link.classList.add('active');
              });

              // Mobile sidebar toggle
              const toggle = document.getElementById('admin-sidebar-toggle');
              const sidebar = document.getElementById('admin-sidebar');
              const overlay = document.getElementById('admin-sidebar-overlay');
              const close = document.getElementById('admin-sidebar-close');

              function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
              function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

              toggle?.addEventListener('click', openSidebar);
              overlay?.addEventListener('click', closeSidebar);
              close?.addEventListener('click', closeSidebar);

              // Load admin user
              fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('ipm_session') || '') } })
                .then(r => r.json())
                .then(d => {
                  if (d.status === 'success') {
                    document.getElementById('admin-username-display').textContent = d.user?.nama_panjang || d.user?.username || 'Admin';
                  }
                }).catch(() => {});

              // Logout
              document.getElementById('admin-logout-btn')?.addEventListener('click', function() {
                if (!confirm('Yakin ingin keluar?')) return;
                fetch('/api/auth/logout', { method: 'DELETE' }).finally(() => {
                  localStorage.removeItem('ipm_session');
                  window.location.href = '/login';
                });
              });
            });
          `}})]})},"metadata",0,{title:{template:"%s | Admin IPM Panawuan",default:"Panel Admin | PC IPM Panawuan"},robots:{index:!1,follow:!1}}])},44067,a=>{a.n(a.i(36102))}];

//# sourceMappingURL=src_app_admin_layout_tsx_0at4vto._.js.map