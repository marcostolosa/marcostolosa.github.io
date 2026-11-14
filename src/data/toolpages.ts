// Landing pages for the tools that have one. Rendered by components/ToolPage.astro as a README.
// Inline `code` in strings is written with backticks. Demo output lines are trusted HTML using the
// global token classes from global.css (.k keyword, .s string, .n number, .c comment).
import type { NodeType } from './graph';

export type DemoLine = { cmd: string } | { out: string } | { note: string } | { gap: true };
export type ToolPage = {
  slug: string;
  name: string;
  /** Backdrop light and page accent: one of the entity colours. */
  tint: NodeType;
  title: string;
  description: string;
  tagline: string;
  lede: string;
  badges: [string, string][];
  repo: string;
  demo: { title: string; lines: DemoLine[] };
  features: { intro: string; items: { name: string; desc: string }[] };
  usage: { intro: string; modes: { name: string; tag: string; desc: string; cmds: string[] }[] };
  pipeline: { title: string; intro: string; steps: { name: string; desc: string }[] };
  numbers: [string, string][];
  install: { intro: string; cmd: string; notes: string[] };
  closing: string;
  docs: string;
  links: { label: string; href: string }[];
};

export const manw: ToolPage = {
  slug: 'manw-ng',
  name: 'MANW-NG',
  tint: 'writeup',
  title: 'MANW-NG: Windows API docs and execution, from your terminal',
  description:
    'MANW-NG is a Python CLI for reverse engineers and security researchers: scrape structured Win32/NTAPI documentation from Microsoft Learn and execute Windows APIs directly via ctypes.',
  tagline: 'Windows API docs and execution, straight from your terminal.',
  lede: 'MANW-NG scrapes structured Microsoft Learn documentation and calls live Windows APIs via `ctypes`. One CLI built for reverse engineers and security researchers.',
  badges: [['python', '3.11+'], ['license', 'MIT'], ['apis', 'Win32 · NTAPI · driver'], ['mappings', '61,000+']],
  repo: 'https://github.com/marcostolosa/manw-ng',
  demo: {
    title: 'tr0p@kali: ~/apps/manw-ng',
    lines: [
      { cmd: 'manw-ng VirtualAlloc -o json' },
      { out: '<span class="k">"function"</span>: <span class="s">"VirtualAlloc"</span>,' },
      { out: '<span class="k">"dll"</span>:      <span class="s">"kernel32.dll"</span>,' },
      { out: '<span class="k">"return"</span>:   <span class="s">"LPVOID"</span>,' },
      { out: '<span class="k">"params"</span>:   [ lpAddress, dwSize, flAllocationType, ... ]' },
      { gap: true },
      { note: 'call a live Windows API through ctypes' },
      { cmd: 'manw-ng exec k:Beep 750 300' },
      { out: '<span class="s">[+]</span> kernel32!Beep(750, 300) → <span class="s">1</span> <span class="c">(BOOL TRUE)</span>' },
    ],
  },
  features: {
    intro: 'From offline lookups to live execution: a single tool that removes the browser round-trips from your reversing workflow.',
    items: [
      { name: 'Structured documentation', desc: 'Signature, parameters, return values and remarks scraped from Microsoft Learn into clean, parseable output.' },
      { name: 'Live WinAPI execution', desc: 'Call any exported function via `ctypes` with typed returns, buffer allocation, hexdumps and `GetLastError` reporting.' },
      { name: '61k+ mapping database', desc: 'A massive function→header index with heuristic classification resolves APIs even when search comes up empty.' },
      { name: 'Multiple output formats', desc: 'Rich terminal, `JSON` and Markdown output, all localized, so results drop straight into scripts and notes.' },
      { name: 'English and Portuguese', desc: 'Full bilingual docs with `-l br`: signatures, parameter tables and remarks all translate together.' },
      { name: 'Fast and cached', desc: 'Async HTTP with ETag conditional caching and a self-learning URL cache keep repeat lookups near-instant.' },
    ],
  },
  usage: {
    intro: 'Look it up, then run it. Documentation mode is cross-platform. Execution mode runs the real API on Windows.',
    modes: [
      {
        name: 'Documentation mode', tag: 'cross-platform',
        desc: 'Resolve any Win32, NTAPI or driver function to its full signature and reference. No browser required.',
        cmds: ['manw-ng CreateProcessW', 'manw-ng -l br NtCreateFile --tabs', 'manw-ng RegOpenKeyExW -o markdown'],
      },
      {
        name: 'Execution mode', tag: 'windows-only',
        desc: 'Invoke live APIs with module shortcuts, typed returns, writable buffers and error inspection.',
        cmds: ['manw-ng exec u:MessageBoxW 0 "Hi" "MANW-NG" 0', "manw-ng exec u:GetCursorPos '$b:8'", 'manw-ng exec k:OpenProcess 0x0400 0 4242 --show-error'],
      },
    ],
  },
  pipeline: {
    title: 'Lookup pipeline',
    intro: 'Each request cascades through five fallbacks until an authoritative match is found.',
    steps: [
      { name: 'Learn Search', desc: 'Queries the official Microsoft Learn Search API first.' },
      { name: 'Smart URLs', desc: 'Generates and validates candidate doc URLs from patterns.' },
      { name: 'Classifier', desc: 'Heuristic header classification maps the function name.' },
      { name: 'Catalog', desc: 'Falls back to the bundled internal API catalog.' },
      { name: 'Offline map', desc: 'Resolves from the 61k+ offline JSON mapping as last resort.' },
    ],
  },
  numbers: [
    ['Function→header mappings', '61k+'],
    ['Fallback lookup stages', '5'],
    ['Languages', 'EN / PT-BR'],
    ['Output formats', '3'],
  ],
  install: {
    intro: 'Clone, install, and you get the `manw-ng` console command.',
    cmd: 'git clone https://github.com/marcostolosa/manw-ng.git && cd manw-ng && pip install -e .',
    notes: [
      'Requires Python 3.11+ and pip.',
      'Documentation mode runs anywhere: Linux, macOS, Windows.',
      'Execution mode needs a native Windows Python interpreter.',
    ],
  },
  closing: 'Reverse engineer the Windows API, faster. Star it on GitHub, file an issue, or send a pull request.',
  docs: 'https://github.com/marcostolosa/manw-ng/blob/main/DOCS.md',
  links: [
    { label: 'GitHub', href: 'https://github.com/marcostolosa/manw-ng' },
    { label: 'Issues', href: 'https://github.com/marcostolosa/manw-ng/issues' },
    { label: 'Original MANW', href: 'https://github.com/leandrofroes/manw' },
    { label: 'winapiexec', href: 'https://github.com/m417z/winapiexec' },
  ],
};

