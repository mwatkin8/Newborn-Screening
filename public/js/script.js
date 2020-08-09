async function resultInit(){
    loadingModal();
    drawTimeline();
    deleteRecords();
    await resultSummary();
    closeLoadingModal();
}

async function resultSummary(){
    let div = d3.select('#result-content');
    div.html('');
    d3.select('#nav-summary').classed('active',true);
    d3.select('#nav-pdf').classed('active',false);
    d3.select('#nav-fhir').classed('active',false);
    if(nbs_bundle === undefined){
        div.append('div').attr('id','whitespace').attr('class','col-md-12 text-center').style('padding-top','5%').style('padding-bottom','50%').html('<p><i>Please load a result message.</i></p>')
    }
    else{
        let row = div.append('div').attr('class','row');
        let col = row.append('div').attr('class','col-md-12').style('display','block');
        let url = 'https://api.logicahealth.org/nbs/open/Patient?identifier=results-demo';
        let bundle = await fetchResource(url);
        let r = bundle.entry[0].resource;
        //Patient name
        let name = r.name[0].given[0] + ' ' + r.name[0].family;
        let header = col.append('div').style('vertical-align','middle').style('display','inline-block');
        header.append('h4').text(name);
        let dem = header.append('h6');
        let gender = r.gender;
        //Age in days
        let oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        let dob = new Date(r.birthDate)
        let today = new Date();
        let age = Math.round(Math.abs((dob - today) / oneDay));
        //Gender
        dem.append('i').text(age + ' day-old ' + gender)
        url = 'https://api.logicahealth.org/nbs/open/Practitioner?identifier=results-demo';
        bundle = await fetchResource(url);
        let ordering,interpreting;
        bundle.entry.forEach((entry, i) => {
            if(entry.resource.identifier.length > 1){
                ordering = entry.resource;
            }
            else{
                interpreting = entry.resource;
            }
        });
        let detail = col.append('div').style('display','inline-block').style('float','right');
        url = 'https://api.logicahealth.org/nbs/open/Bundle?identifier=784652' //+ bundle_identifier;
        bundle = await fetchResource(url);
        b = bundle.entry[0].resource;
        detail.append('span').text('Results received: ' + b.timestamp.split('T')[0]);
        detail.append('br');
        detail.append('span').text('Ordered by: ' + ordering.name[0].given[0] + ' ' + ordering.name[0].family);
        detail.append('br');
        detail.append('span').text('Interpreted by: ' + interpreting.name[0].given[0] + ' ' + interpreting.name[0].family);
        div.append('div').html('<hr />')
        //Panels
        url = 'https://api.logicahealth.org/nbs/open/DiagnosticReport?identifier=nbs-report';
        bundle = await fetchResource(url);
        bundle.entry.forEach(async (entry, i) => {
            let report = entry.resource;
            let link = report.code.coding[0].system + '/' + report.code.coding[0].code.trim()
            let row = div.append('div').attr('class','row mb-5').style('border-left-style','solid').style('border-left-width','10px').style('border-left-color','rgba(2, 117, 216, 0.22)').style('border-radius','15px');
            let col = row.append('div').attr('class','col-md-12');
            col.append('h4').attr('class','mb-0 pb-0').html(report.code.coding[0].display + ' <a href=' + link + '><span style="vertical-align: middle;" data-feather="info"></span></a>').style('display','inline-block').style('padding-bottom','5px');
            feather.replace()
            let results_col = row.append('div').attr('class','col-md-7');
            let results_row = results_col.append('div').attr('class','row');
            let title = results_row.append('div').attr('class','col-md-12 pb-3');
            let effective = new Date(report.effectiveDateTime);
            title.append('span').html('<i>' + effective.toString() + '</i>')
            if(report.hasOwnProperty('conclusion')){
                title.append('br')
                title.append('span').html('Status: ' + report.conclusion.split('|')[0] + ' <a href=' + report.conclusion.split('|')[1] + '><span style="vertical-align: middle;" data-feather="info"></span></a>').style('display','inline-block');
                feather.replace();
            }
            await buildResultDisplay(results_row,report.result);
            let comment_col = row.append('div').attr('class','col-md-5 border-left');
            report.extension.forEach((ext, i) => {
                if(i !== 0){
                    comment_col.append('div').html('<hr />')
                }
                let l = ext.valueString.split('|');
                comment_col.append('span').html('<b>COMMENT:</b> ' + l[0]);
                comment_col.append('br');
                comment_col.append('span').html('<i>Source: ' + l[1] + ' <a href=' + l[2] + '><span style="vertical-align: middle;" data-feather="info"></span></a></i>').style('display','inline-block');
                comment_col.append('br');
                comment_col.append('span').html('<i>Type: ' + l[3] + ' <a href=' + l[4] + '><span style="vertical-align: middle;" data-feather="info"></span></a></i>').style('display','inline-block');
                feather.replace();
            });

        });
    }
    closeLoadingModal();
}

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

