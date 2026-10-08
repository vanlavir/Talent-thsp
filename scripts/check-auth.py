"""Local integration test. Creates separate synthetic accounts; no real credentials."""
import json, urllib.request, urllib.error, http.cookiejar, uuid, pathlib
BASE='http://127.0.0.1:5173'
suffix=uuid.uuid4().hex[:10]
password='test-only-'+uuid.uuid4().hex
checks=[]
class Client:
    def __init__(self):
        self.jar=http.cookiejar.CookieJar()
        self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
    def call(self,path='/api/platform',body=None,expected=200,headers=None):
        h={'Origin':BASE,'Content-Type':'application/json',**(headers or {})}
        request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=h)
        try:
            response=self.http.open(request,timeout=30);code=response.status;data=json.load(response);cookie=response.headers.get('Set-Cookie','')
        except urllib.error.HTTPError as e:
            code=e.code;raw=e.read().decode();data=json.loads(raw) if raw.startswith('{') else {'error':raw};cookie=''
        assert code==expected,(path,code,expected,data)
        return data,cookie
    def auth(self,body,expected=200):return self.call('/api/auth',body,expected)
def check(name,value=True):
    assert value,name
    checks.append(name)
anon=Client();employer=Client();candidate=Client();other=Client()
anon.call(expected=401);check('Anonymous platform access denied')
check('Anonymous session is null',anon.call('/api/auth')[0]['user'] is None)
anon.call(headers={'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.test'},expected=401);check('ChatGPT headers do not authenticate')
anon.call('/api/auth',{'action':'login','username':'nobody','password':password},403,{'Origin':'https://example.invalid'});check('Cross-origin login blocked')
anon.auth({'action':'register','username':'x','email':'x@example.test','password':'short','role':'candidate'},400);check('Invalid registration rejected')
anon.auth({'action':'register','username':'wide_'+suffix,'email':'wide'+suffix+'@example.test','password':'😀'*20,'role':'candidate'},400);check('bcrypt byte-length truncation prevented')
reg={'action':'register','username':'boss_'+suffix,'email':'boss'+suffix+'@example.test','password':password,'role':'employer'}
_,cookie=employer.auth(reg,201)
check('Registration creates HttpOnly SameSite session','HttpOnly' in cookie and 'SameSite=Lax' in cookie)
user=employer.call('/api/auth')[0]['user'];check('Employer account role persisted',user['role']=='employer')
check('Hash not present in account response','password_hash' not in user and 'passwordHash' not in user)
anon.auth({**reg,'username':reg['username'].upper()},409);check('Username unique and case-normalized')
employer.call(body={'action':'role','role':'candidate'},expected=403);check('Cannot change role through old demo endpoint')
employer.call(body={'action':'profile','name':'forged'},expected=403);check('Employer cannot write candidate profile')
wrong=anon.auth({'action':'login','username':reg['username'],'password':password+'wrong'},401)[0]
unknown=anon.auth({'action':'login','username':'missing_'+suffix,'password':password},401)[0]
check('Wrong password and unknown login share message',wrong['error']==unknown['error'])
anon.auth({'action':'login','username':reg['username'].upper(),'password':password});check('Login works with normalized username')
creg={'action':'register','username':'dev_'+suffix,'email':'dev'+suffix+'@example.test','password':password,'role':'candidate'}
candidate.auth(creg,201);check('Candidate registration works')
candidate.call(body={'action':'company','name':'forged','contact':'forged'},expected=403);check('Candidate cannot write employer company')
profile={'action':'profile','name':'QA '+suffix,'email':creg['email'],'role':'Backend','stack':'Python, PostgreSQL','city':'Москва','format':'Удалённо','experience':2,'consent':True,'published':True}
candidate.call(body=profile)
t=candidate.call(body={'action':'startTest','grade':'Middle'})[0]
check('Test answers hidden',all('answer' not in q for q in t['questions']))
correct=['O(1)','Составной индекс и план запроса','Ключ идемпотентности и атомарная запись','Атомарное обновление или транзакция с блокировкой','Проверять владельца ресурса на сервере','Transactional outbox']
answers=[q['options'].index(correct[i]) for i,q in enumerate(t['questions'])]
result=candidate.call(body={'action':'submitTest','id':t['id'],'answers':answers})[0]
check('Candidate confirms grade under own account',result['passed'] and result['score']==100)
employer.call(body={'action':'company','name':'QA Company','contact':'hr@example.test'})
found=next(c for c in employer.call()[0]['candidates'] if c['name']==profile['name'])
check('Employer sees another account in shared catalog','email' not in found)
employer.call(body={'action':'invite','candidateId':found['id'],'description':'QA invitation','min':150000,'max':220000})
inv=candidate.call()[0]['invitations'][0];check('Invitation routed to independent candidate account',inv['candidateId']==found['id'])
other.auth({'action':'register','username':'other_'+suffix,'email':'other'+suffix+'@example.test','password':password,'role':'candidate'},201)
check('Another candidate cannot read invitation',not other.call()[0]['invitations'])
other.call(body={'action':'respond','id':inv['id'],'status':'accepted'},expected=404);check('Another candidate cannot respond to invitation')
employer.call(body={'action':'respond','id':inv['id'],'status':'accepted'},expected=403);check('Employer cannot impersonate candidate acceptance')
candidate.call(body={'action':'respond','id':inv['id'],'status':'accepted'})
found=next(c for c in employer.call()[0]['candidates'] if c['name']==profile['name'])
check('Contacts disclosed only after candidate acceptance',found['email']==creg['email'])
token=next(c.value for c in candidate.jar if c.name=='fsp_session')
candidate.auth({'action':'logout'});candidate.call(expected=401);check('Logout clears access')
anon.call(headers={'Cookie':'fsp_session='+token},expected=401);check('Logged-out session token is revoked in database')
candidate.auth({'action':'login','username':creg['username'],'password':password})
check('Login restores persisted candidate profile',candidate.call()[0]['profile']['grade']=='Middle')
for _ in range(12):anon.auth({'action':'login','username':'limit_'+suffix,'password':password},401)
anon.auth({'action':'login','username':'limit_'+suffix,'password':password},429);check('Repeated login attempts rate limited')
report={'passed':len(checks),'checks':checks,'scope':'Local server with SQLite-backed D1; distinct registered accounts.'}
pathlib.Path('.sites-runtime/auth-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
