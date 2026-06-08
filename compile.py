import os
import base64

def compile_src_files():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    js_dir = os.path.join(base_dir, "js")
    
    if not os.path.exists(js_dir):
        print(f"Error: 'js' directory not found at {js_dir}")
        return

    compiled_count = 0
    
    # Walk through the js directory recursively
    for root, dirs, files in os.walk(js_dir):
        for file in files:
            if file.endswith(".src.js"):
                src_path = os.path.join(root, file)
                # Compute output filename by replacing .src.js with .js
                out_name = file[:-7] + ".js"
                out_path = os.path.join(root, out_name)
                
                try:
                    with open(src_path, "r", encoding="utf-8") as f:
                        code_content = f.read()
                    
                    # Safe Base64 encoding of the UTF-8 script content
                    b64_bytes = base64.b64encode(code_content.encode("utf-8"))
                    b64_str = b64_bytes.decode("utf-8")
                    
                    # Wrap in self-executing eval atob block
                    wrapped_code = (
                        f'(function(){{'
                        f'const b64="{b64_str}";'
                        f'eval(decodeURIComponent(atob(b64).split("").map(c=>"%" + ("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")));'
                        f'}})();\n'
                    )
                    
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(wrapped_code)
                    
                    rel_src = os.path.relpath(src_path, base_dir)
                    rel_out = os.path.relpath(out_path, base_dir)
                    print(f"Compiled: {rel_src} -> {rel_out}")
                    compiled_count += 1
                except Exception as e:
                    print(f"Error compiling {file}: {e}")
                    
    print(f"\nFinished. Successfully compiled {compiled_count} file(s).")

if __name__ == "__main__":
    compile_src_files()
