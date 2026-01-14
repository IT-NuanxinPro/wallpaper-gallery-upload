<template>
  <div class="category-sidebar">
    <div class="category-sidebar__header">
      <h3 class="category-sidebar__title">
        <el-icon><Folder /></el-icon>
        分类目录
      </h3>
      <button class="category-sidebar__refresh-btn" title="刷新目录" @click="$emit('refresh')">
        <el-icon><Refresh /></el-icon>
      </button>
      <el-tag v-if="!targetPath" type="warning" size="small" effect="dark">必选</el-tag>
      <el-tag v-else type="success" size="small" effect="dark">已选</el-tag>
    </div>

    <!-- 系列选择 -->
    <div class="category-sidebar__series">
      <button
        v-for="s in seriesList"
        :key="s.value"
        class="category-sidebar__series-btn"
        :class="{ 'category-sidebar__series-btn--active': series === s.value }"
        @click="$emit('select-series', s.value)"
      >
        <span class="category-sidebar__series-icon">{{ s.emoji }}</span>
        <span class="category-sidebar__series-label">{{ s.label }}</span>
      </button>
    </div>

    <!-- 分类树 -->
    <div v-loading="loading" class="category-sidebar__tree">
      <el-tree
        :data="treeData"
        :props="treeProps"
        :load="loadNode"
        lazy
        highlight-current
        node-key="path"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }">
          <div class="category-sidebar__tree-node">
            <span class="category-sidebar__tree-icon">{{ data.type === 'l1' ? '📁' : '📂' }}</span>
            <span class="category-sidebar__tree-label">{{ node.label }}</span>
            <button
              v-if="authStore.canUpload"
              class="category-sidebar__tree-delete"
              title="删除分类"
              @click.stop="handleDelete(data, node)"
            >
              <el-icon><Delete /></el-icon>
            </button>
          </div>
        </template>
      </el-tree>
      <div v-if="!loading && treeData.length === 0" class="category-sidebar__tree-empty">
        <span>暂无分类</span>
      </div>
    </div>

    <!-- 新建分类按钮 -->
    <button v-if="authStore.canUpload" class="category-sidebar__new-btn" @click="$emit('create')">
      <el-icon><Plus /></el-icon>
      新建分类
    </button>
  </div>
</template>

<script setup>
import { Folder, Plus, Delete, Refresh } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

defineProps({
  series: { type: String, required: true },
  treeData: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  targetPath: { type: String, default: '' },
  loadNode: { type: Function, required: true }
})

const emit = defineEmits(['select-series', 'select-category', 'create', 'delete', 'refresh'])

const seriesList = [
  { value: 'desktop', label: '电脑', emoji: '🖥️' },
  { value: 'mobile', label: '手机', emoji: '📱' },
  { value: 'avatar', label: '头像', emoji: '👤' }
]

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: data => data.type === 'l2'
}

function handleNodeClick(data, node) {
  emit('select-category', { data, node })
}

function handleDelete(data, node) {
  emit('delete', { data, node })
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.category-sidebar {
  display: flex;
  flex-direction: column;
  background: $glass-bg;
  backdrop-filter: blur($glass-blur);
  border: 1px solid $glass-border;
  border-radius: $radius-xl;
  padding: $spacing-4;
  overflow: hidden;
  height: 100%;
  min-height: 0;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    margin-bottom: $spacing-3;
    flex-shrink: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $white;
    margin: 0;
    flex: 1;

    .el-icon {
      color: $primary-start;
    }
  }

  &__refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: $gray-400;
    cursor: pointer;
    transition: all $duration-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: $primary-start;
    }

    .el-icon {
      font-size: 14px;
    }
  }

  &__series {
    display: flex;
    gap: $spacing-2;
    margin-bottom: $spacing-3;
    flex-shrink: 0;

    &-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: $spacing-2;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid transparent;
      border-radius: $radius-md;
      cursor: pointer;
      transition: all $duration-normal $ease-out;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }

      &--active {
        background: $primary-gradient;
        border-color: transparent;
        box-shadow: 0 4px 16px rgba($primary-start, 0.4);
      }
    }

    &-icon {
      font-size: 20px;
    }

    &-label {
      font-size: 10px;
      color: $gray-300;

      .category-sidebar__series-btn--active & {
        color: $white;
        font-weight: 500;
      }
    }
  }

  &__tree {
    flex: 1;
    overflow-y: auto;
    margin-bottom: $spacing-3;
    min-height: 0;

    // 让 el-tree 撑满容器
    :deep(.el-tree) {
      height: 100%;
    }

    &-node {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      padding: 2px 0;
      width: 100%;

      &:hover .category-sidebar__tree-delete {
        opacity: 1;
      }
    }

    &-icon {
      font-size: 14px;
    }

    &-label {
      color: $gray-200;
      font-size: $font-size-sm;
      flex: 1;
    }

    &-delete {
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: transparent;
      border: none;
      border-radius: $radius-sm;
      color: $gray-500;
      cursor: pointer;
      transition: all $duration-fast;
      flex-shrink: 0;

      &:hover {
        background: rgba($danger, 0.2);
        color: $danger;
      }

      .el-icon {
        font-size: 12px;
      }
    }

    &-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 80px;
      color: $gray-500;
      font-size: $font-size-sm;
    }

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }
  }

  &__new-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    padding: $spacing-2;
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: $radius-md;
    color: $gray-400;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all $duration-normal;
    flex-shrink: 0;

    &:hover {
      background: rgba($primary-start, 0.1);
      border-color: $primary-start;
      color: $primary-start;
    }
  }
}

// Element Plus 树样式覆盖
:deep(.el-tree) {
  background: transparent;
  color: $gray-300;

  .el-tree-node__content {
    height: 32px;
    border-radius: $radius-md;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .el-tree-node.is-current > .el-tree-node__content {
    background: rgba($primary-start, 0.2);
    color: $white;
  }

  .el-tree-node__expand-icon {
    color: $gray-500;
  }
}
</style>
