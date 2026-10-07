/* extras.js — carregar DEPOIS de app.js, ui.js e overview.js */
(function(){
'use strict';
var CONVO_URL='';/* opcional: link da conversa no Orpen. Vazio = visualizar pela rota interna do Monitor */
var OUT=DESFECHOS,
LBL={resolvido:'Resolvido',transferido:'Transferido',nao:'Não resolvido',inatividade:'Inatividade',possivel:'Aguardando confirmação',retomado:'Retomado',finalizado:'Finalizado',safenota:'Finaliza SafeNota',andamento:'Em andamento',outro:'Sem desfecho'};
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

var css='#toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);padding:9px 16px;border-radius:999px;background:var(--ink);color:var(--surface);font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:200}#toast.show{opacity:1;transform:translate(-50%,0)}'+
'@media(min-width:821px){.toolbar.t5{grid-template-columns:minmax(220px,1fr) 170px 170px 170px 90px}}@media(max-width:820px){#toast{bottom:calc(90px + env(safe-area-inset-bottom))}}'+
'.survey-row,.protocol-card{padding-left:12px}.n-good{box-shadow:inset 3px 0 0 var(--good)}.n-mid{box-shadow:inset 3px 0 0 var(--inactivity)}.n-bad{box-shadow:inset 3px 0 0 var(--bad)}'+
'mark{background:rgba(255,200,0,.35);color:inherit;border-radius:3px;padding:0 1px}.clamp{max-height:5.4em;overflow:hidden}.clamp.open{max-height:none}'+
'.more-btn{margin:4px 0 0;padding:0;border:0;background:none;color:var(--blue);font-size:12px;font-weight:600}.stars{margin-right:4px;color:#e0a640;font-size:16px;letter-spacing:1px}'+
'.ph{padding:0;border:0;background:none;color:var(--blue);font:inherit;text-decoration:underline dotted;cursor:pointer}'+
'.dl{margin-left:8px;font-size:11px;font-weight:600;color:var(--muted)}.dl.up{color:var(--good)}.dl.dn{color:var(--bad)}'+
'.hc{display:grid;grid-template-columns:repeat(24,1fr);gap:4px;align-items:end}.hcol{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}.hbar{display:flex;align-items:flex-end;justify-content:center;width:100%;height:120px}'+
'.hbar i{display:block;position:relative;width:78%;max-width:22px;min-height:2px;border-radius:4px 4px 0 0;background:color-mix(in srgb,var(--blue) 28%,transparent);transform-origin:bottom;animation:growY .7s both}'+
'.hbar u{position:absolute;left:0;right:0;bottom:0;border-radius:inherit;background:var(--transferred);text-decoration:none}.hcol small{height:12px;font-size:10px;color:var(--muted)}'+
'.lg{display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--muted)}.lg i{display:inline-block;width:9px;height:9px;margin-right:5px;border-radius:3px}'+
'.cp-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.cp-cols h3{margin:0 0 6px;font-size:13px}.cp{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line2);font-size:12px}'+
'.cp b{min-width:26px;padding:2px 8px;border-radius:999px;background:var(--surface3);text-align:center}.cp.zero{opacity:.45}'+
'.fn{display:grid;grid-template-columns:130px minmax(0,1fr) 92px;gap:12px;align-items:center;padding:7px 0;font-size:12px}.fn .tr{height:10px;border-radius:999px;background:var(--surface3);overflow:hidden}'+
'.fn .tr i{display:block;height:100%;border-radius:999px;background:var(--c);transform-origin:left;animation:ocg .7s both}.fn span:last-child{text-align:right;color:var(--muted)}'+
'@media(max-width:620px){.cp-cols{grid-template-columns:1fr}.fn{grid-template-columns:100px minmax(0,1fr) 74px}.hc{gap:2px}.hbar{height:90px}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Telefone mascarado (toque para revelar) ---------- */
window.maskPhone=function(v){var d=String(v||'').replace(/\D/g,'');if(d.length<8)return String(v||'');return(d.length>=10?'('+(d.length>=11?d.slice(-11,-9):d.slice(0,2))+') ':'')+'•••••-'+d.slice(-4)};

/* ---------- Aviso rápido + copiar ---------- */
var tt;function toast(m){var t=q('#toast')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'toast',role:'status'}));t.textContent=m;t.className='show';clearTimeout(tt);tt=setTimeout(function(){t.className=''},1800)}window.monToast=toast;
/* Copia texto: tenta a API do navegador e, se ela for bloqueada, usa o método antigo.
   Só mostra "copiado" quando a cópia realmente aconteceu. */
