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

const formations = {
  user: [
    [-47, 0], [-36, -18], [-36, -6], [-36, 8], [-36, 20],
    [-20, -18], [-18, -4], [-18, 12],
    [-2, -15], [2, 0], [-2, 15],
  ],
  opponent: [
    [47, 0], [36, -20], [36, -8], [36, 6], [36, 18],
    [20, -14], [18, 4], [20, 18],
    [4, -15], [-1, 0], [4, 15],
  ],
};

const countryGrid = document.querySelector("#country-grid");
const gameCanvas = document.querySelector("#game-canvas");
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
  seconds: 90,
  stamina: 100,
  running: true,
  keys: new Set(),
  controlledIndex: 9,
  ball: new BABYLON.Vector3(-3, 0.72, 0),
  ballVelocity: new BABYLON.Vector3(0, 0, 0),
  userPlayers: [],
  opponentPlayers: [],
};

let engine;
let scene;
let camera;
let ballMesh;
let userMaterial;
let userAccentMaterial;
let opponentMaterial;
let opponentAccentMaterial;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function color3(hex) {
  return BABYLON.Color3.FromHexString(hex);
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

function makeMaterial(name, hex, roughness = 0.68) {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = color3(hex);
  material.specularColor = new BABYLON.Color3(0.16, 0.16, 0.16);
  material.roughness = roughness;
  return material;
}

function refreshMaterials() {
  userMaterial.diffuseColor = color3(state.user.colors[0]);
  userAccentMaterial.diffuseColor = color3(state.user.colors[1]);
  opponentMaterial.diffuseColor = color3(state.opponent.colors[0]);
  opponentAccentMaterial.diffuseColor = color3(state.opponent.colors[1]);
}

function makePlayer(name, team, index, position) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position = new BABYLON.Vector3(position[0], 0, position[1]);

  const body = BABYLON.MeshBuilder.CreateCapsule(`${name}-body`, { height: 2.4, radius: 0.42 }, scene);
  body.position.y = 1.35;
  body.parent = root;
  body.material = team === "user" ? userMaterial : opponentMaterial;

  const stripe = BABYLON.MeshBuilder.CreateBox(`${name}-stripe`, { width: 0.5, height: 0.88, depth: 0.07 }, scene);
  stripe.position.set(0, 1.42, -0.39);
  stripe.parent = root;
  stripe.material = team === "user" ? userAccentMaterial : opponentAccentMaterial;

  const head = BABYLON.MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.62, segments: 16 }, scene);
  head.position.y = 2.7;
  head.parent = root;
  head.material = makeMaterial(`${name}-skin`, "#d69a6d");

  const marker = BABYLON.MeshBuilder.CreateTorus(`${name}-marker`, { diameter: 1.25, thickness: 0.055 }, scene);
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.08;
  marker.parent = root;
  marker.material = makeMaterial(`${name}-marker-mat`, index === state.controlledIndex && team === "user" ? "#f7d65a" : "#ffffff");
  marker.visibility = team === "user" && index === state.controlledIndex ? 1 : 0.18;

  return { root, body, marker, base: new BABYLON.Vector3(position[0], 0, position[1]), team, index };
}

function makeGoal(name, x) {
  const postMaterial = makeMaterial(`${name}-posts`, "#f3fbff");
  const netMaterial = makeMaterial(`${name}-net`, "#78a8ff");
  netMaterial.alpha = 0.35;

  [-5.7, 5.7].forEach((z) => {
    const post = BABYLON.MeshBuilder.CreateCylinder(`${name}-post-${z}`, { height: 3, radius: 0.12 }, scene);
    post.position.set(x, 1.5, z);
    post.material = postMaterial;
  });

  const bar = BABYLON.MeshBuilder.CreateBox(`${name}-bar`, { width: 0.22, height: 0.18, depth: 11.6 }, scene);
  bar.position.set(x, 3, 0);
  bar.material = postMaterial;

  const net = BABYLON.MeshBuilder.CreateBox(`${name}-net`, { width: 0.1, height: 2.8, depth: 11.4 }, scene);
  net.position.set(x + (x < 0 ? -0.8 : 0.8), 1.4, 0);
  net.material = netMaterial;
}

