# PBI TV Exporter

Exporta páginas do Power BI como PNG e publica via GitHub Pages para exibição no OptiSigns/Firestick.

## Estrutura
- `export_pbi.py` — Script principal de exportação
- `requirements.txt` — Dependências Python
- `render.yaml` — Configuração do Render (cron a cada 5 min)
- `docs/index.html` — Página que exibe o dashboard na TV
- `docs/pagina1.png` até `pagina4.png` — Imagens geradas automaticamente

## URLs das imagens (após GitHub Pages ativado)
- https://SEU_USUARIO.github.io/pbi-tv/pagina1.png
- https://SEU_USUARIO.github.io/pbi-tv/pagina2.png
- https://SEU_USUARIO.github.io/pbi-tv/pagina3.png
- https://SEU_USUARIO.github.io/pbi-tv/pagina4.png

## Variáveis de ambiente no Render
| Variável | Valor |
|---|---|
| PBI_USERNAME | seu email do Power BI |
| PBI_PASSWORD | sua senha |
| GIT_REPO_URL | https://github.com/SEU_USUARIO/pbi-tv.git |
| GIT_TOKEN | Token gerado no GitHub |

## Configuração

### 1. GitHub
1. Crie repositório `pbi-tv` (público)
2. Faça upload de todos os arquivos
3. Ative GitHub Pages: Settings → Pages → Source: `docs/`
4. Gere um token: Settings → Developer settings → Personal access tokens → repo

### 2. Render
1. Conecte o repositório GitHub no Render
2. Render detecta o `render.yaml` automaticamente
3. Configure as variáveis de ambiente
4. O cron executa a cada 5 minutos

### 3. OptiSigns
Adicione cada URL como asset do tipo "Image" em uma playlist.
