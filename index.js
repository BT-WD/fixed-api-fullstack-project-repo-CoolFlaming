const categoryInputs = document.querySelectorAll('input[name="category"]');
const typeSelect = document.getElementById('type');
const safeModeCheckbox = document.getElementById('safeMode');
const searchInput = document.getElementById('search');
const jokeCountSelect = document.getElementById('jokeCount');
const darkModeCheckbox = document.getElementById('darkMode');
const showRatedCheckbox = document.getElementById('showRated');
const jokeContainer = document.getElementById('jokeContainer');
const getJokeBtn = document.getElementById('getJokeBtn');
const statsContainer = document.getElementById('jokeStats');
const clearStatsBtn = document.getElementById('clearStatsBtn');
const showLikedBtn = document.getElementById('showLikedBtn');
const showDislikedBtn = document.getElementById('showDislikedBtn');
const historyModal = document.getElementById('historyModal');
const historyTitle = document.getElementById('historyTitle');
const historyList = document.getElementById('historyList');
const closeModalBtn = document.querySelector('.close-modal');
const exportRatingsBtn = document.getElementById('exportRatingsBtn');
const importRatingsBtn = document.getElementById('importRatingsBtn');
const importRatingsInput = document.getElementById('importRatingsInput');
const importStatus = document.getElementById('importStatus');

const LIKED_JOKES_KEY = 'likedJokes';
const DISLIKED_JOKES_KEY = 'dislikedJokes';

function getJokeHash(joke) {
  const content = joke.joke || (joke.setup + joke.delivery);
  return Math.abs(content.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0)).toString(36);
}

function getJokeObject(joke, rating) {
  return {
    hash: getJokeHash(joke),
    content: joke.joke || (joke.setup + '<br>' + joke.delivery),
    category: joke.category,
    type: joke.type || 'single',
    rating: rating,
    timestamp: new Date().toISOString()
  };
}

function getLikedJokes() {
  const stored = localStorage.getItem(LIKED_JOKES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function getDislikedJokes() {
  const stored = localStorage.getItem(DISLIKED_JOKES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveRating(joke, type) {
  const jokeObj = getJokeObject(joke, type);
  const jokeHash = jokeObj.hash;

  if (type === 'like') {
    const liked = getLikedJokes();
    const existingIndex = liked.findIndex(j => j.hash === jokeHash);
    if (existingIndex === -1) {
      liked.push(jokeObj);
    } else {
      liked[existingIndex] = jokeObj; // Update timestamp if already liked
    }
    localStorage.setItem(LIKED_JOKES_KEY, JSON.stringify(liked));

    // Remove from disliked if it was there
    const disliked = getDislikedJokes();
    const dislikeIndex = disliked.findIndex(j => j.hash === jokeHash);
    if (dislikeIndex > -1) {
      disliked.splice(dislikeIndex, 1);
      localStorage.setItem(DISLIKED_JOKES_KEY, JSON.stringify(disliked));
    }
  } else if (type === 'dislike') {
    const disliked = getDislikedJokes();
    const existingIndex = disliked.findIndex(j => j.hash === jokeHash);
    if (existingIndex === -1) {
      disliked.push(jokeObj);
    } else {
      disliked[existingIndex] = jokeObj; // Update timestamp if already disliked
    }
    localStorage.setItem(DISLIKED_JOKES_KEY, JSON.stringify(disliked));

    // Remove from liked if it was there
    const liked = getLikedJokes();
    const likeIndex = liked.findIndex(j => j.hash === jokeHash);
    if (likeIndex > -1) {
      liked.splice(likeIndex, 1);
      localStorage.setItem(LIKED_JOKES_KEY, JSON.stringify(liked));
    }
  }
  updateStats();
}

function isJokeRated(jokeHash) {
  const liked = getLikedJokes();
  const disliked = getDislikedJokes();
  return liked.some(j => j.hash === jokeHash) || disliked.some(j => j.hash === jokeHash);
}

function getJokeRating(jokeHash) {
  if (getLikedJokes().some(j => j.hash === jokeHash)) return 'liked';
  if (getDislikedJokes().some(j => j.hash === jokeHash)) return 'disliked';
  return null;
}

function updateStats() {
  const liked = getLikedJokes().length;
  const disliked = getDislikedJokes().length;
  statsContainer.textContent = `👍 Liked: ${liked} | 👎 Disliked: ${disliked}`;
}

function clearAllStats() {
  if (confirm('Are you sure you want to clear all joke ratings? This cannot be undone.')) {
    localStorage.removeItem(LIKED_JOKES_KEY);
    localStorage.removeItem(DISLIKED_JOKES_KEY);
    updateStats();
    closeModal();
    fetchJoke();
  }
}

function openModal(type) {
  const jokes = type === 'liked' ? getLikedJokes() : getDislikedJokes();
  historyTitle.textContent = type === 'liked' ? '👍 Liked Jokes' : '👎 Disliked Jokes';
  
  if (jokes.length === 0) {
    historyList.innerHTML = `<div class="empty-history">No ${type} jokes yet.</div>`;
  } else {
    historyList.innerHTML = jokes.map(joke => `
      <div class="history-joke ${type}">
        <div class="history-joke-content">${joke.content}</div>
        <div class="history-joke-category">Category: ${joke.category}</div>
      </div>
    `).join('');
  }
  
  historyModal.classList.add('show');
}

function closeModal() {
  historyModal.classList.remove('show');
}

function getSelectedCategories() {
  const selected = Array.from(categoryInputs).filter(input => input.checked).map(input => input.value);
  return selected.length ? selected.join(',') : 'Any';
}

darkModeCheckbox.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', darkModeCheckbox.checked);
});

// Load dark mode preference on page load
if (localStorage.getItem('darkMode') === 'true') {
  darkModeCheckbox.checked = true;
  document.body.classList.add('dark-mode');
}

// Event listeners for history buttons
showLikedBtn.addEventListener('click', () => openModal('liked'));
showDislikedBtn.addEventListener('click', () => openModal('disliked'));
closeModalBtn.addEventListener('click', closeModal);

// Close modal when clicking outside of it
historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) {
    closeModal();
  }
});

