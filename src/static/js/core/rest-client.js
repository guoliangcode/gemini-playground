import { Logger } from '../utils/logger.js';
import { CONFIG } from '../config/config.js';

/**
 * REST API client for Gemini models that don't support WebSocket Live API
 * This client mimics the WebSocket client interface for compatibility
 */
export class RestApiClient extends EventTarget {
    constructor() {
        super();
        this.apiKey = null;
        this.config = null;
        this.isConnected = false;
        this.baseUrl = 'https://generativelanguage.googleapis.com';
    }

    /**
     * Emit an event to listeners
     */
    emit(eventName, data) {
        this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    /**
     * Add event listener (compatible with WebSocket client interface)
     */
    on(eventName, callback) {
        this.addEventListener(eventName, (event) => callback(event.detail));
    }

    /**
     * Connect to the API (simulated connection)
     */
    async connect(config, apiKey) {
        this.apiKey = apiKey;
        this.config = config;

        try {
            // Test the API key by making a simple request
            const testUrl = `${this.baseUrl}/v1beta/models?key=${this.apiKey}`;
            const response = await fetch(testUrl);

            if (!response.ok) {
                throw new Error(`API connection failed: ${response.statusText}`);
            }

            this.isConnected = true;
            this.emit('open', {});
            this.emit('setupcomplete', {});
            Logger.info('Connected to Gemini REST API');

        } catch (error) {
            Logger.error('Connection error:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the API
     */
    disconnect() {
        this.isConnected = false;
        this.emit('close', { code: 1000 });
        Logger.info('Disconnected from Gemini REST API');
    }

    /**
     * Send a text message to the API
     */
    async send(message) {
        if (!this.isConnected) {
            Logger.error('Not connected to API');
            return;
        }

        const text = message.text || message;

        try {
            await this.generateContent(text);
        } catch (error) {
            Logger.error('Send error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Generate content using REST API with streaming
     */
    async generateContent(text) {
        const modelName = this.config.model.replace('models/', '');
        const url = `${this.baseUrl}/v1beta/models/${modelName}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

        const requestBody = {
            contents: [{
                parts: [{ text }]
            }],
            generationConfig: {
                temperature: 1.0,
                maxOutputTokens: 8192,
            }
        };

        // Add system instruction if provided
        if (this.config.systemInstruction) {
            requestBody.systemInstruction = this.config.systemInstruction;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
            }

            // Process SSE stream
            await this.processSSEStream(response);

        } catch (error) {
            Logger.error('Generate content error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Process Server-Sent Events stream
     */
    async processSSEStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') {
                            continue;
                        }

                        try {
                            const json = JSON.parse(data);

                            if (json.candidates && json.candidates[0]?.content?.parts) {
                                const parts = json.candidates[0].content.parts;

                                for (const part of parts) {
                                    if (part.text) {
                                        fullText += part.text;

                                        // Emit content event (compatible with WebSocket client)
                                        this.emit('content', {
                                            modelTurn: {
                                                parts: [{ text: part.text }]
                                            }
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            Logger.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }

            // Emit turn complete event
            this.emit('turncomplete', {});
            Logger.info('Response complete:', fullText);

        } catch (error) {
            Logger.error('Stream processing error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Send realtime input (not supported in REST API, just log a warning)
     */
    sendRealtimeInput(data) {
        Logger.warn('Realtime input (audio/video) is not supported in REST API mode');
        // Silently ignore - this maintains compatibility with the main.js code
    }
}
