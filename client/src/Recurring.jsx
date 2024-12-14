import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import SubscriptionButton from './SubscriptionButton';

const App = () => {
	return (
		<PayPalScriptProvider
			options={{
				'client-id':
					'ASZBbc7xPTjacTWTe36tOVnxzdN1OG-dIswHhea_UGnpWSm2gVx41786OFNtrZ1DYu-ANvh5VvaG5E5e',
				intent: 'subscription', // Specify subscription flow
				vault: true, // Enable the vault for recurring payments
			}}
		>
			<div>
				<h1>PayPal Recurring Payments</h1>
				<SubscriptionButton />
			</div>
		</PayPalScriptProvider>
	);
};

export default App;