function legacyCopy(s){
  var a=document.createElement('textarea'),sel=document.getSelection(),prev=sel&&sel.rangeCount?sel.getRangeAt(0):null,ok=false;
  a.value=s;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(a);a.focus({preventScroll:true});a.select();a.setSelectionRange(0,s.length);
  try{ok=document.execCommand('copy')}catch(_){ok=false}
  a.remove();if(prev&&sel){sel.removeAllRanges();sel.addRange(prev)}
  return ok;
}
window.copyText=function(s,msg){
  s=String(s||'');if(!s)return Promise.resolve(false);
  var p=navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(s).then(function(){return true},function(){return legacyCopy(s)}):Promise.resolve(legacyCopy(s));
  return p.then(function(ok){toast(ok?(msg||'Copiado'):s.length>40?'O navegador bloqueou a cópia. Tente de novo.':'Não foi possível copiar: '+s);return ok});
};
function ensureConversationModal(){
  var m=q('#conversationModal');if(m)return m;
  m=document.createElement('div');m.id='conversationModal';m.className='conv-modal';m.hidden=true;
  m.innerHTML='<div class="conv-backdrop" data-conv-close></div><section class="conv-card" role="dialog" aria-modal="true" aria-labelledby="convTitle"><header class="conv-head"><div><h2 id="convTitle">Conversa</h2><p id="convMeta"></p></div><button type="button" class="conv-close" data-conv-close aria-label="Fechar">×</button></header><div id="convBody" class="conv-body"></div><footer class="conv-foot"><button type="button" class="btn btn-secondary" id="convCopy">Copiar protocolo</button><button type="button" class="btn btn-primary" data-conv-close>Fechar</button></footer></section>';
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target.closest('[data-conv-close]'))closeConversation();});
  return m;
}
function closeConversation(){
  var m=q('#conversationModal');if(!m)return;m.hidden=true;document.body.classList.remove('conv-open');
}
function renderConversation(protocol,payload){
  var body=q('#convBody'),meta=q('#convMeta');if(!body||!meta)return;
  meta.textContent=fmt(payload.totalMessages||0)+' mensagens · protocolo '+protocol;
  if(!payload.messages||!payload.messages.length){body.innerHTML='<div class="empty">Nenhuma mensagem encontrada para este protocolo.</div>';return}
  body.innerHTML=payload.messages.map(function(m){
    var who=m.direction==='in'?'Cliente':(m.sender||'IA / atendimento');
    var cls=m.direction==='in'?'in':'out';
    var when=m.timestamp?esc(m.timestamp):'';
    return'<div class="conv-row '+cls+'"><div class="conv-bubble"><div class="conv-who">'+esc(who)+'<small>'+when+'</small></div><div class="conv-text">'+esc(m.text)+'</div></div></div>';
  }).join('');
  body.scrollTop=body.scrollHeight;
}
var convReq=0;
async function openConversation(protocol,button){
  var requestId=++convReq,m=ensureConversationModal(),body=q('#convBody'),meta=q('#convMeta'),copyBtn=q('#convCopy');
  m.hidden=false;document.body.classList.add('conv-open');
  q('#convTitle').textContent='Protocolo '+protocol;
  if(meta)meta.textContent='Consultando conversa…';
  if(body)body.innerHTML='<div class="conv-loading"><span></span>Carregando mensagens…</div>';
  if(copyBtn)copyBtn.onclick=function(){copy(protocol,copyBtn)};
  try{
    var r=await fetch('/api/conversation?protocol='+encodeURIComponent(protocol),{cache:'no-store'});
    var j=await r.json();
    if(requestId!==convReq)return;
    if(!r.ok||!j.ok)throw new Error(j.error||'Não foi possível carregar a conversa.');
    renderConversation(protocol,j);
  }catch(e){
    if(requestId!==convReq)return;
    if(body)body.innerHTML='<div class="empty">Não foi possível carregar a conversa.<br><small>'+esc(e.message||'Erro desconhecido')+'</small></div>';
    if(meta)meta.textContent='Protocolo '+protocol;
  }finally{
    if(button)button.blur();
  }
}
function copy(s,btn){
  copyText(s,'Protocolo '+s+' copiado').then(function(ok){
    if(!btn||!ok)return;var old=btn.textContent;btn.classList.add('done');btn.textContent='✓ Copiado';
    setTimeout(function(){btn.classList.remove('done');btn.textContent=old},1500);
  });
}
document.addEventListener('click',function(e){
  var b=e.target.closest('.view-btn'),m=e.target.closest('.more-btn'),p=e.target.closest('.ph');
  if(b){var id=b.dataset.protocol;if(!id){var t=q('.row-top b',b.closest('.survey-row,.protocol-card'));id=t?t.textContent.replace(/^Protocolo\s*/,'').trim():''}
    if(id)CONVO_URL?window.open(CONVO_URL.replace('{protocol}',encodeURIComponent(id)),'_blank','noopener'):openConversation(id,b)}
  if(m){var c=m.previousElementSibling;c.classList.toggle('open');m.textContent=c.classList.contains('open')?'ver menos':'ver mais'}
  if(p){var on=p.dataset.on==='1';p.textContent=on?maskPhone(p.dataset.f):p.dataset.f;p.dataset.on=on?'0':'1'}
  if(e.target.closest('#retryBtn'))q('#refresh').click();
});

