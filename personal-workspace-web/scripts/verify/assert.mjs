/** 核对脚本共用的计数断言。跑完由 finish() 决定退出码。 */
let passed = 0
const failures = []

export function ok(label, condition) {
  if (condition) {
    passed += 1
  } else {
    failures.push(label)
  }
}

export function eq(label, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected)
  if (same) {
    passed += 1
  } else {
    failures.push(`${label} → got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

export function finish(name) {
  console.log(`${name} passed=${passed} failed=${failures.length}`)
  failures.forEach((line) => console.log('FAIL ' + line))
  if (failures.length > 0) {
    process.exitCode = 1
  }
}
