import { StyleSheet, View, Text, Button, ScrollView } from 'react-native';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import hotUpdate from 'react-native-ota-hot-update';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to your crash reporting service here (Sentry, Crashlytics...)
    console.error('[ErrorBoundary] JS crash:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  rollback = async () => {
    const rs = await hotUpdate.rollbackToPreviousBundle();
    if (rs) {
      hotUpdate.resetApp();
    }
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <ScrollView style={styles.box}>
          <Text style={styles.message}>{error.message}</Text>
          {!!error.stack && <Text style={styles.stack}>{error.stack}</Text>}
        </ScrollView>
        <Button title={'Try again'} onPress={this.reset} />
        <Button title={'Rollback OTA & restart'} onPress={this.rollback} />
      </View>
    );
  }
}

// Throws during render so the ErrorBoundary can catch it
// (errors thrown inside event handlers are NOT caught by error boundaries).
export function CrashTrigger(): ReactNode {
  throw new Error('Test JS crash from CrashTrigger');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d32f2f',
    textAlign: 'center',
  },
  box: {
    maxHeight: 300,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stack: {
    fontSize: 11,
    color: '#555',
  },
});
