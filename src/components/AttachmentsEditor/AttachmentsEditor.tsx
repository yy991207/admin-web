import { useState, useCallback, useEffect } from 'react'
import { InboxOutlined } from '@ant-design/icons'
import { Button, Tag, Upload, App } from 'antd'
import type { UploadProps } from 'antd'
import { uploadFileWithParse } from '../../services/documentParseService'

export interface Attachment {
  resource_id?: string | null
  file_name: string
  url: string
}

interface AttachmentsEditorProps {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
  onUploadingChange?: (isUploading: boolean) => void
}

export default function AttachmentsEditor({ attachments, onChange, onUploadingChange }: AttachmentsEditorProps) {
  const { message } = App.useApp()
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { status: string; progress: number }>>(new Map())

  // 通知父组件上传状态变化
  useEffect(() => {
    onUploadingChange?.(uploadingFiles.size > 0)
  }, [uploadingFiles.size, onUploadingChange])

  const handleFileUpload = useCallback(async (file: File) => {
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    setUploadingFiles(prev => {
      const newMap = new Map(prev)
      newMap.set(fileId, { status: 'uploading', progress: 0 })
      return newMap
    })

    try {
      const result = await uploadFileWithParse(
        file,
        (progress) => {
          setUploadingFiles(prev => {
            const newMap = new Map(prev)
            newMap.set(fileId, { status: 'uploading', progress })
            return newMap
          })
        },
        (status, progress) => {
          setUploadingFiles(prev => {
            const newMap = new Map(prev)
            newMap.set(fileId, { status, progress: progress ?? 0 })
            return newMap
          })
        }
      )

      if (result.success && result.status === 'completed') {
        onChange([...attachments, {
          file_name: result.fileName,
          url: result.url,
          resource_id: result.resourceId || null,
        }])
        message.success('上传并解析成功')
      } else {
        message.error(result.error || '上传失败')
      }
    } catch {
      message.error('上传失败')
    } finally {
      setUploadingFiles(prev => {
        const newMap = new Map(prev)
        newMap.delete(fileId)
        return newMap
      })
    }
  }, [attachments, onChange, message])

  const handleRemove = useCallback((index: number) => {
    onChange(attachments.filter((_, i) => i !== index))
  }, [attachments, onChange])

  const uploadProps: UploadProps = {
    multiple: true,
    customRequest: async ({ file }) => {
      await handleFileUpload(file as File)
    },
    showUploadList: false,
  }

  return (
    <div>
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">支持 PDF、Word、Excel、TXT、Markdown 等文档类型，上传后将自动解析</p>
      </Upload.Dragger>

      {/* 上传/解析进度 */}
      {uploadingFiles.size > 0 && (
        <div style={{ marginTop: 12 }}>
          {Array.from(uploadingFiles.entries()).map(([fileId, info]) => (
            <div
              key={fileId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: 4,
                background: info.status === 'parsing' ? '#fff7e6' : '#e6f7ff',
                borderRadius: 6,
                border: `1px solid ${info.status === 'parsing' ? '#ffd591' : '#91d5ff'}`,
              }}
            >
              <span style={{ flex: 1, fontSize: 13 }}>
                {info.status === 'uploading' ? `上传中 (${info.progress}%)` :
                 info.status === 'parsing' ? '解析中...' :
                 info.status === 'completed' ? '已完成' : '失败'}
              </span>
              {info.status === 'parsing' && (
                <Tag color="orange">文档解析中，请稍候</Tag>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {attachments.map((att, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: 4,
                background: '#fafafa',
                borderRadius: 6,
                border: '1px solid #f0f0f0',
              }}
            >
              <span style={{ flex: 1, fontSize: 13 }}>{att.file_name}</span>
              {att.resource_id && (
                <Tag color="green" style={{ marginRight: 8 }}>已解析</Tag>
              )}
              <Button
                type="link"
                danger
                size="small"
                onClick={() => handleRemove(idx)}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
