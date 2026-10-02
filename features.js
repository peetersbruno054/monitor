/* features.js — carregar DEPOIS de app.js, ui.js, overview.js e extras.js.
   Clicar para filtrar · Resumo para copiar · Falhas de conhecimento · Tendência nos KPIs · Impressão/PDF */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var OUT=DESFECHOS;
var DESC={
  nao:'Protocolos com o bot point “Problema não resolvido”',
  resolvido:'Protocolos cujo último desfecho foi “Problema resolvido”',
  transferido:'Protocolos que a IA encaminhou para atendimento humano',
  inatividade:'Protocolos finalizados porque o cliente parou de responder',
  possivel:'Pesquisa encaminhada como possível solução, ainda sem confirmação',
  falha:'Protocolos em que a IA registrou “Falha de conhecimento”',
  finalizado:'Protocolos em que o cliente não retomou o atendimento (“Não retomou atendimento”)',
  safenota:'Protocolos encerrados pelo fluxo “Finaliza SafeNota”',
  andamento:'Só “Iniciado atendimento” há menos de 24h: viram Inatividade se não houver resposta',
  sem:'Protocolos que não registraram nenhum ponto de encerramento: veja a trilha de cada um',
  todos:'Todos os protocolos da IA que tiveram desfecho no período'
};
function wrap(n,f,before){var o=window[n];window[n]=function(){if(before)try{f.apply(this,arguments)}catch(e){console.error(n,e)}var r=o.apply(this,arguments);if(!before)try{f.apply(this,arguments)}catch(e){console.error(n,e)}return r}}
function toast(m){if(window.monToast)window.monToast(m)}
function brDay(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:''}
function dayKey(v){var m=String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);m=String(v||'').match(/(\d{4})-(\d{2})-(\d{2})/);return m?m[1]+'-'+m[2]+'-'+m[3]:''}
function outcomes(){return data.r72.protocols.filter(function(x){return OUT.indexOf(x.outcome)>=0})}
function svgIcon(p){return'<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'}
function keyGo(el,fn,label){el.classList.add('go');el.setAttribute('role','button');el.tabIndex=0;if(label)el.setAttribute('aria-label',label);el.addEventListener('click',fn);el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fn(e)}})}

/* ======================================================================
   0. Regras para protocolos sem ponto de encerramento (definidas pela coordenação)
      Não retomou atendimento .......... Finalizado
      Finaliza SafeNota ................ Finaliza SafeNota
      Atendimento retomado / Retomada .. Transferido (fila)
      Só Falha de conhecimento ......... Transferido (fila)
      Só Iniciado atendimento .......... Inatividade depois de 24h; antes disso, Em andamento
      Vale o último desses pontos na trilha. Só se aplica a quem não tem desfecho próprio.
   ====================================================================== */
var WAIT_H=24;
function trailRule(p){var x=norm(p);
  if(x.indexOf('nao retomou')>=0||x.indexOf('nao retornou')>=0)return'finalizado';
  if(x.indexOf('finaliza safenota')>=0)return'safenota';
  if(x.indexOf('retomad')>=0||x.indexOf('retomou')>=0)return'transferido';
  if(x.indexOf('falha de conhecimento')>=0)return'transferido';
  return'';}
var _a72=window.analyze72;
window.analyze72=function(raw){
  var r=_a72(raw),now=Date.now();
  r.protocols.forEach(function(x){
    if(x.outcome!=='outro')return;
    var ev=(x.events||[]).slice().sort(function(a,b){return(a.ms&&b.ms&&a.ms!==b.ms)?a.ms-b.ms:a.index-b.index}),hit=null,last=0;
    ev.forEach(function(e){var o=trailRule(e.point);if(o)hit={o:o,point:e.point};last=Math.max(last,e.ms||0)});
    if(hit){x.outcome=hit.o;x.finalPoint=hit.point;x.inferred=true;return}
    // só quem tem "Iniciado atendimento" da IA; linhas sem bot point não viram desfecho
    if(ev.some(function(e){return norm(e.point).indexOf('iniciado atendimento')>=0})){x.outcome=last&&now-last<WAIT_H*36e5?'andamento':'inatividade';x.inferred=true}
  });
  return r;
};

/* Período efetivamente carregado (o seletor pode mudar antes de clicar em Atualizar) */
var loaded={start:$('start').value,end:$('end').value,label:''};
wrap('renderAll',function(){var p=$('preset');loaded={start:$('start').value,end:$('end').value,label:p.value==='custom'?'Período':p.options[p.selectedIndex].text}},true);
function periodText(){var a=brDay(loaded.start),b=brDay(loaded.end);return(loaded.label||'Período')+' ('+(a===b?a:a.slice(0,5)+' a '+b)+')'}

/* ======================================================================
   1. Clicar para filtrar → aba Protocolos com a lista daquele desfecho/IA
   ====================================================================== */
var toolbar=q('#unresolvedSearch').parentNode,outSel=document.createElement('select');
outSel.id='unresolvedOutcome';outSel.setAttribute('aria-label','Desfecho');
outSel.innerHTML=Object.keys(OUTCOME_LIST).map(function(k){return'<option value="'+k+'">'+OUTCOME_LIST[k]+'</option>'}).join('');
toolbar.insertBefore(outSel,$('unresolvedAgent'));toolbar.classList.add('t5');
outSel.onchange=function(){uv.outcome=outSel.value;uv.page=1;if(data)renderProtocols()};
var listPanel=$('unresolvedList').closest('.panel'),listH=q('.panel-head h2',listPanel),listP=q('.panel-head p',listPanel);

