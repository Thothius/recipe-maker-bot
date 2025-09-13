// ============================================================================
// RECIPE MANAGER - Recipe State & Operations
// ============================================================================
// Handles all recipe-related functionality:
// - Recipe state management (5-state workflow)
// - Ingredient tracking and parsing
// - Recipe CRUD operations
// - Function call handling from OpenAI
// - Nutrition analysis integration
// ============================================================================

class RecipeManager {
    constructor() {
        console.log('📝 RecipeManager initializing...');
        
        // Recipe state management - simplified to always be listening
        this.recipeState = 'listening_for_ingredients'; // Always ready to accept ingredients
        this.currentRecipe = {
            name: '',
            ingredients: []
        };
        
        // Event callbacks
        this.onStateChange = null;
        this.onIngredientAdded = null;
        this.onRecipeCompleted = null;
        this.onRecipeSaved = null;
        this.onError = null;
        
        // Function call accumulation for streaming
        this.pendingFunctionCall = null;
        this.accumulatedArgs = '';
        
        console.log('✅ RecipeManager initialized - always ready for ingredients');
    }
    
    // ========================================================================
    // RECIPE WORKFLOW MANAGEMENT
    // ========================================================================
    
    startRecipe(recipeName) {
        if (!recipeName || typeof recipeName !== 'string' || recipeName.trim().length === 0) {
            console.error('❌ Invalid recipe name provided:', recipeName);
            throw new Error('Recipe name is required and must be a non-empty string');
        }
        
        const sanitizedName = recipeName.trim().slice(0, 100); // Limit length
        console.log('🎬 Starting new recipe:', sanitizedName);
        
        try {
            this.resetRecipe();
            this.currentRecipe.name = sanitizedName;
            this.currentRecipe.id = this.generateRecipeId();
            this.currentRecipe.created = new Date().toISOString();
            this.currentRecipe.metadata.session_id = this.generateSessionId();
            this.recipeStartTime = Date.now();
            this.recipeState = 'listening_for_ingredients';
            console.log('✅ Recipe state set to:', this.recipeState);
            
            this.notifyStateChange();
            
            console.log('✅ Recipe started successfully:', this.currentRecipe.id);
            return this.currentRecipe.id;
        } catch (error) {
            console.error('❌ Failed to start recipe:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }
    
    beginIngredientCollection() {
        console.log('📝 Beginning ingredient collection');
        this.recipeState = 'listening_for_ingredients';
        this.notifyStateChange();
    }
    
    finishRecipe() {
        console.log('✅ Finishing recipe');
        
        if (this.recipeStartTime) {
            this.currentRecipe.metadata.duration_seconds = Math.floor((Date.now() - this.recipeStartTime) / 1000);
        }
        
        this.recipeState = 'finished_recipe';
        this.notifyStateChange();
        
        if (this.onRecipeCompleted) {
            this.onRecipeCompleted(this.currentRecipe);
        }
        
        return this.currentRecipe;
    }
    
    resetRecipe() {
        console.log('🔄 Resetting recipe state from:', this.recipeState);
        
        this.currentRecipe = {
            id: null,
            name: '',
            created: null,
            source: 'voice_assistant',
            metadata: {
                duration_seconds: 0,
                language: 'en',
                session_id: null
            },
            ingredients: [],
            instructions: [],
            nutrition: {
                estimated_calories: null,
                servings: null
            },
            tags: ['voice_created'],
            status: 'draft'
        };
        
        this.recipeState = 'idle';
        this.recipeStartTime = null;
        console.log('✅ Recipe state reset to:', this.recipeState);
        this.notifyStateChange();
    }
    
    // ========================================================================
    // INGREDIENT MANAGEMENT
    // ========================================================================
    
    addIngredient(name, amount, unit) {
        console.log('🥕 Adding ingredient:', { name, amount, unit });
        
        // Comprehensive validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            console.warn('⚠️ Invalid ingredient name:', name);
            return false;
        }
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            console.warn('⚠️ Invalid ingredient amount:', amount);
            return false;
        }
        
        const sanitizedName = name.trim().slice(0, 50); // Limit name length
        const parsedAmount = parseFloat(amount);
        const sanitizedUnit = (unit && typeof unit === 'string') ? unit.trim().slice(0, 20) : 'pieces';
        
        // Check for duplicate ingredients
        const existingIndex = this.currentRecipe.ingredients.findIndex(
            ing => ing.name.toLowerCase() === sanitizedName.toLowerCase()
        );
        
        const ingredient = {
            name: sanitizedName,
            amount: Math.round(parsedAmount * 100) / 100, // Round to 2 decimal places
            unit: sanitizedUnit,
            added_at: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            // Update existing ingredient
            console.log('🔄 Updating existing ingredient:', sanitizedName);
            this.currentRecipe.ingredients[existingIndex] = {
                ...this.currentRecipe.ingredients[existingIndex],
                amount: ingredient.amount,
                unit: ingredient.unit,
                updated_at: ingredient.added_at
            };
        } else {
            // Add new ingredient
            this.currentRecipe.ingredients.push(ingredient);
        }
        
        try {
            if (this.onIngredientAdded) {
                this.onIngredientAdded(ingredient);
            }
        } catch (callbackError) {
            console.warn('⚠️ Error in ingredient added callback:', callbackError);
        }
        
        console.log('✅ Ingredient processed:', ingredient);
        return true;
    }
    
    removeIngredient(name) {
        const index = this.currentRecipe.ingredients.findIndex(
            ing => ing.name.toLowerCase() === name.toLowerCase().trim()
        );
        
        if (index >= 0) {
            const removed = this.currentRecipe.ingredients.splice(index, 1)[0];
            console.log('🗑️ Removed ingredient:', removed.name);
            return removed;
        }
        
        return null;
    }
    
    updateIngredient(name, newAmount, newUnit) {
        const ingredient = this.currentRecipe.ingredients.find(
            ing => ing.name.toLowerCase() === name.toLowerCase().trim()
        );
        
        if (ingredient) {
            if (newAmount && !isNaN(parseFloat(newAmount))) {
                ingredient.amount = parseFloat(newAmount);
            }
            if (newUnit && typeof newUnit === 'string') {
                ingredient.unit = newUnit.toLowerCase().trim();
            }
            ingredient.updated_at = new Date().toISOString();
            console.log('✏️ Updated ingredient:', ingredient);
            return ingredient;
        }
        
        return null;
    }
    
    // ========================================================================
    // FUNCTION CALL HANDLING (OpenAI Integration)
    // ========================================================================
    
    handleFunctionCall(event) {
        console.log('🎯 Handling function call:', event);
        
        if (!event || typeof event !== 'object') {
            console.error('❌ Invalid function call event:', event);
            return { success: false, message: 'Invalid function call event' };
        }
        
        let functionName, args = {};
        
        try {
            // Handle different OpenAI function call formats with robust parsing
            if (event.type === 'function_call' && event.name) {
                functionName = event.name;
                args = event.arguments ? (typeof event.arguments === 'string' ? JSON.parse(event.arguments || '{}') : event.arguments) : {};
            } else if (event.call?.name) {
                functionName = event.call.name;
                args = event.call.arguments ? (typeof event.call.arguments === 'string' ? JSON.parse(event.call.arguments || '{}') : event.call.arguments) : {};
            } else if (event.name) {
                functionName = event.name;
                args = event.arguments ? (typeof event.arguments === 'string' ? JSON.parse(event.arguments || '{}') : event.arguments) : {};
            } else {
                console.error('❌ Unknown function call format:', event);
                return { success: false, message: 'Unknown function call format' };
            }
        } catch (parseError) {
            console.error('❌ Error parsing function call arguments:', parseError);
            return { success: false, message: 'Failed to parse function arguments' };
        }
        
        if (!functionName || typeof functionName !== 'string') {
            console.error('❌ Invalid function name:', functionName);
            return { success: false, message: 'Invalid function name' };
        }
        
        console.log(`🎯 Executing function: ${functionName}`, args);
        
        try {
            switch (functionName) {
                case 'startRecipeListening':
                    console.log('🔍 Current recipe state for startRecipeListening:', this.recipeState);
                    
                    // Allow transition from both waiting_to_start and listening_for_ingredients
                    if (this.recipeState === 'waiting_to_start') {
                        this.beginIngredientCollection();
                        return { success: true, message: 'Started ingredient collection' };
                    } else if (this.recipeState === 'listening_for_ingredients') {
                        console.log('⚠️ Already listening for ingredients, continuing...');
                        return { success: true, message: 'Already collecting ingredients' };
                    } else {
                        console.error('❌ Recipe state mismatch. Expected: waiting_to_start or listening_for_ingredients, Actual:', this.recipeState);
                        return { success: false, message: `Recipe not in correct state for ingredient collection. Current state: ${this.recipeState}` };
                    }
                    
                case 'addIngredient':
                    if (this.recipeState !== 'listening_for_ingredients') {
                        return { success: false, message: 'Not currently collecting ingredients' };
                    }
                    
                    console.log('🔍 Debug addIngredient args:', JSON.stringify(args, null, 2));
                    
                    if (!args.name || args.name.trim() === '') {
                        console.error('❌ Missing or empty ingredient name:', args);
                        return { success: false, message: 'Ingredient name is required' };
                    }
                    
                    const success = this.addIngredient(args.name, args.amount, args.unit);
                    return { 
                        success, 
                        message: success ? `Added ${args.name}` : 'Failed to add ingredient',
                        ingredient: success ? { name: args.name, amount: args.amount, unit: args.unit } : null
                    };
                    
                case 'editIngredient':
                case 'changeIngredient':
                    if (this.recipeState !== 'listening_for_ingredients') {
                        return { success: false, message: 'Not currently collecting ingredients' };
                    }
                    
                    if (!args.name || args.name.trim() === '') {
                        return { success: false, message: 'Ingredient name is required for editing' };
                    }
                    
                    const updatedIngredient = this.updateIngredient(args.name, args.amount, args.unit);
                    if (updatedIngredient) {
                        return { 
                            success: true, 
                            message: `Updated ${args.name} to ${args.amount} ${args.unit || 'pieces'}`,
                            ingredient: updatedIngredient
                        };
                    } else {
                        return { success: false, message: `Ingredient '${args.name}' not found` };
                    }
                    
                case 'removeIngredient':
                case 'deleteIngredient':
                    if (this.recipeState !== 'listening_for_ingredients') {
                        return { success: false, message: 'Not currently collecting ingredients' };
                    }
                    
                    if (!args.name || args.name.trim() === '') {
                        return { success: false, message: 'Ingredient name is required for removal' };
                    }
                    
                    const removedIngredient = this.removeIngredient(args.name);
                    if (removedIngredient) {
                        return { 
                            success: true, 
                            message: `Removed ${removedIngredient.name}`,
                            ingredient: removedIngredient
                        };
                    } else {
                        return { success: false, message: `Ingredient '${args.name}' not found` };
                    }
                    
                case 'closeRecipe':
                    console.log('🚪 Closing recipe and returning to main menu');
                    return { 
                        success: true, 
                        message: 'Recipe closed',
                        closeRecipe: true
                    };
                    
                case 'saveRecipe':
                    // Allow saving if we have at least one ingredient, regardless of state
                    if (this.currentRecipe.ingredients.length === 0) {
                        return { success: false, message: 'Cannot save recipe without ingredients' };
                    }
                    
                    console.log('💾 Saving recipe with ingredients:', this.currentRecipe.ingredients.length);
                    
                    // Get current user from UserManager for voice-triggered saves
                    const currentUser = window.app?.userManager?.getCurrentUser();
                    if (!currentUser) {
                        return { success: false, message: 'No user selected for saving recipe' };
                    }
                    
                    // Return promise for async operation
                    return this.saveRecipe(args.recipeName || this.currentRecipe.name, currentUser);
                    
                case 'closeRecipe':
                    console.log('🚪 Closing recipe and returning to main menu');
                    return { 
                        success: true, 
                        message: 'Recipe closed',
                        closeRecipe: true
                    };
                    
                case 'updateRecipeTitle':
                    if (!args.title || typeof args.title !== 'string') {
                        return { success: false, message: 'Valid recipe title is required' };
                    }
                    
                    this.currentRecipe.name = args.title.trim().slice(0, 100);
                    return { success: true, message: `Recipe title updated to: ${this.currentRecipe.name}` };
                    
                default:
                    console.warn('⚠️ Unknown function:', functionName);
                    return { success: false, message: `Unknown function: ${functionName}` };
            }
        } catch (executionError) {
            console.error('❌ Error executing function:', executionError);
            return { success: false, message: `Function execution failed: ${executionError.message}` };
        }
    }
    
    // ========================================================================
    // RECIPE PERSISTENCE
    // ========================================================================
    
    async saveRecipe(recipeName = null, user) {
        try {
            if (!user) {
                throw new Error('User parameter is required for saving recipes');
            }
            
            console.log('💾 Saving recipe:', recipeName || this.currentRecipe.name, 'for user:', user);
            
            if (recipeName) {
                this.currentRecipe.name = recipeName;
            }
            
            if (!this.currentRecipe.name) {
                throw new Error('Recipe name is required');
            }
            
            if (this.currentRecipe.ingredients.length === 0) {
                throw new Error('Recipe must have at least one ingredient');
            }
            
            // Finalize recipe data
            this.currentRecipe.status = 'completed';
            if (this.recipeStartTime) {
                this.currentRecipe.metadata.duration_seconds = Math.floor((Date.now() - this.recipeStartTime) / 1000);
            }
            
            // Generate filename with better timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
            const filename = `recipe_${timestamp}.json`;
            
            // Validate recipe data before saving
            const recipeData = {
                ...this.currentRecipe,
                saved_at: new Date().toISOString()
            };
            
            console.log('📝 Recipe data to save:', {
                name: recipeData.name,
                ingredients: recipeData.ingredients.length,
                filename
            });
            
            // Save to backend with retry logic
            let attempts = 0;
            const maxAttempts = 3;
            let response;
            
            while (attempts < maxAttempts) {
                try {
                    response = await fetch('/api/save-recipe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            filename,
                            data: JSON.stringify(recipeData, null, 2),
                            user
                        })
                    });
                    
                    if (response.ok) break;
                    
                } catch (fetchError) {
                    console.warn(`⚠️ Save attempt ${attempts + 1} failed:`, fetchError.message);
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }
            
            if (!response || !response.ok) {
                const errorText = response ? await response.text() : 'Network error';
                throw new Error(`Save failed after ${maxAttempts} attempts: ${response?.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('✅ Recipe saved successfully:', result);
            
            // Update metadata registry with error handling
            try {
                await this.updateMetadata(user, filename);
            } catch (metadataError) {
                console.warn('⚠️ Metadata update failed:', metadataError.message);
                // Don't fail the save if metadata update fails
            }
            
            this.recipeState = 'saved_recipe';
            this.notifyStateChange();
            
            return { 
                success: true, 
                message: 'Recipe saved successfully', 
                filename,
                path: result.path || `users/${user}/recipes/${filename}`
            };
            
        } catch (error) {
            console.error('❌ Failed to save recipe:', error);
            if (this.onError) {
                this.onError(error);
            }
            return { success: false, message: error.message };
        }
    }
    
    async loadUserRecipes(user) {
        if (!user || typeof user !== 'string' || user.trim().length === 0) {
            console.error('❌ Invalid user parameter:', user);
            return [];
        }
        
        const sanitizedUser = user.trim().toLowerCase();
        
        try {
            console.log('📚 Loading recipes for user:', sanitizedUser);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`/api/recipes/${encodeURIComponent(sanitizedUser)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('📝 No recipes found for user:', sanitizedUser);
                    return [];
                }
                throw new Error(`Failed to load recipes: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const recipes = Array.isArray(data) ? data : (data.recipes || []);
            
            // Validate recipe structure
            const validRecipes = recipes.filter(recipe => {
                if (!recipe || typeof recipe !== 'object') return false;
                if (!recipe.name || !recipe.id) return false;
                return true;
            });
            
            console.log('✅ Loaded user recipes:', validRecipes.length);
            return validRecipes;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Recipe loading timed out');
            } else {
                console.error('❌ Failed to load user recipes:', error);
            }
            return [];
        }
    }
    
    async loadRecipe(user, recipeId) {
        try {
            console.log('📚 Loading recipe:', recipeId);
            
            const response = await fetch(`/api/recipe/${user}/${recipeId}`);
            if (!response.ok) {
                throw new Error(`Failed to load recipe: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('❌ Failed to load recipe:', error);
            throw error;
        }
    }
    
    // ========================================================================
    // NUTRITION ANALYSIS
    // ========================================================================
    
    async analyzeNutrition() {
        if (this.currentRecipe.ingredients.length === 0) {
            console.warn('⚠️ No ingredients to analyze');
            return null;
        }
        
        try {
            console.log('🔬 Analyzing nutrition for', this.currentRecipe.ingredients.length, 'ingredients');
            
            const response = await fetch('/api/analyze-nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredients: this.currentRecipe.ingredients
                })
            });
            
            if (!response.ok) {
                throw new Error(`Nutrition analysis failed: ${response.status}`);
            }
            
            const nutritionData = await response.json();
            this.currentRecipe.nutrition = nutritionData;
            
            console.log('✅ Nutrition analysis completed:', nutritionData);
            return nutritionData;
            
        } catch (error) {
            console.error('❌ Nutrition analysis failed:', error);
            return null;
        }
    }
    
    // ========================================================================
    // INGREDIENT PARSING (Fallback)
    // ========================================================================
    
    parseIngredientFromResponse(text) {
        console.log('🔍 Parsing ingredient from text:', text);
        
        // Pattern matching for common ingredient formats
        const patterns = [
            /(\d+(?:\.\d+)?)\s*(grams?|g)\s+(?:of\s+)?(.+)/i,
            /(\d+(?:\.\d+)?)\s*(ml|milliliters?)\s+(?:of\s+)?(.+)/i,
            /(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?)\s+(?:of\s+)?(.+)/i,
            /(\d+(?:\.\d+)?)\s+(.+)/i // Generic number + ingredient
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amount = parseFloat(match[1]);
                const unit = match[2] || 'pieces';
                const name = (match[3] || match[2]).trim();
                
                console.log('✅ Parsed ingredient:', { name, amount, unit });
                this.addIngredient(name, amount, unit);
                return { name, amount, unit };
            }
        }
        
        console.log('⚠️ Could not parse ingredient from text');
        return null;
    }
    
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    
    generateRecipeId() {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substr(2, 9);
        const sessionPart = Math.random().toString(36).substr(2, 4);
        return `recipe_${timestamp}_${randomPart}_${sessionPart}`;
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    
    validateRecipeData(recipe) {
        if (!recipe || typeof recipe !== 'object') {
            return { valid: false, error: 'Recipe must be an object' };
        }
        
        if (!recipe.name || typeof recipe.name !== 'string' || recipe.name.trim().length === 0) {
            return { valid: false, error: 'Recipe name is required' };
        }
        
        if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
            return { valid: false, error: 'Recipe must have at least one ingredient' };
        }
        
        // Validate ingredients
        for (let i = 0; i < recipe.ingredients.length; i++) {
            const ing = recipe.ingredients[i];
            if (!ing.name || !ing.amount || isNaN(parseFloat(ing.amount))) {
                return { valid: false, error: `Invalid ingredient at index ${i}` };
            }
        }
        
        return { valid: true };
    }
    
    async updateMetadata(user, filename) {
        try {
            const metadataEntry = {
                id: this.currentRecipe.id,
                name: this.currentRecipe.name,
                filename: filename || `${this.currentRecipe.id}.json`,
                created: this.currentRecipe.created,
                ingredients: this.currentRecipe.ingredients,
                tags: this.currentRecipe.tags,
                user,
                ingredient_count: this.currentRecipe.ingredients.length,
                duration_seconds: this.currentRecipe.metadata.duration_seconds
            };
            
            const response = await fetch('/api/update-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadataEntry)
            });
            
            if (!response.ok) {
                throw new Error(`Metadata update failed: ${response.status}`);
            }
            
            console.log('✅ Metadata updated successfully');
            
        } catch (error) {
            console.error('❌ Failed to update metadata:', error);
            throw error;
        }
    }
    
    notifyStateChange() {
        if (this.onRecipeStateChange) {
            this.onRecipeStateChange(this.recipeState, this.currentRecipe);
        }
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getRecipeState() {
        return {
            state: this.recipeState,
            recipe: { ...this.currentRecipe },
            ingredientCount: this.currentRecipe.ingredients.length,
            duration: this.recipeStartTime ? Math.floor((Date.now() - this.recipeStartTime) / 1000) : 0
        };
    }
    
    getCurrentRecipe() {
        return { ...this.currentRecipe };
    }
    
    getIngredients() {
        return [...this.currentRecipe.ingredients];
    }
    
    setEventHandlers(handlers) {
        this.onRecipeStateChange = handlers.onRecipeStateChange;
        this.onIngredientAdded = handlers.onIngredientAdded;
        this.onRecipeCompleted = handlers.onRecipeCompleted;
        this.onError = handlers.onError;
    }
}

// Export for use in main app
window.RecipeManager = RecipeManager;
