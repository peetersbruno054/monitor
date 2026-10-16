/* fcr.js — FCR (First Contact Resolution) da IA: % dos casos tratados só pela IA em que o cliente NÃO voltou em até 24h.
   Casos avaliados = resolvidos (voltaram ou não) + inativos e não resolvidos SEM transferência que voltaram em até 24h.
   Quem voltou é falha de 1º contato; quem não voltou só conta como sucesso se foi resolvido (inativo/não resolvido que não
   voltou fica fora: não dá para saber se desistiu). Transferidos ficam fora (quem tratou foi uma pessoa).
   "Voltou" = outro protocolo do mesmo cliente (mesmo telefone, ou o mesmo contato quando não há telefone) iniciado até 24h depois.
   Fora do cálculo: resolvidos sem telefone/contato e casos cuja janela de 24h não terminou dentro do período.
   Carregar depois do app.js; os módulos (BI, Excel) usam window.monFCR. */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var H24=864e5,LAB={ok:'Não voltou',voltou:'Voltou em 24h',vina:'Voltou em 24h',vnao:'Voltou em 24h',janela:'Janela incompleta',semid:'Sem identificação'};
function safe(f){try{f()}catch(e){if(window.console)console.error('fcr',e)}}
function norm0(s){return typeof norm==='function'?norm(s):String(s||'').toLowerCase().trim()}
function key(x){var c=String(x.contact||'').replace(/\D/g,'').slice(-11);return c||(x.contact?norm0(x.contact):'')}
function endMs(iso){if(!iso)return Infinity;var p=String(iso).split('-');if(p.length<3)return Infinity;return Math.min(new Date(+p[0],+p[1]-1,+p[2],23,59,59).getTime(),Date.now())}
function index(all){var m={};(all||[]).forEach(function(x){var k=key(x),t=dt(x.firstDate);if(!k||!t)return;(m[k]=m[k]||[]).push(t)});return m}
/* 'ok' | 'voltou' (resolvido que voltou) | 'vina' | 'vnao' (inativo / não resolvido que voltou) | 'janela' | 'semid' | null (fora) */
function returned(x,idx){var k=key(x),t=dt(x.firstDate),a=idx[k]||[];for(var i=0;i<a.length;i++)if(a[i]>t&&a[i]-t<=H24)return true;return false}
function state(x,idx,end){
  var o=x.outcome,k=key(x),t=dt(x.firstDate);
  if(o==='resolvido'){
    if(!k||!t)return'semid';
    if(t+H24>end)return'janela';
    return returned(x,idx)?'voltou':'ok';
  }
  /* inativo ou não resolvido (sem transferência): só entra se voltou, e só com a janela completa */
  var unres=typeof isUnresolvedProtocol==='function'&&isUnresolvedProtocol(x);
  if(o==='transferido'||!(o==='inatividade'||unres)||!k||!t||t+H24>end)return null;
  return returned(x,idx)?(o==='inatividade'?'vina':'vnao'):null;
}
function blank(){return{res:0,ok:0,voltou:0,vina:0,vnao:0,janela:0,semid:0,elig:0,fcr:null}}
function stats(list,idx,endIso){
  var s=blank(),end=endMs(endIso);
  (list||[]).forEach(function(x){var st=state(x,idx,end);if(!st)return;if(st==='ok'||st==='voltou'||st==='janela'||st==='semid')s.res++;s[st]++});
  s.elig=s.ok+s.voltou+s.vina+s.vnao;s.fcr=s.elig?s.ok/s.elig*100:null;return s;
}
function byAgent(list,idx,endIso){var g={};(list||[]).forEach(function(x){(g[x.agent]=g[x.agent]||[]).push(x)});var o={};Object.keys(g).forEach(function(k){o[k]=stats(g[k],idx,endIso)});return o}
function label(x,idx,endIso){var st=state(x,idx,endMs(endIso));return st?LAB[st]:''}
function pct1(v){return(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}
function n0(v){return Math.round(v).toLocaleString('pt-BR')}
function note(s){var f=s.janela+s.semid;return f?n0(f)+' resolvidos fora do cálculo ('+[s.janela?n0(s.janela)+' com janela de 24h incompleta':'',s.semid?n0(s.semid)+' sem telefone/contato':''].filter(Boolean).join(' · ')+')':''}
function volt(s){return s.voltou+s.vina+s.vnao}
var DEF='FCR = resolvidos pela IA sem retorno do cliente em 24h ÷ casos avaliados (resolvidos + inativos e não resolvidos, sem transferência, que voltaram em 24h). Transferidos ficam de fora. Fora do cálculo: clientes sem telefone/contato e casos cuja janela de 24h ainda não terminou no período.';
window.monFCR={key:key,index:index,state:state,stats:stats,byAgent:byAgent,label:label,LAB:LAB,pct1:pct1,note:note,volt:volt,DEF:DEF};

/* ---------- Visão geral: cartão + selo por IA ---------- */
function ovCtx(){
  if(typeof data==='undefined'||!data||!data.r72)return null;
  var all=data.r72.protocols,idx=index(all),end=(q('#end')||{}).value;
  return{all:all,idx:idx,end:end};
}
function ovCard(){
  var box=q('#overviewKpis');if(!box||q('.kpi-fcr',box)||!q('.kpi2',box))return;
  var c=ovCtx();if(!c)return;
  var s=stats(c.all,c.idx,c.end);
  var pv=window.monPrev&&window.monPrev(),delta='';
  if(pv&&pv.protocols&&pv.protocols.length){
    var ps=stats(pv.protocols,index(pv.protocols),pv.range&&pv.range[1]);
    if(s.fcr!=null&&ps.fcr!=null&&ps.elig>=10&&s.elig>=10){var d=Math.round(s.fcr-ps.fcr);delta='<small class="fdl '+(d>0?'up':d<0?'dn':'')+'" title="vs. período anterior">'+(d>0?'▲ +':d<0?'▼ −':'= ')+Math.abs(d)+' pp</small>'}
  }
  var ic='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l3.5 3.5L16 5.5"/><path d="M4 5.5h5M4 16h9" opacity=".55"/></svg>';
  var v=s.fcr==null?'—':Math.round(s.fcr)+'%';
  var el=document.createElement('div');el.className='kpi2 col kpi-fcr';el.style.setProperty('--c','var(--fcr,#12919f)');el.title=DEF;
  el.innerHTML='<span class="ic">'+ic+'</span><span class="lb">FCR · 1º contato</span><span class="vl">'+v+delta+'</span><span class="sb">'+(s.elig?n0(s.ok)+' de '+n0(s.elig)+' casos sem retorno em 24h':'sem casos avaliáveis')+'</span>'+((s.janela+s.semid)?'<span class="sb fcr-n" title="'+note(s)+'">'+n0(s.janela+s.semid)+' fora do cálculo</span>':'');
  box.appendChild(el);box.classList.remove('kpis-4');box.classList.add('kpis-5');
}
function ovAgents(){
  var c=ovCtx();if(!c)return;
  var by=byAgent(c.all,c.idx,c.end);
  qa('#agentCards .ag2').forEach(function(card){
    var old=q('.ag-fcr',card);if(old)old.remove();
    var h=q('.ag2-h',card),name=(q('b',h)||{}).textContent,s=by[name];if(!h||!s||!s.elig)return;
    var chip=document.createElement('span');chip.className='ag-fcr';chip.title=DEF+' ('+n0(s.ok)+' de '+n0(s.elig)+')';
    chip.innerHTML='FCR <b>'+Math.round(s.fcr)+'%</b>';
    var sm=q('small',h);h.insertBefore(chip,sm||null);
  });
}

/* ---------- Protocolos: faixa de FCR acima dos clientes que voltaram ---------- */
function stripBox(){
  var p=q('#upRecontact');if(!p)return null;var el=q('.fcr-strip',p);
  if(!el){el=document.createElement('div');el.className='fcr-strip';var h=q('.panel-head',p);h.parentNode.insertBefore(el,h.nextSibling)}
  return el;
}
function strip(){
  var c=ovCtx();if(!c)return;var el=stripBox();if(!el)return;
  var s=stats(c.all,c.idx,c.end);
  if(!s.res){el.hidden=true;return}
  el.hidden=false;
  var f=s.fcr==null?0:s.fcr,tot=s.elig||1;
  el.innerHTML='<div class="fs-main"><small>FCR · resolução no 1º contato da IA</small><strong>'+(s.fcr==null?'—':pct1(s.fcr))+'</strong></div>'+
    '<div class="fs-bar" role="img" aria-label="'+n0(s.ok)+' resolvidos sem retorno, '+n0(volt(s))+' voltaram em 24h"><i class="ok" style="flex:'+s.ok+' 1 0"></i><i class="bk" style="flex:'+volt(s)+' 1 0"></i></div>'+
    '<div class="fs-leg"><span><u class="ok"></u>Resolvidos sem retorno <b>'+n0(s.ok)+'</b></span><span><u class="bk"></u>Voltaram em 24h <b>'+n0(volt(s))+'</b> <em>(resolvidos '+n0(s.voltou)+' · inativos '+n0(s.vina)+' · não resolvidos '+n0(s.vnao)+')</em></span></div>'+
    '<p class="fs-note">'+DEF+(note(s)?' Neste período: '+note(s)+'.':'')+'</p>';
}

function boot(){
  var k=q('#overviewKpis'),a=q('#agentCards'),w=q('#recontactWindows');
  var go=function(f){return function(){requestAnimationFrame(function(){safe(f)})}};
  if(k)new MutationObserver(go(ovCard)).observe(k,{childList:true});
  if(a)new MutationObserver(go(ovAgents)).observe(a,{childList:true});
  if(w)new MutationObserver(go(strip)).observe(w,{childList:true});
  safe(ovCard);safe(ovAgents);safe(strip);
}
boot();
})();
