/**
 * ToxicPlugins owner-only content editor.
 * All privileged routes verify a numeric GitHub USER id server-side.
 * GitHub OAuth + PKCE; encrypted HTTP-only cookies; fixed-repo content writes.
 * Never grant admin rights based on browser claims, email, or GitHub org display name.
 */
import crypto from 'node:crypto';

const MAX_SESSION_AGE = 60 * 60;           // 60 minutes
const MAX_OAUTH_AGE = 10 * 60;
const API = 'https://api.github.com';
const REPO = 'ToxicPlugins/ToxicPlugins-Website';
const SETTINGS_PATH = 'public/site-settings.json';
const STATE_COOKIE = '__Host-tp_owner_oauth';
const SESSION_COOKIE = '__Host-tp_owner_session';

const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer', ...extra }
});
const redirect = (url, cookies = []) => {
  const headers=new Headers({Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  cookies.forEach(c=>headers.append('Set-Cookie',c));
  return new Response(null,{status:303,headers});
};
const error = (message, status=400) => json({error:message},status);
function setup() {
  const origin = process.env.TP_CANONICAL_ORIGIN || 'https://toxicplugins.com';
  const id = process.env.TP_GITHUB_CLIENT_ID || '';
  const secret = process.env.TP_GITHUB_CLIENT_SECRET || '';
  const owner = process.env.TP_OWNER_GITHUB_ID || '';
  const key64 = process.env.TP_OWNER_COOKIE_KEY || '';
  if (origin !== 'https://toxicplugins.com') throw new Error('Invalid public origin configuration');
  if (!/^[0-9]+$/.test(owner)) throw new Error('Owner id not configured');
  if (!id || !secret) throw new Error('OAuth not configured');
  const key = Buffer.from(key64,'base64url');
  if (key.length !== 32) throw new Error('Cookie encryption key not configured');
  return {origin,id,secret,owner,key};
}
function seal(value,key) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
  const auth=cipher.getAuthTag();
  return Buffer.concat([iv,auth,encrypted]).toString('base64url');
}
function unseal(token,key) {
  try {
    if (!token || token.length>6500) return null;
    const bytes=Buffer.from(token,'base64url');
    if (bytes.length < 29) return null;
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const value=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());
    return (value.exp > Math.floor(Date.now()/1000)) ? value : null;
  } catch {return null;}
}
function getCookie(request,name) {
  const raw=request.headers.get('cookie')||'';
  const match=raw.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return match?match.slice(name.length+1):null;
}
function cookie(name,value,maxAge,sameSite='Strict') {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;
}
function clearCookie(name) {return cookie(name,'',0,'Lax');}
const unix = () => Math.floor(Date.now()/1000);
function session(request,config) {
  const s=unseal(getCookie(request,SESSION_COOKIE),config.key);
  return (s && String(s.userId)===config.owner && typeof s.token==='string' && s.csrf) ? s:null;
}
function sameOriginMutation(request,origin) {
  return request.headers.get('origin')===origin &&
    (request.headers.get('content-type')||'').toLowerCase().startsWith('application/json');
}
function secureMutation(request,config,s) {
  if (!sameOriginMutation(request,config.origin)) return false;
  const csrf=request.headers.get('x-tp-csrf')||'';
  return csrf.length===s.csrf.length && crypto.timingSafeEqual(Buffer.from(csrf),Buffer.from(s.csrf));
}
async function github(url,token,options={}) {
  const response=await fetch(API+url,{
    ...options,
    headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Authorization':`Bearer ${token}`,'User-Agent':'ToxicPlugins-Owner-Panel',...(options.headers||{})},
  });
  let body=null;
  try {body=await response.json();} catch {}
  return {response,body};
}
async function verifiedSession(request,config) {
  const s=session(request,config);
  if (!s) return null;
  // Revalidate against GitHub rather than trusting an old user id in a browser cookie.
  // A revoked token must immediately lose access to content editing.
  const result=await github('/user',s.token);
  if (!result.response.ok || String(result.body?.id)!==config.owner || result.body?.type!=='User') return null;
  return {...s,login:result.body.login};
}
function validateSettings(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw Error('Invalid settings');
  const trim=(s,max)=>{if(typeof s!=='string'||s.trim().length<2||s.trim().length>max||/[\u0000-\u0008\u000e-\u001f]/.test(s)) throw Error('Invalid text field');return s.trim();};
  const number=(n,max)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max||Math.abs(Math.round(n*100)-n*100)>1e-7)throw Error('Invalid price');return Math.round(n*100)/100;};
  const p=input.products||{};
  const diamond=p.diamond||{},skull=p.skull||{};
  if(diamond.price!==0 || skull.tier!=='premium' || diamond.tier!=='free') throw Error('Invalid plugin tier');
  const out={schema:1,announcement:trim(input.announcement,150),products:{
    diamond:{title:'ToxicDiamondFarm',description:trim(diamond.description,260),visible:diamond.visible===true,tier:'free',price:0},
    skull:{title:'ToxicSkullFactory',description:trim(skull.description,260),visible:skull.visible===true,tier:'premium',price:number(skull.price,100)}
  },extras:[]};
  if(!Array.isArray(input.extras)||input.extras.length>12)throw Error('Invalid extra plugin list');
  const slugs=new Set(['diamond','skull']);
  for (const p of input.extras) {
    if(!p || !/^[a-z0-9-]{3,40}$/.test(p.slug) || slugs.has(p.slug))throw Error('Invalid/duplicate plugin slug');
    slugs.add(p.slug);
    if(!['free','premium'].includes(p.tier))throw Error('Invalid tier');
    const cost=number(p.price,100);
    if((p.tier==='free'&&cost!==0)||(p.tier==='premium'&&cost===0))throw Error('Price does not match tier');
    out.extras.push({slug:p.slug,title:trim(p.title,70),version:trim(p.version,25),description:trim(p.description,260),visible:p.visible===true,tier:p.tier,price:cost});
  }
  return out;
}
async function getSettings(token) {
  const {response,body}=await github(`/repos/${REPO}/contents/${SETTINGS_PATH}`,token);
  if (!response.ok) return {error:response.status===404?'Settings file not found':`GitHub returned ${response.status}`,status:response.status};
  if(body.type!=='file'||typeof body.content!=='string'||body.encoding!=='base64')return {error:'Invalid GitHub file',status:500};
  let settings;
  try{settings=JSON.parse(Buffer.from(body.content.replace(/\s/g,''),'base64').toString('utf8'));}catch{return {error:'Invalid site settings',status:500};}
  return {settings,sha:body.sha};
}
export default async function owner(request) {
  const url=new URL(request.url);
  const route=url.pathname;
  const routes=['/api/owner/login','/api/owner/callback','/api/owner/session','/api/owner/logout','/api/owner/settings','/api/owner/activity'];
  if(!routes.includes(route))return error('Unknown endpoint',404);
  let config;
  try {config=setup();}
  catch {return error('Owner Panel must be configured in Netlify first.',503);}
  // No authenticated owner actions on deploy previews or the Netlify subdomain.
  if(url.origin!==config.origin) return error('Use the official toxicplugins.com domain.',403);
  try {
    if(route==='/api/owner/login') {
      if(request.method!=='GET')return error('Method not allowed',405);
      const state=crypto.randomBytes(24).toString('base64url');
      const verifier=crypto.randomBytes(32).toString('base64url');
      const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
      const authorize=new URL('https://github.com/login/oauth/authorize');
      authorize.searchParams.set('client_id',config.id);
      authorize.searchParams.set('redirect_uri',`${config.origin}/api/owner/callback`);
      authorize.searchParams.set('scope','public_repo');
      authorize.searchParams.set('state',state);
      authorize.searchParams.set('code_challenge',challenge);
      authorize.searchParams.set('code_challenge_method','S256');
      const sealed=seal({state,verifier,exp:unix()+MAX_OAUTH_AGE},config.key);
      return redirect(authorize.toString(),[cookie(STATE_COOKIE,sealed,MAX_OAUTH_AGE,'Lax')]);
    }
    if(route==='/api/owner/callback') {
      if(request.method!=='GET')return error('Method not allowed',405);
      const input=unseal(getCookie(request,STATE_COOKIE),config.key);
      const state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';
      if(!input||!state||!code||input.state.length!==state.length||!crypto.timingSafeEqual(Buffer.from(input.state),Buffer.from(state)))return error('Login expired or invalid. Start again from /admin.html',403);
      const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{
        method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json','User-Agent':'ToxicPlugins-Owner-Panel'},
        body:JSON.stringify({client_id:config.id,client_secret:config.secret,code,redirect_uri:`${config.origin}/api/owner/callback`,code_verifier:input.verifier})
      });
      const info=await tokenResponse.json();
      if(!tokenResponse.ok||typeof info.access_token!=='string')return error('GitHub authorization failed.',403);
      const {response,body}=await github('/user',info.access_token);
      if(!response.ok||body?.type!=='User'||String(body?.id)!==config.owner)return error('This GitHub account is not authorized as the ToxicPlugins owner.',403);
      const repoInfo=await github(`/repos/${REPO}`,info.access_token);
      if(!repoInfo.response.ok || repoInfo.body?.permissions?.push!==true)return error('Your GitHub account does not have write access to the website repository.',403);
      const sessionValue=seal({userId:body.id,token:info.access_token,csrf:crypto.randomBytes(24).toString('base64url'),exp:unix()+MAX_SESSION_AGE},config.key);
      return redirect(`${config.origin}/admin.html`,[clearCookie(STATE_COOKIE),cookie(SESSION_COOKIE,sessionValue,MAX_SESSION_AGE)]);
    }
    if(route==='/api/owner/session') {
      if(request.method!=='GET')return error('Method not allowed',405);
      const s=await verifiedSession(request,config);
      return json({authenticated:!!s,login:s?.login||null,csrf:s?.csrf||null,expiresAt:s?.exp||null});
    }
    const s=await verifiedSession(request,config);
    if(!s)return error('Owner login required.',401);
    if(route==='/api/owner/logout') {
      if(request.method!=='POST')return error('Method not allowed',405);
      if(!secureMutation(request,config,s))return error('Invalid request',403);
      return json({ok:true},200,{'Set-Cookie':clearCookie(SESSION_COOKIE)});
    }
    if(route==='/api/owner/settings') {
      if(request.method==='GET') {
        const data=await getSettings(s.token);
        if(data.error)return error(data.error,data.status===404?404:502);
        return json({settings:data.settings});
      }
      if(request.method==='PUT') {
        if(!secureMutation(request,config,s))return error('Invalid security token.',403);
        let input;
        try{input=await request.json();}catch{return error('Invalid JSON');}
        let normalized;
        try{normalized=validateSettings(input);}catch(e){return error(e.message);}
        const data=await getSettings(s.token);
        if(data.error)return error(data.error,502);
        const encoded=Buffer.from(JSON.stringify(normalized,null,2)+'\n','utf8').toString('base64');
        const {response,body}=await github(`/repos/${REPO}/contents/${SETTINGS_PATH}`,s.token,{
          method:'PUT',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:'content: update ToxicPlugins storefront via owner dashboard',content:encoded,sha:data.sha,branch:'main'})
        });
        if(!response.ok)return error(response.status===409?'Another update was published; reload and try again.':`GitHub refused update (${response.status}).`,response.status===409?409:502);
        return json({saved:true,commit:body.commit?.sha||null,note:'Changes are committed; Netlify deploy may take a moment.'});
      }
      return error('Method not allowed',405);
    }
    if(route==='/api/owner/activity') {
      if(request.method!=='GET')return error('Method not allowed',405);
      const {response,body}=await github(`/repos/${REPO}/commits?path=${encodeURIComponent(SETTINGS_PATH)}&per_page=5`,s.token);
      if(!response.ok)return error('Could not read GitHub history',502);
      return json({commits:body.map(c=>({sha:String(c.sha||'').slice(0,12),message:String(c.commit?.message||'').slice(0,160),date:c.commit?.committer?.date||''}))});
    }
    return error('Unknown endpoint',404);
  } catch(e) {
    // Do not leak OAuth access tokens, cookies, request bodies, or secrets to client logs.
    return error('Temporary server error. Check Netlify function logs.',502);
  }
}

export const config={
  path:['/api/owner/login','/api/owner/callback','/api/owner/session','/api/owner/logout','/api/owner/settings','/api/owner/activity'],
  rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:90}
};

// Exposed only for local unit tests; not served as a public endpoint.
export const _test={validateSettings,seal,unseal};
