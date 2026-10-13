/* padroes.js — "Mapa de pico" (Visão geral) e "Clientes que mais voltam" (Qualidade).
   Carregar depois de desempenho.js. Usa data, DESFECHOS, OUTCOME_ONE, dt, isUnresolvedProtocol (app.js). */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var IAS=['Assistente Safira','IA SPC','SPC AGE','SPC ACI'];
var DIAS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],DS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
var BIZ={from:8,to:18};            // expediente: segunda a sexta, das 8h às 18h
var MIN_RATE=3;                    // células com menos atendimentos não entram nas taxas
var MIN_TOP=5;                     // mínimo de atendimentos para apontar a "maior transferência"
function toast(m){if(window.monToast)window.monToast(m)}
function wrap(n,f){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);try{f()}catch(e){console.error('padroes',n,e)}return r}}
function dk(ms){var d=new Date(ms);return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)}
function hh(h){return h+'h'}
function isBiz(wd,h){return wd<5&&h>=BIZ.from&&h<BIZ.to}
function rp(a,b){return b?Math.round(a/b*100):0}

var css=
'.pk-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-left:auto}'+
'.pk-ctl select{height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit}'+
'.pk-seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}'+
'.pk-seg button{height:32px;padding:0 11px;border:0;background:var(--surface);color:var(--ink2);font-size:12.5px;cursor:pointer}'+
'.pk-seg button+button{border-left:1px solid var(--line)}'+
'.pk-seg button[aria-pressed=true]{background:var(--blue);color:#fff}'+
'.pk-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px}.pk-head>div:first-child{flex:1;min-width:220px}'+
'.pk-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:4px 0 12px}'+
'.pk-s{padding:9px 12px;border:1px solid var(--line2);border-radius:12px;background:var(--surface2)}'+
'.pk-s small{display:block;color:var(--muted);font-size:11.5px}.pk-s strong{display:block;margin:1px 0;font-size:19px;font-weight:600;letter-spacing:-.01em;font-variant-numeric:tabular-nums}'+
'.pk-s em{display:block;font-style:normal;color:var(--muted);font-size:11.5px}'+
'.pk-wrap{overflow-x:auto;padding-bottom:2px}'+
'.pk-area{position:relative}.pk-grid{display:grid;gap:2px}'+
'.pk-h{font-size:9.5px;line-height:16px;text-align:center;color:var(--muted2)}.pk-h.biz{color:var(--ink);font-weight:600}'+
'.pk-d{display:flex;align-items:center;font-size:11.5px;font-weight:600;color:var(--ink2)}.pk-d.we{color:var(--muted)}'+
'.pk-c{height:23px;min-width:0;padding:0;border:0;border-radius:4px;background:var(--surface3);color:var(--ink);font:inherit;font-size:10px;font-variant-numeric:tabular-nums;cursor:pointer}'+
'.pk-c.pk-hi{color:#fff}.pk-c.pk-lo{opacity:.5}.pk-c:hover{outline:1px solid var(--ink2)}.pk-c[aria-pressed=true]{outline:2px solid var(--ink)}'+
'.pk-c.pk-ro{cursor:default}.pk-c.pk-ro:hover{outline:0}'+
'.pk-detail{margin-top:10px;min-height:20px;font-size:12.5px;color:var(--ink2)}'+
'.pk-lg{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;font-size:11px;color:var(--muted)}.pk-lg i{display:inline-block;width:90px;height:8px;border-radius:99px;background:linear-gradient(90deg,var(--surface3),var(--c))}'+
'.pk-note{margin-top:8px;font-size:11.5px;color:var(--muted)}'+
/* clientes que voltam */
'#recPanel .rc-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:6px 0 14px}'+
'#recPanel .rc-list{display:grid;gap:8px}'+
'#recPanel .rc-row{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 12px;border:1px solid var(--line2);border-radius:12px;background:var(--surface2)}'+
'#recPanel .rc-n{display:grid;place-items:center;height:44px;border-radius:10px;background:var(--surface);border:1px solid var(--line);font-size:18px;font-weight:600;font-variant-numeric:tabular-nums}#recPanel .rc-n small{display:block;font-size:9px;font-weight:400;color:var(--muted);margin-top:-14px}'+
'#recPanel .rc-main b{font-size:13.5px;font-weight:600}#recPanel .ph{cursor:pointer}'+
'#recPanel .rc-main small{color:var(--muted);font-size:11.5px}'+
'#recPanel .rc-outs{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}'+
'#recPanel .rc-prot{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}#recPanel .rc-prot button{height:22px;padding:0 8px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink2);font-size:10.5px;font-variant-numeric:tabular-nums;cursor:pointer}'+
'#recPanel .rc-more{display:flex;gap:8px;margin-top:12px}'+
'#recPanel .panel-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px}#recPanel .panel-head>div:first-child{flex:1;min-width:220px}'+
'@media print{.pk-ctl,#recPanel .rc-more,#recPanel .rc-csv{display:none!important}#peakPanel,#recPanel .rc-row{break-inside:avoid}.pk-wrap{overflow:visible}.pk-grid{min-width:0!important}#recPanel .rc-row:nth-child(n+11){display:none}}'+
'@media(max-width:560px){#peakPanel .pk-sum{grid-template-columns:1fr 1fr;gap:8px}#peakPanel .pk-s{padding:8px 10px}#peakPanel .pk-s strong{font-size:16px}#peakPanel .pk-s em{display:none}#peakPanel .pk-head p{display:none}}'+
'@media(max-width:820px){#recPanel .rc-row{grid-template-columns:44px minmax(0,1fr)}#recPanel .rc-last{grid-column:1/-1}.pk-ctl{margin-left:0;width:100%}}';
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

