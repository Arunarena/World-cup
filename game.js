const countries = [
  { code: "CAN", name: "Canada", colors: ["#f3fbff", "#d71920"] },
  { code: "USA", name: "United States", colors: ["#1f5fbf", "#f3fbff"] },
  { code: "MEX", name: "Mexico", colors: ["#0b8f52", "#f3fbff"] },
  { code: "BRA", name: "Brazil", colors: ["#f7d65a", "#149447"] },
  { code: "ARG", name: "Argentina", colors: ["#79c9ff", "#f3fbff"] },
  { code: "FRA", name: "France", colors: ["#204bff", "#f3fbff"] },
  { code: "ENG", name: "England", colors: ["#f3fbff", "#c8102e"] },
  { code: "ESP", name: "Spain", colors: ["#c60b1e", "#ffc400"] },
  { code: "GER", name: "Germany", colors: ["#111111", "#f3fbff"] },
  { code: "POR", name: "Portugal", colors: ["#c8102e", "#0b8f52"] },
  { code: "NED", name: "Netherlands", colors: ["#ff7f51", "#f3fbff"] },
  { code: "JPN", name: "Japan", colors: ["#f3fbff", "#d71920"] },
  { code: "KOR", name: "South Korea", colors: ["#f3fbff", "#204bff"] },
  { code: "MAR", name: "Morocco", colors: ["#c8102e", "#149447"] },
  { code: "SEN", name: "Senegal", colors: ["#149447", "#f7d65a"] },
  { code: "AUS", name: "Australia", colors: ["#f7d65a", "#0b5f43"] },
];

const countryGrid = document.querySelector("#country-grid");
const pitch = document.querySelector("#arcade-pitch");
const userPlayer = document.querySelector("#user-player");
const opponentPlayer = document.querySelector("#opponent-player");
const arcadeBallEl = document.querySelector("#arcade-ball");
const userKit = document.querySelector("#user-kit");
const opponentKit = document.querySelector("#opponent-kit");
const userCountryName = document.querySelector("#user-country-name");
const opponentCountryName = document.querySelector("#opponent-country-name");
const hudUserFlag = document.querySelector("#hud-user-flag");
const hudOpponentFlag = document.querySelector("#hud-opponent-flag");
const hudUserScore = document.querySelector("#hud-user-score");
const hudOpponentScore = document.querySelector("#hud-opponent-score");
const matchClock = document.querySelector("#match-clock");
const matchMessage = document.querySelector("#match-message");
const staminaFill = document.querySelector("#stamina-fill");
const newMatchButton = document.querySelector("#new-match");
const controlButtons = document.querySelectorAll("[data-control]");

