/* Incident-only admin corrections. Workflow records and identifiers are immutable. */
(function(){
'use strict';
var originalRender=renderIncCase;
function escapeText(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function value(id){var e=document.getElementById(id);return e?e.value.trim():'';}
function memberSelect(id,selected,leadOnly){
  var members=(D.members||[]).filter(function(m){return m.approved&&m.active!==false&&(leadOnly?LEAD_ROLES.includes(m.role):m.role!=='Talent on Demand');});
  return '<select class="finput nb" id="'+id+'"><option value="">— Select member —</option>'+members.map(function(m){return '<option value="'+escapeText(m.username)+'"'+(m.username===selected?' selected':'')+'>'+escapeText(m.name)+' ('+escapeText(m.role||'')+')</option>';}).join('')+'</select>';
}
function editInput(id,label,v,type){return '<div><label class="flabel">'+label+'</label><input class="finput" id="icf-edit-'+id+'" type="'+(type||'text')+'" value="'+escapeText(v)+'"></div>';}
function localDue(ts){if(!ts)return '';var d=new Date(ts);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function editPanel(i){
  var cdm=incCdmM(i),lead=incTlM(i);
  return '<section class="inc-panel" id="icf-edit-panel" style="display:none;border-color:var(--blue-mid);margin-top:12px">'
    +'<div class="inc-ph">EDIT INCIDENT DETAILS <span class="inc-lock">Governance only · Changes recorded</span></div>'
    +'<div class="inc-note warn">Edit this individual incident only. Incident ID, workflow status, acknowledgement, coaching, and closure history are preserved. If you change a CDM, verify their acknowledgement belongs to the correct person.</div>'
    +'<div class="fg fg2">'+editInput('date','Incident Date',i.incidentDate||i.date,'date')+editInput('due','Due Date',localDue(i.deadlineAt),'datetime-local')+editInput('region','Region',i.region)+editInput('brand','Brand',i.brand)+editInput('platform','Platform',i.platform)+editInput('classification','Classification',i.classification)+editInput('orders','Orders Affected',i.ordersAffected)+editInput('amount','Estimated Amount',i.estimatedAmount)+'</div>'
    +'<div class="fg fg2"><div><label class="flabel">Assigned CDM</label>'+memberSelect('icf-edit-cdm',cdm&&cdm.username||'',false)+'</div>'
    +'<div><label class="flabel">Assigned Team Lead</label>'+memberSelect('icf-edit-tl',lead&&lead.username||'',true)+'</div></div>'
    +'<div class="fg fg2"><div><label class="flabel">Issue / Finding</label><textarea class="finput" id="icf-edit-issue" rows="3">'+escapeText(i.issue||'')+'</textarea></div>'
    +'<div><label class="flabel">Remarks / Context</label><textarea class="finput" id="icf-edit-remarks" rows="3">'+escapeText(i.remarks||'')+'</textarea></div></div>'
    +'<div class="inc-fld"><label class="flabel">Reason for correction (required)</label><textarea class="finput" id="icf-edit-reason" rows="2" placeholder="Explain why this record needs correction"></textarea></div>'
    +'<div class="inc-actions"><button type="button" class="btn primary" onclick="incSaveAdminEdit()">SAVE CHANGES</button>'
    +'<button type="button" class="btn" onclick="incToggleAdminEdit(false)">Cancel</button></div></section>';
}
window.incToggleAdminEdit=function(show){if(!CU||!CU.isAdmin)return;var el=document.getElementById('icf-edit-panel');if(el){el.style.display=show?'block':'none';if(show)el.scrollIntoView({block:'nearest'});}};
window.incSaveAdminEdit=function(){return incRun(async function(){
  if(!CU||!CU.isAdmin){toast('Governance access required');return;}
  var i=incGet(_incCaseKey);if(!i){toast('Incident not found');return;}
  var reason=value('icf-edit-reason'),cu=value('icf-edit-cdm'),tu=value('icf-edit-tl');
  if(!reason){toast('Please enter the reason for correction');return;}
  
  var cm=(D.members||[]).find(function(m){return m.username===cu&&m.approved&&m.active!==false;});
  var tm=(D.members||[]).find(function(m){return m.username===tu&&m.approved&&m.active!==false&&LEAD_ROLES.includes(m.role);});
  if((cu&&!cm)||(tu&&!tm)){toast('Selected members are not valid or active');return;}
  if(i.ack&&cu&&incCdmUser(i)!==cu){toast('CDM cannot be reassigned after acknowledgement. Contact Governance for a reviewed correction.');return;}
  var date=value('icf-edit-date'),due=value('icf-edit-due'),issue=value('icf-edit-issue');
  if(!date||!issue||!value('icf-edit-brand')){toast('Date, brand and issue are required');return;}
  var fields={incidentDate:date,region:value('icf-edit-region'),brand:value('icf-edit-brand'),platform:value('icf-edit-platform'),classification:value('icf-edit-classification'),ordersAffected:value('icf-edit-orders'),estimatedAmount:value('icf-edit-amount'),issue:issue,title:issue,description:issue,remarks:value('icf-edit-remarks')};
  if(due&&due!==localDue(i.deadlineAt))fields.deadlineAt=new Date(due).getTime();
  if(cm){fields.cdm=cm.name;fields.cdmUser=cm.username;if(!i.ack&&incCdmUser(i)!==cm.username)fields.tagged=[cm.username];}
  if(tm){fields.cdmTL=tm.name;fields.cdmTLUser=tm.username;}
  var changes=[];
  Object.keys(fields).forEach(function(k){var before=i[k]==null?'':String(i[k]),after=fields[k]==null?'':String(fields[k]);if(before!==after)changes.push({field:k,before:before,after:after});});
  if(!changes.length){toast('No changes detected');return;}
  if(!window.confirm('Save '+changes.length+' correction(s) to '+(i.incidentNo||'this incident')+'? The activity timeline will retain the previous values.'))return;
  var summary=changes.map(function(x){return x.field+': '+x.before+' → '+x.after;}).join(' | ');
  await incCommit(i._key,fields,{type:'ADMIN_EDIT',text:'Governance corrected incident details. Reason: '+reason+'. Changes: '+summary,changes:changes,reason:reason});
  toast('Incident changes saved');renderIncidents();renderIncCase();
});};
window.renderIncCase=function(){
  originalRender();
  if(!CU||!CU.isAdmin)return;
  var i=incGet(_incCaseKey),body=document.getElementById('mic-body');
  if(!i||!body)return;
  var head=body.querySelector('.inc-top .inc-id');
  if(head&&!body.querySelector('#icf-admin-edit-btn')){
    var btn=document.createElement('button');btn.type='button';btn.id='icf-admin-edit-btn';btn.className='btn sm';btn.style.marginLeft='10px';btn.textContent='✎ Edit Incident';btn.onclick=function(){window.incToggleAdminEdit(true);};
    head.insertAdjacentElement('afterend',btn);
  }
  if(!body.querySelector('#icf-edit-panel'))body.insertAdjacentHTML('beforeend',editPanel(i));
};
})();