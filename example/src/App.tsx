import { StyleSheet, View, Text, Button } from 'react-native';
import { useCheckVersion } from './useCheckVersion';

export default function App() {
  const { version } = useCheckVersion();

  return (
    <View style={styles.container}>
      <Text>Result: 123</Text>
      <Button title={'check update OTA'} onPress={version.onCheckVersion} />
      <Button title={'check update Git'} onPress={version.onCheckGitVersion} />
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
