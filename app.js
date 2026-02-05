// Simple Flashcards app script
// State: { decks: [], activeDeckId: null, searchTerm: '' }
const STORAGE_KEY = 'flashcards-app-state-v1';
const AppState = { decks: [], activeDeckId: null, searchTerm: '' };
const UI = { filteredCards: [], currentIndex: 0, editingCardId: null };

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

  // Push all decks to state
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
  if (!deck) {
    if (titleEl) titleEl.textContent = 'No Deck Selected';
    if (container) container.innerHTML = '<p class="muted">No deck selected. Create a deck to get started.</p>';
    if (progressEl) progressEl.textContent = '';
    return;
  }

  if (titleEl) titleEl.textContent = deck.title;

  // Filter cards by search term (case-insensitive)
  const term = (AppState.searchTerm || '').trim().toLowerCase();
  const filtered = term ? deck.cards.filter(c => (c.front + ' ' + c.back).toLowerCase().includes(term)) : deck.cards.slice();
  UI.filteredCards = filtered;

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

/* Event wiring */
function wireControls() {
  // Search (debounced)
  const search = document.getElementById('search-bar');
  if (search) {
    const onInput = debounce(e => {
      AppState.searchTerm = e.target.value;
      UI.currentIndex = 0; // reset position on new search
      renderMain();
    }, 300);
    search.addEventListener('input', onInput);
  }

  // Deck list handled in renderSidebar via per-button listeners

  // New deck (using <dialog>)
  const btnNewDeck = document.getElementById('btn-new-deck');
  const modalNewDeck = document.getElementById('modal-new-deck');
  const formNewDeck = document.getElementById('form-new-deck');
  const inputNewDeck = document.getElementById('input-new-deck');
  if (btnNewDeck && modalNewDeck && formNewDeck && inputNewDeck) {
    btnNewDeck.addEventListener('click', () => {
      inputNewDeck.value = '';
      modalNewDeck.showModal();
      inputNewDeck.focus();
    });
    formNewDeck.addEventListener('submit', (e) => {
      // form submit happens only when the form is submitted (not on cancel)
      e.preventDefault();
      const name = inputNewDeck.value.trim();
      if (!name) return; // required will prevent submission in supporting browsers
      const newDeck = { id: uid('deck_'), title: name, cards: [], createdAt: Date.now() };
      AppState.decks.push(newDeck);
      AppState.activeDeckId = newDeck.id;
      AppState.searchTerm = '';
      const s = document.getElementById('search-bar'); if (s) s.value = '';
      UI.currentIndex = 0;
      saveState();
      renderSidebar();
      renderMain();
      // close the dialog after creating
      modalNewDeck.close();
    });

    // Cancel button should explicitly close dialog and not trigger submit
    const btnCancelDeck = document.getElementById('btn-cancel-deck');
    if (btnCancelDeck) {
      btnCancelDeck.addEventListener('click', (ev) => {
        ev.preventDefault();
        modalNewDeck.close();
      });
    }
  }

  // Shuffle
  const btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) btnShuffle.addEventListener('click', () => {
    const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
    if (!deck || deck.cards.length < 2) return;
    deck.cards = shuffleArray(deck.cards);
    UI.currentIndex = 0;
    saveState();
    renderMain();
  });

  // Delete deck
  const btnDeleteDeck = document.getElementById('btn-delete-deck');
  if (btnDeleteDeck) {
    btnDeleteDeck.addEventListener('click', () => {
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return;
      const ok = confirm(`Delete deck "${deck.title}"? This cannot be undone.`);
      if (!ok) return;
      const idx = AppState.decks.findIndex(d => d.id === deck.id);
      if (idx >= 0) AppState.decks.splice(idx, 1);
      // select first available deck or none
      AppState.activeDeckId = AppState.decks[0] ? AppState.decks[0].id : null;
      AppState.searchTerm = '';
      const s = document.getElementById('search-bar'); if (s) s.value = '';
      UI.currentIndex = 0;
      saveState();
      renderSidebar();
      renderMain();
    });
  }

  // New card (using <dialog>)
  const btnNewCard = document.getElementById('btn-new-card');
  const modalNewCard = document.getElementById('modal-new-card');
  const formNewCard = document.getElementById('form-new-card');
  const inputCardFront = document.getElementById('input-card-front');
  const inputCardBack = document.getElementById('input-card-back');
  const btnEdit = document.getElementById('btn-edit');
  const btnDeleteCard = document.getElementById('btn-delete-card');
  if (btnNewCard && modalNewCard && formNewCard && inputCardFront && inputCardBack) {
    // Open modal for creating a new card
    btnNewCard.addEventListener('click', () => {
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return alert('No active deck');
      UI.editingCardId = null; // ensure we're not in edit mode
      inputCardFront.value = '';
      inputCardBack.value = '';
      modalNewCard.showModal();
      inputCardFront.focus();
    });

    // Submit handler supports both creating and editing
    formNewCard.addEventListener('submit', (e) => {
      e.preventDefault();
      const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
      if (!deck) return;
      const front = inputCardFront.value.trim() || 'New question';
      const back = inputCardBack.value.trim() || '';

      if (UI.editingCardId) {
        // Edit existing card
        const card = deck.cards.find(c => c.id === UI.editingCardId);
        if (card) {
          card.front = front;
          card.back = back;
        }
        UI.editingCardId = null;
      } else {
        // Create new card
        deck.cards.push({ id: uid('card_'), front, back });
      }

      saveState();
      renderMain();
      // close dialog after action
      modalNewCard.close();
    });

    // Cancel button should explicitly close dialog and not trigger submit
    const btnCancelCard = document.getElementById('btn-cancel-card');
    if (btnCancelCard) {
      btnCancelCard.addEventListener('click', (ev) => {
        ev.preventDefault();
        // clear editing flag when cancelling
        UI.editingCardId = null;
        modalNewCard.close();
      });
    }

    // When modal closes by any means, clear editing state and inputs
    modalNewCard.addEventListener('close', () => {
      UI.editingCardId = null;
      if (inputCardFront) inputCardFront.value = '';
      if (inputCardBack) inputCardBack.value = '';
    });

    // Edit current card
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        if (UI.filteredCards.length === 0) return;
        const card = UI.filteredCards[UI.currentIndex];
        if (!card) return;
        UI.editingCardId = card.id;
        inputCardFront.value = card.front;
        inputCardBack.value = card.back;
        modalNewCard.showModal();
        inputCardFront.focus();
      });
    }

    // Delete current card
    if (btnDeleteCard) {
      btnDeleteCard.addEventListener('click', () => {
        if (UI.filteredCards.length === 0) return;
        const card = UI.filteredCards[UI.currentIndex];
        if (!card) return;
        if (!confirm('Delete this card?')) return;
        const deck = AppState.decks.find(d => d.id === AppState.activeDeckId);
        if (!deck) return;
        const idx = deck.cards.findIndex(c => c.id === card.id);
        if (idx >= 0) deck.cards.splice(idx, 1);
        // adjust index
        if (UI.currentIndex >= deck.cards.length) UI.currentIndex = Math.max(0, deck.cards.length - 1);
        saveState();
        renderMain();
      });
    }
  }

  // Prev / Next / Flip
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
    if (!cardEl) return;
    cardEl.classList.toggle('is-flipped');
  });

  // Keyboard shortcuts: Space to flip, arrows to navigate
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    if (isTyping) return;
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
}

/* Small helpers */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Init */
function init() {
  const loaded = loadState();
  if (!loaded || AppState.decks.length === 0) {
    createDefaultDeck();
    saveState();
  }
  // Ensure activeDeckId exists
  if (!AppState.activeDeckId && AppState.decks[0]) AppState.activeDeckId = AppState.decks[0].id;

  wireControls();
  renderSidebar();
  renderMain();
}

// Auto-run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
