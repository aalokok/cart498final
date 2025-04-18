import { createStore } from "vuex";
import axios from "axios";

interface Article {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  urlToImage?: string;
  publishedAt?: string;
  sourceName?: string;
  source?: {
    name?: string;
    category?: string;
  };
  isProcessed: boolean;
  processingStatus: string;
  transformedTitle?: string;
  transformedContent?: string;
  generatedImageUrl?: string;
  category?: string;
}

interface RewriteRequestState {
  isLoading: boolean;
  content: string | null;
  error: string | null;
}

export type RewriteMode = 'none' | 'right' | 'left';

interface State {
  articles: Article[];
  filteredArticles: Article[];
  currentArticle: Article | null;
  loading: boolean;
  error: string | null;
  rewriteStates: Record<string, RewriteRequestState>;
  currentRewriteMode: RewriteMode;
  selectedCategory: string | null;
}

const API_URL = process.env.VUE_APP_API_URL || "http://localhost:3000/api";

export default createStore<State>({
  state: {
    articles: [],
    filteredArticles: [],
    currentArticle: null,
    loading: false,
    error: null,
    rewriteStates: {},
    currentRewriteMode: 'right',
    selectedCategory: null, // Default to null (no category selected)
  },
  mutations: {
    SET_ARTICLES(state, articles: Article[]) {
      state.articles = articles;
      state.filteredArticles = articles;
    },
    SET_FILTERED_ARTICLES(state, articles: Article[]) {
      state.filteredArticles = articles;
    },
    SET_CURRENT_ARTICLE(state, article: Article) {
      state.currentArticle = article;
    },
    SET_LOADING(state, isLoading: boolean) {
      state.loading = isLoading;
    },
    SET_ERROR(state, error: string | null) {
      state.error = error;
    },
    CLEAR_ERROR(state) {
      state.error = null;
    },
    INIT_REWRITE_STATE(state, articleId: string) {
      state.rewriteStates = {
        ...state.rewriteStates,
        [articleId]: { isLoading: false, content: null, error: null },
      };
    },
    SET_REWRITE_LOADING(state, { articleId, isLoading }: { articleId: string, isLoading: boolean }) {
      if (state.rewriteStates[articleId]) {
        state.rewriteStates[articleId].isLoading = isLoading;
      }
    },
    SET_REWRITE_CONTENT(state, { articleId, content }: { articleId: string, content: string | null }) {
      if (state.rewriteStates[articleId]) {
        state.rewriteStates[articleId].content = content;
        state.rewriteStates[articleId].error = null; // Clear error on success
        state.rewriteStates[articleId].isLoading = false; // Set loading false
      }
    },
    SET_REWRITE_ERROR(state, { articleId, error }: { articleId: string, error: string | null }) {
      if (state.rewriteStates[articleId]) {
        state.rewriteStates[articleId].error = error;
        state.rewriteStates[articleId].content = null; // Clear content on error
        state.rewriteStates[articleId].isLoading = false; // Set loading false
      }
    },
    SET_REWRITE_MODE(state, mode: RewriteMode) {
      state.currentRewriteMode = mode;
      // Optionally: Clear existing rewrite states when mode changes
      // state.rewriteStates = {}; 
      console.log(`[Store Mutation] Rewrite mode set to: ${mode}`);
    },
    RESET_FILTERED_ARTICLES(state) {
      state.filteredArticles = state.articles; // Reset filtered to show all
      console.log('[Store Mutation] Filtered articles reset.');
    },
    SET_SELECTED_CATEGORY(state, categoryId: string | null) {
      state.selectedCategory = categoryId;
      console.log(`[Store Mutation] Selected category set to: ${categoryId}`);
    }
  },
  actions: {
    async fetchArticles({ commit }, category = "general") {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await axios.get(`${API_URL}/articles`, {
          params: { category },
        });
        commit("SET_ARTICLES", response.data.data);
        return response.data;
      } catch (error: any) {
        commit(
          "SET_ERROR",
          error.response?.data?.error || "Failed to fetch articles"
        );
        console.error("Error fetching articles:", error);
        return null;
      } finally {
        commit("SET_LOADING", false);
      }
    },
    async fetchAllArticlesAtOnce({ commit, dispatch }) {
      console.log('[Store Action] Fetching all articles (no limit) via fetchAllArticlesFromDatabase');
      // Dispatch the action that actually hits the /articles/all endpoint
      return dispatch("fetchAllArticlesFromDatabase"); 
    },
    async fetchAllCategoriesArticles({ commit, dispatch }) {
      console.log('[Store Action] Fetching all categories articles via fetchAllArticlesFromDatabase');
       // Dispatch the action that actually hits the /articles/all endpoint
      return dispatch("fetchAllArticlesFromDatabase");
    },
    async fetchArticleById({ commit }, id: string) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await axios.get(`${API_URL}/articles/${id}`);
        commit("SET_CURRENT_ARTICLE", response.data.data);
        return response.data.data;
      } catch (error: any) {
        commit(
          "SET_ERROR",
          error.response?.data?.error || `Failed to fetch article with ID ${id}`
        );
        console.error("Error fetching article by ID:", error);
        return null;
      } finally {
        commit("SET_LOADING", false);
      }
    },
    async refreshNews({ commit }, category = "general") {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        await axios.post(`${API_URL}/articles/fetch`, { category });
        // Fetch the updated articles with the same category
        const response = await axios.get(`${API_URL}/articles`, {
          params: { category },
        });
        commit("SET_ARTICLES", response.data.data);
        return true;
      } catch (error: any) {
        commit(
          "SET_ERROR",
          error.response?.data?.error || "Failed to refresh news"
        );
        console.error("Error refreshing news:", error);
        return false;
      } finally {
        commit("SET_LOADING", false);
      }
    },
    async fetchArticlesByCategory({ commit, state, dispatch }, category) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");

      try {
        if (state.articles.length === 0) {
          console.log(`[Store Action] No articles in store, fetching all at once`);
          // Dispatch the corrected action
          const result = await dispatch("fetchAllArticlesAtOnce"); 
          if (!result || !result.success) { // Check result success
            throw new Error("Failed to fetch initial articles");
          }
          // After fetching, the state.articles should be populated, 
          // filtering below will now work correctly.
        } else {
          console.log(
            `[Store Action] Using ${state.articles.length} existing articles from store`
          );
        }

        // Now filter the articles client-side by category
        if (category === "all") {
          commit("SET_FILTERED_ARTICLES", state.articles);
        } else {
          const filteredArticles = state.articles.filter(
            (article) =>
              article.category === category ||
              article.source?.category === category
          );
          console.log(
            `[Store Action] Filtered ${filteredArticles.length} articles for category: ${category}`
          );
          if (filteredArticles.length === 0) {
            console.warn(
              `[Store Action] No articles found for category: ${category}, showing all available articles instead`
            );
            // Show all articles if category filter yields none
            commit("SET_FILTERED_ARTICLES", state.articles);
          } else {
            commit("SET_FILTERED_ARTICLES", filteredArticles);
          }
        }
        return { success: true };
      } catch (error: any) {
        console.error(
          `[Store Action] Error in fetchArticlesByCategory for ${category}:`,
          error
        );
        commit(
          "SET_ERROR",
          error.response?.data?.error ||
            `Failed to fetch articles for ${category}`
        );
        // Fallback: Show all articles if an error occurred during category fetch/filter
        if (state.articles.length > 0) {
           commit("SET_FILTERED_ARTICLES", state.articles);
        }
        return null;
      } finally {
        commit("SET_LOADING", false);
      }
    },
    async fetchAllArticlesFromDatabase({ commit }) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        console.log("[Store Action] Fetching ALL articles from database (/articles/all endpoint)...");
        const response = await axios.get(`${API_URL}/articles/all`); // Correct endpoint
        console.log(
          `[Store Action] Retrieved ${response.data.count} total articles from MongoDB via /articles/all`
        );
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const articles = response.data.data;
          commit("SET_ARTICLES", articles); // Update main articles list
          commit("SET_FILTERED_ARTICLES", articles); // Also update filtered list initially
          console.log(`[Store Action] Set ${articles.length} articles in state from /articles/all`);
          return { success: true, data: articles }; // Return success and data
        } else {
          console.error("[Store Action] Invalid response format from /articles/all:", response.data);
          commit("SET_ERROR", "Invalid response format from server (fetching all)");
           return { success: false, error: "Invalid response format" };
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.error || "Failed to fetch all articles from database";
        commit("SET_ERROR", errorMsg);
        console.error("[Store Action] Error fetching all articles from database:", error);
        return { success: false, error: errorMsg };
      } finally {
        commit("SET_LOADING", false);
      }
    },
    async fetchRewrittenContent({ commit, state }, articleId: string) {
      const mode = state.currentRewriteMode;
      if (mode === 'none') {
        console.log('[Store Action] Rewrite mode is none, not fetching.');
        // Optionally clear any existing rewrite state for this article
        // commit('SET_REWRITE_CONTENT', { articleId, content: null });
        // commit('SET_REWRITE_ERROR', { articleId, error: null });
        return; // Do nothing if mode is none
      }

      console.log(`[Store Action] Fetching ${mode}-wing rewrite for ID: ${articleId}`);
      commit('INIT_REWRITE_STATE', articleId); // Set loading to true

      try {
        // Import the default export from the API service module
        const apiService = (await import('@/services/api')).default;

        let rewriteFunction: ((id: string) => Promise<any>) | undefined;

        if (mode === 'right' && apiService?.articles?.rewriteArticleExtremeRight) {
          rewriteFunction = apiService.articles.rewriteArticleExtremeRight;
        } else if (mode === 'left' && apiService?.articles?.rewriteArticleExtremeLeft) {
          rewriteFunction = apiService.articles.rewriteArticleExtremeLeft;
        } else {
          throw new Error(`API function for ${mode} rewrite not found or API service structure incorrect.`);
        }

        if (typeof rewriteFunction === 'function') {
          const response = await rewriteFunction(articleId);

          if (response.data && response.data.success && response.data.rewrittenContent) {
            console.log(`[Store Action] Successfully fetched ${mode}-wing rewrite for ID: ${articleId}`);
            commit('SET_REWRITE_CONTENT', { articleId, content: response.data.rewrittenContent });
          } else {
            // Throw an error if the response structure is unexpected or indicates failure
            throw new Error(response.data?.message || `Failed to rewrite article (${mode}) or invalid response structure.`);
          }
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during rewrite.';
        console.error(`[Store Action] Error fetching ${mode}-wing rewrite for ID ${articleId}:`, errorMessage);
        commit('SET_REWRITE_ERROR', { articleId, error: errorMessage });
      } finally {
        // Ensure loading state is reset regardless of success or failure
      }
    },
    setRewriteMode({ commit }, mode: RewriteMode) {
      commit('SET_REWRITE_MODE', mode);
      // Potentially trigger refetch or clear displayed rewrites here if needed
    },
    showAllArticles({ commit }) {
      commit('SET_SELECTED_CATEGORY', null); // Reset category to null when showing all
      commit('RESET_FILTERED_ARTICLES');
    },
    setSelectedCategory({ commit }, categoryId: string | null) {
      commit('SET_SELECTED_CATEGORY', categoryId);
    }
  },
  getters: {
    getArticles: (state) => state.articles,
    getFilteredArticles: (state) => state.filteredArticles,
    getCurrentArticle: (state) => state.currentArticle,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getTransformedArticles(state) {
      return state.filteredArticles.filter((article) => article.transformedContent);
    },
    getRewriteState: (state) => (articleId: string): RewriteRequestState => {
      // Return the specific state or a default loading:false state if not found
      return state.rewriteStates[articleId] || { isLoading: false, content: null, error: null };
    },
    getCurrentRewriteMode: (state): RewriteMode => {
      return state.currentRewriteMode;
    },
    getSelectedCategory(state): string | null {
      return state.selectedCategory;
    }
  },
});
