"""update permission timestamps

Revision ID: 003
Revises: 001
Create Date: 2024-04-30 22:10:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = "003"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    # Update created_at to be not null with default
    op.alter_column(
        "permissions",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Update updated_at to be not null with default
    op.alter_column(
        "permissions",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


def downgrade():
    # Make columns nullable and remove defaults
    op.alter_column(
        "permissions",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
        server_default=None,
    )

    op.alter_column(
        "permissions",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
        server_default=None,
    )
