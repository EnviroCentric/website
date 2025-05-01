"""update description columns to text type

Revision ID: 2024_04_30_001
Revises: 2024_04_29_001
Create Date: 2024-04-30 20:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "2024_04_30_001"
down_revision: str = "2024_04_29_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update roles description column
    op.alter_column(
        "roles",
        "description",
        existing_type=sa.String(),
        type_=sa.Text(),
        existing_nullable=True,
    )

    # Update permissions description column
    op.alter_column(
        "permissions",
        "description",
        existing_type=sa.String(),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Revert roles description column
    op.alter_column(
        "roles",
        "description",
        existing_type=sa.Text(),
        type_=sa.String(),
        existing_nullable=True,
    )

    # Revert permissions description column
    op.alter_column(
        "permissions",
        "description",
        existing_type=sa.Text(),
        type_=sa.String(),
        existing_nullable=True,
    )
