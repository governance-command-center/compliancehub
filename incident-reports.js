/* Incident Summary v11-inspired reporting integration.
   Read-only Firebase-derived analytics; existing weekly reports remain intact.
   No API keys, localStorage snapshots, or duplicate incident storage. */
(function(){
  'use strict';
  var reportView='weekly';
  var filters={from:'',to:'',region:'',platform:'',lead:'',search:''};
  var original=renderReports;
  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function safeDate(x){return /^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):'';}
  function dateOf(i){return safeDate(i.incidentDate||i.date||'');}
  function statusOf(i){return typeof incWf==='function'?incWf(i):(i.status==='Resolved'?'Closed':'For Acknowledgement');}
  function compOf(i){return typeof incComp==='function'?incComp(i):'N/A';}
  function leadOf(i){return (typeof incTlName==='function'&&incTlName(i))||i.cdmTL||'Unassigned';}
  function visible(i){
    if(i._leadTaskEsc||i._archived)return false;
    return typeof incCanSee!=='function'||incCanSee(i);
  }
  function all(){return ((D&&D.incidents)||[]).filter(visible);}
  function distinct(items,key){return Array.from(new Set(items.map(key).filter(Boolean))).sort(function(a,b){return a.localeCompare(b);});}
  function select(key,values,label){
    return '<label class="ir-filter">'+label+'<select data-ir-filter="'+key+'"><option value="">All '+label.toLowerCase()+'</option>'
      +values.map(function(v){return '<option value="'+esc(v)+'"'+(filters[key]===v?' selected':'')+'>'+esc(v)+'</option>';}).join('')+'</select></label>';
  }
  function selected(){
    return all().filter(function(i){
      var d=dateOf(i),needle=filters.search.toLowerCase();
      if(filters.from&&(!d||d<filters.from))return false;
      if(filters.to&&(!d||d>filters.to))return false;
      if(filters.region&&i.region!==filters.region)return false;
      if(filters.platform&&i.platform!==filters.platform)return false;
      if(filters.lead&&leadOf(i)!==filters.lead)return false;
      if(needle&&!([i.incidentNo,i.cdm,i.brand,i.issue,i.classification,i.remarks].join(' ').toLowerCase().includes(needle)))return false;
      return true;
    });
  }
  function tally(data,key){var counts={};data.forEach(function(i){var k=String(key(i)||'Unspecified').trim()||'Unspecified';counts[k]=(counts[k]||0)+1;});return Object.entries(counts).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0]);});}
  function bars(rows,max){var items=rows.slice(0,max||8),top=Math.max(1,...items.map(function(r){return r[1];}));return items.length?items.map(function(r){return '<div class="ir-bar"><span title="'+esc(r[0])+'">'+esc(r[0])+'</span><div class="ir-track"><div style="width:'+(r[1]/top*100).toFixed(1)+'%"></div></div><strong>'+r[1]+'</strong></div>';}).join(''):'<p class="ir-muted">No matching incidents.</p>';}
  function panel(title,body){return '<section class="ir-panel"><h4>'+title+'</h4>'+body+'</section>';}
  function stat(label,value,detail){return '<div class="ir-stat"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></div>';}
  function insights(data,regions,classes,leads,overdue){
    if(!data.length)return '<p class="ir-muted">No records match the selected filters.</p>';
    var findings=[];
    if(overdue)findings.push(overdue+' incident'+(overdue===1?' is':'s are')+' overdue; prioritize case follow-up.');
    if(classes[0]&&classes[0][1]>1)findings.push('Most frequent classification: '+classes[0][0]+' ('+classes[0][1]+' cases).');
    if(regions[0])findings.push('Highest recorded regional volume: '+regions[0][0]+' ('+regions[0][1]+' cases).');
    if(leads[0])findings.push('Highest Team Lead case volume: '+leads[0][0]+' ('+leads[0][1]+' cases). This measures case distribution, not individual performance.');
    return '<ul class="ir-insights">'+findings.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul><p class="ir-muted">Rule-based observations only. No external AI service or API key is used.</p>';
  }
  function renderAnalytics(){
    var universe=all(),data=selected(),total=data.length;
    var closed=data.filter(function(i){return statusOf(i)==='Closed';}).length;
    var overdue=data.filter(function(i){return compOf(i)==='Overdue';}).length;
    var late=data.filter(function(i){return compOf(i)==='Late';}).length;
    var classes=tally(data,function(i){return i.classification||i.category;});
    var regions=tally(data,function(i){return i.region;});
    var leads=tally(data,leadOf);
    var months=tally(data,function(i){return dateOf(i).slice(0,7)||'Undated';}).sort(function(a,b){return a[0].localeCompare(b[0]);});
    var recurring=tally(data,function(i){return (i.cdm||'Unassigned')+' / '+(i.classification||i.category||'Unspecified');}).filter(function(r){return r[1]>1;});
    var legacy=data.filter(function(i){return !i.wf;}).length;
    var unassigned=data.filter(function(i){return leadOf(i)==='Unassigned';}).length;
    var undated=data.filter(function(i){return !dateOf(i);}).length;
    var invalidDeadline=data.filter(function(i){return i.wf&&i.wf!=='Closed'&&!i.cancelled&&!i.deadlineAt;}).length;
    var today=new Date(),thisMonth=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
    var previousDate=new Date(today.getFullYear(),today.getMonth()-1,1);
    var lastMonth=previousDate.getFullYear()+'-'+String(previousDate.getMonth()+1).padStart(2,'0');
    var currentCount=data.filter(function(i){return dateOf(i).slice(0,7)===thisMonth;}).length;
    var previousCount=data.filter(function(i){return dateOf(i).slice(0,7)===lastMonth;}).length;
    var comparison='<div class="ir-compare"><div><small>'+esc(lastMonth)+'</small><strong>'+previousCount+'</strong></div><span>→</span><div><small>'+esc(thisMonth)+'</small><strong>'+currentCount+'</strong></div><p>'+esc(previousCount===0?(currentCount?'New incidents this month; no incidents last month for a percentage comparison.':'No incidents in either month.'):(currentCount>=previousCount?'+':'')+Math.round((currentCount-previousCount)/previousCount*100)+'% versus previous month.')+'</p></div>';
    var quality='<div class="ir-quality"><strong>Data validation</strong><p>'+legacy+' legacy record(s) without workflow tracking · '+unassigned+' without a resolved Team Lead · '+undated+' without a valid incident date · '+invalidDeadline+' active workflow case(s) without a deadline.</p><small>Missing assignments are flagged, not automatically inferred. Review the source incident records before using these figures for accountability decisions.</small></div>';
    var cols=['Incident date','Incident ID','Region','Platform','Brand','CDM','Team Lead','Classification','Issue','Workflow','Compliance'];
    var rows=data.slice().sort(function(a,b){return dateOf(b).localeCompare(dateOf(a));}).slice(0,100).map(function(i){
      return [dateOf(i),i.incidentNo||i.id||'',i.region||'',i.platform||'',i.brand||'',i.cdm||'',leadOf(i),i.classification||i.category||'',i.issue||'',statusOf(i),compOf(i)];
    });
    var html='<div class="ir-root">'
      +'<div class="ir-intro"><div><h3>Incident Summary & Intelligence</h3><p>Adapted from Incident Summary v11 · Live incident records · Read-only</p></div><div class="ir-actions"><button class="btn sm" onclick="incidentReportReset()">Reset filters</button><button class="btn sm" onclick="incidentReportCSV()">Export filtered CSV</button><button class="btn sm primary" onclick="window.print()">Print report</button></div></div>'
      +'<div class="ir-filters"><label class="ir-filter">From<input type="date" data-ir-filter="from" value="'+esc(filters.from)+'"></label><label class="ir-filter">To<input type="date" data-ir-filter="to" value="'+esc(filters.to)+'"></label>'
      +select('region',distinct(universe,function(i){return i.region;}),'Region')
      +select('platform',distinct(universe,function(i){return i.platform;}),'Platform')
      +select('lead',distinct(universe,leadOf),'Team Lead')
      +'<label class="ir-filter">Search<input type="search" data-ir-filter="search" value="'+esc(filters.search)+'" placeholder="CDM, brand, issue..."></label></div>'
      +'<div class="ir-stats">'+stat('Total incidents',total,'Filtered incident records')+stat('Active cases',total-closed,'Not workflow-closed')+stat('Overdue',overdue,'Past workflow deadline')+stat('Closure rate',total?Math.round(closed/total*100)+'%':'—',closed+' closed')+stat('Closed late',late,'Recorded late completion')+'</div>'
      +'<div class="ir-grid">'+panel('Classification breakdown',bars(classes))+panel('Incidents by region',bars(regions))+panel('Team Lead distribution',bars(leads))+panel('Monthly trend (shared scale)',bars(months,18))+'</div>'
      +'<div class="ir-grid">'+panel('Month-over-month comparison',comparison)+panel('Data quality checks',quality)+'</div>'+'<div class="ir-grid">'+panel('Recurring CDM / classification combinations',recurring.length?bars(recurring,10):'<p class="ir-muted">No repeated combinations in this selection.</p>')+panel('Management insights',insights(data,regions,classes,leads,overdue))+'</div>'
      +panel('Incident register — latest 100 of '+total,'<div class="ir-table-scroll"><table class="ir-table"><thead><tr>'+cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>')
      +'<p class="ir-muted">Legacy incidents without workflow fields are excluded from overdue/late metrics. All totals follow the user’s incident visibility permissions. This page does not alter incident records.</p></div>';
    return html;
  }
  function refresh(){if(_curPage==='incident-analytics'&&window.renderIncidentAnalytics)window.renderIncidentAnalytics();}
  window.incidentReportReset=function(){filters={from:'',to:'',region:'',platform:'',lead:'',search:''};refresh();};
  window.incidentReportCSV=function(){
    var cols=['Incident Date','Incident ID','Region','Platform','Brand','CDM','Team Lead','Classification','Issue','Workflow','Compliance'];
    var lines=[cols].concat(selected().map(function(i){return [dateOf(i),i.incidentNo||i.id||'',i.region||'',i.platform||'',i.brand||'',i.cdm||'',leadOf(i),i.classification||i.category||'',i.issue||'',statusOf(i),compOf(i)];}));
    var csv='\uFEFF'+lines.map(function(row){return row.map(function(v){var s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
    var link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));link.download='GovernanceHub_Incident_Report.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(link.href);},500);
  };
  window.renderIncidentAnalytics=function(){
    var el=document.getElementById('pg-incident-analytics');if(!el)return;
    el.innerHTML=renderAnalytics();
    el.querySelectorAll('[data-ir-filter]').forEach(function(control){
      control.addEventListener('change',function(){filters[control.dataset.irFilter]=control.value;window.renderIncidentAnalytics();});
      if(control.dataset.irFilter==='search'){
        control.addEventListener('keydown',function(e){if(e.key==='Enter'){filters.search=control.value;window.renderIncidentAnalytics();}});
        control.addEventListener('blur',function(){if(filters.search!==control.value){filters.search=control.value;window.renderIncidentAnalytics();}});
      }
    });
  };
})();