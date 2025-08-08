#
# GPT Shell

Tiny desktop window for ChatGPT on Linux. Stays out of the way, respects your browser.

## Why this exists

I like having ChatGPT in its own window, but I want every external link to open in my real browser (Firefox with blockers, passwords, the works). So this app:

- Loads ChatGPT in a minimal Electron window
- Never opens new Electron pop‑ups
- Sends all external links to your default browser
- Keeps the “feel” of the web app for internal navigation

That’s it. No extra fluff.

## Install

```bash
git clone https://github.com/glitch-bee/gpt.shell.git
cd gpt.shell
npm install
```

## Run

```bash
npm start
```

## Shortcuts

- Ctrl+Shift+T — Toggle Always on Top
- Ctrl+N — Open a second window (auto side-by-side)
- Ctrl+R — Reload
- Ctrl+Shift+I — DevTools
- Ctrl+Q — Quit

## What it does (and doesn’t)

- Uses JetBrains Mono so code looks nice
- Remembers window size/position and Always-on-Top state
- Has a simple menu and global shortcuts
- Context isolation + sandboxing are on
- External links go to your default browser. Always.

## Why force external links to your browser?

Because browsing without your own setup is rough. Ad blockers and privacy tools work best in your main browser. Also, Manifest V3 limits what Chromium-based blockers can do, and Electron rides on Chromium. So this app takes the “nuclear option”: no new Electron windows—ever. Internal ChatGPT stuff stays in the same window; everything else opens in your default browser.

## Notes

- Linux + Node + npm required
- Personal project; use it however you like
