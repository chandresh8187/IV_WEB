import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '../unit1/store/store';
import { queryClient } from '../unit1/store/queryClient';
import App from '../unit1/App';
import '../unit1/index.css';
export default function Unit1Workspace() {
  return <Provider store={store}><QueryClientProvider client={queryClient}><App /></QueryClientProvider></Provider>;
}
