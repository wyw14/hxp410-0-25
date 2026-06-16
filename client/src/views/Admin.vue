<template>
  <div class="admin-container">
    <div class="card admin-card">
      <div class="card-header">
        <span class="icon">⚙️</span>
        <h2>接力内容管理</h2>
      </div>

      <div class="admin-nav">
        <button class="nav-btn" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
          全部 ({{ relays.length }})
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'hidden' }" @click="activeTab = 'hidden'">
          已隐藏 ({{ hiddenCount }})
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'visible' }" @click="activeTab = 'visible'">
          已显示 ({{ visibleCount }})
        </button>
        <button class="nav-btn back-btn" @click="goHome">
          ← 返回首页
        </button>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在加载接力列表...</p>
      </div>

      <div v-else-if="filteredRelays.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无{{ activeTab === 'hidden' ? '已隐藏' : activeTab === 'visible' ? '已显示' : '' }}接力内容</p>
      </div>

      <div v-else class="admin-list">
        <div
          v-for="relay in filteredRelays"
          :key="relay.id"
          class="admin-item"
          :class="{ 'item-hidden': relay.hidden }"
        >
          <div class="item-header">
            <span class="item-status" :class="relay.hidden ? 'status-hidden' : 'status-visible'">
              {{ relay.hidden ? '已隐藏' : '已显示' }}
            </span>
            <span class="item-time">{{ formatTime(relay.createdAt) }}</span>
          </div>

          <div class="item-secret">
            <span class="label">原秘密：</span>
            <p class="secret-preview">"{{ relay.secretContent }}"</p>
          </div>

          <div class="item-relay">
            <span class="label">接力内容：</span>
            <p class="relay-text">"{{ relay.content }}"</p>
          </div>

          <div class="item-actions">
            <button
              v-if="relay.hidden"
              class="btn btn-secondary action-btn show-btn"
              :disabled="processingId === relay.id"
              @click="toggleRelay(relay.id, false)"
            >
              {{ processingId === relay.id ? '处理中...' : '恢复显示' }}
            </button>
            <button
              v-else
              class="btn btn-secondary action-btn hide-btn"
              :disabled="processingId === relay.id"
              @click="toggleRelay(relay.id, true)"
            >
              {{ processingId === relay.id ? '处理中...' : '隐藏内容' }}
            </button>
          </div>

          <div v-if="errorId === relay.id" class="item-error">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const relays = ref([])
const activeTab = ref('all')
const processingId = ref(null)
const errorId = ref(null)
const errorMessage = ref('')

const hiddenCount = computed(() => relays.value.filter(r => r.hidden).length)
const visibleCount = computed(() => relays.value.filter(r => !r.hidden).length)

const filteredRelays = computed(() => {
  if (activeTab.value === 'hidden') {
    return relays.value.filter(r => r.hidden)
  }
  if (activeTab.value === 'visible') {
    return relays.value.filter(r => !r.hidden)
  }
  return relays.value
})

async function fetchRelays() {
  loading.value = true
  try {
    const response = await fetch('/api/admin/relays')
    const data = await response.json()
    if (data.success) {
      relays.value = data.relays
    }
  } catch (error) {
    console.error('获取接力列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function toggleRelay(id, shouldHide) {
  processingId.value = id
  errorId.value = null
  errorMessage.value = ''

  try {
    const endpoint = shouldHide
      ? `/api/admin/relays/${id}/hide`
      : `/api/admin/relays/${id}/show`

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.success) {
      const relay = relays.value.find(r => r.id === id)
      if (relay) {
        relay.hidden = shouldHide
      }
    } else {
      errorId.value = id
      errorMessage.value = data.error || '操作失败，请重试'
    }
  } catch (error) {
    console.error('操作失败:', error)
    errorId.value = id
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    processingId.value = null
  }
}

function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function goHome() {
  router.push('/')
}

onMounted(() => {
  fetchRelays()
})
</script>

<style scoped>
.admin-container {
  width: 100%;
  max-width: 800px;
}

.admin-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 25px;
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.card-header h2 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.admin-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
}

.nav-btn {
  padding: 8px 18px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: #e8e8e8;
}

.nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.nav-btn.back-btn {
  margin-left: auto;
  background: #fff;
  border: 1px solid #ddd;
}

.nav-btn.back-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #999;
  font-size: 16px;
  margin: 0;
}

.admin-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 5px;
}

.admin-list::-webkit-scrollbar {
  width: 6px;
}

.admin-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.admin-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

.admin-item {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.admin-item:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.admin-item.item-hidden {
  background: #fafafa;
  opacity: 0.7;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.item-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-visible {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-hidden {
  background: #ffebee;
  color: #c62828;
}

.item-time {
  font-size: 12px;
  color: #999;
}

.item-secret,
.item-relay {
  margin-bottom: 12px;
}

.label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  display: block;
  margin-bottom: 5px;
}

.secret-preview,
.relay-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 10px 12px;
  background: #f9f9f9;
  border-radius: 8px;
  font-style: italic;
}

.item-relay .relay-text {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf3 100%);
  border-left: 3px solid #667eea;
}

.item-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  padding: 8px 20px;
  font-size: 13px;
  border-radius: 8px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hide-btn {
  background: #fff3f3;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
}

.hide-btn:hover:not(:disabled) {
  background: #ffebee;
  border-color: #ef9a9a;
}

.show-btn {
  background: #f1f8e9;
  color: #388e3c;
  border: 1px solid #c5e1a5;
}

.show-btn:hover:not(:disabled) {
  background: #e8f5e9;
  border-color: #a5d6a7;
}

.item-error {
  margin-top: 10px;
  padding: 8px 12px;
  background: #ffe6e6;
  color: #d32f2f;
  border-radius: 6px;
  font-size: 13px;
}
</style>
