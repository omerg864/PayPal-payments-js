/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';

const PayPalAuthorizeButton = () => {
	const [authorizationId, setAuthorizationID] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [responseMessage, setResponseMessage] = useState('');

	// Function to create an order with intent: AUTHORIZE
	const createOrder = async (data, actions) => {
		return actions.order
			.create({
				intent: 'AUTHORIZE', // Specify 'AUTHORIZE' instead of 'CAPTURE'
				purchase_units: [
					{
						amount: {
							value: '10.00', // Set the amount to authorize
						},
					},
				],
			})
			.then((orderID) => {
				return orderID;
			});
	};

	// Function to authorize the order
	const onApprove = async (data, actions) => {
		return actions.order.authorize().then((authorization) => {
			const authorizedDetails =
				authorization.purchase_units[0].payments.authorizations[0];
			setAuthorizationID(authorizedDetails.id);
			setSuccessMessage(
				`Payment authorized with ID: ${authorizedDetails.id}`
			);
		});
	};

	const capturePayment = async () => {
		if (!authorizationId) {
			alert('Authorization ID and capture amount are required.');
			return;
		}

		try {
			const response = await axios.post(
				'http://localhost:3000/capture-payment',
				{
					authorizationId,
					captureAmount: '5.00', // Replace with the amount you want to capture
				}
			);
			setResponseMessage(
				`Payment captured successfully: ${response.data.id}`
			);
		} catch (error) {
			console.error(
				'Error capturing payment:',
				error.response?.data || error.message
			);
			setResponseMessage('Failed to capture payment.');
		}
	};

	// Release Authorization
	const releaseAuthorization = async () => {
		try {
			const response = await axios.delete(
				`http://localhost:3000/void-authorization/${authorizationId}`
			);
			setResponseMessage('Authorization released successfully.');
		} catch (error) {
			console.error(
				'Error releasing authorization:',
				error.response?.data || error.message
			);
			setResponseMessage('Failed to release authorization.');
		}
	};

	const authorizationDetails = async () => {
		try {
			const response = await axios.get(
				`http://localhost:3000/authorization/${authorizationId}`
			);
			setResponseMessage(
				`Authorization details: ${JSON.stringify(response.data)}`
			);
		} catch (error) {
			console.error(
				'Error fetching authorization details:',
				error.response?.data || error.message
			);
			setResponseMessage('Failed to fetch authorization details.');
		}
	};

	const reauthorizePayment = async () => {
		try {
			const response = await axios.get(
				`http://localhost:3000/reauthorize/${authorizationId}`
			);
			setResponseMessage(
				`Payment reauthorized successfully: ${response.data.id}`
			);
		} catch (error) {
			console.error(
				'Error reauthorizing payment:',
				error.response?.data || error.message
			);
			setResponseMessage('Failed to reauthorize payment.');
		}
	};

	// Handle errors
	const onError = (err) => {
		console.error('PayPal Checkout onError', err);
		setErrorMessage('Something went wrong with the transaction.');
	};

	return (
		<>
			<PayPalScriptProvider
				options={{
					'client-id':
						'ASZBbc7xPTjacTWTe36tOVnxzdN1OG-dIswHhea_UGnpWSm2gVx41786OFNtrZ1DYu-ANvh5VvaG5E5e',
					intent: 'authorize',
				}}
			>
				<div>
					<h1>Authorize Payment with PayPal</h1>
					{successMessage && (
						<p style={{ color: 'green' }}>{successMessage}</p>
					)}
					{errorMessage && (
						<p style={{ color: 'red' }}>{errorMessage}</p>
					)}
					<PayPalButtons
						createOrder={createOrder}
						onApprove={onApprove}
						onError={onError}
						style={{ layout: 'vertical' }}
					/>
				</div>
			</PayPalScriptProvider>
			<div style={{ marginTop: '20px' }}>
				{authorizationId && (
					<div>
						<button
							onClick={capturePayment}
							style={{ marginRight: '10px' }}
						>
							Capture Payment
						</button>
						<button onClick={releaseAuthorization}>
							Release Authorization
						</button>
						<button onClick={authorizationDetails}>
							Authorization Details
						</button>
						<button onClick={reauthorizePayment}>
							Reauthorize Payment
						</button>
					</div>
				)}
				{responseMessage && <p>{responseMessage}</p>}
			</div>
		</>
	);
};

export default PayPalAuthorizeButton;
