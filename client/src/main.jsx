import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ApplePayButton from './apple.jsx';
import Credit from './credit.jsx';
import Recurring from './Recurring.jsx';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<App />
		<ApplePayButton />
		<Credit />
    <Recurring />
	</StrictMode>
);
