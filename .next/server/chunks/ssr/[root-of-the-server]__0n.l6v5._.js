module.exports=[93695,(a,b,c)=>{b.exports=a.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},71306,(a,b,c)=>{b.exports=a.r(18622)},79847,a=>{a.n(a.i(3343))},9185,a=>{a.n(a.i(29432))},72842,a=>{a.n(a.i(75164))},54897,a=>{a.n(a.i(30106))},56157,a=>{a.n(a.i(18970))},94331,a=>{a.n(a.i(60644))},15988,a=>{a.n(a.i(56952))},25766,a=>{a.n(a.i(77341))},29725,a=>{a.n(a.i(94290))},90833,a=>{a.n(a.i(46994))},5785,a=>{a.n(a.i(90588))},74793,a=>{a.n(a.i(33169))},85826,a=>{a.n(a.i(37111))},21565,a=>{a.n(a.i(41763))},65911,a=>{a.n(a.i(8950))},25128,a=>{a.n(a.i(91562))},40781,a=>{a.n(a.i(49670))},69411,a=>{a.n(a.i(75700))},63081,a=>{a.n(a.i(276))},62837,a=>{a.n(a.i(40795))},34607,a=>{a.n(a.i(11614))},96338,a=>{a.n(a.i(21751))},50642,a=>{a.n(a.i(12213))},32242,a=>{a.n(a.i(22693))},88530,a=>{a.n(a.i(10531))},8583,a=>{a.n(a.i(1082))},38534,a=>{a.n(a.i(98175))},70408,a=>{a.n(a.i(9095))},22922,a=>{a.n(a.i(96772))},78294,a=>{a.n(a.i(71717))},16625,a=>{a.n(a.i(85034))},88648,a=>{a.n(a.i(68113))},51914,a=>{a.n(a.i(66482))},25466,a=>{a.n(a.i(91505))},16594,a=>{"use strict";var b=a.i(7997);a.s(["default",0,function(){return(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)("link",{rel:"stylesheet",href:"/app/css/style.css"}),(0,b.jsx)("div",{className:"auth-page",children:(0,b.jsxs)("div",{className:"auth-container",children:[(0,b.jsxs)("div",{className:"auth-brand",children:[(0,b.jsx)("img",{src:"/ipm-logo.png",alt:"Logo IPM",className:"auth-logo"}),(0,b.jsx)("h1",{className:"auth-title",children:"PC IPM Panawuan"}),(0,b.jsx)("p",{className:"auth-subtitle",children:"Masuk ke akun kader Anda"})]}),(0,b.jsxs)("form",{className:"auth-form",id:"login-form",noValidate:!0,children:[(0,b.jsxs)("div",{className:"form-group",children:[(0,b.jsx)("label",{className:"form-label",htmlFor:"username",children:"Username"}),(0,b.jsx)("input",{type:"text",id:"username",name:"username",className:"form-control",placeholder:"Masukkan username",autoComplete:"username",required:!0})]}),(0,b.jsxs)("div",{className:"form-group",children:[(0,b.jsx)("label",{className:"form-label",htmlFor:"password",children:"Password"}),(0,b.jsxs)("div",{style:{position:"relative"},children:[(0,b.jsx)("input",{type:"password",id:"password",name:"password",className:"form-control",placeholder:"Masukkan password",autoComplete:"current-password",required:!0}),(0,b.jsx)("button",{type:"button",id:"toggle-password",className:"btn btn-ghost btn-sm",style:{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",padding:"4px 8px"},"aria-label":"Toggle password visibility",children:(0,b.jsx)("i",{className:"fas fa-eye",id:"toggle-password-icon"})})]})]}),(0,b.jsx)("div",{id:"login-error",className:"auth-error",hidden:!0}),(0,b.jsxs)("button",{type:"submit",className:"btn btn-primary btn-block",id:"login-btn",children:[(0,b.jsx)("i",{className:"fas fa-sign-in-alt"})," Masuk"]})]}),(0,b.jsx)("div",{className:"auth-links",children:(0,b.jsxs)("p",{children:["Belum punya akun? ",(0,b.jsx)("a",{href:"/register",children:"Daftar sekarang"})]})}),(0,b.jsx)("div",{className:"auth-divider",children:(0,b.jsx)("span",{children:"atau"})}),(0,b.jsxs)("button",{className:"btn btn-secondary btn-block",id:"webauthn-login-btn",type:"button",children:[(0,b.jsx)("i",{className:"fas fa-fingerprint"})," Masuk dengan Biometrik"]})]})}),(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:`
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
          `}})]})},"metadata",0,{title:"Login | PC IPM Panawuan",description:"Login ke platform digital PC IPM Panawuan"}])},9789,a=>{a.n(a.i(16594))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0n.l6v5._.js.map