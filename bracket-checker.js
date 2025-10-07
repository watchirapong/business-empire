const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Checking brackets and JSX structure...\n');

// Track different types of brackets
const stack = [];
const issues = [];
let lineNumber = 1;
let charIndex = 0;

// Bracket pairs
const brackets = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>'
};

const closingBrackets = {
  ')': '(',
  ']': '[',
  '}': '{',
  '>': '<'
};

// Track JSX specific brackets
const jsxStack = [];
let inJSX = false;
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const prevChar = content[i - 1];
  
  // Track line numbers
  if (char === '\n') {
    lineNumber++;
    charIndex = 0;
  } else {
    charIndex++;
  }
  
  // Handle strings
  if (!inString && (char === '"' || char === "'" || char === '`')) {
    inString = true;
    stringChar = char;
  } else if (inString && char === stringChar && prevChar !== '\\') {
    inString = false;
    stringChar = '';
  }
  
  // Skip if we're in a string
  if (inString) continue;
  
  // Handle JSX detection
  if (char === '<' && !inJSX) {
    // Check if this is JSX (not a comparison operator)
    const nextChars = content.slice(i + 1, i + 10);
    if (/^[a-zA-Z\/]/.test(nextChars)) {
      inJSX = true;
      jsxStack.push({ char: '<', line: lineNumber, index: i });
    }
  } else if (char === '>' && inJSX) {
    // Check if this is a JSX closing tag
    const prevChars = content.slice(Math.max(0, i - 10), i);
    if (prevChars.includes('/') || prevChars.includes('</')) {
      if (jsxStack.length > 0) {
        jsxStack.pop();
        if (jsxStack.length === 0) {
          inJSX = false;
        }
      }
    }
  }
  
  // Handle regular brackets
  if (brackets[char]) {
    stack.push({ char, line: lineNumber, index: i, type: 'opening' });
  } else if (closingBrackets[char]) {
    if (stack.length === 0) {
      issues.push({
        type: 'unexpected_closing',
        char,
        line: lineNumber,
        index: i,
        message: `Unexpected closing bracket '${char}' at line ${lineNumber}`
      });
    } else {
      const last = stack.pop();
      if (brackets[last.char] !== char) {
        issues.push({
          type: 'mismatch',
          char,
          line: lineNumber,
          index: i,
          expected: brackets[last.char],
          found: char,
          openingLine: last.line,
          message: `Bracket mismatch at line ${lineNumber}: expected '${brackets[last.char]}' but found '${char}' (opening bracket at line ${last.line})`
        });
      }
    }
  }
}

// Check for unclosed brackets
stack.forEach(bracket => {
  issues.push({
    type: 'unclosed',
    char: bracket.char,
    line: bracket.line,
    index: bracket.index,
    message: `Unclosed bracket '${bracket.char}' at line ${bracket.line}`
  });
});

// Check for unclosed JSX tags
jsxStack.forEach(tag => {
  issues.push({
    type: 'unclosed_jsx',
    char: tag.char,
    line: tag.line,
    index: tag.index,
    message: `Unclosed JSX tag at line ${tag.line}`
  });
});

// Report issues
if (issues.length === 0) {
  console.log('✅ No bracket issues found!');
} else {
  console.log(`❌ Found ${issues.length} bracket issues:\n`);
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.message}`);
  });
}

// Generate fix suggestions
console.log('\n🔧 Fix suggestions:');
issues.forEach((issue, index) => {
  console.log(`\n${index + 1}. ${issue.message}`);
  
  if (issue.type === 'unclosed') {
    console.log(`   Fix: Add closing '${brackets[issue.char]}' somewhere after line ${issue.line}`);
  } else if (issue.type === 'unexpected_closing') {
    console.log(`   Fix: Remove '${issue.char}' at line ${issue.line} or add opening '${closingBrackets[issue.char]}' before it`);
  } else if (issue.type === 'mismatch') {
    console.log(`   Fix: Change '${issue.found}' to '${issue.expected}' at line ${issue.line}`);
  }
});

// Save issues to file for reference
fs.writeFileSync('bracket-issues.json', JSON.stringify(issues, null, 2));
console.log('\n📄 Issues saved to bracket-issues.json');
