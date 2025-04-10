import OpenAI from 'openai';
import { env } from '../config/env';
import { ApiError } from '../utils/error';

interface BiasedArticle {
  bias: 'far left' | 'far right';
  headline: string;
  article: string;
}

export class BiasTransformationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Transform an article into both far-left and far-right versions
   */
  async transformArticle(originalTitle: string, originalContent: string): Promise<BiasedArticle[]> {
    try {
      if (!env.OPENAI_API_KEY) {
        throw new ApiError(500, 'OpenAI API key is not configured');
      }

      const prompt = `
        You are an expert in political rhetoric and media bias analysis. Your task is to rewrite a news article 
        in two distinct ideological styles while maintaining the core facts. Create both a far-left and far-right 
        version of the article.

        Far-left version should emphasize:
        - Social equality and justice
        - Environmental protection and climate activism
        - Anti-corporate sentiment and wealth redistribution
        - Progressive policy advocacy and community empowerment
        - Use terms like "community organizing", "systemic change", "collective action"

        Far-right version should emphasize:
        - National pride and traditional values
        - Strong national security and border protection
        - Free-market capitalism and individual liberties
        - Skepticism of progressive policies and government overreach
        - Use terms like "patriotic Americans", "constitutional rights", "traditional values"

        ORIGINAL TITLE:
        ${originalTitle}

        ORIGINAL CONTENT:
        ${originalContent}

        Return the result as valid JSON with this exact structure:
        {
          "versions": [
            {
              "bias": "far left",
              "headline": "[far-left headline]",
              "article": "[far-left article text]"
            },
            {
              "bias": "far right",
              "headline": "[far-right headline]",
              "article": "[far-right article text]"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.1,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const result = response.choices[0].message.content;
      if (!result) {
        throw new ApiError(500, 'Failed to generate biased versions: Empty response');
      }

      try {
        const parsed = JSON.parse(result);
        if (!Array.isArray(parsed.versions) || parsed.versions.length !== 2) {
          throw new Error('Invalid response format');
        }
        return parsed.versions;
      } catch (parseError) {
        throw new ApiError(500, 'Failed to parse biased versions response');
      }
    } catch (error: any) {
      console.error('Error generating biased versions:', error.message);
      throw new ApiError(500, `Failed to generate biased versions: ${error.message}`);
    }
  }

  /**
   * Generate appropriate imagery prompts for biased articles
   */
  async generateBiasedImagePrompt(bias: 'far left' | 'far right', title: string, content: string): Promise<string> {
    try {
      if (!env.OPENAI_API_KEY) {
        throw new ApiError(500, 'OpenAI API key is not configured');
      }

      const biasGuidelines = bias === 'far left' 
        ? `
          - Show diverse groups of people working together
          - Include environmental or social justice imagery
          - Emphasize community and collective action
          - Use warm, inclusive lighting and compositions
          - Include symbols of progress and change
        `
        : `
          - Show traditional American imagery and symbols
          - Include patriotic elements and strong borders
          - Emphasize individual achievement and strength
          - Use dramatic, high-contrast lighting
          - Include symbols of heritage and tradition
        `;

      const prompt = `
        You are creating a DALL-E prompt for a politically biased news article. Generate an image prompt that 
        matches the following ideological perspective while maintaining journalistic photo style.

        BIAS TYPE: ${bias}

        Style Guidelines:
        ${biasGuidelines}

        ARTICLE TITLE: ${title}
        ARTICLE EXCERPT: ${content.split('.').slice(0, 2).join('.')}

        Create a prompt that:
        1. Starts with "A photorealistic news photograph of..."
        2. Incorporates appropriate political imagery and symbols
        3. Specifies camera angle and lighting that matches the bias
        4. Includes subtle political messaging through composition
        5. Ends with "news photography style, 4K, highly detailed"

        IMAGE GENERATION PROMPT:
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 200
      });

      const imagePrompt = response.choices[0].message.content?.trim() || '';
      if (!imagePrompt) {
        throw new ApiError(500, 'Failed to generate biased image prompt: Empty response');
      }

      return imagePrompt;
    } catch (error: any) {
      console.error('Error generating biased image prompt:', error.message);
      throw new ApiError(500, `Failed to generate biased image prompt: ${error.message}`);
    }
  }
}
