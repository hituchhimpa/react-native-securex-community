import { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  SecureX,
  type SensorResult,
  type AuditResult,
} from '@hituchhimpa/react-native-securex';

interface LogEntry {
  id: string;
  time: string;
  type: 'success' | 'error' | 'info' | 'auth';
  title: string;
  detail?: string;
}

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [requireBiometric, setRequireBiometric] = useState<boolean>(true);
  const [lockScreenStatus, setLockScreenStatus] = useState<boolean | null>(
    null
  );
  const [sensorInfo, setSensorInfo] = useState<SensorResult | null>(null);
  const [postureInfo, setPostureInfo] = useState<AuditResult | null>(null);
  const [storedValue, setStoredValue] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const TOKEN_KEY = 'securex_session_token';
  const SAMPLE_PAYLOAD = 'tx_transfer_100_usd';

  const addLog = (
    type: 'success' | 'error' | 'info' | 'auth',
    title: string,
    detail?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      time: timestamp,
      type,
      title,
      detail,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    // Initial hardware discovery on mount
    try {
      const lockScreenUsable = SecureX.hasSecureLockScreen();
      setLockScreenStatus(lockScreenUsable);
      addLog(
        lockScreenUsable ? 'success' : 'error',
        'Lock Screen Status Checked',
        lockScreenUsable
          ? 'Device has PIN / biometric lock screen configured.'
          : 'No PIN / biometric lock screen found on this device.'
      );
    } catch (e: any) {
      addLog('error', 'Initial Lock Screen Check Failed', e.message);
    }

    SecureX.isSensorAvailable()
      .then((res) => {
        setSensorInfo(res);
        addLog(
          res.available ? 'success' : 'info',
          'Biometric Hardware Detected',
          `Type: ${res.biometryType ?? 'None'} | Enrolled: ${res.enrolled ? 'Yes' : 'No'}`
        );
      })
      .catch((e: any) => {
        addLog('error', 'Sensor Discovery Failed', e.message);
      });
  }, []);

  const handleCheckSecureLockScreen = () => {
    try {
      const usable = SecureX.hasSecureLockScreen();
      setLockScreenStatus(usable);
      addLog(
        usable ? 'success' : 'error',
        'Secure Lock Screen',
        usable
          ? 'Vault usable: Device passcode / PIN / biometric is active.'
          : 'Warning: Device has NO passcode set. Auth-gated keys will fail.'
      );
    } catch (error: any) {
      addLog('error', 'Lock Screen Check Error', error.message);
    }
  };

  const handleCheckSensor = async () => {
    setLoadingAction('sensor');
    try {
      const result = await SecureX.isSensorAvailable();
      setSensorInfo(result);
      const supported = result.biometricsSupported?.length
        ? result.biometricsSupported.join(', ')
        : result.biometryType || 'None';

      addLog(
        result.available ? 'success' : 'info',
        'Biometric Sensor Hardware Analysis',
        `• Available: ${result.available ? 'YES' : 'NO'}\n` +
          `• Enrolled: ${result.enrolled ? 'YES' : 'NO'}\n` +
          `• Primary Type: ${result.biometryType ?? 'None'}\n` +
          `• Supported Sensors: ${supported}\n` +
          `• Fingerprint: ${result.hasFingerprint ? 'Detected' : 'No'}\n` +
          `• Face: ${result.hasFace ? 'Detected' : 'No'}\n` +
          `• Iris: ${result.hasIris ? 'Detected' : 'No'}`
      );
    } catch (error: any) {
      addLog('error', 'Sensor Check Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSimplePrompt = async () => {
    setLoadingAction('login');
    try {
      const result = await SecureX.simplePrompt({
        promptMessage: 'Authenticate with SecureX Biometrics',
        cancelButtonText: 'Cancel',
      });
      if (result.success) {
        addLog(
          'auth',
          'Biometric Authentication Succeeded',
          'Identity confirmed by hardware secure enclave.'
        );
      } else {
        addLog(
          'error',
          'Biometric Authentication Failed',
          result.error ?? 'User cancelled or failed prompt.'
        );
      }
    } catch (error: any) {
      addLog('error', 'Biometric Login Exception', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateKeys = async () => {
    setLoadingAction('keys');
    try {
      const result = await SecureX.createKeys();
      addLog(
        'success',
        'Hardware Key Pair Generated (ECDSA)',
        `Public Key:\n${result.publicKey.substring(0, 45)}...`
      );
    } catch (error: any) {
      addLog('error', 'Key Generation Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateSignature = async () => {
    setLoadingAction('sign');
    try {
      const result = await SecureX.createSignature({
        promptMessage: 'Authorize payment with biometrics',
        payload: SAMPLE_PAYLOAD,
      });
      if (result.success && result.signature) {
        addLog(
          'auth',
          'Cryptographic Biometric Signature Created',
          `Payload: "${SAMPLE_PAYLOAD}"\nSignature:\n${result.signature.substring(0, 50)}...`
        );
      } else {
        addLog(
          'error',
          'Biometric Signing Failed',
          result.error ?? 'Signature could not be created.'
        );
      }
    } catch (error: any) {
      addLog('error', 'Signature Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAudit = () => {
    setLoadingAction('audit');
    try {
      const result = SecureX.audit();
      setPostureInfo(result);
      const isCompromised =
        result.jailbroken ||
        result.rooted ||
        result.hookingDetected ||
        result.appTampered ||
        result.debuggerAttached;

      addLog(
        isCompromised ? 'error' : 'success',
        isCompromised
          ? `Audit Alert: Threats Detected (${result.securityScore}/100)`
          : `Audit Passed: Device Secure (${result.securityScore}/100)`,
        `• Security Score: ${result.securityScore}/100\n` +
          `• Root/Jailbreak: ${result.rooted || result.jailbroken ? 'YES (HIGH RISK)' : 'Clean'}\n` +
          `• Hooking/Frida: ${result.hookingDetected ? 'YES (HIGH RISK)' : 'Clean'}\n` +
          `• Debugger Attached: ${result.debuggerAttached ? 'YES' : 'Clean'}\n` +
          `• Hardware Backed: ${result.hardwareBacked ? 'YES (Enclave/StrongBox)' : 'Software Keystore'}\n` +
          `• Emulator/Simulator: ${result.emulator ? 'YES (Virtual)' : 'Physical Device'}`
      );
    } catch (error: any) {
      addLog('error', 'Audit Execution Failed', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSetItem = async () => {
    setLoadingAction('store');
    try {
      const prompt = requireBiometric
        ? 'Confirm biometrics to save secret token'
        : '';
      const secretPayload = `AUTH_TOKEN_${Date.now().toString(36).toUpperCase()}_ENCLAVE_GATED`;
      const success = await SecureX.setItem(TOKEN_KEY, secretPayload, prompt);
      if (success) {
        setStoredValue(secretPayload);
        addLog(
          'success',
          'Encrypted Secret Stored to Vault',
          `Key: ${TOKEN_KEY}\nValue: ${secretPayload}\nBiometric-Gated: ${requireBiometric ? 'YES' : 'NO'}`
        );
      }
    } catch (error: any) {
      addLog('error', 'Storage Failure', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGetItem = async () => {
    setLoadingAction('retrieve');
    try {
      const prompt = requireBiometric
        ? 'Confirm biometrics to unlock secret token'
        : '';
      const result = await SecureX.getItem(TOKEN_KEY, prompt);
      if (result) {
        setStoredValue(result);
        addLog(
          'auth',
          'Decrypted Secret Retrieved from Vault',
          `Key: ${TOKEN_KEY}\nValue: ${result}`
        );
      } else {
        setStoredValue(null);
        addLog(
          'info',
          'Secret Retrieval',
          `No value found stored under key "${TOKEN_KEY}".`
        );
      }
    } catch (error: any) {
      addLog('error', 'Vault Retrieval Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveItem = async () => {
    setLoadingAction('wipe');
    try {
      const success = await SecureX.removeItem(TOKEN_KEY);
      if (success) {
        setStoredValue(null);
        addLog(
          'info',
          'Secret Wiped from Vault',
          `Successfully removed key "${TOKEN_KEY}".`
        );
      }
    } catch (error: any) {
      addLog('error', 'Vault Wipe Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandContainer}>
            <View style={styles.shieldIconContainer}>
              <Text style={styles.shieldIcon}>🛡️</Text>
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                SecureX
              </Text>
              <Text
                style={styles.headerSubtitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Native Security & Biometrics
              </Text>
            </View>
          </View>
          <View style={styles.badgePill}>
            <View style={styles.activeDot} />
            <Text style={styles.badgePillText}>TURBO JSI</Text>
          </View>
        </View>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>v1.2.0</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{Platform.OS.toUpperCase()}</Text>
          </View>
          <View style={styles.chipEmerald}>
            <Text style={styles.chipEmeraldText}>ENCLAVE READY</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Posture Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSectionTag}>DEVICE DEFENSE</Text>
            <Text style={styles.cardTitle}>Security Posture & Sensors</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>LOCK SCREEN</Text>
              <Text
                style={[
                  styles.metricValue,
                  lockScreenStatus === true
                    ? styles.textEmerald
                    : lockScreenStatus === false
                      ? styles.textRed
                      : styles.textSlate,
                ]}
              >
                {lockScreenStatus === null
                  ? 'Unknown'
                  : lockScreenStatus
                    ? 'Protected'
                    : 'Not Set'}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>PRIMARY SENSOR</Text>
              <Text style={styles.metricValue}>
                {sensorInfo?.biometryType ?? 'Checking...'}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>SECURITY SCORE</Text>
              <Text
                style={[
                  styles.metricValue,
                  postureInfo
                    ? postureInfo.securityScore >= 80
                      ? styles.textEmerald
                      : styles.textRed
                    : styles.textSlate,
                ]}
              >
                {postureInfo ? `${postureInfo.securityScore}/100` : 'Tap Audit'}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>BIOMETRIC ENROLLED</Text>
              <Text
                style={[
                  styles.metricValue,
                  sensorInfo?.enrolled ? styles.textEmerald : styles.textSlate,
                ]}
              >
                {sensorInfo?.enrolled ? 'Enrolled' : 'Not Enrolled'}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.buttonOutline, styles.flexButton]}
              onPress={handleCheckSecureLockScreen}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonOutlineText}>🔒 Lock Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonOutline, styles.flexButton]}
              onPress={handleCheckSensor}
              activeOpacity={0.7}
            >
              {loadingAction === 'sensor' ? (
                <ActivityIndicator size="small" color="#00E5FF" />
              ) : (
                <Text style={styles.buttonOutlineText}>🧬 Detect Sensors</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonPrimary, styles.flexButton]}
              onPress={handleAudit}
              activeOpacity={0.7}
            >
              {loadingAction === 'audit' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonPrimaryText}>⚡ Run Audit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Biometrics Suite Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSectionTag}>AUTHENTICATION</Text>
            <Text style={styles.cardTitle}>Biometric Operations</Text>
          </View>

          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={handleSimplePrompt}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconBubbleEmerald}>
                <Text style={styles.btnIcon}>👤</Text>
              </View>
              <View style={styles.btnContent}>
                <Text style={styles.btnActionTitle}>Biometric Login</Text>
                <Text style={styles.btnActionSubtitle}>
                  Simple biometric prompt via Secure Enclave / Keystore
                </Text>
              </View>
              {loadingAction === 'login' ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={styles.chevronArrow}>›</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={handleCreateKeys}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconBubbleCyan}>
                <Text style={styles.btnIcon}>🔑</Text>
              </View>
              <View style={styles.btnContent}>
                <Text style={styles.btnActionTitle}>Create Hardware Keys</Text>
                <Text style={styles.btnActionSubtitle}>
                  Generate ECDSA P-256 asymmetric key pair
                </Text>
              </View>
              {loadingAction === 'keys' ? (
                <ActivityIndicator size="small" color="#00E5FF" />
              ) : (
                <Text style={styles.chevronArrow}>›</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={handleCreateSignature}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconBubblePurple}>
                <Text style={styles.btnIcon}>✍️</Text>
              </View>
              <View style={styles.btnContent}>
                <Text style={styles.btnActionTitle}>Cryptographic Sign</Text>
                <Text style={styles.btnActionSubtitle}>
                  Hardware biometric sign for transaction payload
                </Text>
              </View>
              {loadingAction === 'sign' ? (
                <ActivityIndicator size="small" color="#A855F7" />
              ) : (
                <Text style={styles.chevronArrow}>›</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Encrypted Vault Storage Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSectionTag}>ZERO-HEAP ENCRYPTION</Text>
            <Text style={styles.cardTitle}>Secure Vault Storage</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Require Biometrics</Text>
              <Text style={styles.switchSubtitle}>
                Gate reading/writing keys with biometric prompt
              </Text>
            </View>
            <Switch
              value={requireBiometric}
              onValueChange={setRequireBiometric}
              trackColor={{ false: '#1E293B', true: '#10B981' }}
              thumbColor={requireBiometric ? '#FFFFFF' : '#94A3B8'}
            />
          </View>

          <View style={styles.vaultDisplayBox}>
            <Text style={styles.vaultKeyLabel}>KEY: {TOKEN_KEY}</Text>
            <Text style={styles.vaultValueText} numberOfLines={2}>
              {storedValue ?? 'No secret loaded in memory.'}
            </Text>
          </View>

          <View style={styles.storageActionRow}>
            <TouchableOpacity
              style={[styles.storageBtn, styles.storageBtnStore]}
              onPress={handleSetItem}
              activeOpacity={0.7}
            >
              {loadingAction === 'store' ? (
                <ActivityIndicator size="small" color="#00E5FF" />
              ) : (
                <>
                  <Text style={styles.storageBtnIcon}>💾</Text>
                  <Text style={styles.storageBtnText}>Store</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.storageBtn, styles.storageBtnRetrieve]}
              onPress={handleGetItem}
              activeOpacity={0.7}
            >
              {loadingAction === 'retrieve' ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Text style={styles.storageBtnIcon}>🔓</Text>
                  <Text style={styles.storageBtnText}>Retrieve</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.storageBtn, styles.storageBtnWipe]}
              onPress={handleRemoveItem}
              activeOpacity={0.7}
            >
              {loadingAction === 'wipe' ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Text style={styles.storageBtnIcon}>🗑️</Text>
                  <Text style={styles.storageBtnText}>Wipe</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Terminal & Activity Log Card */}
        <View style={styles.card}>
          <View style={styles.terminalHeader}>
            <View style={styles.terminalTitleRow}>
              <View style={styles.terminalDotRed} />
              <View style={styles.terminalDotYellow} />
              <View style={styles.terminalDotGreen} />
              <Text style={styles.terminalTitle}>SECUREX EVENT LOG</Text>
            </View>
            <TouchableOpacity
              onPress={clearLogs}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearLogsText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.terminalBody}>
            {logs.length === 0 ? (
              <Text style={styles.terminalEmptyText}>
                No activity logged yet. Tap any action above to inspect live
                events.
              </Text>
            ) : (
              <ScrollView
                style={styles.terminalScrollView}
                contentContainerStyle={styles.terminalContent}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {logs.map((log) => {
                  let badgeStyle = styles.logBadgeInfo;
                  let badgeTextStyle = styles.logBadgeTextInfo;
                  let badgeLabel = 'INFO';

                  if (log.type === 'success') {
                    badgeStyle = styles.logBadgeSuccess;
                    badgeTextStyle = styles.logBadgeTextSuccess;
                    badgeLabel = 'SUCCESS';
                  } else if (log.type === 'error') {
                    badgeStyle = styles.logBadgeError;
                    badgeTextStyle = styles.logBadgeTextError;
                    badgeLabel = 'ALERT';
                  } else if (log.type === 'auth') {
                    badgeStyle = styles.logBadgeAuth;
                    badgeTextStyle = styles.logBadgeTextAuth;
                    badgeLabel = 'BIOMETRIC';
                  }

                  return (
                    <View key={log.id} style={styles.logRow}>
                      <View style={styles.logMetaRow}>
                        <View style={[styles.logBadge, badgeStyle]}>
                          <Text style={[styles.logBadgeText, badgeTextStyle]}>
                            {badgeLabel}
                          </Text>
                        </View>
                        <Text style={styles.logTimeText}>{log.time}</Text>
                      </View>
                      <Text style={styles.logTitleText}>{log.title}</Text>
                      {log.detail ? (
                        <Text style={styles.logDetailText}>{log.detail}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#0B0F19',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  brandTextContainer: {
    flex: 1,
  },
  shieldIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#00E5FF33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  shieldIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2338',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00E5FF44',
    flexShrink: 0,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E5FF',
    marginRight: 5,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipEmerald: {
    backgroundColor: '#064E3B33',
    borderWidth: 1,
    borderColor: '#10B98144',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipEmeraldText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: '#131D31',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2E4A',
    width: '100%',
    overflow: 'hidden',
  },
  cardHeader: {
    marginBottom: 14,
  },
  cardSectionTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E5FF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricBox: {
    width: '48.5%',
    backgroundColor: '#0B0F19',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  textEmerald: {
    color: '#10B981',
  },
  textRed: {
    color: '#EF4444',
  },
  textSlate: {
    color: '#94A3B8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
  buttonOutline: {
    backgroundColor: '#0B0F19',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00E5FF44',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonOutlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E5FF',
  },
  buttonPrimary: {
    backgroundColor: '#00E5FF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonPrimaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B0F19',
  },
  buttonColumn: {
    gap: 10,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  btnIconBubbleEmerald: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#064E3B44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnIconBubbleCyan: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0C4A6E44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnIconBubblePurple: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#581C8744',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnIcon: {
    fontSize: 18,
  },
  btnContent: {
    flex: 1,
  },
  btnActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  btnActionSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  chevronArrow: {
    fontSize: 20,
    color: '#475569',
    fontWeight: '300',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  vaultDisplayBox: {
    backgroundColor: '#080C14',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#162238',
    marginBottom: 12,
  },
  vaultKeyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  vaultValueText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94A3B8',
  },
  storageActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  storageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 40,
    gap: 6,
  },
  storageBtnStore: {
    backgroundColor: '#082F4933',
    borderColor: '#0284C7',
  },
  storageBtnRetrieve: {
    backgroundColor: '#064E3B33',
    borderColor: '#059669',
  },
  storageBtnWipe: {
    backgroundColor: '#450A0A33',
    borderColor: '#DC2626',
  },
  storageBtnIcon: {
    fontSize: 14,
  },
  storageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  terminalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  terminalDotYellow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  terminalDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  terminalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginLeft: 6,
  },
  clearLogsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  terminalBody: {
    backgroundColor: '#080C14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#162238',
    overflow: 'hidden',
    maxHeight: 280,
    width: '100%',
  },
  terminalScrollView: {
    maxHeight: 280,
  },
  terminalContent: {
    padding: 12,
  },
  terminalEmptyText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  logRow: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#162238',
    width: '100%',
    overflow: 'hidden',
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    width: '100%',
  },
  logBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logBadgeSuccess: {
    backgroundColor: '#064E3B44',
  },
  logBadgeError: {
    backgroundColor: '#7F1D1D44',
  },
  logBadgeInfo: {
    backgroundColor: '#0C4A6E44',
  },
  logBadgeAuth: {
    backgroundColor: '#581C8744',
  },
  logBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logBadgeTextSuccess: {
    color: '#10B981',
  },
  logBadgeTextError: {
    color: '#EF4444',
  },
  logBadgeTextInfo: {
    color: '#00E5FF',
  },
  logBadgeTextAuth: {
    color: '#C084FC',
  },
  logTimeText: {
    fontSize: 10,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
    flexShrink: 1,
  },
  logDetailText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
    flexShrink: 1,
    flexWrap: 'wrap',
    width: '100%',
  },
});
