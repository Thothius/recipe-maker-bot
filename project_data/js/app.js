// ============================================================================
// RECIPE VOICE ASSISTANT - MODULAR MAIN APPLICATION
// ============================================================================
// Main orchestrator that coordinates all modular components:
// - VoiceManager: WebRTC & OpenAI Realtime API
// - RecipeManager: Recipe state & operations
// - UIController: View management & user interface
// - APIClient: Server communication & data management
// ============================================================================

class RecipeVoiceApp {
    constructor() {
        console.log('🏗️ RecipeVoiceApp initializing with modular architecture...');
        
        // Initialize configuration
        this.voiceCommands = new VoiceCommands();
        
        // Initialize core components
        this.userManager = new UserManager();
        this.apiClient = new APIClient();
        this.voiceManager = new VoiceManager();
        this.recipeManager = new RecipeManager();
        this.uiController = new UIController();
        
        // Initialize function router
        this.functionRouter = new FunctionRouter(this.recipeManager, this.uiController);
        
        // Application state
        this.isInitialized = false;
        
        // Make app globally accessible for modules
        window.app = this;
        
        // Initialize the application
        this.initialize();
        
        console.log('✅ RecipeVoiceApp fully initialized with modular architecture');
    }
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    async initialize() {
        try {
            console.log('🔧 Setting up module event handlers...');
            
            // Validate all modules are available
            if (!this.voiceManager || !this.recipeManager || !this.uiController || !this.apiClient) {
                throw new Error('One or more core modules failed to initialize');
            }
            
            // Setup event handlers for all modules with error handling
            try {
                this.setupVoiceManagerEvents();
            } catch (error) {
                console.error('❌ Failed to setup VoiceManager events:', error);
                throw error;
            }
            
            try {
                this.setupUIControllerEvents();
                this.setupRecipeManagerEvents();
                this.setupUserProfileEvents();
            } catch (error) {
                console.error('❌ Failed to setup UIController events:', error);
                throw error;
            }
            
            try {
                this.setupAPIClientEvents();
            } catch (error) {
                console.error('❌ Failed to setup APIClient events:', error);
                throw error;
            }
            
            // Setup cross-module integrations
            this.setupModuleIntegrations();
            
            // Initialize UI with error handling
            try {
                this.uiController.showView('connect');
            } catch (error) {
                console.error('❌ Failed to show initial view:', error);
                // Try fallback
                document.body.innerHTML = '<div class="p-8 text-center"><h1>Application Error</h1><p>Failed to initialize UI</p></div>';
            }
            
            this.isInitialized = true;
            console.log('✅ Application initialization complete');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleCriticalError(error);
        }
    }
    
    // ========================================================================
    // MODULE EVENT HANDLERS
    // ========================================================================
    
    setupVoiceManagerEvents() {
        this.voiceManager.setEventHandlers({
            onConnectionStateChange: (state) => {
                console.log('🔌 Voice connection state changed:', state);
                
                if (state === 'connected') {
                    this.uiController.updateStartRecipeButtonState(true);
                } else if (state === 'disconnected') {
                    this.uiController.updateStartRecipeButtonState(false);
                }
            },
            
            onMessageReceived: (message) => {
                this.handleRealtimeMessage(message);
            },
            
            onError: (error) => {
                console.error('❌ Voice Manager error:', error);
                this.uiController.showErrorMessage(`Voice connection error: ${error.message}`);
            }
        });
    }
    
    setupRecipeManagerEvents() {
        this.recipeManager.setEventHandlers({
            onRecipeStateChange: (state, recipe) => {
                console.log('📝 Recipe state changed:', state);
                try {
                    this.uiController.updateRecipeState(state, recipe);
                } catch (error) {
                    console.error('❌ Error updating recipe state in UI:', error);
                }
            },
            
            onIngredientAdded: (ingredient) => {
                console.log('🥕 Ingredient added:', ingredient.name);
                try {
                    this.uiController.addIngredientToDisplay(ingredient);
                    // Get current ingredients for display update
                    const allIngredients = this.recipeManager.getIngredients();
                    this.uiController.updateIngredientsDisplay(allIngredients);
                } catch (error) {
                    console.error('❌ Error updating ingredient display:', error);
                }
            },
            
            onRecipeCompleted: (recipe) => {
                console.log('✅ Recipe completed:', recipe.name);
                try {
                    // Trigger nutrition analysis with error handling
                    this.recipeManager.analyzeNutrition(recipe.ingredients).catch(error => {
                        console.warn('⚠️ Nutrition analysis failed:', error);
                    });
                } catch (error) {
                    console.error('❌ Error in recipe completion handler:', error);
                }
            },
            
            onError: (error) => {
                console.error('❌ Recipe Manager error:', error);
                try {
                    this.uiController.showErrorMessage(`Recipe error: ${error.message}`);
                } catch (uiError) {
                    console.error('❌ Failed to show error message:', uiError);
                }
            }
        });
    }
    
