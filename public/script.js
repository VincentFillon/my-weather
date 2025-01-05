const snowflakes = document.getElementById('snowflakes-container');
const toggleSnowflakesButton = document.getElementById('toggle-snowflakes');

const currentDateElement = document.getElementById('current-date');

const participantList = document.getElementById('participant-list');
const addParticipantButton = document.getElementById('add-participant');
const newParticipantInput = document.getElementById('new-participant');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginButton = document.getElementById('admin-login');

const medianMood = document.getElementById('most-used-mood');

const resetButton = document.getElementById('reset');

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);

let isAdmin = false;

// API pour la gestion du JSON
const API = {
  data: {
    date: null,
    participants: [],
    columns: [],
    positions: {},
  },

  async load() {
    const response = await fetch('/api/data');
    const data = await response.json();
    this.data = data;
    return data;
  },

  addParticipant(participant) {
    return fetch('/api/participants/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant }),
    });
  },

  removeParticipant(participant) {
    return fetch('/api/participants/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant }),
    });
  },

  addPosition(key, value) {
    return fetch('/api/positions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  },

  updatePosition(key, value) {
    return fetch('/api/positions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  },

  removePosition(key) {
    return fetch('/api/positions/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
  },
};

socket.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  API.data = data;
  renderParticipants();
  // renderColumns();
  updatePositions();
});

const userName = localStorage.getItem('userName') || prompt('Veuillez entrer votre pseudonyme:');
if (!localStorage.getItem('userName')) {
  localStorage.setItem('userName', userName);
  if (!API.data.participants.includes(userName)) {
    API.addParticipant(userName).then(() => {
      renderParticipants();
    });
  } else {
    renderParticipants();
  }
}

const activateParticipant = (participant, name) => {
  participant.setAttribute('draggable', 'true');

  let removeButton = participant.querySelector('.remove');
  if (!removeButton) {
    removeButton = document.createElement('span');
    removeButton.classList.add('remove');
    participant.appendChild(removeButton);
  }

  updateRemoveButtonIcon(removeButton, false); // Initialement, c'est une croix rouge

  removeButton.onclick = e => {
    e.preventDefault();
    const isInTable = document.querySelector(`.cell .participant[data-name="${name}"]`);
    if (isInTable) {
      // Déplacer le participant dans la liste au lieu de le supprimer
      participantList.appendChild(isInTable);
      updateRemoveButtonIcon(removeButton, false); // Changer l'icône pour une croix rouge
      savePositions();
    } else {
      // Supprimer définitivement
      API.removeParticipant(name).then(() => {
        renderParticipants();
      });
    }
  };

  participant.addEventListener('dragstart', () => {
    participant.classList.add('dragging');
  });

  participant.addEventListener('dragend', () => {
    participant.classList.remove('dragging');
    savePositions();
  });
};

const renderParticipants = () => {
  participantList.innerHTML = '';
  API.data.participants.sort(); // Trie les participants par ordre alphabétique

  API.data.participants.forEach(name => {
    let participant = document.querySelector(`.participant[data-name="${name}"]`);
    if (!participant) {
      participant = document.createElement('div');
      participant.classList.add('participant');
      participant.dataset.name = name;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;

      participant.appendChild(nameSpan);

      if (name === userName || isAdmin) {
        activateParticipant(participant, name);
      }

      participantList.appendChild(participant);
    } else if (name === userName || isAdmin) {
      activateParticipant(participant, name);
    }
  });
};

const savePositions = () => {
  const positions = {};

  document.querySelectorAll('.participant').forEach(participant => {
    const parentCell = participant.parentElement;
    const removeButton = participant.querySelector('.remove');

    if (parentCell.classList.contains('cell')) {
      positions[participant.dataset.name] = parentCell.dataset.mood;
      if (participant.dataset.name === userName || isAdmin) {
        updateRemoveButtonIcon(removeButton, true); // Mettre un back
      }
    } else {
      if (participant.dataset.name === userName || isAdmin) {
        updateRemoveButtonIcon(removeButton, false); // Mettre une croix rouge
      }
    }
  });

  Object.keys(positions).forEach(key => {
    if (API.data.positions[key] !== positions[key]) {
      API.updatePosition(key, positions[key]);
    }
  });

  Object.keys(API.data.positions).forEach(key => {
    if (!positions[key]) {
      API.removePosition(key);
    }
  });

  API.data.positions = positions;
};

const updateRemoveButtonIcon = (button, isInTable) => {
  if (isInTable) {
    button.innerHTML = '🔙'; // Back
    button.style.fontSize = '14px';
    button.setAttribute('title', 'Retirer');
  } else {
    button.innerHTML = '❌'; // Croix rouge
    button.style.fontSize = '12px';
    button.setAttribute('title', 'Supprimer');
  }
};

addParticipantButton.addEventListener('click', () => {
  const name = newParticipantInput.value.trim();
  if (name && !API.data.participants.includes(name)) {
    API.addParticipant(name).then(() => {
      renderParticipants();
      newParticipantInput.value = '';
    });
  }
});

participantList.addEventListener('dragover', e => e.preventDefault());
participantList.addEventListener('drop', e => {
  e.preventDefault();
  const draggingParticipant = document.querySelector('.participant.dragging');
  if (draggingParticipant) {
    participantList.appendChild(draggingParticipant);
    savePositions();
    renderParticipants(); // Assure le tri après déplacement
  }
});

const updatePositions = () => {
  Object.keys(API.data.positions).forEach(name => {
    const cell = document.querySelector(`.cell[data-mood="${API.data.positions[name]}"]`);
    const participant = document.querySelector(`.participant[data-name="${name}"]`);

    if (cell && participant) {
      cell.appendChild(participant);
    }
  });

  document.querySelectorAll('.participant').forEach(participant => {
    const parentCell = participant.parentElement;
    const removeButton = participant.querySelector('.remove');

    if (parentCell.classList.contains('cell')) {
      if (participant.dataset.name === userName || isAdmin) {
        updateRemoveButtonIcon(removeButton, true); // Mettre un back
      }
    } else {
      if (participant.dataset.name === userName || isAdmin) {
        updateRemoveButtonIcon(removeButton, false); // Mettre une croix rouge
      }
    }
  });

  const droppableCells = document.querySelectorAll('.cell');

  droppableCells.forEach(cell => {
    cell.addEventListener('dragover', e => {
      e.preventDefault();
      cell.classList.add('droppable');
    });

    cell.addEventListener('dragleave', () => {
      cell.classList.remove('droppable');
    });

    cell.addEventListener('drop', e => {
      e.preventDefault();
      const draggingParticipant = document.querySelector('.participant.dragging');
      if (draggingParticipant && (draggingParticipant.dataset.name === userName || isAdmin)) {
        cell.appendChild(draggingParticipant);
        cell.classList.remove('droppable');
        savePositions();
      }
    });
  });

  updateMedianMood();
};

const calculateMedianMood = () => {
  const participantsMood = [];
  API.data.columns.forEach(column => {
    const mood = column.id;
    participantsMood.push(...Object.values(API.data.positions).filter(p => p === mood));
  });

  const half = Math.floor(participantsMood.length / 2);

  return participantsMood[half];
  // if (participantsMood.length % 2) {
  //   return participantsMood[half];
  // } else {
  //   return participantsMood[half];
  // }
};

const updateMedianMood = () => {
  // Calculer l'humeur médiane de l'ensemble des participants
  const medianMoodId = calculateMedianMood(API.data.positions);

  const medianMoodCol = API.data.columns.find(column => column.id === medianMoodId);

  const title = document.createElement('span');
  title.textContent = `Humeur médiane des participants`;

  const img = document.createElement('img');
  img.src = medianMoodCol.image;
  img.alt = medianMoodCol.title;
  const span = document.createElement('span');
  span.textContent = medianMoodCol.title;

  medianMood.innerHTML = '';
  medianMood.appendChild(title);
  medianMood.appendChild(document.createElement('br'));
  medianMood.appendChild(img);
  medianMood.appendChild(document.createElement('br'));
  medianMood.appendChild(span);
};

const renderColumns = async () => {
  const columnsHeader = document.getElementById('columns-header');
  const columnsBody = document.getElementById('columns-body');

  columnsHeader.innerHTML = '';
  columnsBody.innerHTML = '';

  const validMoods = API.data.columns.map(column => column.id);

  API.data.columns.forEach(column => {
    const th = document.createElement('th');
    const img = document.createElement('img');
    img.src = column.image;
    img.alt = column.title;
    const span = document.createElement('span');
    span.textContent = column.title;

    th.appendChild(img);
    th.appendChild(document.createElement('br'));
    th.appendChild(span);

    if (column.sound) {
      const soundButton = document.createElement('button');
      soundButton.innerHTML = '🔊';
      soundButton.style.marginLeft = '5px';
      soundButton.addEventListener('click', () => {
        const audio = new Audio(column.sound);
        audio.play();
      });
      th.appendChild(soundButton);
    }

    columnsHeader.appendChild(th);

    const td = document.createElement('td');
    td.classList.add('cell');
    td.dataset.mood = column.id;
    columnsBody.appendChild(td);
  });

  // Remettre les participants dans la liste si leur colonne n'existe plus
  Object.keys(API.data.positions).forEach(name => {
    if (!validMoods.includes(API.data.positions[name])) {
      delete API.data.positions[name];
    }
  });

  updatePositions();
};

adminLoginButton.addEventListener('click', () => {
  const password = adminPasswordInput.value.trim();
  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  }).then(response => {
    if (response.status === 200) {
      isAdmin = true;
      renderParticipants();
      updatePositions();
      document.querySelector('.admin-container').style.display = 'none';
      document.querySelector('.add-participant-container').style.display = 'block';
    } else {
      alert('Mot de passe incorrect');
    }
  });
});