function wrap(n,f){var o=window[n];window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error(n,e)}return r}}

/* ---------- Pesquisas e Protocolos: ordenação, destaque, cor por nota ---------- */
var ss='recent',us='recent',note=function(x){return x&&x.note?x.note:0};
/* mais recentes primeiro; no empate de horário, o protocolo maior (mais novo) vem antes */
var byProt=function(a,b){return String(b.protocol||'').localeCompare(String(a.protocol||''),undefined,{numeric:true})};
var _sf=window.surveyFiltered;window.surveyFiltered=function(){var rec=function(a,b){return dt(b.date)-dt(a.date)||byProt(a,b)};
  return _sf().slice().sort(ss==='old'?function(a,b){return-rec(a,b)}:ss==='low'?function(a,b){return(note(a)||9)-(note(b)||9)||rec(a,b)}:ss==='high'?function(a,b){return note(b)-note(a)||rec(a,b)}:ss==='comment'?function(a,b){return(b.comment?1:0)-(a.comment?1:0)||rec(a,b)}:rec)};
var _un=window.unresolved;window.unresolved=function(){var rec=function(a,b){return dt(b.lastDate)-dt(a.lastDate)||byProt(a,b)},nn=function(x){return note(x.survey)};
  return _un().slice().sort(us==='low'?function(a,b){return(nn(a)||9)-(nn(b)||9)||rec(a,b)}:us==='agent'?function(a,b){return a.agent.localeCompare(b.agent)||rec(a,b)}:rec)};
function sel(id,opts,fn,before){var s=document.createElement('select');s.id=id;s.setAttribute('aria-label','Ordenar');s.innerHTML=opts.map(function(o){return'<option value="'+o[0]+'">'+o[1]+'</option>'}).join('');s.onchange=function(){fn(s.value)};before.parentNode.insertBefore(s,before)}
sel('surveySort',[['recent','Mais recentes'],['old','Mais antigas'],['low','Menor nota'],['high','Maior nota'],['comment','Com comentário']],function(v){ss=v;sv.page=1;renderSurveyList()},$('surveySize'));
q('#surveySearch').parentNode.classList.add('t5');
sel('unresolvedSort',[['recent','Mais recentes'],['low','Menor nota'],['agent','Agrupar por IA']],function(v){us=v;uv.page=1;renderUnList()},$('unresolvedSize'));
function hl(root,term){var src=String(term).trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(!src)return;var re=new RegExp('('+src+')','gi'),w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[],t;
  while(t=w.nextNode())a.push(t);
  a.forEach(function(t){var p=t.nodeValue.split(re);if(p.length<2)return;var f=document.createDocumentFragment();p.forEach(function(s,i){if(!s)return;if(i%2){var m=document.createElement('mark');m.textContent=s;f.appendChild(m)}else f.appendChild(document.createTextNode(s))});t.replaceWith(f)})}
