import { gsap } from 'gsap'
import { onUnmounted } from 'vue'

/**
 * GSAP 动画工具函数
 */
export function useAnimation() {
  const animations = []

  /**
   * 入场动画 - 从下方淡入
   */
  const fadeInUp = (element, options = {}) => {
    const { duration = 0.6, delay = 0, y = 30, ease = 'power2.out' } = options

    const anim = gsap.fromTo(
      element,
      { opacity: 0, y },
      { opacity: 1, y: 0, duration, delay, ease }
    )
    animations.push(anim)
    return anim
  }

  /**
   * 入场动画 - 缩放淡入
   */
  const fadeInScale = (element, options = {}) => {
    const { duration = 0.5, delay = 0, scale = 0.9, ease = 'power2.out' } = options

    const anim = gsap.fromTo(
      element,
      { opacity: 0, scale },
      { opacity: 1, scale: 1, duration, delay, ease }
    )
    animations.push(anim)
    return anim
  }

  /**
   * 交错动画 - 多个元素依次入场
   */
  const staggerIn = (elements, options = {}) => {
    const { duration = 0.5, stagger = 0.1, y = 20, ease = 'power2.out' } = options

    const anim = gsap.fromTo(
      elements,
      { opacity: 0, y },
      { opacity: 1, y: 0, duration, stagger, ease }
    )
    animations.push(anim)
    return anim
  }

  /**
   * 页面切换动画 - 进入
   */
  const pageEnter = (element, options = {}) => {
    const { duration = 0.4, ease = 'power3.out' } = options

    return gsap.fromTo(element, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration, ease })
  }

  /**
   * 页面切换动画 - 离开
   */
  const pageLeave = (element, options = {}) => {
    const { duration = 0.3, ease = 'power3.in' } = options

    return gsap.to(element, {
      opacity: 0,
      x: -20,
      duration,
      ease
    })
  }

  /**
   * 悬浮效果
   */
  const hoverScale = (element, options = {}) => {
    const { scale = 1.02, duration = 0.3 } = options
    return gsap.to(element, { scale, duration, ease: 'power2.out' })
  }

  /**
   * 重置悬浮效果
   */
  const hoverReset = (element, options = {}) => {
    const { duration = 0.3 } = options
    return gsap.to(element, { scale: 1, duration, ease: 'power2.out' })
  }

  /**
   * 脉冲动画
   */
  const pulse = (element, options = {}) => {
    const { duration = 1.5, scale = 1.05 } = options
    return gsap.to(element, {
      scale,
      duration,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    })
  }

  /**
   * 数字滚动动画
   */
  const countUp = (element, endValue, options = {}) => {
    const { duration = 1, ease = 'power2.out' } = options
    const obj = { value: 0 }

    return gsap.to(obj, {
      value: endValue,
      duration,
      ease,
      onUpdate: () => {
        element.textContent = Math.round(obj.value)
      }
    })
  }

  // 清理动画
  onUnmounted(() => {
    animations.forEach(anim => anim?.kill?.())
  })

  return {
    fadeInUp,
    fadeInScale,
    staggerIn,
    pageEnter,
    pageLeave,
    hoverScale,
    hoverReset,
    pulse,
    countUp
  }
}
