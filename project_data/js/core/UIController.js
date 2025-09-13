// ============================================================================
// UI CONTROLLER - Orchestrates UI Sub-Modules
// ============================================================================
// Coordinates specialized UI modules:
// - ViewManager: View navigation and state management
// - AnimationManager: Typing effects and animations
// - ModalManager: Modal management
// - InteractionManager: User interaction handling
// - Visual feedback and status updates
// ============================================================================

class UIController {
    constructor() {
        console.log('🎨 UIController initializing...');
        
        // Initialize sub-modules
        this.viewManager = new ViewManager();
        this.animationManager = new AnimationManager();
        this.modalManager = new ModalManager();
        this.interactionManager = new InteractionManager(
            this.viewManager,
            this.modalManager,
            this.animationManager
        );
        
        // Event callbacks
        this.onViewChange = null;
        this.onUserSelect = null;
        this.onError = null;
        
        // Initialize DOM elements and setup
        this.initializeElements();
        this.setupSubModules();
        this.setupUserProfile();
        
        // Start initial animations
        this.startTaglineTypingEffect();
        
        console.log('✅ UIController initialized with sub-modules');
    }
    
    // ========================================================================
    // INITIALIZATION & SETUP
    // ========================================================================
    
    setupSubModules() {
        // Setup event handlers for sub-modules
        this.viewManager.setEventHandlers({
            onViewChange: (viewName, previousView) => {
                this.handleViewChange(viewName, previousView);
            }
        });
        
        this.interactionManager.setEventHandlers({
            onUserSelect: (username) => {
                if (this.onUserSelect) {
                    this.onUserSelect(username);
                }
            },
            onRecipeAction: (action, source) => {
                this.handleRecipeAction(action, source);
            },
            onError: (error) => {
                if (this.onError) {
                    this.onError(error);
                }
            }
        });
        
        this.modalManager.setModalEventHandlers({
            onModalShow: (modalName, data) => {
                console.log('🔲 Modal shown:', modalName);
            },
            onModalHide: (modalName) => {
                console.log('🔲 Modal hidden:', modalName);
            }
        });
    }
    
    setupUserProfile() {
        // Initialize user profile display
        this.updateUserProfileDisplay();
    }
    
    updateUserProfileDisplay() {
        const currentUserDisplay = document.getElementById('current-user-display');
        if (currentUserDisplay && window.app && window.app.userManager) {
            const currentUser = window.app.userManager.getCurrentUser();
            currentUserDisplay.textContent = currentUser;
            
            // Update radio button selection
            const radioButton = document.getElementById(`user-${currentUser}`);
            if (radioButton) {
                radioButton.checked = true;
            }
        }
    }
    
    initializeElements() {
        // Recipe elements
        this.recipeNameInput = document.getElementById('recipe-name-input');
        this.currentRecipeName = document.getElementById('current-recipe-name');
        this.recipeIngredients = document.getElementById('recipe-ingredients');
        this.startRecipeBtn = document.getElementById('start-recipe-btn');
        this.saveRecipeActionBtn = document.getElementById('save-recipe-action-btn');
        this.closeRecipeActionBtn = document.getElementById('close-recipe-action-btn');
        
        // Recipe grid
        this.recipesGrid = document.getElementById('recipes-grid');
        this.noRecipesMessage = document.getElementById('no-recipes-message');
        
        // Typing effect elements for initialization
        this.taglineText = document.getElementById('tagline-text');
        this.welcomeText = document.getElementById('welcome-text');
        
        console.log('📋 UIController DOM elements initialized');
    }
    
    handleViewChange(viewName, previousView) {
        // Handle view-specific logic
        switch (viewName) {
            case 'connected':
                this.startWelcomeTypingEffect();
                break;
                
            case 'myRecipes':
                this.loadRecipesView();
                break;
                
            case 'recipeMain':
                this.initializeRecipeView();
                break;
                
            case 'console':
                this.initializeConsoleView();
                break;
        }
        
        // Notify external listeners
        if (this.onViewChange) {
            this.onViewChange(viewName, previousView);
        }
    }
    
