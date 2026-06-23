import os
import glob
import re

target_dir = r"c:\xampp\htdocs\vanixstudio"
html_files = glob.glob(os.path.join(target_dir, "**/*.src.html"), recursive=True)

fb_link_html = """                    <a href="https://www.facebook.com/profile.php?id=61590889937443" aria-label="Facebook"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg></a>
"""

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if it already has Facebook link in the footer-social block
    if '<div class="footer-social">' in content:
        # We need to find the footer-social block and inject the fb_link_html before its closing </div>
        # A simple way: find <div class="footer-social"> and the next </div>
        # But there might be other divs inside. Actually, in this block, there are no nested divs.
        
        # We can split the content at '<div class="footer-social">'
        parts = content.split('<div class="footer-social">')
        if len(parts) > 1:
            new_content = parts[0]
            for i in range(1, len(parts)):
                block = parts[i]
                if 'aria-label="Facebook"' not in block:
                    # Find the first closing </div> in this block
                    div_close_idx = block.find('</div>')
                    if div_close_idx != -1:
                        # Insert before the </div>
                        new_block = block[:div_close_idx] + fb_link_html + block[div_close_idx:]
                        new_content += '<div class="footer-social">' + new_block
                    else:
                        new_content += '<div class="footer-social">' + block
                else:
                    new_content += '<div class="footer-social">' + block
            
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file}")
