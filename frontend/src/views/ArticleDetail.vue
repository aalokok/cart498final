<template>
  <div class="article-detail">
    <div v-if="loading" class="text-center py-5">
      <b-spinner variant="primary"></b-spinner>
      <p class="mt-3">Loading article...</p>
    </div>
    
    <div v-else-if="displayError" class="container">
      <b-alert show variant="danger">{{ displayError }}</b-alert>
      <b-button to="/" variant="primary" class="mt-3">Back to Home</b-button>
    </div>
    
    <div v-else-if="article" class="container">
      <b-breadcrumb :items="[
        { text: 'Home', to: '/' },
        { text: 'Article', active: true }
      ]"></b-breadcrumb>
      
      <b-card no-body class="mb-4">
        <div class="position-relative">
          <b-card-body>
            <div class="article-header" :style="{ backgroundImage: `url(${article.urlToImage || 'https://via.placeholder.com/1200x400/111/222'})` }">
              <div class="header-overlay"></div>
              <div class="header-content">
                <h1 class="mb-3">{{ article.title }}</h1>
                <div class="source-info mb-3">
                  <span class="badge mr-2" :style="{ backgroundColor: getSourceColor() }">{{ article.sourceName }}</span>
                  <small class="text-light">{{ formatDate(article.publishedAt) }}</small>
                </div>
              </div>
            </div>
            
            <div class="article-body mt-4">
              <div class="row">
                <div class="col-md-8">
                  <div class="article-content">
                    <p v-if="article.description" class="lead">{{ article.description }}</p>
                    
                    <!-- Content view toggle when transformed content is available -->
                    <div v-if="article.transformedContent" class="mb-3 article-view-options">
                      <b-button-group>
                        <b-button 
                          :variant="viewMode === 'original' ? 'primary' : 'outline-primary'" 
                          @click="viewMode = 'original'"
                        >
                          Original
                        </b-button>
                        <b-button 
                          :variant="viewMode === 'rightWing' ? 'danger' : 'outline-danger'" 
                          @click="viewMode = 'rightWing'"
                        >
                          Right-Wing View
                        </b-button>
                      </b-button-group>
                    </div>
                    
                    <!-- Display content based on viewMode -->
                    <div v-if="article.content" class="mt-4">
                      <template v-if="viewMode === 'original' || !article.transformedContent">
                        <p>{{ article.content }}</p>
                      </template>
                      <template v-else-if="viewMode === 'rightWing' && article.transformedContent">
                        <div class="right-wing-content">
                          <div class="bias-indicator mb-2">
                            <span class="badge badge-danger">Right-Wing Perspective</span>
                          </div>
                          <p style="white-space: pre-line">{{ article.transformedContent }}</p>
                        </div>
                      </template>
                    </div>
                    
                    <div class="mt-4">
                      <a :href="article.url" target="_blank" class="btn btn-outline-primary">
                        Read original article
                      </a>
                      <b-button 
                        @click="rewriteWithRightWingBias" 
                        variant="outline-danger" 
                        class="ml-2" 
                        :disabled="rewritingArticle || (article.transformedContent && article.politicalBias === 'right')"
                      >
                        <b-spinner small v-if="rewritingArticle"></b-spinner>
                        {{ article.transformedContent && article.politicalBias === 'right' ? 'Right-Wing View Available' : 'Rewrite with Right-Wing Bias' }}
                      </b-button>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-4">
                  <div class="article-explanation">
                    <h3 class="mb-3">Expert Analysis</h3>
                    
                    <div v-if="explanationLoading" class="text-center py-3">
                      <b-spinner variant="info" small></b-spinner>
                      <p class="mt-2">Generating expert analysis...</p>
                    </div>
                    
                    <div v-else-if="article.explanation" class="explanation-content">
                      <p v-html="formatExplanation(article.explanation)"></p>
                    </div>
                    
                    <div v-else class="text-center py-3">
                      <p class="text-muted">No explanation available yet</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </b-card-body>
        </div>
      </b-card>
      
      <b-button to="/" variant="primary" class="mt-3">Back to Home</b-button>
    </div>
    
    <div v-else class="container">
      <div class="alert alert-warning">Article not found.</div>
      <b-button to="/" variant="primary" class="mt-3">Back to Home</b-button>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import apiService from "@/services/api";

