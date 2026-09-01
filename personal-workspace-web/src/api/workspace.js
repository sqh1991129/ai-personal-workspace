import http from '@/api/http'

export function checkHealth(options = {}) {
  return http.get('/health', { signal: options.signal })
}
