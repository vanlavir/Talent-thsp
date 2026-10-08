"""Regenerate API reference and a Cyrillic PDF from the reviewed Markdown."""
import json, re
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT

root=Path(__file__).resolve().parent.parent
S=lambda n=2000: {'type':'string','maxLength':n}
enum=lambda *v: {'type':'string','enum':list(v)}
roles=enum('Backend','Frontend','Data Science')
grades=enum('Junior','Middle','Senior')
schemas={}
def action(name,props={},required=[]):
    schemas[name]={'type':'object','required':['action']+required,'properties':{'action':enum(name),**props}}
def arr(items,limit=100): return {'type':'array','items':items,'maxItems':limit}
project={'type':'object','required':['title','type'],'properties':{'id':S(100),'title':S(120),'type':enum('Работа в компании','Хакатон','Крупный проект','Личный проект'),**{k:S(n) for k,n in {'organization':150,'year':40,'role':150,'description':2000,'result':1500,'url':1000,'repository':1000}.items()}}}
schemas['PortfolioProject']=project
action('profile',{'name':S(100),'email':{'type':'string','format':'email'},'role':roles,'stack':arr(S(60)),'city':S(160),'format':enum('Удалённо','Гибрид','Офис'),'experience':{'type':'number','minimum':0,'maximum':50},'bio':S(2000),'fspId':S(100),'consent':{'type':'boolean','enum':[True]},'published':{'type':'boolean'},'portfolio':arr({'$ref':'#/components/schemas/PortfolioProject'},20)},['name','email','role','consent'])
schemas['profile']['properties'].update({'birthDate':{'type':'string','description':'YYYY-MM-DD либо пустая строка; не в будущем'},'education':arr({'type':'object','required':['level','institution','specialty','status','graduationYear'],'properties':{'level':S(100),'institution':S(200),'specialty':S(200),'status':enum('Учусь','Окончил(а)'),'graduationYear':{'type':'integer','minimum':1900}}},10)})
action('portfolio',{'portfolio':arr({'$ref':'#/components/schemas/PortfolioProject'},20)},['portfolio'])
action('company',{'name':S(100),'description':S(2000),'contact':S(150),'website':S(500),'contactEmail':S(254),'size':enum('Не указан','1–10','11–50','51–200','201–500','501–1000','Более 1000'),'benefits':S(2000),**{k:S(200) for k in ['industry','city','address','contactName','contactRole','phone','telegram']}},['name','contact'])
schemas['profile']['properties'].update({'industry':S(200),'softSkills':{**arr(S(100),16),'minItems':1}})
schemas['profile']['properties']['visibility']={'type':'object','properties':{k:{'type':'boolean'} for k in ['education','portfolio','questionnaire','softSkills']}}
schemas['profile']['required']+=['industry','softSkills']
action('questionnaire',{'industry':S(200),'role':roles,'grade':grades,'focus':S(200),'autonomy':S(200),'collaboration':S(200)},['industry','role','grade','focus','autonomy','collaboration'])
action('startTest',{'grade':grades},['grade'])
action('submitTest',{'id':S(100),'answers':{'type':'array','minItems':15,'maxItems':15,'items':{'oneOf':[{'type':'integer','minimum':0,'maximum':3},S(50)]},'description':'Порядок соответствует вопросам. choice: индекс 0–3; number: строка с десятичным числом.'}},['id','answers'])
action('history')
action('previewAssessment',{'description':{**S(3000),'minLength':20}},['description'])
assignment={'oneOf':[{'type':'object','required':['mode'],'properties':{'mode':enum('none')}},{'type':'object','required':['mode','catalogId'],'properties':{'mode':enum('catalog'),'catalogId':S(100)}},{'type':'object','required':['mode','title','description'],'properties':{'mode':enum('custom'),'title':S(120),'description':S(10000)}}]}
action('invite',{'candidateId':S(100),'description':S(3000),'min':{'type':'integer','minimum':1,'maximum':10000000},'max':{'type':'integer','minimum':1,'maximum':10000000},'assignment':assignment},['candidateId','description','min','max'])
action('respond',{'id':S(100),'status':enum('viewed','accepted','declined')},['id','status'])
action('previewProfile')
action('reviewSolution',{'id':S(100),'ratings':{**arr({'type':'integer','minimum':0,'maximum':2},3),'minItems':3},'comment':S(2000)},['id','ratings','comment'])
action('submitSolution',{'id':S(100),'text':S(15000),'url':S(1000)},['id','text'])
action('register',{'username':{'type':'string','pattern':'^[a-z0-9_]{3,32}$'},'email':{'type':'string','format':'email','maxLength':254},'password':{'type':'string','minLength':12,'maxLength':72,'description':'Не более 72 UTF-8 байт'},'role':enum('candidate','employer')},['username','email','password','role'])
action('login',{'username':S(32),'password':S(72)},['username','password'])
action('logout')
action('send')
action('verify',{'code':{'type':'string','pattern':'^[0-9]{6}$'}},['code'])
schemas['Question']={'type':'object','required':['id','skill','text','kind'],'properties':{'id':S(100),'skill':S(200),'text':S(4000),'kind':enum('choice','number'),'options':arr(S(1000),4)},'description':'Публичное условие; ответ и допуск не выдаются.'}
schemas['Result']={'type':'object','properties':{'id':S(100),'score':{'type':'integer'},'passed':{'type':'boolean'},'grade':grades,'date':{'type':'integer'},'version':{'type':'integer'},'practicalCorrect':{'type':'integer'},'practicalTotal':{'type':'integer'},'skills':arr({'type':'object','properties':{'skill':S(200),'kind':enum('choice','number'),'correct':{'type':'boolean'}}})}}
schemas['Error']={'type':'object','required':['error'],'properties':{'error':S()}}
descs={200:'Успех; структура зависит от действия.',201:'Аккаунт создан, установлена cookie сессии.',400:'Некорректные поля или код.',401:'Нет сессии; для платформы также неподтверждённая почта при настроенном сервисе.',403:'Неверная роль или Origin.',404:'Приглашение не найдено у владельца.',409:'Конфликт, использованная/истёкшая попытка, интервал грейда, занятый аккаунт.',413:'Превышен размер запроса.',429:'Превышен лимит попыток.',503:'Хранилище или почтовый транспорт недоступны.'}
def responses(codes): return {str(c):{'description':descs[c],'content':{'application/json':{'schema':{'type':'object'} if c<300 else {'$ref':'#/components/schemas/Error'}}}} for c in codes}
def post(names,codes,description): return {'description':description,'security':[{'sessionCookie':[]}],'parameters':[{'name':'Origin','in':'header','required':True,'schema':{'type':'string'},'description':'Точный origin текущего сайта.'}],'requestBody':{'required':True,'content':{'application/json':{'schema':{'oneOf':[{'$ref':'#/components/schemas/'+n} for n in names],'discriminator':{'propertyName':'action','mapping':{n:'#/components/schemas/'+n for n in names}}}}}},'responses':responses(codes)}
platform_names=['previewProfile','reviewSolution','questionnaire','profile','portfolio','company','startTest','submitTest','history','invite','respond','submitSolution','previewAssessment']
paths={'/api/auth':{'get':{'description':'user: объект аккаунта с emailVerified либо null.','responses':responses([200,503])},'post':post(['register','login','logout'],[200,201,400,401,403,409,413,429,503],'Регистрация, вход, выход. Cookie fsp_session; пароль хранится как bcrypt. Регистрация не подтверждает почту.')}}
paths['/api/auth']['post']['security']=[]
paths['/api/platform']={'get':{'security':[{'sessionCookie':[]}],'description':'Кандидат: role, profile, company, invitations, candidates:[]. Работодатель: role, company, candidates, invitations, profile:null. Почта кандидата скрыта до accepted. match содержит value, matched, reasons.','parameters':[{'name':n,'in':'query','schema':roles if n=='role' else grades if n=='grade' else S(),'description':d} for n,d in {'role':'Специализация, по умолчанию Backend','grade':'Грейд, по умолчанию Middle','stack':'Требуемые стеки через запятую в API; интерфейс использует галочки','format':'Удалённо / Гибрид / Офис','strict':'Непустое значение ограничивает роль/грейд','fsp':'Непустое значение требует достижения'}.items()],'responses':responses([200,401,503])},'post':post(platform_names,[200,400,401,403,404,409,429,503],'profile/portfolio/questionnaire/startTest/submitTest/history/respond/submitSolution — кандидат. company/invite/previewAssessment — работодатель. save возвращает {ok:true}; startTest {id,grade,questions,expires}; submitTest Result; history {results:Result[]}; previewAssessment {role,grade,stack,method,competencies,questions}. Опубликованный профиль и компания сохраняются в D1; приглашение содержит snapshot задания.')}
paths['/api/email']={'post':post(['send','verify'],[200,400,401,403,409,413,429,503],'Доступен авторизованному пользователю до подтверждения email. send требует настройки провайдера; verify использует шестизначный код. Не возвращает код в API. Успех: {ok:true}.')}
paths['/api/mail-setup']={'post':{'description':'Служебная проверка Mail.ru: только письмо самому отправителю, 3 раза в сутки. Без MAIL_SETUP_TOKEN отключена. Код 000000 не подтверждает аккаунт.','security':[{'setupBearer':[]}],'responses':responses([200,403,429,503])}}
schemas['Ok']={'type':'object','required':['ok'],'properties':{'ok':{'type':'boolean','enum':[True]}}}
schemas['Match']={'type':'object','required':['value','matched','missing','factors','reasons'],'properties':{'value':{'type':'integer','minimum':0,'maximum':100},'matched':arr(S(60)),'missing':arr(S(60)),'reasons':arr(S()),'factors':arr({'type':'object','required':['label','value','max'],'properties':{'label':S(100),'value':{'type':'number'},'max':{'type':'number'}}})}}
schemas['PublicProfile']={'type':'object','required':['id','name','role','stack'],'properties':{'id':S(100),**{k:v for k,v in schemas['profile']['properties'].items() if k not in ['action','email','birthDate','consent','published','fspId','visibility']},'grade':{**grades,'nullable':True},'score':{'type':'integer'},'fsp':arr({'type':'object'}),'verifiedAt':{'type':'integer'},'match':{'$ref':'#/components/schemas/Match'},'email':{'type':'string','format':'email','description':'Только после accepted; отсутствует в previewProfile'}}}
schemas['Invitation']={'type':'object','required':['id','status','min','max','description'],'properties':{'id':S(100),'candidateId':S(100),'candidateName':S(100),'company':S(100),'contact':S(150),'min':{'type':'integer'},'max':{'type':'integer'},'description':S(3000),'status':enum('sent','viewed','accepted','declined'),'created':{'type':'integer'},'assignment':{'type':'object','nullable':True},'solution':{'type':'object','properties':{'text':S(15000),'url':S(1000),'submittedAt':{'type':'integer'}}},'review':{'type':'object','properties':{'ratings':arr({'type':'integer','minimum':0,'maximum':2},3),'score':{'type':'integer','minimum':0,'maximum':6},'comment':S(2000),'reviewedAt':{'type':'integer'},'solutionSubmittedAt':{'type':'integer'}}}}}
schemas['PlatformResponse']={'type':'object','required':['role','candidates','invitations'],'properties':{'role':enum('candidate','employer'),'profile':{'type':'object','nullable':True,'description':'Полный собственный профиль для кандидата; null для работодателя'},'company':{'type':'object'},'questionnaire':{'type':'object','nullable':True},'candidates':arr({'$ref':'#/components/schemas/PublicProfile'}),'invitations':arr({'$ref':'#/components/schemas/Invitation'}),'pagination':{'type':'object','properties':{'offset':{'type':'integer'},'limit':{'type':'integer'},'total':{'type':'integer'},'hasMore':{'type':'boolean'}}}}}
schemas['TestStarted']={'type':'object','required':['id','grade','questions','expires'],'properties':{'id':S(100),'grade':grades,'questions':arr({'$ref':'#/components/schemas/Question'},15),'expires':{'type':'integer'}}}
schemas['History']={'type':'object','required':['results'],'properties':{'results':arr({'$ref':'#/components/schemas/Result'})}}
schemas['NeedPreview']={'type':'object','required':['role','grade','stack','method','questions','tasks'],'properties':{'role':roles,'grade':grades,'stack':arr(S(60)),'method':S(),'competencies':arr(S(200)),'questions':arr({'$ref':'#/components/schemas/Question'},15),'tasks':arr({'type':'object'})}}
schemas['ProfilePreview']={'type':'object','properties':{'profile':{'$ref':'#/components/schemas/PublicProfile'}},'description':'profile=null, если собственный профиль ещё не сохранён'}
paths['/api/platform']['get']['responses']['200']['content']['application/json']['schema']={'$ref':'#/components/schemas/PlatformResponse'}
paths['/api/platform']['post']['responses']['200']['content']['application/json']['schema']={'oneOf':[{'$ref':'#/components/schemas/'+n} for n in ['Ok','TestStarted','Result','History','NeedPreview','ProfilePreview']]}
paths['/api/platform']['get']['parameters'] += [{'name':k,'in':'query','schema':{'type':'integer','minimum':0,'maximum':100000} if k=='offset' else {'type':'integer','minimum':1,'maximum':100} if k=='limit' else S(160)} for k in ['offset','limit','q']]
spec={'openapi':'3.0.3','info':{'title':'ФСП · Talent API','version':'0.4.0','description':'MVP обратного найма. Сессия через собственную регистрацию. Без почтового сервиса кабинет работает в демонстрационном режиме, обязательная проверка Mail.ru включается при MAIL_PROVIDER=mailru, MAILRU_USER, MAILRU_PASSWORD и MAILRU_ENABLED=true; резервный Resend использует RESEND_API_KEY + MAIL_FROM. Время — Unix миллисекунды. HTTP/HTTPS ссылки. Полный сценарий и ограничения: /documentation.pdf.'},'servers':[{'url':'https://fsp-talent-lct.ambergleam8.chatgpt.site'},{'url':'http://127.0.0.1:5173'}],'paths':paths,'components':{'securitySchemes':{'setupBearer':{'type':'http','scheme':'bearer'},'sessionCookie':{'type':'apiKey','in':'cookie','name':'fsp_session'}},'schemas':schemas}}
(root/'public/openapi.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8')

