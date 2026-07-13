/**
 * Injects an optional release signing config into the Expo-generated
 * android/app/build.gradle.
 *
 * By default, Expo signs release builds with the debug key (installable via
 * sideloading, but not publishable to Google Play). When the CI provides a
 * keystore (RELEASE_STORE_FILE + passwords as Gradle properties), the release
 * build type uses it instead. Without those properties it transparently falls
 * back to debug signing, so the script is safe to run unconditionally.
 *
 * Idempotent: running it more than once is a no-op.
 */
import fs from 'node:fs';

const GRADLE_PATH = 'android/app/build.gradle';

function main() {
  if (!fs.existsSync(GRADLE_PATH)) {
    console.error(`Cannot find ${GRADLE_PATH}. Run "expo prebuild -p android" first.`);
    process.exit(1);
  }

  let gradle = fs.readFileSync(GRADLE_PATH, 'utf8');

  if (gradle.includes('RELEASE_STORE_FILE')) {
    console.log('Android release signing already configured — skipping.');
    return;
  }

  // 1. Add a `release` block inside signingConfigs, guarded by the property.
  const releaseSigningConfig = `        release {
            if (project.hasProperty('RELEASE_STORE_FILE')) {
                storeFile file(RELEASE_STORE_FILE)
                storePassword RELEASE_STORE_PASSWORD
                keyAlias RELEASE_KEY_ALIAS
                keyPassword RELEASE_KEY_PASSWORD
            }
        }
`;
  const withReleaseConfig = gradle.replace(
    /(signingConfigs \{\s*\n\s*debug \{[\s\S]*?\n\s*\}\s*\n)(\s*\})/,
    `$1${releaseSigningConfig}$2`,
  );

  // 2. Use the release config for the release build type when available.
  const patched = withReleaseConfig.replace(
    /signingConfig signingConfigs\.debug(\s*\n\s*def enableShrinkResources)/,
    "signingConfig project.hasProperty('RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug$1",
  );

  if (patched === gradle) {
    console.error('Failed to patch build.gradle — signing config markers not found.');
    process.exit(1);
  }

  fs.writeFileSync(GRADLE_PATH, patched);
  console.log('Patched android/app/build.gradle with optional release signing config.');
}

main();
