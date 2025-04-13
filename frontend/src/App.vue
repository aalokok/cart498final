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
            :class="{
              'active-category': category.apiCategory === selectedCategory,
            }"
            :style="
              category.apiCategory === selectedCategory
                ? { backgroundColor: category.color }
                : {}
            "
            @click="loadCategoryArticles(category)"
          >
            {{ category.name }}
          </div>
        </div>

        <!-- Biased Report Buttons -->
        <div class="rewrite-toggle">
          <button
            :class="{ active: currentMode === 'left' }"
            @click="setMode('left')"
          >
            LEFT-WING REPORT
          </button>
          <button
            :class="{ active: currentMode === 'right' }"
            @click="setMode('right')"
          >
            RIGHT-WING REPORT
          </button>
        </div>
      </div>

      <!-- Main area with audio player and articles -->
      <div class="content-area">
        <!-- Audio player -->
        <div class="audio-player">
          <button 
            class="play-button" 
            @click.stop="playBiasedReport('right')" 
            :disabled="isLoadingAudio"
          >
            {{ isPlayingAudio ? '❚❚' : '▶' }}
          </button>
          <div class="audio-timeline">
            <div class="audio-progress" :style="{ width: audioProgress + '%' }"></div>
          </div>
          <div v-if="isPlayingAudio || isLoadingAudio" class="live-button" :class="{ flashing: isPlayingAudio }">
            <span>{{ isLoadingAudio ? 'LOADING...' : 'LIVE' }}</span>
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
        <router-view
          v-bind="{ categoryColors: categoryColorMap }"
          class="main-content"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "App",
  setup() {
    const store = useStore();
    const router = useRouter();

    // State
    const categories = ref([
      { name: "World", color: "#AEFA58", apiCategory: "general" },
      { name: "Politics", color: "#7c4dff", apiCategory: "politics" },
      { name: "Technology", color: "#448aff", apiCategory: "technology" },
      { name: "Health", color: "#18ffff", apiCategory: "health" },
      { name: "Business", color: "#ff9100", apiCategory: "business" },
      { name: "Sports", color: "#ff3d00", apiCategory: "sports" },
      { name: "Entertainment", color: "#FA58A9", apiCategory: "entertainment" },
    ]);

    // Computed properties
    const loading = computed(() => store.state.loading as boolean);
    const error = computed(() => store.state.error as string | null);

    // Get selected category ID from store
    const selectedCategory = computed(() => store.getters.getSelectedCategory);

    // Compute background color based on selected category
    const backgroundColor = computed(() => {
      if (selectedCategory.value === null) {
        return "#ffffff"; // White background for 'All Articles'
      }
      const activeCategory = categories.value.find(
        (cat) => cat.apiCategory === selectedCategory.value
      );
      return activeCategory ? activeCategory.color : "#ffffff"; // Default to white if category color not found
    });

    // Create a map of category API names to colors for easy lookup
    const categoryColorMap = computed(() => {
      return categories.value.reduce((map, category) => {
        map[category.apiCategory] = category.color;
        return map;
      }, {} as Record<string, string>);
    });

    // Watch for changes in backgroundColor and update the body style
    watch(backgroundColor, (newColor) => {
      document.body.style.backgroundColor = newColor;
    });

    // Set initial background color when component mounts
    onMounted(() => {
      document.body.style.backgroundColor = backgroundColor.value;
    });

    // Get current rewrite mode from store
    const currentMode = computed(() => store.getters.getCurrentRewriteMode);

    // Method to set rewrite mode in store
    const setMode = (mode: string) => {
      console.log(`[App.vue] Setting rewrite mode to: ${mode}`);
      store.dispatch("setRewriteMode", mode);
    };

    // --- Audio Playback State ---
    const currentAudio = ref<HTMLAudioElement | null>(null); // Keep track of the current audio
    const isLoadingAudio = ref(false);
    const isPlayingAudio = ref(false);
    const audioProgress = ref(0);
    // Store listener references for cleanup
    let listeners = {
      onCanPlayThrough: () => { console.log('Audio can play through'); },
      onTimeUpdate: () => { console.log('Audio time update'); },
      onEnded: () => { console.log('Audio ended'); },
      onError: (e: Event) => { console.error("Listener error placeholder", e) }
    };

    const removeAudioListeners = (audioElement: HTMLAudioElement) => {
      if (!audioElement) return;
      console.log("Removing listeners from old audio element");
      audioElement.removeEventListener('canplaythrough', listeners.onCanPlayThrough);
      audioElement.removeEventListener('timeupdate', listeners.onTimeUpdate);
      audioElement.removeEventListener('ended', listeners.onEnded);
      audioElement.removeEventListener('error', listeners.onError);
    };

    // --- NEW: Method to play biased audio report ---
    const playBiasedReport = async (bias: 'left' | 'right') => {
      console.log(`Attempting to play ${bias}-wing report...`);

      // --- Explicitly remove listeners and stop previous audio --- 
      if (currentAudio.value) {
        console.log("Cleaning up previous audio instance.");
        currentAudio.value.pause();
        removeAudioListeners(currentAudio.value); // Remove listeners
        currentAudio.value = null; // Clear previous audio object
      }
      // --- Reset state --- 
      isPlayingAudio.value = false;
      isLoadingAudio.value = true; // Set loading state
      audioProgress.value = 0;
      store.dispatch('setError', null); // Clear previous errors via store

      const apiUrl = `/api/articles/tts/biased-breaking-news?bias=${bias}`;

      try {
        const audioElement = new Audio(apiUrl);
        currentAudio.value = audioElement; // Assign new audio element

        // --- Define Listeners ---
        listeners.onCanPlayThrough = () => {
          console.log('Audio ready to play.');
          audioElement.play().then(() => {
              isPlayingAudio.value = true;
              isLoadingAudio.value = false; // Loading finished, playback started
              console.log('Audio playback started.');
           }).catch(e => {
              console.error('Error starting playback:', e);
              store.dispatch('setError', `Failed to play ${bias}-wing audio report.`);
              isLoadingAudio.value = false;
              isPlayingAudio.value = false;
              removeAudioListeners(audioElement); // Clean up on error too
              currentAudio.value = null;
           });
        };
        
        listeners.onTimeUpdate = () => {
           if (audioElement.duration) {
               audioProgress.value = (audioElement.currentTime / audioElement.duration) * 100;
           }
        };

        listeners.onEnded = () => {
          console.log('Audio playback finished.');
          isPlayingAudio.value = false;
          isLoadingAudio.value = false;
          audioProgress.value = 0; // Reset progress
          removeAudioListeners(audioElement); // Clean up listeners
          currentAudio.value = null;
        };

        listeners.onError = (e) => {
          console.error('Error playing audio:', e);
          store.dispatch('setError', `Failed to play ${bias}-wing audio report. Check console/server.`);
          isPlayingAudio.value = false;
          isLoadingAudio.value = false;
          audioProgress.value = 0;
          removeAudioListeners(audioElement); // Clean up listeners
          currentAudio.value = null;
        };

        // --- Attach Listeners ---
        console.log("Attaching listeners to new audio element");
        audioElement.addEventListener('canplaythrough', listeners.onCanPlayThrough);
        audioElement.addEventListener('timeupdate', listeners.onTimeUpdate);
        audioElement.addEventListener('ended', listeners.onEnded);
        audioElement.addEventListener('error', listeners.onError);

        // Load the audio. Playback will start via the 'canplaythrough' listener.
        console.log("Calling load() on new audio element");
        audioElement.load(); 

      } catch (err) { // Catch errors during new Audio() or setup
        console.error(`Error setting up audio for ${bias}-wing report:`, err);
        store.dispatch('setError', `Failed to fetch ${bias}-wing audio.`);
        isLoadingAudio.value = false;
        isPlayingAudio.value = false;
        if (currentAudio.value) { // Ensure cleanup even if setup fails mid-way
           removeAudioListeners(currentAudio.value);
        }
        currentAudio.value = null;
      }
    };

    // Methods
    const loadAllArticles = async () => {
      console.log(
        "[App.vue] Logo clicked, dispatching showAllArticles and navigating home."
      );
      store.dispatch("showAllArticles"); // Dispatch action to show all articles
      router.push("/");
    };

    const loadCategoryArticles = async (category: any) => {
      console.log(`[App.vue] Category ${category.name} clicked.`);
      store.dispatch("setSelectedCategory", category.apiCategory); // Set selected category
      store.dispatch("fetchArticlesByCategory", category.apiCategory);
      router.push("/"); // Navigate home to show the filtered list
    };

    return {
      categories,
      loading,
      error,
      loadAllArticles,
      loadCategoryArticles,
      setMode,
      selectedCategory,
      currentMode,
      backgroundColor,
      categoryColorMap,
      playBiasedReport, // <-- Expose the new method
      isLoadingAudio,
      isPlayingAudio,
      audioProgress,
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

.category.active-category {
  font-weight: bold;
}
</style>
