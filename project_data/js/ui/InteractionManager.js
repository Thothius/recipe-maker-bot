// ============================================================================
// INTERACTION MANAGER - User Events & Input Handling
// ============================================================================
// Handles all user interaction functionality:
// - Event listener setup and management
// - User input validation and processing
// - Button click handlers
// - Form submission handling
// - Keyboard shortcuts
// ============================================================================

class InteractionManager {
    constructor(viewManager, modalManager, animationManager) {
        console.log('🎮 InteractionManager initializing...');
        
        this.viewManager = viewManager;
        this.modalManager = modalManager;
        this.animationManager = animationManager;
        
        // Event callbacks
        this.onUserSelect = null;
        this.onRecipeStart = null;
        this.onRecipeAction = null;
        this.onError = null;
        
        // Input state
        this.currentUser = null;
        
        // Initialize event listeners
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        
        console.log('✅ InteractionManager initialized');
    }
    
    // ========================================================================
    // EVENT LISTENER SETUP
    // ========================================================================
    
    setupEventListeners() {
        this.setupNavigationListeners();
        this.setupUserSelectionListeners();
        this.setupRecipeListeners();
        this.setupModalListeners();
        this.setupFormListeners();
        
        console.log('🎯 Event listeners setup complete');
    }
    
    setupNavigationListeners() {
        // Back buttons
        const backButtons = [
            'back-from-recipe',
            'back-from-recipes', 
            'back-from-settings',
            'back-from-console',
            'back-from-input-testing',
            'back-from-user-profile',
            'back-to-connected'
        ];
        
        backButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.handleBackNavigation(buttonId);
                });
            }
        });
        
        // Main menu buttons
        const menuButtons = {
            'recipe-testing-btn': 'recipeName',
            'input-testing-btn': 'inputTesting',
            'my-recipes-btn': 'myRecipes',
            'user-profile-btn': 'userProfile'
        };
        
        Object.entries(menuButtons).forEach(([buttonId, viewName]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.viewManager.showView(viewName);
                });
            }
        });
        
        // Settings and console buttons
        const utilityButtons = [
            'connected-settings-btn-bottom',
            'settings-btn-recipes',
            'connected-console-btn-bottom',
            'console-btn',
            'about-info-btn'
        ];
        
        utilityButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.handleUtilityButton(buttonId);
                });
            }
        });
    }
    
    setupUserSelectionListeners() {
        // User dropdown
        const userSelect = document.getElementById('user-select');
        if (userSelect) {
            userSelect.addEventListener('change', (event) => {
                this.handleUserSelection(event.target.value);
            });
        }
        
        // User profile radio buttons
        const radioButtons = document.querySelectorAll('input[name="user-profile"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.handleUserProfileChange(radio.value);
                }
            });
        });
        
        // Save user profile button
        const saveProfileBtn = document.getElementById('save-user-profile');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                this.handleSaveUserProfile();
            });
        }
    }
    
    setupRecipeListeners() {
        // Recipe action buttons
        const recipeButtons = {
            'start-recipe-btn': 'startRecipe',
            'save-recipe-action-btn': 'saveRecipe',
            'close-recipe-action-btn': 'closeRecipe'
        };
        
        Object.entries(recipeButtons).forEach(([buttonId, action]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.handleRecipeAction(action, buttonId);
                });
            }
        });
        
        // Recipe name input
        const recipeNameInput = document.getElementById('recipe-name-input');
        if (recipeNameInput) {
            recipeNameInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.handleRecipeAction('startRecipe', 'recipe-name-input');
                }
            });
        }
    }
    
    setupModalListeners() {
        // Modal close buttons are handled by ModalManager
        // Additional modal-specific interactions
        
        const deleteRecipeBtn = document.getElementById('detail-delete-btn');
        if (deleteRecipeBtn) {
            deleteRecipeBtn.addEventListener('click', () => {
                this.handleDeleteRecipe();
            });
        }
        
        // Recipe completion modal close
        const closeCompletionBtn = document.getElementById('close-recipe-completion-modal');
        if (closeCompletionBtn) {
            closeCompletionBtn.addEventListener('click', () => {
                this.modalManager.hideModal('recipe-completion-modal');
            });
        }
    }
    
    setupFormListeners() {
        // Connect button
        const connectBtn = document.getElementById('connect-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.handleConnect();
            });
        }
        
        // Disconnect button
        const disconnectBtn = document.getElementById('disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.handleDisconnect();
            });
        }
        
        // Voice and language selectors
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            voiceSelect.addEventListener('change', (event) => {
                this.handleVoiceChange(event.target.value);
            });
        }
        
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (event) => {
                this.handleLanguageChange(event.target.value);
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // ESC key handled by ModalManager
            
            // Ctrl/Cmd + Enter to start recipe
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                const currentView = this.viewManager.getCurrentView();
                if (currentView === 'recipe_name') {
                    this.handleRecipeAction('startRecipe', 'keyboard');
                }
            }
            
            // Ctrl/Cmd + S to save recipe
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                const currentView = this.viewManager.getCurrentView();
                if (currentView === 'recipe_main') {
                    event.preventDefault();
                    this.handleRecipeAction('saveRecipe', 'keyboard');
                }
            }
        });
    }
    
    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    
    handleBackNavigation(buttonId) {
        console.log('⬅️ Back navigation:', buttonId);
        
        switch (buttonId) {
            case 'back-to-connected':
                this.viewManager.showView('connected');
                break;
            default:
                // Use ViewManager's back functionality
                if (!this.viewManager.goBack()) {
                    // Fallback to connected view
                    this.viewManager.showView('connected');
                }
        }
    }
    
    handleUtilityButton(buttonId) {
        console.log('🔧 Utility button:', buttonId);
        
        switch (buttonId) {
            case 'connected-settings-btn-bottom':
            case 'settings-btn-recipes':
                this.viewManager.showView('settings');
                break;
            case 'connected-console-btn-bottom':
            case 'console-btn':
                this.viewManager.showView('console');
                break;
            case 'about-info-btn':
                this.modalManager.showModal('about-modal');
                break;
        }
    }
    
    handleUserSelection(username) {
        if (!username) return;
        
        console.log('👤 User selected:', username);
        this.currentUser = username;
        
        // Show connect section with animation
        const connectSection = document.getElementById('connect-section');
        if (connectSection) {
            connectSection.classList.remove('opacity-0', 'invisible');
            connectSection.classList.add('opacity-100', 'visible');
        }
        
        // Trigger callback
        if (this.onUserSelect) {
            this.onUserSelect(username);
        }
    }
    
    handleUserProfileChange(username) {
        console.log('👤 User profile changed:', username);
        this.currentUser = username;
    }
    
    handleSaveUserProfile() {
        const selectedRadio = document.querySelector('input[name="user-profile"]:checked');
        if (selectedRadio) {
            const username = selectedRadio.value;
            console.log('💾 Saving user profile:', username);
            
            // Update current user display
            const currentUserDisplay = document.getElementById('current-user-display');
            if (currentUserDisplay) {
                currentUserDisplay.textContent = username;
            }
            
            // Trigger callback
            if (this.onUserSelect) {
                this.onUserSelect(username);
            }
            
            // Show success message
            this.showSuccessMessage('User profile saved successfully');
        }
    }
    
    handleRecipeAction(action, source) {
        console.log('🍳 Recipe action:', action, 'from:', source);
        
        if (this.onRecipeAction) {
            this.onRecipeAction(action, source);
        }
    }
    
    handleConnect() {
        console.log('🔌 Connect button clicked');
        
        if (!this.currentUser) {
            this.showErrorMessage('Please select a user first');
            return;
        }
        
        // Trigger callback
        if (this.onRecipeAction) {
            this.onRecipeAction('connect', 'button');
        }
    }
    
    handleDisconnect() {
        console.log('🔌 Disconnect button clicked');
        
        if (this.onRecipeAction) {
            this.onRecipeAction('disconnect', 'button');
        }
    }
    
    handleVoiceChange(voice) {
        console.log('🎤 Voice changed:', voice);
        
        if (this.onRecipeAction) {
            this.onRecipeAction('voiceChange', voice);
        }
    }
    
    handleLanguageChange(language) {
        console.log('🌍 Language changed:', language);
        
        if (this.onRecipeAction) {
            this.onRecipeAction('languageChange', language);
        }
    }
    
    handleDeleteRecipe() {
        this.modalManager.showConfirmationModal(
            'Delete Recipe',
            'Are you sure you want to delete this recipe? This action cannot be undone.',
            () => {
                if (this.onRecipeAction) {
                    this.onRecipeAction('deleteRecipe', 'modal');
                }
            },
            () => {
                console.log('Recipe deletion cancelled');
            }
        );
    }
    
    // ========================================================================
    // FEEDBACK METHODS
    // ========================================================================
    
    showSuccessMessage(message) {
        console.log('✅ Success:', message);
        // Could integrate with a toast system or use AnimationManager
    }
    
    showErrorMessage(message) {
        console.log('❌ Error:', message);
        
        if (this.onError) {
            this.onError(new Error(message));
        }
    }
    
    // ========================================================================
    // INPUT VALIDATION
    // ========================================================================
    
    validateRecipeName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: 'Recipe name is required' };
        }
        
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            return { valid: false, message: 'Recipe name cannot be empty' };
        }
        
        if (trimmed.length > 100) {
            return { valid: false, message: 'Recipe name is too long (max 100 characters)' };
        }
        
        return { valid: true, value: trimmed };
    }
    
    // ========================================================================
    // EVENT HANDLER REGISTRATION
    // ========================================================================
    
    setEventHandlers(handlers) {
        this.onUserSelect = handlers.onUserSelect;
        this.onRecipeStart = handlers.onRecipeStart;
        this.onRecipeAction = handlers.onRecipeAction;
        this.onError = handlers.onError;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    setCurrentUser(username) {
        this.currentUser = username;
        
        // Update UI elements
        const userSelect = document.getElementById('user-select');
        if (userSelect) {
            userSelect.value = username;
        }
        
        const userRadio = document.querySelector(`input[name="user-profile"][value="${username}"]`);
        if (userRadio) {
            userRadio.checked = true;
        }
    }
}

// Export for use in UIController
window.InteractionManager = InteractionManager;
