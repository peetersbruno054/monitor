/* extras2.js — carregar DEPOIS de app.js, ui.js, overview.js e extras.js */
(function(){
'use strict';
var OUT=['resolvido','transferido','nao','inatividade','possivel','voltou'],
LBL={resolvido:'Resolvido',transferido:'Transferido',nao:'Não resolvido',inatividade:'Inatividade',possivel:'Aguardando confirmação',voltou:'Voltou em até 24h',retomado:'Retomado',outro:'Sem desfecho'},
MAP={'Resolvidos pela IA':'resolvido','Resolvidos':'resolvido','Transferidos':'transferido','Não resolvidos':'nao','Inatividade':'inatividade','Aguardando confirmação':'possivel','Voltou em até 24h':'voltou'};
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function wrap(n,f){var o=window[n];window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error(n,e)}return r}}
function ready(){return typeof data!=='undefined'&&data}

var css='.kpi2{position:relative}.spk{position:absolute;top:16px;right:14px;width:60px;height:26px;overflow:visible}.spk polyline{fill:none;stroke:var(--c);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.spk circle{fill:var(--c)}'+
'.oc-row,.ag-stat,.ag2-h{cursor:pointer}.ag-stat:hover{border-color:var(--blue)}.ag-stat:not(:has(.mb)){cursor:default}.ag-stat:not(:has(.mb)):hover{border-color:var(--line2)}'+
'.fchip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 6px 0 12px;border-radius:999px;background:var(--surface3);font-size:12px;white-space:nowrap}.fchip button{border:0;background:none;font-size:16px;line-height:1;color:var(--muted)}'+
'.more-all{display:block;margin:12px auto 0}#printHead{display:none}'+
'@media(max-width:620px){.spk{display:none}}'+
'@media print{@page{margin:12mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;animation:none!important}body{zoom:1!important;background:#fff}'+
'.controls,.rail,#toast,.toolbar,.chips,.pager,.segmented,.view-btn,.more-btn,.more-all,#retryBtn,.btn,.fchip button,.spk{display:none!important}'+
'.topbar{border:0;box-shadow:none}.topbar-inner{padding:0 0 6px}#printHead{display:block!important;margin:0 0 10px;font-size:13px}'+
'[data-panel][hidden]{display:flex!important}[data-panel]{break-before:page}[data-panel="overview"]{break-before:auto}'+
'.shell{padding:8px 0!important}.panel,.kpi2,.ag2,.survey-row{break-inside:avoid;box-shadow:none}.clamp{max-height:none}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Utilidades ---------- */
function toast(m){var t=q('#toast')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'toast',role:'status'}));t.textContent=m;t.className='show';clearTimeout(toast.t);toast.t=setTimeout(function(){t.className=''},1800)}
function copy(s,m){(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).catch(function(){var a=document.createElement('textarea');a.value=s;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}).then(function(){toast(m)})}
function dm(s){return s.split('-').reverse().join('/')}
function period(){var s=$('start').value,e=$('end').value;return s===e?dm(s):dm(s)+' a '+dm(e)}
function head(t,s,r){return'<div class="panel-head"><div><h2>'+t+'</h2><p>'+s+'</p></div>'+(r||'')+'</div>'}
function row(x,extra){var s=x.survey,n=s&&s.note?s.note:0,cl=window.CONVO_URL?'Ver conversa ↗':'⧉ Copiar protocolo';
  return'<div class="survey-row '+(n?(n>=4?'n-good':n===3?'n-mid':'n-bad'):'')+'"><div class="score-box'+(n&&n<=3?' low':'')+'">'+(n||'—')+'<small style="display:block;font-size:9px;font-weight:500">nota</small></div><div class="row-main"><div class="row-top"><b>Protocolo '+esc(x.protocol)+'</b><span class="pill">'+esc(x.agent)+'</span><span class="row-date">'+esc(x.lastDate||x.firstDate)+'</span></div><div class="row-content">'+esc(extra)+'</div></div><button class="view-btn" type="button">'+cl+'</button></div>'}
function panel(id,before){var p=q('#'+id);if(!p){p=document.createElement('article');p.id=id;p.className='panel';before().before(p)}return p}

