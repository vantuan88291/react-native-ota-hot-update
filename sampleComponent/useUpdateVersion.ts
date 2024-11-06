import React from "react"
import { api } from "app/services/api"
import { compareVersions } from "compare-versions"
import { version } from "app/utils/common"
import { useStores } from "app/models"
import { LayoutAnimation, Linking } from "react-native"
import HotUpdate from "react-native-ota-hot-update"
import ReactNativeBlobUtil from "react-native-blob-util"

export const useUpdateVersion = () => {
  const [updating, setUpdating] = React.useState<boolean>(false)
  const [progress, setProgress] = React.useState<number>(0)
  const bundleInfo = React.useRef({
    url: "",
    version: 0,
  })
  const { commons } = useStores()
  const showUpdate = (
    title: string,
    content: string,
    updateButton: string,
    cancelButton: string,
    isRequired: boolean,
    actionUpdate: () => void,
  ) => {
    commons.onAlert(
      title,
      content,
      updateButton,
      isRequired ? undefined : cancelButton,
      actionUpdate,
      isRequired,
    )
  }
  const startUpdateBundle = (url: string, version: number) => {
    setUpdating(true)
    HotUpdate.downloadBundleUri(ReactNativeBlobUtil, url, version, {
      updateSuccess: () => {
        setProgress(100)
      },
      updateFail() {
        setProgress(-1)
      },
      restartAfterInstall: false,
      progress(received: string, total: string) {
        const percent = (+received / +total) * 100
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setProgress(percent)
      },
    })
  }
  const checkUpdateBundle = async () => {
    const bundle = await api.updateService.requestUpdateBundle()
    if (bundle.kind === "ok") {
      const [itemVersion] = (bundle.data?.data || []).filter((item) => item?.attributes?.status)
      const latestVersion = itemVersion?.id || 0
      const currentVersion = await HotUpdate.getCurrentVersion()
      if (latestVersion > currentVersion) {
        showUpdate(
          "New version is comming",
          "New version has been released, click update to update now!",
          "Update",
          "Cancel",
          !!itemVersion?.attributes?.required,
          () => {
            bundleInfo.current = {
              url: itemVersion?.attributes?.bundle?.data?.attributes?.url,
              version: latestVersion,
            }
            startUpdateBundle(itemVersion?.attributes?.bundle?.data?.attributes?.url, latestVersion)
          },
        )
      }
    }
  }
  const checkUpdate = async () => {
    const store = await api.updateService.requestUpdateStore()
    if (store.kind === "ok") {
      const compare = compareVersions(version, store.data?.data?.attributes?.versionName)
      if (compare < 0) {
        showUpdate(
          "New version is comming",
          "New version has been released on store, please upgrade to get new feature!",
          "Update",
          "Cancel",
          !!store.data?.data?.attributes?.required,
          () => {
            setTimeout(() => {
              Linking.openURL(store.data?.data?.attributes?.storeUrl)
            }, 500)
          },
        )
      } else {
        checkUpdateBundle()
      }
    } else {
      checkUpdateBundle()
    }
  }
  const actionSubmit = () => {
    if (progress === 100) {
      HotUpdate.resetApp()
    } else {
      startUpdateBundle(bundleInfo?.current?.url, bundleInfo?.current?.version)
    }
  }
  React.useEffect(() => {
    if (!__DEV__) {
      setTimeout(checkUpdate, 3000)
    }
  }, [])
  return {
    updating,
    setUpdating,
    progress,
    actionSubmit,
  }
}
