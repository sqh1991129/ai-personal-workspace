<script setup lang="ts">
/**
 * 登录页左侧插画：用几何图形表达项目背景（会话列表 → 流式对话 → 知识库召回 → 自动化任务）。
 * 刻意不写死色值，全部取 src/styles/global.css 的令牌，因此明暗主题自动跟随；
 * 也不用位图，避免为一张装饰图引入资源体积与两套主题版本。
 */
withDefaults(defineProps<{ label?: string }>(), {
  label: '个人 AI 工作台示意图：左侧会话列表、中间流式对话与引用来源、右侧知识库召回，底部为规划中的自动化任务'
})
</script>

<template>
  <figure class="login-hero">
    <svg viewBox="0 0 560 424" role="img" :aria-label="label">
      <defs>
        <pattern id="hero-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0v28" fill="none" stroke="var(--color-border)" stroke-width="1" />
        </pattern>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.22" />
          <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0" />
        </radialGradient>
        <clipPath id="hero-window">
          <rect x="40" y="36" width="480" height="300" rx="18" />
        </clipPath>
      </defs>

      <rect x="24" y="20" width="512" height="336" rx="24" fill="url(#hero-grid)" opacity="0.5" />
      <circle cx="452" cy="86" r="118" fill="url(#hero-glow)" />
      <circle cx="96" cy="300" r="96" fill="url(#hero-glow)" opacity="0.7" />

      <rect x="40" y="36" width="480" height="300" rx="18" fill="var(--color-surface)" stroke="var(--color-border)" />
      <g clip-path="url(#hero-window)">
        <rect x="40" y="36" width="480" height="34" fill="var(--color-surface-sunken)" />
        <path d="M40 70h480" stroke="var(--color-border)" />
      </g>
      <circle cx="62" cy="53" r="4" fill="var(--color-danger)" opacity="0.75" />
      <circle cx="78" cy="53" r="4" fill="var(--color-warning)" opacity="0.75" />
      <circle cx="94" cy="53" r="4" fill="var(--color-accent)" opacity="0.85" />
      <rect x="112" y="47" width="104" height="12" rx="6" fill="var(--color-border)" opacity="0.8" />

      <rect x="56" y="86" width="112" height="236" rx="12" fill="var(--color-surface-sunken)" />
      <rect x="68" y="98" width="88" height="18" rx="9" fill="var(--color-accent)" opacity="0.14" />
      <rect x="68" y="98" width="88" height="18" rx="9" fill="none" stroke="var(--color-accent)" stroke-opacity="0.55" />
      <circle cx="78" cy="107" r="3.5" fill="var(--color-accent)" />
      <rect x="88" y="104" width="56" height="6" rx="3" fill="var(--color-text)" opacity="0.55" />
      <g fill="var(--color-text)" opacity="0.22">
        <rect x="68" y="126" width="88" height="18" rx="9" />
        <rect x="68" y="154" width="88" height="18" rx="9" />
        <rect x="68" y="182" width="88" height="18" rx="9" />
        <rect x="68" y="210" width="64" height="18" rx="9" />
      </g>
      <g fill="var(--color-muted)" opacity="0.45">
        <circle cx="78" cy="135" r="3.5" />
        <circle cx="78" cy="163" r="3.5" />
        <circle cx="78" cy="191" r="3.5" />
        <circle cx="78" cy="219" r="3.5" />
      </g>

      <rect x="240" y="92" width="120" height="28" rx="14" fill="var(--color-user-bubble)" />
      <g fill="var(--color-text)" opacity="0.45">
        <rect x="256" y="103" width="72" height="6" rx="3" />
      </g>

      <rect x="188" y="132" width="172" height="92" rx="12" fill="var(--color-surface)" stroke="var(--color-border)" />
      <g fill="var(--color-text)" opacity="0.28">
        <rect x="204" y="148" width="140" height="7" rx="3.5" />
        <rect x="204" y="164" width="124" height="7" rx="3.5" />
        <rect x="204" y="180" width="132" height="7" rx="3.5" />
      </g>
      <rect x="204" y="196" width="76" height="7" rx="3.5" fill="var(--color-text)" opacity="0.28" />
      <rect class="hero-caret" x="288" y="192" width="3" height="15" rx="1.5" fill="var(--color-accent)" />

      <g>
        <rect x="188" y="236" width="80" height="22" rx="11" fill="var(--color-info-soft)" stroke="var(--color-info)" stroke-opacity="0.35" />
        <circle cx="200" cy="247" r="3.5" fill="var(--color-info)" />
        <rect x="210" y="244" width="44" height="6" rx="3" fill="var(--color-info)" opacity="0.5" />
        <rect x="276" y="236" width="80" height="22" rx="11" fill="var(--color-info-soft)" stroke="var(--color-info)" stroke-opacity="0.35" />
        <circle cx="288" cy="247" r="3.5" fill="var(--color-info)" />
        <rect x="298" y="244" width="44" height="6" rx="3" fill="var(--color-info)" opacity="0.5" />
      </g>

      <g>
        <rect x="188" y="282" width="68" height="26" rx="13" fill="var(--color-surface)" stroke="var(--color-border)" />
        <circle cx="206" cy="295" r="3.5" fill="var(--color-muted)" opacity="0.55" />
        <circle cx="218" cy="295" r="3.5" fill="var(--color-muted)" opacity="0.38" />
        <circle cx="230" cy="295" r="3.5" fill="var(--color-muted)" opacity="0.22" />
        <rect x="284" y="282" width="76" height="26" rx="13" fill="var(--color-user-bubble)" />
        <rect x="298" y="292" width="48" height="6" rx="3" fill="var(--color-text)" opacity="0.4" />
      </g>

      <rect x="376" y="86" width="128" height="236" rx="12" fill="var(--color-surface-sunken)" />
      <g>
        <rect x="390" y="100" width="100" height="26" rx="8" fill="var(--color-surface)" stroke="var(--color-border)" />
        <path d="M400 108h8l4 4v6h-12z" fill="none" stroke="var(--color-muted)" stroke-width="1.4" />
        <rect x="414" y="109" width="52" height="5" rx="2.5" fill="var(--color-text)" opacity="0.3" />
        <rect x="414" y="117" width="34" height="4" rx="2" fill="var(--color-text)" opacity="0.18" />
        <circle cx="482" cy="113" r="4" fill="var(--color-success)" opacity="0.8" />
      </g>
      <g>
        <rect x="390" y="134" width="100" height="26" rx="8" fill="var(--color-surface)" stroke="var(--color-border)" />
        <path d="M400 142h8l4 4v6h-12z" fill="none" stroke="var(--color-muted)" stroke-width="1.4" />
        <rect x="414" y="143" width="46" height="5" rx="2.5" fill="var(--color-text)" opacity="0.3" />
        <rect x="414" y="151" width="28" height="4" rx="2" fill="var(--color-text)" opacity="0.18" />
        <circle cx="482" cy="147" r="4" fill="var(--color-warning)" opacity="0.7" />
      </g>

      <rect x="390" y="174" width="100" height="134" rx="10" fill="var(--color-surface)" stroke="var(--color-border)" />
      <g stroke="var(--color-accent)" stroke-opacity="0.35">
        <path d="M412 200l28-14 28 26-56 12zM412 200l28 38 28-26M440 186l14 40-42-12" fill="none" />
      </g>
      <g fill="var(--color-accent)">
        <circle cx="412" cy="200" r="5" />
        <circle cx="440" cy="186" r="4" opacity="0.7" />
        <circle cx="468" cy="212" r="6" />
        <circle cx="440" cy="238" r="4" opacity="0.7" />
      </g>
      <g fill="var(--color-muted)" opacity="0.5">
        <circle cx="404" cy="252" r="3" />
        <circle cx="424" cy="266" r="3" />
        <circle cx="452" cy="258" r="3" />
        <circle cx="470" cy="272" r="3" />
      </g>
      <rect x="402" y="286" width="76" height="6" rx="3" fill="var(--color-accent)" opacity="0.35" />

      <g>
        <rect x="120" y="360" width="150" height="44" rx="14" fill="var(--color-surface)" stroke="var(--color-accent)" stroke-dasharray="7 6" stroke-opacity="0.6" />
        <circle cx="146" cy="382" r="10" fill="none" stroke="var(--color-accent)" stroke-width="1.8" />
        <path d="M146 377v5l4 3" fill="none" stroke="var(--color-accent)" stroke-width="1.8" stroke-linecap="round" />
        <rect x="164" y="372" width="72" height="6" rx="3" fill="var(--color-text)" opacity="0.35" />
        <rect x="164" y="384" width="48" height="5" rx="2.5" fill="var(--color-text)" opacity="0.2" />
      </g>
      <g>
        <rect x="290" y="360" width="150" height="44" rx="14" fill="var(--color-surface)" stroke="var(--color-border)" />
        <rect x="306" y="372" width="14" height="14" rx="4" fill="none" stroke="var(--color-muted)" stroke-width="1.6" />
        <path d="M309 379l3 3 5-6" fill="none" stroke="var(--color-success)" stroke-width="1.8" stroke-linecap="round" />
        <rect x="330" y="372" width="72" height="6" rx="3" fill="var(--color-text)" opacity="0.35" />
        <rect x="330" y="384" width="44" height="5" rx="2.5" fill="var(--color-text)" opacity="0.2" />
      </g>
      <!-- 连接线必须画在节点之后，否则会被节点的不透明底色遮住 -->
      <g class="hero-flow">
        <path d="M195 360v-12h170v12M280 336v12" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 7" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" />
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.login-hero {
  margin: 0;
}

.login-hero svg {
  display: block;
  width: 100%;
  height: auto;
}

.hero-caret {
  animation: hero-blink 1.1s steps(2, start) infinite;
}

.hero-flow path {
  animation: hero-dash 6s linear infinite;
}

@keyframes hero-blink {
  50% {
    opacity: 0;
  }
}

@keyframes hero-dash {
  to {
    stroke-dashoffset: -104;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-caret {
    animation: none;
  }

  .hero-flow path {
    animation: none;
  }
}
</style>
