// Hash 计算 Web Worker
// 在后台线程计算文件SHA-256哈希值，避免阻塞主线程

/* eslint-disable no-undef */

self.onmessage = async function (e) {
  const { id, fileData } = e.data

  try {
    // 使用Web Crypto API计算SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    self.postMessage({ id, hash, success: true })
  } catch (error) {
    self.postMessage({ id, error: error.message, success: false })
  }
}
