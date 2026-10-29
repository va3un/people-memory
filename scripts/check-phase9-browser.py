# Fictional multi-device production rehearsal; every Dropbox endpoint is intercepted, never a live account.
import base64
import functools
import hashlib
import http.server
import json
import re
import shutil
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self,path):return super().translate_path(path.removeprefix('/people-memory'))
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(Path(__file__).resolve().parents[1]/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/people-memory/'
files={};uploads=[];requests=[];counter=0;fault={'path':None};challenge={'value':None}
def dbhash(data):return hashlib.sha256(b''.join(hashlib.sha256(data[i:i+4194304]).digest() for i in range(0,len(data),4194304))).hexdigest()
def put(path,data):
    global counter
    counter+=1;files[path]={'data':data,'rev':format(counter,'09x')}
def metadata(file):return {'rev':file['rev'],'size':len(file['data']),'content_hash':dbhash(file['data'])}
def dropbox(route,request):
    headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type,dropbox-api-arg,range','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Expose-Headers':'Dropbox-API-Result'}
    if request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
    if '/oauth2/authorize' in request.url:
        params=parse_qs(urlparse(request.url).query);assert params['code_challenge_method']==['S256'] and params['token_access_type']==['offline']
        assert params['scope']==['files.content.read files.content.write'];challenge['value']=params['code_challenge'][0]
        route.fulfill(status=302,headers={'Location':params['redirect_uri'][0]+'?code=fictional-code&state='+params['state'][0]});return
    requests.append(request.url)
    if request.url.endswith('/oauth2/token'):
        form=parse_qs(request.post_data)
        if form['grant_type']==['authorization_code']:
            assert base64.urlsafe_b64encode(hashlib.sha256(form['code_verifier'][0].encode()).digest()).decode().rstrip('=')==challenge['value']
            assert 'client_secret' not in form
        route.fulfill(headers=headers,json={'access_token':'fictional-browser-access','refresh_token':'fictional-browser-refresh','expires_in':14400,'token_type':'bearer','account_id':'dbid:fictional-browser','scope':'files.content.read files.content.write'});return
    assert request.headers.get('authorization')=='Bearer fictional-browser-access'
    def error(tag):route.fulfill(status=409,headers=headers,json={'error':{'.tag':'path','path':{'.tag':tag,'conflict':{'.tag':'file'}}}})
    if request.url.endswith('/files/download'):
        path=json.loads(request.headers['dropbox-api-arg'])['path'];file=files.get(path)
        if file is None:error('not_found');return
        probe=request.headers.get('range')=='bytes=0-0' and len(file['data'])>0
        route.fulfill(status=206 if probe else 200,headers={**headers,'Dropbox-API-Result':json.dumps(metadata(file))},body=file['data'][:1] if probe else file['data']);return
    if request.url.endswith('/files/upload'):
        arg=json.loads(request.headers['dropbox-api-arg']);path=arg['path'];uploads.append(path)
        if fault['path']==path:route.abort('failed');return
        previous=files.get(path)
        if arg['mode']['.tag']=='add' and previous or arg['mode']['.tag']=='update' and (not previous or previous['rev']!=arg['mode']['update']):error('conflict');return
        data=request.post_data_buffer;assert arg['strict_conflict'] and not arg['autorename'] and arg['content_hash']==dbhash(data)
        put(path,data);route.fulfill(headers=headers,json=metadata(files[path]));return
    if request.url.endswith('/files/create_folder_v2'):route.fulfill(headers=headers,json={'metadata':{}});return
    if request.url.endswith('/files/delete_v2'):
        arg=json.loads(request.post_data);previous=files.get(arg['path'])
        if not previous:error('not_found');return
        if previous['rev']!=arg['parent_rev']:error('conflict');return
        del files[arg['path']];route.fulfill(headers=headers,json={'metadata':{}});return
    raise AssertionError('Unexpected mocked Dropbox endpoint')
with tempfile.TemporaryDirectory(prefix='fictional-phase9-') as temp,sync_playwright() as p:
    browser=p.chromium.launch(**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}),args=['--no-sandbox'])
    errors=[];external=[];csp=[]
    def context():
        ctx=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        ctx.route('https://www.dropbox.com/oauth2/authorize**',dropbox);ctx.route('https://api.dropboxapi.com/**',dropbox);ctx.route('https://content.dropboxapi.com/**',dropbox)
        ctx.on('request',lambda req:external.append(req.url) if not req.url.startswith(('http://127.0.0.1','https://www.dropbox.com/oauth2/authorize','https://api.dropboxapi.com/','https://content.dropboxapi.com/','blob:','data:')) else None)
        def observe(tab):
            tab.on('pageerror',lambda error:errors.append(str(error)))
            tab.on('console',lambda msg:csp.append(msg.text) if 'Content Security Policy' in msg.text else None)
        ctx.on('page',observe);return ctx
    ctx=context();page=ctx.new_page();page.goto(base)
    page.get_by_role('textbox',name='Your name (fictional for testing)',exact=True).fill('Fictional Sync Me')
    page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('link',name='Settings',exact=True).click()
    page.get_by_role('button',name='Load sample data',exact=True).click();expect(page.get_by_text('Sample data loaded',exact=True)).to_be_visible()
    page.evaluate('''async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)}),canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));await new Promise(r=>{const tx=d.transaction(['people','photos','captureBatches','deviceSettings'],'readwrite'),s=tx.objectStore('people'),q=s.get('sample-person-anil');q.onsuccess=()=>{const person=q.result;person.last_viewed_at='2026-01-01T00:00:00.000Z';s.put(person);const id=crypto.randomUUID(),base={id,created_at:person.created_at,updated_at:person.updated_at,deleted:false};tx.objectStore('photos').put({...base,person_id:person.id,blob,mime:'image/png',width:2,height:2,bytes:blob.size});tx.objectStore('captureBatches').put({...base,id:crypto.randomUUID(),raw_text:'Fictional history only',created_ids:{},before_snapshots:[{table:'people',id:person.id,values:{notes:'Old note',last_viewed_at:person.last_viewed_at}}],after_snapshots:[],status:'saved'});tx.objectStore('deviceSettings').put({key:'fictional-secret-setting',value:'fictional-private-device-value',updated_at:person.updated_at})};tx.oncomplete=r});d.close()}''')
    page.reload()
    def dataset(tab=page):
        return tab.evaluate('''async()=>{const tables=['people','contexts','memberships','relationships','photos','captureBatches'],d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)}),data=await new Promise(r=>{const tx=d.transaction(tables),result={};for(const table of tables){const q=tx.objectStore(table).getAll();q.onsuccess=()=>result[table]=q.result}tx.oncomplete=()=>r(result)});for(const photo of data.photos){photo.data=btoa(String.fromCharCode(...new Uint8Array(await photo.blob.arrayBuffer())));delete photo.blob}d.close();return data}''')
    original=dataset();assert not requests
    def settings(tab):return tab.get_by_role('region',name='Dropbox sync',exact=True)
    def connect(tab):
        panel=settings(tab);panel.get_by_label('Dropbox public App key (not a secret)',exact=True).fill('fictionalappkey123')
        panel.get_by_role('checkbox',name='I completed Appendix B',exact=False).check();panel.get_by_role('button',name='Save Dropbox setup',exact=True).click()
        expect(panel.get_by_text('Public App key saved.',exact=False)).to_be_visible();panel.get_by_role('button',name='Connect Dropbox',exact=True).click()
        expect(tab.get_by_role('heading',name=re.compile(r'^(About you|Settings)$'),level=1)).to_be_visible()
        if tab.get_by_role('heading',name='About you',exact=True,level=1).is_visible():tab.get_by_text('Connect Dropbox for recovery',exact=True).click()
        expect(settings(tab).get_by_text('Connected as Dropbox account dbid:fictional-browser.',exact=False)).to_be_visible()
        assert '?' not in tab.url
    connect(page);assert '/data.json' not in files and dataset()==original
    panel=settings(page);panel.get_by_role('button',name='Prepare local recovery snapshot',exact=True).click()
    expect(panel.get_by_text('Local recovery snapshot is ready.',exact=False)).to_be_visible()
    with page.expect_download() as event:panel.get_by_role('button',name='Download pre-sync JSON backup',exact=False).click()
    target=Path(temp)/'snapshot.json';event.value.save_as(target);snapshot=json.loads(target.read_text());assert snapshot['format']=='people-memory' and len(snapshot['tables']['photos'])==1
    assert 'fictional-private-device-value' not in target.read_text() and 'fictional-browser-refresh' not in target.read_text()
    def last_success(tab=page):
        return tab.evaluate('''async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return new Promise(r=>{const q=d.transaction('deviceSettings').objectStore('deviceSettings').getAll();q.onsuccess=()=>{d.close();r(q.result.find(x=>x.key.startsWith('sync:state:'))?.value.lastSuccess??null)}})}''')
    def wait_until(check, tab=page):
        for _ in range(200):
            if check():return
            tab.wait_for_timeout(50)
        print(tab.locator('body').inner_text())
        raise AssertionError('Mocked sync did not reach the expected state')
    def enable(tab):
        panel=settings(tab);panel.get_by_label('Type SYNC to enable this account',exact=True).fill('SYNC');panel.get_by_role('button',name='Enable Dropbox sync',exact=True).click()
        wait_until(lambda:last_success(tab) is not None,tab)
    enable(page);assert dataset()==original
    wire=json.loads(files['/data.json']['data']);assert not any('last_viewed_at' in p for p in wire['tables']['people']);assert 'fictional-private-device-value' not in files['/data.json']['data'].decode()
    assert 'fictional-browser-refresh' not in files['/data.json']['data'].decode()
    uploaded=len(uploads);settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('button',name='Sync now',exact=True)).to_be_enabled();assert len(uploads)==uploaded
    # A fresh isolated device restores through first-launch Dropbox setup without creating a second Me.
    second=context();other=second.new_page();other.goto(base);other.get_by_text('Connect Dropbox for recovery',exact=True).click();connect(other);enable(other)
    expect(other.get_by_role('link',name='Settings',exact=True)).to_be_visible()
    restored=dataset(other);expected=json.loads(json.dumps(original))
    for row in expected['people']:row.pop('last_viewed_at',None)
    for batch in expected['captureBatches']:
        for kind in ['before_snapshots','after_snapshots']:
            for snap in batch[kind]:snap['values'].pop('last_viewed_at',None)
    assert restored==expected
    assert not other.evaluate('''async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return new Promise(r=>{const q=d.transaction('deviceSettings').objectStore('deviceSettings').get('fictional-secret-setting');q.onsuccess=()=>{d.close();r(!!q.result)}})}''')
    settings(other).get_by_role('button',name='Pause sync',exact=True).click();second.close()
    # Independent edits share an established baseline; future skew cannot silently erase the losing text.
    remote=json.loads(files['/data.json']['data']);person=next(p for p in remote['tables']['people'] if p['id']=='sample-person-anil');person['notes']='Remote independent fictional note';person['updated_at']='2099-01-01T00:00:00.000Z';put('/data.json',json.dumps(remote).encode())
    page.goto(base+'#/people/sample-person-anil/edit');page.get_by_role('textbox',name='Notes',exact=True).fill('Local independent fictional note');page.get_by_role('button',name='Save',exact=True).click();expect(page.get_by_role('heading',name='Anil Joshi',exact=True)).to_be_visible();page.get_by_role('link',name='Settings',exact=True).click()
    settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('heading',name='Review sync conflicts (1)',exact=True)).to_be_visible()
    copy=settings(page).locator('details').filter(has_text='people: Anil Joshi').first;copy.locator('summary').click()
    expect(copy.get_by_text('Other preserved version',exact=False)).to_be_visible()
    with page.expect_download() as event:copy.get_by_role('button',name='Download both versions',exact=True).click()
    target=Path(temp)/'conflict.json';event.value.save_as(target);saved=json.loads(target.read_text());assert saved['winner']['notes']=='Remote independent fictional note' and saved['loser']['notes']=='Local independent fictional note'
    copy.get_by_role('button',name='Recover other version',exact=True).click()
    wait_until(lambda:next(p for p in dataset()['people'] if p['id']=='sample-person-anil')['notes']=='Local independent fictional note')
    # Real browser Blob update via the ordinary editor; remote deletion removes only the current mirror.
    page.goto(base+'#/people/sample-person-anil/edit');page.get_by_role('button',name='Remove photo',exact=True).click();page.get_by_role('button',name='Save',exact=True).click();expect(page.get_by_role('heading',name='Anil Joshi',exact=True)).to_be_visible();page.get_by_role('link',name='Settings',exact=True).click()
    settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('button',name='Sync now',exact=True)).to_be_enabled()
    assert '/photos/sample-person-anil.jpg' not in files and any(p.startswith('/photos/versions/') for p in files)
    assert json.loads(files['/data.json']['data'])['tables']['photos'][0]['deleted'] is True
    # Interrupted publication must leave the successful timestamp unchanged and local notes intact.
    old=last_success();fault['path']='/data.json'
    page.goto(base+'#/people/sample-person-anil/edit');page.get_by_role('textbox',name='Notes',exact=True).fill('Fictional interrupted upload edit');page.get_by_role('button',name='Save',exact=True).click();expect(page.get_by_role('heading',name='Anil Joshi',exact=True)).to_be_visible();page.get_by_role('link',name='Settings',exact=True).click();settings(page).get_by_role('button',name='Sync now',exact=True).click()
    expect(settings(page).get_by_role('alert').first).to_contain_text('offline, blocked or timed out');assert last_success()==old
    assert next(p for p in dataset()['people'] if p['id']=='sample-person-anil')['notes']=='Fictional interrupted upload edit'
    fault['path']=None;settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('button',name='Sync now',exact=True)).to_be_enabled();assert last_success()!=old
    # Malformed remote pauses import and leaves the full valid local dataset intact.
    valid=files['/data.json']['data'];before=dataset();put('/data.json',b'{bad-json');settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('alert').first).to_contain_text('malformed or unsupported');assert dataset()==before
    put('/data.json',valid);settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('button',name='Sync now',exact=True)).to_be_enabled()
    # Offline changes remain local; the online event retries safely without a forced overwrite.
    ctx.set_offline(True);page.wait_for_function('navigator.onLine === false');count=len(requests);settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('alert').first).to_contain_text('Offline');assert len(requests)==count
    page.goto(base+'#/people/sample-person-anil/edit');page.get_by_role('textbox',name='Notes',exact=True).fill('Fictional offline queued edit');page.get_by_role('button',name='Save',exact=True).click();expect(page.get_by_role('heading',name='Anil Joshi',exact=True)).to_be_visible();page.get_by_role('link',name='Settings',exact=True).click();assert len(requests)==count
    ctx.set_offline(False);page.wait_for_function('navigator.onLine')
    settings(page).get_by_role('button',name='Sync now',exact=True).click();expect(settings(page).get_by_role('button',name='Sync now',exact=True)).to_be_enabled()
    wait_until(lambda:any(p.get('notes')=='Fictional offline queued edit' for p in json.loads(files['/data.json']['data'])['tables']['people']))
    settings(page).get_by_role('button',name='Disconnect Dropbox',exact=True).click();expect(settings(page).get_by_role('button',name='Connect Dropbox',exact=True)).to_be_visible()
    assert not errors,errors
    assert not external,external
    assert not csp,csp
    print('Phase 9 mocked Dropbox browser checks passed: PKCE round trip/state/header tokens, disabled setup, pre-sync JSON recovery download, revision/hash uploads, repeat idempotence, fresh-device restore with photo/history equality and private-setting isolation, concurrent-edit recovery, real-Blob photo deletion, interrupted/malformed/offline retry safety, disconnect, and no unplanned requests/CSP/page errors. Live Dropbox verification was NOT performed.')
    browser.close()
server.shutdown()
