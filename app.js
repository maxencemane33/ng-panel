import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,collection,doc,onSnapshot,addDoc,setDoc,updateDoc,deleteDoc,writeBatch}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import{firebaseConfig,SHARED_EMAIL}from"./firebase-config.js";
import{SEED}from"./data.js";

const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore(auth.app);
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const fmt=n=>Number(n||0).toLocaleString("fr-FR"),num=v=>Math.max(0,parseFloat(v)||0);
const opts=a=>a.map(x=>`<option>${x}</option>`).join("");
const S={crafts:{},res:{},jobs:[],trades:[],schems:[]};
let tab="crafts",pseudo=localStorage.getItem("ng-pseudo")||"",sel="",pending=false,started=false;
const TABS=[["crafts","🔨","Crafts","#3ddc84"],["res","📦","Ressources","#ffb020"],["trades","🎯","Trades","#ff5fa2"],["schems","🏗️","Schématics","#38bdf8"]];
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

res(){const rs=Object.values(S.res).sort((a,b)=>a.name.localeCompare(b.name));
return`<section class="panel"><h2>Ajouter ou mettre à jour une ressource</h2><form data-f="res" class="row"><label class="grow">Nom<input name="name" list="rl" required autocomplete="off" placeholder="Commence à écrire…"></label><label>Prix<input name="price" type="number" min="0" step="any"></label><label>Stock du pays<input name="stock" type="number" min="0"></label><label>Catégorie<select name="cat">${opts(["Minerai","Bloc","Agriculture","Mob drop","Craft","Autre"])}</select></label><label class="grow">Où farmer<input name="where"></label><button class="btn">Enregistrer</button></form></section>
<input id="f" class="search" placeholder="Filtrer les ressources…"><div class="scroll"><table><tr><th>Ressource</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Où farmer</th><th></th></tr>${rs.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.cat)}</td><td><input type="number" min="0" step="any" value="${r.price||0}" data-res="price" data-id="${r.id}"></td><td><input type="number" min="0" value="${r.stock||0}" data-res="stock" data-id="${r.id}"></td><td>${esc(r.where)}</td><td><button class="ghost" data-act="del" data-c="res" data-id="${r.id}">✕</button></td></tr>`).join("")||`<tr><td colspan="6" class="mut">Aucune ressource. Importe les recettes dans l'onglet Crafts.</td></tr>`}</table></div>`},

trades(){const val=(n,q)=>(S.res[n]?.price||0)*q;
const ts=S.trades.map(t=>({...t,g:val(t.give,t.gq),r:val(t.get,t.rq)})).sort((a,b)=>(b.r-b.g)-(a.r-a.g));
return`<section class="panel"><h2>Nouveau trade de quête</h2><form data-f="trade" class="row"><label class="grow">Quête<input name="quest" required></label><label class="grow">Je donne<input name="give" list="rl" required autocomplete="off"></label><label>Qté<input name="gq" type="number" min="1" value="1"></label><label class="grow">Je reçois<input name="get" list="rl" required autocomplete="off"></label><label>Qté<input name="rq" type="number" min="1" value="1"></label><button class="btn">Ajouter</button></form></section>
<div class="cards">${ts.map(t=>{const p=t.r-t.g;return`<div class="card"><h3>${esc(t.quest)}</h3><p>Donne <b>${fmt(t.gq)}× ${esc(t.give)}</b> (${fmt(t.g)} $)<br>Reçoit <b>${fmt(t.rq)}× ${esc(t.get)}</b> (${fmt(t.r)} $)</p><p class="${p>=0?"gain":"loss"}">${p>=0?"+":""}${fmt(p)} $</p><button class="ghost" data-act="del" data-c="trades" data-id="${t.id}">Supprimer</button></div>`}).join("")||`<div class="empty">Aucun trade. Renseigne d'abord les prix dans Ressources.</div>`}</div>`},

schems(){const ok=u=>/^https?:\/\//.test(u||"");
return`<section class="panel"><h2>Ajouter un schématic</h2><form data-f="schem" class="row"><label class="grow">Nom<input name="name" required></label><label class="grow">Lien du fichier<input name="link" placeholder="https://…"></label><label>X<input name="x" type="number" required></label><label>Y<input name="y" type="number" required></label><label>Z<input name="z" type="number" required></label><label>Monde<select name="world">${opts(["Overworld","Nether","End","Autre"])}</select></label><label>Type<select name="type">${opts(["Bâtiment","Ferme","Défense","Décoration","Autre"])}</select></label><label>Statut<select name="status">${opts(["Idée","À placer","Construit"])}</select></label><button class="btn">Ajouter</button></form></section>
<input id="f" class="search" placeholder="Filtrer les schématics…"><div class="cards">${S.schems.map(s=>`<div class="card" data-flt="${esc((s.name+s.type+s.world).toLowerCase())}"><h3>${esc(s.name)}</h3><span class="tag" data-s="${esc(s.status)}">${esc(s.status)}</span><span class="tag">${esc(s.type)}</span><span class="tag">${esc(s.world)}</span><div class="coords"><span>${s.x} / ${s.y} / ${s.z}</span><button class="ghost" data-act="copy" data-t="${s.x} ${s.y} ${s.z}">Copier</button></div>${ok(s.link)?`<a href="${esc(s.link)}" target="_blank" rel="noopener" style="color:var(--c)">Télécharger le fichier</a><br>`:""}<span class="mut">${s.by?"par "+esc(s.by):""}</span> <button class="ghost" data-act="del" data-c="schems" data-id="${s.id}">✕</button></div>`).join("")||`<div class="empty">Aucun schématic pour l'instant.</div>`}</div>`}
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
names.forEach(n=>{if(!S.res[n])b.set(doc(db,"res",slug(n)),{name:n,price:0,stock:0,cat:SEED[n]?"Craft":"Autre",where:""})});await b.commit();toast("Recettes importées ✅")}
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;const d=a.dataset;
if(d.act==="tab"){tab=d.t;render()}
else if(d.act==="seed")run(seed)
else if(d.act==="logout")signOut(auth)
else if(d.act==="copy")navigator.clipboard.writeText(d.t).then(()=>toast("Coordonnées copiées"))
else if(d.act==="del"){if(confirm("Supprimer définitivement ?"))run(()=>deleteDoc(doc(db,d.c,d.id)))}
else if(d.act==="fill")setGot(d.job,d.k,+d.v)});
function setGot(id,k,v){const j=S.jobs.find(x=>x.id===id);if(j)run(()=>updateDoc(doc(db,"jobs",id),{got:{...j.got,[k]:v}}))}
document.addEventListener("change",e=>{const t=e.target;
if(t.dataset.k)setGot(t.dataset.job,t.dataset.k,num(t.value));
if(t.dataset.res)run(()=>updateDoc(doc(db,"res",t.dataset.id),{[t.dataset.res]:num(t.value)}))});
document.addEventListener("input",e=>{const t=e.target;
if(["q","n","d"].includes(t.id)){sel=$("#q").value;$("#prev").innerHTML=prev()}
if(t.id==="f"){const v=t.value.toLowerCase();document.querySelectorAll("#main tr:not(:first-child),#main .card[data-flt]").forEach(r=>r.hidden=!(r.dataset.flt||r.textContent).toLowerCase().includes(v))}});
document.addEventListener("submit",e=>{const f=e.target,k=f.dataset.f;if(!k)return;e.preventDefault();const d=Object.fromEntries(new FormData(f));
if(k==="job"){if(!S.crafts[d.c])return toast("Craft inconnu : choisis-en un dans la liste");
run(async()=>{await addDoc(collection(db,"jobs"),{craft:d.c,qty:Math.max(1,parseInt(d.n)||1),deep:!!d.d,got:{},by:pseudo,at:Date.now()});sel="";render();toast("Craft ajouté ✅")})}
if(k==="res")run(async()=>{await setDoc(doc(db,"res",slug(d.name.trim())),{name:d.name.trim(),price:num(d.price),stock:num(d.stock),cat:d.cat,where:d.where},{merge:true});f.reset();toast("Ressource enregistrée ✅")});
if(k==="trade")run(async()=>{await addDoc(collection(db,"trades"),{quest:d.quest,give:d.give.trim(),gq:num(d.gq),get:d.get.trim(),rq:num(d.rq)});f.reset()});
if(k==="schem")run(async()=>{await addDoc(collection(db,"schems"),{name:d.name,link:d.link,x:+d.x,y:+d.y,z:+d.z,world:d.world,type:d.type,status:d.status,by:pseudo});f.reset()})});

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
