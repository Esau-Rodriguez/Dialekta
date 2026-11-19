window.DialektaMedia = (() => {
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  function field(path, label, value, kind) {
    const image = kind === 'image';
    const valid = typeof value === 'string' && /^(?:media\.php\?id=[a-f0-9]{64}$|assets\/[\w./-]+$|https?:\/\/)/i.test(value);
    const url = valid ? escape(value) : '';
    const preview = url ? (image ? `<img src="${url}" alt="Vista previa de la imagen">` : `<audio src="${url}" controls preload="none"></audio>`) : '';
    return `<div class="media-tool" data-media-path="${escape(path)}" data-kind="${image?'image':'audio'}">
        <label>${escape(label)}<input type="file" accept="${image?'image/png,image/jpeg,image/webp':'audio/*,.webm'}"></label>
        <small>${image?'JPG, PNG o WebP':'MP3, WAV, OGG, WebM o M4A'} · hasta 2 MiB</small>${preview}
        ${value ? '<button type="button" data-media-clear>Quitar archivo</button>' : ''}</div>`;
  }
  function bind(root, change, notify) {
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-media-clear]');
      if (button) change(button.closest('[data-media-path]').dataset.mediaPath, '');
    });
    root.addEventListener('change', async event => {
      const input = event.target;
      const box = input.closest('.media-tool');
      if (!box || input.type !== 'file' || !input.files[0]) return;
      const file = input.files[0];
      if (file.size > 2097152) {input.value = ''; notify('El archivo puede pesar hasta 2 MiB.'); return;}
      input.disabled = true;
      const status = document.createElement('small');
      status.textContent = 'Subiendo archivo…';
      box.append(status);
      try {
        const session = await (await fetch('api.php?action=session', {cache:'no-store'})).json();
        const form = new FormData();
        form.append('file', file);
        form.append('kind', box.dataset.kind);
        const response = await fetch('media.php', {method:'POST', headers:{'X-CSRF-Token':session.csrf}, body:form});
        const body = await response.json();
        if (!response.ok || !body.url) throw new Error(body.error || 'No se pudo subir el archivo.');
        if (box.isConnected) {change(box.dataset.mediaPath, body.url); notify('Archivo adjunto. Guarda el módulo para conservar el cambio.');}
        else notify('La pantalla cambió durante la carga. Vuelve a seleccionar el archivo en el módulo.');
      } catch (error) {notify(error.message);}
      finally {input.disabled=false; input.value=''; status.remove();}
    });
  }
  return {field,bind};
})();
