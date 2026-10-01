(function () {
  function byId(id){ return document.getElementById(id); }

  function show(view){
    document.querySelectorAll('[data-panel]').forEach(function(panel){
      panel.hidden = panel.dataset.panel !== view;
    });
    document.querySelectorAll('.tabs button').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function bind(){
    document.querySelectorAll('.tabs button').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        show(btn.dataset.view);
      });
    });

    document.querySelectorAll('.mode').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        document.querySelectorAll('.mode').forEach(function(x){x.classList.remove('active');});
        btn.classList.add('active');
        if (typeof window.renderAgents === 'function') window.renderAgents();
      });
    });

    var refresh=byId('refresh');
    if(refresh){
      refresh.addEventListener('click', function(e){
        e.preventDefault();
        if(typeof window.__refreshMonitor === 'function') window.__refreshMonitor();
        else if(typeof window.load === 'function') window.load();
      });
    }

    var preset=byId('preset');
    if(preset){
      preset.addEventListener('change', function(){
        var custom=preset.value==='custom';
        var start=byId('start'),end=byId('end');
        if(start) start.disabled=!custom;
        if(end) end.disabled=!custom;
        if(!custom && typeof window.dates==='function'){
          var d=window.dates(preset.value);
          if(start) start.value=d[0];
          if(end) end.value=d[1];
        }
      });
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();