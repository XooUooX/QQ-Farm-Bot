<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const username = ref('admin')
const password = ref('admin')
const loading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  void appStore.fetchLoginPageConfig()
})

async function submit() {
  if (loading.value) return
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = '请输入账号和密码'
    return
  }
  loading.value = true
  try {
    const { data } = await api.post('/api/login', {
      username: username.value.trim(),
      password: password.value,
    })
    if (!data?.ok || !data.data?.token)
      throw new Error(data?.error || '登录失败')
    const user = data.data.user || {}
    userStore.token = data.data.token
    userStore.userInfo = {
      username: user.username || username.value.trim(),
      role: user.role || data.data.role || 'admin',
      card: user.card ?? data.data.card ?? null,
      accountLimit: user.accountLimit ?? data.data.accountLimit ?? Number.MAX_SAFE_INTEGER,
      avatar: user.avatar,
    }
    await router.replace('/')
  }
  catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || '登录失败'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="h-full min-h-screen flex items-center justify-center px-4 py-8">
    <section class="glass-panel w-full max-w-md rounded-2xl p-6 shadow-xl sm:p-8">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <img :src="appStore.loginPageConfig.logoUrl || '/icon.png'" :alt="appStore.loginPageConfig.title" class="h-full w-full object-cover">
        </div>
        <h1 class="text-2xl text-gray-900 font-bold dark:text-gray-100">{{ appStore.loginPageConfig.title || 'QQ农场智能助手' }}</h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ appStore.loginPageConfig.loginSubtitle || '欢迎回来，开启智慧农耕之旅' }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <BaseInput v-model="username" label="管理员账号" autocomplete="username" placeholder="请输入管理员账号" />
        <BaseInput v-model="password" label="密码" type="password" autocomplete="current-password" placeholder="请输入密码" />
        <div v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
          {{ errorMessage }}
        </div>
        <BaseButton type="submit" variant="primary" block :loading="loading">
          登录面板
        </BaseButton>
      </form>
      <p class="mt-5 text-center text-xs text-gray-400">首次使用默认账号：admin，默认密码：admin</p>
    </section>
  </main>
</template>
