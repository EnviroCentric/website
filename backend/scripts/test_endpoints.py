import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"


def test_register() -> Dict[str, Any]:
    url = f"{BASE_URL}/auth/register"
    data = {
        "email": "test@example.com",
        "password": "TestPass123!@#",
        "password_confirm": "TestPass123!@#",
        "first_name": "Test",
        "last_name": "User",
    }
    response = requests.post(url, json=data)
    return response.json()


def test_login() -> Dict[str, Any]:
    url = f"{BASE_URL}/auth/login"
    data = {"username": "test@example.com", "password": "TestPass123!@#"}
    response = requests.post(url, data=data)
    return response.json()


def test_refresh_token(refresh_token: str) -> Dict[str, Any]:
    url = f"{BASE_URL}/auth/refresh-token"
    headers = {"Authorization": f"Bearer {refresh_token}"}
    response = requests.post(url, headers=headers)
    return response.json()


def main():
    print("Testing Registration Endpoint...")
    register_response = test_register()
    print("Registration Response:", json.dumps(register_response, indent=2))

    print("\nTesting Login Endpoint...")
    login_response = test_login()
    print("Login Response:", json.dumps(login_response, indent=2))

    print("\nTesting Refresh Token Endpoint...")
    refresh_response = test_refresh_token(login_response["refresh_token"])
    print("Refresh Token Response:", json.dumps(refresh_response, indent=2))


if __name__ == "__main__":
    main()
