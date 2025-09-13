import os
import json
import psutil
import signal
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from typing import List, Dict, Any
import openai
from dotenv import load_dotenv
import requests
import httpx
from redis_manager import redis_manager

# Function to kill process using port 8000
def kill_process_on_port(port=8000):
    """Kill any process using the specified port"""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                connections = proc.info['connections']
                if connections:
                    for conn in connections:
                        if hasattr(conn, 'laddr') and conn.laddr and conn.laddr.port == port:
                            # Skip system processes that don't actually use the port
                            if proc.info['name'] in ['System Idle Process', 'System']:
                                continue
                            print(f"🔥 Killing process {proc.info['pid']} ({proc.info['name']}) using port {port}")
                            proc.kill()
                            proc.wait(timeout=3)
                            return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        print(f"❌ Error killing process on port {port}: {e}")
    return False

# Port cleanup is now handled by start_server.py - remove duplicate check

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (current directory for project files)
app.mount("/static", StaticFiles(directory="."), name="static")

# Mount JavaScript files directly
app.mount("/js", StaticFiles(directory="js"), name="js")

# Pydantic models for request bodies
class RecipeSaveRequest(BaseModel):
    filename: str
    data: str

class MetadataUpdateRequest(BaseModel):
    id: str
    name: str
    filename: str
    created: str
    ingredients: list
    tags: list
    user: str  # Required user parameter

class UserRecipeSaveRequest(BaseModel):
    filename: str
    data: str
    user: str  # Required user parameter

class RecipeDeleteRequest(BaseModel):
    filename: str
    recipeId: str
    user: str  # Required user parameter

@app.get("/")
async def serve_index():
    """Serve the main HTML file"""
    return FileResponse("index.html")

@app.get("/session")
async def get_session():
    """Get API key for OpenAI Realtime API"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    return {"token": api_key}

@app.post("/rtc-session")
async def create_rtc_session():
    """Return API key and configuration for direct WebRTC connection to OpenAI Realtime API"""
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    return {
        "api_key": api_key,
        "model": "gpt-4o-realtime-preview-2024-10-01",
        "voice": "shimmer"
    }

@app.post("/api/save-recipe")
async def save_recipe(request: UserRecipeSaveRequest):
    """Save recipe JSON file to user-specific directory"""
    try:
        # Ensure user recipes directory exists
        user_recipes_dir = f"../database/users/{request.user}/recipes"
        os.makedirs(user_recipes_dir, exist_ok=True)
        
        # Write recipe file
        file_path = os.path.join(user_recipes_dir, request.filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(request.data)
        
        # Parse recipe data to extract info for Redis
        recipe_data = json.loads(request.data)
        recipe_name = recipe_data.get('name', 'Unnamed Recipe')
        recipe_id = recipe_data.get('id', request.filename.replace('.json', ''))
        
        # Update Redis with recipe creation
        await redis_manager.add_recipe_created(request.user, recipe_id, recipe_name)
        
        return {"success": True, "message": f"Recipe saved to {file_path}", "user": request.user}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save recipe: {str(e)}")

@app.post("/api/update-metadata")
async def update_metadata(entry: MetadataUpdateRequest):
    """Update the user-specific metadata registry with a new recipe entry"""
    user_recipes_dir = f"../database/users/{entry.user}/recipes"
    os.makedirs(user_recipes_dir, exist_ok=True)
    metadata_path = os.path.join(user_recipes_dir, "metadata.json")
    
    # Load existing metadata or create new
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    else:
        metadata = {"recipes": [], "user": entry.user}
    
    # Add or update recipe entry
    existing_index = next((i for i, recipe in enumerate(metadata["recipes"]) if recipe["id"] == entry.id), None)
    
    if existing_index is not None:
        metadata["recipes"][existing_index] = entry.dict()
    else:
        metadata["recipes"].append(entry.dict())
    
    # Save updated metadata
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    return {"status": "success", "message": "Metadata updated successfully", "user": entry.user}

@app.get("/api/recipes/{user}")
async def get_recipes(user: str):
    """Get all saved recipes for a specific user"""
    user_recipes_dir = f"../database/users/{user}/recipes"
    metadata_path = os.path.join(user_recipes_dir, "metadata.json")
    
    if not os.path.exists(metadata_path):
        return {"recipes": [], "user": user}
    
    try:
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        return {"recipes": metadata.get("recipes", []), "user": user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load recipes: {str(e)}")

@app.get("/api/recipe/{user}/{recipe_id}")
async def get_recipe(user: str, recipe_id: str):
    """Get a specific recipe by user and ID"""
    user_recipes_dir = f"../database/users/{user}/recipes"
    recipe_path = os.path.join(user_recipes_dir, f"{recipe_id}.json")
    
    if not os.path.exists(recipe_path):
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    try:
        with open(recipe_path, 'r', encoding='utf-8') as f:
            recipe = json.load(f)
        return recipe
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load recipe: {str(e)}")

@app.delete("/api/delete-recipe")
async def delete_recipe(request: RecipeDeleteRequest):
    """Delete a recipe for a specific user"""
    user_recipes_dir = f"../database/users/{request.user}/recipes"
    recipe_path = os.path.join(user_recipes_dir, request.filename)
    metadata_path = os.path.join(user_recipes_dir, "metadata.json")
    
    # Check if recipe file exists
    if not os.path.exists(recipe_path):
        raise HTTPException(status_code=404, detail="Recipe file not found")
    
    try:
        # Delete the recipe file
        os.remove(recipe_path)
        
        # Update metadata.json to remove the recipe entry
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            # Remove recipe from metadata
            metadata["recipes"] = [
                recipe for recipe in metadata["recipes"] 
                if recipe["id"] != request.recipeId
            ]
            
            # Save updated metadata
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        return {"status": "success", "message": "Recipe deleted successfully", "user": request.user}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete recipe: {str(e)}")

# ============================================================================
# USER MANAGEMENT & DAILY TRACKING ENDPOINTS
# ============================================================================

@app.get("/api/user/{user}/daily")
async def get_user_daily_data(user: str):
    """Get user's daily calorie and meal data"""
    try:
        daily_data = await redis_manager.get_user_daily_data(user)
        return daily_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily data: {str(e)}")

