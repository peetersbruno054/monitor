/* ui.js — melhorias de UX. Carregar DEPOIS de app.js (usa show, surveyFiltered, unresolved, data) */
(function(){
'use strict';
var q=function(s){return document.querySelector(s)},root=document.documentElement,
    mq=matchMedia('(prefers-color-scheme: dark)'),views=['overview','surveys','quality','protocols'];
function get(k){try{return localStorage.getItem(k)}catch(_){return null}}
function set(k,v){try{localStorage.setItem(k,v)}catch(_){}}
function mk(id,cls,html,title){var b=document.createElement('button');b.id=id;b.type='button';b.className=cls;b.innerHTML=html;b.title=title;b.setAttribute('aria-label',title);return b}

/* ---- Controles injetados no cabeçalho ---- */
var controls=q('.controls'),fresh=q('.freshness'),
    theme=mk('themeBtn','btn btn-ghost icon-only','☾','Alternar tema (T)'),
    auto=mk('autoBtn','btn btn-ghost','<span class="dot"></span> Auto','Atualizar automaticamente a cada 5 minutos'),
    ptog=mk('periodToggle','btn btn-secondary','Hoje ▾','Mostrar ou ocultar o período'),
    mobileTools=document.createElement('div');
mobileTools.className='mobile-tools';
mobileTools.appendChild(auto);
mobileTools.appendChild(theme);
controls.insertBefore(ptog,controls.firstChild);
controls.insertBefore(mobileTools,fresh);
ptog.onclick=function(){controls.classList.toggle('open')};

/* ---- Tema claro/escuro (segue o sistema até a pessoa escolher) ---- */
function applyTheme(){
  var t=get('mon-theme')||(mq.matches?'dark':'light');
  root.dataset.theme=t;theme.textContent=t==='dark'?'☀':'☾';
  var m=q('meta[name=theme-color]');if(m)m.content=t==='dark'?'#0b131a':'#003b5c';
}
theme.onclick=function(){set('mon-theme',root.dataset.theme==='dark'?'light':'dark');applyTheme()};
mq.addEventListener&&mq.addEventListener('change',function(){if(!get('mon-theme'))applyTheme()});
applyTheme();

/* ---- Link direto para cada aba (#pesquisas etc.) ---- */
function goto(){
  var v=location.hash.slice(1);if(views.indexOf(v)<0)v='overview';
  show(v);
  document.querySelectorAll('.tabs button').forEach(function(b){
    var on=b.dataset.view===v;b.setAttribute('aria-current',on?'page':'false');
  });
  window.scrollTo(0,0);
}
document.querySelectorAll('.tabs button').forEach(function(b){
  b.addEventListener('click',function(){if(location.hash.slice(1)!==b.dataset.view)location.hash=b.dataset.view;else goto()});
});
window.addEventListener('hashchange',goto);
q('.tabs').setAttribute('role','navigation');q('.tabs').setAttribute('aria-label','Seções');
goto();

/* ---- Período lembrado entre sessões ---- */
var preset=document.getElementById('preset');
function label(){ptog.textContent=preset.options[preset.selectedIndex].text+' ▾'}
var saved=get('mon-preset');
if(saved&&saved!=='custom'&&preset.querySelector('option[value="'+saved+'"]')){preset.value=saved;preset.onchange()}
preset.addEventListener('change',function(){if(preset.value!=='custom')set('mon-preset',preset.value);label()});
label();

/* ---- Atualização automática (5 min, só com a aba visível) ---- */
var timer=null,refresh=document.getElementById('refresh');
function setAuto(on){
  clearInterval(timer);auto.classList.toggle('on',on);auto.setAttribute('aria-pressed',on);set('mon-auto',on?'1':'0');
  if(on)timer=setInterval(function(){if(!document.hidden&&!refresh.disabled&&!document.getElementById('main').hidden)refresh.click()},3e5);
}
auto.onclick=function(){setAuto(!auto.classList.contains('on'))};
setAuto(get('mon-auto')==='1');

/* ---- Estado de carregamento e "última coleta" relativa ---- */
new MutationObserver(function(){document.body.classList.toggle('is-loading',refresh.disabled)})
  .observe(refresh,{attributes:true,attributeFilter:['disabled']});
var last=0,st=document.getElementById('status');
function tick(){var s=q('.freshness small');if(!s||!last)return;var m=Math.floor((Date.now()-last)/6e4);s.textContent=m<1?'agora mesmo':'há '+m+' min'}
new MutationObserver(function(){if(/^Atualizado/.test(st.textContent)){last=Date.now();tick()}})
  .observe(st,{childList:true,characterData:true,subtree:true});
setInterval(tick,3e4);

/* ---- Exportar CSV (respeita os filtros ativos) ---- */
function csv(head,rows,name){
  var out=[head].concat(rows).map(function(r){return r.map(function(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"'}).join(';')}).join('\r\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+out],{type:'text/csv;charset=utf-8'}));
  a.download=name+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1e3);
}
function addExport(badgeId,fn){
  var badge=document.getElementById(badgeId),wrap=document.createElement('div'),b=mk('','btn btn-ghost','↓ CSV','Exportar lista filtrada em CSV');
  wrap.className='head-actions';badge.parentNode.insertBefore(wrap,badge);wrap.appendChild(badge);wrap.appendChild(b);
  b.onclick=function(){if(typeof data!=='undefined'&&data)fn()};
}
addExport('surveyCount',function(){
  csv(['Protocolo','IA','Data','Nota','Como a IA ajudou','Comentário','Outras'],
    surveyFiltered().map(function(x){return[x.protocol,x.agent,x.date,x.note||'',x.help.join(' | '),x.comment,x.other.map(function(o){return o.a}).join(' | ')]}),'pesquisas');
});
addExport('unresolvedBadge',function(){
  var o=uv.outcome||'nao';
  csv(['Protocolo','IA','Contato','Data','Desfecho','Ponto do bot','Trilha de bot points','Nota','Como a IA ajudou','Comentário'],
    unresolved().map(function(x){var s=x.survey||{},f=o==='falha'&&window.failurePoint?failurePoint(x):null;return[x.protocol,x.agent,(window.maskPhone?maskPhone(x.contact):x.contact),x.lastDate,isUnresolvedProtocol(x)?'Não resolvido':(window.OUTCOME_ONE&&OUTCOME_ONE[x.outcome])||x.outcome,o==='nao'?(x.unresolvedPoint||x.finalPoint):f?f.point:x.finalPoint,window.trail?trail(x):'',s.note||'',(s.help||[]).join(' | '),s.comment||'']}),window.monListName?monListName():'nao-resolvidos');
});

/* ---- Tabela de IAs: rótulos para o modo cartão no celular ---- */
var at=document.getElementById('agentTable');
new MutationObserver(function(){
  var th=at.querySelectorAll('th');
  at.querySelectorAll('tr').forEach(function(tr){tr.querySelectorAll('td').forEach(function(td,j){if(th[j])td.dataset.l=th[j].textContent})});
}).observe(at,{childList:true});

/* ---- Atalhos: 1–4 abas · R atualizar · T tema · / buscar ---- */
document.addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.getElementById('main').hidden)return;
  var k=e.key.toLowerCase(),i=['1','2','3','4'].indexOf(k);
  if(i>=0)location.hash=views[i];
  else if(k==='r')refresh.click();
  else if(k==='t')theme.click();
  else if(k==='/'){var s=q('[data-panel]:not([hidden]) input[type=search]');if(s){e.preventDefault();s.focus()}}
});
})();
