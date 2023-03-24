/*
    Candy pie
    - short: a 3d pie chart, on top of babylon.js
    - fluffy: a configurable, interactive 3d pie chart in your browser

    license: Apache license 2.0
    
    > https://github.com/thierryVergult/CandyPie


    configuration via the pie3d json object

      verticalFactor
      cameraDegreesY
      allowVerticalRotation
      spaceBetweenSlices
      innerRadiusPct
      showLabel
      showHeight
      labelFontFactor
      labelExtraTopMargin
      backgroundColor
      clickScalePct
      labelColor
      secondsPerRotation
      addLegend

    data for each slice in an array, slices, as part of the pie3d object,  fields being 
    - height
    - arcPct
    - color
    - label

      'slices': [
        { 'height': 100, 'arcPct': 50, 'color': 'red',    'label': 'label1'},
        { 'height': 125, 'arcPct': 25, 'color': 'blue',   'label': 'label1'},
        { 'height': 150, 'arcPct': 25, 'color': 'yellow', 'label': 'label1'}
      ]
    
*/


// thanks: https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
function colorHex(str){
  var ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = str;
  
  return ctx.fillStyle;
}

// thanks: https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
function invertColor(hex, bw) {
  if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
      throw new Error('Invalid HEX color.');
  }
  var r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
      // https://stackoverflow.com/a/3943023/112731
      return (r * 0.299 + g * 0.587 + b * 0.114) > 186
          ? '#000000'
          : '#FFFFFF';
  }
  // invert color components
  r = (255 - r).toString(16);
  g = (255 - g).toString(16);
  b = (255 - b).toString(16);
  // pad each with zeros and return
  return "#" + padZero(r) + padZero(g) + padZero(b);
}

function padZero(str, len) {
  len = len || 2;
  var zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}

// Center point is p1; angle returned in Radians
function angleBetween3Points(p0,p1,p2) {
  var b = Math.pow(p1.x-p0.x,2) + Math.pow(p1.y-p0.y,2),
      a = Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2),
      c = Math.pow(p2.x-p0.x,2) + Math.pow(p2.y-p0.y,2);
  
  var radians = Math.acos( (a+b-c) / Math.sqrt(4*a*b));
  // console.log( 'angleBetween3Points', radians, 'degrees', ( radians * (180 / Math.PI)).toFixed(2))
  return radians;
}
  
