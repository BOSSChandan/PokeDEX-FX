// Constants and Cache
const POKEMON_API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 20;
const pokemonCache = new Map();
const speciesCache = new Map();
const moveCache = new Map();

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const pokemonImage = document.getElementById('pokemon-image');
const loadingScreen = document.querySelector('.loading-screen');
const pokemonGrid = document.getElementById('pokemon-grid');
const pokemonDetailView = document.getElementById('pokemon-detail-view');
const backButton = document.getElementById('back-button');
const loadMoreButton = document.getElementById('load-more');
const regionFilter = document.getElementById('region-filter');
const formFilter = document.getElementById('form-filter');

// Settings and Theme Management
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const compactLayoutToggle = document.getElementById('compact-layout');
const themeButtons = document.querySelectorAll('.theme-btn');
const colorButtons = document.querySelectorAll('.color-btn');

// Move Modal Elements
const moveModal = document.getElementById('move-modal');
const closeModal = document.querySelector('.close-modal');

// State
let currentPage = 1;
let currentView = 'grid';
let isLoading = false;
let allPokemonList = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
searchInput.addEventListener('input', handleSearchSuggestions);
backButton.addEventListener('click', showGridView);
loadMoreButton.addEventListener('click', loadMorePokemon);
regionFilter.addEventListener('change', filterPokemon);
formFilter.addEventListener('change', filterPokemon);

// Type effectiveness multipliers
const typeEffectiveness = {
    normal: { ghost: 0, rock: 0.5, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

// Initialize the app
async function initializeApp() {
    showLoading();
    try {
        // Fetch all Pokemon for better search and filtering
        const response = await fetch(`${POKEMON_API_BASE_URL}/pokemon?limit=1200`);
        const data = await response.json();
        allPokemonList = data.results;
        
        // Display initial Pokemon
        await displayPokemonGrid(allPokemonList.slice(0, POKEMON_PER_PAGE));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

// Main search handler
async function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) return;

    showLoading();
    try {
        const pokemon = await fetchPokemonData(searchTerm);
        if (pokemon) {
            await showPokemonDetails(pokemon.name);
        } else {
            alert('Pokemon not found! Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Pokemon not found! Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle search suggestions
async function handleSearchSuggestions() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm.length < 2) {
        hideSearchSuggestions();
        return;
    }

    const suggestions = allPokemonList
        .filter(pokemon => pokemon.name.includes(searchTerm))
        .slice(0, 5)
        .map(pokemon => pokemon.name);

    displaySearchSuggestions(suggestions);
}

// Display search suggestions
function displaySearchSuggestions(suggestions) {
    let suggestionsContainer = document.getElementById('search-suggestions');
    
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'search-suggestions';
        suggestionsContainer.className = 'search-suggestions';
        searchInput.parentNode.appendChild(suggestionsContainer);
    }

    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }

    suggestionsContainer.innerHTML = suggestions
        .map(suggestion => `<div class="suggestion-item">${suggestion}</div>`)
        .join('');

    suggestionsContainer.style.display = 'block';

    // Add click handlers for suggestions
    const suggestionItems = suggestionsContainer.getElementsByClassName('suggestion-item');
    Array.from(suggestionItems).forEach(item => {
        item.addEventListener('click', () => {
            searchInput.value = item.textContent;
            hideSearchSuggestions();
            handleSearch();
        });
    });
}

// Hide search suggestions
function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Click outside to hide suggestions
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        hideSearchSuggestions();
    }
});

