import json,glob,os,base64
R='/tmp/claude-0/-home-user/89f23ea2-b095-5302-8ad0-51ce22f0ca39/scratchpad/'
s=open(R+'so-tai-chinh.html').read()
def rep(o,n):
    global s; assert s.count(o)==1,o[:70]; s=s.replace(o,n)
# head
fonts=open(R+'fonts/inline.css').read()
chartjs=open(R+'cj/package/dist/chart.umd.js').read()
icon=base64.b64encode(open(R+'icon/meo-icon-256.png','rb').read()).decode()
a=s.index('<title>'); b=s.index('<style>')
s=('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
   '<title>Sổ Thu Chi & Đầu Tư</title>\n<link rel="icon" type="image/png" href="data:image/png;base64,'+icon+'">\n'
   '<style>\n'+fonts+'\n</style>\n<script>\n'+chartjs+'\n</script>\n'+s[b:])
rep('</style>\n\n<div id="bgfx"','''.data-dlg{border:0;border-radius:20px;padding:0;width:min(480px,calc(100vw - 32px));background:var(--surface);color:var(--fg);box-shadow:0 30px 80px -20px rgb(0 0 0/.45)}
.data-dlg::backdrop{background:rgb(30 15 30/.35);backdrop-filter:blur(3px)}
.data-dlg .in{padding:18px;display:grid;gap:14px}
.data-dlg button,.data-dlg .btn{width:100%}
.data-dlg .card-h button{width:auto}
#lock{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:
  radial-gradient(600px 400px at 80% 0%,color-mix(in srgb,var(--acc-2) 22%,transparent),transparent 60%),
  radial-gradient(600px 400px at 0% 100%,color-mix(in srgb,var(--sav) 24%,transparent),transparent 60%),var(--bg)}
.lock-card{width:min(380px,100%);background:var(--surface);border-radius:24px;padding:24px;display:grid;gap:12px;text-align:center;box-shadow:var(--shadow)}
.lock-card .lock-cat{width:110px;height:110px;margin:-70px auto 0}
.lock-card .lock-cat svg{width:100%;height:100%}
.lock-card h2{justify-content:center}
.lock-card input{text-align:center;font-size:1.05rem;padding:11px}
.lock-err{min-height:1.2em;color:var(--bad);font-size:.85rem;font-weight:600}
#fileBanner{display:flex;gap:10px 14px;align-items:center;justify-content:space-between;flex-wrap:wrap;color:var(--fg);background:color-mix(in srgb,var(--sky) 10%,var(--surface));border:1px solid color-mix(in srgb,var(--sky) 35%,var(--line));border-style:solid}
</style>
</head>
<body>
<div id="bgfx"''')
rep('<button id="fxToggle"','<button id="dataBtn" title="Dữ liệu và sao lưu" aria-label="Dữ liệu và sao lưu" style="width:34px;height:34px;padding:0">💾</button><button id="fxToggle"')
rep('<div id="dbBanner" class="banner" hidden></div>','<div id="dbBanner" class="banner" hidden></div>\n  <div id="fileBanner" class="banner" hidden></div>')
rep('<div id="toast" class="toast" hidden></div>','''<div id="toast" class="toast" hidden></div>
<dialog id="dataDlg" class="data-dlg" aria-labelledby="dataTitle"><div class="in">
  <div class="card-h"><h2 id="dataTitle">💾 Dữ liệu của bạn</h2><button id="dataClose" class="ghost" aria-label="Đóng">✕</button></div>
  <div id="dataBody" class="stack" style="gap:14px"></div>
</div></dialog>''')
# initial data from claude.ai export
init={}
for c in ['tx','funds','investments','budget','cfg']:
    init[c]={}
    for f in glob.glob(R+f'live2/{c}/*.json'):
        d=json.load(open(f)); init[c][os.path.basename(f)[:-5]]=d
rep('function setSync(txt){ $("#syncState").textContent=txt; }',
    'function setSync(txt){ $("#syncState").textContent=txt; }\nconst INITIAL_DATA='+json.dumps(init,ensure_ascii=False)+';\n'+open(R+'local/localdb.js').read()+'\n'+open(R+'local/dataui.js').read())
rep('const db = window.claude?.use ? await window.claude.use("db").catch(()=>null) : null;','const db = await LocalDB.open(INITIAL_DATA).catch(e=>{ console.error(e); return null; });')
rep('b.textContent="Không kết nối được kho dữ liệu. Hãy mở trang khi đã đăng nhập claude.ai; trong lúc này mọi thay đổi chỉ hiện tạm thời.";','b.textContent="Không mở được kho dữ liệu trên máy. Hãy thử mở bằng Chrome hoặc Edge.";')
rep('S.db=db; setSync("đã đồng bộ");','S.db=db; LocalDB.onState(renderDataUI);')
s=s.rstrip()+'\n</body>\n</html>\n'
os.makedirs(R+'local/out',exist_ok=True)
open(R+'local/out/so-tai-chinh.html','w').write(s)
print(len(s))
