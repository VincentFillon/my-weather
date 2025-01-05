const pokemonToggleButton = document.getElementById('toggle-pokemon');
const POKEMON_STORAGE_KEY = 'toggle-pokemon';
let pokemonLink;
let pokemonFont;

// Fonction pour charger ou retirer la feuille de style
function setPokemonCss(enabled) {
  if (enabled) {
    if (!pokemonLink) {
      pokemonLink = document.createElement('link');
      pokemonLink.rel = 'stylesheet';
      pokemonLink.href = 'pokemon.css';
      document.head.appendChild(pokemonLink);
    }
	if (!pokemonFont) {
	  pokemonFont = document.createElement('link');
      pokemonFont.rel = 'stylesheet';
      pokemonFont.href = 'https://fonts.cdnfonts.com/css/pokemon-solid';
      document.head.appendChild(pokemonFont);
    }
    pokemonToggleButton.classList.remove('btn-success');
    pokemonToggleButton.classList.add('btn-danger');
    pokemonToggleButton.textContent = '✖️';
  } else {
    pokemonLink?.remove();
    pokemonLink = null;
	pokemonFont?.remove();
    pokemonFont = null;
    pokemonToggleButton.classList.remove('btn-danger');
    pokemonToggleButton.classList.add('btn-success');
    pokemonToggleButton.textContent = '😻';
  }
  // Sauvegarde dans le localStorage
  localStorage.setItem(POKEMON_STORAGE_KEY, enabled);
}

// Charger l'état au démarrage
const pokemonCssEnabled = JSON.parse(localStorage.getItem(POKEMON_STORAGE_KEY)) || false;
setPokemonCss(pokemonCssEnabled);

// Gérer le clic sur le bouton
pokemonToggleButton.addEventListener('click', () => {
  setPokemonCss(!pokemonLink);
});
