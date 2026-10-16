/* visao.js — complementos do redesign da Visão geral: anéis nos cartões, rosca dos desfechos,
   barra de composição em cada IA. Só desenha em cima do que já existe; não muda números. Carregar depois do cenas.js. */
(function(){
'use strict';
var q=function(s,r){return(r||document).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var NS='http://www.w3.org/2000/svg';
function el(n,a){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);return e}
function safe(f){try{f()}catch(e){if(window.console)console.error('visao',e)}}
function num(t){var m=String(t||'').replace(/\./g,'').match(/-?\d+(?:,\d+)?/);return m?parseFloat(m[0].replace(',','.')):null}

/* 1. anel nos quatro cartões da Visão geral (percentual; a nota vai de 0 a 5) */
function rings(){
  qa('#overviewKpis .kpi2').forEach(function(k,i){
    var old=q('.kring',k);if(old)old.remove();
    var vl=q('.vl',k),cu=q('.cu[data-to]',k),v=cu?parseFloat(cu.dataset.to):num(vl&&vl.textContent);
    if(v==null||isNaN(v))return;
    var p=i===2?v/5*100:v;p=Math.max(0,Math.min(100,p));
    var s=el('svg',{class:'kring',viewBox:'0 0 44 44','aria-hidden':'true'});
    s.appendChild(el('circle',{class:'tk',cx:22,cy:22,r:18}));
    var a=el('circle',{class:'ar',cx:22,cy:22,r:18,pathLength:100});a.style.strokeDasharray=p.toFixed(1)+' 100';
    s.appendChild(a);k.appendChild(s);
  });
}

/* 2. rosca dos desfechos + destaque cruzado com as linhas */
function donut(){
  var box=q('#outcomes'),sum=box&&q('.oc-sum',box);if(!sum)return;
  var old=q('.oc-donut',sum);if(old)old.remove();
  var rows=qa('.oc-row',box).map(function(r){
    var n=num((q('.oc-r small',r)||{}).textContent)||0;
    r.classList.toggle('z',!n);
    return{r:r,k:r.dataset.o,n:n,c:r.style.getPropertyValue('--c')};
  });
  var tot=rows.reduce(function(a,o){return a+o.n},0);if(!tot)return;
  var wrap=document.createElement('div');wrap.className='oc-donut';
  var s=el('svg',{viewBox:'0 0 120 120',role:'img','aria-label':'Distribuição dos desfechos'});
  s.appendChild(el('circle',{class:'tk',cx:60,cy:60,r:48}));
  var acc=0,res=rows.filter(function(o){return o.k==='resolvido'})[0];
  rows.forEach(function(o,i){
    if(!o.n)return;var len=o.n/tot*100,gap=len>3?.8:0;
    var c=el('circle',{class:'sg',cx:60,cy:60,r:48,pathLength:100,'data-o':o.k});
    c.style.stroke=o.c;c.style.strokeDasharray=Math.max(.1,len-gap).toFixed(2)+' 100';c.style.strokeDashoffset=(-acc).toFixed(2);c.style.animationDelay=(i*.09)+'s';
    var t=el('title',{});t.textContent=(q('.oc-l b',o.r)||{}).textContent+': '+o.n.toLocaleString('pt-BR')+' ('+(Math.round(o.n/tot*1000)/10).toLocaleString('pt-BR')+'%)';c.appendChild(t);
    acc+=len;s.appendChild(c);
  });
  wrap.appendChild(s);
  var mid=document.createElement('div');mid.className='mid';
  mid.innerHTML='<b>'+(res?Math.round(res.n/tot*100):0)+'%</b><small>resolvidos</small>';wrap.appendChild(mid);
  sum.insertBefore(wrap,sum.firstChild);
  var focus=function(k){wrap.classList.toggle('foc',!!k);box.classList.toggle('foc',!!k);
    qa('.sg',wrap).forEach(function(c){c.classList.toggle('on',c.dataset.o===k)});
    rows.forEach(function(o){o.r.classList.toggle('on',o.k===k)})};
  qa('.sg',wrap).forEach(function(c){c.addEventListener('mouseenter',function(){focus(c.dataset.o)});c.addEventListener('mouseleave',function(){focus(null)})});
  rows.forEach(function(o){o.r.addEventListener('mouseenter',function(){qa('.sg',wrap).forEach(function(c){c.classList.toggle('on',c.dataset.o===o.k)});wrap.classList.add('foc')});
    o.r.addEventListener('mouseleave',function(){wrap.classList.remove('foc');qa('.sg',wrap).forEach(function(c){c.classList.remove('on')})})});
}

/* 3. barra de composição no topo de cada cartão de IA */
function mixes(){
  qa('#agentCards .ag2').forEach(function(c){
    var old=q('.ag2-mix',c);if(old)old.remove();
    var st=qa('.ag-stat strong',c).slice(0,3).map(function(s){return num(s.textContent)||0});
    var off=!!q('.ag2-h small',c)&&/sem atendimentos/i.test(q('.ag2-h small',c).textContent);
    c.classList.toggle('off',off);
    if(off)return;
    var cols=['var(--resolved)','var(--transferred)','var(--bad)'],sum=st[0]+st[1]+st[2],rest=Math.max(0,100-sum);
    var m=document.createElement('div');m.className='ag2-mix';m.setAttribute('aria-hidden','true');
    st.concat([rest]).forEach(function(v,i){if(v<=0)return;var b=document.createElement('i');b.style.flex=v+' 1 0';b.style.setProperty('--c',i<3?cols[i]:'var(--surface3)');b.style.animationDelay=(i*.08)+'s';m.appendChild(b)});
    var h=q('.ag2-h',c);h.parentNode.insertBefore(m,h.nextSibling);
  });
}

function boot(){
  var k=q('#overviewKpis'),o=q('#outcomes'),a=q('#agentCards');
  var go=function(f){return function(){requestAnimationFrame(function(){safe(f)})}};
  if(k)new MutationObserver(go(rings)).observe(k,{childList:true});
  if(o)new MutationObserver(go(donut)).observe(o,{childList:true});
  if(a)new MutationObserver(go(mixes)).observe(a,{childList:true});
  safe(rings);safe(donut);safe(mixes);
}
boot();
})();
