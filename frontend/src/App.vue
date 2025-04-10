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
          <button
            class="play-button"
            @click="togglePlayback"
            :disabled="isAudioLoading || !audioUrl"
            :title="isAudioLoading ? 'Loading audio...' : (!audioUrl ? (audioError || 'Audio not available') : (isPlaying ? 'Pause' : 'Play'))"
           >
            <span v-if="isAudioLoading">⏳</span> 
            <span v-else>{{ isPlaying ? '❚❚' : '▶' }}</span>
          </button>
          <div class="audio-timeline">
            <div class="audio-progress"></div> 
          </div>
          <div v-if="audioError && !isAudioLoading" class="audio-error-message" :title="audioError">
             ⚠️ Error
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
import { defineComponent, ref, computed, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import type { Ref } from 'vue'; 

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

    // --- New Audio Player State ---
    const audioUrl: Ref<string | null> = ref(null);
    const isAudioLoading = ref(false);
    const audioError: Ref<string | null> = ref(null);
    const audioPlayer: Ref<HTMLAudioElement | null> = ref(null);
    const isPlaying = ref(false);
    // -----------------------------

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

    const loadCategoryArticles = async (category: { name: string, apiCategory: string }) => {
      console.log(`[App.vue] Category ${category.name} clicked, fetching category: ${category.apiCategory}`);
      await store.dispatch('fetchArticlesByCategory', category.apiCategory);
      if (router.currentRoute.value.path !== '/') {
        router.push('/');
      }
    };

    // --- New Audio Player Methods ---
    const fetchAudio = async () => {
      isAudioLoading.value = true;
      audioError.value = null;
      audioUrl.value = null; 
      console.log('[App.vue] Fetching breaking news audio...');
      try {
        const response = await fetch('/api/articles/tts/breaking-news'); 
        if (!response.ok) {
          let errorMsg = `Error fetching audio: ${response.status} ${response.statusText}`;
          try {
             const errData = await response.json();
             errorMsg = errData.message || JSON.stringify(errData) || errorMsg;
          } catch (e) { /* Ignore if response is not JSON */ }
          throw new Error(errorMsg);
        }
        const blob = await response.blob();
        audioUrl.value = URL.createObjectURL(blob);
        console.log('[App.vue] Audio fetched successfully.');
      } catch (err: any) {
        console.error('[App.vue] Error fetching audio:', err);
        audioError.value = err.message || 'Failed to fetch audio.';
        audioUrl.value = null;
      } finally {
        isAudioLoading.value = false;
      }
    };

    const togglePlayback = () => {
      if (!audioUrl.value) return;

      if (isPlaying.value && audioPlayer.value) {
        audioPlayer.value.pause();
        isPlaying.value = false;
        console.log('[App.vue] Audio paused.');
      } else {
        if (!audioPlayer.value) {
          console.log('[App.vue] Creating new Audio element.');
          audioPlayer.value = new Audio(audioUrl.value);
          audioPlayer.value.onended = () => {
            isPlaying.value = false;
            console.log('[App.vue] Audio ended.');
          };
          audioPlayer.value.onerror = (e) => {
             console.error('[App.vue] Audio playback error:', e);
             audioError.value = 'Error playing audio.';
             isPlaying.value = false;
             audioPlayer.value = null; 
          };
        }
        audioPlayer.value.play().then(() => {
          isPlaying.value = true;
          console.log('[App.vue] Audio playing.');
        }).catch(err => {
          console.error('[App.vue] Error starting playback:', err);
          audioError.value = 'Could not start audio playback.';
          isPlaying.value = false;
           audioPlayer.value = null; 
        });
      }
    };
    // -----------------------------

    // --- Lifecycle Hooks ---
    onMounted(() => {
      fetchAudio(); 
    });

    onUnmounted(() => {
      if (audioPlayer.value) {
        audioPlayer.value.pause();
        audioPlayer.value.onended = null; 
        audioPlayer.value.onerror = null;
        audioPlayer.value = null;
      }
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
        audioUrl.value = null;
        console.log('[App.vue] Revoked audio object URL.');
      }
    });
    // -----------------------

    return {
      backgroundColor,
      categories,
      loading,
      error,
      loadAllArticles,
      loadCategoryArticles,
      setMode,
      currentMode,
      // --- New Audio Player Return Values ---
      audioUrl,
      isAudioLoading,
      audioError,
      isPlaying,
      togglePlayback,
      // ------------------------------------
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

.audio-error-message {
  color: red;
  margin-left: 10px;
  font-size: 0.8em;
  align-self: center;
  cursor: help; 
}
.play-button span[v-if="isAudioLoading"] { 
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.play-button:not(:disabled) span[v-if="isAudioLoading"] {
  animation: none; 
}

.play-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
