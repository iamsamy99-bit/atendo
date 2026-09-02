#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import readline from 'node:readline'

const execFile = promisify(execFileCallback)
const ROOT = path.resolve(process.env.ATENDO_PROJECT_ROOT || path.join(import.meta.dirname, '..'))
const MAX_FILE_BYTES = 160_000
const IGNORED_DIRS = new Set(['.git', '.wrangler', 'dist', 'node_modules', '.cache', 'coverage'])

function fail(message) {
  throw new Error(message)
}

function safeRelative(relativePath = '.') {
  if (typeof relativePath !== 'string' || relativePath.includes('\0')) fail('Ruta invalida')
  const absolute = path.resolve(ROOT, relativePath)
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) {
    fail('La ruta debe permanecer dentro del proyecto')
  }
  if (fs.existsSync(absolute)) {
    const real = fs.realpathSync(absolute)
    if (real !== ROOT && !real.startsWith(`${ROOT}${path.sep}`)) {
      fail('La ruta resuelve fuera del proyecto')
    }
  }
  return absolute
}

function relativePath(absolute) {
  return path.relative(ROOT, absolute) || '.'
}

function walk(directory, output, limit) {
  if (output.length >= limit) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(absolute, output, limit)
    else if (entry.isFile()) output.push(relativePath(absolute))
    if (output.length >= limit) return
  }
}

function listFiles(directory = '.', limit = 300) {
  const absolute = safeRelative(directory)
  if (!fs.statSync(absolute).isDirectory()) fail('La ruta no es un directorio')
  const output = []
  walk(absolute, output, Math.min(Math.max(Number(limit) || 300, 1), 1000))
  return output.sort()
}

function readFile(relativePath) {
  const absolute = safeRelative(relativePath)
  const stat = fs.statSync(absolute)
  if (!stat.isFile()) fail('La ruta no es un archivo')
  if (stat.size > MAX_FILE_BYTES) fail(`El archivo supera el limite de ${MAX_FILE_BYTES} bytes`)
  return fs.readFileSync(absolute, 'utf8')
}

async function git(args) {
  try {
    const result = await execFile('git', args, { cwd: ROOT, maxBuffer: 500_000 })
    return result.stdout.trim()
  } catch (error) {
    return `${error.stdout || ''}${error.stderr || error.message || ''}`.trim()
  }
}

async function projectOverview() {
  let packageJson = {}
  try { packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) } catch {}
  return {
    root: ROOT,
    name: packageJson.name || 'unknown',
    scripts: packageJson.scripts || {},
    gitStatus: await git(['status', '--short']),
    topLevel: listFiles('.', 120).filter(file => !file.includes(path.sep)),
  }
}

async function searchProject({ query, directory = '.', maxResults = 80 } = {}) {
  if (typeof query !== 'string' || !query.trim()) fail('query es obligatorio')
  const needle = query.toLowerCase()
  const results = []
  for (const file of listFiles(directory, 1000)) {
    if (results.length >= Math.min(Math.max(Number(maxResults) || 80, 1), 200)) break
    const absolute = safeRelative(file)
    let content
    try { content = fs.readFileSync(absolute, 'utf8') } catch { continue }
    if (content.includes('\u0000')) continue
    content.split(/\r?\n/).forEach((line, index) => {
      if (results.length >= Math.min(Math.max(Number(maxResults) || 80, 1), 200)) return
      if (line.toLowerCase().includes(needle)) {
        results.push({ file, line: index + 1, text: line.trim().slice(0, 300) })
      }
    })
  }
  return { query, results }
}

async function gitDiff({ file } = {}) {
  if (!file) return { diff: await git(['diff', '--stat']), detail: await git(['diff', '--', ':(exclude)package-lock.json']) }
  safeRelative(file)
  return { file, diff: await git(['diff', '--', file]) }
}

async function runValidation({ check = 'tests' } = {}) {
  const commands = {
    tests: ['npm', ['test', '--', '--run']],
    build: ['npm', ['run', 'build']],
    typecheck: ['npm', ['run', 'typecheck']],
  }
  if (!commands[check]) fail('check debe ser tests, build o typecheck')
  const [command, args] = commands[check]
  try {
    const result = await execFile(command, args, { cwd: ROOT, timeout: 180_000, maxBuffer: 1_500_000 })
    return { check, ok: true, output: `${result.stdout}${result.stderr}`.slice(-30_000) }
  } catch (error) {
    return { check, ok: false, output: `${error.stdout || ''}${error.stderr || error.message || ''}`.slice(-30_000) }
  }
}

