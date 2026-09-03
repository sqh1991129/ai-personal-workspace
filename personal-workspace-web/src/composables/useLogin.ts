import { computed, onScopeDispose, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isApiError } from '@/api/http'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { resolveSafeRedirect } from '@/utils/redirect'
import type { LoginPayload } from '@/types/auth'

/**
 * 登录编排：调用 api 层 → 写入 auth store → 回跳原页面。
 * 视图只消费只读投影（isPending / errorMessage / redirectTarget），状态变更全部经 submit()。
 */
export function useLogin() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()

  const pending = shallowRef(false)
  const errorMessage = shallowRef('')
  let controller: AbortController | null = null

  const redirectTarget = computed<string>(() => resolveSafeRedirect(route.query.redirect))

  async function submit(payload: LoginPayload): Promise<void> {
    if (pending.value) {
      return
    }
    controller?.abort()
    controller = new AbortController()
    pending.value = true
    errorMessage.value = ''

    try {
      const session = await login(payload, { signal: controller.signal })
      authStore.startSession(session, payload.remember)
      // redirectTarget 已由 resolveSafeRedirect 兜底为站内路径，无需再判空
      await router.replace(redirectTarget.value)
    } catch (error) {
      // 组件卸载或重复提交导致的取消不是失败，不提示用户
      if (isApiError(error) && error.code === 'CANCELED') {
        return
      }
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      pending.value = false
    }
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  return {
    isPending: computed<boolean>(() => pending.value),
    errorMessage: computed<string>(() => errorMessage.value),
    redirectTarget,
    submit
  }
}
