# Device acceptance check

Use a phone with a working speech recognizer and an invented conversation. Record OS version, phone model, recognizer, and pass/fail results in your pull request.

1. On a fresh install, open New session. Verify Start is disabled until consent. Deny microphone access. Check the explanation, allow access in device settings, and retry.
2. Speak two sentences, pause, then correct a phrase. Observe interim text, final lines and the listening indicator. Stop mid-utterance and save. Compare the saved ending with the last displayed text.
3. Background the app, return, and confirm the microphone is off. Resume, stop, save, kill and reopen. Check the order of captions and sessions.
4. Try VoiceOver on iOS and TalkBack on Android, large system text, the largest caption size, portrait and landscape. Read old captions with auto-scroll paused. Confirm each control exposes an intelligible name, state and usable target.
5. With the Gemini service running, save a short invented lecture and meeting through live capture. Open each session and approve sharing separately. Check that approval alone sends no request. Generate notes, ask a typed question, and check that the answer includes a transcript excerpt. Ask about an absent fact and verify the insufficient-evidence message. Repeat from desktop Chrome and iPhone Safari.
6. Disconnect the notes host. Confirm saved notes remain readable and trying an Ask question gives a connection error. Reconnect and retry.
7. Delete a saved session. Reopen the app and confirm it is gone.
8. On iOS 26, switch between Notebook and Preferences. Check that the dock uses Liquid Glass, then enable Reduce Transparency and look for a solid dock. Enable Reduce Motion and confirm the dock and recording meter stay still. In a regular capture, speak at different volumes and check that the meter responds while the caption text remains stable.
9. On desktop Chrome at localhost and on a rebuilt iPhone, connect an external microphone and select it before capture. Confirm the displayed input and speak close to each mic to check which produces captions. Unplug the selected mic, verify recording pauses with the caption text intact, then choose System default and resume. Deny microphone permission once and verify the error guides you back to permissions. On Safari and Android, check capture through the system microphone.
