// Simple Flashcards app script
// State: { decks: [], activeDeckId: null, searchTerm: '' }
const STORAGE_KEY = 'flashcards-app-state-v1';
const AppState = { decks: [], activeDeckId: null, searchTerm: '' };
const UI = { filteredCards: [], currentIndex: 0, editingCardId: null, editingDeckId: null };

/* Helpers */
const uid = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
  } catch (err) {
    console.warn('Could not save state', err);
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.decks)) {
      AppState.decks = parsed.decks;
      AppState.activeDeckId = parsed.activeDeckId ?? (parsed.decks[0] && parsed.decks[0].id) ?? null;
      AppState.searchTerm = parsed.searchTerm ?? '';
      return true;
    }
  } catch (err) {
    console.warn('Failed to parse saved state', err);
  }
  return false;
}

/* Initial data for first run */
function createDefaultDeck() {
  const decks = [
    {
      id: uid('deck_'),
      title: 'Biology',
      cards: [
        { id: uid('card_'), front: 'What is photosynthesis?', back: 'Process used by plants to convert light into energy.' },
        { id: uid('card_'), front: 'What is the powerhouse of the cell?', back: 'Mitochondria' },
        { id: uid('card_'), front: 'What is mitosis?', back: 'A type of cell division that results in two daughter cells.' }
      ],
      createdAt: Date.now()
    },
    {
      id: uid('deck_'),
      title: 'Spanish',
      cards: [
        { id: uid('card_'), front: 'Hola', back: 'Hello' },
        { id: uid('card_'), front: 'Gracias', back: 'Thank you' },
        { id: uid('card_'), front: 'Amigo', back: 'Friend' }
      ],
      createdAt: Date.now()
    },
    {
      id: uid('deck_'),
      title: 'History',
      cards: [
        { id: uid('card_'), front: 'Who was the first US president?', back: 'George Washington' },
        { id: uid('card_'), front: 'When did WWII end?', back: '1945' }
      ],
      createdAt: Date.now()
    }
  ];

  AppState.decks = decks;
  AppState.activeDeckId = decks[0].id;
}

