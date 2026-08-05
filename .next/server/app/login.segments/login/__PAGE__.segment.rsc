1:"$Sreact.fragment"
4:I[97367,["/_next/static/chunks/01xlw8hd842-c.js","/_next/static/chunks/0d3shmwh5_nmn.js"],"OutletBoundary"]
5:"$Sreact.suspense"
:HL["/app/css/style.css","style"]
:HL["/ipm-logo.png","image"]
2:Taa2,
            document.addEventListener('DOMContentLoaded', function() {
              const form = document.getElementById('login-form');
              const btn = document.getElementById('login-btn');
              const errEl = document.getElementById('login-error');
              const toggleBtn = document.getElementById('toggle-password');
              const pwdInput = document.getElementById('password');

              // Toggle password visibility
              toggleBtn?.addEventListener('click', function() {
                const icon = document.getElementById('toggle-password-icon');
                if (pwdInput.type === 'password') {
                  pwdInput.type = 'text';
                  icon.className = 'fas fa-eye-slash';
                } else {
                  pwdInput.type = 'password';
                  icon.className = 'fas fa-eye';
                }
              });

              form?.addEventListener('submit', async function(e) {
                e.preventDefault();
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                errEl.hidden = true;

                const body = {
                  username: document.getElementById('username').value.trim(),
                  password: document.getElementById('password').value,
                };

                try {
                  const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  const data = await res.json();

                  if (data.status === 'success') {
                    localStorage.setItem('ipm_session', data.session);
                    const redirect = new URLSearchParams(location.search).get('redirect');
                    window.location.href = data.role === 'admin'
                      ? (redirect || '/admin')
                      : (redirect || '/');
                  } else {
                    errEl.textContent = data.message || 'Login gagal. Periksa kembali username dan password.';
                    errEl.hidden = false;
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
                  }
                } catch(err) {
                  errEl.textContent = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
                  errEl.hidden = false;
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
                }
              });
            });
          0:{"rsc":["$","$1","c",{"children":[[["$","link",null,{"rel":"stylesheet","href":"/app/css/style.css"}],["$","div",null,{"className":"auth-page","children":["$","div",null,{"className":"auth-container","children":[["$","div",null,{"className":"auth-brand","children":[["$","img",null,{"src":"/ipm-logo.png","alt":"Logo IPM","className":"auth-logo"}],["$","h1",null,{"className":"auth-title","children":"PC IPM Panawuan"}],["$","p",null,{"className":"auth-subtitle","children":"Masuk ke akun kader Anda"}]]}],["$","form",null,{"className":"auth-form","id":"login-form","noValidate":true,"children":[["$","div",null,{"className":"form-group","children":[["$","label",null,{"className":"form-label","htmlFor":"username","children":"Username"}],["$","input",null,{"type":"text","id":"username","name":"username","className":"form-control","placeholder":"Masukkan username","autoComplete":"username","required":true}]]}],["$","div",null,{"className":"form-group","children":[["$","label",null,{"className":"form-label","htmlFor":"password","children":"Password"}],["$","div",null,{"style":{"position":"relative"},"children":[["$","input",null,{"type":"password","id":"password","name":"password","className":"form-control","placeholder":"Masukkan password","autoComplete":"current-password","required":true}],["$","button",null,{"type":"button","id":"toggle-password","className":"btn btn-ghost btn-sm","style":{"position":"absolute","right":8,"top":"50%","transform":"translateY(-50%)","padding":"4px 8px"},"aria-label":"Toggle password visibility","children":["$","i",null,{"className":"fas fa-eye","id":"toggle-password-icon"}]}]]}]]}],["$","div",null,{"id":"login-error","className":"auth-error","hidden":true}],["$","button",null,{"type":"submit","className":"btn btn-primary btn-block","id":"login-btn","children":[["$","i",null,{"className":"fas fa-sign-in-alt"}]," Masuk"]}]]}],["$","div",null,{"className":"auth-links","children":["$","p",null,{"children":["Belum punya akun? ",["$","a",null,{"href":"/register","children":"Daftar sekarang"}]]}]}],["$","div",null,{"className":"auth-divider","children":["$","span",null,{"children":"atau"}]}],["$","button",null,{"className":"btn btn-secondary btn-block","id":"webauthn-login-btn","type":"button","children":[["$","i",null,{"className":"fas fa-fingerprint"}]," Masuk dengan Biometrik"]}]]}]}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$2"}}]],null,"$L3"]}],"isPartial":false,"staleTime":300,"varyParams":null,"buildId":"uLQQ5nC0YAy9ENQGnE9De"}
3:["$","$L4",null,{"children":["$","$5",null,{"name":"Next.MetadataOutlet","children":"$@6"}]}]
6:null
