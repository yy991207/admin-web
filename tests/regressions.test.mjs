import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function testBuiltBundleDoesNotFetchConfigYaml() {
  const manifest = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  const match = manifest.match(/assets\/index-[^"]+\.js/)
  assert.ok(match, '构建产物里应该能找到主 js 文件')

  const bundle = await readFile(new URL(`../dist/${match[0]}`, import.meta.url), 'utf8')
  assert.equal(
    bundle.includes('/config.yaml'),
    false,
    '生产构建不应该在运行时再请求 /config.yaml',
  )
}

async function testSortOrderUsesInputNumber() {
  const commandsPage = await readFile(new URL('../src/pages/Commands/Commands.tsx', import.meta.url), 'utf8')
  const practicesPage = await readFile(new URL('../src/pages/Practices/Practices.tsx', import.meta.url), 'utf8')

  assert.ok(commandsPage.includes('InputNumber'), 'Commands 页面应使用 InputNumber 处理数值输入')
  assert.ok(practicesPage.includes('InputNumber'), 'Practices 页面应使用 InputNumber 处理数值输入')
  assert.equal(
    commandsPage.includes('<Input type="number" />'),
    false,
    'Commands 页面不应继续使用 Input type="number" 处理排序权重',
  )
  assert.equal(
    practicesPage.includes('<Input type="number" />'),
    false,
    'Practices 页面不应继续使用 Input type="number" 处理排序权重',
  )
}

async function main() {
  await testBuiltBundleDoesNotFetchConfigYaml()
  await testSortOrderUsesInputNumber()
  console.log('regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
