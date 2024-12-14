import express from 'express';
import dotenv from 'dotenv';
import colors from 'colors';
import path from 'path';
import { errorHandler } from './middleware/errorMiddleware.js';
import { connectDB } from './config/db.js';
const config = dotenv.config();
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import cors from 'cors';
import braintree from 'braintree';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(cors());

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'; // Sandbox base URL
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Get PayPal Access Token
async function getAccessToken() {
	const response = await axios.post(
		`${PAYPAL_API_BASE}/v1/oauth2/token`,
		'grant_type=client_credentials',
		{
			auth: {
				username: PAYPAL_CLIENT_ID,
				password: PAYPAL_CLIENT_SECRET,
			},
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		}
	);
	return response.data.access_token;
}

// Authorize Payment with Credit Card in One Step
app.post('/authorize', async (req, res) => {
	const {
		cardNumber,
		cardType,
		expireMonth,
		expireYear,
		cvv,
		amount,
		currency,
	} = req.body;

	try {
		const accessToken = await getAccessToken();

		// Step 1: Create the Order
		const createOrderResponse = await axios.post(
			`${PAYPAL_API_BASE}/v2/checkout/orders`,
			{
				intent: 'AUTHORIZE', // Set intent to AUTHORIZE
				purchase_units: [
					{
						amount: {
							currency_code: currency || 'USD',
							value: amount || '10.00', // Example amount
						},
					},
				],
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'PayPal-Request-Id': `REQ-${Date.now()}`, // Unique request ID for idempotency
				},
			}
		);

		const orderId = createOrderResponse.data.id;

		// Step 2: Authorize Payment with Credit Card
		const authorizeResponse = await axios.post(
			`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/authorize`,
			{
				payment_source: {
					card: {
						number: cardNumber,
						type: cardType, // e.g., "VISA", "MASTERCARD"
						expiry: `${expireYear}-${expireMonth}`,
						security_code: cvv,
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			}
		);

		// Extract Authorization Details
		const authorization =
			authorizeResponse.data.purchase_units[0].payments.authorizations[0];

		res.json({
			orderId,
			authorizationId: authorization.id,
			status: authorization.status,
		});
	} catch (error) {
		console.error(
			'Error authorizing payment with credit card:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to authorize payment' });
	}
});

