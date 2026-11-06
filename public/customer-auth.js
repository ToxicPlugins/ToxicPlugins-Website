/* ToxicPlugins Customer Accounts. Browser receives PUBLISHABLE Supabase key only.
   All private library entitlements are protected by Supabase SQL grants + RLS.
   Premium cannot be granted via the browser or this script. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const views = ['customer-loading','customer-not-configured','customer-auth','customer-logged-in','customer-password-recovery'];
  const statusNode = el('customer-status');
  const params = window.TP_CUSTOMER_CONFIG || {};
  const url = String(params.supabaseUrl || '').replace(/\/$/, '');
  const pubKey = String(params.publishableKey || '');
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && /^sb_publishable_[a-zA-Z0-9_\-]+$/.test(pubKey);
  let client = null;
  let mode = 'login';
  let recoveryMode = false;
  let renderGeneration = 0;
  const authForm = el('customer-form');
  const passwordEl = el('customer-password');
  const emailEl = el('customer-email');

  const setStatus = (message = '', isError = false) => {
    if (!message) { statusNode.hidden = true; statusNode.textContent = ''; return; }
    statusNode.hidden = false;
    statusNode.classList.toggle('error', Boolean(isError));
    statusNode.textContent = message;
  };
  const showView = name => views.forEach(id => { el(id).hidden = id !== name; });
  const setSubmitLoading = loading => {
    const button = el('customer-submit');
    button.disabled = Boolean(loading);
    if (loading) button.textContent = 'PLEASE WAIT…';
    else button.textContent = ({login:'SIGN IN ↗',register:'CREATE ACCOUNT ↗',reset:'SEND RESET EMAIL ↗'})[mode];
  };
  const switchMode = next => {
    mode = next;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected',String(b.dataset.mode === mode)));
    el('customer-password-wrap').hidden = mode === 'reset';
    passwordEl.required = mode !== 'reset';
    passwordEl.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    setSubmitLoading(false);
    showView('customer-auth');
  };

  const loadLibrary = async () => {
    const { data, error } = await client.from('customer_library').select('plugin_slug,entitlement_source,created_at');
    if (error) throw new Error('Could not load your library. Please try reloading or contact support.');
    return Array.isArray(data) ? data : [];
  };
  const render = async () => {
    const generation = ++renderGeneration;
    if (!client) { showView('customer-not-configured'); return; }
    showView('customer-loading');
    try {
      const { data, error } = await client.auth.getUser();
      if (generation !== renderGeneration) return;
      if (error || !data?.user) { showView('customer-auth'); return; }
      if (recoveryMode) { showView('customer-password-recovery'); return; }
      const list = await loadLibrary();
      if (generation !== renderGeneration) return;
      const freeOwned = list.some(item => item.plugin_slug === 'toxicdiamondfarm' && item.entitlement_source === 'free');
      const premiumOwned = list.some(item => item.plugin_slug === 'toxicskullfactory' && item.entitlement_source === 'payment');
      el('customer-current-email').textContent = data.user.email || 'Verified customer';
      el('customer-diamond-claim-row').hidden = freeOwned;
      el('customer-diamond-owned-row').hidden = !freeOwned;
      el('customer-diamond-owned-note').hidden = !freeOwned;
      el('customer-skull-note').textContent = premiumOwned
        ? 'A purchase entitlement is recorded. Premium file delivery is not yet enabled.'
        : 'Not purchased. Premium payment and download are disabled.';
      showView('customer-logged-in');
    } catch (err) {
      if (generation !== renderGeneration) return;
      // Fail closed: if database authorization cannot be checked, show no private library.
      showView('customer-auth');
      setStatus(err.message || 'The account service is unavailable. Try again later.', true);
    }
  };

  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    switchMode(b.dataset.mode);
    setStatus();
  }));
  authForm.addEventListener('submit', async evt => {
    evt.preventDefault();
    if (!client) return;
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    setSubmitLoading(true); setStatus();
    try {
      if (mode === 'register') {
        if (password.length < 10) throw Error('Use a password of at least 10 characters.');
        const { error } = await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/account.html'}});
        if (error) throw error;
        setStatus('Account request submitted. Check your inbox and confirm your email address before signing in.');
        switchMode('login');
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/account.html'});
        if (error) throw error;
        setStatus('If this address has an account, a password reset email will be sent.');
      } else {
        const { error } = await client.auth.signInWithPassword({email,password});
        if (error) throw error;
        await render();
      }
    } catch (err) { setStatus(err?.message || 'Something went wrong. Try again.', true); }
    finally { setSubmitLoading(false); }
  });
  el('customer-resend').addEventListener('click', async () => {
    if (!client) return;
    const email = emailEl.value.trim();
    if (!email) { setStatus('Enter your email address first.', true); return; }
    const { error } = await client.auth.resend({type:'signup',email,options:{emailRedirectTo:window.location.origin+'/account.html'}});
    setStatus(error ? 'Could not resend the confirmation email. Try later.' : 'If confirmation is pending, a new email will be sent.',Boolean(error));
  });
  el('customer-signout').addEventListener('click', async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) setStatus('Could not sign out. Please try again.',true);
    else { recoveryMode=false; setStatus('You have signed out.'); await render(); }
  });
  el('customer-claim-diamond').addEventListener('click', async () => {
    if (!client) return;
    const b = el('customer-claim-diamond'); b.disabled = true;
    try {
      // Fixed-name RPC allows ONE free entitlement only. Never accepts a product ID or amount.
      const { error } = await client.rpc('claim_free_diamondfarm');
      if (error) throw error;
      setStatus('ToxicDiamondFarm was added to your library.');
      await render();
    } catch (_) { setStatus('Unable to add the plugin. Please try again.',true); }
    finally { b.disabled = false; }
  });
  el('customer-change-password').addEventListener('click', async () => {
    if (!client) return;
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email) { setStatus('Please sign in first.',true); return; }
    const result = await client.auth.resetPasswordForEmail(data.user.email,{redirectTo:window.location.origin+'/account.html'});
    setStatus(result.error ? 'Could not send the reset email right now.' : 'If allowed, a password reset email is on its way.',Boolean(result.error));
  });
  el('customer-new-password-form').addEventListener('submit', async evt => {
    evt.preventDefault();
    if (!client || !recoveryMode) return;
    const password = el('customer-new-password').value;
    if (password.length < 10) { setStatus('Use at least 10 characters.',true); return; }
    const { error } = await client.auth.updateUser({password});
    if (error) { setStatus('Could not update the password. Please request a new reset link.',true); return; }
    recoveryMode = false;
    el('customer-new-password').value = '';
    setStatus('Password updated successfully.');
    await render();
  });
  const nav = el('site-nav'); const toggle = document.querySelector('.menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(open));
  });

  if (!configured) { showView('customer-not-configured'); return; }
  if (!window.supabase?.createClient) {
    showView('customer-not-configured');
    setStatus('Login service could not load. Check your connection and try again.',true);
    return;
  }
  client = window.supabase.createClient(url,pubKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') recoveryMode = true;
    // Supabase auth methods must not be awaited directly inside its auth callback.
    window.setTimeout(() => { render(); },0);
  });
  render();
})();
