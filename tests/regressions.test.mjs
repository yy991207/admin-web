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

async function testImageManagementEntryExists() {
  const appFile = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const sidebarFile = await readFile(new URL('../src/components/Sidebar/Sidebar.tsx', import.meta.url), 'utf8')

  assert.ok(
    appFile.includes('path="images"'),
    'App 路由里应该注册 /images 图片管理页面',
  )
  assert.ok(
    appFile.includes('Navigate to="/skills"') || appFile.includes('Navigate to="/images"'),
    'App 应该保留一个有效的默认路由跳转',
  )
  assert.ok(
    sidebarFile.includes("label: '图片管理'"),
    '侧边栏里应该出现“图片管理”菜单',
  )
  assert.ok(
    sidebarFile.includes("path: '/images'"),
    '侧边栏图片管理菜单应该跳到 /images',
  )
}

async function testImageManagementServiceExists() {
  const imageService = await readFile(new URL('../src/services/imageService.ts', import.meta.url), 'utf8')
  const imagesPage = await readFile(new URL('../src/pages/Images/Images.tsx', import.meta.url), 'utf8')

  assert.ok(
    imageService.includes("buildUrl('api/v1/admin/images')") || imageService.includes('buildUrl(`api/v1/admin/images'),
    '图片服务应该接入图片列表接口',
  )
  assert.ok(
    imageService.includes('api/v1/admin/images/upload'),
    '图片服务应该接入图片上传接口',
  )
  assert.ok(
    imageService.includes('api/v1/admin/images/${image_id}') || imageService.includes('api/v1/admin/images/${imageId}'),
    '图片服务应该接入图片详情、更新和删除接口',
  )
  assert.ok(
    imageService.includes('api/v1/admin/images/generate'),
    '图片服务应该接入 AI 生图接口',
  )
  assert.ok(
    imagesPage.includes('AI 生图'),
    '图片管理页里应该出现 AI 生图入口',
  )
  assert.ok(
    imagesPage.includes('ellipsis') || imagesPage.includes('textOverflow'),
    '图片管理页里的图片名称应该做限长显示',
  )
}

async function testAgentAvatarUsesImageLibraryFlow() {
  const agentsPage = await readFile(new URL('../src/pages/Agents/Agents.tsx', import.meta.url), 'utf8')
  const agentService = await readFile(new URL('../src/services/agentService.ts', import.meta.url), 'utf8')

  assert.ok(
    agentsPage.includes('从图片库选择'),
    '智能体头像应该支持从图片库选择',
  )
  assert.ok(
    agentsPage.includes('本地上传'),
    '智能体头像应该支持本地上传',
  )
  assert.ok(
    agentsPage.includes('AI 生成'),
    '智能体头像应该支持 AI 生成',
  )
  assert.ok(
    agentsPage.includes('fetchImages'),
    '智能体头像选择应该复用图片管理库查询接口',
  )
  assert.ok(
    agentsPage.includes('uploadImage'),
    '智能体头像选择应该复用图片管理库上传接口',
  )
  assert.ok(
    agentsPage.includes('generateImage'),
    '智能体头像选择应该复用图片管理库 AI 生图接口',
  )
  assert.ok(
    agentsPage.includes('record.image') || agentsPage.includes('nestedImage'),
    '智能体头像上传和生成后应该兼容从 data.image 里取图片地址',
  )
  assert.equal(
    agentsPage.includes('AvatarSourceMode') || agentsPage.includes('setMode(') || agentsPage.includes('value={mode}'),
    false,
    '智能体头像选择器里不应再保留内部模式切换状态',
  )
  assert.equal(
    agentsPage.includes("options={[\n              { label: '从图片库选择'"),
    false,
    '智能体头像选择器里不应再出现冗余的模式切换控件',
  )
  assert.equal(
    agentsPage.includes("label=\"头像URL\""),
    false,
    '智能体表单不应继续暴露纯文本头像URL输入框',
  )
  assert.ok(
    agentsPage.includes("title: '头像'"),
    '智能体列表里应该展示头像列',
  )
  assert.equal(
    agentsPage.includes('copyable={{ text: viewingAgent.avatar_url }}') || agentsPage.includes('href={viewingAgent.avatar_url}'),
    false,
    '智能体详情里不应显示头像 URL 的复制入口或链接文本',
  )
  assert.ok(
    agentsPage.includes("createForm.getFieldValue('avatar_url')") || agentsPage.includes('buildAgentSubmitPayload(values, createForm)'),
    '创建智能体提交时应该显式从表单里读取 avatar_url',
  )
  assert.ok(
    agentsPage.includes("editForm.getFieldValue('avatar_url')") || agentsPage.includes('buildAgentSubmitPayload(values, editForm)'),
    '编辑智能体提交时应该显式从表单里读取 avatar_url',
  )
  assert.ok(
    agentService.includes('const agent = raw.agent ? raw.agent : raw') || agentService.includes('data: normalizeAgentDetailData(raw.data)'),
    '智能体详情接口应该兼容从 data.agent 里取详情数据',
  )
}

async function main() {
  await testBuiltBundleDoesNotFetchConfigYaml()
  await testSortOrderUsesInputNumber()
  await testImageManagementEntryExists()
  await testImageManagementServiceExists()
  await testAgentAvatarUsesImageLibraryFlow()
  console.log('regressions ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
