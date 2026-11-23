# Conversation Companion implementation plan

**Goal** — Ship a student from consent to readable live captions, a saved transcript, and source-backed study notes.

**Architecture** — An Expo development build uses the operating system's speech recognizer. A local session store retains transcript text. A separate Node service runs generation against Ollama on a team member's computer. Only the service address is configured in the app. See [the product brief](../../../PRODUCT.md).

## Speech feasibility

| Option | Cost and trade-offs |
| --- | --- |
| Built-in iOS and Android recognizers | No metered transcription API account. Interim and final events are available through a native Expo module. Dictation support varies by device, language pack, network, and recognition service. Native recognizers can end an utterance or interrupt a session. Show state explicitly and support restarting. |
| Google Cloud streaming STT | V2 standard recognition starts at USD 0.016/minute, approximately USD 0.96 per hour for one channel at the first tier. Requires billing, streaming audio to a server, and stream renewal. |

Use native recognition first. The phone's configured speech service may process audio online. Explain this before requesting permissions, leave audio file persistence disabled, and stop when backgrounded. Use local Ollama for notes and Q&A to avoid per-token billing. Limit the service to trusted development networks. Users must explicitly opt in to sending transcript text to the configured computer.

Sources checked November 23, 2026 — [Expo speech module](https://github.com/jamsch/expo-speech-recognition), [Android SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer), [Apple Speech](https://developer.apple.com/documentation/speech), [Google Cloud prices](https://cloud.google.com/speech-to-text/pricing), [Ollama chat API](https://docs.ollama.com/api/chat).

## Implementation and verification

1. **Capture.** Under `src/capture`, test interim replacement and finalization before implementing the reducer. Bind it to native speech events. Handle consent, permission denial, a silent microphone, late results during stop, unexpected endings and backgrounding. Show partial speech immediately and enable saving captured text when interrupted.
2. **Notebook.** Under `src/storage`, persist sessions and caption size. Build the library, capture setup, live reader and saved session view under `src/screens`. Exercise empty and populated states, storage failures, long captions and large text. Keep each reading control reachable at 48 points or larger.
3. **AI.** Under `server`, test validation and evidence matching before implementing notes and Q&A. Lecture notes organize concepts and study prompts. Meeting notes organize decisions and actions. Require supporting transcript excerpts for factual answers, with an explicit insufficient-evidence result. Surface service failures and keep the transcript available for retry.
4. **Team handoff.** Pin dependencies, commit each feature, add cross-platform setup, CI and a physical-device test procedure. Run the test suite, TypeScript, Expo configuration checks and native bundle exports. Publish the verified code to the public GitHub repository.

## Development skills

Superpowers supplies the plan, test-first loop and final verification. Expo guides native development builds and feature boundaries. Impeccable, Minimalist UI and Taste inform typography, consistent edges, clear controls and minimal copy. Native accessibility takes priority over web-only hover and entrance effects.
