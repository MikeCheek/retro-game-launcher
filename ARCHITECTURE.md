# Architecture & Development Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (HTML/CSS/JavaScript)                                  │
│  ├── Retro UI Components (Pixel Art Console)                    │
│  ├── API Client (REST)                                          │
│  ├── Emulator Controller                                        │
│  └── Local Storage (Device ID, Settings)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             │ REST API
┌────────────────────────────┴────────────────────────────────────┐
│              NODEJS BACKEND SERVER (EXPRESS)                     │
├─────────────────────────────────────────────────────────────────┤
│  Routes Layer                                                    │
│  ├── /api/roms         (ROM Management)                         │
│  ├── /api/saves        (Save State Management)                  │
│  └── /api/users        (Session Management)                     │
│        ↓                                                         │
│  Controllers Layer                                               │
│  ├── ROM Controller                                              │
│  ├── Save State Controller                                       │
│  └── User/Session Controller                                    │
│        ↓                                                         │
│  Database Layer                                                  │
│  └── SQLite3 (data.db)                                          │
│        ├── users                                                 │
│        ├── roms                                                  │
│        ├── save_states                                           │
│        └── sessions                                              │
│        ↓                                                         │
│  File Storage                                                    │
│  └── /roms directory (ROM files)                                │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### ROM Upload Flow

```
User selects file
  ↓
Frontend: handleFileUpload()
  ├─ Calculate MD5 hash
  ├─ POST /api/roms/upload (multipart/form-data)
  └─ Show progress
       ↓
Backend: romRoutes.post('/upload')
  ├─ Receive file
  ├─ Save to /roms directory
  ├─ Calculate hash
  ├─ INSERT into database
  └─ Return ROM metadata
       ↓
Frontend: Display in Library
```

### Save State Flow

```
User clicks [SAVE STATE] → Select Slot
  ↓
Frontend: emulator.saveState(slotNumber)
  ├─ Get emulator state data
  ├─ Take canvas screenshot
  ├─ POST /api/saves/:romId
  └─ Show confirmation
       ↓
Backend: saveRoutes.post('/:romId')
  ├─ Check existing save
  ├─ Store state data (BLOB)
  ├─ Store screenshot (base64)
  ├─ UPDATE or INSERT database
  └─ Return save info
       ↓
Frontend: Update save slot UI
```

### Cross-Device Sync

```
Device A (User logs in)
  ├─ POST /api/users/session (deviceId, deviceName)
  ├─ Save to sessions table
  └─ Retrieve saves for user
       ↓
Device B (Same user, different device)
  ├─ POST /api/users/session (different deviceId)
  ├─ Save new session entry
  └─ Query all saves for userId
       ↓
Both devices can see each other's save states
```

## Technology Stack

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Pixel-art retro styling with animations
- **Vanilla JavaScript** - No framework, lightweight
- **LocalStorage API** - Device ID and settings persistence
- **Canvas API** - Game rendering
- **File API** - ROM upload handling

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite3** - Lightweight database
- **Multer** - File upload middleware
- **UUID** - Unique ID generation
- **Crypto** - MD5 hashing

### Build & Deployment

- **npm** - Package management
- **nodemon** - Development auto-reload
- Optional: Docker for containerization

## File Organization

### Frontend Directory

```
frontend/
├── index.html              # Main HTML entry point
├── css/
│   ├── retro.css          # Main retro styling
│   └── style.css          # Additional utilities
├── js/
│   ├── main.js            # App initialization
│   ├── ui.js              # UI controller
│   ├── api.js             # REST API client
│   ├── emulator.js        # Emulator integration
│   └── utils.js           # Utility functions
└── assets/
    └── (fonts, icons, images)
```

### Backend Directory

```
backend/
├── app.js                 # Express server setup
├── db/
│   └── database.js        # SQLite initialization & queries
├── routes/
│   ├── romRoutes.js       # ROM CRUD endpoints
│   ├── saveRoutes.js      # Save state endpoints
│   └── userRoutes.js      # Session/user endpoints
└── middleware/
    └── (auth, validation, error handling)
```

