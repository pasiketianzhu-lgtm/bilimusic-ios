# iOS personal testing

The `ios-simulator` profile produces a simulator app and cannot be installed on
an iPhone or iPad. The `ios-unsigned` profile compiles for physical devices and
packages `BiliMusic-unsigned.ipa` without requesting Apple signing credentials.

Run EAS commands from `apps/mobile`:

```powershell
npx.cmd eas-cli@latest build --platform ios --profile ios-unsigned
```

After a successful build, download the IPA from its Expo build page. On Windows,
install Sideloadly from <https://sideloadly.io/>, connect and trust your device,
select the IPA, and sign using your own Apple account in Sideloadly. Free signing
normally expires after seven days and requires refreshing. Never send your Apple
password or signing credentials in a chat or commit them to Git.

Enable Developer Mode and trust the developer profile on the device if prompted.
Signing and installation are separate from compilation; the unsigned IPA cannot
be installed directly from the Expo download link.

## First device checks

1. Launch and complete onboarding in guest mode.
2. Open search, search for a known public video, and play it.
3. Open the full player, pause/resume, and drag the progress slider.
4. Test queue navigation, then lock the screen and check continuous audio.
5. Check lock-screen metadata, pause/resume, next/previous, and audio interruptions.
6. Repeat on iPad and check layout and rotation behavior.

These checks require runtime verification. Compilation does not prove playback,
background audio, account login, or iPad layout works.

The initial UI smoke flow is `.maestro/ios-smoke.yaml`. EAS rejected the hosted
Maestro job for the current account because it requires a paid Expo plan, so it
has not been run. It can be executed with Maestro on a local Mac simulator.
