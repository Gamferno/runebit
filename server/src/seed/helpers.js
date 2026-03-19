// Helper to create starter code templates
export function t(js, py, java, cpp) {
  return JSON.stringify({ javascript: js, python: py, java: java, cpp: cpp })
}

// Helper to create test cases
export function tc(...cases) {
  return JSON.stringify(cases.map(([input, expected]) => ({ input, expected })))
}

// Helper to create solution templates
export function sol(js, py, java, cpp) {
  return JSON.stringify({ javascript: js, python: py || 'N/A', java: java || 'N/A', cpp: cpp || 'N/A' })
}
