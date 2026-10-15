/* acessos.js — gestão de acessos dos colegas (Supabase Auth) e troca da própria senha.
   Carregar por último. Administrador vê o botão "Acessos"; os demais, "Minha senha". */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=window.esc||function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
function toast(m){if(window.monToast)window.monToast(m)}
function svg(p){return'<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'}
var IC={users:svg('<circle cx="7.5" cy="7" r="2.8"/><path d="M2.8 16c.6-2.6 2.4-4 4.7-4s4.1 1.4 4.7 4"/><circle cx="14" cy="7.6" r="2.2"/><path d="M13.2 12.1c2 .1 3.4 1.4 3.9 3.6"/>'),
  key:svg('<circle cx="7" cy="12" r="3.2"/><path d="M9.3 9.8L16 3.5M13.5 6l2 2M11.6 7.9l1.6 1.6"/>'),x:svg('<path d="M5 5l10 10M15 5L5 15"/>'),
  copy:svg('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>')};

var css=
'#accDlg{width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 40px);padding:0;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:0 24px 60px rgba(0,30,50,.25)}'+
'#accDlg::backdrop{background:rgba(8,24,36,.45)}'+
'#accDlg .ad-h{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line2);background:var(--surface)}'+
'#accDlg .ad-h h2{margin:0;font-size:16px}#accDlg .ad-h p{margin:2px 0 0;color:var(--muted);font-size:12px}'+
'#accDlg .ad-x{margin-left:auto;display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink2);cursor:pointer}'+
'#accDlg .ad-b{display:grid;gap:16px;padding:16px 18px 20px}'+
'#accDlg section{padding:14px;border:1px solid var(--line2);border-radius:12px;background:var(--surface2)}'+
'#accDlg h3{margin:0 0 10px;font-size:13px;color:var(--ink)}'+
'#accDlg .ad-form{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:8px}'+
'#accDlg .ad-pass{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:8px}'+
'#accDlg input,#accDlg select{height:38px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;min-width:0}'+
'#accDlg .btn{height:38px;white-space:nowrap}'+
'#accDlg .ad-msg{margin-top:8px;font-size:12px;color:var(--bad)}#accDlg .ad-msg.ok{color:var(--good)}'+
'#accDlg .ad-new{margin-top:10px;padding:12px;border:1px dashed color-mix(in srgb,var(--good) 45%,transparent);border-radius:10px;background:color-mix(in srgb,var(--good) 7%,var(--surface))}'+
'#accDlg .ad-new b{font-size:13px}#accDlg .ad-new small{display:block;margin-top:6px;color:var(--muted);font-size:11.5px}'+
'#accDlg .ad-pw{display:flex;align-items:center;gap:8px;margin-top:8px}'+
'#accDlg .ad-pw code{flex:1;min-width:0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font:600 15px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.06em;overflow-wrap:anywhere}'+
'#accDlg .ad-list{display:grid;gap:0}'+
'#accDlg .ad-u{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:11px 2px;border-bottom:1px solid var(--line2)}#accDlg .ad-u:last-child{border-bottom:0}'+
'#accDlg .ad-u b{font-size:13px;overflow-wrap:anywhere}#accDlg .ad-u .ad-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px;font-size:11.5px;color:var(--muted)}'+
'#accDlg .ad-acts{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}'+
'#accDlg .ad-acts button{height:30px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--blue);font-size:12px;font-weight:600;cursor:pointer}'+
'#accDlg .ad-acts button:hover{border-color:var(--blue)}#accDlg .ad-acts button.danger{color:var(--bad)}#accDlg .ad-acts button.danger.confirm{background:var(--bad);border-color:var(--bad);color:#fff}'+
'#accDlg .ad-acts button:disabled{opacity:.5;cursor:progress}'+
'#accDlg .pill.adm{background:color-mix(in srgb,var(--blue) 10%,transparent);border-color:color-mix(in srgb,var(--blue) 30%,transparent);color:var(--blue)}'+
'#accDlg .pill.blk{background:var(--badbg);border-color:color-mix(in srgb,var(--bad) 30%,transparent);color:var(--bad)}'+
'#accDlg .pill.me{border-style:dashed}'+
'#accDlg .ad-empty{padding:14px;text-align:center;color:var(--muted);font-size:12px}'+
'@media(max-width:620px){#accDlg .ad-form,#accDlg .ad-pass{grid-template-columns:1fr}#accDlg .ad-u{grid-template-columns:1fr}#accDlg .ad-acts{justify-content:flex-start}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

var me={email:'',admin:false},btn=null,dlg=null;