function pieChart (pie3d) {
  
  let oneSlice = function( height, arcFraction, color, label, value) {
    
    if (height <= 0 || arcFraction <= 0) {
      return;
    }

    // CSG: Constructive Solid Geometry : pie (= cylinder with arc) - full cylinder for inner part to carve out
      
    // face UV is used to have the text on front. All other faces just get the background color
    const uniPiece = new BABYLON.Vector4(0, 0, 0.1, 0.1); // take a little piece from the left top
    let faceUV = new Array(6).fill( uniPiece);
    faceUV[1] = new BABYLON.Vector4(1, 0, 0, 1); // inverse the whole texture (w text), shown on negative Z
  
    // cylinder with arc
    const pie = BABYLON.MeshBuilder.CreateCylinder( 'pie', {
      height: Math.abs( height),
      diameter: pie3d.diameter,
      arc: arcFraction,  // fraction of 2 pi (ratio of the circumference between 0 and 1)
      enclose: true,  // activates the left & right side faces
      faceUV: faceUV
    });
          
    const pieCSG = BABYLON.CSG.FromMesh(pie);
  
    // inner cylinder
    const donutHoleFraction = pie3d.innerRadiusPct / 100;
    const diameter = (pie3d.diameter * donutHoleFraction ) + 0.01; // value of 0 for hole fraction, gives a zero diameter, pushed to diameter 1 by babylon (surprise), so add 0.01 to avoid 0
      
    faceUV[1] = faceUV[0]; // clean the text on the extruded (inner) cylinder
  
    const cyl = BABYLON.MeshBuilder.CreateCylinder( 'cyl', {
      height: Math.abs( height),
      diameter: diameter,
      faceUV: faceUV // contains now no text anymore
    });
    
    const cylCSG = BABYLON.CSG.FromMesh(cyl);
  
    // subtract inner cylinder from pie  
    const donutCSG = pieCSG.subtract( cylCSG);
    const donut = donutCSG.toMesh( 'donut-' + sliceNr);
  
    // Create dynamic texture, to write text on, and set it as material of the final donut
    // adjust the width & height of the dynamic texture to the slice dimensions, to have constant font
    let texture = new BABYLON.DynamicTexture( 'dynamic texture-' + sliceNr, {
      width: 2048 * arcFraction, // align width with fraction of the arc, to arrive at fixed font (no streching)
      height: 200 * Math.abs( height) // same for height
    });
      
    const fontsize = 32 * pie3d.labelFontFactor;
    const font = ['bold', fontsize + 'px', 'monospace'].join( ' ');
    const blackWhiteVariant = true;
    const textColor = pie3d.labelColor || invertColor( colorHex(color), blackWhiteVariant);
    const textInvertY = true; // see also faceUV[1] : Vector4(1, 0, 0, 1) instead of 0-0 1-1 in the u-v plane (u: horizontal, left to right ; v: vertically up)
  
    let textOnSlice = '';
    if ( pie3d.showLabel) {
      textOnSlice = label
    }

    if ( pie3d.showHeight) {
      textOnSlice = textOnSlice + ( pie3d.showLabel && textOnSlice ? ': ': '') + value
    }

    const txt_X_distance_from_left_hand_edge = 40;
    const txt_Y_distance_from_the_top = ( 60 * ( 1 + ( pie3d.labelFontFactor / 3))) + Number( pie3d.labelExtraTopMargin);
    console.log( 'txt_Y_distance_from_the_top', txt_Y_distance_from_the_top);

    texture.drawText( textOnSlice, txt_X_distance_from_left_hand_edge, txt_Y_distance_from_the_top, font, textColor, color, textInvertY);
    
    let mat = new BABYLON.StandardMaterial( 'mat-' + sliceNr); 
    mat.diffuseTexture = texture;
  
    donut.material = mat;
      
    pie.dispose();
    cyl.dispose();
  
    // rebase y position, so that all slices sit on the xz-plane
    donut.position.y = ( height / 2 ) - (pie3d.verticalFactor / 2 );
      
    // rotate over Y
    const halfArcSlice = 2 * Math.PI * arcFraction / 2;
  
    donut.rotation.y = rotY;

    let middleRadius = 0;
      
    // add some space in between the slices
    if (pie3d.spaceBetweenSlices) {
      middleRadius = pie3d.diameter * 0.02; // 2% of diameter = 4% of R
  
      donut.position.x =   Math.cos( rotY + halfArcSlice) * middleRadius;
      donut.position.z = - Math.sin( rotY + halfArcSlice) * middleRadius;
    }
      
    // make the donut x% larger on click
    donut.actionManager = new BABYLON.ActionManager();
      
    const clickScale = 1 + ( pie3d.clickScalePct / 100);
  
    donut.actionManager.registerAction(
      new BABYLON.InterpolateValueAction(
        BABYLON.ActionManager.OnPickTrigger, 
        donut, 
        "scaling", 
         new BABYLON.Vector3( clickScale, clickScale, clickScale), 
        250, // duration
        undefined, // condition
        undefined, // stopOtherAnimations
        function() { // onInterpolationDone: defines a callback raised once the interpolation animation has been done
          //console.log('click: ', this.value);
          this.value._x = ( this.value._x > 1 ? 1 : clickScale);
          this.value._y = ( this.value._y > 1 ? 1 : clickScale);
          this.value._z = ( this.value._z > 1 ? 1 : clickScale);
        }
      )
    );

    if ( pie3d.secondsPerRotation > 0 ) {
      pie3d.scene.registerAfterRender( function () {
        let extraAnglePerFrame = 2*Math.PI/60 / pie3d.secondsPerRotation;
        donut.addRotation( 0, extraAnglePerFrame, 0);

        if (pie3d.spaceBetweenSlices) {
          donut.position.x =   Math.cos( donut.rotation.y + halfArcSlice) * middleRadius;
          donut.position.z = - Math.sin( donut.rotation.y + halfArcSlice) * middleRadius;
        }
      });
    }
  
    return donut;
  }
    
  const slices = pie3d.slices;
      
  let maxVal = 0;
  for ( let i = 0; i < slices.length ; i++) {
    if (slices[i].height > maxVal) {
      maxVal = slices[i].height;
    }
  }
  
  // rotate the 1st slice 90 degrees minus half the arc of the 1st slice
  // so it is shown right into the face, and not starting at the right (at the X ax, negatif Z)
  let rotY = Math.PI/2 - 2 * Math.PI * slices[0].arcPct / 100 / 2;
  let sliceNr = 0;
  
  for ( let i = 0; i < slices.length; i++) {
        
    let p = slices[i],
        h = p.height / maxVal * pie3d.verticalFactor;
  
    let slice = oneSlice( h, p.arcPct / 100, p.color, p.label, p.height);
  
    // increment rotY for the next slice
    rotY = rotY + ( 2 * Math.PI * p.arcPct / 100);
    sliceNr = sliceNr + 1;
        
  }
}
  
