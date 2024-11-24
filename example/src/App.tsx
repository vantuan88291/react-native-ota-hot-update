import { StyleSheet, View, Text, Button } from 'react-native';
import { useCheckVersion } from './useCheckVersion';
import hotUpdate from 'react-native-ota-hot-update';

export default function App() {
  useCheckVersion();

  return (
    <View style={styles.container}>
      <Text>Result: 123</Text>
      <Button title={'Restart'} onPress={hotUpdate.resetApp} />
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
