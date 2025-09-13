// ============================================================================
// VOICE COMMANDS CONFIGURATION
// ============================================================================
// Centralized configuration for all voice commands and OpenAI function definitions
// This module provides a clean separation between command logic and configuration
// ============================================================================

class VoiceCommands {
    constructor() {
        console.log('🎤 VoiceCommands configuration loading...');
        
        // System instructions for OpenAI
        this.systemInstructions = this.buildSystemInstructions();
        
        // Function definitions for OpenAI
        this.functionDefinitions = this.buildFunctionDefinitions();
        
        console.log('✅ VoiceCommands configuration loaded');
    }
    
    // ========================================================================
    // SYSTEM INSTRUCTIONS
    // ========================================================================
    
    buildSystemInstructions() {
        return `You are a voice-controlled recipe assistant. Your job is to capture ingredients and recipe commands through voice input.

=== CORE BEHAVIOR ===
- Listen for ingredients and amounts, call addIngredient() immediately
- Be completely silent unless calling functions
- NEVER respond with text, only function calls
- Process commands instantly without confirmation

=== INGREDIENT RECOGNITION ===
ONLY recognize clear patterns like:
- "2 cups flour" → addIngredient(flour, 2, cups)
- "250 grams butter" → addIngredient(butter, 250, grams)
- "3 eggs" → addIngredient(eggs, 3, items)
DO NOT respond to: "hello", "hi", "how are you", casual conversation

=== VOICE COMMANDS ===
- "edit [ingredient] [amount]" → Call: editIngredient(name, amount, unit)
- "remove [ingredient]" → Call: removeIngredient(name)
- "save recipe" → Call: saveRecipe()
- "close recipe" → Call: closeRecipe()

Be silent, capture everything, call functions immediately.`;
    }
    
    // ========================================================================
    // FUNCTION DEFINITIONS
    // ========================================================================
    
    buildFunctionDefinitions() {
        return [
            {
                type: 'function',
                name: 'addIngredient',
                description: 'Add a new ingredient to the current recipe',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Name of the ingredient' },
                        amount: { type: 'number', description: 'Amount/quantity of the ingredient' },
                        unit: { type: 'string', description: 'Unit of measurement (grams, ml, cups, etc.)' }
                    },
                    required: ['name', 'amount', 'unit']
                }
            },
            {
                type: 'function',
                name: 'editIngredient',
                description: 'Edit an existing ingredient amount or unit',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Ingredient name to edit' },
                        amount: { type: 'number', description: 'New amount' },
                        unit: { type: 'string', description: 'New unit (optional)' }
                    },
                    required: ['name', 'amount']
                }
            },
            {
                type: 'function',
                name: 'removeIngredient',
                description: 'Remove an ingredient from the recipe',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Ingredient name to remove' }
                    },
                    required: ['name']
                }
            },
            {
                type: 'function',
                name: 'saveRecipe',
                description: 'Save the current recipe with nutrition analysis',
                parameters: { type: 'object', properties: {} }
            },
            {
                type: 'function',
                name: 'closeRecipe',
                description: 'Close the current recipe and return to main menu',
                parameters: { type: 'object', properties: {} }
            }
        ];
    }
    
    // ========================================================================
    // COMMAND PATTERNS
    // ========================================================================
    
    getCommandPatterns() {
        return {
            addIngredient: [
                "{amount} {unit} {ingredient}",
                "{amount} {ingredient}",
                "add {amount} {unit} {ingredient}",
                "add {amount} {ingredient}"
            ],
            editIngredient: [
                "edit {ingredient} {amount} {unit}",
                "edit {ingredient} {amount}",
                "change {ingredient} to {amount} {unit}",
                "change {ingredient} to {amount}",
                "update {ingredient} {amount} {unit}",
                "update {ingredient} {amount}"
            ],
            removeIngredient: [
                "remove {ingredient}",
                "delete {ingredient}",
                "take out {ingredient}"
            ],
            saveRecipe: [
                "save recipe",
                "save this recipe",
                "save it"
            ],
            closeRecipe: [
                "close recipe",
                "close this recipe",
                "finish recipe",
                "done with recipe"
            ]
        };
    }
    
    // ========================================================================
    // VOICE SETTINGS
    // ========================================================================
    
    getVoiceSettings() {
        return {
            voice: 'sage',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
                type: 'server_vad',
                threshold: 0.4,
                prefix_padding_ms: 600,
                silence_duration_ms: 1500
            },
            temperature: 0.7,
            max_response_output_tokens: 150
        };
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getSystemInstructions() {
        return this.systemInstructions;
    }
    
    getFunctionDefinitions() {
        return this.functionDefinitions;
    }
    
    getSessionConfig(selectedVoice = 'sage') {
        const voiceSettings = this.getVoiceSettings();
        return {
            modalities: ['text', 'audio'],
            instructions: this.systemInstructions,
            voice: selectedVoice || voiceSettings.voice,
            input_audio_format: voiceSettings.input_audio_format,
            output_audio_format: voiceSettings.output_audio_format,
            input_audio_transcription: voiceSettings.input_audio_transcription,
            turn_detection: voiceSettings.turn_detection,
            tools: this.functionDefinitions,
            temperature: voiceSettings.temperature,
            max_response_output_tokens: voiceSettings.max_response_output_tokens
        };
    }
}

// Export for use in main app
window.VoiceCommands = VoiceCommands;
