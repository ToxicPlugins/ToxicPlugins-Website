(() => {
  const form = document.querySelector('#report-form');
  const preview = document.querySelector('#report-output');
  const btn = document.querySelector('#copy-report');
  const status = document.querySelector('#report-message');
  if (!form || !preview || !btn || !status) return;
  const clean = id => (document.getElementById(id)?.value || 'Not provided').trim() || 'Not provided';
  const query = new URLSearchParams(location.search).get('plugin');
  if (query === 'skull') document.querySelector('#report-plugin').selectedIndex = 1;
  form.addEventListener('submit', e => {
    e.preventDefault();
    preview.textContent = [
      'TOXICPLUGINS / SUPPORT REPORT', '============================',
      'Plugin: ' + clean('report-plugin'), 'Issue type: ' + clean('report-type'),
      'Paper version: ' + clean('report-paper'), 'Java version: ' + clean('report-java'),
      '', 'What happened:', clean('report-description'),
      '', 'Steps to reproduce:', clean('report-steps'),
      '', 'Expected behavior:', clean('report-expected'),
      '', 'Note: Remove private information before sharing logs or reports.'
    ].join('\n');
    btn.disabled = false;
    status.textContent = 'Generated locally. Nothing was submitted or saved online.';
  });
  form.addEventListener('reset', () => {
    preview.textContent = 'Your report will appear here after you select GENERATE REPORT.\n\nNo information is transmitted.';
    btn.disabled = true;
    status.textContent = '';
  });
  btn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(preview.textContent);
      else { const t=document.createElement('textarea'); t.value=preview.textContent; document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error('Copy unavailable'); }
      status.textContent = 'Copied to clipboard.';
    } catch {
      const range=document.createRange();range.selectNodeContents(preview);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
      status.textContent = 'Text selected — press Ctrl+C to copy.';
    }
  });
})();
