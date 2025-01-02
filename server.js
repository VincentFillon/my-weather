const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3005;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Charger les données du fichier JSON
const loadData = () => {
  const today = new Date().toLocaleDateString();
  if (!fs.existsSync(DATA_FILE)) {
    return { date: today, participants: [], positions: {} };
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (today !== data.date) {
    const archivedFileName = `data_${data.date.replace(/\//g, '-')}.json`;
    fs.writeFileSync(path.join(DATA_DIR, archivedFileName), JSON.stringify(data, null, 2));
    data.date = today;
    data.positions = {};
    saveData(data);
  }
  return data;
};

// Sauvegarder les données dans le fichier JSON
const saveData = data => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Afficher la date actuelle
const updateDate = () => {
};

// Notifier tous les clients WebSocket
const notifyClients = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// API pour récupérer les données
app.get('/api/data', (req, res) => {
  const data = loadData();
  res.json(data);
});

const sanitizeInput = input => {
  if (typeof input === 'string') {
    return input
      .replace(/[\\]/g, '\\\\')
      .replace(/[\"]/g, '\\"')
      .replace(/[\/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t')
      .replace(/[<>]/g, '');
  }
  return input;
};

const ADMIN_PASSWORD = 'Il y a master dedans'; // Remplacez par votre mot de passe administrateur

// Middleware pour vérifier le mot de passe administrateur
const checkAdminPassword = (req, res, next) => {
  const password = req.headers['admin-password'];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).send('Mot de passe incorrect.');
  }
};

// API pour vérifier le mot de passe administrateur
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.status(200).send('Mot de passe correct.');
  } else {
    res.status(401).send('Mot de passe incorrect.');
  }
});

// Protéger l'accès à la page /admin
app.use('/admin', checkAdminPassword, express.static(path.join(__dirname, 'public/admin')));

// API pour mettre à jour la date
app.post('/api/date', (req, res) => {
  const { date } = req.body;
  const sanitizedDate = sanitizeInput(date);
  const data = loadData();
  data.date = sanitizedDate;
  saveData(data);
  notifyClients(data);
  res.status(200).send('Date sauvegardée.');
});

// API pour ajouter un participant
app.post('/api/participants/add', (req, res) => {
  const { participant } = req.body;
  const sanitizedParticipant = sanitizeInput(participant);
  const data = loadData();
  if (!data.participants.includes(sanitizedParticipant)) {
    data.participants.push(sanitizedParticipant);
    saveData(data);
    notifyClients(data);
    res.status(200).json({ participants: data.participants });
  } else {
    res.status(400).send('Participant existe déjà.');
  }
});

// API pour supprimer un participant
app.post('/api/participants/remove', (req, res) => {
  const { participant } = req.body;
  const sanitizedParticipant = sanitizeInput(participant);
  const data = loadData();
  const index = data.participants.indexOf(sanitizedParticipant);
  if (index !== -1) {
    data.participants.splice(index, 1);
    saveData(data);
    notifyClients(data);
    res.status(200).json({ participants: data.participants });
  } else {
    res.status(400).send('Participant non trouvé.');
  }
});

// API pour ajouter une position
app.post('/api/positions/add', (req, res) => {
  const { key, value } = req.body;
  const sanitizedKey = sanitizeInput(key);
  const sanitizedValue = sanitizeInput(value);
  const data = loadData();
  if (!data.positions[sanitizedKey]) {
    data.positions[sanitizedKey] = sanitizedValue;
    saveData(data);
    notifyClients(data);
    res.status(200).json({ positions: data.positions });
  } else {
    res.status(400).send('Position existe déjà.');
  }
});

// API pour modifier une position
app.post('/api/positions/update', (req, res) => {
  const { key, value } = req.body;
  const sanitizedKey = sanitizeInput(key);
  const sanitizedValue = sanitizeInput(value);
  const data = loadData();
  if (!data.positions[sanitizedKey] || data.positions[sanitizedKey] !== sanitizedValue) {
    data.positions[sanitizedKey] = sanitizedValue;
    saveData(data);
    notifyClients(data);
    res.status(200).json({ positions: data.positions });
  } else {
    res.status(400).send('Position existe déjà.');
  }
});

// API pour supprimer une position
app.post('/api/positions/remove', (req, res) => {
  const { key } = req.body;
  const sanitizedKey = sanitizeInput(key);
  const data = loadData();
  if (data.positions[sanitizedKey]) {
    delete data.positions[sanitizedKey];
    saveData(data);
    notifyClients(data);
    res.status(200).json({ positions: data.positions });
  } else {
    res.status(400).send('Position non trouvée.');
  }
});

// API pour récupérer les colonnes
app.get('/api/columns', (req, res) => {
  const data = loadData();
  res.json(data.columns || []);
});

// API pour ajouter une colonne
app.post('/api/columns/add', (req, res) => {
  const { column } = req.body;
  const data = loadData();
  data.columns = data.columns || [];
  if (!data.columns.some(c => c.id === column.id)) {
    data.columns.push(column);
    saveData(data);
    notifyClients(data);
    res.status(200).json({ columns: data.columns });
  } else {
    res.status(400).send('Une colonne avec le même id existe déjà.');
  }
});

// API pour modifier une colonne
app.post('/api/columns/update', (req, res) => {
  const { index, column } = req.body;
  const data = loadData();
  if (data.columns && data.columns[index]) {
    data.columns[index] = column;
    saveData(data);
    notifyClients(data);
    res.status(200).json({ columns: data.columns });
  } else {
    res.status(400).send('Colonne non trouvée.');
  }
});

// API pour supprimer une colonne
app.post('/api/columns/remove', (req, res) => {
  const { index } = req.body;
  const data = loadData();
  if (data.columns && data.columns[index]) {
    data.columns.splice(index, 1);
    saveData(data);
    notifyClients(data);
    res.status(200).json({ columns: data.columns });
  } else {
    res.status(400).send('Colonne non trouvée.');
  }
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
