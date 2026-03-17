import { create } from 'zustand'

export const useUpdateStore = create((set) => ({
  // Estado do updater nativo (electron-updater)
  checking: false,
  updateAvailable: false,
  updateInfo: null,       // { version, releaseNotes, releaseDate }
  downloading: false,
  progress: 0,            // 0-100
  downloaded: false,
  error: null,

  // Estado da release do GitHub (para exibição na UI)
  latestRelease: null,
  loadingRelease: false,

  setChecking:          () => set({ checking: true, error: null }),
  setUpdateAvailable:   (info) => set({ checking: false, updateAvailable: true, updateInfo: info, error: null }),
  setUpdateNotAvailable:() => set({ checking: false, updateAvailable: false }),
  setDownloading:       () => set({ downloading: true, progress: 0 }),
  setProgress:          (p)  => set({ progress: Math.round(p.percent ?? p) }),
  setDownloaded:        (info) => set({ downloaded: true, downloading: false, updateInfo: info }),
  setError:             (msg) => set({ error: msg, checking: false, downloading: false }),

  setLatestRelease:   (r) => set({ latestRelease: r, loadingRelease: false }),
  setLoadingRelease:  (v) => set({ loadingRelease: v }),
}))