async function buildResultDisplay(results_col,results){
    //Loop through results
    results.forEach(async (r, i) => {
        url = 'https://api.logicahealth.org/nbs/open/' + r.reference;
        obs = await fetchResource(url);
        let link = obs.code.coding[0].system + '/' + obs.code.coding[0].code.trim();
        result = results_col.append('div').attr('class','col-md-6 pl-4');
        result.append('h5').html(obs.code.coding[0].display + ' <a href=' + link + '><span style="vertical-align: middle;" data-feather="info"></span></a>').style('display','inline-block');
        feather.replace();
        if(obs.hasOwnProperty('valueCodeableConcept')){
            //Coded value
            result.append('br')
            result.append('span').text('Result: ' + obs.valueCodeableConcept.coding[0].display);
            result.append('br')
        }
        else{
            //Numeric value
            result.append('br')
            let unit = obs.valueQuantity.unit;
            if (obs.valueQuantity.unit === undefined){
                unit = ''
            }
            result.append('span').text('Result: ' + obs.valueQuantity.value + ' ' + unit);

            if(obs.hasOwnProperty('referenceRange')){
                result.append('br')
                result.append('span').html('<i>Target: ' + obs.referenceRange[0].low.value + '-' + obs.referenceRange[0].high.value + ' ' + unit + '</i>');
                let id = 'obs' + obs.id + i.toString();
                result.append('div').attr('id',id);
                let el = await d3.select('#' + id);
                createGraph(el, obs.code.coding[0].code.trim(), parseInt(obs.valueQuantity.value), unit);
            }
            else{
                result.append('br')
            }
        }
        if(obs.hasOwnProperty('interpretation')){
            let link = obs.interpretation[0].coding.system;
            result.append('span').html('Interpretation: ' + obs.interpretation[0].text + ' ' + '<a href=' + link + '><span style="vertical-align: middle;" data-feather="info"></span></a>');
            result.append('br')
        }
        if(obs.hasOwnProperty('note')){
            result.append('span').html('Status: ' + obs.note[0].text);
        }
    });

}
let graph_demo = {
    //low,rl,rh,high
    '42906-8':[true,3,20,24],
    '38473-5':[false,0,12.501,30],
    '53336-4':[true,0.08,1.1,35],
    '29575-8':[false,0,40,80],
    '48633-2':[false,0,51,100],
    '92007-4':[false,0,2.8,19],
    '92002-5':[false,0,33.2,40]
}

