let express = require('express');
let path = require('path');
let fetch = require('node-fetch')
let fs = require('fs');
let app = express();
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

//Allow access to front-end static files
app.use(express.static(path.join(__dirname, '/public/')));

let server = 'https://api.logicahealth.org/nbs/open';
let nb_id,username,password,fname,lname,rel,rel_display,method,email,phone;

app.get('/', async (request, response) => {
  if(request.query.login){
    username = request.query.login.split('|')[0];
    password = request.query.login.split('|')[1];
    let url = server + '/RelatedPerson?identifier=ResultsMyWay-username|' + username;
    let bundle = await getResource(url);
    let r = bundle.entry[0].resource;
    for(let identifier of r.identifier){
      if(identifier.system === 'ResultsMyWay-password'){
        if(identifier.value !== password){
          //Invalid user
          response.render('signin',{login:'--Invalid login, try again--'});
        }
        else{
          //Valid user
          fname = r.name[0].given[0];
          lname = r.name[0].family;
          rel = r.relationship[0].coding[0].code;
          rel_display = r.relationship[0].coding[0].display;
          for(let type of r.telecom){
            if(type.system === 'email'){
              email = type.value;
            }
            if(type.system === 'sms'){
              method = 'sms'
              phone = type.value;
            }
            if(type.system === 'phone'){
              method = 'phone'
              phone = type.value;
            }
          }
          let patient = await getResource(server + '/' + r.patient.reference);
          let nb_name = patient.name[0].text;
          response.render('home',{user:r.name[0].text,rel:r.relationship[0].coding[0].display,nb:nb_name})
        }
      }
    }
  }
  else{
    response.render('signin',{login:''});
  }
});
app.get('/activate-step1', async (request, response) => {response.render('activate-step1');});
app.get('/activate-step2', async (request, response) => {
  let match = await verifyActivationParams(request.query.code,request.query.zip,request.query.birthDate);
  nb_id = match[0];
  response.render('activate-step2',{name:match[1],dob:match[2],facility:match[3]});
});
app.get('/activate-step3', async (request, response) => {response.render('activate-step3');});
app.get('/activate-step4', async (request, response) => {
  let primary = await buildRelatedPerson(request.query.pfn,request.query.pln,request.query.pr,request.query.pe,request.query.pp,request.query.m);
  let secondary;
  if(request.query.sfn){
    secondary = await buildRelatedPerson(request.query.sfn,request.query.sln,request.query.sr,request.query.se,request.query.sp,request.query.m);
  }
  let bundle = await JSON.parse('{\"resourceType\": \"Bundle\",\"type\": \"transaction\",\"total\": 1, \"entry\": []}')
  let entry = JSON.parse('{\"resource\": \"\", \"request\": {\"method\": \"POST\", \"url\": \"RelatedPerson\"}}');
  entry.resource = primary;
  bundle.entry.push(entry);
  if(secondary){
    entry = JSON.parse('{\"resource\": \"\", \"request\": {\"method\": \"POST\", \"url\": \"RelatedPerson\"}}');
    entry.resource = secondary;
    bundle.entry.push(entry);
    bundle.total += 1;
  }
  let outcome = await postResource(bundle);
  console.log(outcome);
  response.render('activate-step4');
});

app.get('/home', async (request, response) => {
  let url = server + '/RelatedPerson?identifier=ResultsMyWay-username|' + username;
  let bundle = await getResource(url);
  let r = bundle.entry[0].resource;
  let patient = await getResource(server + '/' + r.patient.reference);
  let nb_name = patient.name[0].text;
  response.render('home',{user:r.name[0].text,rel:r.relationship[0].coding[0].display,nb:nb_name})
});

