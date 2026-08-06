import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import { onAuth } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuth((u) => { setUser(u); setLoading(false) })
  }, [])

  return { user, loading }
}
