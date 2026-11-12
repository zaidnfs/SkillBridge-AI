import React, { useState } from 'react';
import { ThinkingOrb, type OrbState, type OrbSize } from 'thinking-orbs';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import {
  BotAvatar,
  type BotAvatarType,
  type BotAvatarState,
  type BotAvatarFace,
  type BotAvatarGlasses,
  type BotAvatarHat,
  type BotAvatarShading,
} from 'bot-avatars';
import { VoiceBeam } from 'voice-glow';
import { BorderBeam } from 'border-beam';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { KoboyoSparkle, KoboyoBrain } from '@/components/icons/Koboyo';
import { Sparkles, Mic, Play, Pause, RefreshCw, Volume2, Bot, Layers, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibrariesDevShowcaseProps {
  isDark?: boolean;
}

const ALL_ORB_STATES: { state: OrbState; label: string; desc: string; usage: string }[] = [
  { state: 'working', label: 'Working', desc: 'Particles on tilted orbital planes', usage: 'General AI computation & initial loading' },
  { state: 'searching', label: 'Searching', desc: 'Scan meridian sweeps dotted globe', usage: 'Resume skill parsing & job explorer query' },
  { state: 'solving', label: 'Solving', desc: 'Bands scramble in quarter turns, then click', usage: 'Mock interview answer evaluation & scoring' },
  { state: 'listening', label: 'Listening', desc: 'Waveform rolls through latitude rings', usage: 'Voice recording mode audio capture' },
  { state: 'connecting', label: 'Connecting', desc: 'Constellation wires itself with packet flow', usage: 'GraphRAG question synthesis & Neo4j traversal' },
  { state: 'weaving', label: 'Weaving', desc: 'Three strands plait continuously around sphere', usage: 'faster-whisper neural speech transcription' },
  { state: 'composing', label: 'Composing', desc: 'Undulating multi-band sash wave', usage: 'ATS DOCX resume formatting & generation' },
  { state: 'breathing', label: 'Breathing', desc: 'Face-on ring gently pulsing and morphing', usage: 'Audio player synthesis & standby idle' },
  { state: 'shaping', label: 'Shaping', desc: 'Dotted outline morphs circle → triangle → square', usage: 'Entity normalization & taxonomy alignment' },
];

const BOT_TYPES: BotAvatarType[] = [
  'droid',
  'clover',
  'blob',
  'ghost',
  'cat',
  'alien',
  'mech',
  'star',
];

export const LibrariesDevShowcase: React.FC<LibrariesDevShowcaseProps> = ({ isDark = true }) => {
  // Orb State Controls
  const [selectedOrbState, setSelectedOrbState] = useState<OrbState>('working');
  const [orbSize, setOrbSize] = useState<number>(96);
  const [orbColor, setOrbColor] = useState<string>('#008855');
  const [orbSpeed, setOrbSpeed] = useState<number>(1);
  const [orbPaused, setOrbPaused] = useState<boolean>(false);

  // Bot Avatar State Controls
  const [botType, setBotType] = useState<BotAvatarType>('droid');
  const [botState, setBotState] = useState<BotAvatarState>('default');
  const [botFace, setBotFace] = useState<BotAvatarFace>('eyes');
  const [botHeadphones, setBotHeadphones] = useState<boolean>(true);
  const [botGlasses, setBotGlasses] = useState<BotAvatarGlasses>('none');
  const [botHat, setBotHat] = useState<BotAvatarHat>('none');
  const [botShading, setBotShading] = useState<BotAvatarShading>('fabric');
  const [botSize, setBotSize] = useState<number>(64);

  // Voice Beam Controls
  const [simulatedVoiceLevel, setSimulatedVoiceLevel] = useState<number>(0.65);
  const [voiceBeamVariant, setVoiceBeamVariant] = useState<'forest' | 'colorful' | 'ocean' | 'sunset'>('forest');

  const COLOR_SWATCHES = [
    { name: 'Emerald', hex: '#008855' },
    { name: 'Deep Forest', hex: '#004D2F' },
    { name: 'Luminous Mint', hex: '#4CD681' },
    { name: 'Bright Jade', hex: '#00A264' },
    { name: 'Monochrome White', hex: '#FFFFFF' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#008855] dark:text-[#4CD681]">
            libraries.dev Ecosystem
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
            Zero-Dependency Vector Canvas
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight text-[#0A1A12] dark:text-white">
          Living AI Feedback Primitives
        </h3>
        <p className="text-xs sm:text-sm mt-1 text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
          High-crafted visual components created by Jakub Antalík for AI agent interactions: dotted <strong>Thinking Orbs</strong>, 3D animated <strong>Bot Avatars</strong> with interactive living faces, and sound-reactive <strong>Voice Glow</strong>.
        </p>
      </div>

      {/* =========================================================================
          FEATURE 1: THINKING ORBS INTERACTIVE LAB
          ========================================================================= */}
      <SpotlightCard
        spotlightColor={isDark ? 'rgba(76, 214, 129, 0.22)' : 'rgba(0, 162, 100, 0.15)'}
        spotlightSize={340}
        className={cn(
          'p-6 sm:p-8 rounded-2xl border transition-all',
          isDark
            ? 'bg-[#09150E] border-[rgba(0,162,100,0.25)]'
            : 'bg-white border-[#D5E5DC] shadow-xs'
        )}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <KoboyoSparkle size={18} className="text-[#008855] dark:text-[#4CD681]" />
                <h4 className="text-lg font-bold text-[#0A1A12] dark:text-white">
                  Thinking Orbs Laboratory
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                9 tuned mathematical states replacing generic spinners with semantic cognitive stages
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrbPaused(!orbPaused)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                  orbPaused
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300'
                )}
              >
                {orbPaused ? <Play size={13} /> : <Pause size={13} />}
                <span>{orbPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Controls & Live Stage Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Live Stage */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-2xl border bg-radial from-emerald-500/5 via-transparent to-transparent border-[#D5E5DC] dark:border-white/10 relative overflow-hidden min-h-[260px]">
              <div
                className="absolute inset-0 rounded-2xl blur-3xl opacity-20 pointer-events-none scale-150"
                style={{ backgroundColor: orbColor }}
              />

              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <AIThinkingOrb
                  state={selectedOrbState}
                  size={orbSize}
                  color={orbColor}
                  speed={orbSpeed}
                  paused={orbPaused}
                  theme={isDark ? 'dark' : 'light'}
                  glow={true}
                />

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-[#EEF7F1] dark:bg-white/10 text-[#004D2F] dark:text-[#4CD681]">
                    state: "{selectedOrbState}"
                  </div>
                  <h5 className="text-sm font-semibold text-[#0A1A12] dark:text-white">
                    {ALL_ORB_STATES.find((s) => s.state === selectedOrbState)?.desc}
                  </h5>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                    Used for: {ALL_ORB_STATES.find((s) => s.state === selectedOrbState)?.usage}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Fine-tuning knobs */}
            <div className="lg:col-span-7 space-y-5">
              {/* State Buttons Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Select Shipped State ({ALL_ORB_STATES.length})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_ORB_STATES.map((item) => {
                    const isSelected = selectedOrbState === item.state;
                    return (
                      <button
                        key={item.state}
                        type="button"
                        onClick={() => setSelectedOrbState(item.state)}
                        className={cn(
                          'p-2 rounded-xl text-xs text-left transition-all border cursor-pointer',
                          isSelected
                            ? 'bg-[#008855] text-white border-[#008855] shadow-xs font-bold'
                            : 'bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-[#008855]/40'
                        )}
                      >
                        <div className="font-semibold capitalize">{item.label}</div>
                        <div className={cn('text-[10px] truncate', isSelected ? 'opacity-80' : 'text-neutral-400')}>
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sizing & Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    Size Preset
                  </label>
                  <div className="flex gap-1.5">
                    {[128, 96, 64, 48, 32].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setOrbSize(sz)}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer',
                          orbSize === sz
                            ? 'bg-[#008855] text-white border-[#008855] shadow-2xs'
                            : 'bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:border-[#008855]/40'
                        )}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    Ink Color Swatch
                  </label>
                  <div className="flex items-center gap-2">
                    {COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => setOrbColor(swatch.hex)}
                        title={swatch.name}
                        className={cn(
                          'h-7 w-7 rounded-lg border transition-transform hover:scale-110 cursor-pointer flex items-center justify-center',
                          orbColor === swatch.hex ? 'ring-2 ring-[#008855] ring-offset-2 scale-105' : 'border-black/20'
                        )}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 9-State Live Gallery Matrix */}
          <div className="pt-6 border-t border-black/5 dark:border-white/10 space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-mono">
              Concurrent 9-State Particle Inspection Matrix
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {ALL_ORB_STATES.map((s) => (
                <div
                  key={s.state}
                  onClick={() => setSelectedOrbState(s.state)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer text-center',
                    selectedOrbState === s.state
                      ? 'border-[#008855] bg-[#EEF7F1] dark:bg-[#004D2F]/20 shadow-2xs'
                      : 'border-neutral-200 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:border-neutral-400'
                  )}
                >
                  <AIThinkingOrb
                    state={s.state}
                    size={44}
                    color={orbColor}
                    theme={isDark ? 'dark' : 'light'}
                    glow={false}
                  />
                  <span className="text-[11px] font-bold text-[#0A1A12] dark:text-white capitalize mt-2">
                    {s.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* =========================================================================
          FEATURE 2: BOT AVATARS INTERACTIVE PLAYGROUND
          ========================================================================= */}
      <SpotlightCard
        spotlightColor={isDark ? 'rgba(76, 214, 129, 0.22)' : 'rgba(0, 162, 100, 0.15)'}
        spotlightSize={340}
        className={cn(
          'p-6 sm:p-8 rounded-2xl border transition-all',
          isDark
            ? 'bg-[#09150E] border-[rgba(0,162,100,0.25)]'
            : 'bg-white border-[#D5E5DC] shadow-xs'
        )}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-[#008855] dark:text-[#4CD681]" />
                <h4 className="text-lg font-bold text-[#0A1A12] dark:text-white">
                  Living Bot Avatars (`bot-avatars`)
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                18 3D vector characters in plush fur or glossy plastic, with dynamic eye-tracking, blink cycles, and flip physics
              </p>
            </div>

            <div className="text-xs font-mono text-[#008855] dark:text-[#4CD681] bg-[#EEF7F1] dark:bg-white/10 px-3 py-1 rounded-lg font-bold">
              Hover near bot to glance • Click to flip!
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Live Interactive Stage */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-2xl border bg-radial from-emerald-500/5 via-transparent to-transparent border-[#D5E5DC] dark:border-white/10 relative overflow-hidden min-h-[280px]">
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <BotAvatar
                  type={botType}
                  state={botState}
                  face={botFace}
                  size={96}
                  color="#008855"
                  headphones={botHeadphones}
                  glasses={botGlasses}
                  hat={botHat}
                  shading={botShading}
                  interactive={true}
                />

                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-[#0A1A12] dark:text-white capitalize">
                    {botType} Interview Assistant
                  </h5>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                    State: {botState} • Material: {botShading} {botHeadphones ? '• Headphones On' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Customizer Knobs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  1. Character Shape
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BOT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBotType(type)}
                      className={cn(
                        'py-1.5 px-2 rounded-xl text-xs font-medium border capitalize transition-all cursor-pointer text-center',
                        botType === type
                          ? 'bg-[#008855] text-white border-[#008855] font-bold shadow-2xs'
                          : 'bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-[#008855]/40'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* State & Face */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    2. Agent State
                  </label>
                  <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                    {(['default', 'working', 'sleeping'] as BotAvatarState[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setBotState(st)}
                        className={cn(
                          'flex-1 py-1 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer',
                          botState === st
                            ? 'bg-white dark:bg-white/15 text-[#008855] dark:text-[#4CD681] shadow-2xs font-bold'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    3. Face kind
                  </label>
                  <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                    {(['eyes', 'mouth'] as BotAvatarFace[]).map((fc) => (
                      <button
                        key={fc}
                        type="button"
                        onClick={() => setBotFace(fc)}
                        className={cn(
                          'flex-1 py-1 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer',
                          botFace === fc
                            ? 'bg-white dark:bg-white/15 text-[#008855] dark:text-[#4CD681] shadow-2xs font-bold'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        )}
                      >
                        {fc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Accessories: Headphones & Hats & Glasses */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Headphones
                  </label>
                  <button
                    type="button"
                    onClick={() => setBotHeadphones(!botHeadphones)}
                    className={cn(
                      'w-full py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer',
                      botHeadphones
                        ? 'bg-[#008855] text-white border-[#008855]'
                        : 'bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300'
                    )}
                  >
                    {botHeadphones ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Glasses
                  </label>
                  <select
                    value={botGlasses}
                    onChange={(e) => setBotGlasses(e.target.value as BotAvatarGlasses)}
                    className="w-full h-8 px-2 text-xs rounded-lg border border-[#007347] bg-[#008855] text-white font-semibold cursor-pointer [&>option]:bg-white [&>option]:text-[#0A1A12]"
                  >
                    <option value="none">None</option>
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                    <option value="shades">Shades</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Shading Material
                  </label>
                  <select
                    value={botShading}
                    onChange={(e) => setBotShading(e.target.value as BotAvatarShading)}
                    className="w-full h-8 px-2 text-xs rounded-lg border border-[#007347] bg-[#008855] text-white font-semibold cursor-pointer [&>option]:bg-white [&>option]:text-[#0A1A12]"
                  >
                    <option value="fabric">Fabric (Plush Fur)</option>
                    <option value="plastic">Plastic (Glossy 3D)</option>
                    <option value="crisp">Crisp Vector</option>
                    <option value="smooth">Smooth Shade</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* =========================================================================
          FEATURE 3: VOICE GLOW & BORDER BEAM
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Glow Beam */}
        <SpotlightCard
          spotlightColor={isDark ? 'rgba(76, 214, 129, 0.18)' : 'rgba(0, 162, 100, 0.12)'}
          className={cn(
            'p-6 sm:p-7 rounded-2xl border transition-all flex flex-col justify-between',
            isDark
              ? 'bg-[#09150E] border-[rgba(0,162,100,0.22)]'
              : 'bg-white border-[#D5E5DC] shadow-xs'
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-[#008855] dark:text-[#4CD681]" />
                <h4 className="text-base font-bold text-[#0A1A12] dark:text-white">
                  Sound-Reactive Voice Glow (`voice-glow`)
                </h4>
              </div>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Web Audio Reactive
              </span>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              A colorful beam along the bottom edge of speech containers that rises and blooms with candidate voice intensity.
            </p>

            {/* Voice Beam Box */}
            <div className="pt-2">
              <VoiceBeam colorVariant={voiceBeamVariant} level={simulatedVoiceLevel} theme={isDark ? 'dark' : 'light'}>
                <div className="p-4 rounded-xl border border-[#D5E5DC] dark:border-white/10 bg-[#FAFCFB] dark:bg-[#060B08] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#008855] text-white flex items-center justify-center">
                      <Volume2 size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0A1A12] dark:text-white">
                        Simulated Voice Activity
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Voice intensity: {Math.round(simulatedVoiceLevel * 100)}%
                      </div>
                    </div>
                  </div>

                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </VoiceBeam>
            </div>

            {/* Slider to simulate voice level */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Simulate Voice Volume</span>
                <span className="font-mono font-bold">{Math.round(simulatedVoiceLevel * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={simulatedVoiceLevel}
                onChange={(e) => setSimulatedVoiceLevel(parseFloat(e.target.value))}
                className="w-full accent-[#008855]"
              />
            </div>
          </div>
        </SpotlightCard>

        {/* Border Beam */}
        <SpotlightCard
          spotlightColor={isDark ? 'rgba(76, 214, 129, 0.18)' : 'rgba(0, 162, 100, 0.12)'}
          className={cn(
            'p-6 sm:p-7 rounded-2xl border transition-all flex flex-col justify-between',
            isDark
              ? 'bg-[#09150E] border-[rgba(0,162,100,0.22)]'
              : 'bg-white border-[#D5E5DC] shadow-xs'
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#008855] dark:text-[#4CD681]" />
                <h4 className="text-base font-bold text-[#0A1A12] dark:text-white">
                  Border Beam (`border-beam`)
                </h4>
              </div>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Glowing Perimeter
              </span>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Animated light beams that travel around cards, modals, or active elements to denote active AI reasoning.
            </p>

            {/* Border Beam Demonstration Card */}
            <div className="pt-2">
              <BorderBeam colorVariant="forest" size="md">
                <div className="p-5 rounded-2xl border border-[#D5E5DC] dark:border-white/10 bg-white/80 dark:bg-[#060B08]/80 backdrop-blur-md space-y-2">
                  <div className="flex items-center gap-2">
                    <KoboyoBrain size={16} className="text-[#008855] dark:text-[#4CD681]" />
                    <span className="text-xs font-bold text-[#0A1A12] dark:text-white">
                      Active Graph Reasoning Node
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Border Beam encircles modal cards during interview synthesis and active reasoning phases.
                  </p>
                </div>
              </BorderBeam>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