    handleRecipeAction(action, source) {
        // Delegate recipe actions to main app
        if (this.onViewChange) {
            this.onViewChange(action, source);
        }
    }
    
    // ========================================================================
    // VIEW MANAGEMENT (Delegated to ViewManager)
    // ========================================================================
    
    showView(viewName) {
        return this.viewManager.showView(viewName);
    }
    
    goBack() {
        return this.viewManager.goBack();
    }
    
    getCurrentView() {
        return this.viewManager.getCurrentView();
    }
    
    clearRecipeDisplay() {
        // Clear recipe ingredients display
        if (this.recipeIngredients) {
            this.recipeIngredients.innerHTML = '';
        }
        
        // Clear current recipe name display
        if (this.currentRecipeName) {
            this.currentRecipeName.textContent = '';
        }
        
        // Clear any recipe-related UI elements
        const recipeList = document.getElementById('recipe-list');
        if (recipeList) {
            // Don't clear the entire list, just reset any active states
            const activeItems = recipeList.querySelectorAll('.active, .selected');
            activeItems.forEach(item => {
                item.classList.remove('active', 'selected');
            });
        }
    }
    
    populateRecipeReceipt(recipe) {
        // Set recipe name
        const nameElement = document.getElementById('modal-recipe-name');
        if (nameElement) {
            nameElement.textContent = recipe.name || 'Untitled Recipe';
        }
        
        // Set date and time
        const now = new Date();
        const dateElement = document.getElementById('modal-recipe-date');
        const timeElement = document.getElementById('modal-recipe-time');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString();
        }
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString();
        }
        
        // Populate ingredients list
        const ingredientsList = document.getElementById('modal-ingredients-list');
        const ingredientCount = document.getElementById('modal-ingredient-count');
        
        if (ingredientsList && recipe.ingredients) {
            ingredientsList.innerHTML = '';
            
            recipe.ingredients.forEach((ingredient, index) => {
                const ingredientDiv = document.createElement('div');
                ingredientDiv.className = 'flex justify-between items-center py-2 border-b border-gray-200';
                
                ingredientDiv.innerHTML = `
                    <div class="flex items-center">
                        <span class="w-8 text-gray-500">${index + 1}.</span>
                        <span class="font-medium text-gray-800 uppercase">${ingredient.name}</span>
                    </div>
                    <div class="text-right">
                        <span class="font-bold text-gray-800">${ingredient.amount} ${ingredient.unit}</span>
                    </div>
                `;
                
                ingredientsList.appendChild(ingredientDiv);
            });
            
            if (ingredientCount) {
                ingredientCount.textContent = recipe.ingredients.length;
            }
        }
    }
    
    // ========================================================================
    // MODAL MANAGEMENT (Delegated to ModalManager)
    // ========================================================================
    
    showModal(modalName, data = null) {
        // Handle recipe completion modal with special data population
        if (modalName === 'recipeCompletion' && data) {
            this.populateRecipeReceipt(data);
        }
        return this.modalManager.showModal(modalName, data);
    }
    
    hideModal(modalName) {
        return this.modalManager.hideModal(modalName);
    }
    
    hideAllModals() {
        return this.modalManager.hideAllModals();
    }
    
    // Modal setup methods are now handled by ModalManager
    // Keeping only recipe-specific modal population for backward compatibility
    
    // ========================================================================
    // USER MANAGEMENT (Delegated to InteractionManager)
    // ========================================================================
    
    selectUser(username) {
        this.interactionManager.setCurrentUser(username);
        
        // Update welcome message if on connected view
        if (this.getCurrentView() === 'connected') {
            this.startWelcomeTypingEffect();
        }
    }
    
    getCurrentUser() {
        return this.interactionManager.getCurrentUser();
    }
    
    // ========================================================================
    // TYPING EFFECTS (Delegated to AnimationManager)
    // ========================================================================
    
    startTaglineTypingEffect() {
        if (!this.taglineText) return;
        
        const text = "Voice-powered nutritional assistant";
        this.animationManager.startTypingEffect(this.taglineText, text, 30);
    }
    
    startWelcomeTypingEffect() {
        if (!this.welcomeText) return;
        
        const currentUser = this.getCurrentUser();
        let text;
        if (currentUser) {
            const capitalizedName = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
            text = `Hello, ${capitalizedName}! Ready to create some recipes?`;
        } else {
            text = 'Welcome to Cookbooker. Please select a user to continue.';
        }
        
        this.animationManager.startTypingEffect(this.welcomeText, text, 50);
    }
    
    // ========================================================================
    // RECIPE UI MANAGEMENT
    // ========================================================================
    
    initializeRecipeView() {
        // Clear ingredients display
        if (this.recipeIngredients) {
            this.recipeIngredients.innerHTML = '<div class="text-muted-foreground text-center py-8">Ingredients will appear here as you speak...</div>';
        }
        
        // Reset action buttons
        this.updateRecipeActionButtons(false);
    }
    
    updateRecipeName(name) {
        if (this.currentRecipeName) {
            this.currentRecipeName.textContent = name || 'Recipe Name';
        }
    }
    
    updateIngredientsDisplay(ingredients) {
        console.log('🔄 UIController.updateIngredientsDisplay called with:', ingredients);
        
        if (!this.recipeIngredients) {
            console.warn('⚠️ Recipe ingredients element not found');
            return;
        }
        
        if (!ingredients || !Array.isArray(ingredients)) {
            console.warn('⚠️ Invalid ingredients data provided:', ingredients);
            return;
        }
        
        console.log('📝 Updating ingredients display with', ingredients.length, 'ingredients');
        
        if (ingredients.length === 0) {
            console.log('📝 No ingredients - showing placeholder');
            this.recipeIngredients.innerHTML = '<div class="text-muted-foreground text-center py-8">Ingredients will appear here as you speak...</div>';
            return;
        }
        
        try {
            const ingredientsHTML = ingredients.map(ing => {
                // Validate ingredient structure
                if (!ing || typeof ing !== 'object') {
                    console.warn('⚠️ Invalid ingredient object:', ing);
                    return '';
                }
                
                const name = this.escapeHtml(ing.name || 'Unknown ingredient');
                const amount = this.escapeHtml(String(ing.amount || ''));
                const unit = this.escapeHtml(ing.unit || '');
                
                return `
                    <div class="flex justify-between items-center py-2 px-3 bg-muted/20 rounded-lg">
                        <span class="font-medium">${name}</span>
                        <span class="text-sm text-muted-foreground">${amount} ${unit}</span>
                    </div>
                `;
            }).filter(html => html !== '').join('');
            
            this.recipeIngredients.innerHTML = ingredientsHTML;
        } catch (error) {
            console.error('❌ Error updating ingredients display:', error);
            this.recipeIngredients.innerHTML = '<div class="text-red-500 text-center py-8">Error displaying ingredients</div>';
        }
    }
    
    addIngredientToDisplay(ingredient) {
        if (!this.recipeIngredients) {
            console.warn('⚠️ Recipe ingredients element not found');
            return;
        }
        
        if (!ingredient || typeof ingredient !== 'object') {
            console.warn('⚠️ Invalid ingredient provided:', ingredient);
            return;
        }
        
        try {
            // Remove placeholder if exists
            const placeholder = this.recipeIngredients.querySelector('.text-center');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Validate and sanitize ingredient data
            const name = this.escapeHtml(ingredient.name || 'Unknown ingredient');
            const amount = this.escapeHtml(String(ingredient.amount || ''));
            const unit = this.escapeHtml(ingredient.unit || '');
            
            // Create ingredient element
            const ingredientDiv = document.createElement('div');
            ingredientDiv.className = 'flex justify-between items-center py-2 px-3 bg-muted/20 rounded-lg animate-fade-in';
            ingredientDiv.innerHTML = `
                <span class="font-medium">${name}</span>
                <span class="text-sm text-muted-foreground">${amount} ${unit}</span>
            `;
            
            this.recipeIngredients.appendChild(ingredientDiv);
            
            // Enable save button after first ingredient is added
            this.updateRecipeActionButtons(true);
            
            // Show toast notification with error handling
            try {
                this.showIngredientToast(ingredient);
            } catch (toastError) {
                console.warn('⚠️ Failed to show ingredient toast:', toastError);
            }
        } catch (error) {
            console.error('❌ Error adding ingredient to display:', error);
        }
    }
    
    updateRecipeActionButtons(enabled) {
        if (this.saveRecipeActionBtn) {
            if (enabled) {
                this.saveRecipeActionBtn.disabled = false;
                this.saveRecipeActionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                this.saveRecipeActionBtn.classList.add('hover:bg-accent/90');
            } else {
                this.saveRecipeActionBtn.disabled = true;
                this.saveRecipeActionBtn.classList.add('opacity-50', 'cursor-not-allowed');
                this.saveRecipeActionBtn.classList.remove('hover:bg-accent/90');
            }
        }
    }
    
    updateStartRecipeButtonState(connected) {
        if (this.startRecipeBtn) {
            if (connected) {
                this.startRecipeBtn.disabled = false;
                this.startRecipeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                this.startRecipeBtn.disabled = true;
                this.startRecipeBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
    
    // Duplicate modal management methods removed - now handled by ModalManager
    
    // ========================================================================
    // RECIPE DISPLAY
    // ========================================================================
    
    async loadRecipesView() {
        if (!this.recipesGrid) return;
        
        try {
            console.log('📚 Loading recipes view');
            // Trigger recipe loading from main app
            if (window.app && window.app.loadMyRecipes) {
                await window.app.loadMyRecipes();
            }
        } catch (error) {
            console.error('❌ Failed to load recipes:', error);
            this.showNoRecipesMessage();
        }
    }
    
    displayRecipes(recipes) {
        if (!this.recipesGrid) return;
        
        if (recipes.length === 0) {
            this.showNoRecipesMessage();
            return;
        }
        
        // Hide no recipes message
        if (this.noRecipesMessage) {
            this.noRecipesMessage.classList.add('hidden');
        }
        this.recipesGrid.classList.remove('hidden');
        
        // Clear existing recipes
        this.recipesGrid.innerHTML = '';
        
        // Create recipe cards
        recipes.forEach(recipe => {
            const recipeCard = this.createRecipeCard(recipe);
            this.recipesGrid.appendChild(recipeCard);
        });
    }
    
    createRecipeCard(recipe) {
        const recipeCard = document.createElement('div');
        recipeCard.className = 'bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group';
        
        const estimatedCalories = recipe.ingredients ? 
            Math.floor(recipe.ingredients.length * 150) : 0;
        
        recipeCard.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between items-start">
                    <h3 class="text-lg font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2">${recipe.name}</h3>
                    <div class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        ${recipe.ingredients ? recipe.ingredients.length : 0} items
                    </div>
                </div>
                
                <div class="space-y-2 text-sm text-muted-foreground">
                    <div class="flex justify-between">
                        <span>Est. Calories:</span>
                        <span>${estimatedCalories} kcal</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Created:</span>
                        <span>${new Date(recipe.created).toLocaleDateString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Servings:</span>
                        <span>1-2</span>
                    </div>
                </div>
                
                <div class="pt-2 border-t border-border">
                    <div class="flex flex-wrap gap-1">
                        ${recipe.tags ? recipe.tags.map(tag => 
                            `<span class="text-xs bg-accent/20 text-accent px-2 py-1 rounded">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add click event
        recipeCard.addEventListener('click', () => {
            this.showModal('recipe-detail-modal', recipe);
        });
        
        return recipeCard;
    }
    
    showNoRecipesMessage() {
        if (this.recipesGrid) {
            this.recipesGrid.classList.add('hidden');
        }
        if (this.noRecipesMessage) {
            this.noRecipesMessage.classList.remove('hidden');
        }
    }
    
    // ========================================================================
    // NOTIFICATIONS & FEEDBACK
    // ========================================================================
    
    showIngredientToast(ingredient) {
        this.showToast(`Added ${ingredient.name}`, 'success');
    }
    
    showErrorMessage(message) {
        console.error('❌ UI Error:', message);
        this.showToast(message, 'error');
    }
    
    showSuccessMessage(message) {
        console.log('✅ UI Success:', message);
        this.showToast(message, 'success');
    }
    
    showToast(message, type = 'info') {
        if (!message || typeof message !== 'string') {
            console.warn('⚠️ Invalid toast message:', message);
            return;
        }
        
        try {
            // Create toast element
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.top = '16px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.zIndex = '9999';
            toast.style.padding = '12px 24px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.fontSize = '14px';
            toast.style.fontWeight = '500';
            
            // Style based on type with validation
            const validTypes = ['error', 'success', 'info', 'warning'];
            const safeType = validTypes.includes(type) ? type : 'info';
            
            let iconSvg = '';
            switch (safeType) {
                case 'error':
                    toast.style.backgroundColor = '#ef4444';
                    toast.style.color = 'white';
                    iconSvg = '<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
                    break;
                case 'success':
                    toast.style.backgroundColor = '#22c55e';
                    toast.style.color = 'white';
                    iconSvg = '<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
                    break;
                case 'warning':
                    toast.style.backgroundColor = '#eab308';
                    toast.style.color = 'white';
                    iconSvg = '<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
                    break;
                default:
                    toast.style.backgroundColor = '#3b82f6';
                    toast.style.color = 'white';
                    iconSvg = '<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
            }
            
            // Set content with icon and sanitized message
            toast.innerHTML = `<div style="display: flex; align-items: center;">${iconSvg}<span>${this.escapeHtml(message)}</span></div>`;
            
            // Safely append to body
            if (document.body) {
                document.body.appendChild(toast);
            } else {
                console.error('❌ Document body not available for toast');
                return;
            }
            
            // Animate in with error handling
            const animateIn = setTimeout(() => {
                if (toast.style) {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translateX(-50%)';
                }
            }, 100);
            
            // Auto remove after 4 seconds with cleanup
            const autoRemove = setTimeout(() => {
                if (toast.style) {
                    toast.style.opacity = '0';
                }
                
                const finalRemove = setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 4000);
            
        } catch (error) {
            console.error('❌ Error showing toast:', error);
        }
    }
    
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text || '');
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    validateElement(element, elementName) {
        if (!element) {
            console.warn(`⚠️ Element not found: ${elementName}`);
            return false;
        }
        if (!element.classList) {
            console.warn(`⚠️ Element missing classList: ${elementName}`);
            return false;
        }
        return true;
    }
    
    // Event listener setup methods removed - now handled by InteractionManager
    
    setupRecipeCompletionModal(recipe) {
        // Modal setup is now handled by ModalManager
        // This method kept for backward compatibility
        console.log('📋 Recipe completion modal setup delegated to ModalManager');
    }
    
    setupRecipeDetailModal(recipe) {
        // Modal setup is now handled by ModalManager
        // This method kept for backward compatibility
        console.log('📋 Recipe detail modal setup delegated to ModalManager');
    }
    
    async deleteRecipe(recipe) {
        try {
            console.log('🗑️ Deleting recipe:', recipe.name);
            
            // Get current user
            const currentUser = window.app?.userManager?.getCurrentUser();
            if (!currentUser) {
                throw new Error('No user selected');
            }
            
            // Call API to delete recipe
            const response = await fetch(`/api/delete-recipe`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filename: recipe.filename,
                    recipeId: recipe.id,
                    user: currentUser 
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(`Failed to delete recipe: ${result.detail || response.statusText}`);
            }
            
            console.log('✅ Recipe deleted successfully');
            
            // Invalidate cache to ensure fresh data
            if (window.app?.apiClient?.invalidateRecipesCache) {
                window.app.apiClient.invalidateRecipesCache(currentUser);
            }
            
            // Close modal
            this.hideModal('recipe-detail-modal');
            
            // Show success message
            this.showToast(`Recipe "${recipe.name}" deleted successfully`, 'success');
            
            // Refresh recipes list if in My Recipes view
            if (window.app?.loadMyRecipes && this.currentView === 'myRecipes') {
                await window.app.loadMyRecipes();
            }
            
            // Update recipe view if currently viewing recipes
            if (this.currentView === 'recipeMain' && window.app?.updateRecipeDisplay) {
                window.app.updateRecipeDisplay();
            }
            
        } catch (error) {
            console.error('❌ Failed to delete recipe:', error);
            this.showToast('Failed to delete recipe', 'error');
        }
    }
    
    updateConsoleDisplay() {
        // This would be implemented to show console messages
        console.log('📺 Updating console display');
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    setEventHandlers(handlers) {
        this.onViewChange = handlers.onViewChange;
        this.onUserSelect = handlers.onUserSelect;
        this.onError = handlers.onError;
    }
    
    initializeConsoleView() {
        console.log('🖥️ Initializing console view');
        
        // Get console elements
        const consoleOutput = document.getElementById('console-output');
        const clearBtn = document.getElementById('clear-console-btn');
        
        if (!consoleOutput) {
            console.warn('⚠️ Console output element not found');
            return;
        }
        
        // Set up clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearConsole();
            });
        }
        
        // Start capturing console logs
        this.startConsoleCapture();
    }
    
    startConsoleCapture() {
        if (this.consoleCapturing) return;
        
        this.consoleCapturing = true;
        this.consoleLogs = this.consoleLogs || [];
        
        // Store original console methods
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };
        
        // Override console methods
        console.log = (...args) => {
            this.originalConsole.log(...args);
            this.addConsoleLog('log', args);
        };
        
        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            this.addConsoleLog('warn', args);
        };
        
        console.error = (...args) => {
            this.originalConsole.error(...args);
            this.addConsoleLog('error', args);
        };
        
        console.info = (...args) => {
            this.originalConsole.info(...args);
            this.addConsoleLog('info', args);
        };
        
        // Display existing logs
        this.displayConsoleLogs();
    }
    
    addConsoleLog(type, args) {
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        this.consoleLogs = this.consoleLogs || [];
        this.consoleLogs.push({ type, message, timestamp });
        
        // Keep only last 100 logs to prevent memory issues
        if (this.consoleLogs.length > 100) {
            this.consoleLogs = this.consoleLogs.slice(-100);
        }
        
        // Update display if console view is active
        if (this.currentView === 'console') {
            this.displayConsoleLogs();
        }
    }
    
    displayConsoleLogs() {
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) return;
        
        const logs = this.consoleLogs || [];
        
        if (logs.length === 0) {
            consoleOutput.innerHTML = '<div class="text-muted-foreground">Console initialized. Logs will appear here...</div>';
            return;
        }
        
        const logHtml = logs.map(log => {
            const colorClass = {
                log: 'text-background',
                warn: 'text-yellow-400',
                error: 'text-red-400',
                info: 'text-blue-400'
            }[log.type] || 'text-background';
            
            const typeIcon = {
                log: '📝',
                warn: '⚠️',
                error: '❌',
                info: 'ℹ️'
            }[log.type] || '📝';
            
            return `
                <div class="flex items-start space-x-2 py-1">
                    <span class="text-xs text-muted-foreground">${log.timestamp}</span>
                    <span>${typeIcon}</span>
                    <span class="${colorClass} flex-1 break-words">${this.escapeHtml(log.message)}</span>
                </div>
            `;
        }).join('');
        
        consoleOutput.innerHTML = logHtml;
        
        // Auto-scroll to bottom
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    clearConsole() {
        this.consoleLogs = [];
        this.displayConsoleLogs();
        console.log('🧹 Console cleared');
    }
    
    stopConsoleCapture() {
        if (!this.consoleCapturing || !this.originalConsole) return;
        
        // Restore original console methods
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.info = this.originalConsole.info;
        
        this.consoleCapturing = false;
    }

    // Recipe-specific UI updates
    updateRecipeState(state, recipe) {
        switch (state) {
            case 'waiting_to_start':
                this.updateRecipeName(recipe.name);
                this.showView('recipeMain');
                break;
                
            case 'listening_for_ingredients':
                this.updateRecipeName(recipe.name);
                this.updateRecipeActionButtons(false);
                break;
                
            case 'finished_recipe':
                this.updateRecipeActionButtons(true);
                break;
                
            case 'saved_recipe':
                this.showModal('recipeCompletion', recipe);
                break;
        }
    }
}

// Export for use in main app
window.UIController = UIController;
