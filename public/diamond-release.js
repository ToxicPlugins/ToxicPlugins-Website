/* ToxicPlugins public free release integration.
   Reads official public GitHub Release metadata. Does not distribute private files. */
(() => {
  'use strict';
  const repository = 'ToxicPlugins/ToxicDiamondFarm';
  const tag = 'v2.0.0';
  const expectedFilename = 'ToxicDiamondFarm-2.0.0.jar';
  const releasesURL = `https://github.com/${repository}/releases`;
  const apiURL = `https://api.github.com/repos/${repository}/releases/tags/${tag}`;

  function officialJar(release) {
    if (!release || release.tag_name !== tag || release.draft === true || release.prerelease === true) return null;
    const match = (release.assets || []).find(asset =>
      asset.name === expectedFilename && asset.state === 'uploaded' &&
      Number.isFinite(asset.size) && asset.size > 1024 &&
      typeof asset.browser_download_url === 'string' &&
      asset.browser_download_url.startsWith(`https://github.com/${repository}/releases/download/${tag}/`)
    );
    return match || null;
  }

  const status = (ready) => document.querySelectorAll('[data-diamond-status]').forEach(el => {
    const value = ready ? el.dataset.ready : el.dataset.pending;
    if (value) el.textContent = value;
  });
  function updateDownload(asset) {
    const ready = Boolean(asset);
    status(ready);
    document.querySelectorAll('[data-diamond-download]').forEach(a => {
      a.href = ready ? asset.browser_download_url : releasesURL;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = ready ? 'DOWNLOAD THE FREE V2.0.0 JAR ↗' : 'CHECK OFFICIAL GITHUB RELEASE ↗';
      a.setAttribute('aria-label', ready ? 'Download ToxicDiamondFarm v2.0.0 from official GitHub Releases' : 'Check the official ToxicDiamondFarm GitHub Releases for public availability');
    });
    document.querySelectorAll('[data-diamond-checksum]').forEach(el => {
      if (ready && /^sha256:[a-f0-9]{64}$/i.test(asset.digest || '')) {
        el.textContent = `SHA-256: ${asset.digest.slice(7)}`;
        el.hidden = false;
      } else { el.hidden = true; }
    });
  }
  async function init() {
    try {
      const result = await fetch(apiURL, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (!result.ok) throw Error(`GitHub API unavailable: ${result.status}`);
      const metadata = await result.json();
      updateDownload(officialJar(metadata));
    } catch (_) {
      // A missing release, blocked API or rate-limit must never enable a guessed JAR URL.
      updateDownload(null);
    }
  }
  window.ToxicDiamondRelease = Object.freeze({ officialJar });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
