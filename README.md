# Cookbooker - Voice Recipe Assistant

**Version 0.02** - A minimalist voice-powered recipe creation tool built with Python, Vanilla JS, Tailwind CSS, and OpenAI's GPT Realtime API.

## 🎯 Features

- **Voice-Controlled Recipe Creation**: Speak naturally to create recipes
- **Real-time Ingredient Tracking**: Add ingredients with voice commands
- **Nutrition Analysis**: AI-powered nutritional breakdown
- **User Profiles**: Multiple user support with individual recipe collections
- **Recipe Management**: Save, view, and delete recipes
- **Modern UI**: Clean, responsive design with Tailwind CSS

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- Tailwind CSS via CDN
- WebRTC for real-time audio

**Backend:**
- Python FastAPI
- OpenAI GPT-4 Realtime API
- JSON file storage

**Voice Integration:**
- OpenAI Realtime API (WebRTC)
- Model: gpt-4o-realtime-preview-2024-10-01
- Voice: shimmer
- Audio: PCM16 with semantic turn detection

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Thothius/recipe-maker-bot.git
   cd recipe-maker-bot
   ```

2. **Set up environment:**
   ```bash
   # Create .env file in project_data/
   echo "OPENAI_API_KEY=your_api_key_here" > project_data/.env
   ```

3. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn python-dotenv
   ```

4. **Run the server:**
   ```bash
   cd project_data
   python server.py
   ```

5. **Open browser:**
   Navigate to `http://localhost:8000`

## 📱 Usage

1. **Connect**: Select a user profile and connect to voice assistant
2. **Create Recipe**: Say "Start a new recipe" and provide a name
3. **Add Ingredients**: Say "Add 2 cups flour" or "200 grams butter"
4. **Save Recipe**: Click save or say "Save recipe"
5. **View Recipes**: Browse your saved recipes in "My Recipes"

## 🎙️ Voice Commands

- `"Start a new recipe"` - Begin recipe creation
- `"Add [amount] [ingredient]"` - Add ingredients
- `"End recipe"` - Finish recipe creation
- `"Save recipe"` - Save current recipe
- `"Close recipe"` - Return to main menu

## 🏗️ Architecture

**Modular JavaScript:**
- `app.js` - Main application orchestrator
- `VoiceManager.js` - WebRTC and audio handling
- `RecipeManager.js` - Recipe state and data management
- `UIController.js` - User interface and view management
- `APIClient.js` - Server communication with caching

**Recipe Workflow:**
1. `idle` → `waiting_to_start` → `listening_for_ingredients` → `finished_recipe` → `saved_recipe`

## 🔧 Configuration

**OpenAI Settings:**
- Model: `gpt-4o-realtime-preview-2024-10-01`
- Voice: `shimmer`
- Audio format: PCM16
- Turn detection: Semantic

**Server:**
- Default port: 8000
- CORS enabled for development
- JSON file-based storage

## 📁 Project Structure

```
recipe-maker-bot/
├── project_data/
│   ├── js/
│   │   ├── core/           # Core modules
│   │   └── app.js          # Main application
│   ├── index.html          # Single-page application
│   ├── server.py           # FastAPI backend
│   ├── .env               # Environment variables
│   └── database/          # User data storage
├── .gitignore
└── README.md
```

## 🧪 Development

**Testing Features:**
- Console view for real-time debugging
- Voice calibration in settings
- Error handling and recovery
- Cache management for performance

**Code Quality:**
- Modular architecture
- Comprehensive error handling
- Input validation and sanitization
- Memory management

## 📝 License

MIT License - Feel free to use and modify for your projects.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with ❤️ for voice-powered cooking experiences**
