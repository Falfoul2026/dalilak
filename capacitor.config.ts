import type { CapacitorConfig } from '@capacitor/cli'

// Android app (Google Play). Same code as the website, built with `npm run build:app` into dist-app/.
const config: CapacitorConfig = {
  appId: 'com.dalilak.app',
  appName: 'دليلك',
  webDir: 'dist-app',
  android: {
    // keep the WebView from showing the website's address bar colours etc.
    backgroundColor: '#0b5d5b',
  },
  plugins: {
    // Android 15+ draws the app under the status bar: the page adds the safe-area padding itself (--safe-area-inset-*).
    SystemBars: { insetsHandling: 'css' },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0b5d5b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      backgroundColor: '#0b5d5b',
      style: 'DARK', // light text on the teal bar
      overlaysWebView: false,
    },
  },
}

export default config
