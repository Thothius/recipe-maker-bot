# 🍳 Windsurf Recipe Voice Assistant

**Production-ready voice-controlled recipe creation webapp**  
Built with Python FastAPI, Vanilla JS, Tailwind CSS, and OpenAI's GPT Realtime API

[![Version](https://img.shields.io/badge/version-0.0.2-blue.svg)](https://github.com/Thothius/recipe-maker-bot)
[![Python](https://img.shields.io/badge/python-3.8+-green.svg)](https://python.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-Realtime%20API-orange.svg)](https://platform.openai.com)

## 🚀 Quick Start

**One-Click Launch:**
```bash
# Double-click the main launcher:
start_cookbooker.bat
```

Automatically:
- ✅ Checks Python installation
- ✅ Installs dependencies
- ✅ Starts FastAPI server on port 8000
- ✅ Opens browser to http://localhost:8000

**Manual Setup:**
1. Set OpenAI API key in `.env`: `OPENAI_API_KEY=your-key-here`
2. Install: `cd project_data && pip install -r requirements.txt`
3. Run: `python -m uvicorn server:app --host 0.0.0.0 --port 8000`

## 🎯 Usage

1. **Connect**: Click "Connect to Assistant" → Allow microphone access
2. **Create**: Say "Start recipe" → Begin voice-guided creation
3. **Build**: Add ingredients naturally: "200 grams flour", "2 eggs", "50ml milk"
4. **Finish**: Say "End recipe" → Complete ingredient collection
5. **Save**: Say "Save recipe" → Store with nutrition analysis
6. **Manage**: View saved recipes in "My Recipes"

## ✨ Features

**Voice Intelligence:**
- OpenAI GPT-4 Realtime API with WebRTC
- Natural conversation with smart ingredient recognition
- Function calling for precise recipe actions
- 24kHz PCM16 audio with semantic turn detection

**Modern UI/UX:**
- Minimalist design with Tailwind CSS
- 5-view architecture: Connect → Connected → Recipe Name → Recipe Main → My Recipes
- Real-time ingredient list updates during voice input
- Professional Figma design system integration

**Data Management:**
- Multi-user support with user-specific storage
- JSON database with metadata indexing
- Complete recipe CRUD operations
- GPT-4 powered nutrition analysis

**Security & Performance:**
- Server-side API key protection
- Robust error handling and graceful degradation
- Request caching with intelligent invalidation
- Proper resource cleanup and memory management

## 🏗️ Architecture

**Project Structure:**
```
recipe-maker/
├── start_cookbooker.bat          # Main launcher
├── database/                      # User data & recipes
│   ├── recipes/                   # Recipe JSON files
│   └── users/                     # User profiles & sessions
└── project_data/                  # Application code
    ├── server.py                  # FastAPI backend (459 lines)
    ├── simple_server.py           # Minimal backup server
    ├── redis_manager.py           # Redis integration
    ├── index.html                 # Main UI (793 lines)
    ├── js/                        # Modular JavaScript
    │   ├── app.js                 # Main orchestrator
    │   └── core/                  # Core modules
    │       ├── VoiceManager.js    # WebRTC & voice handling
    │       ├── RecipeManager.js   # Recipe state & operations
    │       ├── UIController.js    # View management & UI
    │       └── APIClient.js       # Server communication
    ├── styles.css                 # Custom styling
    ├── requirements.txt           # Python dependencies
    └── .env                       # Environment variables
```

**Technical Stack:**
- **Backend**: FastAPI, Redis, OpenAI API, HTTPX
- **Frontend**: Vanilla JS (modular), Tailwind CSS via CDN
- **Audio**: WebRTC, AudioContext, MediaStream
- **Storage**: JSON files + Redis for user data
- **Voice**: OpenAI Realtime API (gpt-4o-realtime-preview-2024-10-01)

**Recipe Workflow (5-State Machine):**
```
idle → waiting_to_start → listening_for_ingredients → finished_recipe → saved_recipe
```

**Voice Commands:**
- `"Start recipe"` → Begin ingredient collection
- `"End recipe"` → Finish and prepare for save
- `"Save recipe"` → Store with nutrition analysis
- Natural ingredient input: `"200 grams flour"`, `"2 eggs"`, `"half cup milk"`

## 🔧 Core Modules

**Modular Architecture (1200+ lines total):**
- **VoiceManager.js**: WebRTC connection, OpenAI Realtime API, audio streaming, auto-reconnection
- **RecipeManager.js**: Recipe state management, ingredient tracking, function call handling, CRUD operations
- **UIController.js**: View management, modal dialogs, user interactions, recipe display updates
- **APIClient.js**: Server communication, retry logic with exponential backoff, request caching

**Key Improvements:**
- ✅ Modular architecture (broke 2986-line monolith)
- ✅ Comprehensive error handling and recovery
- ✅ Input validation and XSS prevention
- ✅ Performance optimizations (caching, debouncing)
- ✅ Accessibility features (focus traps, ARIA labels)
- ✅ Connection recovery and timeout handling

## ⚙️ Configuration

**OpenAI Setup:**
```javascript
{
  model: "gpt-4o-realtime-preview-2024-10-01",
  voice: "shimmer",
  audio: "pcm16", // 24kHz sampling
  turn_detection: "server_vad", // Semantic turn detection
  temperature: 0.3 // Consistent responses
}
```

**Environment Variables:**
```bash
# Required
OPENAI_API_KEY=your-openai-api-key

# Optional
REDIS_URL=redis://localhost:6379
DEBUG=true
```

## 🚧 Roadmap

**Phase 1: Enhanced Voice Flow** ✅ *Completed*
- [x] Modular JavaScript architecture
- [x] Robust error handling and recovery
- [x] Voice connection resilience
- [x] Live recipe display updates

**Phase 2: Advanced Features** 🔄 *In Progress*
- [ ] Enhanced function calling (add_ingredient, update_recipe_title)
- [ ] Export system (JSON, text, shopping list)
- [ ] Voice timers ("Set timer for X minutes")
- [ ] Recipe sharing and URLs

**Phase 3: Intelligence** 📋 *Planned*
- [ ] Image ingredient recognition
- [ ] Recipe personalization
- [ ] Nutritional recommendations
- [ ] Cooking step guidance

## 🐛 Troubleshooting

**Common Issues:**
- **Microphone not working**: Check browser permissions, system settings, refresh page
- **Server won't start**: Verify Python 3.8+, port 8000 availability, OpenAI API key in `.env`
- **Voice connection fails**: Check internet connection, API key validity, try reconnecting

**Debug Mode:**
```bash
DEBUG=true python -m uvicorn server:app --reload
```

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Thothius/recipe-maker-bot/issues)
- **Documentation**: `/project_data/plan.md` for implementation details
- **Architecture**: `/project_data/superplan.md` for enhancement roadmap

---

**Built with ❤️ by the Windsurf Team**  
*Minimalist. Robust. Voice-First.*
