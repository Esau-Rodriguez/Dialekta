'use strict';

(() => {
  const SESSION_KEY = 'dialekta-session';
  const SETTINGS_KEY = 'dialekta-preferences';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let session;
  let preferences = {};
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null');
    if (!session || !/^[^\s@]+@dialekta\.edu\.mx$/i.test(session.email)) {
      window.location.replace('index.html');
      return;
    }
    try { preferences = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch { /* Keep default preferences. */ }
  } catch {
    window.location.replace('index.html');
    return;
  }

  const users = [
    { name: 'Mateo Técpatl', initials: 'MT', email: 'mateo.t@ejemplo.mx', region: 'Zozocolco de Hidalgo', date: 'Hoy, 10:24', status: 'Activo' },
    { name: 'Citlalli Ramos', initials: 'CR', email: 'citlalli.r@ejemplo.mx', region: 'Papantla Centro', date: 'Hoy, 09:15', status: 'Activo' },
    { name: 'Juan Hernández', initials: 'JH', email: 'juan.h@ejemplo.mx', region: 'Espinal, Sierra Norte', date: 'Ayer, 18:40', status: 'Activo' },
    { name: 'Adriana Pérez', initials: 'AP', email: 'adriana.p@ejemplo.mx', region: 'Poza Rica (Interlingua)', date: 'Ayer, 16:11', status: 'Activo' },
    { name: 'Lucía García', initials: 'LG', email: 'lucia.g@ejemplo.mx', region: 'Cuetzalan, Puebla', date: 'Ayer, 14:32', status: 'Pendiente' },
    { name: 'José Santiago', initials: 'JS', email: 'jose.s@ejemplo.mx', region: 'Tajín, Papantla', date: 'Ayer, 12:08', status: 'Activo' },
    { name: 'María Torres', initials: 'MT', email: 'maria.t@ejemplo.mx', region: 'Sierra Norte', date: 'Antier, 11:05', status: 'Pendiente' },
    { name: 'Diego Martínez', initials: 'DM', email: 'diego.m@ejemplo.mx', region: 'Zozocolco de Hidalgo', date: 'Antier, 09:40', status: 'Activo' }
  ];
  const modules = [
    { title: 'Primeras palabras en Tutunakú', description: 'Un primer acercamiento a los saludos, las presentaciones y nuestra lengua.', status: 'Publicado', lessons: 12, icon: 'book', theme: 'coral' },
    { title: 'Mi familia y mi comunidad', description: 'Vínculos, personas y lugares que dan vida a nuestra comunidad.', status: 'Publicado', lessons: 10, icon: 'users', theme: 'mint' },
    { title: 'Los sonidos de nuestra lengua', description: 'Reconocimiento sonoro y actividades de escucha con audio nativo.', status: 'Publicado', lessons: 14, icon: 'audio', theme: 'amber' },
    { title: 'Naturaleza y territorio', description: 'Aprende sobre el entorno, las plantas y los animales de nuestra región.', status: 'Publicado', lessons: 9, icon: 'folder', theme: 'mint' },
    { title: 'Historias de nuestros abuelos', description: 'Una colección de relatos y memoria oral para las nuevas generaciones.', status: 'Borrador', lessons: 6, icon: 'book', theme: 'coral' },
    { title: 'Tradiciones y celebraciones', description: 'Material didáctico sobre el patrimonio cultural de la comunidad.', status: 'Borrador', lessons: 8, icon: 'rocket', theme: 'amber' }
  ];
  const lessons = [
    { title: 'Nos saludamos en comunidad', description: 'Escucha, identifica y practica los saludos cotidianos.', module: 'Primeras palabras en Tutunakú', status: 'Publicado', duration: '8 min', icon: 'audio' },
    { title: 'Las personas de mi familia', description: 'Relaciona imágenes y palabras para reconocer los vínculos familiares.', module: 'Mi familia y mi comunidad', status: 'Publicado', duration: '12 min', icon: 'users' },
    { title: 'Escucha nuestra lengua', description: 'Distingue los sonidos con actividades de reconocimiento auditivo.', module: 'Los sonidos de nuestra lengua', status: 'Publicado', duration: '10 min', icon: 'audio' },
    { title: 'Los animales de nuestro entorno', description: 'Explora el vocabulario de la naturaleza con ejercicios interactivos.', module: 'Naturaleza y territorio', status: 'En revisión', duration: '15 min', icon: 'book' },
    { title: 'Relatos de la comunidad', description: 'Comprensión oral a partir de la memoria y las historias de la región.', module: 'Historias de nuestros abuelos', status: 'En revisión', duration: '14 min', icon: 'book' },
    { title: 'Así celebramos', description: 'Recursos visuales para conocer las celebraciones comunitarias.', module: 'Tradiciones y celebraciones', status: 'En revisión', duration: '9 min', icon: 'rocket' }
  ];
  const vocabulary = [
    { title: 'Saludos y presentaciones', description: 'Vocabulario para iniciar una conversación y presentarse en comunidad.', target: 'Primeras palabras en Tutunakú' },
    { title: 'Familia y comunidad', description: 'Palabras de los vínculos familiares y de la vida comunitaria.', target: 'Mi familia y mi comunidad' },
    { title: 'Animales y naturaleza', description: 'Vocabulario del territorio y del entorno natural.', target: 'Naturaleza y territorio' }
  ];

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function icon(name) { return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`; }
  function normalized(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function userRows(list) {
    return list.map((user, i) => `<tr><td><div class="user-cell"><span class="user-avatar tone-${i % 3}" aria-hidden="true">${user.initials}</span><div><span class="user-name">${user.name}</span><small class="user-email">${user.email}</small></div></div></td><td>${user.region}</td><td>${user.date}</td><td><span class="status ${user.status === 'Pendiente' ? 'pending' : ''}">${user.status}</span></td></tr>`).join('');
  }
  $('#recent-users-body').innerHTML = userRows(users.slice(0, 4));
  function renderUsers() {
    const filter = $('#user-filter').value;
    $('#all-users-body').innerHTML = userRows(users.filter(user => filter === 'all' || user.status === filter));
  }
  $('#user-filter').addEventListener('change', renderUsers);
  renderUsers();

  function resourceCard(item, type, index) {
    const isModule = type === 'module';
    return `<article class="panel resource-card"><div class="metric-icon ${item.theme || 'amber'}">${icon(item.icon)}</div><h2>${item.title}</h2><p>${item.description}</p><span class="pill ${item.status === 'Publicado' ? 'published' : ''}">${item.status}</span><div class="resource-footer"><span>${isModule ? item.lessons + ' lecciones' : item.duration + ' · Audio nativo'}</span><button class="text-button" data-detail="${type}" data-index="${index}">Ver ${isModule ? 'módulo' : 'lección'}</button></div></article>`;
  }
  function renderModules() {
    const filter = $('#module-filter').value;
    $('#modules-grid').innerHTML = modules.map((item, index) => filter === 'all' || filter === item.status ? resourceCard(item, 'module', index) : '').join('');
  }
  renderModules();
  $('#module-filter').addEventListener('change', renderModules);
  $('#lessons-grid').innerHTML = lessons.map((item, index) => resourceCard(item, 'lesson', index)).join('');
  $('#review-list').innerHTML = lessons.map((item, index) => item.status === 'En revisión' ? `<article class="review-row"><span class="metric-icon amber">${icon(item.icon)}</span><div><h3>${item.title}</h3><p>${item.module}</p></div><span class="pill">En revisión</span><button class="text-button" data-detail="lesson" data-index="${index}">Ver material</button></article>` : '').join('');

  const dialog = $('#details-dialog');
  function showDialog(title, body, eyebrow = 'DIALEKTA · COMUNIDAD') {
    $('#dialog-title').textContent = title;
    $('#dialog-eyebrow').textContent = eyebrow;
    $('#dialog-body').innerHTML = body;
    dialog.showModal();
  }
  $('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-detail]');
    if (!button) return;
    const isModule = button.dataset.detail === 'module';
    const item = (isModule ? modules : lessons)[Number(button.dataset.index)];
    if (!item) return;
    const content = isModule ? `<p>${item.description}</p><div class="dialog-stat-grid"><div><strong>${item.lessons}</strong><span>Lecciones</span></div><div><strong>ES</strong><span>Apoyo en español</span></div><div><strong>Audio</strong><span>Lengua nativa</span></div></div><p><strong>Estatus:</strong> ${item.status}.</p><p>Vista de demostración del módulo. Los materiales completos se incorporarán al conectar el catálogo educativo.</p>` : `<p>${item.description}</p><p><strong>Módulo:</strong> ${item.module}<br><strong>Duración estimada:</strong> ${item.duration}<br><strong>Estatus:</strong> ${item.status}</p><ul class="detail-list"><li>Introducción al tema y vocabulario.</li><li>Práctica guiada con reconocimiento sonoro.</li><li>Ejercicios para reforzar el aprendizaje.</li></ul><p>Vista de demostración. Los audios y ejercicios se incorporarán al conectar los recursos de la lección.</p>`;
    showDialog(item.title, content, isModule ? 'CONTENIDO EDUCATIVO · MÓDULO' : 'APRENDIZAJE · LECCIÓN');
  });
  $('#alliances').addEventListener('click', () => showDialog('Alianzas escolares Veracruz–Puebla', '<p>Campaña de Revitalización en Escuelas Bilingües: una iniciativa para acercar la lengua Tutunakú a las nuevas generaciones.</p><div class="dialog-stat-grid"><div><strong>24</strong><span>Nuevas escuelas</span></div><div><strong>2</strong><span>Regiones participantes</span></div><div><strong>Kids</strong><span>Programa piloto</span></div></div><p>Escuelas primarias de <strong>Zozocolco</strong> y <strong>Papantla</strong> participan en actividades de reconocimiento sonoro y aprendizaje mediante el juego.</p><p>Datos de demostración basados en el diseño de referencia.</p>', 'PATRIMONIO VIVO · EDUCACIÓN BILINGÜE'));

  function applyProfile() {
    const name = typeof preferences.displayName === 'string' && preferences.displayName.trim() ? preferences.displayName : session.name;
    $('.profile strong').textContent = name;
    $('#display-name').value = name;
    $('#account-email').value = session.email;
    $('#digest').checked = preferences.digest !== false;
  }
  applyProfile();
  $('#profile-button').addEventListener('click', () => showDialog($('.profile strong').textContent, `<p><strong>Súper Administrador Lingüístico</strong><br>${escapeHTML(session.email)}</p><p>Administración de la plataforma de gestión y preservación de la lengua Totonaca.</p><p class="muted">Sesión local de demostración.</p>`, 'DIALEKTA · MI PERFIL'));
  $('#settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const displayName = $('#display-name').value.trim();
    if (!displayName) { $('#display-name').setCustomValidity('Escribe tu nombre.'); $('#display-name').reportValidity(); return; }
    const next = { displayName, digest: $('#digest').checked };
    const feedback = $('#settings-feedback');
    feedback.hidden = false;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      preferences = next;
      applyProfile();
      feedback.textContent = 'Preferencias guardadas en este navegador.';
      showToast('Tus preferencias se guardaron.');
    } catch { feedback.textContent = 'El navegador no permite guardar preferencias. Habilita el almacenamiento local e inténtalo de nuevo.'; }
  });
  $('#display-name').addEventListener('input', event => event.target.setCustomValidity(''));

  const views = ['dashboard', 'modulos', 'lecciones', 'usuarios', 'contenido', 'configuracion', 'search'];
  let currentView = 'dashboard';
  const names = { dashboard: 'Dashboard', modulos: 'Gestión de Módulos', lecciones: 'Creador de Lecciones', usuarios: 'Gestión de Usuarios', contenido: 'Publicación & Contenido', configuracion: 'Configuración', search: 'Búsqueda' };
  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('.sidebar-backdrop').hidden = true;
    $('#mobile-menu').setAttribute('aria-expanded', 'false');
  }
  function showView(name) {
    currentView = views.includes(name) ? name : 'dashboard';
    views.forEach(view => { $(`#view-${view}`).hidden = view !== currentView; });
    $$('.nav-link').forEach(link => {
      const active = link.dataset.view === currentView;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (currentView !== 'search') $('#search').value = '';
    document.title = `${names[currentView]} · Dialekta`;
    closeSidebar();
    $('#notifications').hidden = true;
    $('#notifications-button').setAttribute('aria-expanded', 'false');
  }
  function onRoute() {
    const route = location.hash.slice(1) || 'dashboard';
    showView(route);
    if (route !== 'search') { window.scrollTo(0, 0); $('#main-content').focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', onRoute);
  showView(location.hash.slice(1) || 'dashboard');
  $('#mobile-menu').addEventListener('click', () => {
    const open = !$('#sidebar').classList.contains('open');
    $('#sidebar').classList.toggle('open', open);
    $('.sidebar-backdrop').hidden = !open;
    $('#mobile-menu').setAttribute('aria-expanded', String(open));
  });
  $('.sidebar-backdrop').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeSidebar(); $('#notifications').hidden = true; $('#notifications-button').setAttribute('aria-expanded', 'false'); } });
  window.matchMedia('(min-width:701px)').addEventListener('change', event => { if (event.matches) closeSidebar(); });

  const notificationButton = $('#notifications-button');
  notificationButton.addEventListener('click', () => {
    const open = $('#notifications').hidden;
    $('#notifications').hidden = !open;
    notificationButton.setAttribute('aria-expanded', String(open));
  });
  $('#read-notifications').addEventListener('click', () => {
    $('#notification-count').hidden = true;
    $('#notifications').classList.add('read');
    notificationButton.setAttribute('aria-label', 'Notificaciones, todas leídas');
    $('#read-notifications').textContent = 'Todas leídas';
    $('#read-notifications').disabled = true;
    showToast('Todas las notificaciones se marcaron como leídas.');
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.notification-wrap')) { $('#notifications').hidden = true; notificationButton.setAttribute('aria-expanded', 'false'); }
  });
  let toastTimeout;
  function showToast(message) {
    clearTimeout(toastTimeout);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4000);
  }

  let previousView = currentView;
  $('#search').addEventListener('input', () => {
    const query = $('#search').value.trim();
    if (!query) {
      const destination = previousView === 'search' ? 'dashboard' : previousView;
      history.replaceState(null, '', `#${destination}`);
      showView(destination);
      return;
    }
    if (currentView !== 'search') previousView = currentView;
    showView('search');
    history.replaceState(null, '', '#search');
    const needle = normalized(query);
    const matches = (item) => normalized(Object.values(item).join(' ')).includes(needle);
    const moduleMatches = modules.map((item, i) => matches(item) ? resourceCard(item, 'module', i) : '').filter(Boolean);
    const lessonMatches = lessons.map((item, i) => matches(item) ? resourceCard(item, 'lesson', i) : '').filter(Boolean);
    const userMatches = users.filter(matches).map(user => `<article class="panel resource-card"><div class="metric-icon mint">${icon('user')}</div><h2>${user.name}</h2><p>${user.region}<br>${user.email}</p><div class="resource-footer"><span>Usuario · ${user.status}</span><a href="#usuarios" class="text-button">Ver usuarios</a></div></article>`);
    const vocabMatches = vocabulary.filter(matches).map(item => `<article class="panel resource-card"><div class="metric-icon amber">${icon('book')}</div><h2>${item.title}</h2><p>${item.description}</p><div class="resource-footer"><span>Vocabulario</span><a href="#modulos" class="text-button">Ver módulos</a></div></article>`);
    const results = [...moduleMatches, ...lessonMatches, ...userMatches, ...vocabMatches];
    $('#search-description').textContent = `${results.length} resultado${results.length === 1 ? '' : 's'} para «${query}» en el catálogo de demostración.`;
    $('#search-results').innerHTML = results.length ? results.join('') : '<div class="panel empty-state"><strong>No encontramos coincidencias.</strong><br>Prueba con “familia”, “Papantla”, “sonidos” o el nombre de un usuario.</div>';
  });

  $('#logout').addEventListener('click', () => {
    let failed = false;
    for (const name of ['sessionStorage', 'localStorage']) {
      try { window[name].removeItem(SESSION_KEY); }
      catch { failed = true; }
    }
    if (failed) { showToast('El navegador bloqueó el almacenamiento. Habilítalo para poder cerrar la sesión local.'); return; }
    window.location.replace('index.html');
  });

  // Recheck local demo session when a browser restores a cached page after logout.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    try { if (!sessionStorage.getItem(SESSION_KEY) && !localStorage.getItem(SESSION_KEY)) window.location.replace('index.html'); }
    catch { window.location.replace('index.html'); }
  });
})();
