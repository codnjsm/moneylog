import { useState, useEffect } from 'react'
import { subscribeUserProfile, setUserProfile, createHousehold, joinHousehold, leaveHousehold, updateUserName, updateUserPhoto } from '../firebase'

export function useHousehold(uid: string) {
  const [householdCode, setHouseholdCode] = useState<string | null>(null)
  const [mode, setModeState] = useState<'personal' | 'shared'>('personal')
  // 이 문서가 이름·사진의 기준이다. 비어 있으면 화면에서 Auth 값으로 채운다.
  const [profileName, setProfileName] = useState<string | undefined>()
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>()

  useEffect(() => {
    if (!uid) return
    return subscribeUserProfile(uid, (profile) => {
      setHouseholdCode(profile?.householdCode ?? null)
      setModeState(profile?.mode ?? 'personal')
      setProfileName(profile?.displayName)
      setProfilePhoto(profile?.photoURL)
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

  const setName = (displayName: string) => updateUserName(uid, displayName)
  const setPhoto = (photoURL: string) => updateUserPhoto(uid, photoURL)

  const spaceId = mode === 'shared' && householdCode ? householdCode : uid

  return { householdCode, mode, spaceId, create, join, leave, switchMode, profileName, profilePhoto, setName, setPhoto }
}
