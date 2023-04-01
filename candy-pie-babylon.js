//#region introCandyPie
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
      labelFontFactor
      labelExtraTopMargin
      backgroundColor
      labelColor
      secondsPerRotation
      addLegend
      rotationSlowDown
      sliceShowLabel
      hoverShowLabel
      hoverShowHeight
      hoverShowArcPct
      extraStartDegrees : start point is 6 o'clock, this is added clockwise.
      renderOnce : issues with this one in the playground, and also need to call it twice, so more to investigate before rolling out

    data for each slice in an array, slices, as part of the pie3d object,  fields being 
    - height
    - arcPct
    - color
    - label

      'slices': [
        { 'height': 100, 'arcPct': 50, 'color': 'red',    'label': 'label1'},
        { 'height': 125, 'arcPct': 25, 'color': 'blue',   'label': 'label2'},
        { 'height': 150, 'arcPct': 25, 'color': 'yellow', 'label': 'label3'}
      ]
    
*/
//#endregion

candyPie = {};

candyPie.colorHex = function(str) {
  // thanks: https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
  
  var ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = str;
  
  return ctx.fillStyle;
}


candyPie.invertColor = function(hex, modeBlackWhite) {
  // thanks: https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
  
  if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
      throw new Error('Invalid HEX color. Length ' + hex.length);
  }
  var r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16);
  if (modeBlackWhite) {
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
  return "#" + r.padStart(2, '0') + g.padStart(2, '0') + b.padStart(2, '0');
}


candyPie.angleBetween3Points = function(p0,p1,p2) {
  // Center point is p1; angle returned in Radians
  var b = Math.pow(p1.x-p0.x,2) + Math.pow(p1.y-p0.y,2),
      a = Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2),
      c = Math.pow(p2.x-p0.x,2) + Math.pow(p2.y-p0.y,2);
  
  var radians = Math.acos( (a+b-c) / Math.sqrt(4*a*b));
  // console.log( 'angleBetween3Points', radians, 'degrees', ( radians * (180 / Math.PI)).toFixed(2))
  return radians;
}


candyPie.rad2degrees = function(radians, cleanUp) {
  let degrees = radians / (2*Math.PI) * 360;
  degrees = cleanUp ? Math.trunc(degrees) + '°' : degrees;
  return degrees;
}


candyPie.degrees2rad = function(degrees) {
  return degrees / 180 * Math.PI;
}


candyPie.initHover = function(pie3d) {
  
  if (!BABYLON.GUI) {
    let msg = 'Babylon gui library not present. Hover not possible.';
    console.log(msg);
    return msg;
  }

  // set pie3d.gui once for all hovers on meshes.
  // must be overwritten/reset when drawing the pie again  (like in the playground)
  pie3d.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  // stores the click state (boolean) for each mesh (mesh-id is the key in the hash map)
  pie3d.hoverState = [];
}