/* ---------- Tendência diária nos KPIs (períodos com mais de 1 dia) ---------- */
function dayKey(ms){var d=new Date(ms);d.setHours(0,0,0,0);return d.getTime()}
function svg(v){if(v.length<2)return'';var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),W=60,H=26,
  pts=v.map(function(y,i){return[(i/(v.length-1)*W).toFixed(1),(H-2-(mx===mn?.5:(y-mn)/(mx-mn))*(H-4)).toFixed(1)]}),l=pts[pts.length-1];
  return'<svg class="spk" viewBox="0 0 '+W+' '+H+'" role="img"><title>Evolução diária ('+v.length+' dias)</title><polyline points="'+pts.map(function(p){return p.join(',')}).join(' ')+'"/><circle cx="'+l[0]+'" cy="'+l[1]+'" r="2.2"/></svg>'}
function spark(){
  qa('.spk').forEach(function(x){x.remove()});if($('start').value===$('end').value)return;
  var D={},S={};
  data.r72.protocols.forEach(function(x){if(OUT.indexOf(x.outcome)<0)return;var m=dt(x.firstDate);if(!m)return;var k=dayKey(m),o=D[k]||(D[k]={t:0,r:0,tr:0});o.t++;if(x.outcome==='resolvido')o.r++;if(x.outcome==='transferido')o.tr++});
  data.r74.forEach(function(x){var m=dt(x.date);if(!m||!x.note)return;var k=dayKey(m),o=S[k]||(S[k]={n:0,s:0,p:0});o.n++;o.s+=x.note;if(x.note>=4)o.p++});
  var dk=Object.keys(D).sort(function(a,b){return a-b}),sk=Object.keys(S).sort(function(a,b){return a-b}),
  ser=[dk.map(function(k){return pct(D[k].r,D[k].t)}),dk.map(function(k){return pct(D[k].tr,D[k].t)}),sk.map(function(k){return S[k].s/S[k].n}),sk.map(function(k){return pct(S[k].p,S[k].n)})];
  qa('#overviewKpis .kpi2').forEach(function(c,i){if(ser[i])c.insertAdjacentHTML('beforeend',svg(ser[i]))});
}

/* ---------- Clique para filtrar (painel no topo de Protocolos) ---------- */
var F=null,shown=20;
function drill(){
  var P=panel('drill',function(){return q('#protocolKpis')});
  if(!F||!ready()){P.hidden=true;return}
  var l=data.r72.protocols.filter(function(x){return(F.o?(F.o==='nao'?isUnresolvedProtocol(x):x.outcome===F.o):OUT.indexOf(x.outcome)>=0)&&(!F.a||x.agent===F.a)})
    .sort(function(a,b){return dt(b.lastDate)-dt(a.lastDate)});
  P.hidden=false;
  P.innerHTML=head((F.o?LBL[F.o]:'Todos os desfechos')+(F.a?' · '+esc(F.a):''),'Protocolos do período, do mais recente ao mais antigo','<span class="fchip">'+fmt(l.length)+' protocolos <button type="button" data-x aria-label="Limpar filtro">×</button></span>')+
    (l.length?l.slice(0,shown).map(function(x){return row(x,'Último ponto: '+(x.finalPoint||LBL[x.outcome]))}).join(''):'<div class="empty">Nenhum protocolo encontrado.</div>')+
    (l.length>shown?'<button type="button" class="btn btn-secondary more-all" data-more>Mostrar mais ('+fmt(l.length-shown)+')</button>':'');
}
function open(o,a){if(!o&&!a)return;F={o:o,a:a};shown=20;drill();if(location.hash==='#protocols')window.scrollTo({top:0,behavior:'smooth'});else location.hash='protocols'}
function mark(){qa('.oc-row,.ag-stat,.ag2-h').forEach(function(el){if(el.classList.contains('ag-stat')&&!q('.mb',el))return;el.tabIndex=0;el.setAttribute('role','button')})}

/* ---------- Falhas de conhecimento (aba Qualidade) ---------- */
var kfAll=false;
function kf(){
  var l=data.r72.protocols.filter(function(x){return x.events.some(function(e){return norm(e.point).indexOf('falha de conhecimento')>=0})}).sort(function(a,b){return dt(b.lastDate)-dt(a.lastDate)}),
  by={};l.forEach(function(x){by[x.agent]=(by[x.agent]||0)+1});
  panel('kfPanel',function(){return q('#checkpointList').closest('.panel')}).innerHTML=
    head('Falhas de conhecimento','Protocolos em que a IA não soube responder: onde vale treinar','<span class="badge">'+fmt(l.length)+' protocolos</span>')+
    (l.length?'<div class="chips">'+Object.keys(by).map(function(a){return'<span class="pill">'+esc(a)+' · '+by[a]+'</span>'}).join('')+'</div>'+
      l.slice(0,kfAll?l.length:10).map(function(x){return row(x,'Terminou como: '+(LBL[x.outcome]||'Sem desfecho'))}).join('')+
      (l.length>10?'<button type="button" class="btn btn-secondary more-all" data-kf>'+(kfAll?'Mostrar menos':'Mostrar todos ('+l.length+')')+'</button>':''):'<div class="empty">Nenhuma falha de conhecimento no período.</div>');
}

