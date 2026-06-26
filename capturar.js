Run node export_pbi.js
=== Iniciando captura do Power BI ===
Fazendo login...
/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/common/WaitTask.js:50
            this.#timeoutError = new Errors_js_1.TimeoutError(Waiting failed: ${options.timeout}ms exceeded);
                                 ^
TimeoutError: Waiting for selector input[type="email"] failed: Waiting failed: 15000ms exceeded
    at new WaitTask (/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/common/WaitTask.js:50:34)
    at IsolatedWorld.waitForFunction (/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/api/Realm.js:25:26)
    at PQueryHandler.waitFor (/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/common/QueryHandler.js:170:95)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async CdpFrame.waitForSelector (/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/api/Frame.js:494:21)
    at async CdpPage.waitForSelector (/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/api/Page.js:1351:20)
    at async login (/home/runner/work/pbi-tv/pbi-tv/export_pbi.js:25:3)
    at async /home/runner/work/pbi-tv/pbi-tv/export_pbi.js:90:5
Node.js v20.20.2
Error: Process completed with exit code 1.

Mostrar menos
14:57
O erro referencia a linha 25 do arquivo antigo. O arquivo novo não foi salvo corretamente. Vou gerar um arquivo completamente novo com nome diferente para evitar confusão:


Executou um comando, leu um arquivo
Executou um comando, leu um arquivo
Agora faça assim no GitHub:

1. Delete o arquivo export_pbi.js (lixeira → commit)

2. Crie um novo arquivo chamado capturar.js e cole o conteúdo acima

3. Atualize o workflow .github/workflows/exportar-pbi.yml — mude apenas a linha do comando de node export_pbi.js para node capturar.js

4. Atualize o package.json — confirme que está assim:

json
{
  "name": "pbi-tv",
  "version": "1.0.0",
  "dependencies": {
    "puppeteer": "24.15.0"
  }
}
Depois Actions → Run workflow!


Capturar
JS 


Você usou 75% do seu limite semanal
