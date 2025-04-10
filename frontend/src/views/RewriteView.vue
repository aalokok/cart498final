<template>
  <div class="rewrite-view container mt-4">
    <div v-if="loading" class="loading-container text-center">
      <b-spinner label="Loading..."></b-spinner>
      <p>Loading rewritten article...</p>
    </div>
    <div v-else-if="error" class="alert alert-danger">
      Error loading rewrite: {{ error }}
    </div>
    <div v-else-if="rewrittenContent">
      <h2>{{ rewriteMode === 'left' ? 'Extreme Left-Wing' : 'Extreme Right-Wing' }} Rewrite</h2>
      <!-- TODO: Maybe display original title/source here -->
      <hr />
      <p class="rewritten-text">{{ rewrittenContent }}</p>
    </div>
    <div v-else class="alert alert-warning">
      No rewritten content available. Please try again.
    </div>
    <router-link to="/" class="btn btn-secondary mt-3">Back to Articles</router-link>
  </div>
</template>

<script>
import { computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';

export default {
  name: 'RewriteView',
  setup() {
    const store = useStore();
    const route = useRoute();
    const articleId = computed(() => route.params.id);

    // Get the specific rewrite state for this article ID
    const rewriteState = computed(() => store.getters.getRewriteState(articleId.value));
    // Get the current global rewrite mode
    const rewriteMode = computed(() => store.getters.getCurrentRewriteMode);

    // Computed properties based on rewriteState
    const loading = computed(() => rewriteState.value.isLoading);
    const error = computed(() => rewriteState.value.error);
    const rewrittenContent = computed(() => rewriteState.value.content);

    // Fetch content when component mounts if needed
    onMounted(() => {
      if (articleId.value && !rewrittenContent.value && !loading.value && !error.value) {
        console.log(`[RewriteView] No content for ${articleId.value}, mode: ${rewriteMode.value}. Fetching...`);
        store.dispatch('fetchRewrittenContent', articleId.value);
      }
    });

    // Watch for changes in the rewrite mode
    watch(rewriteMode, (newMode, oldMode) => {
      // Avoid fetching on initial component load if onMounted already handles it
      if (newMode !== oldMode && articleId.value) {
        console.log(`[RewriteView] Mode changed to ${newMode}. Refetching for ID: ${articleId.value}...`);
        store.dispatch('fetchRewrittenContent', articleId.value);
      }
    });

    return {
      loading,
      error,
      rewrittenContent,
      rewriteMode,
      articleId,
    };
  },
};
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px; /* Ensure space for the spinner */
  text-align: center;
  color: #6c757d; /* Bootstrap secondary color */
}

.rewrite-view {
  padding: 20px;
  background-color: #f8f9fa; /* Light background for the view */
  border-radius: 8px;
}
.rewritten-text {
  font-size: 1.1rem;
  line-height: 1.6;
  white-space: pre-wrap; /* Preserve whitespace and line breaks */
  color: #212529; /* Dark text color for contrast */
}
h2 {
  margin-bottom: 1rem;
  font-family: "Averia Serif Libre", serif; /* Set title font */
  color: #343a40; /* Slightly darker heading color */
}
</style>
