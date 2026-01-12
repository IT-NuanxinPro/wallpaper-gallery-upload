<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal">
          <div class="modal__header">
            <h3>📁 新建分类</h3>
            <button class="modal__close" @click="$emit('close')">×</button>
          </div>

          <div class="modal__body">
            <div class="modal__form-group">
              <label>分类级别</label>
              <div class="modal__radio-group">
                <label
                  class="modal__radio"
                  :class="{ 'modal__radio--active': form.level === 'l1' }"
                >
                  <input v-model="form.level" type="radio" value="l1" />
                  <span class="modal__radio-dot"></span>
                  一级分类
                </label>
                <label
                  class="modal__radio"
                  :class="{
                    'modal__radio--active': form.level === 'l2',
                    'modal__radio--disabled': !parentCategory
                  }"
                >
                  <input v-model="form.level" type="radio" value="l2" :disabled="!parentCategory" />
                  <span class="modal__radio-dot"></span>
                  二级分类
                </label>
              </div>
            </div>

            <div v-if="form.level === 'l2'" class="modal__form-group">
              <label>父分类</label>
              <div class="modal__form-value">{{ parentCategory }}</div>
            </div>

            <div class="modal__form-group">
              <label>分类名称</label>
              <input
                v-model="form.name"
                type="text"
                class="modal__form-input"
                placeholder="请输入分类名称"
                maxlength="20"
              />
            </div>
          </div>

          <div class="modal__footer">
            <button class="modal__btn modal__btn--ghost" @click="$emit('close')">取消</button>
            <button
              class="modal__btn modal__btn--primary"
              :disabled="creating"
              @click="handleCreate"
            >
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  parentCategory: { type: String, default: '' },
  creating: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'create'])

const form = reactive({ level: 'l1', name: '' })

watch(
  () => props.visible,
  v => {
    if (v) {
      form.level = 'l1'
      form.name = ''
    }
  }
)

function handleCreate() {
  emit('create', { ...form })
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  width: 100%;
  max-width: 400px;
  background: rgba(31, 41, 55, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: $radius-xl;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-4 $spacing-5;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    h3 {
      color: $white;
      font-size: $font-size-base;
      font-weight: 600;
      margin: 0;
    }
  }

  &__close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: $radius-md;
    color: $gray-400;
    font-size: 18px;
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: $white;
    }
  }

  &__body {
    padding: $spacing-5;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
    padding: $spacing-4 $spacing-5;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__form-group {
    margin-bottom: $spacing-4;
    label {
      display: block;
      color: $gray-300;
      font-size: $font-size-sm;
      margin-bottom: $spacing-2;
    }
  }

  &__form-input {
    width: 100%;
    padding: $spacing-3 $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: $radius-lg;
    color: $white;
    font-size: $font-size-base;

    &::placeholder {
      color: $gray-500;
    }
    &:focus {
      outline: none;
      border-color: $primary-start;
      box-shadow: 0 0 0 3px rgba($primary-start, 0.2);
    }
  }

  &__form-value {
    padding: $spacing-3 $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-lg;
    color: $gray-300;
  }

  &__radio-group {
    display: flex;
    gap: $spacing-3;
  }

  &__radio {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: $radius-lg;
    color: $gray-300;
    cursor: pointer;

    input {
      display: none;
    }

    &-dot {
      width: 14px;
      height: 14px;
      border: 2px solid $gray-500;
      border-radius: 50%;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        inset: 2px;
        background: $primary-start;
        border-radius: 50%;
        opacity: 0;
      }
    }

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &--active {
      border-color: $primary-start;
      background: rgba($primary-start, 0.1);
      color: $white;

      .modal__radio-dot {
        border-color: $primary-start;
        &::after {
          opacity: 1;
        }
      }
    }
    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__btn {
    padding: $spacing-2 $spacing-4;
    border: none;
    border-radius: $radius-lg;
    font-size: $font-size-sm;
    font-weight: 500;
    cursor: pointer;
    transition: all $duration-normal $ease-out;

    &--primary {
      background: $primary-gradient;
      color: $white;
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba($primary-start, 0.4);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    &--ghost {
      background: transparent;
      color: $gray-400;
      &:hover {
        color: $white;
      }
    }
  }
}

// 动画
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  .modal {
    transform: scale(0.9) translateY(20px);
  }
}
</style>
