<script setup lang="ts">
import { computed, onMounted, shallowRef, useId, useTemplateRef } from 'vue'

type TextFieldType = 'text' | 'password' | 'email'

interface Props {
  label: string
  type?: TextFieldType
  placeholder?: string
  autocomplete?: string
  errorMessage?: string
  hint?: string
  disabled?: boolean
  autofocus?: boolean
  name?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  autocomplete: 'off',
  errorMessage: '',
  hint: '',
  disabled: false,
  autofocus: false,
  name: '',
  required: false
})

const model = defineModel<string>({ required: true })

const uid = useId()
const inputId = `${uid}-input`
const hintId = `${uid}-hint`
const errorId = `${uid}-error`

const inputRef = useTemplateRef<HTMLInputElement>('input')
const revealed = shallowRef(false)

const isPassword = computed<boolean>(() => props.type === 'password')
const inputType = computed<string>(() => (isPassword.value && revealed.value ? 'text' : props.type))
const describedBy = computed<string>(() =>
  [props.errorMessage ? errorId : '', props.hint ? hintId : ''].filter(Boolean).join(' ')
)

function toggleRevealed(): void {
  revealed.value = !revealed.value
  inputRef.value?.focus()
}

onMounted(() => {
  if (props.autofocus) {
    inputRef.value?.focus()
  }
})
</script>

<template>
  <div class="field">
    <label class="field__label" :for="inputId">{{ label }}</label>
    <div class="field__control" :class="{ 'field__control--invalid': !!errorMessage }">
      <input
        ref="input"
        class="field__input"
        :id="inputId"
        :name="name || undefined"
        :type="inputType"
        v-model="model"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :aria-invalid="errorMessage ? 'true' : undefined"
        :aria-describedby="describedBy || undefined"
        :required="required"
      />
      <button
        v-if="isPassword"
        type="button"
        class="field__reveal"
        :aria-pressed="revealed ? 'true' : 'false'"
        :aria-label="revealed ? '隐藏密码' : '显示密码'"
        :title="revealed ? '隐藏密码' : '显示密码'"
        :disabled="disabled"
        @click="toggleRevealed"
      >
        <span class="icon icon--sm" aria-hidden="true">
          <svg v-if="revealed" viewBox="0 0 24 24">
            <path d="M4 4l16 16" />
            <path d="M2.5 12S6 6.5 12 6.5c1.6 0 3 .35 4.2.86M21.5 12S18 17.5 12 17.5c-1.6 0-3-.35-4.2-.86" />
            <path d="M9.9 9.95a3 3 0 0 0 4.2 4.2" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        </span>
      </button>
    </div>
    <p v-if="errorMessage" :id="errorId" class="field__error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="hint" :id="hintId" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: 6px;
}

.field__label {
  color: var(--color-muted);
  font-size: var(--font-xs);
}

.field__control {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.field__control:focus-within {
  border-color: var(--color-accent);
}

.field__control--invalid {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

.field__input {
  flex: 1;
  min-width: 0;
  padding: 9px 0;
  border: none;
  background: transparent;
  font-size: var(--font-md);
}

.field__input::placeholder {
  color: var(--color-muted);
}

.field__input:focus {
  outline: none;
}

.field__reveal {
  display: grid;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
}

.field__reveal:hover {
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

.field__error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-xs);
}

.field__hint {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-xs);
}
</style>