wrap('renderProtocols',function(){
  var o=uv.outcome||'nao';outSel.value=o;
  listH.textContent=o==='nao'?'Problemas não resolvidos':OUTCOME_LIST[o];listP.textContent=DESC[o];
  if(o!=='nao'||uv.agent){$('unresolvedChips').insertAdjacentHTML('beforeend','<button type="button" class="chip clear" data-clear-filters>✕ Limpar filtros</button>')}
});
wrap('renderUnList',function(){
  var by={};data.r72.protocols.forEach(function(x){by[x.protocol]=x});
  qa('#unresolvedList .protocol-card').forEach(function(c){var b=q('.view-btn',c),x=b&&by[b.dataset.protocol],pp=q('.protocol-point',c);
    if(x&&x.inferred&&pp&&!q('.rule-pill',pp)){q('.pill',pp).insertAdjacentHTML('afterend','<span class="pill rule-pill" title="Sem ponto de encerramento: classificado pela trilha de bot points">pela trilha</span>');
      var d=q(':scope>div',pp);if(d&&!/^Trilha/.test(d.textContent))d.textContent='Trilha: '+trail(x)}});
});
/* Sem desfecho: agrupado pelo último bot point, para decidir como classificar */
var RECENT_H=2;
function lastMs(x){var e=x.events||[],m=0;e.forEach(function(v){m=Math.max(m,dt(v.date)||0)});return m}
function maybeOpen(x){var m=lastMs(x);return m&&Date.now()-m<RECENT_H*36e5}
function shortPoint(p){return String(p||'').replace(/\s*-\s*IA\s*-\s*(SPC|Safe)\s*$/i,'').trim()||'(sem bot point)'}
wrap('renderProtocols',function(){
  var box=$('semGroups');
  if((uv.outcome||'nao')!=='sem'){if(box)box.remove();return}
  if(!box){box=document.createElement('div');box.id='semGroups';$('unresolvedChips').before(box)}
  var list=listBase(),g={},open=list.filter(maybeOpen).length;
  list.forEach(function(x){var k=shortPoint(x.finalPoint);(g[k]=g[k]||{n:0,ag:{}}).n++;g[k].ag[x.agent]=(g[k].ag[x.agent]||0)+1});
  var keys=Object.keys(g).sort(function(a,b){return g[b].n-g[a].n});
  box.innerHTML='<div class="sg-head"><b>Por último bot point registrado</b><small>Clique para filtrar a lista'+(open?' · '+fmt(open)+' com atividade nas últimas '+RECENT_H+'h (podem estar em andamento)':'')+'</small></div>'+
    (keys.length?'<div class="sg-rows">'+keys.map(function(k){var o=g[k];return'<button type="button" class="sg-row'+(norm(uv.q)===norm(k)?' on':'')+'" data-sem-point="'+esc(k)+'"><span>'+esc(k)+'<small>'+Object.keys(o.ag).map(function(a){return esc(a)+' '+o.ag[a]}).join(' · ')+'</small></span><b>'+fmt(o.n)+'</b><i>'+pct(o.n,list.length)+'%</i></button>'}).join('')+'</div>':'');
});
document.addEventListener('click',function(e){var b=e.target.closest('[data-sem-point]');if(!b)return;var k=b.dataset.semPoint,same=norm(uv.q)===norm(k);uv.q=same?'':k;$('unresolvedSearch').value=uv.q;uv.page=1;renderProtocols()});
wrap('renderUnList',function(){
  if((uv.outcome||'nao')!=='sem')return;var by={};data.r72.protocols.forEach(function(x){by[x.protocol]=x});
  qa('#unresolvedList .protocol-card').forEach(function(c){var b=q('.view-btn',c),x=b&&by[b.dataset.protocol];if(x&&maybeOpen(x)){var pp=q('.protocol-point',c);if(pp&&!q('.open-pill',pp))q('.pill',pp).insertAdjacentHTML('afterend','<span class="pill open-pill">Atividade recente: pode estar em andamento</span>')}});
});
wrap('renderUnList',function(){var a=unresolved().length,b=listBase().length;$('unresolvedBadge').textContent=(a===b?fmt(b):fmt(a)+' de '+fmt(b))+' protocolo'+(b===1?'':'s')});
document.addEventListener('click',function(e){
  if(!e.target.closest('[data-clear-filters]'))return;
  uv.outcome='nao';uv.agent='';uv.q='';uv.filter='all';uv.page=1;$('unresolvedSearch').value='';renderProtocols();
});

window.goProtocols=function(outcome,agent){
  if(!data)return;
  uv.outcome=outcome||'nao';uv.agent=agent||'';uv.q='';uv.filter='all';uv.page=1;$('unresolvedSearch').value='';
  if(location.hash!=='#protocols')location.hash='protocols';
  renderProtocols();
  setTimeout(function(){listPanel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},60);
};
function goSurveys(agent){
  if(!data)return;sv.agent=agent||'';sv.q='';sv.option='';sv.filter='all';sv.page=1;$('surveySearch').value='';
  if(location.hash!=='#surveys')location.hash='surveys';
  renderSurveys();$('surveyAgent').value=sv.agent;renderSurveyList();
}

