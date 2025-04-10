import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import RewriteView from '../views/RewriteView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/rewrite/:id',
    name: 'RewriteView',
    component: RewriteView,
    props: true // Pass route params (like :id) as props to the component
  },
  {
    path: '/article/:id',
    name: 'ArticleDetail',
    component: () => import(/* webpackChunkName: "article-detail" */ '../views/ArticleDetail.vue'),
    props: true // This enables passing route params as props
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
