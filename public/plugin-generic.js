(async()=>{
 const qs=new URLSearchParams(location.search),slug=qs.get('id')||'';
 try{
  const response=await fetch('site-settings.json',{cache:'no-store'}),config=await response.json();
  const product=(config.extras||[]).find(p=>p.slug===slug&&p.visible===true);
  if(!product)throw Error('Not found');
  document.title=product.title+' — ToxicPlugins';
  document.querySelector('#plugin-name').textContent=product.title.toUpperCase();
  document.querySelector('#plugin-blurb').textContent=product.description;
  document.querySelector('#plugin-version').textContent=product.version;
  document.querySelector('#plugin-tier').textContent=product.tier.toUpperCase();
  document.querySelector('#plugin-price').textContent=new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(product.price);
 }catch{document.querySelector('#plugin-name').textContent='PLUGIN NOT FOUND';document.querySelector('#plugin-blurb').textContent='This plugin is not currently listed in our store.';}
})();
