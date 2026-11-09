// ====== Configuration ======
const API_KEY = "83abd3c6101f3cf482f2fb55ca51e79a";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";
const DATA_URL = "https://api.openweathermap.org/data/2.5";
const QUICK_CITIES = ["Kochi", "London", "Tokyo", "New York", "Sydney"];

const $ = (id) => document.getElementById(id);
const els = {
  form: $("search-form"), input: $("city-input"), list: $("suggestions"), loader: $("loader"),
  error: $("error"), empty: $("empty"), weather: $("weather"), recent: $("recent"), quick: $("quick")
};
const state = { units: store("units", "metric"), place: null, current: null, forecast: null };

// ====== Safe localStorage ======
function store(key, fallback, value) {
  try {
    if (value === undefined) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    localStorage.setItem(key, JSON.stringify(value));
  } catch { return fallback; }
  return value;
}

// ====== API helpers ======
async function fetchJSON(url) {
  const res = await fetch(url);
  if (res.status === 401) throw new Error("BAD_KEY");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error("HTTP_" + res.status);
  return res.json();
}
const geocode = (q, limit = 5) => fetchJSON(`${GEO_URL}/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${API_KEY}`);
const reverseGeocode = (lat, lon) => fetchJSON(`${GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);

async function getWeather(place) {
  const q = `lat=${place.lat}&lon=${place.lon}&units=metric&appid=${API_KEY}`;
  const [current, forecast] = await Promise.all([fetchJSON(`${DATA_URL}/weather?${q}`), fetchJSON(`${DATA_URL}/forecast?${q}`)]);
  return { current, forecast };
}

// Turn a geocoding result into a simple place object (coordinates make the weather lookup exact)
const toPlace = (g) => ({ name: g.name, state: g.state || "", country: g.country, lat: g.lat, lon: g.lon });
const placeLabel = (p) => [p.name, p.state, p.country].filter(Boolean).join(", ");

function friendlyError(err) {
  if (err.message === "NOT_FOUND") return "We couldn't find weather for that place. Try again with a state or country code, like “Ranni, IN”.";
  if (err.message === "BAD_KEY") return "The API key was rejected. New keys can take up to a couple of hours to activate.";
  if (err.message === "RATE_LIMIT") return "Too many requests right now. Wait a minute and try again.";
  if (err instanceof TypeError) return "Network error. Check your connection and try again.";
  return "Something went wrong while loading weather data. Please try again.";
}

// ====== Autocomplete ======
let debounceTimer, suggestions = [], activeIdx = -1, reqId = 0;

function openList(open) {
  els.list.classList.toggle("hidden", !open);
  els.input.setAttribute("aria-expanded", String(open));
  if (!open) { activeIdx = -1; els.input.removeAttribute("aria-activedescendant"); }
}
function listNote(text) {
  els.list.innerHTML = `<li class="note">${text}</li>`;
  openList(true);
}
function renderSuggestions() {
  els.list.innerHTML = suggestions.map((p, i) => `
    <li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === activeIdx}">
      <strong>${p.name}</strong><span class="sub">${[p.state, p.country].filter(Boolean).join(", ")}</span>
    </li>`).join("");
  openList(true);
}
function setActive(i) {
  activeIdx = (i + suggestions.length) % suggestions.length;
  renderSuggestions();
  els.input.setAttribute("aria-activedescendant", "opt-" + activeIdx);
  document.getElementById("opt-" + activeIdx)?.scrollIntoView({ block: "nearest" });
}

async function fetchSuggestions(q) {
  const id = ++reqId;
  listNote("Searching…");
  try {
    const results = await geocode(q, 5);
    if (id !== reqId) return; // a newer keystroke superseded this request
    const seen = new Set();
    suggestions = results.map(toPlace).filter((p) => {
      const k = `${p.name}|${p.state}|${p.country}|${p.lat.toFixed(1)}|${p.lon.toFixed(1)}`;
      return seen.has(k) ? false : seen.add(k);
    });
    activeIdx = -1;
    suggestions.length ? renderSuggestions() : listNote("No places found. Try a nearby town or add a country code.");
  } catch (err) {
    if (id === reqId) listNote(friendlyError(err));
  }
}

els.input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = els.input.value.trim();
  if (q.length < 2) { reqId++; openList(false); return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});
els.input.addEventListener("keydown", (e) => {
  if (els.list.classList.contains("hidden") || !suggestions.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIdx + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIdx - 1); }
  else if (e.key === "Escape") openList(false);
});
els.list.addEventListener("mousedown", (e) => {
  const li = e.target.closest("li[data-i]");
  if (li) { e.preventDefault(); chooseSuggestion(Number(li.dataset.i)); }
});
document.addEventListener("click", (e) => { if (!e.target.closest(".field")) openList(false); });

function chooseSuggestion(i) {
  const p = suggestions[i];
  els.input.value = placeLabel(p);
  openList(false);
  loadWeather(p);
}

// Submit: use highlighted suggestion, otherwise the best match for whatever was typed
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearTimeout(debounceTimer);
  if (activeIdx >= 0 && suggestions[activeIdx]) return chooseSuggestion(activeIdx);
  const q = els.input.value.trim();
  if (q) searchByText(q);
});

async function searchByText(q) {
  openList(false);
  showLoading();
  try {
    const results = await geocode(q, 1);
    if (!results.length) throw new Error("NOT_FOUND");
    const place = toPlace(results[0]);
    els.input.value = placeLabel(place);
    await loadWeather(place);
  } catch (err) {
    showError(friendlyError(err));
    hideLoading();
  }
}

// ====== Geolocation ======
$("locate").addEventListener("click", () => {
  if (!navigator.geolocation) return showError("Your browser doesn't support location access.");
  showLoading();
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude: lat, longitude: lon } = pos.coords;
      const [g] = await reverseGeocode(lat, lon);
      const place = g ? toPlace({ ...g, lat, lon }) : { name: "Your location", state: "", country: "", lat, lon };
      els.input.value = placeLabel(place);
      await loadWeather(place);
    } catch (err) { showError(friendlyError(err)); hideLoading(); }
  }, () => {
    showError("Location access was blocked. Allow it in your browser settings or search by name.");
    hideLoading();
  }, { timeout: 10000 });
});

// ====== UI state ======
function showLoading() {
  els.loader.classList.remove("hidden");
  els.error.classList.add("hidden");
  els.empty.classList.add("hidden");
  els.weather.classList.add("hidden");
}
function hideLoading() { els.loader.classList.add("hidden"); }
function showError(msg) {
  els.error.textContent = msg;
  els.error.classList.remove("hidden");
  els.empty.classList.toggle("hidden", !!state.current);
  els.weather.classList.toggle("hidden", !state.current);
}

// ====== Main load flow ======
async function loadWeather(place) {
  showLoading();
  try {
    const { current, forecast } = await getWeather(place);
    Object.assign(state, { place, current, forecast });
    saveRecent(place);
    render();
    els.weather.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showError(friendlyError(err));
  } finally {
    hideLoading();
  }
}

// ====== Units ======
const isMetric = () => state.units === "metric";
const temp = (c) => Math.round(isMetric() ? c : c * 9 / 5 + 32);
const wind = (ms) => isMetric() ? `${(ms * 3.6).toFixed(1)} km/h` : `${(ms * 2.237).toFixed(1)} mph`;
const dist = (m) => isMetric() ? `${(m / 1000).toFixed(1)} km` : `${(m / 1609.34).toFixed(1)} mi`;
const compass = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
const iconUrl = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;
// Shift a unix time into the searched city's clock, then read it as UTC
const cityTime = (unix, tz, opts) => new Date((unix + tz) * 1000).toLocaleTimeString("en-US", { ...opts, timeZone: "UTC" });

function setUnits(u) {
  state.units = u;
  store("units", null, u);
  $("unit-metric").classList.toggle("active", u === "metric");
  $("unit-imperial").classList.toggle("active", u === "imperial");
  if (state.current) render();
}
document.querySelectorAll(".units button").forEach((b) => b.addEventListener("click", () => setUnits(b.dataset.unit)));

// ====== Theme + ambient effects ======
function pickTheme(c) {
  const w = c.weather[0];
  if (w.main === "Thunderstorm") return "theme-thunder";
  if (w.main === "Rain" || w.main === "Drizzle") return "theme-rain";
  if (w.main === "Snow") return "theme-snow";
  if (w.icon.endsWith("n")) return "theme-night";
  if (w.main === "Clear") return "theme-clear";
  if (w.main === "Clouds") return "theme-clouds";
  return "theme-mist";
}
const rand = (a, b) => a + Math.random() * (b - a);
function spawn(cls, n, style) {
  return Array.from({ length: n }, () => `<span class="${cls}" style="${style()}"></span>`).join("");
}
function buildFx(theme) {
  let html = "";
  if (theme === "theme-rain" || theme === "theme-thunder")
    html += spawn("drop", 60, () => `left:${rand(0, 100)}%;animation-duration:${rand(0.6, 1.1)}s;animation-delay:-${rand(0, 1.5)}s;opacity:${rand(0.3, 0.8)}`);
  if (theme === "theme-thunder") html += `<div class="flash"></div>`;
  if (theme === "theme-snow")
    html += spawn("flake", 50, () => { const s = rand(3, 8); return `left:${rand(0, 100)}%;width:${s}px;height:${s}px;animation-duration:${rand(7, 14)}s;animation-delay:-${rand(0, 14)}s`; });
  if (theme === "theme-night")
    html += spawn("star", 70, () => { const s = rand(1, 3); return `left:${rand(0, 100)}%;top:${rand(0, 80)}%;width:${s}px;height:${s}px;animation-duration:${rand(2, 5)}s;animation-delay:-${rand(0, 5)}s`; });
  if (theme === "theme-clear") html += `<div class="sun"></div>`;
  if (["theme-clear", "theme-clouds", "theme-mist", "theme-rain", "theme-thunder"].includes(theme))
    html += spawn("cloud", 4, () => `top:${rand(2, 55)}%;animation-duration:${rand(60, 110)}s;animation-delay:-${rand(0, 90)}s;transform:scale(${rand(0.8, 1.6)})`);
  $("fx").innerHTML = html;
}
function applyTheme(theme) {
  if (document.body.className === theme) return;
  document.body.className = theme;
  buildFx(theme);
}

// ====== Rendering ======
function render() {
  const { place, current: c, forecast: f } = state;
  applyTheme(pickTheme(c));

  $("city-name").textContent = place.name;
  $("region").textContent = [place.state, place.country].filter(Boolean).join(", ");
  $("temp").textContent = `${temp(c.main.temp)}°`;
  $("description").textContent = c.weather[0].description;
  $("hilo").textContent = `Feels like ${temp(c.main.feels_like)}°`;
  const icon = $("icon");
  icon.src = iconUrl(c.weather[0].icon);
  icon.alt = c.weather[0].description;
  updateClock();

  const tiles = [
    ["Humidity", `${c.main.humidity}%`, ""],
    ["Wind", wind(c.wind.speed), `From the ${compass(c.wind.deg ?? 0)}`],
    ["Pressure", `${c.main.pressure} hPa`, ""],
    ["Visibility", dist(c.visibility ?? 0), ""],
    ["Sunrise", cityTime(c.sys.sunrise, c.timezone, { hour: "numeric", minute: "2-digit" }), ""],
    ["Sunset", cityTime(c.sys.sunset, c.timezone, { hour: "numeric", minute: "2-digit" }), ""],
    ["Cloud cover", `${c.clouds.all}%`, ""],
    ["Today's range", `${temp(c.main.temp_min)}° / ${temp(c.main.temp_max)}°`, ""]
  ];
  $("tiles").innerHTML = tiles.map(([l, v, s]) =>
    `<div class="tile"><span class="label">${l}</span><span class="value">${v}</span>${s ? `<span class="sub">${s}</span>` : ""}</div>`).join("");

  renderHourly(f);
  renderDaily(f);
  $("updated").textContent = "Updated " + new Date(c.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · Data from OpenWeatherMap";
}

function updateClock() {
  if (!state.current) return;
  const t = cityTime(Math.floor(Date.now() / 1000), state.current.timezone, { hour: "numeric", minute: "2-digit" });
  $("local-time").textContent = `Local time ${t}`;
}
setInterval(updateClock, 30000);

function renderHourly(f) {
  const tz = f.city.timezone;
  $("hourly").innerHTML = f.list.slice(0, 8).map((h) => `
    <div class="hour">
      <span class="muted">${cityTime(h.dt, tz, { hour: "numeric" })}</span>
      <img src="${iconUrl(h.weather[0].icon)}" alt="${h.weather[0].description}">
      <span class="t">${temp(h.main.temp)}°</span>
      <span class="pop">${h.pop > 0.05 ? Math.round(h.pop * 100) + "%" : ""}</span>
    </div>`).join("");
}

// The forecast API returns 3-hour slots; group them into days using the city's own clock
function buildDaily(f) {
  const days = {};
  f.list.forEach((item) => {
    const local = new Date((item.dt + f.city.timezone) * 1000);
    const key = local.toISOString().slice(0, 10);
    const gap = Math.abs(local.getUTCHours() - 12);
    const d = days[key] ??= { date: local, temps: [], icon: null, gap: 99 };
    d.temps.push(item.main.temp);
    if (gap < d.gap) { d.gap = gap; d.icon = item.weather[0]; }
  });
  return Object.values(days).slice(0, 5);
}

function renderDaily(f) {
  const days = buildDaily(f);
  const lows = days.map((d) => Math.min(...d.temps));
  const highs = days.map((d) => Math.max(...d.temps));
  const min = Math.min(...lows), span = Math.max(...highs) - min || 1;

  $("forecast").innerHTML = days.map((d, i) => {
    const name = i === 0 ? "Today" : d.date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const left = ((lows[i] - min) / span) * 100;
    const width = Math.max(((highs[i] - lows[i]) / span) * 100, 8);
    return `
      <div class="day">
        <span class="name">${name}</span>
        <img src="${iconUrl(d.icon.icon.replace("n", "d"))}" alt="${d.icon.description}">
        <span class="lo">${temp(lows[i])}°</span>
        <div class="bar"><span style="left:${left}%;width:${width}%"></span></div>
        <span class="hi">${temp(highs[i])}°</span>
      </div>`;
  }).join("");
}

// ====== Recent searches + quick picks ======
function saveRecent(place) {
  const list = store("recent", []).filter((p) => !(p.lat === place.lat && p.lon === place.lon));
  list.unshift(place);
  store("recent", null, list.slice(0, 5));
  renderRecent();
}
function renderRecent() {
  const list = store("recent", []);
  els.recent.innerHTML = list.map((p, i) => `<button type="button" class="chip" data-i="${i}">${p.name}</button>`).join("");
}
els.recent.addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  const p = store("recent", [])[Number(b.dataset.i)];
  if (p) { els.input.value = placeLabel(p); loadWeather(p); }
});
els.quick.innerHTML = QUICK_CITIES.map((c) => `<button type="button" class="chip" data-q="${c}">${c}</button>`).join("");
els.quick.addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (b) { els.input.value = b.dataset.q; searchByText(b.dataset.q); }
});

// ====== Init ======
setUnits(state.units);
renderRecent();
const last = store("recent", [])[0];
if (last) { els.input.value = placeLabel(last); loadWeather(last); }