function createGraph(el, code, percent, unit){
    var Needle, arc, arcEndRad, arcStartRad, barWidth, chart, chartInset, degToRad, endPadRad, height, i, margin, needle, numSections, padRad, percToDeg, percToRad, percent, radius, ref, sectionIndx, sectionPerc, startPadRad, svg, totalPercent, width;
    //Number of sections you want in the gauge
    if(graph_demo[code][0] === true){
        numSections = 3;
    }else{
        numSections = 2;
    }
    padRad = 0;
    barWidth = 15;
    chartInset = 5;
    totalPercent = 0.75;
    margin = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };
    width = el._groups[0][0].offsetWidth - margin.left - margin.right;
    width = width / 2;
    height = width;
    radius = Math.min(width, height) / 2;
    percToDeg = function (perc) {
        return perc * 360;
    };
    percToRad = function (perc) {
        return degToRad(percToDeg(perc));
    };
    degToRad = function (deg) {
        return deg * Math.PI / 180;
    };
    svg = el.append('svg').attr('width', width + margin.left + margin.right).attr('height', (height/1.3) + margin.top + margin.bottom);
    chart = svg.append('g').attr('transform', 'translate(' + (width + margin.left) / 2 + ', ' + (height + margin.top) / 2 + ')');
    for (sectionIndx = i = 1, ref = numSections; 1 <= ref ? i <= ref : i >= ref; sectionIndx = 1 <= ref ? ++i : --i) {
        //This loop will fun through the number of sections you indicate above
        if(graph_demo[code][0] === true){
            if (sectionIndx === 1){
                //Set the percentage you want this section to take (divide by 2 so it is a horizontal gauge)
                sectionPerc = (graph_demo[code][1] / graph_demo[code][3]) / 2
            }
            if (sectionIndx === 2){
                //Set the percentage you want this section to take (divide by 2 so it is a horizontal gauge)
                sectionPerc = ((graph_demo[code][2] - graph_demo[code][1]) / graph_demo[code][3]) / 2;
            }
            if (sectionIndx === 3){
                //Set the percentage you want this section to take (divide by 2 so it is a horizontal gauge)
                sectionPerc = ((graph_demo[code][3] - graph_demo[code][2]) / graph_demo[code][3]) / 2;
            }
            arcStartRad = percToRad(totalPercent);
            arcEndRad = arcStartRad + percToRad(sectionPerc);
            totalPercent += sectionPerc;
            startPadRad = sectionIndx === 0 ? 0 : padRad / 2;
            endPadRad = sectionIndx === numSections ? 0 : padRad / 2;
            arc = d3.arc().outerRadius(radius - chartInset).innerRadius(radius - chartInset - barWidth).startAngle(arcStartRad + startPadRad).endAngle(arcEndRad - endPadRad);
            let seg = chart.append('path').attr('class', 'arc chart-color' + sectionIndx).attr('d', arc);
        }else{
            if (sectionIndx === 1){
                //Set the percentage you want this section to take (divide by 2 so it is a horizontal gauge)
                sectionPerc = (graph_demo[code][2] / graph_demo[code][3]) / 2
            }
            if (sectionIndx === 2){
                //Set the percentage you want this section to take (divide by 2 so it is a horizontal gauge)
                sectionPerc = ((graph_demo[code][3] - graph_demo[code][2]) / graph_demo[code][3]) / 2;
            }
            arcStartRad = percToRad(totalPercent);
            arcEndRad = arcStartRad + percToRad(sectionPerc);
            totalPercent += sectionPerc;
            startPadRad = sectionIndx === 0 ? 0 : padRad / 2;
            endPadRad = sectionIndx === numSections ? 0 : padRad / 2;
            arc = d3.arc().outerRadius(radius - chartInset).innerRadius(radius - chartInset - barWidth).startAngle(arcStartRad + startPadRad).endAngle(arcEndRad - endPadRad);
            sectionIndx += 1
            let seg = chart.append('path').attr('class', 'arc chart-color' + sectionIndx).attr('d', arc);
        }

        //Display the units for the value in the visualization
        chart.append('text').attr('y',30).attr('text-anchor','middle').text(unit).style('stroke-opacity', '.2').style('fill','#737373');
    }
    Needle = function () {
        function Needle(len, radius1) {
            this.len = len;
            this.radius = radius1;
        }
        Needle.prototype.drawOn = function (el, perc) {
            el.append('circle').attr('class', 'needle-center').attr('cx', 0).attr('cy', 0).attr('r', this.radius);
            return el.append('path').attr('class', 'needle').attr('d', this.mkCmd(perc));
        };
        Needle.prototype.animateOn = function (el, perc) {
            var self;
            self = this;
            return el.transition().delay(200).ease(d3.easeElastic).duration(3000).selectAll('.needle').tween('progress', function () {
                return function (percentOfPercent) {
                    var progress;
                    progress = percentOfPercent * perc;
                    return d3.select(this).attr('d', self.mkCmd(progress));
                };
            });
        };
        Needle.prototype.mkCmd = function (perc) {
            var centerX, centerY, leftX, leftY, rightX, rightY, thetaRad, topX, topY;
            thetaRad = percToRad(perc / 2);
            centerX = 0;
            centerY = 0;
            topX = centerX - this.len * Math.cos(thetaRad);
            topY = centerY - this.len * Math.sin(thetaRad);
            leftX = centerX - this.radius * Math.cos(thetaRad - Math.PI / 2);
            leftY = centerY - this.radius * Math.sin(thetaRad - Math.PI / 2);
            rightX = centerX - this.radius * Math.cos(thetaRad + Math.PI / 2);
            rightY = centerY - this.radius * Math.sin(thetaRad + Math.PI / 2);
            return 'M ' + leftX + ' ' + leftY + ' L ' + topX + ' ' + topY + ' L ' + rightX + ' ' + rightY;
        };
        return Needle;
    }();
    needle = new Needle(45, 6);
    needle.drawOn(chart, 0);
    //Use a D3 scale to translate the value to a percentage readable by the needle (as explained in README)
    let scale = d3.scaleLinear()
        .domain([0,graph_demo[code][3]])
        .range([0,1]);
    needle.animateOn(chart, scale(percent));
}