/* ---------- Resumo para copiar ---------- */
function summary(){
  if(!ready())return toast('Aguarde a coleta terminar');
  var all=data.r72.protocols,p=all.filter(function(x){return OUT.indexOf(x.outcome)>=0}),t=p.length,c=function(l,o){return l.filter(function(x){return x.outcome===o}).length},
  un=all.filter(isUnresolvedProtocol).length,s=data.r74,n=s.filter(function(x){return x.note}),avg=n.length?(n.reduce(function(a,x){return a+x.note},0)/n.length).toFixed(2).replace('.',','):'',
  ag={},fk=all.filter(function(x){return x.events.some(function(e){return norm(e.point).indexOf('falha de conhecimento')>=0})}).length;
  p.forEach(function(x){(ag[x.agent]=ag[x.agent]||[]).push(x)});
  var L=['Monitor IA · Safeweb — '+period(),
   'Atendimentos com desfecho: '+fmt(t)+' ('+pct(t,all.length)+'% dos '+fmt(all.length)+' iniciados)',
   'Resolvidos pela IA: '+pct(c(p,'resolvido'),t)+'% ('+c(p,'resolvido')+') · Transferidos: '+pct(c(p,'transferido'),t)+'% ('+c(p,'transferido')+') · Não resolvidos: '+pct(un,t)+'% ('+un+') · Inatividade: '+pct(c(p,'inatividade'),t)+'% ('+c(p,'inatividade')+') · Voltaram em até 24h: '+pct(c(p,'voltou'),t)+'% ('+c(p,'voltou')+')',
   'Nota média: '+(avg||'sem avaliações')+(n.length?' ('+n.length+' avaliações) · Satisfação positiva: '+nPositive(s)+'%':'')];
  Object.keys(ag).sort(function(a,b){return ag[b].length-ag[a].length}).forEach(function(a){var z=ag[a];L.push('• '+a+': '+z.length+' atend. · '+pct(c(z,'transferido'),z.length)+'% transferidos · '+pct(c(z,'resolvido'),z.length)+'% resolvidos')});
  if(fk)L.push('Falhas de conhecimento: '+fk+' protocolos');
  copy(L.join('\n'),'Resumo copiado');
}

/* ---------- Botões no cabeçalho e impressão ---------- */
var ctl=q('.controls'),ref=q('#autoBtn');
function mk(id,html,title){var b=document.createElement('button');b.id=id;b.type='button';b.className='btn btn-ghost';b.innerHTML=html;b.title=title;b.setAttribute('aria-label',title);ctl.insertBefore(b,ref);return b}
mk('summaryBtn','⧉ Resumo','Copiar resumo do período').onclick=summary;
mk('printBtn','⎙ PDF','Imprimir ou salvar em PDF').onclick=function(){window.print()};
var ph=document.createElement('div');ph.id='printHead';ph.hidden=true;q('#main').before(ph);
var th;
addEventListener('beforeprint',function(){th=document.documentElement.dataset.theme;document.documentElement.dataset.theme='light';ph.innerHTML='<b>Período:</b> '+period()+' · gerado em '+new Date().toLocaleString('pt-BR')});
addEventListener('afterprint',function(){document.documentElement.dataset.theme=th});

/* ---------- Eventos ---------- */
document.addEventListener('click',function(e){
  var r=e.target.closest('.oc-row'),s=e.target.closest('.ag-stat'),h=e.target.closest('.ag2-h');
  if(e.target.closest('.view-btn,.more-btn,.ph'))return;
  if(r)open(MAP[q('b',r).textContent],null);
  else if(s&&q('.mb',s))open(MAP[q('small',s).textContent],q('.ag2-h b',s.closest('.ag2')).textContent);
  else if(h)open(null,q('b',h).textContent);
  if(e.target.closest('[data-x]')){F=null;drill()}
  if(e.target.closest('[data-more]')){shown+=20;drill()}
  if(e.target.closest('[data-kf]')){kfAll=!kfAll;kf()}
});
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.oc-row,.ag-stat,.ag2-h')){e.preventDefault();e.target.click()}});
wrap('renderOverview',function(){spark();mark()});
wrap('renderAgents',mark);
wrap('renderQuality',kf);
wrap('renderAll',drill);
})();
