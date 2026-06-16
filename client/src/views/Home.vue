<template>
  <div class="home-container">
    <div class="card secret-card">
      <div class="card-header">
        <span class="icon">💫</span>
        <h2>今日被宽恕的秘密</h2>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在寻找一段温暖的秘密...</p>
      </div>

      <div v-else-if="!hasSecret" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ message }}</p>
        <button class="btn btn-primary" @click="goToConfess">
          分享第一个秘密
        </button>
      </div>

      <transition name="fade" v-else>
        <div class="secret-content" :key="secret?.id">
          <p class="secret-text">"{{ secret.content }}"</p>
          <div class="secret-footer">
            <span class="status-badge">{{ secret.status }}</span>
            <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret">
              🔄 换一个
            </button>
          </div>
        </div>
      </transition>

      <div v-if="hasSecret" class="relay-section">
        <div class="relay-header">
          <span class="relay-icon">🤝</span>
          <h3>共鸣接力 ({{ relays.length }})</h3>
        </div>

        <div class="relay-input-area">
          <textarea
            v-model="relayContent"
            class="relay-textarea"
            placeholder="写下你的共鸣，加入接力（一句话，50字以内）..."
            maxlength="50"
            @keydown.enter.exact.prevent="submitRelay"
          ></textarea>
          <div class="relay-input-footer">
            <span class="char-count">{{ relayContent.length }}/50</span>
            <button
              class="btn btn-primary relay-submit-btn"
              :disabled="!relayContent.trim() || submittingRelay"
              @click="submitRelay"
            >
              {{ submittingRelay ? '提交中...' : '传递共鸣' }}
            </button>
          </div>
        </div>

        <div v-if="relaySubmitError" class="error-message">
          {{ relaySubmitError }}
        </div>

        <div v-if="loadingRelays" class="relay-loading">
          <div class="mini-spinner"></div>
          <span>加载接力中...</span>
        </div>

        <div v-else-if="relays.length === 0" class="relay-empty">
          <span class="empty-icon">✨</span>
          <p>成为第一个留下共鸣的人吧</p>
        </div>

        <div v-else class="relay-list">
          <div
            v-for="(relay, index) in relays"
            :key="relay.id"
            class="relay-item"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <div class="relay-avatar">{{ (index + 1) % 10 }}</div>
            <div class="relay-content">
              <p class="relay-text">"{{ relay.content }}"</p>
              <span class="relay-time">{{ formatTime(relay.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-primary" @click="goToConfess">
          我也想倾诉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const hasSecret = ref(false)
const secret = ref(null)
const message = ref('')
const currentSecretId = ref(null)

const relayContent = ref('')
const relays = ref([])
const loadingRelays = ref(false)
const submittingRelay = ref(false)
const relaySubmitError = ref('')

async function fetchRandomSecret() {
  loading.value = true
  try {
    const response = await fetch('/api/secrets/random')
    const data = await response.json()
    hasSecret.value = data.hasSecret
    secret.value = data.secret
    message.value = data.message

    relayContent.value = ''
    relaySubmitError.value = ''
    relays.value = []
    loadingRelays.value = false

    if (data.hasSecret) {
      currentSecretId.value = data.secret.id
      fetchRelays(data.secret.id)
    } else {
      currentSecretId.value = null
    }
  } catch (error) {
    console.error('获取秘密失败:', error)
    hasSecret.value = false
    message.value = '暂时无法连接到服务器'
    relays.value = []
    currentSecretId.value = null
  } finally {
    loading.value = false
  }
}

async function fetchRelays(secretId) {
  if (secretId !== currentSecretId.value) return

  loadingRelays.value = true
  try {
    const response = await fetch(`/api/relays/${secretId}`)
    const data = await response.json()
    if (data.success && secretId === currentSecretId.value) {
      relays.value = data.relays
    }
  } catch (error) {
    console.error('获取接力失败:', error)
    if (secretId === currentSecretId.value) {
      relays.value = []
    }
  } finally {
    if (secretId === currentSecretId.value) {
      loadingRelays.value = false
    }
  }
}

async function submitRelay() {
  if (!relayContent.value.trim() || !secret.value) return
  if (secret.value.id !== currentSecretId.value) return

  submittingRelay.value = true
  relaySubmitError.value = ''

  try {
    const response = await fetch('/api/relays', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secretId: secret.value.id,
        content: relayContent.value.trim()
      })
    })

    const data = await response.json()

    if (data.success) {
      relayContent.value = ''
      if (secret.value.id === currentSecretId.value) {
        fetchRelays(secret.value.id)
      }
    } else {
      relaySubmitError.value = data.error || '提交失败，请重试'
    }
  } catch (error) {
    console.error('提交接力失败:', error)
    relaySubmitError.value = '网络错误，请稍后重试'
  } finally {
    submittingRelay.value = false
  }
}

function formatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goToConfess() {
  router.push('/confess')
}

onMounted(() => {
  fetchRandomSecret()
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 600px;
}

.secret-card {
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
  margin-bottom: 30px;
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
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
}

.secret-content {
  padding: 20px 0;
}

.secret-text {
  font-size: 20px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.secret-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.status-badge {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.refresh-btn {
  padding: 8px 20px;
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.card-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.relay-section {
  margin-top: 20px;
  padding: 20px;
  padding-top: 20px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: linear-gradient(135deg, #fafbff 0%, #fff5f8 100%);
  box-sizing: border-box;
}

.relay-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.relay-icon {
  font-size: 24px;
}

.relay-header h3 {
  font-size: 18px;
  color: #333;
  margin: 0;
  font-weight: 600;
}

.relay-input-area {
  background: #fafafa;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
}

.relay-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.relay-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.relay-input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.char-count {
  font-size: 12px;
  color: #999;
}

.relay-submit-btn {
  padding: 8px 24px;
  font-size: 14px;
}

.relay-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  background: #ffe6e6;
  color: #d32f2f;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 15px;
}

.relay-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
  color: #666;
  font-size: 14px;
}

.mini-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.relay-empty {
  text-align: center;
  padding: 30px 20px;
  color: #999;
}

.relay-empty .empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 10px;
}

.relay-empty p {
  font-size: 14px;
  margin: 0;
}

.relay-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.relay-list::-webkit-scrollbar {
  width: 6px;
}

.relay-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.relay-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

.relay-item {
  display: flex;
  gap: 12px;
  padding: 15px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  animation: slideInLeft 0.4s ease forwards;
  opacity: 0;
  box-sizing: border-box;
  overflow: hidden;
  word-break: break-word;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.relay-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.relay-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.relay-content .relay-text {
  font-size: 14px;
  line-height: 1.7;
  color: #333;
  margin: 0 0 8px 0;
  font-style: italic;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.relay-time {
  font-size: 12px;
  color: #999;
}
</style>
