// Landing pages for the tools that have one. Rendered by components/ToolPage.astro as a README.
// Inline `code` in strings is written with backticks. Demo output lines are trusted HTML using the
// global token classes from global.css (.k keyword, .s string, .n number, .c comment).
import type { Lang } from '../i18n/ui';
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

/** /pt-br/atticus/: same page, same commands, Portuguese prose. */
export const atticusPt: ToolPage = {
  ...atticus,
  title: 'Atticus: assistente de voz em overlay para Omarchy e Hyprland',
  description:
    'Atticus é um assistente de voz em overlay para o Omarchy (Hyprland/Wayland): hotkey ou wake word, reconhecimento de fala local em português do Brasil e inglês, voz neural e comandos de shell em sandbox.',
  tagline: 'Aperte uma tecla, fale, ouça a resposta. No seu próprio desktop Linux.',
  lede: 'O Atticus coloca um painel pequeno, sempre visível, no canto da tela. Ele transcreve português do Brasil ou inglês com `faster-whisper`, responde com uma voz neural do `Piper` e passa todo comando que o modelo executa por uma sandbox `bubblewrap`.',
  badges: [['plataforma', 'Omarchy · Hyprland'], ['licença', 'MIT'], ['stack', 'GTK4 · faster-whisper · Piper'], ['fala', 'local']],
  demo: {
    title: atticus.demo.title,
    lines: [
      { note: 'atalho Ctrl+Alt+Space: aperte, fale, aperte de novo' },
      { cmd: 'atticus-ctl toggle' },
      { out: '<span class="k">ouvido</span>   <span class="s">"coloca um timer de 10 minutos para o macarrão"</span>' },
      { out: '<span class="k">direto</span>   timer · <span class="n">10:00</span> · macarrão <span class="c">(sem passar pela IA)</span>' },
      { gap: true },
      { note: 'todo o resto vai para o modelo, atrás da barreira' },
      { out: '<span class="k">ouvido</span>   <span class="s">"o que tem na minha tela?"</span>' },
      { out: '<span class="k">sandbox</span>  bwrap · arquivos só leitura · sem rede' },
      { out: '<span class="s">[+]</span> resposta exibida no painel e lida em voz alta' },
    ],
  },
  features: {
    intro: 'Um assistente de voz de desktop que não atrapalha, mantém a sua fala na sua máquina e nunca deixa o modelo rodar um comando sem verificação.',
    items: [
      { name: 'Overlay que não rouba o foco', desc: 'Um painel de canto feito sobre `wlr-layer-shell` com GTK4 e WebKitGTK. Flutua acima das janelas e deixa o teclado onde estava.' },
      { name: 'Hotkey ou wake word', desc: 'Aperte para falar com um atalho, ou ligue a wake word sempre ativa. O modo conversa reabre o microfone quando o Atticus termina com uma pergunta.' },
      { name: 'Fala local, nos dois sentidos', desc: 'Reconhecimento ajustado para português do Brasil com `faster-whisper`, com suporte a inglês. A voz do `Piper` fica carregada, então a resposta começa a ser falada na hora.' },
      { name: 'Comandos instantâneos', desc: 'Timers, alarmes, lembretes, volume, brilho, mídia, listas, Wi-Fi, Bluetooth e bloqueio de tela rodam localmente em português e inglês, sem passar pela IA.' },
      { name: 'Sandbox por padrão', desc: 'Os comandos do modelo rodam dentro do `bubblewrap`: arquivos só leitura, chaves e perfis de navegador ocultos, sem rede. Mudanças reais pedem um cartão de permissão. `rm`, `sudo` e `git push` nunca rodam.' },
      { name: 'Vê e opera o desktop', desc: 'Leitura de tela com `grim` e `tesseract`, busca na web, busca de arquivos locais, clique e digitação nativos, e casa inteligente por um servidor Home Assistant.' },
    ],
  },
  usage: {
    intro: 'Configure uma tecla e fale. O Atticus roda como serviço de usuário do systemd, então você o gerencia como qualquer outro.',
    modes: [
      {
        name: 'Fale com ele', tag: 'hotkey · wake word',
        desc: 'Aperte Ctrl+Alt+Space, fale e aperte de novo para enviar. A resposta aparece no painel e é lida em voz alta. Feche com Esc ou deixe sumir sozinho.',
        cmds: atticus.usage.modes[0].cmds,
      },
      {
        name: 'Rode como serviço', tag: 'systemd user',
        desc: 'As configurações ficam em ~/.config/atticus/settings.json. Reinicie o serviço depois de editar e acompanhe os logs ao vivo.',
        cmds: atticus.usage.modes[1].cmds,
      },
    ],
  },
  pipeline: {
    title: 'Pipeline de voz',
    intro: 'Todo pedido faz o mesmo caminho, da sua voz até a resposta falada.',
    steps: [
      { name: 'Gatilho', desc: 'Um atalho ou a wake word abre o microfone.' },
      { name: 'Transcrição', desc: 'O faster-whisper transforma fala em texto, localmente.' },
      { name: 'Roteamento', desc: 'Comandos do dia a dia rodam na hora. O resto vai para o modelo.' },
      { name: 'Barreira', desc: 'Comandos do modelo passam pela sandbox ou esperam a sua permissão.' },
      { name: 'Resposta', desc: 'O texto aparece em tempo real no painel.' },
      { name: 'Fala', desc: 'O Piper lê em voz alta com uma voz neural.' },
    ],
  },
  numbers: [
    ['Idiomas de fala', 'PT-BR / EN'],
    ['Níveis de segurança de comando', '4'],
    ['Modelo Whisper padrão', 'small'],
    ['Telemetria', 'nenhuma'],
  ],
  install: {
    intro: 'Clone e compile. O `build.sh` cria o ambiente virtual, baixa a voz em português e inicia o serviço de usuário.',
    cmd: atticus.install.cmd,
    notes: [
      'Requer Omarchy ou outra sessão Hyprland / Wayland, e Python 3.11+.',
      'O `build.sh` confere os pacotes do sistema e mostra a linha exata do `pacman` para o que faltar.',
      'O cérebro usa a CLI `claude` por padrão. Um endpoint no estilo OpenAI ou Claude (Ollama, LM Studio) também funciona.',
      'Saia da sessão e entre de novo uma vez após a primeira instalação, para o `ydotool` poder clicar e digitar.',
    ],
  },
  closing: 'Uma voz para o seu desktop Linux que você pode ler, auditar e mudar. Dê uma estrela no GitHub, abra uma issue ou mande um pull request.',
};

