/* protocolos.js — aba Protocolos unificada (a antiga Qualidade agora é parte dela).
   Atalhos entre as seções, filtro rápido por desfecho com contagem, filtro por canal,
   canal e contato (parcialmente oculto) em cada protocolo, lista mais compacta no computador.
   Carregar por último (depois de qualidade.js). Não muda nenhum cálculo de desfecho. */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var SEC='[data-panel=protocols]';
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('protocolos',n,e)}return r}}
if(typeof uv!=='undefined'&&uv.channel==null)uv.channel='';

/* ---------- Estilos ---------- */
var css=
SEC+' #upNav{display:flex;flex-wrap:wrap;gap:8px;align-items:center}'+
SEC+' #upNav .up-l{margin-right:4px;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}'+
SEC+' #upNav button{height:32px;padding:0 13px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink2);font:inherit;font-size:12.5px;font-weight:500;cursor:pointer;transition:border-color .15s,color .15s,background .15s}'+
SEC+' #upNav button:hover{border-color:var(--blue);color:var(--blue)}'+
SEC+' #upNav button.on{background:var(--blue);border-color:var(--blue);color:#fff}'+
SEC+' .up-kpis{display:grid;gap:12px}'+
SEC+' .up-kpis .kpis{gap:12px}'+SEC+' .up-kpis .kpi{padding:11px 14px;gap:11px;align-items:center}'+SEC+' .up-kpis .kpi-value{font-size:24px;line-height:1.1}'+SEC+' .up-kpis .kpi-body{gap:1px}'+
SEC+' .view>.panel,'+SEC+' .view>.up-kpis{scroll-margin-top:84px}'+
/* filtro rápido por desfecho */
SEC+' #upOut{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 12px}'+
SEC+' #upOut button{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink2);font:inherit;font-size:12.5px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s}'+
SEC+' #upOut button i{width:9px;height:9px;border-radius:3px;background:var(--c,var(--muted2))}'+
SEC+' #upOut button b{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:600}'+
SEC+' #upOut button:hover{border-color:var(--blue)}'+
SEC+' #upOut button.on{border-color:var(--blue);background:color-mix(in srgb,var(--blue) 9%,var(--surface));box-shadow:inset 0 0 0 1px var(--blue)}'+
SEC+' #unresolvedOutcome{display:none}'+
SEC+' #upList .chips{margin-bottom:6px}'+
/* canal e contato em cada protocolo */
SEC+' .pill.ch-pill{background:color-mix(in srgb,var(--blue) 8%,transparent);border-color:color-mix(in srgb,var(--blue) 24%,transparent);color:var(--blue)}'+
SEC+' .pill.ch-pill.ch-wa{background:color-mix(in srgb,var(--good) 9%,transparent);border-color:color-mix(in srgb,var(--good) 26%,transparent);color:var(--good)}'+
SEC+' .up-ct{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}'+
'@media(max-width:820px){'+
SEC+' #upNav{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -2px;padding:0 2px 2px}'+SEC+' #upNav::-webkit-scrollbar{display:none}'+SEC+' #upNav button{flex:0 0 auto}'+SEC+' #upNav .up-l{display:none}'+
SEC+' .up-kpis .kpi{padding:10px 12px;gap:9px}'+SEC+' .up-kpis .kpi-value{font-size:20px}'+SEC+' .up-kpis .kpi-icon{width:30px;height:30px;flex-basis:30px;font-size:13px}'+SEC+' .up-kpis .kpi-sub{font-size:11px}'+
'}'+
/* lista compacta no computador: cartão em uma linha (protocolo | detalhes da pesquisa | copiar) */
'@media(min-width:1000px){'+
SEC+' #upList .protocol-card{grid-template-columns:42px minmax(0,1.45fr) minmax(0,1fr) 118px;column-gap:16px;row-gap:0;padding:12px 10px;align-items:center;border-radius:10px}'+
SEC+' #upList .protocol-card-survey{grid-column:3;grid-row:1;align-self:center}'+
SEC+' #upList .protocol-card-actions{grid-column:4;grid-row:1}'+
SEC+' #upList .protocol-card-info{grid-row:1}'+
SEC+' #upList .protocol-card>.score-box,'+SEC+' #upList .protocol-card-head>.score-box{grid-row:1}'+
SEC+' #upList .protocol-detail{grid-template-columns:1fr;gap:3px;padding:6px 9px}'+
SEC+' #upList .protocol-card-survey:empty:after{content:"Sem resposta de pesquisa";font-size:11.5px;color:var(--muted2)}'+
SEC+' #upList .protocol-point>div{font-size:12.5px;color:var(--ink2)}'+
'}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Atalhos entre as seções ---------- */
var NAV=[['upList','Protocolos'],['upRecontact','Recontatos em 24h'],['funnelPanel','Funil'],['recPanel','Clientes que mais voltam'],['upBots','Bot points']];
var lock=0;
function ensureNav(){
  var sec=q(SEC);if(!sec||q('#upNav'))return;
  var nav=document.createElement('nav');nav.id='upNav';nav.setAttribute('aria-label','Seções desta aba');
  nav.innerHTML='<span class="up-l">Ir para</span>'+NAV.map(function(n){return'<button type="button" data-up-go="'+n[0]+'">'+n[1]+'</button>'}).join('');
  sec.insertBefore(nav,sec.firstChild);
  nav.addEventListener('click',function(e){
    var b=e.target.closest('[data-up-go]');if(!b)return;
    var t=document.getElementById(b.dataset.upGo);if(!t)return;
    if(t.classList.contains('fd'))t.classList.remove('fd');           // painel recolhido: abre
    lock=Date.now()+1100;qa('button',nav).forEach(function(x){x.classList.toggle('on',x===b)});
    t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  });
}
function markNav(){
  var nav=q('#upNav');if(!nav||!window.IntersectionObserver||nav.dataset.io)return;
  nav.dataset.io='1';
  var vis={};
  var io=new IntersectionObserver(function(en){
    en.forEach(function(e){vis[e.target.id]=e.isIntersecting});
    if(Date.now()<lock)return;
    var first=NAV.map(function(n){return n[0]}).filter(function(id){return vis[id]})[0];
    qa('button',nav).forEach(function(b){b.classList.toggle('on',b.dataset.upGo===first)});
  },{rootMargin:'-90px 0px -55% 0px'});
  NAV.forEach(function(n){var t=document.getElementById(n[0]);if(t)io.observe(t)});
}

