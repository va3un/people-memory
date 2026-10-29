# Phase 5 browser acceptance uses disposable local storage and fictional data only.
# Requires free Python Playwright and Chromium; build production files first.
import base64
import functools
import http.server
import json
import shutil
import threading
import time
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
    errors, external, csp = [], [], []
    def observe(tab):
        tab.on('pageerror', lambda error: errors.append(str(error)))
        tab.on('console', lambda message: csp.append(message.text) if 'Content Security Policy' in message.text else None)
    context.on('page', observe)
    context.on('request', lambda request: external.append(request.url) if not request.url.startswith(('http://127.0.0.1', 'blob:', 'data:')) else None)
    page = context.new_page()
    page.goto(base)
    page.get_by_role('textbox', name='Your name (fictional for testing)', exact=True).fill('Fictional Browser Me')
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_role('link', name='Settings', exact=True).click()
    page.get_by_role('button', name='Load sample data', exact=True).click()
    expect(page.get_by_text('Sample data loaded', exact=True)).to_be_visible()
    page.get_by_role('link', name='Search', exact=True).click()
    search = page.get_by_role('searchbox', name='Search people', exact=True)
    results = page.get_by_role('region', name='Search results', exact=True)
    expect(search).to_be_focused()
    def rows(table):
        return page.evaluate('''async table => {const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=d.transaction(table).objectStore(table).getAll();q.onsuccess=()=>r(q.result.map(({blob,...record})=>record))})}''', table)
    before = rows('people')
    device_settings_before = rows('deviceSettings')
    search.fill('Meera')
    expect(results.locator('li').first.get_by_role('link')).to_have_accessible_name('Meera Joshi')
    expect(results.get_by_text('Husband of Meera Joshi', exact=True)).to_be_visible()
    expect(results.get_by_text('Daughter of Meera Joshi', exact=True)).to_be_visible()
    search.fill('meera husband')
    expect(results.locator('li')).to_have_count(1)
    expect(results.get_by_role('link', name='Anil Joshi', exact=True)).to_be_visible()
    search.fill('Lionbridge')
    expect(results.locator('li')).to_have_count(2)
    expect(results.get_by_text('Colleague at Lionbridge', exact=True)).to_have_count(2)
    search.fill('Sagar Heights')
    expect(results.get_by_text('Lives in Sagar Heights Society (Resident)', exact=True)).to_be_visible()
    for clue in ['Mera', 'Meerra', 'मीरा']:
        search.fill(clue)
        expect(results.locator('li').first.get_by_role('link')).to_have_accessible_name('Meera Joshi')
    search.fill('7B')
    expect(results.get_by_role('link', name='Sneha Patil', exact=True)).to_be_visible()
    expect(results.get_by_text('Parent in Class 7B parents', exact=True)).to_be_visible()
    search.fill('Borli')
    expect(results.get_by_role('link', name='Sunil Joshi', exact=True)).to_be_visible()
    search.fill('Fictional Browser Me')
    expect(results.locator('li')).to_have_count(0)
    search.fill('!!!')
    expect(results.get_by_text('No people match these clues.', exact=False)).to_be_visible()
    assert rows('people') == before
    page.get_by_role('link', name='Add', exact=True).click()
    page.get_by_role('link', name='Use the form instead', exact=True).click()
    page.get_by_role('textbox', name='Full name', exact=True).fill('Tarika Gupta')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(page.get_by_role('link', name='View saved person', exact=True)).to_be_visible()
    page.get_by_role('link', name='Search', exact=True).click()
    search.fill('Gupta')
    expect(results.get_by_role('link', name='Tarika Gupta', exact=True)).to_be_visible()
    expect(results.get_by_text('Matched name: Tarika Gupta', exact=True)).to_be_visible()
    page.get_by_role('button', name='Clear search', exact=True).click()
    page.get_by_role('region', name='Context shortcuts', exact=True).get_by_role('link', name='Lionbridge (2)', exact=True).click()
    expect(page.get_by_role('heading', name='Lionbridge', exact=True)).to_be_visible()
    page.get_by_role('link', name='Search', exact=True).click()
    search.fill('Meera')
    results.get_by_role('link', name='Meera Joshi', exact=True).click()
    meera_url = page.url
    expect(page.get_by_role('heading', name='Meera Joshi', exact=True)).to_be_visible()
    page.get_by_role('link', name='Back to people', exact=True).click()
    expect(page.get_by_role('region', name='Recently viewed', exact=True).get_by_role('link', name='Meera Joshi', exact=True)).to_be_visible()
    after = next(person for person in rows('people') if person['id'] == 'sample-person-meera')
    original = next(person for person in before if person['id'] == 'sample-person-meera')
    assert after['updated_at'] == original['updated_at']
    assert {key:value for key,value in after.items() if key != 'last_viewed_at'} == original
    # Live cross-tab edits must refresh both the direct person and all one-hop aliases.
    search.fill('Mera')
    second = context.new_page()
    second.goto(meera_url)
    second.get_by_role('link', name='Edit person', exact=True).click()
    second.get_by_role('textbox', name='Full name', exact=True).fill('Fictional Renamed Meera')
    second.get_by_role('textbox', name='Display name', exact=True).fill('Fictional Renamed')
    second.get_by_role('textbox', name='Nicknames (separate with commas)', exact=True).fill('UniqueNewAlias')
    second.get_by_role('button', name='Save', exact=True).click()
    expect(second.get_by_role('heading', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    search.fill('UniqueNewAlias')
    expect(results.locator('li').first.get_by_role('link')).to_have_accessible_name('Fictional Renamed Meera')
    search.fill('uniquenewalias husband')
    expect(results.get_by_text('Husband of Fictional Renamed Meera', exact=True)).to_be_visible()
    second.get_by_role('button', name='Add to a context', exact=True).click()
    sheet = second.get_by_role('dialog', name='Choose a context', exact=True)
    sheet.get_by_role('radio', name='Lionbridge (Organization)', exact=True).check()
    sheet.get_by_role('textbox', name='Role (optional)', exact=True).fill('FictionalMentor')
    sheet.get_by_role('button', name='Use this context', exact=True).click()
    expect(second.get_by_role('link', name='Lionbridge (FictionalMentor)', exact=True)).to_be_visible()
    search.fill('lionbridge fictionalmentor')
    expect(results.get_by_role('link', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    second.get_by_role('button', name='Add relative', exact=True).click()
    sheet = second.get_by_role('dialog', name='Add relative', exact=True)
    sheet.get_by_role('button', name='Create person', exact=True).click()
    sheet.get_by_role('textbox', name="New person's name", exact=True).fill('Fictional New Child')
    sheet.get_by_label("New person's gender", exact=True).select_option('female')
    sheet.get_by_role('combobox', name='Relationship type', exact=True).select_option('child')
    sheet.get_by_role('button', name='Save relationship', exact=True).click()
    second.get_by_role('link', name='Daughter: Fictional New Child', exact=True).click()
    search.fill('fictional new child mother')
    expect(results.get_by_role('link', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    second.get_by_role('button', name='Delete person', exact=True).click()
    second.get_by_role('button', name='Confirm delete', exact=True).click()
    expect(results.locator('li')).to_have_count(0)
    second.get_by_role('button', name='Undo', exact=True).click()
    expect(results.get_by_role('link', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    # Search loads only visible thumbnails; real local photo processing is still available.
    second.goto(meera_url)
    second.get_by_role('link', name='Edit person', exact=True).click()
    png = second.evaluate("() => {const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;canvas.getContext('2d').fillRect(0,0,1200,800);return canvas.toDataURL('image/png').split(',')[1]}")
    second.locator('input[type=file]').set_input_files({'name':'fictional.png','mimeType':'image/png','buffer':base64.b64decode(png)})
    second.get_by_role('button', name='Save', exact=True).click()
    expect(second.get_by_role('heading', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    search.fill('uniquenewalias')
    expect(results.locator('li').first.locator('img')).to_have_js_property('naturalWidth', 600)
    page.evaluate('navigator.serviceWorker.ready.then(registration => registration.active.state)')
    page.reload()
    context.set_offline(True)
    offline = context.new_page()
    offline.goto(base)
    offline_search = offline.get_by_role('searchbox', name='Search people', exact=True)
    offline_results = offline.get_by_role('region', name='Search results', exact=True)
    offline_search.fill('sagar heights')
    expect(offline_results.get_by_role('link', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    offline_search.fill('fictional new child mother')
    expect(offline_results.get_by_role('link', name='Fictional Renamed Meera', exact=True)).to_be_visible()
    offline.get_by_role('link', name='Add', exact=True).click()
    offline.get_by_role('link', name='Use the form instead', exact=True).click()
    offline.get_by_role('textbox', name='Full name', exact=True).fill('Fictional Offline Search')
    offline.get_by_role('button', name='Save', exact=True).click()
    offline.get_by_role('link', name='Search', exact=True).click()
    offline_search.fill('Fictional Offline Search')
    expect(offline_results.get_by_role('link', name='Fictional Offline Search', exact=True)).to_be_visible()
    # Inject only generated fictional records into this disposable profile for the 2,000-person check.
    offline.evaluate('''async () => {
      const d=await new Promise(r=>{const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result)})
      const now=new Date().toISOString()
      await new Promise((r,j)=>{const tx=d.transaction('people','readwrite');for(let i=0;i<2000;i++)tx.objectStore('people').put({id:crypto.randomUUID(),created_at:now,updated_at:now,deleted:false,is_me:false,full_name:`Fictional Scale ${i}`,display_name:'Fictional',nicknames:[],phones:[],gender:'unknown'});tx.oncomplete=r;tx.onabort=()=>j(tx.error)})
    }''')
    # Reopen to build a fresh memory index from the seeded fictional test dataset.
    offline.reload()
    start = time.monotonic()
    offline_search.fill('scale 1999')
    expect(offline_results.get_by_role('link', name='Fictional Scale 1999', exact=True)).to_be_visible(timeout=5000)
    elapsed_ms = round((time.monotonic() - start) * 1000)
    assert elapsed_ms < 5000, elapsed_ms
    offline_search.fill('scale')
    expect(offline_results.get_by_text('2000 people found', exact=True)).to_be_visible()
    expect(offline_results.locator('li')).to_have_count(50)
    offline.get_by_role('button', name='Show more results', exact=True).click()
    expect(offline_results.locator('li')).to_have_count(100)
    assert not errors, errors
    assert not csp, csp
    assert not external, external
    # Search must not persist its index/queries; the sole allowed device row is eviction protection.
    assert all(row['key']=='storage:initialPersistenceRequest' for row in device_settings_before)
    assert rows('deviceSettings') == device_settings_before
    print(json.dumps({'passed':['roadmap clue scenarios','ranked explanations','Devanagari and typos','read-only queries','context shortcuts','local recents without contact timestamp changes','cross-tab name/alias/membership/relationship refresh','delete and Undo refresh','visible JPEG thumbnails','offline reload/add/search','2000-person search and pagination'], 'scale_lookup_ms': elapsed_ms, 'page_errors':errors,'external_requests':external}, indent=2))
    browser.close()
server.shutdown()
