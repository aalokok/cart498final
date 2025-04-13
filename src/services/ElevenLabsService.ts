// /Users/diegocrisafulli/Documents/repo/cart498final/src/services/ElevenLabsService.ts
import fetch from 'node-fetch'; // Use node-fetch for backend requests
import { env } from '../config/env';
import logger from '../config/logger'; // Correct path
import { Readable } from 'stream'; // Import Readable from stream

const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Default voice ID (Bella)

class ElevenLabsService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = env.ELEVENLABS_API_KEY;
    if (!this.apiKey) {
      logger.warn('ElevenLabs API key is not configured. Text-to-speech services will not function.');
    }
  }

  /**
   * Generates speech audio stream from text using the ElevenLabs API.
   * @param text The text to synthesize.
   * @param voiceId The ID of the voice to use (optional, defaults to DEFAULT_VOICE_ID).
   * @returns A Readable stream of the audio data, or null if an error occurs or API key is missing.
   */
  async generateSpeechStream(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
  ): Promise<Readable | null> {
    if (!this.apiKey) {
      logger.error('Cannot generate speech: ElevenLabs API key is missing.');
      return null;
    }

    const url = `${ELEVENLABS_API_BASE_URL}/text-to-speech/${voiceId}/stream`;
    const headers = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': this.apiKey,
    };
    const body = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1', // Or another suitable model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        // Log the error response body for more details
        const errorBody = await response.text();
        logger.error(
          `ElevenLabs API error (${response.status} ${response.statusText}): ${errorBody}`
        );
        return null;
      }

      // Ensure response.body is correctly typed or cast if needed for piping
      // Node-fetch response.body is already a Readable stream
      return response.body as Readable;

    } catch (error: any) {
      logger.error(`Error calling ElevenLabs API: ${error.message}`);
      return null;
    }
  }

  // Add other methods if needed, like fetching voices, etc.
}

// Export a singleton instance
export const elevenLabsService = new ElevenLabsService();
