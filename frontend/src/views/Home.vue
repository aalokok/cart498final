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
        <b-button variant="primary" @click="refreshNews" :disabled="loading">
          <b-spinner small v-if="loading"></b-spinner> 
          Refresh News
        </b-button>
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
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import ArticleCard from '@/components/ArticleCard.vue'

export default {
  name: 'Home',
  components: {
    ArticleCard
  },
  computed: {
    ...mapState({
      loading: state => state.loading,
      error: state => state.error
    }),
    ...mapGetters({
      articles: 'getArticles'
    })
  },
  methods: {
    ...mapActions([
      'fetchArticles',
      'refreshNews'
    ])
  },
  mounted() {
    this.fetchArticles()
  }
}
</script>

<style scoped>
.home {
  padding-bottom: 2rem;
}
</style> 