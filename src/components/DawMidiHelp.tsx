export function DawMidiHelp({ noPorts }: { noPorts: boolean }) {
  return (
    <div className="flex flex-col gap-2 border border-neutral-800 bg-black px-3 py-2.5">
      <p className="text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
        Ableton will not list this page
      </p>
      <p className="text-[11px] leading-relaxed text-neutral-400">
        Chrome cannot add a row under Input Ports / Output Ports. Live only shows system
        ports (your KeyLab, IAC Driver, loopMIDI). Enable a virtual port; Talk It and Live
        both attach to that port.
      </p>
      <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-neutral-400">
        <li>
          Spotlight:{' '}
          <span className="text-neutral-200">Audio MIDI Setup</span> → Window → Show MIDI
          Studio → double-click <span className="text-neutral-200">IAC Driver</span> →
          check <span className="text-neutral-200">Device is online</span>. Add two ports
          if you want in and out without a loop.
        </li>
        <li>
          Quit Live completely and reopen it. In Link, Tempo & MIDI you should now see{' '}
          <span className="text-neutral-200">IAC Driver Bus 1</span> (not “Talk It!”).
        </li>
        <li>
          Input Ports: turn <span className="text-neutral-200">Track</span> on for that IAC
          bus. Output Ports: Track on a <em>second</em> IAC bus if you echo notes back.
        </li>
        <li>
          MIDI track in the set → MIDI To:{' '}
          <span className="text-neutral-200">IAC Driver Bus 1</span>. Notes from that track
          hit this page.
        </li>
        <li>
          Here: Connect MIDI → MIDI in: the same IAC bus. Audio back to Live needs
          BlackHole / Loopback in Audio prefs, not this MIDI list.
        </li>
      </ol>
      {noPorts ? (
        <p className="text-[11px] leading-relaxed text-white">
          No ports yet — IAC is still offline, or Live/Chrome needs a restart after you
          enable it.
        </p>
      ) : null}
    </div>
  )
}