var createPieChartScene = function ( pie3d) {

  var scene = new BABYLON.Scene( pie3d.engine);
  
  // define an arcrotate camera
  const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 0, new BABYLON.Vector3(0, 0, 0));
  camera.attachControl( pie3d.canvas, true);
    
  // set position & disable zooming
  const cameraRadius = Math.max( pie3d.diameter, 1) * Math.max( pie3d.verticalFactor, 1) * 3;
  camera.radius = cameraRadius;
  camera.lowerRadiusLimit = cameraRadius;
  camera.upperRadiusLimit = cameraRadius;
    
  camera.alpha = -Math.PI / 2; // - PI/2 : on negative Z
  const angleRad = Math.PI / 180 * pie3d.cameraDegreesY;
  camera.beta = Math.PI/2 - angleRad; // normally from top (Y) towards ZX-plane. Now vice versa, the camera goes up Y degrees
    
  // limit Beta rotation between 0 and 90 degrees, when allowVerticalRotation is on.
  const cameraRadiansY = Math.PI/2 - BABYLON.Angle.FromDegrees(pie3d.cameraDegreesY).radians();
  camera.lowerBetaLimit = ( pie3d.allowVerticalRotation ? BABYLON.Angle.FromDegrees( 0).radians() : cameraRadiansY);
  camera.upperBetaLimit = ( pie3d.allowVerticalRotation ? BABYLON.Angle.FromDegrees(90).radians() : cameraRadiansY);
    
  //
  // set angle (field of view) of camera to fill the canvas as good as possible
  // simply take the angle (in 2d) between origin (0,0), the camera position and the highest / farest point on the pie ( diameter/2, verticalfactor/2)
  // and the angle for origin, camera position and the lowest, nearest point
  // take the max of both radians, et voila, we have a good Fov.
  //
  const p0 = { 'x': 0, 'y': 0 };
  const p1 = { 'x': - cameraRadius * Math.sin(angleRad), 'y': cameraRadius * Math.cos(angleRad) };
  const p2_up = { 'x': pie3d.diameter / 2, 'y': pie3d.verticalFactor / 2};
  const a_up = angleBetween3Points( p0, p1, p2_up);

  const p2_down = { 'x': - pie3d.diameter / 2, 'y': -pie3d.verticalFactor / 2};
  const a_down = angleBetween3Points( p0, p1, p2_down);
    
  camera.fov = Math.max( a_up, a_down) * pie3d.cameraFovFactor;
        
  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3( cameraRadius, cameraRadius * 2, cameraRadius * 1.2));
      
  // an extra point light, so also the bottom color (texture) shows
  const light2 = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3( cameraRadius * 0.2, - cameraRadius, cameraRadius * -.2), scene);
  light2.intensity = .6;
  
  // increment the delay between two clicks to be recognised as one double click
  BABYLON.Scene.DoubleClickDelay = 500; // ms
    
  let backgroundColor3 = new BABYLON.Color3.FromHexString( colorHex( pie3d.backgroundColor));
  scene.clearColor = backgroundColor3;

  pie3d.scene = scene;
    
  // the very pie chart
  pieChart( pie3d);
    
  return scene;
};


function setPie3d( pie3d) {

  let setDefault = function ( property, defaultValue) {
    if (pie3d[property] == undefined) pie3d[property] = defaultValue;
  }
  
  // configuration options
  setDefault( 'verticalFactor', 1);
  setDefault( 'cameraDegreesY', 45);
  setDefault( 'allowVerticalRotation', true);
  setDefault( 'spaceBetweenSlices', false);
  setDefault( 'innerRadiusPct', 0);
  setDefault( 'showLabel', false);
  setDefault( 'showHeight', false);
  setDefault( 'labelFontFactor', 1);
  setDefault( 'labelExtraTopMargin', 0);
  setDefault( 'backgroundColor', '#808080');
  setDefault( 'clickScalePct', 0);
  setDefault( 'labelColor', '');
  setDefault( 'secondsPerRotation', 0);
  setDefault( 'addLegend', false);

  let slices = pie3d.slices.length;
  for (let i = 0; i < slices; i++) {
    if ( pie3d.slices[i].arcPct == undefined) pie3d.slices[i].arcPct = (1 / slices * 100).toFixed(2);
    if ( pie3d.slices[i].label == undefined) pie3d.slices[i].label = '';
  }
  
  // internal values
  pie3d.diameter = 4;
  pie3d.cameraFovFactor = 2.2; // add this to the calculated FOV so there are some margins.
  
  console.log( 'pie3d defaulted', pie3d);
}


