'use client'

import UserDrawer from '@/components/store/UserDrawer'
import ImportDrawer from '@/components/store/ImportDrawer'
import type { useStoreDrawers } from '@/components/store/useStoreDrawers'

type DrawerState = ReturnType<typeof useStoreDrawers>

type StoreDrawerStackProps = Pick<
  DrawerState,
  | 'user'
  | 'userLoading'
  | 'importJob'
  | 'importLoading'
  | 'importParent'
  | 'importOpen'
  | 'userOpen'
  | 'closeUser'
  | 'closeImport'
  | 'backToUser'
  | 'openImportFromUserJob'
>

export default function StoreDrawerStack({
  user,
  userLoading,
  importJob,
  importLoading,
  importParent,
  importOpen,
  userOpen,
  closeUser,
  closeImport,
  backToUser,
  openImportFromUserJob,
}: StoreDrawerStackProps) {
  if (!importOpen && !userOpen) return null

  function handleBackdropClick() {
    if (importOpen) closeImport()
    else closeUser()
  }

  return (
    <>
      <div className="mn-drawer-backdrop fixed inset-0 z-40 bg-black/40" onClick={handleBackdropClick} />

      {userOpen && (
        <UserDrawer
          user={user}
          loading={userLoading}
          onClose={closeUser}
          onJobClick={user ? (job) => openImportFromUserJob(job, user) : undefined}
          stacked={importOpen}
        />
      )}

      {importOpen && (
        <ImportDrawer
          job={importJob}
          loading={importLoading}
          parent={importParent}
          onClose={closeImport}
          onBreadcrumbUserClick={backToUser}
        />
      )}
    </>
  )
}