/* Rendering */
function renderSidebar() {
  const list = document.getElementById('deck-list');
  if (!list) return;
  list.innerHTML = '';

  AppState.decks.forEach(deck => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'deck-btn';
    btn.textContent = deck.title;
    btn.dataset.id = deck.id;
    if (deck.id === AppState.activeDeckId) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'true');
    }
    btn.addEventListener('click', () => {
      AppState.activeDeckId = deck.id;
      UI.currentIndex = 0;
      AppState.searchTerm = '';
      const search = document.getElementById('search-bar');
      if (search) search.value = '';
      saveState();
      renderSidebar();
      renderMain();
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderMain() {
  const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
  const titleEl = document.getElementById('current-deck-title');
  const container = document.querySelector('.card-container');
  const progressEl = document.querySelector('.card-progress');
  const btnShuffle = document.getElementById('btn-shuffle');
  
  // Empty State Logic
  if (!deck) {
    if (titleEl) titleEl.textContent = 'No Deck Selected';
    if (container) container.innerHTML = '<p class="muted">No deck selected. Create a deck to get started.</p>';
    if (progressEl) progressEl.textContent = '';
    if (btnShuffle) btnShuffle.disabled = true;
    return;
  }

  if (titleEl) titleEl.textContent = deck.title;

  // Filter cards by search term (case-insensitive)
  const term = (AppState.searchTerm || '').trim().toLowerCase();
  const filtered = term ? deck.cards.filter(c => (c.front + ' ' + c.back).toLowerCase().includes(term)) : deck.cards.slice();
  UI.filteredCards = filtered;

  // Disable shuffle if no cards
  if (btnShuffle) btnShuffle.disabled = filtered.length === 0;

  if (!container) return;
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p class="muted">No cards match your search.</p>';
    if (progressEl) progressEl.textContent = `0 of 0`;
    return;
  }

  // Ensure UI.currentIndex is within bounds
  if (UI.currentIndex < 0) UI.currentIndex = 0;
  if (UI.currentIndex >= filtered.length) UI.currentIndex = filtered.length - 1;

  const cardData = filtered[UI.currentIndex];

  const article = document.createElement('article');
  article.className = 'card';
  article.id = 'current-card';

  const front = document.createElement('div');
  front.className = 'card-face card-front';
  front.innerHTML = `<p>${escapeHtml(cardData.front)}</p>`;

  const back = document.createElement('div');
  back.className = 'card-face card-back';
  back.innerHTML = `<p>${escapeHtml(cardData.back)}</p>`;

  article.appendChild(front);
  article.appendChild(back);

  // --- DYNAMIC CARD ACTIONS (Edit/Delete) ---
  // We create these in JS so they are attached to the *current* card
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'card-actions-top'; // CSS hook for positioning

  const btnEditCard = document.createElement('button');
  btnEditCard.textContent = 'Edit';
  btnEditCard.className = 'btn-text'; // New styling class
  btnEditCard.onclick = (e) => {
    e.stopPropagation(); // Prevent flip
    UI.editingCardId = cardData.id;
    const modal = document.getElementById('modal-new-card');
    const f = document.getElementById('input-card-front');
    const b = document.getElementById('input-card-back');
    if (f) f.value = cardData.front;
    if (b) b.value = cardData.back;
    if (modal) modal.showModal();
  };

  const btnDeleteCard = document.createElement('button');
  btnDeleteCard.textContent = 'Delete';
  btnDeleteCard.className = 'btn-text';
  btnDeleteCard.onclick = (e) => {
    e.stopPropagation(); // Prevent flip
    if (!confirm('Delete this card?')) return;
    const idx = deck.cards.findIndex(c => c.id === cardData.id);
    if (idx >= 0) {
      deck.cards.splice(idx, 1);
      if (UI.currentIndex >= deck.cards.length) UI.currentIndex = Math.max(0, deck.cards.length - 1);
      saveState();
      renderMain();
    }
  };

  actionsDiv.appendChild(btnEditCard);
  actionsDiv.appendChild(btnDeleteCard);
  article.appendChild(actionsDiv);
  // ------------------------------------------

  container.appendChild(article);

  // Update progress
  if (progressEl) progressEl.textContent = `Card ${UI.currentIndex + 1} of ${filtered.length}`;
}

/* Utilities */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Event wiring */
function wireControls() {

    
  // Search (debounced)
  const search = document.getElementById('search-bar');
  if (search) {
    const onInput = debounce(e => {
      AppState.searchTerm = e.target.value;
      UI.currentIndex = 0; 
      renderMain();
    }, 300);
    search.addEventListener('input', onInput);
  }

  // --- DECK MANAGEMENT ---

  // New Deck Logic
  const btnNewDeck = document.getElementById('btn-new-deck');
  const modalNewDeck = document.getElementById('modal-new-deck');
  const formNewDeck = document.getElementById('form-new-deck');
  const inputNewDeck = document.getElementById('input-new-deck');

  if (btnNewDeck && modalNewDeck) {
    btnNewDeck.addEventListener('click', () => {
      UI.editingDeckId = null; // Clear editing state
      if (inputNewDeck) inputNewDeck.value = '';
      modalNewDeck.showModal();
    });
  }

  // Edit Deck Logic
  const btnEditDeck = document.getElementById('btn-edit-deck');
  if (btnEditDeck) {
    btnEditDeck.addEventListener('click', () => {
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return;
      UI.editingDeckId = deck.id; // Set editing state
      if (inputNewDeck) inputNewDeck.value = deck.title;
      const modalTitle = document.getElementById('modal-new-deck-title');
      if (modalTitle) modalTitle.textContent = 'Edit Deck';
      if (modalNewDeck) modalNewDeck.showModal();
    });
  }

  // Delete Deck Logic
  const btnDeleteDeck = document.getElementById('btn-delete-deck');
  if (btnDeleteDeck) {
    btnDeleteDeck.addEventListener('click', () => {
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return;
      if (!confirm(`Delete deck "${deck.title}"? This cannot be undone.`)) return;
      
      const idx = AppState.decks.findIndex(d => d.id === deck.id);
      if (idx >= 0) AppState.decks.splice(idx, 1);
      
      AppState.activeDeckId = AppState.decks[0] ? AppState.decks[0].id : null;
      saveState();
      renderSidebar();
      renderMain();
    });
  }

  // Deck Form Submit (Handles both Create and Update)
  if (formNewDeck) {
    formNewDeck.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = inputNewDeck.value.trim();
      if (!name) return;

      if (UI.editingDeckId) {
        // UPDATE existing deck
        const deck = AppState.decks.find(d => d.id === UI.editingDeckId);
        if (deck) deck.title = name;
      } else {
        // CREATE new deck
        const newDeck = { id: uid('deck_'), title: name, cards: [], createdAt: Date.now() };
        AppState.decks.push(newDeck);
        AppState.activeDeckId = newDeck.id;
      }

      // Reset UI
      UI.editingDeckId = null;
      const modalTitle = document.getElementById('modal-new-deck-title');
      if (modalTitle) modalTitle.textContent = 'Create New Deck'; // Reset title
      
      AppState.searchTerm = '';
      const s = document.getElementById('search-bar'); if (s) s.value = '';
      saveState();
      renderSidebar();
      renderMain();
      modalNewDeck.close();
    });
  }

  // Cancel Deck Modal
  const btnCancelDeck = document.getElementById('btn-cancel-deck');
  if (btnCancelDeck) {
    btnCancelDeck.addEventListener('click', (e) => {
      e.preventDefault();
      modalNewDeck.close();
    });
  }
  // Reset deck modal state on close
  if (modalNewDeck) {
    modalNewDeck.addEventListener('close', () => {
        UI.editingDeckId = null;
        const modalTitle = document.getElementById('modal-new-deck-title');
        if (modalTitle) modalTitle.textContent = 'Create New Deck';
    });
  }

  // --- CARD MANAGEMENT ---

  const btnNewCard = document.getElementById('btn-new-card');
  const modalNewCard = document.getElementById('modal-new-card');
  const formNewCard = document.getElementById('form-new-card');
  const inputCardFront = document.getElementById('input-card-front');
  const inputCardBack = document.getElementById('input-card-back');

  if (btnNewCard && modalNewCard) {
    btnNewCard.addEventListener('click', () => {
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return alert('No active deck');
      UI.editingCardId = null;
      inputCardFront.value = '';
      inputCardBack.value = '';
      modalNewCard.showModal();
    });
  }

  if (formNewCard) {
    formNewCard.addEventListener('submit', (e) => {
      e.preventDefault();
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return;
      const front = inputCardFront.value.trim() || 'New question';
      const back = inputCardBack.value.trim() || '';

      if (UI.editingCardId) {
        const card = deck.cards.find(c => c.id === UI.editingCardId);
        if (card) {
          card.front = front;
          card.back = back;
        }
      } else {
        deck.cards.push({ id: uid('card_'), front, back });
      }

      UI.editingCardId = null;
      saveState();
      renderMain();
      modalNewCard.close();
    });
  }

  const btnCancelCard = document.getElementById('btn-cancel-card');
  if (btnCancelCard) {
    btnCancelCard.addEventListener('click', (e) => {
      e.preventDefault();
      modalNewCard.close();
    });
  }

  // Shuffle
  const btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) {
      btnShuffle.addEventListener('click', () => {
        const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
        if (!deck || deck.cards.length < 2) return;
        deck.cards = shuffleArray(deck.cards);
        UI.currentIndex = 0;
        saveState();
        renderMain();
      });
  }

  // --- NAVIGATION (Prev/Next/Flip) ---
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnFlip = document.getElementById('btn-flip');

  if (btnPrev) btnPrev.addEventListener('click', () => {
    if (UI.filteredCards.length === 0) return;
    UI.currentIndex = (UI.currentIndex - 1 + UI.filteredCards.length) % UI.filteredCards.length;
    renderMain();
  });

  if (btnNext) btnNext.addEventListener('click', () => {
    if (UI.filteredCards.length === 0) return;
    UI.currentIndex = (UI.currentIndex + 1) % UI.filteredCards.length;
    renderMain();
  });

  if (btnFlip) btnFlip.addEventListener('click', () => {
    const cardEl = document.getElementById('current-card');
    if (cardEl) cardEl.classList.toggle('is-flipped');
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      const cardEl = document.getElementById('current-card');
      if (cardEl) cardEl.classList.toggle('is-flipped');
    } else if (e.code === 'ArrowLeft') {
      if (UI.filteredCards.length === 0) return;
      UI.currentIndex = (UI.currentIndex - 1 + UI.filteredCards.length) % UI.filteredCards.length;
      renderMain();
    } else if (e.code === 'ArrowRight') {
      if (UI.filteredCards.length === 0) return;
      UI.currentIndex = (UI.currentIndex + 1) % UI.filteredCards.length;
      renderMain();
    }
  });

  // --- HAMBURGER MENU LOGIC ---
  const btnMenu = document.getElementById('btn-menu');
  const sidebar = document.querySelector('.sidebar');
  
  // Create the dark overlay dynamically
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Click overlay to close menu
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Toggle Menu on Button Click
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  // Auto-close menu when clicking a deck (Mobile UX)
  const deckList = document.getElementById('deck-list');
  if (deckList) {
    deckList.addEventListener('click', (e) => {
      // If the user clicked a button inside the list
      if (e.target.closest('button')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  }
}

/* Init */
function init() {
  const loaded = loadState();
  if (!loaded || AppState.decks.length === 0) {
    createDefaultDeck();
    saveState();
  }
  if (!AppState.activeDeckId && AppState.decks[0]) AppState.activeDeckId = AppState.decks[0].id;

  wireControls();
  renderSidebar();
  renderMain();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}