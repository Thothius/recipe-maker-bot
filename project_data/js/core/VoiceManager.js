// ============================================================================
// VOICE MANAGER - WebRTC & OpenAI Realtime API Integration
// ============================================================================
// Handles all voice-related functionality:
// - WebRTC connection to OpenAI Realtime API
// - Audio streaming and processing
// - Voice status management
// - Auto-reconnection and health monitoring
// ============================================================================

class VoiceManager {
    constructor() {
        console.log('🎤 VoiceManager initializing...');
        
        // Connection state
        this.isConnected = false;
        this.isMuted = false;
        this.isStreaming = false;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;
        this.healthCheckInterval = null;
        
        // WebRTC components
        this.peerConnection = null;
        this.dataChannel = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.audioProcessor = null;
        
        // Audio output for OpenAI responses
        this.audioOutputContext = null;
        this.audioOutputQueue = [];
        
        // Session data
        this.sessionData = null;
        this.audioElements = [];
        this.audioSendCount = 0;
        
        // Event callbacks
        this.onConnectionStateChange = null;
        this.onMessageReceived = null;
        this.onError = null;
        this.dataChannelReadyCallbacks = [];
        
        console.log('✅ VoiceManager initialized');
    }
    
    // ========================================================================
    // DATA CHANNEL READY CALLBACK
    // ========================================================================
    
    onDataChannelReady(callback) {
        if (this.isConnected && this.dataChannel && this.dataChannel.readyState === 'open') {
            // Data channel is already ready, execute callback immediately
            callback();
        } else {
            // Store callback to execute when data channel opens
            this.dataChannelReadyCallbacks.push(callback);
        }
    }
    
    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================
    
    async connect() {
        try {
            console.log('🔌 Starting connection to OpenAI Realtime API...');
            this.connectionAttempts++;
            
            // Get session token from backend with retry logic
            const response = await fetch('/session', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.sessionData = await response.json();
            console.log('✅ Session token received');
            
            // Create peer connection
            this.pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            // Setup connection event handlers
            this.setupConnectionHandlers();
            
            // Create dummy audio track (required by OpenAI)
            await this.createDummyAudioTrack();
            
            // Create data channel
            this.dataChannel = this.pc.createDataChannel('oai-events', { ordered: true });
            this.setupDataChannelHandlers();
            
            // Create and send offer
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            
            // Send offer to OpenAI
            const rtcResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    'Authorization': `Bearer ${this.sessionData.token}`,
                    'Content-Type': 'application/sdp',
                    'OpenAI-Beta': 'realtime=v1'
                }
            });
            
            if (!rtcResponse.ok) {
                const errorText = await rtcResponse.text();
                throw new Error(`WebRTC setup failed: ${rtcResponse.status} - ${errorText}`);
            }
            
