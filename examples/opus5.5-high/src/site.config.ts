/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  KIOSK · the one file you edit.
 *
 *  Brand (name, colours, fonts, meta) and every section's content live here.
 *  The page is the `sections` array: reorder it, delete entries, or repeat a
 *  section type with different content. Each entry is rendered to static HTML
 *  at build time (good for SEO and for browsers without HTML-in-Canvas), then
 *  enhanced in the browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The five inks every poster is printed with. Hex only (they also feed shaders). */
export interface Palette {
  /** Page and poster paper. */
  paper: string;
  /** Text and hard shadows. */
  ink: string;
  /** Signal colour #1 (calls to action, focus accents). */
  red: string;
  /** Signal colour #2. */
  blue: string;
  /** Signal colour #3. */
  yellow: string;
}

export type Ink = 'red' | 'blue' | 'yellow' | 'paper' | 'ink';

export interface Link {
  label: string;
  href: string;
}

export interface Brand {
  name: string;
  /** Short mark for the nav and the badge. */
  mark: string;
  tagline: string;
  /** Canonical URL, used for Open Graph tags. */
  url: string;
  description: string;
  locale: string;
  light: Palette;
  dark: Palette;
  fonts: {
    /** Family names as registered by the @fontsource packages imported in main.ts. */
    display: string;
    body: string;
    mono: string;
  };
}

export interface HeroSection {
  type: 'hero';
  id: string;
  kicker: string;
  /** Each item is one line of the poster title. */
  title: string[];
  lede: string;
  cta: Link;
  signup: {
    label: string;
    placeholder: string;
    button: string;
    note: string;
    thanks: string;
    /** Form action. Leave empty to keep the demo client-side only. */
    action: string;
  };
}

export interface BandSection {
  type: 'band';
  id: string;
  label: string;
  names: string[];
  link: Link;
  facts: string[];
}

export interface ToyCard {
  tag: string;
  title: string;
  text: string;
  link: Link;
  ink: Ink;
  shape: 'rect' | 'circle' | 'pill';
}

export interface ToyboxSection {
  type: 'toybox';
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  cards: ToyCard[];
}

export interface Session {
  time: string;
  /** Duration in minutes, used for the calendar file. */
  minutes: number;
  title: string;
  speaker: string;
  room: string;
}

export interface ProgrammeSection {
  type: 'programme';
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  days: { label: string; date: string; sessions: Session[] }[];
}

export interface AppSection {
  type: 'app';
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  appName: string;
  sessions: { time: string; title: string; room: string }[];
  store: Link;
}

export interface Quote {
  text: string;
  name: string;
  role: string;
  ink: Ink;
}

export interface VoicesSection {
  type: 'voices';
  id: string;
  eyebrow: string;
  title: string;
  quotes: Quote[];
}

export interface Plan {
  name: string;
  price: string;
  per: string;
  blurb: string;
  rows: { label: string; value: string }[];
  cta: Link;
  ink: Ink;
}

export interface PassesSection {
  type: 'passes';
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** Exactly two plans: the slider compares them. */
  plans: [Plan, Plan];
}

export interface BadgeSection {
  type: 'badge';
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  defaultName: string;
  /** Small print at the bottom of the badge. */
  foot: string;
  roles: string[];
  inks: Ink[];
}

export interface HoodSection {
  type: 'hood';
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
}

export interface FaqSection {
  type: 'faq';
  id: string;
  title: string;
  items: { q: string; a: string }[];
}

export type Section =
  | HeroSection
  | BandSection
  | ToyboxSection
  | ProgrammeSection
  | AppSection
  | VoicesSection
  | PassesSection
  | BadgeSection
  | HoodSection
  | FaqSection;

