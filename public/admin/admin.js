const columnsList = document.getElementById('columns-list');
const addColumnButton = document.getElementById('add-column');
const newColumnImageInput = document.getElementById('new-column-image');
const newColumnTitleInput = document.getElementById('new-column-title');
const newColumnSoundInput = document.getElementById('new-column-sound');
const newColumnIdInput = document.getElementById('new-column-id');
const loginForm = document.getElementById('login-form');
const adminContainer = document.getElementById('admin-container');
const loginContainer = document.getElementById('login-container');

// API pour la gestion des colonnes
const API = {
  async loadColumns() {
    const response = await fetch('/api/columns');
    const columns = await response.json();
    return columns;
  },

  addColumn(column) {
    return fetch('/api/columns/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column }),
    });
  },

  updateColumn(index, column) {
    return fetch('/api/columns/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, column }),
    });
  },

  removeColumn(index) {
    return fetch('/api/columns/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index }),
    });
  },
};

const renderColumns = async () => {
  const columns = await API.loadColumns();
  columnsList.innerHTML = '';

  columns.forEach((column, index) => {
    const columnDiv = document.createElement('div');
    columnDiv.classList.add('column');
    columnDiv.style.marginBottom = '10px';

    const imageInput = document.createElement('input');
    imageInput.type = 'text';
    imageInput.value = column.image;
    imageInput.placeholder = 'URL de l\'image';
    imageInput.addEventListener('change', () => {
      API.updateColumn(index, { image: imageInput.value, title: titleInput.value, sound: soundInput.value || null, id: idInput.value });
    });
    imageInput.style.marginLeft = '5px';
    imageInput.style.marginRight = '5px';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = column.title;
    titleInput.placeholder = 'Titre de la colonne';
    titleInput.addEventListener('change', () => {
      API.updateColumn(index, { image: imageInput.value, title: titleInput.value, sound: soundInput.value || null, id: idInput.value });
    });
    titleInput.style.marginLeft = '5px';
    titleInput.style.marginRight = '5px';

    const soundInput = document.createElement('input');
    soundInput.type = 'text';
    soundInput.value = column.sound || null;
    soundInput.placeholder = 'URL du son (optionel)';
    soundInput.addEventListener('change', () => {
      API.updateColumn(index, { image: imageInput.value, title: soundInput.value, sound: soundInput.value || null, id: idInput.value });
    });
    soundInput.style.marginLeft = '5px';
    soundInput.style.marginRight = '5px';

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.value = column.id;
    idInput.placeholder = 'Id (unique)';
    idInput.addEventListener('change', () => {
      API.updateColumn(index, { image: imageInput.value, title: titleInput.value, sound: soundInput.value || null, id: idInput.value });
    });
    idInput.style.marginLeft = '5px';
    idInput.style.marginRight = '5px';

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Supprimer';
    removeButton.addEventListener('click', () => {
      API.removeColumn(index).then(renderColumns);
    });

    columnDiv.appendChild(imageInput);
    columnDiv.appendChild(titleInput);
    columnDiv.appendChild(soundInput);
    columnDiv.appendChild(idInput);
    columnDiv.appendChild(removeButton);

    columnsList.appendChild(columnDiv);
  });
};

addColumnButton.addEventListener('click', () => {
  const image = newColumnImageInput.value.trim();
  const title = newColumnTitleInput.value.trim();
  const id = newColumnIdInput.value.trim();
  if (image && title && id) {
    API.addColumn({ image, title, id }).then(() => {
      newColumnImageInput.value = '';
      newColumnTitleInput.value = '';
      newColumnIdInput.value = '';
      renderColumns();
    });
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('admin-password').value.trim();
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (response.status === 200) {
    loginContainer.style.display = 'none';
    adminContainer.style.display = 'block';
    renderColumns();
  } else {
    alert('Mot de passe incorrect');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loginContainer.style.display = 'block';
  adminContainer.style.display = 'none';
});