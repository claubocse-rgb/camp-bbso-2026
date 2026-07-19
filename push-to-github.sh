#!/usr/bin/env bash
# Pune codul pe GitHub. Foloseste: ./push-to-github.sh <TOKEN> [nume-repo]
set -e
TOKEN="$1"; REPO="${2:-camp-bbso-2026}"
if [ -z "$TOKEN" ]; then echo "Uz: ./push-to-github.sh <GITHUB_TOKEN> [nume-repo]"; exit 1; fi
USER=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep '"login"' | head -1 | sed -E 's/.*"login": *"([^"]+)".*/\1/')
echo "Cont GitHub: $USER"
# creeaza repo privat (ignora eroarea daca exista deja)
curl -s -H "Authorization: token $TOKEN" https://api.github.com/user/repos -d "{\"name\":\"$REPO\",\"private\":true}" >/dev/null || true
git remote remove origin 2>/dev/null || true
git remote add origin "https://$USER:$TOKEN@github.com/$USER/$REPO.git"
git branch -M main
git push -u origin main
echo "Gata: https://github.com/$USER/$REPO"