function rows(term){qa('.survey-row,.protocol-card').forEach(function(r){
  var n=parseInt(q('.score-box',r).textContent)||0;r.classList.remove('n-good','n-mid','n-bad');if(n)r.classList.add(n>=4?'n-good':n===3?'n-mid':'n-bad');
  var b=q('.view-btn',r);if(b)b.textContent='Ver conversa'+(CONVO_URL?' ↗':'');
  var c=q('.row-content',r);if(c&&c.textContent.length>260){c.classList.add('clamp');c.insertAdjacentHTML('afterend','<button class="more-btn" type="button">ver mais</button>')}
  if(term)hl(r,term)})}
wrap('renderSurveyList',function(){rows(sv.q)});wrap('renderUnList',function(){rows(uv.q)});
wrap('renderSurveys',function(){var el=q('#scoreLabel'),v=parseFloat(el.textContent.replace(',','.'));if(v){var n=Math.round(v);el.innerHTML='<span class="stars" aria-hidden="true">'+'★'.repeat(n)+'☆'.repeat(5-n)+'</span>'+el.textContent}});

/* ---------- Qualidade: recontatos com contexto, bot points por IA, funil ---------- */
function recs(){var by={},rec=[];data.r72.protocols.filter(function(x){return x.contact}).forEach(function(x){var c=String(x.contact).replace(/\D/g,'').slice(-11)||norm(x.contact);(by[c]=by[c]||[]).push(x)});
  Object.keys(by).forEach(function(k){var a=by[k].sort(function(x,y){return dt(x.firstDate)-dt(y.firstDate)});for(var i=1;i<a.length;i++){var h=(dt(a[i].firstDate)-dt(a[i-1].firstDate))/36e5;if(h>=0&&h<=24)rec.push({prev:a[i-1],next:a[i],h:h})}});return rec}
function panel(id,anchor,where){var p=q('#'+id);if(!p){p=document.createElement('article');p.id=id;p.className='panel';q(anchor).closest('.panel')[where](p)}return p}
function head(t,s){return'<div class="panel-head"><div><h2>'+t+'</h2><p>'+s+'</p></div></div>'}
wrap('renderQuality',function(){
  var L=q('#recontactList'),r=recs().slice(0,50);
  if(r.length)L.innerHTML=r.map(function(x){return'<div class="item"><b>'+esc(x.next.protocol)+'</b> <span class="pill">'+x.h.toFixed(1).replace('.',',')+'h depois</span> <span class="pill'+((x.prev.ownOutcome||x.prev.outcome)==='nao'?' bad':'')+'">Antes: '+(LBL[(x.prev.ownOutcome||x.prev.outcome)]||'Sem desfecho')+'</span><div class="meta">Anterior: '+esc(x.prev.protocol)+' · '+esc(x.next.agent)+' · <button type="button" class="ph" data-f="'+esc(x.next.contact)+'" title="Tocar para revelar">'+esc(maskPhone(x.next.contact))+'</button></div></div>'}).join('');
  var g={SPC:[],Safe:[]};qa('#checkpointList .checkpoint').forEach(function(c){g[/^SPC/.test(q('small',c).textContent)?'SPC':'Safe'].push([q('b',c).textContent,+q('strong',c).textContent])});
  if(g.SPC.length+g.Safe.length){var C=q('#checkpointList');C.className='cp-cols';
    C.innerHTML=[['IA SPC','SPC'],['Assistente Safira','Safe']].map(function(c){return'<div><h3>'+c[0]+'</h3>'+g[c[1]].sort(function(a,b){return b[1]-a[1]}).map(function(x){return'<div class="cp'+(x[1]?'':' zero')+'"><span>'+esc(x[0].replace(/ - IA - (SPC|Safe)$/,''))+'</span><b>'+x[1]+'</b></div>'}).join('')+'</div>'}).join('')}
  var all=data.r72.protocols,p=all.filter(function(x){return OUT.indexOf(x.outcome)>=0}),c=function(o){return p.filter(function(x){return x.outcome===o}).length},ini=all.length,
  st=[['Iniciados',ini,'blue'],['Com desfecho',p.length,'blue'],['Resolvidos',c('resolvido'),'resolved'],['Transferidos',c('transferido'),'transferred'],['Não resolvidos',all.filter(isUnresolvedProtocol).length,'bad'],['Inatividade',c('inatividade'),'inactivity'],['Aguardando',c('possivel'),'possible']];
  panel('funnelPanel','#checkpointList','before').innerHTML=head('Funil do atendimento','Do início ao desfecho, em relação aos protocolos iniciados')+
    st.map(function(s){var v=pct(s[1],ini);return'<div class="fn" style="--c:var(--'+s[2]+')"><span>'+s[0]+'</span><div class="tr"><i style="width:'+v+'%"></i></div><span>'+fmt(s[1])+' · '+v+'%</span></div>'}).join('');
});

