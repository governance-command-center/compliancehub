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
   item.innerHTML='<span class="sidebar-item-icon">📦</span><span class="sidebar-item-label">Order Health Monitoring</span><span class="sidebar-tooltip">Order Health Monitoring</span>';
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
