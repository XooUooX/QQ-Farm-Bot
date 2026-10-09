import { ref } from 'vue'
import api from '@/api'
import { useUserStore } from '@/stores/user'

export interface SystemConfig {
  serverUrl: string
  clientVersion: string
  platform: string
  os: string
}

export interface LoginLinks {
  logoUrl: string
  title: string
  loginSubtitle: string
  registerSubtitle: string
  purchaseUrl: string
  qqGroupUrl: string
}

export interface AdminAuthConfig {
  username: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface UseAdminSystemConfigOptions {
  showAlert: (message: string, type?: 'primary' | 'danger') => void
}

const defaultSystemConfigValues: SystemConfig = {
  serverUrl: 'wss://gate-obt.nqf.qq.com/prod/ws',
  clientVersion: '1.14.2.15_20260922',
  platform: 'qq',
  os: 'iOS',
}

const defaultLoginLinks: LoginLinks = {
  logoUrl: '',
  title: 'QQ农场智能助手',
  loginSubtitle: '欢迎回来，开启智慧农耕之旅',
  registerSubtitle: '创建账号，开启智慧农耕之旅',
  purchaseUrl: '',
  qqGroupUrl: '',
}

export function useAdminSystemConfig(options: UseAdminSystemConfigOptions) {
  const userStore = useUserStore()
  const systemConfigSaving = ref(false)
  const systemConfigLoading = ref(false)
  const loginLinksSaving = ref(false)
  const loginLogoUploading = ref(false)
  const adminAuthSaving = ref(false)

  const showResetSystemConfirm = ref(false)
  const showSaveSystemConfirm = ref(false)
  const showResetLoginLinksConfirm = ref(false)

  const localSystemConfig = ref<SystemConfig>({ ...defaultSystemConfigValues })
  const defaultSystemConfig = ref<SystemConfig>({ ...defaultSystemConfigValues })
  const localLoginLinks = ref<LoginLinks>({ ...defaultLoginLinks })
  const adminAuthConfig = ref<AdminAuthConfig>({ username: 'admin', currentPassword: '', newPassword: '', confirmPassword: '' })

  async function loadLoginLinks() {
    try {
      const { data } = await api.get('/api/admin/login-links')
      if (data?.ok && data.data)
        localLoginLinks.value = { ...data.data }
    }
    catch (e: any) {
      console.error('加载登录页链接失败:', e)
    }
  }

  async function handleSaveLoginLinks() {
    loginLinksSaving.value = true
    try {
      const { data } = await api.post('/api/admin/login-links', {
        ...localLoginLinks.value,
        confirmed: true,
      })
      if (data?.ok) {
        localLoginLinks.value = { ...data.data }
        options.showAlert('登录页设置已保存', 'primary')
      }
      else {
        options.showAlert(data?.error || '保存失败', 'danger')
      }
    }
    catch (e: any) {
      options.showAlert(`保存失败: ${e.message || '未知错误'}`, 'danger')
    }
    finally {
      loginLinksSaving.value = false
    }
  }

  async function handleResetLoginLinks() {
    showResetLoginLinksConfirm.value = false
    loginLinksSaving.value = true
    try {
      const { data } = await api.post('/api/admin/login-links/reset', {
        confirmed: true,
      })
      if (data?.ok && data.data) {
        localLoginLinks.value = { ...data.data }
        options.showAlert('登录页设置已恢复默认', 'primary')
      }
      else {
        options.showAlert(data?.error || '恢复默认失败', 'danger')
      }
    }
    catch (e: any) {
      options.showAlert(e?.response?.data?.error || `恢复默认失败: ${e.message || '未知错误'}`, 'danger')
    }
    finally {
      loginLinksSaving.value = false
    }
  }

  function openResetLoginLinksConfirm() {
    showResetLoginLinksConfirm.value = true
  }

  async function handleUploadLoginLogo(file: File) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
    if (!allowedTypes.includes(file.type)) {
      options.showAlert('仅支持 PNG、JPG、WebP、GIF、SVG 或 ICO 图片', 'danger')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      options.showAlert('图片大小不能超过 2MB', 'danger')
      return
    }

    loginLogoUploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/api/admin/login-logo', formData)
      if (data?.ok && data.data) {
        localLoginLinks.value = { ...data.data }
        options.showAlert('登录图标已上传并保存', 'primary')
      }
      else {
        options.showAlert(data?.error || '上传失败', 'danger')
      }
    }
    catch (e: any) {
      options.showAlert(e?.response?.data?.error || `上传失败: ${e.message || '未知错误'}`, 'danger')
    }
    finally {
      loginLogoUploading.value = false
    }
  }

  const platformOptions = [
    { label: 'QQ', value: 'qq' },
    { label: '微信', value: 'wx' },
  ]

  const osOptions = [
    { label: 'iOS', value: 'iOS' },
    { label: 'Android', value: 'Android' },
  ]

  async function loadSystemConfig() {
    systemConfigLoading.value = true
    try {
      const { data } = await api.get('/api/admin/system-config')
      if (data?.ok) {
        if (data.data.saved)
          localSystemConfig.value = { ...data.data.saved }
        if (data.data.default)
          defaultSystemConfig.value = { ...data.data.default }
      }
    }
    catch (e: any) {
      console.error('加载系统配置失败:', e)
    }
    finally {
      systemConfigLoading.value = false
    }
  }

  async function loadAdminAuthConfig() {
    try {
      const { data } = await api.get('/api/admin/auth-config')
      if (data?.ok && data.data?.username)
        adminAuthConfig.value.username = data.data.username
    }
    catch (e: any) {
      console.error('加载管理员账号失败:', e)
    }
  }

  async function handleSaveAdminAuthConfig() {
    adminAuthSaving.value = true
    try {
      const { data } = await api.post('/api/admin/auth-config', adminAuthConfig.value)
      if (!data?.ok)
        throw new Error(data?.error || '保存管理员账号失败')
      if (data.data?.token)
        userStore.token = data.data.token
      userStore.userInfo = {
        username: data.data.username,
        role: 'admin',
        card: null,
        accountLimit: Number.MAX_SAFE_INTEGER,
      }
      adminAuthConfig.value.currentPassword = ''
      adminAuthConfig.value.newPassword = ''
      adminAuthConfig.value.confirmPassword = ''
      options.showAlert('管理员账号已更新，请使用新凭据登录', 'primary')
    }
    catch (e: any) {
      options.showAlert(e?.response?.data?.error || e.message || '保存管理员账号失败', 'danger')
    }
    finally {
      adminAuthSaving.value = false
    }
  }

  async function handleSaveSystemConfig() {
    showSaveSystemConfirm.value = false
    systemConfigSaving.value = true
    try {
      const { data } = await api.post('/api/admin/system-config', {
        ...localSystemConfig.value,
        confirmed: true,
      })
      if (data?.ok)
        options.showAlert('系统配置已保存并立即生效，无需重启项目', 'primary')
      else
        options.showAlert(data?.error || '保存失败', 'danger')
    }
    catch (e: any) {
      options.showAlert(`保存失败: ${e.message || '未知错误'}`, 'danger')
    }
    finally {
      systemConfigSaving.value = false
    }
  }

  async function handleResetSystemConfig() {
    showResetSystemConfirm.value = false
    systemConfigSaving.value = true
    try {
      const { data } = await api.post('/api/admin/system-config/reset', {
        confirmed: true,
      })
      if (data?.ok) {
        localSystemConfig.value = { ...data.data.saved }
        options.showAlert('系统配置已重置为默认值', 'primary')
      }
      else {
        options.showAlert(data?.error || '重置失败', 'danger')
      }
    }
    catch (e: any) {
      options.showAlert(`重置失败: ${e.message || '未知错误'}`, 'danger')
    }
    finally {
      systemConfigSaving.value = false
    }
  }

  function openResetSystemConfirm() {
    showResetSystemConfirm.value = true
  }

  function openSaveSystemConfirm() {
    showSaveSystemConfirm.value = true
  }

  return {
    systemConfigSaving,
    systemConfigLoading,
    loginLinksSaving,
    loginLogoUploading,
    adminAuthSaving,
    showResetSystemConfirm,
    showSaveSystemConfirm,
    showResetLoginLinksConfirm,
    localSystemConfig,
    defaultSystemConfig,
    localLoginLinks,
    platformOptions,
    osOptions,
    loadLoginLinks,
    handleSaveLoginLinks,
    handleResetLoginLinks,
    openResetLoginLinksConfirm,
    handleUploadLoginLogo,
    loadSystemConfig,
    adminAuthConfig,
    loadAdminAuthConfig,
    handleSaveAdminAuthConfig,
    handleSaveSystemConfig,
    handleResetSystemConfig,
    openResetSystemConfirm,
    openSaveSystemConfirm,
  }
}