resetButton.addEventListener('click', () => {
  localStorage.clear();
  document.location.reload();
});

toggleSnowflakesButton.addEventListener('click', () => {
  if (snowflakes.style.display === 'none') {
    snowflakes.style.display = 'block';
    toggleSnowflakesButton.classList.remove('btn-success');
    toggleSnowflakesButton.classList.add('btn-danger');
  } else {
    snowflakes.style.display = 'none';
    toggleSnowflakesButton.classList.remove('btn-danger');
    toggleSnowflakesButton.classList.add('btn-success');
  }
  localStorage.setItem('toggle-snowflakes', snowflakes.style.display);
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.add-participant-container').style.display = 'none';

  API.load().then(() => {
    const displaySnow = localStorage.getItem('toggle-snowflakes');
    if (displaySnow === 'block') {
      snowflakes.style.display = 'block';
      toggleSnowflakesButton.classList.remove('btn-success');
      toggleSnowflakesButton.classList.add('btn-danger');
    } else {
      snowflakes.style.display = 'none';
      toggleSnowflakesButton.classList.remove('btn-danger');
      toggleSnowflakesButton.classList.add('btn-success');
    }

    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    currentDateElement.textContent = `${formattedDate}`;

    renderParticipants();
    renderColumns();
  });
});

// Fonction pour activer les boutons au chargement de la page
function activateButtonsFromLocalStorage() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('toggle-')) {
      const value = localStorage.getItem(key);
      if (value === 'true') {
        const button = document.getElementById(key);
        if (button) {
          button.classList.add('active');
        }
      }
    }
  }
}
activateButtonsFromLocalStorage();


// Récupérer tous les boutons avec la classe "theme_unique"
const buttons = document.querySelectorAll('.theme_unique');
// Ajoute un gestionnaire de clic à chaque bouton
buttons.forEach(button => {
  button.addEventListener('click', () => {
    // Trouve tous les boutons actuellement actifs
    const activeButtons = document.querySelectorAll('.theme_unique.active');

    // Simule un clic sur chaque bouton actif
    activeButtons.forEach(activeButton => {
      if (activeButton !== button) {
        activeButton.click(); // Simule un clic
      }
    });

    // Gere la classe 'active'
    buttons.forEach(btn => {
	  if (btn === button) {
		  if (button.classList.contains('active')) {
	          button.classList.remove('active');
		  } else {
			  button.classList.add('active');
		  }
	  } else {
		  btn.classList.remove('active')
	  }
	});
  });
});
