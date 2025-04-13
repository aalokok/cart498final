import OpenAI from 'openai';
import { env } from '../config/env';
import { ApiError } from '../utils/error';
import { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { ImagesResponse } from 'openai/resources/images';

// Type alias for OpenAI API call functions we'll handle
type OpenApiCallFunction<TParams, TResponse> = (params: TParams) => Promise<TResponse>;

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      console.warn('OpenAI API key is not configured. OpenAI services will not function.');
      // Initialize openai object even without key to prevent runtime errors on property access
      // The actual calls will throw an error due to the check in _callOpenAIWithRetry
      this.openai = new OpenAI({ apiKey: 'dummy-key' }); 
    } else {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Private helper to call OpenAI API with retry logic for rate limits.
   */
  private async _callOpenAIWithRetry<TParams, TResponse, TResult>(
    apiCallFn: OpenApiCallFunction<TParams, TResponse>, // The specific OpenAI SDK method (e.g., this.openai.chat.completions.create)
    params: TParams, // Parameters for the SDK method
    extractResultFn: (response: TResponse) => TResult | undefined | null, // Function to extract the desired data from the response
    defaultValue: TResult, // Default value to return if extraction fails or after retries
    maxRetries = 3
  ): Promise<TResult> {
    if (!env.OPENAI_API_KEY) {
      // This check prevents calls if the key wasn't available at construction
      throw new ApiError(500, 'OpenAI API key is not configured');
    }

    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        // Bind the function to the openai instance to ensure `this` context is correct
        const response = await apiCallFn.call(this.openai, params);
        const result = extractResultFn(response);
        // Return the extracted result, or the default value if extraction yields null/undefined
        return result ?? defaultValue;
      } catch (error: any) {
        lastError = error;
        // Check for OpenAI specific rate limit error (status 429)
        // The error structure might vary, check common patterns
        const isRateLimitError = error.status === 429 || (error.response && error.response.status === 429);

        if (isRateLimitError) {
          retryCount++;
          if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`OpenAI rate limit hit. Retrying in ${waitTime / 1000}s (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry the loop
          } else {
            console.error(`OpenAI rate limit error after ${maxRetries} retries.`);
            break; // Exit loop, will throw lastError below
          }
        } else {
          console.error('Non-rate-limit OpenAI error:', error.message);
          break; // Exit loop for non-retryable errors, will throw lastError below
        }
      }
    }

    // If loop finished due to max retries or non-retryable error
    console.error(`Failed OpenAI API call: ${lastError?.message || 'Unknown error'}`);
    // Throw the last encountered error, wrapped in ApiError for consistency
    throw new ApiError(lastError?.status || 500, `OpenAI API call failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Transform article title using GPT-4
   */
  async transformTitle(originalTitle: string): Promise<string> {
    const prompt = `
      You are a news editor at a sensationalist, exaggerated news source that crafts headlines that grab attention
      through hyperbole and dramatic language. Your job is to take the following headline and make it more extreme,
      absurd and over-the-top without completely fabricating new facts. Maintain the core subject but amplify the
      emotional impact dramatically. The tone should be apocalyptic, conspiratorial, or absurdly confident.

      ORIGINAL HEADLINE:
      ${originalTitle}

      EXAGGERATED HEADLINE:
    `;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.2,
      max_tokens: 100
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        originalTitle // Default value
      );
    } catch (error: any) {
      // Catch ApiError thrown by helper and re-throw or handle
      console.error('Error transforming title with OpenAI:', error.message);
      // Ensure it's always an ApiError being thrown
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to transform title: ${error.message}`);
    }
  }

  /**
   * Transform article content using GPT-4
   */
  async transformContent(originalContent: string, title: string): Promise<string> {
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

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.3,
      max_tokens: 2000
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        originalContent // Default value
      );
    } catch (error: any) {
      console.error('Error transforming content with OpenAI:', error.message);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to transform content: ${error.message}`);
    }
  }

  /**
   * Generate image prompt for DALL-E based on article
   */
  async generateImagePrompt(title: string, content: string): Promise<string> {
    const prompt = `
      You are an AI assistant tasked with generating creative and surreal image prompts for a DALL-E image generator.
      The prompts should be based on news article content but should exaggerate and dramatize the visual elements
      to create striking, attention-grabbing images that match the surreal nature of the transformed articles.
      
      Guidelines:
      - Focus on visual elements that can be depicted
      - Use dramatic and vivid descriptive language
      - Include specific art style suggestions
      - Keep the prompt clear and focused
      - Aim for a surreal or exaggerated aesthetic
      - Maximum length: 100 words
      
      Article Title: ${title}
      
      Article Content:
      ${content.substring(0, 500)}... // Using first 500 chars for context
      
      Generate a DALL-E image prompt that captures the essence of this article in a surreal, exaggerated way:
    `;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.1,
      max_tokens: 200
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        'Surreal news headline visualization' // Default value
      );
    } catch (error: any) {
      console.error('Error generating image prompt with OpenAI:', error.message);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate image prompt: ${error.message}`);
    }
  }

  /**
   * Generate image using DALL-E based on prompt
   */
  async generateImage(prompt: string): Promise<string> {
    // Define parameters for the images.generate call
    const params = {
      model: 'dall-e-3' as const,
      prompt: prompt,
      n: 1,
      size: '1024x1024' as const,
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.images.generate, // Pass the correct SDK method
        params,
        (response: ImagesResponse) => response.data[0].url, // Extract URL from image response
        '' // Default value (empty string for URL)
      );
    } catch (error: any) {
      console.error('Error generating image with DALL-E:', error.message);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate image: ${error.message}`);
    }
  }

  /**
   * Generate an expanded explanation of an article based on its title and content
   */
  async generateArticleExplanation(title: string, content: string, category: string): Promise<string> {
    const prompt = `
      You are an expert news analyst and commentator with deep knowledge about ${category || 'current events'}.
      Your task is to provide an insightful explanation and analysis for this news article.
      
      Guidelines:
      - Provide context and background information that helps the reader understand the significance of this news
      - Analyze potential implications of the events described
      - Add relevant historical context or precedents if applicable
      - Explain complex concepts or technical terms in an accessible way
      - Maintain a balanced and informative tone
      - Aim for a thorough but concise explanation (around 300-500 words)
      - Do not fabricate specific facts, statistics, or quotes not mentioned in the original
      - When information is limited, acknowledge limitations while providing the best possible analysis
      
      Article Title: ${title}
      
      Article Content:
      ${content}
      
      Please provide your expanded explanation:
    `;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7, // Lower temperature for more factual responses
      max_tokens: 1500
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        'Unable to generate explanation.' // Default value
      );
    } catch (error: any) {
      console.error('Error generating article explanation with OpenAI:', error.message);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate explanation: ${error.message}`);
    }
  }

  /**
   * Generates a full news article based on a headline using OpenAI.
   * @param headline - The headline to generate the article from.
   */
  async generateFullArticleFromHeadline(headline: string): Promise<string> {
    const prompt = `
      You are a journalist who needs to write a complete news article based on just a headline.
      The article should be creative, informative, and plausible, while capturing the essence of what 
      the headline suggests. Write in a formal journalistic style with:

      - A compelling introduction that expands on the headline
      - 2-3 middle paragraphs with imagined but plausible details, quotes from fictional experts or witnesses
      - A conclusion that wraps up the story
      - Total length should be 400-600 words
      
      Write the full article for this headline: "${headline}"
      
      Make the article detailed and engaging, with fictional but realistic names, places, dates, and statistics
      where appropriate. The goal is to create a believable news article that could exist in the real world.
    `;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1500
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        'Unable to generate article.' // Default value
      );
    } catch (error: any) {
      console.error('Error generating full article with OpenAI:', error.message);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate full article: ${error.message}`);
    }
  }

  /**
   * Rewrites article content with an extreme right-wing bias using OpenAI.
   * @param content - The original article content.
   * @param title - The original article title.
   * @returns The rewritten article content.
   */
  async rewriteExtremeRightWing(content: string, title: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Truncate content to avoid exceeding token limits (adjust length as needed)
    const maxContentLength = 3000; // Approximate character limit
    const truncatedContent = content.length > maxContentLength ? content.substring(0, maxContentLength) + "..." : content;

    const systemPrompt = `You are an extremely partisan right-wing commentator. Your goal is to rewrite the provided news article from a fiercely conservative viewpoint. Exaggerate conservative talking points, use loaded language critical of liberal/progressive ideas, and frame the events in a way that strongly favors a right-wing interpretation. Maintain the core subject but twist the narrative significantly. Be hyperbolic and dismissive of opposing views.`;
    
    const userPrompt = `Original Title: ${title}
Original Article:
"""
${truncatedContent}
"""
Rewrite this article with an extreme right-wing bias:
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Or use a more powerful model if needed
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7, // Allow some creativity
        max_tokens: 1000, // Adjust as needed
      });
      
      return completion.choices[0].message?.content || 'Error: No content generated by AI.';

    } catch (error: any) {
        console.error("Error calling OpenAI for extreme right-wing rewrite:", error);
        throw new Error(`Failed to rewrite article content using OpenAI: ${error.message}`);
    }
  }

  /**
   * Rewrite an article with a right-wing bias
   */
  async rewriteWithRightWingBias(title: string, content: string): Promise<string> {
    const prompt = `
      You are a seasoned journalist working for a right-wing news outlet. Your task is to rewrite the 
      provided article with a distinctly conservative perspective, emphasizing values and viewpoints 
      that would resonate with a right-wing audience.

      Here are specific guidelines:
      
      1. Emphasize themes like individual liberty, free markets, traditional values, strong national security, 
         and limited government intervention
      2. Frame issues in terms of personal responsibility rather than systemic problems
      3. Be skeptical of government programs, regulations, and spending
      4. Use language that appeals to patriotism and traditional values
      5. Show support for law enforcement and military
      6. Express skepticism toward climate change policies that impact businesses
      7. Support tax cuts and deregulation as economic solutions
      8. Maintain a respectful but firm tone that questions progressive policies

      IMPORTANT: While rewriting with this perspective, you must:
      - Keep the core facts of the original story accurate
      - Avoid using inflammatory language or making unsubstantiated claims
      - Maintain journalistic standards of reporting
      - Do not invent quotes or statistics not in the original
      - Match the approximate length of the original piece

      Original Title: ${title}
      
      Original Article:
      ${content}

      Rewrite this article with a right-wing perspective while maintaining factual accuracy.
    `;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a skilled journalist who can rewrite news articles with political perspective while maintaining factual accuracy.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        'Unable to rewrite article.' // Default value
      );
    } catch (error: any) {
      console.error('Error rewriting article with right-wing bias:', error.message);
      // Adding the specific JSON stringify for OpenAI response only if it exists
      if (error.response) {
        console.error('OpenAI API error response:', JSON.stringify(error.response, null, 2));
      }
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to rewrite article: ${error.message}`);
    }
  }

  async rewriteExtremeLeftWing(content: string, title: string): Promise<string> {
    const prompt = `
    Original Title: ${title}
    Original Content:
    ${content}

    Rewrite the above article with an extreme left-wing political bias. Focus on systemic issues, social justice, critiques of capitalism, and collective action. The tone should be highly critical of existing power structures and advocate strongly for progressive change. Maintain the core topic but reinterpret all facts and events through this specific ideological lens. The rewritten article should be approximately the same length as the original.

    Rewritten Article (Extreme Left-Wing Bias):
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an AI assistant specialized in rewriting news articles with a specific, extreme political bias while retaining the core subject matter." 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 1024, 
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });

      const rewrittenContent = response.choices[0]?.message?.content?.trim();
      if (!rewrittenContent) {
        throw new Error("OpenAI response content is empty or invalid for extreme left-wing rewrite.");
      }
      console.log(`[OpenAIService] Extreme Left-Wing rewrite generated for: ${title}`);
      return rewrittenContent;
    } catch (error) {
      console.error("Error calling OpenAI for extreme left-wing rewrite:", error);
      throw new Error("Failed to generate extreme left-wing rewrite from OpenAI.");
    }
  }

  /**
   * Generate comprehensive explanations
   */
  async generateExplanation(content: string, title: string): Promise<string> {
    const prompt = `
      You are an expert news analyst and commentator with deep knowledge about current events.
      Your task is to provide an insightful explanation and analysis for this news article.
      
      Guidelines:
      - Provide context and background information that helps the reader understand the significance of this news
      - Analyze potential implications of the events described
      - Add relevant historical context or precedents if applicable
      - Explain complex concepts or technical terms in an accessible way
      - Maintain a balanced and informative tone
      - Aim for a thorough but concise explanation (around 300-500 words)
      - Do not fabricate specific facts, statistics, or quotes not mentioned in the original
      - When information is limited, acknowledge limitations while providing the best possible analysis
      
      Article Title: ${title}
      
      Article Content:
      ${content}
      
      Please provide your expanded explanation:
    `;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7, // Lower temperature for more factual responses
      max_tokens: 1500
    };

    try {
      return await this._callOpenAIWithRetry(
        this.openai.chat.completions.create,
        params,
        (response: ChatCompletion) => response.choices[0].message.content?.trim(),
        'Unable to generate explanation.' // Default value
      );
    } catch (error: any) {
      console.error('Error generating article explanation with OpenAI:', error.message);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate explanation: ${error.message}`);
    }
  }

  /**
   * Rewrite headline with bias
   */
  async rewriteHeadlineWithBias(headline: string, bias: 'left' | 'right'): Promise<string> {
    const prompt = `Rewrite the following news headline to be extremely exaggerated and satirical from a ${bias}-wing perspective:

Headline: "${headline}"

Rewrite:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4', // Or specify 'gpt-4' if needed and available
        messages: [
          {
            role: 'system',
            content: 'You are a satirical news writer specializing in politically biased and exaggerated headlines.'
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.8, // Slightly higher temperature for more creative/exaggerated output
      });

      return completion.choices[0]?.message?.content?.trim() || 'Error: No content generated by AI.';
    } catch (error: any) {
      console.error(
        `Error rewriting headline with ${bias} bias using OpenAI: ${error.message}`
      );
      throw new Error(`Failed to rewrite headline with ${bias} bias: ${error.message}`);
    }
  }
}