/** /pt-br/manw-ng/ */
export const manwPt: ToolPage = {
  ...manw,
  title: 'MANW-NG: documentação e execução da API do Windows, direto do terminal',
  description:
    'MANW-NG é uma CLI em Python para reversers e pesquisadores de segurança: extrai documentação estruturada de Win32/NTAPI do Microsoft Learn e executa APIs do Windows diretamente via ctypes.',
  tagline: 'Documentação e execução da API do Windows, direto do seu terminal.',
  lede: 'O MANW-NG extrai a documentação estruturada do Microsoft Learn e chama APIs reais do Windows via `ctypes`. Uma única CLI feita para reversers e pesquisadores de segurança.',
  badges: [['python', '3.11+'], ['licença', 'MIT'], ['apis', 'Win32 · NTAPI · driver'], ['mapeamentos', '61.000+']],
  demo: {
    title: manw.demo.title,
    lines: manw.demo.lines.map((l) => ('note' in l ? { note: 'chama uma API real do Windows via ctypes' } : l)),
  },
  features: {
    intro: 'De consultas offline à execução ao vivo: uma única ferramenta que tira as idas e voltas ao navegador do seu fluxo de reversing.',
    items: [
      { name: 'Documentação estruturada', desc: 'Assinatura, parâmetros, valores de retorno e observações extraídos do Microsoft Learn em uma saída limpa e fácil de processar.' },
      { name: 'Execução de WinAPI ao vivo', desc: 'Chame qualquer função exportada via `ctypes`, com retornos tipados, alocação de buffers, hexdumps e o resultado de `GetLastError`.' },
      { name: 'Base com 61 mil+ mapeamentos', desc: 'Um índice enorme de função→header com classificação heurística resolve APIs mesmo quando a busca não encontra nada.' },
      { name: 'Vários formatos de saída', desc: 'Saída em terminal rico, `JSON` e Markdown, todas localizadas, para o resultado cair direto em scripts e anotações.' },
      { name: 'Inglês e português', desc: 'Documentação bilíngue completa com `-l br`: assinaturas, tabelas de parâmetros e observações são traduzidas juntas.' },
      { name: 'Rápido e com cache', desc: 'HTTP assíncrono com cache condicional por ETag e um cache de URLs que aprende sozinho deixam consultas repetidas quase instantâneas.' },
    ],
  },
  usage: {
    intro: 'Consulte e depois execute. O modo documentação é multiplataforma. O modo execução roda a API de verdade no Windows.',
    modes: [
      {
        name: 'Modo documentação', tag: 'multiplataforma',
        desc: 'Resolva qualquer função Win32, NTAPI ou de driver até a assinatura e a referência completas. Sem navegador.',
        cmds: manw.usage.modes[0].cmds,
      },
      {
        name: 'Modo execução', tag: 'só windows',
        desc: 'Invoque APIs reais com atalhos de módulo, retornos tipados, buffers graváveis e inspeção de erros.',
        cmds: manw.usage.modes[1].cmds,
      },
    ],
  },
  pipeline: {
    title: 'Pipeline de busca',
    intro: 'Cada consulta passa por cinco fallbacks em cascata até encontrar uma correspondência confiável.',
    steps: [
      { name: 'Learn Search', desc: 'Consulta primeiro a API oficial de busca do Microsoft Learn.' },
      { name: 'URLs inteligentes', desc: 'Gera e valida URLs candidatas de documentação a partir de padrões.' },
      { name: 'Classificador', desc: 'A classificação heurística de headers mapeia o nome da função.' },
      { name: 'Catálogo', desc: 'Recorre ao catálogo interno de APIs que acompanha a ferramenta.' },
      { name: 'Mapa offline', desc: 'Resolve pelo mapeamento JSON offline de 61 mil+ entradas, em último caso.' },
    ],
  },
  numbers: [
    ['Mapeamentos função→header', '61 mil+'],
    ['Etapas de fallback na busca', '5'],
    ['Idiomas', 'EN / PT-BR'],
    ['Formatos de saída', '3'],
  ],
  install: {
    intro: 'Clone, instale e você ganha o comando `manw-ng` no terminal.',
    cmd: manw.install.cmd,
    notes: [
      'Requer Python 3.11+ e pip.',
      'O modo documentação roda em qualquer lugar: Linux, macOS, Windows.',
      'O modo execução precisa de um interpretador Python nativo do Windows.',
    ],
  },
  closing: 'Faça engenharia reversa da API do Windows mais rápido. Dê uma estrela no GitHub, abra uma issue ou mande um pull request.',
  links: manw.links.map((l) => (l.label === 'Original MANW' ? { ...l, label: 'MANW original' } : l)),
};