/* ---------- Atendimentos por hora: gráfico por desfecho + mapa dia da semana × hora ---------- */
var CATS=[['resolvido','Resolvidos','resolved'],['nao','Não resolvidos','bad'],['transferido','Transferidos','transferred'],['outros','Outros desfechos','other']];
var OSUB=[['inatividade','Inatividade'],['possivel','Aguardando confirmação'],['finalizado','Finalizado'],['safenota','Finaliza SafeNota']];
var KEYS=['t','r','tr'].concat(CATS.map(function(c){return c[0]}),OSUB.map(function(o){return o[0]}));
function catOf(x){if(x.outcome==='resolvido')return'resolvido';if(isUnresolvedProtocol(x))return'nao';if(x.outcome==='transferido')return'transferido';return'outros'}
function newSlot(){var s={};KEYS.forEach(function(k){s[k]=0});return s}
function slots(list,ia){
  var g=[],i;for(i=0;i<168;i++)g.push(newSlot());
  var tot=0,timed=0,excl=0;
  (list||[]).forEach(function(x){
    if(ia&&x.agent!==ia)return;
    var ms=dt(x.firstDate);if(!ms)return;
    if(DESFECHOS.indexOf(x.outcome)<0){excl++;return}
    var d=new Date(ms),wd=(d.getDay()+6)%7,h=d.getHours(),s=g[wd*24+h],c=catOf(x);
    tot++;if(/\d{1,2}:\d{2}/.test(String(x.firstDate)))timed++;
    s.t++;s[c]++;if(x.outcome==='resolvido')s.r++;if(x.outcome==='transferido')s.tr++;
    if(c==='outros'&&OSUB.some(function(o){return o[0]===x.outcome}))s[x.outcome]++;
  });
  return{g:g,tot:tot,timed:timed,excl:excl};
}
// soma dos 7 dias em cada hora
function hourly(sl){
  var h=[],i,d;for(i=0;i<24;i++)h.push(newSlot());
  for(d=0;d<7;d++)for(i=0;i<24;i++){var s=sl.g[d*24+i];KEYS.forEach(function(k){h[i][k]+=s[k]})}
  return h;
}
// só as horas em que houve atendimento (da primeira à última), para não desperdiçar largura
function range(sl){
  var h0=23,h1=0,i;for(i=0;i<168;i++)if(sl.g[i].t){var hr=i%24;if(hr<h0)h0=hr;if(hr>h1)h1=hr}
  return h0>h1?[0,23]:[h0,h1];
}
function summarize(sl){
  var day=[0,0,0,0,0,0,0],hour=[],i,wd,h,s,inn={t:0,r:0,tr:0},off={t:0,r:0,tr:0},top=null;
  for(i=0;i<24;i++)hour.push(0);
  for(wd=0;wd<7;wd++)for(h=0;h<24;h++){
    s=sl.g[wd*24+h];day[wd]+=s.t;hour[h]+=s.t;
    var b=isBiz(wd,h)?inn:off;b.t+=s.t;b.r+=s.r;b.tr+=s.tr;
    if(s.t>=MIN_TOP){var rate=s.tr/s.t;if(!top||rate>top.rate||(rate===top.rate&&s.t>top.t))top={wd:wd,h:h,rate:rate,t:s.t,tr:s.tr}}
  }
  var bd=0,ph=0;for(i=1;i<7;i++)if(day[i]>day[bd])bd=i;for(i=1;i<24;i++)if(hour[i]>hour[ph])ph=i;
  return{day:day,hour:hour,busiest:bd,peak:ph,inn:inn,off:off,top:top,tot:sl.tot};
}
function detailText(sl,idx){
  var s=sl.g[idx],wd=Math.floor(idx/24),h=idx%24;
  if(!s.t)return DIAS[wd]+', '+hh(h)+' às '+hh(h+1)+': nenhum atendimento.';
  return'<b>'+DIAS[wd]+', '+hh(h)+' às '+hh(h+1)+':</b> '+fmt(s.t)+' atendimento'+(s.t===1?'':'s')+' · '+fmt(s.r)+' resolvido'+(s.r===1?'':'s')+' ('+rp(s.r,s.t)+'%) · '+fmt(s.tr)+' transferido'+(s.tr===1?'':'s')+' ('+rp(s.tr,s.t)+'%)'+(isBiz(wd,h)?'':' · fora do expediente');
}
// metric: vol | tr | res
function heatHtml(sl,metric,opt){
  opt=opt||{};
  var color=metric==='tr'?'var(--bad)':metric==='res'?'var(--good)':'var(--blue)',vals=[],mx=0,i;
  for(i=0;i<168;i++){var s=sl.g[i],v=null;
    if(metric==='vol')v=s.t;else if(s.t>=MIN_RATE)v=(metric==='tr'?s.tr:s.r)/s.t;
    vals.push(v);if(v!=null&&v>mx)mx=v}
  var rg=range(sl),h0=rg[0],h1=rg[1],n=h1-h0+1;
  var out='<div class="pk-grid" style="--c:'+color+';grid-template-columns:42px repeat('+n+',minmax(24px,1fr));min-width:'+(44+n*26)+'px" role="grid"><div></div>';
  for(i=h0;i<=h1;i++)out+='<div class="pk-h'+(i>=BIZ.from&&i<BIZ.to?' biz':'')+'">'+i+'</div>';
  for(var wd=0;wd<7;wd++){
    out+='<div class="pk-d'+(wd>4?' we':'')+'">'+DS[wd]+'</div>';
    for(var h=h0;h<=h1;h++){
      var idx=wd*24+h,v=vals[idx],s=sl.g[idx],a=v!=null&&mx?v/mx:0,on=a>.55,lo=metric!=='vol'&&s.t>0&&s.t<MIN_RATE;
      var label=v==null?'':metric==='vol'?(s.t?s.t:''):Math.round(v*100);
      out+='<button type="button" class="pk-c'+(on?' pk-hi':'')+(lo?' pk-lo':'')+(opt.interactive===false?' pk-ro':'')+'" data-i="'+idx+'" aria-pressed="'+(opt.sel===idx?'true':'false')+'" '+
        'style="'+(a>0?'background:color-mix(in srgb,var(--c) '+Math.round(12+a*88)+'%,var(--surface3))':'')+'" '+
        (opt.interactive===false?'tabindex="-1" ':'')+
        'aria-label="'+DIAS[wd]+' '+h+'h: '+s.t+' atendimentos, '+s.r+' resolvidos, '+s.tr+' transferidos" title="'+DIAS[wd]+' '+h+'h · '+s.t+' atend. · '+s.r+' resolv. · '+s.tr+' transf.">'+label+'</button>';
    }
  }
  heatHtml.hidden=24-n;
  return out+'</div>';
}
// barras empilhadas por desfecho em cada hora (alinhadas com as colunas do mapa)
function chartHtml(sl,agg){
  var rg=range(sl),h0=rg[0],h1=rg[1],n=h1-h0+1,k;
  var mx=1;for(k=h0;k<=h1;k++)if(agg[k].t>mx)mx=agg[k].t;
  var step=mx<=5?1:mx<=10?2:mx<=25?5:mx<=50?10:Math.ceil(mx/5/10)*10,top=Math.ceil(mx/step)*step,grid='';
  for(var g=step;g<=top;g+=step)grid+='<div class="hs-gl" style="bottom:'+(g/top*100)+'%"><span>'+g+'</span></div>';
  var cols='';
  for(k=h0;k<=h1;k++){var v=agg[k];
    var segs=CATS.map(function(c){var m=v[c[0]];return m?'<u class="sg sg-'+c[2]+'" style="height:'+(m/top*100)+'%"></u>':''}).join('');
    var lab=k+'h: '+fmt(v.t)+' atendimento'+(v.t===1?'':'s')+(v.t?' — '+CATS.filter(function(c){return v[c[0]]}).map(function(c){return c[1].toLowerCase()+' '+v[c[0]]}).join(', '):'');
    cols+='<div class="hs-col" data-h="'+k+'" tabindex="'+(v.t?0:-1)+'" aria-label="'+esc(lab)+'"><div class="hs-stack">'+segs+'</div></div>';
  }
  return'<div class="hs"><div class="hs-plot">'+grid+'<div class="hs-cols" style="grid-template-columns:repeat('+n+',minmax(0,1fr))">'+cols+'</div></div><div class="hs-tip" hidden></div></div>';
}
function legendHtml(agg){
  var tot={};KEYS.forEach(function(k){tot[k]=agg.reduce(function(a,v){return a+v[k]},0)});
  var sub=OSUB.filter(function(o){return tot[o[0]]}).map(function(o){return o[1]+' '+fmt(tot[o[0]])}).join(' · ');
  return'<div class="hs-legend">'+CATS.map(function(c){return'<span><i class="sw sw-'+c[2]+'"></i>'+c[1]+' <b>'+fmt(tot[c[0]])+'</b>'+(c[0]==='outros'&&sub?'<small>('+sub+')</small>':'')+'</span>'}).join('')+'</div>';
}

