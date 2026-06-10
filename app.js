const WATCHFOOTY_API = "https://api.watchfooty.st/api/v1";
const ESPN_SCOREBOARD_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

let streams = [
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

let fixtures = [
  { time: "12:00", match: "Group Stage Match 1", venue: "Toronto" },
  { time: "15:00", match: "Group Stage Match 2", venue: "Mexico City" },
  { time: "18:00", match: "Group Stage Match 3", venue: "Los Angeles" },
  { time: "21:00", match: "Group Stage Match 4", venue: "New York / New Jersey" },
];

const moods = {
  opening: {
    accent: "#ff2f4f",
    accentTwo: "#ffd447",
    accentThree: "#14d39a",
    noise: "82%",
    possession: "51 / 49",
    moments: "12",
  },
  final: {
    accent: "#ffd447",
    accentTwo: "#ff2f4f",
    accentThree: "#38a8ff",
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
const scoreboardGrid = document.querySelector("#scoreboard-grid");
const scoreboardStatus = document.querySelector("#scoreboard-status");
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
const streamTabs = document.querySelectorAll(".stream-tab");

let selectedStream = streams[0].id;
let animationMuted = false;
let moodName = "opening";
let goals = 0;
let saves = 0;
let streamFilter = "all";

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function sourcePoint(event) {
  if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
    return { x: event.clientX, y: event.clientY };
  }

  const target = event?.currentTarget || event?.target;
  if (target?.getBoundingClientRect) {
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function launchFootballBurst(event, count = 1) {
  const point = sourcePoint(event);

  for (let index = 0; index < count; index += 1) {
    const ballElement = document.createElement("span");
    ballElement.className = "fx-ball";
    ballElement.style.setProperty("--fx-x", `${point.x}px`);
    ballElement.style.setProperty("--fx-y", `${point.y}px`);
    ballElement.style.setProperty("--fx-size", `${randomBetween(1.15, 2.2)}rem`);
    ballElement.style.setProperty("--fx-dx", `${randomBetween(-180, 180)}px`);
    ballElement.style.setProperty("--fx-dy", `${randomBetween(-210, -70)}px`);
    document.body.append(ballElement);
    ballElement.addEventListener("animationend", () => ballElement.remove(), { once: true });
  }
}

function launchConfetti(event, count = 10) {
  const point = sourcePoint(event);
  const colors = ["#ff2f4f", "#ffd447", "#14d39a", "#38a8ff", "#ffffff"];

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = "fx-confetti";
    piece.style.setProperty("--fx-x", `${point.x}px`);
    piece.style.setProperty("--fx-y", `${point.y}px`);
    piece.style.setProperty("--fx-color", colors[index % colors.length]);
    piece.style.setProperty("--fx-dx", `${randomBetween(-120, 120)}px`);
    piece.style.setProperty("--fx-dy", `${randomBetween(-145, 75)}px`);
    document.body.append(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

function setSectionTheme() {
  const sections = [
    ["scoreboard", "scores"],
    ["fixtures", "fixtures"],
    ["teams", "fan"],
    ["fan-zone", "fan"],
    ["game", "game"],
    ["streams", "game"],
  ];
  const midpoint = window.innerHeight * 0.45;
  const active = sections.find(([id]) => {
    const section = document.getElementById(id);
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.top <= midpoint && rect.bottom >= midpoint;
  });
  document.body.dataset.sectionTheme = active?.[1] || "hero";
}

function formatMatchTime(match) {
  const date = new Date(match.date || match.timestamp * 1000);
  if (Number.isNaN(date.getTime())) return "Live";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatScore(match) {
  const scores = match.scores || {};
  if (Number.isFinite(scores.home) && Number.isFinite(scores.away)) {
    return `${scores.home} - ${scores.away}`;
  }

  const homeScore = Number(match.homeScore);
  const awayScore = Number(match.awayScore);
  if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    return `${homeScore} - ${awayScore}`;
  }

  return match.status || "Live";
}

function formatTeams(match) {
  if (match.teams?.home?.name && match.teams?.away?.name) {
    return `${match.teams.home.name} vs ${match.teams.away.name}`;
  }

  return match.title || "Football match";
}

function streamTag(stream, source) {
  const parts = [source];
  if (stream.quality) parts.push(stream.quality);
  if (stream.language) parts.push(stream.language);
  if (stream.ads) parts.push("ads");
  return parts.join(" / ");
}

function mapWatchFootyStreams(matches, source) {
  return matches.flatMap((match) => {
    const safeStreams = (match.streams || []).filter((stream) => stream.url && !stream.nsfw);
    return safeStreams.slice(0, 3).map((stream, index) => ({
      id: `watchfooty-${match.matchId}-${stream.id || index}`,
      title: match.title || formatTeams(match),
      teams: formatTeams(match),
      status: match.currentMinute ? `${match.currentMinute}'` : match.status || source,
      score: formatScore(match),
      tag: streamTag(stream, source),
      url: stream.url,
      league: match.league,
      time: formatMatchTime(match),
      quality: stream.quality || "",
      provider: "watchfooty",
    }));
  });
}

function teamFromCompetition(competition, homeAway) {
  return (competition.competitors || []).find((competitor) => competitor.homeAway === homeAway);
}

function formatEspnTime(event) {
  const date = new Date(event.date);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapEspnScoreboard(events = []) {
  return events.map((event) => {
    const competition = event.competitions?.[0] || {};
    const home = teamFromCompetition(competition, "home") || competition.competitors?.[0];
    const away = teamFromCompetition(competition, "away") || competition.competitors?.[1];
    const status = competition.status?.type || event.status?.type || {};

    return {
      id: event.id,
      league: event.league?.name || "FIFA World Cup",
      status: status.shortDetail || status.detail || status.description || "Scheduled",
      time: formatEspnTime(event),
      venue: competition.venue?.fullName || event.venue?.displayName || "",
      broadcast: competition.broadcasts?.[0]?.names?.join(", ") || "",
      home: {
        name: home?.team?.shortDisplayName || home?.team?.displayName || "Home",
        logo: home?.team?.logo || "",
        score: home?.score || "0",
      },
      away: {
        name: away?.team?.shortDisplayName || away?.team?.displayName || "Away",
        logo: away?.team?.logo || "",
        score: away?.score || "0",
      },
    };
  });
}

function mapWatchFootyFixtures(matches) {
  return matches.slice(0, 8).map((match) => ({
    time: formatMatchTime(match),
    match: match.title || formatTeams(match),
    venue: match.league || match.sport || "Football",
  }));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`WatchFooty API ${response.status}`);
  return response.json();
}

async function loadWatchFootyStreams() {
  if (!feedGrid) return;

  try {
    feedGrid.setAttribute("aria-busy", "true");
    const liveMatches = await fetchJson(`${WATCHFOOTY_API}/matches/football/live`);
    const popularMatches =
      liveMatches.length > 0 ? [] : await fetchJson(`${WATCHFOOTY_API}/matches/football/popular`);
    const sourceMatches = liveMatches.length > 0 ? liveMatches : popularMatches;
    const sourceLabel = liveMatches.length > 0 ? "WatchFooty live" : "WatchFooty popular";
    const apiStreams = mapWatchFootyStreams(sourceMatches, sourceLabel);

    if (apiStreams.length > 0) {
      streams = [...apiStreams, ...streams];
      fixtures = mapWatchFootyFixtures(sourceMatches);
      selectedStream = streams[0].id;
      renderFixtures();
      selectStream(selectedStream);
    } else {
      renderFeeds();
    }
  } catch (error) {
    console.warn(error);
    renderFeeds();
  } finally {
    feedGrid.removeAttribute("aria-busy");
  }
}

async function loadEspnScoreboard() {
  if (!scoreboardGrid || !scoreboardStatus) return;

  try {
    scoreboardGrid.setAttribute("aria-busy", "true");
    const data = await fetchJson(ESPN_SCOREBOARD_API);
    const games = mapEspnScoreboard(data.events || []);
    renderScoreboard(games);
    scoreboardStatus.textContent = `${data.leagues?.[0]?.name || "FIFA World Cup"} / ${games.length} matches`;
  } catch (error) {
    console.warn(error);
    scoreboardStatus.textContent = "Scores unavailable";
    scoreboardGrid.innerHTML = `
      <article class="score-card">
        <div class="score-card-header">
          <span>ESPN scoreboard</span>
          <span>Offline</span>
        </div>
        <p>Live scores could not load right now.</p>
      </article>
    `;
  } finally {
    scoreboardGrid.removeAttribute("aria-busy");
  }
}

function streamMatchesFilter(stream) {
  if (streamFilter === "hd") return String(stream.quality || stream.tag).toLowerCase().includes("hd");
  if (streamFilter === "fallback") return stream.provider !== "watchfooty";
  return true;
}

function renderScoreboard(games) {
  if (!scoreboardGrid) return;

  scoreboardGrid.innerHTML = games
    .slice(0, 12)
    .map(
      (game) => `
        <article class="score-card">
          <div class="score-card-header">
            <span>${game.status}</span>
            <span>${game.time}</span>
          </div>
          <div class="score-row">
            <div class="score-team">
              ${game.away.logo ? `<img src="${game.away.logo}" alt="" loading="lazy" />` : ""}
              <span>${game.away.name}</span>
            </div>
            <strong class="score-value">${game.away.score}</strong>
          </div>
          <div class="score-row">
            <div class="score-team">
              ${game.home.logo ? `<img src="${game.home.logo}" alt="" loading="lazy" />` : ""}
              <span>${game.home.name}</span>
            </div>
            <strong class="score-value">${game.home.score}</strong>
          </div>
          <div class="score-card-header">
            <span>${game.venue}</span>
            <span>${game.broadcast}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderFeeds() {
  if (!feedGrid) return;

  const visibleStreams = streams.filter(streamMatchesFilter);
  feedGrid.innerHTML = visibleStreams.length
    ? visibleStreams
    .map(
      (stream) => `
        <button class="feed-card ${stream.id === selectedStream ? "active" : ""}" type="button" data-stream="${stream.id}">
          <span class="tag">${stream.tag}</span>
          <strong>${stream.title}</strong>
          <span>${stream.teams}</span>
        </button>
      `,
    )
    .join("")
    : `
      <article class="feed-card">
        <span class="tag">No streams</span>
        <strong>No streams match this tab</strong>
        <span>Try All or wait for the API to refresh.</span>
      </article>
    `;
}

function renderFixtures() {
  if (!fixtureList) return;

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
  if (!streamFrame || !streamPlaceholder || !matchTitle || !matchStatus || !matchScore) {
    selectedStream = id;
    renderFeeds();
    return;
  }

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
  const noiseMeter = document.querySelector("#noise-meter");
  const possessionMeter = document.querySelector("#possession-meter");
  const momentMeter = document.querySelector("#moment-meter");
  if (noiseMeter) noiseMeter.textContent = mood.noise;
  if (possessionMeter) possessionMeter.textContent = mood.possession;
  if (momentMeter) momentMeter.textContent = mood.moments;

  moodButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mood === name);
  });
}

if (feedGrid) {
  feedGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-stream]");
    if (!card) return;
    launchFootballBurst(event, 2);
    launchConfetti(event, 8);
    selectStream(card.dataset.stream);
  });
}

if (scoreboardGrid) {
  scoreboardGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".score-card");
    if (!card) return;
    launchFootballBurst(event, 1);
    launchConfetti(event, 10);
  });
}

streamTabs.forEach((button) => {
  button.addEventListener("click", () => {
    streamFilter = button.dataset.streamFilter;
    launchConfetti({ currentTarget: button }, 7);
    streamTabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    renderFeeds();
  });
});

moodButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    launchFootballBurst(event, 1);
    launchConfetti(event, 10);
    applyMood(button.dataset.mood);
  });
});

if (atmosphereButton) {
  atmosphereButton.addEventListener("click", (event) => {
    animationMuted = !animationMuted;
    launchConfetti(event, animationMuted ? 4 : 12);
    atmosphereButton.setAttribute("aria-pressed", String(animationMuted));
    atmosphereButton.textContent = animationMuted ? "Still" : "Atmosphere";
  });
}

if (fullscreenButton && livePanel) {
  fullscreenButton.addEventListener("click", async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await livePanel.requestFullscreen();
  });
}

document.addEventListener("fullscreenchange", () => {
  if (fullscreenButton) {
    fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
  }
});

function zonePosition(zone) {
  return {
    left: "18%",
    center: "50%",
    right: "82%",
  }[zone];
}

function takeShot(target) {
  if (!keeper || !ball || !gameMessage || !gameGoals || !gameSaves) return;

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
    launchFootballBurst({ currentTarget: ball }, 3);
    launchConfetti({ currentTarget: ball }, 18);
  } else {
    saves += 1;
    gameMessage.textContent = "Saved. Try to wrong-foot the keeper.";
    ball.classList.add("saved");
    launchConfetti({ currentTarget: keeper }, 6);
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
  button.addEventListener("click", (event) => {
    launchFootballBurst(event, 1);
    takeShot(button.dataset.shot);
  });
});

document.querySelectorAll(".button, .icon-button, .hype-card, .score-card, .fixture, .pulse-tile").forEach((item) => {
  item.addEventListener("click", (event) => {
    launchConfetti(event, 6);
  });
});

const canvas = document.querySelector("#pitch-canvas");
const context = canvas?.getContext("2d");
const particles = Array.from({ length: 90 }, () => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.15 + Math.random() * 0.6,
  radius: 1 + Math.random() * 2.5,
  phase: Math.random() * Math.PI * 2,
}));

function resizeCanvas() {
  if (!canvas || !context) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawPitch(time = 0) {
  if (!context) return;

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
window.addEventListener("scroll", setSectionTheme, { passive: true });
resizeCanvas();
setSectionTheme();
renderFixtures();
selectStream(selectedStream);
applyMood(moodName);
loadEspnScoreboard();
loadWatchFootyStreams();
requestAnimationFrame(drawPitch);
