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

        <!-- Biased Report Toggle -->
        <div class="rewrite-toggle px-2">
          <div class="toggle-container d-flex justify-content-center align-items-center mb-1">
            <span :class="{'toggle-label-active': currentMode === 'left'}" class="toggle-label mr-3">LEFT  </span>
            <label class="toggle-switch mx-4">
              <input type="checkbox" v-model="isRightMode">
              <span class="toggle-slider round"></span>
            </label>
            <span :class="{'toggle-label-active': currentMode === 'right'}" class="toggle-label ml-3">RIGHT</span>
          </div>
        </div>

        <!-- Manual Refresh Button -->
        <div class="manual-refresh mt-3">
          <button 
            class="btn-refresh" 
            @click="triggerManualRefresh"
            :disabled="isRefreshing"
          >
            <span v-if="isRefreshing" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            {{ isRefreshing ? 'Refreshing...' : 'Refresh News' }}
          </button>
          <p v-if="refreshStatus" :class="{'text-success': !refreshError, 'text-danger': refreshError}" class="refresh-status small mt-2">{{ refreshStatus }}</p>
        </div>
      </div>

      <!-- Main area with articles -->
      <div class="content-area">
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
    const currentMode = computed(() => store.getters.getCurrentRewriteMode as 'left' | 'right');

    // Computed property for the switch state
    const isRightMode = computed({
      get: () => currentMode.value === 'right',
      set: (value) => {
        const newMode = value ? 'right' : 'left';
        console.log(`[App.vue] Setting rewrite mode via switch to: ${newMode}`);
        store.dispatch("setRewriteMode", newMode);
      }
    });

    // Method to set rewrite mode in store (kept in case needed elsewhere, but switch uses isRightMode setter)
    const setMode = (mode: string) => {
      console.log(`[App.vue] Setting rewrite mode to: ${mode}`);
      store.dispatch("setRewriteMode", mode);
    };

    // --- Manual Refresh State & Logic ---
    const isRefreshing = ref(false);
    const refreshStatus = ref<string | null>(null);
    const refreshError = ref(false);

    const triggerManualRefresh = async () => {
      isRefreshing.value = true;
      refreshStatus.value = null; // Clear previous status
      refreshError.value = false;
      console.log("[App.vue] Triggering manual news refresh...");

      try {
        const apiService = (await import('@/services/api')).default;
        const response = await apiService.articles.forceRefreshAndClean();

        if (response.data && response.data.success) {
          refreshStatus.value = response.data.message || 'Refresh successful! Loading new articles...';
          refreshError.value = false;
          // Reload articles displayed on the current view
          // If 'All Articles' is selected
          if (selectedCategory.value === null) {
             store.dispatch("showAllArticles"); // This should refetch/reset
          } else {
             // If a specific category is selected
             store.dispatch("fetchArticlesByCategory", selectedCategory.value);
          }
          // Automatically clear success message after a few seconds
          setTimeout(() => { refreshStatus.value = null; }, 5000);
        } else {
          throw new Error(response.data?.message || 'Manual refresh failed.');
        }
      } catch (err: any) {
        console.error("[App.vue] Manual refresh error:", err);
        refreshStatus.value = err.message || 'An error occurred during refresh.';
        refreshError.value = true;
        // Keep error message displayed longer or until next action
      } finally {
        isRefreshing.value = false;
      }
    };
    // --- End Manual Refresh Logic ---

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
      triggerManualRefresh,
      isRefreshing,
      refreshStatus,
      refreshError,
      isRightMode,
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

/* Make Sidebar Sticky */
.sidebar {
  position: sticky; /* Stick to the viewport */
  top: 0px; /* Adjust top offset as needed */
  height: 100vh; /* Example height - adjust based on header/footer */
  overflow-y: auto; /* Add scroll within sidebar if content overflows */
  width: 250px; /* Example fixed width */
  flex-shrink: 0; /* Prevent sidebar from shrinking */
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

/* Styles for Manual Refresh Button */
.manual-refresh {
  padding: 0 10px; /* Add some padding */
  margin-bottom: 20px; /* Added space below the button */
}

.btn-refresh {
  width: 100%;
  padding: 10px 15px;
  background-color: #6c757d; /* Bootstrap secondary color */
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  text-align: center;
  transition: background-color 0.3s ease;
}

.btn-refresh:hover:not(:disabled) {
  background-color: #5a6268; /* Darker shade on hover */
}

.btn-refresh:disabled {
  background-color: #adb5bd; /* Lighter grey when disabled */
  cursor: not-allowed;
}

.refresh-status {
  text-align: center;
}

/* Styles for Bias Toggle Switch */
.rewrite-toggle {
  /* Center the block itself and reduce top margin */
  text-align: center; /* Center inline-block children */
  margin-top: 5px; /* Reduced top margin further */
  margin-bottom: 150px; /* Add some space below */
}

/* Ensure inner container doesn't override centering */
.toggle-container {
  /* width: 100%; // Remove or adjust if causing issues */
  /* Keep align-items-center from d-flex */
  display: inline-flex; /* Make it inline-flex to respect text-align center */
  justify-content: center; /* Center items within the inline-flex container */
}

.toggle-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: #ccc; /* Dimmed color */
  transition: color 0.3s ease;
  user-select: none; /* Prevent text selection */
  display: inline-flex; /* Use flex to help vertical alignment */
  align-items: center;  /* Vertically align text within the span */
}

.toggle-label-active {
  color: #333; /* Active color */
}

/* Animated Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px; /* Width of the switch */
  height: 34px; /* Height of the switch */
}

/* Hide default HTML checkbox */
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider track */
.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #007bff; /* Default color (Left = Blue) */
  transition: background-color 0.4s;
}

/* The slider knob */
.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px; /* Height of the knob */
  width: 26px; /* Width of the knob */
  left: 4px; /* Initial position (Left) */
  bottom: 4px;
  background-color: white;
  transition: transform 0.4s;
}

/* Checked state styles */
input:checked + .toggle-slider {
  background-color: #dc3545; /* Checked color (Right = Red) */
}

input:checked + .toggle-slider:before {
  transform: translateX(26px); /* Move knob to the right (Width of switch - Width of knob - 2*left_padding) */
}

/* Rounded sliders */
.toggle-slider.round {
  border-radius: 34px;
}

.toggle-slider.round:before {
  border-radius: 50%;
}

/* --- Responsive Styles --- */

@media (max-width: 992px) { /* Adjust breakpoint as needed (e.g., Bootstrap's lg) */
  .main-content {
    flex-direction: column; /* Stack sidebar and content */
  }

  .sidebar {
    width: 100%; /* Full width on smaller screens */
    position: static; /* Override sticky positioning */
    height: 100%; /* Auto height */
    overflow-y: visible; /* Remove internal scroll */
    border-bottom: 2px solid #eee; /* Add separator */
    padding-bottom: 15px;
  }

  .content-area {
    width: 100%;
  }
}

@media (max-width: 768px) { /* Further adjustments for smaller screens (e.g., md) */
  .logo-container .logo {
      max-width: 150px; /* Smaller logo */
  }
  /* Add more specific adjustments for smaller screens if needed */
}

/* --- Base Layout --- */
.main-content {
  display: flex;
  flex-direction: row; /* Default side-by-side layout */
  /* Add padding or other layout styles as needed */
}

.content-area {
  flex: 1; /* Allow content area to grow and take remaining space */
  padding: 20px; /* Add some padding around the content area */
}

/* Add more specific adjustments for smaller screens if needed */

</style>
