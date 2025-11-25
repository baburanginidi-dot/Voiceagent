
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name VARCHAR(255),
    phone_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active', -- Active, Completed, Dropped
    stage_reached INTEGER DEFAULT 1,
    summary TEXT,
    transcript JSONB, -- Storing array of transcript items
    payment_method VARCHAR(50),
    duration VARCHAR(50),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL, -- Flexible storage for complex config like stages
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial admin (password: admin123) - In real app, hash this!
-- Seed initial admin (password: admin123)
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$10$cLoqr0nR8FfxN5yz48bRSORWaTSQdXaypmx6H2TVQoo.T/TGhUF5G')
ON CONFLICT (username) DO NOTHING;