function bindOverview(){
  var sm=q('#outcomes .oc-sum small'),cnt=function(o){return data.r72.protocols.filter(function(x){return x.outcome===o}).length},nAnd=cnt('andamento'),nSem=cnt('outro');
  if(sm&&nAnd)sm.insertAdjacentHTML('beforeend',' · <button type="button" class="link-btn" data-go-out="andamento">'+fmt(nAnd)+' em andamento</button>');
  if(sm&&nSem)sm.insertAdjacentHTML('beforeend',' · <button type="button" class="link-btn" data-go-out="sem">'+fmt(nSem)+' sem desfecho</button>');
  qa('#outcomes .oc-row').forEach(function(row){
    var o=row.dataset.o;if(!o)return;var name=q('.oc-l b',row).textContent;
    keyGo(row,function(e){if(e&&e.target&&e.target.closest('.oc-sp [data-agent]'))return;goProtocols(o)},'Ver protocolos: '+name);
    qa('.oc-sp span',row).forEach(function(sp){
      var ag=sp.firstChild?sp.firstChild.textContent:'';if(!ag)return;sp.dataset.agent=ag;
      keyGo(sp,function(e){e.stopPropagation();goProtocols(o,ag)},'Ver protocolos: '+name+' · '+ag);
    });
  });
}
function bindAgents(){
  qa('#agentCards .ag2').forEach(function(card){
    var name=q('.ag2-h b',card).textContent;
    keyGo(q('.ag2-h',card),function(){goProtocols('todos',name)},'Ver todos os protocolos de '+name);
    var st=qa('.ag-stat',card),map=['resolvido','transferido','nao'];
    st.forEach(function(s,i){
      if(i<3)keyGo(s,function(){goProtocols(map[i],name)},'Ver protocolos de '+name+': '+q('small',s).textContent);
      else keyGo(s,function(){goSurveys(name)},'Ver pesquisas de '+name);
    });
  });
  qa('#agentTable tr').forEach(function(tr){var td=q('td',tr);if(!td)return;var name=td.textContent;keyGo(tr,function(){goProtocols('todos',name)},'Ver protocolos de '+name)});
}
wrap('renderOverview',bindOverview);
wrap('renderAgents',bindAgents);
wrap('renderQuality',function(){
  var map={'Com desfecho':'todos','Resolvidos':'resolvido','Transferidos':'transferido','Não resolvidos':'nao','Inatividade':'inatividade','Aguardando':'possivel','Finalizado':'finalizado','Finaliza SafeNota':'safenota'};
  qa('#funnelPanel .fn').forEach(function(r){var o=map[r.firstChild.textContent];if(o)keyGo(r,function(){goProtocols(o)},'Ver protocolos: '+r.firstChild.textContent)});
});

/* ======================================================================
   2. Falhas de conhecimento (aba Qualidade)
   ====================================================================== */
var OUTLBL={resolvido:'Resolvido',transferido:'Transferido',nao:'Não resolvido',inatividade:'Inatividade',possivel:'Aguardando',retomado:'Retomado',outro:'Sem desfecho'};
wrap('renderQuality',function(){
  var anchor=$('recontactList').closest('.panel'),p=$('knowledgePanel');
  if(!p){p=document.createElement('article');p.id='knowledgePanel';p.className='panel';anchor.after(p)}
  var all=data.r72.protocols,list=all.filter(hasFailure),n=list.length;
  var head='<div class="panel-head"><div><h2>Falhas de conhecimento</h2><p>Atendimentos em que a IA não soube responder: mostram o que precisa entrar no treinamento</p></div><span class="badge">'+fmt(n)+' protocolo'+(n===1?'':'s')+'</span></div>';
  if(!n){p.innerHTML=head+'<div class="empty">Nenhuma falha de conhecimento registrada no período.</div>';return}
  var byAg={},ends={};list.forEach(function(x){byAg[x.agent]=(byAg[x.agent]||0)+1;var o=isUnresolvedProtocol(x)?'nao':x.outcome;ends[o]=(ends[o]||0)+1});
  var agTxt=Object.keys(byAg).sort(function(a,b){return byAg[b]-byAg[a]}).map(function(a){return esc(a)+' '+fmt(byAg[a])}).join(' · ');
  var endTxt=['transferido','nao','resolvido','inatividade','possivel','outro','retomado'].filter(function(k){return ends[k]}).map(function(k){return'<span class="pill o-'+k+'">'+OUTLBL[k]+'<b>'+fmt(ends[k])+'</b></span>'}).join('');
  var recent=list.slice().sort(function(a,b){var fa=failurePoint(a),fb=failurePoint(b);return dt(fb&&fb.date)-dt(fa&&fa.date)}).slice(0,6);
  p.innerHTML=head+
    '<div class="kf-sum"><big>'+fmt(n)+'</big><div class="kf-t"><b>'+pct(n,all.length)+'% dos '+fmt(all.length)+' atendimentos iniciados</b><small>'+agTxt+'</small></div><div class="kf-ends" aria-label="Como terminaram">'+endTxt+'</div></div>'+
    '<div class="kf-list">'+recent.map(function(x){var f=failurePoint(x),o=isUnresolvedProtocol(x)?'nao':x.outcome,s=x.survey;
      return'<div class="item"><div class="kf-top"><b>Protocolo '+esc(x.protocol)+'</b><span class="pill">'+esc(x.agent)+'</span><span class="pill o-'+esc(o)+'">Terminou: '+esc(OUTLBL[o]||'Sem desfecho')+'</span></div>'+
        '<div class="meta">'+esc(f?f.date:x.firstDate)+(s&&s.note?' · nota '+s.note:'')+(s&&s.comment?' · “'+esc(s.comment.length>140?s.comment.slice(0,137)+'…':s.comment)+'”':'')+'</div>'+
        '<button type="button" class="view-btn" data-protocol="'+esc(x.protocol)+'">⧉ Copiar protocolo</button></div>'}).join('')+'</div>'+
    (n>recent.length?'<div class="kf-foot"><button type="button" class="btn btn-secondary" data-go-failures>Ver os '+fmt(n)+' protocolos</button></div>':'');
});
document.addEventListener('click',function(e){if(e.target.closest('[data-go-failures]'))goProtocols('falha')});
document.addEventListener('click',function(e){var b=e.target.closest('[data-go-out]');if(b)goProtocols(b.dataset.goOut)});