export interface SiteConfig {
  brand: Brand;
  nav: Link[];
  /** When an event happens. Used by the calendar (.ics) export. */
  event: { year: number; month: number; timezone: string; city: string };
  sections: Section[];
  footer: { note: string; links: Link[] };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Demo content: a fictional festival. Replace freely.
// ─────────────────────────────────────────────────────────────────────────────

export const site: SiteConfig = {
  brand: {
    name: 'Plaza Week',
    mark: 'PLAZA',
    tagline: 'Five days of interfaces, built in public.',
    url: 'https://kiosk-html-in-canvas.gharsallah-abderrahmen.workers.dev',
    description:
      'Plaza Week is a fictional street festival for people who build the web. This page is Kiosk, a template where every poster is live, accessible HTML drawn into canvas.',
    locale: 'en',
    light: { paper: '#f2ede2', ink: '#16130f', red: '#e2412b', blue: '#2346d1', yellow: '#f3c22f' },
    dark: { paper: '#17150f', ink: '#f2ede2', red: '#ff5a3f', blue: '#6d8bff', yellow: '#f6cd47' },
    fonts: {
      display: 'Bricolage Grotesque Variable',
      body: 'Instrument Sans Variable',
      mono: 'JetBrains Mono Variable',
    },
  },

  nav: [
    { label: 'What’s on', href: '#whats-on' },
    { label: 'Programme', href: '#programme' },
    { label: 'Voices', href: '#voices' },
    { label: 'Passes', href: '#passes' },
    { label: 'Your badge', href: '#badge' },
  ],

  event: { year: 2027, month: 6, timezone: 'Europe/Lisbon', city: 'Lisbon' },

  sections: [
    {
      type: 'hero',
      id: 'top',
      kicker: 'Lisbon · 14–18 June 2027 · Praça do Comércio',
      title: ['Plaza', 'Week'],
      lede: 'Five days of talks, workshops and night markets for people who build the web. In the open, on the street, in public.',
      cta: { label: 'Get a pass', href: '#passes' },
      signup: {
        label: 'The festival letter',
        placeholder: 'you@studio.com',
        button: 'Subscribe',
        note: 'One letter a month. No tracking pixels.',
        thanks: 'You’re on the list. See you on the plaza.',
        action: '',
      },
    },
    {
      type: 'band',
      id: 'lineup',
      label: 'On the bill',
      names: ['Ada Rios', 'Jun Okafor', 'Mira Castellanos', 'Tomás Weil', 'Priya Anand', 'Lev Haddad', 'Noor Saleh', 'Ines Barata'],
      link: { label: 'Meet the voices', href: '#voices' },
      facts: ['14–18 June', 'Praça do Comércio', 'Talks', 'Workshops', 'Night market', 'Free fringe'],
    },
    {
      type: 'toybox',
      id: 'whats-on',
      eyebrow: '01 · What’s on',
      title: 'Six ways to spend the week',
      intro: 'Every card is a real article with a real link. Throw them around: they stay clickable wherever they land.',
      cards: [
        { tag: 'Talks', title: 'Main stage', text: 'Forty talks on the craft of interfaces, from type to tooling.', link: { label: 'Browse talks', href: '#programme' }, ink: 'red', shape: 'rect' },
        { tag: 'Hands-on', title: 'Workshops', text: 'Small rooms, real laptops, three hours each.', link: { label: 'Pick a room', href: '#programme' }, ink: 'yellow', shape: 'rect' },
        { tag: 'After dark', title: 'Night market', text: 'Zines, prints and street food.', link: { label: 'Map', href: '#programme' }, ink: 'blue', shape: 'circle' },
        { tag: 'Free', title: 'Fringe', text: 'Open-air demos anyone can join, no pass needed.', link: { label: 'Fringe list', href: '#programme' }, ink: 'paper', shape: 'rect' },
        { tag: 'Quiet', title: 'Reading room', text: 'A library of web history, with tea.', link: { label: 'Visit', href: '#faq' }, ink: 'ink', shape: 'pill' },
        { tag: 'Kids', title: 'Junior lab', text: 'Build a web page in an afternoon.', link: { label: 'Sign up', href: '#passes' }, ink: 'paper', shape: 'circle' },
      ],
    },
    {
      type: 'programme',
      id: 'programme',
      eyebrow: '02 · Programme',
      title: 'The timetable, under a loupe',
      intro: 'Move the pointer over the timetable or Tab through it. The loupe follows you. Add any session to your calendar.',
      days: [
        {
          label: 'Mon',
          date: '2027-06-14',
          sessions: [
            { time: '09:30', minutes: 30, title: 'Doors, coffee, badges', speaker: 'The Plaza crew', room: 'Arcade' },
            { time: '10:00', minutes: 45, title: 'The street is the interface', speaker: 'Ada Rios', room: 'Main stage' },
            { time: '11:00', minutes: 45, title: 'Type that survives the sun', speaker: 'Mira Castellanos', room: 'Main stage' },
            { time: '13:30', minutes: 180, title: 'Workshop: layout without breakpoints', speaker: 'Jun Okafor', room: 'Room 2' },
            { time: '16:30', minutes: 45, title: 'Accessible by accident, accessible on purpose', speaker: 'Priya Anand', room: 'Main stage' },
            { time: '19:00', minutes: 240, title: 'Night market opens', speaker: 'Thirty stalls', room: 'The plaza' },
          ],
        },
        {
          label: 'Tue',
          date: '2027-06-15',
          sessions: [
            { time: '10:00', minutes: 45, title: 'Canvas, but make it readable', speaker: 'Tomás Weil', room: 'Main stage' },
            { time: '11:00', minutes: 45, title: 'Motion with manners', speaker: 'Noor Saleh', room: 'Main stage' },
            { time: '13:30', minutes: 180, title: 'Workshop: shaders for designers', speaker: 'Lev Haddad', room: 'Room 1' },
            { time: '15:00', minutes: 60, title: 'Panel: who owns the pixels?', speaker: 'Rios, Weil, Saleh', room: 'Arcade' },
            { time: '17:00', minutes: 45, title: 'Small sites, long lives', speaker: 'Ines Barata', room: 'Main stage' },
            { time: '21:00', minutes: 120, title: 'Open-air screening', speaker: 'Plaza film club', room: 'The plaza' },
          ],
        },
        {
          label: 'Wed',
          date: '2027-06-16',
          sessions: [
            { time: '10:00', minutes: 45, title: 'Forms people finish', speaker: 'Priya Anand', room: 'Main stage' },
            { time: '11:00', minutes: 45, title: 'A brief history of the hyperlink', speaker: 'Ines Barata', room: 'Reading room' },
            { time: '13:30', minutes: 180, title: 'Workshop: the 3D web, gently', speaker: 'Lev Haddad', room: 'Room 2' },
            { time: '16:00', minutes: 45, title: 'Workers, threads and patience', speaker: 'Jun Okafor', room: 'Main stage' },
            { time: '17:00', minutes: 45, title: 'Closing words', speaker: 'Ada Rios', room: 'Main stage' },
            { time: '19:00', minutes: 300, title: 'Block party', speaker: 'Everyone', room: 'The plaza' },
          ],
        },
      ],
    },
    {
      type: 'app',
      id: 'app',
      eyebrow: '03 · In your pocket',
      title: 'The programme, folded into a phone',
      intro: 'The phone is a canvas inside a canvas. Its screen is live HTML: star sessions, scroll the list, watch the clock tick.',
      points: ['Works offline once loaded', 'Your starred sessions stay on your device', 'Large-text and high-contrast friendly'],
      appName: 'Plaza',
      sessions: [
        { time: '10:00', title: 'The street is the interface', room: 'Main stage' },
        { time: '11:00', title: 'Type that survives the sun', room: 'Main stage' },
        { time: '13:30', title: 'Layout without breakpoints', room: 'Room 2' },
        { time: '15:00', title: 'Who owns the pixels?', room: 'Arcade' },
        { time: '16:30', title: 'Accessible on purpose', room: 'Main stage' },
        { time: '19:00', title: 'Night market opens', room: 'The plaza' },
        { time: '21:00', title: 'Open-air screening', room: 'The plaza' },
      ],
      store: { label: 'Open the web app', href: '#app' },
    },
    {
      type: 'voices',
      id: 'voices',
      eyebrow: '04 · Voices',
      title: 'Heard on the plaza',
      quotes: [
        { text: 'The best interfaces feel like public space: you can wander in, and nobody asks for your ticket at the door.', name: 'Ada Rios', role: 'Opening keynote', ink: 'red' },
        { text: 'Canvas used to mean giving up text. Now the text comes with it: selectable, translatable, readable.', name: 'Tomás Weil', role: 'Graphics engineer', ink: 'blue' },
        { text: 'Accessibility isn’t a layer you add on top. It’s the floor everyone else is standing on.', name: 'Priya Anand', role: 'Accessibility lead', ink: 'yellow' },
        { text: 'Move things only when it helps someone understand. Then let them stop it.', name: 'Noor Saleh', role: 'Motion designer', ink: 'paper' },
      ],
    },
    {
      type: 'passes',
      id: 'passes',
      eyebrow: '05 · Passes',
      title: 'One day, or the whole week?',
      intro: 'Drag the divider, or use the slider, to compare line by line. Only the half you can see is clickable.',
      plans: [
        {
          name: 'Day pass',
          price: '€90',
          per: 'per day',
          blurb: 'Pick the day that suits you.',
          rows: [
            { label: 'Access', value: '1 day' },
            { label: 'Talks', value: 'All that day' },
            { label: 'Workshops', value: 'Waitlist' },
            { label: 'Night market', value: 'Included' },
            { label: 'Recordings', value: '—' },
          ],
          cta: { label: 'Buy a day pass', href: '#badge' },
          ink: 'yellow',
        },
        {
          name: 'Week pass',
          price: '€340',
          per: 'all five days',
          blurb: 'Everything, every day.',
          rows: [
            { label: 'Access', value: '5 days' },
            { label: 'Talks', value: 'All forty' },
            { label: 'Workshops', value: 'Two seats' },
            { label: 'Night market', value: 'Included' },
            { label: 'Recordings', value: 'Lifetime' },
          ],
          cta: { label: 'Buy a week pass', href: '#badge' },
          ink: 'blue',
        },
      ],
    },
    {
      type: 'badge',
      id: 'badge',
      eyebrow: '06 · Your badge',
      title: 'Print your own badge',
      intro: 'Type your name and the badge updates live. Then download it as a PNG: the canvas is never tainted, so export just works.',
      defaultName: 'Your Name',
      foot: '14–18 June · Lisbon',
      roles: ['Attendee', 'Speaker', 'Volunteer', 'Press'],
      inks: ['red', 'blue', 'yellow', 'ink'],
    },
    {
      type: 'hood',
      id: 'under-the-hood',
      eyebrow: '07 · Under the hood',
      title: 'Every HTML-in-Canvas feature on this page',
      intro: 'Each row is a feature of the WICG HTML-in-Canvas API, what it does here, and whether your browser supports it right now.',
    },
    {
      type: 'faq',
      id: 'faq',
      title: 'Questions',
      items: [
        { q: 'Is Plaza Week real?', a: 'No. It is demo content for Kiosk, a website template. Change it all in one file: src/site.config.ts.' },
        { q: 'Why is everything a poster?', a: 'Each poster is real HTML drawn into a canvas with the HTML-in-Canvas API. You can select the text, Tab to the links and use a screen reader, even when the poster is tilted in 3D.' },
        { q: 'What if my browser does not support it?', a: 'Then you get the same content as ordinary HTML, styled to match. HTML-in-Canvas shipped in Chrome 157.' },
        { q: 'Can I turn the motion off?', a: 'Yes. Use the Motion switch at the top. It also follows your system’s reduced-motion setting.' },
      ],
    },
  ],

  footer: {
    note: 'Kiosk is an open template built on the WICG HTML-in-Canvas proposal. Plaza Week is fictional.',
    links: [
      { label: 'HTML-in-Canvas explainer', href: 'https://github.com/WICG/html-in-canvas' },
      { label: 'Chrome docs', href: 'https://developer.chrome.com/docs/web-platform/html-in-canvas' },
      { label: 'Back to top', href: '#top' },
    ],
  },
};
