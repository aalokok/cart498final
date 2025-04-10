<template>
  <div class="home">
    <header class="bg-dark text-white p-4 mb-4">
      <div class="container">
        <h1 class="display-4">The Actual Informer</h1>
        <p class="lead">Reality distorted, truth exaggerated</p>
      </div>
    </header>
    
    <div class="container">
      <b-alert v-if="error" show variant="danger">{{ error }}</b-alert>
      
      <div class="d-flex justify-content-between mb-4">
        <h2>Latest News</h2>
        <div>
          <b-button variant="info" class="mr-2" @click="fetchAllArticlesFromDatabase" :disabled="loading">
            <b-spinner small v-if="loading"></b-spinner> 
            Show ALL Articles
          </b-button>
          <b-button variant="primary" @click="refreshNews" :disabled="loading">
            <b-spinner small v-if="loading"></b-spinner> 
            Refresh News
          </b-button>
        </div>
      </div>
      
      <b-row>
        <b-col v-if="loading && !articles.length" cols="12" class="text-center py-5">
          <b-spinner variant="primary"></b-spinner>
          <p class="mt-3">Loading articles...</p>
        </b-col>
        
        <b-col v-else-if="!articles.length" cols="12" class="text-center py-5">
          <p>No articles found. Click "Refresh News" to fetch the latest stories.</p>
        </b-col>
        
        <b-col v-for="article in articles" :key="article._id" lg="4" md="6" class="mb-4">
          <article-card :article="article" />
        </b-col>
      </b-row>
      
      <div v-if="articles.length" class="text-center mb-5">
        <p class="text-muted">Showing {{ articles.length }} articles</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import ArticleCard from '@/components/ArticleCard.vue'

export default {
  name: 'HomePage',
  components: {
    ArticleCard
  },
  computed: {
    ...mapState({
      loading: state => state.loading,
      error: state => state.error
    }),
    ...mapGetters({
      articles: 'getFilteredArticles'
    })
  },
  methods: {
    ...mapActions([
      'fetchArticles',
      'refreshNews',
      'fetchAllArticlesFromDatabase'
    ])
  },
  mounted() {
    this.fetchAllArticlesFromDatabase()
  }
}
</script>

<style scoped>
.home {
  padding-bottom: 2rem;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Three equal columns */
  gap: 20px; /* Adjust gap between cards */
  padding: 20px; /* Add padding around the grid */
}

/* Responsive adjustments */
@media (max-width: 992px) { /* Medium devices (tablets, less than 992px) */
  .articles-grid {
    grid-template-columns: repeat(2, 1fr); /* Two columns */
  }
}

@media (max-width: 768px) { /* Small devices (landscape phones, less than 768px) */
  .articles-grid {
    grid-template-columns: 1fr; /* Single column */
  }
}
</style>