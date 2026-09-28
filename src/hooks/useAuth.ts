import { useState, useEffect, useCallback } from 'react'
import type { User } from 'firebase/auth'
import { auth, onAuth } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuth((u) => { setUser(u); setLoading(false) })
  }, [])

  /**
   * 이메일 인증 여부(emailVerified)를 서버에서 다시 읽어온다.
   * reload() 는 같은 User 객체를 제자리에서 고칠 뿐이라 참조가 그대로면 리렌더가 안 된다 —
   * 얕은 복사로 참조를 바꿔줘야 화면이 갱신된다.
   * (북로그와 달리 getIdToken(true) 까지는 필요 없다. firestore.rules 가 email_verified 를 안 본다.)
   */
  const refreshUser = useCallback(async (): Promise<boolean> => {
    const current = auth.currentUser
    if (!current) return false
    await current.reload()
    const fresh = auth.currentUser
    if (fresh) setUser({ ...fresh } as User)
    return !!fresh?.emailVerified
  }, [])

  return { user, loading, refreshUser }
}
