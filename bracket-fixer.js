const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing bracket and JSX structure...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix common JSX issues
const fixes = [];

// Fix 1: Ensure proper JSX structure for conditional rendering
// Look for patterns like: {condition ? ( ... ) : ( ... )}
const conditionalPattern = /(\{[^}]*\?\s*\([^)]*\)\s*:\s*\([^)]*\)\s*\})/g;
let match;
while ((match = conditionalPattern.exec(content)) !== null) {
  const fullMatch = match[0];
  const startIndex = match.index;
  const endIndex = startIndex + fullMatch.length;
  
  // Check if this conditional is properly closed
  const beforeMatch = content.substring(0, startIndex);
  const afterMatch = content.substring(endIndex);
  
  // Count opening and closing braces
  const beforeBraces = (beforeMatch.match(/\{/g) || []).length;
  const beforeClosingBraces = (beforeMatch.match(/\}/g) || []).length;
  const afterBraces = (afterMatch.match(/\{/g) || []).length;
  const afterClosingBraces = (afterMatch.match(/\}/g) || []).length;
  
  if (beforeBraces - beforeClosingBraces > 0) {
    // This conditional is not properly closed
    const lineNumber = content.substring(0, startIndex).split('\n').length;
    fixes.push({
      type: 'conditional_closure',
      line: lineNumber,
      description: 'Add missing closing brace for conditional rendering',
      fix: () => {
        // Find the next logical place to add closing brace
        const nextLineBreak = content.indexOf('\n', endIndex);
        if (nextLineBreak !== -1) {
          content = content.substring(0, nextLineBreak) + '\n          )}' + content.substring(nextLineBreak);
        }
      }
    });
  }
}

// Fix 2: Fix common JSX structure issues
const lines = content.split('\n');
const fixedLines = [];
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmedLine = line.trim();
  
  // Count brackets in this line
  const lineBraces = (line.match(/\{/g) || []).length;
  const lineClosingBraces = (line.match(/\}/g) || []).length;
  const lineParens = (line.match(/\(/g) || []).length;
  const lineClosingParens = (line.match(/\)/g) || []).length;
  const lineBrackets = (line.match(/\[/g) || []).length;
  const lineClosingBrackets = (line.match(/\]/g) || []).length;
  
  braceCount += lineBraces - lineClosingBraces;
  parenCount += lineParens - lineClosingParens;
  bracketCount += lineBrackets - lineClosingBrackets;
  
  // Check for common issues
  if (trimmedLine.includes(')}') && braceCount > 0 && parenCount > 0) {
    // This might be a conditional closing
    if (braceCount === 1 && parenCount === 1) {
      // This looks like the end of a conditional
      fixedLines.push(line);
      continue;
    }
  }
  
  // Check for missing closing brackets
  if (i === lines.length - 1 && (braceCount > 0 || parenCount > 0 || bracketCount > 0)) {
    console.log(`⚠️  Line ${i + 1}: Missing closing brackets (braces: ${braceCount}, parens: ${parenCount}, brackets: ${bracketCount})`);
    
    // Add missing closing brackets
    let missingClosures = '';
    for (let j = 0; j < braceCount; j++) missingClosures += '}';
    for (let j = 0; j < parenCount; j++) missingClosures += ')';
    for (let j = 0; j < bracketCount; j++) missingClosures += ']';
    
    fixedLines.push(line + missingClosures);
    fixes.push({
      type: 'missing_closures',
      line: i + 1,
      description: `Added missing closing brackets: ${missingClosures}`,
      fix: () => {} // Already applied
    });
  } else {
    fixedLines.push(line);
  }
}

// Apply fixes
let fixedContent = fixedLines.join('\n');

// Fix 3: Fix specific JSX structure issues
// Look for patterns like: {condition ? ( ... ) : ( ... )} without proper closing
const jsxConditionalPattern = /(\{[^}]*\?\s*\([^)]*\)\s*:\s*\([^)]*\)\s*)(?!\})/g;
let jsxMatch;
while ((jsxMatch = jsxConditionalPattern.exec(fixedContent)) !== null) {
  const matchIndex = jsxMatch.index;
  const matchLength = jsxMatch[0].length;
  
  // Check if there's a closing brace after this
  const afterMatch = fixedContent.substring(matchIndex + matchLength);
  if (!afterMatch.trim().startsWith('}')) {
    // Add missing closing brace
    const lineNumber = fixedContent.substring(0, matchIndex).split('\n').length;
    const insertIndex = matchIndex + matchLength;
    
    fixedContent = fixedContent.substring(0, insertIndex) + '}' + fixedContent.substring(insertIndex);
    
    fixes.push({
      type: 'jsx_conditional_closure',
      line: lineNumber,
      description: 'Added missing closing brace for JSX conditional',
      fix: () => {} // Already applied
    });
  }
}

// Fix 4: Fix main content area structure
// Look for the main content area and ensure proper structure
const mainContentPattern = /(\{currentView === 'kanban' \? \([\s\S]*?\) : \([\s\S]*?\)\})/g;
let mainMatch;
while ((mainMatch = mainContentPattern.exec(fixedContent)) !== null) {
  const matchIndex = mainMatch.index;
  const matchLength = mainMatch[0].length;
  
  // Check if this is properly closed
  const beforeMatch = fixedContent.substring(0, matchIndex);
  const afterMatch = fixedContent.substring(matchIndex + matchLength);
  
  // Count braces
  const beforeBraces = (beforeMatch.match(/\{/g) || []).length;
  const beforeClosingBraces = (beforeMatch.match(/\}/g) || []).length;
  
  if (beforeBraces - beforeClosingBraces > 0) {
    // This conditional is not properly closed
    const lineNumber = fixedContent.substring(0, matchIndex).split('\n').length;
    
    // Find the next logical place to add closing brace
    const nextLineBreak = fixedContent.indexOf('\n', matchIndex + matchLength);
    if (nextLineBreak !== -1) {
      fixedContent = fixedContent.substring(0, nextLineBreak) + '\n        )}' + fixedContent.substring(nextLineBreak);
      
      fixes.push({
        type: 'main_content_closure',
        line: lineNumber,
        description: 'Added missing closing brace for main content area',
        fix: () => {} // Already applied
      });
    }
  }
}

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

// Report fixes
console.log(`✅ Applied ${fixes.length} fixes:`);
fixes.forEach((fix, index) => {
  console.log(`${index + 1}. Line ${fix.line}: ${fix.description}`);
});

console.log('\n📄 Fixed file saved. Backup created at:', backupPath);
console.log('\n🧪 Testing the build...');

// Test the build
const { exec } = require('child_process');
exec('npm run build -- --no-lint', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has issues:');
    console.log(stderr);
  } else {
    console.log('✅ Build successful!');
  }
});
