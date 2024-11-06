import * as React from "react"
import { View, StyleSheet, Image, Text, TouchableOpacity } from "react-native"
import { useUpdateVersion } from "./useUpdateVersion"
import { assetRegistry } from "./assets"

/**
 * Describe your component here
 */
const background = "white"
const colorPogress = "#93a593"
export const UpdatingComponent = () => {
  const { updating, setUpdating, progress, actionSubmit } = useUpdateVersion()

  const progressBar = React.useMemo(() => {
    if (progress === 100) {
      return <Text style={styles.content}>{"Version download completed!"}</Text>
    } else if (progress < 0) {
      return <Text style={styles.content}>{"Download failed, please try again!"}</Text>
    }
    return (
      <View style={styles.line}>
        <View
          style={[
            styles.progress,
            {
              width: `${progress}%`,
            },
          ]}
        >
          <Image style={styles.img} source={assetRegistry.running} />
        </View>
      </View>
    )
  }, [progress])
  const isActionComplete = React.useMemo(() => {
    return progress === 100 || progress < 0
  }, [progress])

  if (!updating) {
    return null
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{""}</Text>
      <View style={styles.wrap}>{progressBar}</View>

      {isActionComplete && (
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setUpdating(false)} style={styles.flex}>
            <Text>{'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={actionSubmit} style={styles.flex}>
            <Text>{progress < 0 ? "Try again" : "Update"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: background,
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  content: {
    alignSelf: "center",
    fontSize: 20,
    marginBottom: 100,
  },
  flex: {
    flex: 1,
    padding: 15,
    backgroundColor: '#d5d5d5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    height: 40,
    position: "absolute",
    right: 0,
    top: -48,
    width: 40,
  },
  line: {
    alignSelf: "center",
    backgroundColor: background,
    borderColor: colorPogress,
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    width: "100%",
  },
  progress: {
    backgroundColor: colorPogress,
    borderRadius: 10,
    height: "100%",
  },
  row: {
    alignItems: "center",
    bottom: 50,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  title: {
    alignSelf: "center",
    fontSize: 18,
    fontWeight: "bold",
    top: 150,
  },
  wrap: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 30,
  },
})