function resultPDF(){
    let div = d3.select('#result-content');
    div.html('');
    d3.select('#nav-summary').classed('active',false);
    d3.select('#nav-pdf').classed('active',true);
    d3.select('#nav-fhir').classed('active',false);
    if(nbs_bundle === undefined){
        div.append('div').attr('id','whitespace').attr('class','col-md-12 text-center').style('padding-top','5%').style('padding-bottom','50%').html('<p><i>Please load a result message.</i></p>')
    }
    else{
        let iframe = div.append('iframe');
        iframe.attr('src','/sample.pdf').attr('width','100%').attr('height','1000px');
    }
}

async function resultFHIR(){
    let div = d3.select('#result-content');
    div.html('');
    d3.select('#nav-summary').classed('active',false);
    d3.select('#nav-pdf').classed('active',false);
    d3.select('#nav-fhir').classed('active',true);
    let about = div.append('div').attr('class','main-about');
    about.append('h5').text('About FHIR');
    about.append('p').html('HL7\'s <a href="https://www.hl7.org/fhir/overview.html">FHIR</a> \
    (Fast Healthcare Interoperable Resources) standard is a widely-adopted data standard which \
    abstracts clinical scenarios into separate resources. These resources are linked together \
    to describe the given scenario.');
    about.append('p').html('The following are all the resources created in association with this \
    NBS result message:');
    div.append('br');
    let row = div.append('div').attr('class','row fhir-box');
    if(nbs_bundle === undefined){
        row.append('div').attr('id','whitespace').attr('class','col-md-12 text-center').style('padding-top','5%').style('padding-bottom','50%').html('<p><i>Please load a result message.</i></p>')
    }
    else{
        let col = row.append('div').attr('class','col-md-5 order-md-2 mb-4');
        let ul = col.append('ul');
        ids.forEach((response, i) => {
            let li = ul.append('li').attr('class','fhir-li').attr('onclick','viewResource(this,\'' + response[0] + '\',\'' + response[1] + '\')');
            if(i === 0){
                li.classed('top',true);
            };
            li.append('p').attr('class','fhir-p').text(response[0]);
        });
        col = row.append('div').attr('class','col-md-7 order-md-2 mb-4');
        let pre = col.append('pre').attr('class','view-box');
        let view = pre.append('code').attr('id','view');
        view.html('Select a resource to view')
    }
}

