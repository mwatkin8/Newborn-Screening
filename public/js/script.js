async function resultSummary(){

}

function resultPDF(){
    let div = d3.select('#result-content');
    div.html('');
    let iframe = div.append('iframe');
    iframe.attr('src','/sample.pdf').attr('width','100%').attr('height','1000px');
    d3.select('#nav-summary').classed('active',false);
    d3.select('#nav-pdf').classed('active',true);
    d3.select('#nav-fhir').classed('active',false);
}

async function resultFHIR(){

}

//Create a pop-out modal to display the resource JSON for the Questionnaire and QuestionnaireResponse
async function messageModal(type){
    if (type === 'enter'){
        d3.select('#modal-text').node().value = '';
        let modal = d3.select('#enter-modal');
        modal.style('display','block');
    }
    else{
        let modal = d3.select('#view-modal');
        modal.style('display','block');
        let r = await fetch('sample.txt');
        let text = await r.text();
        d3.select('#oru-text').text(text);
    }
}

async function closeModal(type){
    let id = '#' + type + '-modal'
    let modal = d3.select(id);
    modal.style('display','none');
};

async function loadUserORU(){
    let message = d3.select('#modal-text').node().value;
    parseMessage(message);
}
async function loadSampleORU(){
    let r = await fetch('sample.txt');
    let message = await r.text();
    parseMessage(message);
}

let bundle,encounter,healthcareservice_hospital,healthcareservice_lab,
location_hospital,location_lab,organization,patient,practitioner_interpreting,
practitioner_ordering,servicerequest,specimen;
let diagnosticreports = [];
let observations = [];

async function loadTemplates(){
    //bundle
    let r = await fetch('/resources/Bundle.json')
    bundle = await r.json();
    //encounter
    r = await fetch('/resources/Encounter.json')
    encounter = await r.json();
    //healthcareservice_hospital
    r = await fetch('/resources/HealthcareService-Hospital.json')
    healthcareservice_hospital = await r.json();
    //healthcareservice_lab
    r = await fetch('/resources/HealthcareService-Lab.json')
    healthcareservice_lab = await r.json();
    //location_lab
    r = await fetch('/resources/Location-Lab.json')
    location_lab = await r.json();
    //location_hospital
    r = await fetch('/resources/Location-Hospital.json')
    location_hospital = await r.json();
    //organization
    r = await fetch('/resources/Organization.json')
    organization = await r.json();
    //patient
    r = await fetch('/resources/Patient.json')
    patient = await r.json();
    //practitioner_interpreting
    r = await fetch('/resources/Practitioner-Interpreting.json')
    practitioner_interpreting = await r.json();
    //practitioner_ordering
    r = await fetch('/resources/Practitioner-Ordering.json')
    practitioner_ordering = await r.json();
    //servicerequest
    r = await fetch('/resources/ServiceRequest.json')
    servicerequest = await r.json();
    //specimen
    r = await fetch('/resources/Specimen.json')
    specimen = await r.json();
}

let d_count = 0; //counts the number of reports
async function parseMessage(message){
    await loadTemplates();
    let lines = message.split('\n');
    await lines.forEach(async (seg, i) => {
        let type = seg.split('|')[0];
        if (type === 'MSH'){
            await parseMSH(seg);
        }
        if (type === 'PID'){
            await parsePID(seg);
        }
        if (type === 'PV1'){
            await parsePV1(seg);
        }
        if (type === 'ORC'){
            d_count += 1;
        }
    });
    await createReportTemplates(d_count);
    await parseReports(message);
    //Wait for observations to finish compiling
    const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
    await waitFor(1000);
    //Put all resources into a bundle to store on server
    await assembleBundle();
    await assembleSubmit();
}

async function createReportTemplates(d_count){
    for(let i = 0; i <= d_count; i++){
        let r = await fetch('/resources/DiagnosticReport.json')
        diagnosticreports[i] = await r.json();
    }
}

let d = -1; //report index
async function parseReports(message){
    let lines = message.split('\n');
    await lines.forEach(async (seg, i) => {
        let type = seg.split('|')[0];
        if (type === 'ORC'){
            d += 1;
            await parseORC(seg,d);
        }
        if (type === 'OBR'){
            await parseOBR(seg,d);
        }
        if (type === 'NTE'){
            await parseNTE(seg,d);
        }
        if (type === 'OBX'){
            await parseOBX(seg,d);
        }
    });
}