function api(method,body){
  return fetch('/api/users',{method:method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'})
    .then(function(r){return r.json().catch(function(){return{ok:false,error:'Resposta inválida do servidor.'}}).then(function(j){if(!r.ok||!j.ok)throw new Error(j.error||'Não foi possível concluir.');return j})});
}
function when(v){if(!v)return'';var d=new Date(v);return isNaN(d)?'':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}

/* ---------- Botão ---------- */
function placeButton(){
  if(!btn){btn=document.createElement('button');btn.type='button';btn.id='accessBtn';btn.className='btn btn-ghost';btn.onclick=openDlg}
  btn.innerHTML='<span class="ac-av" aria-hidden="true">'+esc((me.email||'?').charAt(0).toUpperCase())+'</span><span class="ac-l">'+(me.admin?'Acessos':'Minha senha')+'</span>';
  btn.title=(me.email?me.email+' · ':'')+(me.admin?'Criar e gerenciar acessos dos colegas e trocar a sua senha':'Trocar a sua senha');
  var box=q('.quick-actions');
  if(box){if(btn.parentNode!==box)box.appendChild(btn)}
  else{var r=document.getElementById('refresh');if(r&&btn.parentNode!==r.parentNode)r.parentNode.insertBefore(btn,r)}
}
function refreshMe(){
  fetch('/api/auth',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
    if(!j||!j.ok||j.mode!=='password'){if(btn)btn.remove();return}   // sem login com senha não há o que gerenciar
    me={email:j.email||'',admin:!!j.admin};placeButton();
  }).catch(function(){});
}
var main=document.getElementById('main');
if(main){new MutationObserver(function(){if(!main.hidden)refreshMe()}).observe(main,{attributes:true,attributeFilter:['hidden']});if(!main.hidden)refreshMe()}
// a caixa de botões muda de lugar entre computador e celular: o botão acompanha
new MutationObserver(function(){if(btn&&q('.quick-actions')&&btn.parentNode!==q('.quick-actions'))placeButton()}).observe(document.body,{childList:true,subtree:true});

/* ---------- Janela ---------- */
function openDlg(){
  if(!dlg){dlg=document.createElement('dialog');dlg.id='accDlg';document.body.appendChild(dlg);dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()})}
  dlg.innerHTML='<div class="ad-h"><div><h2>'+(me.admin?'Acessos ao Monitor':'Minha senha')+'</h2><p>'+esc(me.email)+(me.admin?' · administrador':'')+'</p></div><button type="button" class="ad-x" aria-label="Fechar">'+IC.x+'</button></div><div class="ad-b">'+
    (me.admin?
      '<section><h3>Novo acesso</h3><form class="ad-form" id="adCreate"><input id="adEmail" type="email" placeholder="email.do.colega@safeweb.com.br" required autocomplete="off"><select id="adRole" aria-label="Perfil"><option value="leitura">Leitura</option><option value="admin">Administrador</option></select><button class="btn btn-primary" type="submit">Criar acesso</button></form><div id="adCreateMsg"></div></section>'+
      '<section><h3>Quem tem acesso</h3><div id="adList" class="ad-list"><div class="ad-empty">Carregando…</div></div></section>':'')+
    '<section><h3>Trocar minha senha</h3><form class="ad-pass" id="adPass"><input id="adCur" type="password" placeholder="Senha atual" autocomplete="current-password" required><input id="adNew" type="password" placeholder="Nova senha (mín. 8)" autocomplete="new-password" minlength="8" required><input id="adNew2" type="password" placeholder="Repita a nova senha" autocomplete="new-password" minlength="8" required><button class="btn btn-secondary" type="submit">Trocar senha</button></form><div id="adPassMsg"></div></section>'+
  '</div>';
  q('.ad-x',dlg).onclick=function(){dlg.close()};
  if(me.admin){q('#adCreate',dlg).onsubmit=createUser;loadList()}
  q('#adPass',dlg).onsubmit=changePass;
  dlg.showModal();
  var f=q(me.admin?'#adEmail':'#adCur',dlg);if(f)f.focus();
}
function msg(id,text,ok){var el=q('#'+id,dlg);if(el)el.innerHTML=text?'<div class="ad-msg'+(ok?' ok':'')+'">'+esc(text)+'</div>':''}
function showPassword(target,email,password,title){
  var el=q('#'+target,dlg);if(!el)return;
  el.innerHTML='<div class="ad-new"><b>'+esc(title)+'</b> — '+esc(email)+'<div class="ad-pw"><code>'+esc(password)+'</code><button type="button" class="btn btn-secondary" data-copy-pw>'+IC.copy+' Copiar</button></div>'+
    '<small>Envie a senha por mensagem privada. Ela não será mostrada de novo; a pessoa pode trocá-la em “Minha senha” depois de entrar.</small></div>';
  q('[data-copy-pw]',el).onclick=function(){var t='Acesso ao Monitor IA\nE-mail: '+email+'\nSenha temporária: '+password+'\n'+location.origin;(window.copyText?copyText(t,'Dados de acesso copiados'):navigator.clipboard.writeText(t))};
}

