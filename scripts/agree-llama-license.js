/**
 * 同意 Llama 3.2 Vision 模型许可协议
 * 运行此脚本以同意 Meta 的许可协议
 */

// 从命令行参数获取配置
const accountId = process.argv[2]
const apiToken = process.argv[3]

if (!accountId || !apiToken) {
  console.error('❌ 缺少参数！')
  console.error('使用方法：')
  console.error('node scripts/agree-llama-license.js <ACCOUNT_ID> <API_TOKEN>')
  console.error('')
  console.error('示例：')
  console.error('node scripts/agree-llama-license.js a1b2c3d4... aBcDeFgH...')
  process.exit(1)
}

async function agreeLicense() {
  console.log('📝 正在同意 Llama 3.2 Vision 许可协议...\n')

  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'agree'
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      console.log('✅ 成功！已同意 Llama 3.2 Vision 许可协议')
      console.log('')
      console.log('📋 许可协议：')
      console.log(
        '   - Community License: https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE'
      )
      console.log(
        '   - Acceptable Use Policy: https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/USE_POLICY.md'
      )
      console.log('')
      console.log('🎉 现在可以使用 Llama 3.2 Vision 模型了！')
    } else {
      console.error('❌ 同意失败：', data)
    }
  } catch (error) {
    console.error('❌ 请求失败：', error.message)
  }
}

agreeLicense()
