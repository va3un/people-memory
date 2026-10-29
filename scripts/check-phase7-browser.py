# Production Smart Capture rehearsals use only fictional JSON, disposable storage and free Chromium.
import functools
import http.server
import json
import shutil
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/people-memory'))
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(Path(__file__).resolve().parents[1] / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/people-memory/'
golden = json.loads((Path(__file__).resolve().parents[1] / 'src/test/captureGolden.json').read_text())
passage = "Sanket Bobhate is my friend from school, we also studied in college together. His wife's name is Tarika Gupta and their daughter's name is Kiara."
with sync_playwright() as p:
    browser = p.chromium.launch(**({'executable_path': shutil.which('chromium')} if shutil.which('chromium') else {}), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, permissions=['clipboard-read', 'clipboard-write'])
    errors, external, csp = [], [], []
    context.on('page', lambda tab: tab.on('pageerror', lambda error: errors.append(str(error))))
    context.on('request', lambda request: external.append(request.url) if not request.url.startswith(('http://127.0.0.1', 'blob:', 'data:')) else None)
    page = context.new_page()
    page.on('console', lambda message: csp.append(message.text) if 'Content Security Policy' in message.text else None)
    page.goto(base)
    page.get_by_role('textbox', name='Your name (fictional for testing)', exact=True).fill('Fictional Capture Me')
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_role('link', name='Settings', exact=True).click()
    page.get_by_role('button', name='Load sample data', exact=True).click()
    expect(page.get_by_text('Sample data loaded', exact=True)).to_be_visible()
    def rows(table):
        return page.evaluate('''async table=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=d.transaction(table).objectStore(table).getAll();q.onsuccess=()=>{d.close();r(q.result)}})}''',table)
    def directory():
        return {table: rows(table) for table in ['people','contexts','memberships','relationships']}
    # Sample loading correctly preserves the custom Me, so explicitly link the fictional Me to sample contexts.
    page.evaluate('''async()=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=d.transaction(['people','memberships'],'readwrite'),q=tx.objectStore('people').getAll();q.onsuccess=()=>{const me=q.result.find(p=>p.is_me&&!p.deleted),now=new Date().toISOString();for(const context_id of ['sample-context-agnel-school','sample-context-icles-college'])tx.objectStore('memberships').put({id:crypto.randomUUID(),person_id:me.id,context_id,role:'Student',created_at:now,updated_at:now,deleted:false})};tx.oncomplete=r});d.close()}''')
    page.get_by_role('link', name='Add', exact=True).click()
    expect(page.get_by_role('heading', name='Smart capture', exact=True)).to_be_visible()
    expect(page.get_by_text('This passage may contain private information', exact=False)).to_be_visible()
    before = directory()
    def read(answer=golden, text=passage):
        page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(text)
        page.get_by_role('textbox',name='Paste the chatbot answer',exact=True).fill(json.dumps(answer, ensure_ascii=False))
        page.get_by_role('button',name='Read it',exact=True).click()
        expect(page.get_by_role('heading',name='Review capture',exact=True)).to_be_visible()
    page.get_by_role('textbox',name='Tell me about someone',exact=True).fill(passage)
    page.get_by_role('button',name='Copy prompt',exact=True).click()
    prompt = page.get_by_role('textbox',name='Prompt to copy',exact=True).input_value()
    assert passage in prompt and 'OFF.' in prompt
    assert 'Anil Joshi' not in prompt and 'Fictional Capture Me' not in prompt and 'Fr. Agnel School' not in prompt
    assert page.evaluate('navigator.clipboard.readText()') == prompt
    page.get_by_role('textbox',name='Paste the chatbot answer',exact=True).fill('{broken')
    page.get_by_role('button',name='Read it',exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Nothing was saved')
    assert directory() == before
    read()
    expect(page.get_by_label('Context choice c1',exact=True)).to_have_value('sample-context-agnel-school')
    expect(page.get_by_label('Context choice c2',exact=True)).to_have_value('sample-context-icles-college')
    expect(page.get_by_role('button',name='Save 3 people and 6 links',exact=True)).to_be_visible()
    page.get_by_role('checkbox',name='Include Kiara',exact=True).uncheck()
    expect(page.get_by_role('button',name='Save 2 people and 4 links',exact=True)).to_be_visible()
    page.get_by_role('checkbox',name='Include Kiara',exact=True).check()
    page.get_by_role('button',name='Discard review',exact=True).click()
    assert directory() == before
    expect(page.get_by_role('textbox',name='Tell me about someone',exact=True)).to_have_value(passage)
    page.get_by_role('button',name='Read it',exact=True).click()
    expect(page.get_by_role('heading',name='Review capture',exact=True)).to_be_visible()
    sanket=page.get_by_role('article',name='Review Sanket Bobhate',exact=True)
    sanket.get_by_role('textbox',name='Notes',exact=True).fill('Fictional captured note')
    # Inject a late native IndexedDB failure: even preceding person/link writes must roll back.
    page.evaluate('''()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='captureBatches'){IDBObjectStore.prototype.put=put;throw new DOMException('Fictional failed batch save','QuotaExceededError')}return put.apply(this,args)}}''')
    page.get_by_role('button',name='Save 3 people and 6 links',exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Fictional failed batch save')
    assert directory() == before
    page.get_by_role('button',name='Save 3 people and 6 links',exact=True).click()
    expect(page.get_by_text('Capture saved. Undo is available in capture history below.',exact=True)).to_be_visible()
    batches=rows('captureBatches');assert len(batches)==1
    batch=batches[0];assert len(batch['created_ids']['people'])==3 and len(batch['created_ids']['relationships'])==4
    for table, records in before.items():
        current={record['id']:record for record in rows(table)}
        assert all(current[record['id']]==record for record in records)
    # Search reflects relationships immediately. Viewing may change local history, which Undo preserves/ignores safely.
    page.get_by_role('link',name='Search',exact=True).click()
    page.get_by_role('searchbox',name='Search people',exact=True).fill('Tarika')
    expect(page.get_by_role('region',name='Search results',exact=True).get_by_role('link',name='Sanket Bobhate',exact=True)).to_be_visible()
    page.get_by_role('link',name='Add',exact=True).click()
    history=page.get_by_role('region',name='Capture history',exact=True)
    history.locator('summary').first.click()
    history.get_by_role('button',name='Undo this capture',exact=True).click()
    expect(history.get_by_role('status')).to_contain_text('Capture undone')
    for table, records in before.items():
        assert [row for row in rows(table) if not row['deleted']] == [row for row in records if not row['deleted']]
    assert next(b for b in rows('captureBatches') if b['id']==batch['id'])['status']=='undone'
    # Settings remains local; opt-in suggestions are never silently applied and have one-tap revert.
    page.get_by_role('link',name='Settings',exact=True).click()
    toggle=page.get_by_role('checkbox',name='Suggest a spouse surname',exact=False)
    expect(toggle).not_to_be_checked();toggle.check();expect(toggle).to_be_enabled()
    page.get_by_role('link',name='Add',exact=True).click()
    read()
    tarika=page.get_by_role('article',name='Review Tarika Gupta',exact=True)
    expect(tarika.get_by_role('textbox',name='Full name',exact=True)).to_have_value('Tarika Gupta')
    tarika.get_by_role('button',name='Use surname suggestion',exact=True).click()
    changed=page.get_by_role('article',name='Review Tarika Bobhate',exact=True)
    expect(changed.get_by_role('textbox',name='Full name',exact=True)).to_have_value('Tarika Bobhate')
    changed.get_by_role('button',name='Revert surname suggestion',exact=True).click()
    expect(page.get_by_role('article',name='Review Tarika Gupta',exact=True).get_by_role('textbox',name='Full name',exact=True)).to_have_value('Tarika Gupta')
    # Rehearse a long review at large text in dark/reduced-motion mode; it must fit the phone viewport.
    page.emulate_media(color_scheme='dark',reduced_motion='reduce')
    page.evaluate("document.documentElement.style.fontSize='24px'")
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path='/tmp/people-memory-phase7-review.png')
    page.evaluate("document.documentElement.style.fontSize=''")
    page.get_by_role('button',name='Save 3 people and 6 links',exact=True).click()
    expect(page.get_by_text('Capture saved. Undo is available in capture history below.',exact=True)).to_be_visible()
    newest=next(b for b in rows('captureBatches') if b['status']=='saved')
    person_id=newest['created_ids']['people'][0]
    # A later photo/context/relative must protect a created identity. Use an actual ordinary Edit operation here.
    page.goto(base+'#/people/'+person_id+'/edit')
    page.get_by_role('textbox',name='Notes',exact=True).fill('Fictional later edit that Undo must keep')
    page.get_by_role('button',name='Save',exact=True).click()
    expect(page.get_by_role('heading',name='Sanket Bobhate',exact=True)).to_be_visible()
    page.get_by_role('link',name='Add',exact=True).click()
    history=page.get_by_role('region',name='Capture history',exact=True)
    saved=history.locator('details').filter(has_text='(saved)').first
    saved.locator('summary').click()
    current=directory()
    saved.get_by_role('button',name='Undo this capture',exact=True).click()
    expect(history.get_by_role('alert')).to_contain_text('Undo conflict')
    assert directory()==current
    history.get_by_role('button',name='Keep current data',exact=True).click()
    expect(history.get_by_role('status')).to_contain_text('Current data kept')
    # Local copy/paste resolution also works after an offline reload; possible existing matches stay unselected.
    page.evaluate('navigator.serviceWorker.ready')
    context.set_offline(True);page.reload()
    read()
    for ref in ['p1','p2','p3']:
        expect(page.get_by_label('Identity for '+ref,exact=True)).to_have_value('')
    page.get_by_role('button',name='Save 3 people and 6 links',exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Choose use existing or create new')
    page.get_by_role('button',name='Discard draft',exact=True).click()
    page.get_by_role('link',name='Use the form instead',exact=True).click()
    expect(page.get_by_role('textbox',name='Full name',exact=True)).to_be_visible()
    assert not errors, errors
    assert not external, external
    assert not csp, csp
    print('Phase 7 browser checks passed: privacy/copy without directory payload, invalid answer, local Me contexts, editable/skip review, atomic failure/retry, search, persistent safe/conflicting Undo, surname opt-in/revert, offline resolution, Quick Add, enlarged text/dark/reduced-motion, and no external requests/CSP/page errors.')
    browser.close()
server.shutdown()
