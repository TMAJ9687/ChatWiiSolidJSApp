/* @refresh reload */
import { render } from 'solid-js/web';
import { MetaProvider } from '@solidjs/meta';

import './index.css';
import App from './App';
import { errorSuppression, NetworkErrorSuppression } from './utils/errorSuppression';

// Initialize error suppression for production
errorSuppression.initialize();
NetworkErrorSuppression.initialize();

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => (
  <MetaProvider>
    <App />
  </MetaProvider>
), root!);
