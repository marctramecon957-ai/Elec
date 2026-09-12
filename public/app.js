let selectedFile = null;
let currentAnalysisId = null;

const fileInput = document.getElementById('file-input');
const captureZone = document.getElementById('capture-zone');
const capturePlaceholder = document.getElementById('capture-placeholder');
const previewImg = document.getElementById('preview-img');
const analyseActions = document.getElementById('analyse-actions');
const loadingEl = document.getElementById('loading');
const resultatEl = document.getElementById('resultat');

document.getElementById('btn-choose-photo').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.hidden = false;
  capturePlaceholder.hidden = true;
  analyseActions.hidden = false;
  resultatEl.hidden = true;
});

document.getElementById('btn-annuler').addEventListener('click', resetCapture);

function resetCapture() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.hidden = true;
  capturePlaceholder.hidden = false;
  analyseActions.hidden = true;
  resultatEl.hidden = true;
}

// Drag and drop (desktop)
['dragover', 'dragenter'].forEach((evt) => {
  captureZone.addEventListener(evt, (e) => {
    e.preventDefault();
    captureZone.style.borderColor = '#1f6feb';
  });
});
['dragleave', 'drop'].forEach((evt) => {
  captureZone.addEventListener(evt, (e) => {
    e.preventDefault();
    captureZone.style.borderColor = '';
  });
});
captureZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    selectedFile = file;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.hidden = false;
    capturePlaceholder.hidden = true;
    analyseActions.hidden = false;
  }
});

document.getElementById('btn-analyser').addEventListener('click', async () => {
  if (!selectedFile) return;
  loadingEl.hidden = false;
  analyseActions.hidden = true;
  resultatEl.hidden = true;

  const formData = new FormData();
  formData.append('photo', selectedFile);

  try {
    const res = await fetch('/api/analyser', { method: 'POST', body: formData });
    const data = await res.json();
    loadingEl.hidden = true;

    if (!res.ok) {
      alert(data.error || 'Erreur lors de l\'analyse');
      analyseActions.hidden = false;
      return;
    }

    currentAnalysisId = data.id;
    afficherResultat(data);
  } catch (err) {
    loadingEl.hidden = true;
    analyseActions.hidden = false;
    alert('Erreur reseau lors de l\'analyse');
  }
});

function afficherResultat(data) {
  resultatEl.hidden = false;

  const listeMateriaux = document.getElementById('liste-materiaux');
  listeMateriaux.innerHTML = '';
  (data.materiaux || []).forEach((m) => {
    const li = document.createElement('li');
    li.textContent = m;
    listeMateriaux.appendChild(li);
  });
  if (!data.materiaux || data.materiaux.length === 0) {
    listeMateriaux.innerHTML = '<li>Aucun materiau identifie</li>';
  }

  const listeCables = document.getElementById('liste-cables');
  listeCables.innerHTML = '';
  (data.cables || []).forEach((c) => {
    const div = document.createElement('div');
    div.className = 'cable-item';
    div.textContent = `${c.type || '?'} — ${c.section_mm2 || '?'} mm2 ${c.couleur ? '(' + c.couleur + ')' : ''}`;
    listeCables.appendChild(div);
  });
  if (!data.cables || data.cables.length === 0) {
    listeCables.innerHTML = '<p class="muted">Aucun cable identifie</p>';
  }

  const listeRails = document.getElementById('liste-rails');
  listeRails.innerHTML = '';
  (data.rails || []).forEach((r) => {
    const div = document.createElement('div');
    div.className = 'rail-item';
    div.textContent = `${r.dimension_mm || '?'} mm — ${r.description || ''}`;
    listeRails.appendChild(div);
  });
  if (!data.rails || data.rails.length === 0) {
    listeRails.innerHTML = '<p class="muted">Aucun rail identifie</p>';
  }

  renderReperages(data.reperages || []);

  const notesCard = document.getElementById('notes-card');
  const notesText = document.getElementById('notes-text');
  if (data.notes) {
    notesCard.hidden = false;
    notesText.textContent = data.notes;
  } else {
    notesCard.hidden = true;
  }
}

