/* relatorio.js — "Relatório mensal": uma página limpa (resumo, IAs, semanas, pico, clientes que voltam),
   pronta para imprimir ou salvar em PDF. Carregar depois de desempenho.js e padroes.js.
   Sempre em fundo branco, mesmo com o painel no tema escuro. */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var IAS=['Assistente Safira','IA SPC','SPC AGE','SPC ACI'];
function toast(m){if(window.monToast)window.monToast(m)}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function brFull(iso){var x=String(iso).split('-');return x[2]+'/'+x[1]+'/'+x[0]}
function brShort(iso){var x=String(iso).split('-');return x[2]+'/'+x[1]}
function d12(iso){return new Date(iso+'T12:00:00')}
function nota(v){return v?v.toFixed(2).replace('.',','):'—'}
function rp(a,b){return b?Math.round(a/b*100):0}
function rel(cur,old){if(!old)return'';var d=Math.round((cur-old)/old*100);return d?'<span class="dv eq">'+(d>0?'▲ +':'▼ −')+Math.abs(d)+'%</span>':'<span class="dv eq">= igual</span>'}

var css=
'#mrOverlay{--navy:#003b5c;--blue:#0068a5;--surface:#fff;--surface2:#f6f9fb;--surface3:#eef3f7;--line:#d9e3ea;--line2:#e7eef2;--ink:#13293d;--ink2:#34495b;--muted:#5b7083;--muted2:#8597a6;--good:#1a7f55;--goodbg:#e7f5ee;--bad:#c23b48;--badbg:#fdecee;--warn:#9a6200;color-scheme:light;'+
  'position:fixed;inset:0;z-index:1200;display:flex;flex-direction:column;background:rgba(8,24,36,.6);color:var(--ink)}'+
