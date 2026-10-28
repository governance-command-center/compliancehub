/* GovernanceHub Order Health Monitoring — isolated feature */
(function(){
'use strict';
const PATH='orderHealth';
const TYPES=['Synagie Fulfilled','Brand Fulfilled','Third-Party 3PL','Marketplace Fulfilled'];
const WINDOWS=[{id:'AM',label:'Morning',hour:9},{id:'PM',label:'Afternoon',hour:14}];
let data={stores:{},checks:{},cases:{}},subtab='daily',bound=false,importRows=[];
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
 '<div class="oh-tabs">'+[['daily','Daily Monitoring'],['reports','Monitoring Reports'],...(admin()?[['stores','Store Setup']]:[])].map(([key,label])=>'<button class="btn '+(subtab===key?'primary':'')+'" onclick="OrderHealth.tab(\''+key+'\')">'+label+'</button>').join('')+'</div>'+
 '<div class="oh-panel">'+(subtab==='daily'?daily():subtab==='reports'?reports():stores())+'</div>';
}
function daily(){
 const today=date(),storeRows=activeStores();
 return '<h3>Daily Seller Center checks — '+esc(today)+'</h3><p class="oh-muted">Each store requires a morning and afternoon review. A late submission is retained and marked late. Open orders are carried forward automatically.</p>'+
 (!storeRows.length?'<p>No assigned stores yet. Admin can configure stores in Store Setup.</p>':
 '<div class="oh-scroll"><table class="oh-table"><thead><tr><th>Region</th><th>Platform</th><th>Brand / Store</th><th>Fulfilment</th><th>9 AM</th><th>2 PM</th></tr></thead><tbody>'+storeRows.map(([id,s])=>'<tr><td>'+esc(s.region)+'</td><td>'+esc(s.platform)+'</td><td>'+esc(s.brand)+'</td><td>'+esc(s.fulfilment)+'</td>'+WINDOWS.map(w=>{const c=data.checks?.[date(s.region)+'_'+w.id+'_'+id];return '<td>'+(c?'<span class="oh-status">'+(c.late?'Late':'Completed')+' · '+esc(c.affectedCount??'Legacy')+' affected'+'</span>':button('Submit '+w.label,"OrderHealth.check('"+id+"','"+w.id+"')"))+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>')+
 '<h3>Pending follow-ups (automatically carried forward)</h3>'+caseTable(allCases().filter(([id,c])=>!['Resolved','Closed – No Further Action'].includes(c.status))) ;
}
function caseTable(rows){
 if(!rows.length)return '<p class="oh-muted">No matching orders.</p>';
 return '<div class="oh-scroll"><table class="oh-table"><thead><tr><th>Order / AWB</th><th>Store</th><th>Issue</th><th>Status</th><th>Follow-up</th><th></th></tr></thead><tbody>'+rows.map(([id,c])=>'<tr><td>'+esc(c.remaining??c.affectedCount??1)+'<small>'+esc(c.orderId||'')+'</small></td><td>'+esc(c.brand)+'<small>'+esc(c.region)+' · '+esc(c.platform)+'</small></td><td>'+esc(c.remarks||c.description||'')+'</td><td>'+esc(c.status)+'</td><td>'+esc(c.followupDate||'Not set')+'</td><td>'+button('Update',"OrderHealth.edit('"+id+"')")+'</td></tr>').join('')+'</tbody></table></div>';
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
function norm(s){return String(s||'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();}
function matchMember(name){
 const list=(D.members||[]).filter(m=>m.username&&m.active!==false&&m.approved!==false);
 const key=norm(name);
 const found=list.filter(m=>norm(m.name)===key||norm(m.username)===key);
 return found.length===1?found[0]:null;
}
function importPreview(){
 if(!importRows.length)return '';
 const matched=importRows.filter(r=>r.member),unmatched=importRows.filter(r=>!r.member);
 return '<div class="oh-panel"><h3>Allocation import preview</h3><p>'+importRows.length+' unique allocations · '+matched.length+' matched · '+unmatched.length+' unmatched</p>'+
 (unmatched.length?'<p class="oh-muted">Unmatched names will NOT be imported. Add or correct the corresponding Members account first.</p><div class="oh-scroll"><table class="oh-table"><thead><tr><th>File CDM</th><th>Brand</th><th>Platform</th><th>Region</th></tr></thead><tbody>'+unmatched.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.brand)+'</td><td>'+esc(r.platform)+'</td><td>'+esc(r.region)+'</td></tr>').join('')+'</tbody></table></div>':'')+
 button('Import '+matched.length+' matched allocations','OrderHealth.commitImport()',true)+'</div>';
}
async function uploadAllocations(file){
 if(!file)return;
 if(typeof XLSX==='undefined')return toast('Excel reader unavailable');
 try{
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
 const seen=new Set();
 importRows=rows.map(r=>{
 const values=Object.fromEntries(Object.entries(r).map(([k,v])=>[String(k).trim().toLowerCase(),String(v).trim()]));
 const name=values.username||values.cdm||values.name||'';
 return {name,brand:values.brand||'',platform:values.platform||'',region:(values.region||'').toUpperCase(),member:matchMember(name)};
 }).filter(r=>{
 if(!r.name||!r.brand||!r.platform||!r.region)return false;
 const key=[r.name,r.brand,r.platform,r.region].map(norm).join('|');
 if(seen.has(key))return false;seen.add(key);return true;
 });
 render();
 }catch(e){toast('Unable to read allocation file: '+e.message)}
}
async function commitImport(){
 if(!admin())return;
 const rows=importRows.filter(r=>r.member);
 if(!rows.length)return toast('No matched allocations to import');
 const existing=Object.entries(data.stores||{});
 const updates={};let added=0,updated=0;
 for(const r of rows){
 const match=existing.find(([id,s])=>norm(s.brand)===norm(r.brand)&&norm(s.platform)===norm(r.platform)&&norm(s.region)===norm(r.region));
 if(match){
   updates[match[0]+'/owner']=r.member.username;updated++;
 }else{
   const id=fbRef(PATH+'/stores').push().key;
   updates[id]={brand:r.brand,platform:r.platform,region:r.region,owner:r.member.username,fulfilment:'Brand Fulfilled',active:true,fulfilmentNeedsReview:true};added++;
 }
 }
 if(!window.confirm('Import '+rows.length+' matched allocations? New stores will use provisional Brand Fulfilled classification until reviewed.'))return;
 try{await fbRef(PATH+'/stores').update(updates);importRows=[];toast('Imported: '+added+' new stores, '+updated+' updated assignments');render()}
 catch(e){toast('Import failed: '+e.message)}
}
function stores(){
 if(!admin())return 'Admin only';
 return '<h3>Store assignments</h3><p class="oh-muted">Set up every Synagie-managed brand/store here. CDM assignments are linked to the Members directory. Select an existing member rather than typing a name.</p>'+
 '<div class="oh-panel"><h3>Bulk allocation mapping</h3><p class="oh-muted">Upload the masterlist Excel file (username, brand, platform, region). Matches use the Members directory; unmatched rows are excluded. New stores require fulfilment-type review.</p><input type="file" accept=".xlsx,.xls,.csv" onchange="OrderHealth.uploadAllocations(this.files[0])">'+importPreview()+'</div>'+ '<div class="oh-grid">'+[['oh-brand','Brand / store'],['oh-region','Region'],['oh-platform','Platform']].map(([id,l])=>'<label>'+l+'<input class="finput" id="'+id+'" placeholder="'+l+'"></label>').join('')+
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
 field('oh-count','New affected orders',0,'number')+select('oh-status','Status',['No Issues','Pending','Escalated','Under Investigation','Resolved'],'No Issues')+field('oh-remarks','Remarks / action taken'),
 'Submit review',"OrderHealth.saveCheck('"+id+"','"+windowId+"')");
}
async function saveCheck(id,w){
 const s=data.stores[id];if(!s)return;
 const raw=input('oh-count'),count=Number(raw),status=input('oh-status'),remarks=input('oh-remarks');
 if(raw===''||!Number.isSafeInteger(count)||count<0)return toast('Enter a valid affected-order count');
 if(count>0&&(status==='No Issues'||!remarks))return toast('Select a status and enter remarks');
 if(count===0&&status!=='No Issues')return toast('Select No Issues when there are zero new affected orders');
 const stamp=new Date().toISOString(),key=date(s.region)+'_'+w+'_'+id;
 const record={storeId:id,window:w,date:date(s.region),by:me()?.username,byName:me()?.name||me()?.username,affectedCount:count,status,remarks,at:stamp,late:localHour(s.region)>= (w==='AM'?9:14)};
 try{
 const result=await fbRef(PATH+'/checks/'+key).transaction(old=>old||record);
 if(!result.committed)return toast('Already submitted');
 if(count>0){
 const cid=fbRef(PATH+'/cases').push().key;
 await save('cases/'+cid,{storeId:id,brand:s.brand,region:s.region,platform:s.platform,owner:s.owner,affectedCount:count,remaining:status==='Resolved'?0:count,status,remarks,createdAt:stamp,updatedAt:stamp,history:[{at:stamp,by:me()?.username,action:'Created',remarks,count}]});
 }
 close();toast('Monitoring recorded');
 }catch(e){toast('Save failed: '+e.message)}
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
 dialog('Update affected orders — '+(c.brand||'Store'),
 '<p>Originally affected: '+(c.affectedCount||1)+'</p>'+
 field('oh-remaining','Still unresolved',c.remaining??1,'number')+
 select('oh-status','Status',['Pending','Escalated','Under Investigation','Resolved'],c.status)+field('oh-resolution','Remarks / action taken'),
 'Save follow-up',"OrderHealth.updateCase('"+id+"')");
}
async function updateCase(id){
 const c=data.cases[id],raw=input('oh-remaining'),remaining=Number(raw),status=input('oh-status'),remarks=input('oh-resolution');
 if(raw===''||!Number.isSafeInteger(remaining)||remaining<0||remaining>Number(c.remaining??1))return toast('Enter a valid unresolved count');
 if(!remarks)return toast('Remarks are required');
 if((remaining===0)!==(status==='Resolved'))return toast('Resolved requires zero remaining orders');
 const stamp=new Date().toISOString();
 try{await save('cases/'+id,{...c,remaining,status,remarks,updatedAt:stamp,resolvedAt:remaining===0?stamp:null,history:[...(c.history||[]),{at:stamp,by:me()?.username,action:status,remarks,count:remaining}]});close();toast('Follow-up saved')}
 catch(e){toast('Save failed: '+e.message)}
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
window.OrderHealth={init,render,tab:t=>{subtab=t;render()},check,saveCheck,newCase,saveCase,edit,updateCase,addStore,toggleStore,uploadAllocations,commitImport,close};
init();
})();
