#!/usr/bin/env python3
"""
Flaticon FREE Icons Proxy Server
Run locally: python3 server.py
Then tunnel: bore local 8080 --to bore.pub
"""
from curl_cffi import requests
import json, re
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

FLATICON_SEARCH = "https://www.flaticon.com/search"
FLATICON_AUTOCOMPLETE = "https://www.flaticon.com/ajax/autocomplete"
CDN_BASE = "https://cdn-icons-png.flaticon.com"

session = requests.Session()
session.impersonate = "chrome120"
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-IN,en;q=0.9",
})

HOMEPAGE = """<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Flaticon Free</title><style>
:root{--bg:#0a0a0f;--s:#14141f;--b:#252535;--a:#17D1C6;--t:#e0e0e0;--m:#777}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:var(--bg);color:var(--t);min-height:100vh}
.h{background:var(--s);padding:14px 28px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:12px}
.h h1{color:var(--a);font-size:20px}.h .tag{background:#17D1C618;color:var(--a);padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid var(--a)}
.sc{padding:18px 28px;background:var(--s);border-bottom:1px solid var(--b)}
.sb{display:flex;gap:8px;max-width:600px}
.sb input{flex:1;min-width:180px;padding:12px 16px;border-radius:10px;border:2px solid var(--b);background:#0e0e1a;color:#fff;font-size:14px;outline:none}
.sb input:focus{border-color:var(--a)}.sb button{padding:12px 24px;border-radius:10px;border:none;background:var(--a);color:#000;font-size:14px;font-weight:600;cursor:pointer}
.sb button:hover{background:#1df0e0}.sug{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.sug span{padding:5px 14px;border-radius:15px;background:var(--s);border:1px solid var(--b);color:var(--m);font-size:11px;cursor:pointer}
.sug span:hover{border-color:var(--a);color:var(--a)}.r{padding:18px 28px;max-width:1500px;margin:0 auto}
.st{color:var(--m);margin-bottom:16px;font-size:13px}.st b{color:var(--a)}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.c{background:var(--s);border-radius:12px;padding:12px;cursor:pointer;transition:.3s;border:1px solid var(--b)}
.c:hover{border-color:var(--a);transform:translateY(-2px);box-shadow:0 6px 20px rgba(23,209,198,.1)}
.c .tw{width:100%;aspect-ratio:1;border-radius:8px;background:#0e0e1a;margin-bottom:8px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.c .tw img{max-width:100%;max-height:100%;object-fit:contain}
.c .nm{font-size:11.5px;color:#ddd;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c .mt{font-size:10px;color:var(--m);display:flex;justify-content:space-between}
.c .bf{background:#17D1C618;color:var(--a);padding:1px 7px;border-radius:10px;font-size:9px;font-weight:600}
.ld{text-align:center;padding:50px;color:var(--m)}.sp{display:inline-block;width:36px;height:36px;border:3px solid var(--b);border-top-color:var(--a);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}.pg{display:flex;gap:6px;justify-content:center;margin-top:20px}
.pg button{padding:8px 16px;border-radius:8px;border:1px solid var(--b);background:var(--s);color:var(--t);cursor:pointer;font-size:12px}
.pg button:hover{border-color:var(--a)}.pg button.act{background:var(--a);color:#000;border-color:var(--a)}
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:1000;justify-content:center;align-items:center;flex-direction:column}
.ov.on{display:flex}.ov img{max-width:92vw;max-height:75vh;border-radius:12px}
.ov .cls{position:absolute;top:20px;right:30px;font-size:32px;color:#fff;cursor:pointer}
.ov .inf{margin-top:15px;background:var(--s);padding:10px 20px;border-radius:10px;text-align:center}.ov .inf a{color:var(--a);text-decoration:none;font-size:12px}
</style></head><body>
<div class="h"><h1>🎨 Flaticon <span class="tag">FREE ONLY</span></h1></div>
<div class="sc"><div class="sb">
<input type="text" id="q" placeholder="Search free icons..." value="wallet" onkeydown="if(event.key==='Enter')s(1)">
<button onclick="s(1)">🔍 Search</button></div><div class="sug" id="sg"></div></div>
<div class="r"><div class="ld" style="display:none" id="l"><div class="sp"></div><p style="margin-top:12px">Searching Flaticon...</p></div>
<div id="g"></div><div class="pg" id="pg"></div></div>
<div class="ov" id="ov" onclick="cp()"><span class="cls">&times;</span><div id="vc"></div><div class="inf" id="vi"></div></div>
<script>
let cq='',cpn=1,tp=1;
document.getElementById('q').addEventListener('input',function(){const v=this.value.trim();if(v.length>1)fetch('/api/autocomplete?query='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{const b=document.getElementById('sg');b.innerHTML=(d||[]).slice(0,8).map(x=>'<span onclick="document.getElementById(\'q\').value=\''+e(x.tag)+'\';s(1)">'+e(x.tag)+'</span>').join('');});else document.getElementById('sg').innerHTML='';});
function s(p){const q=document.getElementById('q').value.trim();if(!q)return;cq=q;cpn=p||1;document.getElementById('l').style.display='block';document.getElementById('g').innerHTML='';document.getElementById('pg').innerHTML='';fetch('/api/search?query='+encodeURIComponent(q)+'&page='+cpn).then(r=>r.json()).then(d=>{document.getElementById('l').style.display='none';if(d.status==='success'){const i=d.items||[],t=d.total||i.length;tp=d.totalPages||1;let h='<div class="st">Found <b>'+i.length+'</b> free of <b>'+t+'</b> for "<b>'+e(d.query||'')+'</b>"</div><div class="g">';i.forEach(x=>{const th=x.thumb||x.png_128,pr=x.png_512||x.png_256||th;h+='<div class="c" onclick="op(\''+e(pr)+'\',\''+e(x.name)+'\',\''+e(x.png_512||x.thumb)+'\')"><div class="tw"><img src="'+e(th)+'" loading="lazy" onerror="this.style.display=\'none\'"></div><div class="nm">'+e(x.name)+'</div><div class="mt"><span class="bf">FREE</span><span>'+e(x.author||'')+'</span></div></div>';});h+='</div>';document.getElementById('g').innerHTML=h;if(tp>1){let ph='';for(let j=1;j<=Math.min(tp,10);j++)ph+='<button class="'+(j===cpn?'act':'')+'" onclick="s('+j+')">'+j+'</button>';if(tp>10)ph+='<button>...'+tp+'</button>';document.getElementById('pg').innerHTML=ph;}}else document.getElementById('g').innerHTML='<p style="color:#ff6b6b">No results</p>';}).catch(e=>{document.getElementById('l').style.display='none';document.getElementById('g').innerHTML='<p style="color:#ff6b6b">Error: '+e.message+'</p>';});}
function op(u,n,dl){document.getElementById('vc').innerHTML='<img src="'+u+'">';document.getElementById('vi').innerHTML='<b>'+e(n)+'</b> | <a href="'+dl+'" target="_blank">512px</a>';document.getElementById('ov').classList.add('on');}
function cp(){document.getElementById('ov').classList.remove('on');}
function e(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
window.addEventListener('DOMContentLoaded',()=>s(1));
</script></body></html>"""