function add_legend( pie3d) {
  const legendDiv = document.createElement("div");
  pie3d.legendDiv = legendDiv;
  
  if (pie3d.addLegend) {

    // position the legend like the canvas.
    // marginLeft not yet adjusted when the engine resizes
    // other solution could be to set the canvas position as relative, and this legend div as absolute against the canvas. (offsetting the height)
    legendDiv.style.width = pie3d.canvas.width + 'px';
    legendDiv.style.marginLeft = pie3d.canvas.style.marginLeft;

    legendDiv.style.marginTop = '6px';
    
    legendDiv.style.display = 'flex';
    legendDiv.style.flexFlow = 'row wrap';
    legendDiv.style.justifyContent = 'space-around';
    
    // in case one want custom css, you can do via this class
    legendDiv.classList.add('candy-pie-legend');
    
    // add legenddiv after canvas, same level
    let canvasElement = pie3d.canvas;
    canvasElement.parentNode.insertBefore( legendDiv, canvasElement.nextSibling);

    let pixelSize = '16px';

    for (let i= 0; i < pie3d.slices.length; i++) {

      // label item
      let legendItem = document.createElement("div");
      
      legendItem.style.display = 'flex'; // set to flex to have both child divs on one row
      // force all items to have the same width.
      
      legendItem.style.flexGrow = 1;
      legendItem.style.flexShrink = 1;
      legendItem.style.flexBasis = 0;
      
      legendItem.style.border = '2px solid white';
      
      legendItem.style.justifyContent = 'center';
      legendItem.style.backgroundColor = pie3d.backgroundColor;

      // in case the items flow in a second row, add some margin to have vertical space between them
      legendItem.style.marginTop = '2px';
      legendItem.style.marginBottom = '2px';

      legendItem.style.padding= '0.5em 1em';
      legendItem.classList.add('candy-pie-legend-item');

      legendItem.onclick = function() { scaleSegment(pie3d, i); };
      legendItem.style.cursor = 'pointer';

      // little circle 
      let circleItem = document.createElement("div");
      circleItem.textContent = ' ';
      circleItem.style.borderRadius = '50%';
      circleItem.style.backgroundColor = pie3d.slices[i].color;
      circleItem.style.width = pixelSize;
      circleItem.style.height = pixelSize; // even this does not guarantees same width & height
      circleItem.style.border = 'solid white 3px';
      circleItem.style.marginRight = '8px';

      // text item
      let textItem = document.createElement("div");
      textItem.textContent = pie3d.slices[i].label;
      
      textItem.style.color = pie3d.labelColor || 'white'; // or the flip color, remember ?
      textItem.style.fontSize = pixelSize;
      textItem.style.fontWeight = 'bold';

      if ( pie3d.slices[i].label) {
        legendDiv.appendChild(legendItem);
        legendItem.appendChild(circleItem);
        legendItem.appendChild(textItem);
      }
      
    }
  }
}


function scaleSegment(pie3d, i) {
  
  let newScale = pie3d.scene.meshes[i].scaling.x > 1 ? 1 : 1 + pie3d.clickScalePct / 100;
  console.log('newscale', newScale);
  
  pie3d.scene.meshes[i].scaling.x = newScale;
  pie3d.scene.meshes[i].scaling.y = newScale;
  pie3d.scene.meshes[i].scaling.z = newScale;
}


function candy_pie_babylon ( pie3d) {

  pie3d.canvas = document.getElementById( pie3d.htmlCanvasId);

  if (pie3d['engine'] != undefined) {
    pie3d.engine.dispose();
  }
  
  pie3d.engine = new BABYLON.Engine( pie3d.canvas, true);
  
  setPie3d( pie3d);

  var scene = createPieChartScene( pie3d);
  
  pie3d.engine.runRenderLoop(function () {
    scene.render();
  });
      
  window.addEventListener("resize", function () {
    pie3d.engine.resize();
    pie3d.legendDiv.style.width = pie3d.canvas.width + 'px';
  });

  add_legend( pie3d);
}