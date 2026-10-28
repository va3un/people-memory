# Phase 6 uses only a disposable browser, generated pixels and fictional records.
# Tests actual production downloads, file selection, photo decoding and offline recovery.
import base64
import copy
import csv
import functools
import hashlib
import http.server
import io
import json
import shutil
import tempfile
import threading
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/people-memory'))
    def log_message(self, *args):
        pass

TABLES = ['people', 'contexts', 'memberships', 'relationships', 'photos', 'captureBatches']
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(Path(__file__).resolve().parents[1] / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/people-memory/'
with tempfile.TemporaryDirectory(prefix='fictional-phase6-') as temp, sync_playwright() as p:
    root = Path(temp)
    browser = p.chromium.launch(**({'executable_path': shutil.which('chromium')} if shutil.which('chromium') else {}), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
    errors, external, csp = [], [], []
    context.on('page', lambda tab: tab.on('pageerror', lambda error: errors.append(str(error))))
    context.on('request', lambda request: external.append(request.url) if not request.url.startswith(('http://127.0.0.1', 'blob:', 'data:')) else None)
    page = context.new_page()
    page.on('console', lambda message: csp.append(message.text) if 'Content Security Policy' in message.text else None)
    page.goto(base)
    page.get_by_role('textbox', name='Your name (fictional for testing)', exact=True).fill('Fictional Backup Me')
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_role('link', name='Settings', exact=True).click()
    page.get_by_role('button', name='Load sample data', exact=True).click()
    expect(page.get_by_text('Sample data loaded', exact=True)).to_be_visible()
    # Seed exceptional history/tombstone cases in this isolated fictional browser only.
    page.evaluate('''async () => {
      const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});
      const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
      canvas.getContext('2d').fillRect(0,0,2,2);
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
      const tables=['people','contexts','memberships','relationships','photos','captureBatches','deviceSettings'];
      await new Promise((resolve,reject)=>{const tx=d.transaction(tables,'readwrite');
        const store=tx.objectStore('people'), request=store.getAll();request.onsuccess=()=>{
          const people=request.result, person=people.find(p=>!p.is_me);person.notes='=Fictional formula, "quotes"\\nमीरा';person.phones=['+91 00000 00000'];store.put(person);
          const deleted={...person,id:crypto.randomUUID(),full_name:'Deleted Fictional Person',deleted:true};store.put(deleted);
          const base={id:crypto.randomUUID(),created_at:person.created_at,updated_at:person.updated_at,deleted:false};
          const photo={...base,person_id:person.id,blob,mime:'image/png',bytes:blob.size,width:2,height:2};tx.objectStore('photos').put(photo);
          tx.objectStore('photos').put({...photo,id:crypto.randomUUID(),person_id:deleted.id,deleted:true});
          tx.objectStore('captureBatches').put({...base,id:crypto.randomUUID(),raw_text:'Fictional history only',created_ids:{photos:[photo.id]},before_snapshots:[],after_snapshots:[{table:'people',id:person.id,values:{notes:person.notes}}],status:'saved'});
          for(const name of ['contexts','memberships','relationships']){const s=tx.objectStore(name),q=s.getAll();q.onsuccess=()=>{const row=q.result[0];s.put({...row,id:crypto.randomUUID(),deleted:true})}}
          tx.objectStore('deviceSettings').put({key:'private-test-key',value:'fictional-device-only-secret',updated_at:person.updated_at});
        };tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });d.close();
    }''')
    page.reload()
    def dataset():
        return page.evaluate('''async tables => {
          const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});
          const data=await new Promise((resolve,reject)=>{const tx=d.transaction(tables);const data={};for(const table of tables){const q=tx.objectStore(table).getAll();q.onsuccess=()=>data[table]=q.result}tx.oncomplete=()=>resolve(data);tx.onerror=()=>reject(tx.error)});
          for(const row of data.photos){row.data=btoa(String.fromCharCode(...new Uint8Array(await row.blob.arrayBuffer())));delete row.blob}
          for(const table of tables)data[table].sort((a,b)=>a.id.localeCompare(b.id));d.close();return data;
        }''', TABLES)
    original = dataset()
    def download(button, filename):
        try:
            with page.expect_download(timeout=10000) as event:
                page.get_by_role('button', name=button, exact=True).click()
        except Exception:
            print(page.locator('body').inner_text(), flush=True)
            raise
        target = root / filename
        event.value.save_as(target)
        assert event.value.failure() is None
        return target
    backup = download('Backup now', 'original.json')
    wire = json.loads(backup.read_text())
    assert set(wire['tables']) == set(TABLES)
    assert len(wire['tables']['photos']) == 2
    for photo in wire['tables']['photos']:
        assert hashlib.sha256(base64.b64decode(photo['data'])).hexdigest() == photo['sha256']
    assert 'fictional-device-only-secret' not in backup.read_text()
    page.get_by_label('Verify downloaded backup', exact=True).set_input_files(backup)
    expect(page.get_by_text('Downloaded JSON backup verified.', exact=False)).to_be_visible()
    csv_zip = download('Export CSV ZIP', 'people.zip')
    with zipfile.ZipFile(csv_zip) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {f'{table}.csv' for table in TABLES[:4]}
        for table in TABLES[:4]:
            rows = list(csv.DictReader(io.StringIO(archive.read(f'{table}.csv').decode('utf-8-sig'))))
            assert len(rows) == len(original[table])
            if table == 'people':
                assert any(row['notes'].startswith("'=Fictional") for row in rows)
    vcard = download('Export vCard', 'people.vcf').read_bytes()
    assert b'TEL:+91 00000 00000' in vcard
    assert all(len(line) <= 75 for line in vcard.split(b'\r\n'))
    assert b'Deleted Fictional Person' not in vcard
    # Malformed, future and oversized files do not write anything.
    upload = page.get_by_label('Import JSON file', exact=True)
    corrupt_photo = copy.deepcopy(wire)
    truncated = base64.b64decode(corrupt_photo['tables']['photos'][0]['data'])[:33]
    corrupt_photo['tables']['photos'][0].update(data=base64.b64encode(truncated).decode(), bytes=len(truncated), sha256=hashlib.sha256(truncated).hexdigest())
    for filename, content in [('photo.json', json.dumps(corrupt_photo).encode()), ('bad.json', b'{'), ('future.json', json.dumps({**wire, 'schema': 999}).encode()), ('oversize.json', b' ' * (64 * 1024 * 1024 + 1))]:
        path = root / filename; path.write_bytes(content); upload.set_input_files(path)
        expect(page.get_by_role('alert').last).to_be_visible()
        assert dataset() == original
    upload.set_input_files(backup)
    expect(page.get_by_role('radio', name='Merge (keep existing versions)', exact=True)).to_be_checked()
    page.get_by_role('button', name='Cancel preview', exact=True).click()
    assert dataset() == original
    # Add a local-only row after export, then require a new downloaded backup before replace.
    page.evaluate('''async () => {const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=d.transaction('people','readwrite'),s=tx.objectStore('people'),q=s.getAll();q.onsuccess=()=>s.put({...q.result.find(p=>!p.is_me),id:crypto.randomUUID(),full_name:'Local-only Fictional Person',display_name:'Local-only'});tx.oncomplete=r});d.close()}''')
    page.reload(); upload = page.get_by_label('Import JSON file', exact=True); upload.set_input_files(backup)
    page.get_by_role('radio', name="Replace (restore the file's dataset)", exact=True).check()
    expect(page.get_by_role('button', name='Import now', exact=True)).to_be_disabled()
    safety = download('Download safety backup', 'safety.json')
    page.get_by_label('Verify safety backup', exact=True).set_input_files(backup)
    expect(page.get_by_role('alert').last).to_be_visible()
    expect(page.get_by_label('Type REPLACE to confirm', exact=True)).to_be_disabled()
    page.get_by_label('Verify safety backup', exact=True).set_input_files(safety)
    expect(page.get_by_text('Safety backup verified. Keep the downloaded file.', exact=True)).to_be_visible()
    confirmation = page.get_by_label('Type REPLACE to confirm', exact=True)
    confirmation.fill('replace'); expect(page.get_by_role('button', name='Import now', exact=True)).to_be_disabled()
    confirmation.fill('REPLACE')
    duplicates = page.get_by_role('checkbox', name='I reviewed the possible duplicate names', exact=False)
    if duplicates.count(): duplicates.check()
    before_failure = dataset()
    page.evaluate('''() => {const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='relationships'){IDBObjectStore.prototype.put=put;throw new DOMException('Fictional interrupted write','QuotaExceededError')}return put.apply(this,args)}}''')
    page.get_by_role('button', name='Import now', exact=True).click()
    expect(page.get_by_text('Fictional interrupted write', exact=False)).to_be_visible()
    assert dataset() == before_failure
    page.get_by_role('button', name='Import now', exact=True).click()
    expect(page.get_by_text('Import complete.', exact=False)).to_be_visible()
    assert dataset() == original
    # A concurrent change invalidates a read-only preview; cancellation and retry retain records.
    upload.set_input_files(backup)
    expect(page.get_by_role('button', name='Import now', exact=True)).to_be_enabled()
    page.evaluate('''async () => {const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=d.transaction('people','readwrite'),s=tx.objectStore('people'),q=s.getAll();q.onsuccess=()=>{const row=q.result[0];s.put({...row,notes:'Concurrent fictional edit'})};tx.oncomplete=r});d.close()}''')
    changed = dataset()
    page.get_by_role('button', name='Import now', exact=True).click()
    expect(page.get_by_text('Data changed after the preview.', exact=False)).to_be_visible()
    assert dataset() == changed
    page.get_by_role('button', name='Cancel preview', exact=True).click()
    # Critical real-file round trip: wipe ONLY this disposable fictional test directory, offline restore from first launch.
    page.evaluate('''async tables => {await navigator.serviceWorker.ready;const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=d.transaction(tables,'readwrite');for(const table of tables)tx.objectStore(table).clear();tx.oncomplete=r});d.close()}''', TABLES)
    page.reload(); expect(page.get_by_role('heading', name='About you', exact=True)).to_be_visible()
    context.set_offline(True)
    page.reload()
    page.get_by_text('Restore a JSON backup', exact=True).click()
    page.get_by_label('Import JSON file', exact=True).set_input_files(backup)
    expect(page.get_by_role('button', name='Import now', exact=True)).to_be_enabled()
    page.get_by_role('button', name='Import now', exact=True).click()
    expect(page.get_by_role('link', name='Settings', exact=True)).to_be_visible()
    assert dataset() == original
    secret = page.evaluate('''async () => {const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return new Promise(r=>{const q=d.transaction('deviceSettings').objectStore('deviceSettings').get('private-test-key');q.onsuccess=()=>{d.close();r(q.result.value)}})}''')
    assert secret == 'fictional-device-only-secret'
    page.get_by_role('link', name='Search', exact=True).click()
    page.get_by_role('searchbox', name='Search people', exact=True).fill('Meera')
    expect(page.get_by_role('region', name='Search results', exact=True).get_by_role('link', name='Meera Joshi', exact=True)).to_be_visible()
    assert not errors, errors
    assert not csp, csp
    assert not external, external
    print('Phase 6 browser checks passed: actual JSON/photo/history/tombstone equality after replacement and offline first-launch restoration; ZIP/vCard downloads; invalid/future/oversized files; mandatory saved backup and typed confirmation; stale preview; corrupt image; interrupted-write rollback and retry; cancellation; device settings; no external requests, CSP violations or page errors.')
    browser.close()
server.shutdown()
