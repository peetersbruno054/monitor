/* insights.js — alertas (sino na barra) e painéis recolhíveis (clique no título).
   Carregar depois de desempenho.js, extras.js e features.js (usa window.monDesempenho, monPrev, goProtocols).
   Usa data, DESFECHOS, dt, ymdLocal, esc (app.js). Não envia nada: tudo é calculado no navegador. */
(function(){
'use strict';
var D=window.monDesempenho;
if(!D)return;
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var IAS=D.IAS;
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('insights',n,e)}return r}}
function n0(v){return Math.round(v).toLocaleString('pt-BR')}
function pc(v){return(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}
function nt(v){return v.toFixed(2).replace('.',',')}
function d0(iso){return new Date(iso+'T12:00:00')}
function plus(iso,n){var d=d0(iso);d.setDate(d.getDate()+n);return ymdLocal(d)}
function brd(iso){var p=String(iso).split('-');return p[2]+'/'+p[1]}
function period(){return{start:q('#start').value,end:q('#end').value}}
function prevProtocols(){var p=window.monPrev&&window.monPrev();return p&&p.protocols?p.protocols:[]}

/* ---------- Estilos ---------- */
var css=
'#alertBell{position:relative;display:flex;align-items:center;flex:none}'+
'#alertBell .al-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border-radius:10px;border:1px solid var(--line);background:var(--surface,#fff);color:var(--ink2);cursor:pointer}'+
'#alertBell .al-btn:hover{border-color:var(--blue);color:var(--blue)}#alertBell .al-btn[aria-expanded=true]{border-color:var(--blue);color:var(--blue)}'+
'.rail #alertBell .al-btn{background:transparent;border-color:rgba(255,255,255,.28);color:#fff;width:32px;height:32px}.rail #alertBell .al-btn:hover,.rail #alertBell .al-btn[aria-expanded=true]{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.5);color:#fff}'+
'#alertBell .al-btn svg{width:18px;height:18px}'+
'#alertBell .al-n{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--bad);color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center;border:2px solid var(--surface,#fff);box-sizing:content-box}'+
'.rail #alertBell .al-n{border-color:var(--navy)}'+
'#alertBell .al-ok-dot{position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:var(--good);border:2px solid var(--surface,#fff);box-sizing:content-box}.rail #alertBell .al-ok-dot{border-color:var(--navy)}'+
'#alertPop{position:absolute;right:0;top:calc(100% + 10px);z-index:60;width:min(430px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--surface,#fff);color:var(--ink2);box-shadow:0 14px 40px rgba(0,30,50,.22)}'+
'#alertPop[hidden]{display:none}'+
'#alertPop .al-h{display:flex;align-items:center;gap:10px}#alertPop .al-h h2{margin:0;font-size:15px;font-weight:600;color:var(--ink)}'+
'#alertPop .al-ok{color:var(--good);font-size:13px;font-weight:500;line-height:1.4}'+
'#alertPop .al-list{display:grid;gap:2px;margin:8px 0 0;padding:0;list-style:none}'+
'#alertPop .al-i{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 4px;border-top:1px solid var(--line2);font-size:13px;color:var(--ink2)}'+
'#alertPop .al-i:first-child{border-top:0}#alertPop .al-i b{color:var(--ink);font-weight:600}#alertPop .al-i small{display:block;color:var(--muted);font-size:11.5px}'+
'#alertPop .al-ic{font-size:14px;color:var(--bad);text-align:center}#alertPop .al-i.w .al-ic{color:var(--warn)}'+
'#alertPop .al-i a{white-space:nowrap;font-size:12.5px;font-weight:600;color:var(--blue);text-decoration:none}#alertPop .al-i a:hover{text-decoration:underline}'+
'#alertPop .al-more{margin:6px 0 0;font-size:11.5px;color:var(--muted)}'+
/* painéis recolhíveis */
'.panel.fd>:not(.panel-head){display:none!important}.panel.fd .panel-head{margin-bottom:0}'+
'.fd-h{cursor:pointer;-webkit-user-select:none;user-select:none}'+
'.fd-h:after{content:"";display:inline-block;width:7px;height:7px;margin:0 0 3px 9px;border:solid var(--muted);border-width:0 2px 2px 0;transform:rotate(45deg);transition:transform .2s;vertical-align:middle}'+
'.panel.fd .fd-h:after{transform:rotate(-45deg);margin-bottom:0}'+
'.fd-h:hover:after{border-color:var(--ink)}.fd-h:focus-visible{outline:2px solid var(--blue);outline-offset:3px;border-radius:4px}'+
'@media print{#alertBell{display:none!important}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ======================================================================
   1. Alertas (Visão geral)
   ====================================================================== */
function dayMap(lists){
  var m={};
  lists.forEach(function(list){list.forEach(function(x){
    if(DESFECHOS.indexOf(x.outcome)<0)return;
    var ms=dt(x.firstDate);if(!ms)return;
    var k=x.agent+'|'+ymdLocal(new Date(ms)),o=m[k]||(m[k]={t:0,r:0,tr:0});
    o.t++;if(x.outcome==='resolvido')o.r++;if(x.outcome==='transferido')o.tr++;
  })});
  return m;
}
function weekStart(iso,ws){for(var i=0;i<ws.length;i++)if(iso>=ws[i].start&&iso<=ws[i].end)return ws[i].start;return''}
function link(ia,iso,ws){
  var qs=['ia='+encodeURIComponent(ia)];
  if(iso){var w=weekStart(iso,ws);if(w){qs.push('week='+w);qs.push('gran=day')}}
  return'#bi?'+qs.join('&');
}
function computeAlerts(){
  var out=[],p=period(),list=data.r72.protocols,metas=D.metas(),st=D.byIA(list);
  // 1) metas do período
  IAS.forEach(function(ia){
    var g=metas[ia],v=st[ia];if(!g||!v||v.t<10)return;
    var miss=[];
    D.FIELDS.forEach(function(f){
      var has=f[0]==='nota'?v.nn>0:v.t>0,ok=D.check(g,f[0],v[f[0]],has);
      if(ok===false)miss.push(f[1]+' '+(f[0]==='nota'?nt(v.nota):pc(v[f[0]]))+' <small style="display:inline;color:var(--muted)">('+D.goalText(g,f[0])+')</small>');
    });
    if(miss.length)out.push({k:'meta',ia:ia,html:'<b>'+esc(ia)+'</b> fora da meta no período',sub:miss.join(' · '),href:link(ia),w:true});
  });
  // 2) dias fora do padrão (compara com os 14 dias anteriores da mesma IA)
  var map=dayMap([list,prevProtocols()]),ws=D.weeks(p.start,p.end),today=ymdLocal(new Date()),days=[];
  var d=p.start,guard=0;while(d<=p.end&&guard++<400){if(d<today)days.push(d);d=plus(d,1)}
  IAS.forEach(function(ia){
    days.forEach(function(day){
      var o=map[ia+'|'+day];if(!o)return;
      var b={t:0,r:0,tr:0},i,x;
      for(i=1;i<=14;i++){x=map[ia+'|'+plus(day,-i)];if(x){b.t+=x.t;b.r+=x.r;b.tr+=x.tr}}
      if(o.t>=8&&b.t>=40){
        var p0=b.r/b.t,pd=o.r/o.t,se=Math.sqrt(Math.max(p0*(1-p0),.01)/o.t),drop=p0-pd;
        if(drop>=.10&&drop>2*se)out.push({k:'queda',day:day,ia:ia,tag:'queda',sub:'Resolvidos '+pc(pd*100)+' (média de '+pc(p0*100)+' nos 14 dias anteriores)',href:link(ia,day,ws)});
        var t0=b.tr/b.t,td=o.tr/o.t,se2=Math.sqrt(Math.max(t0*(1-t0),.01)/o.t),rise=td-t0;
        if(rise>=.10&&rise>2*se2)out.push({k:'transf',day:day,ia:ia,tag:'transf',sub:'Transferidos '+pc(td*100)+' (média de '+pc(t0*100)+')',href:link(ia,day,ws)});
      }
      var vals=[7,14,21,28].map(function(k){var y=map[ia+'|'+plus(day,-k)];return y?y.t:null}).filter(function(v){return v!=null});
      if(vals.length>=3){
        var avg=vals.reduce(function(a,v){return a+v},0)/vals.length;
        if(avg>=15&&o.t<avg*.4)out.push({k:'vol',day:day,ia:ia,tag:'vol',sub:'Volume baixo: '+n0(o.t)+' atendimentos (média de '+n0(avg)+' nesse dia da semana)',href:link(ia,day,ws)});
      }
    });
  });
  var metaA=out.filter(function(a){return a.k==='meta'}),rest=out.filter(function(a){return a.k!=='meta'}),merged={};
  // o mesmo dia da mesma IA vira um alerta só
  rest.forEach(function(a){
    var key=a.ia+'|'+a.day,m=merged[key];
    if(!m){merged[key]={k:'dia',ia:a.ia,day:a.day,html:'<b>'+esc(a.ia)+'</b> fora do padrão em '+brd(a.day),subs:[a.sub2||a.sub],href:a.href,tags:[a.tag]};return}
    m.subs.push(a.sub2||a.sub);m.tags.push(a.tag);
  });
  var days=Object.keys(merged).map(function(k){var m=merged[k];m.sub=m.subs.join(' · ');return m}).sort(function(a,b){return a.day<b.day?1:a.day>b.day?-1:0});
  return metaA.concat(days);
}
var BELL='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5.5 1.5 5.5h-13S5 12 5 8z"/><path d="M8.2 16.5a2 2 0 0 0 3.6 0"/></svg>';
function placeBell(){
  var w=window.__alertBell||q('#alertBell');if(!w)return;
  var mobile=window.matchMedia&&window.matchMedia('(max-width:820px)').matches,
      host=mobile?q('.topbar-inner'):q('.rail-inner'),ref=mobile?q('.topbar-inner .controls'):null;
  if(!host)return;
  if(mobile){if(w.parentNode!==host||w.nextElementSibling!==ref)host.insertBefore(w,ref)}
  else if(w.parentNode!==host||w!==host.lastElementChild)host.appendChild(w);
}
function closePop(){var p=q('#alertPop'),b=q('#alertBell .al-btn');if(p)p.hidden=true;if(b)b.setAttribute('aria-expanded','false')}
function ensureBell(){
  var w=q('#alertBell');if(w)return w;
  w=document.createElement('div');w.id='alertBell';window.__alertBell=w;
  w.innerHTML='<button type="button" class="al-btn" aria-haspopup="true" aria-expanded="false" aria-controls="alertPop" aria-label="Alertas" title="Alertas">'+BELL+'<span class="al-mark"></span></button><div id="alertPop" role="region" aria-label="Alertas" hidden></div>';
  var btn=q('.al-btn',w),pop=q('#alertPop',w);
  btn.addEventListener('click',function(e){e.stopPropagation();var open=pop.hidden;pop.hidden=!open;btn.setAttribute('aria-expanded',open?'true':'false')});
  pop.addEventListener('click',function(e){if(e.target.closest('a'))setTimeout(closePop,0)});
  document.addEventListener('click',function(e){if(!pop.hidden&&!w.contains(e.target))closePop()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pop.hidden){closePop();btn.focus()}});
  if(window.matchMedia){var mq=window.matchMedia('(max-width:820px)');(mq.addEventListener?mq.addEventListener('change',placeBell):mq.addListener(placeBell))}
  return w;
}
function renderAlerts(){
  if(typeof data==='undefined'||!data||!data.r72)return;
  var old=q('#alertPanel');if(old)old.remove();      // versão anterior: painel no topo da Visão geral
  var w=ensureBell();placeBell();
  var el=q('#alertPop',w),mark=q('.al-mark',w),btn=q('.al-btn',w);
  var a=computeAlerts(),shown=a.slice(0,6),hasMetas=Object.keys(D.metas()).length>0;
  if(!a.length){
    mark.className='al-mark al-ok-dot';mark.textContent='';btn.setAttribute('aria-label','Alertas: nenhum no período');btn.title='Nenhum alerta no período';
    el.innerHTML='<div class="al-h"><h2>Alertas</h2></div><p class="al-ok" style="margin:8px 0 0">✓ Nenhum alerta no período'+(hasMetas?': metas atingidas e sem dias fora do padrão.':'. Defina metas em “Metas e economia” para acompanhar também o cumprimento.')+'</p>';
    return;
  }
  mark.className='al-mark al-n';mark.textContent=a.length>99?'99+':a.length;
  btn.setAttribute('aria-label','Alertas: '+a.length);btn.title=a.length+' alerta'+(a.length>1?'s':'')+' no período';
  el.innerHTML='<div class="al-h"><h2>Alertas</h2></div>'+
    '<ul class="al-list">'+shown.map(function(x){return'<li class="al-i'+(x.w?' w':'')+'"><span class="al-ic" aria-hidden="true">'+(x.w?'◎':'▼')+'</span><div>'+x.html+'<small>'+x.sub+'</small></div><a href="'+x.href+'" title="Abrir no BI com esse filtro">Ver no BI →</a></li>'}).join('')+'</ul>'+
    (a.length>shown.length?'<p class="al-more">e mais '+(a.length-shown.length)+' alerta'+(a.length-shown.length>1?'s':'')+' mais antigos. Use o BI para ver o período dia a dia.</p>':'');
}

