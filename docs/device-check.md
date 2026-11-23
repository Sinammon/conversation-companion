# Device acceptance check

Use a phone with a working speech recognizer and an invented conversation. Record OS version, phone model, recognizer, and pass/fail results in your pull request.

1. On a fresh install, open New session. Verify Start is disabled until consent. Deny microphone access. Check the explanation, allow access in device settings, and retry.
2. Speak two sentences, pause, then correct a phrase. Observe interim text, final lines and the listening indicator. Stop mid-utterance and save. Compare the saved ending with the last displayed text.
3. Background the app, return, and confirm the microphone is off. Resume, stop, save, kill and reopen. Check the order of captions and sessions.
4. Try VoiceOver on iOS and TalkBack on Android, large system text, the largest caption size, portrait and landscape. Read old captions with auto-scroll paused. Confirm each control exposes an intelligible name, state and usable target.
5. With Ollama running, opt in to AI for a short invented lecture, then a meeting. Check the distinct note headings, each cited excerpt, a question with a clear answer, and a question about an absent fact.
6. Disconnect the notes host after saving. Open the transcript and verify it is readable. Reconnect and retry generation. Confirm AI is opt-in again for the next session.
7. Delete a saved session. Reopen the app and confirm it is gone.
