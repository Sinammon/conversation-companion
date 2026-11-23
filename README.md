# Conversation Companion

An accessible live-caption notebook for lectures and meetings. Start with everyone's consent, read speech as it arrives, then stop and save the transcript on your device. Connect the optional local AI service to generate notes and ask questions with supporting excerpts.

## Run the app

Install **Node.js 24 LTS** (24.3 or newer), Git, and the native tools for your target. These commands work in PowerShell, Terminal and other standard shells.

```sh
git clone https://github.com/Sinammon/conversation-companion.git
cd conversation-companion
npm ci
```

| Target | First run |
| --- | --- |
| Android on Windows or Mac | Install Android Studio, the SDK, and a JDK using the [Expo environment guide](https://docs.expo.dev/get-started/set-up-your-environment/). Connect a USB-debugging phone or start an emulator with Google speech services. Run `npm run android -- --device`. |
| iOS on Mac | Install Xcode, command-line tools and CocoaPods. Connect an iPhone, enable Developer Mode, and run `npm run ios -- --device`. Select your development signing team when prompted. |
| iOS from Windows | Develop the shared TypeScript code locally. For a signed iPhone development build, use an Expo account and Apple device-signing credentials, then run `npx eas-cli@latest build:configure` and `npx eas-cli@latest build --platform ios --profile development`. Install the build on the registered device. [Expo development builds](https://docs.expo.dev/develop/development-builds/create-a-build/) |
| Browser on Windows or Mac | Run `npm run web` and open the localhost link. Microphone support depends on the browser's Web Speech API and speech service. Chrome is suitable for trying the interface. Browser sessions use local storage. |

After installing a development build, run `npm start` and open its Metro link. Rebuild after changing a native plugin, app permission, or Android HTTP transport setting. The speech module requires a development build on phones. Expo Go lacks that module.

### First session

1. Tap **New session**, give it an optional title, and choose **Lecture** or **Meeting**.
2. Get agreement from everyone, check the consent box, and tap **Start live captions**. Grant microphone and speech permissions when prompted.
3. Read the interim text as it settles into the transcript. **Pause auto-scroll** lets you read an earlier passage. If recognition stops, the app shows **Microphone off** and offers **Resume captions**.
4. Tap **Stop microphone**, then **Save session**. Reopen it from **My notebook**. Change **Preferences → Caption size** to adjust the live reader and saved transcript.

## Connect AI notes and Q&A

Install [Ollama](https://ollama.com/download) on a computer you control and run `ollama pull qwen2.5:3b`. Start Ollama from its application or with `ollama serve`. In the project root, copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`; macOS: `cp .env.example .env`).

Choose an address reachable **from the phone** before building the app.

| Connection | Values in `.env` |
| --- | --- |
| Local browser or iOS simulator | `EXPO_PUBLIC_AI_URL=http://localhost:8787` and `HOST=127.0.0.1` |
| Android phone over USB | Same values. Run `adb reverse tcp:8787 tcp:8787` while the phone is connected. |
| Android Studio emulator | `EXPO_PUBLIC_AI_URL=http://10.0.2.2:8787` and `HOST=127.0.0.1` |
| Physical phone on trusted Wi-Fi | Set `HOST=0.0.0.0` and use the computer's private LAN address for `EXPO_PUBLIC_AI_URL`, for example `http://192.168.1.20:8787`. A Mac's `.local` hostname also works on supported networks. Allow the service through the computer's private-network firewall and grant local network access on iOS. |

Run `npm run server` in one terminal and restart Metro in another. Android development builds using local HTTP must be built with that URL configured. The public environment variable contains only the service URL. The Node service contacts Ollama at loopback by default. Its HTTP endpoints lack user accounts and are intended for trusted development networks. For remote access, place authentication and HTTPS in front of the service.

Open the service's `/health` URL from the phone browser to check connectivity. For example, localhost development uses [the local health endpoint](http://localhost:8787/health). This checks the Node service. Run `ollama list` on the host to verify that the configured model is installed. For a browser running on another origin, set `WEB_ORIGIN` to its exact scheme, host and port and restart the service.

Choose **Generate AI notes after saving** to opt in for one session. Previously saved sessions can opt in from **Notes** or **Ask**. Lecture notes group concepts, examples and study prompts. Meeting notes group discussion, decisions and actions. The service checks supporting excerpts against the transcript and can return an insufficient-evidence answer. Check a generated interpretation against its displayed excerpt. Generation failures leave the saved transcript available for retry.

## Data and device behavior

- Captions use the configured system speech recognizer in US English. The recognizer may send audio to its provider. This app disables audio-file persistence. Availability, accuracy, and session length depend on the device, locale and service. Android 12 and earlier can end recognition after each utterance.
- Recording stops when the app enters the background. Save before closing the app. Unsaved capture is held in memory.
- Native sessions and preferences are stored in local SQLite in the app sandbox. Device backup policies may apply. Delete a session from its transcript view. The repository does not sync classmates' notes.
- Only an opted-in transcript and its question are sent to the configured notes service. The service keeps requests in memory, checks returned quotes and sends no application-level transcript logs. Long transcripts are split into chunks, up to 200,000 characters per request. Q&A returns the first supported answer it finds.

## Develop together

Fork this public repository, create a branch with `git switch -c feature/your-change`, commit focused changes, and open a pull request into `main`. Collaborators with write access can use a branch in this repository. Use `npm ci` to reproduce the lockfile.

```sh
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all
npx playwright install chromium
npx playwright test
```

GitHub Actions runs these checks on pushes and pull requests. Browser tests inject synthetic speech events, and service tests inject Ollama responses. These fixtures live under `tests/`. To verify the real hardware and model, use the [device test procedure](docs/device-check.md).

The app entry is `App.tsx`. Shared controls live in `src/components`, views in `src/screens`, speech lifecycle in `src/capture`, and persistence in `src/storage`. The mobile AI client lives in `src/ai` and calls the separate Node service in `server/`. The [technical plan](docs/superpowers/plans/2026-11-23-conversation-companion.md) covers speech costs, decisions, and testing.