'#mrOverlay[hidden]{display:none}'+
'#mrOverlay .mr-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--line)}'+
'#mrOverlay .mr-bar div{flex:1;min-width:180px}#mrOverlay .mr-bar b{display:block;font-size:14px}#mrOverlay .mr-bar small{color:var(--muted);font-size:12px}'+
'#mrOverlay .mr-scroll{flex:1;overflow:auto;padding:18px 16px 32px}'+
'#mrOverlay .mr-sheet{max-width:920px;margin:0 auto;padding:30px 34px;background:#fff;border-radius:6px;box-shadow:0 10px 40px rgba(0,20,40,.3);font-size:13px;line-height:1.45}'+
'.mr-sheet *{box-sizing:border-box}'+
'.mr-sheet .mr-top{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;padding-bottom:12px;border-bottom:2px solid var(--navy)}'+
'.mr-sheet .mr-top>div:first-child{flex:1;min-width:220px}'+
'.mr-sheet .mr-brand{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--blue)}'+
'.mr-sheet h1{margin:2px 0 0;font-size:25px;line-height:1.15;color:var(--navy);letter-spacing:-.01em}'+
'.mr-sheet .mr-sub{margin:4px 0 0;color:var(--muted);font-size:12px}'+
'.mr-sheet .mr-gen{color:var(--muted);font-size:11.5px;text-align:right}'+
'.mr-sheet h2{margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid var(--line);font-size:14.5px;color:var(--navy)}'+
'.mr-sheet h2 small{margin-left:8px;font-size:11.5px;font-weight:400;color:var(--muted)}'+
'.mr-sheet .mr-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:14px}'+
'.mr-sheet .mr-k{padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface2)}'+
'.mr-sheet .mr-k small{display:block;color:var(--muted);font-size:11px}.mr-sheet .mr-k strong{display:block;margin:2px 0;font-size:24px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}'+
'.mr-sheet .mr-k em{display:block;font-style:normal;color:var(--muted);font-size:11px}'+
'.mr-sheet .dv{font-weight:600}.mr-sheet .dv.up{color:var(--good)}.mr-sheet .dv.dn{color:var(--bad)}.mr-sheet .dv.eq{color:var(--muted)}'+
'.mr-sheet ul{margin:0;padding-left:18px}.mr-sheet li{margin:3px 0}'+
'.mr-sheet .mr-w{overflow-x:auto}'+
'.mr-sheet table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}'+
'.mr-sheet th{padding:6px 8px;text-align:right;font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--line);white-space:nowrap}'+
'.mr-sheet td{padding:6px 8px;text-align:right;border-bottom:1px solid var(--line2);white-space:nowrap}'+
'.mr-sheet th:first-child,.mr-sheet td:first-child{text-align:left}'+
'.mr-sheet td small{display:block;color:var(--muted);font-size:10px}'+
'.mr-sheet tr.tot td{font-weight:600;background:var(--surface2);border-bottom:0}'+
'.mr-sheet td.hit{color:var(--good)}.mr-sheet td.miss{color:var(--bad)}'+
'.mr-sheet .mr-att{display:grid;gap:6px}.mr-sheet .mr-att div{padding:8px 10px;border:1px solid var(--line2);border-left:3px solid var(--warn);border-radius:8px;background:var(--surface2)}'+
'.mr-sheet .mr-att div.high{border-left-color:var(--bad)}.mr-sheet .mr-att b{display:block}.mr-sheet .mr-att span{color:var(--ink2);font-size:12px}'+
'.mr-sheet .mr-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 10px}'+
'.mr-sheet .mr-cards .pk-s{padding:9px 10px}.mr-sheet .mr-cards .pk-s strong{font-size:17px}'+
'.mr-sheet .pk-c{height:20px}'+
'.mr-sheet .mr-note{margin-top:6px;color:var(--muted);font-size:11px}'+
'.mr-sheet .mr-foot{margin-top:22px;padding-top:10px;border-top:1px solid var(--line);color:var(--muted);font-size:10.5px}'+
'.mr-sheet .mr-foot p{margin:3px 0}'+
'@media(max-width:820px){#mrOverlay .mr-sheet{padding:18px 14px}.mr-sheet .mr-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-sheet .mr-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-sheet .mr-gen{text-align:left}}'+
'@media print{'+
  'body.mr-open>*:not(#mrOverlay){display:none!important}'+
  'body.mr-open{background:#fff!important;overflow:visible!important}'+
  '#mrOverlay{position:static;display:block;background:#fff}'+
  '#mrOverlay .mr-bar{display:none!important}#mrOverlay .mr-scroll{overflow:visible;padding:0}'+
  '#mrOverlay .mr-sheet{zoom:1.32;max-width:none;margin:0;padding:0;box-shadow:none;border-radius:0}'+
  '.mr-sheet .mr-w{overflow:visible}.mr-sheet .pk-grid{min-width:0!important}.mr-sheet .pk-wrap{overflow:visible}'+
  '.mr-sheet .mr-kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.mr-sheet .mr-cards{grid-template-columns:repeat(4,minmax(0,1fr))}.mr-sheet .mr-gen{text-align:right}'+
  '.mr-sheet h2{break-after:avoid}.mr-sheet .mr-sec{break-inside:avoid}.mr-sheet tr{break-inside:avoid}.mr-sheet .mr-k,.mr-sheet .pk-s{break-inside:avoid}'+
'}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Período ---------- */
function periodInfo(){
  var s=q('#start').value,e=q('#end').value,a=d12(s),b=d12(e);
  var oneMonth=a.getDate()===1&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();
  var last=new Date(b.getFullYear(),b.getMonth()+1,0).getDate();
  var days=Math.round((b-a)/864e5)+1;
  return{s:s,e:e,days:days,month:oneMonth,partial:oneMonth&&b.getDate()<last,
    title:oneMonth?cap(a.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})):brFull(s)+' a '+brFull(e)};
}
function prevLabel(pi,prev){
  if(pi.month&&prev&&prev.range){var d=d12(prev.range[0]);return d.toLocaleDateString('pt-BR',{month:'long'})}
  return'o período anterior';
}
function delta(cur,old,unit,good){
  if(old==null||!isFinite(old)||cur==null)return'';
  var d=unit==='nota'?Math.round((cur-old)*100)/100:Math.round(cur-old);
  if(!d)return'<span class="dv eq">= igual</span>';
  var better=good==='up'?d>0:d<0;
  return'<span class="dv '+(better?'up':'dn')+'">'+(d>0?'▲ +':'▼ −')+String(Math.abs(d)).replace('.',',')+(unit==='nota'?'':' pp')+'</span>';
}

