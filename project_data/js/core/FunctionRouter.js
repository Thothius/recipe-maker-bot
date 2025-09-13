// ============================================================================
// FUNCTION ROUTER - Centralized Function Call Handling
// ============================================================================
// Routes and handles all OpenAI function calls in a centralized manner
// Provides clean separation between function routing logic and business logic
// ============================================================================

class FunctionRouter {
    constructor(recipeManager, uiController) {
        console.log('🎯 FunctionRouter initializing...');
        
        this.recipeManager = recipeManager;
        this.uiController = uiController;
        
        // Function handler registry
        this.handlers = new Map();
        this.registerHandlers();
        
        console.log('✅ FunctionRouter initialized with', this.handlers.size, 'handlers');
    }
    
    // ========================================================================
    // HANDLER REGISTRATION
    // ========================================================================
    
    registerHandlers() {
        // Recipe ingredient management
        this.handlers.set('addIngredient', this.handleAddIngredient.bind(this));
        this.handlers.set('editIngredient', this.handleEditIngredient.bind(this));
        this.handlers.set('changeIngredient', this.handleEditIngredient.bind(this)); // Alias
        this.handlers.set('removeIngredient', this.handleRemoveIngredient.bind(this));
        this.handlers.set('deleteIngredient', this.handleRemoveIngredient.bind(this)); // Alias
        
        // Recipe lifecycle management
        this.handlers.set('saveRecipe', this.handleSaveRecipe.bind(this));
        this.handlers.set('closeRecipe', this.handleCloseRecipe.bind(this));
        
        // Recipe metadata
        this.handlers.set('updateRecipeTitle', this.handleUpdateRecipeTitle.bind(this));
    }
    
    // ========================================================================
    // MAIN ROUTING FUNCTION
    // ========================================================================
    
    route(functionCall) {
        try {
            console.log('🎯 Routing function call:', functionCall.name);
            
            if (!functionCall || !functionCall.name) {
                return { success: false, message: 'Invalid function call format' };
            }
            
            const handler = this.handlers.get(functionCall.name);
            if (!handler) {
                console.warn('⚠️ Unknown function:', functionCall.name);
                return { success: false, message: `Unknown function: ${functionCall.name}` };
            }
            
            // Parse arguments safely
            let args = {};
            try {
                if (functionCall.arguments) {
                    args = typeof functionCall.arguments === 'string' 
                        ? JSON.parse(functionCall.arguments) 
                        : functionCall.arguments;
                }
            } catch (parseError) {
                console.error('❌ Error parsing function arguments:', parseError);
                return { success: false, message: 'Failed to parse function arguments' };
            }
            
            // Execute handler
            const result = handler(args);
            console.log('✅ Function call executed:', functionCall.name, result.success ? '✅' : '❌');
            
            return result;
            
        } catch (error) {
            console.error('❌ Function routing error:', error);
            return { success: false, message: `Function execution failed: ${error.message}` };
        }
    }
    
    // ========================================================================
    // INGREDIENT MANAGEMENT HANDLERS
    // ========================================================================
    
    handleAddIngredient(args) {
        if (!this.validateRecipeState('listening_for_ingredients')) {
            return { success: false, message: 'Not currently collecting ingredients' };
        }
        
        if (!args.name || args.name.trim() === '') {
            return { success: false, message: 'Ingredient name is required' };
        }
        
        const success = this.recipeManager.addIngredient(args.name, args.amount, args.unit);
        return { 
            success, 
            message: success ? `Added ${args.name}` : 'Failed to add ingredient',
            ingredient: success ? { name: args.name, amount: args.amount, unit: args.unit } : null,
            updateUI: true
        };
    }
    
    handleEditIngredient(args) {
        if (!this.validateRecipeState('listening_for_ingredients')) {
            return { success: false, message: 'Not currently collecting ingredients' };
        }
        
        if (!args.name || args.name.trim() === '') {
            return { success: false, message: 'Ingredient name is required for editing' };
        }
        
        const updatedIngredient = this.recipeManager.updateIngredient(args.name, args.amount, args.unit);
        if (updatedIngredient) {
            return { 
                success: true, 
                message: `Updated ${args.name} to ${args.amount} ${args.unit || 'pieces'}`,
                ingredient: updatedIngredient,
                updateUI: true
            };
        } else {
            return { success: false, message: `Ingredient '${args.name}' not found` };
        }
    }
    
    handleRemoveIngredient(args) {
        if (!this.validateRecipeState('listening_for_ingredients')) {
            return { success: false, message: 'Not currently collecting ingredients' };
        }
        
        if (!args.name || args.name.trim() === '') {
            return { success: false, message: 'Ingredient name is required for removal' };
        }
        
        const removedIngredient = this.recipeManager.removeIngredient(args.name);
        if (removedIngredient) {
            return { 
                success: true, 
                message: `Removed ${removedIngredient.name}`,
                ingredient: removedIngredient,
                updateUI: true
            };
        } else {
            return { success: false, message: `Ingredient '${args.name}' not found` };
        }
    }
    
    // ========================================================================
    // RECIPE LIFECYCLE HANDLERS
    // ========================================================================
    
    async handleSaveRecipe(args) {
        // Allow saving if we have at least one ingredient
        if (this.recipeManager.currentRecipe.ingredients.length === 0) {
            return { success: false, message: 'Cannot save recipe without ingredients' };
        }
        
        console.log('💾 Saving recipe with ingredients:', this.recipeManager.currentRecipe.ingredients.length);
        
        // Get current user from UserManager for voice-triggered saves
        const currentUser = window.app?.userManager?.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: 'No user selected for saving recipe' };
        }
        
        // Return promise for async operation
        return await this.recipeManager.saveRecipe(args.recipeName || this.recipeManager.currentRecipe.name, currentUser);
    }
    
    handleCloseRecipe(args) {
        console.log('🚪 Closing recipe and returning to main menu');
        return { 
            success: true, 
            message: 'Recipe closed',
            closeRecipe: true
        };
    }
    
    handleUpdateRecipeTitle(args) {
        if (!args.title || typeof args.title !== 'string') {
            return { success: false, message: 'Valid recipe title is required' };
        }
        
        this.recipeManager.currentRecipe.name = args.title.trim().slice(0, 100);
        return { 
            success: true, 
            message: `Recipe title updated to: ${this.recipeManager.currentRecipe.name}`,
            updateUI: true
        };
    }
    
    // ========================================================================
    // VALIDATION HELPERS
    // ========================================================================
    
    validateRecipeState(expectedState) {
        const currentState = this.recipeManager.recipeState;
        if (currentState !== expectedState) {
            console.warn('⚠️ Recipe state mismatch. Expected:', expectedState, 'Actual:', currentState);
            return false;
        }
        return true;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getRegisteredFunctions() {
        return Array.from(this.handlers.keys());
    }
    
    hasHandler(functionName) {
        return this.handlers.has(functionName);
    }
}

// Export for use in main app
window.FunctionRouter = FunctionRouter;
