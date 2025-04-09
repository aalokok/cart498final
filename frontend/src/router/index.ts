import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/rewrite/:id',
    name: 'RewriteView',
    component: () => import(/* webpackChunkName: "rewrite-view" */ '../views/RewriteView.vue'),
    props: true // Pass route params (like :id) as props to the component
  },
  {
    path: '/article/:id',
    name: 'ArticleDetail',
    component: () => import(/* webpackChunkName: "article-detail" */ '../views/ArticleDetail.vue'),
    props: true // This enables passing route params as props
  },
  {
    path: '/about',
    name: 'About',
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
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