candyPie.addHover = function( {pie3d, mesh, label, height, arcPct, color}) {
  
  if (!pie3d.gui) {
    return 'pie3d.gui is not set during init. run.';
  }
  
  if ( pie3d.hoverShowLabel + pie3d.hoverShowHeight + pie3d.hoverShowArcPct == 0) {
    return 'no hover settings active. ciao.';
  }

  function addHoverText( condition, text) {
    if (condition && text) {
      hoverTexts.push(text)
    }
  }
  
  let hoverTexts = [];
  addHoverText( pie3d.hoverShowLabel,  label);
  addHoverText( pie3d.hoverShowHeight, height);
  addHoverText( pie3d.hoverShowArcPct, (arcPct*100) + '%');
  
  let hoverTxt = hoverTexts.join('\n');

  let button = BABYLON.GUI.Button.CreateSimpleButton( mesh.id + '-hover', hoverTxt);
  button.width = (label.length > 12 ? 250 : 150 ) + "px";
  button.height = (25 * ((pie3d.hoverShowLabel + pie3d.hoverShowHeight + pie3d.hoverShowArcPct)+1)) + "px";

  button.background = color;
  button.color = candyPie.invertColor( candyPie.colorHex(color), true);
  button.alpha = 0.6;
  
  button.cornerRadius = 20;
  button.thickness = 4;

  button.scaleX = 0;    // wil be changed via animations
  button.scaleY = 0;    // wil be changed via animations
  button.rotation = 0;  // wil be changed via animations
  
  // default true for a button, set it to false for mobile, so we can touch the hover box to get it disappear
  button.isPointerBlocker = false;
  
  pie3d.gui.addControl(button);

  button.linkWithMesh(mesh);

  // add 3 animations to the mesh
  let actionManager = new BABYLON.ActionManager(pie3d.scene);

  mesh.actionManager = actionManager;

  let scaleXAnimation = new BABYLON.Animation("hoverX", "scaleX",   30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  let scaleYAnimation = new BABYLON.Animation("hoverY", "scaleY",   30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  let scaleRotation   = new BABYLON.Animation("hoverR", "rotation", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  
  let keysOnOff = [
    { frame:  0, value: 0}, 
    { frame: 10, value: 1}
  ];
  scaleXAnimation.setKeys(keysOnOff);
  scaleYAnimation.setKeys(keysOnOff);

  pie3d.rotationAnimationKeys = [
    { frame:  0, value: 0},
    //#region rotationKeyEndValueStory
    /*
      add some variation to the target value for rotation
      last digit of the slice-id, module 3, minus 1, so iterating through -1, 0, 1
      and then rotate 15° ( multiply by PI / 12)

      == obsolete = memories =
      Tried to have the rotation orthogonal on the position of the slice, but was rather complicated for little effect
      since the text can only rotate a little to keep it readible and not stretch your neck too much.
      Came up with an algo to rotate driven by quadrant

      in the onPickTrigger function

      get position from internal variables to find the middle of the box
        canvas = H x W
        gui box = h x w, positioned within the canvas via left & top

        horizontal middle = left + w/2
        vertical middle   = top  + h/2

        xPct, yPct : handle them as percentages, and bring them to the middle of the canvas, and invert the Y ax

        => q(uadrant) & rot(ation)

        move that rotation to the target value of the rotation keys, and reset the keys


          let H = button._cachedParentMeasure.height,
                  W = button._cachedParentMeasure.width,
                  h = button._currentMeasure.height,
                  w = button._currentMeasure.width,
                  t = button._currentMeasure.top,
                  l = button._currentMeasure.left,
                  xPct =  2* (Math.trunc(( l + w/2)/W * 100) - 50),
                  yPct = -2* ( Math.trunc(( t + h/2)/H * 100) - 50),
                  q = xPct > 0 ? yPct > 0 ? 1 : 4 : yPct > 0 ? 2 : 3,
                  rot = (xPct > 0 ? yPct > 0 ? 1 : -1 : yPct > 0 ? -1 : 1) * 0.33;
              
              pie3d.rotationAnimationKeys[1].value = rot;
              scaleRotation.setKeys( pie3d.rotationAnimationKeys);

    */
    //#endregion
    { frame: 10, value: (mesh.id.slice(-1)%3-1) * Math.PI / 12}
  ];
  scaleRotation.setKeys( pie3d.rotationAnimationKeys);

  button.animations = [scaleXAnimation, scaleYAnimation, scaleRotation];

  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPickTrigger, 
      function(ev){

        if ( ! pie3d.hoverState[mesh.id]) {
          pie3d.scene.beginAnimation(button, 0, 10, false);  //Begin animation - object to animate, first frame, last frame and loop if true
          pie3d.hoverState[mesh.id] = true;

        } else if ( pie3d.hoverState[mesh.id]) {
          pie3d.scene.beginAnimation(button, 10, 0, false); // inverse frames
          pie3d.hoverState[mesh.id] = false;
        }
      }));
  
  //if hover is over (on pointer out ) : remove highlight of the mesh
  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPointerOutTrigger, 
      function(ev){

        if ( pie3d.hoverState[mesh.id]) {
          pie3d.scene.beginAnimation(button, 10, 0, false);  // inverse frames again, cf 2nd click.
          pie3d.hoverState[mesh.id] = false;
        }
      }));
}


