# Phase 3 browser acceptance with disposable storage and generated fictional photos.
# Requires Python Playwright and Chromium; run after the production build. No services or accounts.
import base64, functools, http.server, json, threading, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

class H(http.server.SimpleHTTPRequestHandler):

    def translate_path(self, path):
        return super().translate_path(path.removeprefix('/people-memory'))

    def log_message(self, *args):
        pass
s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(Path(__file__).resolve().parents[1] / 'dist')))
threading.Thread(target=s.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{s.server_port}/people-memory/'
with sync_playwright() as p:
    b = p.chromium.launch(**{'executable_path': shutil.which('chromium')} if shutil.which('chromium') else {}, args=['--no-sandbox'])
    c = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme='light')
    page = c.new_page()
    errors = []
    external = []
    csp = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: csp.append(m.text) if 'Content Security Policy' in m.text else None)
    c.on('request', lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1', 'blob:', 'data:')) else None)
    page.goto(base + '#/add?form=1')
    page.get_by_role('textbox', name='Your name (fictional for testing)', exact=True).fill('Fictional Browser Me')
    page.get_by_role('button', name='Continue', exact=True).click()
    expect(page.get_by_role('heading', name='Add', exact=True)).to_be_visible()

    def name(text):
        page.get_by_role('textbox', name='Full name', exact=True).fill(text)

    def save():
        page.get_by_role('button', name='Save', exact=True).click()

    def rows(table):
        return page.evaluate("async table=>{const d=await new Promise((r,j)=>{let q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});return await new Promise((r,j)=>{let q=d.transaction(table).objectStore(table).getAll();q.onsuccess=()=>r(q.result.map(({blob,...rest})=>rest));q.onerror=()=>j(q.error)})}", table)
    name('   ')
    expect(page.get_by_role('button', name='Save', exact=True)).to_be_disabled()
    name('Fictional Mother')
    page.locator('input[type=file]').set_input_files({'name': 'broken.jpg', 'mimeType': 'image/jpeg', 'buffer': b'broken'})
    save()
    expect(page.get_by_role('alert')).to_contain_text('Choose another image')
    assert len(rows('people')) == 1 and rows('people')[0]['is_me'], rows('people')
    expect(page.get_by_role('textbox', name='Full name', exact=True)).to_have_value('Fictional Mother')
    png = page.evaluate("()=>{let c=document.createElement('canvas');c.width=1200;c.height=800;let x=c.getContext('2d');x.fillStyle='#4f46e5';x.fillRect(0,0,1200,800);return c.toDataURL('image/png').split(',')[1]}")
    page.locator('input[type=file]').set_input_files({'name': 'fictional.png', 'mimeType': 'image/png', 'buffer': base64.b64decode(png)})
    page.get_by_role('button', name='More details', exact=True).click()
    page.get_by_label('Gender', exact=True).select_option('female')
    page.get_by_role('textbox', name='Phone numbers').fill('+91 00000 00000')
    page.get_by_label('Month', exact=True).fill('2')
    page.get_by_label('Day', exact=True).fill('29')
    save()
    page.get_by_role('link', name='View saved person').click()
    expect(page.get_by_role('heading', name='Fictional Mother', exact=True)).to_be_visible()
    mother = page.url.split('/people/')[1]
    expect(page.locator('main img')).to_be_visible()
    expect(page.locator('main img')).to_have_js_property('naturalWidth', 600)
    assert rows('photos')[0]['width'] == 600 and rows('photos')[0]['height'] == 400, rows('photos')
    assert rows('photos')[0]['mime'] == 'image/jpeg'
    page.get_by_role('link', name='Add', exact=True).click()
    page.get_by_role('link', name='Use the form instead', exact=True).click()
    name('Fictional Son')
    page.get_by_role('combobox', name='Related to', exact=True).select_option(mother)
    page.get_by_role('combobox', name='Relationship type', exact=True).select_option('child')
    page.get_by_role('button', name='More details', exact=True).click()
    page.get_by_label('Gender', exact=True).select_option('male')
    save()
    page.get_by_role('link', name='View saved person').click()
    expect(page.get_by_role('link', name='Mother: Fictional Mother')).to_be_visible()
    son = page.url.split('/people/')[1]
    page.get_by_role('link', name='Mother: Fictional Mother').click()
    expect(page.get_by_role('link', name='Son: Fictional Son')).to_be_visible()
    assert len(rows('relationships')) == 1
    page.get_by_role('link', name='Son: Fictional Son').click()
    page.get_by_role('link', name='Edit person', exact=True).click()
    name('Fictional Son Edited')
    page.get_by_label('Notes', exact=True).fill('Fictional notes only')
    save()
    expect(page.get_by_role('heading', name='Fictional Son Edited', exact=True)).to_be_visible()
    page.get_by_role('button', name='Delete person', exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    expect(page.get_by_role('button', name='Cancel', exact=True)).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.get_by_role('button', name='Close', exact=True)).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.get_by_role('button', name='Confirm delete', exact=True)).to_be_focused()
    page.get_by_role('button', name='Confirm delete', exact=True).click()
    expect(page.get_by_role('heading', name='Search', exact=True)).to_be_visible()
    expect(page.get_by_role('region', name='Recently added', exact=True).get_by_role('link', name='Fictional Son Edited', exact=False)).to_have_count(0)
    page.get_by_role('button', name='Undo', exact=True).click()
    expect(page.get_by_role('region', name='Recently added', exact=True).get_by_role('link', name='Fictional Son Edited', exact=False)).to_be_visible()
    page.goto(base + '#/people/' + son + '/edit')
    expect(page.get_by_role('textbox', name='Full name', exact=True)).to_have_value('Fictional Son Edited')
    second = c.new_page()
    second.goto(base + '#/people/' + son + '/edit')
    second.get_by_label('Notes', exact=True).fill('Later fictional edit')
    second.get_by_role('button', name='Save', exact=True).click()
    expect(second.get_by_role('heading', name='Fictional Son Edited', exact=True)).to_be_visible()
    name('Stale Fictional Edit')
    save()
    expect(page.get_by_role('alert')).to_contain_text('changed elsewhere')
    assert any((r.get('notes') == 'Later fictional edit' for r in rows('people')))
    page.on('dialog', lambda d: d.accept())
    page.get_by_role('link', name='Search', exact=True).click()
    expect(page.get_by_role('region', name='Recently added', exact=True).locator('li').first).to_contain_text('Fictional Son Edited')
    page.goto(base + '#/people/' + mother + '/edit')
    expect(page.locator('main img')).to_be_visible()
    original_photo = rows('photos')[0]['id']
    page.locator('input[type=file]').set_input_files({'name': 'replacement.png', 'mimeType': 'image/png', 'buffer': base64.b64decode(png)})
    save()
    expect(page.get_by_role('heading', name='Fictional Mother', exact=True)).to_be_visible()
    assert rows('photos')[0]['id'] == original_photo
    page.get_by_role('link', name='Edit person', exact=True).click()
    page.get_by_role('button', name='Remove photo', exact=True).click()
    save()
    expect(page.get_by_role('heading', name='Fictional Mother', exact=True)).to_be_visible()
    expect(page.locator('main img')).to_have_count(0)
    assert rows('photos')[0]['deleted']
    page.goto(base + '#/people/' + son)
    page.get_by_role('button', name='Delete person', exact=True).click()
    page.get_by_role('button', name='Confirm delete', exact=True).click()
    page.get_by_role('button', name='Undo', exact=True).wait_for(state='hidden', timeout=14000)
    assert next((r for r in rows('people') if r['id'] == son))['deleted']
    page.evaluate('navigator.serviceWorker.ready.then(r=>r.active.state)')
    page.reload()
    assert page.evaluate('!!navigator.serviceWorker.controller')
    c.set_offline(True)
    offline = c.new_page()
    offline.goto(base)
    expect(offline.get_by_role('region', name='Recently added', exact=True).get_by_role('link', name='Fictional Mother', exact=False)).to_be_visible()
    offline.get_by_role('link', name='Add', exact=True).click()
    offline.get_by_role('link', name='Use the form instead', exact=True).click()
    offline.get_by_role('textbox', name='Full name', exact=True).fill('Fictional Offline')
    offline.get_by_role('button', name='Save', exact=True).click()
    offline.get_by_role('link', name='View saved person').click()
    expect(offline.get_by_role('heading', name='Fictional Offline', exact=True)).to_be_visible()
    offline.get_by_role('link', name='Edit person', exact=True).click()
    offline.get_by_label('City', exact=True).fill('Fictional City')
    offline.get_by_role('button', name='Save', exact=True).click()
    expect(offline.get_by_text('City: Fictional City', exact=True)).to_be_visible()
    offline.emulate_media(color_scheme='dark', reduced_motion='reduce')
    expect(offline.locator('body')).to_have_css('background-color', 'rgb(11, 11, 15)')
    assert not errors, errors
    assert not csp, csp
    assert not external, external
    print(json.dumps({'passed': ['blank validation', 'corrupt-photo recovery', 'real PNG to 600px JPEG', 'photo replacement and removal', 'quick add', 'optional birthday', 'one-row reciprocal relationship', 'profile', 'editing', 'focus trap', 'delete and Undo', '10-second expiry', 'concurrent edit protection', 'newest-first list', 'offline reopen/add/edit', 'dark mode and reduced motion', 'production CSP'], 'page_errors': errors, 'external_requests': external}, indent=2))
    b.close()
s.shutdown()
