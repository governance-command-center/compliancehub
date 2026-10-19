/* Incident toolbar simplification only; retain underlying Excel and archive handlers. */
(function(){
  'use strict';
  var baseRender=renderIncidents;
  window.renderIncidents=function(){
    _incViewMode='table';
    baseRender();
    var root=document.getElementById('pg-incidents');
    if(!root)return;
    var head=root.querySelector('.page-header');
    if(!head)return;
    var toolbar=head.lastElementChild;
    if(!toolbar)return;
    var controls=Array.from(toolbar.children);
    var find=function(snippet){return controls.find(function(el){return (el.getAttribute('onclick')||'').includes(snippet);});};
    var tableToggle=controls.find(function(el){return el.querySelector('button[title="Table view"]');});
    if(tableToggle)tableToggle.remove();
    ['downloadIncidentTemplate','inc-import-f','clearAllIncidents','syncIncidentsToReports','openIncidentForm'].forEach(function(term){
      var el=term==='inc-import-f'?root.querySelector('#inc-import-f'):find(term);
      if(el)el.remove();
    });
    var archive=find('toggleArchivedIncidents');
    if(archive)archive.textContent=_incShowArchived?'Hide Archived':'View Archived';
    var exportButton=find('exportIncidents');
    if(exportButton)exportButton.textContent='Export Excel';
    var group=document.createElement('div');
    group.className='inc-log-menu';
    group.style.cssText='position:relative;display:inline-block';
    var trigger=document.createElement('button');
    trigger.className='btn primary';
    trigger.type='button';
    trigger.textContent='+ Log Incident ▾';
    trigger.setAttribute('aria-expanded','false');
    var menu=document.createElement('div');
    menu.style.cssText='display:none;position:absolute;right:0;top:calc(100% + 5px);min-width:205px;padding:6px;background:var(--surface,#fff);border:1px solid var(--border,#ddd);border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.13);z-index:100';
    function item(label,handler){
      var b=document.createElement('button');b.type='button';b.textContent=label;
      b.style.cssText='display:block;width:100%;text-align:left;padding:10px;border:0;background:transparent;border-radius:6px;cursor:pointer;color:var(--text,#111);font-size:12px';
      b.addEventListener('click',function(){menu.style.display='none';trigger.setAttribute('aria-expanded','false');handler();});menu.appendChild(b);
    }
    var file=document.createElement('input');file.type='file';file.accept='.xlsx,.xls';file.style.display='none';file.addEventListener('change',function(e){importIncidentExcel(e);});
    item('Manual Entry',function(){openIncidentForm();});
    item('Bulk Import (Excel)',function(){file.click();});
    item('Download Excel Template',function(){downloadIncidentTemplate();});
    trigger.addEventListener('click',function(){var open=menu.style.display==='none';menu.style.display=open?'block':'none';trigger.setAttribute('aria-expanded',String(open));});
    group.appendChild(trigger);group.appendChild(menu);group.appendChild(file);toolbar.appendChild(group);
    document.addEventListener('click',function close(e){if(!group.isConnected){document.removeEventListener('click',close);return;}if(!group.contains(e.target)){menu.style.display='none';trigger.setAttribute('aria-expanded','false');}});
  };
})();