    setupUIControllerEvents() {
        this.uiController.setEventHandlers({
            onViewChange: async (newView, previousView) => {
                console.log(`📱 View changed: ${previousView} → ${newView}`);
                
                // Handle voice disconnection when leaving recipe views
                if (newView === 'leaving-recipe') {
                    await this.voiceManager.disconnect();
                    return;
                }
                if (newView === 'saveUserProfile') {
                    this.handleSaveUserProfile();
                    return;
                }
                this.handleViewChange(newView, previousView);
            },
            
            onUserSelect: (username) => {
                console.log('👤 User selected:', username);
                this.currentUser = username;
            },
            
            onError: (error) => {
                console.error('❌ UI Controller error:', error);
            }
        });
    }
    
    setupAPIClientEvents() {
        this.apiClient.setEventHandlers({
            onError: (error) => {
                console.error('❌ API Client error:', error);
                this.uiController.showErrorMessage(`Server error: ${error.message}`);
            },
            
            onNetworkError: (error) => {
                console.error('❌ Network error:', error);
                this.uiController.showErrorMessage('Network connection lost');
            }
        });
    }
    
    // ========================================================================
    // MODULE INTEGRATIONS
    // ========================================================================
    
    setupModuleIntegrations() {
        // Connect UI buttons to functionality
        this.setupButtonHandlers();
        
        // Setup voice command integration
        this.setupVoiceCommands();
        
        console.log('🔗 Module integrations setup complete');
    }
    
    setupButtonHandlers() {
        // User selection (if needed)
        const userSelect = document.getElementById('user-select');
        if (userSelect) {
            userSelect.addEventListener('change', (e) => {
                this.currentUser = e.target.value;
                console.log('👤 User selected:', this.currentUser);
            });
        }
        
        // Set default user if not set
        if (!this.currentUser) {
            this.currentUser = 'maiken';
        }
        
        // Voice selection
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            voiceSelect.addEventListener('change', (e) => {
                this.selectedVoice = e.target.value;
                console.log('🎤 Voice selected:', this.selectedVoice);
                
                // Update voice characteristics display
                this.updateVoiceCharacteristics(this.selectedVoice);
                
                // Update voice in active session if connected, or disconnect and reconnect with new voice
                if (this.voiceManager && this.voiceManager.getConnectionState() === 'connected') {
                    console.log('🔄 Updating voice to:', this.selectedVoice);
                    this.voiceManager.updateSession({
                        voice: this.selectedVoice
                    });
                    
                    // Also trigger a full session reconfigure to ensure voice takes effect
                    setTimeout(() => {
                        console.log('🔄 Reconfiguring session to apply voice change');
                        this.configureVoiceSession();
                    }, 100);
                } else {
                    console.log('⚠️ Voice manager not connected, voice will be applied on next connection');
                }
            });
            
            // Initialize voice characteristics display
            this.updateVoiceCharacteristics(this.selectedVoice || 'sage');
        }
        
        // Set default voice if not set
        if (!this.selectedVoice) {
            this.selectedVoice = 'sage';
        }
        