clearStatsBtn.addEventListener('click', clearAllStats);

async function fetchEnoughJokes(url, desiredCount) {
  const collected = [];
  const seenHashes = new Set();
  const maxAttempts = 4;
  let attempt = 0;

  while (attempt < maxAttempts && collected.length < desiredCount) {
    attempt += 1;
    const response = await fetch(url);
    const data = await response.json();
    const jokes = data.jokes ? data.jokes : [data];

    const newJokes = jokes.filter(joke => {
      const hash = getJokeHash(joke);
      return !seenHashes.has(hash) && !isJokeRated(hash);
    });

    newJokes.forEach(joke => {
      const hash = getJokeHash(joke);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        collected.push(joke);
      }
    });

    if (newJokes.length === 0) {
      break;
    }
  }

  return collected.slice(0, desiredCount);
}

async function fetchJoke() {
  const category = getSelectedCategories();
  const type = typeSelect.value;
  const safeMode = safeModeCheckbox.checked;
  const search = searchInput.value.trim();
  const jokeCount = Number(jokeCountSelect.value);

  let url = `https://v2.jokeapi.dev/joke/${category}`;
  const params = new URLSearchParams();

  if (type !== 'any') {
    params.append('type', type);
  }

  if (search) {
    params.append('contains', search);
  }

  if (jokeCount > 1) {
    params.append('amount', jokeCount);
  }

  if (safeMode) {
    params.append('blacklistFlags', 'nsfw,religious,political,racist,sexist,explicit');
  }

  if (params.toString()) {
    url += '?' + params.toString();
  }

  try {
    const showRated = showRatedCheckbox.checked;

    if (!showRated && jokeCount > 1) {
      const jokes = await fetchEnoughJokes(url, jokeCount);
      displayJoke(jokes);
    } else {
      const response = await fetch(url);
      const data = await response.json();
      filterAndDisplayJokes(data);
    }
  } catch (error) {
    console.error('Error fetching joke:', error);
    jokeContainer.innerHTML = '<p>Sorry, couldn\'t fetch a joke right now.</p>';
  }
}

function filterAndDisplayJokes(data) {
  const showRated = showRatedCheckbox.checked;
  let jokesToDisplay = [];

  if (data.jokes) {
    jokesToDisplay = data.jokes;
  } else {
    jokesToDisplay = [data];
  }

  // Filter out rated jokes if "Show Rated Jokes" is not checked
  if (!showRated) {
    jokesToDisplay = jokesToDisplay.filter(joke => !isJokeRated(getJokeHash(joke)));
  }

  displayJoke(jokesToDisplay);
}

