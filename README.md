# 🎮 Retro Game Launcher

A retro-style web application for managing and playing classic video game ROMs with cross-device save state synchronization.

## Features

✨ **ROM Management**

- Upload and organize your classic game ROM collection
- Support for multiple console formats (NES, SNES, Genesis, Game Boy, N64, PSX, etc.)
- Beautiful retro pixel-art UI inspired by classic gaming consoles
- Game library browsing with search functionality

💾 **Save States**

- Save game progress to 9 save slots per ROM
- Store save snapshots with timestamps
- Cross-device synchronization of save states
- Quick save/load functionality

🎨 **Retro UI**

- Pixel-perfect console styling
- Interactive control panel with D-Pad and action buttons
- CRT screen effects for authentic retro feel
- Responsive design that works on desktop and mobile

🔄 **Cross-Device Sync**

- Play on one device and continue on another
- Automatic session management
- Device identification and tracking
- Seamless state restoration

## System Requirements

- Node.js 14+ and npm
- Modern web browser (Chrome, Firefox, Edge, Safari)
- SQLite3

## Installation

### 1. Clone/Download the Project

```bash
cd retro-game-launcher
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The application will run at `http://localhost:3333`

## Usage

### First Launch

1. Open your browser to `http://localhost:3333`
2. You'll see the retro console main menu
3. Press **START** button or press Enter to proceed

### Upload ROMs

1. Click **[SELECT]** button to access the Game Library
2. Click **[UPLOAD ROM]** button
3. Drag and drop or click to select a ROM file
4. Supported formats: `.nes`, `.snes`, `.smc`, `.gen`, `.md`, `.gb`, `.gbc`, `.gba`, `.z64`, `.n64`, `.bin`, `.iso`, `.cue`, `.zip`, `.rar`, `.7z`

### Play a Game

1. Select a game from your library
2. Click the game card or press **START**
3. Use keyboard controls:
   - **Arrow Keys / WASD** - D-Pad movement
   - **Z / Enter** - A Button
   - **X / Escape** - B Button
   - **C** - X Button
   - **V** - Y Button
   - **Space** - Pause/Resume

### Save and Load States

1. During gameplay, click **[SAVE STATE]** to save your progress
2. Select a save slot (1-9)
3. To load, click **[LOAD STATE]** and select a slot
4. Save states are automatically synced to your account

### Cross-Device Play

1. Open the app on a different device
2. Login with the same device name/ID
3. Your save states will be available automatically
4. Continue your game from where you left off

## Keyboard Shortcuts

| Key    | Action               |
| ------ | -------------------- |
| Enter  | Start game / Confirm |
| Escape | Back to menu         |
| Tab    | Toggle library       |
| Space  | Pause/Resume         |
| Ctrl+H | Show help            |

## Project Structure

```
retro-game-launcher/
├── frontend/                 # Web UI
│   ├── index.html           # Main HTML
│   ├── css/
│   │   ├── retro.css        # Retro console styling
│   │   └── style.css        # Additional styles
│   ├── js/
│   │   ├── main.js          # App initialization
│   │   ├── ui.js            # UI controller
│   │   ├── api.js           # API client
│   │   ├── emulator.js      # Emulator integration
│   │   └── utils.js         # Utility functions
│   └── assets/              # Images, icons, etc.
├── backend/                 # Node.js server
│   ├── app.js              # Express server
│   ├── db/
│   │   └── database.js     # SQLite database
│   ├── routes/
│   │   ├── romRoutes.js    # ROM management API
│   │   ├── saveRoutes.js   # Save state API
│   │   └── userRoutes.js   # User/session API
│   ├── middleware/          # Express middleware
│   └── controllers/         # API controllers
├── roms/                   # ROM storage directory
├── package.json            # Dependencies
└── .env                    # Environment config
```

## Database Schema

The application uses SQLite with the following tables:

- **users** - User accounts and profiles
- **roms** - Game ROM information and metadata
- **save_states** - Game save state data and snapshots
- **sessions** - Device sessions for cross-device sync

## API Endpoints

### ROMs

- `GET /api/roms` - Get all ROMs
- `POST /api/roms/upload` - Upload a ROM
- `GET /api/roms/:id` - Get specific ROM
- `PUT /api/roms/:id` - Update ROM metadata
- `DELETE /api/roms/:id` - Delete ROM
- `GET /api/roms/search/:query` - Search ROMs

### Save States

- `GET /api/saves/:romId` - Get save states for ROM
- `POST /api/saves/:romId` - Save game state
- `GET /api/saves/:romId/:slotNumber` - Get specific save
- `DELETE /api/saves/:romId/:slotNumber` - Delete save state

### Users/Sessions

- `POST /api/users/session` - Create/get session
- `GET /api/users/sessions` - Get all sessions
- `GET /api/users/stats` - Get user statistics

## Emulator Integration

The launcher is designed to work with multiple emulator engines:

- **JSNES** - For NES games
- **BSNES/Bintendo** - For SNES games
- **Genesis.js** - For Genesis/Mega Drive
- **Gambatte.js** - For Game Boy/GBA
- **Mupen64Plus** - For N64 games
- **DuckStation** - For PlayStation 1

Emulator libraries can be integrated via WebAssembly (.wasm) or JavaScript implementations.

## TODO Features

- [ ] User authentication and accounts
- [ ] Actual emulator engine integration (WASM-based)
- [ ] Cloud save synchronization
- [ ] ROM metadata scraping (cover art, descriptions)
- [ ] Cheats/Game Genie support
- [ ] Controller support (Gamepad API)
- [ ] Screenshots and video recording
- [ ] Game recommendations
- [ ] Social features (friend lists, leaderboards)
- [ ] Dark/Light theme switching
- [ ] Mobile app version
- [ ] Discord Rich Presence

## File Size Limits

- Maximum ROM size: 100 MB
- Maximum save state size: 50 MB
- Total storage per user: Configurable

## Troubleshooting

### ROMs not loading

- Check file format is supported
- Ensure ROM file isn't corrupted
- Check file size doesn't exceed 100MB
- Review browser console for errors

### Save states not working

- Ensure database is initialized (data.db created)
- Check server is running and responding
- Clear browser cache and try again
- Check localStorage permissions

### Cross-device sync not working

- Ensure devices have same device ID
- Check internet connection
- Verify server is accessible from both devices
- Check browser console for API errors

## Performance Tips

1. Keep ROM library organized with covers and descriptions
2. Regularly delete old save states to free space
3. Use incognito/private browsing for isolated sessions
4. Close unnecessary browser tabs
5. Clear browser cache periodically

## Security Considerations

- Store ROMs and save states securely
- Use HTTPS in production
- Implement proper authentication
- Validate all file uploads
- Sanitize user inputs
- Implement rate limiting on APIs

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+
- Opera 76+

## License

MIT License - Feel free to use and modify

## Contributing

Contributions welcome! Please submit pull requests with improvements.

## Support

For issues and questions, check the GitHub repository or contact the maintainers.

---

**Made with ❤️ for retro gaming enthusiasts**

_Press START to begin your nostalgic adventure! 🎮_
