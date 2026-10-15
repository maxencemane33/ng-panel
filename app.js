import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,collection,doc,onSnapshot,addDoc,setDoc,updateDoc,deleteDoc,writeBatch,getDoc}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import{firebaseConfig,SHARED_EMAIL}from"./firebase-config.js";
import{SEED}from"./data.js";

const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore(auth.app);
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const fmt=n=>Number(n||0).toLocaleString("fr-FR"),num=v=>Math.max(0,parseFloat(v)||0);
const opts=a=>a.map(x=>`<option>${x}</option>`).join("");
const S={crafts:{},res:{},jobs:[],trades:[],schems:[]};
const blank=()=>({id:"",name:"",out:1,ing:[["",1]]});let ed=blank();
let tab="crafts",pseudo=localStorage.getItem("ng-pseudo")||"",sel="",pending=false,started=false;
const TABS=[["crafts","🔨","Crafts","#3ddc84"],["recipes","📖","Recettes","#a78bfa"],["res","📦","Ressources","#ffb020"],["trades","🎯","Trades","#ff5fa2"],["schems","🏗️","Schématics","#38bdf8"]];
const toast=m=>{const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",2800)};
const run=async f=>{try{await f()}catch(e){toast("Erreur : "+(e.code||e.message))}};

// ---------- calcul des ressources
function calc(name,qty,deep){const need={};const rec=(n,q)=>{const c=S.crafts[n];if(!c)return;const runs=Math.ceil(q/c.out);for(const[i,a]of c.ing){const t=a*runs;if(deep&&S.crafts[i])rec(i,t);else need[i]=(need[i]||0)+t}};rec(name,qty);return Object.entries(need).sort((a,b)=>b[1]-a[1])}
const stacks=n=>n>=64?` (${Math.floor(n/64)}×64${n%64?"+"+n%64:""})`:"";
function needs(l){let tot=0;const h=l.map(([k,v])=>{const r=S.res[k]||{},ok=(r.stock||0)>=v;if(r.price)tot+=v*r.price;return`<div class="need${ok?" ok":""}"><b>${fmt(v)}</b><span>${esc(k)}</span><small>${ok?"✓ en stock":"stock : "+fmt(r.stock)}${stacks(v)}${r.price?" · "+fmt(v*r.price)+" $":""}</small></div>`}).join("");return`<div class="grid">${h}</div>${tot?`<p class="mut">Coût estimé : <b>${fmt(tot)} $</b></p>`:""}`}
function prev(){const q=$("#q")?.value??sel;if(!S.crafts[q])return`<div class="empty" style="margin-top:14px">Choisis un craft pour voir les ressources nécessaires et ce qui est déjà en stock.</div>`;return needs(calc(q,Math.max(1,parseInt($("#n")?.value)||1),$("#d")?.checked??true))}

// ---------- vues
const V={
crafts(){const names=Object.keys(S.crafts).sort(),jobs=[...S.jobs].sort((a,b)=>b.at-a.at),agg={};
const cards=jobs.map(j=>{const nd=calc(j.craft,j.qty,j.deep),tot=nd.reduce((s,[,v])=>s+v,0),done=nd.reduce((s,[k,v])=>s+Math.min(v,j.got?.[k]||0),0),pc=tot?Math.round(done/tot*100):0;
nd.forEach(([k,v])=>{const r=v-(j.got?.[k]||0);if(r>0)agg[k]=(agg[k]||0)+r});
return`<article class="job"><div class="jh"><div><h3><em>${fmt(j.qty)}×</em> ${esc(j.craft)}</h3><span class="mut">${pc}% farmé${j.by?" · par "+esc(j.by):""}</span></div><button class="ghost" data-act="del" data-c="jobs" data-id="${j.id}">Supprimer</button></div><div class="bar"><i style="width:${pc}%"></i></div><div class="lines">${nd.map(([k,v])=>{const g=j.got?.[k]||0;return`<div class="ln${g>=v?" done":""}"><div class="nm">${esc(k)}<small>${fmt(Math.min(g,v))} / ${fmt(v)}</small></div><input type="number" min="0" value="${g}" data-job="${j.id}" data-k="${esc(k)}"><button class="ghost" title="Tout récolté" data-act="fill" data-job="${j.id}" data-k="${esc(k)}" data-v="${v}">✓</button></div>`}).join("")}</div></article>`}).join("");
const rest=Object.entries(agg).sort((a,b)=>b[1]-a[1]);
return`<section class="panel"><h2>Calculateur de craft</h2><form data-f="job" class="row"><label class="grow">Craft<input name="c" id="q" list="cl" value="${esc(sel)}" placeholder="Tracteur, Iron plate…" autocomplete="off"></label><label>Quantité<input name="n" id="n" type="number" min="1" value="1"></label><label class="chk"><input type="checkbox" id="d" name="d" checked>Décomposer les sous-crafts</label><button class="btn">＋ Ajouter aux crafts en cours</button></form><datalist id="cl">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist><div id="prev">${prev()}</div>${names.length?"":`<div class="empty" style="margin-top:14px">Aucune recette pour l'instant. <button class="btn" data-act="seed">Importer les recettes de départ</button></div>`}</section>
<h2>Crafts en cours (${jobs.length})</h2>${rest.length?`<section class="panel" style="border-top-color:var(--warn)"><h2>Reste à farmer, tous crafts confondus</h2><div class="grid" style="margin-top:0">${rest.map(([k,v])=>`<div class="need"><b>${fmt(v)}</b><span>${esc(k)}</span><small>${stacks(v)||"&nbsp;"}</small></div>`).join("")}</div></section>`:""}${cards||`<div class="empty">Rien en cours. Ajoute un craft avec le calculateur ☝️</div>`}`},

recipes(){const names=Object.keys(S.crafts).sort((a,b)=>a.localeCompare(b)),isNew=!ed.id;
const rows=ed.ing.map(([n,q],i)=>`<div class="row" style="margin-top:8px"><label class="grow">Ingrédient<input list="il" value="${esc(n)}" data-ri="${i}" data-rf="n" autocomplete="off" placeholder="Iron plate, Caoutchouc…"></label><label>Quantité<input type="number" min="1" value="${esc(q)}" data-ri="${i}" data-rf="q"></label><button type="button" class="ghost" data-act="rrow-del" data-i="${i}">✕</button></div>`).join("");
const list=names.map(n=>{const c=S.crafts[n];return`<tr><td><b>${esc(n)}</b></td><td>${fmt(c.out)}</td><td>${c.ing.map(([a,q])=>fmt(q)+"× "+esc(a)).join(", ")}</td><td style="white-space:nowrap"><button type="button" class="ghost" data-act="redit" data-n="${esc(n)}">Modifier</button> <button type="button" class="ghost" data-act="rdel" data-n="${esc(n)}">✕</button></td></tr>`}).join("");
return`<section class="panel"><h2>${isNew?"Nouvelle recette":"Modifier : "+esc(ed.name)}</h2><form data-f="recipe"><div class="row"><label class="grow">Nom du craft<input id="rn" value="${esc(ed.name)}"${isNew?"":" readonly"} required autocomplete="off" placeholder="Ex : Moissonneuse"></label><label>Quantité produite<input id="ro" type="number" min="1" value="${esc(ed.out)}"></label></div>${rows}<div class="row" style="margin-top:12px"><button type="button" class="ghost" data-act="rrow-add">＋ Ingrédient</button><button class="btn">${isNew?"Créer la recette":"Enregistrer les modifications"}</button>${isNew?"":`<button type="button" class="ghost" data-act="rnew">Annuler</button>`}</div></form>${isNew?"":`<p class="mut">Le nom ne se change pas ici (les crafts en cours l'utilisent). Pour renommer : crée une nouvelle recette, puis supprime l'ancienne.</p>`}<datalist id="il">${[...new Set([...Object.keys(S.crafts),...Object.keys(S.res)])].sort().map(n=>`<option value="${esc(n)}">`).join("")}</datalist></section>
<input id="f" class="search" placeholder="Filtrer les recettes…"><div class="scroll"><table><tr><th>Craft</th><th>Produit</th><th>Ingrédients</th><th></th></tr>${list||`<tr><td colspan="4" class="mut">Aucune recette. Importe les recettes de départ dans l'onglet Crafts.</td></tr>`}</table></div>`},

res(){const rs=Object.values(S.res).sort((a,b)=>a.name.localeCompare(b.name));
return`<section class="panel"><h2>Ajouter ou mettre à jour une ressource</h2><form data-f="res" class="row"><label class="grow">Nom<input name="name" list="rl" required autocomplete="off" placeholder="Commence à écrire…"></label><label>Prix<input name="price" type="number" min="0" step="any"></label><label>Stock du pays<input name="stock" type="number" min="0"></label><button class="btn">Enregistrer</button></form><p class="mut">Pour une ressource existante, un champ laissé vide n'est pas modifié.</p></section>
<input id="f" class="search" placeholder="Filtrer les ressources…"><div class="scroll"><table><tr><th>Ressource</th><th>Prix</th><th>Stock</th><th></th></tr>${rs.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td><input type="number" min="0" step="any" value="${r.price||0}" data-res="price" data-id="${r.id}"></td><td><input type="number" min="0" value="${r.stock||0}" data-res="stock" data-id="${r.id}"></td><td><button class="ghost" data-act="del" data-c="res" data-id="${r.id}">✕</button></td></tr>`).join("")||`<tr><td colspan="4" class="mut">Aucune ressource. Importe les recettes dans l'onglet Crafts.</td></tr>`}</table></div>`},

trades(){const val=(n,q)=>(S.res[n]?.price||0)*q;
const ts=S.trades.map(t=>({...t,g:val(t.give,t.gq),r:val(t.get,t.rq)})).sort((a,b)=>(b.r-b.g)-(a.r-a.g));
return`<section class="panel"><h2>Nouveau trade de quête</h2><form data-f="trade" class="row"><label class="grow">Quête<input name="quest" required></label><label class="grow">Je donne<input name="give" list="rl" required autocomplete="off"></label><label>Qté<input name="gq" type="number" min="1" value="1"></label><label class="grow">Je reçois<input name="get" list="rl" required autocomplete="off"></label><label>Qté<input name="rq" type="number" min="1" value="1"></label><button class="btn">Ajouter</button></form></section>
<div class="cards">${ts.map(t=>{const p=t.r-t.g;return`<div class="card"><h3>${esc(t.quest)}</h3><p>Donne <b>${fmt(t.gq)}× ${esc(t.give)}</b> (${fmt(t.g)} $)<br>Reçoit <b>${fmt(t.rq)}× ${esc(t.get)}</b> (${fmt(t.r)} $)</p><p class="${p>=0?"gain":"loss"}">${p>=0?"+":""}${fmt(p)} $</p><button class="ghost" data-act="del" data-c="trades" data-id="${t.id}">Supprimer</button></div>`}).join("")||`<div class="empty">Aucun trade. Renseigne d'abord les prix dans Ressources.</div>`}</div>`},

schems(){const sz=n=>n>=1048576?(n/1048576).toFixed(1)+" Mo":Math.max(1,Math.round(n/1024))+" Ko";
return`<section class="panel"><h2>Ajouter un schématic</h2><form data-f="schem" class="row"><label class="grow">Nom<input name="name" placeholder="Par défaut : nom du fichier" autocomplete="off"></label><label>X<input name="x" type="number" required></label><label>Y<input name="y" type="number" required></label><label>Z<input name="z" type="number" required></label><label class="grow">Fichier<input name="file" type="file"></label><button class="btn">Ajouter</button></form><p class="mut">Fichier jusqu'à ${MAXMB} Mo.</p></section>
<input id="f" class="search" placeholder="Filtrer les schématics…"><div class="cards">${S.schems.map(s=>`<div class="card" data-flt="${esc((s.name||"").toLowerCase())}"><h3>${esc(s.name)}</h3><div class="coords"><span>${s.x} / ${s.y} / ${s.z}</span><button class="ghost" data-act="copy" data-t="${s.x} ${s.y} ${s.z}">Copier</button></div>${s.file?`<button class="btn" data-act="dl" data-id="${s.id}">⬇ ${esc(s.file.name)} (${sz(s.file.size)})</button><br>`:""}<span class="mut">${s.by?"par "+esc(s.by):""}</span> <button class="ghost" data-act="sdel" data-id="${s.id}">✕</button></div>`).join("")||`<div class="empty">Aucun schématic pour l'instant.</div>`}</div>`}
};

function render(){pending=false;document.body.style.setProperty("--c",TABS.find(t=>t[0]===tab)[3]);
$("#nav").innerHTML=TABS.map(([k,e,l,c])=>`<button style="--t:${c}" class="${k===tab?"on":""}" data-act="tab" data-t="${k}">${e} ${l}</button>`).join("");
$("#rl").innerHTML=Object.keys(S.res).sort().map(n=>`<option value="${esc(n)}">`).join("");$("#main").innerHTML=V[tab]();$("#who").textContent=pseudo}
const typing=()=>{const a=document.activeElement;return a&&a.closest("#main")&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)};
const refresh=()=>typing()?pending=true:render();
document.addEventListener("focusout",()=>setTimeout(()=>{if(pending&&!typing())render()},60));

// ---------- actions
async function seed(){const b=writeBatch(db),names=new Set();
for(const[n,[out,ing]]of Object.entries(SEED)){b.set(doc(db,"crafts",slug(n)),{name:n,out,ing:ing.map(([n,q])=>({n,q}))});ing.forEach(([i])=>names.add(i))}
names.forEach(n=>{if(!S.res[n])b.set(doc(db,"res",slug(n)),{name:n,price:0,stock:0})});await b.commit();toast("Recettes importées ✅")}
const MAXMB=6,CH=700000;
const readB64=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]||"");r.onerror=()=>ko(r.error);r.readAsDataURL(f)});
async function addSchem(f){const d=Object.fromEntries(new FormData(f)),file=f.elements.file.files[0];
const name=(d.name||file?.name||"").trim();if(!name)return toast("Donne un nom ou choisis un fichier");
if(file&&file.size>MAXMB*1048576)return toast("Fichier trop gros (max "+MAXMB+" Mo)");
const ref=doc(collection(db,"schems")),id=ref.id,base={name,x:+d.x,y:+d.y,z:+d.z,by:pseudo,at:Date.now()};
if(!file){await run(()=>setDoc(ref,base));f.reset();return}
let parts=0;
try{toast("Envoi du fichier…");const data=await readB64(file);parts=Math.max(1,Math.ceil(data.length/CH));
for(let i=0;i<parts;i+=3){const b=writeBatch(db);for(let j=i;j<Math.min(i+3,parts);j++)b.set(doc(db,"schemfiles",id+"_"+j),{s:id,i:j,d:data.slice(j*CH,(j+1)*CH)});await b.commit()}
await setDoc(ref,{...base,file:{name:file.name,size:file.size,parts}});f.reset();toast("Schématic ajouté ✅")}
catch(e){try{const b=writeBatch(db);for(let j=0;j<parts;j++)b.delete(doc(db,"schemfiles",id+"_"+j));await b.commit()}catch{}toast("Erreur : "+(e.code||e.message))}}
async function dlSchem(id){const s=S.schems.find(x=>x.id===id);if(!s?.file)return;toast("Téléchargement…");
const ps=await Promise.all(Array.from({length:s.file.parts},(_,i)=>getDoc(doc(db,"schemfiles",id+"_"+i))));
const bin=atob(ps.map(p=>p.data().d).join("")),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([u]));a.download=s.file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function delSchem(id){const s=S.schems.find(x=>x.id===id);if(!s||!confirm("Supprimer « "+s.name+" » ?"))return;
run(async()=>{const b=writeBatch(db);for(let j=0;j<(s.file?.parts||0);j++)b.delete(doc(db,"schemfiles",id+"_"+j));b.delete(doc(db,"schems",id));await b.commit();toast("Schématic supprimé")})}
const resAsk=u=>u.map(n=>"« "+n+" »").join(", ")+(u.length>1?" ne sont pas":" n'est pas")+" dans Ressources.\n\n"+(u.length>1?"Les ajouter":"L'ajouter")+" maintenant (prix et stock à 0) ?";
function saveRes(f,d){const raw=d.name.trim(),name=Object.keys(S.res).find(k=>k.toLowerCase()===raw.toLowerCase())||raw,o={name};
if(d.price!=="")o.price=num(d.price);if(d.stock!=="")o.stock=num(d.stock);
if(!S.res[name]){if(o.price===undefined)o.price=0;if(o.stock===undefined)o.stock=0}
run(async()=>{await setDoc(doc(db,"res",slug(name)),o,{merge:true});f.reset();toast("Ressource enregistrée ✅")})}
function addTrade(f,d){const canon=n=>{n=n.trim();const l=n.toLowerCase();return Object.keys(S.res).find(k=>k.toLowerCase()===l)||n},give=canon(d.give),get=canon(d.get);
const unk=[...new Set([give,get].filter(n=>!S.res[n]))];
if(unk.length&&!confirm(resAsk(unk)))return;
run(async()=>{const b=writeBatch(db);unk.forEach(n=>b.set(doc(db,"res",slug(n)),{name:n,price:0,stock:0}));
b.set(doc(collection(db,"trades")),{quest:d.quest,give,gq:num(d.gq),get,rq:num(d.rq)});await b.commit();f.reset();
toast(unk.length?"Ajouté à Ressources : renseigne son prix pour calculer la rentabilité":"Trade ajouté ✅")})}
function saveRecipe(){const name=ed.name.trim(),out=Math.max(1,parseInt(ed.out)||1);
if(!name)return toast("Donne un nom au craft");
if(!ed.id&&Object.keys(S.crafts).some(k=>k.toLowerCase()===name.toLowerCase()))return toast("Cette recette existe déjà : modifie-la depuis la liste");
const canon=n=>{n=n.trim();const l=n.toLowerCase();return Object.keys(S.crafts).find(k=>k.toLowerCase()===l)||Object.keys(S.res).find(k=>k.toLowerCase()===l)||n};
const m=new Map();for(const[n,q]of ed.ing){if(!n.trim())continue;const k=canon(n),v=parseInt(q);if(!(v>=1))return toast("Quantité invalide pour "+k);m.set(k,(m.get(k)||0)+v)}
if(!m.size)return toast("Ajoute au moins un ingrédient");
const ing=[...m],reach=(n,seen=new Set())=>{if(n===name)return true;if(seen.has(n))return false;seen.add(n);const c=S.crafts[n];return c?c.ing.some(([i])=>reach(i,seen)):false};
if(ing.some(([i])=>reach(i)))return toast("Boucle : « "+name+" » se retrouve dans ses propres ingrédients");
const unk=ing.map(([n])=>n).filter(n=>!S.crafts[n]&&!S.res[n]);if(unk.length&&!confirm(resAsk(unk)))return;
run(async()=>{const b=writeBatch(db),id=ed.id||slug(name);
b.set(doc(db,"crafts",id),{name,out,ing:ing.map(([n,q])=>({n,q}))});
unk.forEach(n=>b.set(doc(db,"res",slug(n)),{name:n,price:0,stock:0}));
await b.commit();toast("Recette enregistrée ✅");ed=blank();render()})}
function delRecipe(n){const c=S.crafts[n];if(!c)return;
const used=Object.entries(S.crafts).filter(([,v])=>v.ing.some(([i])=>i===n)).map(([k])=>k),jobs=S.jobs.filter(j=>j.craft===n).length;
let m="Supprimer la recette « "+n+" » ?";if(used.length)m+="\n\nUtilisée dans : "+used.join(", ");if(jobs)m+="\n"+jobs+" craft(s) en cours l'utilisent.";
if(confirm(m))run(async()=>{await deleteDoc(doc(db,"crafts",c.id));if(ed.id===c.id)ed=blank();toast("Recette supprimée")})}
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;const d=a.dataset;
if(d.act==="tab"){tab=d.t;render()}
else if(d.act==="seed")run(seed)
else if(d.act==="logout")signOut(auth)
else if(d.act==="copy")navigator.clipboard.writeText(d.t).then(()=>toast("Coordonnées copiées"))
else if(d.act==="del"){if(confirm("Supprimer définitivement ?"))run(()=>deleteDoc(doc(db,d.c,d.id)))}
else if(d.act==="fill")setGot(d.job,d.k,+d.v)
else if(d.act==="rrow-add"){ed.ing.push(["",1]);render()}
else if(d.act==="rrow-del"){ed.ing.splice(+d.i,1);if(!ed.ing.length)ed.ing.push(["",1]);render()}
else if(d.act==="rnew"){ed=blank();render()}
else if(d.act==="redit"){const c=S.crafts[d.n];if(c){ed={id:c.id,name:d.n,out:c.out,ing:c.ing.map(([x,q])=>[x,q])};render();scrollTo(0,0)}}
else if(d.act==="rdel")delRecipe(d.n)
else if(d.act==="dl")run(()=>dlSchem(d.id))
else if(d.act==="sdel")delSchem(d.id)});
function setGot(id,k,v){const j=S.jobs.find(x=>x.id===id);if(j)run(()=>updateDoc(doc(db,"jobs",id),{got:{...j.got,[k]:v}}))}
document.addEventListener("change",e=>{const t=e.target;
if(t.dataset.k)setGot(t.dataset.job,t.dataset.k,num(t.value));
if(t.dataset.res)run(()=>updateDoc(doc(db,"res",t.dataset.id),{[t.dataset.res]:num(t.value)}))});
document.addEventListener("input",e=>{const t=e.target;
if(t.dataset.ri!==undefined)ed.ing[+t.dataset.ri][t.dataset.rf==="q"?1:0]=t.value;
if(t.id==="rn")ed.name=t.value;
if(t.id==="ro")ed.out=t.value;
if(["q","n","d"].includes(t.id)){sel=$("#q").value;$("#prev").innerHTML=prev()}
if(t.id==="f"){const v=t.value.toLowerCase();document.querySelectorAll("#main tr:not(:first-child),#main .card[data-flt]").forEach(r=>r.hidden=!(r.dataset.flt||r.textContent).toLowerCase().includes(v))}});
document.addEventListener("submit",e=>{const f=e.target,k=f.dataset.f;if(!k)return;e.preventDefault();if(k==="recipe")return saveRecipe();const d=Object.fromEntries(new FormData(f));
if(k==="job"){if(!S.crafts[d.c])return toast("Craft inconnu : choisis-en un dans la liste");
run(async()=>{await addDoc(collection(db,"jobs"),{craft:d.c,qty:Math.max(1,parseInt(d.n)||1),deep:!!d.d,got:{},by:pseudo,at:Date.now()});sel="";render();toast("Craft ajouté ✅")})}
if(k==="res")saveRes(f,d);
if(k==="trade")addTrade(f,d);
if(k==="schem")addSchem(f)});

// ---------- connexion + données en direct
$("#lf").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));pseudo=(d.pseudo||"").trim();localStorage.setItem("ng-pseudo",pseudo);
try{await signInWithEmailAndPassword(auth,SHARED_EMAIL,d.code)}catch{toast("Code incorrect")}});
const watch=(c,fn)=>onSnapshot(collection(db,c),s=>{fn(s);refresh()},e=>toast("Synchronisation : "+(e.code||e.message)));
onAuthStateChanged(auth,u=>{$("#login").hidden=!!u;if(!u||started)return;started=true;
watch("crafts",s=>{S.crafts={};s.forEach(d=>{const v=d.data();S.crafts[v.name]={out:v.out||1,ing:(v.ing||[]).map(x=>[x.n,x.q]),id:d.id}})});
watch("res",s=>{S.res={};s.forEach(d=>{const v=d.data();S.res[v.name]={...v,id:d.id}})});
watch("jobs",s=>S.jobs=s.docs.map(d=>({id:d.id,...d.data()})));
watch("trades",s=>S.trades=s.docs.map(d=>({id:d.id,...d.data()})));
watch("schems",s=>S.schems=s.docs.map(d=>({id:d.id,...d.data()})))});
if(!pseudo)pseudo="";render();
