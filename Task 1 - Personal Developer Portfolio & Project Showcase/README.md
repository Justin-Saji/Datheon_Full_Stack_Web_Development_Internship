

# Weather Telemetry

A live weather dashboard built with vanilla HTML, CSS and JavaScript. Search any place in the world, from major cities to small towns, and get real-time conditions, an hourly outlook and a 5-day forecast. The page background and animations change with the weather.

Built as a Full Stack Development internship task at Datheon.

## Features

- **Search any place:** autocomplete suggestions as you type, powered by the OpenWeatherMap Geocoding API. Each suggestion shows the state and country, and weather is fetched by exact coordinates, so places with the same name are never confused.
- **Live conditions:** temperature, feels-like, weather description, humidity, wind speed and direction, pressure, visibility, cloud cover, sunrise, sunset and today's range.
- **Dynamic weather icons:** day and night variants from OpenWeatherMap.
- **Next 24 hours:** hourly strip with rain probability.
- **5-day forecast:** daily high and low with a temperature-range bar, rendered with `Array.map()`.
- **Dynamic theme:** the background gradient and ambient effects (rain, snow, stars, sun glow, lightning) follow the weather and whether it is night in the searched city.
- **°C / °F toggle:** switches temperature, wind and visibility units instantly, and remembers your choice.
- **Use my location:** one-tap weather for your current position.
- **Recent searches:** the last five places are saved in `localStorage`, and the last one reopens on your next visit.
- **Error handling:** loading spinner, plus clear messages for unknown places, network failures, an invalid API key, rate limits and blocked location access.
- **Responsive and accessible:** works from phones to desktops, supports keyboard navigation in the search list, and respects the "reduce motion" setting.

## Tech stack

- HTML5, CSS3 (Flexbox, Grid, CSS variables, animations)
- JavaScript (ES6+, Fetch API, async/await, `Promise.all`, try/catch/finally)
- [OpenWeatherMap](https://openweathermap.org/api): Current Weather, 5-Day Forecast and Geocoding APIs

## Project structure

```
weather-app/
├── index.html   # Page structure
├── style.css    # Layout, themes, animations, responsive rules
└── script.js    # API calls, autocomplete, rendering, state
```

## Getting started

### 1. Get an API key

Create a free account at [openweathermap.org](https://home.openweathermap.org/users/sign_up) and copy your key from the **API keys** tab. New keys can take up to a couple of hours to activate.

### 2. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 3. Add your key

Open `script.js` and set your key at the top of the file:

```js
const API_KEY = "YOUR_API_KEY_HERE";
```

### 4. Run it

Open the folder in VS Code, install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**. You can also open `index.html` directly in a browser.

## How it works

1. As you type, the app queries the Geocoding API (debounced by 300 ms) and lists matching places.
2. Choosing a place sends its latitude and longitude to the Current Weather and 5-Day Forecast endpoints in parallel.
3. The 3-hour forecast slots are grouped into days using the searched city's own timezone.
4. The dominant condition and day/night status select the theme class on `<body>`, which drives the gradient and animated background.

## API key safety

This is a front-end only project, so the key is visible in the browser. That is fine for a learning project, but:

- Do not commit a key you want to keep private. Regenerate it on the OpenWeatherMap dashboard if it has been shared.
- For production, send requests through a small backend (Node, Flask, etc.) that stores the key as an environment variable.

## Possible improvements

- Backend proxy to hide the API key
- Air quality and UV index
- Saved favourite cities
- Map view with weather layers
- Light theme

## Acknowledgements

Weather data and icons by [OpenWeatherMap](https://openweathermap.org/).

## Author

**Justin Saji**
