import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ki.mhms.clinicalguidelines',
  appName: 'Kiribati Clinical Guidelines',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#003da5',
    },
  },
};

export default config;