async function parseMSH(seg){
    let msh = seg.split('|');
    //MSH-3
    healthcareservice_lab.name = msh[2];
    //MSH-4
    location_lab.alias[0] = msh[3];
    //MSH-5
    healthcareservice_hospital.name = msh[4];
    //MSH-6
    organization.alias[0] = msh[5];
    //MSH-7
    let datetime = msh[6].slice(0,4) + '-' + msh[6].slice(4,6) + '-' + msh[6].slice(6,8) +
                'T' + msh[6].slice(8,10) + ':' + msh[6].slice(10,12) + ':' + msh[6].slice(12,14) + '-07:00';
    bundle.timestamp = datetime;
    encounter.period.end = datetime;
    //MSH-9 & MSH-12
    bundle.identifier.type.coding[0].code = msh[8].split('^')[2];
    bundle.identifier.type.coding[0].display = msh[8].split('^')[2] + '|' + msh[11];
    //MSH-10
    //bundle_identifier = msh[9];
    bundle.identifier.value = msh[9];
    //MSH-21
    bundle.identifier.type.coding[1].code = msh[20].split('~')[1];
    bundle.identifier.type.coding[1].display = msh[20];
}

async function parsePID(seg){
    let pid = seg.split('|');
    //PID-3
    patient.identifier[1].value = pid[3].split('^')[0];
    //PID-5
    let lname = pid[5].split('^')[0];
    let fname = pid[5].split('^')[1];
    patient.name[0].text = fname + ' ' + lname;
    patient.name[0].family = lname;
    patient.name[0].given[0] = fname;
    //PID-7
    patient.birthDate = pid[7].slice(0,4) + '-' + pid[7].slice(4,6) + '-' + pid[7].slice(6,8);
    //PID-8
    if(pid[8] === 'M'){
        patient.gender = 'male'
    }
    else{
        patient.gender = 'female'
    }
    //PID-11
    let a = pid[11].split('^');
    patient.address[0].line[0] = a[0];
    patient.address[0].city = a[2];
    patient.address[0].state = a[3];
    patient.address[0].postalCode = a[4];
}

async function parsePV1(seg){
    let pv1 = seg.split('|');
    //PV1-2
    encounter.class.code = pv1[2];
    //PV1-3
    location_hospital.identifier[1].value = pv1[3].split('^')[0];
    location_hospital.name = pv1[3].split('^')[8];
    //PV1-44
    let datetime = pv1[44].slice(0,4) + '-' + pv1[44].slice(4,6) + '-' + pv1[44].slice(6,8) +'T00:00:00-07:00';
    encounter.period.start = datetime;
    servicerequest.authoredOn = datetime;
}

async function parseORC(seg,d){
    let orc = seg.split('|');
    //ORC-3
    diagnosticreports[d].identifier[0].value = orc[3];
    diagnosticreports[d].id = 'nbs-diagnosticreport-' + d.toString();
    //ORC-5
    switch(orc[5]){
        case 'IP':
        case 'SC':
        case 'A':
            servicerequest.status = 'active';
            break;
        case 'HD':
            servicerequest.status = 'on-hold';
            break;
        case 'CA':
        case 'DC':
        case 'RP':
            servicerequest.status = 'revoked';
            break;
        case 'CM':
            servicerequest.status = 'completed';
            break;
        case 'ER':
            servicerequest.status = 'entered-in-error';
            break;
    }
    //ORC-12
    practitioner_ordering.identifier[1].value = orc[12].split('^')[0];
    practitioner_ordering.name[0].family = orc[12].split('^')[1];
    practitioner_ordering.name[0].given[0] = orc[12].split('^')[2];
}

