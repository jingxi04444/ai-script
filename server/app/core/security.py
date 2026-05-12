from app.core.config import get_settings


def make_token(scope: str, user_id: str) -> str:
    return f"{scope}:{user_id}"


def parse_token(authorization: str | None) -> tuple[str, str] | None:
    if not authorization:
        return None
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        return None
    token = authorization.removeprefix(prefix)
    parts = token.split(":", 1)
    if len(parts) != 2:
        return None
    return parts[0], parts[1]


def verify_password(password: str | None, password_hash: str | None) -> bool:
    if not password:
        return False
    settings = get_settings()
    if password_hash and "replace-me" in password_hash:
        return password == settings.dev_password
    # MVP fallback until real password hashing is introduced.
    return password == settings.dev_password
