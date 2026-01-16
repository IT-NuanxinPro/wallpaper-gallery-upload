<template>
  <MainLayout>
    <div class="ai-assistant-view">
      <AIAssistantPanel />
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/components/MainLayout.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'
</script>

<style lang="scss" scoped>
.ai-assistant-view {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
