<template>
  <div 
    class="article-card-container" 
    :class="{ 'transformed': article.isProcessed }"
  >
    <button 
      class="article-card unstyled-button" 
      :style="{ backgroundImage: `url(${article.urlToImage || 'https://via.placeholder.com/400x300/111/222'})` }"
      @click="navigateToRewrite"
      type="button"
    >
      <div class="gradient-overlay"></div>
      <div class="hover-overlay"></div>
      <div class="article-status">
        <div
          class="status-dot"
          :style="{ backgroundColor: statusColors[0] }"
        ></div>
        <div
          class="status-dot"
          :style="{ backgroundColor: statusColors[1] }"
        ></div>
      </div>
      <div class="article-content">
        <h3>{{ displayTitle }}</h3>
        <div
          class="article-meta"
          v-if="article.sourceName || article.publishedAt"
        >
          <span v-if="article.sourceName">{{ article.sourceName }}</span>
          <span v-if="article.publishedAt"> • {{ formatDate(article.publishedAt) }}</span>
        </div>
        <!-- Add original description preview if not expanded -->
        <p v-if="article.description" class="article-description-preview">
          {{ truncateText(article.description, 100) }}
        </p>
      </div>
    </button>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { computed } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'ArticleCard',
  props: {
    article: {
      type: Object,
      required: true,
    },
    statusColors: {
      type: Array,
      default: () => ['#ff5252', '#7c4dff']
    }
  },
  setup(props) {
    const router = useRouter();

    const navigateToRewrite = () => {
      console.log(`[ArticleCard] Navigating to rewrite view for ID: ${props.article._id}`);
      router.push({ name: 'RewriteView', params: { id: props.article._id } });
    };

    return {
      navigateToRewrite,
    };
  },
  computed: {
    // Map the getter that retrieves state by ID
    ...mapGetters(['getRewriteState']),

    // Map the getter for the current rewrite mode
    ...mapGetters({ rewriteMode: 'getCurrentRewriteMode' }),

    // Computed property to get the specific rewrite state for this article
    rewriteState() {
      // Use the mapped getter, passing the article's ID
      return this.getRewriteState(this.article._id);
    },
    displayTitle() {
      return this.article.isProcessed && this.article.transformedTitle
        ? this.article.transformedTitle
        : this.article.title;
    }
  },
  methods: {
    truncateText(text, length) {
      if (!text) return '';
      if (text.length <= length) {
        return text;
      }
      return text.substring(0, length) + '...';
    },
    formatDate(date) {
      if (!date) return "";
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  },
};
</script>

<style scoped>
.unstyled-button {
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  text-align: left;
  width: 100%;
}

.article-card-container {
  background-color: #2c2c2c; /* Dark background for the container */
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  margin-bottom: 20px;
}

.article-card {
  position: relative;
  height: 380px;
  border-radius: 8px; /* Rounded corners for the whole card now */
  overflow: hidden;
  background-size: cover;
  background-position: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.article-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.article-card:hover .hover-overlay {
  opacity: 1;
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.85) 100%);
  z-index: 1;
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.article-content {
  position: relative;
  z-index: 2;
  padding: 20px;
  color: white;
}

.article-content h3 {
  margin: 0 0 10px;
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1.3;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.article-meta {
  font-size: 0.85rem;
  opacity: 0.9;
}

.article-status {
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  z-index: 2;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 5px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.article-card-container.transformed .article-card {
  border-bottom: 4px solid #7c4dff; /* Indicate transformed status */
}

.article-description-preview {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8px;
  line-height: 1.4;
}
</style>
