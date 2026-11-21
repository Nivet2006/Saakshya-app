# Done means ALL of these are true and verified live, not mocked
- Real mic audio reaches Gnani STT through the backend; transcripts appear live.
- Code-mixed phrase ("TT injection pending hai, IFA goli nahi le rahi") is transcribed usably.
- TTS streams back and plays; speaking over it stops it immediately.
- Read-back before save; "no, weight is 2.8 kilo" changes only weight_kg.
- Nothing is saved without spoken or tapped confirmation.
- A danger-sign phrase triggers the alert and a spoken referral instruction within 2 seconds,
  and the flag survives corrections and interruptions.
- Offline visit saved as a draft and synced on reconnect.
- No secrets in the app bundle; app talks only to the backend URL.
- Test report separates live-verified, mocked and untested.
