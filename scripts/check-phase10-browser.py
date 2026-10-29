# Production responsive/design regression. Only disposable fictional browser storage is used.
# Run after the Pages-base production build; requires free Python Playwright and Chromium.
import base64
import functools
import http.server
import json
import shutil
import tempfile
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

# Inspect actual rendered bounds, including controls reached by scrolling. Small native checkboxes
# are measured through their whole clickable label. Decorative/invisible controls are excluded.
def layout(page):
    result = page.evaluate('''() => {
      const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const issues = [];
      for (let e of document.querySelectorAll('a[href],button,summary,input:not([type=hidden]),select,textarea')) {
        if (!visible(e) || e.disabled || e.getAttribute('aria-label') === 'Close backdrop') continue;
        if (['checkbox','radio'].includes(e.type)) e = e.labels?.[0] ?? e;
        const r = e.getBoundingClientRect();
        if (r.width < 47.9 || r.height < 47.9 || r.left < -1 || r.right > innerWidth + 1)
          issues.push({text: (e.innerText || e.getAttribute('aria-label') || e.name).slice(0,80),width:r.width,height:r.height,left:r.left,right:r.right});
      }
      return {width:innerWidth, scroll:document.documentElement.scrollWidth, issues};
    }''')
    if result['scroll'] > result['width'] + 1:
        result['url']=page.url
        result['overflow']=page.evaluate("()=>[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,60),width:e.getBoundingClientRect().width}))")
        page.screenshot(path='/tmp/phase10-overflow.png',full_page=True)
    assert result['scroll'] <= result['width'] + 1, result
    assert not result['issues'], result

# Snapshot every store including Blob bytes, ignoring only device-local view timestamps.
def snapshot(page):
    return page.evaluate('''async () => {
      const db = await new Promise((r,j) => { const q=indexedDB.open('people-memory');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error) });
      const result={};
      for(const table of [...db.objectStoreNames]) {
        const rows=await new Promise((r,j)=>{const q=db.transaction(table).objectStore(table).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
        result[table]=await Promise.all(rows.map(async row=>{ const copy={...row};delete copy.last_viewed_at;if(copy.blob)copy.blob=[...new Uint8Array(await copy.blob.arrayBuffer())];return copy }));
      }
      db.close();return JSON.stringify(result);
    }''')

