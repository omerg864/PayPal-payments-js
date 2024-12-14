/* global ApplePaySession */
import { useEffect } from 'react';
import client from 'braintree-web/client';
import applePay from 'braintree-web/apple-pay';

const ApplePayButton = () => {
	useEffect(() => {
		async function setupApplePay() {
			if (!window.ApplePaySession) {
				console.warn(
					'Apple Pay is not supported on this device/browser.'
				);
				return;
			}

			const clientToken = await fetchClientToken();

			// Create Braintree Client Instance
			client.create(
				{ authorization: clientToken },
				(err, clientInstance) => {
					if (err) {
						console.error(
							'Error creating Braintree client instance:',
							err
						);
						return;
					}

					// Create Apple Pay Instance
					applePay.create(
						{ client: clientInstance },
						(err, applePayInstance) => {
							if (err) {
								console.error(
									'Error creating Apple Pay instance:',
									err
								);
								return;
							}

							const applePayRequest =
								applePayInstance.createPaymentRequest({
									total: {
										label: 'Your Store',
										amount: '10.00',
									},
									countryCode: 'US',
									currencyCode: 'USD',
									supportedNetworks: [
										'visa',
										'masterCard',
										'amex',
									],
								});

							const session = new window.ApplePaySession(
								3,
								applePayRequest
							);

							session.onvalidatemerchant = async (event) => {
								try {
									const merchantSession = await fetch(
										'http://localhost:3000/validate-merchant',
										{
											method: 'POST',
											headers: {
												'Content-Type':
													'application/json',
											},
											body: JSON.stringify({
												validationURL:
													event.validationURL,
											}),
										}
									).then((res) => res.json());

									session.completeMerchantValidation(
										merchantSession
									);
								} catch (error) {
									console.error(
										'Merchant validation failed:',
										error
									);
									session.abort();
								}
							};

							session.onpaymentauthorized = async (event) => {
								try {
									const paymentToken = event.payment.token;

									await fetch(
										'http://localhost:3000/process-payment',
										{
											method: 'POST',
											headers: {
												'Content-Type':
													'application/json',
											},
											body: JSON.stringify({
												paymentToken,
											}),
										}
									);

									session.completePayment(
										ApplePaySession.STATUS_SUCCESS
									);
								} catch (error) {
									console.error('Payment failed:', error);
									session.completePayment(
										ApplePaySession.STATUS_FAILURE
									);
								}
							};

							document
								.getElementById('apple-pay-button')
								?.addEventListener('click', () => {
									if (session) {
										session.begin();
									} else {
										console.error(
											'Apple Pay session could not be started.'
										);
									}
								});
						}
					);
				}
			);
		}

		setupApplePay();
	}, []);

	const fetchClientToken = async () => {
		const response = await fetch('http://localhost:3000/get-client-token');
		return response.text();
	};

	return (
		<button
			id="apple-pay-button"
			style={{
				background: 'black',
				color: 'white',
				padding: '10px',
				borderRadius: '5px',
			}}
		>
			Pay with Apple Pay
		</button>
	);
};

export default ApplePayButton;
