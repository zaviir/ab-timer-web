# Deployment Workflow

This project uses two GitHub Pages deployments:

- Production: `origin/main` -> https://zaviir.github.io/ab-timer-web/
- Staging: `staging/dev` -> https://zaviir.github.io/ab-timer-web-dev/

## Daily Development

Work on the `dev` branch:

```bash
git switch dev
```

After making changes, commit and push to staging:

```bash
git add index.html styles.css script.js service-worker.js manifest.webmanifest README.md DEPLOYMENT.md icons
git commit -m "Describe the change"
git push staging dev
```

Test the staging app on desktop and phone:

```text
https://zaviir.github.io/ab-timer-web-dev/
```

## Promote To Production

Only promote after staging looks good:

```bash
git switch main
git merge dev
git push origin main
git switch dev
```

Production deploys from:

```text
https://zaviir.github.io/ab-timer-web/
```

## PWA Cache Note

When app shell files change, update `CACHE_NAME` in `service-worker.js`. The app checks for service worker updates on launch, focus, and return from background, then reloads once after an update activates.