function displayJoke(jokes) {
  jokeContainer.innerHTML = '';

  if (!jokes || jokes.length === 0) {
    jokeContainer.innerHTML = '<p>No new jokes available. Try changing your filters, search terms, or clearing your history!</p>';
    return;
  }

  jokes.forEach(joke => {
    const jokeHash = getJokeHash(joke);
    const rating = getJokeRating(jokeHash);
    const jokeDiv = document.createElement('div');
    jokeDiv.className = 'joke';
    
    if (rating === 'liked') {
      jokeDiv.classList.add('liked');
    } else if (rating === 'disliked') {
      jokeDiv.classList.add('disliked');
    }

    jokeDiv.innerHTML = `
      <p>${joke.joke || (joke.setup + '<br>' + joke.delivery)}</p>
      <span class="joke-category">Category: ${joke.category}</span>
      <div class="joke-buttons">
        <button class="like-btn ${rating === 'liked' ? 'active' : ''}" data-joke-hash="${jokeHash}">👍 Like</button>
        <button class="dislike-btn ${rating === 'disliked' ? 'active' : ''}" data-joke-hash="${jokeHash}">👎 Dislike</button>
        <button class="share-btn">🔗 Share</button>
      </div>
    `;
    jokeContainer.appendChild(jokeDiv);

    // Add event listeners to the buttons
    const likeBtn = jokeDiv.querySelector('.like-btn');
    const dislikeBtn = jokeDiv.querySelector('.dislike-btn');
    const shareBtn = jokeDiv.querySelector('.share-btn');

    shareBtn.addEventListener('click', () => shareJoke(joke));

    likeBtn.addEventListener('click', () => {
      saveRating(joke, 'like');
      updateButtonStates(jokeDiv, 'like');
    });

    dislikeBtn.addEventListener('click', () => {
      saveRating(joke, 'dislike');
      updateButtonStates(jokeDiv, 'dislike');
    });
  });
}

function updateButtonStates(jokeDiv, type) {
  const likeBtn = jokeDiv.querySelector('.like-btn');
  const dislikeBtn = jokeDiv.querySelector('.dislike-btn');

  if (type === 'like') {
    likeBtn.classList.add('active');
    dislikeBtn.classList.remove('active');
    jokeDiv.classList.add('liked');
    jokeDiv.classList.remove('disliked');
  } else if (type === 'dislike') {
    dislikeBtn.classList.add('active');
    likeBtn.classList.remove('active');
    jokeDiv.classList.add('disliked');
    jokeDiv.classList.remove('liked');
  }
}

function getShareText(joke) {
  return joke.joke || `${joke.setup}\n${joke.delivery}`;
}

function showImportStatus(message, isError = false) {
  if (!importStatus) return;
  importStatus.textContent = message;
  importStatus.className = `import-status ${isError ? 'error' : 'success'}`;
  setTimeout(() => {
    importStatus.textContent = '';
    importStatus.className = 'import-status';
  }, 4000);
}

async function shareJoke(joke) {
  const text = getShareText(joke);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Funny Joke', text });
      return;
    } catch (error) {
      console.warn('Web Share failed or was canceled:', error);
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      showImportStatus('Joke copied to clipboard.');
      return;
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
    }
  }

  window.prompt('Copy this joke:', text);
}

function mergeRatings(existing, imported) {
  const merged = [...existing];
  imported.forEach((joke) => {
    if (!joke || !joke.hash) return;
    const index = merged.findIndex((item) => item.hash === joke.hash);
    if (index === -1) {
      merged.push(joke);
    } else {
      merged[index] = { ...merged[index], ...joke };
    }
  });
  return merged;
}

function exportRatings() {
  const data = {
    liked: getLikedJokes(),
    disliked: getDislikedJokes(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'joke-ratings.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function importRatingsFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid file structure');
      }

      const importedLiked = Array.isArray(parsed.liked) ? parsed.liked : [];
      const importedDisliked = Array.isArray(parsed.disliked) ? parsed.disliked : [];

      const liked = mergeRatings(getLikedJokes(), importedLiked);
      const disliked = mergeRatings(getDislikedJokes(), importedDisliked);

      const adjustedLiked = liked.filter((joke) => !disliked.some((d) => d.hash === joke.hash));
      const adjustedDisliked = disliked.filter((joke) => !liked.some((l) => l.hash === joke.hash));

      localStorage.setItem(LIKED_JOKES_KEY, JSON.stringify(adjustedLiked));
      localStorage.setItem(DISLIKED_JOKES_KEY, JSON.stringify(adjustedDisliked));
      updateStats();
      showImportStatus(`Imported ${importedLiked.length} liked and ${importedDisliked.length} disliked jokes.`);
      fetchJoke();
    } catch (error) {
      console.error('Import failed:', error);
      showImportStatus('Failed to import ratings. Please provide a valid JSON export.', true);
    }
  };

  reader.onerror = () => {
    console.error('File read failed');
    showImportStatus('Failed to read file. Please try again.', true);
  };

  reader.readAsText(file);
}

exportRatingsBtn.addEventListener('click', exportRatings);
importRatingsBtn.addEventListener('click', () => importRatingsInput.click());
importRatingsInput.addEventListener('change', (event) => {
  const file = event.target.files ? event.target.files[0] : null;
  if (file) {
    importRatingsFile(file);
  }
  event.target.value = '';
});

getJokeBtn.addEventListener('click', fetchJoke);

updateStats();

fetchJoke();