def parse_icons(html):
    icons = []
    blocks = re.findall(r'<li\s+class="[^"]*icon--item[^"]*".*?</li>', html, re.DOTALL)
    if not blocks:
        for m in re.finditer(r'<li[^>]*data-id="(\d+)"[^>]*>', html):
            end = html.find('</li>', m.start())
            blocks.append(html[m.start():end+5] if end>0 else html[m.start():m.start()+3000])
    for b in blocks:
        try:
            iid = re.search(r'data-id="(\d+)"', b)
            if not iid: continue
            fid = str(int(iid.group(1)) // 1000)
            icons.append({
                'id': iid.group(1),
                'name': (re.search(r'data-name="([^"]*)"', b) or ['','Icon'])[1],
                'premium': (re.search(r'data-premium="(\d+)"', b) or ['','0'])[1] == '1',
                'price': 0,
                'author': (re.search(r'data-author_name="([^"]*)"', b) or ['',''])[1],
                'thumb': f"{CDN_BASE}/128/{fid}/{iid.group(1)}.png",
                'png_128': f"{CDN_BASE}/128/{fid}/{iid.group(1)}.png",
                'png_256': f"{CDN_BASE}/256/{fid}/{iid.group(1)}.png",
                'png_512': f"{CDN_BASE}/512/{fid}/{iid.group(1)}.png",
            })
        except: continue
    return icons

@app.route('/')
def index(): return HOMEPAGE

@app.route('/api/search')
def api_search():
    q = request.args.get('query','').strip()
    p = request.args.get('page','1')
    if not q: return jsonify({"status":"error","message":"Query required"}),400
    try:
        params = {'word': q}
        if p != '1': params['page'] = p
        resp = session.get(FLATICON_SEARCH, params=params, timeout=20)
        html = resp.text
        icons = parse_icons(html)
        free = [i for i in icons if not i['premium']]
        tm = re.search(r'(\d[\d,]*)\s+\w+\s+icons', html)
        total = int(tm.group(1).replace(',','')) if tm else len(icons)
        pp = max(len(icons), 50)
        return jsonify({"status":"success","query":q,"page":int(p),"total":total,"totalPages":max(1,(total+pp-1)//pp),"items":free[:200]})
    except Exception as e:
        return jsonify({"status":"error","message":str(e)}),500

@app.route('/api/autocomplete')
def api_autocomplete():
    q = request.args.get('query','').strip()
    if not q or len(q)<2: return jsonify([])
    try:
        resp = session.get(f"{FLATICON_AUTOCOMPLETE}/{q}?type=icon", timeout=10)
        return jsonify(resp.json())
    except: return jsonify([])

@app.route('/health')
def health(): return jsonify({"status":"ok","service":"flaticon-proxy-free"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
