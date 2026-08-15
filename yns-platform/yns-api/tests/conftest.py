"""Shared pytest setup.

``app.config`` reads the environment at import time and ``app.database`` refuses
to import without DATABASE_URL, so these defaults have to be in place before any
``app.*`` module is imported. Nothing here opens a connection — SQLAlchemy
creates the engine lazily and every test that touches the database overrides the
``get_db`` dependency.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
