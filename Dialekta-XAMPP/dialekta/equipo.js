'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const status = byId('status');
  const form = byId('form');
  let session;
  let selected = null;

  async function request(action, body) {
    const options = { credentials: 'same-origin' };
    if (body !== undefined) {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf };
      options.body = JSON.stringify(body);
    }
    const response = await fetch('api.php?action=' + action, options);
    const data = await response.json();
    if (response.status === 401) location.replace('index.html');
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
    if (data.csrf && session) session.csrf = data.csrf;
    return data;
  }

  function button(label, action, css) {
    const element = document.createElement('button');
    element.textContent = label;
    if (css) element.className = css;
    element.addEventListener('click', action);
    return element;
  }

  function edit(person) {
    selected = person;
    form.reset();
    form.elements.name.value = person?.name || '';
    form.elements.email.value = person?.email || '';
    form.elements.password.required = !person;
    byId('password-help').textContent = person
      ? 'Deja este campo vacío para conservar la contraseña actual.'
      : 'Usa al menos 8 caracteres.';
    byId('editor-title').textContent = person ? 'Editar cuenta' : 'Añadir cuenta';
    byId('error').textContent = '';
    byId('editor').showModal();
    form.elements.name.focus();
  }

  function confirmDelete(person) {
    selected = person;
    byId('delete-message').textContent = '¿Eliminar el acceso de ' + person.name + ' (' + person.email + ')?';
    byId('confirmation').showModal();
    byId('keep').focus();
  }

  async function list() {
    const { admins } = await request('team');
    const container = byId('people');
    container.replaceChildren();
    for (const person of admins) {
      const row = document.createElement('article');
      row.className = 'person';
      const name = document.createElement('strong');
      const own = person.id === session.user.id;
      name.textContent = person.name + (own ? ' (tu cuenta)' : '');
      const email = document.createElement('small');
      email.textContent = person.email;
      const identity = document.createElement('div');
      identity.append(name, email);
      const actions = document.createElement('div');
      actions.className = 'team-actions';
      actions.append(button('Editar', () => edit(person)));
      if (!own) actions.append(button('Eliminar', () => confirmDelete(person), 'team-danger'));
      row.append(identity, actions);
      container.append(row);
    }
    byId('team').hidden = false;
  }

  byId('add').addEventListener('click', () => edit(null));
  byId('cancel').addEventListener('click', () => byId('editor').close());
  byId('keep').addEventListener('click', () => byId('confirmation').close());
  byId('delete').addEventListener('click', async () => {
    byId('delete').disabled = true;
    try {
      await request('deleteAdmin', { id: selected.id, version: selected.version });
      status.textContent = 'Cuenta eliminada.';
      await list();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      byId('delete').disabled = false;
      byId('confirmation').close();
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      if (selected) Object.assign(data, { id: selected.id, version: selected.version });
      await request('saveAdmin', data);
      byId('editor').close();
      form.reset();
      status.textContent = 'Cuenta guardada.';
      await list();
    } catch (error) {
      if (byId('editor').open) byId('error').textContent = error.message;
      else status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  async function start() {
    session = await request('session');
    if (!session.user) { location.replace('index.html'); return; }
    await list();
    status.textContent = '';
  }
  start().catch(error => { status.textContent = error.message; });
})();
