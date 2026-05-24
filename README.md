# Ab Timer

A focused installable web app for timed ab workouts.

Live app: [https://zaviir.github.io/ab-timer-web/](https://zaviir.github.io/ab-timer-web/)

## Routine

The default workout is:

1. Hollow Body Crunches
2. Straight-Leg Reverse Crunches
3. Russian Twists
4. V-Ups

Each move runs for 30 seconds, with 10 seconds of rest between moves and 60 seconds of rest between sets. The app starts with a 10-second get-ready countdown.

## Features

- Editable sets, work duration, rest duration, and set-rest duration
- Editable exercise names
- Live elapsed time and total workout time
- Start, pause, skip, and reset controls
- Audio cues for countdowns and phase changes
- Saves settings in the browser
- Installable as a PWA
- Offline support after the first successful load
- Responsive layout for phone, tablet, laptop, and landscape screens

## Install On Phone

Open the live app on your phone:

[https://zaviir.github.io/ab-timer-web/](https://zaviir.github.io/ab-timer-web/)

On iPhone:

1. Tap the Share button.
2. Tap Add to Home Screen.
3. Open Ab Timer from the new home-screen icon.

On Android:

1. Open the browser menu.
2. Tap Add to Home screen or Install app.
3. Open Ab Timer from the new home-screen icon.

## Local Development

Serve the folder from a local web server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

The PWA service worker requires `localhost` or HTTPS. Opening `index.html` directly with `file://` will show the app, but install/offline behavior may not work.

## Deploy Updates

After editing files:

```bash
git add README.md index.html styles.css script.js manifest.webmanifest service-worker.js icons
git commit -m "Update ab timer"
git push
```

GitHub Pages publishes from the `main` branch. Updates may take a minute or two to appear because GitHub Pages and the service worker both cache files.
