<template>
  <div class="home">
    <div class="container">
      <b-alert v-if="error" show variant="danger">{{ error }}</b-alert>
      
      <!-- Loading Indicator -->
      <div v-if="loading && !filteredArticles.length" class="text-center py-5">
        <b-spinner variant="primary"></b-spinner> 
        <p class="mt-3">Loading articles...</p>
      </div>

      <!-- No Articles Message -->
      <div v-else-if="!filteredArticles.length" class="text-center py-5">
        <p>No articles found.</p> 
      </div>
      
      <!-- Articles Grid -->
      <div v-else class="articles-grid">
        <article-card 
          v-for="article in filteredArticles" 
          :key="article._id" 
          :article="article" 
          :category-colors="categoryColors" 
        />
      </div>
      
      <div v-if="filteredArticles.length" class="text-center mb-5">
        <p class="text-muted">Showing {{ filteredArticles.length }} articles</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import ArticleCard from '@/components/ArticleCard.vue'

export default {
  name: 'HomePage',
  props: {
    categoryColors: {
      type: Object,
      required: true
    }
  },
  components: {
    ArticleCard
  },
  computed: {
    ...mapState({
      loading: state => state.loading,
      error: state => state.error,
    }),
    ...mapGetters({
      filteredArticles: 'getFilteredArticles'
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