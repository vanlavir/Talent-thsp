"""Integration checks against built LOCAL Worker only. Never target a hosted URL with identity headers."""
import json, urllib.request, urllib.error, uuid, sys
DEV='--dev' in sys.argv
BASE='http://127.0.0.1:5173' if DEV else 'http://127.0.0.1:8787'
owner='validation-'+uuid.uuid4().hex
checks=[]
def call(body=None,query='',expected=200,identity=owner,origin=BASE):
    headers={'Origin':origin,'Content-Type':'application/json'}
    if identity: headers.update({'Cookie':'__sites_local_auth=1'} if DEV else {'oai-authenticated-user-id':identity,'oai-authenticated-user-email':'qa@example.test'})
    req=urllib.request.Request(BASE+'/api/platform'+query,data=json.dumps(body).encode() if body else None,headers=headers)
    try:
        r=urllib.request.urlopen(req,timeout=15);code=r.status;result=json.load(r)
    except urllib.error.HTTPError as e: code=e.code; raw=e.read().decode(); result=json.loads(raw) if raw.startswith('{') else {'error':raw}
    assert code==expected,(code,expected,result)
    return result
def check(name,value):
    assert value,name
    checks.append(name)
call(expected=401,identity=None);check('Unauthenticated API rejected',True)
call({'action':'role','role':'candidate'},origin='https://example.invalid',expected=403);check('Cross-origin POST rejected',True)
d=call();check('Seed candidates returned',len(d['candidates'])==8)
check('Contacts stripped from initial search',all('email' not in c for c in d['candidates']))
call({'action':'role','role':'candidate'})
call({'action':'invite','candidateId':'anna'},expected=403);check('Candidate cannot send employer invitations',True)
call({'action':'profile','name':'Тестовый специалист','email':'qa@example.test','role':'Backend','consent':False},expected=400);check('Consent required',True)
profile={'action':'profile','name':'Тестовый специалист','email':'qa@example.test','role':'Backend','stack':'Python, PostgreSQL','city':'Москва','format':'Удалённо','experience':2,'bio':'Тестовый профиль','consent':True,'published':True}
call(profile)
t=call({'action':'startTest','grade':'Middle'})
check('Correct answers not exposed',all('answer' not in q for q in t['questions']))
call({'action':'submitTest','id':t['id'],'answers':[]},expected=400);check('Incomplete test rejected',True)
correct=['O(1)','Составной индекс и план запроса','Ключ идемпотентности и атомарная запись','Атомарное обновление или транзакция с блокировкой','Проверять владельца ресурса на сервере','Transactional outbox']
answers=[q['options'].index(correct[i]) for i,q in enumerate(t['questions'])]
r=call({'action':'submitTest','id':t['id'],'answers':answers})
check('Successful server grading',r['passed'] and r['score']==100)
call({'action':'submitTest','id':t['id'],'answers':answers},expected=409);check('Replay rejected',True)
call({'action':'startTest','grade':'Senior'},expected=409);check('90-day grade cooldown',True)
check('Grade persisted',call()['profile']['grade']=='Middle')
call({'action':'role','role':'employer'})
call({'action':'company','name':'Тестовая компания','contact':'hr@example.test','description':'QA'})
call({'action':'invite','candidateId':'me','description':'Тест','min':200000,'max':100000},expected=400);check('Invalid salary range rejected',True)
call({'action':'invite','candidateId':'me','description':'Разработка API','min':150000,'max':220000})
d=call(query='?strict=1&role=Backend&grade=Middle&stack=Python,PostgreSQL')
me=next(c for c in d['candidates'] if c['id']=='me')
check('Confirmed profile included in category',me['grade']=='Middle')
check('Contacts hidden before acceptance','email' not in me)
inv=d['invitations'][0]
check('Unauthenticated session cannot read invitations',bool(call(identity=None,expected=401)['error'])) if DEV else check('Other account sees no invitations',not call(identity=owner+'-other')['invitations'])
call({'action':'role','role':'candidate'})
call({'action':'respond','id':inv['id'],'status':'accepted'})
check('Candidate sees accepted status',call()['invitations'][0]['status']=='accepted')
call({'action':'respond','id':inv['id'],'status':'declined'},expected=409);check('Terminal invitation status protected',True)
call({'action':'role','role':'employer'})
check('Contacts disclosed after acceptance',next(c for c in call()['candidates'] if c['id']=='me')['email']=='qa@example.test')
call({'action':'role','role':'candidate'})
call({**profile,'role':'Frontend'})
call({'action':'startTest','grade':'Junior'},expected=409);check('Changing specialization cannot bypass cooldown',True)
call({'action':'role','role':'employer'})
check('FSP filter excludes no-history profiles',all(c['fsp'] for c in call(query='?fsp=1')['candidates']))
report={'passed':len(checks),'checks':checks,'scope':('Local development server; shared synthetic demo account' if DEV else 'Local built Worker; isolated synthetic account')+'. Not professional-grade validation.'}
print(json.dumps(report,ensure_ascii=False,indent=2))
