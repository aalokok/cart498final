import OpenAI from 'openai';
import { env } from '../config/env';
import { ApiError } from '../utils/error';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Transform article title using GPT-4o
   */
  async transformTitle(originalTitle: string): Promise<string> {
    try {
      if (!env.OPENAI_API_KEY) {
        throw new ApiError(500, 'OpenAI API key is not configured');
      }

      const prompt = `
        You are a news editor at a sensationalist, exaggerated news source that crafts headlines that grab attention
        through hyperbole and dramatic language. Your job is to take the following headline and make it more extreme,
        absurd and over-the-top without completely fabricating new facts. Maintain the core subject but amplify the
        emotional impact dramatically. The tone should be apocalyptic, conspiratorial, or absurdly confident.

        ORIGINAL HEADLINE:
        ${originalTitle}

        EXAGGERATED HEADLINE:
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.2,
        max_tokens: 100
      });

      const transformedTitle = response.choices[0].message.content?.trim() || originalTitle;
      return transformedTitle;
    } catch (error: any) {
      console.error('Error transforming title with OpenAI:', error.message);
      throw new ApiError(500, `Failed to transform title: ${error.message}`);
    }
  }

  /**
   * Transform article content using GPT-4o
   */
  async transformContent(originalContent: string, title: string): Promise<string> {
    try {
      if (!env.OPENAI_API_KEY) {
        throw new ApiError(500, 'OpenAI API key is not configured');
      }

      const prompt = `
        You are an AI assistant tasked with transforming normal news articles into exaggerated, surreal versions
        that push boundaries while keeping the core information intact. Your goal is to create content that showcases
        how AI can be used to distort reality and create sensationalist media.
        
        Guidelines:
        - Maintain the general topic and key figures of the original article
        - Drastically exaggerate claims, statistics, and impacts
        - Use hyperbolic language and extreme adjectives
        - Add surreal or absurd elements that highlight the article's transformation
        - Include hints of conspiracy theories or dramatic doom scenarios
        - Make the content read like an extreme version of tabloid journalism
        - Keep the length similar to the original content
        
        TITLE: ${title}
        
        ORIGINAL CONTENT:
        ${originalContent}
        
        TRANSFORMED CONTENT:
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.3,
        max_tokens: 2000
      });

      const transformedContent = response.choices[0].message.content?.trim() || originalContent;
      return transformedContent;
    } catch (error: any) {
      console.error('Error transforming content with OpenAI:', error.message);
      throw new ApiError(500, `Failed to transform content: ${error.message}`);
    }
  }

  /**
   * Generate image prompt for DALL-E based on article
   */
  async generateImagePrompt(title: string, content: string): Promise<string> {
    try {
      if (!env.OPENAI_API_KEY) {
        throw new ApiError(500, 'OpenAI API key is not configured');
      }

      const prompt = `
        You are a specialist in creating prompts for AI image generation. Your task is to craft a detailed,
        visually rich prompt that will generate a surreal, exaggerated, and attention-grabbing news image
        based on the article below. The image should be news-like but with absurd, extreme elements.
        
        ARTICLE TITLE: ${title}
        
        CONTENT EXCERPT: ${content.substring(0, 500)}...
        
        Create a prompt that:
        1. Captures the main subject matter of the article
        2. Adds surreal, exaggerated, or satirical visual elements
        3. Includes specific details about style (photorealistic news photograph)
        4. Specifies dramatic lighting, angle, or composition
        5. Is between 50-100 words
        
        IMAGE GENERATION PROMPT:
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 200
      });

      const imagePrompt = response.choices[0].message.content?.trim() || '';
      return imagePrompt;
    } catch (error: any) {
      console.error('Error generating image prompt:', error.message);
      throw new ApiError(500, `Failed to generate image prompt: ${error.message}`);
    }
  }

  /**
   * Generate image using DALL-E 3
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      if (!env.OPENAI_API_KEY) {
        throw new ApiError(500, 'OpenAI API key is not configured');
      }

      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid'
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new ApiError(500, 'Failed to generate image: No URL returned');
      }

      return imageUrl;
    } catch (error: any) {
      console.error('Error generating image with DALL-E:', error.message);
      throw new ApiError(500, `Failed to generate image: ${error.message}`);
    }
  }
} 