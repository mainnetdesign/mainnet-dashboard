'use client'

import { useCallback, useState } from 'react'
import type { ImportJobDetail, UserDetail, UserJob } from '@/types/insta2figma'

type ImportParent = {
  userId: string
  displayName: string
}

export function useStoreDrawers() {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [importJob, setImportJob] = useState<ImportJobDetail | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importParent, setImportParent] = useState<ImportParent | null>(null)

  const openUser = useCallback((id: string) => {
    setUserLoading(true)
    setUser(null)
    fetch(`/api/store/insta2figma/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setUser(d)
      })
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false))
  }, [])

  const openImport = useCallback(
    (jobId: string, parent?: ImportParent) => {
      setImportLoading(true)
      setImportJob(null)

      if (parent) {
        setImportParent(parent)
      }

      fetch(`/api/store/insta2figma/imports/jobs/${jobId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error)
          setImportJob(d)
          setImportParent((prev) =>
            prev ?? { userId: d.userId, displayName: d.displayName },
          )
        })
        .catch(() => {
          setImportJob(null)
          setImportParent(null)
        })
        .finally(() => setImportLoading(false))
    },
    [],
  )

  const openImportFromUserJob = useCallback(
    (job: UserJob, userDetail: UserDetail) => {
      openImport(job.id, { userId: userDetail.id, displayName: userDetail.displayName })
    },
    [openImport],
  )

  const closeImport = useCallback(() => {
    setImportJob(null)
    setImportParent(null)
    setImportLoading(false)
  }, [])

  const closeUser = useCallback(() => {
    setUser(null)
    setImportJob(null)
    setImportParent(null)
    setImportLoading(false)
  }, [])

  const backToUser = useCallback(() => {
    if (importParent && (!user || user.id !== importParent.userId)) {
      openUser(importParent.userId)
    }
    closeImport()
  }, [closeImport, importParent, openUser, user])

  const importOpen = importLoading || !!importJob
  const userOpen = userLoading || !!user

  return {
    user,
    userLoading,
    importJob,
    importLoading,
    importParent,
    importOpen,
    userOpen,
    openUser,
    openImport,
    openImportFromUserJob,
    closeImport,
    closeUser,
    backToUser,
  }
}
