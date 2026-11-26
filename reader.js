'use strict';
const $ = id => document.getElementById(id);
let chapters = [], active = null, page = 0;
const safePath = path => typeof path === 'string' && /^chapitres\/[a-z0-9_-]+\/[a-z0-9_-]+\.(png|jpe?g|webp)$/i.test(path);
function validate(data) {
  if (!data || typeof data.titre !== 'string' || !Array.isArray(data.chapitres)) throw Error('Catalogue invalide.');
  const ids = new Set();
  for (const c of data.chapitres) {
    if (!c || typeof c.id !== 'string' || !/^[a-z0-9_-]+$/.test(c.id) || ids.has(c.id) || typeof c.titre !== 'string' || !Array.isArray(c.planches) || !c.planches.length || !c.planches.every(safePath) || new Set(c.planches).size !== c.planches.length || (c.couverture !== undefined && !safePath(c.couverture))) throw Error('Chapitre invalide.');
    ids.add(c.id);
  }
  return data;
}
function showCatalogue(update = true) {
  active = null; $('lecteur').hidden = true; $('catalogue').hidden = false;
  $('message').textContent = chapters.length ? 'Choisis un chapitre.' : 'Aucun chapitre publié pour le moment.';
  if (update) history.pushState(null, '', location.pathname);
}
function openChapter(c, p = 0, update = true) {
  active = c; page = Math.max(0, Math.min(c.planches.length - 1, p));
  $('catalogue').hidden = true; $('lecteur').hidden = false;
  $('chapitre').textContent = c.titre; $('message').textContent = '';
  $('compteur').textContent = `${page+1} / ${c.planches.length}`;
  $('planche').alt = `${c.titre} — planche ${page+1}`;
  $('planche').src = c.planches[page];
  for (const id of ['precedent','precedent-bas']) $(id).disabled = page === 0;
  for (const id of ['suivant','suivant-bas']) $(id).disabled = page === c.planches.length-1;
  if (update) history.pushState(null, '', `?chapitre=${encodeURIComponent(c.id)}&page=${page+1}`);
  window.scrollTo(0, 0);
}
function fromUrl() {
  const params = new URLSearchParams(location.search);
  const c = chapters.find(ch => ch.id === params.get('chapitre'));
  const n = Number(params.get('page'));
  if (c) openChapter(c, Number.isSafeInteger(n) && n>0 ? n-1 : 0, false); else showCatalogue(false);
}
function move(delta) { if (active && page+delta >= 0 && page+delta < active.planches.length) openChapter(active, page+delta); }
for (const id of ['precedent','precedent-bas']) $(id).addEventListener('click', () => move(-1));
for (const id of ['suivant','suivant-bas']) $(id).addEventListener('click', () => move(1));
$('retour').addEventListener('click', () => showCatalogue());
$('planche').addEventListener('error', () => { if (active) $('message').textContent = 'Cette planche n’a pas pu être chargée.'; });
window.addEventListener('popstate', fromUrl);
window.addEventListener('keydown', e => { if (active && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.target.tagName !== 'BUTTON') { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); } });
(async () => {
  try {
    const response = await fetch('chapitres.json', {cache:'no-cache'});
    if (!response.ok) throw Error('Catalogue inaccessible.');
    const data = validate(await response.json()); chapters = data.chapitres;
    $('titre').textContent = data.titre; document.title = data.titre;
    for (const c of chapters) {
      const b = document.createElement('button');
      if (c.couverture) {const img = document.createElement('img'); img.src=c.couverture; img.alt=''; img.loading='lazy'; b.append(img);}
      const title = document.createElement('strong'); title.textContent = c.titre;
      const info = document.createElement('span'); info.textContent = `${c.planches.length} planche(s)`;
      b.append(title,info); b.addEventListener('click', () => openChapter(c)); $('catalogue').append(b);
    }
    fromUrl();
  } catch (error) { $('message').textContent = 'Impossible de charger le catalogue. Réessaie plus tard.'; console.error(error); }
})();
