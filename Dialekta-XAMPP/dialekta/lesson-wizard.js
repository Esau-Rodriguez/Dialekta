"use strict";

window.DialektaWizard = (() => {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
  const blankWord = () => ({totonaco:"",spanish:"",audio:""});
  const hasWordData = word => [word.totonaco,word.spanish,word.audio,word.pronunciation].some(value => String(value || "").trim());
  const completePair = word => Boolean(word.totonaco.trim() && word.spanish.trim());
  const levels = ["A1","A2","B1"];
  const stepNames = ["Lo esencial","Palabras","Publicar"];
  function mediaURL(value) {
    if (!value) return "";
    try {
      const url = new URL(value, location.href);
      return ["http:","https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }
  function levelCode(value) {
    return String(value || "").match(/^(A1|A2|B1)(?:\b|$)/i)?.[1]?.toUpperCase() || "";
  }
  function open({lesson:source,level,onSave,onCancel,onDirty,legacyContentOnly=false}) {
    const app = document.getElementById("app");
    const original = structuredClone(source || {});
    const lesson = {
      ...original,
      title:String(original.title || ""), content:String(original.content || ""),
      minutes:original.minutes ?? 5, level:String(original.level || levelCode(level) || level || "A1"),
      native:String(original.native || ""), objectives:String(original.objectives || ""),
      cover:String(original.cover || ""), exercises:Array.isArray(original.exercises) ? original.exercises : [],
      words:(Array.isArray(original.words)?original.words:[]).map(word=>({
        ...word,totonaco:String(word.totonaco || ""),spanish:String(word.spanish || ""),audio:String(word.audio || "")
      }))
    };
    const availableLevels=[...new Set([...levels,lesson.level])];
    const header = original.title || original.id || original.status ? "Editar lección" : "Nueva lección";
    const view = document.createElement("section");
    view.className="lesson-wizard";
    shell("");
    app.querySelector(".page")?.replaceChildren(view);
    let step=0, busy=false, dirty=false, error="", details=false, player=null;
    const markDirty = () => { if (!dirty) { dirty=true; onDirty?.(true); } };
    const setBusy = value => { busy=value; view.toggleAttribute("inert",value); view.setAttribute("aria-busy",String(value)); };
    function say(message) {
      error=message;
      const target=view.querySelector(".lw-error");
      if(target){ target.textContent=message; target.hidden=!message; }
    }
    function stopAudio() { if(player){player.pause();player=null;} }
    function previewMarkup() {
      const completed=lesson.words.filter(completePair);
      if(step===0) {
        const url=mediaURL(lesson.cover);
        return `<div class="lw-cover-preview">${url?`<img src="${escape(url)}" alt="Portada de la lección">`:""}</div>
          <h3>${escape(lesson.title.trim() || "Título de la lección")}</h3>
          <span class="lw-level-badge">${escape(lesson.level)}</span>
          <p>${completed.length ? `${completed.length} ${completed.length===1?"palabra":"palabras"}` : "Aún sin palabras"}</p>`;
      }
      return `<h3>Palabras (${completed.length})</h3><div class="lw-preview-words">${completed.map(word=>`<div class="lw-preview-word"><b>${escape(word.totonaco)}</b><small>${escape(word.spanish)}</small></div>`).join("") || "<p>Aún sin palabras</p>"}</div>`;
    }
    function barMarkup() {
      const unique=new Set(lesson.words.filter(completePair).map(word=>word.totonaco.trim().toLocaleLowerCase("es").normalize("NFC")));
      const meanings=new Set(lesson.words.filter(completePair).map(word=>word.spanish.trim().toLocaleLowerCase("es").normalize("NFC")));
      const count=Math.min(4,unique.size,meanings.size);
      return `<b>${count} de 4 palabras para crear ejercicios solos</b><progress max="4" value="${count}" aria-label="Progreso para generar ejercicios"></progress>`;
    }
    function syncPreview() {
      const phone=view.querySelector(".lw-phone");
      if(phone)phone.innerHTML=previewMarkup();
      const bar=view.querySelector(".lw-progress");
      if(bar)bar.innerHTML=barMarkup();
    }
    function basicForm() {
      const coverName=lesson.cover?"Cambiar imagen de portada":"Arrastra una imagen aquí o toca para elegirla";
      return `<div class="lw-card lw-essential">
        <label class="lw-field">Título de la lección<input name="title" maxlength="160" value="${escape(lesson.title)}" placeholder="Escribe el título"></label>
        <fieldset class="lw-levels"><legend>Nivel</legend><div>${availableLevels.map(value=>`<button type="button" data-w-level="${escape(value)}" aria-pressed="${lesson.level===value}" class="lw-level ${lesson.level===value?"active":""}">${escape(value)}</button>`).join("")}</div></fieldset>
        <div class="lw-cover"><span>Portada <small>(opcional)</small></span>
          <label class="lw-upload" data-w-drop><input type="file" aria-label="Elegir portada" data-w-cover accept="image/png,image/jpeg,image/webp"><span>${coverName}<small>JPG, PNG o WebP · hasta 2 MiB</small></span></label>
          ${lesson.cover?'<button type="button" class="lw-link" data-w-action="clear-cover">Quitar portada</button>':""}
        </div>
        <details class="lw-details" ${details?"open":""}><summary>Más detalles (opcional): nombre en tutunakú, objetivos</summary>
          <div class="lw-detail-fields">
            <label class="lw-field">Nombre en tutunakú<input name="native" maxlength="160" value="${escape(lesson.native)}"></label>
            <label class="lw-field">Objetivos<textarea name="objectives" maxlength="5000">${escape(lesson.objectives)}</textarea></label>
            <label class="lw-field">Contenido o consigna<textarea name="content" maxlength="5000">${escape(lesson.content)}</textarea></label>
            <label class="lw-field">Duración estimada (minutos)<input type="number" name="minutes" min="1" max="240" step="1" value="${escape(lesson.minutes)}"></label>
          </div>
        </details></div>`;
    }
    function wordRow(index) {
      const word=lesson.words[index] || blankWord();
      const number=index+1;
      const fileButton=`<button type="button" class="lw-audio-upload" data-w-action="choose-audio" data-index="${index}" aria-label="${word.audio?"Cambiar":"Subir"} audio de la palabra ${number}">${word.audio?"Cambiar audio":"Subir audio"}</button>`;
      return `<div class="lw-word" data-w-row="${index}">
        <input data-w-key="totonaco" data-index="${index}" aria-label="Tutunakú, palabra ${number}" placeholder="Escribe y pulsa Enter" maxlength="240" value="${escape(word.totonaco)}">
        <input data-w-key="spanish" data-index="${index}" aria-label="Español, palabra ${number}" placeholder="Significado en español" maxlength="240" value="${escape(word.spanish)}">
        <div class="lw-audio">${word.audio?`<button type="button" data-w-action="play" data-index="${index}">Escuchar</button>`:fileButton}
          <input hidden type="file" data-w-audio="${index}" accept="audio/*,.webm,.m4a" aria-label="Archivo de audio para la palabra ${number}">
        </div>
        </div>`;
    }
    function wordTools() {
      const rows=lesson.words.map((word,index)=>({word,index})).filter(({word})=>hasWordData(word));
      if(!rows.length)return "";
      return `<details class="lw-word-tools"><summary>Organizar palabras y audios</summary><div>${rows.map(({word,index})=>`<div class="lw-word-tool"><b>${escape(word.totonaco||word.spanish||"Palabra "+(index+1))}</b>
        <button type="button" data-w-action="up" data-index="${index}" aria-label="Subir palabra ${index+1}" ${index===0?"disabled":""}>↑</button>
        <button type="button" data-w-action="down" data-index="${index}" aria-label="Bajar palabra ${index+1}" ${index===lesson.words.length-1?"disabled":""}>↓</button>
        ${word.audio?`<button type="button" data-w-action="choose-audio" data-index="${index}">Cambiar audio</button><button type="button" data-w-action="clear-audio" data-index="${index}">Quitar audio</button>`:""}
        <button type="button" data-w-action="remove" data-index="${index}">Quitar palabra</button>
      </div>`).join("")}</div></details>`;
    }
    function wordsForm() {
      return `<div class="lw-card lw-vocab"><p>Escribe cada palabra y su significado. El audio es opcional y se puede agregar después.</p>
        <div class="lw-word-head" aria-hidden="true"><b>Tutunakú</b><b>Español</b><b>Audio</b></div>
        <div class="lw-word-list">${Array.from({length:lesson.words.length+1},(_,i)=>wordRow(i)).join("")}</div>
        <div class="lw-progress">${barMarkup()}</div><div class="lw-tools-wrap">${wordTools()}</div></div>`;
    }
    function render() {
      stopAudio();
      const ex=window.DialektaLessonExercises;
      view.innerHTML=`<header class="lw-header"><div><h1>${header}</h1><p>Solo lo esencial. Lo demás se puede editar después.</p></div>
          <button type="button" class="lw-draft" data-w-action="draft">Guardar borrador</button></header>
        <nav class="lw-steps" aria-label="Pasos de la lección">${stepNames.map((label,i)=>`<button type="button" class="lw-step ${i===step?"active":""}" data-w-step="${i}" ${i===step?'aria-current="step"':""}>${i+1} · ${label}</button>`).join("")}</nav>
        <p class="lw-error" role="status" ${error?"":"hidden"}>${escape(error)}</p>
        ${step<2?`<div class="lw-body"><section class="lw-form">${step===0?basicForm():wordsForm()}</section>
          <aside class="lw-aside"><h2>Así lo verá el estudiante</h2><div class="lw-phone">${previewMarkup()}</div></aside></div>`
        :`<div class="lw-third">${ex?ex.render(lesson):"<p>El editor de ejercicios no está disponible. Puedes guardar tu borrador.</p>"}</div>`}
        ${step===2 && lesson.words.filter(completePair).length<4 ? `<p class="lw-short-note">${legacyContentOnly && !lesson.words.some(hasWordData) && lesson.content.trim() ? "Puedes conservar esta lección de contenido sin añadir palabras." : "Puedes publicar vocabulario con una pareja completa. Para opción múltiple y memoria, agrega al menos cuatro parejas distintas."}</p>` : ""}
        <footer class="lw-actions">${step>0?'<button type="button" data-w-action="back">Atrás</button>':'<button type="button" class="lw-cancel" data-w-action="cancel">Volver al módulo</button>'}
          <div class="lw-action-end">${step===2?'<button type="button" data-w-action="draft">Guardar borrador</button>':""} <button type="button" class="lw-primary primary" data-w-action="${step===2?"publish":"next"}">${step===2?"Publicar lección":"Continuar"}</button></div></footer>`;
      if(step===0){
        const detail=view.querySelector(".lw-details");
        detail.addEventListener("toggle",()=>{details=detail.open;});
      }
      if(step===2&&ex)ex.bind(view.querySelector(".lw-third"),lesson,change=>{
        if(Array.isArray(change))lesson.exercises=change;
        else if(change&&typeof change==="object")Object.assign(lesson,change);
        markDirty();error="";render();
      });
    }
    function ensureWord(index) {
      if(index===lesson.words.length) {
        lesson.words.push(blankWord());
        const list=view.querySelector(".lw-word-list");
        if(list)list.insertAdjacentHTML("beforeend",wordRow(index+1));
      }
      return lesson.words[index];
    }
    function setStep(next) {
      error="";step=next;render();
      window.scrollTo(0,0);
      view.querySelector('[aria-current="step"]')?.focus({preventScroll:true});
    }
    async function save(status) {
      if(busy)return;
      const words=lesson.words.filter(hasWordData).map(word=>({...word,totonaco:word.totonaco.trim(),spanish:word.spanish.trim()}));
      const title=lesson.title.trim();
      if(status==="published"){
        if(!title){setStep(0);say("Escribe el título de la lección antes de publicarla.");view.querySelector('[name="title"]').focus();return;}
        const contentOnly=legacyContentOnly && !words.length && lesson.content.trim();
        if(!contentOnly && (!words.length || words.some(word=>!completePair(word)))){
          setStep(1);say("Para publicar, completa al menos una palabra en tutunakú y español. Completa o quita las filas a medias.");return;
        }
      }
      const minutes=Number(lesson.minutes);
      if(!Number.isInteger(minutes)||minutes<1||minutes>240){
        details=true;setStep(0);say("La duración debe estar entre 1 y 240 minutos.");return;
      }
      const result={...lesson,words,title:title||"Lección sin título",minutes,status};
      const ex=window.DialektaLessonExercises;
      if(status==="published"){
        if(!ex){say("Falta el editor de ejercicios. Guarda el borrador y vuelve a abrirlo.");return;}
        const invalid=ex.validate(result);
        if(invalid){say(invalid);return;}
      }
      if(ex){
        const generation=ex.generate(result);
        if(status==="published"&&generation.error){say(generation.error);return;}
        result.exercises=generation.exercises||[];
      }
      setBusy(true);
      try { stopAudio();await onSave(result,status); } catch(e){say(e.message||"No se pudo guardar la lección.");}
      finally{setBusy(false);}
    }
    async function upload(file,index) {
      if(!file||busy)return;
      if(!file.size||file.size>2097152){say("Elige un archivo de hasta 2 MiB.");return;}
      setBusy(true);say("Subiendo archivo…");
      try {
        const session=await (await fetch("api.php?action=session",{cache:"no-store"})).json();
        const form=new FormData();
        form.append("file",file);form.append("kind",index===null?"image":"audio");
        const reply=await fetch("media.php",{method:"POST",headers:{"X-CSRF-Token":session.csrf||""},body:form});
        const data=await reply.json();
        if(!reply.ok||!data.url)throw Error(data.error||"No se pudo cargar el archivo.");
        if(!view.isConnected)return;
        if(index===null)lesson.cover=data.url;
        else ensureWord(index).audio=data.url;
        markDirty();error="";render();
      } catch(e){say(e.message||"No se pudo cargar el archivo.");}
      finally{setBusy(false);}
    }
    view.addEventListener("input",event=>{
      const input=event.target,key=input.dataset.wKey;
      if(key) {
        ensureWord(Number(input.dataset.index))[key]=input.value;
        markDirty();say("");syncPreview();
        return;
      }
      if(["title","native","objectives","content","minutes"].includes(input.name)&&input.closest(".lw-essential")){
        lesson[input.name]=input.value;markDirty();say("");syncPreview();
      }
    });
    view.addEventListener("focusout",event=>{
      if(event.target.dataset.wKey){
        const tools=view.querySelector(".lw-tools-wrap");
        if(tools && !tools.contains(event.relatedTarget))tools.innerHTML=wordTools();
      }
    });
    view.addEventListener("keydown",event=>{
      const input=event.target,key=input.dataset.wKey;
      if(!key||event.key!=="Enter"||event.isComposing)return;
      event.preventDefault();
      const index=Number(input.dataset.index);
      if(key==="totonaco")view.querySelector(`[data-w-key="spanish"][data-index="${index}"]`)?.focus();
      else view.querySelector(`[data-w-key="totonaco"][data-index="${Math.min(index+1,lesson.words.length)}"]`)?.focus();
    });
    view.addEventListener("change",event=>{
      const input=event.target,file=input.files?.[0];
      if(input.hasAttribute("data-w-cover"))upload(file,null);
      else if(input.hasAttribute("data-w-audio"))upload(file,Number(input.dataset.wAudio));
    });
    view.addEventListener("dragover",event=>{
      const drop=event.target.closest("[data-w-drop]");if(drop){event.preventDefault();drop.classList.add("dragging");}
    });
    view.addEventListener("dragleave",event=>{event.target.closest("[data-w-drop]")?.classList.remove("dragging");});
    view.addEventListener("drop",event=>{
      const drop=event.target.closest("[data-w-drop]");if(!drop)return;
      event.preventDefault();drop.classList.remove("dragging");upload(event.dataTransfer?.files?.[0],null);
    });
    view.addEventListener("click",async event=>{
      if(busy)return;
      const control=event.target.closest("button");
      if(!control || control.disabled)return;
      const {wAction:action,wStep,wLevel,index:rawIndex}=control.dataset;
      if(wStep!==undefined){setStep(Number(wStep));return;}
      if(wLevel){lesson.level=wLevel;markDirty();view.querySelectorAll("[data-w-level]").forEach(b=>{const active=b.dataset.wLevel===wLevel;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});syncPreview();return;}
      const index=Number(rawIndex);
      if(action==="next"||action==="back"){setStep(step+(action==="next"?1:-1));return;}
      if(action==="draft"||action==="publish"){await save(action==="draft"?"draft":"published");return;}
      if(action==="cancel"){if(!dirty||confirm("¿Salir de la lección y descartar los cambios sin guardar?")){stopAudio();onCancel();}return;}
      if(action==="choose-audio"){view.querySelector(`[data-w-audio="${index}"]`)?.click();return;}
      const word=lesson.words[index];
      if(action==="play"&&word){
        stopAudio();const url=mediaURL(word.audio);if(!url){say("Ese audio ya no está disponible.");return;}
        player=new Audio(url);try{await player.play();}catch{say("No se pudo reproducir el audio. Revisa el archivo.");}return;
      }
      if(action==="clear-cover")lesson.cover="";
      else if(action==="clear-audio"&&word)word.audio="";
      else if(action==="remove"&&word)lesson.words.splice(index,1);
      else if(action==="up"&&word&&index>0)[lesson.words[index-1],lesson.words[index]]=[word,lesson.words[index-1]];
      else if(action==="down"&&word&&index<lesson.words.length-1)[lesson.words[index+1],lesson.words[index]]=[word,lesson.words[index+1]];
      else return;
      markDirty();error="";render();
    });
    render();document.title=`${header} · Dialekta`;window.scrollTo(0,0);
  }
  return {open};
})();
