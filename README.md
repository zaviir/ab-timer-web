# Ab Timer

A focused installable PWA for timed ab workouts, built for phone use in the gym.

Production app: [https://zaviir.github.io/ab-timer-web/](https://zaviir.github.io/ab-timer-web/)  
Staging app: [https://zaviir.github.io/ab-timer-web-dev/](https://zaviir.github.io/ab-timer-web-dev/)

## Routine

The default workout is:

1. Hollow Body Crunches
2. Straight-Leg Reverse Crunches
3. Russian Twists
4. V-Ups

Each move runs for 30 seconds, with 10 seconds of rest between moves and 60 seconds of rest between sets. The app starts with a 10-second get-ready countdown.

The routine is editable: move names can be changed, moves can be added or removed, and the timer recalculates total duration automatically.

## Features

- Installable PWA with offline support after first load
- Mobile tab layout for Timer and Routine views
- Editable sets, work duration, rest duration, and set-rest duration
- Editable, addable, and removable routine moves
- Live elapsed time and total workout time
- Start, pause, skip, and reset controls
- Spoken prompts for get-ready, countdown, work, rest, set rest, and completion
- Synthesized chimes layered under speech prompts
- Browser-local settings persistence
- Responsive layout for phone, tablet, laptop, and landscape screens

## Install On Phone

Open the production app on your phone:

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

Work on the `dev` branch by default:

```bash
git switch dev
```

Serve the folder from a local web server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

The PWA service worker requires `localhost` or HTTPS. Opening `index.html` directly with `file://` will show the app, but install/offline behavior may not work.

## Deploy Workflow

Staging deploys from `staging/dev`:

```bash
git add index.html styles.css script.js service-worker.js manifest.webmanifest README.md DEPLOYMENT.md icons
git commit -m "Describe the change"
git push staging dev
```

Test staging at:

[https://zaviir.github.io/ab-timer-web-dev/](https://zaviir.github.io/ab-timer-web-dev/)

Promote to production only after staging looks good:

```bash
git switch main
git merge dev
git push origin main
git switch dev
```

Production deploys from `origin/main`:

[https://zaviir.github.io/ab-timer-web/](https://zaviir.github.io/ab-timer-web/)

More detail lives in [DEPLOYMENT.md](DEPLOYMENT.md).

## PWA Cache Notes

When app shell files change, update `CACHE_NAME` in `service-worker.js`. The app checks for service worker updates on launch, focus, and return from background, then reloads once after an update activates.

Installed iOS PWAs can still be a little sticky. If a phone does not pick up the latest version, open the browser URL once, refresh it, fully close the home-screen app, then reopen it.
