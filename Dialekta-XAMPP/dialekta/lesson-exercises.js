'use strict';

window.DialektaLessonExercises = (() => {
  const clean = value => typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
  const key = value => clean(value).toLocaleLowerCase('es');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const phrasesOf = lesson => (Array.isArray(lesson.phrases) ? lesson.phrases : []).map(clean).filter(Boolean);

  function vocabulary(lesson) {
    return (Array.isArray(lesson.words) ? lesson.words : []).map(row => ({
      word: clean(row?.totonaco), answer: clean(row?.spanish)
    })).filter(row => row.word || row.answer);
  }

  function usable(words) {
    return words.length >= 4 && words.every(row => row.word && row.answer) &&
      new Set(words.map(row => key(row.word))).size === words.length &&
      new Set(words.map(row => key(row.answer))).size === words.length;
  }

  function types(lesson) {
    if (lesson.exerciseTypes && typeof lesson.exerciseTypes === 'object') {
      return Object.fromEntries(['choice', 'memory', 'order'].map(k => [k, lesson.exerciseTypes[k] === true]));
    }
    const ready = usable(vocabulary(lesson));
    return {choice: ready, memory: ready, order: false};
  }

  function validate(lesson) {
    const enabled = types(lesson);
    if ((enabled.choice || enabled.memory) && !usable(vocabulary(lesson))) {
      return 'Opción múltiple y memoria requieren al menos cuatro palabras distintas, cada una con un significado distinto. Completa las parejas en el paso 2 o desactiva esos ejercicios.';
    }
    if (enabled.order) {
      const phrases = phrasesOf(lesson);
      if (!phrases.length) return 'Agrega una frase en totonaco para activar «Armar frases».';
      if (phrases.some(phrase => new Set(phrase.split(' ').map(key)).size < 2)) {
        return 'Cada frase debe incluir al menos dos palabras distintas.';
      }
      if (new Set(phrases.map(key)).size !== phrases.length) return 'Escribe cada frase una sola vez.';
    }
    return '';
  }

  // La mezcla es estable para que guardar dos veces mantenga los mismos ejercicios.
  function mix(items, seed) {
    let hash = 2166136261;
    for (const char of seed) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
      const index = hash % (i + 1);
      [result[i], result[index]] = [result[index], result[i]];
    }
    return result;
  }

  function generate(lesson) {
    const error = validate(lesson);
    const exercises = [];
    if (error) return {exercises, error};
    const enabled = types(lesson), words = vocabulary(lesson);
    for (const type of ['choice', 'memory']) {
      if (!enabled[type]) continue;
      words.forEach(({word, answer}, i) => {
        const choices = mix([answer, words[(i + 1) % words.length].answer,
          words[(i + 2) % words.length].answer], word + type);
        const prompt = type === 'choice' ? '¿Qué significa ' + word + '?' : 'Une «' + word + '» con su significado.';
        exercises.push({type, prompt, word, answer, choices});
      });
    }
    if (enabled.order) {
      for (const phrase of phrasesOf(lesson)) {
        const tokens = mix(phrase.split(' '), phrase);
        if (tokens.join(' ') === phrase) {
          const index = tokens.findIndex(token => key(token) !== key(tokens[0]));
          [tokens[0], tokens[index]] = [tokens[index], tokens[0]];
        }
        exercises.push({type: 'order', prompt: 'Ordena las palabras para armar la frase.', answer: phrase, tokens});
      }
    }
    return {exercises, error: ''};
  }

  function switchRow(type, title, description, checked) {
    return `<div class="lx-row"><div><strong>${title}</strong><small>${description}</small></div>
      <button type="button" role="switch" class="lx-switch" aria-label="${title}" aria-checked="${checked}" data-lx-type="${type}"><span aria-hidden="true"></span></button></div>`;
  }

  function render(lesson) {
    const enabled = types(lesson), result = generate(lesson);
    const words = vocabulary(lesson).filter(row => row.word && row.answer);
    const phrases = phrasesOf(lesson);
    const summary = [['Lección', lesson.title || 'Lección sin título'], ['Nivel', lesson.level || 'A1'],
      ['Palabras', words.length], ['Ejercicios creados', result.exercises.length]];
    return `<div class="lx-grid"><div class="lx-main">
      <section class="lx-card"><h2>Ejercicios automáticos</h2>
        <p>Se crean solos con tus palabras. Apaga los que no quieras.</p>
        ${switchRow('choice','Opción múltiple','¿Qué significa esta palabra?',enabled.choice)}
        ${switchRow('memory','Memoria de parejas','Une cada palabra con su significado',enabled.memory)}
        ${switchRow('order','Armar frases','Requiere frases escritas por ti',enabled.order)}
        ${enabled.order ? `<div class="lx-phrase-editor"><button type="button" data-lx-phrases>${phrases.length ? 'Editar frases (' + phrases.length + ')' : 'Agregar frases'}</button></div>` : ''}
        ${result.error ? `<p class="lx-feedback" role="status">${escape(result.error)}</p>` : ''}
      </section>
      <section class="lx-card"><h2>Resumen</h2><dl class="lx-summary">${summary.map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl></section>
      </div><aside class="lx-aside"><h3>Así lo verá el estudiante</h3><div class="lx-phone"></div></aside></div>`;
  }

  function editPhrases(lesson, commit) {
    const dialog = document.createElement('dialog');
    dialog.className = 'lx-phrase-editor';
    dialog.setAttribute('aria-label', 'Frases en totonaco');
    dialog.innerHTML = '<form><h2>Frases en totonaco</h2><label>Escribe una frase por línea<textarea name="phrases" rows="5"></textarea></label><div class="lx-actions"><button type="button">Cancelar</button><button type="submit">Aplicar</button></div></form>';
    const form = dialog.querySelector('form');
    form.elements.phrases.value = phrasesOf(lesson).join('\n');
    form.querySelector('[type=button]').onclick = () => dialog.close();
    form.onsubmit = event => {
      event.preventDefault();
      const phrases = form.elements.phrases.value.split(/\r?\n/).map(clean).filter(Boolean);
      dialog.close();
      commit({phrases});
    };
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    document.body.append(dialog);
    dialog.showModal();
    form.elements.phrases.focus();
  }

  function preview(host, exercises, error) {
    if (!exercises.length) {
      host.innerHTML = `<p class="lx-count">Vista previa</p><p>${error ? 'Completa los datos de los ejercicios para probarlos aquí.' : 'Activa un tipo de ejercicio para probarlo aquí.'}</p>`;
      return;
    }
    let position = 0, choice = -1, ordered = [], checked = null, memory = null;
    function initMemory() {
      const slice = [];
      for (let i = position; i < exercises.length && exercises[i].type === 'memory' && slice.length < 4; i++) slice.push(exercises[i]);
      const cards = slice.flatMap((exercise, pair) => [
        {pair, side:'word', text:exercise.word}, {pair, side:'answer', text:exercise.answer}
      ]);
      memory = {cards:mix(cards, slice[0].word), picked:[], matched:new Set(), end:position + slice.length};
    }
    function option(label, command, index, pressed, disabled = false) {
      return `<button type="button" class="lx-option" data-lx-command="${command}" data-index="${index}" aria-pressed="${pressed}" ${disabled ? 'disabled' : ''}>${escape(label)}</button>`;
    }
    function draw() {
      if (position >= exercises.length) {
        host.innerHTML = `<p class="lx-count">Vista previa completa</p><h3>Completaste ${exercises.length} ejercicios.</h3><button type="button" class="lx-check" data-lx-command="restart">Volver a practicar</button>`;
        return;
      }
      const ex = exercises[position], isMemory = ex.type === 'memory';
      let options = '', answer = '', ready = false;
      if (isMemory) {
        if (!memory || position >= memory.end) initMemory();
        options = memory.cards.map((card,i) => {
          const solved = memory.matched.has(card.pair), revealed = memory.picked.includes(i);
          return option(solved || revealed ? card.text : 'Carta ' + (i+1), 'card', i, solved || revealed, solved);
        }).join('');
        ready = memory.picked.length === 2;
      } else if (ex.type === 'order') {
        options = ex.tokens.map((word,i) => option(word, 'token', i, ordered.includes(i), ordered.includes(i))).join('');
        answer = ordered.length ? `<div class="lx-answer">${ordered.map(i=>option(ex.tokens[i], 'remove-token', i, true)).join(' ')}</div>` : '<p class="lx-answer">Toca las palabras en orden.</p>';
        ready = ordered.length === ex.tokens.length;
      } else {
        options = ex.choices.map((text,i)=>option(text, 'choice', i, choice === i)).join('');
        ready = choice >= 0;
      }
      const feedback = checked === null ? '' : checked ? '¡Correcto!' : 'Todavía no. Intenta de nuevo.';
      host.innerHTML = `<p class="lx-count">Ejercicio ${position+1} de ${exercises.length}</p>
        <h3 class="lx-prompt">${escape(isMemory ? 'Encuentra una palabra y su significado.' : ex.prompt)}</h3>
        ${answer}<div class="lx-options lx-${ex.type}">${options}</div>
        <p class="lx-feedback" role="status">${feedback}</p>
        <button type="button" class="lx-check" data-lx-command="check" aria-disabled="${!ready && checked === null}">${checked === true ? (position+1 === exercises.length ? 'Terminar' : 'Siguiente') : checked === false ? 'Volver a intentar' : 'Comprobar'}</button>`;
    }
    function clearSelection() {
      choice = -1; ordered = []; checked = null;
      if (memory) memory.picked = [];
    }
    host.onclick = event => {
      const button = event.target.closest('[data-lx-command]');
      if (!button || !host.contains(button)) return;
      const action = button.dataset.lxCommand, index = Number(button.dataset.index);
      if (action === 'restart') {position = 0; memory = null; clearSelection(); draw(); return;}
      const ex = exercises[position];
      if (action === 'check') {
        if (checked === true) {
          if (ex.type === 'memory') memory.matched.add(memory.cards[memory.picked[0]].pair);
          position++;
          clearSelection();
        } else if (checked === false) {
          clearSelection();
        } else if (ex.type === 'memory' && memory.picked.length === 2) {
          const [a,b] = memory.picked.map(i=>memory.cards[i]);
          checked = a.pair === b.pair && a.side !== b.side;
        } else if (ex.type === 'order' && ordered.length === ex.tokens.length) {
          checked = ordered.map(i => ex.tokens[i]).join(' ') === ex.answer;
        } else if (ex.type === 'choice' && choice >= 0) {
          checked = ex.choices[choice] === ex.answer;
        } else return;
      } else if (checked !== null) return;
      else if (action === 'choice') choice = index;
      else if (action === 'token' && !ordered.includes(index)) ordered.push(index);
      else if (action === 'remove-token') ordered = ordered.filter(i => i !== index);
      else if (action === 'card') {
        if (memory.picked.includes(index)) memory.picked = memory.picked.filter(i => i !== index);
        else if (memory.picked.length < 2) memory.picked.push(index);
      }
      draw();
    };
    draw();
  }

  function bind(root,lesson,onChange) {
    const grid = root.querySelector('.lx-grid');
    if (!grid) return;
    function update(changes) {
      const merged = {...lesson,...changes};
      onChange({...changes, exercises:generate(merged).exercises});
    }
    grid.querySelectorAll('[data-lx-type]').forEach(button => {
      button.onclick = () => {
        const enabled = types(lesson), type = button.dataset.lxType;
        update({exerciseTypes:{...enabled,[type]:!enabled[type]}});
      };
    });
    const edit = grid.querySelector('[data-lx-phrases]');
    if (edit) edit.onclick = () => editPhrases(lesson,update);
    const result = generate(lesson);
    preview(grid.querySelector('.lx-phone'),result.exercises,result.error);
  }
  return {render,bind,validate,generate,types};
})();
