"use strict";

function moduleLabel() {
  return state.record.id ? "Módulo " + state.record.id : "Nuevo módulo";
}

function updateRouteTitle() {
  const title = el("route-title");
  if (title) title.textContent = [moduleLabel(), state.record.title.trim()].filter(Boolean).join(" · ");
}

function lessonStatus(lesson) {
  return lesson.status || (state.record.status === "published" ? "published" : "draft");
}

function moduleEditor() {
  state.route = "editor";
  const record = state.record;
  const lessons = record.data.lessons;
  const label = moduleLabel();
  document.title = label + " · Dialekta";
  const choices = [...new Set(["A1","A2","B1",record.level].filter(Boolean))];
  const levelButtons = choices.map(level => btn(esc(level),"m-level","",`data-level="${esc(level)}" aria-pressed="${record.level === level}"`)).join("");
  const cards = lessons.map((lesson, index) => {
    const position = index + 1;
    const at = `data-i="${index}"`;
    return `<li><span class="mw-order">${position}</span><div class="mw-item-title"><b>${esc(lesson.title || "Lección sin título")}</b><small>${esc(states[lessonStatus(lesson)])}</small></div>
      <div class="mw-tools">${btn("↑","m-up","",at+' aria-label="Subir lección '+position+'" '+(index===0?"disabled":""))}
      ${btn("↓","m-down","",at+' aria-label="Bajar lección '+position+'" '+(position===lessons.length?"disabled":""))}
      ${btn("Editar","m-lesson","",at+' aria-label="Editar lección '+position+'"')}
      ${btn("Eliminar","m-lesson-remove","danger",at+' aria-label="Eliminar lección '+position+'"')}</div></li>`;
  }).join("");
  const route = lessons.map((lesson,index) => `<li><b>Lección ${index+1}</b><span>${esc(lesson.title || "Lección sin título")}</span></li>`).join("");
  shell(`<section class="module-workspace">
    <header class="mw-header"><div><h1>${esc(label)}</h1><p>Datos del módulo y las lecciones que contiene.</p></div>${btn("Guardar borrador","m-draft")}</header>
    <nav class="mw-crumb" aria-label="Ruta">${btn("Módulos","catalog")} › ${esc(label)}</nav>
    <div class="mw-grid"><div class="mw-column">
      <section class="mw-card"><h2>Datos del módulo</h2>
        <label for="module-title">Título del módulo</label><input data-key="title" id="module-title" maxlength="180" value="${esc(record.title)}" placeholder="Ej. Primeros pasos">
        <div class="mw-level" role="group" aria-label="Nivel"><span>Nivel</span>${levelButtons}</div>
      </section>
      <section class="mw-card"><h2>Lecciones de este módulo</h2>
        <ol class="mw-lessons">${cards}</ol>${btn("Agregar lección","m-lesson","primary mw-add")}
        <p>Abre el creador de lecciones de 3 pasos: lo esencial, palabras y publicar.</p>
      </section>
      <details class="mw-more"><summary>Opciones del módulo</summary><div>
        ${selectField("status","Estado del módulo",Object.entries(states))}
        ${btn("Editar contenido avanzado","m-advanced")}
        ${lessons.length ? `<label>Quitar una lección<select id="mw-remove"><option value="">Seleccionar lección</option>${lessons.map((l,i)=>`<option value="${i}">${i+1}. ${esc(l.title)}</option>`).join("")}</select></label>${btn("Quitar del módulo","m-remove")}` : ""}
      </div></details>
    </div><aside class="mw-aside"><h3>Así se verá la ruta</h3><div class="mw-route"><h2 id="route-title"></h2>
      ${route ? `<ol>${route}</ol>` : "<p>Aquí aparecerán las lecciones que agregues.</p>"}
    </div></aside></div>
    <footer class="mw-footer">${btn("Volver a Módulos","catalog")}${btn("Guardar módulo","m-save","primary")}</footer>
  </section>`);
  updateRouteTitle();
}