/* ---------- Lista ---------- */
var users=[];
function loadList(){
  api('GET').then(function(j){users=j.users||[];renderList()}).catch(function(e){var l=q('#adList',dlg);if(l)l.innerHTML='<div class="ad-msg">'+esc(e.message)+'</div>'});
}
function renderList(){
  var l=q('#adList',dlg);if(!l)return;
  if(!users.length){l.innerHTML='<div class="ad-empty">Nenhum acesso cadastrado ainda.</div>';return}
  l.innerHTML=users.map(function(u){
    var self=u.email===me.email,locked=u.owner||self;
    return'<div class="ad-u" data-id="'+esc(u.id)+'"><div><b>'+esc(u.email)+'</b><div class="ad-meta">'+
      '<span class="pill'+(u.role==='admin'?' adm':'')+'">'+(u.role==='admin'?'Administrador':'Leitura')+'</span>'+
      (u.blocked?'<span class="pill blk">Bloqueado</span>':'')+(self?'<span class="pill me">você</span>':u.owner?'<span class="pill me">responsável</span>':'')+
      '<span>'+(u.lastSignInAt?'último acesso '+when(u.lastSignInAt):'ainda não entrou')+'</span></div></div>'+
      '<div class="ad-acts">'+
        (self?'':'<button type="button" data-act="reset">Nova senha</button>')+   // a própria senha se troca em "Trocar minha senha", abaixo
        (locked||u.fixedAdmin?'':'<button type="button" data-act="role">'+(u.role==='admin'?'Tornar leitura':'Tornar admin')+'</button>')+
        (locked?'':'<button type="button" data-act="'+(u.blocked?'unblock':'block')+'">'+(u.blocked?'Desbloquear':'Bloquear')+'</button>')+
        (locked?'':'<button type="button" class="danger" data-act="delete">Remover</button>')+
      '</div></div>';
  }).join('');
  qa('[data-act]',l).forEach(function(b){b.onclick=function(){act(b)}});
}
function act(b){
  var row=b.closest('.ad-u'),id=row.dataset.id,u=users.find(function(x){return x.id===id}),a=b.dataset.act;if(!u)return;
  if(a==='delete'&&!b.classList.contains('confirm')){b.classList.add('confirm');b.textContent='Confirmar remoção';setTimeout(function(){if(b.isConnected){b.classList.remove('confirm');b.textContent='Remover'}},4000);return}
  b.disabled=true;
  var p=a==='delete'?api('DELETE',{id:id}):api('PATCH',a==='role'?{id:id,action:'role',role:u.role==='admin'?'leitura':'admin'}:{id:id,action:a});
  p.then(function(j){
    if(a==='reset'){showPassword('adCreateMsg',u.email,j.password,'Nova senha gerada');toast('Nova senha gerada para '+u.email)}
    else if(a==='delete'){users=users.filter(function(x){return x.id!==id});toast('Acesso removido')}
    else if(j.user){users=users.map(function(x){return x.id===id?Object.assign({},x,j.user):x});toast(a==='block'?'Acesso bloqueado':a==='unblock'?'Acesso desbloqueado':'Perfil alterado')}
    renderList();
  }).catch(function(e){b.disabled=false;msg('adCreateMsg',e.message)});
}

/* ---------- Ações ---------- */
function createUser(e){
  e.preventDefault();
  var email=q('#adEmail',dlg).value.trim().toLowerCase(),role=q('#adRole',dlg).value,s=q('#adCreate button',dlg);
  s.disabled=true;msg('adCreateMsg','');
  api('POST',{email:email,role:role}).then(function(j){
    q('#adEmail',dlg).value='';showPassword('adCreateMsg',email,j.password,'Acesso criado');
    if(j.user){users=users.concat([j.user]).sort(function(a,b){return a.email.localeCompare(b.email)})}renderList();
  }).catch(function(err){msg('adCreateMsg',err.message)}).then(function(){s.disabled=false});
}
function changePass(e){
  e.preventDefault();
  var cur=q('#adCur',dlg).value,n1=q('#adNew',dlg).value,n2=q('#adNew2',dlg).value,s=q('#adPass button',dlg);
  if(n1!==n2){msg('adPassMsg','As duas senhas novas não são iguais.');return}
  s.disabled=true;msg('adPassMsg','');
  api('PATCH',{action:'self-password',current:cur,password:n1}).then(function(){q('#adPass',dlg).reset();msg('adPassMsg','Senha trocada. Use a nova senha no próximo acesso.',true)})
    .catch(function(err){msg('adPassMsg',err.message)}).then(function(){s.disabled=false});
}
})();
