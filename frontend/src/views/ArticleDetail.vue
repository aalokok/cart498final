<template>
  <div class="article-detail">
    <div v-if="loading" class="text-center py-5">
      <b-spinner variant="primary"></b-spinner>
      <p class="mt-3">Loading article...</p>
    </div>
    
    <div v-else-if="error" class="container">
      <b-alert show variant="danger">{{ error }}</b-alert>
      <b-button to="/" variant="primary" class="mt-3">Back to Home</b-button>
    </div>
    
    <div v-else-if="article" class="container">
      <b-breadcrumb :items="[
        { text: 'Home', to: '/' },
        { text: 'Article', active: true }
      ]"></b-breadcrumb>
      
      <b-card no-body class="mb-4">
        <div class="original-vs-transformed position-relative">
          <b-button 
            @click="toggleView" 
            variant="info" 
            class="toggle-btn position-absolute"
            :class="{ 'transformed-active': showTransformed }"
          >
            {{ showTransformed ? 'View Original' : 'View Transformed' }}
          </b-button>
          
          <div class="content-wrapper">
            <!-- Original Content -->
            <b-card-body v-show="!showTransformed" class="original">
              <div class="source-info mb-3">
                <span class="badge badge-secondary mr-2">{{ article.sourceName }}</span>
                <small class="text-muted">{{ formatDate(article.publishedAt) }}</small>
              </div>
              
              <h2 class="mb-3">{{ article.title }}</h2>
              
              <div v-if="article.urlToImage" class="mb-4 text-center">
                <b-img :src="article.urlToImage" fluid alt="Article image"></b-img>
                <small class="text-muted d-block mt-1">Original image from source</small>
              </div>
              
              <div class="article-content">
                {{ article.content }}
              </div>
              
              <div class="mt-4">
                <a :href="article.url" target="_blank" class="btn btn-outline-primary">
                  Read original article
                </a>
              </div>
            </b-card-body>
            
            <!-- Transformed Content -->
            <b-card-body v-show="showTransformed" class="transformed">
              <div class="source-info mb-3">
                <span class="badge badge-danger mr-2">ACTUAL INFORMER</span>
                <small class="text-muted">EXAGGERATED VERSION</small>
              </div>
              
              <h2 class="mb-3">{{ article.transformedTitle || 'Transformation in progress...' }}</h2>
              
              <div v-if="article.generatedImageUrl" class="mb-4 text-center">
                <b-img :src="article.generatedImageUrl" fluid alt="AI-generated image"></b-img>
                <small class="text-muted d-block mt-1">AI-generated image</small>
              </div>
              
              <div v-if="article.transformedContent" class="article-content">
                {{ article.transformedContent }}
              </div>
              <div v-else class="alert alert-warning">
                Transformation in progress...
                <b-button v-if="!article.isProcessed" @click="processArticle(article._id)" variant="primary" size="sm" class="ml-2">
                  Transform Now
                </b-button>
              </div>
              
              <div v-if="article.audioUrl" class="mt-4">
                <h5>Listen to this story:</h5>
                <audio controls class="w-100">
                  <source :src="article.audioUrl" type="audio/mpeg">
                  Your browser does not support the audio element.
                </audio>
              </div>
            </b-card-body>
          </div>
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
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'ArticleDetail',
  data() {
    return {
      showTransformed: false
    }
  },
  computed: {
    ...mapState({
      loading: state => state.loading,
      error: state => state.error
    }),
    ...mapGetters({
      article: 'getCurrentArticle'
    })
  },
  methods: {
    ...mapActions([
      'fetchArticleById',
      'processArticle'
    ]),
    toggleView() {
      this.showTransformed = !this.showTransformed
    },
    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  },
  mounted() {
    const articleId = this.$route.params.id
    this.fetchArticleById(articleId)
  }
}
</script>

<style scoped>
.original-vs-transformed {
  min-height: 400px;
}

.toggle-btn {
  right: 1rem;
  top: 1rem;
  z-index: 10;
  transition: all 0.3s ease;
}

.toggle-btn.transformed-active {
  background-color: #dc3545;
  border-color: #dc3545;
}

.article-content {
  white-space: pre-line;
  line-height: 1.6;
}

.transformed {
  background-color: rgba(255, 240, 245, 0.3);
}

.source-info {
  display: flex;
  align-items: center;
}
</style> 