const DB_NAME='saeroi-plant-diary', STORE='records';
let db, currentPhoto=null, currentDetailId=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>{db=r.result;resolve(db)};r.onerror=()=>reject(r.error);});}
function allRecords(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));r.onerror=()=>reject(r.error);});}
function putRecord(v){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(v);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
function getRecord(id){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function deleteRecord(id){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}

function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function go(name){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+name).classList.add('active');$$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.go===name));$('#nav').style.display=name==='detail'?'none':'grid';window.scrollTo({top:0,behavior:'instant'});if(name==='home'||name==='diary')renderLists();}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

$$('.single .opt').forEach(btn=>btn.addEventListener('click',()=>{const p=btn.parentElement;p.querySelectorAll('.opt').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');}));
$$('.multi .opt').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('selected')));

async function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const max=1600, scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(blob=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)},'image/jpeg',.82)};img.onerror=reject;img.src=url;});}
async function onPhoto(file){if(!file)return;currentPhoto=await compressImage(file);$('#photoBox').innerHTML=`<img src="${currentPhoto}" alt="오늘의 식물 사진">`;}
$('#cameraInput').addEventListener('change',e=>onPhoto(e.target.files[0]));$('#libraryInput').addEventListener('change',e=>onPhoto(e.target.files[0]));

function selected(field,multi=false){const p=document.querySelector(`[data-field="${field}"]`);const vals=[...p.querySelectorAll('.opt.selected')].map(x=>x.dataset.value);return multi?vals:(vals[0]||'');}
function resetForm(){currentPhoto=null;$('#photoBox').innerHTML='<div class="photo-placeholder"><div>🌿</div>아직 사진이 없어요</div>';$('#plantName').value='';$('#discovery').value='';$('#question').value='';$$('.opt.selected').forEach(x=>x.classList.remove('selected'));$('#cameraInput').value='';$('#libraryInput').value='';}

$('#saveRecord').addEventListener('click',async()=>{
  const plant=$('#plantName').value.trim();
  if(!currentPhoto){showToast('먼저 식물 사진을 찍어주세요 📷');return}
  if(!plant){showToast('식물 이름을 적어주세요 🌱');$('#plantName').focus();return}
  const now=new Date();
  const rec={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:now.toISOString(),plantName:plant,photo:currentPhoto,changes:selected('changes',true),leafColor:selected('leafColor'),soil:selected('soil'),health:selected('health'),care:selected('care',true),discovery:$('#discovery').value.trim(),question:$('#question').value.trim()};
  try{await putRecord(rec);resetForm();showToast('오늘의 관찰일기를 저장했어요! ⭐');setTimeout(()=>go('diary'),450)}catch(e){console.error(e);showToast('저장하지 못했어요. 다시 해볼까요?')}
});

function fmt(iso){return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(iso));}
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function recordHTML(r){const chips=[...r.changes,...r.care].slice(0,3).map(x=>`<span class="mini">${esc(x)}</span>`).join('');return `<article class="record" data-id="${r.id}"><img src="${r.photo}" alt="${esc(r.plantName)}"><div class="grow"><h3>${esc(r.plantName)}</h3><p>${fmt(r.createdAt)}</p><div class="chipline">${chips}</div></div><b>›</b></article>`}
async function renderLists(){if(!db)return;const rs=await allRecords();$('#recordCount').textContent=rs.length;$('#plantCount').textContent=new Set(rs.map(r=>r.plantName)).size;$('#recentList').innerHTML=rs.length?rs.slice(0,3).map(recordHTML).join(''):'<div class="empty">📷<br><br>첫 식물 사진을 찍어볼까요?</div>';$('#diaryList').innerHTML=rs.length?rs.map(recordHTML).join(''):'<div class="empty">🌱<br><br>아직 관찰일기가 없어요.<br>오늘 첫 기록을 만들어봐요!</div>';$$('.record').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.id)));}
async function openDetail(id){const r=await getRecord(id);if(!r)return;currentDetailId=id;const changes=r.changes.length?r.changes.join(' · '):'기록 없음',care=r.care.length?r.care.join(' · '):'기록 없음';$('#detailContent').innerHTML=`<section class="card"><img class="detail-photo" src="${r.photo}" alt="${esc(r.plantName)}"><h2 style="margin-bottom:4px">🌿 ${esc(r.plantName)}</h2><p class="hint">${fmt(r.createdAt)}</p><div class="report-grid"><div class="report-item"><small>달라진 모습</small><b>${esc(changes)}</b></div><div class="report-item"><small>잎 색깔</small><b>${esc(r.leafColor||'기록 없음')}</b></div><div class="report-item"><small>흙</small><b>${esc(r.soil||'기록 없음')}</b></div><div class="report-item"><small>식물 상태</small><b>${esc(r.health||'기록 없음')}</b></div></div>${r.discovery?`<div class="quote"><b>🔍 새로이가 발견한 것</b><br>${esc(r.discovery)}</div>`:''}${r.question?`<div class="quote"><b>❓ 새로이의 궁금증</b><br>${esc(r.question)}</div>`:''}<div class="quote"><b>💧 오늘 해준 일</b><br>${esc(care)}</div><button class="danger" id="deleteCurrent">이 기록 삭제</button></section>`;$('#deleteCurrent').addEventListener('click',async()=>{if(confirm('이 관찰 기록을 삭제할까요?')){await deleteRecord(currentDetailId);showToast('기록을 삭제했어요');go('diary')}});go('detail');}

const dlg=$('#installDialog');$('#installHelp').addEventListener('click',()=>dlg.showModal());$('#closeInstall').addEventListener('click',()=>dlg.close());
if(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone){$('#installHelp').style.display='none';}

(async()=>{await openDB();await renderLists();if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js')}catch(e){console.warn('SW',e)}}})();
