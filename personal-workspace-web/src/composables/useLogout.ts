import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { logout as logoutRequest } from '@/api/auth'
import { LOGIN_ROUTE_NAME } from '@/constants/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * 退出登录：先清本地会话（保证 UI 立刻回到未登录态），再通知后端。
 * 后端接口失败不应该把用户困在已登录界面，因此错误只做提示。
 */
export function useLogout() {
  const router = useRouter()
  const authStore = useAuthStore()

  const pending = shallowRef(false)
  const errorMessage = shallowRef('')

  async function logout(): Promise<void> {
    if (pending.value) {
      return
    }
    pending.value = true
    errorMessage.value = ''
    const controller = new AbortController()
    authStore.clearSession()

    try {
      await logoutRequest({ signal: controller.signal })
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      pending.value = false
    }

    await router.replace({ name: LOGIN_ROUTE_NAME })
  }

  return {
    isPending: computed<boolean>(() => pending.value),
    errorMessage: computed<string>(() => errorMessage.value),
    logout
  }
}
