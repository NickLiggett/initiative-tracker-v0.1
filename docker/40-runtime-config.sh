#!/bin/sh
# Runs when the container starts (nginx's image runs everything in /docker-entrypoint.d/). Writes config.js from the
# container's environment, which the page loads before the app:
#   OIDC_ISSUER        the sign-in realm, e.g. https://auth.example.com/realms/open5e
#   OIDC_CLIENT_ID     the client in that realm, e.g. initiative-tracker
#   OIDC_REDIRECT_URI  optional; where the provider sends people back to (the app's own address by default)
# With no issuer and client id there is no sign-in, as in development.
set -eu

# Values go into a JavaScript string: keep quotes and backslashes out of it.
escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat > /usr/share/nginx/html/config.js <<EOF
// Written when the container started (docker/40-runtime-config.sh).
window.__APP_CONFIG__ = {
  VITE_OIDC_ISSUER: "$(escape "${OIDC_ISSUER:-}")",
  VITE_OIDC_CLIENT_ID: "$(escape "${OIDC_CLIENT_ID:-}")",
  VITE_OIDC_REDIRECT_URI: "$(escape "${OIDC_REDIRECT_URI:-}")",
};
EOF
echo "40-runtime-config.sh: wrote config.js (issuer: ${OIDC_ISSUER:-none})"
