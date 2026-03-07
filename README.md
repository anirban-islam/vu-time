# vu-time 👋

Welcome to **vu-time**, a React Native application built with [Expo](https://expo.dev) and styled with [NativeWind](https://www.nativewind.dev/) (TailwindCSS for React Native).

This project relies on Expo's file-based routing mechanism via the **app** directory to provide a seamless navigation experience. It includes robust features like authentication scheduling (via `expo-auth-session` and `expo-apple-authentication`), local storage, and high-performance UI components.

## 🚀 Features

- **Built with Expo:** Fast development cycle and easy cross-platform deployment.
- **NativeWind & TailwindCSS:** Utility-first styling adapted for React Native.
- **File-based Routing:** Navigate through the app using the modern file-based structure inside the `app` directory.
- **Authentication Ready:** Integrated with Apple Authentication and standard Auth Sessions.
- **Rich Media & Files:** Support for image picking and file system operations.

## 🛠 Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (LTS recommended)
- `npm` or `pnpm` or `yarn`
- [Expo Go](https://expo.dev/go) app on your physical device (optional, but recommended for quick testing), or iOS Simulator / Android Emulator.

## 📦 Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   cd vu-time
   ```

2. Install the project dependencies:
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

## 🚀 Running the App

Start the development server:

```bash
npm start
# or
npx expo start
```

In the terminal output, you'll find options to open the app:
- Press **`a`** to open in an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/).
- Press **`i`** to open in an [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/).
- Press **`w`** to open in your web browser.
- Scan the QR code using the **Expo Go** app on your physical Android or iOS device.

## 📁 Project Structure

```
vu-time/
├── app/                  # File-based routing pages and layouts
├── assets/               # Static images, fonts, and icons
├── components/           # Reusable UI components
├── constants/            # App-wide constants (colors, layouts, config)
├── hooks/                # Custom React hooks
├── scripts/              # Utility scripts for development
├── src/                  # Additional source files and global utilities
├── .gitignore
├── app.json              # Expo configuration file
├── babel.config.js       # Babel configuration
├── package.json          # Project metadata and dependencies
├── tailwind.config.js    # TailwindCSS configuration for NativeWind
└── tsconfig.json         # TypeScript configuration
```

## 🧹 Available Scripts

- `npm start` - Starts the Expo development server.
- `npm run android` - Starts the app in Android mode.
- `npm run ios` - Starts the app in iOS mode.
- `npm run web` - Starts the app in Web mode.
- `npm run lint` - Runs ESLint to find and fix code issues.
- `npm run reset-project` - Moves the starter code and gives you a fresh **app** directory.

## 📚 Learn More

To learn more about developing your project, check out the following resources:
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
