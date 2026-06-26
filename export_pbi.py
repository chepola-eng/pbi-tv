import requests
import os
import time

# ─── CONFIGURAÇÕES ───────────────────────────────────────────
TENANT_ID  = "c84da54b-b54a-4c5c-abe1-f6a8b87afa83"
CLIENT_ID  = "b5470816-3417-4208-80cc-926e7eeb3f3d"
USERNAME   = os.environ["PBI_USERNAME"]
PASSWORD   = os.environ["PBI_PASSWORD"]
REPORT_ID  = "597128d0-5d21-4c67-9aca-8bda42bb6eb9"

PAGES = [
    {"num": 1, "id": "305ed7c6846e3540717e"},
    {"num": 2, "id": "4ef203305c3a8c0e6bcb"},
    {"num": 3, "id": "ad4c9b6fcd6034d4970b"},
    {"num": 4, "id": "7c70eece6cf6b670d205"},
]

OUTPUT_DIR = "docs"
# ─────────────────────────────────────────────────────────────

def get_token():
    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    data = {
        "grant_type": "password",
        "client_id":  CLIENT_ID,
        "username":   USERNAME,
        "password":   PASSWORD,
        "scope":      "https://analysis.windows.net/powerbi/api/.default",
    }
    r = requests.post(url, data=data)
    r.raise_for_status()
    return r.json()["access_token"]


def export_page(token, page_id, page_num):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"https://api.powerbi.com/v1.0/myorg/reports/{REPORT_ID}/ExportTo"

    # 1. Iniciar exportação
    body = {
        "format": "PNG",
        "powerBIReportConfiguration": {
            "pages": [{"pageName": page_id}]
        }
    }
    r = requests.post(base, json=body, headers=headers)
    r.raise_for_status()
    export_id = r.json()["id"]
    print(f"  Página {page_num}: exportação iniciada ({export_id})")

    # 2. Aguardar conclusão (polling)
    status_url = f"https://api.powerbi.com/v1.0/myorg/reports/{REPORT_ID}/exports/{export_id}"
    for attempt in range(30):
        time.sleep(5)
        r = requests.get(status_url, headers=headers)
        r.raise_for_status()
        status = r.json().get("status")
        print(f"  Página {page_num}: status = {status} (tentativa {attempt+1})")
        if status == "Succeeded":
            break
        if status == "Failed":
            raise Exception(f"Exportação falhou na página {page_num}")
    else:
        raise Exception(f"Timeout na página {page_num}")

    # 3. Baixar PNG
    r = requests.get(f"{status_url}/file", headers=headers)
    r.raise_for_status()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"pagina{page_num}.png")
    with open(path, "wb") as f:
        f.write(r.content)
    print(f"  Página {page_num}: salva ({len(r.content)//1024} KB)")


def main():
    print("=== Iniciando exportação ===")
    token = get_token()
    print("Token obtido.")
    for page in PAGES:
        try:
            export_page(token, page["id"], page["num"])
        except Exception as e:
            print(f"ERRO página {page['num']}: {e}")
    print("=== Concluído ===")


if __name__ == "__main__":
    main()