@app.get("/api/user/{user}/profile")
async def get_user_profile(user: str):
    """Get user's profile and preferences"""
    try:
        profile = await redis_manager.get_user_profile(user)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")

@app.post("/api/user/{user}/consume-calories")
async def consume_calories(user: str, request: Request):
    """Add consumed calories to user's daily tracking"""
    try:
        data = await request.json()
        calories = data.get('calories', 0)
        meal_info = data.get('meal_info', {})
        
        updated_data = await redis_manager.add_calories_consumed(user, calories, meal_info)
        return {"success": True, "daily_data": updated_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add calories: {str(e)}")

@app.get("/api/user/{user}/calories-remaining")
async def get_calories_remaining(user: str):
    """Get remaining calories for the day"""
    try:
        remaining = await redis_manager.get_calories_remaining(user)
        daily_data = await redis_manager.get_user_daily_data(user)
        return {
            "calories_remaining": remaining,
            "calories_consumed": daily_data['calories_consumed'],
            "calories_budget": daily_data['calories_budget']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get calorie data: {str(e)}")

@app.get("/app.js")
async def serve_app_js():
    """Serve the JavaScript file"""
    return FileResponse("app.js")

@app.get("/styles.css")
async def serve_styles():
    """Serve the CSS file"""
    return FileResponse("styles.css")

@app.get("/favicon.ico")
async def serve_favicon():
    """Serve a placeholder favicon to avoid 404 errors"""
    return Response(content="", media_type="image/x-icon")

@app.post("/api/analyze-nutrition")
async def analyze_nutrition(request: Request):
    """Analyze nutrition for recipe ingredients using GPT-4"""
    try:
        data = await request.json()
        ingredients = data.get('ingredients', [])
        
        if not ingredients:
            raise HTTPException(status_code=400, detail="No ingredients provided")
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Format ingredients for GPT analysis
        ingredients_text = "\n".join([
            f"- {ing['amount']}{ing['unit']} {ing['name']}" 
            for ing in ingredients
        ])
        
        # Create GPT prompt for nutrition analysis
        prompt = f"""Analyze the nutritional content of this recipe with the following ingredients:

{ingredients_text}

Please provide a detailed nutritional analysis in JSON format with the following structure:
{{
    "total_nutrition": {{
        "calories": <total calories>,
        "protein_g": <total protein in grams>,
        "carbohydrates_g": <total carbs in grams>,
        "fat_g": <total fat in grams>,
        "fiber_g": <total fiber in grams>,
        "sugar_g": <total sugar in grams>,
        "sodium_mg": <total sodium in milligrams>
    }},
    "estimated_servings": <estimated number of servings>,
    "per_serving": {{
        "calories": <calories per serving>,
        "protein_g": <protein per serving>,
        "carbohydrates_g": <carbs per serving>,
        "fat_g": <fat per serving>
    }},
    "daily_values_per_serving": {{
        "protein_percent": <% daily value for protein>,
        "carbs_percent": <% daily value for carbs>,
        "fat_percent": <% daily value for fat>,
        "fiber_percent": <% daily value for fiber>
    }},
    "health_notes": [
        "<brief health insight 1>",
        "<brief health insight 2>"
    ]
}}

Base your analysis on standard nutritional databases. Be accurate and realistic with portions and servings."""

        # Make request to OpenAI API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional nutritionist. Provide accurate nutritional analysis in the exact JSON format requested. Only respond with valid JSON."
                        },
                        {
                            "role": "user", 
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
                }
            )
            
            if response.status_code != 200:
                print(f"OpenAI API error: {response.status_code} - {response.text}")
                return await fallback_nutrition_estimation(ingredients)
            
            gpt_response = response.json()
            nutrition_json = gpt_response['choices'][0]['message']['content']
            
            try:
                # Parse GPT response as JSON
                nutrition_data = json.loads(nutrition_json)
                nutrition_data['analysis_method'] = 'gpt4_analysis'
                return nutrition_data
                
            except json.JSONDecodeError:
                print(f"Failed to parse GPT nutrition response: {nutrition_json}")
                return await fallback_nutrition_estimation(ingredients)
        
    except Exception as e:
        print(f"❌ Error analyzing nutrition with GPT: {e}")
        return await fallback_nutrition_estimation(ingredients)