/* ======================================================================
   3. Tendência por dia nos KPIs da Visão geral (períodos com mais de um dia)
   ====================================================================== */
function daysOf(a,b){var out=[],d=new Date(a+'T12:00:00'),e=new Date(b+'T12:00:00');while(d<=e&&out.length<93){out.push(ymdLocal(d));d.setDate(d.getDate()+1)}return out}
function series(){
  var days=daysOf(loaded.start,loaded.end);if(days.length<2)return null;
  var P={},S={};days.forEach(function(d){P[d]={t:0,r:0,tr:0};S[d]={n:0,sum:0,pos:0}});
  outcomes().forEach(function(x){var d=dayKey(x.firstDate);if(!P[d])return;P[d].t++;if(x.outcome==='resolvido')P[d].r++;if(x.outcome==='transferido')P[d].tr++});
  data.r74.forEach(function(x){var d=dayKey(x.date);if(!S[d]||!x.note)return;S[d].n++;S[d].sum+=x.note;if(x.note>=4)S[d].pos++});
  return{days:days,
    res:days.map(function(d){return P[d].t?P[d].r/P[d].t*100:null}),
    tr:days.map(function(d){return P[d].t?P[d].tr/P[d].t*100:null}),
    avg:days.map(function(d){return S[d].n?S[d].sum/S[d].n:null}),
    pos:days.map(function(d){return S[d].n?S[d].pos/S[d].n*100:null})};
}
function spark(vals,days,fmtv,limits){
  var pts=vals.map(function(v,i){return v==null?null:[i,v]}).filter(Boolean);if(pts.length<2)return'';
  // escala pelos próprios dados, com amplitude mínima para variações pequenas não parecerem enormes
  var W=100,H=28,pad=3,n=vals.length-1,lo=Math.min.apply(null,pts.map(function(p){return p[1]})),hi=Math.max.apply(null,pts.map(function(p){return p[1]})),minSpan=limits[2];
  if(hi-lo<minSpan){var mid=(hi+lo)/2;lo=mid-minSpan/2;hi=mid+minSpan/2}
  if(lo<limits[0]){hi+=limits[0]-lo;lo=limits[0]}if(hi>limits[1]){lo-=hi-limits[1];hi=limits[1]}
  var X=function(i){return n?i/n*W:W/2},Y=function(v){return pad+(1-(v-lo)/(hi-lo))*(H-2*pad)};
  // segmentos contínuos (dias sem dados interrompem a linha)
  var segs=[],cur=[];vals.forEach(function(v,i){if(v==null){if(cur.length)segs.push(cur);cur=[]}else cur.push([X(i),Y(v)])});if(cur.length)segs.push(cur);
  var path=segs.map(function(s){return'M'+s.map(function(p){return p[0].toFixed(2)+' '+p[1].toFixed(2)}).join('L')}).join(''),
      area=segs.filter(function(s){return s.length>1}).map(function(s){return'M'+s[0][0].toFixed(2)+' '+H+'L'+s.map(function(p){return p[0].toFixed(2)+' '+p[1].toFixed(2)}).join('L')+'L'+s[s.length-1][0].toFixed(2)+' '+H+'Z'}).join(''),
      last=pts[pts.length-1],lx=X(last[0]),ly=Y(last[1]);
  var desc=days.map(function(d,i){return brDay(d).slice(0,5)+': '+(vals[i]==null?'sem dados':fmtv(vals[i]))}).join(' · ');
  return'<span class="spark" title="'+esc(desc)+'"><span class="plot"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><path class="ar" d="'+area+'"/><path class="ln" d="'+path+'"/></svg><i class="pt" style="left:'+(lx/W*100).toFixed(2)+'%;top:'+(ly/H*100).toFixed(2)+'%"></i></span>'+
    '<span class="ax"><span>'+brDay(days[0]).slice(0,5)+'</span><span>por dia</span><span>'+brDay(days[days.length-1]).slice(0,5)+'</span></span><span class="sr">Evolução por dia: '+esc(desc)+'</span></span>';
}
wrap('renderOverview',function(){
  var s=series(),cards=qa('#overviewKpis .kpi2');if(!s||cards.length<4)return;
  var pc=function(v){return Math.round(v)+'%'},nt=function(v){return v.toFixed(2).replace('.',',')};
  [[s.res,pc,[0,100,12]],[s.tr,pc,[0,100,12]],[s.avg,nt,[1,5,.6]],[s.pos,pc,[0,100,12]]].forEach(function(c,i){var h=spark(c[0],s.days,c[1],c[2]);if(h)cards[i].insertAdjacentHTML('beforeend',h)});
});

