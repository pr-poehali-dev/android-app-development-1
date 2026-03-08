CREATE TABLE IF NOT EXISTS driver_chat (
    id SERIAL PRIMARY KEY,
    driver_id VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);