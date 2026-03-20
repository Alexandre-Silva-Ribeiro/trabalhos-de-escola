const API_KEY = "5e9a6e68a2b26ffbc4736b35e5fe0e71";
const BR_STATES = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO"
};

const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const statusText = document.getElementById("status");
const matches = document.getElementById("matches");
const result = document.getElementById("result");
const locationText = document.getElementById("location");
const dateText = document.getElementById("dateText");
const timeText = document.getElementById("timeText");
const tempText = document.getElementById("temp");
const descText = document.getElementById("desc");
const icon = document.getElementById("icon");
const normalizeText = (text = "") => text
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = cityInput.value.trim();
  if (!input) return;

  const normalizedInput = normalizeText(input);

  const parts = normalizedInput.split(",").map((p) => p.trim()).filter(Boolean);
  const city = parts[0] || "";
  const state = parts[1] || "";
  if (!city) return;

  statusText.textContent = "Loading...";
  result.classList.add("hidden");
  matches.classList.add("hidden");
  matches.innerHTML = "";
  document.body.className = "bg-day-clear";

  try {
    const stateCode = BR_STATES[state];
    const query = stateCode ? `${city},${stateCode},BR` : parts.join(",");

    // Use multiple geocoding results to handle duplicate city names.
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
    const geoRes = await fetch(geoUrl);
    const placesRaw = await geoRes.json();
    if (!geoRes.ok || !placesRaw.length) throw new Error();

    // Keep only exact city name matches.
    const exactMatches = placesRaw.filter((p) => normalizeText(p.name) === city);
    if (!exactMatches.length) throw new Error();

    // Remove duplicates by name + state + country.
    const uniqueMap = new Map();
    exactMatches.forEach((p) => {
      const key = [
        normalizeText(p.name),
        normalizeText(p.state || ""),
        (p.country || "").toUpperCase()
      ].join("|");
      if (!uniqueMap.has(key)) uniqueMap.set(key, p);
    });

    // Prioritize Brazil first.
    const places = [...uniqueMap.values()].sort((a, b) => {
      if ((a.country || "").toUpperCase() === "BR" && (b.country || "").toUpperCase() !== "BR") return -1;
      if ((b.country || "").toUpperCase() === "BR" && (a.country || "").toUpperCase() !== "BR") return 1;
      return 0;
    });
    if (!places.length) throw new Error();

    const selected = places[0];
    renderMatches(places, selected);
    await loadWeather(selected);
  } catch {
    statusText.textContent = "City not found";
    result.classList.add("hidden");
    matches.classList.add("hidden");
    document.body.className = "bg-day-clear";
  }
});

function renderMatches(places, selectedPlace) {
  if (places.length <= 1) {
    matches.classList.add("hidden");
    matches.innerHTML = "";
    return;
  }

  matches.innerHTML = "";
  matches.classList.remove("hidden");

  places.forEach((place) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "match-btn";
    if (place === selectedPlace) btn.classList.add("active");
    btn.textContent = [place.name, place.state || "", place.country].filter(Boolean).join(", ");

    btn.addEventListener("click", async () => {
      document.querySelectorAll(".match-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      statusText.textContent = "Loading...";
      try {
        await loadWeather(place);
      } catch {
        statusText.textContent = "City not found";
        result.classList.add("hidden");
        document.body.className = "bg-day-clear";
      }
    });

    matches.appendChild(btn);
  });
}

async function loadWeather(place) {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${place.lat}&lon=${place.lon}&units=metric&appid=${API_KEY}`;
  const res = await fetch(weatherUrl);
  const data = await res.json();
  if (!res.ok || Number(data.cod) !== 200) throw new Error();

  locationText.textContent = [data.name, place.state || "", data.sys.country].filter(Boolean).join(", ");
  tempText.textContent = `${Math.round(data.main.temp)}\u00B0C`;
  descText.textContent = data.weather[0].description;
  icon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  icon.alt = data.weather[0].description;

  const localTime = new Date((data.dt + data.timezone) * 1000);
  dateText.textContent = localTime.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  timeText.textContent = localTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  });

  const weatherMain = data.weather[0].main;
  const temperature = data.main.temp;
  const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;

  if (isNight) {
    document.body.className = "bg-night";
  } else if (temperature >= 30) {
    document.body.className = "bg-day-hot";
  } else if (["Clouds", "Mist", "Fog"].includes(weatherMain)) {
    document.body.className = "bg-day-gray";
  } else if (temperature >= 20) {
    document.body.className = "bg-day-clear";
  } else {
    document.body.className = "bg-day-cool";
  }

  statusText.textContent = "";
  result.classList.remove("hidden");
}