pdfmetrics.registerFont(TTFont('DocArial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('DocArialBold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('DocArial',normal='DocArial',bold='DocArialBold')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyRU',fontName='DocArial',fontSize=10,leading=15,spaceAfter=9,textColor=HexColor('#252c38')))
styles.add(ParagraphStyle(name='TitleRU',fontName='DocArialBold',fontSize=24,leading=30,spaceAfter=18,textColor=HexColor('#19212d')))
styles.add(ParagraphStyle(name='HeadRU',fontName='DocArialBold',fontSize=15,leading=20,spaceBefore=14,spaceAfter=9,textColor=HexColor('#d82435'),keepWithNext=True))
source=(root/'docs/technical-documentation.md').read_text(encoding='utf-8')
story=[]
for block in source.split('\n\n'):
    block=block.strip()
    if not block.strip():continue
    style='TitleRU' if block.startswith('# ') else 'HeadRU' if block.startswith('## ') else 'BodyRU'
    text=escape(re.sub(r'^#{1,2} ','',block).replace('\n',' '))
    story.append(Paragraph(text,styles[style]))
def footer(c,doc):
    c.setStrokeColor(HexColor('#e3e6eb'));c.line(42,38,553,38)
    c.setFont('DocArial',8);c.setFillColor(HexColor('#647084'))
    c.drawString(42,25,'ФСП · Talent | MVP 0.4 | 09.10.2026')
    c.drawRightString(553,25,str(doc.page))
SimpleDocTemplate(str(root/'public/documentation.pdf'),pagesize=(595.28,841.89),rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=52,title='ФСП · Talent — техническая документация MVP',author='Команда ФСП · Talent').build(story,onFirstPage=footer,onLaterPages=footer)
print('Updated public/openapi.json and public/documentation.pdf')
