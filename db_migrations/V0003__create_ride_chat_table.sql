CREATE TABLE IF NOT EXISTS ride_chat (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(200) NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ride_chat_order_id ON ride_chat(order_id);