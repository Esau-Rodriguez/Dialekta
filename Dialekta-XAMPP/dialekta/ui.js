"use strict";
const app=document.querySelector("#app");
const dialog=document.querySelector("#preview");
const screen=document.querySelector("#screen");
const steps=["Información del Módulo","Didáctica y Fonética","Prácticas Interactivas","Configuración del Test"];
const states={draft:"Borrador",review:"En revisión",published:"Publicado"};
const levels=["A1","A2","B1","B2","C1","C2"];
const state={user:null,csrf:"",modules:[],route:"login",step:0,record:null,query:"",status:"",level:"",page:1,dirty:false,token:"",busy:false};
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const el=id=>document.getElementById(id);
const btn=(text,action,style="",attributes="")=>`<button type="button" class="${style}" data-act="${action}" ${attributes}>${text}</button>`;
const ico=name=>`<svg class="ico" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const opts=(items,current)=>items.map(([value,label])=>`<option value="${esc(value)}"${value===current?" selected":""}>${esc(label)}</option>`).join("");
const badge=status=>`<span class="badge ${status==="published"?"pub":""}">${esc(states[status]||status)}</span>`;
const logo=`<img src="assets/logo.png" class="logo" alt="">`;
const brand=`<div class="brand">${logo}<span>Dialekta<small>ADMIN TUTUNAKÚ</small></span></div>`;
let timer;
function notice(message){el("notice").textContent=message;clearTimeout(timer);timer=setTimeout(()=>el("notice").textContent="",6500)}
async function api(action,body,id){
  const url=new URL("api.php",location.href);
  url.searchParams.set("action",action);
  if(id!==undefined)url.searchParams.set("id",id);
  const options={credentials:"same-origin",cache:"no-store"};
  if(body!==undefined)Object.assign(options,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":state.csrf},body:JSON.stringify(body)});
  const response=await fetch(url,options);
  let result;
  try{result=await response.json()}catch{throw Error("No se pudo leer la respuesta del servidor. Abre el proyecto desde Apache en XAMPP.")}
  if(result.csrf)state.csrf=result.csrf;
  if(!response.ok||result.error){
    const error=new Error(result.error||"Falló la solicitud.");
    error.code=result.code;
    throw error;
  }
  return result;
}
async function reloadList(){state.modules=(await api("list")).modules}
function auth(){
  const route=state.route;
  const login=route==="login",recover=route==="recover",reset=route==="reset";
  const title=login?"Panel Administrativo Dialekta":recover?"Recuperar contraseña":reset?"Nueva contraseña":"Bandeja de recuperación local";
  const intro=login?"Sistema de Gestión y Preservación de la Lengua Totonaca <em>(Tachiwin Tutunakú)</em>":recover?"Indica el correo de tu cuenta de administración.":reset?"Elige una nueva contraseña para tu cuenta.":"Consulta aquí el mensaje de prueba generado para este equipo.";
  const email=`<label>Correo institucional<input name="email" required type="email" placeholder="admin@dialekta.edu.mx" autocomplete="username"></label>`;
  const password=`<label>${reset?"Nueva contraseña":"Contraseña de seguridad"}<span class="pass"><input id="password" name="password" type="password" required ${reset?'minlength="8"':''} autocomplete="${reset?"new-password":"current-password"}">${btn("Mostrar","toggle-pass")}</span></label>`;
  app.innerHTML=`<section class="authwrap"><article class="authcard"><img src="assets/logo.png" class="authlogo" alt="Dialekta"><h1>${title}</h1><p class="hint">${intro}</p>${login?'<p class="authbadge">Acceso restringido · Personal autorizado</p>':""}<form class="stack" id="authform">${login||recover?email:""}${login||reset?password:""}${reset?'<label>Confirmar contraseña<input type="password" name="confirm" autocomplete="new-password" required minlength="8"></label>':""}${login?btn("¿Olvidó su contraseña?","recover","quiet right"):""}${route==="mail"?(state.token?btn("Abrir enlace de recuperación","reset","primary"):'<p>Si la cuenta existe, el administrador local puede consultar su enlace de recuperación.</p>'):`<button class="primary" type="submit">${login?"Iniciar sesión":recover?"Solicitar recuperación":"Guardar contraseña"}</button>`}${!login?btn("← Volver al inicio de sesión","login","quiet"):""}</form></article></section>`;
  document.title=title+" · Dialekta";
}
function shell(content){
  const current=state.route;
  const nav=(act,label,icon,selected=current===act)=>btn(ico(icon)+label,act,selected?"active":"",selected?'aria-current="page"':"");
  app.innerHTML=`<div class="layout"><aside class="sidebar">${brand}<nav class="nav" aria-label="Administración"><small>ADMINISTRACIÓN</small>${nav("dashboard","Dashboard","dashboard")}${nav("catalog","Gestión de Módulos","folder")}${nav("new","Constructor de Módulos","book",current==="editor")}<a href="equipo.php">${ico("users")}Equipo editorial</a></nav><div class="identity"><strong>${esc(state.user.name)}</strong><small>${esc(state.user.email)}</small>${btn(ico("logout")+"Cerrar sesión","logout","logout")}</div></aside><div class="main"><header class="topbar"><form id="headersearch" class="header-search">${ico("search")}<input name="q" type="search" placeholder="Buscar módulos por título o descripción…" aria-label="Buscar módulos"><button type="submit">Buscar</button></form><span class="profile">${esc(state.user.name)}<small>Administración editorial</small></span></header><section class="page">${content}</section></div></div>`;
  document.title=(current==="editor"?"Constructor":current==="catalog"?"Gestión de Módulos":"Dashboard")+" · Dialekta";
}
function metrics(){
  const metrics=[["Total de módulos",state.modules.length],["Total de lecciones",state.modules.reduce((n,m)=>n+Number(m.lesson_count||0),0)],["Publicados",state.modules.filter(m=>m.status==="published").length],["En revisión",state.modules.filter(m=>m.status==="review").length]];
  return `<div class="metrics">${metrics.map(([label,count],i)=>`<article class="metric"><div class="metric-icon">${ico(["folder","book","check","audio"][i])}</div><span>${label}</span><b>${count}</b></article>`).join("")}</div>`;
}
function dashboard(){
  state.route="dashboard";
  shell(`<div class="heading"><div><h1>Resumen del panel</h1><p>Actividad editorial y módulos de aprendizaje de totonaco.</p></div></div>${metrics()}<section class="hero"><img src="assets/comunidad.png" alt=""><h2>Currículo Tachiwin Tutunakú</h2><p>Organiza las lecciones, sus recursos didácticos y las evaluaciones para la app móvil.</p>${btn("Gestionar módulos →","catalog")}</section><section class="panel"><div class="sectionhead"><h2>Últimos módulos actualizados</h2>${btn("Ver catálogo →","catalog","quiet")}</div>${table(state.modules.slice(0,5))}</section>`);
}
function table(rows){
  if(!rows.length)return '<p class="empty">No hay módulos que mostrar.</p>';
  return `<div class="tablewrap"><table><thead><tr><th>Módulo y nivel</th><th>Estado</th><th>Actualización</th><th>Acciones</th></tr></thead><tbody>${rows.map(m=>`<tr><td><div class="modtitle"><img alt="" src="assets/modulo-${(Math.max(1,Number(m.id))-1)%5}.png"><span><strong>${esc(m.title)}</strong><small>${esc(m.level)}</small></span></div></td><td>${badge(m.status)}</td><td><time>${esc((m.updated_at||"").slice(0,10))}</time></td><td><div class="ops">${btn("Editar","edit","","data-id="+Number(m.id))}${btn("Eliminar","delete","danger","data-id="+Number(m.id))}</div></td></tr>`).join("")}</tbody></table></div>`;
}
function filtered(){
  const fold=s=>String(s??"").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const needle=fold(state.query);
  const rows=state.modules.filter(m=>fold(m.title+" "+m.description).includes(needle)&&(!state.level||state.level===m.level)&&(!state.status||state.status===m.status));
  const max=Math.max(1,Math.ceil(rows.length/6));
  state.page=Math.min(Math.max(1,state.page),max);
  return table(rows.slice((state.page-1)*6,state.page*6))+`<div class="pager">${btn("Anterior","prev","",state.page===1?"disabled":"")}<small>Página ${state.page} de ${max} · ${rows.length} módulos</small>${btn("Siguiente","next","",state.page===max?"disabled":"")}</div>`;
}
function catalog(){
  state.route="catalog";
  const known=[...new Set([...levels,...state.modules.map(m=>m.level).filter(Boolean)])];
  shell(`<section class="panel heading"><div><h1>Gestión de Módulos Educativos</h1><p>Administra unidades temáticas, niveles y publicación en la app móvil.</p></div>${btn("+ Crear nuevo módulo","new","primary")}</section>${metrics()}<section class="panel"><h2>Catálogo de módulos</h2><div class="filters"><label>Buscar módulo<input id="query" type="search" placeholder="Título o descripción" value="${esc(state.query)}"></label><label>Estado<select id="status">${opts([["","Todos los estados"],...Object.entries(states)],state.status)}</select></label><label>Nivel<select id="level">${opts([["","Todos los niveles"],...known.map(l=>[l,l])],state.level)}</select></label></div><div id="results">${filtered()}</div></section>`);
}
function makeRecord(source={}){
  const empty={category:"",native:"",place:"",goals:"",tags:"",cover:"",resources:[],lessons:[],phonemes:[],phrases:[],morphology:"",context:"",exercises:[],questions:[],passScore:80,reward:"",attempts:3,time:15};
  return {...{title:"",description:"",level:"A1",status:"draft"},...source,data:{...empty,...source.data}};
}
function pathValue(path){return path.split(".").reduce((o,k)=>o?.[k],state.record)}
function put(path,value){
  if(!state.record||!path)return;
  const keys=path.split(".");
  const target=keys.slice(0,-1).reduce((o,k)=>o?.[k],state.record);
  if(!target)return;
  target[keys.at(-1)]=value;state.dirty=true;
}
function field(path,label,type="text",extra=""){
  const value=pathValue(path)??"";
  return `<label>${esc(label)}${type==="area"?`<textarea data-key="${path}" ${extra}>${esc(value)}</textarea>`:`<input data-key="${path}" type="${type}" value="${esc(value)}" ${extra}>`}</label>`;
}
function selectField(path,label,items){
  let options=items.map(x=>Array.isArray(x)?x:[x,x]);
  const current=pathValue(path)??options[0]?.[0];
  if(current&&!options.some(([v])=>v===current))options=[[current,current],...options];
  return `<label>${esc(label)}<select data-key="${path}">${opts(options,current)}</select></label>`;
}
function media(path,label,kind){return window.DialektaMedia?.field(path,label,pathValue(path)||"",kind)||field(path,label)}
function panel(title,body){return `<section class="panel"><h2>${title}</h2><div class="stack">${body}</div></section>`}
const lists={
  resources:{label:"recurso gráfico",initial:{name:"",url:""}},
  phonemes:{label:"fonema",initial:{sound:"",word:"",audio:""}},
  phrases:{label:"locución",initial:{word:"",meaning:"",audio:""}},
  exercises:{label:"ejercicio",initial:{type:"Selección múltiple",prompt:"",answer:"",choices:"",feedback:""}},
  questions:{label:"reactivo",initial:{prompt:"",answer:"",choices:"",feedback:""}}
};
function entry(key,index){
  const p="data."+key+"."+index+".", item=state.record.data[key][index];
  if(!item||typeof item!=="object")return "<small>Registro heredado sin campos editables.</small>";
  if(key==="resources")return field(p+"name","Descripción")+media(p+"url","Ilustración","image");
  if(key==="phonemes")return `<div class="grid2">${field(p+"sound","Fonema o rasgo acústico")}${field(p+"word","Ejemplo y articulación")}</div>${media(p+"audio","Pronunciación","audio")}`;
  if(key==="phrases")return `<div class="grid2">${field(p+"word","Expresión en totonaco")}${field(p+"meaning","Traducción al español")}</div>${media(p+"audio","Locución nativa","audio")}`;
  return (key==="exercises"?selectField(p+"type","Tipo de ejercicio",["Selección múltiple","Discriminación auditiva","Emparejamiento","Construcción sintáctica","Respuesta libre"]):"")+field(p+"prompt",key==="questions"?"Enunciado del reactivo":"Instrucción para el estudiante","area")+field(p+"answer","Respuesta correcta")+field(p+"choices","Opciones alternativas (una por línea)","area")+field(p+"feedback","Retroalimentación al acertar")+(key==="exercises"?media(p+"audio","Audio del ejercicio","audio"):"");
}
function collection(key){
  const rows=state.record.data[key],meta=lists[key];
  const block=rows.map((_,i)=>`<article class="entry"><div class="sectionhead"><b>${esc(meta.label.charAt(0).toUpperCase()+meta.label.slice(1))} ${i+1}</b><div class="ops">${btn("↑","up","",`data-list="${key}" data-i="${i}" aria-label="Subir" ${i===0?"disabled":""}`)}${btn("↓","down","",`data-list="${key}" data-i="${i}" aria-label="Bajar" ${i===rows.length-1?"disabled":""}`)}${btn("Quitar","remove","danger",`data-list="${key}" data-i="${i}"`)}</div></div>${entry(key,i)}</article>`).join("");
  return `<div class="collection">${block}${btn("+ Agregar "+meta.label,"add","",`data-list="${key}"`)}</div>`;
}
function general(){
  return panel("Datos generales de la unidad",`<div class="grid2">${field("title","Título del módulo en español","text",'maxlength="180" required')}${field("data.native","Nombre en Tachiwin Tutunakú")}${selectField("level","Nivel de competencia lingüística",levels)}${field("data.place","Ubicación en el árbol curricular")}</div>`)+panel("Descripción pedagógica y metas",field("description","Resumen para el estudiante","area")+field("data.goals","Objetivos de competencia comunicativa","area")+field("data.tags","Palabras clave y etiquetas"))+panel("Portada y recursos gráficos",media("data.cover","Portada del módulo","image")+field("data.category","Categoría temática")+collection("resources"));
}
function phonetics(){
  return panel("Rasgos acústicos y fonemas clave",collection("phonemes"))+panel("Banco didáctico «Escucha y repite»",collection("phrases"))+panel("Estructuras gramaticales y morfología",field("data.morphology","Regla y ejemplos para el estudiante","area"))+panel("Contexto y sabiduría comunitaria",field("data.context","Narrativa de transmisión ancestral","area")+media("data.communityImage","Imagen de la comunidad","image"));
}
function evaluation(){
  return panel("Parámetros de la evaluación",field("data.testTitle","Título de la evaluación")+`<div class="grid3">${field("data.passScore","Puntuación mínima (%)","number",'min="1" max="100"')}${field("data.time","Tiempo límite (minutos)","number",'min="1"')}${field("data.attempts","Intentos permitidos","number",'min="1"')}</div>`)+panel("Gestor de reactivos del test",collection("questions"))+panel("Criterios de aprobación y recompensas",field("data.reward","Recompensa al aprobar","area")+field("data.retry","Ruta de repaso","area"));
}
function editor(){ if(state.advanced) advancedEditor(); else moduleEditor(); }
function advancedEditor(){
  const r=state.record;
  state.route="editor";
  shell(`<div class="heading"><div>${btn("← Ficha del módulo","simple")}<h1>Contenido avanzado</h1><p>${esc(r.title||"Nuevo módulo")} · ${badge(r.status)}</p></div><div class="ops">${btn("Vista previa móvil","preview")}${btn("Guardar avance","save","primary")}</div></div><nav class="steps" aria-label="Pasos del constructor">${steps.map((s,i)=>btn(`<small>Paso ${i+1}</small>${esc(s)}`,"step",i===state.step?"active":"",`data-i="${i}"`)).join("")}</nav><div class="editor-grid"><div id="editorform">${[general,phonetics,()=>panel("Prácticas y ejercicios interactivos",collection("exercises")),evaluation][state.step]()}</div><aside class="editor-preview"><section class="panel"><h2>Simulación en vivo</h2><div id="inlinepreview"></div></section></aside></div><div class="editorfoot">${btn("← Catálogo","catalog")}<div class="ops">${state.step?btn("Anterior","step","",`data-i="${state.step-1}"`):""}${state.step<3?btn("Siguiente →","step","primary",`data-i="${state.step+1}"`):`${btn("Guardar borrador","draft")}${btn("Enviar a revisión","review")}${btn("Publicar módulo","publish","primary")}`}</div></div>`);
  if(el("inlinepreview"))preview(false);
}
function previewURL(value,kind){
  if(typeof value!=="string"||!value)return "";
  if(new RegExp("^data:"+kind+"/(?:png|jpe?g|gif|webp|mpeg|mp4|ogg|webm|wav);base64,","i").test(value))return value;
  try{const u=new URL(value,location.href);if(["http:","https:"].includes(u.protocol))return u.href}catch{}
  return "";
}
let currentPreview=0;
function preview(modal=true){
  const r=state.record,d=r.data,key=state.step===2?"exercises":"questions",items=d[key],item=items[currentPreview];
  const cover=previewURL(d.cover,"image")||"assets/portada.png";
  const audio=v=>{const url=previewURL(v,"audio");return url?`<audio controls preload="none" src="${esc(url)}"></audio>`:""};
  let body="";
  if(state.step===0)body=`<img src="${esc(cover)}" class="cover" alt=""><h2>${esc(d.native||r.title||"Nuevo módulo")}</h2><p>${esc(r.description)}</p><div class="sample">${esc(d.goals||"Sin objetivos registrados.")}</div>`;
  if(state.step===1)body=`<h2>Escucha y repite</h2>${[...d.phonemes,...d.phrases].map(x=>`<div class="sample"><b>${esc(x.sound||x.word)}</b><p>${esc(x.meaning||x.word)}</p>${audio(x.audio)}</div>`).join("")||"<p>Agrega fonemas o locuciones para escucharlos aquí.</p>"}<p>${esc(d.morphology)}</p><p>${esc(d.context)}</p>`;
  if(state.step>=2){
    const choices=item?[...new Set([...String(item.choices||"").split(/\r?\n/),item.answer].map(s=>String(s||"").trim()).filter(Boolean))]:[];
    body=item?`<small>${state.step===2?"Ejercicio":"Reactivo"} ${currentPreview+1} de ${items.length}</small><h2>${esc(item.prompt||"Sin enunciado")}</h2>${audio(item.audio)}${item.type==="Respuesta libre"||choices.length<2?'<label>Tu respuesta<input data-tryanswer></label>':`<label>Elige una opción<select data-tryanswer>${opts([["","Seleccionar"],...choices.map(c=>[c,c])],"")}</select></label>`}${btn("Comprobar","check","primary")}<p data-feedback role="status"></p><div class="ops">${btn("Anterior","sampleprev","",currentPreview===0?"disabled":"")}${btn("Siguiente","samplenext","",currentPreview===items.length-1?"disabled":"")}</div>`:"<p>Agrega un elemento para iniciar la simulación.</p>";
  }
  const target=modal?screen:el("inlinepreview");
  if(target)target.innerHTML=`<div class="phone">${body}</div>`;
  if(modal&&!dialog.open)dialog.showModal();
}
function canLeave(){return !state.dirty||confirm("Hay cambios sin guardar. ¿Salir del editor y descartarlos?")}
async function persist(status){
  const rec=state.record;
  if(!rec.title.trim())throw Error("Escribe el título del módulo en el paso 1.");
  for(const node of app.querySelectorAll("input[type=number]"))if(!node.reportValidity())return;
  const result=await api("save",{...rec,status});
  state.record=makeRecord(result.module);state.dirty=false;
  await reloadList();
  editor();notice(status==="published"?"Módulo publicado.":status==="review"?"Módulo enviado a revisión.":"Cambios guardados.");
}
async function act(button){
  const a=button.dataset.act,i=Number(button.dataset.i),key=button.dataset.list;
  if(await moduleAction(button))return;
  if(a==="toggle-pass"){const input=el("password");input.type=input.type==="password"?"text":"password";button.textContent=input.type==="text"?"Ocultar":"Mostrar";return}
  if(["login","recover","reset"].includes(a)){state.route=a;auth();return}
  if(a==="close-dialog"){dialog.close();preview(false);return}
  if(a==="preview"){currentPreview=0;preview();return}
  if(a==="check"){const current=state.record.data[state.step===2?"exercises":"questions"][currentPreview];const phone=button.closest(".phone");const value=phone.querySelector("[data-tryanswer]").value.trim();phone.querySelector("[data-feedback]").textContent=!value?"Escribe o elige una respuesta.":value.toLocaleLowerCase("es")===String(current.answer||"").trim().toLocaleLowerCase("es")?(current.feedback||"¡Respuesta correcta!"):"Inténtalo de nuevo.";return}
  if(a==="sampleprev"||a==="samplenext"){currentPreview+=a==="samplenext"?1:-1;preview(dialog.open);return}
  if(a==="prev"||a==="next"){state.page+=a==="next"?1:-1;el("results").innerHTML=filtered();return}
  if(["catalog","dashboard","new","edit","logout"].includes(a)&&state.route==="editor"&&!canLeave())return;
  if(a==="logout"){await api("logout",{});Object.assign(state,{user:null,record:null,dirty:false,token:"",route:"login"});auth();return}
  if(a==="catalog"||a==="dashboard"){await reloadList();state.dirty=false;(a==="catalog"?catalog:dashboard)();window.scrollTo(0,0);return}
  if(a==="new"||a==="edit"){const record=a==="new"?{}:(await api("get",undefined,button.dataset.id)).module;state.record=makeRecord(record);state.advanced=false;state.step=0;currentPreview=0;state.dirty=false;editor();window.scrollTo(0,0);return}
  if(a==="delete"){
    const rec=state.modules.find(m=>Number(m.id)===Number(button.dataset.id));
    if(rec&&confirm(`¿Eliminar «${rec.title}» y su contenido?`)){await api("delete",{id:rec.id,version:rec.version});await reloadList();(state.route==="catalog"?catalog:dashboard)();notice("Módulo eliminado.")}
    return;
  }
  if(a==="step"){state.step=i;currentPreview=0;editor();window.scrollTo(0,0);return}
  if(["save","draft","publish","review"].includes(a)){await persist(({save:state.record.status,draft:"draft",publish:"published",review:"review"})[a]);return}
  if(key&&Object.hasOwn(lists,key)){
    const rows=state.record.data[key];
    if(a==="add")rows.push({...lists[key].initial});
    if(a==="remove"&&confirm("¿Quitar este elemento del módulo?"))rows.splice(i,1);
    if(a==="up"&&i>0)[rows[i],rows[i-1]]=[rows[i-1],rows[i]];
    if(a==="down"&&i<rows.length-1)[rows[i],rows[i+1]]=[rows[i+1],rows[i]];
    state.dirty=true;editor();
  }
}
document.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-act]");
  if(!button||state.busy)return;
  state.busy=true;
  try{await act(button)}catch(e){notice(e.message)}finally{state.busy=false}
});
document.addEventListener("input",event=>{
  const target=event.target;
  if(target.dataset.key){put(target.dataset.key,target.type==="number"&&target.value!==""?Number(target.value):target.value);if(el("inlinepreview"))preview(false);if(target.dataset.key==="title")updateRouteTitle();return}
  if(["query","status","level"].includes(target.id)){state[target.id]=target.value;state.page=1;el("results").innerHTML=filtered()}
});
document.addEventListener("submit",async event=>{
  if(event.target.id==="headersearch"){event.preventDefault();if(state.route==="editor"&&!canLeave())return;state.dirty=false;state.query=new FormData(event.target).get("q")||"";state.level="";state.status="";state.page=1;catalog();return}
  if(event.target.id!=="authform")return;
  event.preventDefault();
  if(state.busy)return;state.busy=true;
  const fields=Object.fromEntries(new FormData(event.target));
  try{
    if(state.route==="login"){const result=await api("login",fields);state.user=result.user;await reloadList();dashboard()}
    else if(state.route==="recover"){const result=await api("recover",{email:fields.email});state.token=result.token||"";state.route="mail";auth();notice(result.message||"Solicitud registrada.")}
    else if(state.route==="reset"){if(fields.password!==fields.confirm)throw Error("Las contraseñas deben coincidir.");await api("reset",{token:state.token,password:fields.password});state.token="";state.route="login";auth();notice("Contraseña actualizada. Ya puedes iniciar sesión.")}
  }catch(e){notice(e.message)}finally{state.busy=false}
});
window.addEventListener("beforeunload",e=>{if(state.dirty){e.preventDefault();e.returnValue=""}});
window.DialektaMedia?.bind(document,(path,value)=>{if(state.record&&state.route==="editor"){put(path,value);editor()}},notice);

(async()=>{try{const result=await api("session");state.user=result.user;if(state.user){await reloadList();dashboard()}else auth()}catch(e){app.innerHTML=`<div class="authwrap"><section class="authcard"><h1>Conexión pendiente</h1><p>${esc(e.message)}</p><p>Inicia Apache y MySQL, importa la base de datos y abre el proyecto desde localhost.</p><button type="button" onclick="location.reload()">Reintentar</button></section></div>`}})();


