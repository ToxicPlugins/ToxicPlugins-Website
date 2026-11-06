/* Only UI, never a security boundary. Every protected action is authorized on the server. */
(() => {
  'use strict';
  const $ = (sel,from=document) => from.querySelector(sel);
  const loading=$('#owner-loading'),guest=$('#owner-guest'),dashboard=$('#owner-dashboard'),form=$('#owner-editor');
  const message=$('#owner-message');
  let csrf=null,settings=null,busy=false;
  const note=(text,isError=false)=>{message.textContent=text;message.classList.toggle('error',isError);message.hidden=false;};
  const eur=n=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(n);
  async function call(path,opts={}) {
    const r=await fetch('/api/owner/'+path,{credentials:'same-origin',cache:'no-store',...opts});
    let body={};try{body=await r.json();}catch{}
    if(!r.ok)throw Error(body.error||`Request failed (${r.status})`);
    return body;
  }
  function extra(p={}){
    const wrap=document.createElement('div');wrap.className='owner-extra';
    wrap.innerHTML=`<h3>ADDITIONAL PLUGIN</h3><div class="owner-extra-fields">
      <label class="owner-field">Slug (unique, lowercase)<input data-field="slug" maxlength="40" pattern="[a-z0-9-]{3,40}" required placeholder="toxic-fishing"></label>
      <label class="owner-field">Name<input data-field="title" maxlength="70" required placeholder="ToxicFishing"></label>
      <label class="owner-field">Version<input data-field="version" maxlength="25" required placeholder="1.0.0"></label>
      <label class="owner-field">Category<select data-field="tier"><option value="free">Free</option><option value="premium">Premium</option></select></label>
      <label class="owner-field">Display price (€)<input data-field="price" type="number" min="0" max="100" step="0.01" required></label>
      <label class="owner-check"><input data-field="visible" type="checkbox"> Visible in Store</label>
      <label class="owner-field wide">Description<textarea data-field="description" maxlength="260" rows="3" required></textarea></label>
    </div><button type="button" class="owner-ghost-btn owner-remove">REMOVE PLUGIN</button>`;
    for(const key of ['slug','title','version','tier','price','description']){
      const field=$(`[data-field="${key}"]`,wrap);field.value=p[key]??(key==='price'?'0':'');
    }
    $('[data-field="visible"]',wrap).checked=p.visible===true;
    const category=$('[data-field="tier"]',wrap),price=$('[data-field="price"]',wrap);
    category.addEventListener('change',()=>{if(category.value==='free')price.value='0';else if(Number(price.value)===0)price.value='1.99';});
    $('.owner-remove',wrap).addEventListener('click',()=>wrap.remove());
    $('#owner-extras').appendChild(wrap);
  }
  function render(data){
    settings=data;
    form.elements.announcement.value=data.announcement;
    form.elements.diamondDescription.value=data.products.diamond.description;
    form.elements.diamondVisible.checked=data.products.diamond.visible;
    form.elements.skullDescription.value=data.products.skull.description;
    form.elements.skullVisible.checked=data.products.skull.visible;
    form.elements.skullPrice.value=data.products.skull.price.toFixed(2);
    $('#owner-extras').replaceChildren();
    for(const p of(data.extras||[]))extra(p);
  }
  function collect() {
    const p=structuredClone(settings);
    p.announcement=form.elements.announcement.value.trim();
    p.products.diamond.description=form.elements.diamondDescription.value.trim();
    p.products.diamond.visible=form.elements.diamondVisible.checked;
    p.products.skull.description=form.elements.skullDescription.value.trim();
    p.products.skull.visible=form.elements.skullVisible.checked;
    p.products.skull.price=Number(form.elements.skullPrice.value);
    p.extras=[...document.querySelectorAll('.owner-extra')].map(box=>{
      const f=name=>$(`[data-field="${name}"]`,box);
      return {slug:f('slug').value.trim(),title:f('title').value.trim(),version:f('version').value.trim(),description:f('description').value.trim(),tier:f('tier').value,price:Number(f('price').value),visible:f('visible').checked};
    });
    return p;
  }
  async function history(){try{const data=await call('activity');const list=$('#owner-history');list.replaceChildren();if(!data.commits.length){list.textContent='No changes published yet.';return;}for(const c of data.commits){const p=document.createElement('p');p.textContent=`${c.message} (${c.sha})`;const time=document.createElement('time');time.textContent=c.date?new Date(c.date).toLocaleString():'';p.appendChild(time);list.appendChild(p);}}catch{$('#owner-history').textContent='History unavailable.';}}
  async function reload(){try{const data=await call('settings');render(data.settings);message.hidden=true;await history();}catch(e){note(e.message,true);}}
  async function init(){
    try{
      const s=await call('session');loading.hidden=true;
      if(!s.authenticated){guest.hidden=false;return;}
      csrf=s.csrf;$('#owner-user').textContent='@'+s.login;dashboard.hidden=false;
      await reload();
    }catch(e){loading.hidden=true;guest.hidden=false;note(e.message,true);}
  }
  $('#add-plugin').addEventListener('click',()=>{if(document.querySelectorAll('.owner-extra').length>=12){note('Max 12 preview plugins',true);return;}extra();});
  $('#owner-reload').addEventListener('click',()=>{if(!busy)reload();});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    busy=true;$('#owner-save').disabled=true;message.hidden=true;
    try{
      const data=await call('settings',{method:'PUT',headers:{'Content-Type':'application/json','X-TP-CSRF':csrf},body:JSON.stringify(collect())});
      note('Saved to GitHub. Netlify will publish the updated catalog shortly. Commit: '+(data.commit||'accepted'));
      await reload(); // re-read the normalized source
      await history();
      note('Saved to GitHub successfully. Check Netlify Deploys for the new Published deployment.');
    }catch(err){note(err.message,true);}
    finally{busy=false;$('#owner-save').disabled=false;}
  });
  $('#owner-logout').addEventListener('click',async()=>{
    try{await call('logout',{method:'POST',headers:{'Content-Type':'application/json','X-TP-CSRF':csrf},body:'{}'});location.assign('/admin.html');}catch(err){note(err.message,true);}
  });
  init();
})();
