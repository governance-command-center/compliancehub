/* Order Health sidebar integration.
 * Legacy app.js calls its lexical buildNav(), so a window.buildNav wrapper
 * cannot intercept later rebuilds. Observe sidebar mutations instead.
 */
(function(){
 'use strict';
 const originalShow=window.showPage;
 if(typeof originalShow!=='function')return;
 function addNav(){
   const nav=document.getElementById('sidebar-nav');
   if(!nav||nav.querySelector('[data-page="order-health"]'))return;
   const anchor=nav.querySelector('[data-page="live-trackers"]');
   if(!anchor)return; // only show to roles with Operations access
   const item=document.createElement('button');
   item.type='button';
   item.className='sidebar-item';
   item.dataset.page='order-health';
   item.title='Order Health Monitoring';
   item.innerHTML='<span class="sidebar-item-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18v13H3z"/><path d="M3 7l3-4h12l3 4"/><path d="M12 3v17"/></svg></span><span class="sidebar-item-label">Order Health Monitoring</span><span class="sidebar-tooltip">Order Health Monitoring</span>';
   item.addEventListener('click',()=>window.showPage('order-health'));
   anchor.after(item);
   item.classList.toggle('active',window._curPage==='order-health');
 }
 window.showPage=function(page){
   originalShow(page);
   const panel=document.getElementById('pg-order-health');
   if(panel)panel.style.display=page==='order-health'?'':'none';
   if(page==='order-health')window.OrderHealth?.render();
   addNav();
   document.querySelectorAll('#sidebar-nav [data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
 };
 const nav=document.getElementById('sidebar-nav');
 if(nav){
   const observer=new MutationObserver(()=>addNav());
   observer.observe(nav,{childList:true});
   addNav();
 }
})();
