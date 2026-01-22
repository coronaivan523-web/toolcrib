import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    stack = []
    
    # Simple regex for relevant tags. 
    # Note: This is not a full JSX parser, but good enough for structure.
    # Ignoring self-closing tags <div /> for now (unlikely in this file structure)
    # Ignoring void tags like <input>, <img />
    
    # specific tags we care about for structure
    tags_to_track = ['div', 'form', 'span', 'label', 'button', 'select', 'textarea'] 

    for i, line in enumerate(lines):
        line_num = i + 1
        
        # Find all tags in the line
        # Regex to capture </tag> or <tag ...>
        # We need to be careful with things like <div className="...">
        
        # Look for closing tags first
        # matches </div>
        matches_close = [(m.start(), m.group(1)) for m in re.finditer(r'</([a-zA-Z0-9]+)>', line)]
        
        # Look for opening tags
        # matches <div ...> or <div>
        # Exclude self-closing <div />
        matches_open = []
        for m in re.finditer(r'<([a-zA-Z0-9]+)(\s[^>]*)?>', line):
            tag_name = m.group(1)
            full_match = m.group(0)
            if not full_match.endswith('/>') and tag_name in tags_to_track:
                 matches_open.append((m.start(), tag_name))

        # Combine and sort by position
        events = []
        for pos, tag in matches_close:
            events.append((pos, 'close', tag))
        for pos, tag in matches_open:
            events.append((pos, 'open', tag))
            
        events.sort(key=lambda x: x[0])
        
        for pos, type, tag in events:
            if tag not in tags_to_track:
                continue

            if type == 'open':
                stack.append((tag, line_num))
            elif type == 'close':
                if not stack:
                    print(f"Error at line {line_num}: Unexpected closing tag </{tag}>. Stack is empty.")
                    return
                
                last_tag, last_line = stack.pop()
                if last_tag != tag:
                    print(f"Error at line {line_num}: Expected closing </{last_tag}> (opened at {last_line}), but found </{tag}>")
                    # return # Continue to see more errors? NO, usually first one is key.
                    # But let's print stack and continue a bit slightly? 
                    # Actually React fails on first mismatch.
                    print(f"Stack trace: {[t[0] for t in stack[-5:]]}")
                    return

    if stack:
        print(f"Error: File ended with {len(stack)} unclosed tags.")
        for tag, line in stack:
            print(f"Unclosed <{tag}> at line {line}")

if __name__ == "__main__":
    check_jsx_balance(r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\src\pages\Inventory.jsx")