async function parseOBR(seg,d){
    let obr = seg.split('|');
    //OBR-4
    diagnosticreports[d].code.coding[0].code = obr[4].split('^')[0];
    diagnosticreports[d].code.coding[0].display = obr[4].split('^')[1];
    //OBR-14
    let datetime = obr[14].slice(0,4) + '-' + obr[14].slice(4,6) + '-' + obr[14].slice(6,8) +
                'T' + obr[14].slice(8,10) + ':' + obr[14].slice(10,12) + ':00-07:00';
    specimen.receivedTime = datetime;
    //OBR-15
    specimen.type.code = obr[15].split('[')[1].split(']')[0];
    specimen.type.display = obr[15].split('[')[0]
    //OBR-22
    datetime = obr[22].slice(0,4) + '-' + obr[22].slice(4,6) + '-' + obr[22].slice(6,8) +
                'T' + obr[22].slice(8,10) + ':' + obr[22].slice(10,12) + ':00-07:00';
    specimen.processing.push({
      "timeDateTime" : datetime
    });
    diagnosticreports[d].effectiveDateTime = datetime;
    //OBR-25 & OBR-27
    diagnosticreports[d].conclusion = 'Result Status (https://hl7-definition.caristix.com/v2/HL7v2.4/Tables/0123): ' + obr[25] + '; Priority (https://hl7-definition.caristix.com/v2/HL7v2.4/Fields/OBR.27): ' + obr[27].split('^')[5]
}

async function parseNTE(seg,d){
    let nte = seg.split('|');
    //NTE-2, NTE-3, NTE-4
    diagnosticreports[d].extension.push({
        "url" : "http://hl7.org/fhir/StructureDefinition/ORU_R01-comment|2.6",
        "valueString" : 'Comment: ' + nte[3] + '; Source (https://hl7-definition.caristix.com/v2/HL7v2.4/Tables/0105): ' + nte[2] + '; Type (https://hl7-definition.caristix.com/v2/HL7v2.7/Tables/0364): ' + nte[4]
    });
}

async function parseOBX(seg,d){
    let r = await fetch('/resources/Observation.json')
    let observation = await r.json();
    let obx = seg.split('|');
    //OBX-1
    observation.id = 'nbs-observation' + d.toString() + '-' + obx[1];
    //OBX-3
    observation.code.coding[0].code = obx[3].split('^')[0];
    observation.code.coding[0].display = obx[3].split('^')[1];
    //Coded value
    if(obx[2] === 'CE'){
        //OBX-5
        observation.valueCodeableConcept = {
            "coding": [
                  {
                      "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                      "code": obx[5].split('^')[0],
                      "display": obx[5].split('^')[1]
                  }
              ]
        }
    }
    //Numeric value
    if(obx[2] === 'NM'){
        //OBX-5 & OBX-6
        observation.valueQuantity = {
            "value": obx[5],
            "unit": obx[6]
        }
        //OBX-7
        let low,high;
        if(obx[7].includes('-')){
            low = obx[7].split('-')[0];
            high = obx[7].split('-')[1];
        }
        else{
            low = 0;
            high = obx[7].split('<')[1];
        }
        observation.referenceRange = [
            {
                "low": low,
                "high": high
            }
        ]
    }
    //OBX-8
    if(obx[8] !== ''){
        observation.interpretation = [
          {
              "coding": [
                    {
                        "system": "http://hl7.org/fhir/ValueSet/observation-interpretation",
                        "code": obx[8]
                    }
                ]
          }
        ]
    }
    //OBX-11
    observation.note.text = 'Observation Result Status (https://hl7-definition.caristix.com/v2/HL7v2.4/Tables/0085): ' + obx[11]
    //OBX-14
    let datetime = obx[14].slice(0,4) + '-' + obx[14].slice(4,6) + '-' + obx[14].slice(6,8) +'T00:00:00-07:00';
    observation.effectiveDateTime = datetime;
    diagnosticreports[d].result.push({
      "reference": "Observation/" + observation.id
    });
    observations.push(observation);
}

async function assembleBundle(){
    bundle.entry.push(
        {
            "resource": organization
        },
        {
            "resource": location_hospital
        },
        {
            "resource": location_lab
        },
        {
            "resource": healthcareservice_lab
        },
        {
            "resource": healthcareservice_hospital
        },
        {
            "resource": practitioner_ordering
        },
        {
            "resource": practitioner_interpreting
        },
        {
            "resource": servicerequest
        },
        {
            "resource": encounter
        },
        {
            "resource": specimen
        },
        {
            "resource": patient
        }
    );
    diagnosticreports.forEach((report, i) => {
        bundle.entry.push({
            "resource" : report
        });
    });
    observations.forEach((obs, i) => {
        bundle.entry.push({
            "resource" : obs
        });
    });
}