/* ======================================================================
   3b. Atendimentos por hora: barras empilhadas por desfecho
       (cada protocolo entra uma vez, na hora em que começou)
   ====================================================================== */
var HSER=[['resolvido','Resolvidos','resolved'],['nao','Não resolvidos','bad'],['transferido','Transferidos','transferred'],['outros','Outros desfechos','other']];
function hourCat(x){if(x.outcome==='resolvido')return'resolvido';if(isUnresolvedProtocol(x))return'nao';if(x.outcome==='transferido')return'transferido';return'outros'}
/* o cinza "outros" é detalhado na legenda e na dica */
var OSUB=[['inatividade','Inatividade'],['possivel','Aguardando confirmação'],['finalizado','Finalizado'],['safenota','Finaliza SafeNota'],['andamento','Em andamento'],['sem','Sem desfecho']];
function otherSub(x){return['inatividade','possivel','finalizado','safenota','andamento'].indexOf(x.outcome)>=0?x.outcome:'sem'}
wrap('renderOverview',function(){
  var p=$('hoursPanel');if(!p)return;
  var h=[],i;for(i=0;i<24;i++)h.push({t:0,resolvido:0,nao:0,transferido:0,outros:0,inatividade:0,possivel:0,finalizado:0,safenota:0,andamento:0,sem:0});
  data.r72.protocols.forEach(function(x){var m=dt(x.firstDate);if(!m)return;var k=new Date(m).getHours(),c=hourCat(x);h[k].t++;h[k][c]++;if(c==='outros')h[k][otherSub(x)]++});
  var mx=Math.max.apply(null,h.map(function(v){return v.t}).concat(1)),tot={};HSER.concat(OSUB).forEach(function(s){tot[s[0]]=h.reduce(function(a,v){return a+v[s[0]]},0)});
  var subTxt=function(v){return OSUB.filter(function(s){return v[s[0]]}).map(function(s){return s[1]+' '+fmt(v[s[0]])}).join(' · ')};
  var step=mx<=5?1:mx<=10?2:mx<=25?5:mx<=50?10:Math.ceil(mx/5/10)*10,top=Math.ceil(mx/step)*step,grid='';
  for(var g=step;g<=top;g+=step)grid+='<div class="hs-gl" style="bottom:'+(g/top*100)+'%"><span>'+g+'</span></div>';
  p.innerHTML='<div class="panel-head"><div><h2>Atendimentos por hora</h2><p>Quando a IA recebe protocolos e como eles terminam, pela hora de início</p></div></div>'+
    '<div class="hs-legend">'+HSER.map(function(s){return'<span><i class="sw sw-'+s[2]+'"></i>'+s[1]+' <b>'+fmt(tot[s[0]])+'</b>'+(s[0]==='outros'&&tot.outros?'<small>('+subTxt(tot)+')</small>':'')+'</span>'}).join('')+'</div>'+
    '<div class="hs"><div class="hs-plot">'+grid+'<div class="hs-cols">'+h.map(function(v,k){
      var segs=HSER.map(function(s){var n=v[s[0]];return n?'<u class="sg sg-'+s[2]+'" style="height:'+(n/top*100)+'%"></u>':''}).join('');
      var lab=k+'h: '+fmt(v.t)+' atendimento'+(v.t===1?'':'s')+(v.t?' — '+HSER.filter(function(s){return v[s[0]]}).map(function(s){return s[1].toLowerCase()+' '+v[s[0]]}).join(', '):'');
      return'<div class="hs-col" data-h="'+k+'" tabindex="'+(v.t?0:-1)+'" aria-label="'+esc(lab)+'"><div class="hs-stack">'+segs+'</div></div>'}).join('')+'</div></div>'+
    '<div class="hs-x">'+h.map(function(v,k){return'<span>'+(k%3?'':k+'h')+'</span>'}).join('')+'</div><div class="hs-tip" hidden></div></div>';
  // dica ao passar o mouse / tocar
  var tip=q('.hs-tip',p),wrapEl=q('.hs',p);
  function showTip(col){var k=+col.dataset.h,v=h[k];if(!v.t){tip.hidden=true;return}
    tip.innerHTML='<b>'+k+'h às '+k+'h59</b><span class="hs-tt">'+fmt(v.t)+' atendimento'+(v.t===1?'':'s')+'</span>'+HSER.filter(function(s){return v[s[0]]}).map(function(s){return'<span><i class="sw sw-'+s[2]+'"></i>'+s[1]+'<b>'+fmt(v[s[0]])+' · '+pct(v[s[0]],v.t)+'%</b></span>'+
      (s[0]==='outros'?OSUB.filter(function(o){return v[o[0]]}).map(function(o){return'<span class="hs-sub">'+o[1]+'<b>'+fmt(v[o[0]])+'</b></span>'}).join(''):'')}).join('');
    tip.hidden=false;var r=col.getBoundingClientRect(),w=wrapEl.getBoundingClientRect(),z=parseFloat(getComputedStyle(document.body).zoom)||1,cl=(r.left-w.left)/z,cr=(r.right-w.left)/z,tw=tip.offsetWidth,max=w.width/z;
    // ao lado da coluna (direita; se não couber, esquerda) para não cobrir a barra
    tip.style.left=(cr+8+tw<=max?cr+8:Math.max(0,cl-8-tw))+'px';qa('.hs-col.on',p).forEach(function(c){c.classList.remove('on')});col.classList.add('on')}
  function hide(){tip.hidden=true;qa('.hs-col.on',p).forEach(function(c){c.classList.remove('on')})}
  qa('.hs-col',p).forEach(function(c){c.addEventListener('mouseenter',function(){showTip(c)});c.addEventListener('focus',function(){showTip(c)});c.addEventListener('click',function(){showTip(c)});c.addEventListener('blur',hide)});
  q('.hs-plot',p).addEventListener('mouseleave',hide);
});

