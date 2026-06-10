const streams = [
  {
    id: "opening",
    title: "Opening Night Preview",
    teams: "Canada vs Tournament Guest",
    status: "Live soon",
    score: "0 - 0",
    tag: "Main feed",
    url: "https://junkieembeds.pages.dev/embed/fox-soccer-plus",
  },
  {
    id: "studio",
    title: "World Cup Studio",
    teams: "Build-up and analysis",
    status: "On air",
    score: "Studio",
    tag: "Pre-match",
    url: "",
  },
  {
    id: "tactical",
    title: "Tactical Cam",
    teams: "Wide angle match view",
    status: "Standby",
    score: "Alt feed",
    tag: "Alternate",
    url: "",
  },
];

const fixtures = [
  { time: "12:00", match: "Group Stage Match 1", venue: "Toronto" },
  { time: "15:00", match: "Group Stage Match 2", venue: "Mexico City" },
  { time: "18:00", match: "Group Stage Match 3", venue: "Los Angeles" },
  { time: "21:00", match: "Group Stage Match 4", venue: "New York / New Jersey" },
];

const moods = {
  opening: {
    accent: "#f4c542",
    accentTwo: "#19b67a",
    accentThree: "#e34f4f",
    noise: "82%",
    possession: "51 / 49",
    moments: "12",
  },
  final: {
    accent: "#ffffff",
    accentTwo: "#f4c542",
    accentThree: "#19b67a",
    noise: "96%",
    possession: "50 / 50",
    moments: "24",
  },
  rivalry: {
    accent: "#e34f4f",
    accentTwo: "#37a2ff",
    accentThree: "#f4c542",
    noise: "91%",
    possession: "47 / 53",
    moments: "18",
  },
};

const feedGrid = document.querySelector("#feed-grid");
const fixtureList = document.querySelector("#fixture-list");
const streamFrame = document.querySelector("#stream-frame");
const streamPlaceholder = document.querySelector("#stream-placeholder");
const matchTitle = document.querySelector("#match-title");
const matchStatus = document.querySelector("#match-status");
const matchScore = document.querySelector("#match-score");
const moodButtons = document.querySelectorAll(".mood");
const atmosphereButton = document.querySelector("#mute-atmosphere");
const fullscreenButton = document.querySelector("#fullscreen-player");
const livePanel = document.querySelector("#player");
const shotButtons = document.querySelectorAll(".shot-button");
const keeper = document.querySelector("#keeper");
const ball = document.querySelector("#ball");
const gameGoals = document.querySelector("#game-goals");
const gameSaves = document.querySelector("#game-saves");
const gameMessage = document.querySelector("#game-message");

let selectedStream = streams[0].id;
let animationMuted = false;
let moodName = "opening";
let goals = 0;
let saves = 0;

function renderFeeds() {
  feedGrid.innerHTML = streams
    .map(
      (stream) => `
        <button class="feed-card ${stream.id === selectedStream ? "active" : ""}" type="button" data-stream="${stream.id}">
          <span class="tag">${stream.tag}</span>
          <strong>${stream.title}</strong>
          <span>${stream.teams}</span>
        </button>
      `,
    )
    .join("");
}

function renderFixtures() {
  fixtureList.innerHTML = fixtures
    .map(
      (fixture) => `
        <article class="fixture">
          <time>${fixture.time}</time>
          <div>
            <strong>${fixture.match}</strong>
            <span>${fixture.venue}</span>
          </div>
          <span>Preview</span>
        </article>
      `,
    )
    .join("");
}

function selectStream(id) {
  const stream = streams.find((item) => item.id === id) || streams[0];
  selectedStream = stream.id;
  matchTitle.textContent = stream.title;
  matchStatus.textContent = stream.status;
  matchScore.textContent = stream.score;

  if (stream.url) {
    streamFrame.src = stream.url;
    streamPlaceholder.classList.add("hidden");
  } else {
    streamFrame.removeAttribute("src");
    streamPlaceholder.classList.remove("hidden");
  }

  renderFeeds();
}