app.get('/authorization/:authorizationId', async (req, res) => {
	const { authorizationId } = req.params;

	try {
		const accessToken = await getAccessToken();

		const response = await axios.get(
			`${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		console.log(response.data);

		res.json(response.data); // Return the authorization details
	} catch (error) {
		console.error(
			'Error fetching authorization details:',
			error.response?.data || error.message
		);
		res.status(500).send({
			error: 'Failed to fetch authorization details',
		});
	}
});

// Endpoint to void an authorization
app.delete('/void-authorization/:authorizationId', async (req, res) => {
	const { authorizationId } = req.params;

	try {
		const accessToken = await getAccessToken();

		const response = await axios.post(
			`${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/void`,
			{},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		console.log(response);

		if (response.status === 204) {
			res.json({ message: 'Authorization voided successfully' });
		}
	} catch (error) {
		console.error(
			'Error voiding authorization:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to void authorization' });
	}
});

// Endpoint to void an authorization
app.get('/reauthorize/:authorizationId', async (req, res) => {
	const { authorizationId } = req.params;

	try {
		const accessToken = await getAccessToken();

		const response = await axios.post(
			`${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/reauthorize`,
			{},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		console.log(response);

		if (response.status === 204) {
			res.json({ message: 'Authorization voided successfully' });
		}
	} catch (error) {
		console.error(
			'Error reauthorization:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to void authorization' });
	}
});

app.post('/capture-payment', async (req, res) => {
	const { authorizationId, captureAmount } = req.body;

	if (!authorizationId || !captureAmount) {
		return res.status(400).send({
			error: "Invalid request: 'authorizationId' and 'captureAmount' are required.",
		});
	}

	try {
		const accessToken = await getAccessToken();

		const response = await axios.post(
			`${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/capture`,
			{
				amount: {
					currency_code: 'USD',
					value: captureAmount, // Ensure this is a valid non-null value
				},
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			}
		);

		res.json(response.data); // Return capture details
	} catch (error) {
		console.error(
			'Error capturing payment:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to capture payment' });
	}
});

// Route to store a credit card in PayPal Vault
app.post('/store-card', async (req, res) => {
	const { number, type, expire_month, expire_year, billing_address } =
		req.body;

	try {
		const accessToken = await getAccessToken();

		const response = await axios.post(
			`${PAYPAL_API_BASE}/v1/vault/credit-cards`,
			{
				number,
				type,
				expire_month,
				expire_year,
				billing_address,
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			}
		);

		res.json(response.data); // Return the stored card details
	} catch (error) {
		console.error(
			'Error storing card:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to store card' });
	}
});

//! TODO: Fix this route
app.post('/authorize-card', async (req, res) => {
	const {
		number,
		type,
		name,
		security_code,
		expire_month,
		expire_year,
		billing_address,
		amount,
		currency,
	} = req.body;

	try {
		const accessToken = await getAccessToken();

		const response = await axios.post(
			`${PAYPAL_API_BASE}/v2/checkout/orders`,
			{
				intent: 'AUTHORIZE', // Set the intent to 'AUTHORIZE'
				purchase_units: [
					{
						amount: {
							currency_code: currency,
							value: amount,
						},
					},
				],
				payment_source: {
					card: {
						name,
						security_code,
						number,
						expiry: `${expire_year}-${expire_month}`,
						billing_address,
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'PayPal-Request-Id': uuidv4(),
				},
			}
		);

		console.log(response.data);

		res.json(response.data); // Return the order details with authorization info
	} catch (error) {
		console.error(
			'Error authorizing payment:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to authorize payment' });
	}
});

//! TODO: Fix this route
app.post('/authorize-card-token', async (req, res) => {
	const { cardId, amount, currency } = req.body;

	console.log(cardId);

	try {
		const accessToken = await getAccessToken();

		const response = await axios.post(
			`${PAYPAL_API_BASE}/v2/checkout/orders`,
			{
				intent: 'AUTHORIZE', // Set the intent to 'AUTHORIZE'
				purchase_units: [
					{
						amount: {
							currency_code: currency,
							value: amount,
						},
					},
				],
				payment_source: {
					card: {
						vault_id: cardId,
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'PayPal-Request-Id': uuidv4(),
				},
			}
		);

		console.log(response.data);

		res.json(response.data); // Return the order details with authorization info
	} catch (error) {
		console.error(
			'Error authorizing payment:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to authorize payment' });
	}
});

// Create Product
const createProduct = async () => {
	const accessToken = await getAccessToken();
	const response = await axios.post(
		`${PAYPAL_API_BASE}/v1/catalogs/products`,
		{
			name: 'Pro Membership',
			description: 'Monthly membership for Pro features',
			type: 'SERVICE',
			category: 'SOFTWARE',
		},
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		}
	);
	return response.data.id; // Product ID
};

// Create Plan
const createPlan = async (productId) => {
	const accessToken = await getAccessToken();
	const response = await axios.post(
		`${PAYPAL_API_BASE}/v1/billing/plans`,
		{
			product_id: productId,
			name: 'Monthly Pro Plan',
			description: 'Access Pro features for $10/month',
			billing_cycles: [
				{
					frequency: {
						interval_unit: 'MONTH',
						interval_count: 1,
					},
					tenure_type: 'REGULAR',
					sequence: 1,
					total_cycles: 0,
					pricing_scheme: {
						fixed_price: {
							value: '10.00',
							currency_code: 'USD',
						},
					},
				},
			],
			payment_preferences: {
				auto_bill_outstanding: true,
				setup_fee: {
					value: '0.00',
					currency_code: 'USD',
				},
				setup_fee_failure_action: 'CONTINUE',
				payment_failure_threshold: 3,
			},
		},
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		}
	);
	return response.data.id; // Plan ID
};

// Create Subscription
app.post('/create-plan', async (req, res) => {
	try {
		const productId = await createProduct();
		const planId = await createPlan(productId);

		res.json({ productId, planId });
	} catch (error) {
		console.error(
			'Error creating plan:',
			error.response?.data || error.message
		);
		res.status(500).send({ error: 'Failed to create plan' });
	}
});

// braintree

const gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Sandbox,
	merchantId: process.env.BRAINTREE_MERCHANT_ID,
	publicKey: process.env.BRAINTREE_PUBLIC_KEY,
	privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

app.get('/get-client-token', async (req, res) => {
	try {
		const { clientToken } = await gateway.clientToken.generate({});
		res.send(clientToken);
	} catch (error) {
		console.error('Error generating client token:', error);
		res.status(500).send({ error: 'Failed to generate client token' });
	}
});

app.post('/validate-merchant', async (req, res) => {
	const { validationURL } = req.body;

	try {
		const response = await gateway.applePay.performValidation({
			validationUrl: validationURL,
			domainName: 'securent.com',
			displayName: 'SecuRent',
		});

		res.send(response);
	} catch (error) {
		console.error('Error validating merchant:', error);
		res.status(500).send({ error: 'Failed to validate merchant' });
	}
});

app.post('/process-payment', async (req, res) => {
	const { paymentToken } = req.body;

	try {
		const result = await gateway.transaction.sale({
			amount: '10.00', // Amount should match what was shown to the customer
			paymentMethodNonce: paymentToken,
			options: {
				submitForSettlement: true, // Set to false if you want to authorize only
			},
		});

		if (result.success) {
			res.send({ transactionId: result.transaction.id });
		} else {
			res.status(500).send({ error: result.message });
		}
	} catch (error) {
		console.error('Error processing payment:', error);
		res.status(500).send({ error: 'Failed to process payment' });
	}
});

// app.use('/api/name', name); use the route

app.use(errorHandler);
