import axios from 'axios';
import { env } from '../config/env'; // Assuming you have env setup similar to other services
import { ApiError } from '../utils/error';
import { Readable } from 'stream';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
// Default female voice - Rachel
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 

export class ElevenLabsService {
  private apiKey: string;

  constructor() {
    if (!env.ELEVENLABS_API_KEY) {
      throw new ApiError(500, 'ElevenLabs API key is not configured in environment variables.');
    }
    this.apiKey = env.ELEVENLABS_API_KEY;
  }

  /**
   * Generates speech audio stream from text using a specific voice.
   * @param text The text to convert to speech.
   * @param voiceId The ID of the voice to use (defaults to Rachel).
   * @returns A Readable stream containing the audio data (MP3).
   */
  async generateSpeechStream(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<Readable> {
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`;
    const headers = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': this.apiKey,
    };
    const body = JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2', // Or your preferred model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    // --- DEBUGGING --- 
    console.log(`[ElevenLabsService Debug] Using API Key: ${this.apiKey}`);
    // --- END DEBUGGING --- 

    try {
      console.log(`[ElevenLabsService] Requesting speech stream for voice ${voiceId}`);
      const response = await axios.post(url, body, {
        headers: headers,
        responseType: 'stream', // Important: Get the response as a stream
      });

      if (response.status !== 200) {
        // Attempt to read error message from stream if possible, otherwise use status text
        let errorDetail = response.statusText;
         try {
           const chunks = [];
           for await (const chunk of response.data) {
             chunks.push(chunk);
           }
           const errorBody = Buffer.concat(chunks).toString('utf-8');
           errorDetail = JSON.parse(errorBody)?.detail || errorBody || response.statusText;
         } catch (e) { /* Ignore parsing error */ }
        throw new ApiError(response.status, `ElevenLabs API error: ${errorDetail}`);
      }

      console.log(`[ElevenLabsService] Successfully received audio stream.`);
      return response.data as Readable; // Return the stream directly

    } catch (error: any) { 
      console.error('[ElevenLabsService] Error generating speech stream:', error.message);
      if (error instanceof ApiError) {
        throw error;
      }

      // Improved error detail extraction from Axios error
      let detail = error.message; // Default to basic message
      const status = error.response?.status || 500;

      if (error.response?.data) {
        const errorData = error.response.data;
        console.error('[ElevenLabsService] Raw error data from API:', errorData);
        try {
          if (errorData instanceof Readable) {
            // Attempt to read the stream fully
            const chunks = [];
            for await (const chunk of errorData) {
              chunks.push(chunk);
            }
            const errorBody = Buffer.concat(chunks).toString('utf-8');
            console.log('[ElevenLabsService] Error body from stream:', errorBody);
            // Try parsing as JSON, fallback to raw string
            try {
              const parsed = JSON.parse(errorBody);
              detail = parsed?.detail?.message || parsed?.detail || JSON.stringify(parsed) || errorBody;
            } catch (jsonError) {
              detail = errorBody; // Use raw body if not JSON
            }
          } else if (typeof errorData === 'object') {
             // Handle potential nested 'detail' object or message property
             detail = errorData?.detail?.message || errorData?.detail || JSON.stringify(errorData);
          } else {
             detail = errorData.toString(); // Fallback for plain text
          }
        } catch (extractionError: any) {
          console.error('[ElevenLabsService] Failed to extract detailed error:', extractionError.message);
          // Fallback to stringifying the raw data if possible
          try {
            detail = JSON.stringify(errorData);
          } catch { /* If stringify fails, keep the original error.message */ }
        }
      }

      throw new ApiError(status, `ElevenLabs API request failed: ${detail}`);
    }
  }
}