/* ======================================================================
   3c. Pesquisas: resumo da satisfação mais legível (nota, estrelas e distribuição)
   ====================================================================== */
wrap('renderSurveys',function(){
  var n=data.r74.filter(function(x){return x.note}),N=n.length,avg=N?n.reduce(function(a,x){return a+x.note},0)/N:0,pos=n.filter(function(x){return x.note>=4}).length,
      c=[0,0,0,0,0,0];n.forEach(function(x){c[x.note]++});
  var full=Math.floor(avg),half=avg-full>=.25&&avg-full<.75?1:0;if(avg-full>=.75)full++;
  var stars='';for(var i=1;i<=5;i++)stars+='<i class="st'+(i<=full?' on':i===full+1&&half?' half':'')+'"></i>';
  var box=$('satDist'),sum=$('satSummary');
  if(!sum){sum=document.createElement('div');sum.id='satSummary';box.parentNode.insertBefore(sum,box)}
  sum.innerHTML=N?'<div class="ss-score"><big>'+avg.toFixed(2).replace('.',',')+'</big><div><span class="ss-stars" role="img" aria-label="'+avg.toFixed(1).replace('.',',')+' de 5 estrelas">'+stars+'</span><small>média de '+fmt(N)+' avaliaç'+(N===1?'ão':'ões')+'</small></div></div>'+
    '<div class="ss-pos"><b>'+pct(pos,N)+'%</b><small>notas 4 ou 5</small></div>':'<div class="empty">Sem avaliações no período.</div>';
  box.innerHTML=N?[5,4,3,2,1].map(function(v){var tone=v>=4?'good':v===3?'mid':'bad';return'<div class="ss-row ss-'+tone+'"><span class="ss-l">'+v+'<i class="st on"></i></span><div class="bar"><i style="width:'+pct(c[v],N)+'%"></i></div><span class="ss-n"><b>'+fmt(c[v])+'</b> · '+pct(c[v],N)+'%</span></div>'}).join(''):'';
});

/* ======================================================================
   4. Resumo para copiar (WhatsApp / Teams)
   ====================================================================== */
function summary(){
  var all=data.r72.protocols,p=outcomes(),t=p.length,c=function(o){return p.filter(function(x){return x.outcome===o}).length},
      un=all.filter(isUnresolvedProtocol).length,s=data.r74,ns=s.filter(function(x){return x.note}),
      avg=ns.length?ns.reduce(function(a,x){return a+x.note},0)/ns.length:0,kf=all.filter(hasFailure).length;
  var L=['Monitor IA · '+periodText(),''];
  L.push(fmt(t)+' atendimento'+(t===1?'':'s')+' da IA com desfecho');
  [['Resolvidos pela IA',c('resolvido')],['Transferidos',c('transferido')],['Não resolvidos',un],['Inatividade',c('inatividade')],['Aguardando confirmação',c('possivel')]]
    .forEach(function(r){L.push('• '+r[0]+': '+pct(r[1],t)+'% ('+fmt(r[1])+')')});
  var nAnd=all.filter(function(x){return x.outcome==='andamento'}).length;if(nAnd)L.push('Em andamento (menos de 24h): '+fmt(nAnd));
  L.push('');
  L.push(ns.length?'Pesquisa: nota média '+avg.toFixed(2).replace('.',',')+' ('+fmt(ns.length)+' avaliaç'+(ns.length===1?'ão':'ões')+') · '+nPositive(s)+'% positivas':'Pesquisa: sem avaliações no período');
  var imp={};s.forEach(function(x){if(x.note&&x.note<=3)x.help.forEach(function(h){if(neg.has(norm(h)))imp[h]=(imp[h]||0)+1})});
  var top=Object.keys(imp).sort(function(a,b){return imp[b]-imp[a]})[0];if(top)L.push('Principal ponto a melhorar: '+top+' ('+fmt(imp[top])+')');
  if(kf)L.push('Falhas de conhecimento: '+fmt(kf)+' protocolo'+(kf===1?'':'s'));
  var g={};p.forEach(function(x){var o=g[x.agent]||(g[x.agent]={t:0,r:0,tr:0,n:[]});o.t++;if(x.outcome==='resolvido')o.r++;if(x.outcome==='transferido')o.tr++;if(x.survey&&x.survey.note)o.n.push(x.survey.note)});
  var names=Object.keys(g).filter(function(n){return n!=='Sem IA identificada'}).sort(function(a,b){return g[b].t-g[a].t});
  if(names.length){L.push('Maior volume: '+names[0]+' ('+fmt(g[names[0]].t)+')');L.push('');L.push('Por IA:');
    names.forEach(function(n){var o=g[n],a=o.n.length?(o.n.reduce(function(x,y){return x+y},0)/o.n.length).toFixed(2).replace('.',','):'';
      L.push('• '+n+': '+fmt(o.t)+' atend. · '+pct(o.r,o.t)+'% resolvidos · '+pct(o.tr,o.t)+'% transferidos'+(a?' · nota '+a:''))})}
  return L.join('\n');
}

