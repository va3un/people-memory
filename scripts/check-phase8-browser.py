# Production browser regressions use intercepted providers and fictional keys/data; never a live AI service.
import functools
import http.server
import json
import shutil
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect, Error

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/people-memory'))
    def log_message(self, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler,directory=str(Path(__file__).resolve().parents[1]/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/people-memory/'
golden=json.loads((Path(__file__).resolve().parents[1]/'src/test/captureGolden.json').read_text())
passage="Sanket Bobhate is my friend from school, we also studied in college together. His wife's name is Tarika Gupta and their daughter's name is Kiara."
key='fictional-browser-key-only'
with sync_playwright() as p:
    browser=p.chromium.launch(**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844})
    errors, external, csp, calls, pending=[],[],[],[],[]
    mode={'value':'ok'}
    def provider(route,request):
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type,x-goog-api-key','Access-Control-Allow-Methods':'POST,OPTIONS'}
        if request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
        calls.append({'url':request.url,'headers':request.headers,'body':json.loads(request.post_data)})
        if mode['value']=='pending':pending.append(route);return
        if mode['value']=='blocked':route.abort('failed');return
        if mode['value']=='quota':route.fulfill(status=429,headers=headers,json={'error':{'message':key+' must never appear in an error'}});return
        if mode['value']=='model':route.fulfill(status=404,headers=headers,json={'error':{'message':key}});return
        content='not capture JSON' if mode['value']=='bad' else json.dumps(golden)
        body={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':content}]}}]} if 'googleapis' in request.url else {'choices':[{'message':{'content':content},'finish_reason':'stop'}]}
        route.fulfill(status=200,headers=headers,json=body)
    context.route('https://openrouter.ai/api/v1/chat/completions',provider)
    context.route('https://generativelanguage.googleapis.com/**',provider)
    def observe(tab):
        tab.on('pageerror',lambda error:errors.append(str(error)))
        tab.on('console',lambda message:csp.append(message.text) if 'Content Security Policy' in message.text else None)
    context.on('page',observe)
    context.on('request',lambda request:external.append(request.url) if not request.url.startswith(('http://127.0.0.1','https://openrouter.ai/api/v1/chat/completions','https://generativelanguage.googleapis.com/','blob:','data:')) else None)
    page=context.new_page();page.goto(base)
    page.get_by_role('textbox',name='Your name (fictional for testing)',exact=True).fill('Fictional Hidden Me')
    page.get_by_role('button',name='Continue',exact=True).click()
    page.get_by_role('link',name='Settings',exact=True).click()
    page.get_by_role('button',name='Load sample data',exact=True).click()
    expect(page.get_by_text('Sample data loaded',exact=True)).to_be_visible()
    page.evaluate('''async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=d.transaction(['people','memberships'],'readwrite'),q=tx.objectStore('people').getAll();q.onsuccess=()=>{const me=q.result.find(p=>p.is_me&&!p.deleted),now=new Date().toISOString();for(const context_id of ['sample-context-agnel-school','sample-context-icles-college'])tx.objectStore('memberships').put({id:crypto.randomUUID(),person_id:me.id,context_id,created_at:now,updated_at:now,deleted:false})};tx.oncomplete=r});d.close()}''')
    def rows(table):
        return page.evaluate('''async table=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return new Promise(r=>{const q=d.transaction(table).objectStore(table).getAll();q.onsuccess=()=>{d.close();r(q.result)}})}''',table)
    def directory():return {table:rows(table) for table in ['people','contexts','memberships','relationships','captureBatches']}
    original=directory()
    settings=page.get_by_role('region',name='Automatic provider settings',exact=True)
    expect(settings.get_by_role('checkbox',name='Enable optional automatic capture',exact=True)).not_to_be_checked()
    assert not calls
    page.get_by_role('link',name='Add',exact=True).click()
    page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(passage)
    auto=page.get_by_role('region',name='Automatic capture',exact=True)
    auto.get_by_role('button',name='Draft it',exact=True).click()
    expect(auto.get_by_role('alert')).to_contain_text('off')
    auto.get_by_role('button',name='Use copy and paste',exact=True).click()
    expect(page.get_by_role('button',name='Copy prompt',exact=True)).to_be_enabled()
    assert not calls
    page.get_by_role('button',name='Discard draft',exact=True).click()
    page.get_by_role('link',name='Settings',exact=True).click()
    settings=page.get_by_role('region',name='Automatic provider settings',exact=True)
    settings.get_by_role('checkbox',name='Enable optional automatic capture',exact=True).check()
    settings.get_by_label('API key (device only)',exact=True).fill(key)
    expect(settings.get_by_label('API key (device only)',exact=True)).to_have_attribute('type','password')
    settings.get_by_label('Model name',exact=True).fill('fictional/paid')
    settings.get_by_role('checkbox',name='I use a free account',exact=False).check()
    settings.get_by_role('button',name='Save provider settings',exact=True).click()
    expect(settings.get_by_role('alert')).to_contain_text('Paid models')
    settings.get_by_label('Model name',exact=True).fill('fictional/model:free')
    settings.get_by_role('button',name='Save provider settings',exact=True).click()
    expect(settings.get_by_text('Provider settings saved.',exact=False)).to_be_visible()
    assert not calls
    test=settings.get_by_role('region',name='Provider Test',exact=True)
    test.get_by_role('button',name='Test',exact=True).click()
    dialog=page.get_by_role('dialog',name='Share with AI provider?',exact=True)
    expect(dialog.get_by_text('Your passage may contain',exact=False)).to_be_visible()
    dialog.get_by_role('button',name='Cancel consent',exact=True).click()
    expect(test.get_by_role('status')).to_contain_text('Nothing was sent')
    assert not calls and directory()==original
    test.get_by_role('button',name='Test',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='I agree, send this fictional test',exact=True).click()
    expect(test.get_by_role('status')).to_contain_text('Provider Test passed')
    assert len(calls)==1 and directory()==original
    assert 'Fictional Test Person' in calls[0]['body']['messages'][0]['content']
    assert 'Fictional Hidden Me' not in json.dumps(calls[0]['body'])
    assert 'Sanket Bobhate' not in json.dumps(calls[0]['body'])
    assert key not in calls[0]['url'] and key not in json.dumps(calls[0]['body'])
    assert calls[0]['headers']['authorization']=='Bearer '+key
    assert calls[0]['body']['provider']['allow_fallbacks'] is False and 'models' not in calls[0]['body']
    page.get_by_role('link',name='Add',exact=True).click()
    page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(passage)
    page.get_by_role('button',name='Draft it',exact=True).click()
    expect(page.get_by_role('heading',name='Review capture',exact=True)).to_be_visible()
    assert len(calls)==2 and directory()==original
    assert passage in calls[-1]['body']['messages'][0]['content'] and 'Fictional Hidden Me' not in json.dumps(calls[-1]['body'])
    page.get_by_role('button',name='Save 3 people and 6 links',exact=True).click()
    expect(page.get_by_text('Capture saved. Undo is available',exact=False)).to_be_visible()
    current=directory();assert len(current['people'])==len(original['people'])+3
    for name,records in original.items():
        after={row['id']:row for row in current[name]};assert all(after[row['id']]==row for row in records)
    # Errors keep the passage and directory intact, offer copy/paste, and never echo raw provider errors.
    for failure,message in [('quota','quota'),('bad','invalid capture JSON'),('blocked','blocked')]:
        mode['value']=failure
        page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(passage)
        before=len(calls)
        page.get_by_role('button',name='Draft it',exact=True).click()
        auto=page.get_by_role('region',name='Automatic capture',exact=True)
        expect(auto.get_by_role('alert')).to_contain_text(message)
        assert directory()==current and len(calls)==before+1
        assert key not in page.locator('body').inner_text()
        auto.get_by_role('button',name='Use copy and paste',exact=True).click()
        expect(page.get_by_role('button',name='Copy prompt',exact=True)).to_be_enabled()
    before=len(calls);page.get_by_role('button',name='Draft it',exact=True).click()
    expect(auto.get_by_role('alert')).to_contain_text('successful provider Test')
    assert len(calls)==before
    page.get_by_role('button',name='Discard draft',exact=True).click()
    page.get_by_role('link',name='Settings',exact=True).click()
    settings=page.get_by_role('region',name='Automatic provider settings',exact=True)
    settings.get_by_label('AI provider',exact=True).select_option('gemini')
    settings.get_by_label('API key (device only)',exact=True).fill(key)
    settings.get_by_label('Model name',exact=True).fill('gemini-fictional-free')
    settings.get_by_role('checkbox',name='I use a free account',exact=False).check()
    settings.get_by_role('button',name='Save provider settings',exact=True).click()
    expect(settings.get_by_text('Provider settings saved.',exact=False)).to_be_visible()
    mode['value']='ok';test=settings.get_by_role('region',name='Provider Test',exact=True)
    test.get_by_role('button',name='Test',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='I agree, send this fictional test',exact=True).click()
    expect(test.get_by_role('status')).to_contain_text('Provider Test passed')
    assert calls[-1]['url'].startswith('https://generativelanguage.googleapis.com/v1beta/models/gemini-fictional-free:generateContent')
    assert calls[-1]['headers']['x-goog-api-key']==key and key not in calls[-1]['url']
    page.get_by_role('link',name='Add',exact=True).click()
    page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(passage)
    mode['value']='pending';page.get_by_role('button',name='Draft it',exact=True).click()
    expect(page.get_by_role('button',name='Cancel request',exact=True)).to_be_visible()
    page.get_by_role('button',name='Cancel request',exact=True).click()
    expect(page.get_by_role('region',name='Automatic capture',exact=True).get_by_role('alert')).to_contain_text('cancelled')
    assert directory()==current
    # Cross-tab removal revokes permission and prevents a late answer from restoring credentials or applying a draft.
    page.get_by_role('region',name='Automatic capture',exact=True).get_by_role('button',name='Use copy and paste',exact=True).click()
    page.get_by_role('button',name='Draft it',exact=True).click()
    expect(page.get_by_role('button',name='Cancel request',exact=True)).to_be_visible()
    other=context.new_page();other.goto(base+'#/settings')
    other.get_by_role('button',name='Remove provider key and permission',exact=True).click()
    expect(other.get_by_text('Provider key and permission removed.',exact=False)).to_be_visible()
    expect(page.get_by_role('region',name='Automatic capture',exact=True).get_by_role('alert')).to_contain_text('cancelled')
    assert not any(row['key']=='capture:automatic' for row in rows('deviceSettings'))
    for route in pending:
        try:route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*'},json={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':json.dumps(golden)}]}}]})
        except Error:pass
    assert directory()==current
    page.get_by_role('button',name='Discard draft',exact=True).click()
    page.evaluate('navigator.serviceWorker.ready')
    context.set_offline(True);page.reload()
    page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(passage)
    page.get_by_role('textbox',name='Paste the chatbot answer',exact=True).fill(json.dumps(golden))
    page.get_by_role('button',name='Read it',exact=True).click()
    expect(page.get_by_role('heading',name='Review capture',exact=True)).to_be_visible()
    assert directory()==current
    assert not errors,errors
    assert not external,external
    assert not csp,csp
    print('Phase 8 mocked-provider browser checks passed: optional/off/no-key behavior, free-only settings, cancelled consent sends nothing, one-time consent, both provider wire formats, no directory payload or key leakage, shared review/save, quota/bad-JSON/blocked fallbacks, cancel/late response, cross-tab revocation, offline copy/paste, and Phase 3–7 preservation. Live provider verification was NOT performed.')
    browser.close()
server.shutdown()