function createScene() {
  engine = new BABYLON.Engine(gameCanvas, true, { preserveDrawingBuffer: true, stencil: true });
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.07, 0.09, 1);

  camera = new BABYLON.ArcRotateCamera("match-camera", Math.PI / 2, 1.02, 88, new BABYLON.Vector3(0, 0, 0), scene);
  camera.attachControl(gameCanvas, true);
  camera.lowerRadiusLimit = 54;
  camera.upperRadiusLimit = 110;
  camera.lowerBetaLimit = 0.72;
  camera.upperBetaLimit = 1.25;

  new BABYLON.HemisphericLight("sky-light", new BABYLON.Vector3(0, 1, 0), scene).intensity = 0.62;
  const sun = new BABYLON.DirectionalLight("stadium-key", new BABYLON.Vector3(-0.4, -0.8, 0.25), scene);
  sun.position = new BABYLON.Vector3(20, 60, -24);
  sun.intensity = 0.92;

  userMaterial = makeMaterial("user-kit", state.user.colors[0]);
  userAccentMaterial = makeMaterial("user-kit-accent", state.user.colors[1]);
  opponentMaterial = makeMaterial("opponent-kit", state.opponent.colors[0]);
  opponentAccentMaterial = makeMaterial("opponent-kit-accent", state.opponent.colors[1]);

  const grass = makeMaterial("grass", "#12895a");
  const pitch = BABYLON.MeshBuilder.CreateGround("big-pitch", { width: 118, height: 74, subdivisions: 8 }, scene);
  pitch.material = grass;

  const lineMaterial = makeMaterial("pitch-lines", "#f3fbff");
  lineMaterial.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);
  addPitchLines(lineMaterial);

  const standMaterial = makeMaterial("stands", "#0b3145");
  const stands = BABYLON.MeshBuilder.CreateTorus("stadium-bowl", { diameter: 112, thickness: 5.5 }, scene);
  stands.scaling.z = 0.66;
  stands.position.y = -0.2;
  stands.material = standMaterial;

  makeGoal("left-goal", -58);
  makeGoal("right-goal", 58);

  state.userPlayers = formations.user.map((position, index) => makePlayer(`user-${index}`, "user", index, position));
  state.opponentPlayers = formations.opponent.map((position, index) => makePlayer(`opponent-${index}`, "opponent", index, position));

  ballMesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1.05, segments: 24 }, scene);
  ballMesh.position.copyFrom(state.ball);
  ballMesh.material = makeMaterial("ball-material", "#f3fbff", 0.3);

  engine.runRenderLoop(() => {
    updateGame();
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());
}

function addLine(name, position, scaling, material) {
  const line = BABYLON.MeshBuilder.CreateBox(name, { width: 1, height: 0.035, depth: 1 }, scene);
  line.position = position;
  line.scaling = scaling;
  line.material = material;
}

