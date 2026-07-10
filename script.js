const COL = {
 id:"ID", title:"Название", author:"Автор", link:"Ссылка на фанфик", cover:"Обложка",
 status:"Статус чтения", language:"Язык", size:"Размер", chapters:"Количество глав",
 workStatus:"Статус произведения", total:"Итог /100", hangover:"Книжное похмелье /10",
 nominations:"Номинации", tags:"Теги", quote:"Любимая цитата",
 review:"Отзыв без спойлеров", spoiler:"Спойлерный отзыв", scene:"Любимая сцена",
 why:"Почему стоит прочитать", disliked:"Что не понравилось", visible:"Показывать на сайте"
};
const SCORE_COLUMNS=["Химия","Драко","Гермиона","Сюжет","Темп","Диалоги","Развитие отношений",
"Атмосфера","Стиль автора","Эмоциональное воздействие"];

let library=[];

function parseCSV(text){
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){field+='"';i++}
  else if(c==='"'){quoted=!quoted}
  else if(c===','&&!quoted){row.push(field);field=""}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&n==='\n')i++;
   row.push(field);field="";
   if(row.some(v=>v!==""))rows.push(row);
   row=[];
  }else field+=c;
 }
 if(field||row.length){row.push(field);rows.push(row)}
 if(!rows.length)return[];
 const headers=rows[0].map(h=>h.trim());
 return rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??"").trim()])));
}
const splitList=v=>(v||"").split("|").map(x=>x.trim()).filter(Boolean);
const num=v=>Number(String(v||"").replace(",","."))||0;
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function fallbackCover(v){return v||"assets/covers/placeholder.svg"}
function rowToFanfic(r){
 const scores=Object.fromEntries(SCORE_COLUMNS.map(k=>[k,num(r[k])]));
 let total=num(r[COL.total]);
 if(!total){const vals=Object.values(scores);total=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)}
 return {
  id:r[COL.id]||crypto.randomUUID(),title:r[COL.title],author:r[COL.author],link:r[COL.link],
  cover:fallbackCover(r[COL.cover]),status:r[COL.status],language:r[COL.language],size:r[COL.size],
  chapters:r[COL.chapters],workStatus:r[COL.workStatus],scores,total,hangover:num(r[COL.hangover]),
  nominations:splitList(r[COL.nominations]),tags:splitList(r[COL.tags]),quote:r[COL.quote],
  review:r[COL.review],spoiler:r[COL.spoiler],scene:r[COL.scene],why:r[COL.why],disliked:r[COL.disliked]
 };
}
async function loadData(){
 const url=window.DRAMIONE_CONFIG?.googleSheetCsvUrl?.trim();
 const status=document.querySelector("#syncStatus");
 if(!url){
  status.textContent="Таблица не подключена";
  document.querySelector("#setup").classList.remove("hidden");
  return;
 }
 try{
  const res=await fetch(url,{cache:"no-store"});
  if(!res.ok)throw new Error("HTTP "+res.status);
  const rows=parseCSV(await res.text());
  library=rows.filter(r=>r[COL.title] && (r[COL.visible]||"Да").toLowerCase()!=="нет").map(rowToFanfic);
  status.textContent="Данные загружены из Google Таблицы";
  render();
 }catch(err){
  console.error(err);status.textContent="Не удалось загрузить таблицу";
  document.querySelector("#setup").classList.remove("hidden");
  document.querySelector("#setup").innerHTML="<h3>Ошибка загрузки</h3><p>Проверь публикацию таблицы и CSV-ссылку в <code>config.js</code>.</p>";
 }
}
function updateStats(items){
 document.querySelector("#count").textContent=items.length;
 document.querySelector("#average").textContent=items.length?Math.round(items.reduce((s,x)=>s+x.total,0)/items.length)+"/100":"—";
 document.querySelector("#hangoverMax").textContent=items.length?Math.max(...items.map(x=>x.hangover))+"/10":"—";
}
function card(f){
 return `<article class="card">
  <div class="cover" style="--cover:url('${safe(f.cover)}')">
   <div class="score">${f.total}/100</div>
   <div class="cover-copy"><h3>${safe(f.title)}</h3><p>${safe(f.author)}</p></div>
  </div>
  <div class="card-body">
   <div class="meta"><span>${safe(f.status||"Без статуса")}</span><span>Похмелье ${f.hangover}/10</span></div>
   <div class="chips">${f.tags.slice(0,4).map(x=>`<span class="chip">${safe(x)}</span>`).join("")}</div>
   <button class="open" data-id="${safe(f.id)}">Подробнее</button>
  </div>
 </article>`;
}
function filtered(){
 const q=document.querySelector("#search").value.trim().toLowerCase();
 const status=document.querySelector("#status").value;
 const sort=document.querySelector("#sort").value;
 let items=library.filter(f=>{
  const hay=[f.title,f.author,...f.tags,...f.nominations].join(" ").toLowerCase();
  return(!q||hay.includes(q))&&(!status||f.status===status);
 });
 items.sort((a,b)=>sort==="title"?a.title.localeCompare(b.title,"ru"):sort==="hangover"?b.hangover-a.hangover:b.total-a.total);
 return items;
}
function render(){
 const items=filtered();updateStats(library);
 document.querySelector("#cards").innerHTML=items.map(card).join("");
 document.querySelector("#empty").classList.toggle("hidden",items.length>0);
 document.querySelectorAll(".open").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.id)));
}
function openModal(id){
 const f=library.find(x=>x.id===id);if(!f)return;
 const ratings=Object.entries(f.scores).map(([k,v])=>`<div class="rating"><span>${safe(k)}</span><strong>${v}/10</strong></div>`).join("");
 const content=`<div class="modal-hero" style="--cover:url('${safe(f.cover)}')"><div><p>${safe(f.author)}</p><h3>${safe(f.title)}</h3></div></div>
 <div class="modal-body">
  <div class="meta"><span>${safe(f.status)} · ${safe(f.size)} · ${safe(f.language)}</span><strong>${f.total}/100</strong></div>
  <div class="rating-grid">${ratings}</div>
  <div class="hangover"><strong>📈 Эффект книжного похмелья: ${f.hangover}/10</strong></div>
  ${f.nominations.length?`<div class="block"><h4>🏆 Номинации</h4><div class="chips">${f.nominations.map(x=>`<span class="chip">${safe(x)}</span>`).join("")}</div></div>`:""}
  ${f.quote?`<div class="block quote">«${safe(f.quote)}»</div>`:""}
  ${f.review?`<div class="block"><h4>Мой отзыв</h4><p>${safe(f.review)}</p></div>`:""}
  ${f.scene?`<div class="block"><h4>Любимая сцена</h4><p>${safe(f.scene)}</p></div>`:""}
  ${f.why?`<div class="block"><h4>Почему стоит прочитать</h4><p>${safe(f.why)}</p></div>`:""}
  ${f.disliked?`<div class="block"><h4>Что не понравилось</h4><p>${safe(f.disliked)}</p></div>`:""}
  ${f.spoiler?`<details><summary>Открыть отзыв со спойлерами</summary><p>${safe(f.spoiler)}</p></details>`:""}
  ${f.link?`<div class="block"><a class="button" href="${safe(f.link)}" target="_blank" rel="noopener">Читать фанфик</a></div>`:""}
 </div>`;
 document.querySelector("#modalContent").innerHTML=content;
 document.querySelector("#modal").showModal();
}
document.querySelector("#closeModal").addEventListener("click",()=>document.querySelector("#modal").close());
document.querySelector("#modal").addEventListener("click",e=>{if(e.target===e.currentTarget)e.currentTarget.close()});
["search","status","sort"].forEach(id=>document.querySelector("#"+id).addEventListener("input",render));
document.querySelector("#themeButton").addEventListener("click",()=>{
 document.body.classList.toggle("dark");
 localStorage.setItem("dramione-theme",document.body.classList.contains("dark")?"dark":"light");
});
if(localStorage.getItem("dramione-theme")==="dark")document.body.classList.add("dark");
loadData();
