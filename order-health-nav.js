/* Order Health navigation adapter: preserve legacy navigation code */
(function(){
  const originalShow=window.showPage, originalNav=window.buildNav;
  if(typeof originalShow!=='function'||typeof originalNav!=='function')return;
  window.showPage=function(page){
    if(page==='order-health'&&window.CU?.role==='Talent on Demand')return window.toast?.('Access not available');
    originalShow(page);
    const panel=document.getElementById('pg-order-health');
    if(panel)panel.style.display=page==='order-health'?'':'none';
    if(page==='order-health')window.OrderHealth?.render();
  };
  window.buildNav=function(){
    originalNav();
    const nav=document.getElementById('sidebar-nav');
    if(!nav||nav.querySelector('[data-page="order-health"]'))return;
    // Same layout as other operations navigation items.
    const item=document.createElement('button');
    item.type='button';
    item.className='sidebar-item'+(window._curPage==='order-health'?' active':'');
    item.dataset.page='order-health';
    item.title='Order Health Monitoring';
    item.innerHTML='<span class="sidebar-item-icon">📦</span><span class="sidebar-item-label">Order Health Monitoring</span><span class="sidebar-tooltip">Order Health Monitoring</span>';
    item.addEventListener('click',()=>window.showPage('order-health'));
    const anchor=nav.querySelector('[data-page="live-trackers"]');
    if(anchor)anchor.after(item);else nav.appendChild(item);
  };
  // If navigation already exists, retrofit it without waiting for login.
  window.buildNav();
})();
