import os
import webbrowser
import hashlib
import base64
import secrets
import requests
from urllib.parse import urlencode
from dotenv import load_dotenv

# === Cargar variables desde .env ===
load_dotenv("C:/ProyectosSimbolicos/.env")

CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY")
CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET")
REDIRECT_URI = os.getenv("TIKTOK_REDIRECT_URI")
SCOPES = os.getenv("TIKTOK_SCOPES")

# === Generar code_verifier y code_challenge (PKCE) ===
def generar_pkce():
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode("utf-8")
    sha256 = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    code_challenge = base64.urlsafe_b64encode(sha256).rstrip(b"=").decode("utf-8")
    return code_verifier, code_challenge

# === Construir y abrir link de autorización ===
def generar_link_oauth(code_challenge):
    params = {
        "client_key": CLIENT_KEY,
        "response_type": "code",
        "scope": SCOPES,
        "redirect_uri": REDIRECT_URI,
        "state": "remeocci_symbolic",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = "https://www.tiktok.com/v2/auth/authorize/?" + urlencode(params)
    print("\n🔗 Abriendo navegador con autorización PKCE...")
    webbrowser.open(url)
    return url

# === Intercambiar el code por el access_token ===
def intercambiar_code_por_token(code, code_verifier):
    url = "https://open.tiktokapis.com/v2/oauth/token/"
    data = {
        "client_key": CLIENT_KEY,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "code_verifier": code_verifier,
    }
    response = requests.post(url, data=data)
    print("\n📦 Respuesta simbólica:")
    print(response.json())
    return response.json()

# === Flujo principal ===
if __name__ == "__main__":
    code_verifier, code_challenge = generar_pkce()
    auth_url = generar_link_oauth(code_challenge)
    print("⚠️ Cuando autorices, copia el `code` de la URL a la que te redirige.\n")
    code = input("📥 Pega aquí el `code`: ").strip()
    intercambiar_code_por_token(code, code_verifier)
