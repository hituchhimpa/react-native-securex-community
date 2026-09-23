import { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Button,
  Switch,
  ScrollView,
} from 'react-native';
import { SecureX } from '@hituchhimpa/react-native-securex';

export default function App() {
  const [status, setStatus] = useState<string>('');
  const [requireBiometric, setRequireBiometric] = useState<boolean>(true);
  const TOKEN_KEY = 'my_secure_token';

  const handleCheckSecureLockScreen = () => {
    try {
      const usable = SecureX.hasSecureLockScreen();
      setStatus(
        usable
          ? 'Vault is usable: device has a secure lock screen set.'
          : 'Vault is NOT usable: no PIN/pattern/password/biometric set on this device. Auth-gated calls (non-empty prompt) will fail.'
      );
    } catch (error: any) {
      setStatus(`hasSecureLockScreen Error: ${error.message}`);
    }
  };

  const handleCheckSensor = async () => {
    try {
      const result = await SecureX.isSensorAvailable();
      const supportedStr = result.biometricsSupported?.length
        ? result.biometricsSupported.join(', ')
        : result.biometryType || 'None';

      setStatus(
        `Sensor Check Result:\n` +
          `• Available: ${result.available ? '✅ Yes' : '❌ No'}\n` +
          `• Enrolled: ${result.enrolled ? '✅ Yes' : '❌ No'}\n` +
          `• Primary Biometry: ${result.biometryType ?? 'None'}\n` +
          `• Supported Sensors: ${supportedStr}\n` +
          `• Fingerprint: ${result.hasFingerprint ? '✅ Detected' : '❌ Not Present'}\n` +
          `• Face Recognition: ${result.hasFace ? '✅ Detected' : '❌ Not Present'}\n` +
          `• Iris Scanner: ${result.hasIris ? '✅ Detected' : '❌ Not Present'}` +
          (result.error ? `\n• Error: ${result.error}` : '')
      );
    } catch (error: any) {
      setStatus(`isSensorAvailable Error: ${error.message}`);
    }
  };

  const handleSimplePrompt = async () => {
    try {
      const result = await SecureX.simplePrompt({
        promptMessage: 'Confirm biometric login',
        cancelButtonText: 'Cancel',
      });
      if (result.success) {
        setStatus('Biometric Login Successful! 🎉');
      } else {
        setStatus(`Biometric Login Failed: ${result.error}`);
      }
    } catch (error: any) {
      setStatus(`simplePrompt Error: ${error.message}`);
    }
  };

  const handleCreateKeys = async () => {
    try {
      const result = await SecureX.createKeys();
      setStatus(
        `Biometric Keys Created!\nPublic Key:\n${result.publicKey.substring(0, 30)}...`
      );
    } catch (error: any) {
      setStatus(`createKeys Error: ${error.message}`);
    }
  };

  const handleCreateSignature = async () => {
    try {
      const result = await SecureX.createSignature({
        promptMessage: 'Authorize payment with biometrics',
        payload: 'tx_amount_500_usd',
      });
      if (result.success) {
        setStatus(
          `Signature Created! ✍️\n${result.signature?.substring(0, 30)}...`
        );
      } else {
        setStatus(`Signing Failed: ${result.error}`);
      }
    } catch (error: any) {
      setStatus(`createSignature Error: ${error.message}`);
    }
  };

  const handleAudit = () => {
    try {
      const result = SecureX.audit();
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
      const success = await SecureX.setItem(
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
      const result = await SecureX.getItem(TOKEN_KEY, prompt);
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
      const success = await SecureX.removeItem(TOKEN_KEY);
      if (success) {
        setStatus('Token removed successfully.');
      }
    } catch (error: any) {
      setStatus(`Remove Error: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button
        title="Check Secure Lock Screen"
        onPress={handleCheckSecureLockScreen}
      />
      <View style={styles.spacer} />

      <Button title="Check Biometrics Sensor" onPress={handleCheckSensor} />
      <View style={styles.spacer} />

      <Button
        title="Biometric Login (simplePrompt)"
        onPress={handleSimplePrompt}
        color="#2e7d32"
      />
      <View style={styles.spacer} />

      <Button
        title="Create Biometric Keys (createKeys)"
        onPress={handleCreateKeys}
        color="#1565c0"
      />
      <View style={styles.spacer} />

      <Button
        title="Sign with Biometrics (createSignature)"
        onPress={handleCreateSignature}
        color="#6a1b9a"
      />
      <View style={styles.spacer} />

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
    </ScrollView>
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
