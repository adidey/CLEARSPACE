import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {clearspaceBackend, isTauriRuntime} from './services/backend.ts';

createRoot(document.getElementById('root')!).render(<App />);

if (isTauriRuntime()) {
  void clearspaceBackend.greet('CLEARSPACE').then((message) => {
    console.info(message);
  });
}
