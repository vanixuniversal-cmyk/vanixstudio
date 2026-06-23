import os
import glob

target_dir = r"c:\xampp\htdocs\vanixstudio"
html_files = glob.glob(os.path.join(target_dir, "**/*.src.html"), recursive=True)

fb_link_html = """<a href="https://www.facebook.com/profile.php?id=61590889937443" aria-label="Facebook"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>"""

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False
    
    if '<div class="f-social">' in content:
        parts = content.split('<div class="f-social">')
        if len(parts) > 1:
            new_content = parts[0]
            for i in range(1, len(parts)):
                block = parts[i]
                if 'aria-label="Facebook"' not in block and 'id=61590889937443' not in block:
                    div_close_idx = block.find('</div>')
                    if div_close_idx != -1:
                        # Before inserting fb, wait, does the block have emojis?
                        # I should also replace the emojis if they exist.
                        new_block = block[:div_close_idx]
                        
                        # Replace emojis if they exist
                        if 'href="#">𝕏</a>' in new_block:
                            new_block = new_block.replace('<a href="#">𝕏</a>', '<a href="https://x.com/vanix_universal" aria-label="X (Twitter)"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>')
                        if 'href="#">in</a>' in new_block:
                            new_block = new_block.replace('<a href="#">in</a>', '<a href="https://www.linkedin.com/in/vanix-studio" aria-label="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg></a>')
                        if 'href="#">▶</a>' in new_block:
                            new_block = new_block.replace('<a href="#">▶</a>', '<a href="https://youtube.com/@vanixstudio?si=INJODt40lKhmqd2e" aria-label="YouTube"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.53 3.5 12 3.5 12 3.5s-7.53 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.017 0 12 0 12s0 3.983.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.47 20.5 12 20.5 12 20.5s7.53 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.983 24 12 24 12s0-3.983-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>')
                        if 'href="#">📷</a>' in new_block:
                            new_block = new_block.replace('<a href="#">📷</a>', '<a href="https://www.instagram.com/vanixstudio?utm_source=qr" aria-label="Instagram"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg></a>')

                        # Now append fb
                        # Add a newline and spaces to format it like films.src.html if possible, or just space.
                        new_block = new_block + '\n                    ' + fb_link_html + '\n                '
                        
                        new_content += '<div class="f-social">' + new_block + block[div_close_idx:]
                        modified = True
                    else:
                        new_content += '<div class="f-social">' + block
                else:
                    new_content += '<div class="f-social">' + block
        if modified:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file}")