function moduleTitleReady() {
  if (state.record.title.trim()) return true;
  notice("Escribe el título del módulo.");
  el("module-title")?.focus();
  return false;
}

async function saveModule(candidate) {
  const result = await api("save", candidate);
  state.record = makeRecord(result.module);
  state.dirty = false;
  state.modules = [result.module, ...state.modules.filter(m => m.id !== result.module.id)];
}

function openLesson(index) {
  if (!moduleTitleReady()) return;
  const record = state.record;
  const original = record.data.lessons[index];
  const previousDirty = state.dirty;
  state.route = "editor";
  window.DialektaWizard.open({
    lesson: original ? {...original, status:lessonStatus(original)} : null,
    level: record.level,
    legacyContentOnly: Boolean(original?.content && !original.status && !original.words),
    onDirty: () => { state.dirty = true; },
    onCancel: () => { state.dirty = previousDirty; moduleEditor(); window.scrollTo(0,0); },
    onSave: async (lesson, status) => {
      const lessons = [...record.data.lessons];
      lessons[index] = {...lesson, status};
      if (status === "published" && original?.content && !original.status && !original.words && !lesson.words?.length) {
        // Earlier lessons inherit publication from their module.
        delete lessons[index].status;
        delete lessons[index].words;
      }
      const candidate = {...record, data:{...record.data, lessons}};
      try {
        await saveModule(candidate);
      } catch (error) {
        if (candidate.status !== "published" || error.code !== "published_lesson_required" ||
            !confirm("Al guardar, el módulo se quedará sin lecciones publicadas. ¿Guardar también el módulo como borrador?")) throw error;
        await saveModule({...candidate,status:"draft"});
      }
      moduleEditor();
      window.scrollTo(0,0);
      notice(status === "published" ? "Lección publicada." : "Borrador de lección guardado.");
    }
  });
}

async function moduleAction(button) {
  const action = button.dataset.act;
  if (action !== "simple" && !action.startsWith("m-")) return false;
  const record = state.record;
  const lessons = record.data.lessons;
  const index = Number(button.dataset.i);
  switch (action) {
    case "simple":
    case "m-advanced":
      state.advanced = action === "m-advanced";
      state.step = 0;
      editor();
      window.scrollTo(0,0);
      break;
    case "m-level":
      record.level = button.dataset.level;
      state.dirty = true;
      for (const choice of app.querySelectorAll("[data-act=m-level]")) {
        choice.setAttribute("aria-pressed", String(choice === button));
      }
      break;
    case "m-up":
    case "m-down": {
      const next = index + (action === "m-up" ? -1 : 1);
      if (next < 0 || next >= lessons.length) break;
      [lessons[next],lessons[index]] = [lessons[index],lessons[next]];
      state.dirty = true;
      moduleEditor();
      break;
    }
    case "m-lesson":
      openLesson(button.hasAttribute("data-i") ? index : lessons.length);
      break;
    case "m-lesson-remove":
      if (confirm("¿Eliminar esta lección del módulo? Guarda el módulo para aplicar el cambio.")) {
        lessons.splice(index,1);
        state.dirty = true;
        moduleEditor();
      }
      break;
    case "m-remove": {
      const selected = el("mw-remove").value;
      if (!selected) { notice("Elige una lección para quitarla."); break; }
      if (confirm("¿Quitar esta lección del módulo? Guarda el módulo para aplicar el cambio.")) {
        lessons.splice(Number(selected),1);
        state.dirty = true;
        moduleEditor();
      }
      break;
    }
    case "m-save":
    case "m-draft":
      if (!moduleTitleReady()) break;
      await saveModule({...record, status:action === "m-draft" ? "draft" : record.status});
      moduleEditor();
      notice(action === "m-draft" ? "Borrador del módulo guardado." : "Módulo guardado.");
      break;
  }
  return true;
}