## Database Schema

### users Table

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### roms Table

```sql
CREATE TABLE roms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    game_type TEXT NOT NULL,
    file_size INTEGER,
    md5_hash TEXT,
    cover_image TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_played DATETIME,
    times_played INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, md5_hash)
);
```

### save_states Table

```sql
CREATE TABLE save_states (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    rom_id TEXT NOT NULL,
    slot_number INTEGER NOT NULL,
    state_data BLOB NOT NULL,
    screenshot TEXT,
    game_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(rom_id) REFERENCES roms(id),
    UNIQUE(user_id, rom_id, slot_number)
);
```

### sessions Table

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## API Response Format

All API endpoints follow consistent response patterns:

### Success Response

```json
{
  "status": "success",
  "data": {...},
  "message": "Operation completed"
}
```

### Error Response

```json
{
  "status": "error",
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## State Management

### Local State (Browser)

- `currentRom` - Currently selected game
- `currentView` - Active screen (menu, library, player)
- `saveStates` - Cached save states
- Device ID (localStorage)

### Server State (Database)

- User accounts and configurations
- ROM metadata and file references
- Save state data and snapshots
- Session/device information

## Error Handling

### Frontend

- Try-catch blocks for async operations
- User-friendly error messages
- Console logging for debugging
- Notification system for user feedback

### Backend

- Express error middleware
- Validation before database operations
- File operation error handling
- Database transaction support

## Performance Considerations

1. **ROM Upload**
   - Chunked file upload for large files
   - Progress tracking
   - Duplicate detection via MD5

2. **Save States**
   - Compression for large state data
   - Lazy loading of save information
   - Cache save state list

3. **Library Search**
   - Debounced search input
   - Database indexes on frequently searched columns
   - Pagination for large libraries

4. **Frontend Optimization**
   - Minimal dependencies
   - Efficient DOM manipulation
   - CSS animations over JavaScript
   - LocalStorage for client-side caching

## Security Best Practices

1. **File Uploads**
   - Whitelist file extensions
   - Validate file size
   - Sanitize filenames
   - Store outside web root

2. **API Requests**
   - Validate all inputs
   - Sanitize user data
   - Implement rate limiting
   - Use HTTPS in production

3. **Database**
   - Use parameterized queries
   - Proper indexes
   - Regular backups
   - Access controls

## Future Enhancement Ideas

### Short Term

- Add user authentication (JWT/bcrypt)
- Implement proper emulator (WASM)
- Add ROM metadata scraping
- Controller support (Gamepad API)

### Medium Term

- Cloud synchronization
- Social features (sharing, leaderboards)
- Cheats/Game Genie support
- Screenshot gallery

### Long Term

- Mobile app (React Native)
- Discord integration
- Streaming support
- Machine learning recommendations

## Testing Strategy

### Unit Tests

- Utility functions
- API response formatting
- Data validation

### Integration Tests

- API endpoint testing
- Database operations
- File upload flow

### E2E Tests

- Complete user workflows
- Cross-device synchronization
- Save/load functionality

## Debugging Tips

1. **Enable detailed logging**

   ```javascript
   console.log('Debug info:', variable);
   ```

2. **Use browser DevTools**
   - Inspect network requests
   - Check localStorage
   - Debug JavaScript

3. **Check database directly**

   ```bash
   sqlite3 data.db
   SELECT * FROM roms;
   ```

4. **Server logs**
   - Watch for errors in terminal
   - Check file permissions
   - Verify database connectivity

## Deployment

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Implement authentication
- [ ] Configure CORS properly
- [ ] Set up backups
- [ ] Enable compression
- [ ] Configure caching headers
- [ ] Set up monitoring
- [ ] Implement logging
- [ ] Security audit

---

**For additional questions or contributions, please check the main README.md**
