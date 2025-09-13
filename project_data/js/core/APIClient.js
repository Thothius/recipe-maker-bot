// ============================================================================
// API CLIENT - Server Communication & Data Management
// ============================================================================
// Handles all server communication:
// - Recipe CRUD operations
// - User management
// - Nutrition analysis requests
// - Session management
// - Error handling and retry logic
// ============================================================================

class APIClient {
    constructor() {
        console.log('🌐 APIClient initializing...');
        
        // Configuration
        this.baseURL = '';
        this.timeout = 10000;
        this.maxRetries = 3;
        
        // Request state
        this.activeRequests = new Map();
        this.requestQueue = [];
        
        // Event callbacks
        this.onError = null;
        this.onNetworkError = null;
        
        // Caching
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        console.log('✅ APIClient initialized');
    }
    
    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================
    
    async getSession() {
        try {
            console.log('📡 Fetching session token...');
            
            const response = await this.makeRequest('/session', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log('✅ Session token received');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to get session:', error);
            throw error;
        }
    }
    
    async createRTCSession() {
        try {
            console.log('📡 Creating RTC session...');
            
            const response = await this.makeRequest('/rtc-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log('✅ RTC session created');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to create RTC session:', error);
            throw error;
        }
    }
    
    // ========================================================================
    // RECIPE OPERATIONS
    // ========================================================================
    
    async saveRecipe(filename, data, user) {
        try {
            console.log('💾 Saving recipe:', filename);
            
            if (!user) {
                throw new Error('User parameter is required for saving recipes');
            }
            
            const response = await this.makeRequestWithRetry('/api/save-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, data, user })
            });
            
            // Invalidate recipes cache after successful save
            this.invalidateRecipesCache(user);
            
            console.log('✅ Recipe saved successfully');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to save recipe:', error);
            throw error;
        }
    }
    