/* ---------- Conteúdo ---------- */
function build(){
  var D=window.monDesempenho,P=window.monPadroes,pi=periodInfo(),list=data.r72.protocols;
  var st=D.byIA(list),all=st._all,metas=D.metas(),eco=D.eco(),prev=window.monPrev?window.monPrev():null,PS=prev&&prev.s?prev.s:null;
  var notes=data.r74.filter(function(x){return x.note}),an={n:notes.length,v:notes.length?notes.reduce(function(a,x){return a+x.note},0)/notes.length:0},pos=nPositive(data.r74),pl=prevLabel(pi,prev);
  var money=eco&&eco.custoHora>0?eco.reais(all.r):null;
  var out='';

  // cabeçalho
  out+='<div class="mr-top"><div><div class="mr-brand">Monitor IA · Safeweb</div><h1>Relatório de desempenho das IAs</h1><p class="mr-sub">'+esc(pi.title)+(pi.partial?' (parcial: '+brShort(pi.s)+' a '+brShort(pi.e)+')':pi.month?'':'')+' · Assistente Safira, IA SPC, SPC AGE e SPC ACI</p></div>'+
    '<div class="mr-gen">Gerado em '+new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'<br>Fonte: Orpen (R72 e R74)</div></div>';

  // indicadores
  var kp=function(label,value,sub,dv){return'<div class="mr-k"><small>'+label+'</small><strong>'+value+'</strong><em>'+sub+(dv?' · '+dv:'')+'</em></div>'};
  out+='<div class="mr-kpis">'+
    kp('Atendimentos com desfecho',fmt(all.t),'pela IA',PS&&PS.t?rel(all.t,PS.t)+' vs. '+pl:'')+
    kp('Resolvidos pela IA',Math.round(all.resolvido)+'%',fmt(all.r)+' atendimentos',PS?delta(Math.round(all.resolvido),PS.res,'pp','up')+' vs. '+pl:'')+
    kp('Transferidos',Math.round(all.transferido)+'%',fmt(all.tr)+' para humano',PS?delta(Math.round(all.transferido),PS.tr,'pp','down')+' vs. '+pl:'')+
    kp('Não resolvidos',Math.round(all.nao)+'%',fmt(all.u)+' atendimentos','')+
    kp('Nota média',an.n?an.v.toFixed(2).replace('.',','):'—',an.n?fmt(an.n)+' avaliações · '+pos+'% positivas':'sem avaliações',PS&&PS.n&&an.n?delta(an.v,PS.avg,'nota','up')+' vs. '+pl:'')+
    '</div>';

  // destaques
  var bul=[];
  bul.push('A IA concluiu <b>'+fmt(all.t)+'</b> atendimentos no período e resolveu <b>'+Math.round(all.resolvido)+'%</b> sozinha; <b>'+Math.round(all.transferido)+'%</b> foram para atendimento humano.');
  var big=IAS.filter(function(n){return st[n].t>=10});
  if(big.length>=2){
    var sorted=big.slice().sort(function(a,b){return st[b].resolvido-st[a].resolvido}),b0=sorted[0],w0=sorted[sorted.length-1];
    bul.push('Maior taxa de resolução: <b>'+esc(b0)+'</b> ('+Math.round(st[b0].resolvido)+'%). Menor: <b>'+esc(w0)+'</b> ('+Math.round(st[w0].resolvido)+'%).');
  }
  var hits=0,tot=0,miss=[];
  IAS.forEach(function(n){var g=metas[n];if(!g)return;D.FIELDS.forEach(function(f){
    var v=st[n],has=f[0]==='nota'?v.nn>0:v.t>0,ok=D.check(g,f[0],f[0]==='nota'?v.nota:v[f[0]],has);
    if(ok===null)return;tot++;if(ok)hits++;else miss.push(n+' · '+f[1].toLowerCase()+' '+(f[0]==='nota'?nota(v.nota):Math.round(v[f[0]])+'%')+' ('+D.goalText(g,f[0])+')')})});
  if(tot)bul.push('Metas: <b>'+hits+' de '+tot+'</b> atingidas'+(miss.length?'. Fora da meta: '+miss.slice(0,4).map(esc).join('; ')+(miss.length>4?' e mais '+(miss.length-4):''):' — todas dentro do esperado.'));
  if(eco)bul.push('Economia: <b>'+D.fmtH(eco.horas(all.r))+'</b> de atendimento humano evitadas'+(money!=null?' (<b>'+D.fmtR(money)+'</b>)':'')+', equivalente a '+(Math.round(eco.horas(all.r)/8*10)/10).toLocaleString('pt-BR')+(eco.horas(all.r)/8>1.05?' dias':' dia')+' de trabalho de um analista (8 h por dia).');
  var rc=P.recurrence(list);
  if(rc.rows.length)bul.push('<b>'+fmt(rc.rows.length)+'</b> '+(rc.rows.length===1?'cliente voltou':'clientes voltaram')+' mais de uma vez ('+rp(rc.rows.length,rc.contacts)+'% dos clientes), gerando '+fmt(rc.prots)+' atendimentos; '+fmt(rc.openNao)+' ficaram sem solução no último contato.');
  var sl=P.slots(list,''),sm=P.summarize(sl),hasPeak=sl.tot>0&&sl.timed>=sl.tot*.5;
  if(hasPeak)bul.push('Dia mais movimentado: <b>'+P.DIAS[sm.busiest].toLowerCase()+'</b>; hora de pico: <b>'+P.hh(sm.peak)+'</b>. <b>'+P.rp(sm.off.t,sm.tot)+'%</b> da demanda chega fora do expediente, e a IA resolveu '+P.rp(sm.off.r,sm.off.t)+'% desses atendimentos.');
  out+='<div class="mr-sec"><h2>Destaques</h2><ul>'+bul.map(function(b){return'<li>'+b+'</li>'}).join('')+'</ul></div>';

  // atenção
  var att=qa('#attentionList .attention-item').map(function(n){return{lv:n.classList.contains('high')?'high':'',t:(q('b',n)||{}).textContent||'',x:(q('span',n)||{}).textContent||''}}).filter(function(a){return a.t});
  if(att.length)out+='<div class="mr-sec"><h2>Pontos de atenção</h2><div class="mr-att">'+att.map(function(a){return'<div class="'+a.lv+'"><b>'+esc(a.t)+'</b><span>'+esc(a.x)+'</span></div>'}).join('')+'</div></div>';

  // por IA
  function cellIA(v,g,field,n){
    var has=field==='nota'?v.nn>0:v.t>0,ok=D.check(g,field,field==='nota'?v.nota:v[field],has),
        txt=field==='nota'?nota(v.nota):(v.t?Math.round(v[field])+'%':'—'),
        sub=field==='nota'?(v.nn?v.nn+' aval.':''):(v.t?fmt(field==='resolvido'?v.r:field==='transferido'?v.tr:v.u):'');
    if(g&&g[field]!=null&&has)sub+=(sub?' · ':'')+D.goalText(g,field);
    return'<td class="'+(ok===true?'hit':ok===false?'miss':'')+'"><b>'+txt+(ok===true?' ✓':ok===false?' ✗':'')+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</td>';
  }
  function rowIA(name,v,g,isTot){
    var h=0,t=0;if(g)D.FIELDS.forEach(function(f){var has=f[0]==='nota'?v.nn>0:v.t>0,ok=D.check(g,f[0],f[0]==='nota'?v.nota:v[f[0]],has);if(ok!==null){t++;if(ok)h++}});
    return'<tr'+(isTot?' class="tot"':'')+'><td>'+esc(name)+'</td><td>'+fmt(v.t)+'</td>'+cellIA(v,g,'resolvido')+cellIA(v,g,'transferido')+cellIA(v,g,'nao')+cellIA(v,g,'nota')+'<td>'+(t?h+' de '+t:'—')+'</td>'+
      (eco?'<td>'+(v.t?D.fmtH(eco.horas(v.r))+(eco.custoHora>0?'<small>'+D.fmtR(eco.reais(v.r))+'</small>':''):'—')+'</td>':'')+'</tr>';
  }
  out+='<div class="mr-sec"><h2>Desempenho por IA</h2><div class="mr-w"><table><thead><tr><th>IA</th><th>Atend.</th><th>Resolvidos</th><th>Transferidos</th><th>Não resolvidos</th><th>Nota média</th><th>Metas</th>'+(eco?'<th>Horas evitadas</th>':'')+'</tr></thead><tbody>'+
    IAS.map(function(n){return rowIA(n,st[n],metas[n],false)}).join('')+rowIA('Todas as IAs',all,null,true)+'</tbody></table></div></div>';

  // semana a semana
  if(pi.days>=14){
    var ws=D.weeklyRows('');
    if(ws.length>1){
      out+='<div class="mr-sec"><h2>Semana a semana</h2><div class="mr-w"><table><thead><tr><th>Semana</th><th>Atend.</th><th>Resolvidos</th><th>Transferidos</th><th>Não resolvidos</th><th>Nota média</th>'+(eco?'<th>Horas evitadas</th>':'')+'</tr></thead><tbody>'+
        ws.map(function(w,i){var v=w.v,pv=i?ws[i-1].v:null,dl=function(f,g){return pv&&pv.t&&v.t?' '+delta(Math.round(v[f]),Math.round(pv[f]),'pp',g):''};
          return'<tr><td>'+brShort(w.start)+' – '+brShort(w.end)+(w.full?'':'<small>semana parcial</small>')+'</td><td>'+fmt(v.t)+'</td><td>'+(v.t?Math.round(v.resolvido)+'%':'—')+dl('resolvido','up')+'</td><td>'+(v.t?Math.round(v.transferido)+'%':'—')+dl('transferido','down')+'</td><td>'+(v.t?Math.round(v.nao)+'%':'—')+dl('nao','down')+'</td><td>'+nota(v.nota)+'</td>'+(eco?'<td>'+D.fmtH(eco.horas(v.r))+'</td>':'')+'</tr>'}).join('')+
        '<tr class="tot"><td>Período todo</td><td>'+fmt(all.t)+'</td><td>'+Math.round(all.resolvido)+'%</td><td>'+Math.round(all.transferido)+'%</td><td>'+Math.round(all.nao)+'%</td><td>'+nota(all.nota)+'</td>'+(eco?'<td>'+D.fmtH(eco.horas(all.r))+'</td>':'')+'</tr></tbody></table></div>'+
        '<div class="mr-note">Setas: variação em pontos percentuais (pp) em relação à semana anterior (segunda a domingo).</div></div>';
    }
  }

  // pico
  if(hasPeak){
    var top=sm.top;
    out+='<div class="mr-sec"><h2>Horário de pico<small>quando os clientes procuram a IA</small></h2><div class="mr-cards">'+
      '<div class="pk-s"><small>Dia mais movimentado</small><strong>'+P.DIAS[sm.busiest]+'</strong><em>'+fmt(sm.day[sm.busiest])+' atend. ('+P.rp(sm.day[sm.busiest],sm.tot)+'%)</em></div>'+
      '<div class="pk-s"><small>Hora de pico</small><strong>'+P.hh(sm.peak)+' às '+P.hh(sm.peak+1)+'</strong><em>'+fmt(sm.hour[sm.peak])+' atend.</em></div>'+
      '<div class="pk-s"><small>Fora do expediente</small><strong>'+P.rp(sm.off.t,sm.tot)+'%</strong><em>IA resolveu '+P.rp(sm.off.r,sm.off.t)+'% · no expediente '+P.rp(sm.inn.r,sm.inn.t)+'%</em></div>'+
      '<div class="pk-s"><small>Maior taxa de transferência</small><strong>'+(top?P.DS[top.wd]+' '+P.hh(top.h):'—')+'</strong><em>'+(top?Math.round(top.rate*100)+'% de '+fmt(top.t)+' atend.':'poucos atendimentos')+'</em></div></div>'+
      '<div class="pk-wrap">'+P.heatHtml(sl,'vol',{interactive:false})+'</div>'+
      '<div class="mr-note">Atendimentos por dia da semana e hora do primeiro contato; quanto mais escuro, mais atendimentos. Horas em negrito: expediente (segunda a sexta, '+P.BIZ.from+'h às '+P.BIZ.to+'h).'+(P.heatHtml.hidden?' Horários sem atendimento não aparecem.':'')+'</div></div>';
  }

  // clientes que voltam
  if(rc.rows.length){
    out+='<div class="mr-sec"><h2>Clientes que mais voltaram<small>telefones parcialmente ocultos</small></h2><div class="mr-w"><table><thead><tr><th>Contato</th><th>Vezes</th><th>Resolvidos</th><th>Transferidos</th><th>Não resolvidos</th><th>Último desfecho</th><th style="text-align:left">IAs</th></tr></thead><tbody>'+
      rc.rows.slice(0,10).map(function(r){return'<tr><td>'+esc(window.maskPhone?window.maskPhone(r.contact):r.contact)+'</td><td><b>'+r.n+'</b></td><td>'+r.c.res+'</td><td>'+r.c.tr+'</td><td>'+r.c.nao+'</td><td>'+esc(OUTCOME_ONE[r.lastOutcome]||r.lastOutcome)+'</td><td style="white-space:normal;text-align:left">'+esc(r.ias.join(', '))+'</td></tr>'}).join('')+
      '</tbody></table></div>'+(rc.rows.length>10?'<div class="mr-note">Os 10 que mais voltaram de '+fmt(rc.rows.length)+'. A lista completa está na aba Qualidade (botão CSV).</div>':'')+'</div>';
  }

  out+='<div class="mr-foot"><p><b>Como ler:</b> atendimento é o protocolo que passou pela IA e teve desfecho registrado. Resolvido: a IA concluiu e o cliente não voltou em até 24h (uma possível solução vira resolvida após 24h sem retorno). Não resolvido permanece mesmo com eventos posteriores. Transferido: encaminhado para a fila humana.</p>'+
    (eco?'<p><b>Economia:</b> atendimentos resolvidos pela IA × tempo médio de um atendimento humano ('+String(eco.minutos).replace('.',',')+' min)'+(eco.custoHora>0?' × custo da hora ('+D.fmtR(eco.custoHora)+')':'')+'. Cálculo conservador: só conta os resolvidos.</p>':'')+
    '<p>Nota média e avaliações vêm da pesquisa de satisfação (R74). Contatos aparecem com o telefone parcialmente oculto.</p></div>';
  return{html:out,title:pi.title};
}

