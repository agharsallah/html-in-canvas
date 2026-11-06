performance.mark('drawable:module-eval');
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/600.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/600.css';
import '@fontsource/atkinson-hyperlegible-mono/400.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/signature.css';
import './styles/charts.css';
import './styles/feedback.css';
import './styles/editor.css';
import './styles/hud.css';
import './styles/print-card.css';
import './styles/print-verso.css';
import './styles/xray.css';
import './styles/hero.css';
import './styles/chapter.css';
import './styles/story.css';
import './styles/labs.css';
import './styles/overlays.css';

import { startApp } from './app/app';

void startApp();
