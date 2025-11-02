# Postman Request (n8n community node)


**Goal:** Replicate the functionality of a Postman request inside n8n with first-class support for headers, params, bodies, auth, files, response handling and Chai assertions.


## Features
- Methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Auth: None, Basic, Bearer, API Key (header/query), OAuth2 (via n8n credential)
- Bodies: x-www-form-urlencoded, multipart/form-data (binary from item), raw (JSON/Text/XML), GraphQL, binary
- Headers/Query collections with enable/disable flags
- Options: redirects, timeout, proxy, gzip/decompress, response format (auto/json/text/binary)
- Assertions: Enable a VM based JavaScript sandbox with Chai assertions and Postman-style helpers (`pm.response.to.have.status(...)`, `pm.environment`, `pm.variables`, `pm.cookies`, `pm.test()`)


## Install (local dev)
```bash
pnpm i
pnpm build
# Copy (or symlink) the project folder into your n8n custom nodes directory
# e.g., ~/.n8n/custom or /home/node/.n8n/custom depending on your setup
# Restart n8n and add the "Postman Request" node to a workflow
