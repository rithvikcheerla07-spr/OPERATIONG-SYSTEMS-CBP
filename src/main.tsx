import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from '../client/src/components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
