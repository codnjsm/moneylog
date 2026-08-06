import { useState, useEffect } from 'react'
import { subscribeUserProfile, setUserProfile, createHousehold, joinHousehold, leaveHousehold } from '../firebase'

export function useHousehold(uid: string) {
  const [householdCode, setHouseholdCode] = useState<string | null>(null)
  const [mode, setModeState] = useState<'personal' | 'shared'>('personal')

  useEffect(() => {
    if (!uid) return
    return subscribeUserProfile(uid, (profile) => {
      setHouseholdCode(profile?.householdCode ?? null)
      setModeState(profile?.mode ?? 'personal')
    })
  }, [uid])

  const create = async () => {
    const code = await createHousehold(uid)
    await setUserProfile(uid, { householdCode: code, mode: 'shared' })
  }

  const join = async (code: string): Promise<boolean> => {
    const success = await joinHousehold(uid, code)
    if (success) await setUserProfile(uid, { householdCode: code.toUpperCase(), mode: 'shared' })
    return success
  }

  const leave = async () => {
    if (householdCode) await leaveHousehold(uid, householdCode)
    await setUserProfile(uid, { householdCode: null, mode: 'personal' })
  }

  const switchMode = async (m: 'personal' | 'shared') => {
    if (m === 'shared' && !householdCode) return
    await setUserProfile(uid, { mode: m })
  }

  const spaceId = mode === 'shared' && householdCode ? householdCode : uid

  return { householdCode, mode, spaceId, create, join, leave, switchMode }
}