var PK={ia:'',metric:'vol',sel:null};
var METRICS=[['vol','Volume'],['tr','% transferidos'],['res','% resolvidos']];
function renderPeak(){
  var el=q('#peakPanel');
  if(typeof data==='undefined'||!data||!data.r72){if(el)el.hidden=true;return}
  var anchor=q('#outcomes')&&q('#outcomes').closest('.panel');if(!anchor)return;
  if(!el){el=document.createElement('article');el.id='peakPanel';el.className='panel';anchor.after(el)}
  var sl=slots(data.r72.protocols,PK.ia);
  if(!sl.tot&&!PK.ia){el.hidden=true;return}
  el.hidden=false;
  var sm=summarize(sl),agg=hourly(sl),pctOf=function(a){return rp(a,sm.tot)};
  var head='<div class="panel-head pk-head"><div><h2>Atendimentos por hora</h2><p>Quando os clientes procuram a IA, como os atendimentos terminam e em que dias e horários ela mais resolve ou transfere</p></div>'+
    '<div class="pk-ctl"><select id="pkIA" aria-label="IA">'+['<option value="">Todas as IAs</option>'].concat(IAS.map(function(n){return'<option'+(n===PK.ia?' selected':'')+'>'+esc(n)+'</option>'})).join('')+'</select>'+
    '<div class="pk-seg" role="group" aria-label="Medida do mapa por dia e hora" title="Medida do mapa por dia da semana e hora">'+METRICS.map(function(m){return'<button type="button" data-m="'+m[0]+'" aria-pressed="'+(m[0]===PK.metric?'true':'false')+'">'+m[1]+'</button>'}).join('')+'</div></div></div>';
  if(!sl.tot){el.innerHTML=head+'<div class="pk-note">Nenhum atendimento com desfecho para esta IA no período.</div>';bind(el,sl,agg);return}
  if(sl.timed<sl.tot*.5){el.innerHTML=head+'<div class="pk-note">Os dados deste período não trazem o horário dos atendimentos, então o gráfico e o mapa não podem ser montados.</div>';bind(el,sl,agg);return}
  var top=sm.top;
  var cards=
    '<div class="pk-s"><small>Dia mais movimentado</small><strong>'+DIAS[sm.busiest]+'</strong><em>'+fmt(sm.day[sm.busiest])+' atendimentos ('+pctOf(sm.day[sm.busiest])+'%)</em></div>'+
    '<div class="pk-s"><small>Hora de pico</small><strong>'+hh(sm.peak)+' às '+hh(sm.peak+1)+'</strong><em>'+fmt(sm.hour[sm.peak])+' atendimentos, somando todos os dias</em></div>'+
    '<div class="pk-s"><small>Fora do expediente</small><strong>'+pctOf(sm.off.t)+'%</strong><em>'+fmt(sm.off.t)+' atend. · IA resolveu '+rp(sm.off.r,sm.off.t)+'% (no expediente: '+rp(sm.inn.r,sm.inn.t)+'%) · '+fmt(sm.off.tr)+' transf.</em></div>'+
    '<div class="pk-s"><small>Maior taxa de transferência</small><strong>'+(top?DS[top.wd]+' '+hh(top.h):'—')+'</strong><em>'+(top?Math.round(top.rate*100)+'% de '+fmt(top.t)+' atendimentos':'poucos atendimentos por horário')+'</em></div>';
  var lg=PK.metric==='vol'?'<span><i></i></span><span>mais atendimentos</span>':'<span><i></i></span><span>'+(PK.metric==='tr'?'mais transferências':'mais resolvidos')+'; horários com menos de '+MIN_RATE+' atendimentos ficam sem cor</span>';
  var chart=chartHtml(sl,agg),heat=heatHtml(sl,PK.metric,{sel:PK.sel});
  var area='<div class="pk-area" style="min-width:'+(44+(range(sl)[1]-range(sl)[0]+1)*26)+'px">'+chart+heat+'</div>';
  el.innerHTML=head+'<div class="pk-sum">'+cards+'</div>'+legendHtml(agg)+'<div class="pk-wrap">'+area+'</div>'+
    '<div class="pk-detail" id="pkDetail" aria-live="polite">'+(PK.sel!=null?detailText(sl,PK.sel):'Clique em um horário do mapa para ver os números dele.')+'</div>'+
    '<div class="pk-lg" style="--c:'+(PK.metric==='tr'?'var(--bad)':PK.metric==='res'?'var(--good)':'var(--blue)')+'">'+lg+'</div>'+
    '<div class="pk-note">Barras: atendimentos de cada hora, pelo desfecho. Mapa: dia da semana × hora do primeiro contato. Horas em negrito: expediente (segunda a sexta, '+BIZ.from+'h às '+BIZ.to+'h).'+(heatHtml.hidden?' Horários sem nenhum atendimento no período não aparecem.':'')+
    ' Considera os '+fmt(sm.tot)+' atendimentos com desfecho'+(PK.ia?' da '+esc(PK.ia):'')+(sl.excl?'; '+fmt(sl.excl)+' protocolo'+(sl.excl===1?'':'s')+' ainda sem desfecho não entram':'')+'.</div>';
  bind(el,sl,agg);
}
function bind(el,sl,agg){
  var s=q('#pkIA',el);if(s)s.onchange=function(){PK.ia=this.value;PK.sel=null;renderPeak()};
  qa('.pk-seg button',el).forEach(function(b){b.onclick=function(){PK.metric=b.dataset.m;renderPeak()}});
  qa('.pk-c',el).forEach(function(c){c.onclick=function(){
    var i=+c.dataset.i;PK.sel=PK.sel===i?null:i;
    qa('.pk-c',el).forEach(function(x){x.setAttribute('aria-pressed',+x.dataset.i===PK.sel?'true':'false')});
    q('#pkDetail',el).innerHTML=PK.sel!=null?detailText(sl,PK.sel):'Clique em um horário do mapa para ver os números dele.';
  }});
  // dica nas barras por hora (mouse, teclado ou toque)
  var hs=q('.hs',el),tip=hs&&q('.hs-tip',hs);if(!hs||!tip)return;
  function showTip(col){
    var k=+col.dataset.h,v=agg[k];if(!v.t){tip.hidden=true;return}
    tip.innerHTML='<b>'+k+'h às '+k+'h59</b><span class="hs-tt">'+fmt(v.t)+' atendimento'+(v.t===1?'':'s')+'</span>'+CATS.filter(function(c){return v[c[0]]}).map(function(c){return'<span><i class="sw sw-'+c[2]+'"></i>'+c[1]+'<b>'+fmt(v[c[0]])+' · '+rp(v[c[0]],v.t)+'%</b></span>'+
      (c[0]==='outros'?OSUB.filter(function(o){return v[o[0]]}).map(function(o){return'<span class="hs-sub">'+o[1]+'<b>'+fmt(v[o[0]])+'</b></span>'}).join(''):'')}).join('');
    tip.hidden=false;
    var r=col.getBoundingClientRect(),w=hs.getBoundingClientRect(),z=parseFloat(getComputedStyle(document.body).zoom)||1,cl=(r.left-w.left)/z,cr=(r.right-w.left)/z,tw=tip.offsetWidth,max=w.width/z;
    tip.style.left=(cr+8+tw<=max?cr+8:Math.max(0,cl-8-tw))+'px';   // ao lado da coluna, sem cobrir a barra
    qa('.hs-col.on',hs).forEach(function(c){c.classList.remove('on')});col.classList.add('on');
  }
  function hide(){tip.hidden=true;qa('.hs-col.on',hs).forEach(function(c){c.classList.remove('on')})}
  qa('.hs-col',hs).forEach(function(c){c.addEventListener('mouseenter',function(){showTip(c)});c.addEventListener('focus',function(){showTip(c)});c.addEventListener('click',function(){showTip(c)});c.addEventListener('blur',hide)});
  q('.hs-plot',hs).addEventListener('mouseleave',hide);
}
wrap('renderOverview',renderPeak);