async function viewResource(li,type,id){
    let list = document.getElementsByClassName('selected');
    for (let i = 0; i < list.length; i++) {
        list[i].classList.remove('selected')
    }
    li.className += ' selected';
    url = 'https://api.logicahealth.org/nbs/open/' + type + '/' + id;
    r = await fetchResource(url);
    document.getElementById('view').innerText = JSON.stringify(r, null, 2);
}

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

async function loadingModal(){
    let modal = d3.select('#loading-modal');
    modal.style('display','block');
}
async function closeLoadingModal(){
    let modal = d3.select('#loading-modal');
    modal.style('display','none');
}

async function closeModal(type){
    let id = '#' + type + '-modal'
    let modal = d3.select(id);
    modal.style('display','none');
};

async function loadUserORU(){
    let message = d3.select('#modal-text').node().value;
    closeModal('enter')
    loadingModal();
    await parseMessage(message);
    closeLoadingModal();
}
async function loadSampleORU(){
    let r = await fetch('sample.txt');
    let message = await r.text();
    loadingModal();
    await parseMessage(message);
    closeLoadingModal();
}

let nbs_bundle,encounter,healthcareservice_hospital,healthcareservice_lab,
location_hospital,location_lab,organization,patient,practitioner_interpreting,
practitioner_ordering,servicerequest,specimen,vs_obsinterpretation,vs_obsresultstatus,
vs_drresultstatus,vs_drcommentsource,vs_drcommenttype;
;
let diagnosticreports = [];
let observations = [];

