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
    const currentMode = computed(() => store.getters.getCurrentRewriteMode);

    // Method to set rewrite mode in store
    const setMode = (mode: string) => {
      console.log(`[App.vue] Setting rewrite mode to: ${mode}`);
      store.dispatch("setRewriteMode", mode);
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