/* ---------- Janela de visualização ---------- */
var ov=null,opener=null,oldTitle='';
function close(){
  if(!ov)return;ov.hidden=true;document.body.classList.remove('mr-open');
  if(oldTitle)document.title=oldTitle;
  if(opener&&opener.focus)try{opener.focus()}catch(e){}
}
function open(btn){
  if(typeof data==='undefined'||!data||!data.r72){toast('Carregue os dados primeiro');return}
  if(!window.monDesempenho||!window.monPadroes){toast('Relatório indisponível: recarregue a página');return}
  var r;try{r=build()}catch(e){console.error('relatorio',e);toast('Não foi possível montar o relatório');return}
  opener=btn||null;
  if(!ov){
    ov=document.createElement('div');ov.id='mrOverlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Relatório mensal');
    document.body.appendChild(ov);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!ov.hidden)close()});
  }
  ov.innerHTML='<div class="mr-bar"><div><b>Relatório mensal · '+esc(r.title)+'</b><small>Confira e use “Imprimir / salvar PDF”. Sai sempre em fundo branco.</small></div>'+
    '<button type="button" class="btn btn-primary" id="mrPrint">Imprimir / salvar PDF</button><button type="button" class="btn btn-secondary" id="mrClose">Fechar</button></div>'+
    '<div class="mr-scroll"><article class="mr-sheet">'+r.html+'</article></div>';
  oldTitle=document.title;document.title='Relatório IAs - '+r.title;
  ov.hidden=false;document.body.classList.add('mr-open');
  q('#mrClose',ov).onclick=close;
  q('#mrPrint',ov).onclick=function(){window.print()};
  q('#mrPrint',ov).focus();
}
window.addEventListener('afterprint',function(){if(ov&&!ov.hidden&&oldTitle)document.title='Relatório IAs - '+(q('.mr-bar b',ov)||{textContent:''}).textContent.replace(/^Relatório mensal · /,'')});

/* ---------- Botão ---------- */
function place(){
  if(q('#mrBtn'))return;
  var b=document.createElement('button');b.id='mrBtn';b.type='button';b.className='btn btn-secondary';
  b.title='Abrir o relatório do período em uma página limpa, pronta para PDF';
  b.innerHTML='<span class="btn-icon" aria-hidden="true">▤</span> Relatório mensal';
  b.onclick=function(){open(b)};
  var qa2=q('.quick-actions'),rb=q('#reportBtn');
  if(qa2)qa2.insertBefore(b,qa2.firstChild);else if(rb)rb.parentNode.insertBefore(b,rb);else return;
}
place();
if(!q('#mrBtn'))addEventListener('load',place);
})();
