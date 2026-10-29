# Hardening rehearsal: disposable fictional profiles, simulated permission outcomes, real local SW.
# No deployment, real account, release, tag or normal browser storage is used.
import base64
import functools
import hashlib
import http.server
import json
import shutil
import tempfile
import threading
import zipfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

build = Path(__file__).resolve().parents[1] / 'dist'
upgrade = {'enabled': False}
class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/people-memory'))
    def log_message(self, *args):
        pass
    def do_GET(self):
        if urlparse(self.path).path == '/people-memory/sw.js':
            content = (build/'sw.js').read_bytes() + (b'\n// Fictional local update rehearsal\n' if upgrade['enabled'] else b'')
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(content)
        else:
            super().do_GET()

def snapshot(page):
    return page.evaluate('''async()=>{
      const d=await new Promise((r,j)=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
      const all={};
      for(const name of [...d.objectStoreNames]){
        const rows=await new Promise((r,j)=>{const q=d.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
        all[name]=await Promise.all(rows.map(async row=>{const copy={...row};delete copy.last_viewed_at;if(copy.blob)copy.blob=[...new Uint8Array(await copy.blob.arrayBuffer())];return copy}));
      }d.close();return JSON.stringify(all);
    }''')

def request_row(page):
    return page.evaluate('''async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});const value=await new Promise(r=>{const q=d.transaction('deviceSettings').objectStore('deviceSettings').get('storage:initialPersistenceRequest');q.onsuccess=()=>r(q.result??null)});d.close();return value}''')