function applyMood(name) {
  const mood = moods[name] || moods.opening;
  moodName = name;
  document.documentElement.style.setProperty("--accent", mood.accent);
  document.documentElement.style.setProperty("--accent-2", mood.accentTwo);
  document.documentElement.style.setProperty("--accent-3", mood.accentThree);
  document.querySelector("#noise-meter").textContent = mood.noise;
  document.querySelector("#possession-meter").textContent = mood.possession;
  document.querySelector("#moment-meter").textContent = mood.moments;

  moodButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mood === name);
  });
}

feedGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-stream]");
  if (!card) return;
  selectStream(card.dataset.stream);
});

moodButtons.forEach((button) => {
  button.addEventListener("click", () => applyMood(button.dataset.mood));
});

atmosphereButton.addEventListener("click", () => {
  animationMuted = !animationMuted;
  atmosphereButton.setAttribute("aria-pressed", String(animationMuted));
  atmosphereButton.textContent = animationMuted ? "Still" : "Atmosphere";
});

fullscreenButton.addEventListener("click", async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await livePanel.requestFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
});

function zonePosition(zone) {
  return {
    left: "18%",
    center: "50%",
    right: "82%",
  }[zone];
}

function takeShot(target) {
  const zones = ["left", "center", "right"];
  const keeperZone = zones[Math.floor(Math.random() * zones.length)];
  keeper.style.left = zonePosition(keeperZone);
  ball.style.left = zonePosition(target);
  ball.style.top = "18%";
  ball.classList.remove("scored", "saved");

  const scored = target !== keeperZone;
  if (scored) {
    goals += 1;
    gameMessage.textContent = "Goal. Pick another corner.";
    ball.classList.add("scored");
  } else {
    saves += 1;
    gameMessage.textContent = "Saved. Try to wrong-foot the keeper.";
    ball.classList.add("saved");
  }

  gameGoals.textContent = goals;
  gameSaves.textContent = saves;

  window.setTimeout(() => {
    ball.style.left = "50%";
    ball.style.top = "72%";
    ball.classList.remove("scored", "saved");
  }, 620);
}

shotButtons.forEach((button) => {
  button.addEventListener("click", () => takeShot(button.dataset.shot));
});

const canvas = document.querySelector("#pitch-canvas");
const context = canvas.getContext("2d");
const particles = Array.from({ length: 90 }, () => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.15 + Math.random() * 0.6,
  radius: 1 + Math.random() * 2.5,
  phase: Math.random() * Math.PI * 2,
}));

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawPitch(time = 0) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const mood = moods[moodName];
  context.clearRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(7, 18, 15, 0.78)");
  gradient.addColorStop(0.5, "rgba(18, 44, 35, 0.64)");
  gradient.addColorStop(1, "rgba(36, 16, 18, 0.72)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(width / 2, height * 0.58);
  context.rotate(-0.08);
  context.strokeStyle = "rgba(255, 255, 255, 0.13)";
  context.lineWidth = 2;
  context.strokeRect(-width * 0.38, -height * 0.22, width * 0.76, height * 0.44);
  context.beginPath();
  context.moveTo(0, -height * 0.22);
  context.lineTo(0, height * 0.22);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, Math.min(width, height) * 0.095, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  particles.forEach((particle, index) => {
    if (!animationMuted) {
      particle.y += particle.speed / 900;
      particle.x += Math.sin(time / 900 + particle.phase) / 6500;
      if (particle.y > 1.08) particle.y = -0.08;
    }

    const x = particle.x * width;
    const y = particle.y * height;
    const color = index % 3 === 0 ? mood.accent : index % 3 === 1 ? mood.accentTwo : mood.accentThree;
    context.beginPath();
    context.fillStyle = color;
    context.globalAlpha = 0.18 + Math.sin(time / 600 + particle.phase) * 0.08;
    context.arc(x, y, particle.radius, 0, Math.PI * 2);
    context.fill();
  });

  context.globalAlpha = 1;
  requestAnimationFrame(drawPitch);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
renderFixtures();
selectStream(selectedStream);
applyMood(moodName);
requestAnimationFrame(drawPitch);
