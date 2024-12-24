import { StyleSheet, View, Text, Button } from 'react-native';
import hotUpdate from 'react-native-ota-hot-update';
import { useGitVersion } from './useGitVersion';

export default function App() {
  // useCheckVersion();
  const { git } = useGitVersion();

  return (
    <View style={styles.container}>
      <Text>Result: 123</Text>
      <Button title={'Restart'} onPress={() => hotUpdate.removeUpdate(true)} />
      <Button title={'get Info'} onPress={git.onCheckVersion} />
      <Button title={'pull'} onPress={git.pullVersion} />
      <Button title={'clone'} onPress={git.cloneVersion} />
      <Button title={'mdkdir'} onPress={git.mkdir} />
      <Button title={'blob'} onPress={git.hashBlob} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
