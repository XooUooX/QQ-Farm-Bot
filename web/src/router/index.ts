import { useStorage } from '@vueuse/core'
import NProgress from 'nprogress'
import { createRouter, createWebHistory } from 'vue-router'
import { menuRoutes } from './menu'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

const adminToken = useStorage('admin_token', '')
async function ensureAdminSession() {
  if (!adminToken.value) {
    const persistedToken = localStorage.getItem('admin_token') || ''
    if (persistedToken)
      adminToken.value = persistedToken
  }
  return !!adminToken.value
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: menuRoutes.map(route => ({
        path: route.path,
        name: route.name,
        component: route.component,
      })),
    },
    { path: '/admin', redirect: '/settings?tab=system' },
    { path: '/login', component: () => import('@/views/Login.vue') },
    { path: '/renewal', redirect: '/' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  NProgress.start()
  if (to.path === '/login') return true
  if (!(await ensureAdminSession())) return { path: '/login', query: { redirect: to.fullPath } }
  return true
})

router.afterEach(() => NProgress.done())

export default router
