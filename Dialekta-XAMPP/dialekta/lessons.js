/* Edición de las lecciones pertenecientes a un módulo. */
window.DialektaLessons = (() => {
  let read = () => [];
  let commit = () => {};
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  }
  function field() {
    const lessons = read() || [];
    return `<section class="lessons-tool"><h3>Lecciones del módulo (${lessons.length})</h3>
      <ol>${lessons.map((item, index) => `<li><span>${escape(item.title)}</span>
        <button type="button" data-lesson="edit" data-index="${index}">Editar</button>
        <button type="button" data-lesson="delete" data-index="${index}" aria-label="Eliminar lección ${index+1}">Eliminar</button></li>`).join('')}</ol>
      <button type="button" data-lesson="add">+ Agregar lección</button></section>`;
  }
  function bind(root, get, update) {
    read = get;
    commit = update;
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-lesson]');
      if (!button) return;
      const list = [...(read() || [])];
      const action = button.dataset.lesson;
      const index = Number(button.dataset.index);
      if (action === 'delete') {
        if (window.confirm('¿Quitar esta lección del módulo?')) {
          list.splice(index, 1);
          commit(list);
        }
        return;
      }
      const editing = action === 'edit';
      const item = editing ? list[index] : {};
      if (!item) return;
      const dialog = document.createElement('dialog');
      dialog.className = 'lesson-dialog';
      dialog.innerHTML = `<form method="dialog"><h2>${editing ? 'Editar' : 'Agregar'} lección</h2>
        <label>Título<input name="title" maxlength="160" required></label>
        <label>Contenido o consigna<textarea name="content" rows="5" maxlength="5000" required></textarea></label>
        <label>Duración estimada (minutos)<input type="number" name="minutes" min="1" max="240" required></label>
        <footer><button type="button" class="cancel">Cancelar</button> <button type="submit">Aplicar</button></footer></form>`;
      document.body.append(dialog);
      const form = dialog.querySelector('form');
      form.elements.title.value = item.title || '';
      form.elements.content.value = item.content || '';
      form.elements.minutes.value = item.minutes || 5;
      dialog.querySelector('.cancel').onclick = () => dialog.close();
      dialog.addEventListener('close', () => dialog.remove(), {once:true});
      form.onsubmit = event => {
        event.preventDefault();
        const title = form.elements.title.value.trim(), content = form.elements.content.value.trim();
        if (!title || !content) return;
        const next = {...item, title, content, minutes:Number(form.elements.minutes.value)};
        if (editing) list[index] = next; else list.push(next);
        dialog.close();
        commit(list);
      };
      dialog.showModal();
    });
  }
  return {field, bind};
})();
