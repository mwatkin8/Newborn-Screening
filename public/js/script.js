async function loadRecords(){
    let response = await fetch('/resources/submission-bundle.json');
    let submission = await response.json();
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
    let patient = bundle.entry[0].resource.id;
    //Bundle
    url = 'https://api.logicahealth.org/nbs/open/Bundle?identifier=784652';
    bundle = await fetchResource(url);
    await deleteResource(bundle)
    //DiagnosticReport
    url = 'https://api.logicahealth.org/nbs/open/DiagnosticReport?subject=' + patient;
    bundle = await fetchResource(url);
    await deleteResource(bundle)
    //Observations
    url = 'https://api.logicahealth.org/nbs/open/Observation?subject=' + patient;
    bundle = await fetchResource(url);
    await deleteResource(bundle)
    //ServiceRequest
    url = 'https://api.logicahealth.org/nbs/open/ServiceRequest?subject=' + patient;
    bundle = await fetchResource(url);
    await deleteResource(bundle)
    //Encounter
    url = 'https://api.logicahealth.org/nbs/open/Encounter?subject=' + patient;
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
    //Specimen
    url = 'https://api.logicahealth.org/nbs/open/Specimen?subject=' + patient;
    bundle = await fetchResource(url);
    await deleteResource(bundle)
    //Patient
    url = 'https://api.logicahealth.org/nbs/open/Patient?_id=' + patient;
    bundle = await fetchResource(url);
    await deleteResource(bundle)
}

async function fetchResource(url){
    response = await fetch(url);
    return await response.json();
}

async function deleteResource(bundle){
    bundle.entry.forEach(async (entry, i) => {
        let type = entry.resource.resourceType;
        let id = entry.resource.id;
        console.log(id);
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