with tempfile.TemporaryDirectory(prefix='fictional-phase12-') as temp, sync_playwright() as p:
    # A local review-build archive, never a final release; prove all extracted bytes match dist.
    archive=Path(temp)/'review-build.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as output:
        for file in sorted(build.rglob('*')):
            if file.is_file(): output.write(file,file.relative_to(build).as_posix())
    extracted=Path(temp)/'extracted'
    with zipfile.ZipFile(archive) as output: output.extractall(extracted)
    assert (extracted/'index.html').exists()
    for file in build.rglob('*'):
        if file.is_file(): assert hashlib.sha256(file.read_bytes()).digest()==hashlib.sha256((extracted/file.relative_to(build)).read_bytes()).digest()
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(extracted)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/people-memory/'
    browser=p.chromium.launch(**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}),args=['--no-sandbox'])
    errors, csp, requests=[],[],[]
    def context(mode):
        c=browser.new_context(viewport={'width':390,'height':900})
        c.add_init_script('''window.persistenceMode=MODE;window.permissionCalls=0;window.permissionGranted=false;
          if(navigator.storage){
          Object.defineProperty(navigator.storage,'persisted',{configurable:true,value:async()=>window.permissionGranted});
          Object.defineProperty(navigator.storage,'persist',{configurable:true,value:async()=>{
            window.permissionCalls++;
            if(window.persistenceMode==='error')throw new Error('Fictional native detail');
            if(window.persistenceMode==='interrupted')return new Promise(()=>{});
            window.permissionGranted=window.persistenceMode==='granted';return window.permissionGranted;
          }});
          if(window.persistenceMode==='unsupported'){
            Object.defineProperty(navigator.storage,'persist',{configurable:true,value:undefined});
            Object.defineProperty(navigator.storage,'persisted',{configurable:true,value:undefined});
          }}'''.replace('MODE',json.dumps(mode)))
        c.on('request',lambda req:requests.append({'url':req.url,'method':req.method,'body':req.post_data}))
        c.on('page',lambda page:(page.on('pageerror',lambda e:errors.append(str(e))),page.on('console',lambda m:csp.append(m.text) if 'Content Security Policy' in m.text else None)))
        return c
    def setup(c):
        page=c.new_page()
        page.goto(base+'#/settings')
        expect(page.get_by_label('Your name (fictional for testing)',exact=True)).to_be_visible()
        assert page.evaluate('window.permissionCalls')==0 and request_row(page) is None
        page.get_by_label('Your name (fictional for testing)',exact=True).fill('Fictional Hardening Me')
        page.get_by_role('button',name='Continue',exact=True).click()
        expect(page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
        return page
    for mode in ['denied','granted','unsupported','error','interrupted']:
        c=context(mode);page=setup(c)
        if mode=='unsupported':
            expect(page.get_by_text('Not available in this browser',exact=True)).to_be_visible()
            expect(page.get_by_role('button',name='Keep my data',exact=True)).to_have_count(0)
            assert request_row(page) is None
        else:
            page.wait_for_function("()=>window.permissionCalls===1")
            if mode!='interrupted':
                page.wait_for_function("async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});const v=await new Promise(r=>{const q=d.transaction('deviceSettings').objectStore('deviceSettings').get('storage:initialPersistenceRequest');q.onsuccess=()=>r(q.result)});d.close();return v?.value.state==='finished'}")
            expected='Kept by the browser' if mode=='granted' else 'Not guaranteed'
            expect(page.get_by_text(expected,exact=True)).to_be_visible()
            expect(page.get_by_text('Keep a verified JSON backup from Settings.',exact=False)).to_be_visible()
            before=snapshot(page)
            page.reload()
            # Simulated browser permission resets on reload: the UI must not trust past metadata.
            expect(page.get_by_text('Not guaranteed',exact=True)).to_be_visible()
            assert page.evaluate('window.permissionCalls')==0
            page.evaluate("window.persistenceMode='granted'")
            page.get_by_role('button',name='Keep my data',exact=True).click()
            expect(page.get_by_text('Kept by the browser',exact=True)).to_be_visible()
            assert snapshot(page)==before,'Permission retry changed records, backup proof or device settings'
        c.close()
        print(f'Permission rehearsal passed: {mode}',flush=True)

    c=context('denied');page=setup(c)
    page.get_by_role('button',name='Load sample data',exact=True).click()
    expect(page.get_by_role('button',name='Load sample data',exact=True)).to_be_enabled()
    page.goto(base+'#/add?form=1')
    page.get_by_label('Full name',exact=True).fill('Fictional Hardening Photo')
    png=page.evaluate("()=>{const c=document.createElement('canvas');c.width=80;c.height=80;const x=c.getContext('2d');x.fillStyle='#4f46e5';x.fillRect(0,0,80,80);return c.toDataURL('image/png').split(',')[1]}")
    page.locator('input[type=file]').set_input_files({'name':'fictional-hardening.png','mimeType':'image/png','buffer':base64.b64decode(png)})
    page.get_by_role('button',name='Save',exact=True).click()
    page.get_by_role('link',name='View saved person').click()
    expect(page.locator('main img')).to_be_visible()
    page.evaluate('async()=>{await navigator.serviceWorker.ready}')
    page.reload()
    page.wait_for_function('()=>navigator.serviceWorker.controller!==null')
    before=snapshot(page)
    page.goto(base+'#/add?form=1')
    page.get_by_label('Full name',exact=True).fill('Fictional Unsaved Update')
    print('Local service worker installed and controlling the fictional app',flush=True)
    upgrade['enabled']=True
    page.evaluate('async()=>{const r=await navigator.serviceWorker.ready;await r.update()}')
    refresh=page.get_by_role('button',name='Refresh',exact=True)
    expect(refresh).to_be_visible()
    page.once('dialog',lambda dialog:dialog.dismiss())
    refresh.click()
    expect(page.get_by_label('Full name',exact=True)).to_have_value('Fictional Unsaved Update')
    assert page.evaluate('async()=>!!(await navigator.serviceWorker.ready).waiting')
    assert snapshot(page)==before
    # Explicitly discard via the existing navigation guard; clearing text alone stays dirty.
    page.once('dialog',lambda dialog:dialog.accept())
    page.get_by_role('link',name='Settings',exact=True).click()
    expect(page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
    assert page.locator('[data-unsaved]').count()==0
    with page.expect_navigation(wait_until='domcontentloaded'):
        refresh.click()
    expect(page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
    assert snapshot(page)==before,'Local SW update changed saved records, photo bytes or private settings'
    c.set_offline(True)
    page.reload()
    page.get_by_role('link',name='Search',exact=True).click()
    search=page.get_by_role('searchbox',name='Search people',exact=True)
    search.fill('Fictional Hardening Photo')
    page.get_by_role('region',name='Search results').get_by_role('link',name='Fictional Hardening Photo',exact=True).click()
    expect(page.locator('main img')).to_be_visible()
    page.get_by_role('link',name='Browse',exact=True).click()
    expect(page.get_by_role('tab',name='Contexts',exact=True)).to_be_visible()
    page.get_by_role('link',name='Settings',exact=True).click()
    with page.expect_download() as download:
        page.get_by_role('button',name='Backup now',exact=True).click()
    saved=Path(temp)/'fictional-offline.json';download.value.save_as(saved)
    backup=json.loads(saved.read_text())
    assert len(backup['tables']['photos'])==1 and backup['tables']['contexts'] and backup['tables']['relationships']
    assert 'storage:initialPersistenceRequest' not in saved.read_text()
    assert snapshot(page)==before
    assert not errors and not csp,{'errors':errors,'csp':csp}
    for request in requests:
        # Blob photo previews/downloads are local resources, not outbound network calls.
        origin=base.removesuffix('/people-memory/')
        assert request['url'].startswith((base,'blob:'+origin+'/','data:')),request
        assert request['method']=='GET' and request['body'] is None,request
        assert not any(clue in request['url'] for clue in ['Fictional','Hardening','Unsaved','token=','key=']),request
    print(json.dumps({'passed':['local build ZIP round-trip','five simulated permission outcomes','one request after data exists','reload and interrupted-attempt protection','manual retry and live permission display','backup reminder and no false proof','real local SW install/waiting update','unsaved update refusal','saved-record/photo/settings equality across update','actual SW offline reload/search/browse/backup','same-origin GET-only network; no directory payload or third-party requests','no page/CSP errors'],'http_request_count':sum(r['url'].startswith(base) for r in requests),'local_resource_count':sum(r['url'].startswith(('blob:','data:')) for r in requests),'acceptance':'automated rehearsal only; manual/device and live-service checks remain release blockers'},indent=2))
    browser.close();server.shutdown()
