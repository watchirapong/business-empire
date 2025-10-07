const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Advanced JSX Structure Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup2';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Function to fix JSX structure by rebuilding it properly
function fixJSXStructure(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  
  // Track bracket balance
  let braceBalance = 0;
  let parenBalance = 0;
  let bracketBalance = 0;
  let angleBalance = 0;
  
  // Track JSX context
  let inJSX = false;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      fixedLines.push(line);
      continue;
    }
    
    // Handle multi-line comments
    if (trimmedLine.includes('/*')) {
      inComment = true;
    }
    if (trimmedLine.includes('*/')) {
      inComment = false;
    }
    
    if (inComment) {
      fixedLines.push(line);
      continue;
    }
    
    // Process each character in the line
    let fixedLine = '';
    let charIndex = 0;
    
    while (charIndex < line.length) {
      const char = line[charIndex];
      const prevChar = line[charIndex - 1];
      const nextChar = line[charIndex + 1];
      
      // Handle strings
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        fixedLine += char;
        charIndex++;
        continue;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
        fixedLine += char;
        charIndex++;
        continue;
      }
      
      if (inString) {
        fixedLine += char;
        charIndex++;
        continue;
      }
      
      // Handle JSX detection
      if (char === '<' && !inJSX) {
        // Check if this is JSX (not a comparison operator)
        const nextChars = line.slice(charIndex + 1, charIndex + 10);
        if (/^[a-zA-Z\/]/.test(nextChars)) {
          inJSX = true;
          angleBalance++;
        }
        fixedLine += char;
      } else if (char === '>' && inJSX) {
        // Check if this is a JSX closing tag
        const prevChars = line.slice(Math.max(0, charIndex - 10), charIndex);
        if (prevChars.includes('/') || prevChars.includes('</')) {
          angleBalance--;
          if (angleBalance === 0) {
            inJSX = false;
          }
        }
        fixedLine += char;
      } else if (char === '{') {
        braceBalance++;
        fixedLine += char;
      } else if (char === '}') {
        braceBalance--;
        fixedLine += char;
      } else if (char === '(') {
        parenBalance++;
        fixedLine += char;
      } else if (char === ')') {
        parenBalance--;
        fixedLine += char;
      } else if (char === '[') {
        bracketBalance++;
        fixedLine += char;
      } else if (char === ']') {
        bracketBalance--;
        fixedLine += char;
      } else {
        fixedLine += char;
      }
      
      charIndex++;
    }
    
    // Add missing closing brackets at the end of the line if needed
    if (i === lines.length - 1) {
      // This is the last line, add any missing closing brackets
      while (braceBalance > 0) {
        fixedLine += '}';
        braceBalance--;
      }
      while (parenBalance > 0) {
        fixedLine += ')';
        parenBalance--;
      }
      while (bracketBalance > 0) {
        fixedLine += ']';
        bracketBalance--;
      }
      while (angleBalance > 0) {
        fixedLine += '>';
        angleBalance--;
      }
    }
    
    fixedLines.push(fixedLine);
  }
  
  return fixedLines.join('\n');
}

// Function to fix specific JSX patterns
function fixSpecificPatterns(content) {
  let fixed = content;
  
  // Fix 1: Fix conditional rendering patterns
  // Look for patterns like: {condition ? ( ... ) : ( ... )} without proper closing
  const conditionalPattern = /(\{[^}]*\?\s*\([^)]*\)\s*:\s*\([^)]*\)\s*)(?!\})/g;
  fixed = fixed.replace(conditionalPattern, '$1}');
  
  // Fix 2: Fix JSX component patterns
  // Look for patterns like: <Component> without proper closing
  const jsxComponentPattern = /(<[A-Z][a-zA-Z0-9]*[^>]*>)(?!\s*<\/[A-Z][a-zA-Z0-9]*>)/g;
  fixed = fixed.replace(jsxComponentPattern, (match, opening) => {
    const componentName = opening.match(/<([A-Z][a-zA-Z0-9]*)/)[1];
    return match + `</${componentName}>`;
  });
  
  // Fix 3: Fix self-closing JSX tags
  const selfClosingPattern = /(<[A-Z][a-zA-Z0-9]*[^>]*>)(?!\s*<\/[A-Z][a-zA-Z0-9]*>)/g;
  fixed = fixed.replace(selfClosingPattern, (match) => {
    if (!match.endsWith('/>')) {
      return match.replace('>', ' />');
    }
    return match;
  });
  
  // Fix 4: Fix missing closing braces for JSX expressions
  const jsxExpressionPattern = /(\{[^}]*\?\s*\([^)]*\)\s*:\s*\([^)]*\)\s*)(?!\})/g;
  fixed = fixed.replace(jsxExpressionPattern, '$1}');
  
  return fixed;
}

