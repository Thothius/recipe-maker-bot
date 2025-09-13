/**
 * UserManager - Handles user profile management and selection
 */
class UserManager {
    constructor() {
        this.currentUser = null;
        this.availableUsers = ['ted', 'maiken'];
        this.storageKey = 'cookbooker_current_user';
        
        // Load saved user or default to first available
        this.loadCurrentUser();
    }
    
    /**
     * Load current user from localStorage or set default
     */
    loadCurrentUser() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved && this.availableUsers.includes(saved)) {
                this.currentUser = saved;
            } else {
                this.currentUser = this.availableUsers[0]; // Default to 'ted'
            }
            console.log('👤 Current user:', this.currentUser);
        } catch (error) {
            console.warn('⚠️ Failed to load user from storage, using default');
            this.currentUser = this.availableUsers[0];
        }
    }
    
    /**
     * Set current user and save to localStorage
     */
    setCurrentUser(username) {
        if (!username || !this.availableUsers.includes(username)) {
            throw new Error(`Invalid user: ${username}. Available users: ${this.availableUsers.join(', ')}`);
        }
        
        this.currentUser = username;
        
        try {
            localStorage.setItem(this.storageKey, username);
            console.log('👤 User changed to:', username);
        } catch (error) {
            console.warn('⚠️ Failed to save user to storage');
        }
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Get list of available users
     */
    getAvailableUsers() {
        return [...this.availableUsers];
    }
    
    /**
     * Add a new user to available users list
     */
    addUser(username) {
        if (!username || typeof username !== 'string') {
            throw new Error('Username must be a non-empty string');
        }
        
        const sanitized = username.trim().toLowerCase();
        if (!this.availableUsers.includes(sanitized)) {
            this.availableUsers.push(sanitized);
            console.log('👤 Added new user:', sanitized);
        }
    }
    
    /**
     * Check if user exists
     */
    userExists(username) {
        return this.availableUsers.includes(username);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
