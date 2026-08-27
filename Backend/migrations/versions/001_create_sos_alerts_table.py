"""Create sos_alerts table with PostGIS and UUID support

Revision ID: 001_create_sos_alerts
Revises: 
Create Date: 2026-08-27 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers, used by Alembic.
revision = '001_create_sos_alerts'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Enable PostgreSQL Extensions (PostGIS for GIS geospatial queries & uuid-ossp for UUID generation)
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis";')

    # 2. Create PostgreSQL ENUM type for SOS alert status
    sos_status_enum = postgresql.ENUM('active', 'resolved', 'cancelled', name='sos_status_enum', create_type=False)
    sos_status_enum.create(op.get_bind(), checkfirst=True)

    # 3. Create 'sos_alerts' Table
    op.create_table(
        'sos_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('battery_percent', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('status', sos_status_enum, nullable=False, server_default='active'),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 4. Create Indexes for High Performance Queries
    op.create_index('idx_sos_alerts_user_id', 'sos_alerts', ['user_id'])
    op.create_index('idx_sos_alerts_status', 'sos_alerts', ['status'])
    op.create_index('idx_sos_alerts_triggered_at', 'sos_alerts', ['triggered_at'])

    # 5. Create PostGIS Spatial Point Column & GIST Spatial Index for Geolocation Queries
    op.execute("""
        ALTER TABLE sos_alerts 
        ADD COLUMN location_geometry geometry(Point, 4326) 
        GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;
    """)
    op.execute("CREATE INDEX idx_sos_alerts_location_gist ON sos_alerts USING GIST (location_geometry);")


def downgrade() -> None:
    # 1. Drop Indexes
    op.drop_index('idx_sos_alerts_location_gist', table_name='sos_alerts')
    op.drop_index('idx_sos_alerts_triggered_at', table_name='sos_alerts')
    op.drop_index('idx_sos_alerts_status', table_name='sos_alerts')
    op.drop_index('idx_sos_alerts_user_id', table_name='sos_alerts')

    # 2. Drop Table
    op.drop_table('sos_alerts')

    # 3. Drop Enum Type
    sos_status_enum = postgresql.ENUM('active', 'resolved', 'cancelled', name='sos_status_enum')
    sos_status_enum.drop(op.get_bind(), checkfirst=True)
