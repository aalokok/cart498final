<template>
  <div id="app" :style="{ background: backgroundColor }">
    <!-- Header -->
    <div class="header"></div>

    <!-- Marquee text bar -->
    <div class="marquee-container">
      <div class="marquee-content">
        <p>
          TRUST THE ACTUAL INFORMER – YOUR ONLY SOURCE OF TRUE, UNBIASED NEWS –
          TRUST THE ACTUAL INFORMER – YOUR ONLY SOURCE OF TRUE, UNBIASED NEWS –
          TRUST THE ACTUAL INFORMER – YOUR ONLY SOURCE OF TRUE, UNBIASED NEWS
        </p>
      </div>
    </div>

    <!-- Main content -->
    <div class="main-content">
      <!-- Left sidebar with logo and categories -->
      <div class="sidebar">
        <div class="logo-container" @click="loadAllArticles">
          <img src="@/assets/logo.svg" alt="The Actual Informer" class="logo" />
        </div>

        <div class="categories">
          <div
            class="category"
            v-for="category in categories"
            :key="category.apiCategory"
            @click="loadCategoryArticles(category)"
          >
            {{ category.name }}
          </div>
        </div>

        <div class="toggle-button">
          <button>SUBSCRIBE</button>
        </div>

        <!-- Rewrite Mode Toggle -->
        <div class="rewrite-toggle">
          <button 
            :class="{ active: currentMode === 'left' }" 
            @click="setMode('left')"
          >
            Rewrite Left
          </button>
          <button 
            :class="{ active: currentMode === 'right' }" 
            @click="setMode('right')"
          >
            Rewrite Right
          </button>
        </div>
      </div>

      <!-- Main area with audio player and articles -->
      <div class="content-area">
        <!-- Audio player -->
        <div class="audio-player">
          <button class="play-button">▶</button>
          <div class="audio-timeline">
            <div class="audio-progress"></div>
          </div>
          <div class="live-button" :class="{ flashing: true }">
            <span>LIVE</span>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="loading-indicator">
          <p>Loading latest news...</p>
        </div>

        <!-- Error message -->
        <div v-if="error" class="error-message">
          <p>{{ error }}</p>
        </div>

        <!-- Router outlet replaces the direct article grid -->
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "App",
  setup() {
    const store = useStore();
    const router = useRouter();

    // State
    const backgroundColor = ref("#ffffff");
    const categories = ref([
      { name: "World", color: "#ff5252", apiCategory: "general" },
      { name: "Politics", color: "#7c4dff", apiCategory: "politics" },
      { name: "Technology", color: "#448aff", apiCategory: "technology" },
      { name: "Health", color: "#18ffff", apiCategory: "health" },
      { name: "Business", color: "#ff9100", apiCategory: "business" },
      { name: "Sports", color: "#ff3d00", apiCategory: "sports" },
      { name: "Entertainment", color: "#ff3d00", apiCategory: "entertainment" },
    ]);
    const statusColors = ref([
      "#ff5252", "#7c4dff", "#448aff", "#18ffff", "#76ff03", "#ffea00", "#ff9100", "#ff3d00", "#d500f9",
    ]);

    // Computed properties
    const loading = computed(() => store.state.loading as boolean);
    const error = computed(() => store.state.error as string | null);

    // Get current rewrite mode from store
    const currentMode = computed(() => store.getters.getCurrentRewriteMode);

    // Method to set rewrite mode in store
    const setMode = (mode: string) => {
      console.log(`[App.vue] Setting rewrite mode to: ${mode}`);
      store.dispatch('setRewriteMode', mode);
    };

    // Methods
    const loadAllArticles = async () => {
      console.log('[App.vue] Logo clicked, navigating home.');
      router.push('/');
    };

    const loadCategoryArticles = async (category: any) => {
      console.log(`[App.vue] Category ${category.name} clicked.`);
      router.push('/');
    };

    return {
      backgroundColor,
      categories,
      loading,
      error,
      loadAllArticles,
      loadCategoryArticles,
      setMode,
      currentMode,
    };
  },
});
</script>

<style>
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.rewrite-toggle button {
  padding: 8px 12px;
  margin-left: 5px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s, border-color 0.3s;
}

.rewrite-toggle button:hover {
  background-color: #e0e0e0;
}

.rewrite-toggle button.active {
  background-color: #007bff;
  color: white;
  border-color: #0056b3;
}
</style>