    async updateMetadata(metadataEntry) {
        try {
            console.log('📝 Updating metadata for recipe:', metadataEntry.id);
            
            const response = await this.makeRequest('/api/update-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadataEntry)
            });
            
            console.log('✅ Metadata updated successfully');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to update metadata:', error);
            throw error;
        }
    }
    
    async getRecipes(username) {
        try {
            if (!username) {
                throw new Error('Username parameter is required for loading recipes');
            }
            
            console.log('📚 Loading recipes for user:', username);
            
            // Check cache first
            const cacheKey = this.getCacheKey(`/api/recipes/${username}`, { method: 'GET' });
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
            
            const response = await this.makeRequestWithRetry(`/api/recipes/${username}`, {
                method: 'GET'
            });
            
            const recipes = response.recipes || [];
            
            // Cache the result
            this.setCache(cacheKey, recipes);
            
            console.log('✅ Recipes loaded successfully:', recipes.length);
            return recipes;
            
        } catch (error) {
            console.error('❌ Failed to load recipes:', error);
            if (error.message.includes('404')) {
                console.log('📁 No recipes found for user:', username);
                return [];
            }
            return [];
        }
    }
    
    async getRecipe(user, recipeId) {
        try {
            console.log('📖 Loading recipe:', recipeId);
            
            const response = await this.makeRequest(`/api/recipe/${user}/${recipeId}`, {
                method: 'GET'
            });
            
            console.log('✅ Recipe loaded successfully');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to load recipe:', error);
            throw error;
        }
    }
    
    async deleteRecipe(user, recipeId) {
        try {
            console.log('🗑️ Deleting recipe:', recipeId);
            
            const response = await this.makeRequest(`/api/recipe/${user}/${recipeId}`, {
                method: 'DELETE'
            });
            
            console.log('✅ Recipe deleted successfully');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to delete recipe:', error);
            throw error;
        }
    }
    
    // ========================================================================
    // NUTRITION ANALYSIS
    // ========================================================================
    
    async analyzeNutrition(ingredients) {
        try {
            console.log('🔬 Analyzing nutrition for', ingredients.length, 'ingredients');
            
            const response = await this.makeRequest('/api/analyze-nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });
            
            console.log('✅ Nutrition analysis completed');
            return response;
            
        } catch (error) {
            console.error('❌ Nutrition analysis failed:', error);
            // Return fallback nutrition data
            return this.getFallbackNutrition(ingredients);
        }
    }
    
    getFallbackNutrition(ingredients) {
        console.log('🔄 Using fallback nutrition estimation');
        
        const totalCalories = ingredients.reduce((sum, ing) => {
            // Simple calorie estimation
            let caloriesPer100g = 50; // Default
            
            const name = ing.name.toLowerCase();
            if (name.includes('flour') || name.includes('bread') || name.includes('pasta')) {
                caloriesPer100g = 350;
            } else if (name.includes('butter') || name.includes('oil')) {
                caloriesPer100g = 750;
            } else if (name.includes('sugar')) {
                caloriesPer100g = 400;
            } else if (name.includes('meat') || name.includes('chicken')) {
                caloriesPer100g = 200;
            }
            
            // Convert amount to grams (rough estimation)
            let amountInGrams = ing.amount;
            if (ing.unit === 'kg') amountInGrams *= 1000;
            else if (ing.unit === 'cup') amountInGrams *= 240;
            else if (ing.unit === 'tbsp') amountInGrams *= 15;
            else if (ing.unit === 'tsp') amountInGrams *= 5;
            
            return sum + (amountInGrams / 100) * caloriesPer100g;
        }, 0);
        
        const estimatedServings = Math.max(1, Math.floor(ingredients.length / 3));
        
        return {
            total_nutrition: {
                calories: Math.round(totalCalories),
                protein_g: Math.round(totalCalories * 0.15 / 4),
                carbohydrates_g: Math.round(totalCalories * 0.5 / 4),
                fat_g: Math.round(totalCalories * 0.35 / 9),
                fiber_g: Math.max(5, ingredients.length * 2),
                sugar_g: Math.round(totalCalories * 0.1 / 4),
                sodium_mg: 500
            },
            estimated_servings: estimatedServings,
            per_serving: {
                calories: Math.round(totalCalories / estimatedServings),
                protein_g: Math.round((totalCalories * 0.15 / 4) / estimatedServings),
                carbohydrates_g: Math.round((totalCalories * 0.5 / 4) / estimatedServings),
                fat_g: Math.round((totalCalories * 0.35 / 9) / estimatedServings)
            },
            analysis_method: 'fallback_estimation',
            health_notes: [
                'Nutritional values are estimated',
                'Consult a nutritionist for precise dietary planning'
            ]
        };
    }
    
    // ========================================================================
    // USER MANAGEMENT
    // ========================================================================
    
    async getUserDailyData(user) {
        try {
            console.log('📊 Loading daily data for user:', user);
            
            const response = await this.makeRequest(`/api/user/${user}/daily`, {
                method: 'GET'
            });
            
            console.log('✅ Daily data loaded');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to load daily data:', error);
            return null;
        }
    }
    
    async getUserProfile(user) {
        try {
            console.log('👤 Loading profile for user:', user);
            
            const response = await this.makeRequest(`/api/user/${user}/profile`, {
                method: 'GET'
            });
            
            console.log('✅ Profile loaded');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to load profile:', error);
            return null;
        }
    }
    
    async consumeCalories(user, calories, mealInfo = {}) {
        try {
            console.log('🍽️ Adding consumed calories:', calories);
            
            const response = await this.makeRequest(`/api/user/${user}/consume-calories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calories, meal_info: mealInfo })
            });
            
            console.log('✅ Calories added successfully');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to add calories:', error);
            throw error;
        }
    }
    
    async getCaloriesRemaining(user) {
        try {
            console.log('📊 Getting remaining calories for user:', user);
            
            const response = await this.makeRequest(`/api/user/${user}/calories-remaining`, {
                method: 'GET'
            });
            
            console.log('✅ Calorie data loaded');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to get calorie data:', error);
            return null;
        }
    }
    
    // ========================================================================
    // SERVER MANAGEMENT
    // ========================================================================
    
    async restartServer() {
        try {
            console.log('🔄 Requesting server restart...');
            
            const response = await this.makeRequest('/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log('✅ Server restart requested');
            return response;
            
        } catch (error) {
            console.error('❌ Failed to restart server:', error);
            throw error;
        }
    }
    
    // ========================================================================
    // CORE HTTP METHODS
    // ========================================================================
    
    async makeRequest(url, options = {}) {
        const requestId = this.generateRequestId();
        const fullUrl = this.baseURL + url;
        
        try {
            // Set timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            // Store request with controller for cancellation
            this.activeRequests.set(requestId, { 
                url: fullUrl, 
                options, 
                controller,
                timeoutId
            });
            
            const response = await fetch(fullUrl, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            this.activeRequests.delete(requestId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Handle different content types
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
            
        } catch (error) {
            const request = this.activeRequests.get(requestId);
            if (request) {
                clearTimeout(request.timeoutId);
                this.activeRequests.delete(requestId);
            }
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout: ${url}`);
            }
            
            // Handle network errors
            if (!navigator.onLine) {
                if (this.onNetworkError) {
                    this.onNetworkError(error);
                }
                throw new Error('Network unavailable');
            }
            
            throw error;
        }
    }
    
    async makeRequestWithRetry(url, options = {}, attempt = 0) {
        try {
            return await this.makeRequest(url, options);
        } catch (error) {
            if (attempt < this.maxRetries && this.shouldRetry(error)) {
                const delay = this.calculateRetryDelay(attempt);
                console.log(`🔄 Retrying request (${attempt + 1}/${this.maxRetries}) after ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequestWithRetry(url, options, attempt + 1);
            }
            
            throw error;
        }
    }
    
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    
    shouldRetry(error) {
        // Retry on network errors, timeouts, and 5xx server errors
        return (
            error.message.includes('timeout') ||
            error.message.includes('Network') ||
            error.message.includes('500') ||
            error.message.includes('502') ||
            error.message.includes('503') ||
            error.message.includes('504')
        );
    }
    
    calculateRetryDelay(attempt) {
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        return Math.min(baseDelay + jitter, 10000); // Max 10 seconds
    }
    
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // ========================================================================
    // REQUEST MANAGEMENT
    // ========================================================================
    
    cancelAllRequests() {
        console.log('🛑 Cancelling all active requests');
        
        // Cancel all active requests properly
        for (const [requestId, request] of this.activeRequests) {
            if (request.controller) {
                request.controller.abort();
            }
            if (request.timeoutId) {
                clearTimeout(request.timeoutId);
            }
        }
        
        this.activeRequests.clear();
    }
    
    getActiveRequestCount() {
        return this.activeRequests.size;
    }
    
    // ========================================================================
    // BATCH OPERATIONS
    // ========================================================================
    
    async batchRequest(requests) {
        console.log('📦 Executing batch request with', requests.length, 'operations');
        
        try {
            const promises = requests.map(req => 
                this.makeRequest(req.url, req.options)
                    .then(result => ({ success: true, result, request: req }))
                    .catch(error => ({ success: false, error, request: req }))
            );
            
            const results = await Promise.all(promises);
            
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            console.log(`✅ Batch completed: ${successful.length} successful, ${failed.length} failed`);
            
            return {
                successful: successful.map(r => r.result),
                failed: failed.map(r => ({ error: r.error, request: r.request })),
                total: results.length
            };
            
        } catch (error) {
            console.error('❌ Batch request failed:', error);
            throw error;
        }
    }
    
    // ========================================================================
    // CACHING (Simple Implementation)
    // ========================================================================
    
    getCacheKey(url, options) {
        return `${url}_${JSON.stringify(options)}`;
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('📋 Cache hit:', key);
            return cached.data;
        }
        return null;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }
    
    invalidateRecipesCache(user) {
        // Remove recipes cache for specific user
        const cacheKey = this.getCacheKey(`/api/recipes/${user}`, { method: 'GET' });
        this.cache.delete(cacheKey);
        console.log('🗑️ Invalidated recipes cache for user:', user);
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    setEventHandlers(handlers) {
        this.onError = handlers.onError;
        this.onNetworkError = handlers.onNetworkError;
    }
    
    setConfiguration(config) {
        if (config.baseURL) this.baseURL = config.baseURL;
        if (config.timeout) this.timeout = config.timeout;
        if (config.maxRetries) this.maxRetries = config.maxRetries;
    }
    
    getStatus() {
        return {
            activeRequests: this.activeRequests.size,
            cacheSize: this.cache.size,
            isOnline: navigator.onLine
        };
    }
}

// Export for use in main app
window.APIClient = APIClient;