            const answerSdp = await rtcResponse.text();
            await this.pc.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp
            });
            
            console.log('✅ WebRTC connection established');
            
        } catch (error) {
            console.error('❌ Connection failed:', error);
            await this.handleConnectionError(error);
            throw error;
        }
    }
    
    async disconnect() {
        console.log('🔌 Disconnecting from OpenAI Realtime API...');
        
        this.stopHealthCheck();
        this.stopAudioStreaming();
        this.stopMicrophone();
        
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        this.isConnected = false;
        this.connectionAttempts = 0;
        
        if (this.onConnectionStateChange) {
            this.onConnectionStateChange('disconnected');
        }
        
        console.log('✅ Disconnected successfully');
    }
    
    async reconnect() {
        console.log('🔄 Attempting to reconnect...');
        
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
            console.error('❌ Max reconnection attempts reached');
            if (this.onError) {
                this.onError(new Error('Max reconnection attempts reached'));
            }
            return false;
        }
        
        try {
            await this.disconnect();
            await new Promise(resolve => setTimeout(resolve, 1000 * this.connectionAttempts));
            await this.connect();
            return true;
        } catch (error) {
            console.error('❌ Reconnection failed:', error);
            return false;
        }
    }
    
    // ========================================================================
    // AUDIO MANAGEMENT
    // ========================================================================
    
    async enableMicrophone() {
        try {
            // Check if microphone is already enabled
            if (this.mediaStream && this.mediaStream.active) {
                console.log('🎤 Microphone already enabled');
                return true;
            }
            
            // Check for browser support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser does not support microphone access');
            }
            
            if (!this.mediaStream) {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 24000,
                        channelCount: 1
                    }
                });
                console.log('✅ Microphone access granted');
                
                // Add error handler for stream
                this.mediaStream.getTracks().forEach(track => {
                    track.addEventListener('ended', () => {
                        console.warn('⚠️ Microphone track ended unexpectedly');
                        this.handleMicrophoneDisconnection();
                    });
                });
            }
            
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 24000
                });
                console.log('🔊 Audio context created');
                
                // Handle audio context state changes
                this.audioContext.addEventListener('statechange', () => {
                    console.log('🔊 Audio context state:', this.audioContext.state);
                });
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('🔊 Audio context resumed');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to enable microphone:', error);
            
            // Provide user-friendly error messages
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone access denied. Please allow microphone access and try again.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No microphone found. Please connect a microphone and try again.');
            } else if (error.name === 'NotReadableError') {
                throw new Error('Microphone is being used by another application.');
            }
            
            throw error;
        }
    }
    
    startAudioStreaming() {
        if (!this.mediaStream || !this.audioContext || !this.isConnected) {
            console.warn('⚠️ Cannot start audio streaming - missing requirements');
            return false;
        }
        
        // Check if already streaming
        if (this.isRecording && this.audioProcessor) {
            console.log('🎤 Audio streaming already active');
            return true;
        }
        
        try {
            // Clean up existing processor
            if (this.audioProcessor) {
                this.audioProcessor.disconnect();
                this.audioProcessor = null;
            }
            
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            // Use smaller buffer size for better responsiveness
            this.audioProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
            
            // Track consecutive silent frames to prevent spam
            let consecutiveSilentFrames = 0;
            const maxSilentFrames = 10;
            
            this.audioProcessor.onaudioprocess = (event) => {
                if (!this.isConnected || this.isMuted || !this.dataChannel || this.dataChannel.readyState !== 'open') {
                    return;
                }
                
                const inputData = event.inputBuffer.getChannelData(0);
                
                // Check for silence to avoid sending empty audio
                let hasAudio = false;
                let maxAmplitude = 0;
                let audioEnergy = 0;
                
                for (let i = 0; i < inputData.length; i++) {
                    const amplitude = Math.abs(inputData[i]);
                    audioEnergy += amplitude * amplitude;
                    if (amplitude > 0.001) {
                        hasAudio = true;
                    }
                    maxAmplitude = Math.max(maxAmplitude, amplitude);
                }
                
                // Calculate RMS (Root Mean Square) for better silence detection
                const rms = Math.sqrt(audioEnergy / inputData.length);
                const hasSignificantAudio = rms > 0.015 && maxAmplitude > 0.008;
                
                if (!hasSignificantAudio) {
                    consecutiveSilentFrames++;
                    // Skip sending if we've had too many silent frames in a row
                    if (consecutiveSilentFrames > maxSilentFrames) {
                        return;
                    }
                } else {
                    consecutiveSilentFrames = 0;
                    this.audioSendCount++;
                }
                
                // Convert to PCM16 with better precision and bounds checking
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const sample = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = Math.round(sample * 32767);
                }
                
                // Convert to base64 and send with comprehensive error handling
                try {
                    const uint8Array = new Uint8Array(pcmData.buffer);
                    const base64Audio = btoa(String.fromCharCode.apply(null, uint8Array));
                    
                    this.sendMessage({
                        type: 'input_audio_buffer.append',
                        audio: base64Audio
                    });
                    
                    this.audioSendCount = (this.audioSendCount || 0) + 1;
                } catch (error) {
                    console.error('❌ Error sending audio data:', error);
                    
                    // If we consistently fail to send audio, stop streaming
                    this.audioSendErrors = (this.audioSendErrors || 0) + 1;
                    if (this.audioSendErrors > 10) {
                        console.error('❌ Too many audio send errors, stopping stream');
                        this.stopAudioStreaming();
                    }
                }
            };
            
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            this.isRecording = true;
            this.audioSendErrors = 0;
            this.audioSendCount = 0; // Initialize audio send counter
            
            console.log('✅ Audio streaming started');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to start audio streaming:', error);
            this.isRecording = false;
            return false;
        }
    }
    
    stopAudioStreaming() {
        if (this.audioProcessor) {
            try {
                this.audioProcessor.disconnect();
            } catch (error) {
                console.warn('⚠️ Error disconnecting audio processor:', error);
            }
            this.audioProcessor = null;
        }
        this.isRecording = false;
        console.log('🛑 Audio streaming stopped');
    }
    
    stopMicrophone() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
            console.log('🎤 Microphone stopped');
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        console.log(`🔇 Microphone ${this.isMuted ? 'muted' : 'unmuted'}`);
        return this.isMuted;
    }
    
    // ========================================================================
    // AUDIO OUTPUT (OpenAI Voice Responses)
    // ========================================================================
    
    async initializeOutputAudio() {
        if (!this.outputAudioContext) {
            this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    async playAudioChunk(base64Audio) {
        try {
            await this.initializeOutputAudio();
            
            // Decode base64 to PCM16
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Convert PCM16 to Float32 for Web Audio API
            const pcm16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / 32768.0;
            }
            
            // Create audio buffer and play
            const audioBuffer = this.outputAudioContext.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            source.start();
            
        } catch (error) {
            console.error('❌ Error playing audio chunk:', error);
        }
    }
    
    // ========================================================================
    // MESSAGE HANDLING
    // ========================================================================
    
    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                this.dataChannel.send(JSON.stringify(message));
            } catch (error) {
                console.error('❌ Error sending message:', error);
                // Attempt reconnection if send fails
                if (this.connectionAttempts < this.maxConnectionAttempts) {
                    setTimeout(() => this.reconnect(), 1000);
                }
            }
        } else {
            console.error('❌ Data channel not ready for message:', this.dataChannel?.readyState);
        }
    }
    
    updateSession(sessionConfig) {
        console.log('📤 Sending session update:', sessionConfig);
        this.sendMessage({
            type: 'session.update',
            session: sessionConfig
        });
    }
    
    // ========================================================================
    // HEALTH MONITORING
    // ========================================================================
    
    startHealthCheck() {
        this.stopHealthCheck(); // Clear any existing interval
        
        this.healthCheckInterval = setInterval(() => {
            if (this.pc && this.pc.connectionState === 'failed') {
                console.warn('⚠️ Connection health check failed - attempting reconnection');
                this.reconnect();
            }
        }, 5000);
        
        console.log('💓 Health monitoring started');
    }
    
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    
    setupConnectionHandlers() {
        this.pc.addEventListener('connectionstatechange', () => {
            console.log('🔗 Connection state:', this.pc.connectionState);
            
            if (this.pc.connectionState === 'connected') {
                this.isConnected = true;
                this.connectionAttempts = 0;
                this.startHealthCheck();
                if (this.onConnectionStateChange) {
                    this.onConnectionStateChange('connected');
                }
            } else if (this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') {
                this.isConnected = false;
                if (this.onConnectionStateChange) {
                    this.onConnectionStateChange('disconnected');
                }
            }
        });
        
        this.pc.addEventListener('track', (event) => {
            console.log('🎵 Received audio track from OpenAI');
            const audioElement = new Audio();
            audioElement.srcObject = event.streams[0];
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            
            audioElement.play().catch(e => {
                console.error('❌ Failed to play audio:', e);
            });
            
            this.audioElements.push(audioElement);
            document.body.appendChild(audioElement);
        });
    }
    
    setupDataChannelHandlers() {
        this.dataChannel.addEventListener('open', () => {
            console.log('🎉 Data channel opened');
            this.isConnected = true;
            
            // Start audio streaming now that data channel is ready
            this.startAudioStreaming();
            
            // Trigger any pending callbacks waiting for data channel
            if (this.dataChannelReadyCallbacks) {
                this.dataChannelReadyCallbacks.forEach(callback => callback());
                this.dataChannelReadyCallbacks = [];
            }
            
            // Send initial session configuration with better settings
            this.updateSession({
                modalities: ['text', 'audio'],
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
            });
        });
        
        this.dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 Received message:', message.type);
                
                // Handle audio output
                if (message.type === 'response.audio.delta' && message.delta) {
                    this.playAudioChunk(message.delta);
                }
                
                // Handle connection health
                if (message.type === 'error') {
                    console.error('🚨 OpenAI API error:', message.error);
                    if (message.error.type === 'connection_error') {
                        this.reconnect();
                    }
                }
                
                if (this.onMessageReceived) {
                    this.onMessageReceived(message);
                }
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        };
        
        this.dataChannel.addEventListener('error', (error) => {
            console.error('❌ Data channel error:', error);
            if (this.onError) {
                this.onError(error);
            }
        });
    }
    
    async createDummyAudioTrack() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const destination = audioContext.createMediaStreamDestination();
            
            oscillator.connect(gainNode);
            gainNode.connect(destination);
            gainNode.gain.value = 0; // Silent
            oscillator.frequency.value = 440;
            oscillator.start();
            
            destination.stream.getTracks().forEach(track => {
                this.pc.addTrack(track, destination.stream);
            });
            
            console.log('✅ Dummy audio track created');
        } catch (error) {
            console.error('❌ Failed to create dummy audio track:', error);
        }
    }
    
    async handleConnectionError(error) {
        console.error('❌ Connection error:', error);
        
        // Stop audio streaming during connection issues
        this.stopAudioStreaming();
        
        if (this.connectionAttempts < this.maxConnectionAttempts) {
            const backoffDelay = Math.min(2000 * Math.pow(2, this.connectionAttempts), 30000);
            console.log(`🔄 Attempting reconnection (${this.connectionAttempts}/${this.maxConnectionAttempts}) in ${backoffDelay}ms`);
            
            this.reconnectionTimeout = setTimeout(() => {
                this.reconnect();
            }, backoffDelay);
        } else {
            console.error('❌ Max connection attempts reached, giving up');
            if (this.onError) {
                this.onError(new Error(`Failed to connect after ${this.maxConnectionAttempts} attempts`));
            }
        }
    }
    
    handleMicrophoneDisconnection() {
        console.warn('⚠️ Microphone disconnected');
        this.stopAudioStreaming();
        
        if (this.onError) {
            this.onError(new Error('Microphone disconnected unexpectedly'));
        }
    }
    
    cleanup() {
        console.log('🧹 Cleaning up VoiceManager resources');
        
        // Clear timeouts
        if (this.reconnectionTimeout) {
            clearTimeout(this.reconnectionTimeout);
            this.reconnectionTimeout = null;
        }
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        // Stop audio streaming
        this.stopAudioStreaming();
        
        // Stop microphone
        this.stopMicrophone();
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(e => {
                console.warn('⚠️ Error closing audio context:', e);
            });
        }
        
        // Clean up audio elements
        this.audioElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        this.audioElements = [];
        
        // Close peer connection
        if (this.pc && this.pc.connectionState !== 'closed') {
            this.pc.close();
        }
        
        // Reset state
        this.isConnected = false;
        this.isRecording = false;
        this.connectionAttempts = 0;
        
        console.log('✅ VoiceManager cleanup complete');
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    getConnectionState() {
        return {
            isConnected: this.isConnected,
            isRecording: this.isRecording,
            isMuted: this.isMuted,
            connectionAttempts: this.connectionAttempts
        };
    }
    
    setEventHandlers(handlers) {
        this.onConnectionStateChange = handlers.onConnectionStateChange;
        this.onMessageReceived = handlers.onMessageReceived;
        this.onError = handlers.onError;
    }
}

// Export for use in main app
window.VoiceManager = VoiceManager;
