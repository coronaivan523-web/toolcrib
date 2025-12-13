const fs = require('fs');

const filepath = 'c:\\Users\\Ivan.Corona\\.gemini\\antigravity\\scratch\\toolcrib\\frontend\\src\\pages\\Inventory.jsx';
const content = fs.readFileSync(filepath, 'utf8');

// We need to map positions back to line numbers for error reporting
function getLineNumber(index) {
    return content.substring(0, index).split('\n').length;
}

const stack = [];
const tagsToTrack = ['div', 'form', 'span', 'label', 'button', 'select', 'textarea'];

// Regex matches globally across newlines
// <tag ... > or </tag> or <tag />
// [^>] means anything except >
const tagRegex = /<\/?([a-zA-Z0-9]+)([^>]*?)>/gs;

let match;
while ((match = tagRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1];
    const index = match.index;
    const lineNum = getLineNumber(index);

    if (!tagsToTrack.includes(tagName)) continue;

    const isClosing = fullMatch.startsWith('</');
    const isSelfClosing = fullMatch.trim().endsWith('/>');

    if (isSelfClosing) continue;

    if (isClosing) {
        if (stack.length === 0) {
            console.log(`Error at line ${lineNum}: Unexpected closing tag </${tagName}>. Stack is empty.`);
            process.exit(1);
        }

        const last = stack.pop();
        if (last.tag !== tagName) {
            console.log(`Error at line ${lineNum}: Expected closing </${last.tag}> (opened at ${last.line}), but found </${tagName}>`);
            console.log('Stack trace (last 5):');
            stack.slice(-5).forEach(item => console.log(`  <${item.tag}> at line ${item.line}`));
            process.exit(1);
        }
    } else {
        // Opening tag
        stack.push({ tag: tagName, line: lineNum });
    }
}

if (stack.length > 0) {
    console.log(`Error: File ended with ${stack.length} unclosed tags.`);
    stack.forEach(item => console.log(`Unclosed <${item.tag}> at line ${item.line}`));
    process.exit(1);
} else {
    console.log("Success! No unbalanced tags found.");
}
