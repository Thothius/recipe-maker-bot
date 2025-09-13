// ============================================================================
// MODAL MANAGER - Modal Handling & Management
// ============================================================================
// Handles all modal-related functionality:
// - Modal display and hiding
// - Modal state management
// - Modal data binding
// - Modal event handling
// ============================================================================

class ModalManager {
    constructor() {
        console.log('🔲 ModalManager initializing...');
        
        // Modal state
        this.activeModals = new Set();
        this.modalData = new Map();
        
        // Modal elements cache
        this.modals = new Map();
        
        // Event callbacks
        this.onModalShow = null;
        this.onModalHide = null;
        
        // Initialize modal elements
        this.initializeModals();
        this.setupModalEventListeners();
        
        console.log('✅ ModalManager initialized');
    }
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    initializeModals() {
        // Cache all modal elements
        const modalElements = document.querySelectorAll('.modal-overlay, [id*="modal"]');
        modalElements.forEach(modal => {
            const modalName = modal.id;
            if (modalName) {
                this.modals.set(modalName, modal);
            }
        });
        
        console.log('🔲 Cached', this.modals.size, 'modal elements');
    }
    
    setupModalEventListeners() {
        // Setup close button listeners for all modals
        document.addEventListener('click', (event) => {
            // Close modal when clicking overlay
            if (event.target.classList.contains('modal-overlay')) {
                const modalId = event.target.id;
                if (modalId) {
                    this.hideModal(modalId);
                } else {
                    // If no ID on overlay, find the modal by checking active modals
                    if (this.activeModals.size > 0) {
                        const lastModal = Array.from(this.activeModals).pop();
                        this.hideModal(lastModal);
                    }
                }
            }
            
            // Close modal when clicking close button
            if (event.target.id && event.target.id.includes('close-')) {
                // Handle different close button patterns
                let modalId;
                
                // Map specific close button IDs to modal IDs
                const closeButtonMappings = {
                    'close-recipe-saved-modal': 'recipeCompletion',
                    'close-recipe-detail-modal': 'recipe-detail-modal',
                    'close-recipe-completion-modal': 'recipe-completion-modal',
                    'close-about-modal': 'about-modal',
                    'close-confirmation-modal': 'confirmation-modal'
                };
                
                if (closeButtonMappings[event.target.id]) {
                    modalId = closeButtonMappings[event.target.id];
                } else {
                    // Fallback: If no specific mapping, close the most recent modal
                    if (this.activeModals.size > 0) {
                        modalId = Array.from(this.activeModals).pop();
                        console.log('🔲 Fallback close for button:', event.target.id, '-> closing modal:', modalId);
                    } else {
                        console.warn('⚠️ No active modals to close for button:', event.target.id);
                        return;
                    }
                }
                
                this.hideModal(modalId);
            }
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.activeModals.size > 0) {
                const lastModal = Array.from(this.activeModals).pop();
                this.hideModal(lastModal);
            }
        });
    }
    
    // ========================================================================
    // MODAL DISPLAY
    // ========================================================================
    
    showModal(modalName, data = null) {
        if (!modalName) {
            console.error('❌ Modal name is required');
            return false;
        }
        
        console.log('🔲 Showing modal:', modalName);
        
        const modal = this.getModalElement(modalName);
        if (!modal) {
            console.error('❌ Modal not found:', modalName);
            return false;
        }
        
        // Store modal data if provided
        if (data) {
            this.modalData.set(modalName, data);
            this.populateModalData(modalName, data);
        }
        
        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        this.activeModals.add(modalName);
        
        // Add body scroll lock
        document.body.style.overflow = 'hidden';
        
        // Trigger callback
        if (this.onModalShow) {
            this.onModalShow(modalName, data);
        }
        
        console.log('✅ Modal shown:', modalName);
        return true;
    }
    
    hideModal(modalName) {
        if (!modalName) {
            console.error('❌ Modal name is required');
            return false;
        }
        
        console.log('🔲 Hiding modal:', modalName);
        
        const modal = this.getModalElement(modalName);
        if (!modal) {
            console.error('❌ Modal not found:', modalName);
            return false;
        }
        
        // Hide modal
        modal.classList.add('hidden');
        modal.style.display = 'none';
        this.activeModals.delete(modalName);
        
        // Remove modal data
        this.modalData.delete(modalName);
        
        // Remove body scroll lock if no modals are active
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }
        
        // Trigger callback
        if (this.onModalHide) {
            this.onModalHide(modalName);
        }
        
        console.log('✅ Modal hidden:', modalName);
        return true;
    }
    
    hideAllModals() {
        const modalsToHide = Array.from(this.activeModals);
        modalsToHide.forEach(modalName => {
            this.hideModal(modalName);
        });
        
        console.log('🔲 All modals hidden');
    }
    
    // ========================================================================
    // MODAL DATA BINDING
    // ========================================================================
    
    populateModalData(modalName, data) {
        const modal = this.getModalElement(modalName);
        if (!modal || !data) return;
        
        // Handle specific modal types
        switch (modalName) {
            case 'recipe-detail-modal':
                this.populateRecipeDetailModal(modal, data);
                break;
            case 'recipe-completion-modal':
                this.populateRecipeCompletionModal(modal, data);
                break;
            case 'confirmation-modal':
                this.populateConfirmationModal(modal, data);
                break;
            default:
                // Generic data population
                this.populateGenericModal(modal, data);
        }
    }
    
    populateRecipeDetailModal(modal, recipe) {
        // Recipe name
        const nameElement = modal.querySelector('#detail-recipe-name');
        if (nameElement) nameElement.textContent = recipe.name || 'Untitled Recipe';
        
        // Created date
        const dateElement = modal.querySelector('#detail-created-date');
        if (dateElement && recipe.created) {
            const date = new Date(recipe.created).toLocaleDateString();
            dateElement.textContent = date;
        }
        
        // Servings
        const servingsElement = modal.querySelector('#detail-servings');
        if (servingsElement) {
            servingsElement.textContent = recipe.nutrition?.servings || 'Not specified';
        }
        
        // Ingredients
        const ingredientsContainer = modal.querySelector('#detail-ingredients-list');
        if (ingredientsContainer && recipe.ingredients) {
            ingredientsContainer.innerHTML = '';
            recipe.ingredients.forEach(ingredient => {
                const ingredientDiv = document.createElement('div');
                ingredientDiv.className = 'flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm';
                ingredientDiv.innerHTML = `
                    <span class="font-medium">${ingredient.name}</span>
                    <span class="text-gray-600">${ingredient.amount} ${ingredient.unit}</span>
                `;
                ingredientsContainer.appendChild(ingredientDiv);
            });
        }
        
        // Nutrition info
        if (recipe.nutrition) {
            this.populateNutritionInfo(modal, recipe.nutrition);
        }
    }
    
    populateRecipeCompletionModal(modal, recipe) {
        // Just show success message for now
        const messageElement = modal.querySelector('h3');
        if (messageElement) {
            messageElement.textContent = `Recipe "${recipe.name || 'Untitled'}" Completed!`;
        }
    }
    
    populateConfirmationModal(modal, data) {
        const titleElement = modal.querySelector('#confirmation-title');
        const messageElement = modal.querySelector('#confirmation-message');
        
        if (titleElement && data.title) titleElement.textContent = data.title;
        if (messageElement && data.message) messageElement.textContent = data.message;
        
        // Setup confirmation callbacks
        const confirmBtn = modal.querySelector('#confirmation-confirm');
        const cancelBtn = modal.querySelector('#confirmation-cancel');
        
        if (confirmBtn && data.onConfirm) {
            confirmBtn.onclick = () => {
                data.onConfirm();
                this.hideModal('confirmation-modal');
            };
        }
        
        if (cancelBtn && data.onCancel) {
            cancelBtn.onclick = () => {
                data.onCancel();
                this.hideModal('confirmation-modal');
            };
        }
    }
    
    populateGenericModal(modal, data) {
        // Generic data binding for simple modals
        Object.keys(data).forEach(key => {
            const element = modal.querySelector(`#${key}`);
            if (element) {
                element.textContent = data[key];
            }
        });
    }
    
    populateNutritionInfo(modal, nutrition) {
        const nutritionSection = modal.querySelector('#detail-nutrition-section');
        if (!nutritionSection) return;
        
        nutritionSection.classList.remove('hidden');
        
        // Populate nutrition fields
        const fields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium'];
        fields.forEach(field => {
            const element = modal.querySelector(`#detail-${field}`);
            if (element && nutrition[field]) {
                element.textContent = nutrition[field];
            }
        });
    }
    
    // ========================================================================
    // MODAL UTILITIES
    // ========================================================================
    
    getModalElement(modalName) {
        // Try cached element first
        if (this.modals.has(modalName)) {
            return this.modals.get(modalName);
        }
        
        // Try to find by ID
        const element = document.getElementById(modalName);
        if (element) {
            this.modals.set(modalName, element);
            return element;
        }
        
        return null;
    }
    
    isModalActive(modalName) {
        return this.activeModals.has(modalName);
    }
    
    getModalData(modalName) {
        return this.modalData.get(modalName);
    }
    
    // ========================================================================
    // SPECIALIZED MODALS
    // ========================================================================
    
    showConfirmationModal(title, message, onConfirm, onCancel) {
        return this.showModal('confirmation-modal', {
            title,
            message,
            onConfirm,
            onCancel
        });
    }
    
    showRecipeDetailModal(recipe) {
        return this.showModal('recipe-detail-modal', recipe);
    }
    
    showRecipeCompletionModal(recipe) {
        return this.showModal('recipe-completion-modal', recipe);
    }
    
    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    
    setModalEventHandlers(handlers) {
        this.onModalShow = handlers.onModalShow;
        this.onModalHide = handlers.onModalHide;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getActiveModals() {
        return Array.from(this.activeModals);
    }
    
    hasActiveModals() {
        return this.activeModals.size > 0;
    }
    
    getAllModals() {
        return Array.from(this.modals.keys());
    }
}

// Export for use in UIController
window.ModalManager = ModalManager;