/** /pt-br/ocrack/ */
export const ocrackPt: ToolPage = {
  ...ocrack,
  title: 'OCRack: traduza e faça OCR de qualquer PDF com IA, direto do terminal',
  description:
    'OCRack é uma CLI em Python que extrai imagens, faz OCR do texto e traduz PDFs com IA preservando o layout, usando PaddleOCR, PyMuPDF e os modelos GPT da OpenAI.',
  tagline: 'Traduza qualquer PDF com IA. Com layout, imagens e tudo.',
  lede: 'O OCRack extrai as imagens, faz OCR do texto e traduz PDFs inteiros com IA, preservando formatação e posicionamento. Um único pipeline de terminal construído sobre `PaddleOCR` e OpenAI GPT.',
  badges: [['python', '3.8+'], ['licença', 'MIT'], ['stack', 'PaddleOCR · PyMuPDF · GPT'], ['saída', 'preserva o layout']],
  demo: {
    title: ocrack.demo.title,
    lines: [
      { cmd: 'ocrack book.pdf -p "234-235"' },
      { out: '<span class="s">[+]</span> analisando documento · 2 páginas selecionadas' },
      { out: `<span class="k">extract</span>   ${bar} 4 imagens @ coords` },
      { out: `<span class="k">ocr</span>       ${bar} fallback PaddleOCR ok` },
      { out: `<span class="k">chunk</span>     ${bar} 18 segmentos` },
      { out: `<span class="k">translate</span> ${bar} gpt-4o-mini` },
      { out: `<span class="k">render</span>    ${bar} HTML → PDF` },
      { gap: true },
      { out: '<span class="s">[✓]</span> out/book_translated_20260706.pdf <span class="c">($0.011)</span>' },
    ],
  },
  features: {
    intro: 'Extração, OCR, segmentação inteligente e renderização, encadeados de ponta a ponta para o PDF traduzido sair com a cara do original.',
    items: [
      { name: 'Extração e reinserção de imagens', desc: 'As figuras são extraídas com suas coordenadas e devolvidas ao documento traduzido exatamente na mesma posição.' },
      { name: 'OCR com fallback', desc: 'O PaddleOCR é o motor principal, com o `Tesseract` como fallback offline, então páginas escaneadas ou só de imagem também são lidas.' },
      { name: 'Chunking inteligente', desc: 'A segmentação inteligente do texto mantém o contexto da tradução enxuto e melhora a precisão em documentos longos e estruturados.' },
      { name: 'Otimização de custo', desc: 'Acompanhamento de tokens e custo em tempo real com o prompt caching da OpenAI: até `50%` mais barato em conteúdo repetido.' },
      { name: 'Robusto e retomável', desc: 'Tratamento de erros, novas tentativas automáticas e recuperação por checkpoint fazem um job longo sobreviver a APIs instáveis e continuar de onde parou.' },
      { name: 'Interface de terminal rica', desc: 'Uma interface profissional feita com `Rich` mostra o progresso ao vivo, a detecção de capítulos e o custo por página enquanto trabalha.' },
    ],
  },
  usage: {
    intro: 'Gere um PDF traduzido fiel ao original, ou pule a renderização e leia a tradução direto no terminal.',
    modes: [
      {
        name: 'Modo PDF', tag: 'padrão',
        desc: 'Extrai as imagens, traduz e renderiza de novo em um PDF que preserva o layout, ao lado de um gêmeo em HTML.',
        cmds: ocrack.usage.modes[0].cmds,
      },
      {
        name: 'Modo rápido / CLI', tag: 'sem render',
        desc: 'Pule a extração de imagens ou a renderização do PDF quando você só quer o texto traduzido, rápido e barato.',
        cmds: ocrack.usage.modes[1].cmds,
      },
    ],
  },
  pipeline: {
    title: 'Pipeline de tradução',
    intro: 'Todo PDF passa pelas mesmas seis etapas determinísticas, da análise ao documento renderizado.',
    steps: [
      { name: 'Análise', desc: 'Lê a estrutura e seleciona páginas ou capítulos.' },
      { name: 'Extração', desc: 'Retira as imagens com as coordenadas exatas da página.' },
      { name: 'OCR', desc: 'Lê o texto com PaddleOCR, com fallback para Tesseract.' },
      { name: 'Chunking', desc: 'Divide o texto em partes que respeitam o contexto.' },
      { name: 'Tradução', desc: 'Envia os segmentos ao GPT acompanhando o custo.' },
      { name: 'Renderização', desc: 'Monta o HTML e imprime de volta em PDF.' },
    ],
  },
  numbers: [
    ['Páginas traduzidas por minuto', '1–5'],
    ['Custo por página (gpt-4o-mini)', '$0.001+'],
    ['Redução de custo com cache', '50%'],
    ['Etapas do pipeline', '6'],
  ],
  install: {
    intro: 'Clone, instale e você ganha o comando `ocrack` no terminal.',
    cmd: ocrack.install.cmd,
    notes: [
      'Requer Python 3.8+ e uma chave de API da OpenAI.',
      'Rode `playwright install chromium` para a renderização HTML→PDF.',
      'Defina `OPENAI_API_KEY`. `OPENAI_MODEL` usa gpt-4o-mini por padrão.',
    ],
  },
  closing: 'Traduza os livros que as outras ferramentas ignoram. Dê uma estrela no GitHub, abra uma issue ou mande um pull request.',
};

/** Every landing page, by URL slug then locale: /en-us/<slug>/ and /pt-br/<slug>/. */
export const toolPages: Record<string, Record<Lang, ToolPage>> = {
  'manw-ng': { en: manw, 'pt-br': manwPt },
  ocrack: { en: ocrack, 'pt-br': ocrackPt },
  atticus: { en: atticus, 'pt-br': atticusPt },
};