/* ---------- Visão geral: alertas, gráfico por hora, comparação ---------- */
var cache={};
function ns(s){var n=s.filter(function(x){return x.note});return{n:n.length,v:n.length?n.reduce(function(a,x){return a+x.note},0)/n.length:0}}
function stats(r72,r74){var p=r72.protocols.filter(function(x){return OUT.indexOf(x.outcome)>=0}),t=p.length,c=function(o){return p.filter(function(x){return x.outcome===o}).length},a=ns(r74);return{t:t,res:pct(c('resolvido'),t),tr:pct(c('transferido'),t),un:r72.protocols.filter(isUnresolvedProtocol).length,avg:a.v,n:a.n,pos:nPositive(r74)}}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function prevRange(s,e){var a=new Date(s+'T00:00:00'),b=new Date(e+'T00:00:00'),n=Math.round((b-a)/864e5)+1,pe=new Date(a);pe.setDate(pe.getDate()-1);var ps=new Date(pe);ps.setDate(ps.getDate()-(n-1));return[ymd(ps),ymd(pe)]}
function executiveData(){
  var p=data.r72.protocols.filter(function(x){return OUT.indexOf(x.outcome)>=0}),t=p.length,
      res=p.filter(function(x){return x.outcome==='resolvido'}).length,
      tr=p.filter(function(x){return x.outcome==='transferido'}).length,
      un=data.r72.protocols.filter(isUnresolvedProtocol).length,
      n=data.r74.filter(function(x){return x.note}),avg=n.length?n.reduce(function(a,x){return a+x.note},0)/n.length:0;
  return{t:t,res:res,tr:tr,un:un,n:n.length,avg:avg,pos:nPositive(data.r74)};
}
function execPeriodText(){
  var s=q('#start')?q('#start').value:'',e=q('#end')?q('#end').value:'';
  function d(v){var p=String(v||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:v||''}
  return s&&e?(s===e?'Período · '+d(s):'Período · '+d(s)+' a '+d(e)):'Resumo do período';
}
function renderExecutiveSummary(prev){
  var box=q('#executiveSummary');if(!box||!data)return;
  var x=executiveData(),total=x.t||0,resPct=pct(x.res,total),trPct=pct(x.tr,total),unPct=pct(x.un,total);
  $('executivePeriod').textContent=execPeriodText();
  $('executiveSignal').className='badge'+(x.un?' executive-bad':' executive-good');
  $('executiveSignal').textContent=x.un?'Atenção nos não resolvidos':'Sem não resolvidos no período';
  function metric(label,value,sub,cls){
    return'<div class="exec-item '+cls+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>';
  }
  var compare='';
  if(prev&&prev.s){
    var dUn=x.un-prev.s.un,dRes=resPct-prev.s.res,dTr=trPct-prev.s.tr;
    compare='<div class="exec-compare"><b>Variação vs. período anterior</b><span>Resolvidos '+(dRes>0?'▲ +':dRes<0?'▼ −':'= ')+Math.abs(dRes)+' pp</span><span>Transferidos '+(dTr>0?'▲ +':dTr<0?'▼ −':'= ')+Math.abs(dTr)+' pp</span><span>Não resolvidos '+(dUn>0?'▲ +':dUn<0?'▼ −':'= ')+Math.abs(dUn)+'</span></div>';
  }
  box.innerHTML=
    metric('Atendimentos',fmt(total),'com desfecho','exec-info')+
    metric('Resolvidos',fmt(x.res),resPct+'% do total','exec-good')+
    metric('Não resolvidos',fmt(x.un),unPct+'% do total','exec-bad')+
    metric('Transferidos',fmt(x.tr),trPct+'% do total','exec-transfer')+
    metric('Satisfação',x.n?x.avg.toFixed(2).replace('.',','):'—',x.n?fmt(x.n)+' avaliações · '+x.pos+'% positivas':'sem avaliações','exec-score')+
    '<div class="exec-reading"><b>Leitura do período</b><span>'+resPct+'% resolvidos · '+trPct+'% transferidos · '+unPct+'% não resolvidos</span></div>'+
    compare;
}
function applyDeltas(){
  qa('.kpi2 .dl').forEach(function(x){x.remove()});
  var c=cache[$('start').value+'|'+$('end').value];if(!c||!c.s.t||!data)return;
  var a=stats(data.r72,data.r74),P=c.s,ok=a.n&&P.n,d=[[a.res-P.res,1,1],[a.tr-P.tr,1,0],[ok?a.avg-P.avg:null,0,1],[ok?a.pos-P.pos:null,1,1]];
  qa('#overviewKpis .kpi2').forEach(function(card,i){var di=d[i];if(!di||di[0]==null)return;var r=di[1]?Math.round(di[0]):Math.round(di[0]*100)/100,cls=r&&di[2]?(r>0?'up':'dn'):'';
    q('.vl',card).insertAdjacentHTML('beforeend','<small class="dl '+cls+'" title="vs. período anterior ('+c.r[0]+' a '+c.r[1]+')">'+(r>0?'▲ +':r<0?'▼ −':'= ')+String(Math.abs(r)).replace('.',',')+(di[1]?' pp':'')+'</small>')});renderExecutiveSummary(c)}
function loadPrev(){
  var s=$('start').value,e=$('end').value,k=s+'|'+e;if(cache[k]&&Date.now()-cache[k].t<6e5)return applyDeltas();
  var r=prevRange(s,e);
  fetch('/api/reports',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({start:r[0],end:r[1]})}).then(function(x){return x.json()}).then(function(j){
    if(!j.ok)return;cache[k]={t:Date.now(),r:r,s:stats(analyze72(j.r72),analyze74(j.r74))};applyDeltas()}).catch(function(){});
}
wrap('renderAll',loadPrev);
wrap('renderOverview',function(){
  renderExecutiveSummary();
  var all=data.r72.protocols;
  var h=[],i,mx;for(i=0;i<24;i++)h.push([0,0]);
  all.forEach(function(x){var m=dt(x.firstDate);if(!m)return;var k=new Date(m).getHours();h[k][0]++;if(x.outcome==='transferido')h[k][1]++});
  mx=Math.max.apply(null,h.map(function(v){return v[0]}).concat(1));
  panel('hoursPanel','#outcomes','after').innerHTML=head('Atendimentos por hora','Quando a IA recebe mais protocolos e quando mais transfere')+
    '<div class="hc">'+h.map(function(v,k){return'<div class="hcol" title="'+k+'h: '+v[0]+' atendimentos, '+v[1]+' transferidos"><div class="hbar"><i style="height:'+v[0]/mx*100+'%"><u style="height:'+(v[0]?v[1]/v[0]*100:0)+'%"></u></i></div><small>'+(k%3?'':k)+'</small></div>'}).join('')+'</div>'+
    '<div class="lg"><span><i style="background:color-mix(in srgb,var(--blue) 28%,transparent)"></i>Iniciados</span><span><i style="background:var(--transferred)"></i>Transferidos</span></div>';
  applyDeltas();
});

/* ---------- Erro de coleta com "Tentar novamente" + puxar para atualizar ---------- */
var n=q('#notice');new MutationObserver(function(){if(!n.hidden&&!q('#retryBtn',n))n.insertAdjacentHTML('beforeend',' <button id="retryBtn" type="button" class="btn btn-secondary" style="height:30px;margin-left:8px">Tentar novamente</button>')}).observe(n,{childList:true,attributes:true});
var y0=null;
addEventListener('touchstart',function(e){y0=window.scrollY===0?e.touches[0].clientY:null},{passive:true});
addEventListener('touchend',function(e){var r=q('#refresh');if(y0!=null&&e.changedTouches[0].clientY-y0>110&&!r.disabled&&!q('#main').hidden){r.click();toast('Atualizando…')}y0=null});
})();
