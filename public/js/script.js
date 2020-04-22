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
    .attr("y1", 150)
    .attr("x2", 750)
    .attr("y2", 150)
    .style("stroke", "white")
    .style("stroke-width", 10);
  let circle1_highlight = svg.append("svg:circle")
    .attr("cx", 150)
    .attr("cy", 150)
    .attr("r", 13)
    .attr("fill", "white");
  let circle1 = svg.append("svg:circle")
    .attr("cx", 150)
    .attr("cy", 150)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle2_highlight = svg.append("svg:circle")
    .attr("cx", 350)
    .attr("cy", 150)
    .attr("r", 13)
    .attr("fill", "white");
  let circle2 = svg.append("svg:circle")
    .attr("cx", 350)
    .attr("cy", 150)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle3_highlight = svg.append("svg:circle")
    .attr("cx", 550)
    .attr("cy", 150)
    .attr("r", 13)
    .attr("fill", "white");
  let circle3 = svg.append("svg:circle")
    .attr("cx", 550)
    .attr("cy", 150)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle4_highlight = svg.append("svg:circle")
    .attr("cx", 750)
    .attr("cy", 150)
    .attr("r", 13)
    .attr("fill", "white");
  let circle4 = svg.append("svg:circle")
    .attr("cx", 750)
    .attr("cy", 150)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let circle5 = svg.append("svg:circle")
    .attr("cx", 950)
    .attr("cy", 150)
    .attr("r", 10)
    .attr("fill", "#50A7C2");
  let line = svg.append("svg:line")
    .attr("x1", 150)
    .attr("y1", 150)
    .attr("x2", 950)
    .attr("y2", 150)
    .style("stroke", "#50A7C2")
    .style("stroke-width", 5);
  let current = svg.append("svg:circle")
    .attr("cx", 750)
    .attr("cy", 150)
    .attr("r", 5)
    .attr("fill", "white");
  let label1 = svg.append("svg:text")
    .attr("x", "75")
    .attr("y", "100")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Specimen Collected");
  let label2 = svg.append("svg:text")
    .attr("x", "275")
    .attr("y", "200")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Specimen Processed");
  let label3 = svg.append("svg:text")
    .attr("x", "475")
    .attr("y", "100")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Results Reviewed");
  let label4 = svg.append("svg:text")
    .attr("x", "675")
    .attr("y", "200")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Call from Doctor");
  let label5 = svg.append("svg:text")
    .attr("x", "875")
    .attr("y", "100")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20px")
    .attr("fill", "white")
    .text("Care Plan Coordination");
}