const tools = [
  {
    name: 'project_overview',
    description: 'Resumen del proyecto Atendo, scripts disponibles y estado de Git.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_project_files',
    description: 'Lista archivos del proyecto sin incluir dependencias ni artefactos generados.',
    inputSchema: { type: 'object', properties: { directory: { type: 'string' }, limit: { type: 'number' } } },
  },
  {
    name: 'read_project_file',
    description: 'Lee un archivo de texto dentro del proyecto. Nunca acepta rutas fuera del proyecto.',
    inputSchema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } },
  },
  {
    name: 'search_project',
    description: 'Busca texto en los archivos del proyecto y devuelve archivo, linea y contexto.',
    inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, directory: { type: 'string' }, maxResults: { type: 'number' } } },
  },
  {
    name: 'git_diff',
    description: 'Consulta cambios locales de Git; es una operacion de solo lectura.',
    inputSchema: { type: 'object', properties: { file: { type: 'string' } } },
  },
  {
    name: 'run_validation',
    description: 'Ejecuta una validacion fija del proyecto: tests, build o typecheck.',
    inputSchema: { type: 'object', properties: { check: { type: 'string', enum: ['tests', 'build', 'typecheck'] } } },
  },
]

async function callTool(name, args) {
  const handlers = {
    project_overview: projectOverview,
    list_project_files: (input) => listFiles(input?.directory, input?.limit),
    read_project_file: (input) => readFile(input?.path),
    search_project: searchProject,
    git_diff: gitDiff,
    run_validation: runValidation,
  }
  if (!handlers[name]) fail(`Herramienta desconocida: ${name}`)
  return handlers[name](args || {})
}

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

async function handle(message) {
  const { id, method, params = {} } = message
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return
  if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} })
  if (method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'atendo-project', version: '1.0.0' },
        instructions: 'Servidor local de contexto y validacion para el proyecto Atendo. No ofrece herramientas para modificar fuentes; build puede regenerar dist.',
      },
    })
  }
  if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools } })
  if (method === 'tools/call') {
    try { return send({ jsonrpc: '2.0', id, result: textResult(await callTool(params.name, params.arguments)) }) }
    catch (error) { return send({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: error.message }] } }) }
  }
  if (method === 'resources/list') {
    return send({ jsonrpc: '2.0', id, result: { resources: [
      { uri: 'atendo://project/overview', name: 'Atendo project overview', mimeType: 'application/json' },
      { uri: 'atendo://project/guide', name: 'Atendo Gemini handoff guide', mimeType: 'text/markdown' },
    ] } })
  }
  if (method === 'resources/read') {
    try {
      const content = params.uri === 'atendo://project/overview'
        ? JSON.stringify(await projectOverview(), null, 2)
        : params.uri === 'atendo://project/guide'
          ? readFile('docs/gemini-mcp.md')
          : fail('Recurso desconocido')
      return send({ jsonrpc: '2.0', id, result: { contents: [{ uri: params.uri, mimeType: 'text/plain', text: content }] } })
    } catch (error) { return send({ jsonrpc: '2.0', id, error: { code: -32602, message: error.message } }) }
  }
  if (method === 'prompts/list') {
    return send({ jsonrpc: '2.0', id, result: { prompts: [{ name: 'handoff', description: 'Contexto inicial para trabajar en Atendo' }] } })
  }
  if (method === 'prompts/get' && params.name === 'handoff') {
    return send({ jsonrpc: '2.0', id, result: { description: 'Handoff de Atendo', messages: [{ role: 'user', content: { type: 'text', text: 'Lee primero atendo://project/overview. Trabaja dentro del proyecto actual, preserva cambios ajenos y ejecuta run_validation antes de cerrar.' } }] } })
  }
  if (typeof method === 'string' && method.startsWith('notifications/')) return
  send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Metodo no soportado: ${method}` } })
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
for await (const line of input) {
  if (!line.trim()) continue
  try { await handle(JSON.parse(line)) }
  catch (error) { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } }) }
}
