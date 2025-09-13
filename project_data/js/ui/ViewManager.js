// ============================================================================
// VIEW MANAGER - View Navigation & State Management
// ============================================================================
// Handles all view-related functionality:
// - View switching and navigation
// - View state management
// - View visibility controls
// - Navigation history
// ============================================================================

class ViewManager {
    constructor() {
        console.log('📺 ViewManager initializing...');
        
        // View state
        this.currentView = 'connect';
        this.previousView = null;
        this.viewHistory = [];
        
        // View elements cache
        this.views = new Map();
        
        // Event callbacks
        this.onViewChange = null;
        
        // Initialize view elements
        this.initializeViews();
        
        console.log('✅ ViewManager initialized');
    }
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    initializeViews() {
        // Define view mapping to match original UIController expectations
        const viewMappings = {
            'connect-view': 'connect',
            'connected-view': 'connected', 
            'recipe-name-view': 'recipeName',
            'recipe-main-view': 'recipeMain',
            'my-recipes-view': 'myRecipes',
            'settings-view': 'settings',
            'console-view': 'console',
            'input-testing-view': 'inputTesting',
            'user-profile-view': 'userProfile'
        };
        
        // Cache view elements using correct mapping
        Object.entries(viewMappings).forEach(([elementId, viewName]) => {
            const element = document.getElementById(elementId);
            if (element) {
                this.views.set(viewName, element);
                console.log(`✅ View cached: ${viewName} -> ${elementId}`);
            } else {
                console.error(`❌ View element not found: ${elementId}`);
            }
        });
        
        console.log('📺 Cached', this.views.size, 'view elements');
    }
    
    // ========================================================================
    // VIEW NAVIGATION
    // ========================================================================
    
    showView(viewName) {
        if (!viewName || typeof viewName !== 'string') {
            console.error('❌ Invalid view name:', viewName);
            return false;
        }
        
        console.log('📺 Switching to view:', viewName);
        
        // Store previous view for history
        if (this.currentView && this.currentView !== viewName) {
            this.previousView = this.currentView;
            this.viewHistory.push(this.currentView);
        }
        
        // Hide all views
        this.views.forEach(view => {
            if (view && view.classList) {
                view.classList.add('hidden');
            }
        });
        
        // Show target view
        const targetView = this.views.get(viewName);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.currentView = viewName;
            
            // Trigger view change callback
            if (this.onViewChange) {
                this.onViewChange(viewName, this.previousView);
            }
            
            console.log('✅ View switched to:', viewName);
            return true;
        } else {
            console.error('❌ View not found:', viewName, 'Available views:', Array.from(this.views.keys()));
            return false;
        }
    }
    
    displayView(viewName) {
        // Try different view name formats
        const possibleIds = [
            `${viewName}-view`,
            `${viewName.replace('_', '-')}-view`,
            viewName
        ];
        
        for (const id of possibleIds) {
            const viewElement = document.getElementById(id);
            if (viewElement) {
                viewElement.classList.remove('hidden');
                viewElement.style.display = 'flex';
                return true;
            }
        }
        
        console.error('❌ View element not found:', viewName);
        return false;
    }
    
    hideAllViews() {
        const allViews = document.querySelectorAll('.view');
        allViews.forEach(view => {
            view.classList.add('hidden');
            view.style.display = 'none';
        });
    }
    
    hideView(viewName) {
        const normalizedViewName = viewName.replace('-view', '').replace('-', '_');
        const viewElement = this.getViewElement(normalizedViewName);
        
        if (viewElement) {
            viewElement.classList.add('hidden');
            viewElement.style.display = 'none';
            return true;
        }
        
        return false;
    }
    
    // ========================================================================
    // VIEW HISTORY & NAVIGATION
    // ========================================================================
    
    goBack() {
        if (this.previousView) {
            console.log('⬅️ Going back to previous view:', this.previousView);
            this.showView(this.previousView);
            return true;
        }
        
        if (this.viewHistory.length > 0) {
            const lastView = this.viewHistory.pop();
            console.log('⬅️ Going back to view from history:', lastView);
            this.showView(lastView);
            return true;
        }
        
        console.log('⚠️ No previous view to go back to');
        return false;
    }
    
    clearHistory() {
        this.viewHistory = [];
        this.previousView = null;
    }
    
    // ========================================================================
    // VIEW UTILITIES
    // ========================================================================
    
    getViewElement(viewName) {
        // Try cached element first
        if (this.views.has(viewName)) {
            return this.views.get(viewName);
        }
        
        // Try different ID formats
        const possibleIds = [
            `${viewName}-view`,
            `${viewName.replace('_', '-')}-view`,
            viewName
        ];
        
        for (const id of possibleIds) {
            const element = document.getElementById(id);
            if (element) {
                // Cache for future use
                this.views.set(viewName, element);
                return element;
            }
        }
        
        return null;
    }
    
    isViewVisible(viewName) {
        const viewElement = this.getViewElement(viewName);
        return viewElement && !viewElement.classList.contains('hidden');
    }
    
    getCurrentViewElement() {
        return this.getViewElement(this.currentView);
    }
    
    // ========================================================================
    // VIEW-SPECIFIC OPERATIONS
    // ========================================================================
    
    initializeRecipeView() {
        console.log('🍳 Initializing recipe view');
        
        // Clear any existing recipe data display
        const ingredientsContainer = document.getElementById('recipe-ingredients');
        if (ingredientsContainer) {
            ingredientsContainer.innerHTML = '<div class="text-muted-foreground text-center py-8">Ingredients will appear here as you speak...</div>';
        }
        
        // Reset recipe name display
        const recipeNameElement = document.getElementById('current-recipe-name');
        if (recipeNameElement) {
            recipeNameElement.textContent = 'Recipe Name';
        }
    }
    
    updateRecipeTitle(title) {
        const recipeNameElement = document.getElementById('current-recipe-name');
        if (recipeNameElement && title) {
            recipeNameElement.textContent = title;
        }
    }
    
    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    
    setEventHandlers(handlers) {
        this.onViewChange = handlers.onViewChange;
    }
    
    setViewChangeHandler(callback) {
        this.onViewChange = callback;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getCurrentView() {
        return this.currentView;
    }
    
    getPreviousView() {
        return this.previousView;
    }
    
    getViewHistory() {
        return [...this.viewHistory];
    }
    
    getAllViews() {
        return Array.from(this.views.keys());
    }
}

// Export for use in UIController
window.ViewManager = ViewManager;