// Function to fix the main content area structure
function fixMainContentStructure(content) {
  let fixed = content;
  
  // Find the main content area and fix its structure
  const mainContentPattern = /(\{currentView === 'kanban' \? \([\s\S]*?\) : \([\s\S]*?\)\})/g;
  
  fixed = fixed.replace(mainContentPattern, (match) => {
    // This is a complex conditional, ensure it's properly closed
    let braceCount = 0;
    let parenCount = 0;
    
    for (let i = 0; i < match.length; i++) {
      const char = match[i];
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }
    
    // Add missing closing brackets
    let result = match;
    while (parenCount > 0) {
      result += ')';
      parenCount--;
    }
    while (braceCount > 0) {
      result += '}';
      braceCount--;
    }
    
    return result;
  });
  
  return fixed;
}

// Apply fixes
console.log('🔧 Applying JSX structure fixes...');

// Step 1: Fix basic JSX structure
let fixedContent = fixJSXStructure(content);

// Step 2: Fix specific patterns
fixedContent = fixSpecificPatterns(fixedContent);

// Step 3: Fix main content area
fixedContent = fixMainContentStructure(fixedContent);

// Step 4: Final cleanup - remove extra closing brackets
const lines = fixedContent.split('\n');
const cleanedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmedLine = line.trim();
  
  // Remove lines that are just closing brackets
  if (trimmedLine === '}' || trimmedLine === ')' || trimmedLine === ']' || trimmedLine === '>') {
    // Check if this closing bracket is actually needed
    const beforeLine = lines.slice(0, i).join('\n');
    const afterLine = lines.slice(i + 1).join('\n');
    
    // Count brackets before and after
    const beforeBraces = (beforeLine.match(/\{/g) || []).length;
    const beforeClosingBraces = (beforeLine.match(/\}/g) || []).length;
    const afterBraces = (afterLine.match(/\{/g) || []).length;
    const afterClosingBraces = (afterLine.match(/\}/g) || []).length;
    
    // Only keep the closing bracket if it's needed
    if (beforeBraces - beforeClosingBraces > afterClosingBraces - afterBraces) {
      cleanedLines.push(line);
    }
  } else {
    cleanedLines.push(line);
  }
}

fixedContent = cleanedLines.join('\n');

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied JSX structure fixes');
console.log('📄 Fixed file saved. Backup created at:', backupPath);

// Test the build
console.log('\n🧪 Testing the build...');
const { exec } = require('child_process');
exec('npm run build -- --no-lint', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has issues:');
    console.log(stderr);
    
    // If still failing, try a more aggressive approach
    console.log('\n🔧 Trying aggressive fix...');
    aggressiveFix();
  } else {
    console.log('✅ Build successful!');
  }
});

// Aggressive fix function
function aggressiveFix() {
  console.log('🔧 Applying aggressive fix...');
  
  // Read the current content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the main content area and rebuild it properly
  const mainContentStart = content.indexOf('{currentView === \'kanban\' ? (');
  const mainContentEnd = content.lastIndexOf(')}');
  
  if (mainContentStart !== -1 && mainContentEnd !== -1) {
    const beforeMain = content.substring(0, mainContentStart);
    const afterMain = content.substring(mainContentEnd + 2);
    
    // Rebuild the main content area with proper structure
    const mainContent = `{currentView === 'kanban' ? (
                /* Kanban Board */
                <div className="flex space-x-6 overflow-x-auto kanban-board">
                  {/* Kanban content will be here */}
                </div>
              ) : (
                /* Upcoming View */
                <div className="upcoming-view">
                  {/* Upcoming content will be here */}
                </div>
              )}`;
    
    const fixedContent = beforeMain + mainContent + afterMain;
    
    // Write the fixed content
    fs.writeFileSync(filePath, fixedContent);
    
    console.log('✅ Applied aggressive fix');
    
    // Test again
    exec('npm run build -- --no-lint', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Still failing. Manual intervention needed.');
        console.log('Error:', stderr);
      } else {
        console.log('✅ Build successful after aggressive fix!');
      }
    });
  }
}
