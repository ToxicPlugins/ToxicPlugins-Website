/* ToxicPlugins public storefront settings — public JSON only, NO private API access. */
(async () => {
  'use strict';
  const eur = n => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(n);
  let settings;
  try {
    const r=await fetch('site-settings.json',{cache:'no-store'});
    if(!r.ok) return;
    settings=await r.json();
    if(settings.schema!==1||!settings.products)return;
  } catch {return;}
  window.ToxicSite=Object.freeze({settings});
  document.querySelectorAll('[data-site-announcement]').forEach(n=>n.textContent=settings.announcement);
  for(const key of ['diamond','skull']) {
    const product=settings.products[key];
    if(!product)continue;
    document.querySelectorAll(`[data-site-card="${key}"]`).forEach(card=>{
      if(card.matches('[data-product-card]'))card.dataset.hiddenByAdmin=product.visible?'0':'1';
      else card.hidden=!product.visible;
    });
    document.querySelectorAll(`[data-site-description="${key}"]`).forEach(el=>el.textContent=product.description);
    document.querySelectorAll(`[data-site-price="${key}"]`).forEach(el=>{
      const value=eur(product.price);
      if(el.dataset.siteStyle==='tier') el.textContent=`01 PREMIUM PLUGIN · ${value}`;
      else if(el.dataset.siteStyle==='premium')el.textContent=`PREMIUM · ${value}`;
      else if(el.dataset.siteStyle==='meta')el.textContent=`${value} · PREMIUM`;
      else el.textContent=value;
    });
  }
  // Keep remaining editorial price references in sync with product data.
  // Only replace text nodes, never HTML markup or input values.
  const editor=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const displayedPrice=eur(settings.products.skull.price);
  let node;
  while((node=editor.nextNode())) {
    if(['SCRIPT','STYLE','TEXTAREA','NOSCRIPT'].includes(node.parentElement?.tagName))continue;
    if(node.textContent.includes('€1.99'))node.textContent=node.textContent.replace(/€1\.99/g,displayedPrice);
  }
  const box=document.querySelector('#product-results');
  if(box&&Array.isArray(settings.extras)) {
    for(const p of settings.extras.filter(x=>x.visible)){
      const card=document.createElement('article');card.className='store-product';card.dataset.productCard='';
      card.dataset.title=(p.title||'').toLowerCase();card.dataset.keywords=(p.description||'').toLowerCase();
      card.dataset.tier=p.tier;
      card.dataset.hiddenByAdmin='0';
      // Only static HTML is inserted; all owner-editable fields use textContent.
      card.innerHTML=`<div class="plugin-visual" style="display:flex;align-items:center;justify-content:center;min-height:225px;background:radial-gradient(circle,#113c25,#07100b)"><span style="font-size:68px;font-weight:800;color:#adff6c;letter-spacing:-.08em">TP.</span></div><div class="store-product-content"><div class="store-line"><span class="status"><span class="status-dot"></span> PLUGIN PREVIEW</span><span class="p-version"></span></div><h3 class="p-title"></h3><p class="p-description"></p><div class="tag-row"><span>PAPER</span><span>JAVA</span><span>TOXICPLUGINS</span></div><div class="store-price-strip"><div><span class="small-mono">RELEASE TIER</span><b class="p-price"></b></div><span class="store-await">RELEASE PENDING</span></div><div class="store-card-actions"><a class="btn btn-primary p-link">PRODUCT DETAILS ↗</a><button type="button" class="save-btn">☆ SAVE</button></div></div>`;
      card.querySelector('.p-version').textContent=`V ${p.version}`;
      card.querySelector('.p-title').textContent=p.title;
      card.querySelector('.p-description').textContent=p.description;
      card.querySelector('.p-price').textContent=`${p.tier==='free'?'FREE':'PREMIUM'} · ${eur(p.price)}`;
      card.querySelector('.p-link').href='plugin.html?id='+encodeURIComponent(p.slug);
      const save=card.querySelector('.save-btn'); save.dataset.save=p.slug;
      save.addEventListener('click',()=>{window.ToxicWishlist?.toggle(p.slug);save.textContent=window.ToxicWishlist?.get().includes(p.slug)?'★ SAVED':'☆ SAVE';window.dispatchEvent(new Event('toxic:catalog-updated'));});
      save.textContent=window.ToxicWishlist?.get().includes(p.slug)?'★ SAVED':'☆ SAVE';
      box.appendChild(card);
    }
  }
  window.dispatchEvent(new Event('toxic:catalog-updated'));
})();
