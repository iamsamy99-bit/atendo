# Gemini MCP para Atendo

Este proyecto incluye un servidor MCP local para Gemini CLI en `mcp/server.mjs`.

## Que expone

- `project_overview`: estructura, scripts y estado de Git.
- `list_project_files`: archivos del proyecto, excluyendo dependencias y artefactos.
- `read_project_file`: lectura segura de archivos dentro del proyecto.
- `search_project`: busqueda de texto con archivo y numero de linea.
- `git_diff`: cambios locales, solo lectura.
- `run_validation`: `tests`, `typecheck` o `build`, con comandos fijos.

El servidor usa `stdio`, no abre puertos y no recibe secretos. No incluye una herramienta generica para ejecutar shell ni una herramienta para escribir archivos. Gemini CLI puede editar el proyecto con sus herramientas propias cuando se inicia desde esta carpeta.

## Conexion desde Gemini CLI

La configuracion de proyecto ya esta en `.gemini/settings.json`. Desde la raiz del proyecto:

```bash
gemini
```

Despues verifica la conexion con:

```text
/mcp list
```

Debe aparecer `atendo-project`. Para una prueba directa del servidor:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"manual-check","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | node mcp/server.mjs
```

Si Gemini no encuentra el servidor, ejecuta `gemini` desde `/home/newpc1/Documentos/Proyectos/atendo` o cambia `cwd` en `.gemini/settings.json` a la ruta absoluta del proyecto.

## Limites de seguridad

El servidor valida que todas las rutas permanezcan dentro del proyecto, ignora `node_modules`, `.git` y `dist`, limita la lectura a 160 KB por archivo y no configura `trust: true`.
