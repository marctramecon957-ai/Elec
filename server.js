require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { analyserPhoto } = require('./analyse');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Upload + analyse d'une photo
app.post('/api/analyser', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune photo recue' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Cle API Gemini non configuree sur le serveur' });
    }

    const resultat = await analyserPhoto(req.file.path, req.file.mimetype);

    const insertAnalyse = db.prepare(`
      INSERT INTO analyses (photo_filename, materiaux, cables, rails, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insertAnalyse.run(
      req.file.filename,
      JSON.stringify(resultat.materiaux || []),
      JSON.stringify(resultat.cables || []),
      JSON.stringify(resultat.rails || []),
      resultat.notes || ''
    );
    const analysisId = info.lastInsertRowid;

    const insertReperage = db.prepare(`
      INSERT INTO reperages (analysis_id, repere, fil_amont, fil_aval, etat)
      VALUES (?, ?, ?, ?, 'a_verifier')
    `);
    (resultat.reperages || []).forEach((r) => {
      insertReperage.run(analysisId, r.repere || '', r.fil_amont || '', r.fil_aval || '');
    });

    const reperages = db.prepare('SELECT * FROM reperages WHERE analysis_id = ?').all(analysisId);

    res.json({
      id: analysisId,
      photo_url: `/uploads/${req.file.filename}`,
      materiaux: resultat.materiaux || [],
      cables: resultat.cables || [],
      rails: resultat.rails || [],
      notes: resultat.notes || '',
      reperages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'analyse de la photo' });
  }
});

// Liste des analyses (historique)
app.get('/api/analyses', (req, res) => {
  const analyses = db.prepare('SELECT * FROM analyses ORDER BY created_at DESC').all();
  res.json(analyses);
});

// Detail d'une analyse
app.get('/api/analyses/:id', (req, res) => {
  const analyse = db.prepare('SELECT * FROM analyses WHERE id = ?').get(req.params.id);
  if (!analyse) return res.status(404).json({ error: 'Analyse introuvable' });
  const reperages = db.prepare('SELECT * FROM reperages WHERE analysis_id = ?').all(req.params.id);
  res.json({
    ...analyse,
    materiaux: JSON.parse(analyse.materiaux || '[]'),
    cables: JSON.parse(analyse.cables || '[]'),
    rails: JSON.parse(analyse.rails || '[]'),
    reperages,
  });
});

// Ajouter une ligne de reperage manuellement
app.post('/api/analyses/:id/reperages', (req, res) => {
  const { repere, fil_amont, fil_aval } = req.body;
  const stmt = db.prepare(`
    INSERT INTO reperages (analysis_id, repere, fil_amont, fil_aval, etat, edite_manuellement)
    VALUES (?, ?, ?, ?, 'a_verifier', 1)
  `);
  const info = stmt.run(req.params.id, repere || '', fil_amont || '', fil_aval || '');
  res.json({ id: info.lastInsertRowid });
});

// Modifier une ligne de reperage
app.put('/api/reperages/:id', (req, res) => {
  const { repere, fil_amont, fil_aval, etat } = req.body;
  db.prepare(`
    UPDATE reperages
    SET repere = ?, fil_amont = ?, fil_aval = ?, etat = ?, edite_manuellement = 1
    WHERE id = ?
  `).run(repere, fil_amont, fil_aval, etat, req.params.id);
  res.json({ success: true });
});

// Supprimer une ligne de reperage
app.delete('/api/reperages/:id', (req, res) => {
  db.prepare('DELETE FROM reperages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Serveur demarre sur le port ${PORT}`);
});
