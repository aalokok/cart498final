import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api'

export default new Vuex.Store({
  state: {
    articles: [],
    currentArticle: null,
    loading: false,
    error: null
  },
  mutations: {
    SET_ARTICLES(state, articles) {
      state.articles = articles
    },
    SET_CURRENT_ARTICLE(state, article) {
      state.currentArticle = article
    },
    SET_LOADING(state, isLoading) {
      state.loading = isLoading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    CLEAR_ERROR(state) {
      state.error = null
    }
  },
  actions: {
    async fetchArticles({ commit }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await axios.get(`${API_URL}/articles`)
        commit('SET_ARTICLES', response.data.data)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to fetch articles')
        console.error('Error fetching articles:', error)
        return null
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async fetchArticleById({ commit }, id) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await axios.get(`${API_URL}/articles/${id}`)
        commit('SET_CURRENT_ARTICLE', response.data.data)
        return response.data.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || `Failed to fetch article with ID ${id}`)
        console.error('Error fetching article by ID:', error)
        return null
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async refreshNews({ commit, dispatch }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        await axios.post(`${API_URL}/articles/fetch`)
        // Fetch the updated articles
        await dispatch('fetchArticles')
        return true
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to refresh news')
        console.error('Error refreshing news:', error)
        return false
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async processArticle({ commit, dispatch }, id) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await axios.post(`${API_URL}/articles/transform/${id}`)
        commit('SET_CURRENT_ARTICLE', response.data.data)
        return response.data.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || `Failed to process article with ID ${id}`)
        console.error('Error processing article:', error)
        return null
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  getters: {
    getArticles: state => state.articles,
    getCurrentArticle: state => state.currentArticle,
    isLoading: state => state.loading,
    getError: state => state.error,
    getTransformedArticles: state => state.articles.filter(article => article.isProcessed)
  }
}) 