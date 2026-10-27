import pkg from 'fedapay';

const { FedaPay, Transaction, Webhook } = pkg;

FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY || '');
FedaPay.setEnvironment(process.env.FEDAPAY_ENVIRONMENT || 'sandbox');

export { Transaction, Webhook };
