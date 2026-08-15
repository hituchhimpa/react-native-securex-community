import { useState } from 'react';
import { Text, View, StyleSheet, Button, Switch } from 'react-native';
import { AuthVault } from '@hituchhimpa/react-native-auth-vault';

export default function App() {
  const [status, setStatus] = useState<string>('');
  const [requireBiometric, setRequireBiometric] = useState<boolean>(true);
  const TOKEN_KEY = 'my_secure_token';

  const handleAudit = () => {
    try {
      const result = AuthVault.audit();
      setStatus(`Audit Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      setStatus(`Audit Error: ${error.message}`);
    }
  };

  const handleSetItem = async () => {
    try {
      const prompt = requireBiometric
        ? 'Authenticate to securely store token'
        : '';
      const success = await AuthVault.setItem(
        TOKEN_KEY,
        'Super Secret Token Data',
        prompt
      );
      if (success) {
        setStatus(
          `Token stored successfully! (Biometric: ${requireBiometric})`
        );
      }
    } catch (error: any) {
      setStatus(`Storage Error: ${error.message}`);
    }
  };

  const handleGetItem = async () => {
    try {
      const prompt = requireBiometric ? 'Authenticate to retrieve token' : '';
      const result = await AuthVault.getItem(TOKEN_KEY, prompt);
      if (result) {
        setStatus(
          `Retrieved Token: ${result} (Biometric: ${requireBiometric})`
        );
      } else {
        setStatus('No token found in storage.');
      }
    } catch (error: any) {
      setStatus(`Retrieval Error: ${error.message}`);
    }
  };

  const handleRemoveItem = async () => {
    try {
      const success = await AuthVault.removeItem(TOKEN_KEY);
      if (success) {
        setStatus('Token removed successfully.');
      }
    } catch (error: any) {
      setStatus(`Remove Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Run Audit" onPress={handleAudit} />
      <View style={styles.spacer} />

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Require Biometrics:</Text>
        <Switch value={requireBiometric} onValueChange={setRequireBiometric} />
      </View>
      <View style={styles.spacer} />

      <Button title="Store Token (setItem)" onPress={handleSetItem} />
      <View style={styles.spacer} />
      <Button title="Retrieve Token (getItem)" onPress={handleGetItem} />
      <View style={styles.spacer} />
      <Button title="Remove Token (removeItem)" onPress={handleRemoveItem} />
      <View style={styles.spacer} />
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  switchLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  spacer: {
    height: 10,
  },
  statusText: {
    marginTop: 20,
    textAlign: 'center',
  },
});