/* ======================================================================
   5. Impressão / PDF
   ====================================================================== */
var TITLES={overview:'Visão geral',surveys:'Pesquisas',quality:'Qualidade',protocols:'Protocolos'};
qa('main [data-panel]').forEach(function(s){s.dataset.title=TITLES[s.dataset.panel]||''});
var ph=document.createElement('header');ph.id='printHead';$('main').insertBefore(ph,$('main').firstChild);
var saved=null;
function beforePrint(){
  if(saved||!data)return;
  saved={theme:document.documentElement.dataset.theme,sv:sv.size,uv:uv.size};
  document.documentElement.dataset.theme='light';
  var o=uv.outcome||'nao';
  ph.innerHTML='<h1>Monitor IA · Safeweb</h1><p>'+esc(periodText())+' · gerado em '+new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</p>'+
    '<p>Lista de protocolos: '+esc(OUTCOME_LIST[o])+(uv.agent?' · '+esc(uv.agent):'')+(sv.agent||sv.filter!=='all'||sv.q?' · Pesquisas com os filtros da tela':'')+'</p>';
  // listas longas: no PDF vão as 30 primeiras (com os filtros e a ordem da tela); a completa fica no CSV
  var MAX=30;sv.size=uv.size=MAX;sv.page=uv.page=1;renderSurveyList();renderUnList();
  [['surveyList',surveyFiltered().length,'respostas'],['unresolvedList',unresolved().length,'protocolos']].forEach(function(l){
    if(l[1]>MAX)$(l[0]).insertAdjacentHTML('afterend','<p class="print-note">Mostrando '+MAX+' de '+fmt(l[1])+' '+l[2]+'. A lista completa sai no botão CSV.</p>');
  });
  var rc=qa('#recontactList .item').length;if(rc>15)$('recontactList').insertAdjacentHTML('afterend','<p class="print-note">Mostrando 15 de '+fmt(rc)+' recontatos listados na tela.</p>');
}
function afterPrint(){
  if(!saved)return;document.documentElement.dataset.theme=saved.theme;sv.size=saved.sv;uv.size=saved.uv;saved=null;
  qa('.print-note').forEach(function(n){n.remove()});
  if(data){renderSurveyList();renderUnList()}
}
addEventListener('beforeprint',beforePrint);addEventListener('afterprint',afterPrint);

/* ---------- Botões no cabeçalho ---------- */
var box=document.createElement('div');box.className='quick-actions';
box.innerHTML='<button id="summaryBtn" type="button" class="btn btn-secondary" title="Copiar um resumo do período para colar no WhatsApp ou no Teams">'+svgIcon('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>')+' Copiar resumo</button>'+
  '<button id="printBtn" type="button" class="btn btn-ghost" title="Imprimir ou salvar em PDF">'+svgIcon('<path d="M6 8V3h8v5M6 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2"/><path d="M6 12h8v5H6z"/>')+' PDF</button>';
/* No computador ficam na faixa azul (o cabeçalho já está cheio); no celular, junto dos controles */
var wide=matchMedia('(min-width:821px)');
function placeActions(){if(wide.matches){var sp=q('.rail-spacer');sp.appendChild(box);box.classList.add('on-rail')}else{$('refresh').parentNode.insertBefore(box,$('refresh'));box.classList.remove('on-rail')}}
placeActions();wide.addEventListener&&wide.addEventListener('change',placeActions);
$('summaryBtn').onclick=function(){if(!data){toast('Carregue os dados primeiro');return}copyText(summary(),'Resumo copiado. É só colar no WhatsApp ou no Teams')};
$('printBtn').onclick=function(){if(!data){toast('Carregue os dados primeiro');return}beforePrint();window.print()};

/* CSV da lista de protocolos com o nome do filtro */
window.monListName=function(){return'protocolos-'+(uv.outcome||'nao')};

/* ======================================================================
   6. Cards de números no mesmo padrão da Visão geral (Pesquisas, Qualidade, Protocolos)
   ====================================================================== */
