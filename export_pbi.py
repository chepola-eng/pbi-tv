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


def get_group_id(token):
    """Busca o ID real do workspace 'Meu workspace' do usuário"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Tenta buscar o relatório diretamente sem group (My Workspace)
    r = requests.get(
        f"https://api.powerbi.com/v1.0/myorg/reports/{REPORT_ID}",
        headers=headers
    )
    if r.status_code == 200:
        print("  Relatório encontrado em 'Meu workspace' (sem group)")
        return None  # None = My Workspace direto
    
    # Se não achou, busca nos grupos
    r = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=headers)
    r.raise_for_status()
    groups = r.json().get("value", [])
    print(f"  Workspaces encontrados: {[g['name'] for g in groups]}")
    
    for group in groups:
        r2 = requests.get(
            f"https://api.powerbi.com/v1.0/myorg/groups/{group['id']}/reports/{REPORT_ID}",
            headers=headers
        )
        if r2.status_code == 200:
            print(f"  Relatório encontrado no workspace: {group['name']} ({group['id']})")
            return group["id"]
    
    raise Exception("Relatório não encontrado em nenhum workspace!")


def export_page(token, group_id, page_id, page_num):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # URL com ou sem group
    if group_id:
        base = f"https://api.powerbi.com/v1.0/myorg/groups/{group_id}/reports/{REPORT_ID}/ExportTo"
        status_base = f"https://api.powerbi.com/v1.0/myorg/groups/{group_id}/reports/{REPORT_ID}/exports"
    else:
        base = f"https://api.powerbi.com/v1.0/myorg/reports/{REPORT_ID}/ExportTo"
        status_base = f"https://api.powerbi.com/v1.0/myorg/reports/{REPORT_ID}/exports"

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

    # 2. Aguardar conclusão
    status_url = f"{status_base}/{export_id}"
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
    
    group_id = get_group_id(token)
    
    for page in PAGES:
        try:
            export_page(token, group_id, page["id"], page["num"])
        except Exception as e:
            print(f"ERRO página {page['num']}: {e}")
    print("=== Concluído ===")


if __name__ == "__main__":
    main()