app.get('/results', async (request, response) => {response.render('results');});
app.get('/team', async (request, response) => {response.render('team');});
app.get('/library', async (request, response) => {
    let content;
    //Pull content for library and community pages
    try {
        content = await fs.readFileSync('content-json/pku.json');
    } catch(e) {
        console.log('Error:', e.stack);
    }
    response.render('library',{content:content});
});
app.get('/library-nutrition', async (request, response) => {
    let content;
    //Pull content for library and community pages
    try {
        content = await fs.readFileSync('content-json/pku.json');
    } catch(e) {
        console.log('Error:', e.stack);
    }
    response.render('library-nutrition',{content:content});

});
app.get('/library-research', async (request, response) => {
    let content;
    //Pull content for library and community pages
    try {
        content = await fs.readFileSync('content-json/pku.json');
    } catch(e) {
        console.log('Error:', e.stack);
    }
    response.render('library-research',{content:content});

});
app.get('/library-media', async (request, response) => {
    let content;
    //Pull content for library and community pages
    try {
        content = await fs.readFileSync('content-json/pku.json');
    } catch(e) {
        console.log('Error:', e.stack);
    }
    response.render('library-media',{content:content});

});
app.get('/studies', async (request, response) => {response.render('studies');});
app.get('/community', async (request, response) => {
    let content;
    //Pull content for library and community pages
    try {
        content = await fs.readFileSync('content-json/pku.json');
    } catch(e) {
        console.log('Error:', e.stack);
    }
    response.render('community',{content:content});
});
app.get('/account', async (request, response) => {
  response.render('account-info',{fname:fname,lname:lname,rel:rel,rel_display:rel_display,method:method,email:email,phone:phone});
});

async function getResource(url){
    let response = await fetch(url);
    return await response.json();
}

async function postResource(bundle){
  let params = {
      method:"POST",
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(bundle)
  };
  let response = await fetch(server, params);
  let r = await response.json();
  if (r.entry[0].response.status === '201 Created'){
      return r.entry[0].response.location.split('/')[1]
  }
  else{
      return 'error'
  }
}

let relationships = {"NMTH":"Natural Mother","NFTH":"Natural Father",
"ADOPTM":"Adoptive Mother","ADOPTF":"Adoptive Father","MGRMTH":"Maternal Grandmother",
"MGRFTH":"Maternal Grandfather","PGRMTH":"Paternal Grandmother",
"PGRFTH":"Paternal Grandfather","FRND":"Unrelated Friend","O":"Other"};
///activate-step3?pfn=Amy&pln=Lee&pr=test&pe=amylee@gmail.com&pp=909-592-1291&m=text&sfn=David&sln=Lee&sr=NFTH&se=davidlee@gmail.com&sp=909-210-3156
async function buildRelatedPerson(fn,ln,rel,email,phone,mode){
  let r = {"resourceType":"RelatedPerson"}
  r.identifier = [
    {
      "system": "ResultsMyWay-username",
      "value": email
    },
    {
      "system": "ResultsMyWay-password",
      "value": 'temp'
    }
  ];
  r.patient = {"reference":"Patient/" + nb_id};
  let display;
  let code = rel;
  if (relationships[code]){
    display = relationships[rel];
  }
  else{
    display = rel;
    code = "O"
  }
  r.relationship = [{
    "coding":[{
      "system":"http://hl7.org/fhir/ValueSet/relatedperson-relationshiptype",
      "code": code,
      "display":display
    }]
  }];
  r.name = [{"text":fn + ' ' + ln,"family":ln,"given":[fn]}];
  let system = 'phone';
  if(mode === 'text'){
    system = 'sms'
  }
  r.telecom = [
    {
      "system": "email",
      "value": email
    },
    {
      "system": system,
      "value": phone
    }
  ]
  return r;
}

async function verifyActivationParams(code,zip,birthDate){
  let url = server + '/Patient?identifier=ResultsMyWay|' + code +
  '&address-postalcode=' + zip + '&birthdate=' + birthDate;
  let bundle = await getResource(url);
  let r = bundle.entry[0].resource;
  let id = r.id;
  let name = r.name[0].given[0] + ' ' + r.name[0].family + ' ';
  let bd = r.birthDate;
  //Query for the managing organization to get its name
  let o = r.managingOrganization.reference;
  r = await getResource(server + '/' + o);
  let organization = r.name;
  return [id,name,bd,organization]
}

