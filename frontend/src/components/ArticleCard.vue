<template>
  <b-card 
    no-body
    class="article-card h-100"
    :class="{ 'transformed': article.isProcessed }"
  >
    <div class="card-img-wrapper">
      <b-card-img-lazy 
        :src="displayImage" 
        :alt="article.title"
        top
      ></b-card-img-lazy>
      
      <div class="status-badge" v-if="article.isProcessed">
        <b-badge variant="danger">TRANSFORMED</b-badge>
      </div>
      <div class="status-badge" v-else-if="article.processingStatus === 'error'">
        <b-badge variant="warning">ERROR</b-badge>
      </div>
      <div class="status-badge" v-else-if="article.processingStatus !== 'pending'">
        <b-badge variant="info">PROCESSING</b-badge>
      </div>
    </div>
    
    <b-card-body>
      <div class="source-info mb-2">
        <span class="source">{{ article.sourceName }}</span>
        <span class="date">{{ formatDate(article.publishedAt) }}</span>
      </div>
      
      <b-card-title>
        {{ displayTitle }}
      </b-card-title>
      
      <b-card-text v-if="article.description">
        {{ truncateText(article.description, 120) }}
      </b-card-text>
      
      <b-button 
        :to="'/article/' + article._id" 
        variant="primary" 
        class="mt-auto"
      >
        Read Article
      </b-button>
      
      <b-button 
        v-if="!article.isProcessed && article.processingStatus === 'pending'"
        @click.stop="transformArticle"
        variant="outline-danger" 
        class="ml-2 mt-auto"
        :disabled="loading"
      >
        <b-spinner small v-if="loading"></b-spinner>
        Transform
      </b-button>
    </b-card-body>
  </b-card>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'ArticleCard',
  props: {
    article: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState({
      loading: state => state.loading
    }),
    displayTitle() {
      return this.article.isProcessed && this.article.transformedTitle 
        ? this.article.transformedTitle 
        : this.article.title
    },
    displayImage() {
      return this.article.isProcessed && this.article.generatedImageUrl
        ? this.article.generatedImageUrl
        : this.article.urlToImage || require('@/assets/placeholder.jpg')
    }
  },
  methods: {
    ...mapActions(['processArticle']),
    transformArticle() {
      this.processArticle(this.article._id)
    },
    truncateText(text, maxLength) {
      if (!text) return '';
      return text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
    },
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }
}
</script>

<style scoped>
.article-card {
  transition: all 0.3s ease;
  overflow: hidden;
}

.article-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.transformed {
  border-color: #dc3545;
}

.card-img-wrapper {
  position: relative;
  height: 180px;
  overflow: hidden;
  background-color: #f8f9fa;
}

.card-img-wrapper img {
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.source-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #6c757d;
}

.source {
  font-weight: bold;
}
</style> 