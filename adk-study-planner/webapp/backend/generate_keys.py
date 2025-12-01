# Generate secure keys for production
import secrets
from cryptography.fernet import Fernet

print("Add these to your .env file:")
print(f"SECRET_KEY={secrets.token_urlsafe(32)}")
print(f"ENCRYPTION_KEY={Fernet.generate_key().decode()}")
