# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Node.js

If you don't have Node.js installed:

1. Visit https://nodejs.org/
2. Download LTS version
3. Run installer and follow prompts

### Step 2: Install Dependencies

Open terminal/PowerShell in the `retro-game-launcher` folder and run:

```bash
npm install
```

### Step 3: Start the Server

```bash
npm start
```

You should see:

```
🎮 Retro Game Launcher is running on http://localhost:3333
```

### Step 4: Open in Browser

Open your web browser and go to:

```
http://localhost:3333
```

## First Time Users

1. **Main Menu**: You'll see the retro console screen with "RETRO GAME LAUNCHER" title
2. **Press START**: Click the red START button to proceed
3. **Library**: Click SELECT button to see your game library
4. **Upload ROMs**: Click [UPLOAD ROM] button to add games
5. **Play**: Click a game to select it, then press START to play

## Where to Find ROMs

Many retro games are available through legal channels:

- Community preservation archives
- Official re-releases and compilations
- abandonware sites
- Your own personal game backups

## Common Issues

**"Cannot connect to server"**

- Make sure `npm start` completed successfully
- Check that port 3333 is not in use
- Try http://localhost:3333 in a fresh browser tab

**"ROM upload fails"**

- Check file format is supported (.nes, .snes, etc.)
- File should be under 100MB
- Try a different ROM to test

**"No games showing up"**

- Click [SELECT] to go to Library view
- Upload a ROM using [UPLOAD ROM] button
- Wait for upload to complete

## Keyboard Controls While Playing

- **Arrow Keys or WASD** - Move/Navigate
- **Z Key** - A Button (Action)
- **X Key** - B Button (Cancel)
- **Space** - Pause/Resume
- **Escape** - Exit game

## Save Your Games

1. While playing, click **[SAVE STATE]**
2. Choose a slot (1-9)
3. Game state is saved!

To load a game:

1. Click **[LOAD STATE]**
2. Choose the slot with your save
3. Game resumes from saved point

## Next Steps

- Add your favorite games to the library
- Explore different consoles
- Check out Settings for device options
- Try cross-device play (open on another device)

## Need Help?

Check the full README.md for detailed documentation and troubleshooting tips.

---

**Enjoy your retro gaming! 🎮**