/* ---------- Filtro rápido por desfecho (com contagem) ---------- */
var OUTS=[['nao','--bad'],['transferido','--transferred'],['resolvido','--resolved'],['inatividade','--inactivity'],['possivel','--possible'],['finalizado','--finished'],['safenota','--safenota'],['andamento','--ongoing'],['sem','--muted2'],['todos','--blue']];
function countOf(o,all){
  if(o==='nao')return all.filter(isUnresolvedProtocol).length;
  if(o==='sem')return all.filter(function(x){return x.outcome==='outro'}).length;
  if(o==='todos')return all.filter(function(x){return DESFECHOS.indexOf(x.outcome)>=0}).length;
  return all.filter(function(x){return x.outcome===o}).length;
}
function renderOut(){
  if(typeof data==='undefined'||!data||!data.r72)return;
  var panel=q('#upList');if(!panel)return;
  var box=q('#upOut');
  if(!box){box=document.createElement('div');box.id='upOut';box.setAttribute('role','group');box.setAttribute('aria-label','Desfecho');var tb=q('.toolbar',panel);tb.parentNode.insertBefore(box,tb)}
  var all=data.r72.protocols,cur=uv.outcome||'nao';
  box.innerHTML=OUTS.map(function(o){
    var n=countOf(o[0],all);if(!n&&o[0]!==cur&&o[0]!=='nao')return'';
    return'<button type="button" data-up-out="'+o[0]+'" aria-pressed="'+(o[0]===cur?'true':'false')+'" class="'+(o[0]===cur?'on':'')+'"><i style="--c:var('+o[1]+')"></i>'+esc(OUTCOME_LIST[o[0]]||o[0])+' <b>'+fmt(n)+'</b></button>';
  }).join('');
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-up-out]');if(!b||!data)return;
  uv.outcome=b.dataset.upOut;uv.page=1;renderProtocols();
});