function addPitchLines(material) {
  addLine("mid-line", new BABYLON.Vector3(0, 0.03, 0), new BABYLON.Vector3(0.06, 1, 74), material);
  addLine("top-touch", new BABYLON.Vector3(0, 0.03, -37), new BABYLON.Vector3(118, 1, 0.06), material);
  addLine("bottom-touch", new BABYLON.Vector3(0, 0.03, 37), new BABYLON.Vector3(118, 1, 0.06), material);
  addLine("left-touch", new BABYLON.Vector3(-59, 0.03, 0), new BABYLON.Vector3(0.06, 1, 74), material);
  addLine("right-touch", new BABYLON.Vector3(59, 0.03, 0), new BABYLON.Vector3(0.06, 1, 74), material);
  addLine("left-box-front", new BABYLON.Vector3(-45, 0.04, 0), new BABYLON.Vector3(0.06, 1, 25), material);
  addLine("right-box-front", new BABYLON.Vector3(45, 0.04, 0), new BABYLON.Vector3(0.06, 1, 25), material);
  addLine("left-box-top", new BABYLON.Vector3(-52, 0.04, -12.5), new BABYLON.Vector3(14, 1, 0.06), material);
  addLine("left-box-bottom", new BABYLON.Vector3(-52, 0.04, 12.5), new BABYLON.Vector3(14, 1, 0.06), material);
  addLine("right-box-top", new BABYLON.Vector3(52, 0.04, -12.5), new BABYLON.Vector3(14, 1, 0.06), material);
  addLine("right-box-bottom", new BABYLON.Vector3(52, 0.04, 12.5), new BABYLON.Vector3(14, 1, 0.06), material);

  const center = BABYLON.MeshBuilder.CreateTorus("center-circle", { diameter: 18, thickness: 0.09 }, scene);
  center.rotation.x = Math.PI / 2;
  center.position.y = 0.05;
  center.material = material;
}

function applyCountryVisuals() {
  userCountryName.textContent = state.user.name;
  opponentCountryName.textContent = state.opponent.name;
  hudUserFlag.textContent = state.user.code;
  hudOpponentFlag.textContent = state.opponent.code;
  renderCountries();
  if (scene) refreshMaterials();
}

function resetPositions() {
  state.ball = new BABYLON.Vector3(-3, 0.72, 0);
  state.ballVelocity = new BABYLON.Vector3(0, 0, 0);
  formations.user.forEach((position, index) => state.userPlayers[index]?.root.position.set(position[0], 0, position[1]));
  formations.opponent.forEach((position, index) => state.opponentPlayers[index]?.root.position.set(position[0], 0, position[1]));
}

function resetMatch() {
  state.userScore = 0;
  state.opponentScore = 0;
  state.seconds = 90;
  state.stamina = 100;
  state.running = true;
  pickOpponent();
  resetPositions();
  applyCountryVisuals();
  matchMessage.textContent = `${state.user.name} vs ${state.opponent.name}. Full 11 starts now.`;
  updateHud();
}

function updateHud() {
  hudUserScore.textContent = state.userScore;
  hudOpponentScore.textContent = state.opponentScore;
  matchClock.textContent = state.seconds;
  staminaFill.style.width = `${state.stamina}%`;
}

function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function controlledPlayer() {
  return state.userPlayers[state.controlledIndex];
}

function userHasBall() {
  return distanceXZ(controlledPlayer().root.position, state.ball) < 3.2;
}

function shoot() {
  if (!state.running || !userHasBall()) {
    matchMessage.textContent = "Bring your striker onto the ball first.";
    return;
  }
  const aim = new BABYLON.Vector3(58 - state.ball.x, 0, -state.ball.z * 0.18).normalize();
  const power = state.stamina > 28 ? 1 : 0.72;
  state.ballVelocity = aim.scale(1.42 * power);
  state.stamina = clamp(state.stamina - 20, 0, 100);
  matchMessage.textContent = "Shot through traffic.";
}

function opponentShoot() {
  const aim = new BABYLON.Vector3(-58 - state.ball.x, 0, -state.ball.z * 0.18).normalize();
  state.ballVelocity = aim.scale(1.12);
}

function score(team) {
  if (team === "user") {
    state.userScore += 1;
    matchMessage.textContent = `${state.user.name} scores with all eleven pushing up.`;
  } else {
    state.opponentScore += 1;
    matchMessage.textContent = `${state.opponent.name} hits back.`;
  }
  resetPositions();
  updateHud();
}