async function assembleSubmit(){
    let submission= {
        "resourceType": "Bundle",
        "type": "transaction",
        "total": bundle.entry.length,
        "entry": [
            {
                "resource": bundle,
                "request": {
                    "method": "POST",
                    "url": "Bundle"
                }
            }
        ]
    };
    bundle.entry.forEach((entry, i) => {
        submission.entry.push({
            "resource": entry.resource,
            "request": {
                "method": "POST",
                "url": entry.resource.resourceType
            }
        })
    });
    submitBundle(submission);
}

async function submitBundle(submission){
    let params = {
        method:"POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(submission)
    };
    response = await fetch('https://api.logicahealth.org/nbs/open/', params);
    r = await response.json();
    console.log(r);
}

//FOR DEMO PURPOSES ONLY
async function deleteRecords(){
    let url = 'https://api.logicahealth.org/nbs/open/Patient?identifier=results-demo';
    let bundle = await fetchResource(url);
    if (bundle.total !== 0){
        let patient = bundle.entry[0].resource.id;
        //Patient
        let url = 'https://api.logicahealth.org/nbs/open/Patient?_id=' + patient + '&_cascade=delete'
        let response = await fetch(url, {
            method : 'DELETE'
        });
        let r = await response.json();
        console.log(r);
        const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
        await waitFor(500);
        //Bundle
        url = 'https://api.logicahealth.org/nbs/open/Bundle?identifier=784652' //+ bundle_identifier;
        bundle = await fetchResource(url);
        await deleteResource(bundle)
        //HealthcareService
        url = 'https://api.logicahealth.org/nbs/open/HealthcareService?identifier=results-demo';
        bundle = await fetchResource(url);
        await deleteResource(bundle)
        //Practitioner
        url = 'https://api.logicahealth.org/nbs/open/Practitioner?identifier=results-demo';
        bundle = await fetchResource(url);
        await deleteResource(bundle)
        //Organization
        url = 'https://api.logicahealth.org/nbs/open/Organization?identifier=results-demo';
        bundle = await fetchResource(url);
        await deleteResource(bundle)
        //Location
        url = 'https://api.logicahealth.org/nbs/open/Location?identifier=results-demo';
        bundle = await fetchResource(url);
        await deleteResource(bundle)
    }
    else{
        alert('Sample data has not been loaded yet.');
    }
}

async function fetchResource(url){
    response = await fetch(url);
    return await response.json();
}


async function deleteResource(bundle){
    bundle.entry.forEach(async (entry, i) => {
        let type = entry.resource.resourceType;
        let id = entry.resource.id;
        let url = 'https://api.logicahealth.org/nbs/open/' + type + '/' + id
        let response = await fetch(url, {
            method : 'DELETE'
        });
        let r = await response.json();
        console.log(r);
    });
}

function removeLoading(){
    d3.select('#preview-frame').classed('loading',false);
}

function loadLibrary(type,content){
    drawTimeline()
    if(type === 'research'){
        fetchRss('https://pubmed.ncbi.nlm.nih.gov/rss/search/1DYWH3zMZml9Y-GH5h46gjnQXutviZuz-BCA7P5SX1gD_xlsh7/?limit=100&utm_campaign=pubmed-2&fc=20200722104350');
    }
    content.library[type].forEach((source, i) => {
        let list = d3.select('#content-list');
        list.classed('loading',false);
        let row = list.append('div').attr('class','row media text-muted pt-3 pb-3 border-bottom border-gray');
        let img = row.append('div').attr('class','col-md-2');
        img.append('img').attr('src','img/content-imgs/' + content.condition +'/library/' + source.image).attr('width','70').attr('height','70').attr('class','mr-2 rounded');
        let info = row.append('div').attr('class','col-md-10');
        let title = info.append('div').attr('class','row ml-1');
        title.append('h6').attr('class','mb-0').text(source.title);
        let type = info.append('div').attr('class','row ml-1');
        type.append('p').attr('class','mb-1').text(source.type);
        let buttons = info.append('div').attr('class','row ml-1');
        let navigate = buttons.append('a').attr('class','btn btn-sm btn-outline-primary').attr('role','button').attr('href',source.url).text('Visit Source ');
        navigate.append('span').attr('data-feather','navigation');
        if(source.preview === 'true'){
            let preview = buttons.append('button').attr('class','btn-sm btn-outline-primary preview-button ml-3').attr('id','preview-button-' + i.toString()).attr('onclick','togglePreview(' + i.toString() + ',"' + source.url + '")').text('Preview ');
            preview.append('span').attr('data-feather','chevrons-right');
        }
    });
    feather.replace()
    d3.select('#preview-button-0').attr('class','btn-sm btn-primary preview-button ml-3')
}
function togglePreview(idx,url){
    let frame = d3.select('#preview-frame').attr('src',url);
    d3.selectAll('.preview-button').attr('class','btn-sm btn-outline-primary preview-button ml-3')
    let button = d3.select('#preview-button-' + idx.toString()).attr('class','btn-sm btn-primary preview-button ml-3')
}