/* ---------- Filtro por canal ---------- */
var chSel=null;
function ensureChannelSelect(){
  var tb=q('#upList .toolbar');if(!tb)return null;
  if(!chSel){
    chSel=document.createElement('select');chSel.id='unresolvedChannel';chSel.setAttribute('aria-label','Canal');
    chSel.onchange=function(){uv.channel=chSel.value;uv.page=1;renderUnList()};
    tb.insertBefore(chSel,q('#unresolvedAgent'));
  }
  return chSel;
}
function renderChannelSelect(){
  if(typeof data==='undefined'||!data||!data.r72)return;
  var s=ensureChannelSelect();if(!s)return;
  var has=data.r72.hasChannel;
  s.hidden=!has;
  var tb=q('#upList .toolbar');tb.classList.toggle('t6',!!has);tb.classList.toggle('t5',!has);
  if(!has){uv.channel='';return}
  var base=listBase(),count={};
  base.forEach(function(x){var c=x.channel||'Não informado';count[c]=(count[c]||0)+1});
  if(uv.channel&&!count[uv.channel])count[uv.channel]=0;
  var names=Object.keys(count).sort(function(a,b){return count[b]-count[a]});
  s.innerHTML='<option value="">Todos os canais</option>'+names.map(function(n){return'<option value="'+esc(n)+'"'+(n===uv.channel?' selected':'')+'>'+esc(n)+' ('+fmt(count[n])+')</option>'}).join('');
}
var _un=window.unresolved;
window.unresolved=function(){
  var l=_un();
  if(!uv.channel)return l;
  return l.filter(function(x){return(x.channel||'Não informado')===uv.channel});
};
var _go=window.goProtocols;
if(typeof _go==='function')window.goProtocols=function(){uv.channel='';return _go.apply(this,arguments)};
document.addEventListener('click',function(e){if(e.target.closest('[data-clear-filters]'))uv.channel=''},true);

/* ---------- Canal e contato em cada protocolo ---------- */
function decorate(){
  if(typeof data==='undefined'||!data||!data.r72)return;
  var by={};data.r72.protocols.forEach(function(x){by[x.protocol]=x});
  qa('#unresolvedList .protocol-card').forEach(function(c){
    var b=q('.copy-protocol-btn',c),x=b&&by[b.dataset.protocol],top=q('.row-top',c);
    if(!x||!top||q('.ch-pill',top))return;
    var date=q('.row-date',top),h='';
    if(x.channel)h+='<span class="pill ch-pill'+(/whats/i.test(x.channel)?' ch-wa':'')+'" title="Canal de entrada">'+esc(x.channel)+'</span>';
    if(x.contact&&window.maskPhone)h+='<span class="up-ct" title="Telefone parcialmente oculto">'+esc(maskPhone(x.contact))+'</span>';
    if(h)(date||top.lastChild).insertAdjacentHTML(date?'beforebegin':'afterend',h);
  });
}

wrap('renderProtocols',function(){ensureNav();renderOut();renderChannelSelect();decorate();markNav()});
wrap('renderUnList',function(){renderChannelSelect();decorate()});
ensureNav();
if(typeof data!=='undefined'&&data&&data.r72){renderOut();renderChannelSelect();decorate();markNav()}
})();