function moveControlledPlayer() {
  if (!state.running) return;
  const player = controlledPlayer().root;
  const boost = state.keys.has("shift") && state.stamina > 0 ? 1.35 : 1;
  const speed = 0.46 * boost;

  if (state.keys.has("arrowup") || state.keys.has("w")) player.position.z -= speed;
  if (state.keys.has("arrowdown") || state.keys.has("s")) player.position.z += speed;
  if (state.keys.has("arrowleft") || state.keys.has("a")) player.position.x -= speed;
  if (state.keys.has("arrowright") || state.keys.has("d")) player.position.x += speed;

  player.position.x = clamp(player.position.x, -55, 55);
  player.position.z = clamp(player.position.z, -33, 33);
  state.stamina = clamp(state.stamina + (boost > 1 ? -0.34 : 0.13), 0, 100);

  if (userHasBall()) {
    state.ball.x += (player.position.x + 2.2 - state.ball.x) * 0.28;
    state.ball.z += (player.position.z - state.ball.z) * 0.28;
  }
}

function moveSquads(time) {
  state.userPlayers.forEach((player, index) => {
    if (index === state.controlledIndex || !state.running) return;
    const press = state.ball.x > -20 ? 7 : 0;
    const targetX = player.base.x + press + Math.sin(time / 900 + index) * 0.65;
    const targetZ = player.base.z + Math.cos(time / 1100 + index) * 0.65;
    player.root.position.x += clamp(targetX - player.root.position.x, -0.12, 0.12);
    player.root.position.z += clamp(targetZ - player.root.position.z, -0.12, 0.12);
  });

  state.opponentPlayers.forEach((player, index) => {
    if (!state.running) return;
    const pressure = distanceXZ(player.root.position, state.ball) < 16 ? state.ball : player.base;
    const targetX = pressure.x + (index % 3 - 1) * 1.8;
    const targetZ = pressure.z + (Math.floor(index / 3) - 1) * 1.2;
    player.root.position.x += clamp(targetX - player.root.position.x, -0.18, 0.18);
    player.root.position.z += clamp(targetZ - player.root.position.z, -0.18, 0.18);

    if (distanceXZ(player.root.position, state.ball) < 2.5 && !userHasBall()) {
      state.ball.x += (player.root.position.x - 2.2 - state.ball.x) * 0.25;
      state.ball.z += (player.root.position.z - state.ball.z) * 0.25;
      if (state.ball.x < -34 && Math.random() < 0.018) opponentShoot();
    }
  });
}

function moveBall() {
  state.ball.addInPlace(state.ballVelocity);
  state.ballVelocity.scaleInPlace(0.982);
  state.ball.x = clamp(state.ball.x, -59, 59);
  state.ball.z = clamp(state.ball.z, -35.5, 35.5);

  if (Math.abs(state.ball.z) > 35) state.ballVelocity.z *= -0.62;
  if (state.ball.x > 57.5 && Math.abs(state.ball.z) < 6.2) score("user");
  if (state.ball.x < -57.5 && Math.abs(state.ball.z) < 6.2) score("opponent");
  if (Math.abs(state.ball.x) > 58) state.ballVelocity.x *= -0.55;

  ballMesh.position.copyFrom(state.ball);
  ballMesh.rotation.z += state.ballVelocity.x * 0.16;
  ballMesh.rotation.x += state.ballVelocity.z * 0.16;
}

function updateGame() {
  const time = performance.now();
  moveControlledPlayer();
  moveSquads(time);
  moveBall();
  camera.target = BABYLON.Vector3.Lerp(camera.target, controlledPlayer().root.position, 0.025);
  updateHud();
}

function finishMatch() {
  state.running = false;
  if (state.userScore > state.opponentScore) {
    matchMessage.textContent = `${state.user.name} wins ${state.userScore}-${state.opponentScore}.`;
  } else if (state.userScore < state.opponentScore) {
    matchMessage.textContent = `${state.opponent.name} wins ${state.opponentScore}-${state.userScore}.`;
  } else {
    matchMessage.textContent = `Draw: ${state.userScore}-${state.opponentScore}. New Match for extra time.`;
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

renderCountries();
createScene();
resetMatch();
