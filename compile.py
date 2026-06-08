import os
import re
import base64

def minify_css(css_text):
    # Strip comments
    css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)
    # Strip spaces/newlines
    css_text = re.sub(r'\s+', ' ', css_text)
    # Strip spaces around structural symbols
    css_text = re.sub(r'\s*([\{\}:;,])\s*', r'\1', css_text)
    # Remove final semicolon before close curly brace
    css_text = re.sub(r';}', '}', css_text)
    return css_text.strip()

def compile_project():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    compiled_count = 0
    errors_count = 0
    
    # Traverse project files recursively
    for root, dirs, files in os.walk(base_dir):
        # Ignore git folder
        if ".git" in root.split(os.sep):
            continue
            
        for file in files:
            src_path = os.path.join(root, file)
            
            # --- 1. COMPILE HTML ---
            if file.endswith(".src.html"):
                out_name = file[:-9] + ".html"
                out_path = os.path.join(root, out_name)
                
                try:
                    with open(src_path, "r", encoding="utf-8") as f:
                        html_content = f.read()
                    
                    b64_bytes = base64.b64encode(html_content.encode("utf-8"))
                    b64_str = b64_bytes.decode("utf-8")
                    
                    wrapped_html = (
                        f'<!DOCTYPE html>\n'
                        f'<html lang="en">\n'
                        f'<head>\n'
                        f'    <meta charset="UTF-8">\n'
                        f'    <script>\n'
                        f'        (function() {{\n'
                        f'            const b64 = "{b64_str}";\n'
                        f'            const doc = decodeURIComponent(atob(b64).split("").map(c => "%" + ("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""));\n'
                        f'            document.open();\n'
                        f'            document.write(doc);\n'
                        f'            document.close();\n'
                        f'        }})();\n'
                    f'    </script>\n'
                        f'</head>\n'
                        f'<body>\n'
                        f'</body>\n'
                        f'</html>\n'
                    )
                    
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(wrapped_html)
                    
                    rel_src = os.path.relpath(src_path, base_dir)
                    rel_out = os.path.relpath(out_path, base_dir)
                    print(f"Compiled HTML: {rel_src} -> {rel_out}")
                    compiled_count += 1
                except Exception as e:
                    print(f"Error HTML: {file}: {e}")
                    errors_count += 1
            
            # --- 2. COMPILE CSS ---
            elif file.endswith(".src.css"):
                out_name = file[:-8] + ".css"
                out_path = os.path.join(root, out_name)
                
                try:
                    with open(src_path, "r", encoding="utf-8") as f:
                        css_content = f.read()
                        
                    minified = minify_css(css_content)
                    
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(minified)
                        
                    rel_src = os.path.relpath(src_path, base_dir)
                    rel_out = os.path.relpath(out_path, base_dir)
                    print(f"Compiled CSS:  {rel_src} -> {rel_out}")
                    compiled_count += 1
                except Exception as e:
                    print(f"Error CSS: {file}: {e}")
                    errors_count += 1
                    
            # --- 3. COMPILE JS ---
            elif file.endswith(".src.js"):
                out_name = file[:-7] + ".js"
                out_path = os.path.join(root, out_name)
                
                try:
                    with open(src_path, "r", encoding="utf-8") as f:
                        code_content = f.read()
                    
                    b64_bytes = base64.b64encode(code_content.encode("utf-8"))
                    b64_str = b64_bytes.decode("utf-8")
                    
                    wrapped_code = (
                        f'(function(){{{{\n'
                        f'const b64="{b64_str}";\n'
                        f'eval(decodeURIComponent(atob(b64).split("").map(c=>"%" + ("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")));\n'
                        f'}}}})();\n'
                    )
                    
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(wrapped_code)
                        
                    rel_src = os.path.relpath(src_path, base_dir)
                    rel_out = os.path.relpath(out_path, base_dir)
                    print(f"Compiled JS:   {rel_src} -> {rel_out}")
                    compiled_count += 1
                except Exception as e:
                    print(f"Error JS: {file}: {e}")
                    errors_count += 1
                    
    print(f"\nCompilation finished. Successfully compiled {compiled_count} file(s) with {errors_count} error(s).")

if __name__ == "__main__":
    compile_project()