async function loadTemplates(){
    //bundle
    let r = await fetch('/resources/Bundle.json')
    nbs_bundle = await r.json();
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

let ids = []
let d_count = 0; //counts the number of reports
async function parseMessage(message){
    let url = 'https://api.logicahealth.org/nbs/open/Patient?identifier=results-demo';
    let bundle = await fetchResource(url);
    if (bundle.total === 0){
        //Load the expanded observation.interpretation valueset from server
        url = 'https://api.logicahealth.org/nbs/open/ValueSet/observation-interpretation/$expand';
        vs_obsinterpretation = await fetchResource(url);
        //Load the expanded observation.resultstatus valueset from server
        url = 'https://api.logicahealth.org/nbs/open/ValueSet/v2-0085/$expand';
        vs_obsresultstatus = await fetchResource(url);
        //Load the expanded diagnosticreport.conclusion.result valueset from server
        url = 'https://api.logicahealth.org/nbs/open/ValueSet/v2-0123/$expand';
        vs_drresultstatus = await fetchResource(url);
        //Load the expanded diagnosticreport.conclusion.result valueset from server
        url = 'https://api.logicahealth.org/nbs/open/ValueSet/v2-0105/$expand';
        vs_drcommentsource = await fetchResource(url);
        //Load the expanded diagnosticreport.conclusion.result valueset from server
        url = 'https://api.logicahealth.org/nbs/open/ValueSet/v2-0364/$expand';
        vs_drcommenttype = await fetchResource(url);
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
        await waitFor(1000);
        //Put all resources into a bundle to store on server
        await assembleBundle();
        let r = await assembleSubmit();
        ids = [];
        r.entry.forEach((entry, i) => {
            let type = entry.response.location.split('/')[0];
            let id = entry.response.location.split('/')[1];
            ids.push([type,id])
        });
        await resultSummary();
    }
}

async function createReportTemplates(d_count){
    for(let i = 0; i < d_count; i++){
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
    nbs_bundle.timestamp = datetime;
    encounter.period.end = datetime;
    //MSH-9 & MSH-12
    nbs_bundle.identifier.type.coding[0].code = msh[8].split('^')[2];
    nbs_bundle.identifier.type.coding[0].display = msh[8].split('^')[2] + '|' + msh[11];
    //MSH-10
    //bundle_identifier = msh[9];
    nbs_bundle.identifier.value = msh[9];
    //MSH-21
    nbs_bundle.identifier.type.coding[1].code = msh[20].split('~')[1];
    nbs_bundle.identifier.type.coding[1].display = msh[20];
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
    let conclusion;
    vs_drresultstatus.expansion.contains.forEach((entry, i) => {
        if (entry.code === obr[25]){
            conclusion = entry.display + '|' + entry.system
        }
    });
    diagnosticreports[d].conclusion = conclusion;
}

async function parseNTE(seg,d){
    let nte = seg.split('|');
    //NTE-2, NTE-3, NTE-4
    let comment = nte[3];
    vs_drcommentsource.expansion.contains.forEach((entry, i) => {
        if (entry.code === nte[2]){
            comment += '|' + entry.display + '|' + entry.system
        }
    });
    vs_drcommenttype.expansion.contains.forEach((entry, i) => {
        if (entry.code === nte[4]){
            comment += '|' + entry.display + '|' + entry.system
        }
    });
    diagnosticreports[d].extension.push({
        "url" : "http://hl7.org/fhir/StructureDefinition/ORU_R01-comment|2.6",
        "valueString" : comment
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
        let include = true;
        if(obx[7].includes('-')){
            low = obx[7].split('-')[0];
            high = obx[7].split('-')[1];

        }
        else if (obx[7].includes('<')){
            low = 0;
            high = obx[7].split('<')[1];
        }
        else {
            include = false;
        }
        if (include === true){
            observation.referenceRange.push({
                "low": {
                    "value" : parseFloat(low),
                    "unit" : obx[6]
                },
                "high": {
                    "value" : parseFloat(high),
                    "unit" : obx[6]
                }
            })
        }
    }
    //OBX-8
    if(obx[8] !== ''){
        let display;
        vs_obsinterpretation.expansion.contains.forEach((entry, i) => {
            if (entry.code === obx[8]){
                display = entry.display
            }
        });
        observation.interpretation.push({
            "coding": [
                {
                    "system": "http://hl7.org/fhir/ValueSet/observation-interpretation",
                    "code": obx[8]
                }
            ],
            "text": display
        })
    }
    //OBX-11
    vs_obsresultstatus.expansion.contains.forEach((entry, i) => {
        if (entry.code === obx[11]){
            observation.note.text = entry.display
        }
    });
        //OBX-14
        let datetime = obx[14].slice(0,4) + '-' + obx[14].slice(4,6) + '-' + obx[14].slice(6,8) +'T00:00:00-07:00';
        observation.effectiveDateTime = datetime;
        diagnosticreports[d].result.push({
            "reference": "Observation/" + observation.id
        });
        observations.push(observation);
}

async function assembleBundle(){
    nbs_bundle.entry.push(
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
        nbs_bundle.entry.push({
            "resource" : report
        });
    });
    observations.forEach((obs, i) => {
        nbs_bundle.entry.push({
            "resource" : obs
        });
    });
}

async function assembleSubmit(){
    let submission= {
        "resourceType": "Bundle",
        "type": "transaction",
        "total": nbs_bundle.entry.length,
        "entry": [
            {
                "resource": nbs_bundle,
                "request": {
                    "method": "POST",
                    "url": "Bundle"
                }
            }
        ]
    };
    nbs_bundle.entry.forEach((entry, i) => {
        submission.entry.push({
            "resource": entry.resource,
            "request": {
                "method": "POST",
                "url": entry.resource.resourceType
            }
        })
    });
    let r = await submitBundle(submission);
    return r
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
    diagnosticreports = [];
    observations = [];
    return r
}

//FOR DEMO PURPOSES ONLY
async function deleteRecords(){
    let url = 'https://api.logicahealth.org/nbs/open/Patient?identifier=results-demo';
    let bundle = await fetchResource(url);
    if (bundle.total !== 0){
        loadingModal();
        let patient = bundle.entry[0].resource.id;
        //Patient
        let url = 'https://api.logicahealth.org/nbs/open/Patient?_id=' + patient + '&_cascade=delete'
        let response = await fetch(url, {
            method : 'DELETE'
        });
        let r = await response.json();
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
        await deleteResource(bundle);
        nbs_bundle = undefined;
        await resultSummary()
        closeLoadingModal();
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