        // Connect button
        const connectBtn = document.getElementById('connect-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                console.log('🔌 Connect button clicked');
                
                // Capture selected user profile
                const userSelect = document.getElementById('user-select');
                const selectedUser = userSelect?.value;
                
                if (!selectedUser) {
                    this.uiController.showToast('Please select a user profile first', 'warning');
                    return;
                }
                
                console.log('👤 Setting session user to:', selectedUser);
                this.userManager.setCurrentUser(selectedUser);
                
                this.uiController.showView('connected');
            });
        }
        
        // Disconnect button
        const disconnectBtn = document.getElementById('disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                console.log('🔌 Disconnect button clicked - resetting to connect view');
                
                // Clear current user selection to force re-selection
                const userSelect = document.getElementById('user-select');
                if (userSelect) {
                    userSelect.value = '';
                }
                
                this.uiController.showView('connect');
            });
        }
        
        // Recipe testing button (Make Recipe)
        const recipeTestingBtn = document.getElementById('recipe-testing-btn');
        if (recipeTestingBtn) {
            recipeTestingBtn.addEventListener('click', async () => {
                // Clear previous recipe data for fresh start
                this.clearRecipeData();
                await this.startRecipeFlow();
            });
        }
        
        // User Profile button - handled by UIController to avoid conflicts
        
        // Start recipe button
        const startRecipeBtn = document.getElementById('start-recipe-btn');
        if (startRecipeBtn) {
            startRecipeBtn.addEventListener('click', async () => {
                await this.startRecipe();
            });
        }
        
        // Save recipe button
        const saveRecipeActionBtn = document.getElementById('save-recipe-action-btn');
        if (saveRecipeActionBtn) {
            saveRecipeActionBtn.addEventListener('click', () => {
                this.saveCurrentRecipe();
            });
        }
        
        // Close recipe button
        const closeRecipeActionBtn = document.getElementById('close-recipe-action-btn');
        if (closeRecipeActionBtn) {
            closeRecipeActionBtn.addEventListener('click', () => {
                this.closeRecipe();
            });
        }
        
        
        // My Recipes button - handled by UIController to ensure proper user context
        
        // About button
        const aboutBtn = document.getElementById('about-info-btn');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => {
                this.showAboutModal();
            });
        }
        
        // Close about modal button
        const closeAboutBtn = document.getElementById('close-about-modal');
        if (closeAboutBtn) {
            closeAboutBtn.addEventListener('click', () => {
                this.hideAboutModal();
            });
        }
    }
    
    clearRecipeData() {
        console.log('🧹 Clearing previous recipe data for fresh start');
        
        // Clear recipe name input field
        const recipeNameInput = document.getElementById('recipe-name-input');
        if (recipeNameInput) {
            recipeNameInput.value = '';
        }
        
        // Reset recipe manager state
        this.recipeManager.resetRecipe();
        
        // Clear any UI displays
        this.uiController.clearRecipeDisplay();
        
        // Disconnect voice if connected to ensure clean state
        if (this.voiceManager && this.voiceManager.getConnectionState() === 'connected') {
            this.voiceManager.disconnect();
        }
    }
    
    updateVoiceCharacteristics(voiceName) {
        const voiceCharacteristics = {
            'sage': ['Calm', 'Measured', 'Professional'],
            'ballad': ['Expressive', 'Storytelling', 'Dramatic'],
            'coral': ['Warm', 'Friendly', 'Approachable'],
            'ash': ['Professional', 'Clear', 'Authoritative'],
            'verse': ['Rhythmic', 'Dynamic', 'Energetic']
        };
        
        const characteristicsContainer = document.getElementById('voice-characteristics');
        if (characteristicsContainer && voiceCharacteristics[voiceName]) {
            const characteristics = voiceCharacteristics[voiceName];
            characteristicsContainer.innerHTML = characteristics
                .map(trait => `<span class="inline-block bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">${trait}</span>`)
                .join('');
        }
    }
    
    setupVoiceCommands() {
        // Voice commands will be handled through OpenAI function calling
        // The VoiceManager will receive messages and route them to RecipeManager
        console.log('🎤 Voice commands integration ready');
    }
    
    // ========================================================================
    // MAIN APPLICATION FLOWS
    // ========================================================================
    
    async startRecipeFlow() {
        try {
            console.log('🎬 Starting recipe flow...');
            
            // Reset recipe state
            this.recipeManager.resetRecipe();
            
            // Navigate to recipe name input first
            this.uiController.showView('recipeName');
            
            // Enable microphone
            await this.voiceManager.enableMicrophone();
            
            // Connect to OpenAI
            await this.voiceManager.connect();
            
            // Wait for data channel to be ready, then configure voice session
            this.voiceManager.onDataChannelReady(() => {
                this.configureVoiceSession();
            });
            
            console.log('✅ Voice connection ready for recipe creation');
            
        } catch (error) {
            console.error('❌ Failed to start recipe flow:', error);
            if (error.name === 'NotAllowedError') {
                this.uiController.showErrorMessage('Microphone access is required for voice recipe creation. Please allow microphone access and try again.');
            } else {
                this.uiController.showErrorMessage('Failed to start recipe. Please try again.');
            }
            this.uiController.showView('connected');
        }
    }
    
    async startRecipe() {
        try {
            const recipeNameInput = document.getElementById('recipe-name-input');
            const recipeName = recipeNameInput?.value?.trim();
            
            if (!recipeName) {
                this.uiController.showErrorMessage('Please enter a recipe name first');
                return;
            }
            
            console.log('🎙️ Starting recipe:', recipeName);
            
            // Start recipe in RecipeManager
            const recipeId = this.recipeManager.startRecipe(recipeName);
            console.log('📝 Recipe started with ID:', recipeId, 'State should be: listening_for_ingredients');
            
            // Navigate to recipe main view
            this.uiController.showView('recipeMain');
            
        } catch (error) {
            console.error('❌ Error starting recipe:', error);
            this.uiController.showErrorMessage('Failed to start recipe. Please try again.');
        }
    }

    // Configure voice session with OpenAI Realtime API
    configureVoiceSession() {
        console.log('🎛️ Configuring voice session with voice:', this.selectedVoice || 'sage');
        
        // Create session configuration using VoiceCommands module
        const sessionConfig = this.voiceCommands.getSessionConfig(this.selectedVoice);
        
        this.voiceManager.updateSession(sessionConfig);
    }

    // Handle function call results from OpenAI Realtime API
    handleFunctionCallResult(event) {
        try {
            console.log('🔧 Function call result received:', event);
            
            // Process the function call through FunctionRouter
            const result = this.functionRouter.route(event);
            
            if (result && result.showModal) {
                // Show modal if requested by function call result
                this.uiController.showModal('recipeCompletion');
            }
            
            // Update UI with any changes
            this.updateRecipeDisplay();
            
        } catch (error) {
            console.error('❌ Error handling function call result:', error);
        }
    }

    // Update the recipe display in the UI
    updateRecipeDisplay() {
        try {
            const currentRecipe = this.recipeManager.getCurrentRecipe();
            console.log('🔄 Updating recipe display. Current recipe:', currentRecipe);
            
            if (currentRecipe) {
                // Always update ingredients display, even if empty
                this.uiController.updateIngredientsDisplay(currentRecipe.ingredients || []);
            } else {
                console.warn('⚠️ No current recipe found for display update');
            }
        } catch (error) {
            console.error('❌ Error updating recipe display:', error);
        }
    }
    
    async saveCurrentRecipe() {
        try {
            console.log('💾 Saving current recipe...');
            
            // Validate recipe before saving
            const currentRecipe = this.recipeManager.getCurrentRecipe();
            if (!currentRecipe.name) {
                this.uiController.showErrorMessage('Please enter a recipe name first');
                return;
            }
            
            if (currentRecipe.ingredients.length === 0) {
                this.uiController.showErrorMessage('Recipe must have at least one ingredient');
                return;
            }
            
            // Show saving indicator
            const saveBtn = document.getElementById('save-recipe-action-btn');
            if (saveBtn) {
                saveBtn.textContent = 'Saving...';
                saveBtn.disabled = true;
            }
            
            const currentUser = this.userManager.getCurrentUser();
            console.log('👤 Saving recipe for user:', currentUser);
            
            if (!currentUser) {
                throw new Error('No user selected. Please disconnect and select a user profile.');
            }
            
            const result = await this.recipeManager.saveRecipe(null, currentUser);
            
            if (result.success) {
                console.log('✅ Recipe saved successfully:', result.filename);
                this.uiController.showModal('recipeCompletion', currentRecipe);
                
                // Show success message
                this.uiController.showSuccessMessage(`Recipe "${currentRecipe.name}" saved successfully!`);
            } else {
                this.uiController.showErrorMessage(result.message || 'Failed to save recipe');
            }
            
        } catch (error) {
            console.error('❌ Failed to save recipe:', error);
            this.uiController.showErrorMessage('Failed to save recipe. Please try again.');
        } finally {
            // Reset save button
            const saveBtn = document.getElementById('save-recipe-action-btn');
            if (saveBtn) {
                saveBtn.textContent = 'Save Recipe';
                saveBtn.disabled = false;
            }
        }
    }
    
    async loadMyRecipes() {
        try {
            console.log('📚 Loading user recipes...');
            
            const currentUser = this.userManager.getCurrentUser();
            console.log('👤 Current user from UserManager:', currentUser);
            
            if (!currentUser) {
                console.warn('⚠️ No current user set, cannot load recipes');
                this.uiController.showErrorMessage('Please select a user profile first');
                return;
            }
            
            console.log('🔍 Fetching recipes for user:', currentUser);
            const recipes = await this.apiClient.getRecipes(currentUser);
            console.log('📋 Received recipes:', recipes);
            
            this.uiController.displayRecipes(recipes);
            
        } catch (error) {
            console.error('❌ Failed to load recipes:', error);
            this.uiController.showErrorMessage('Failed to load recipes.');
        }
    }
    
    async saveCurrentRecipe() {
        try {
            const currentUser = this.userManager.getCurrentUser();
            const result = await this.recipeManager.saveRecipe(null, currentUser);
            if (result.success) {
                this.uiController.showModal('recipeCompletion');
            }
        } catch (error) {
            console.error('❌ Failed to save recipe:', error);
            this.uiController.showToast('Failed to save recipe', 'error');
        }
    }
    
    async closeRecipe() {
        console.log('🔚 Closing recipe...');
        
        // Disconnect voice connection completely
        await this.voiceManager.disconnect();
        
        // Reset recipe state
        this.recipeManager.resetRecipe();
        
        // Return to main menu
        this.uiController.showView('connected');
    }
    
    async disconnect() {
        console.log('🔌 Disconnecting...');
        
        await this.voiceManager.disconnect();
        this.recipeManager.resetRecipe();
        this.uiController.showView('connect');
    }
    
    
    showAboutModal() {
        try {
            this.uiController.showModal('about-modal');
        } catch (error) {
            console.error('❌ Failed to show about modal:', error);
            // Fallback to direct DOM manipulation
            const modal = document.getElementById('about-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }
    }
    
    hideAboutModal() {
        try {
            this.uiController.hideModal('about-modal');
        } catch (error) {
            console.error('❌ Failed to hide about modal:', error);
            // Fallback to direct DOM manipulation
            const modal = document.getElementById('about-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }
    }
    
    handleCriticalError(error) {
        console.error('😨 Critical application error:', error);
        
        // Try to show error in UI
        try {
            if (this.uiController && this.uiController.showErrorMessage) {
                this.uiController.showErrorMessage('Application encountered a critical error. Please refresh the page.');
            }
        } catch (uiError) {
            console.error('❌ Failed to show critical error in UI:', uiError);
        }
        
        // Fallback error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed inset-0 bg-red-500 text-white p-8 z-50 flex items-center justify-center';
        errorDiv.innerHTML = `
            <div class="text-center">
                <h1 class="text-2xl font-bold mb-4">Application Error</h1>
                <p class="mb-4">${error.message || 'An unexpected error occurred'}</p>
                <button onclick="location.reload()" class="bg-white text-red-500 px-4 py-2 rounded">
                    Reload Application
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    // Function call argument accumulation for streaming
    streamingFunctionCall = null;
    
    accumulateFunctionCallArgs(message) {
        if (!this.streamingFunctionCall) {
            this.streamingFunctionCall = {
                name: null,
                arguments: ''
            };
        }
        
        if (message.delta) {
            this.streamingFunctionCall.arguments += message.delta;
            console.log('🔧 Accumulating args:', this.streamingFunctionCall.arguments);
        }
    }
    
    handleStreamingFunctionCall(message) {
        if (!this.streamingFunctionCall) {
            console.warn('⚠️ No streaming function call to complete');
            return;
        }
        
        // Extract function name from the message or context
        const functionName = message.name || this.streamingFunctionCall.name || 'addIngredient';
        
        console.log('🎯 Completing streaming function call:', functionName, this.streamingFunctionCall.arguments);
        
        try {
            const args = JSON.parse(this.streamingFunctionCall.arguments);
            
            // Validate arguments before processing
            if (this.shouldSkipIncompleteCall(functionName, args)) {
                console.log('⏭️ Skipping incomplete function call:', functionName, args);
                return;
            }
            
            // Create a properly formatted function call event
            const functionCallEvent = {
                type: 'function_call',
                name: functionName,
                arguments: args
            };
            
            // Process the function call
            this.handleFunctionCall(functionCallEvent);
            
        } catch (error) {
            console.error('❌ Failed to parse streaming function arguments:', error);
            console.error('Raw arguments:', this.streamingFunctionCall.arguments);
        }
        
        // Reset for next function call
        this.streamingFunctionCall = null;
    }
    
    shouldSkipIncompleteCall(functionName, args) {
        // Skip calls that are likely incomplete based on function requirements
        switch (functionName) {
            case 'removeIngredient':
            case 'deleteIngredient':
                return !args.name || args.name.trim() === '';
            case 'editIngredient':
            case 'changeIngredient':
                return !args.name || args.name.trim() === '';
            case 'addIngredient':
                return !args.name || args.name.trim() === '' || (!args.amount && !args.quantity);
            default:
                return false;
        }
    }
    
    // ========================================================================
    // EVENT HANDLERS & CALLBACKS
    // ========================================================================
    
    setupUserProfileEvents() {
        // No additional events needed here - handled in UIController
        console.log('👤 User profile events setup complete');
    }
    
    handleSaveUserProfile() {
        try {
            const selectedUser = document.querySelector('input[name="user-profile"]:checked');
            if (!selectedUser) {
                this.uiController.showToast('Please select a user profile', 'warning');
                return;
            }
            
            const username = selectedUser.value;
            console.log('👤 Saving user profile:', username);
            
            // Update user manager
            this.userManager.setCurrentUser(username);
            
            // Update UI display
            this.uiController.updateUserProfileDisplay();
            
            // Show success message
            this.uiController.showToast(`Profile switched to ${username}`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to save user profile:', error);
            this.uiController.showToast('Failed to save profile selection', 'error');
        }
    }
    
    handleRealtimeMessage(message) {
        console.log('📨 Handling realtime message:', message.type);
        
        switch (message.type) {
            case 'response.function_call_arguments.done':
                // Handle completed streaming function call
                this.handleStreamingFunctionCall(message);
                break;
                
            case 'response.output_item.added':
                if (message.item?.type === 'function_call' || message.call) {
                    this.handleFunctionCall(message);
                }
                break;
                
            case 'response.function_call_arguments.delta':
                // Accumulate streaming function call arguments
                this.accumulateFunctionCallArgs(message);
                break;
                
            case 'input_audio_buffer.speech_started':
                console.log('🎤 User started speaking');
                break;
                
            case 'conversation.item.input_audio_transcription.completed':
                console.log('📝 Transcript:', message.transcript);
                break;
                
            case 'response.audio_transcript.done':
                console.log('📝 Assistant response:', message.transcript);
                // Don't parse assistant responses as ingredients - only user input should be parsed
                break;
                
            case 'response.done':
                console.log('✅ Response completed');
                // No need to commit after response - wait for next user speech
                break;
                
            case 'error':
                console.error('❌ Realtime API error:', message.error);
                
                // Handle specific error types
                if (message.error?.code === 'input_audio_buffer_commit_empty') {
                    console.warn('⚠️ Attempted to commit empty audio buffer - ignoring');
                    // Reset audio counter to prevent future empty commits
                    if (this.voiceManager) {
                        this.voiceManager.audioSendCount = 0;
                    }
                } else if (message.error?.code === 'conversation_already_has_active_response') {
                    console.warn('⚠️ Response already in progress - waiting for completion');
                    // Don't show error to user, this is normal during rapid speech
                } else {
                    // Show user-friendly error for other issues
                    this.uiController.showToast('Voice connection issue. Please try reconnecting.', 'error');
                }
                break;
        }
    }
    
    handleFunctionCall(message) {
        console.log('🔧 Processing function call:', message);
        
        try {
            // Extract function call data from different message formats
            let functionCall = null;
            
            if (message.item?.type === 'function_call') {
                functionCall = {
                    name: message.item.name,
                    arguments: message.item.arguments
                };
            } else if (message.call) {
                functionCall = message.call;
            } else if (message.type === 'function_call') {
                functionCall = message;
            } else if (message.item?.function_call) {
                functionCall = message.item.function_call;
            }
            
            if (!functionCall) {
                console.warn('⚠️ No function call data found in message');
                return;
            }
            
            // Validate function call structure
            if (!functionCall.name) {
                console.error('❌ Function call missing name:', functionCall);
                return;
            }
            
            // Let FunctionRouter handle the function call with error handling
            const result = this.functionRouter.route(functionCall);
            
            // Handle both sync and async results
            Promise.resolve(result).then(resolvedResult => {
                if (resolvedResult && resolvedResult.success) {
                    console.log('✅ Function call executed successfully:', resolvedResult.message);
                    
                    // Always update UI for ingredient operations
                    this.updateRecipeDisplay();
                    
                    // Update UI if explicitly requested
                    if (resolvedResult.updateUI) {
                        this.updateRecipeDisplay();
                    }
                    
                    // Handle recipe closure
                    if (resolvedResult.closeRecipe) {
                        console.log('🚪 Closing recipe and returning to main menu');
                        this.returnToMainMenu();
                    }
                    
                    // Handle close recipe action
                    if (resolvedResult.closeRecipe) {
                        console.log('🚪 Executing close recipe action');
                        this.closeRecipe();
                        return;
                    }
                    
                    // Only show UI feedback for critical actions, not ingredient additions
                    if (functionCall.name === 'saveRecipe' || functionCall.name === 'closeRecipe' || functionCall.name === 'editIngredient' || functionCall.name === 'removeIngredient') {
                        this.uiController.showSuccessMessage(resolvedResult.message);
                    }
                } else {
                    console.log('❌ Function call failed:', resolvedResult.message);
                    
                    // Only show error messages for critical failures, not ingredient parsing issues
                    if (functionCall.name === 'saveRecipe' || functionCall.name === 'editIngredient' || functionCall.name === 'removeIngredient') {
                        this.uiController.showErrorMessage(`Action failed: ${resolvedResult.message}`);
                    }
                }
            }).catch(error => {
                console.error('❌ Function call promise rejected:', error);
                if (functionCall.name !== 'addIngredient') {
                    this.uiController.showErrorMessage(`Action failed: ${error.message}`);
                }
            });
            
        } catch (error) {
            console.error('❌ Error processing function call:', error);
            this.uiController.showErrorMessage('Failed to process voice command');
        }
    }
    
    handleViewChange(newView, previousView) {
        // Handle view-specific logic
        switch (newView) {
            case 'myRecipes':
                // Only load recipes if we're coming from a different view
                if (previousView !== 'myRecipes') {
                    this.loadMyRecipes();
                }
                break;
                
            case 'recipeMain':
                // Voice mode should already be active from recipe flow
                break;
                
            default:
                // Disable voice mode for non-recipe views
                if (newView !== 'recipeName' && newView !== 'recipeMain') {
                    this.voiceManager.stopAudioStreaming();
                }
                break;
        }
    }
    
    async handleRecipeCompletion(recipe) {
        try {
            console.log('🎉 Recipe completed, analyzing nutrition...');
            
            // Analyze nutrition
            const nutritionData = await this.recipeManager.analyzeNutrition();
            
            if (nutritionData) {
                console.log('✅ Nutrition analysis complete');
            }
            
            // Enable save button
            this.uiController.updateRecipeActionButtons(true);
            
        } catch (error) {
            console.error('❌ Error handling recipe completion:', error);
        }
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getApplicationState() {
        return {
            isInitialized: this.isInitialized,
            currentUser: this.currentUser,
            currentView: this.uiController.getCurrentView(),
            voiceState: this.voiceManager.getConnectionState(),
            recipeState: this.recipeManager.getRecipeState(),
            apiStatus: this.apiClient.getStatus()
        };
    }
    
    // Emergency cleanup method
    async cleanup() {
        console.log('🧹 Performing application cleanup...');
        
        try {
            await this.voiceManager.disconnect();
            this.apiClient.cancelAllRequests();
            this.recipeManager.resetRecipe();
            this.uiController.hideAllModals();
            
            console.log('✅ Cleanup complete');
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

// ============================================================================
// APPLICATION STARTUP
// ============================================================================

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Recipe Voice Assistant...');
    
    // Create global app instance
    window.recipeApp = new RecipeVoiceApp();
    
    // Handle page unload cleanup
    window.addEventListener('beforeunload', () => {
        if (window.recipeApp) {
            window.recipeApp.cleanup();
        }
    });
    
    console.log('✅ Recipe Voice Assistant started successfully');
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('❌ Uncaught error:', event.error);
    if (window.recipeApp) {
        // Could implement error reporting here
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    if (window.recipeApp) {
        // Could implement error reporting here
    }
});