candyPie.pieChart = function(pie3d) {
  
  let oneSlice = function( {relativeHeight, arcFraction, color, label, realHeight}) {
    
    if (relativeHeight <= 0 || arcFraction <= 0) {
      return;
    }

    // CSG: Constructive Solid Geometry : pie (= cylinder with arc) - full cylinder for inner part to carve out
      
    // face UV is used to have the text on front. All other faces just get the background color
    const uniPiece = new BABYLON.Vector4(0, 0, 0.1, 0.1); // take a little piece from the left top
    let faceUV = new Array(6).fill( uniPiece);
    faceUV[1] = new BABYLON.Vector4(1, 0, 0, 1); // inverse the whole texture (w text), shown on negative Z
  
    // cylinder with arc
    const pie = BABYLON.MeshBuilder.CreateCylinder( 'pie', {
      height: Math.abs( relativeHeight),
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
      height: Math.abs( relativeHeight),
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
      height: 200 * Math.abs( relativeHeight) // same for height
    });
      
    const fontsize = 32 * pie3d.labelFontFactor;
    const font = ['bold', fontsize + 'px', 'monospace'].join( ' ');
    const blackWhiteVariant = true;
    const textColor = pie3d.labelColor || candyPie.invertColor( candyPie.colorHex(color), blackWhiteVariant);
    const textInvertY = true; // see also faceUV[1] : Vector4(1, 0, 0, 1) instead of 0-0 1-1 in the u-v plane (u: horizontal, left to right ; v: vertically up)
  
    let textOnSlice = pie3d.sliceShowLabel ? label : '';

    const txt_X_distance_from_left_hand_edge = 40;
    const txt_Y_distance_from_the_top = ( 60 * ( 1 + ( pie3d.labelFontFactor / 3))) + Number( pie3d.labelExtraTopMargin);
    //console.log( 'txt_Y_distance_from_the_top', txt_Y_distance_from_the_top);

    texture.drawText( textOnSlice, txt_X_distance_from_left_hand_edge, txt_Y_distance_from_the_top, font, textColor, color, textInvertY);
    
    let mat = new BABYLON.StandardMaterial( 'mat-' + sliceNr);
    mat.diffuseTexture = texture;
  
    donut.material = mat;
      
    pie.dispose();
    cyl.dispose();
  
    // rebase y position, so that all slices sit on the xz-plane
    donut.position.y = ( relativeHeight / 2 ) - (pie3d.verticalFactor / 2 );
      
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
      
    candyPie.addHover( {"pie3d": pie3d, "mesh": donut, "label": label, "height": realHeight, "arcPct": arcFraction, "color": color});

    if ( pie3d.secondsPerRotation > 0 ) {
      // add rotation
      pie3d.scene.registerAfterRender( function () {
        let extraAnglePerFrame = pie3d.secondsPerRotation > 0 ? 2*Math.PI/60 / pie3d.secondsPerRotation : 0;
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
  // and adjust for the starting angle
  let rotY = Math.PI/2 
           - (2 * Math.PI * slices[0].arcPct / 100 / 2) 
           + candyPie.degrees2rad( pie3d.extraStartDegrees);
  let sliceNr = 0;

  candyPie.initHover(pie3d);
  
  for ( let i = 0; i < slices.length; i++) {
    
    let p = slices[i],
        h = p.height / maxVal * pie3d.verticalFactor;
  
    let slice = oneSlice({ "relativeHeight": h, "arcFraction": p.arcPct / 100, "color": p.color, "label": p.label, "realHeight": p.height});
    
    // increment rotY for the next slice
    rotY = rotY + ( 2 * Math.PI * p.arcPct / 100);
    sliceNr = sliceNr + 1;
    
    // spinTo[0] is already initialised
    if (!pie3d.spinTo[i]) {
      // first slice starts with - π / 2, then subtract half of the previous slice and subtract half of the actual slice
      pie3d.spinTo[i] = pie3d.spinTo[i-1] - (Math.PI * slices[i-1].arcPct / 100) - (Math.PI * slices[i].arcPct / 100);
    }
        
  }
}


candyPie.angularFieldOfView = function(pie3d, cameraRadius, addDiaPoint = true, logging = false) {
  //
  // find angle (field of view) of camera to fill the canvas as good as possible
  // take the angle (in 2d) between origin (0,0), the camera position and some points ( variations of diameter/2, verticalfactor/2)
  // take the max of these radians, and multiply by 2 to obtain the final Angular Field Of View.
  // the choice of the points is pictured here : https://www.geogebra.org/geometry/wqmpzc7n
  //
  let halfDia = pie3d.diameter/2,
      halfVert = pie3d.verticalFactor/2;
  
  const pZero = { 'x': 0, 'y': 0 },
        angleRad = candyPie.degrees2rad( pie3d.cameraDegreesY),
        pCamera = { 'x': cameraRadius * Math.cos(angleRad), 'y': cameraRadius * Math.sin(angleRad)};
  
  let angles = [];
  angles.push( candyPie.angleBetween3Points( pZero, pCamera, {'x': -halfDia,'y':  halfVert}));
  angles.push( candyPie.angleBetween3Points( pZero, pCamera, {'x':  halfDia,'y': -halfVert}));
  angles.push( candyPie.angleBetween3Points( pZero, pCamera, {'x':  halfDia,'y':  halfVert}));
  
  // added this point to overcome an edge cases 
  //   when verticalfactor is low (1) compared to diameter (4) with camera degree low (<20).
  //   the pie was filling the whole canvas height (okay), but visually not ok
  //   this happens because we do not take into account the width (diameter) in determing the fov, so add something like that

  if ( addDiaPoint) {
    angles.push( candyPie.angleBetween3Points( pZero, pCamera, {'x': 0,'y': halfDia}));
  }
  
  const fovMax = Math.max( ... angles),
        fovFinal = fovMax * pie3d.cameraFovFactor;
  
  if (logging) {
    for ( let i = 0; i < angles.length; i++) {
      console.log( 'half fov point ', i, ': ', candyPie.rad2degrees( angles[i], true));
    }
    
    console.log( 'max', candyPie.rad2degrees( fovMax, true),
      'final', candyPie.rad2degrees( fovFinal, true),
      'final', fovFinal
    );
  }
  
  return fovFinal;
}
  
candyPie.createPieChartScene = function ( pie3d) {

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
  const angleRad = candyPie.degrees2rad( pie3d.cameraDegreesY);
  camera.beta = Math.PI/2 - angleRad; // normally from top (Y) towards ZX-plane. Now vice versa, the camera goes up Y degrees
    
  // limit Beta rotation between 0 and 90 degrees, when allowVerticalRotation is on.
  const cameraRadiansY = Math.PI/2 - BABYLON.Angle.FromDegrees(pie3d.cameraDegreesY).radians();
  camera.lowerBetaLimit = ( pie3d.allowVerticalRotation ? BABYLON.Angle.FromDegrees( 0).radians() : cameraRadiansY);
  camera.upperBetaLimit = ( pie3d.allowVerticalRotation ? BABYLON.Angle.FromDegrees(90).radians() : cameraRadiansY);
  
  // set angle (field of view) of camera to fill the canvas as good as possible
  camera.fov = candyPie.angularFieldOfView(pie3d, cameraRadius);
        
  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3( cameraRadius, cameraRadius * 2, cameraRadius * 1.2));
      
  // an extra point light, so also the bottom color (texture) shows
  const light2 = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3( cameraRadius * 0.2, - cameraRadius, cameraRadius * -.2), scene);
  light2.intensity = .6;
  
  // increment the delay between two clicks to be recognised as one double click
  BABYLON.Scene.DoubleClickDelay = 500; // ms
    
  let backgroundColor3 = new BABYLON.Color3.FromHexString( candyPie.colorHex( pie3d.backgroundColor));
  scene.clearColor = backgroundColor3;

  pie3d.scene = scene;
    
  // the very pie chart
  candyPie.pieChart( pie3d);
  
  // call the render already here, to make the renderOnce feature more stable.
  scene.render();
  
  return scene;
};


candyPie.setPie3d = function( pie3d) {

  let setDefault = function ( property, defaultValue) {
    if (pie3d[property] == undefined) pie3d[property] = defaultValue;
  }
  
  // configuration options
  setDefault( 'verticalFactor', 1);
  setDefault( 'cameraDegreesY', 45);
  setDefault( 'allowVerticalRotation', true);
  setDefault( 'spaceBetweenSlices', false);
  setDefault( 'innerRadiusPct', 0);
  setDefault( 'labelFontFactor', 1);
  setDefault( 'labelExtraTopMargin', 0);
  setDefault( 'backgroundColor', '#808080');
  setDefault( 'labelColor', '');
  setDefault( 'secondsPerRotation', 0);
  setDefault( 'addLegend', false);
  setDefault( 'rotationSlowDown', false);
  setDefault( 'sliceShowLabel', false);
  setDefault( 'hoverShowLabel', false);
  setDefault( 'hoverShowHeight', false);
  setDefault( 'hoverShowArcPct', false);
  setDefault( 'extraStartDegrees', 0);
  setDefault( 'renderOnce', false);

  if (pie3d.addLegend && (pie3d.secondsPerRotation > 0)) {
    // the rotation interferes with the repositioning of the camera when clicking on a legend item.
    // Give preference to the legend functionality.
    console.log( 'Candy Pie: set seconds per rotation to zero');
    pie3d.secondsPerRotation = 0;
  }

  let slices = pie3d.slices.length;
  for (let i = 0; i < slices; i++) {
    if ( pie3d.slices[i].arcPct == undefined) pie3d.slices[i].arcPct = (1 / slices * 100).toFixed(2);
    if ( pie3d.slices[i].label == undefined) pie3d.slices[i].label = '';
  }
  
  // internal values
  pie3d.diameter = 4;
  pie3d.cameraFovFactor = 2.2; // add this to the calculated FOV so there are some margins.
  
  pie3d.spinTo = [ -Math.PI/2];
  
}


candyPie.add_legend = function( pie3d) {

  // first cleanup from previous calls (like in the playground)
  if ( pie3d.legendDiv ) { 
    pie3d.legendDiv.remove();
  }
  
  const legendDiv = document.createElement("div");
  pie3d.legendDiv = legendDiv;

  let cntLegendItems = 0;
  
  if (pie3d.addLegend) {

    // position the legend like the canvas.
    // marginLeft not yet adjusted when the engine resizes
    // other solution could be to set the canvas position as relative, and this legend div as absolute against the canvas. (offsetting the height)

    let computedStyles = window.getComputedStyle( pie3d.canvas);
    legendDiv.style.width = computedStyles.getPropertyValue("width");
    legendDiv.style.marginLeft = computedStyles.getPropertyValue("margin-left");

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

      legendItem.onclick = function() { candyPie.spinTo(pie3d, 'alpha', pie3d.spinTo[i], 80); };
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
        
        cntLegendItems += 1;
      }
    }

    if (cntLegendItems == 0) {
      console.log( 'addLegend true but no labels found, so no legend items created.');
    }
  }
}


