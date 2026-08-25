"""
渠道管理智能问答 - 构建脚本
用法: cd src && python build.py
输出: ../index.html

知识库在 ../kb/ 文件夹，模板在 src/ 同目录。
改动 kb/ 或 src/template.html 并推送到 GitHub 后，GitHub Actions 会自动运行本脚本并发布网页。
（2026-08-19 手动触发全新构建，用于确认线上版本。）
"""

import json, os, re
from PIL import Image

try:
    from pypinyin import lazy_pinyin
    PYPY_AVAILABLE = True
except ImportError:
    PYPY_AVAILABLE = False

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
KB_FILE = os.path.join(ROOT, 'kb', 'kb.json')
IMG_DIR = os.path.join(ROOT, 'kb', 'images')

# ===== 1. 读取知识库 =====
with open(KB_FILE, 'r', encoding='utf-8') as f:
    kb = json.load(f)

# ===== 2. 读取模板 =====
with open(os.path.join(BASE, 'template.html'), 'r', encoding='utf-8') as f:
    template = f.read()

# ===== 3. 收集所有图片引用 =====
def collect_images(obj, seen=None):
    """递归收集所有 img 和 imgs 引用"""
    if seen is None:
        seen = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ('img', 'imgs'):
                items = v if isinstance(v, list) else [v]
                for item in items:
                    if isinstance(item, str):
                        seen.add(item)
            else:
                collect_images(v, seen)
    elif isinstance(obj, list):
        for item in obj:
            collect_images(item, seen)
    return seen

all_imgs = collect_images(kb)
print(f"Images: {len(all_imgs)} referenced")

# ===== 4. 校验图片文件 =====
validated = {}
total_size = 0

for fn in sorted(all_imgs):
    fp = os.path.join(IMG_DIR, fn)
    if not os.path.exists(fp):
        # Try with different extensions
        for ext in ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG']:
            alt = os.path.join(IMG_DIR, fn + ext) if not fn.endswith(ext) else fp
            if os.path.exists(alt):
                fp = alt
                break
        else:
            print(f"  MISSING: {fn}")
            continue

    try:
        with Image.open(fp) as img:
            img.verify()
        validated[fn] = fp
        total_size += os.path.getsize(fp)
    except Exception as e:
        print(f"  ERROR {fn}: {e}")

print(f"Image assets: {total_size/1024/1024:.1f}MB ({len(validated)}/{len(all_imgs)} ok, loaded on demand)")

# ===== 6. 将 kb.json 转为 JS 对象字面量 =====
def to_js(obj, indent=0):
    """将 Python 对象转为 JavaScript 对象字面量（紧凑格式）"""
    sp = '  ' * indent
    if isinstance(obj, str):
        escaped = obj.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        return f'"{escaped}"'
    elif isinstance(obj, bool):
        return 'true' if obj else 'false'
    elif isinstance(obj, (int, float)):
        return str(obj)
    elif obj is None:
        return 'null'
    elif isinstance(obj, list):
        if not obj:
            return '[]'
        items = [to_js(item, indent + 1) for item in obj]
        return '[' + ','.join(items) + ']'
    elif isinstance(obj, dict):
        if not obj:
            return '{}'
        pairs = []
        for k, v in obj.items():
            pairs.append(f'{sp}  "{k}":{to_js(v, indent + 1)}')
        return '{\n' + ',\n'.join(pairs) + '\n' + sp + '}'
    return str(obj)

kb_js_lines = []
for key in kb:
    kb_js_lines.append(f'  "{key}":{to_js(kb[key], 1)}')

kb_block = 'var K={\n' + ',\n'.join(kb_js_lines) + '\n};'

# ===== 6.5 生成拼音表（模糊匹配用，pypinyin 未安装时降级为空表） =====
def build_pymap(template_text, kb_obj):
    if not PYPY_AVAILABLE:
        print("  pypinyin not installed -> pinyin fuzzy disabled (edit-distance only)")
        return 'var PYMAP={};'
    chars = set(re.findall(r'[一-鿿]', template_text))
    chars.update(re.findall(r'[一-鿿]', json.dumps(kb_obj, ensure_ascii=False)))
    entries = []
    for ch in sorted(chars):
        try:
            py = lazy_pinyin(ch)[0]
        except Exception:
            continue
        if py:
            entries.append('"%s":"%s"' % (ch, py))
    print(f"Pinyin map: {len(entries)} chars")
    return 'var PYMAP={' + ','.join(entries) + '};'

# ===== 7. 组装最终HTML =====
# 替换占位符
html = template.replace('__KB_PLACEHOLDER__', kb_block)
html = html.replace('__PYMAP_PLACEHOLDER__', build_pymap(template, kb))
from datetime import datetime
html = html.replace('__BUILD_STAMP__', datetime.now().strftime('%Y-%m-%d %H:%M'))

# ===== 8. 写入输出文件 =====
out_path = os.path.join(ROOT, 'index.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"[OK] index.html ({len(html)/1024/1024:.1f}MB)")

print("\n构建完成！输出: ../index.html")