async function createReport(){
  let pdf = await pdfjsLib.getDocument('../sample.pdf');
  let page1 = await pdf.getPage(1);
  let page2 = await pdf.getPage(2);
  let content1 = await page1.getTextContent();
  let content2 = await page2.getTextContent();
  let response = await fetch('../sample.pdf');
  let b = await response.blob();
  let reader = new FileReader();
  reader.onloadend = function() {
      let url = reader.result;
      let base64 = url.split(',')[1];
      parsePDF(content1, content2, base64);
  };
  let binary = localStorage['pdf-binary'];
    t.presentedForm = {
        'contentType': 'application/pdf',
        'language': 'en',
        'data': binary,
    };
}

async function displayReport(){


    document.getElementById('main-content').innerHTML = '<img style="padding-left:350px;" src="../img/loader.gif"/>';
    let url = window.server + '/DiagnosticReport?_id=' + window.reportID;
    let bundle = await getResource(url);
    let r =  bundle.entry[0].resource;
    let base64 = r.presentedForm[0].data;
    let byteCharacters = atob(base64);
    let byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    let byteArray = new Uint8Array(byteNumbers);
    let blob = new Blob([byteArray], {type: "application/pdf"});
    let file = window.URL.createObjectURL(blob);
    document.getElementById('main-content').innerHTML = '<iframe id="frame" width="100%" height="800px" src="' + file + '"></iframe>'
}
/*
//-------SMART launch params---------
let client = "PUT-CLIENT-ID-HERE"; //Given by sandbox when registering
let server,launch,redirect,authUri,tokenUri;

app.get('/smart-launch', async (request, response) => {
    //URL for the secure data endpoint
    server = request.query.iss;
    //Launch context parameter
    launch = request.query.launch;
    //Permission to launch and read/write all resources for the launch patient
    let scope = ["patient/*.read","launch"].join(" ");
    //Random session key
    let state = Math.round(Math.random()*100000000).toString();
    //Set redirect to the app landing page - CHANGE TO DYNAMICALLY DETECT PROTOCOL IF NOT USING LOCALHOST
    redirect = 'http://' + request.headers.host + '/'
    // Get the conformance statement and extract URL for auth server and token
    let req = await fetch(server + "/metadata");
    let r = await req.json();
    let smartExtension = r.rest[0].security.extension.filter(function (e) {
        return (e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris");
    });
    smartExtension[0].extension.forEach(function(arg, index, array){
        if (arg.url === "authorize") {
            authUri = arg.valueUri;
        } else if (arg.url === "token") {
            tokenUri = arg.valueUri;
        }
    });
    //Redirect to the authorization server and request launch
    response.redirect( authUri + "?" +
        "response_type=code&" +
        "client_id=" + encodeURIComponent(client) + "&" +
        "scope=" + encodeURIComponent(scope) + "&" +
        "redirect_uri=" + encodeURIComponent(redirect) + "&" +
        "aud=" + encodeURIComponent(server) + "&" +
        "launch=" + launch + "&" +
        "state=" + state )
});


async function getResource(url){
    let response = await fetch(url, {
        method: 'get',
        headers: {'Authorization': 'Bearer ' + token}
    });
    return await response.json();
}

//Fetch the patient access token
let code = request.query.code;
let r = await fetch(tokenUri, {
    method:'POST',
    body: 'grant_type=authorization_code&client_id=' + client + '&redirect_uri=' + redirect + '&code=' + code,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});
let res = await r.json();
token = res.access_token;
patient = res.patient;
let dem = await demographics()
response.render('index',{name:dem[0],gender:dem[1],age:dem[2],test_var:'this is a test'});

let token,patient;
app.get('/', async (request, response) => {
    response.render('signin');

});
*/

// Here is where we define the port for the localhost server to setup
app.listen(8080);
