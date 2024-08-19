/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  Header,
} from 'react-native/Libraries/NewAppScreen';
import hotUpdate from 'RNhotupdate';
import {useCheckVersion} from './useCheckVersion.ts';


function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  useCheckVersion();
  const deleteUpdate = () => {
    hotUpdate.removeUpdate(true);
  };
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Header />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Button title={'Click on delete update'} onPress={deleteUpdate} />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