export default {
  name: "ArticleDetail",
  data() {
    return {
      article: null,
      explanationLoading: false,
      rewritingArticle: false,
      viewMode: 'original',
      localError: null
    };
  },
  computed: {
    ...mapState({
      loading: state => state.loading,
      error: state => state.error
    }),
    articleId() {
      return this.$route.params.id;
    },
    displayError() {
      return this.localError || this.error;
    }
  },
  methods: {
    formatDate(date) {
      if (!date) return "";
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    },
    getSourceColor() {
      // Generate a deterministic color based on source name
      if (!this.article || !this.article.sourceName) return "#007bff";
      
      const hash = this.article.sourceName.split("").reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 70%, 50%)`;
    },
    formatExplanation(text) {
      // Format the explanation with paragraph breaks
      if (!text) return '';
      return text.split('\n\n').map(para => `<p>${para}</p>`).join('');
    },
    // Use the new API service
    async fetchArticle() {
      try {
        // Use the dedicated API service
        const response = await apiService.articles.getById(this.articleId);
        
        if (response.data && response.data.success) {
          this.article = response.data.data;
          console.log('Article data received:', this.article);
          
          // Check if the article has transformed content with right-wing bias and set view mode accordingly
          if (this.article.transformedContent && this.article.politicalBias === 'right') {
            console.log('Article has right-wing transformed content');
          }
        } else {
          this.localError = "Failed to load article data";
        }
      } catch (error) {
        console.error("Error fetching article:", error);
        this.localError = error.message || "Error loading article";
      }
    },
    // Rewrite the article with right-wing bias using OpenAI
    async rewriteWithRightWingBias() {
      this.rewritingArticle = true;
      
      try {
        const response = await apiService.articles.rewriteWithRightWingBias(this.articleId);
        
        if (response.data.success) {
          // Update the article with the rewritten content
          this.article = response.data.data;
          
          // Switch view to right-wing perspective
          this.viewMode = 'rightWing';
          
          this.$bvToast.toast('Article rewritten with right-wing perspective', {
            title: 'Success',
            variant: 'success',
            solid: true
          });
        } else {
          throw new Error(response.data.error || 'Failed to rewrite the article');
        }
      } catch (error) {
        console.error('Error rewriting article:', error);
        this.$bvToast.toast(error.message || 'Failed to rewrite the article', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.rewritingArticle = false;
      }
    },
    handleHashChange() {
      // Re-fetch article when URL hash changes
      const newId = this.$route.params.id;
      if (newId && newId !== this.articleId) {
        console.log('Hash changed, fetching new article:', newId);
        this.fetchArticle();
      }
    }
  },
  mounted() {
    console.log('ArticleDetail mounted with ID:', this.articleId);
    this.fetchArticle();
    
    // Add event listener for direct navigation
    window.addEventListener('hashchange', this.handleHashChange);
  },
  beforeUnmount() {
    // Remove event listener
    window.removeEventListener('hashchange', this.handleHashChange);
  }
};
</script>

<style scoped>
.article-header {
  position: relative;
  background-size: cover;
  background-position: center;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  margin: -1.25rem -1.25rem 0;
}

.header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 80%);
  z-index: 1;
}

.header-content {
  position: relative;
  z-index: 2;
  color: white;
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
}

.header-content h1 {
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
}

.article-body {
  padding: 20px 0;
}

.article-content {
  line-height: 1.7;
}

.article-explanation {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.explanation-content {
  line-height: 1.6;
  font-size: 15px;
}

.explanation-content p {
  margin-bottom: 15px;
}

.bias-indicator {
  margin-bottom: 10px;
}

.right-wing-content {
  padding: 15px;
  background-color: #fff8f8;
  border-left: 4px solid #dc3545;
  margin-bottom: 20px;
}

.article-view-options {
  margin: 15px 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .article-header {
    height: 200px;
  }
  
  .header-content h1 {
    font-size: 1.8rem;
  }
  
  .article-explanation {
    margin-top: 30px;
  }
}
</style>