function loadCommunity(content){
    drawTimeline()
    content.community.forEach((source, i) => {
        let sources = d3.select('#sources');
        let div = sources.append('div').attr('class','text-center border-bottom border-gray pb-3 pt-3');
        div.append('img').attr('class','border rounded-circle').attr('src','img/content-imgs/' + content.condition +'/community/' + source.image).attr('width','140').attr('height','140');
        div.append('h3').text(source.title);
        let p = div.append('p');
        if(source.facebook !== ""){
            let link = p.append('a').attr('href', source.facebook);
            link.append('img').attr('class','rounded-circle mr-1').attr('src','img/icons/facebook.png').attr('width','30').attr('height','30');
        }
        if(source.instagram !== ""){
            let link = p.append('a').attr('href', source.instagram);
            link.append('img').attr('class','rounded-circle mr-1').attr('src','img/icons/instagram.png').attr('width','30').attr('height','30');
        }
        if(source.twitter !== ""){
            let link = p.append('a').attr('href', source.twitter);
            link.append('img').attr('class','rounded-circle mr-1').attr('src','img/icons/twitter.png').attr('width','30').attr('height','30');
        }
        if(source.website !== ""){
            let link = div.append('a').attr('href', source.website).attr('style','text-decoration:none;').html('<span data-feather="home"></span> Organization Website ');
        }
    });
    feather.replace()
}

async function accountDetail(rel,rel_display,method){
    drawTimeline();
  let options = d3.selectAll('option');
  options._groups[0].forEach(option => {
    if(option.value === rel){
      option.setAttribute('selected','selected')
    }
  });
  if(rel === 'O'){
    d3.select('#primary-rel-other').attr('placeholder',rel_display)
  }
  if(method === 'sms'){
    d3.select('#sms').attr('checked','checked');
  }
  if(method === 'phone'){
    d3.select('#phone').attr('checked','checked');
  }
}

// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

async function login(){
  let username = d3.select('#username').property('value');
  let password = d3.select('#password').property('value');
  //Sending login through url for test login purposes
  if(username !== '' && password !== ''){
    window.location.href = '/?login=' + username + '|' + password;
  }
}

function activateStep2(){
    let code1 = d3.select('#activation-code-1').property('value');
    let code2 = d3.select('#activation-code-2').property('value');
    let code3 = d3.select('#activation-code-3').property('value');
    if (code1.length !== 3 || code2.length !== 3 || code3.length !== 3){
      alert('Code should have 3 digits in each box')
    }
    else{
      let code = code1 + '-' + code2 + '-' + code3;
      let zip = d3.select('#zip').property('value');
      let birthDate = d3.select('#birthDate').property('value');
      if(code === '--' || zip === '' || birthDate === ''){
        alert('Please fill all fields')
      }
      else{
        let route = '/activate-step2?code=' + code + '&zip=' + zip + '&birthDate=' + birthDate
        window.location.href = route;
      }
    }
};