function ico(p){return'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'}
var STAR='<path d="M10 3.2l2 4.2 4.6.6-3.3 3.2.8 4.6L10 13.6l-4.1 2.2.8-4.6L3.4 8l4.6-.6z"/>';
var KICON={
  chat:ico('<path d="M4 5h12v8.5H9.2L5.5 16.5v-3H4z"/>'),
  comment:ico('<path d="M4 5h12v8.5H9.2L5.5 16.5v-3H4z"/><path d="M7 8.3h6M7 10.8h3.6"/>'),
  star:ico(STAR),
  smile:ico('<circle cx="10" cy="10" r="7"/><path d="M7.2 11.6c.7 1.1 1.7 1.7 2.8 1.7s2.1-.6 2.8-1.7M7.6 8.2h.01M12.4 8.2h.01"/>'),
  alert:ico('<circle cx="10" cy="10" r="7"/><path d="M10 6.6v4.2M10 13.4h.01"/>'),
  back:ico('<path d="M7.5 5.5L4 9l3.5 3.5"/><path d="M4.5 9H12a4 4 0 0 1 0 8h-1.5"/>'),
  pause:ico('<circle cx="10" cy="10" r="7"/><path d="M8.3 7.6v4.8M11.7 7.6v4.8"/>'),
  x:ico('<circle cx="10" cy="10" r="7"/><path d="M7.7 7.7l4.6 4.6M12.3 7.7l-4.6 4.6"/>'),
  hour:ico('<path d="M6.5 3.5h7M6.5 16.5h7M7.5 3.5v2.3L10 10l2.5-4.2V3.5M7.5 16.5v-2.3L10 10l2.5 4.2v2.3"/>'),
  bot:ico('<rect x="4" y="7" width="12" height="9" rx="2.5"/><path d="M10 4v3M8 11.5v.5M12 11.5v.5"/>'),
  dot:ico('<circle cx="10" cy="10" r="6"/>')
};
var KMAP={
  'pesquisas respondidas':['chat',''],'nota media':['star',''],'satisfacao positiva':['smile','good'],'pontos a melhorar':['alert','bad'],'com comentario':['comment',''],
  'recontatos em 24h':['back','blue'],'apos inatividade':['pause','inactivity'],'apos nao resolvido':['x','bad'],'apos possivel solucao':['hour','possible'],
  'nao resolvidos':['x','bad'],'ia com mais ocorrencias':['bot',''],'com nota baixa':['star','bad'],'ponto a melhorar':['alert','bad']
};
window.k=function(label,value,sub){
  var d=KMAP[norm(label)]||['dot',''],txt=!/^[\s\d.,%—–-]*$/.test(String(value));
  return'<div class="kpi2'+(d[1]?' col':'')+(txt?' txt':'')+'" style="--c:'+(d[1]?'var(--'+d[1]+')':'var(--muted)')+'"><span class="ic">'+KICON[d[0]]+'</span><span class="lb">'+esc(label)+'</span><span class="vl">'+esc(value)+'</span>'+(sub?'<span class="sb">'+esc(sub)+'</span>':'')+'</div>';
};

/* ---------- Quadro da nota: cinza quando o protocolo não tem pesquisa ---------- */
function markEmptyScores(){qa('.score-box').forEach(function(b){b.classList.toggle('none',/^\s*—/.test(b.textContent))})}
wrap('renderSurveyList',markEmptyScores);wrap('renderUnList',markEmptyScores);

/* ======================================================================
   7. Qualidade: bot points zerados recolhidos + recontatos em números
   ====================================================================== */
wrap('renderQuality',function(){
  var cps=qa('#checkpointList .cp'),withData=cps.filter(function(c){return!c.classList.contains('zero')}).length,b=$('checkpointBadge');
  if(b)b.textContent=fmt(withData)+' de '+fmt(cps.length)+' com registro';
  qa('#checkpointList.cp-cols>div').forEach(function(col){
    var z=qa('.cp.zero',col);if(!z.length)return;
    var d=document.createElement('details');d.className='cp-zero';d.innerHTML='<summary>Ver '+z.length+' sem registro no período</summary>';
    z.forEach(function(x){d.appendChild(x)});col.appendChild(d);
  });
  var w=$('recontactWindows'),cols=qa(':scope>div',w);if(!cols.length)return;
  var vals=cols.map(function(c){return{n:+(q('b',c)||{}).textContent||0,l:(q('small',c)||{}).textContent||''}}),tot=vals.reduce(function(a,v){return a+v.n},0);
  var lab={'≤1h':'até 1 hora','1–6h':'de 1 a 6 horas','6–24h':'de 6 a 24 horas'};
  w.className='rw-tiles';
  w.innerHTML=vals.map(function(v){return'<div class="rw"><b>'+fmt(v.n)+'</b><span>'+(lab[v.l]||v.l)+'</span><small>'+pct(v.n,tot)+'% dos recontatos</small></div>'}).join('');
});

/* ======================================================================
   8. Pesquisas: filtro por data (lista)
   ====================================================================== */
var WD=['dom','seg','ter','qua','qui','sex','sáb'];
sv.date='';
var dateSel=document.createElement('select');dateSel.id='surveyDate';dateSel.setAttribute('aria-label','Data da resposta');
var sTool=$('surveySearch').parentNode;sTool.insertBefore(dateSel,$('surveyAgent'));sTool.classList.remove('t5');sTool.classList.add('t6');
dateSel.onchange=function(){sv.date=dateSel.value;sv.page=1;renderSurveyList()};
var _sfd=window.surveyFiltered;window.surveyFiltered=function(){var r=_sfd();return sv.date?r.filter(function(x){return dayKey(x.date)===sv.date}):r};
wrap('renderSurveys',function(){
  var c={};data.r74.forEach(function(x){var d=dayKey(x.date);if(d)c[d]=(c[d]||0)+1});
  var days=Object.keys(c).sort().reverse();if(sv.date&&!c[sv.date])sv.date='';
  dateSel.innerHTML='<option value="">Todas as datas</option>'+days.map(function(d){var dd=new Date(d+'T12:00:00');return'<option value="'+d+'"'+(d===sv.date?' selected':'')+'>'+brDay(d).slice(0,5)+' · '+WD[dd.getDay()]+' · '+fmt(c[d])+'</option>'}).join('');
},true);
/* a lista é re-renderizada pelo renderSurveys: o seletor precisa estar pronto antes */
var _gs=goSurveys;goSurveys=function(a){sv.date='';_gs(a)};
})();
