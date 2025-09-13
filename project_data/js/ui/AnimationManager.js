// ============================================================================
// ANIMATION MANAGER - Typing Effects & UI Animations
// ============================================================================
// Handles all animation-related functionality:
// - Typing effects for text elements
// - Animation state management
// - Smooth transitions and effects
// - Performance-optimized animations
// ============================================================================

class AnimationManager {
    constructor() {
        console.log('✨ AnimationManager initializing...');
        
        // Animation state
        this.activeAnimations = new Map();
        this.typingTimeouts = new Map();
        
        // Animation settings
        this.defaultTypingSpeed = 50;
        this.defaultCursorBlinkSpeed = 500;
        
        console.log('✅ AnimationManager initialized');
    }
    
    // ========================================================================
    // TYPING EFFECTS
    // ========================================================================
    
    startTypingEffect(element, text, speed = null) {
        if (!element || !text) {
            console.warn('⚠️ Invalid typing effect parameters');
            return false;
        }
        
        const typingSpeed = speed || this.defaultTypingSpeed;
        const elementId = element.id || this.generateElementId(element);
        
        // Stop any existing animation for this element
        this.stopTypingEffect(elementId);
        
        console.log('⌨️ Starting typing effect for:', elementId);
        
        // Clear element content
        element.textContent = '';
        
        let charIndex = 0;
        const typeChar = () => {
            if (charIndex < text.length) {
                element.textContent += text.charAt(charIndex);
                charIndex++;
                
                const timeout = setTimeout(typeChar, typingSpeed);
                this.typingTimeouts.set(elementId, timeout);
            } else {
                // Animation complete
                this.typingTimeouts.delete(elementId);
                console.log('✅ Typing effect completed for:', elementId);
            }
        };
        
        // Start typing
        typeChar();
        return true;
    }
    
    stopTypingEffect(elementId) {
        if (this.typingTimeouts.has(elementId)) {
            clearTimeout(this.typingTimeouts.get(elementId));
            this.typingTimeouts.delete(elementId);
            console.log('⏹️ Stopped typing effect for:', elementId);
        }
    }
    
    stopAllTypingEffects() {
        this.typingTimeouts.forEach((timeout, elementId) => {
            clearTimeout(timeout);
            console.log('⏹️ Stopped typing effect for:', elementId);
        });
        this.typingTimeouts.clear();
    }
    
    // ========================================================================
    // CURSOR EFFECTS
    // ========================================================================
    
    startCursorBlink(cursorElement, speed = null) {
        if (!cursorElement) return false;
        
        const blinkSpeed = speed || this.defaultCursorBlinkSpeed;
        const elementId = cursorElement.id || this.generateElementId(cursorElement);
        
        // Stop existing blink animation
        this.stopCursorBlink(elementId);
        
        const blink = () => {
            cursorElement.style.opacity = cursorElement.style.opacity === '0' ? '1' : '0';
            const timeout = setTimeout(blink, blinkSpeed);
            this.activeAnimations.set(`cursor_${elementId}`, timeout);
        };
        
        blink();
        return true;
    }
    
    stopCursorBlink(elementId) {
        const animationKey = `cursor_${elementId}`;
        if (this.activeAnimations.has(animationKey)) {
            clearTimeout(this.activeAnimations.get(animationKey));
            this.activeAnimations.delete(animationKey);
        }
    }
    
    // ========================================================================
    // SPECIALIZED TYPING EFFECTS
    // ========================================================================
    
    typeTagline(element, texts, speed = 50) {
        if (!element || !Array.isArray(texts) || texts.length === 0) {
            return false;
        }
        
        const elementId = element.id || this.generateElementId(element);
        let currentTextIndex = 0;
        
        const typeNextText = () => {
            if (currentTextIndex < texts.length) {
                const text = texts[currentTextIndex];
                this.startTypingEffect(element, text, speed);
                
                // Schedule next text after current one completes
                const totalTime = text.length * speed + 2000; // Add 2s pause
                const timeout = setTimeout(() => {
                    currentTextIndex++;
                    typeNextText();
                }, totalTime);
                
                this.activeAnimations.set(`tagline_${elementId}`, timeout);
            } else {
                // Loop back to first text
                currentTextIndex = 0;
                setTimeout(typeNextText, 3000); // 3s pause before restart
            }
        };
        
        typeNextText();
        return true;
    }
    
    typeWelcomeMessage(element, username, speed = 50) {
        if (!element || !username) return false;
        
        const messages = [
            `Welcome back, ${username}!`,
            `Ready to create something delicious?`,
            `What shall we cook today?`
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        return this.startTypingEffect(element, randomMessage, speed);
    }
    
    // ========================================================================
    // FADE EFFECTS
    // ========================================================================
    
    fadeIn(element, duration = 300) {
        if (!element) return false;
        
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        
        // Force reflow
        element.offsetHeight;
        
        element.style.opacity = '1';
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
        
        return true;
    }
    
    fadeOut(element, duration = 300) {
        if (!element) return false;
        
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
        
        return true;
    }
    
    // ========================================================================
    // SLIDE EFFECTS
    // ========================================================================
    
    slideIn(element, direction = 'up', duration = 300) {
        if (!element) return false;
        
        const transforms = {
            up: 'translateY(20px)',
            down: 'translateY(-20px)',
            left: 'translateX(20px)',
            right: 'translateX(-20px)'
        };
        
        element.style.transform = transforms[direction] || transforms.up;
        element.style.opacity = '0';
        element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
        
        // Force reflow
        element.offsetHeight;
        
        element.style.transform = 'translate(0, 0)';
        element.style.opacity = '1';
        
        setTimeout(() => {
            element.style.transition = '';
            element.style.transform = '';
        }, duration);
        
        return true;
    }
    
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    
    generateElementId(element) {
        // Generate a unique ID for elements without one
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `anim_${timestamp}_${random}`;
    }
    
    clearAllAnimations() {
        // Stop all typing effects
        this.stopAllTypingEffects();
        
        // Stop all other animations
        this.activeAnimations.forEach((timeout, key) => {
            clearTimeout(timeout);
        });
        this.activeAnimations.clear();
        
        console.log('🧹 All animations cleared');
    }
    
    // ========================================================================
    // ANIMATION PRESETS
    // ========================================================================
    
    animateSuccess(element, message) {
        if (!element) return false;
        
        element.textContent = message;
        element.style.color = '#10b981'; // Green
        this.slideIn(element, 'up', 200);
        
        setTimeout(() => {
            this.fadeOut(element, 200);
        }, 3000);
        
        return true;
    }
    
    animateError(element, message) {
        if (!element) return false;
        
        element.textContent = message;
        element.style.color = '#ef4444'; // Red
        this.slideIn(element, 'up', 200);
        
        // Add shake effect
        element.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            element.style.animation = '';
            this.fadeOut(element, 200);
        }, 3000);
        
        return true;
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getActiveAnimations() {
        return {
            typing: Array.from(this.typingTimeouts.keys()),
            other: Array.from(this.activeAnimations.keys())
        };
    }
    
    setDefaultSpeeds(typingSpeed, cursorSpeed) {
        if (typingSpeed) this.defaultTypingSpeed = typingSpeed;
        if (cursorSpeed) this.defaultCursorBlinkSpeed = cursorSpeed;
    }
}

// Export for use in UIController
window.AnimationManager = AnimationManager;
