/**
 * 防抖工具函数
 * @param {Function} fn - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null

  return function (...args) {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流工具函数
 * @param {Function} fn - 需要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, delay = 300) {
  let timer = null
  let lastTime = 0

  return function (...args) {
    const now = Date.now()

    if (now - lastTime < delay) {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        lastTime = now
        fn.apply(this, args)
        timer = null
      }, delay)
    } else {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 异步防抖函数（支持Promise）
 * @param {Function} fn - 需要防抖的异步函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounceAsync(fn, delay = 300) {
  let timer = null
  let pendingPromise = null

  return function (...args) {
    if (timer) {
      clearTimeout(timer)
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        timer = setTimeout(async () => {
          try {
            const result = await fn.apply(this, args)
            resolve(result)
          } catch (error) {
            reject(error)
          } finally {
            timer = null
            pendingPromise = null
          }
        }, delay)
      })
    }

    return pendingPromise
  }
}