const state = {
  user: countries[0],
  opponent: countries[3],
  userScore: 0,
  opponentScore: 0,
  seconds: 60,
  stamina: 100,
  running: true,
  keys: new Set(),
  player: { x: 28, y: 50 },
  rival: { x: 72, y: 50 },
  ball: { x: 36, y: 50, vx: 0, vy: 0 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickOpponent() {
  const choices = countries.filter((country) => country.code !== state.user.code);
  state.opponent = choices[Math.floor(Math.random() * choices.length)];
}

function countryCard(country) {
  return `
    <button class="country-card ${country.code === state.user.code ? "active" : ""}" type="button" data-country="${country.code}">
      <span class="country-flag" style="--kit-a: ${country.colors[0]}; --kit-b: ${country.colors[1]}">${country.code}</span>
      <strong>${country.name}</strong>
      <small>World Cup side</small>
    </button>
  `;
}

function renderCountries() {
  countryGrid.innerHTML = countries.map(countryCard).join("");
}

function applyCountryVisuals() {
  userCountryName.textContent = state.user.name;
  opponentCountryName.textContent = state.opponent.name;
  hudUserFlag.textContent = state.user.code;
  hudOpponentFlag.textContent = state.opponent.code;
  userKit.textContent = state.user.code;
  opponentKit.textContent = state.opponent.code;
  userPlayer.style.setProperty("--kit-a", state.user.colors[0]);
  userPlayer.style.setProperty("--kit-b", state.user.colors[1]);
  opponentPlayer.style.setProperty("--kit-a", state.opponent.colors[0]);
  opponentPlayer.style.setProperty("--kit-b", state.opponent.colors[1]);
  renderCountries();
}

function resetPositions() {
  state.player = { x: 28, y: 50 };
  state.rival = { x: 72, y: 50 };
  state.ball = { x: 36, y: 50, vx: 0, vy: 0 };
}

function resetMatch() {
  state.userScore = 0;
  state.opponentScore = 0;
  state.seconds = 60;
  state.stamina = 100;
  state.running = true;
  pickOpponent();
  resetPositions();
  applyCountryVisuals();
  matchMessage.textContent = `${state.user.name} vs ${state.opponent.name}. Kickoff.`;
  updateHud();
}

function updateHud() {
  hudUserScore.textContent = state.userScore;
  hudOpponentScore.textContent = state.opponentScore;
  matchClock.textContent = state.seconds;
  staminaFill.style.width = `${state.stamina}%`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function userHasBall() {
  return distance(state.player, state.ball) < 8;
}

function shoot() {
  if (!state.running || !userHasBall()) {
    matchMessage.textContent = "Get close to the ball first.";
    return;
  }

  const accuracy = state.stamina > 30 ? 1 : 0.7;
  state.ball.vx = 2.9 * accuracy;
  state.ball.vy = (Math.random() - 0.5) * 1.4;
  state.stamina = clamp(state.stamina - 18, 0, 100);
  matchMessage.textContent = "Shot away.";
}

function opponentShoot() {
  state.ball.vx = -2.25;
  state.ball.vy = (Math.random() - 0.5) * 1.2;
}

function score(team) {
  if (team === "user") {
    state.userScore += 1;
    matchMessage.textContent = `${state.user.name} scores. Stadium lift-off.`;
  } else {
    state.opponentScore += 1;
    matchMessage.textContent = `${state.opponent.name} answers back.`;
  }

  resetPositions();
  updateHud();
}

function movePlayer() {
  if (!state.running) return;

  const boost = state.keys.has("shift") && state.stamina > 0 ? 1.35 : 1;
  const speed = 0.72 * boost;
  if (state.keys.has("arrowup") || state.keys.has("w")) state.player.y -= speed;
  if (state.keys.has("arrowdown") || state.keys.has("s")) state.player.y += speed;
  if (state.keys.has("arrowleft") || state.keys.has("a")) state.player.x -= speed;
  if (state.keys.has("arrowright") || state.keys.has("d")) state.player.x += speed;

  if (boost > 1) state.stamina = clamp(state.stamina - 0.42, 0, 100);
  else state.stamina = clamp(state.stamina + 0.18, 0, 100);

  state.player.x = clamp(state.player.x, 8, 92);
  state.player.y = clamp(state.player.y, 12, 88);

  if (userHasBall()) {
    state.ball.x += (state.player.x + 7 - state.ball.x) * 0.22;
    state.ball.y += (state.player.y - state.ball.y) * 0.22;
  }
}

function moveOpponent() {
  if (!state.running) return;

  const target = distance(state.rival, state.ball) < 9 ? state.player : state.ball;
  state.rival.x += clamp(target.x - state.rival.x, -0.52, 0.52);
  state.rival.y += clamp(target.y - state.rival.y, -0.48, 0.48);
  state.rival.x = clamp(state.rival.x, 8, 92);
  state.rival.y = clamp(state.rival.y, 12, 88);

  if (distance(state.rival, state.ball) < 6.5 && !userHasBall()) {
    state.ball.x += (state.rival.x - 7 - state.ball.x) * 0.22;
    state.ball.y += (state.rival.y - state.ball.y) * 0.22;
    if (state.rival.x < 45 && Math.random() < 0.025) opponentShoot();
  }
}

function moveBall() {
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;
  state.ball.vx *= 0.975;
  state.ball.vy *= 0.975;

  if (state.ball.y < 8 || state.ball.y > 92) state.ball.vy *= -1;
  state.ball.y = clamp(state.ball.y, 8, 92);

  if (state.ball.x > 96 && state.ball.y > 36 && state.ball.y < 64) score("user");
  if (state.ball.x < 4 && state.ball.y > 36 && state.ball.y < 64) score("opponent");

  if (state.ball.x < 3 || state.ball.x > 97) {
    state.ball.vx *= -0.65;
    state.ball.x = clamp(state.ball.x, 3, 97);
  }
}

function draw() {
  movePlayer();
  moveOpponent();
  moveBall();

  userPlayer.style.left = `${state.player.x}%`;
  userPlayer.style.top = `${state.player.y}%`;
  opponentPlayer.style.left = `${state.rival.x}%`;
  opponentPlayer.style.top = `${state.rival.y}%`;
  arcadeBallEl.style.left = `${state.ball.x}%`;
  arcadeBallEl.style.top = `${state.ball.y}%`;
  updateHud();
  requestAnimationFrame(draw);
}

function finishMatch() {
  state.running = false;
  if (state.userScore > state.opponentScore) {
    matchMessage.textContent = `${state.user.name} wins ${state.userScore}-${state.opponentScore}.`;
  } else if (state.userScore < state.opponentScore) {
    matchMessage.textContent = `${state.opponent.name} wins ${state.opponentScore}-${state.userScore}.`;
  } else {
    matchMessage.textContent = `Draw: ${state.userScore}-${state.opponentScore}. Hit New Match for extra time.`;
  }
}

countryGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-country]");
  if (!card) return;
  state.user = countries.find((country) => country.code === card.dataset.country) || countries[0];
  resetMatch();
});

newMatchButton.addEventListener("click", resetMatch);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "shift"].includes(key)) {
    event.preventDefault();
  }
  if (key === " ") shoot();
  else state.keys.add(key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

controlButtons.forEach((button) => {
  const control = button.dataset.control;
  if (control === "shoot") {
    button.addEventListener("click", shoot);
    return;
  }

  button.addEventListener("pointerdown", () => state.keys.add(`arrow${control}`));
  button.addEventListener("pointerup", () => state.keys.delete(`arrow${control}`));
  button.addEventListener("pointerleave", () => state.keys.delete(`arrow${control}`));
});

window.setInterval(() => {
  if (!state.running) return;
  state.seconds -= 1;
  if (state.seconds <= 0) finishMatch();
  updateHud();
}, 1000);

resetMatch();
draw();