async def fallback_nutrition_estimation(ingredients: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Simple fallback nutrition estimation when GPT fails"""
    total_calories = 0
    
    for ingredient in ingredients:
        name = ingredient['name'].lower()
        amount = ingredient['amount']
        unit = ingredient['unit'].lower()
        
        # Convert to grams if needed
        if unit in ['kg', 'kilogram']:
            amount *= 1000
        elif unit in ['ml', 'milliliter']:
            amount *= 1  # Assume 1ml = 1g for liquids
        elif unit in ['l', 'liter']:
            amount *= 1000
        elif unit in ['cup', 'cups']:
            amount *= 240  # Approximate grams per cup
        elif unit in ['tbsp', 'tablespoon']:
            amount *= 15
        elif unit in ['tsp', 'teaspoon']:
            amount *= 5
        elif unit in ['piece', 'pieces', 'item', 'items']:
            # Estimate based on ingredient type
            if 'egg' in name:
                amount *= 50  # Average egg weight
            elif 'onion' in name:
                amount *= 150
            else:
                amount *= 100  # Default piece weight
        
        # Basic calorie estimation per 100g
        if any(word in name for word in ['flour', 'bread', 'pasta', 'rice']):
            total_calories += (amount / 100) * 350
        elif any(word in name for word in ['butter', 'oil', 'fat']):
            total_calories += (amount / 100) * 750
        elif 'sugar' in name:
            total_calories += (amount / 100) * 400
        elif 'egg' in name:
            total_calories += (amount / 100) * 150
        elif any(word in name for word in ['milk', 'cream']):
            total_calories += (amount / 100) * 60
        elif any(word in name for word in ['meat', 'chicken', 'beef', 'pork']):
            total_calories += (amount / 100) * 200
        else:
            total_calories += (amount / 100) * 50  # Default for vegetables/misc
    
    estimated_servings = max(1, len(ingredients) // 3)
    calories_per_serving = total_calories / estimated_servings
    
    return {
        'total_nutrition': {
            'calories': round(total_calories),
            'protein_g': round(total_calories * 0.15 / 4),
            'carbohydrates_g': round(total_calories * 0.5 / 4),
            'fat_g': round(total_calories * 0.35 / 9),
            'fiber_g': max(5, len(ingredients) * 2),
            'sugar_g': round(total_calories * 0.1 / 4),
            'sodium_mg': 500
        },
        'estimated_servings': estimated_servings,
        'per_serving': {
            'calories': round(calories_per_serving),
            'protein_g': round(calories_per_serving * 0.15 / 4),
            'carbohydrates_g': round(calories_per_serving * 0.5 / 4),
            'fat_g': round(calories_per_serving * 0.35 / 9)
        },
        'daily_values_per_serving': {
            'protein_percent': min(100, round((calories_per_serving * 0.15 / 4) / 50 * 100)),
            'carbs_percent': min(100, round((calories_per_serving * 0.5 / 4) / 300 * 100)),
            'fat_percent': min(100, round((calories_per_serving * 0.35 / 9) / 65 * 100)),
            'fiber_percent': min(100, round((len(ingredients) * 2) / 25 * 100))
        },
        'health_notes': [
            "Nutritional values are estimated",
            "Consult a nutritionist for precise dietary planning"
        ],
        'analysis_method': 'fallback_estimation'
    }

@app.post("/restart")
async def restart_server():
    """Restart the FastAPI server process"""
    try:
        print("🔄 Server restart requested")
        
        # Use os.execv to restart the current process
        python = sys.executable
        os.execv(python, [python] + sys.argv)
        
        return {"status": "restarting"}
        
    except Exception as e:
        print(f"❌ Failed to restart server: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