function activateStep4(){
  //Extract primary contact info
  let pfn = d3.select('#primary-fname').property('value');
  let pln = d3.select('#primary-lname').property('value');
  let pr = d3.select('#primary-rel').node().value;
  if(pr === 'O'){
    pr = d3.select('#primary-rel-other').property('value');
  }
  let pe = d3.select('#primary-email').property('value');
  let pp = d3.select('#primary-phone').property('value');
  let m = d3.select('input[name="mode"]:checked').node().value
  if (pfn !== '' && pln !== '' && pr !== '' && pe !== '' && pp !== '' && m !== ''){
    //Extract secondary contact info
    let sfn = d3.select('#secondary-fname').property('value');
    let sln = d3.select('#secondary-lname').property('value');
    let sr = d3.select('#secondary-rel').node().value;
    if(sr === 'O'){
      sr = d3.select('#secondary-rel-other').property('value');
    }
    let se = d3.select('#secondary-email').property('value');
    let sp = d3.select('#secondary-phone').property('value');
    if (sfn === '' && sln === '' && sr === '' && se === '' && sp === ''){
      //Create primary, no secondary
      let route = '/activate-step4?pfn=' + pfn + '&pln=' + pln + '&pr=' + pr +
      '&pe=' + pe + '&pp=' + pp + '&m=' + m;
      window.location.href = route;
    }
    else{
      if (sfn === '' || sln === '' || sr === '' || se === '' || sp === ''){
        console.log(sfn,sln,sr,se,sp);
        alert('If you wish to add a secondary contact you must fill all fields')
      }
      else{
        //Create primary and secondary
        let route = '/activate-step4?pfn=' + pfn + '&pln=' + pln + '&pr=' + pr +
        '&pe=' + pe + '&pp=' + pp + '&m=' + m + '&sfn=' + sfn + '&sln=' + sln +
        '&sr=' + sr + '&se=' + se + '&sp=' + sp;
        window.location.href = route;
      }
    }
  }
  else{
    alert('Please fill all fields for primary contact')
  }
}

function drawTimeline(){
  let svg = d3.select("#timeline")
    .append("svg:svg")
    .attr("width", 1500)
    .attr("height", 550)
    .style("position", "absolute")
    .style("z-index", 1100);
  let line_highlight = svg.append("svg:line")
    .attr("x1", 150)
    .attr("y1", 200)
    .attr("x2", 750)
    .attr("y2", 200)
    .style("stroke", "white")
    .style("stroke-width", 10);
  let circle1_highlight = svg.append("svg:circle")
    .attr("cx", 150)
    .attr("cy", 200)
    .attr("r", 13)
    .attr("fill", "white");
  let circle1 = svg.append("svg:circle")
    .attr("cx", 150)
    .attr("cy", 200)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle2_highlight = svg.append("svg:circle")
    .attr("cx", 350)
    .attr("cy", 200)
    .attr("r", 13)
    .attr("fill", "white");
  let circle2 = svg.append("svg:circle")
    .attr("cx", 350)
    .attr("cy", 200)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle3_highlight = svg.append("svg:circle")
    .attr("cx", 550)
    .attr("cy", 200)
    .attr("r", 13)
    .attr("fill", "white");
  let circle3 = svg.append("svg:circle")
    .attr("cx", 550)
    .attr("cy", 200)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle4_highlight = svg.append("svg:circle")
    .attr("cx", 750)
    .attr("cy", 200)
    .attr("r", 13)
    .attr("fill", "white");
  let circle4 = svg.append("svg:circle")
    .attr("cx", 750)
    .attr("cy", 200)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle5 = svg.append("svg:circle")
    .attr("cx", 950)
    .attr("cy", 200)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let line = svg.append("svg:line")
    .attr("x1", 150)
    .attr("y1", 200)
    .attr("x2", 950)
    .attr("y2", 200)
    .style("stroke", "#50A7C2")
    .style("stroke-width", 5);
  let current = svg.append("svg:circle")
    .attr("cx", 750)
    .attr("cy", 200)
    .attr("r", 5)
    .attr("fill", "white");
  let label1 = svg.append("svg:text")
    .attr("x", "75")
    .attr("y", "250")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Specimen Collected");
  let label2 = svg.append("svg:text")
    .attr("x", "275")
    .attr("y", "160")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Specimen Processed");
  let label3 = svg.append("svg:text")
    .attr("x", "475")
    .attr("y", "250")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Results Reviewed");
  let label4 = svg.append("svg:text")
    .attr("x", "675")
    .attr("y", "160")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Call from Doctor");
  let label5 = svg.append("svg:text")
    .attr("x", "875")
    .attr("y", "250")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Care Plan Coordination");
}
