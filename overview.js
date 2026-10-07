/* overview.js — layout detalhado da Visão geral + transições. Carregar DEPOIS de app.js */
(function(){
'use strict';

/* ---------- Estilos (injetados, usam os tokens do ui.css e funcionam no tema escuro) ---------- */
var css=
':root{--back:#d9743a}.pill.o-voltou{background:color-mix(in srgb,var(--back) 14%,transparent);border-color:color-mix(in srgb,var(--back) 40%,transparent);color:var(--back)}'+
'@keyframes vin{from{opacity:0;transform:translateY(4px)}}@keyframes ocg{from{transform:scaleX(0)}}'+
'.view:not([hidden]),#agentCards:not([hidden]),#agentTable:not([hidden]){animation:vin .22s ease-out}'+
'.mode,.chip,.tabs button{transition:background .15s,color .15s}'+
'.btn:active,.chip:active,.view-btn:active,.mode:active{transform:scale(.97)}'+
'.kpi2{--c:var(--muted);display:grid;grid-template-columns:36px minmax(0,1fr);column-gap:12px;align-items:start;padding:14px 16px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(0,40,64,.04)}'+
'.kpi2 .ic{grid-row:1/4;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}'+
'.kpi2 .ic svg{width:18px;height:18px}.kpi2 .lb{font-size:13px;font-weight:500;color:var(--ink2)}'+
'.kpi2 .vl{font-size:28px;font-weight:600;line-height:1.15;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums}.kpi2.col .vl{color:var(--c)}'+
'.kpi2 .sb{font-size:12px;color:var(--muted)}'+
'.oc-sum{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-bottom:6px;border-radius:12px;background:var(--surface2)}'+
'.oc-sum big{font-size:34px;font-weight:600;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}'+
'.oc-sum b{display:block;font-size:14px}.oc-sum small{color:var(--muted);font-size:12px}'+
'.oc-row{--c:var(--blue);display:grid;grid-template-columns:minmax(190px,270px) minmax(0,1fr) 84px;gap:18px;align-items:center;padding:14px 6px;border-bottom:1px solid var(--line2);border-radius:10px;transition:background .15s}'+
'.oc-row:last-child{border-bottom:0}.oc-row:hover{background:var(--surface2)}'+
'.oc-l{display:flex;gap:10px;align-items:flex-start;min-width:0}.oc-dot{flex:0 0 9px;width:9px;height:9px;margin-top:5px;border-radius:3px;background:var(--c)}'+
'.oc-l b{display:block;font-size:13px;font-weight:600}.oc-l small{color:var(--muted);font-size:11.5px}'+
'.oc-m .tr{height:8px;border-radius:999px;background:var(--surface3);overflow:hidden}'+
'.oc-m .tr i{display:block;height:100%;border-radius:999px;background:var(--c);transform-origin:left;animation:ocg .7s cubic-bezier(.2,.8,.2,1) both}'+
'.oc-sp{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:11px;color:var(--muted)}.oc-sp span+span{padding-left:12px;border-left:1px solid var(--line)}.oc-sp b{margin-left:2px;color:var(--ink)}'+
'.oc-r{text-align:right}.oc-r strong{display:block;font-size:20px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums}.oc-row.col .oc-r strong{color:var(--c)}.oc-r small{color:var(--muted);font-size:11px}'+
'.ag-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:14px}'+
'.ag2{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface2)}'+
'.ag2-h{display:flex;align-items:center;gap:10px;margin-bottom:12px}.ag2-h .ic{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--surface);border:1px solid var(--line);color:var(--ink2)}.ag2-h .ic svg{width:17px;height:17px}'+
'.ag2-h b{font-size:14px}.ag2-h small{margin-left:auto;color:var(--muted);font-size:11.5px;text-align:right}'+
'.ag2-s{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}'+
'.ag-stat{padding:10px;border:1px solid var(--line2);border-radius:10px;background:var(--surface)}.ag-stat small{display:block;color:var(--muted);font-size:11px}'+
'.ag-stat strong{display:block;font-size:20px;font-weight:600;line-height:1.25;font-variant-numeric:tabular-nums}.ag-stat em{display:block;font-style:normal;color:var(--muted);font-size:11px}'+
'.mb{display:block;height:4px;margin-top:8px;border-radius:999px;background:var(--surface3);overflow:hidden}.mb u{display:block;height:100%;border-radius:999px;transform-origin:left;animation:ocg .7s cubic-bezier(.2,.8,.2,1) both}'+
'@media(max-width:620px){.oc-row{grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;padding:12px 2px}.oc-m{grid-column:1/-1;grid-row:2}.oc-r strong{font-size:18px}.ag2-s{grid-template-columns:repeat(2,minmax(0,1fr))}.oc-sum big{font-size:28px}}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ---------- Ícones ---------- */
function svg(p){return'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'}
var IC={
 ok:svg('<circle cx="10" cy="10" r="7"/><path d="M7 10.2l2 2 4-4.4"/>'),
 swap:svg('<path d="M4 7h11l-3-3M16 13H5l3 3"/>'),
 star:svg('<path d="M10 3.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 14.2l-4.2 2.300.8-4.700L3.200 8.500l4.700-.7L10 3.500z"/>'),
 smile:svg('<circle cx="10" cy="10" r="7"/><path d="M7.200 11.600c.7 1.100 1.700 1.700 2.800 1.700s2.100-.6 2.800-1.700M7.500 8.300h.01M12.500 8.300h.01"/>'),
 bot:svg('<rect x="4" y="7" width="12" height="9" rx="2.500"/><path d="M10 4v3M8 11.500v.5M12 11.500v.5"/>')
};

/* ---------- Contagem animada (só anima quando o valor muda) ---------- */
var last={};
function num(key,text,to,suf){return to==null?text:'<span class="cu" data-k="'+key+'" data-to="'+to+'" data-s="'+(suf||'')+'">'+text+'</span>'}
function countUp(root){
  var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('.cu').forEach(function(el){
    var k=el.dataset.k,to=+el.dataset.to,s=el.dataset.s,from=last[k];last[k]=to;
    if(rm||from===to)return;from=from==null?0:from;
    var t0=performance.now();
    (function f(t){var p=Math.min(1,(t-t0)/700),e=1-Math.pow(1-p,3);el.textContent=fmt(Math.round(from+(to-from)*e))+s;if(p<1)requestAnimationFrame(f)})(t0);
  });
}

var OUT=['resolvido','transferido','nao','inatividade','possivel','voltou'];
function outcomes(){return data.r72.protocols.filter(function(x){return OUT.indexOf(x.outcome)>=0})}
function avgNote(s){var n=s.filter(function(x){return x.note});return{n:n.length,v:n.length?n.reduce(function(a,x){return a+x.note},0)/n.length:0}}
function kpi(key,label,icon,color,text,to,suf,sub){
  return'<div class="kpi2'+(color?' col':'')+'" style="--c:'+(color?'var(--'+color+')':'var(--muted)')+'"><span class="ic">'+icon+'</span><span class="lb">'+label+'</span><span class="vl">'+num(key,text,to,suf)+'</span><span class="sb">'+sub+'</span></div>';
}
function split(list){
  var m={};list.forEach(function(x){m[x.agent]=(m[x.agent]||0)+1});
  return Object.keys(m).sort(function(a,b){return m[b]-m[a]}).map(function(a){return'<span>'+esc(a)+'<b>'+m[a]+'</b></span>'}).join('');
}

/* ---------- Visão geral ---------- */
window.renderOverview=function(){
  var all=data.r72.protocols,p=outcomes(),total=p.length,s=data.r74,
      by=function(o){return p.filter(function(x){return x.outcome===o})},
      res=by('resolvido'),tr=by('transferido'),un=all.filter(isUnresolvedProtocol),a=avgNote(s),pp=nPositive(s);

  // resolvidos sem novo contato do mesmo telefone em até 24h
  var phones={};all.forEach(function(x){var c=String(x.contact||'').replace(/\D/g,'').slice(-11);if(c)(phones[c]=phones[c]||[]).push(x)});
  var semRec=res.filter(function(x){var c=String(x.contact||'').replace(/\D/g,'').slice(-11);
    return!(phones[c]||[]).some(function(o){var h=(dt(o.firstDate)-dt(x.firstDate))/36e5;return o!==x&&h>0&&h<=24})}).length;

  $('overviewKpis').innerHTML=
    kpi('k0','Resolvidos pela IA',IC.ok,'resolved',pct(res.length,total)+'%',pct(res.length,total),'%',fmt(res.length)+' de '+fmt(total)+' atendimentos')+
    kpi('k1','Transferidos',IC.swap,'transferred',pct(tr.length,total)+'%',pct(tr.length,total),'%',fmt(tr.length)+' encaminhados para humano')+
    kpi('k2','Nota média',IC.star,'',a.n?a.v.toFixed(2).replace('.',','):'—',null,'',a.n?fmt(a.n)+' avaliações':'sem avaliações no período')+
    kpi('k3','Satisfação positiva',IC.smile,'',a.n?pp+'%':'—',a.n?pp:null,'%',fmt(positiveCount(s))+' notas 4 ou 5');

  var rows=[
    ['resolvido','Resolvidos pela IA',fmt(res.length)+' confirmados e '+fmt(semRec)+' sem recontato em 24h','resolved',true,res,res.length],
    ['transferido','Transferidos','encaminhados para fila humana','transferred',false,tr,tr.length],
    ['nao','Não resolvidos','bot point de problema não resolvido','bad',true,un,un.length],
    ['inatividade','Inatividade','cliente parou de responder','inactivity',false,by('inatividade'),by('inatividade').length],
    ['possivel','Aguardando confirmação','janela de 24h aberta ou sem telefone','possible',false,by('possivel'),by('possivel').length],
    ['voltou','Voltou em até 24h','possível solução que não se confirmou','back',false,by('voltou'),by('voltou').length]
  ];
  var ini=all.length;
  $('outcomes').innerHTML=
    '<div class="oc-sum"><big>'+num('sum',fmt(total),total,'')+'</big><div><b>atendimentos da IA com desfecho no período</b><small>'+pct(total,ini)+'% dos '+fmt(ini)+' iniciados</small></div></div>'+
    rows.map(function(r,i){var q=r[6],pc=pct(q,total);
      return'<div class="oc-row'+(r[4]?' col':'')+'" style="--c:var(--'+r[3]+')"><div class="oc-l"><i class="oc-dot"></i><div><b>'+r[1]+'</b><small>'+r[2]+'</small></div></div>'+
      '<div class="oc-m"><div class="tr"><i style="width:'+pc+'%"></i></div>'+(q?'<div class="oc-sp">'+split(r[5])+'</div>':'')+'</div>'+
      '<div class="oc-r"><strong>'+num('o'+i,pc+'%',pc,'%')+'</strong><small>'+fmt(q)+' atend.</small></div></div>'}).join('');
  $('complement').innerHTML='';
  $('outcomeBadge').textContent=fmt(total)+' com desfecho';
  renderAgents();
  countUp($('overviewKpis'));countUp($('outcomes'));
};

/* ---------- Desempenho por IA ---------- */
window.renderAgents=function(){
  var g={};
  outcomes().forEach(function(x){var o=g[x.agent]||(g[x.agent]={t:0,r:0,tr:0,u:0,n:[]});
    o.t++;if(x.outcome==='resolvido')o.r++;if(x.outcome==='transferido')o.tr++;if(isUnresolvedProtocol(x))o.u++;if(x.survey&&x.survey.note)o.n.push(x.survey.note)});
  var names=Object.keys(g).sort(function(x,y){return g[y].t-g[x].t}),
      av=function(o){return o.n.length?(o.n.reduce(function(a,v){return a+v},0)/o.n.length).toFixed(2).replace('.',','):'—'};
  function stat(label,color,q,t){var pc=pct(q,t);return'<div class="ag-stat"><small>'+label+'</small><strong style="color:var(--'+color+')">'+pc+'%</strong><em>'+fmt(q)+' atend.</em><i class="mb"><u style="width:'+pc+'%;background:var(--'+color+')"></u></i></div>'}
  if(mode==='cards'){
    $('agentCards').hidden=false;$('agentTable').hidden=true;
    $('agentCards').className='ag-grid';
    $('agentCards').innerHTML=names.map(function(n){var o=g[n];
      return'<div class="ag2"><div class="ag2-h"><span class="ic">'+IC.bot+'</span><b>'+esc(n)+'</b><small>'+fmt(o.t)+' atendimentos com desfecho</small></div><div class="ag2-s">'+
        stat('Resolvidos','resolved',o.r,o.t)+stat('Transferidos','transferred',o.tr,o.t)+stat('Não resolvidos','bad',o.u,o.t)+
        '<div class="ag-stat"><small>Nota média</small><strong>'+av(o)+'</strong><em>'+(o.n.length?fmt(o.n.length)+' avaliações':'sem avaliações')+'</em></div></div></div>'}).join('')||'<div class="empty">Nenhuma IA encontrada.</div>';
  }else{
    $('agentCards').hidden=true;$('agentTable').hidden=false;
    $('agentTable').innerHTML='<table><tr><th>IA</th><th>Protocolos</th><th>Resolvidos</th><th>Transferidos</th><th>Não resolvidos</th><th>Nota</th></tr>'+
      names.map(function(n){var o=g[n];return'<tr><td>'+esc(n)+'</td><td>'+o.t+'</td><td>'+o.r+'</td><td>'+o.tr+'</td><td>'+o.u+'</td><td>'+av(o)+'</td></tr>'}).join('')+'</table>';
  }
};
})();