/* ---------- Clientes que mais voltam ---------- */
function ckey(c){return String(c||'').replace(/\D/g,'').slice(-11)||norm(c)}
function recurrence(list){
  var by={},withContact=0,contacts=0;
  (list||[]).forEach(function(x){if(!x.contact)return;var k=ckey(x.contact);if(!k)return;withContact++;(by[k]||(by[k]=[])).push(x)});
  var rows=[],prots=0;
  Object.keys(by).forEach(function(k){
    contacts++;var a=by[k].slice().sort(function(x,y){return dt(x.firstDate)-dt(y.firstDate)});
    if(a.length<2)return;
    var c={res:0,tr:0,nao:0,ina:0,out:0},ias={};
    a.forEach(function(x){
      if(x.outcome==='resolvido')c.res++;else if(x.outcome==='transferido')c.tr++;else if(isUnresolvedProtocol(x))c.nao++;else if(x.outcome==='inatividade')c.ina++;else c.out++;
      if(x.agent)ias[x.agent]=1;
    });
    var last=a[a.length-1],gap=Infinity;
    for(var i=1;i<a.length;i++){var g=(dt(a[i].firstDate)-dt(a[i-1].firstDate))/36e5;if(g>=0&&g<gap)gap=g}
    prots+=a.length;
    rows.push({key:k,contact:a[a.length-1].contact,n:a.length,c:c,ias:Object.keys(ias),first:dt(a[0].firstDate),last:dt(last.firstDate),lastOutcome:last.outcome,lastNao:isUnresolvedProtocol(last),gap:gap,protocols:a.map(function(x){return x.protocol})});
  });
  rows.sort(function(a,b){return b.n-a.n||b.c.nao-a.c.nao||b.last-a.last});
  return{rows:rows,contacts:contacts,withContact:withContact,prots:prots,
    maxN:rows.length?rows[0].n:0,openNao:rows.filter(function(r){return r.lastNao}).length};
}
var RC={show:10};
function rowHtml(r,i){
  var o=OUTCOME_ONE[r.lastOutcome]||r.lastOutcome,span=r.first&&r.last?dk(r.first)+(dk(r.first)===dk(r.last)?'':' – '+dk(r.last)):'';
  var pills=[[r.c.res,'resolvido','resolvidos'],[r.c.tr,'transferido','transferidos'],[r.c.nao,'não resolvido','não resolvidos'],[r.c.ina,'inatividade','inatividade'],[r.c.out,'outro','outros']]
    .filter(function(p){return p[0]}).map(function(p){return'<span class="pill'+(p[2]==='não resolvidos'?' bad':'')+'">'+p[0]+' '+(p[0]===1?p[1]:p[2])+'</span>'}).join('');
  var prot=r.protocols.slice(-5).reverse().map(function(p){return'<button type="button" data-prot="'+esc(p)+'" title="Copiar protocolo">'+esc(p)+'</button>'}).join('')+(r.protocols.length>5?'<small>+'+(r.protocols.length-5)+' anteriores</small>':'');
  return'<div class="rc-row"><div class="rc-n">'+r.n+'<small>vezes</small></div><div class="rc-main"><b><span class="ph" data-f="'+esc(r.contact)+'" data-on="0" title="Clique para ver o número">'+esc(window.maskPhone?window.maskPhone(r.contact):r.contact)+'</span></b> <small>'+esc(r.ias.join(', '))+(span?' · '+span:'')+(isFinite(r.gap)&&r.gap<=24?' · voltou em '+r.gap.toFixed(1).replace('.',',')+'h':'')+'</small>'+
    '<div class="rc-outs">'+pills+'</div><div class="rc-prot">'+prot+'</div></div>'+
    '<div class="rc-last"><span class="pill'+(r.lastNao?' bad':'')+'" title="Desfecho do atendimento mais recente">Último: '+esc(o)+'</span></div></div>';
}
function renderRec(){
  var anchor=q('#recontactList'),el=q('#recPanel');
  if(typeof data==='undefined'||!data||!data.r72||!anchor){if(el)el.hidden=true;return}
  var R=recurrence(data.r72.protocols);
  if(!el){el=document.createElement('article');el.id='recPanel';el.className='panel';anchor.closest('.panel').after(el)}
  el.hidden=false;
  var head='<div class="panel-head"><div><h2>Clientes que mais voltam</h2><p>Mesmo telefone em dois ou mais atendimentos do período, em qualquer intervalo de tempo</p></div>'+
    (R.rows.length?'<button type="button" class="btn btn-ghost rc-csv" id="rcCsv" title="Baixar a lista completa em CSV">↓ CSV</button>':'')+'</div>';
  if(!R.rows.length){
    el.innerHTML=head+'<div class="empty">'+(R.withContact?'Nenhum cliente com mais de um atendimento no período.':'Sem dados de contato suficientes para identificar clientes que voltam.')+'</div>';return}
  var ks=
    '<div class="pk-s"><small>Clientes que voltaram</small><strong>'+fmt(R.rows.length)+'</strong><em>'+rp(R.rows.length,R.contacts)+'% dos '+fmt(R.contacts)+' clientes do período</em></div>'+
    '<div class="pk-s"><small>Atendimentos gerados por eles</small><strong>'+fmt(R.prots)+'</strong><em>'+rp(R.prots,R.withContact)+'% dos '+fmt(R.withContact)+' atendimentos</em></div>'+
    '<div class="pk-s"><small>Maior repetição</small><strong>'+R.maxN+' vezes</strong><em>o mesmo cliente no período</em></div>'+
    '<div class="pk-s"><small>Ainda sem solução</small><strong>'+fmt(R.openNao)+'</strong><em>cliente'+(R.openNao===1?'':'s')+' cujo último atendimento ficou não resolvido</em></div>';
  var n=Math.min(RC.show,R.rows.length);
  el.innerHTML=head+'<div class="rc-ks">'+ks+'</div><div class="rc-list">'+R.rows.slice(0,n).map(rowHtml).join('')+'</div>'+
    (R.rows.length>n?'<div class="rc-more"><button type="button" class="btn btn-secondary" id="rcMore">Mostrar mais '+Math.min(10,R.rows.length-n)+'</button><small style="align-self:center;color:var(--muted)">'+n+' de '+fmt(R.rows.length)+' clientes</small></div>':'');
  var m=q('#rcMore',el);if(m)m.onclick=function(){RC.show+=10;renderRec()};
  var c=q('#rcCsv',el);if(c)c.onclick=function(){exportRec(R)};
  qa('.rc-prot button',el).forEach(function(b){b.onclick=function(){if(window.copyText)window.copyText(b.dataset.prot,'Protocolo '+b.dataset.prot+' copiado')}});
}
wrap('renderQuality',renderRec);
// células do CSV: números que começam com + ou = viram texto no Excel
function cell(v){var s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"'}
function exportRec(R){
  var p={start:q('#start').value,end:q('#end').value};
  var head=['Contato','Atendimentos no período','Resolvidos','Transferidos','Não resolvidos','Inatividade','Outros','IAs','Primeiro contato','Último contato','Desfecho do último','Menor intervalo entre contatos (h)','Protocolos'];
  var f=function(ms){return ms?new Date(ms).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):''};
  var rows=R.rows.map(function(r){return[String(r.contact).replace(/\D/g,''),r.n,r.c.res,r.c.tr,r.c.nao,r.c.ina,r.c.out,r.ias.join(' / '),f(r.first),f(r.last),OUTCOME_ONE[r.lastOutcome]||r.lastOutcome,isFinite(r.gap)?r.gap.toFixed(1).replace('.',','):'',r.protocols.join(' ')]});
  var out=[head].concat(rows).map(function(r){return r.map(cell).join(';')}).join('\r\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+out],{type:'text/csv;charset=utf-8'}));
  a.download='clientes-que-voltam-'+p.start+'-a-'+p.end+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1500);
  toast('Lista de clientes que voltam baixada');
}

// usado pelo relatório mensal (relatorio.js)
window.monPadroes={slots:slots,summarize:summarize,heatHtml:heatHtml,recurrence:recurrence,BIZ:BIZ,DIAS:DIAS,DS:DS,hh:hh,rp:rp};
})();
