/* eslint-disable no-unused-vars */
import { PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';

const SubscriptionButton = () => {
	const handleCreateSubscription = async (data, actions) => {
		let planId;
		try {
			const response = await axios.post(
				'http://localhost:3000/create-plan',
				{}
			);
			console.log(response.data);
			planId = response.data.planId;
		} catch (error) {
			console.error(
				'Error authorizing payment:',
				error.response?.data || error.message
			);
		}
		return actions.subscription.create({
			plan_id: planId, // Replace with your subscription plan ID
		});
	};

	const handleApprove = (data, actions) => {
		console.log('Subscription approved:', data.subscriptionID);
		alert(`Subscription successful! ID: ${data.subscriptionID}`);
	};

	const handleError = (err) => {
		console.error('Subscription error:', err);
		alert('An error occurred while processing the subscription.');
	};

	return (
		<div>
			<h2>Subscribe to Our Plan</h2>
			<PayPalButtons
				style={{ layout: 'vertical' }}
				createSubscription={handleCreateSubscription}
				onApprove={handleApprove}
				onError={handleError}
			/>
		</div>
	);
};

export default SubscriptionButton;
