# Talk It! for Mac

A Mac-first recreation of [OpenTalkIt](https://zack-fire.itch.io/opentalkit) / Microsoft **Talk It!** (Plus! for Kids, 1997).

The Windows app exists only on Windows because the voice engine is `TIBASE32.DLL` — a **32-bit SoftVoice** binary. That file cannot load natively on modern macOS (no 32-bit processes, and it is not a Mac library). This project does **not** wrap that DLL and does **not** need a virtual machine.

Instead it synthesizes the same *class* of speech SoftVoice used: **parallel formant synthesis** with a Rosenberg glottal pulse, the original 20 personalities, pitch/speed, Natural / Monotone / Sung, Normal / Breathy / Whispered, English and Spanish, and WAV export.

It will not be a bit-perfect clone of `TIBASE32.DLL`. It is the closest you can get without running proprietary 32-bit Windows code.

## Run locally

Needs Node.js 22+.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4521](http://127.0.0.1:4521).

```bash
npm run build
npm run preview
```

## How to get the Crystal Castles / All Your Base voice

1. Select **Big Robot** (SoftVoice name: Colossus).
2. Leave **Monotone** on.
3. Keep **Classic 11 kHz** on (original SoftVoice output was 11025 Hz, 8-bit).
4. Try:

> All your base are belong to us.

or

> I'll take you to the candy shop.

## Personalities

The Talk It! names and the reverse-engineered OpenTalkIt pitch/speed/F0/voicing presets are included:

| Talk It! | SoftVoice | Pitch | Speed | Quality |
|---|---|---|---|---|
| Man | Male | 100 | 150 | Natural |
| Woman | Female | 200 | 150 | Natural |
| Hyper Female | Large Male | 190 | 250 | Natural |
| Child | Child | 350 | 130 | Natural |
| Strong Man | Giant Male | 75 | 140 | Natural |
| Mellow | Mellow Female | 190 | 140 | Natural / Breathy |
| Singing Girl | Mellow Male | 310 | 90 | Sung |
| Strong Woman | Crisp Male | 200 | 140 | Natural |
| Fly | The Fly | 480 | 150 | Natural |
| Little Robot | Robotoid | 90 | 150 | Monotone |
| Martian | Martian | 80 | 150 | Monotone |
| **Big Robot** | **Colossus** | **66** | **138** | **Monotone** |
| Hyper Male | Fast Fred | 135 | 300 | Natural |
| Old Woman | Old Woman | 270 | 115 | Natural |
| Little Man | Munchkin | 90 | 150 | Natural |
| Imaginary Man | Troll | 110 | 200 | Natural |
| Nerd | Nerd | 140 | 155 | Natural |
| Whiner | Milktoast | 120 | 165 | Natural |
| Wobbly | Tipsy | 145 | 115 | Sung |
| Singing Boy | Choirboy | 310 | 90 | Sung |

Pitch `100` ≈ 110 Hz (adult male baseline), matching Talk It's percentage scale.

## Embedded commands

SoftVoice allowed commands in `{{braces}}`. Supported here:

```
{{spanish}}  {{english}}
{{pitch 66}} {{rate 138}}
```

## Why not load the DLL on Mac?

| Approach | Why it fails or is a VM in disguise |
|---|---|
| Copy `TIBASE32.DLL` next to a Mac app | It is a 32-bit PE file. macOS cannot execute it. |
| Wine / CrossOver / Whisky | Not a full Windows VM, but still a Windows compatibility layer, and 32-bit PE on Apple Silicon is fragile. |
| Parallels / UTM | That *is* a VM — what this project avoids. |
| Reimplement formant synthesis | This app. Same acoustic model family, runs in the browser on Mac. |

WAV export writes the synthesizer buffer directly (no loopback recorder like the Windows WASAPI capture).

## Credits

- Original Talk It! frontend recreation: [glebasos/OpenTalkIt](https://github.com/glebasos/OpenTalkIt) and [zack_fire on itch.io](https://zack-fire.itch.io/opentalkit)
- Personality presets reverse-engineered from `TIBASE32.DLL` by the OpenTalkIt / TiSpeech project
- Formant engine: [klattsch](https://klatts.ch/) (MIT)
- English pronunciations: [CMU Pronouncing Dictionary](https://github.com/words/cmu-pronouncing-dictionary)
- SoftVoice / Talk It! remain the property of their owners. This repo does not include `TIBASE32.DLL`, `TIENG32.DLL`, or any Microsoft Plus! assets.
