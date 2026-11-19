'use strict';

(() => {
  const app = window.DialektaApp;
  if (!app) return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const DRAFTS_KEY = 'dialekta-builder-drafts-v1';
  const ACTIVE_KEY = 'dialekta-builder-active';
  const DEFAULT_COVER = 'assets/builder-cover.svg';
  const colors = { '#B33927': 'Terracota Ancestral Dialekta', '#D2A171': 'Ocre de la tierra', '#5E7164': 'Verde comunidad', '#AA9591': 'Piedra rosada' };
  const icons = {
    colibri: '<path d="m3 4 8 5 7-6-3 9 6 1-7 2-2 7-3-7-6-3 6-1Z"/><path d="m11 9 1 6m3-3 5-5"/>',
    vainilla: '<path d="M12 21V10m0 3C4 15 2 10 3 6c5 0 9 2 9 7Zm0 3c8 1 10-4 9-8-5 0-9 3-9 8Z"/><path d="M12 10c-7-4-5-8 0-8 5 0 7 4 0 8Z"/>',
    maiz: '<path d="M9 14V6a3 3 0 0 1 6 0v8M12 3v12M9 7h6m-6 4h6M12 22C5 21 3 15 3 11c6 2 9 5 9 11Zm0 0c7-1 9-7 9-11-6 2-9 5-9 11Z"/>',
    piramide: '<path d="M3 21v-4h3v-4h3V9h6v4h3v4h3v4ZM9 5h6m-3-3v3M10 21v-4h4v4"/>'
  };
  const graphic = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.colibri}</svg>`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const textFields = { titleEs: '#builder-title-es', titleNative: '#builder-title-native', summary: '#builder-summary', objectives: '#builder-objectives', variant: '#builder-variant', phonetics: '#builder-phonetics', practice: '#builder-practice' };
  const numericFields = { practiceCount: '#builder-practice-count', testQuestions: '#builder-test-questions', passScore: '#builder-pass-score' };
  const originalIntro = $('.builder-header p').innerHTML;
  const originalEyebrow = $('.builder-eyebrow > span:first-child').textContent;
  const defaults = {
    moduleId: null, titleEs: 'Saludos, Cortesía y Presentación', titleNative: 'Tlan Liwana chu Paxikatsini',
    summary: 'Aprende a saludar con respeto según la hora del día, presentarte con tu nombre de pila y despedirte formalmente de ancianos comunitarios y amistades.',
    objectives: '1. Reconocimiento auditivo de fonemas oclusivos y glotalizados propios del saludo matutino (Tlan tisa).\n2. Estructuración sintáctica del pronombre libre vs. prefijo posesivo en fórmulas de presentación básica.\n3. Uso de expresiones de cortesía con respeto a los mayores.',
    tags: ['saludos', 'cortesía', 'respeto-ancianos', 'glotal'], position: 1,
    color: '#B33927', icon: 'colibri', cover: DEFAULT_COVER, variant: 'Papantla',
    phonetics: 'Practicar la escucha y la pronunciación de los saludos con apoyo de hablantes de la comunidad de Papantla.',
    practice: 'Reconocimiento sonoro', practiceCount: 5, testQuestions: 5, passScore: 80,
    communityApproval: false, step: 1, savedAt: null, history: []
  };
  const copyDefaults = () => ({ ...defaults, tags: [...defaults.tags], history: [] });
  let drafts = {};
  let key = 'new';
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) drafts = stored;
    key = sessionStorage.getItem(ACTIVE_KEY) || 'new';
  } catch { /* The editor remains available when browser storage cannot be read. */ }
  const validKey = value => value === 'new' || /^(?:seed-\d+|custom-[a-zA-Z0-9-]+)$/.test(value);
  if (!validKey(key)) key = 'new';

  function cleanDraft(value) {
    const draft = copyDefaults();
    if (!value || typeof value !== 'object') return draft;
    for (const [name, max] of Object.entries({ titleEs: 100, titleNative: 100, summary: 250, objectives: 1600, phonetics: 1600 })) {
      if (typeof value[name] === 'string') draft[name] = value[name].slice(0, max);
    }
    if (typeof value.moduleId === 'string' && validKey(value.moduleId) && value.moduleId !== 'new') draft.moduleId = value.moduleId;
    if (Array.isArray(value.tags)) draft.tags = [...new Set(value.tags.filter(tag => typeof tag === 'string').map(tag => tag.slice(0, 40)))].slice(0, 12);
    if (Object.hasOwn(colors, value.color)) draft.color = value.color;
    if (Object.hasOwn(icons, value.icon)) draft.icon = value.icon;
    if (value.cover === null || value.cover === DEFAULT_COVER || (typeof value.cover === 'string' && value.cover.length < 1500000 && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value.cover))) draft.cover = value.cover;
    if (['Papantla', 'Costa', 'Sierra Norte'].includes(value.variant)) draft.variant = value.variant;
    if (['Reconocimiento sonoro', 'Asociación de imágenes', 'Completar palabras'].includes(value.practice)) draft.practice = value.practice;
    for (const [name, min, max] of [['position', 1, 99], ['step', 1, 4], ['practiceCount', 1, 20], ['testQuestions', 1, 20], ['passScore', 0, 100]]) {
      if (Number.isInteger(value[name]) && value[name] >= min && value[name] <= max) draft[name] = value[name];
    }
    draft.communityApproval = value.communityApproval === true;
    if (typeof value.savedAt === 'string' && !Number.isNaN(Date.parse(value.savedAt))) draft.savedAt = value.savedAt;
    if (Array.isArray(value.history)) draft.history = value.history.filter(entry => entry && typeof entry.at === 'string' && !Number.isNaN(Date.parse(entry.at)) && typeof entry.title === 'string').slice(-8).map(entry => ({ at: entry.at, title: entry.title.slice(0, 100), step: Number(entry.step) || 1 }));
    return draft;
  }
  let state = cleanDraft(drafts[key]);
  let saveTimer;

  function setFeedback(message) {
    $('#builder-feedback').textContent = message;
    $('#builder-feedback').hidden = !message;
  }
  function collectFields() {
    for (const [name, selector] of Object.entries(textFields)) state[name] = $(selector).value;
    for (const [name, selector] of Object.entries(numericFields)) state[name] = $(selector).value === '' ? null : Number($(selector).value);
    state.communityApproval = $('#builder-community-approval').checked;
  }
  function persistDraft(addHistory = true) {
    clearTimeout(saveTimer);
    const at = new Date().toISOString();
    const nextHistory = addHistory ? [...state.history, { at, title: state.titleEs, step: state.step }].slice(-8) : state.history;
    const nextState = { ...state, savedAt: at, history: nextHistory };
    const nextDrafts = { ...drafts, [key]: nextState };
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(nextDrafts));
      drafts = nextDrafts;
      state = nextState;
      try { sessionStorage.setItem(ACTIVE_KEY, key); } catch { /* Persistence is still available locally. */ }
      $('#builder-autosave').textContent = 'Guardado automático: ahora';
      return true;
    } catch {
      $('#builder-autosave').textContent = 'No se pudo guardar';
      setFeedback('El navegador no pudo guardar el borrador. Habilita el almacenamiento local o utiliza una ilustración más pequeña. Tus cambios siguen visibles en esta pestaña.');
      return false;
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    $('#builder-autosave').textContent = 'Guardando cambios…';
    saveTimer = setTimeout(() => persistDraft(), 550);
  }
  function renderTags() {
    $('#builder-tags').replaceChildren();
    state.tags.forEach((tag, index) => {
      const chip = document.createElement('span');
      chip.className = 'builder-tag';
      const text = document.createElement('span');
      text.textContent = `#${tag}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Eliminar etiqueta ${tag}`);
      remove.addEventListener('click', () => {
        state.tags.splice(index, 1);
        renderTags();
        scheduleSave();
        $('#builder-tag-input').focus();
      });
      chip.append(text, remove);
      $('#builder-tags').append(chip);
    });
  }
  function updatePreview() {
    $('#preview-title-native').textContent = state.titleNative.trim() || 'Nombre en Tutunakú';
    $('#preview-title-es').textContent = state.titleEs.trim() || 'Título del módulo';
    $('#preview-module-heading').style.backgroundColor = state.color;
    $('#preview-module-heading').style.color = state.color === '#D2A171' || state.color === '#AA9591' ? '#351f12' : '#fff8ef';
    $('.preview-stop.first').style.backgroundColor = state.color;
    $('#preview-module-icon').innerHTML = graphic(state.icon);
    $('#preview-progress-count').textContent = `0 / ${state.practiceCount || 5}`;
    $('#preview-module-heading > small').textContent = `SECCIÓN 1 · ${state.variant.toLocaleUpperCase('es')}`;
    $('#builder-summary-count').textContent = `${state.summary.length}/250 caracteres recomendados`;
    $('#builder-position').innerHTML = '<svg aria-hidden="true"><use href="#i-settings"/></svg>';
    $('#builder-position').append(`Módulo #${state.position} de la Unidad 1`);
    $('#builder-order-up').disabled = state.position <= 1;
    $('#builder-order-down').disabled = state.position >= 99;
    $('#builder-cover-image').hidden = !state.cover;
    if (state.cover) $('#builder-cover-image').src = state.cover;
    $('#builder-cover-placeholder').hidden = Boolean(state.cover);
    $('#builder-restore-cover').hidden = Boolean(state.cover);
    $('#builder-remove-cover').disabled = !state.cover;
    $$('[data-builder-color]').forEach(button => {
      const selected = button.dataset.builderColor === state.color;
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '✓' : '';
    });
    $$('[data-builder-icon]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.builderIcon === state.icon)));
    const colorNote = $('.builder-color-description');
    colorNote.textContent = `${colors[state.color]} (${state.color}).`;
    const checks = { titles: Boolean(state.titleEs.trim() && state.titleNative.trim()), variant: ['Papantla', 'Costa', 'Sierra Norte'].includes(state.variant), art: Boolean(state.cover && state.icon), approval: state.communityApproval };
    for (const [name, ready] of Object.entries(checks)) {
      const row = $(`[data-check="${name}"]`);
      row.classList.remove('ready');
      row.classList.toggle('is-complete', ready);
      row.setAttribute('data-complete', String(ready));
    }
    $('#builder-ready-count').textContent = `${Object.values(checks).filter(Boolean).length} de 4 listos`;
    $('[data-check="variant"] small').textContent = `${state.variant} seleccionada`;
    $('[data-check="art"] small').textContent = state.cover ? 'Ilustración e icono seleccionados' : 'Falta ilustración de portada';
    if ($('#practice-created-count')) $('#practice-created-count').textContent = `${state.practiceCount} creados`;
  }
  function showStep(number, scroll = false) {
    state.step = Math.min(4, Math.max(1, Number(number) || 1));
    $$('.builder-step-content').forEach((content, index) => { content.hidden = index + 1 !== state.step; });
    $$('.builder-step').forEach(button => {
      const stepNumber = Number(button.dataset.step);
      const current = stepNumber === state.step;
      button.classList.toggle('active', current);
      button.classList.toggle('is-active', current);
      if (current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.classList.toggle('is-complete', stepNumber < state.step);
      button.querySelector('small').textContent = `PASO ${String(stepNumber).padStart(2, '0')}${current ? ' · EN CURSO' : stepNumber < state.step ? ' · COMPLETADO' : ''}`;
      if (state.step === 3 && stepNumber === 3) {
        const label = button.querySelector('small');
        label.textContent = 'ACTIVO ';
        const count = document.createElement('span');
        count.id = 'practice-created-count';
        count.className = 'practice-step-count';
        count.textContent = `${state.practiceCount} creados`;
        label.append(count);
      }
      button.querySelector('.builder-step-number').innerHTML = stepNumber < state.step ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>' : current && state.step === 2 ? '<svg aria-hidden="true"><use href="#i-audio"/></svg>' : String(stepNumber);
    });
    const nextLabels = ['Siguiente: Paso 2 Didáctica & Fonética →', 'Siguiente: Paso 3 Prácticas Interactivas →', 'Siguiente: Paso 4 Configuración del Test →', 'Guardar y enviar a revisión →'];
    $('#builder-next-step').textContent = nextLabels[state.step - 1];
    const isPhonetics = state.step === 2;
    $('#view-constructor').classList.toggle('is-phonetics', isPhonetics);
    $('#builder-default-aside').hidden = isPhonetics;
    $('#phonetics-aside').hidden = !isPhonetics;
    $('.builder-eyebrow > span:first-child').textContent = isPhonetics ? `MÓDULO ${String(state.position).padStart(2, '0')}: ${state.titleEs.toLocaleUpperCase('es')}` : originalEyebrow;
    $('.builder-header p').innerHTML = isPhonetics ? 'Define la arquitectura de sonido, despiece morfológico y sustento cultural<br class="builder-wide-break"> validado por los consejos comunitarios del Totonacapan.' : originalIntro;
    $('#builder-save-next').innerHTML = `<svg aria-hidden="true"><use href="#i-folder"/></svg>${state.step === 4 ? 'Guardar para revisión' : isPhonetics ? 'Guardar Avance' : 'Guardar y Continuar'}`;
    $('#builder-previous-step').hidden = state.step === 1;
    $('#builder-previous-step').textContent = isPhonetics ? '← Anterior: Información del Módulo' : '← Paso anterior';
    $('#builder-save-draft').hidden = !isPhonetics;
    $('#builder-cancel').hidden = isPhonetics;
    window.dispatchEvent(new CustomEvent('dialekta:builder-step', { detail: { step: state.step } }));
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function populate() {
    for (const [name, selector] of Object.entries(textFields)) $(selector).value = state[name];
    for (const [name, selector] of Object.entries(numericFields)) $(selector).value = state[name];
    $('#builder-community-approval').checked = state.communityApproval;
    $('#builder-module-id').textContent = state.moduleId ? `ID: ${state.moduleId.startsWith('seed-') ? 'MOD-TUTU-' + state.moduleId.slice(5).padStart(4, '0') : 'MOD-' + state.moduleId.slice(-6).toUpperCase()}` : 'ID: MOD-TUTU-0104';
    $('#builder-autosave').textContent = state.savedAt ? 'Borrador local recuperado' : 'Sin cambios guardados';
    renderTags();
    updatePreview();
    showStep(state.step);
  }
  function validForStep(step) {
    collectFields();
    const fields = [ ['titleEs', '#builder-title-es', 1], ['titleNative', '#builder-title-native', 1], ['summary', '#builder-summary', 1], ['objectives', '#builder-objectives', 1] ];
    for (const [name, selector, fieldStep] of fields) {
      if (!state[name].trim()) {
        showStep(fieldStep, true);
        setFeedback('Completa los títulos, el resumen y los objetivos para continuar.');
        $(selector).focus();
        return false;
      }
    }
    if (!state.cover) { showStep(1); setFeedback('Selecciona o restaura una ilustración de portada para continuar.'); $('#builder-change-cover').focus(); return false; }
    const numbers = [ ['practiceCount', 1, 20, 3], ['testQuestions', 1, 20, 4], ['passScore', 0, 100, 4] ];
    for (const [name, min, max, fieldStep] of numbers) {
      if (step >= fieldStep && (!Number.isInteger(state[name]) || state[name] < min || state[name] > max)) {
        showStep(fieldStep, true);
        setFeedback(`Escribe un número entero entre ${min} y ${max}.`);
        $(numericFields[name]).focus();
        return false;
      }
    }
    setFeedback('');
    return true;
  }
  function openBuilder(item = null) {
    // Finish a pending autosave before changing the edited module.
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; persistDraft(); }
    key = item?.id || 'new';
    if (drafts[key]) state = cleanDraft(drafts[key]);
    else {
      state = copyDefaults();
      if (item) {
        state.moduleId = item.id;
        state.titleEs = item.title;
        state.titleNative = item.nativeTitle || defaults.titleNative;
        state.summary = item.description.slice(0, 250);
        state.tags = item.vocabulary ? item.vocabulary.split(/[·,]/).map(tag => tag.trim()).filter(Boolean).slice(0, 12) : [...defaults.tags];
        state.position = Number.isInteger(item.curriculumPosition) ? item.curriculumPosition : Number(/^seed-(\d+)$/.exec(item.id)?.[1]) || 1;
      }
    }
    // Always enter through the information screen, while preserving other draft fields.
    state.step = 1;
    setFeedback('');
    try { sessionStorage.setItem(ACTIVE_KEY, key); } catch { /* Editing works in the current page. */ }
    populate();
    app.navigate('constructor');
    window.scrollTo(0, 0);
  }
  window.addEventListener('dialekta:open-builder', event => openBuilder(event.detail));

  async function saveAndContinue() {
    const currentStep = state.step;
    if (!validForStep(currentStep)) return;
    if (!state.moduleId) state.moduleId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!persistDraft()) return;
    try {
      app.saveModule(state, currentStep === 4);
      const oldKey = key;
      key = state.moduleId;
      if (oldKey === 'new') delete drafts.new;
      if (!persistDraft(false)) return;
      populate();
      app.notify(currentStep === 4 ? 'Módulo guardado para revisión en esta demostración.' : 'Borrador guardado en este navegador.');
      if (currentStep < 4) { showStep(currentStep + 1, true); scheduleSave(); }
      else app.navigate('modulos');
    } catch {
      setFeedback('El borrador local está guardado, pero no se pudo actualizar el catálogo. Comprueba el almacenamiento del navegador y vuelve a guardar.');
    }
  }
  $('#builder-save-next').addEventListener('click', saveAndContinue);
  $('#builder-next-step').addEventListener('click', saveAndContinue);
  $('#builder-previous-step').addEventListener('click', () => { collectFields(); showStep(state.step - 1, true); scheduleSave(); });
  $$('.builder-step').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.step);
    if (target > state.step && !validForStep(target - 1)) return;
    collectFields(); showStep(target, true); scheduleSave();
  }));
  $('#builder-cancel').addEventListener('click', () => {
    collectFields();
    if (saveTimer) persistDraft();
    app.navigate('modulos');
  });
  $('#builder-form').addEventListener('submit', event => event.preventDefault());
  $('#builder-form').addEventListener('input', event => {
    if (event.target === $('#builder-tag-input') || event.target.type === 'file') return;
    collectFields(); setFeedback(''); updatePreview(); scheduleSave();
  });
  // Select changes are emitted separately by some browsers.
  $('#builder-form').addEventListener('change', event => {
    if (event.target.tagName === 'SELECT' || event.target.type === 'checkbox') { collectFields(); updatePreview(); scheduleSave(); }
  });
  $('#builder-tag-input').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const tag = event.target.value.trim().replace(/^#+/, '');
    if (!tag) return;
    if (state.tags.length >= 12) { setFeedback('Puedes agregar hasta 12 etiquetas por módulo.'); return; }
    if (!state.tags.some(existing => existing.toLocaleLowerCase('es') === tag.toLocaleLowerCase('es'))) state.tags.push(tag);
    event.target.value = ''; renderTags(); scheduleSave();
  });
  for (const [selector, delta] of [['#builder-order-up', -1], ['#builder-order-down', 1]]) $(selector).addEventListener('click', () => { state.position = Math.min(99, Math.max(1, state.position + delta)); updatePreview(); scheduleSave(); });
  $$('[data-builder-color]').forEach(button => button.addEventListener('click', () => { state.color = button.dataset.builderColor; updatePreview(); scheduleSave(); }));
  $$('[data-builder-icon]').forEach(button => {
    button.querySelector('svg').outerHTML = graphic(button.dataset.builderIcon);
    button.addEventListener('click', () => { state.icon = button.dataset.builderIcon; updatePreview(); scheduleSave(); });
  });
  $('#builder-change-cover').addEventListener('click', () => $('#builder-cover-file').click());
  $('#builder-remove-cover').addEventListener('click', () => { state.cover = null; $('#builder-cover-file').value = ''; updatePreview(); scheduleSave(); });
  $('#builder-restore-cover').addEventListener('click', () => { state.cover = DEFAULT_COVER; updatePreview(); scheduleSave(); });
  $('#builder-cover-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { setFeedback('Selecciona una imagen PNG, JPEG o WebP de hasta 1 MB.'); event.target.value = ''; return; }
    const editingKey = key;
    try {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      await new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = data; });
      if (key !== editingKey) return;
      state.cover = data; setFeedback(''); updatePreview(); scheduleSave();
    } catch { setFeedback('No se pudo leer la ilustración. Selecciona un archivo de imagen válido.'); }
  });
  $('#builder-history').addEventListener('click', () => {
    const content = state.history.length ? '<ol class="builder-history-list">' + [...state.history].reverse().map(entry => `<li><strong>${escape(entry.title || 'Sin título')}</strong><br>Paso ${entry.step} · ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(entry.at))}</li>`).join('') + '</ol>' : '<p>Aún no hay cambios guardados para este borrador.</p>';
    app.showDialog('Historial de guardado local', content, 'CONSTRUCTOR · BORRADOR');
  });
  $('#builder-preview-button').addEventListener('click', () => {
    collectFields(); updatePreview();
    const phone = $('.builder-phone').cloneNode(true);
    phone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    phone.classList.add('builder-modal-phone');
    app.showDialog('Vista previa en App Móvil', '<div id="builder-modal-preview"></div><p>Simulación visual del módulo con los datos de este borrador.</p>', 'DIALEKTA MOBILE · V2.4');
    $('#builder-modal-preview').append(phone);
  });
  window.addEventListener('pagehide', () => { if (saveTimer) persistDraft(); });
  window.addEventListener('hashchange', () => { if (location.hash !== '#constructor' && saveTimer) persistDraft(); });
  populate();
})();
