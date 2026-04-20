const categoryInputs = document.querySelectorAll('input[name="category"]');
const typeSelect = document.getElementById('type');
const safeModeCheckbox = document.getElementById('safeMode');
const multiJokeCheckbox = document.getElementById('multiJoke');
const darkModeCheckbox = document.getElementById('darkMode');
const jokeContainer = document.getElementById('jokeContainer');
const getJokeBtn = document.getElementById('getJokeBtn');

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

async function fetchJoke() {
  const category = getSelectedCategories();
  const type = typeSelect.value;
  const safeMode = safeModeCheckbox.checked;
  const multiJoke = multiJokeCheckbox.checked;

  let url = `https://v2.jokeapi.dev/joke/${category}`;
  const params = new URLSearchParams();

  if (type !== 'any') {
    params.append('type', type);
  }

  if (multiJoke) {
    params.append('amount', '3');
  }

  if (safeMode) {
    params.append('blacklistFlags', 'nsfw,religious,political,racist,sexist,explicit');
  }

  if (params.toString()) {
    url += '?' + params.toString();
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    displayJoke(data);
  } catch (error) {
    console.error('Error fetching joke:', error);
    jokeContainer.innerHTML = '<p>Sorry, couldn\'t fetch a joke right now.</p>';
  }
}

function displayJoke(data) {
  jokeContainer.innerHTML = '';

  if (data.jokes) {
    // Multiple jokes
    data.jokes.forEach(joke => {
      const jokeDiv = document.createElement('div');
      jokeDiv.className = 'joke';
      jokeDiv.innerHTML = `
        <p>${joke.joke || (joke.setup + '<br>' + joke.delivery)}</p>
        <span class="joke-category">Category: ${joke.category}</span>
      `;
      jokeContainer.appendChild(jokeDiv);
    });
  } else {
    // Single joke
    const jokeDiv = document.createElement('div');
    jokeDiv.className = 'joke';
    jokeDiv.innerHTML = `
      <p>${data.joke || (data.setup + '<br>' + data.delivery)}</p>
      <span class="joke-category">Category: ${data.category}</span>
    `;
    jokeContainer.appendChild(jokeDiv);
  }
}

getJokeBtn.addEventListener('click', fetchJoke);

// Load initial joke
fetchJoke();
