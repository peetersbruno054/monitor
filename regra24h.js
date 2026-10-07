/* regra24h.js — carregar logo DEPOIS de app.js e ANTES dos demais scripts */
(function(){
'use strict';
var H24=864e5,q=function(s,r){return(r||document).querySelector(s)};
function key(c){return String(c||'').replace(/\D/g,'').slice(-11)}

/* Pós-processa o resultado de analyze72. Nenhum protocolo é removido nem perde seus eventos. */
/* novo desfecho: entra na base de "com desfecho" e nas listas */
if(DESFECHOS.indexOf('voltou')<0)DESFECHOS.push('voltou');
OUTCOME_ONE.voltou='Voltou em até 24h';OUTCOME_LIST.voltou='Voltou em até 24h';

var _a=window.analyze72;
window.analyze72=function(raw){
  var res=_a(raw),ps=res.protocols,now=Date.now(),
      end=new Date($('end').value+'T23:59:59').getTime()||now,
      limit=Math.min(now,end),/* só dá como resolvido se a janela de 24h cabe no período consultado */
      by={};
  ps.forEach(function(x){x.ownOutcome=x.outcome;var c=key(x.contact);if(c)(by[c]=by[c]||[]).push(x)});

  ps.forEach(function(x){
    if(x.outcome!=='possivel')return;
    var c=key(x.contact);if(!c){x.noContact=true;return}/* sem telefone não dá para saber se voltou */
    var T=0;x.events.forEach(function(e){if(e.out==='possivel'&&e.ms>T)T=e.ms});
    if(!T)T=dt(x.lastDate);if(!T)return;

    var back=(by[c]||[]).filter(function(o){var m=dt(o.firstDate);return o!==x&&m>T&&m<=T+H24})
      .sort(function(a,b){return dt(a.firstDate)-dt(b.firstDate)})[0];

    if(back){/* voltou em até 24h: marca o bot point do protocolo ATUAL (o que voltou); o anterior fica como está */
      x.outcome='voltou';x.returned=true;x.returnedBy=back.protocol;x.returnedH=(dt(back.firstDate)-T)/36e5;
      x.finalPoint='Possível solução → cliente voltou em até 24h (protocolo '+back.protocol+')';
      if(!back.returnOf){
        back.returnOf=x.protocol;back.returnH=(dt(back.firstDate)-T)/36e5;
        back.events.unshift({point:'Retorno em até 24h após possível solução (protocolo '+x.protocol+')',out:'outro',date:back.firstDate,ms:dt(back.firstDate),index:-1,mark:true});
      }
      return;
    }
    if(T+H24<=limit){/* 24h sem retorno: sai de "Aguardando" e conta como resolvido */
      x.outcome='resolvido';x.autoResolved=true;
      x.finalPoint='Possível solução sem retorno em 24h → resolvido';
    }else x.window24=true;/* janela ainda aberta */
  });
  return res;
};

/* Etiquetas nos cartões da aba Protocolos */
var _u=window.renderUnList;
window.renderUnList=function(){
  var r=_u.apply(this,arguments);
  try{
    var m={};data.r72.protocols.forEach(function(x){m[x.protocol]=x});
    Array.prototype.forEach.call(document.querySelectorAll('#unresolvedList .protocol-card'),function(c){
      var id=q('.row-top b',c).textContent.replace(/^Protocolo\s*/,'').trim(),x=m[id],t=[];
      if(!x)return;
      if(x.returnOf)t.push('↩ Retorno do protocolo '+x.returnOf+' ('+x.returnH.toFixed(1).replace('.',',')+'h)');
      if(x.autoResolved)t.push('✓ Resolvido: sem retorno em 24h');
      if(x.window24)t.push('⏳ Janela de 24h aberta');
      if(x.returned)t.push('↩ Cliente voltou em '+x.returnedH.toFixed(1).replace('.',',')+'h (protocolo '+x.returnedBy+')');
      if(x.noContact)t.push('Sem telefone: retorno não verificável');
      if(t.length)q('.row-top',c).insertAdjacentHTML('beforeend',t.map(function(s){return'<span class="pill">'+esc(s)+'</span>'}).join(''));
    });
  }catch(e){console.error('regra24h',e)}
  return r;
};
})();
