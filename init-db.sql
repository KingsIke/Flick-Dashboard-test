CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    businessId VARCHAR(255) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL UNIQUE,
    account_type VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    wallet_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    balances JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eventname VARCHAR(255) NOT NULL,
    transtype VARCHAR(50) NOT NULL,
    total_amount NUMERIC NOT NULL,
    settled_amount NUMERIC NOT NULL,
    fee_charged NUMERIC NOT NULL,
    currency_settled VARCHAR(3) NOT NULL,
    dated TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    initiator VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    transactionid VARCHAR(255) NOT NULL UNIQUE,
    narration TEXT,
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    channel VARCHAR(50),
    beneficiary_bank VARCHAR(255),
    email VARCHAR(255),
    walletId UUID REFERENCES wallets(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name VARCHAR(255),
    account_no VARCHAR(50),
    sort_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id),
    action VARCHAR(255) NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE accounts ADD CONSTRAINT fk_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id);
ALTER TABLE accounts ADD CONSTRAINT unique_business_id UNIQUE (businessId);
ALTER TABLE accounts ADD CONSTRAINT unique_business_name UNIQUE (business_name);