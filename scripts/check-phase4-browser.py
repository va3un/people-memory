# Phase 4 acceptance uses only disposable storage, fictional records and generated photos.
# Requires free Python Playwright and Chromium; run after a production build.
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
with sync_playwright() as p:
    browser = p.chromium.launch(**({'executable_path': shutil.which('chromium')} if shutil.which('chromium') else {}), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    page = context.new_page()
    errors, external, csp = [], [], []
    context.on('page', lambda tab: tab.on('pageerror', lambda error: errors.append(str(error))))
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda request: external.append(request.url) if not request.url.startswith(('http://127.0.0.1', 'blob:', 'data:')) else None)
    page.on('console', lambda message: csp.append(message.text) if 'Content Security Policy' in message.text else None)
    page.goto(base)
    expect(page.get_by_role('heading', name='About you', exact=True)).to_be_visible()
    # Seed the pre-Phase-4 state without marking anyone Me. No existing browser profile is used.
    old = page.evaluate('''async () => {
      const d=await new Promise((r,j)=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})
      const common={created_at:'2020-01-01T00:00:00.000Z',updated_at:'2020-01-01T00:00:00.000Z',deleted:false,nicknames:[],phones:[],is_me:false}
      const anil={...common,id:crypto.randomUUID(),full_name:'Anil Joshi',display_name:'Anil',gender:'male',category:'Friend'}
      const meera={...common,id:crypto.randomUUID(),full_name:'Meera Joshi',display_name:'Meera',gender:'female',notes:'Fictional Phase 3 note'}
      const link={id:crypto.randomUUID(),created_at:common.created_at,updated_at:common.updated_at,deleted:false,person_id:anil.id,relative_id:meera.id,type:'friend'}
      const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;canvas.getContext('2d').fillRect(0,0,32,32)
      const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg'))
      const photo={id:crypto.randomUUID(),person_id:meera.id,created_at:common.created_at,updated_at:common.updated_at,deleted:false,blob,mime:'image/jpeg',width:32,height:32,bytes:blob.size}
      await new Promise((r,j)=>{const tx=d.transaction(['people','photos','relationships'],'readwrite');tx.objectStore('people').put(anil);tx.objectStore('people').put(meera);tx.objectStore('photos').put(photo);tx.objectStore('relationships').put(link);tx.oncomplete=r;tx.onabort=()=>j(tx.error)})
      return {anil,meera,link,photoId:photo.id,photoBytes:photo.bytes}
    }''')
    def rows(table):
        return page.evaluate('''async table=>{const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=d.transaction(table).objectStore(table).getAll();q.onsuccess=()=>r(q.result.map(({blob,...record})=>record))})}''',table)
    def choose_new_context(name, role='Student'):
        sheet = page.get_by_role('dialog', name='Choose a context', exact=True)
        sheet.get_by_role('button', name='Create context', exact=True).click()
        sheet.get_by_role('textbox', name='Context name', exact=True).fill(name)
        sheet.get_by_label('Kind', exact=True).select_option('school')
        sheet.get_by_role('textbox', name='Role (optional)', exact=True).fill(role)
        sheet.get_by_role('button', name='Use this context', exact=True).click()
    page.get_by_role('textbox', name='Your name (fictional for testing)', exact=True).fill('Fictional Browser Me')
    page.get_by_role('button', name='Add a context (optional)', exact=True).click()
    choose_new_context('Fictional School')
    assert rows('contexts') == []
    page.get_by_role('button', name='Continue', exact=True).click()
    expect(page.get_by_role('heading', name='Search', exact=True)).to_be_visible()
    people = rows('people')
    assert next(person for person in people if person['id'] == old['anil']['id']) == old['anil']
    assert next(person for person in people if person['id'] == old['meera']['id']) == old['meera']
    assert rows('relationships') == [old['link']]
    assert rows('photos')[0]['bytes'] == old['photoBytes']
    assert len([person for person in people if person['is_me']]) == 1
    expect(page.locator('main').get_by_text('Fictional Browser Me', exact=True)).to_have_count(0)
    school_id = rows('contexts')[0]['id']
    page.goto(base + '#/people/' + old['meera']['id'])
    expect(page.locator('main img')).to_have_js_property('naturalWidth', 32)
    # Existing relative creation must produce one spouse row, regardless of direction.
    page.get_by_role('button', name='Add relative', exact=True).click()
    sheet = page.get_by_role('dialog', name='Add relative', exact=True)
    sheet.get_by_role('radio', name='Anil Joshi', exact=True).check()
    sheet.get_by_role('combobox', name='Relationship type', exact=True).select_option('spouse')
    expect(sheet.get_by_text('Anil Joshi is the husband of Meera Joshi', exact=True)).to_be_visible()
    sheet.get_by_role('button', name='Save relationship', exact=True).click()
    page.get_by_role('link', name='Husband: Anil Joshi', exact=True).click()
    expect(page.get_by_role('link', name='Wife: Meera Joshi', exact=True)).to_be_visible()
    page.get_by_role('button', name='Add relative', exact=True).click()
    sheet = page.get_by_role('dialog', name='Add relative', exact=True)
    sheet.get_by_role('radio', name='Meera Joshi', exact=True).check()
    sheet.get_by_role('combobox', name='Relationship type', exact=True).select_option('spouse')
    sheet.get_by_role('button', name='Save relationship', exact=True).click()
    assert len([row for row in rows('relationships') if row['type'] == 'spouse']) == 1
    page.get_by_role('link', name='Wife: Meera Joshi', exact=True).click()
    page.get_by_role('button', name='Add relative', exact=True).click()
    sheet = page.get_by_role('dialog', name='Add relative', exact=True)
    sheet.get_by_role('button', name='Create person', exact=True).click()
    sheet.get_by_role('textbox', name="New person's name", exact=True).fill('Fictional Child')
    sheet.get_by_label("New person's gender", exact=True).select_option('female')
    sheet.get_by_role('combobox', name='Relationship type', exact=True).select_option('child')
    sheet.get_by_role('button', name='Save relationship', exact=True).click()
    page.get_by_role('link', name='Daughter: Fictional Child', exact=True).click()
    expect(page.get_by_role('link', name='Mother: Meera Joshi', exact=True)).to_be_visible()
    page.get_by_role('link', name='Mother: Meera Joshi', exact=True).click()
    # Profile contexts are shared with first-run setup and are idempotent for identical roles.
    for role in ['Parent', 'Teacher', 'Parent']:
        page.get_by_role('button', name='Add to a context', exact=True).click()
        sheet = page.get_by_role('dialog', name='Choose a context', exact=True)
        sheet.get_by_role('radio', name='Fictional School (School)', exact=True).check()
        sheet.get_by_role('textbox', name='Role (optional)', exact=True).fill(role)
        sheet.get_by_role('button', name='Use this context', exact=True).click()
        expect(page.get_by_role('link', name=f'Fictional School ({role})', exact=True)).to_be_visible()
    assert len(rows('contexts')) == 1 and len(rows('memberships')) == 3
    # Cancellation must not create a stray context or person.
    before = (len(rows('contexts')), len(rows('people')))
    page.get_by_role('button', name='Add to a context', exact=True).click()
    sheet = page.get_by_role('dialog', name='Choose a context', exact=True)
    sheet.get_by_role('button', name='Create context', exact=True).click()
    sheet.get_by_role('textbox', name='Context name', exact=True).fill('Fictional Cancelled Context')
    sheet.get_by_role('button', name='Cancel', exact=True).click()
    page.get_by_role('button', name='Add relative', exact=True).click()
    sheet = page.get_by_role('dialog', name='Add relative', exact=True)
    sheet.get_by_role('button', name='Create person', exact=True).click()
    sheet.get_by_role('textbox', name="New person's name", exact=True).fill('Fictional Cancelled Relative')
    sheet.get_by_role('button', name='Cancel', exact=True).click()
    assert before == (len(rows('contexts')), len(rows('people')))
    page.get_by_role('link', name='Browse', exact=True).click()
    page.get_by_role('link', name='Fictional School School 2 people', exact=False).click()
    expect(page.get_by_role('heading', name='Fictional School', exact=True)).to_be_visible()
    expect(page.get_by_text('2 people', exact=True)).to_be_visible()
    expect(page.get_by_text('Parent', exact=True)).to_be_visible()
    expect(page.get_by_text('Teacher', exact=True)).to_be_visible()
    page.get_by_role('link', name='Add person here', exact=True).click()
    expect(page.get_by_text('Fictional School', exact=True)).to_be_visible()
    page.get_by_role('textbox', name='Full name', exact=True).fill('Fictional Context Add')
    page.get_by_role('button', name='Save', exact=True).click()
    page.get_by_role('link', name='View saved person', exact=True).click()
    expect(page.get_by_role('link', name='Fictional School', exact=True)).to_be_visible()
    assert len(rows('memberships')) == 4
    page.get_by_role('link', name='Browse', exact=True).click()
    page.get_by_role('tab', name='Categories', exact=True).click()
    page.get_by_role('link', name='Friend 1 person', exact=False).click()
    expect(page.get_by_role('heading', name='Friend', exact=True)).to_be_visible()
    expect(page.get_by_role('link', name='Anil Joshi', exact=False)).to_be_visible()
    # All Phase 4 data and navigation work offline after caching; setup must not reappear.
    page.evaluate('navigator.serviceWorker.ready.then(registration => registration.active.state)')
    page.reload()
    context.set_offline(True)
    offline = context.new_page()
    offline.goto(base + '#/settings')
    offline.get_by_role('link', name='Open your Me profile', exact=True).click()
    expect(offline.get_by_role('heading', name='Fictional Browser Me', exact=True)).to_be_visible()
    expect(offline.get_by_role('button', name='Delete person', exact=True)).to_have_count(0)
    offline.get_by_role('button', name='Add to a context', exact=True).click()
    offline.get_by_role('button', name='Create context', exact=True).click()
    offline.get_by_role('textbox', name='Context name', exact=True).fill('Fictional Offline Society')
    offline.get_by_label('Kind', exact=True).select_option('society')
    offline.get_by_role('textbox', name='Role (optional)', exact=True).fill('Resident')
    offline.get_by_role('button', name='Use this context', exact=True).click()
    expect(offline.get_by_role('link', name='Fictional Offline Society (Resident)', exact=True)).to_be_visible()
    offline.reload()
    expect(offline.get_by_role('link', name='Fictional Offline Society (Resident)', exact=True)).to_be_visible()
    assert not errors, errors
    assert not external, external
    assert not csp, csp
    print(json.dumps({'passed': ['Phase 3 record/photo/link preservation', 'Me with optional context', 'Me hidden from normal directory', 'one-row reciprocal spouse links', 'create relative', 'profile context roles and duplicate prevention', 'cancel without writes', 'Browse counts and context members', 'Add person here', 'category browsing', 'offline reopen and context creation', 'no repeated onboarding', 'CSP and no third-party requests'], 'errors': errors, 'external_requests': external}, indent=2))
    browser.close()
server.shutdown()