const bar = '<span class="bar">████████████</span>';
export const ocrack: ToolPage = {
  slug: 'ocrack',
  name: 'OCRack',
  tint: 'tool',
  title: 'OCRack: translate and OCR any PDF with AI, from your terminal',
  description:
    'OCRack is a Python CLI that extracts images, OCRs text and AI-translates PDFs while preserving layout, powered by PaddleOCR, PyMuPDF and OpenAI GPT models.',
  tagline: 'Translate any PDF with AI. Layout, images and all.',
  lede: 'OCRack extracts images, OCRs the text and AI-translates whole PDFs while preserving formatting and positioning. A single terminal pipeline built on `PaddleOCR` and OpenAI GPT.',
  badges: [['python', '3.8+'], ['license', 'MIT'], ['stack', 'PaddleOCR · PyMuPDF · GPT'], ['output', 'layout-preserving']],
  repo: 'https://github.com/marcostolosa/OCRack',
  demo: {
    title: 'tr0p@kali: ~/apps/OCRack',
    lines: [
      { cmd: 'ocrack book.pdf -p "234-235"' },
      { out: '<span class="s">[+]</span> analyzing document · 2 pages selected' },
      { out: `<span class="k">extract</span>   ${bar} 4 images @ coords` },
      { out: `<span class="k">ocr</span>       ${bar} PaddleOCR fallback ok` },
      { out: `<span class="k">chunk</span>     ${bar} 18 segments` },
      { out: `<span class="k">translate</span> ${bar} gpt-4o-mini` },
      { out: `<span class="k">render</span>    ${bar} HTML → PDF` },
      { gap: true },
      { out: '<span class="s">[✓]</span> out/book_translated_20260706.pdf <span class="c">($0.011)</span>' },
    ],
  },
  features: {
    intro: 'Extraction, OCR, smart segmentation and rendering, chained end to end so a translated PDF comes out looking like the original.',
    items: [
      { name: 'Image extraction and reinsertion', desc: 'Figures are pulled out with their coordinates and dropped back into the translated document at the exact same position.' },
      { name: 'OCR with fallback', desc: 'PaddleOCR is the primary engine with `Tesseract` as an offline fallback, so scanned or image-only pages still get read.' },
      { name: 'Smart chunking', desc: 'Intelligent text segmentation keeps translation context tight, improving accuracy on long, structured documents.' },
      { name: 'Cost optimization', desc: 'Real-time token and cost tracking with OpenAI prompt caching: up to `50%` cheaper on repeated content.' },
      { name: 'Robust and resumable', desc: 'Error handling, automatic retries and checkpoint recovery mean a long job survives flaky APIs and picks up where it stopped.' },
      { name: 'Rich terminal UI', desc: 'A professional `Rich`-powered interface shows live progress, chapter detection and per-page cost as it works.' },
    ],
  },
  usage: {
    intro: 'Generate a pixel-faithful translated PDF, or skip rendering and read the translation straight in your terminal.',
    modes: [
      {
        name: 'PDF mode', tag: 'default',
        desc: 'Extract images, translate and re-render into a new layout-preserving PDF next to an HTML twin.',
        cmds: ['ocrack book.pdf -p "234-235"', 'ocrack input.pdf --pages "10-28" -m gpt-4o', 'ocrack input.pdf -c "1,3-5" --max-chunks 50'],
      },
      {
        name: 'Fast / CLI mode', tag: 'no-render',
        desc: 'Skip image extraction or PDF rendering when you just want the translated text quickly and cheaply.',
        cmds: ['ocrack book.pdf -p "234-235" --cli', 'ocrack book.pdf -p "234-235" --no-ocr', 'ocrack book.pdf -o ./out -m gpt-4o-mini'],
      },
    ],
  },
  pipeline: {
    title: 'Translation pipeline',
    intro: 'Every PDF flows through the same six deterministic stages, from analysis to a rendered document.',
    steps: [
      { name: 'Analyze', desc: 'Parse structure and select pages or chapters.' },
      { name: 'Extract', desc: 'Pull images with precise page coordinates.' },
      { name: 'OCR', desc: 'Read text with PaddleOCR, Tesseract fallback.' },
      { name: 'Chunk', desc: 'Segment text into context-aware pieces.' },
      { name: 'Translate', desc: 'Send segments to GPT with cost tracking.' },
      { name: 'Render', desc: 'Compile HTML and print back to PDF.' },
    ],
  },
  numbers: [
    ['Pages translated per minute', '1–5'],
    ['Cost per page (gpt-4o-mini)', '$0.001+'],
    ['Cache cost reduction', '50%'],
    ['Pipeline stages', '6'],
  ],
  install: {
    intro: 'Clone, install and you get the `ocrack` console command.',
    cmd: 'git clone https://github.com/marcostolosa/OCRack.git && cd OCRack && pip install -e .',
    notes: [
      'Requires Python 3.8+ and an OpenAI API key.',
      'Run `playwright install chromium` for HTML→PDF rendering.',
      'Set `OPENAI_API_KEY`. `OPENAI_MODEL` defaults to gpt-4o-mini.',
    ],
  },
  closing: 'Translate the books the tools skip. Star it on GitHub, file an issue, or send a pull request.',
  docs: 'https://github.com/marcostolosa/OCRack#readme',
  links: [
    { label: 'GitHub', href: 'https://github.com/marcostolosa/OCRack' },
    { label: 'Issues', href: 'https://github.com/marcostolosa/OCRack/issues' },
    { label: 'PaddleOCR', href: 'https://github.com/PaddlePaddle/PaddleOCR' },
  ],
};

