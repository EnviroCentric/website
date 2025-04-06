from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.pages import Page, PageWithRoles, PageRolesUpdate
from repositories.pages import PagesRepository
from repositories.roles import RolesRepository
from routers.roles import require_admin

router = APIRouter()


def get_pages_repo():
    return PagesRepository()


def get_roles_repo():
    return RolesRepository()


@router.get("/pages", response_model=List[Page])
async def get_all_pages(
    pages_repo: PagesRepository = Depends(get_pages_repo),
    _: dict = Depends(require_admin()),
):
    """Get all pages (admin only)"""
    return pages_repo.get_all_pages()


@router.get("/pages/{page_id}", response_model=Page)
async def get_page(
    page_id: int,
    pages_repo: PagesRepository = Depends(get_pages_repo),
    _: dict = Depends(require_admin()),
):
    """Get a specific page (admin only)"""
    page = pages_repo.get_page(page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page with ID {page_id} not found",
        )
    return page


@router.get("/pages/{page_id}/roles", response_model=PageWithRoles)
async def get_page_roles(
    page_id: int,
    pages_repo: PagesRepository = Depends(get_pages_repo),
    _: dict = Depends(require_admin()),
):
    """Get roles for a specific page (admin only)"""
    page_with_roles = pages_repo.get_page_with_roles(page_id)
    if not page_with_roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page with ID {page_id} not found",
        )
    return page_with_roles


@router.put("/pages/{page_id}/roles", response_model=PageWithRoles)
async def update_page_roles(
    page_id: int,
    update_data: PageRolesUpdate,
    pages_repo: PagesRepository = Depends(get_pages_repo),
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin()),
):
    """Update roles for a specific page (admin only)"""
    # Verify the page exists
    page = pages_repo.get_page(page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page with ID {page_id} not found",
        )

    # Verify all roles exist
    for role_id in update_data.role_ids:
        role = roles_repo.get_role_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with ID {role_id} not found",
            )

    # Update the page roles
    if not pages_repo.update_page_roles(page_id, update_data.role_ids):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update page roles",
        )

    return pages_repo.get_page_with_roles(page_id)
