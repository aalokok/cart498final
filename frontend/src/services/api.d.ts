// api.d.ts
// This declaration file provides types for the JavaScript module '@/services/api'

// Define the return type expected from Axios requests
interface ApiResponse<T = any> {
    data: T;
    // Add other Axios response properties if needed (status, headers, etc.)
}

// Define the structure of the object containing article-related API functions
interface ArticleApiMethods {
    fetchArticles(category?: string, page?: number, limit?: number): Promise<ApiResponse>;
    fetchAllArticles(): Promise<ApiResponse>;
    fetchArticleById(id: string): Promise<ApiResponse>;
    fetchLatestNews(category?: string): Promise<ApiResponse>;
    fetchAllNewsFromApi(): Promise<ApiResponse>;
    transformArticle(id: string, bias: string): Promise<ApiResponse>;
    processPendingArticles(): Promise<ApiResponse>;
    getById(id: string): Promise<ApiResponse>;
    rewriteArticleWithRightWingBias(id: string): Promise<ApiResponse>;
    processAllWithRightWingBias(): Promise<ApiResponse>;
    processDisplayedWithRightWingBias(): Promise<ApiResponse>;
    rewriteArticleExtremeRight(id: string): Promise<ApiResponse<{
        success: boolean;
        rewrittenContent?: string; // Make optional as it might fail
        message?: string; // Optional error message
    }>>;
    rewriteArticleExtremeLeft(id: string): Promise<ApiResponse<{
        success: boolean;
        rewrittenContent?: string; // Make optional as it might fail
        message?: string; // Optional error message
    }>>;
    forceRefreshAndClean(): Promise<ApiResponse>;
}

// Define the structure of the default export from api.js
interface ApiService {
    articles: ArticleApiMethods;
    // Add other top-level methods from api.js here if they exist
}

// Declare the module and its default export
declare module '@/services/api' {
    const apiService: ApiService;
    export default apiService;
}