function renderReperages(reperages) {
  const tbody = document.getElementById('tbody-reperages');
  tbody.innerHTML = '';
  reperages.forEach((r) => tbody.appendChild(creerLigneReperage(r)));
}

function creerLigneReperage(r) {
  const tr = document.createElement('tr');
  tr.dataset.id = r.id;

  const tdRepere = document.createElement('td');
  const inputRepere = document.createElement('input');
  inputRepere.value = r.repere || '';
  inputRepere.placeholder = 'X1-3';
  tdRepere.appendChild(inputRepere);

  const tdAmont = document.createElement('td');
  const inputAmont = document.createElement('input');
  inputAmont.value = r.fil_amont || '';
  inputAmont.placeholder = '23';
  tdAmont.appendChild(inputAmont);

  const tdAval = document.createElement('td');
  const inputAval = document.createElement('input');
  inputAval.value = r.fil_aval || '';
  inputAval.placeholder = '23';
  tdAval.appendChild(inputAval);

  const tdEtat = document.createElement('td');
  const selectEtat = document.createElement('select');
  ['a_verifier', 'ok', 'erreur'].forEach((val) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val === 'a_verifier' ? 'A verifier' : val === 'ok' ? 'Ok' : 'Erreur';
    if (r.etat === val) opt.selected = true;
    selectEtat.appendChild(opt);
  });
  tdEtat.appendChild(selectEtat);

  const tdAction = document.createElement('td');
  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.innerHTML = '✕';
  btnDelete.title = 'Supprimer';
  tdAction.appendChild(btnDelete);

  tr.append(tdRepere, tdAmont, tdAval, tdEtat, tdAction);

  const sauvegarder = debounce(async () => {
    if (!r.id) return;
    await fetch(`/api/reperages/${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repere: inputRepere.value,
        fil_amont: inputAmont.value,
        fil_aval: inputAval.value,
        etat: selectEtat.value,
      }),
    });
  }, 500);

  [inputRepere, inputAmont, inputAval].forEach((inp) => inp.addEventListener('input', sauvegarder));
  selectEtat.addEventListener('change', sauvegarder);

  btnDelete.addEventListener('click', async () => {
    if (r.id) await fetch(`/api/reperages/${r.id}`, { method: 'DELETE' });
    tr.remove();
  });

  return tr;
}

document.getElementById('btn-ajouter-ligne').addEventListener('click', async () => {
  if (!currentAnalysisId) return;
  const res = await fetch(`/api/analyses/${currentAnalysisId}/reperages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repere: '', fil_amont: '', fil_aval: '' }),
  });
  const data = await res.json();
  const tbody = document.getElementById('tbody-reperages');
  tbody.appendChild(creerLigneReperage({ id: data.id, repere: '', fil_amont: '', fil_aval: '', etat: 'a_verifier' }));
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Navigation entre vues
document.querySelectorAll('.nav-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'historique') chargerHistorique();
  });
});

async function chargerHistorique() {
  const res = await fetch('/api/analyses');
  const analyses = await res.json();
  const container = document.getElementById('liste-historique');
  container.innerHTML = '';

  if (analyses.length === 0) {
    container.innerHTML = '<p class="muted">Aucune analyse pour le moment.</p>';
    return;
  }

  analyses.forEach((a) => {
    const div = document.createElement('div');
    div.className = 'historique-item';
    div.innerHTML = `
      <img class="historique-thumb" src="/uploads/${a.photo_filename}" alt="">
      <div class="historique-meta">
        <div><strong>Analyse #${a.id}</strong></div>
        <div class="historique-date">${new Date(a.created_at).toLocaleString('fr-FR')}</div>
      </div>
    `;
    div.addEventListener('click', () => ouvrirAnalyse(a.id));
    container.appendChild(div);
  });
}

async function ouvrirAnalyse(id) {
  const res = await fetch(`/api/analyses/${id}`);
  const data = await res.json();
  currentAnalysisId = data.id;

  document.querySelectorAll('.nav-link').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelector('[data-view="capture"]').classList.add('active');
  document.getElementById('view-capture').classList.add('active');

  previewImg.src = `/uploads/${data.photo_filename}`;
  previewImg.hidden = false;
  capturePlaceholder.hidden = true;
  analyseActions.hidden = true;

  afficherResultat(data);
}
