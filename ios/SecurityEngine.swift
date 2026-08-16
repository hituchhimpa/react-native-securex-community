import Foundation
import LocalAuthentication
import UIKit
import Darwin
import MachO
import Security

@objc(SecurityEngine)
public class SecurityEngine: NSObject {

    private static let enrollmentStateKey = "av_biometric_enrollment_state"

    @objc
    public static func audit() -> [String: Any] {
        let jailbroken = isJailbroken()
        let emulator = isEmulator()
        let debugger = isDebuggerAttached()
        let hooking = isHookingDetected()
        let tampered = isAppTampered()
        let biometricChanged = isBiometricEnrollmentChanged()

        let context = LAContext()
        var error: NSError?
        let biometricEnabled = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        let vaultUsable = isVaultUsable()

        var score = 100
        if jailbroken { score -= 50 }
        if emulator { score -= 20 }
        if debugger { score -= 20 }
        if hooking { score -= 50 }
        if tampered { score -= 40 }
        if biometricChanged { score -= 30 }
        if !biometricEnabled { score -= 5 }

        return [
            "secureStorage": true,
            "hardwareBacked": true,
            "biometricEnabled": biometricEnabled,
            "vaultUsable": vaultUsable,
            "rooted": false,
            "jailbroken": jailbroken,
            "emulator": emulator,
            "debuggerAttached": debugger,
            "hookingDetected": hooking,
            "appTampered": tampered,
            "biometricEnrollmentChanged": biometricChanged,
            "securityScore": max(score, 0)
        ]
    }

    // MARK: - Biometric Enrollment Change Detection

    @objc
    public static func isBiometricEnrollmentChanged() -> Bool {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return false
        }

        let currentState = context.evaluatedPolicyDomainState
        let defaults = UserDefaults.standard

        if let savedState = defaults.data(forKey: enrollmentStateKey) {
            if currentState != savedState {
                // State changed — save new state and return true
                defaults.set(currentState, forKey: enrollmentStateKey)
                return true
            }
            return false
        } else {
            // First run — save current state
            defaults.set(currentState, forKey: enrollmentStateKey)
            return false
        }
    }

    // MARK: - Vault Usability
    // Auth-gated keys (Secure Enclave, .userPresence) require a device passcode to be set.
    // Without one, key generation/access will always fail. Apps should check this before
    // calling encrypt/decrypt/setItem/getItem with a non-empty prompt.
    @objc
    public static func isVaultUsable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
    }

    // MARK: - Runtime App Tamper Detection

    @objc
    public static func isAppTampered() -> Bool {
        #if os(macOS)
        guard let bundlePath = Bundle.main.bundleURL.path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "file://\(bundlePath)"),
              let staticCode = try? createStaticCode(url: url) else {
            return false
        }

        let status = SecStaticCodeCheckValidityWithErrors(staticCode, SecCSFlags(rawValue: 0), nil, nil)
        return status != errSecSuccess
        #else
        return false
        #endif
    }

    #if os(macOS)
    private static func createStaticCode(url: URL) throws -> SecStaticCode? {
        var staticCode: SecStaticCode?
        let cfURL = url as CFURL
        let status = SecStaticCodeCreateWithPath(cfURL, SecCSFlags(rawValue: 0), &staticCode)
        if status != errSecSuccess { return nil }
        return staticCode
    }
    #endif

    // MARK: - Jailbreak Detection

    private static func isJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        let paths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/usr/bin/ssh"
        ]

        for path in paths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }

        do {
            let path = "/private/jailbreak_test.txt"
            try "test".write(toFile: path, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: path)
            return true
        } catch {
            return false
        }
        #endif
    }

    // MARK: - Emulator Detection

    private static func isEmulator() -> Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }

    // MARK: - Debugger Detection

    private static func isDebuggerAttached() -> Bool {
        var info = kinfo_proc()
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        var size = MemoryLayout<kinfo_proc>.stride
        let junk = sysctl(&mib, UInt32(mib.count), &info, &size, nil, 0)
        if junk != 0 { return false }
        return (info.kp_proc.p_flag & P_TRACED) != 0
    }

    // MARK: - Hooking Detection (Frida / Substrate)

    private static func isHookingDetected() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        let suspiciousLibraries = ["FridaGadget", "frida", "cynject", "libcycript", "MobileSubstrate"]
        let count = _dyld_image_count()
        for i in 0..<count {
            if let imageName = _dyld_get_image_name(i) {
                let name = String(cString: imageName).lowercased()
                for library in suspiciousLibraries {
                    if name.contains(library.lowercased()) { return true }
                }
            }
        }
        return false
        #endif
    }
}
