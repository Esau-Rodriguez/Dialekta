'use strict';

(() => {
  const SESSION_KEY = 'dialekta-session';
  const SETTINGS_KEY = 'dialekta-preferences';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let session;
  let preferences = {};
  for (const storageName of ['sessionStorage', 'localStorage']) {
    try {
      const candidate = JSON.parse(window[storageName].getItem(SESSION_KEY) || 'null');
      if (candidate && /^[^\s@]+@dialekta\.edu\.mx$/i.test(candidate.email || '') && candidate.createdAt) {
        session = candidate;
        break;
      }
    } catch { /* Try the other store when one is unavailable or invalid. */ }
  }
  if (!session) {
    window.location.replace('index.html');
    return;
  }
  try { preferences = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch { /* Keep default preferences. */ }

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
  const MODULES_KEY = 'dialekta-custom-modules-v1';
  const moduleSeeds = [
    { title: 'Saludos y Cortesía Tutunakú', level: 'A1', description: 'Fundamentos de interacción cotidiana: fórmulas de saludo, presentación y cortesía en la comunidad.', vocabulary: '6 Unidades fonéticas', status: 'Publicado', lessons: 8, created: '2025-01-12', updated: '14 Feb 2025', thumb: 1 },
    { title: 'El Maíz y la Siembra Sagrada', level: 'A1', description: 'Vocabulario de la milpa tutunakú (kúxi), ciclos lunares y saberes de la siembra.', vocabulary: 'Léxico agroecológico', status: 'Publicado', lessons: 12, created: '2025-01-20', updated: '08 Feb 2025', thumb: 2 },
    { title: 'La Casa y la Familia', level: 'A2', description: 'Construcción de vínculos de parentesco, espacios del hogar y estructuras posesivas.', vocabulary: 'Estructuras posesivas', status: 'En revisión', lessons: 10, created: '2025-02-03', updated: 'Ayer, 18:30', thumb: 3 },
    { title: 'Danza de los Voladores y Tradiciones', level: 'B1', description: 'Cosmovisión, cantos sagrados del Caporal, memoria y tradiciones de nuestro pueblo.', vocabulary: 'Narrativa y tiempos verbales', status: 'Publicado', lessons: 15, created: '2025-01-10', updated: '01 Feb 2025', thumb: 4 },
    { title: 'Fonética Costera', level: 'A1', description: 'Diferencias glotales y oclusivas de la variante costa: escucha y reconocimiento sonoro.', vocabulary: 'Variación dialectal', status: 'Borrador', lessons: 6, created: '2025-02-14', updated: 'Hoy, 09:15', thumb: 5 },
    { title: 'Números y Colores', level: 'A1', description: 'Cantidades, colores y relaciones para describir los objetos de la vida diaria.', vocabulary: 'Numeración y descripción', status: 'Publicado', lessons: 7, created: '2025-01-16', updated: '10 Feb 2025', thumb: 1 },
    { title: 'Los Animales de Nuestro Entorno', level: 'A1', description: 'Vocabulario de los animales y su relación con el territorio de la comunidad.', vocabulary: 'Fauna y naturaleza', status: 'Publicado', lessons: 8, created: '2025-01-19', updated: '09 Feb 2025', thumb: 2 },
    { title: 'Cocina y Saberes de la Tierra', level: 'A2', description: 'Ingredientes, alimentos y prácticas de cocina transmitidas entre generaciones.', vocabulary: 'Alimentación y procesos', status: 'Publicado', lessons: 6, created: '2025-01-23', updated: '11 Feb 2025', thumb: 3 },
    { title: 'Oficios de Nuestra Comunidad', level: 'A2', description: 'Oficios y actividades cotidianas que sostienen la vida de nuestra comunidad.', vocabulary: 'Acciones y ocupaciones', status: 'Publicado', lessons: 5, created: '2025-01-28', updated: '12 Feb 2025', thumb: 4 },
    { title: 'Caminos y Lugares de la Región', level: 'A2', description: 'Orientaciones, recorridos y lugares significativos del territorio Totonaca.', vocabulary: 'Territorio y orientación', status: 'Publicado', lessons: 7, created: '2025-02-01', updated: '13 Feb 2025', thumb: 3 },
    { title: 'Relatos de Nuestros Abuelos', level: 'B1', description: 'Comprensión y narración a partir de historias y memorias de nuestros mayores.', vocabulary: 'Memoria oral y narración', status: 'En revisión', lessons: 4, created: '2025-02-06', updated: 'Ayer, 16:20', thumb: 4 },
    { title: 'Nuestra Lengua en el Futuro', level: 'B1', description: 'Conversaciones sobre la preservación de la lengua y su uso entre nuevas generaciones.', vocabulary: 'Diálogo y reflexión', status: 'Borrador', lessons: 6, created: '2025-02-10', updated: 'Hoy, 08:45', thumb: 5 }
  ].map((item, index) => ({ ...item, id: `seed-${index + 1}`, icon: 'book', theme: 'coral' }));
  function validCustomModule(item) {
    return item && typeof item.id === 'string' && item.id.startsWith('custom-') &&
      typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 100 &&
      typeof item.description === 'string' && item.description.trim().length > 0 && item.description.length <= 400 &&
      typeof item.vocabulary === 'string' && item.vocabulary.length <= 120 &&
      ['A1', 'A2', 'B1'].includes(item.level) && ['Publicado', 'En revisión', 'Borrador'].includes(item.status) &&
      Number.isInteger(item.lessons) && item.lessons >= 0 && item.lessons <= 100 &&
      typeof item.created === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.created) && !Number.isNaN(Date.parse(item.created));
  }
  let customModules = [];
  try {
    const stored = JSON.parse(localStorage.getItem(MODULES_KEY) || '[]');
    if (Array.isArray(stored)) customModules = stored.filter(validCustomModule).map(item => ({ ...item, updated: formatModuleDate(item.created), thumb: 1, icon: 'book', theme: 'coral' }));
  } catch { /* A damaged or unavailable local catalog falls back to the sample data. */ }
  const modules = [...moduleSeeds, ...customModules];
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
    return `<article class="panel resource-card"><div class="metric-icon ${item.theme || 'amber'}">${icon(item.icon)}</div><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.description)}</p><span class="pill ${item.status === 'Publicado' ? 'published' : ''}">${escapeHTML(item.status)}</span><div class="resource-footer"><span>${isModule ? item.lessons + ' lecciones' : item.duration + ' · Audio nativo'}</span><button class="text-button" data-detail="${type}" data-index="${index}">Ver ${isModule ? 'módulo' : 'lección'}</button></div></article>`;
  }
  const MODULE_PAGE_SIZE = 5;
  const levelLabels = { A1: 'Inicial', A2: 'Básico', B1: 'Intermedio' };
  let modulePage = 1;
  let alphabeticalModules = false;
  function formatModuleDate(isoDate) {
    const date = new Date(`${isoDate}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    const month = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getUTCMonth()];
    return `${String(date.getUTCDate()).padStart(2, '0')} ${month} ${date.getUTCFullYear()}`;
  }
  function filteredModules() {
    const status = $('#module-filter').value;
    const level = $('#module-level-filter').value;
    const query = normalized($('#module-search').value.trim());
    const items = modules.filter(item => (status === 'all' || item.status === status) &&
      (level === 'all' || item.level === level) &&
      normalized(`${item.title} ${item.description} ${item.vocabulary} ${item.level} ${levelLabels[item.level]}`).includes(query));
    return alphabeticalModules ? items.sort((a, b) => a.title.localeCompare(b.title, 'es')) : items;
  }
  function renderModules() {
    const items = filteredModules();
    const pageCount = Math.max(1, Math.ceil(items.length / MODULE_PAGE_SIZE));
    modulePage = Math.min(Math.max(1, modulePage), pageCount);
    const pageItems = items.slice((modulePage - 1) * MODULE_PAGE_SIZE, modulePage * MODULE_PAGE_SIZE);
    $('#modules-table-body').innerHTML = pageItems.length ? pageItems.map(item => {
      const index = modules.indexOf(item);
      const stateClass = item.status === 'Publicado' ? 'published' : item.status === 'En revisión' ? 'review' : 'draft';
      return `<tr class="module-row"><td class="module-order-cell"><span class="order-pill">#${index + 1}</span><img class="module-thumbnail" src="assets/module-${item.thumb}.svg" width="36" height="36" alt=""></td><td class="module-cell"><div class="module-info"><button class="module-title" data-detail="module" data-index="${index}">${escapeHTML(item.title)}</button><div class="module-meta"><span class="level-badge level-${item.level.toLowerCase()}">Nivel ${item.level} ${levelLabels[item.level]}</span><span class="module-keywords">· ${escapeHTML(item.vocabulary)}</span></div></div></td><td class="module-description"><span title="${escapeHTML(item.description)}">${escapeHTML(item.description)}</span></td><td><span class="module-lesson-count">${item.lessons} ${item.lessons === 1 ? 'lección' : 'lecciones'}</span><div class="module-progress ${stateClass}" aria-hidden="true"><span></span></div></td><td><span class="module-status ${stateClass}">${item.status}</span></td><td class="module-dates"><span>Creado: ${formatModuleDate(item.created)}</span><span>Act: ${escapeHTML(item.updated)}</span></td></tr>`;
    }).join('') : '<tr><td colspan="6"><div class="empty-state"><strong>No hay módulos que coincidan.</strong><br>Prueba otra palabra o cambia los filtros.</div></td></tr>';
    $('#module-stat-total').textContent = modules.length;
    const lessonTotal = modules.reduce((sum, item) => sum + item.lessons, 0);
    $('#module-stat-lessons').textContent = lessonTotal;
    $('#module-stat-active').textContent = `${modules.filter(item => item.status === 'Publicado').length} activos en producción`;
    $('#module-stat-average').textContent = `~${(lessonTotal / modules.length).toFixed(1)} por módulo`;
    $('#module-stat-pending').textContent = modules.filter(item => item.status === 'En revisión').length;
    $('#module-page-summary').textContent = `Mostrando ${pageItems.length} de ${items.length} módulos · Página ${modulePage} de ${pageCount}`;
    const pageButtons = Array.from({ length: pageCount }, (_, index) => `<button type="button" data-module-page="${index + 1}" aria-label="Página ${index + 1}"${index + 1 === modulePage ? ' aria-current="page"' : ''}>${index + 1}</button>`).join('');
    $('#module-pagination').innerHTML = `<button type="button" data-module-page="${modulePage - 1}" aria-label="Página anterior" ${modulePage === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" data-module-page="${modulePage + 1}" aria-label="Página siguiente" ${modulePage === pageCount ? 'disabled' : ''}>›</button>`;
  }
  renderModules();
  for (const selector of ['#module-filter', '#module-level-filter', '#module-search']) {
    $(selector).addEventListener(selector === '#module-search' ? 'input' : 'change', () => { modulePage = 1; renderModules(); });
  }
  $('#module-sort').addEventListener('click', () => {
    alphabeticalModules = !alphabeticalModules;
    $('#module-sort').setAttribute('aria-pressed', String(alphabeticalModules));
    $('#module-sort').textContent = alphabeticalModules ? '↕ Título A–Z' : '↕ Ordenar';
    modulePage = 1;
    renderModules();
  });
  $('#module-pagination').addEventListener('click', event => {
    const button = event.target.closest('[data-module-page]');
    if (!button || button.disabled) return;
    modulePage = Number(button.dataset.modulePage);
    renderModules();
    // Re-render replaces buttons; retain keyboard focus on the new active page.
    $('#module-pagination [aria-current="page"]').focus({ preventScroll: true });
  });

  const createModuleDialog = $('#create-module-dialog');
  const createModuleForm = $('#create-module-form');
  $('#create-module').addEventListener('click', () => {
    createModuleForm.reset();
    $('#module-form-feedback').hidden = true;
    createModuleForm.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    createModuleDialog.showModal();
  });
  for (const selector of ['#cancel-create-module', '#close-create-module']) $(selector).addEventListener('click', () => createModuleDialog.close());
  createModuleForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!createModuleForm.reportValidity()) return;
    const values = new FormData(createModuleForm);
    const title = String(values.get('title')).trim();
    const description = String(values.get('description')).trim();
    const feedback = $('#module-form-feedback');
    const fail = (message, name) => {
      feedback.textContent = message;
      feedback.hidden = false;
      if (name) { createModuleForm.elements.namedItem(name).setAttribute('aria-invalid', 'true'); createModuleForm.elements.namedItem(name).focus(); }
    };
    if (!title) { fail('Escribe el título del módulo.', 'title'); return; }
    if (!description) { fail('Escribe una descripción pedagógica.', 'description'); return; }
    const now = new Date();
    const localDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' }).format(now);
    const item = { id: `custom-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, title,
      level: String(values.get('level')), description, vocabulary: String(values.get('vocabulary') || '').trim(),
      lessons: Number(values.get('lessons')), status: String(values.get('status')), created: localDate,
      updated: formatModuleDate(localDate), thumb: 1, icon: 'book', theme: 'coral' };
    if (!validCustomModule(item)) { fail('Revisa los datos. Las lecciones deben ser un número entero entre 0 y 100.'); return; }
    try { localStorage.setItem(MODULES_KEY, JSON.stringify([...customModules, item])); }
    catch { fail('El navegador no pudo guardar el módulo. Permite el almacenamiento local y vuelve a intentarlo.'); return; }
    customModules.push(item);
    modules.push(item);
    $('#module-filter').value = 'all';
    $('#module-level-filter').value = 'all';
    $('#module-search').value = '';
    alphabeticalModules = false;
    $('#module-sort').setAttribute('aria-pressed', 'false');
    $('#module-sort').textContent = '↕ Ordenar';
    modulePage = Math.ceil(modules.length / MODULE_PAGE_SIZE);
    renderModules();
    createModuleDialog.close();
    showToast('Módulo creado y guardado en este navegador.');
    $(`#modules-table-body [data-index="${modules.length - 1}"]`).focus({ preventScroll: true });
  });
  createModuleForm.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
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
    const name = typeof preferences.displayName === 'string' && preferences.displayName.trim() ? preferences.displayName : session.name || 'Mtro. Xicoténcatl Morales';
    $('.profile strong').textContent = name;
    $('#display-name').value = name;
    $('#account-email').value = session.email;
    $('#digest').checked = preferences.digest !== false;
    $('#review-notification').hidden = preferences.digest === false;
    const unread = $('#notifications').classList.contains('read') ? 0 : (preferences.digest === false ? 2 : 3);
    $('#notification-count').textContent = unread;
    $('#notification-count').hidden = unread === 0;
    $('#notifications-button').setAttribute('aria-label', unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones, todas leídas');
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
    $('#sidebar').inert = window.matchMedia('(max-width:700px)').matches;
    $('.sidebar-backdrop').hidden = true;
    $('#mobile-menu').setAttribute('aria-expanded', 'false');
  }
  function showView(name) {
    currentView = views.includes(name) ? name : 'dashboard';
    if (currentView === 'search' && !$('#search').value.trim()) currentView = 'dashboard';
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
    $('#sidebar').inert = !open;
    $('.sidebar-backdrop').hidden = !open;
    $('#mobile-menu').setAttribute('aria-expanded', String(open));
  });
  $('.sidebar-backdrop').addEventListener('click', closeSidebar);
  $$('.nav-link, .brand').forEach(link => link.addEventListener('click', closeSidebar));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeSidebar(); $('#notifications').hidden = true; $('#notifications-button').setAttribute('aria-expanded', 'false'); } });
  window.matchMedia('(min-width:701px)').addEventListener('change', () => closeSidebar());

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
