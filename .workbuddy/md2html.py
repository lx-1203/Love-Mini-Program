# -*- coding: utf-8 -*-
"""定向 Markdown -> 排版 HTML（用于 html-to-docx 转换）。
处理：标题层级、GFM 表格、有序/无序列表、引用、行内粗体/斜体/代码、代码围栏、分隔线。
"""
import re, sys, html

SRC = sys.argv[1]
OUT = sys.argv[2]

with open(SRC, encoding="utf-8") as f:
    lines = f.read().split("\n")

def inline(text):
    # 保护行内代码
    codes = []
    def stash(m):
        codes.append(m.group(1))
        return f"\x00CODE{len(codes)-1}\x00"
    text = re.sub(r"`([^`]+)`", stash, text)
    # 粗体
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    # 斜体
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*(?!\*)", r"<em>\1</em>", text)
    # 还原代码
    def restore(m):
        return f"<code>{html.escape(codes[int(m.group(1))])}</code>"
    text = re.sub(r"\x00CODE(\d+)\x00", restore, text)
    return text

out = []
i = 0
n = len(lines)
in_code = False
code_buf = []

# 收集 h2 作为目录
toc = []

while i < n:
    line = lines[i]
    # 代码围栏
    if line.strip().startswith("```"):
        if not in_code:
            in_code = True
            code_buf = []
        else:
            in_code = False
            code_text = "\n".join(code_buf)
            out.append(f'<pre class="codeblock">{html.escape(code_text)}</pre>')
        i += 1
        continue
    if in_code:
        code_buf.append(line)
        i += 1
        continue

    s = line.strip()
    if s == "":
        i += 1
        continue
    # 分隔线
    if re.match(r"^---+$", s):
        i += 1
        continue
    # 标题
    m = re.match(r"^(#{1,4})\s+(.*)$", line)
    if m:
        lvl = len(m.group(1))
        txt = m.group(2).strip()
        tag = f"h{lvl}"
        out.append(f"<{tag}>{inline(txt)}</{tag}>")
        if lvl == 2:
            toc.append(txt)
        i += 1
        continue
    # 表格
    if s.startswith("|") and i + 1 < n and re.match(r"^\s*\|?[\s:|-]+\|?\s*$", lines[i+1]):
        # 收集表格行
        tbl = []
        while i < n and lines[i].strip().startswith("|"):
            tbl.append(lines[i].strip())
            i += 1
        # 解析
        def parse_row(r):
            r = r.strip()
            if r.startswith("|"): r = r[1:]
            if r.endswith("|"): r = r[:-1]
            return [c.strip() for c in r.split("|")]
        rows = [parse_row(r) for r in tbl]
        header = rows[0]
        body = rows[2:]  # skip separator
        out.append('<table class="doctable">')
        out.append("<thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in header) + "</tr></thead>")
        out.append("<tbody>")
        for r in body:
            out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
        out.append("</tbody></table>")
        continue
    # 引用（用带样式的 p.note，避免紧跟标题时被转换器合并）
    if s.startswith(">"):
        txt = re.sub(r"^>\s?", "", s)
        out.append(f'<p class="note">{inline(txt)}</p>')
        i += 1
        continue
    # 无序列表
    if re.match(r"^-\s+", s):
        items = []
        while i < n and re.match(r"^-\s+", lines[i].strip()):
            items.append(re.sub(r"^-\s+", "", lines[i].strip()))
            i += 1
        out.append("<ul>" + "".join(f"<li>{inline(it)}</li>" for it in items) + "</ul>")
        continue
    # 有序列表
    if re.match(r"^\d+\.\s+", s):
        items = []
        while i < n and re.match(r"^\d+\.\s+", lines[i].strip()):
            items.append(re.sub(r"^\d+\.\s+", "", lines[i].strip()))
            i += 1
        out.append("<ol>" + "".join(f"<li>{inline(it)}</li>" for it in items) + "</ol>")
        continue
    # 普通段落
    out.append(f"<p>{inline(s)}</p>")
    i += 1

body_html = "\n".join(out)

# 目录
toc_html = "<ul class='toc'>" + "".join(f"<li>{html.escape(t)}</li>" for t in toc) + "</ul>"

CSS = """
:root{
  --ink:#1a1a1a; --brand:#1F3864; --brand2:#2E5496; --brand3:#8FAADC;
  --gray:#595959; --line:#BFBFBF; --band:#EEF1F8;
}
body{ font-family:"宋体","SimSun",serif; color:var(--ink); font-size:10.5pt; line-height:1.5; }
h1{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:20pt; font-weight:bold; color:var(--brand); text-align:center; margin:18pt 0 6pt; }
h2{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:14pt; font-weight:bold; color:var(--brand2); border-bottom:1.5pt solid var(--brand3); padding-bottom:3pt; margin:16pt 0 6pt; }
h3{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:12pt; font-weight:bold; color:var(--brand2); margin:12pt 0 4pt; }
h4{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:11pt; font-weight:bold; color:var(--gray); margin:10pt 0 3pt; }
p{ margin:4pt 0; text-align:justify; }
ul,ol{ margin:4pt 0 4pt 18pt; }
li{ margin:2pt 0; }
strong{ color:var(--brand); }
code{ font-family:"Consolas","Courier New",monospace; background:#F2F2F2; padding:0 3pt; border-radius:2pt; font-size:9.5pt; }
pre.codeblock{ font-family:"Consolas","Courier New",monospace; background:#F7F9FC; border:0.75pt solid var(--line); padding:8pt; border-radius:3pt; font-size:9pt; line-height:1.35; white-space:pre-wrap; }
blockquote{ border-left:3pt solid var(--brand3); background:var(--band); margin:6pt 0; padding:4pt 10pt; color:var(--gray); }
p.note{ border-left:3pt solid var(--brand3); background:var(--band); margin:6pt 0; padding:4pt 10pt; color:var(--gray); font-size:9.5pt; }
table.doctable{ border-collapse:collapse; width:100%; margin:6pt 0; font-size:9.5pt; }
table.doctable th{ background:var(--brand2); color:#fff; font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-weight:bold; border:0.75pt solid var(--brand2); padding:4pt 6pt; text-align:left; }
table.doctable td{ border:0.75pt solid var(--line); padding:4pt 6pt; vertical-align:top; }
table.doctable tbody tr:nth-child(even){ background:#F5F7FB; }
ul.toc{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:11pt; line-height:1.9; }
ul.toc li{ list-style:none; }
.cover{ text-align:center; padding:60pt 0 0; }
.cover .title{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:26pt; font-weight:bold; color:var(--brand); }
.cover .sub{ font-family:"微软雅黑","Microsoft YaHei",sans-serif; font-size:13pt; color:var(--brand2); margin-top:10pt; }
.cover .meta{ font-size:10.5pt; color:var(--gray); margin-top:40pt; line-height:1.8; }
.section-num{}
"""

doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><style>{CSS}</style></head>
<body>
<section role="cover">
  <div class="cover">
    <div class="title">校园恋爱小程序「寻觅」</div>
    <div class="sub">投资人立项书 · Investor Pitch</div>
    <div class="meta">
      文档版本：v2.0<br/>
      编制日期：2026-08-20<br/>
      文档定位：面向投资人 / 决策方的项目立项与融资说明
    </div>
  </div>
</section>
<section role="body" data-page-restart="1">
  <h2>目录</h2>
  {toc_html}
  {body_html}
</section>
</body>
</html>"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(doc)
print("OK ->", OUT, "toc_items=", len(toc))