candyPie.babylon = function( pie3d) {

  pie3d.canvas = document.getElementById( pie3d.htmlCanvasId);

  if (pie3d['engine'] != undefined) {
    pie3d.engine.dispose();
  }
  
  pie3d.engine = new BABYLON.Engine( pie3d.canvas, true);
  
  candyPie.setPie3d( pie3d);

  var scene = candyPie.createPieChartScene( pie3d);
  
  if (pie3d.renderOnce) {
    console.log( 'renderOnce');
    scene.render();

  } else {
    pie3d.engine.runRenderLoop(function () {

      scene.render();

      // slow down, little by little in case rotationSlowDown is set.
      pie3d.secondsPerRotation *= pie3d.rotationSlowDown ? 1.0005 : 1;
      if (pie3d.secondsPerRotation > 100) {
        pie3d.secondsPerRotation = 0;
      }

    });
  }
      
  window.addEventListener("resize", function () {
    pie3d.engine.resize();
    pie3d.legendDiv.style.width = pie3d.canvas.width + 'px';
  });

  candyPie.add_legend( pie3d);
}


candyPie.spinTo = function( pie3d, property, targetval, speed) {
  let camera = pie3d.scene.cameras[0], // only 1 camera, take the 1st
      ease = new BABYLON.CubicEase();
  ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
  //console.log( 'spinTo', 'actual val', property, camera[property]);
  // works fine at least for alpha, beta, radius
  BABYLON.Animation.CreateAndStartAnimation('spinCamera', camera, property, speed, 120, camera[property], targetval, 0, ease);
}
