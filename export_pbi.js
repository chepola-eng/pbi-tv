Run node export_pbi.js
=== Iniciando captura do Power BI ===
Fazendo login...
/home/runner/work/pbi-tv/pbi-tv/node_modules/puppeteer-core/lib/cjs/puppeteer/common/WaitTask.js:50
            this.#timeoutError = new Errors_js_1.TimeoutError(`Waiting failed: ${options.timeout}ms exceeded`);
                                 ^

TimeoutError: Waiting for selector `input[type="email"]` failed: Waiting failed: 15000ms exceeded
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
