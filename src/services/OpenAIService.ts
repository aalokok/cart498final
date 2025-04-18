import OpenAI from 'openai';
import { env } from '../config/env';
import { ApiError } from '../utils/error';
import { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
// ImagesResponse no longer needed if generateImage functions are removed
// import { ImagesResponse } from 'openai/resources/images';

// Type alias no longer needed if _callOpenAIWithRetry is removed
// type OpenApiCallFunction<TParams, TResponse> = (params: TParams) => Promise<TResponse>;

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      console.warn('OpenAI API key is not configured. OpenAI services will not function.');
      this.openai = new OpenAI({ apiKey: 'dummy-key' }); 
    } else {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Rewrites article content with an extreme political bias (left or right) using OpenAI.
   * @param content - The original article content.
   * @param title - The original article title.
   * @param bias - The political bias to apply ('left' or 'right').
   * @returns The rewritten article content.
   */
  async rewriteExtreme(content: string, title: string, bias: 'left' | 'right'): Promise<string> {
    if (!this.openai) {
      if (!env.OPENAI_API_KEY) {
          throw new ApiError(500, 'OpenAI API key is not configured');
      }
      throw new Error('OpenAI client not initialized'); 
    }

    const maxContentLength = 3000;
    const truncatedContent = content.length > maxContentLength ? content.substring(0, maxContentLength) + "..." : content;

    let systemPrompt: string;
    let model: string;
    let temperature: number;
    let maxTokens: number;

    if (bias === 'left') {
      systemPrompt = `You are an AI assistant specialized in rewriting news articles with a specific, 
      extreme left-wing political bias while retaining the core subject matter. 
      Focus on systemic issues, social justice, critiques of capitalism, and collective action.
      The tone should be highly critical of existing power structures and advocate strongly for progressive change. 
      Maintain the core topic but reinterpret all facts and events through this specific ideological lens. 
      The rewritten article should be approximately the same length as the original.`;
      model = "gpt-4o-mini";
      temperature = 0.7;
      maxTokens = 2000;
    } else { // bias === 'right'
      systemPrompt = `You are an extremely partisan right-wing commentator. 
      Your goal is to rewrite the provided news article from a fiercely conservative viewpoint. 
      Exaggerate conservative talking points, use loaded language critical of liberal/progressive ideas, 
      and frame the events in a way that strongly favors a right-wing interpretation. 
       Maintain the core subject but twist the narrative significantly. Be hyperbolic and dismissive of opposing views.`;
      model = "gpt-4o-mini";
      temperature = 0.7;
      maxTokens = 2000;
    }

    const userPrompt = `Original Title: ${title}
Original Article:
"""
${truncatedContent}
"""
Rewrite this article with an extreme ${bias}-wing bias:
`;

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
    };

    try {
      const completion = await this.openai.chat.completions.create(params);

      const rewrittenContent = completion.choices[0].message?.content?.trim();
      if (!rewrittenContent) {
        throw new Error(`OpenAI response content is empty or invalid for extreme ${bias}-wing rewrite.`);
      }
      console.log(`[OpenAIService] Extreme ${bias}-Wing rewrite generated for: ${title}`);
      return rewrittenContent;

    } catch (error: any) {
        console.error(`Error calling OpenAI for extreme ${bias}-wing rewrite:`, error);
        if (error.response) {
             throw new ApiError(error.response.status || 500, `OpenAI API Error (${bias}-wing): ${error.response.data?.error?.message || error.message}`);
        }
        throw new Error(`Failed to rewrite article content using OpenAI (${bias}-wing): ${error.message}`);
    }
  }
}