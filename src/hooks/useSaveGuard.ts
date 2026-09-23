import { useRef, useState } from 'react'

/**
 * 저장이 끝나기 전에 버튼을 다시 눌러 같은 내역이 두 번 기록되는 걸 막는다.
 * onSave 가 Promise 를 돌려주면 그게 끝날 때까지 잠근다.
 */
export function useSaveGuard() {
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)

  const runSave = (fn: () => void | Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    void Promise.resolve(fn()).finally(() => {
      busy.current = false
      setSaving(false)
    })
  }

  return { saving, runSave }
}
