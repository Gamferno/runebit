import * as prettier from 'prettier/standalone'
import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'

/**
 * Pretty-prints a minified JS string using prettier.
 * Falls back to the original string if formatting fails.
 */
export async function formatJs(code) {
  if (!code || code === 'N/A') return code
  try {
    return await prettier.format(code, {
      parser: 'babel',
      plugins: [parserBabel, parserEstree],
      printWidth: 80,
      tabWidth: 2,
      semi: true,
      singleQuote: true,
    })
  } catch {
    return code // return as-is if formatting fails
  }
}

/**
 * Format solution code by language.
 * Only JS gets prettified — Python/Java/C++ are already multi-line in seed data.
 */
export async function formatSolution(language, code) {
  if (language === 'javascript') return formatJs(code)
  return code
}
