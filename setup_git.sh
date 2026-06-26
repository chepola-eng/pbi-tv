#!/bin/bash
# Este script é executado pelo Render antes de cada run
# para configurar o git com autenticação via token

git config --global credential.helper store
echo "https://oauth2:${GIT_TOKEN}@github.com" > ~/.git-credentials
git remote set-url origin "${GIT_REPO_URL}"