with tempfile.TemporaryDirectory(prefix='fictional-phase10-') as temp, sync_playwright() as p:
    browser = p.chromium.launch(**({'executable_path': shutil.which('chromium')} if shutil.which('chromium') else {}), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844})
    page = context.new_page()
    errors, external, csp = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: csp.append(msg.text) if 'Content Security Policy' in msg.text else None)
    context.on('request', lambda req: external.append(req.url) if not req.url.startswith(('http://127.0.0.1','blob:','data:')) else None)
    page.goto(base+'#/settings')
    page.get_by_label('Your name (fictional for testing)', exact=True).fill('Fictional Layout Me')
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_role('button', name='Load sample data', exact=True).click()
    expect(page.get_by_role('button', name='Load sample data', exact=True)).to_be_enabled()
    page.goto(base+'#/add?form=1')
    page.get_by_label('Full name', exact=True).fill('Fictional Layout Person')
    page.get_by_label('How do I know them?', exact=True).fill('Fictional garden club — '+'LongUnicodeNameÅनमस्ते'*8)
    png=page.evaluate("()=>{const c=document.createElement('canvas');c.width=120;c.height=120;const x=c.getContext('2d');x.fillStyle='#4f46e5';x.fillRect(0,0,120,120);return c.toDataURL('image/png').split(',')[1]}")
    page.locator('input[type=file]').set_input_files({'name':'fictional-layout.png','mimeType':'image/png','buffer':base64.b64decode(png)})
    page.get_by_role('button', name='More details', exact=True).click()
    page.get_by_label('Category', exact=True).fill('FictionalVeryLongCategoryWithoutSpaces'*3)
    page.get_by_role('button', name='Save', exact=True).click()
    page.get_by_role('link', name='View saved person').click()
    expect(page.get_by_role('heading', name='Fictional Layout Person', exact=True)).to_be_visible()
    profile=page.url.split('#')[1]
    before=snapshot(page)

    # Wide layout keeps the query and search DOM while changing profiles, with separate panes.
    page.set_viewport_size({'width':1440,'height':900})
    search=page.get_by_role('searchbox', name='Search people', exact=True)
    expect(search).to_be_visible()
    search.fill('Anil')
    search_element=search.element_handle()
    page.get_by_role('region', name='Search results').get_by_role('link',name='Anil Joshi',exact=True).click()
    expect(page.get_by_role('heading',name='Anil Joshi',exact=True)).to_be_visible()
    expect(search).to_have_value('Anil')
    assert search_element.evaluate('(el)=>el.isConnected')
    left=page.get_by_role('region',name='People search',exact=True).bounding_box()
    right=page.get_by_role('region',name='Person profile',exact=True).bounding_box()
    assert left['x']+left['width'] <= right['x'] and right['width'] >= 400
    page.get_by_role('link',name='Back to people',exact=True).click()
    expect(search).to_be_focused()
    expect(search).to_have_value('Anil')

    checks=0
    for theme in ['light','dark']:
      page.emulate_media(color_scheme=theme, reduced_motion='reduce')
      for width, font in [(320,16),(390,16),(768,16),(1024,16),(1440,16),(320,32),(390,32),(1440,32)]:
        page.set_viewport_size({'width':width,'height':900})
        for route in ['/',profile,'/browse','/add','/add?form=1','/settings','/design']:
          page.goto(base+'#'+route)
          page.evaluate('(size)=>document.documentElement.style.fontSize=size+"px"',font)
          expect(page.locator('main')).to_be_visible()
          # Data-bound pages settle before inspecting their controls.
          expect(page.get_by_role('navigation',name='Main',exact=True)).to_be_visible()
          if route==profile:
            expect(page.get_by_role('heading',name='Fictional Layout Person',exact=True)).to_be_visible()
            profile_region=page.get_by_role('region',name='Person profile',exact=True)
            expect(profile_region.locator('img').first).to_be_visible()
            assert profile_region.locator('img').first.evaluate('(el)=>el.naturalWidth')==120
            if width<1024: expect(page.get_by_role('searchbox',name='Search people',exact=True)).to_have_count(0)
          if route=='/settings':
            expect(page.get_by_role('button',name='Load sample data',exact=True)).to_be_visible()
            assert page.locator('dt').evaluate_all('(items)=>items.every(el=>el.getBoundingClientRect().right<=el.nextElementSibling.getBoundingClientRect().left)'), 'Overlapping storage/developer counts'
          if route=='/design': expect(page.get_by_role('region',name='dark components',exact=True)).to_be_visible()
          layout(page)
          nav=page.get_by_role('navigation',name='Main',exact=True)
          add=nav.get_by_role('link',name='Add',exact=True).bounding_box()
          assert abs(add['x']+add['width']/2-width/2)<1
          if (width,font) in [(390,16),(1440,16),(390,32)] and route in [profile,'/design','/settings']:
            screen='profile' if route==profile else route.removeprefix('/')
            page.screenshot(path=f'/tmp/phase10-{screen}-{theme}-{width}-{font}.png')
          checks+=1
          if route=='/design' and (width,font)==(390,32):
            for scope in ['light','dark']:
              gallery=page.get_by_role('region',name=f'{scope} components',exact=True)
              opener=gallery.get_by_role('button',name='Open sheet',exact=True)
              opener.click()
              modal=page.get_by_role('dialog',name='Pick a fictional context',exact=True)
              expect(modal).to_be_visible()
              expected_text='rgb(24, 24, 27)' if scope=='light' else 'rgb(244, 244, 245)'
              assert modal.get_by_role('heading').evaluate('(el)=>getComputedStyle(el).color')==expected_text
              assert modal.evaluate('(el)=>parseFloat(getComputedStyle(el).animationDuration)')<0.001
              layout(page)
              page.keyboard.press('Escape')
              expect(opener).to_be_focused()
              gallery.get_by_role('button',name='Open dialog',exact=True).click()
              layout(page)
              page.get_by_role('dialog',name='Example confirmation').get_by_role('button',name='Confirm example',exact=True).click()
              expect(gallery.get_by_role('status')).to_contain_text('No records changed')
              gallery.get_by_role('tab',name='Categories (0)',exact=True).focus()
              page.keyboard.press('Home')
              expect(gallery.get_by_role('tab',name='Contexts (0)',exact=True)).to_be_focused()
      # Colour scopes retain exact tokens independently of OS mode; filled controls meet AA.
      page.goto(base+'#/design')
      for scope in ['light','dark']:
        gallery=page.get_by_role('region',name=f'{scope} components',exact=True)
        assert gallery.evaluate('(el)=>getComputedStyle(el).backgroundColor')==('rgb(250, 250, 250)' if scope=='light' else 'rgb(11, 11, 15)')
        def luminance(rgb):
          values=[int(v) / 255 for v in rgb.removeprefix('rgb(').removesuffix(')').split(', ')]
          return sum(w*(v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4) for w,v in zip([0.2126,0.7152,0.0722],values))
        for action in ['Primary','Danger']:
          colors=gallery.get_by_role('button',name=action,exact=True).evaluate('(el)=>[getComputedStyle(el).color,getComputedStyle(el).backgroundColor]')
          a,b=sorted(map(luminance,colors))
          assert (b+0.05)/(a+0.05)>=4.5,colors
      page.screenshot(path=f'/tmp/phase10-design-{theme}.png',full_page=True)
    page.goto(base+'#'+profile)
    expect(page.get_by_role('heading',name='Fictional Layout Person',exact=True)).to_be_visible()
    assert snapshot(page)==before,'UI navigation/design interactions changed stored records or device settings'
    assert not errors and not csp and not external, {'errors':errors,'csp':csp,'external':external}
    print(json.dumps({'responsive_cases':checks,'passed':['320–1440px','light/dark','200% text emulation','48px targets','no horizontal overflow','centred Add','persistent wide search/profile panes','photo rendering','scoped design themes','AA filled-button contrast','keyboard modal/tab navigation','reduced motion','all-store and photo-byte preservation','no external requests or CSP/page errors'],'manual_acceptance':'deferred release blockers; this is browser emulation only'},indent=2))
    browser.close()
server.shutdown()
