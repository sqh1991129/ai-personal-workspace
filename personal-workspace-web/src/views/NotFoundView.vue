<template>
  <section class="not-found">
    <p class="not-found__code">404</p>
    <h1>页面不存在</h1>
    <p class="not-found__hint">
      地址可能输错了，
      <RouterLink :to="{ name: 'home' }">返回工作台</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.not-found {
  padding: var(--space-5) 0;
  text-align: center;
}

.not-found__code {
  margin: 0;
  font-size: 64px;
  font-weight: 700;
  color: var(--color-border);
}

.not-found h1 {
  margin: var(--space-2) 0;
  font-size: 22px;
}

.not-found__hint {
  color: var(--color-muted);
}
</style>
