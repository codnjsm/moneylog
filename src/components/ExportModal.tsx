import { useState } from 'react'
import Modal from './Modal'
import { filterByRange, formatAsText, type ExportData } from '../export'

interface Props {
  onExport: () => Promise<unknown>
  onClose: () => void
}

export default function ExportModal({ onExport, onClose }: Props) {
  const [exporting, setExporting] = useState(false)
  const [fromMonth, setFromMonth] = useState('')
  const [toMonth, setToMonth] = useState('')

  const handleExport = async () => {
    setExporting(true)
    try {
      const raw = await onExport() as ExportData
      const data = filterByRange(raw, fromMonth, toMonth)
      const text = formatAsText(data)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moneylog_backup_${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      alert('내보내기 중 오류가 발생했어요: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>데이터 내보내기</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>시작 월</label>
            <input type="month" value={fromMonth} onChange={e => setFromMonth(e.target.value)}
              style={{ width: '100%', fontSize: '14px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <div className="form-group">
            <label>종료 월</label>
            <input type="month" value={toMonth} onChange={e => setToMonth(e.target.value)}
              style={{ width: '100%', fontSize: '14px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>비워두면 전체 기간을 내보내요</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? '내보내는 중...' : '내보내기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
