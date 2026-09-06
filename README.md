# Talk It! for Mac

A Mac-first recreation of [OpenTalkIt](https://zack-fire.itch.io/opentalkit) / Microsoft **Talk It!** (Plus! for Kids, 1997).

The Windows app exists only on Windows because the voice engine is `TIBASE32.DLL` — a **32-bit SoftVoice** binary. That file cannot load natively on modern macOS (no 32-bit processes, and it is not a Mac library). This project does **not** wrap that DLL and does **not** need a virtual machine.

Instead it synthesizes the same *class* of speech SoftVoice used: **parallel formant synthesis** with a Rosenberg glottal pulse, the original 20 personalities, pitch/speed, Natural / Monotone / Sung, Normal / Breathy / Whispered, English and Spanish, and WAV export.

It will not be a bit-perfect clone of `TIBASE32.DLL`. It is the closest you can get without running proprietary 32-bit Windows code.

## Try it

Live build on GitHub Pages: [andreysenes.github.io/talk-it](https://andreysenes.github.io/talk-it/)

## Run locally

Needs Node.js 22+.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4521](http://127.0.0.1:4521).

## Keyboard

- **Space** — play or pause. Speaks the selected word, or the whole line if none is selected. Press again to pause, and again to resume. Ignored while typing.
- **⌘/Ctrl+Enter** — speak the whole line.
- **1–0, -, =** — load and speak pads 1–12.

On phones the whole UI fits one screen: personality chips scroll sideways in two rows. **Add preset** saves the current voice (pitch/rate/quality/…) as a custom chip.

Pads **1–3** ship SoftVoice-style phoneme demos. Notes, rates, and vibrato sit inside each syllable as hidden `{{sv …}}` commands — chips only show the phones (`W ER`, `K IH T`, …). Paste raw SoftVoice syntax into the line and Talk It! packs it the same way, without English G2P.

```bash
npm run build
npm run preview
```

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

Personality commands (pitch, rate, quality, voice, vibrato, scale) sit under the personality menu. Switching a personality reloads that voice's stock values. Each pad stores its own line **and** those voice settings, so Big Robot can stay monotone while Twinkle stays sung.

## Embedded commands

SoftVoice allowed commands in `{{braces}}`. Supported here:

```
{{spanish}}  {{english}}
{{natural}}  {{monotone}}  {{sung}}
{{normal}}   {{breathy}}   {{whispered}}
{{pitch 66}} {{rate 138}}
{{scale 1.17}} {{vibrato 4}} {{vibrate 5.5}}
{{tremolo 0.2}} {{trrate 5}}
{{breath 0.4}} {{tilt 0.08}} {{effort 0.5}}
```

Tap a word to set any of these on that word. **Reset** restores the personality default. **Off** keeps the values saved but silent until **On**. Commands stay grouped with that word and stay hidden in the line. There is no double-click source editor — click a word to change its voice, or type at the end of the line to add words.

## Why not load the DLL on Mac?

| Approach | Why it fails or is a VM in disguise |
|---|---|
| Copy `TIBASE32.DLL` next to a Mac app | It is a 32-bit PE file. macOS cannot execute it. |
| Wine / CrossOver / Whisky | Not a full Windows VM, but still a Windows compatibility layer, and 32-bit PE on Apple Silicon is fragile. |
| Parallels / UTM | That *is* a VM — what this project avoids. |
| Reimplement formant synthesis | This app. Same acoustic model family, runs in the browser on Mac. |

WAV export writes the synthesizer buffer directly (no loopback recorder like the Windows WASAPI capture).

## MIDI in / audio back to a DAW

The **MIDI** control (next to Talk It!) turns this page into a MIDI instrument the DAW can play.

A browser cannot register itself as a Core Audio / ASIO device. MIDI arrives through **Web MIDI**; audio returns through a **virtual output** the DAW already knows (BlackHole, Loopback, VB-Audio, etc.).

Use **Chrome or Edge**. Safari and Firefox do not expose Web MIDI in a useful way.

### Ableton Live — why Input Ports is empty

Talk It! **will not appear** under Link, Tempo & MIDI → Input Ports / Output Ports. A browser cannot register a Core MIDI device. Live only lists things like your KeyLab, **IAC Driver**, or loopMIDI.

1. Open **Audio MIDI Setup → Window → Show MIDI Studio**. Double-click **IAC Driver** and enable **Device is online**. Add two ports if you want MIDI in and MIDI out without a loop (`Talk It In`, `Talk It Out`).
2. **Quit Live fully** and reopen it. You should now see **IAC Driver Bus 1** in Input Ports and Output Ports — still not a row named Talk It!.
3. Input Ports: enable **Track** on that IAC bus. Output Ports: enable Track on a *second* IAC bus if you echo notes back (same bus = MIDI loop).
4. MIDI track in the set → **MIDI To: IAC Driver Bus 1**.
5. In Talk It!, click **MIDI** next to Talk It! → **Connect MIDI**. Set **MIDI in** to the same IAC port.
6. Audio back into Live is separate: install [BlackHole](https://existential.audio/blackhole/) or Loopback, pick it in Talk It! **Audio to DAW**, and record an audio track whose input is that device. That device shows up in Live’s **Audio** prefs, not the MIDI port list.

### What MIDI does

| Message | Talk It! |
|---|---|
| C4–B4 | Pads 1–12. C4 = pad 1, C#4 = pad 2, … B4 = pad 12. Loads that pad’s voice and speaks it. |
| Other notes | Pitch. A2 (note 45) = Talk It pitch 100 (~110 Hz). |
| Velocity | Rate, for notes outside the pad range. 64 ≈ 150. |
| CC1 (mod wheel) | Overrides rate until the next change. |
| Note off | Stops if it is the note that started speech. |

**MIDI out** is optional. Enable **Echo notes to MIDI out** only if the DAW should see the same notes back — and use a *different* IAC bus than MIDI in, or the page and the DAW will feed each other.

Click **Connect MIDI** once so the browser can resume audio; MIDI messages alone are not a user gesture.

## Credits

- Original Talk It! frontend recreation: [glebasos/OpenTalkIt](https://github.com/glebasos/OpenTalkIt) and [zack_fire on itch.io](https://zack-fire.itch.io/opentalkit)
- Personality presets reverse-engineered from `TIBASE32.DLL` by the OpenTalkIt / TiSpeech project
- Formant engine: [klattsch](https://klatts.ch/) (MIT)
- English pronunciations: [CMU Pronouncing Dictionary](https://github.com/words/cmu-pronouncing-dictionary)
- SoftVoice / Talk It! remain the property of their owners. This repo does not include `TIBASE32.DLL`, `TIENG32.DLL`, or any Microsoft Plus! assets.
