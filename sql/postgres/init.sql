CREATE SCHEMA IF NOT EXISTS canvas;

CREATE TABLE canvas.user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_canvas_user_sessions_user_id ON canvas.user_sessions(user_id);
CREATE INDEX idx_canvas_user_sessions_expires_at ON canvas.user_sessions(expires_at);

CREATE TABLE canvas.user_documents (
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    domain VARCHAR(32) NOT NULL,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, domain)
);

CREATE INDEX idx_canvas_user_documents_domain ON canvas.user_documents(domain);
