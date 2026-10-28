/* GovernanceHub Order Health Monitoring — isolated feature */
(function(){
'use strict';
const PATH='orderHealth';
const TYPES=['Synagie Fulfilled','Brand Fulfilled','Third-Party 3PL','Marketplace Fulfilled'];
const WINDOWS=[{id:'AM',label:'Morning',hour:9},{id:'PM',label:'Afternoon',hour:14}];
let data={stores:{},checks:{},cases:{}},subtab='daily',bound=false;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>window.CU||CU;
const admin=()=>!!me()?.isAdmin;
const leader=()=>admin()||['HOD','Manager','Assist. Manager','Team Lead'].includes(me()?.role);
const zones={PH:'Asia/Manila',SG:'Asia/Singapore',MY:'Asia/Kuala_Lumpur',ID:'Asia/Jakarta',TH:'Asia/Bangkok',VN:'Asia/Ho_Chi_Minh',TW:'Asia/Taipei',HK:'Asia/Hong_Kong'};
const zone=r=>zones[String(r||'PH').toUpperCase()]||'Asia/Manila';
const pieces=(r,opts)=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone(r),...opts}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
const date=r=>{const p=pieces(r,{year:'numeric',month:'2-digit',day:'2-digit'});return p.year+'-'+p.month+'-'+p.day;};
const activeStores=()=>Object.entries(data.stores||{}).filter(([id,s])=>s.active!==false&& (admin()||leader()||s.owner===me()?.username));
const allCases=()=>Object.entries(data.cases||{}).filter(([id,c])=>admin()||leader()||c.owner===me()?.username);
const button=(txt,fn,primary=false)=>'<button class="btn '+(primary?'primary':'')+'" onclick="'+fn+'">'+esc(txt)+'</button>';
const opts=(values,selected)=>values.map(v=>'<option value="'+esc(v)+'" '+(v===selected?'selected':'')+'>'+esc(v)+'</option>').join('');
function save(p,v){return fbRef(PATH+'/'+p).set(v)}
function input(id){return ($(id)?.value||'').trim()}
function localHour(region){return Number(pieces(region,{hour:'2-digit',hourCycle:'h23'}).hour)}
function summary(){
 const today=date(), stores=activeStores(),total=stores.length;
 const done=WINDOWS.map(w=>stores.filter(([id,s])=>data.checks?.[date(s.region)+'_'+w.id+'_'+id]).length);
 const open=allCases().filter(([id,c])=>!['Resolved','Closed – No Further Action'].includes(c.status));
 return {today,total,done,open};
}
function render(){
 const root=$('pg-order-health');if(!root)return;
 const x=summary();
 root.innerHTML='<div class="page-header"><div><h1>Order Health Monitoring</h1><p>Seller Center reviews · Morning 9:00 AM / Afternoon 2:00 PM · store-region local time</p></div></div>'+
 '<div class="oh-kpis"><div class="oh-panel"><small>Morning completed</small><strong>'+x.done[0]+' / '+x.total+'</strong></div><div class="oh-panel"><small>Afternoon completed</small><strong>'+x.done[1]+' / '+x.total+'</strong></div><div class="oh-panel"><small>Orders needing attention</small><strong>'+x.open.length+'</strong></div><div class="oh-panel"><small>Overdue follow-ups</small><strong>'+x.open.filter(([id,c])=>c.followupDate&&c.followupDate<x.today).length+'</strong></div></div>'+
 '<div class="oh-tabs">'+[['daily','Daily Monitoring'],['orders','Orders Requiring Attention'],['reports','Monitoring Reports'],...(admin()?[['stores','Store Setup']]:[])].map(([key,label])=>'<button class="btn '+(subtab===key?'primary':'')+'" onclick="OrderHealth.tab(\''+key+'\')">'+label+'</button>').join('')+'</div>'+
 '<div class="oh-panel">'+(subtab==='daily'?daily():subtab==='orders'?orders():subtab==='reports'?reports():stores())+'</div>';
}
function daily(){
 const today=date(),storeRows=activeStores();
 return '<h3>Daily Seller Center checks — '+esc(today)+'</h3><p class="oh-muted">Each store requires a morning and afternoon review. A late submission is retained and marked late. Open orders are carried forward automatically.</p>'+
 (!storeRows.length?'<p>No assigned stores yet. Admin can configure stores in Store Setup.</p>':
 '<div class="oh-scroll"><table class="oh-table"><thead><tr><th>Region</th><th>Platform</th><th>Brand / Store</th><th>Fulfilment</th><th>9 AM</th><th>2 PM</th></tr></thead><tbody>'+storeRows.map(([id,s])=>'<tr><td>'+esc(s.region)+'</td><td>'+esc(s.platform)+'</td><td>'+esc(s.brand)+'</td><td>'+esc(s.fulfilment)+'</td>'+WINDOWS.map(w=>{const c=data.checks?.[date(s.region)+'_'+w.id+'_'+id];return '<td>'+(c?'<span class="oh-status">'+(c.late?'Late':'Completed')+' · '+esc(c.byName||c.by)+'</span>':button('Submit '+w.label,"OrderHealth.check('"+id+"','"+w.id+"')"))+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>')+
 '<h3>Pending follow-ups (automatically carried forward)</h3>'+caseTable(allCases().filter(([id,c])=>!['Resolved','Closed – No Further Action'].includes(c.status))) ;
}
function caseTable(rows){
 if(!rows.length)return '<p class="oh-muted">No matching orders.</p>';
 return '<div class="oh-scroll"><table class="oh-table"><thead><tr><th>Order / AWB</th><th>Store</th><th>Issue</th><th>Status</th><th>Follow-up</th><th></th></tr></thead><tbody>'+rows.map(([id,c])=>'<tr><td>'+esc(c.orderId)+'<small>'+esc(c.awb||'')+'</small></td><td>'+esc(c.brand)+'<small>'+esc(c.region)+' · '+esc(c.platform)+'</small></td><td>'+esc(c.category)+'</td><td>'+esc(c.status)+'</td><td>'+esc(c.followupDate||'Not set')+'</td><td>'+button('Update',"OrderHealth.edit('"+id+"')")+'</td></tr>').join('')+'</tbody></table></div>';
}
function orders(){return '<div class="oh-actions"><h3>Orders Requiring Attention</h3>'+button('Log order','OrderHealth.newCase()',true)+'</div>'+caseTable(allCases());}
function reports(){
 const stores=activeStores(),today=date(),cases=allCases();
 const result=WINDOWS.map(w=>({w,done:stores.filter(([id,s])=>data.checks?.[date(s.region)+'_'+w.id+'_'+id]).length}));
 return '<h3>Monitoring compliance — '+esc(today)+'</h3>'+result.map(x=>'<p>'+x.w.label+': '+x.done+' / '+stores.length+' completed ('+(stores.length?Math.round(100*x.done/stores.length):0)+'%)</p>').join('')+
 '<h3>Order follow-up</h3><p>Open / escalated / under investigation: '+cases.filter(([id,c])=>!['Resolved','Closed – No Further Action'].includes(c.status)).length+'</p><p>Resolved: '+cases.filter(([id,c])=>c.status==='Resolved').length+'</p><p class="oh-muted">Completion and follow-up performance are separate: warehouse delays do not automatically count as missed CDM checks.</p>';
}
function memberOptions(){
 const members=(D.members||[]).filter(m=>m.username&&m.active!==false&&m.approved!==false&&m.role!=='Talent on Demand');
 return '<option value="">Select a member</option>'+members.sort((a,b)=>String(a.name||a.username).localeCompare(String(b.name||b.username))).map(m=>'<option value="'+esc(m.username)+'">'+esc((m.name||m.username)+' · '+(m.role||'Member'))+'</option>').join('');
}
function memberName(username){const m=(D.members||[]).find(m=>m.username===username);return m?(m.name||m.username):username;}
function stores(){
 if(!admin())return 'Admin only';
 return '<h3>Store assignments</h3><p class="oh-muted">Set up every Synagie-managed brand/store here. CDM assignments are linked to the Members directory. Select an existing member rather than typing a name.</p>'+
 '<div class="oh-grid">'+[['oh-brand','Brand / store'],['oh-region','Region'],['oh-platform','Platform']].map(([id,l])=>'<label>'+l+'<input class="finput" id="'+id+'" placeholder="'+l+'"></label>').join('')+
 '<label>CDM user<select class="finput" id="oh-owner">'+memberOptions()+'</select></label>'+ '<label>Fulfilment type<select class="finput" id="oh-fulfilment">'+opts(TYPES,TYPES[0])+'</select></label></div>'+button('Add store','OrderHealth.addStore()',true)+
 '<div class="oh-scroll"><table class="oh-table"><thead><tr><th>Brand</th><th>Region</th><th>Platform</th><th>Fulfilment</th><th>CDM</th><th></th></tr></thead><tbody>'+Object.entries(data.stores||{}).map(([id,s])=>'<tr><td>'+esc(s.brand)+'</td><td>'+esc(s.region)+'</td><td>'+esc(s.platform)+'</td><td>'+esc(s.fulfilment)+'</td><td>'+esc(memberName(s.owner))+'</td><td>'+button(s.active===false?'Activate':'Deactivate',"OrderHealth.toggleStore('"+id+"')")+'</td></tr>').join('')+'</tbody></table></div>';
}
function dialog(title,fields,saveLabel,action){
 const body='<form id="oh-form" onsubmit="event.preventDefault();'+action+'">'+fields+'<div class="oh-actions">'+button('Cancel','OrderHealth.close()')+'<button type="submit" class="btn primary">'+saveLabel+'</button></div></form>';
 let existing=$('oh-modal');if(existing)existing.remove();
 const el=document.createElement('div');el.id='oh-modal';el.className='modal-bg';el.style.display='flex';el.innerHTML='<div class="modal wide"><button class="modal-close" onclick="OrderHealth.close()">×</button><h3>'+esc(title)+'</h3>'+body+'</div>';document.body.appendChild(el);
}
function field(id,label,value='',type='text'){return '<label class="oh-field">'+esc(label)+'<input class="finput" id="'+id+'" type="'+type+'" value="'+esc(value)+'"></label>'}
function select(id,label,values,value){return '<label class="oh-field">'+esc(label)+'<select class="finput" id="'+id+'">'+opts(values,value)+'</select></label>'}
function check(id,windowId){
 const s=data.stores[id];if(!s)return;
 const today=date();if(data.checks?.[date(s.region)+'_'+windowId+'_'+id])return toast('Check already submitted');
 dialog('Submit '+(windowId==='AM'?'morning':'afternoon')+' check — '+s.brand,
 '<p>Review the Seller Center before submitting. Outstanding issues are shown in Pending Follow-ups.</p>'+
 select('oh-concerns','Orders requiring attention?',['No','Yes'],'No')+
 field('oh-evidence','Evidence reference / link')+field('oh-remarks','Monitoring remarks'),
 'Submit review',"OrderHealth.saveCheck('"+id+"','"+windowId+"')");
}
async function saveCheck(id,w){
 const concerns=input('oh-concerns'),evidence=input('oh-evidence'),remarks=input('oh-remarks');
 if(!evidence)return toast('Please provide a screenshot or evidence reference');
 const region=data.stores[id].region;const key=date(region)+'_'+w+'_'+id,record={storeId:id,window:w,date:date(region),by:me()?.username,byName:me()?.name||me()?.username,concerns,evidence,remarks,at:new Date().toISOString(),late:localHour(region)>= (w==='AM'?9:14)};
 try{await fbRef(PATH+'/checks/'+key).transaction(old=>old||record);close();toast('Monitoring recorded');if(concerns==='Yes')newCase(id)}catch(e){toast('Save failed: '+e.message)}
}
function newCase(storeId=''){
 let arr=activeStores();if(!arr.length)return toast('Configure stores first');
 let selectStores=arr.map(([id,s])=>'<option value="'+esc(id)+'" '+(id===storeId?'selected':'')+'>'+esc(s.brand+' · '+s.platform+' · '+s.region)+'</option>').join('');
 dialog('Log order requiring attention',
 '<label class="oh-field">Store<select class="finput" id="oh-case-store">'+selectStores+'</select></label>'+
 field('oh-order','Order ID')+field('oh-awb','AWB(s)')+
 select('oh-category','Issue category',['Delayed shipment','Status discrepancy','Multiple AWB discrepancy','RTS / Return','Cancellation','Stuck order','Other'],'Delayed shipment')+
 field('oh-description','Issue details')+field('oh-escalated','Escalated to (team / contact)')+field('oh-evidence-case','Evidence reference / link')+field('oh-followup','Follow-up date',date(),'date'),
 'Log order','OrderHealth.saveCase()');
}
async function saveCase(){
 const id=input('oh-case-store'),s=data.stores[id],orderId=input('oh-order'),awb=input('oh-awb'),category=input('oh-category');
 if(!s||!orderId||!input('oh-description'))return toast('Store, order ID and issue details are required');
 const duplicate=Object.values(data.cases||{}).find(c=>c.storeId===id&&c.orderId.toLowerCase()===orderId.toLowerCase()&&(c.awb||'')===awb&&c.category===category&&!['Resolved','Closed – No Further Action'].includes(c.status));
 if(duplicate)return toast('This order / AWB issue is already open. Update the existing case.');
 const key=fbRef(PATH+'/cases').push().key,stamp=new Date().toISOString();
 const item={storeId:id,brand:s.brand,region:s.region,platform:s.platform,fulfilment:s.fulfilment,owner:s.owner,orderId,awb,category,description:input('oh-description'),escalatedTo:input('oh-escalated'),evidence:input('oh-evidence-case'),followupDate:input('oh-followup')||date(),status:input('oh-escalated')?'Escalated':'Open',createdAt:stamp,updatedAt:stamp,createdBy:me()?.username,history:[{at:stamp,by:me()?.username,action:'Created',remarks:input('oh-description')}]};
 try{await save('cases/'+key,item);close();toast('Order recorded')}catch(e){toast('Save failed: '+e.message)}
}
function edit(id){
 const c=data.cases[id];if(!c)return;
 dialog('Update order — '+c.orderId,
 '<p>'+esc(c.brand)+' · '+esc(c.platform)+' · '+esc(c.fulfilment)+'</p>'+
 select('oh-status','Current status',['Open','Escalated','Under Investigation','Resolved','Closed – No Further Action'],c.status)+
 field('oh-escalated','Escalated to',c.escalatedTo||'')+field('oh-followup','Next follow-up',c.followupDate||date(),'date')+
 field('oh-resolution','Resolution / progress remarks')+field('oh-resolution-evidence','Resolution evidence / reference'),
 'Save update',"OrderHealth.updateCase('"+id+"')");
 const history=(c.history||[]).map(h=>'<li>'+esc(h.at)+' · '+esc(h.by)+' — '+esc(h.action)+': '+esc(h.remarks||'')+'</li>').join('');
 $('oh-form').insertAdjacentHTML('beforeend','<h4>Activity history</h4><ul>'+history+'</ul>');
}
async function updateCase(id){
 const c=data.cases[id],status=input('oh-status'),remarks=input('oh-resolution'),evidence=input('oh-resolution-evidence');
 if(!remarks)return toast('Progress / resolution remarks are required');
 if(['Resolved','Closed – No Further Action'].includes(status)&&!evidence)return toast('Resolution evidence / confirmation is required');
 const stamp=new Date().toISOString();
 const next={...c,status,escalatedTo:input('oh-escalated'),followupDate:['Resolved','Closed – No Further Action'].includes(status)?'':input('oh-followup'),updatedAt:stamp,resolvedAt:['Resolved','Closed – No Further Action'].includes(status)?stamp:null,resolutionEvidence:['Resolved','Closed – No Further Action'].includes(status)?evidence:(c.resolutionEvidence||''),history:[...(c.history||[]),{at:stamp,by:me()?.username,action:status,remarks,evidence}]};
 try{await save('cases/'+id,next);close();toast('Order updated')}catch(e){toast('Update failed: '+e.message)}
}
async function addStore(){
 if(!admin())return;
 const brand=input('oh-brand'),region=input('oh-region'),platform=input('oh-platform'),owner=input('oh-owner');
 if(!brand||!region||!platform||!owner)return toast('Complete all store fields');
 if(!(D.members||[]).some(m=>m.username===owner&&m.active!==false&&m.approved!==false))return toast('Select a valid member from the Members directory');
 const id=fbRef(PATH+'/stores').push().key;
 try{await save('stores/'+id,{brand,region,platform,owner,fulfilment:input('oh-fulfilment'),active:true});toast('Store added')}catch(e){toast('Save failed: '+e.message)}
}
async function toggleStore(id){if(!admin())return;try{await save('stores/'+id+'/active',data.stores[id].active===false);toast('Store updated')}catch(e){toast(e.message)}}
function close(){$('oh-modal')?.remove()}
function init(){
 if(bound)return;bound=true;
 fbRef(PATH).on('value',snapshot=>{data=snapshot.val()||{stores:{},checks:{},cases:{}};if(window._curPage==='order-health'||_curPage==='order-health')render()});
}
window.OrderHealth={init,render,tab:t=>{subtab=t;render()},check,saveCheck,newCase,saveCase,edit,updateCase,addStore,toggleStore,close};
init();
})();
