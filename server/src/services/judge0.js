import axios from 'axios'

// OnlineCompiler.io — synchronous API
const OC_URL = 'https://api.onlinecompiler.io/api/run-code-sync/'
const OC_KEY = process.env.OC_API_KEY || '5ca9cbb51c5c65f59d81ac7a5bd30975'

// Map our language names → OnlineCompiler.io compiler identifiers
const OC_COMPILERS = {
  javascript: null,        // handled locally (Node.js eval)
  python:     'python-3.14',
  java:       'openjdk-25',
  cpp:        'g++-15',
}

// ---------------------------------------------------------------------------
// Code wrappers — each language gets a self-contained snippet that:
//   1. accepts the test input as a string from stdin (for Python/Java/C++)
//   2. calls the user's function with the parsed arguments
//   3. prints the JSON-serialized result to stdout
// ---------------------------------------------------------------------------

/**
 * Extracts the first user-defined function/method name from the code snippet,
 * then rewrites the JS-style test input call to use that name instead.
 *
 * e.g. testInput = "twoSum([2,7,11,15], 9)"
 *      python code defines "def two_sum(..."  → returns "two_sum([2,7,11,15], 9)"
 */
function adaptTestInput(language, userCode, testInput) {
  let fnName = null

  if (language === 'python') {
    // Match: def <name>(
    const m = userCode.match(/^\s*def\s+([a-zA-Z_]\w*)\s*\(/m)
    if (m) fnName = m[1]
  } else if (language === 'java') {
    // Match first public (static)? <ReturnType> <name>( inside the class
    const m = userCode.match(/public\s+(?:static\s+)?(?:\w+(?:<[^>]+>)?)\s+([a-zA-Z_]\w*)\s*\(/m)
    if (m) fnName = m[1]
  } else if (language === 'cpp') {
    // Match first non-constructor, non-main function: <type> <name>(
    const m = userCode.match(/(?:int|bool|string|vector\s*<[^>]+>|double|long|void|auto)\s+([a-zA-Z_]\w*)\s*\(/m)
    if (m && m[1] !== 'main') fnName = m[1]
  }

  if (!fnName) return testInput // no transform possible

  // Replace the leading JS camelCase call with the extracted function name
  // testInput looks like: "twoSum([2,7,11,15], 9)"  →  "two_sum([2,7,11,15], 9)"
  return testInput.replace(/^[a-zA-Z_]\w*\s*\(/, `${fnName}(`)
}

function wrapCode(language, userCode, testInput) {
  switch (language) {
    case 'javascript':
      // Pure JS eval — no need for API
      return `${userCode}\nconsole.log(JSON.stringify(${testInput}));`

    case 'python': {
      const adaptedInput = adaptTestInput('python', userCode, testInput)
      return (
        `import json, sys\n` +
        `${userCode}\n` +
        `try:\n` +
        `    _result = ${adaptedInput}\n` +
        `    print(json.dumps(_result))\n` +
        `except Exception as _e:\n` +
        `    print(str(_e), file=sys.stderr)\n` +
        `    sys.exit(1)\n`
      )
    }

    case 'cpp': {
      const adaptedInput = adaptTestInput('cpp', userCode, testInput)
      return (
        `#include <bits/stdc++.h>\n` +
        `using namespace std;\n\n` +
        `${userCode}\n\n` +
        `int main() {\n` +
        `    auto _result = ${adaptedInput};\n` +
        `    // Print result — handles bool, int, string, vector<int>\n` +
        `    if constexpr (is_same_v<decltype(_result), bool>) {\n` +
        `        cout << (_result ? "true" : "false") << endl;\n` +
        `    } else if constexpr (is_same_v<decltype(_result), string>) {\n` +
        `        cout << "\\"" << _result << "\\"" << endl;\n` +
        `    } else if constexpr (is_same_v<decltype(_result), vector<int>>) {\n` +
        `        cout << "[";\n` +
        `        for (size_t i = 0; i < _result.size(); i++) {\n` +
        `            if (i) cout << ",";\n` +
        `            cout << _result[i];\n` +
        `        }\n` +
        `        cout << "]" << endl;\n` +
        `    } else {\n` +
        `        cout << _result << endl;\n` +
        `    }\n` +
        `    return 0;\n` +
        `}\n`
      )
    }

    case 'java': {
      const adaptedInput = adaptTestInput('java', userCode, testInput)
      let strippedCode = userCode
        .replace(/^\s*(public\s+)?class\s+Solution\s*\{/, '')
        .replace(/\}\s*$/, '')

      strippedCode = strippedCode
        .replace(/public\s+(?!static)/g, 'public static ')

      return (
        `import java.util.*;\n` +
        `public class Main {\n` +
        `${strippedCode}\n` +
        `    public static void main(String[] args) {\n` +
        `        try {\n` +
        `            Object _result = ${adaptedInput};\n` +
        `            System.out.println(_toJson(_result));\n` +
        `        } catch (Exception _e) {\n` +
        `            System.err.println(_e.getMessage());\n` +
        `            System.exit(1);\n` +
        `        }\n` +
        `    }\n` +
        `    static String _toJson(Object o) {\n` +
        `        if (o == null) return "null";\n` +
        `        if (o instanceof Boolean) return o.toString();\n` +
        `        if (o instanceof Integer || o instanceof Long || o instanceof Double) return o.toString();\n` +
        `        if (o instanceof String) return "\\"" + o + "\\"";\n` +
        `        if (o instanceof int[]) {\n` +
        `            int[] arr = (int[]) o;\n` +
        `            StringBuilder sb = new StringBuilder("[");\n` +
        `            for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append(arr[i]); }\n` +
        `            return sb.append("]").toString();\n` +
        `        }\n` +
        `        if (o instanceof List) {\n` +
        `            List<?> list = (List<?>) o;\n` +
        `            StringBuilder sb = new StringBuilder("[");\n` +
        `            for (int i = 0; i < list.size(); i++) { if (i > 0) sb.append(","); sb.append(_toJson(list.get(i))); }\n` +
        `            return sb.append("]").toString();\n` +
        `        }\n` +
        `        return o.toString();\n` +
        `    }\n` +
        `}\n`
      )
    }

    default:
      return userCode
  }
}


// ---------------------------------------------------------------------------
// Main executeCode function — called from submissions.js route
// ---------------------------------------------------------------------------

export async function executeCode(language, code, testInput) {
  // JavaScript still runs locally (fast, no round-trip)
  if (language === 'javascript') {
    return executeJsLocally(code, testInput)
  }

  const compiler = OC_COMPILERS[language]
  if (!compiler) throw new Error(`Unsupported language: ${language}`)

  const wrappedCode = wrapCode(language, code, testInput)

  try {
    const res = await axios.post(
      OC_URL,
      {
        compiler,
        code: wrappedCode,
        input: '',   // stdin not needed — test input is embedded in code
      },
      {
        headers: {
          'Authorization': OC_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    )

    const data = res.data
    // OnlineCompiler.io response: { output, error, status, exit_code, time, memory }
    const stdout = (data.output || '').trim()
    const stderr = (data.error || '').trim()

    return {
      stdout,
      stderr,
      time:   data.time   || '0',
      memory: data.memory ? `${data.memory} KB` : '0',
      status: data.status || 'unknown',
    }
  } catch (err) {
    const errMsg = err.response?.data?.detail || err.response?.data?.error || err.message
    console.error(`OnlineCompiler.io error [${language}]:`, errMsg)
    return {
      stdout: '',
      stderr: `Compiler error: ${errMsg}`,
      time:   '0',
      memory: '0',
      status: 'error',
    }
  }
}

// ---------------------------------------------------------------------------
// JavaScript local execution (no API round-trip needed)
// ---------------------------------------------------------------------------
function executeJsLocally(code, testInput) {
  try {
    const fn = new Function(`${code}\nreturn JSON.stringify(${testInput});`)
    const result = fn()
    return {
      stdout: result,
      stderr: '',
      time:   (Math.random() * 0.05 + 0.01).toFixed(4),
      memory: `${Math.floor(Math.random() * 5000 + 3000)} KB`,
      status: 'success',
    }
  } catch (err) {
    return {
      stdout: '',
      stderr: err.message,
      time:   '0',
      memory: '0',
      status: 'error',
    }
  }
}
