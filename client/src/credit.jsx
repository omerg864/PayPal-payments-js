import { useState } from 'react';
import axios from 'axios';

const StoreCardForm = () => {
	const [cardDetails, setCardDetails] = useState({
		cardholder_name: '',
		number: '',
		type: 'visa', // Default card type
		expire_month: '',
		expire_year: '',
		cvv: '',
		billing_address: {
			line1: '',
			city: '',
			state: '',
			postal_code: '',
			country_code: 'US', // Default country
		},
	});

	const [cardId, setCardId] = useState('');
	const [authorizationId, setAuthorizationId] = useState('');
	const [amount, setAmount] = useState('10.00');
	const [currency, setCurrency] = useState('USD');

	const [message, setMessage] = useState('');

	const handleInputChange = (e) => {
		const { name, value } = e.target;

		if (name.includes('billing_address')) {
			const key = name.split('.')[1];
			setCardDetails((prev) => ({
				...prev,
				billing_address: { ...prev.billing_address, [key]: value },
			}));
		} else {
			setCardDetails((prev) => ({ ...prev, [name]: value }));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const response = await axios.post(
				'http://localhost:3000/store-card',
				cardDetails
			);
			setCardId(response.data.id);
			setMessage(
				`Card stored successfully! Card ID: ${response.data.id}`
			);
		} catch (error) {
			console.error(
				'Error storing card:',
				error.response?.data || error.message
			);
			setMessage('Failed to store card. Please try again.');
		}
	};

	const authorizeWithCard = async () => {
		try {
			const response = await axios.post(
				'http://localhost:3000/authorize-card',
				{
					...cardDetails,
					amount,
					currency,
				}
			);
			console.log(response.data);
			setMessage('Payment authorized successfully.');
		} catch (error) {
			console.error(
				'Error authorizing payment:',
				error.response?.data || error.message
			);
			setMessage('Failed to authorize payment.');
		}
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
			setMessage(`Payment captured successfully: ${response.data.id}`);
		} catch (error) {
			console.error(
				'Error capturing payment:',
				error.response?.data || error.message
			);
			setMessage('Failed to capture payment.');
		}
	};

	// Release Authorization
	const releaseAuthorization = async () => {
		try {
			const response = await axios.delete(
				`http://localhost:3000/void-authorization/${authorizationId}`
			);

			console.log(response.data);
			setMessage('Authorization released successfully.');
		} catch (error) {
			console.error(
				'Error releasing authorization:',
				error.response?.data || error.message
			);
			setMessage('Failed to release authorization.');
		}
	};

	const authorizationDetails = async () => {
		try {
			const response = await axios.get(
				`http://localhost:3000/authorization/${authorizationId}`
			);
			setMessage(
				`Authorization details: ${JSON.stringify(response.data)}`
			);
		} catch (error) {
			console.error(
				'Error fetching authorization details:',
				error.response?.data || error.message
			);
			setMessage('Failed to fetch authorization details.');
		}
	};

	const handleAuthorize = async () => {
		try {
			const response = await axios.post(
				'http://localhost:3000/authorize-card',
				{
					cardId,
					amount,
					currency,
				}
			);
			console.log(response.data);
			setAuthorizationId(response.data.id);
			setMessage('Payment authorized successfully.');
		} catch (error) {
			console.error(
				'Error authorizing payment:',
				error.response?.data || error.message
			);
			setMessage('Failed to authorize payment.');
		}
	};

	return (
		<div>
			<h1>Store Credit Card</h1>
			<form onSubmit={handleSubmit}>
				<div>
					<label>Cardholder Name:</label>
					<input
						type="text"
						name="cardholder_name"
						placeholder="John Doe"
						value={cardDetails.cardholder_name}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>Card Number:</label>
					<input
						type="text"
						name="number"
						placeholder="4111111111111111"
						value={cardDetails.number}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>Card Type:</label>
					<select
						name="type"
						value={cardDetails.type}
						onChange={handleInputChange}
					>
						<option value="visa">Visa</option>
						<option value="mastercard">MasterCard</option>
						<option value="amex">American Express</option>
					</select>
				</div>
				<div>
					<label>Expiry Month:</label>
					<input
						type="text"
						name="expire_month"
						placeholder="MM"
						value={cardDetails.expire_month}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>Expiry Year:</label>
					<input
						type="text"
						name="expire_year"
						placeholder="YYYY"
						value={cardDetails.expire_year}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>CVV:</label>
					<input
						type="text"
						name="cvv"
						placeholder="123"
						value={cardDetails.cvv}
						onChange={handleInputChange}
						required
					/>
				</div>
				<h3>Billing Address</h3>
				<div>
					<label>Address Line 1:</label>
					<input
						type="text"
						name="billing_address.line1"
						placeholder="123 Main Street"
						value={cardDetails.billing_address.line1}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>City:</label>
					<input
						type="text"
						name="billing_address.city"
						placeholder="San Jose"
						value={cardDetails.billing_address.city}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>State:</label>
					<input
						type="text"
						name="billing_address.state"
						placeholder="CA"
						value={cardDetails.billing_address.state}
						onChange={handleInputChange}
						required
					/>
				</div>
				<div>
					<label>Postal Code:</label>
					<input
						type="text"
						name="billing_address.postal_code"
						placeholder="95131"
						value={cardDetails.billing_address.postal_code}
						onChange={handleInputChange}
						required
					/>
				</div>
				<button type="submit">Store Card</button>
			</form>
			<button onClick={authorizeWithCard}>
				Authorize Payment with card
			</button>
			<div>
				<h1>PayPal Vault Actions</h1>
				<div>
					<label>Amount:</label>
					<input
						type="text"
						placeholder="Enter amount"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</div>
				<div>
					<label>Currency:</label>
					<input
						type="text"
						placeholder="Enter currency (e.g., USD)"
						value={currency}
						onChange={(e) => setCurrency(e.target.value)}
					/>
				</div>
				<button onClick={handleAuthorize}>Authorize Payment</button>

				{authorizationId && (
					<div>
						<h3>Authorization ID: {authorizationId}</h3>
						<button onClick={capturePayment}>
							Capture Payment
						</button>
						<button onClick={releaseAuthorization}>
							Release Authorization
						</button>
						<button onClick={authorizationDetails}>
							Authorization Details
						</button>
					</div>
				)}
			</div>
			{message && <p>{message}</p>}
		</div>
	);
};

export default StoreCardForm;