export const atticus: ToolPage = {
  slug: 'atticus',
  name: 'Atticus',
  tint: 'account',
  title: 'Atticus: a voice assistant overlay for Omarchy and Hyprland',
  description:
    'Atticus is a voice assistant overlay for Omarchy (Hyprland/Wayland): hotkey or wake word, local speech recognition in Brazilian Portuguese and English, a neural voice, and sandboxed shell commands.',
  tagline: 'Press a hotkey, speak, get a spoken answer. On your own Linux desktop.',
  lede: 'Atticus puts a small always-on-top panel in the corner of your screen. It transcribes Brazilian Portuguese or English with `faster-whisper`, answers in a `Piper` neural voice, and gates every command the model runs behind a `bubblewrap` sandbox.',
  badges: [['platform', 'Omarchy · Hyprland'], ['license', 'MIT'], ['stack', 'GTK4 · faster-whisper · Piper'], ['speech', 'local']],
  repo: 'https://github.com/marcostolosa/atticus-linux',
  demo: {
    title: 'tr0p@omarchy: ~/apps/atticus-linux',
    lines: [
      { note: 'bound to Ctrl+Alt+Space: press, speak, press again' },
      { cmd: 'atticus-ctl toggle' },
      { out: '<span class="k">heard</span>    <span class="s">"coloca um timer de 10 minutos para o macarrão"</span>' },
      { out: '<span class="k">instant</span>  timer · <span class="n">10:00</span> · macarrão <span class="c">(no AI round trip)</span>' },
      { gap: true },
      { note: 'anything else goes to the model, behind the gate' },
      { out: '<span class="k">heard</span>    <span class="s">"what is on my screen?"</span>' },
      { out: '<span class="k">sandbox</span>  bwrap · files read-only · no network' },
      { out: '<span class="s">[+]</span> answer streamed to the panel and read aloud' },
    ],
  },
  features: {
    intro: 'A desktop voice assistant that stays out of the way, keeps your speech on your machine and never lets the model run a command unchecked.',
    items: [
      { name: 'Overlay that never steals focus', desc: 'A corner panel built on `wlr-layer-shell` with GTK4 and WebKitGTK. It floats above your windows and leaves the keyboard where it was.' },
      { name: 'Hotkey or wake word', desc: 'Push to talk with a keybinding, or turn on the always-on wake word. Conversation mode reopens the microphone when Atticus ends on a question.' },
      { name: 'Local speech, both ways', desc: 'Recognition tuned for Brazilian Portuguese with `faster-whisper`, English supported. The `Piper` voice stays loaded so answers start speaking at once.' },
      { name: 'Instant commands', desc: 'Timers, alarms, reminders, volume, brightness, media, lists, Wi-Fi, Bluetooth and lock screen run locally in Portuguese and English, with no AI round trip.' },
      { name: 'Sandboxed by default', desc: 'Model commands run inside `bubblewrap`: files read-only, keys and browser profiles hidden, no network. Real changes need an Allow card. `rm`, `sudo` and `git push` never run.' },
      { name: 'Sees and drives the desktop', desc: 'Screen reading with `grim` and `tesseract`, web search, local file search, native click and typing, plus smart home through a Home Assistant server.' },
    ],
  },
  usage: {
    intro: 'Bind one key and talk. Atticus runs as a systemd user service, so you manage it like any other.',
    modes: [
      {
        name: 'Talk to it', tag: 'hotkey · wake word',
        desc: 'Press Ctrl+Alt+Space, speak, press again to send. The answer streams into the panel and is read aloud. Close with Esc or let it fade.',
        cmds: ['atticus-ctl toggle', 'hyprctl reload'],
      },
      {
        name: 'Run it as a service', tag: 'systemd user',
        desc: 'Settings live in ~/.config/atticus/settings.json. Restart the service after editing them and follow the logs live.',
        cmds: ['systemctl --user status atticus', 'systemctl --user restart atticus', 'journalctl --user -u atticus -f'],
      },
    ],
  },
  pipeline: {
    title: 'Voice pipeline',
    intro: 'Every request takes the same path from your voice to a spoken answer.',
    steps: [
      { name: 'Trigger', desc: 'A hotkey or the wake word opens the microphone.' },
      { name: 'Transcribe', desc: 'faster-whisper turns speech into text, locally.' },
      { name: 'Route', desc: 'Everyday commands run at once. The rest goes to the model.' },
      { name: 'Gate', desc: 'Model commands pass the sandbox or wait for your Allow.' },
      { name: 'Answer', desc: 'The reply streams into the overlay panel.' },
      { name: 'Speak', desc: 'Piper reads it aloud in a neural voice.' },
    ],
  },
  numbers: [
    ['Speech languages', 'PT-BR / EN'],
    ['Command safety tiers', '4'],
    ['Default Whisper model', 'small'],
    ['Telemetry', 'none'],
  ],
  install: {
    intro: 'Clone and build. `build.sh` sets up the virtual environment, downloads the Portuguese voice and starts the user service.',
    cmd: 'git clone https://github.com/marcostolosa/atticus-linux.git && cd atticus-linux && ./build.sh',
    notes: [
      'Requires Omarchy or another Hyprland / Wayland session, and Python 3.11+.',
      '`build.sh` checks the system packages and prints the exact `pacman` line for anything missing.',
      'The brain defaults to the `claude` CLI. An OpenAI or Claude-style endpoint (Ollama, LM Studio) works too.',
      'Log out and back in once after the first install so `ydotool` can click and type.',
    ],
  },
  closing: 'A voice for your Linux desktop that you can read, audit and change. Star it on GitHub, file an issue, or send a pull request.',
  docs: 'https://github.com/marcostolosa/atticus-linux#readme',
  links: [
    { label: 'GitHub', href: 'https://github.com/marcostolosa/atticus-linux' },
    { label: 'Issues', href: 'https://github.com/marcostolosa/atticus-linux/issues' },
    { label: 'atticus-mac', href: 'https://github.com/SaarthurR/atticus-mac' },
    { label: 'faster-whisper', href: 'https://github.com/SYSTRAN/faster-whisper' },
    { label: 'Piper', href: 'https://github.com/OHF-Voice/piper1-gpl' },
  ],
};