// Fetch Pokemon data with error handling
async function fetchPokemonData(nameOrId) {
    try {
        if (pokemonCache.has(nameOrId)) {
            return pokemonCache.get(nameOrId);
        }

        const response = await fetch(`${POKEMON_API_BASE_URL}/pokemon/${nameOrId}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        pokemonCache.set(nameOrId, data);
        return data;
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
        return null;
    }
}

// Show Pokemon details
async function showPokemonDetails(nameOrId) {
    showLoading();
    try {
        const pokemon = await fetchPokemonData(nameOrId);
        if (!pokemon) {
            alert('Pokemon not found!');
            return;
        }

        await displayPokemonData(pokemon);
        const evolutionChain = await fetchEvolutionChain(pokemon.species.url);
        await displayEvolutionChain(evolutionChain);
        const speciesData = await fetchSpeciesData(pokemon.species.url);
        displayAdditionalInfo(speciesData);
        
        pokemonGrid.style.display = 'none';
        pokemonDetailView.style.display = 'block';
        currentView = 'detail';
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load Pokemon details!');
    } finally {
        hideLoading();
    }
}

// Display Pokemon Grid
async function displayPokemonGrid(pokemonList) {
    const fragment = document.createDocumentFragment();

    await Promise.all(pokemonList.map(async (pokemon) => {
        try {
            const pokemonData = await fetchPokemonData(pokemon.name);
            const gridItem = createPokemonGridItem(pokemonData);
            fragment.appendChild(gridItem);
        } catch (error) {
            console.error(`Error loading ${pokemon.name}:`, error);
        }
    }));

    pokemonGrid.appendChild(fragment);
}

// Create Pokemon Grid Item
function createPokemonGridItem(pokemon) {
    const gridItem = document.createElement('div');
    gridItem.className = 'pokemon-grid-item';
    
    const imageUrl = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    
    gridItem.innerHTML = `
        <img src="${imageUrl}" alt="${pokemon.name}">
        <div class="grid-pokemon-id">#${String(pokemon.id).padStart(3, '0')}</div>
        <div class="grid-pokemon-name">${pokemon.name}</div>
        <div class="grid-pokemon-types">
            ${pokemon.types.map(type => 
                `<span class="type-badge" style="background-color: var(--type-${type.type.name})">${type.type.name}</span>`
            ).join('')}
        </div>
    `;

    gridItem.addEventListener('click', () => showPokemonDetails(pokemon.name));
    return gridItem;
}

// Load More Pokemon
async function loadMorePokemon() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
        const offset = currentPage * POKEMON_PER_PAGE;
        const response = await fetch(`${POKEMON_API_BASE_URL}/pokemon?limit=${POKEMON_PER_PAGE}&offset=${offset}`);
        const data = await response.json();
        await displayPokemonGrid(data.results);
        currentPage++;
    } catch (error) {
        console.error('Error:', error);
    } finally {
        hideLoading();
        isLoading = false;
    }
}

// Filter Pokemon
async function filterPokemon() {
    const region = regionFilter.value;
    const form = formFilter.value;
    
    showLoading();
    pokemonGrid.innerHTML = '';
    currentPage = 1;

    try {
        let pokemonList;
        if (form === 'regional') {
            pokemonList = await fetchRegionalForms(region);
        } else {
            pokemonList = await fetchNormalForms(region);
        }

        await displayPokemonGrid(pokemonList.slice(0, POKEMON_PER_PAGE));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

// Show Grid View
function showGridView() {
    pokemonDetailView.style.display = 'none';
    pokemonGrid.style.display = 'grid';
    currentView = 'grid';
}

// Fetch evolution chain data
async function fetchEvolutionChain(speciesUrl) {
    const speciesResponse = await fetch(speciesUrl);
    const speciesData = await speciesResponse.json();

    const evolutionResponse = await fetch(speciesData.evolution_chain.url);
    const evolutionData = await evolutionResponse.json();

    return evolutionData;
}

// Display evolution chain
async function displayEvolutionChain(evolutionData) {
    const evolutionContainer = document.querySelector('.evolution-container');
    evolutionContainer.innerHTML = '';

    const chain = [];
    let currentEvolution = evolutionData.chain;

    while (currentEvolution) {
        chain.push(currentEvolution.species.name);
        currentEvolution = currentEvolution.evolves_to[0];
    }

    for (const pokemonName of chain) {
        const pokemon = await fetchPokemonData(pokemonName);
        const evolutionItem = document.createElement('div');
        evolutionItem.className = 'evolution-item';
        
        const image = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
        evolutionItem.innerHTML = `
            <img src="${image}" alt="${pokemon.name}">
            <p>${pokemon.name}</p>
        `;

        evolutionItem.addEventListener('click', () => {
            searchInput.value = pokemon.name;
            handleSearch();
        });

        evolutionContainer.appendChild(evolutionItem);
    }
}

// Fetch species data
async function fetchSpeciesData(speciesUrl) {
    const speciesId = speciesUrl.split('/').slice(-2, -1)[0];
    if (speciesCache.has(speciesId)) {
        return speciesCache.get(speciesId);
    }

    const response = await fetch(speciesUrl);
    const data = await response.json();
    speciesCache.set(speciesId, data);
    return data;
}

// Display Pokemon data
async function displayPokemonData(pokemon) {
    // Set Pokemon image
    const imageUrl = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    pokemonImage.src = imageUrl;
    pokemonImage.alt = pokemon.name;

    // Set Pokemon ID
    document.querySelector('.pokemon-id').textContent = `#${String(pokemon.id).padStart(3, '0')}`;

    // Set Pokemon name
    document.querySelector('.pokemon-name').textContent = pokemon.name;

    // Set Pokemon types
    const typesContainer = document.querySelector('.pokemon-types');
    typesContainer.innerHTML = pokemon.types
        .map(type => `<span class="type-badge" style="background-color: var(--type-${type.type.name})">${type.type.name}</span>`)
        .join('');

    // Set Pokemon stats
    const statsContainer = document.querySelector('.stats-container');
    statsContainer.innerHTML = pokemon.stats
        .map(stat => {
            const statName = stat.stat.name.replace('-', ' ');
            const statValue = stat.base_stat;
            return `
                <div class="stat-bar">
                    <span class="stat-name">${statName}</span>
                    <div class="stat-value" style="width: ${statValue}px"></div>
                    <span>${statValue}</span>
                </div>
            `;
        })
        .join('');

    // Set Pokemon details
    document.querySelector('.height-value').textContent = `${pokemon.height / 10}m`;
    document.querySelector('.weight-value').textContent = `${pokemon.weight / 10}kg`;
    document.querySelector('.abilities-value').textContent = pokemon.abilities
        .map(ability => ability.ability.name.replace('-', ' '))
        .join(', ');

    // Calculate and display total stats
    const totalStats = pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
    const totalStatsContainer = document.querySelector('.total-stats');
    totalStatsContainer.innerHTML = `
        <span class="total-stats-label">Total Base Stats:</span>
        <span class="total-stats-value">${totalStats}</span>
    `;

    // Set moves information
    const levelMoves = document.querySelector('.level-moves');
    const tmMoves = document.querySelector('.tm-moves');
    const eggMoves = document.querySelector('.egg-moves');
    const tutorMoves = document.querySelector('.tutor-moves');

    // Clear previous moves
    levelMoves.innerHTML = '';
    tmMoves.innerHTML = '';
    eggMoves.innerHTML = '';
    tutorMoves.innerHTML = '';

    // Fetch move details and organize them
    const movePromises = pokemon.moves.map(async move => {
        if (moveCache.has(move.move.name)) {
            return { moveData: moveCache.get(move.move.name), versionDetails: move.version_group_details };
        }
        const response = await fetch(move.move.url);
        const moveData = await response.json();
        moveCache.set(move.move.name, moveData);
        return { moveData, versionDetails: move.version_group_details };
    });

    const moves = await Promise.all(movePromises);

    moves.forEach(({ moveData, versionDetails }) => {
        const latestVersion = versionDetails[versionDetails.length - 1];
        const moveElement = createMoveElement(moveData, latestVersion);

        switch (latestVersion.move_learn_method.name) {
            case 'level-up':
                levelMoves.appendChild(moveElement);
                break;
            case 'machine':
                tmMoves.appendChild(moveElement);
                break;
            case 'egg':
                eggMoves.appendChild(moveElement);
                break;
            case 'tutor':
                tutorMoves.appendChild(moveElement);
                break;
        }
    });
}

// Enhanced Move Item Creation
function createMoveElement(moveData, versionDetail) {
    const moveDiv = document.createElement('div');
    moveDiv.className = 'move-item';
    
    const levelText = versionDetail.move_learn_method.name === 'level-up' 
        ? `<span class="move-level">Lv.${versionDetail.level_learned_at}</span>`
        : '';

    moveDiv.innerHTML = `
        ${levelText}
        <span class="move-name">${moveData.name.replace('-', ' ')}</span>
        <span class="move-type" style="background-color: var(--type-${moveData.type.name})">${moveData.type.name}</span>
    `;

    // Add click handler for move details
    moveDiv.addEventListener('click', () => showMoveDetails(moveData));

    return moveDiv;
}

// Show Move Details Modal
async function showMoveDetails(moveData) {
    const moveTitle = document.querySelector('.move-title');
    const movePower = document.querySelector('.move-power');
    const moveAccuracy = document.querySelector('.move-accuracy');
    const movePP = document.querySelector('.move-pp');
    const moveCategory = document.querySelector('.move-category');
    const moveDescription = document.querySelector('.move-description');
    const effectivenessGrid = document.querySelector('.effectiveness-grid');

    // Set move details
    moveTitle.textContent = moveData.name.replace('-', ' ');
    movePower.textContent = moveData.power || '-';
    moveAccuracy.textContent = moveData.accuracy ? `${moveData.accuracy}%` : '-';
    movePP.textContent = moveData.pp;
    moveCategory.textContent = moveData.damage_class.name;
    
    // Get move description
    const effectEntry = moveData.effect_entries.find(entry => entry.language.name === 'en');
    moveDescription.textContent = effectEntry ? 
        effectEntry.effect.replace(/\$effect_chance/g, moveData.effect_chance || '') : 
        'No effect description available.';

    // Calculate and display type effectiveness
    effectivenessGrid.innerHTML = '';
    const moveType = moveData.type.name;
    
    Object.entries(typeEffectiveness).forEach(([defenderType, matchups]) => {
        const effectiveness = matchups[moveType] || 1;
        if (effectiveness !== 1) {
            const effectivenessElement = document.createElement('div');
            effectivenessElement.className = 'type-effectiveness';
            effectivenessElement.style.backgroundColor = `var(--type-${defenderType})`;
            effectivenessElement.innerHTML = `
                <div>${defenderType.toUpperCase()}</div>
                <div>×${effectiveness}</div>
            `;
            effectivenessGrid.appendChild(effectivenessElement);
        }
    });

    moveModal.classList.add('active');
}

// Close Move Modal
closeModal.addEventListener('click', () => {
    moveModal.classList.remove('active');
});

// Close modal when clicking outside
moveModal.addEventListener('click', (e) => {
    if (e.target === moveModal) {
        moveModal.classList.remove('active');
    }
});

// Display additional information
function displayAdditionalInfo(speciesData) {
    // Display gender ratio
    const genderRatio = speciesData.gender_rate;
    const genderRatioElement = document.querySelector('.gender-ratio');
    
    if (genderRatio === -1) {
        genderRatioElement.innerHTML = '<p>Genderless</p>';
    } else {
        const femaleRatio = (genderRatio / 8) * 100;
        const maleRatio = 100 - femaleRatio;
        genderRatioElement.innerHTML = `
            <div class="gender-bar">
                <div class="male-ratio" style="width: ${maleRatio}%"></div>
                <div class="female-ratio" style="width: ${femaleRatio}%"></div>
            </div>
            <div class="gender-labels">
                <span>♂ ${maleRatio}%</span>
                <span>♀ ${femaleRatio}%</span>
            </div>
        `;
    }

    // Display region information
    const regionInfo = document.querySelector('.region-info');
    const generation = speciesData.generation.name.split('-')[1].toUpperCase();
    regionInfo.textContent = getRegionFromGeneration(generation);

    // Display habitat
    const habitatInfo = document.querySelector('.habitat-info');
    habitatInfo.textContent = speciesData.habitat ? speciesData.habitat.name.replace('-', ' ') : 'Unknown';
}

// Get region from generation
function getRegionFromGeneration(generation) {
    const regionMap = {
        'I': 'Kanto',
        'II': 'Johto',
        'III': 'Hoenn',
        'IV': 'Sinnoh',
        'V': 'Unova',
        'VI': 'Kalos',
        'VII': 'Alola',
        'VIII': 'Galar',
        'IX': 'Paldea'
    };
    return regionMap[generation] || 'Unknown';
}

// Fetch regional forms
async function fetchRegionalForms(region) {
    const regionalForms = {
        'alola': [
            'rattata-alola', 'raticate-alola', 'raichu-alola', 'sandshrew-alola', 'sandslash-alola',
            'vulpix-alola', 'ninetales-alola', 'diglett-alola', 'dugtrio-alola', 'meowth-alola',
            'persian-alola', 'geodude-alola', 'graveler-alola', 'golem-alola', 'grimer-alola',
            'muk-alola', 'exeggutor-alola', 'marowak-alola'
        ],
        'galar': [
            'meowth-galar', 'ponyta-galar', 'rapidash-galar', 'slowpoke-galar', 'slowbro-galar',
            'farfetchd-galar', 'weezing-galar', 'mr-mime-galar', 'articuno-galar', 'zapdos-galar',
            'moltres-galar', 'slowking-galar', 'corsola-galar', 'zigzagoon-galar', 'linoone-galar',
            'darumaka-galar', 'darmanitan-galar', 'yamask-galar', 'stunfisk-galar'
        ]
    };

    const forms = region === 'all' 
        ? [...regionalForms.alola, ...regionalForms.galar]
        : regionalForms[region] || [];

    return forms.map(form => ({ name: form }));
}

// Fetch normal forms
async function fetchNormalForms(region) {
    const response = await fetch(`${POKEMON_API_BASE_URL}/pokemon?limit=1000`);
    const data = await response.json();
    
    if (region === 'all') {
        return data.results.filter(pokemon => !pokemon.name.includes('-alola') && !pokemon.name.includes('-galar'));
    }

    const regionRanges = {
        'kanto': { start: 1, end: 151 },
        'johto': { start: 152, end: 251 },
        'hoenn': { start: 252, end: 386 },
        'sinnoh': { start: 387, end: 493 },
        'unova': { start: 494, end: 649 },
        'kalos': { start: 650, end: 721 },
        'alola': { start: 722, end: 809 },
        'galar': { start: 810, end: 898 },
        'paldea': { start: 899, end: 1008 }
    };

    const range = regionRanges[region];
    if (!range) return [];

    return data.results
        .filter(pokemon => {
            const id = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
            return id >= range.start && id <= range.end && !pokemon.name.includes('-alola') && !pokemon.name.includes('-galar');
        });
}

// Loading screen handlers
function showLoading() {
    loadingScreen.style.display = 'flex';
}

function hideLoading() {
    loadingScreen.style.display = 'none';
}

// Initialize settings
function initializeSettings() {
    // Load saved settings
    const savedTheme = localStorage.getItem('theme') || 'default';
    const savedColor = localStorage.getItem('color') || 'blue';
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const isCompactLayout = localStorage.getItem('compactLayout') === 'true';

    // Apply saved settings
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-color', savedColor);
    if (isDarkMode) document.documentElement.classList.add('dark-mode');
    if (isCompactLayout) document.body.classList.add('compact-layout');

    // Update UI to reflect current settings
    darkModeToggle.checked = isDarkMode;
    compactLayoutToggle.checked = isCompactLayout;
    themeButtons.forEach(btn => {
        if (btn.dataset.theme === savedTheme) btn.classList.add('active');
    });
    colorButtons.forEach(btn => {
        if (btn.dataset.color === savedColor) btn.classList.add('active');
    });
}

// Settings Panel Toggle
settingsButton.addEventListener('click', () => {
    settingsPanel.classList.toggle('active');
});

// Close settings button
document.getElementById('close-settings').addEventListener('click', () => {
    settingsPanel.classList.remove('active');
});

// Close settings when clicking outside
document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsButton.contains(e.target)) {
        settingsPanel.classList.remove('active');
    }
});

// Theme Buttons with Linux-inspired themes
themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Apply specific theme styles
        document.documentElement.className = ''; // Reset classes
        document.documentElement.classList.add(`theme-${theme}`);
        if (darkModeToggle.checked) {
            document.documentElement.classList.add('dark-mode');
        }
        
        themeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Color Buttons
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        const color = button.dataset.color;
        document.documentElement.setAttribute('data-color', color);
        localStorage.setItem('color', color);
        
        colorButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Dark Mode Toggle
darkModeToggle.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkModeToggle.checked);
});

// Compact Layout Toggle
compactLayoutToggle.addEventListener('change', () => {
    document.body.classList.toggle('compact-layout');
    localStorage.setItem('compactLayout', compactLayoutToggle.checked);
});

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializeSettings();
}); 