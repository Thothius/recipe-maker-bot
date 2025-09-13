// AudioWorklet processor for modern audio processing
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.audioLevel = 0;
        this.silenceThreshold = 0.1;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputData = input[0];
            
            // Calculate audio level to detect actual speech
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            this.audioLevel = rms * 100;
            
            // Only send audio if there's actual sound above threshold
            if (this.audioLevel > this.silenceThreshold) {
                // Convert to PCM16
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }
                
                // Send audio data to main thread
                this.port.postMessage({
                    type: 'audioData',
                    data: pcm16.buffer,
                    audioLevel: this.audioLevel
                });
            }
        }
        
        return true; // Keep processor alive
    }
}

registerProcessor('audio-processor', AudioProcessor);