/* ======================================================================
   3. Painéis recolhíveis (clique no título)
   ====================================================================== */
var FOLD_KEY='mon-fold',DEFAULT_FOLDED=['Semana a semana'];
function foldState(){try{var s=JSON.parse(localStorage.getItem(FOLD_KEY)||'null');return s&&typeof s==='object'?s:null}catch(e){return null}}
function saveFold(s){try{localStorage.setItem(FOLD_KEY,JSON.stringify(s))}catch(e){}}
var SEL='[data-panel=overview] .panel,[data-panel=protocols] .panel,[data-panel=bi] .panel';
function panelKey(p){var h=q('.panel-head h2',p);return h?h.textContent.trim():''}
function eligible(p){return p.id!=='peakPanel'&&p.id!=='biHead'&&p.id!=='alertPanel'&&q('.panel-head h2',p)}
function applyFold(){
  var st=foldState(),first=st===null;
  if(first)st={};
  qa(SEL).forEach(function(p){
    if(!eligible(p))return;
    var key=panelKey(p),h=q('.panel-head h2',p);
    if(p.dataset.fk!==key){
      p.dataset.fk=key;
      var folded=first?DEFAULT_FOLDED.indexOf(key)>=0:!!st[key];
      p.classList.toggle('fd',folded);
    }
    h.classList.add('fd-h');h.tabIndex=0;h.setAttribute('role','button');h.setAttribute('aria-expanded',p.classList.contains('fd')?'false':'true');
    h.title=p.classList.contains('fd')?'Mostrar painel':'Recolher painel';
  });
}
function toggleFold(p){
  p.classList.toggle('fd');
  var st=foldState()||{};
  // grava o estado de todos os painéis na primeira vez, para não voltar ao padrão
  qa(SEL).forEach(function(x){if(eligible(x))st[panelKey(x)]=x.classList.contains('fd')});
  saveFold(st);applyFold();
}
document.addEventListener('click',function(e){
  var h=e.target.closest&&e.target.closest('.fd-h');if(!h)return;
  if(e.target.closest('a,button,select,input'))return;
  var p=h.closest('.panel');if(p)toggleFold(p);
});
document.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('fd-h')){e.preventDefault();var p=e.target.closest('.panel');if(p)toggleFold(p)}
});
/* na impressão e no PDF tudo aparece aberto */
var openedForPrint=[];
window.addEventListener('beforeprint',function(){openedForPrint=qa('.panel.fd');openedForPrint.forEach(function(p){p.classList.remove('fd')})});
window.addEventListener('afterprint',function(){openedForPrint.forEach(function(p){p.classList.add('fd')});openedForPrint=[]});
// painéis que se redesenham sozinhos perdem os atributos do título: reaplica
var t=null;
new MutationObserver(function(){clearTimeout(t);t=setTimeout(applyFold,80)}).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});

wrap('renderAll',function(){renderAlerts();applyFold()});
document.addEventListener('monprev',function(){try{renderAlerts()}catch(e){console.error(e)}});
// metas carregam depois da página: reavalia os alertas quando mudarem
var lastM='';setInterval(function(){var m=JSON.stringify(D.metas());if(m!==lastM){lastM=m;if(typeof data!=='undefined'&&data&&data.r72)try{renderAlerts()}catch(e){console.error(e)}}},1500);
window.monInsights={alerts:computeAlerts};
if(typeof data!=='undefined'&&data&&data.r72){renderAlerts();applyFold()}
})();
