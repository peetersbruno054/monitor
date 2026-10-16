/* cenas.js — cena animada "Jornada do atendimento", gráficos do BI que se desenham,
   contadores e fundo animado do login. Carregar por ÚLTIMO (depois do bi.js).
   Só desenha e anima; não altera dados nem cálculos. Respeita "reduzir movimento". */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var NS='http://www.w3.org/2000/svg';
var reduce=function(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
function el(n,a,txt){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function n0(v){return Math.round(v).toLocaleString('pt-BR')}
function pc(v){return(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}
function brf(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:''}
function safe(f){try{return f()}catch(e){if(window.console)console.error('cenas',e)}}

/* ====================================================================
   1. Cena "Jornada do atendimento"
   ==================================================================== */
var OUTS=[
  {k:'resolvido',lab:'Resolvido',c:'--sc-res'},
  {k:'transferido',lab:'Transferido',c:'--sc-tra'},
  {k:'nao',lab:'Não resolvido',c:'--sc-nao'},
  {k:'inatividade',lab:'Inatividade',c:'--sc-ina'},
  {k:'safenota',lab:'Finaliza SafeNota',c:'--sc-sn',opt:1},
  {k:'outros',lab:'Outros (não retornou)',c:'--sc-out',opt:1}
];
var CHV=['--sc-wa','--sc-web','--sc-oth','--sc-ina','--sc-sn'];

function outCounts(v){
  var sn=v.sn||0,o=Math.max(0,v.t-v.r-v.u-v.tr-v.ina-sn);
  return{resolvido:v.r,transferido:v.tr,nao:v.u,inatividade:v.ina,safenota:sn,outros:o};
}
function chooseColor(i){return CHV[Math.min(i,CHV.length-1)]}

/* Fonte de dados: BI (com filtros) ou Visão geral (período inteiro) */
function infoBI(){
  var c=window.monBI&&window.monBI.compute&&window.monBI.compute();
  if(!c||!c.st||!c.st._all)return null;
  var v=c.st._all,cn=outCounts(v);
  var chs=(c.chNames||[]).filter(function(n){return c.stCh&&c.stCh[n]&&c.stCh[n].t&&n!=='Não informado'}).map(function(n,i){return{name:n,n:c.stCh[n].t,c:chooseColor(i)}});
  var ias=Object.keys(c.stIA||{}).filter(function(n){return n!=='_all'&&c.stIA[n].t>0});
  return{total:v.t,cn:cn,chs:chs,ias:ias,sub:c.p?brf(c.p.start)+' a '+brf(c.p.end):'',scope:'BI'};
}
function infoOv(){
  if(typeof data==='undefined'||!data||!data.r72||!window.monDesempenho)return null;
  var list=data.r72.protocols||[],st=window.monDesempenho.byIA(list),v=st._all,cn=outCounts(v);
  var m={};list.forEach(function(x){if(DESFECHOS.indexOf(x.outcome)<0||!x.channel)return;m[x.channel]=(m[x.channel]||0)+1});
  var chs=Object.keys(m).sort(function(a,b){return m[b]-m[a]}).map(function(n,i){return{name:n,n:m[n],c:chooseColor(i)}});
  var ias=window.monDesempenho.IAS.filter(function(n){return st[n]&&st[n].t>0});
  var a=q('#start'),b=q('#end');
  return{total:v.t,cn:cn,chs:chs,ias:ias,sub:a&&b&&a.value?brf(a.value)+' a '+brf(b.value):'',scope:'OV'};
}

function mountScene(id,after){
  var host=q('#'+id);if(host)return host;
  var ref=q(after);if(!ref||!ref.parentNode)return null;
  host=document.createElement('article');host.id=id;host.className='panel cena';host.hidden=true;
  host.setAttribute('aria-label','Jornada do atendimento');
  host.innerHTML='<div class="panel-head"><div><h2>Jornada do atendimento</h2><p class="cena-sub"></p></div></div><div class="cena-chs"></div><div class="cena-cw"></div>';
  ref.parentNode.insertBefore(host,ref.nextSibling);
  if(window.ResizeObserver){
    var t,lastW=0;
    new ResizeObserver(function(){var w=q('.cena-cw',host).clientWidth;if(Math.abs(w-lastW)<8&&lastW)return;lastW=w;clearTimeout(t);t=setTimeout(function(){host._sig='';drawScene(host)},120)}).observe(host);
  }
  return host;
}
var SRC={cenaOv:infoOv,cenaBi:infoBI};

function drawScene(host){
  var info=SRC[host.id]();var cw=q('.cena-cw',host);
  if(!info||!info.total){host.hidden=true;host._sig='';return}
  host.hidden=false;
  var W=cw.clientWidth;if(!W)return;
  var narrow=W<640,sig=[info.total,OUTS.map(function(o){return info.cn[o.k]}).join(','),info.chs.map(function(c){return c.name+c.n}).join(','),narrow?'n':'w',Math.round(W/40)].join('|');
  if(host._sig===sig)return;
  var first=!host._sig;host._sig=sig;
  host.classList.toggle('narrow',narrow);
  q('.cena-sub',host).textContent='Do cliente ao desfecho'+(info.sub?' · '+info.sub:'')+(info.ias.length?' · '+info.ias.length+(info.ias.length>1?' IAs':' IA'):'');
  q('.cena-chs',host).innerHTML=info.chs.map(function(c){return'<span><b>'+esc(c.name)+'</b> '+n0(c.n)+'</span>'}).join('');

  var rows=OUTS.filter(function(o){return!o.opt||info.cn[o.k]>0});
  var nR=rows.length,rowH=narrow?42:40,padY=16,H=Math.max(narrow?150:190,nR*rowH+padY*2);
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img','aria-label':'Jornada do atendimento: '+n0(info.total)+' atendimentos com desfecho. '+rows.map(function(o){return o.lab+' '+n0(info.cn[o.k])}).join(', ')+'.'});
  svg.style.height=H+'px';
  var anim=!reduce();
  var cy=H/2,r=narrow?24:32,cx=narrow?r+10:Math.round(W*.40);
  var x0=narrow?Math.round(cx+r+W*.14):Math.round(W*.66),xR=W-4;
  var inW=Math.min(150,Math.round(W*.2)),inX=4;

  /* trilhas dos desfechos (atrás de tudo) */
  var gPaths=el('g',{}),gDots=el('g',{}),gRows=el('g',{}),gIn=el('g',{}),gNode=el('g',{});
  svg.appendChild(gPaths);svg.appendChild(gRows);svg.appendChild(gIn);svg.appendChild(gDots);svg.appendChild(gNode);

  var yOf=function(i){return nR===1?cy:padY+rowH/2+i*((H-padY*2-rowH)/(nR-1))};
  var dur=function(i,n){return(2.6+((i*7+n)%5)*.35).toFixed(2)};
  function particles(d,color,count,base,idx){
    if(!anim)return;
    for(var k=0;k<count;k++){
      var dr=dur(idx,k),beg=(k*(parseFloat(dr)/count)).toFixed(2);
      var c=el('circle',{r:3.1,fill:'var('+color+')',opacity:0});
      c.appendChild(el('animateMotion',{path:d,dur:dr+'s',begin:'-'+beg+'s',repeatCount:'indefinite',calcMode:'spline',keyTimes:'0;1',keySplines:'.35 .05 .55 .95'}));
      c.appendChild(el('animate',{attributeName:'opacity',values:'0;1;1;0',keyTimes:'0;.12;.85;1',dur:dr+'s',begin:'-'+beg+'s',repeatCount:'indefinite'}));
      gDots.appendChild(c);
    }
  }

  rows.forEach(function(o,i){
    var n=info.cn[o.k],sh=n/info.total,y=yOf(i);
    var d='M'+(cx+r)+' '+cy+' C'+(cx+r+(x0-cx-r)*.55).toFixed(1)+' '+cy+' '+(x0-(x0-cx-r)*.5).toFixed(1)+' '+y.toFixed(1)+' '+(x0-10)+' '+y.toFixed(1);
    var sw=Math.max(1.6,Math.min(9,1.6+sh*14));
    var p=el('path',{d:d,class:'pth'+(anim?' sc-line':''),pathLength:1,stroke:'var('+o.c+')','stroke-width':sw,opacity:n?.28:.12});p.style.setProperty('--i',i);
    gPaths.appendChild(p);
    if(n&&anim){
      var f=el('path',{d:d,class:'flow',stroke:'var('+o.c+')','stroke-width':Math.max(1.4,Math.min(3,sw*.45))});gPaths.appendChild(f);
      particles(d,o.c,Math.max(1,Math.min(6,Math.round(sh*10))),sw,i);
    }
    /* linha do desfecho: marcador, rótulo, trilha com barra e números */
    var g=el('g',{class:'row'+(anim?' sc-in':'')});g.style.setProperty('--i',i+2);
    g.appendChild(el('title',{},o.lab+': '+n0(n)+' ('+pc(sh*100)+')'));
    g.appendChild(el('circle',{cx:x0,cy:y,r:6,fill:'var('+o.c+')'}));
    var tx=x0+16,rw=xR-tx;
    g.appendChild(el('text',{x:tx,y:y-4,'font-size':12.5,'font-weight':600},o.lab));
    var numW=narrow?62:74,bw=Math.max(40,rw-numW-8);
    g.appendChild(el('rect',{x:tx,y:y+4,width:bw,height:6,rx:3,class:'trk'}));
    var fw=Math.max(n?4:0,bw*sh);
    var bar=el('rect',{x:tx,y:y+4,width:fw,height:6,rx:3,fill:'var('+o.c+')',class:anim?'sc-bar':''});bar.style.setProperty('--i',i);g.appendChild(bar);
    var nm=el('text',{x:xR,y:y-1,'text-anchor':'end','font-size':14,class:'t-ink'},n0(n));g.appendChild(nm);
    g.appendChild(el('text',{x:xR,y:y+12,'text-anchor':'end','font-size':11,class:'t-mut'},pc(sh*100)));
    gRows.appendChild(g);
  });

  /* entradas (canais) → IA */
  if(!narrow){
    var ins=info.chs.length?info.chs.slice(0,4):[{name:'Clientes',n:info.total,c:'--sc-wa'}];
    var step=Math.min(54,(H-padY*2)/Math.max(ins.length,1)),y0=cy-(ins.length-1)*step/2;
    var tot=ins.reduce(function(a,c){return a+c.n},0)||1;
    ins.forEach(function(c,i){
      var y=y0+i*step,sh=c.n/tot,d='M'+(inX+inW)+' '+y.toFixed(1)+' C'+(inX+inW+(cx-r-inX-inW)*.55).toFixed(1)+' '+y.toFixed(1)+' '+(cx-r-(cx-r-inX-inW)*.5).toFixed(1)+' '+cy+' '+(cx-r)+' '+cy;
      var p=el('path',{d:d,class:'pth'+(anim?' sc-line':''),pathLength:1,stroke:'var('+c.c+')','stroke-width':Math.max(1.6,Math.min(8,1.6+sh*10)),opacity:.28});p.style.setProperty('--i',i);gPaths.appendChild(p);
      if(anim){gPaths.appendChild(el('path',{d:d,class:'flow',stroke:'var('+c.c+')','stroke-width':1.6}));particles(d,c.c,Math.max(1,Math.min(4,Math.round(sh*6))),2,i+9)}
      var g=el('g',{class:anim?'sc-in':''});g.style.setProperty('--i',i);
      g.appendChild(el('title',{},c.name+': '+n0(c.n)));
      g.appendChild(el('rect',{x:inX,y:y-17,width:inW,height:34,rx:17,class:'pill'}));
      g.appendChild(el('circle',{cx:inX+16,cy:y,r:5,fill:'var('+c.c+')'}));
      var lab=c.name.length>14?c.name.slice(0,13)+'…':c.name;
      g.appendChild(el('text',{x:inX+28,y:y-1.5,'font-size':12,'font-weight':600},lab));
      g.appendChild(el('text',{x:inX+28,y:y+11,'font-size':10.5,class:'t-mut'},n0(c.n)+(info.chs.length?' · '+pc(c.n/tot*100):'')));
      gIn.appendChild(g);
    });
  }

  /* nó central: a IA */
  if(anim){gNode.appendChild(el('circle',{cx:cx,cy:cy,r:r,class:'halo'}));gNode.appendChild(el('circle',{cx:cx,cy:cy,r:r,class:'halo h2'}))}
  var core=el('g',{class:anim?'core':''});
  core.appendChild(el('circle',{cx:cx,cy:cy,r:r,class:'node'}));
  var big=el('text',{x:cx,y:cy+(narrow?1:2),'text-anchor':'middle','font-size':narrow?12:16,class:'t-big'},n0(first&&anim?0:info.total));
  core.appendChild(big);
  core.appendChild(el('text',{x:cx,y:cy+(narrow?12:15),'text-anchor':'middle','font-size':narrow?8.5:9.5,class:'t-mut'},'atend.'));
  gNode.appendChild(core);
  if(!narrow)gNode.appendChild(el('text',{x:cx,y:cy+r+20,'text-anchor':'middle','font-size':11.5,'font-weight':600},info.ias.length>1?'Agentes de IA':(info.ias[0]||'Agente de IA')));
  if(narrow)gNode.appendChild(el('text',{x:cx,y:cy+r+16,'text-anchor':'middle','font-size':10.5,'font-weight':600},'IA'));

  cw.textContent='';cw.appendChild(svg);
  if(first&&anim)countText(big,0,info.total,900);
}

/* contagem dentro de um <text> */
function countText(node,from,to,ms){
  var t0=performance.now();
  (function f(t){var p=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-p,3);node.textContent=n0(from+(to-from)*e);if(p<1)requestAnimationFrame(f)})(t0);
}

function refreshScenes(){
  safe(function(){
    var ov=mountScene('cenaOv','#overviewKpis');if(ov)drawScene(ov);
    var bi=mountScene('cenaBi','#biKpis');if(bi)drawScene(bi);
  });
}

/* ====================================================================
   2. Contadores dos cartões (de 0 até o valor, só quando o número muda)
   ==================================================================== */
var PREV={};
function parseNum(t){
  var m=String(t||'').trim().match(/^(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?)(\D*)$/);if(!m)return null;
  var raw=m[1],dec=(raw.split(',')[1]||'').length;return{v:Number(raw.replace(/\./g,'').replace(',','.')),dec:dec,suf:m[2]};
}
function fmt(v,dec,suf){return(dec?v.toFixed(dec).replace('.',','):Math.round(v).toLocaleString('pt-BR'))+suf}
function countCards(root,sel,keyOf){
  if(reduce())return;
  qa(sel,root).forEach(function(node,i){
    var tn=node.firstChild;if(!tn||tn.nodeType!==3)return;
    var to=parseNum(tn.nodeValue);if(!to)return;
    var key=keyOf(node,i),from=PREV[key];PREV[key]=to;
    var f0=from?from.v:0;if(from&&from.v===to.v&&from.dec===to.dec)return;
    var t0=performance.now(),span=Math.abs(to.v-f0);if(!span)return;
    (function f(t){var p=Math.min(1,(t-t0)/(from?650:900)),e=1-Math.pow(1-p,3);tn.nodeValue=fmt(f0+(to.v-f0)*e,to.dec,to.suf);if(p<1)requestAnimationFrame(f)})(t0);
  });
}
function watchCounters(){
  var bi=q('#biKpis');
  if(bi)new MutationObserver(function(){countCards(bi,'.bi-k strong',function(n,i){return'bi|'+((n.parentNode.firstChild||{}).textContent||i)})}).observe(bi,{childList:true});
  ['surveyKpis','protocolKpis','qualityKpis'].forEach(function(id){
    var box=q('#'+id);if(!box)return;
    new MutationObserver(function(){countCards(box,'.kpi2 .vl',function(n,i){return id+'|'+i})}).observe(box,{childList:true});
  });
}

/* ====================================================================
   3. Gráficos do BI: linhas se desenham, colunas sobem
   ==================================================================== */
var LAST_ANIM=new WeakMap();
function animateChart(host,svg){
  if(reduce()||document.hidden)return;
  var now=Date.now(),prev=LAST_ANIM.get(host)||0;
  if(now-prev<1500)return;LAST_ANIM.set(host,now);
  qa('path[fill=none][stroke-width="2"]',svg).forEach(function(p,i){p.setAttribute('pathLength','1');p.classList.add('sc-line');p.style.setProperty('--i',i)});
  qa('circle[r="4"]',svg).forEach(function(c,i){c.classList.add('sc-dot');c.style.setProperty('--i',i%24)});
  qa('g[clip-path]',svg).forEach(function(g,i){g.classList.add('sc-col');g.style.setProperty('--i',Math.min(i,40))});
  qa('rect[rx="2"]',svg).forEach(function(r){r.classList.add('sc-fade')});
  qa('text.lab',svg).forEach(function(t){t.classList.add('sc-fade')});
}
function watchCharts(){
  var root=q('[data-panel=bi]');if(!root)return;
  new MutationObserver(function(list){
    list.forEach(function(m){
      if(!m.target.classList||!m.target.classList.contains('bi-cw'))return;
      Array.prototype.forEach.call(m.addedNodes,function(n){if(n.nodeName&&n.nodeName.toLowerCase()==='svg')animateChart(m.target,n)});
    });
  }).observe(root,{childList:true,subtree:true});
}

/* ====================================================================
   4. Login: aurora e fluxo de conversas
   ==================================================================== */
function loginScene(){
  var lv=q('#loginView');if(!lv||q('.login-scene',lv))return;
  var box=document.createElement('div');box.className='login-scene';box.setAttribute('aria-hidden','true');
  var anim=!reduce();
  var paths=['M-50 620 C 220 520 380 760 620 600 S 1000 380 1260 470','M-50 220 C 200 330 420 90 640 230 S 980 420 1260 260','M-50 430 C 260 380 420 520 700 430 S 1040 300 1260 360'];
  var s='<div class="blob b1"></div><div class="blob b2"></div><svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">';
  paths.forEach(function(d,i){s+='<path class="ln'+(i===1?' l2':'')+'" d="'+d+'"/>'});
  if(anim)paths.forEach(function(d,i){for(var k=0;k<3;k++){var dur=(9+i*2+k*1.5).toFixed(1);s+='<circle r="3.4" class="dt'+(i===1?' d2':k===2?' d3':'')+'" opacity="0"><animateMotion path="'+d+'" dur="'+dur+'s" begin="-'+(k*3.1+i).toFixed(1)+'s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;.9;0" keyTimes="0;.1;.9;1" dur="'+dur+'s" begin="-'+(k*3.1+i).toFixed(1)+'s" repeatCount="indefinite"/></circle>'}});
  s+='</svg>';
  box.innerHTML=s;lv.insertBefore(box,lv.firstChild);
}

/* ====================================================================
   Início
   ==================================================================== */
function boot(){
  safe(loginScene);safe(watchCounters);safe(watchCharts);
  ['overviewKpis','biKpis'].forEach(function(id){
    var k=q('#'+id);if(k)new MutationObserver(function(){requestAnimationFrame(refreshScenes)}).observe(k,{childList:true});
  });
  /* aba aberta depois da primeira montagem: redesenha quando a tela aparece */
  qa('[data-panel]').forEach(function(p){new MutationObserver(function(){if(!p.hidden)requestAnimationFrame(refreshScenes)}).observe(p,{attributes:true,attributeFilter:['hidden']})});
  refreshScenes();
}
boot();
if(window.matchMedia){try{matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',function(){qa('.cena').forEach(function(h){h._sig=''});refreshScenes()})}catch(e){}}
})();
