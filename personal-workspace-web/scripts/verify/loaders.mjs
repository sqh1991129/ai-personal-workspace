/**
 * 零依赖一次性核对脚本的 ESM loader：把 src 下的 .vue / .ts 直接喂给 Node。
 * - resolve：解析 @/ 别名，把 .vue 拆成带 query 的子请求
 * - load：用 @vue/compiler-sfc 编译 SFC（<script setup> 宏），再用工程自带的 typescript 剥类型
 * 只服务本目录下的核对脚本，不参与 webpack 构建链路。
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import ts from 'typescript'

const ROOT = new URL('../../', import.meta.url).href
const SRC = `${ROOT}src/`

function isBare(specifier) {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:') && !specifier.startsWith('data:') && !specifier.startsWith('@/')
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2)
    if (rel.endsWith('.vue')) {
      return { url: `${SRC}${rel}?vue`, shortCircuit: true }
    }
    for (const candidate of [`${SRC}${rel}.ts`, `${SRC}${rel}/index.ts`]) {
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate, shortCircuit: true }
      }
    }
    throw new Error(`cannot resolve ${specifier}`)
  }
  if (specifier.endsWith('.vue')) {
    const resolved = await next(specifier, context)
    return { ...resolved, url: `${resolved.url}?vue` }
  }
  if (isBare(specifier)) {
    return next(specifier, { ...context, parentURL: `${ROOT}package.json` })
  }
  return next(specifier, context)
}

export async function load(url, context, next) {
  if (!url.endsWith('?vue')) {
    return next(url, context)
  }
  const filename = fileURLToPath(url.slice(0, -'?vue'.length))
  const source = await readFile(filename, 'utf8')
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length > 0) {
    throw new Error(`SFC parse error in ${filename}: ${errors[0].message}`)
  }
  const id = filename.replace(/[^a-z0-9]/gi, '')

  // 纯模板组件（如 NotFoundView）没有 <script>，compileScript 会直接报错，单独走模板编译
  if (!descriptor.script && !descriptor.scriptSetup) {
    const tpl = compileTemplate({ source: descriptor.template.content, filename, id })
    const body = tpl.code.replace('export function render(', 'function render(')
    return { format: 'module', source: `${body}\nexport default { render }\n`, shortCircuit: true }
  }

  const compiled = compileScript(descriptor, { id, inlineTemplate: true, genDefaultAs: '__sfc__' })
  const js = ts.transpileModule(compiled.content, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
      verbatimModuleSyntax: true
    },
    fileName: filename
  }).outputText
  return { format: 'module', source: `${js}\nexport default __sfc__\n`, shortCircuit: true }
}
