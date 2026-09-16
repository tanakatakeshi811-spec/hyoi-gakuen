/* ============================================================
   憑愛学園 -Possessed Heart- ゲーム本体
   three.js r128 / ビルド不要 / 単一プロジェクト内で完結
   ============================================================ */
'use strict';
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function angNorm(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }
function dist2(x1,z1,x2,z2){ const dx=x1-x2,dz=z1-z2; return dx*dx+dz*dz; }
function inZone(x,z,zn){ return x>=zn.x0&&x<=zn.x1&&z>=zn.z0&&z<=zn.z1; }

/* ---------------- グリッド/マップ生成 ---------------- */
let grid;
function initGrid(){
  grid=[];
  for(let r=0;r<ROWS;r++) grid.push(new Array(COLS).fill('#'));
  function carve(c0,r0,c1,r1){
    for(let r=r0;r<=r1;r++) for(let c=c0;c<=c1;c++) if(grid[r]&&c>=0&&c<COLS) grid[r][c]='.';
  }
  ROOMS.forEach(function(rm){ carve(rm.c0,rm.r0,rm.c1,rm.r1); });
  DOORS.forEach(function(d){ carve(d[0],d[1],d[2],d[3]); });
}
function isFloor(c,r){ return c>=0&&c<COLS&&r>=0&&r<ROWS&&grid[r][c]==='.'; }

function mergeGeos(list){
  if(!list.length) return new THREE.BufferGeometry();
  const nis=list.map(function(g){ return g.toNonIndexed(); });
  let n=0; nis.forEach(function(g){ n+=g.attributes.position.count; });
  const P=new Float32Array(n*3), N=new Float32Array(n*3);
  let o=0;
  nis.forEach(function(g){
    P.set(g.attributes.position.array,o*3);
    N.set(g.attributes.normal.array,o*3);
    o+=g.attributes.position.count; g.dispose();
  });
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(P,3));
  out.setAttribute('normal',new THREE.BufferAttribute(N,3));
  return out;
}

const OBSTACLES=[]; // 屋外/屋上の当たり判定(円)
const PROPS=[];     // インタラクト可能な小物
let sceneObstacleMeshes=[];

function buildIndoor(){
  const wallGeos=[], floorGeos=[];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const isW=grid[r][c]==='#';
      const g=new THREE.BoxGeometry(TILE, isW?3.4:0.2, TILE);
      g.translate(c*TILE+TILE/2, isW?1.7:-0.1, r*TILE+TILE/2);
      (isW?wallGeos:floorGeos).push(g);
    }
  }
  const wallMesh=new THREE.Mesh(mergeGeos(wallGeos), PM(0xdcd3c0,10,0x222222));
  wallMesh.castShadow=true; wallMesh.receiveShadow=true;
  scene.add(wallMesh);
  const floorMesh=new THREE.Mesh(mergeGeos(floorGeos), LM(0xb8ad94));
  floorMesh.receiveShadow=true;
  scene.add(floorMesh);
  /* 部屋名ラベル */
  ROOMS.forEach(function(rm){
    const c=roomCenter(rm.key);
    const spr=makeLabelSprite(rm.name);
    spr.position.set(c.x,4.4,c.z);
    scene.add(spr);
  });
}

function makeLabelSprite(text,size){
  const cv=document.createElement('canvas'); cv.width=280; cv.height=64;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='rgba(16,12,28,0.72)'; ctx.fillRect(0,0,280,64);
  ctx.strokeStyle='#8a72e0'; ctx.lineWidth=3; ctx.strokeRect(2,2,276,60);
  ctx.fillStyle='#f0ece0'; ctx.font='bold 26px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text,140,34);
  const tex=new THREE.CanvasTexture(cv);
  const mat=new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true});
  const spr=new THREE.Sprite(mat); spr.scale.set(size||7,(size||7)*0.23,1); spr.renderOrder=999;
  return spr;
}

function addObstacleBox(cx,cz,w,d,rotY,color){
  const g=new THREE.BoxGeometry(w,2.6,d);
  const m=new THREE.Mesh(g,LM(color||0x6b6255));
  m.position.set(cx,1.3,cz); if(rotY) m.rotation.y=rotY;
  m.castShadow=true; m.receiveShadow=true;
  scene.add(m);
  OBSTACLES.push({x:cx,z:cz,r:Math.max(w,d)/2+0.3});
}
function addTree(x,z){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,2.2,8),LM(0x5a4028));
  trunk.position.set(x,1.1,z); trunk.castShadow=true; scene.add(trunk);
  const leaf=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,8),LM(0x3f7a45));
  leaf.position.set(x,2.9,z); leaf.castShadow=true; scene.add(leaf);
  OBSTACLES.push({x:x,z:z,r:0.9});
}
function addBench(x,z,rotY){
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rotY||0;
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.15,0.6),LM(0x8a6a44)); seat.position.y=0.5; g.add(seat);
  [-0.8,0.8].forEach(function(sx){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.5),LM(0x3a3a3a));
    leg.position.set(sx,0.25,0); g.add(leg);
  });
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  scene.add(g);
  OBSTACLES.push({x:x,z:z,r:1.1});
}

function buildOutdoor(){
  const g=new THREE.Mesh(new THREE.PlaneGeometry(OUTDOOR_ZONE.x1-OUTDOOR_ZONE.x0, OUTDOOR_ZONE.z1-OUTDOOR_ZONE.z0),
    LM(0x6faa5c));
  g.rotation.x=-Math.PI/2;
  g.position.set((OUTDOOR_ZONE.x0+OUTDOOR_ZONE.x1)/2,-0.05,(OUTDOOR_ZONE.z0+OUTDOOR_ZONE.z1)/2);
  g.receiveShadow=true; scene.add(g);
  /* 柵(境界) */
  const fenceMat=LM(0x554a3a);
  function fenceLine(x0,z0,x1,z1){
    const len=Math.hypot(x1-x0,z1-z0);
    const fm=new THREE.Mesh(new THREE.BoxGeometry(len,1.2,0.2),fenceMat);
    fm.position.set((x0+x1)/2,0.6,(z0+z1)/2);
    fm.rotation.y=Math.atan2(x1-x0,z1-z0)+Math.PI/2;
    scene.add(fm);
  }
  fenceLine(OUTDOOR_ZONE.x0,OUTDOOR_ZONE.z1,OUTDOOR_ZONE.x1,OUTDOOR_ZONE.z1);
  fenceLine(OUTDOOR_ZONE.x0,OUTDOOR_ZONE.z0,OUTDOOR_ZONE.x0,OUTDOOR_ZONE.z1);
  fenceLine(OUTDOOR_ZONE.x1,OUTDOOR_ZONE.z0,OUTDOOR_ZONE.x1,OUTDOOR_ZONE.z1);
  /* 木・ベンチ(中庭) */
  [[70,140],[110,135],[150,145],[80,175],[140,175]].forEach(function(p){ addTree(p[0],p[1]); });
  addBench(90,150,0); addBench(120,150,Math.PI);
  /* 祠(お参りスポット) */
  const shr=roomCenter('shrine');
  const stone=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.2,1.0),LM(0x9a9a9a));
  stone.position.set(shr.x,0.6,shr.z); stone.castShadow=true; scene.add(stone);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.4,0.8,4),LM(0x6b4a2c));
  roof.position.set(shr.x,1.5,shr.z); roof.rotation.y=Math.PI/4; scene.add(roof);
  OBSTACLES.push({x:shr.x,z:shr.z,r:0.9});
  /* グラウンド(旗・ゴール風の飾り) */
  [[60,235],[200,235]].forEach(function(p){
    const pole=new THREE.Mesh(new THREE.BoxGeometry(0.2,3,0.2),LM(0xd8d2c0));
    pole.position.set(p[0],1.5,p[1]); scene.add(pole);
  });
  /* 旧倉庫 */
  buildShed();
}

function buildShed(){
  const w=SHED.w,d=SHED.d,cx=SHED.x,cz=SHED.z,h=2.6,t=0.3;
  const mat=LM(0x3a3226);
  function wall(x,z,ww,dd){ addObstacleBoxRaw(x,z,ww,h,dd,mat); }
  wall(cx,cz-d/2, w, t);              // 北壁
  wall(cx-w/2, cz, t, d);             // 西壁
  wall(cx+w/2, cz, t, d);             // 東壁
  wall(cx-w/2*0.4, cz+d/2, w*0.55, t);// 南壁(東寄りだけ、西側はドア開口)
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+1,0.3,d+1),LM(0x24201a));
  roof.position.set(cx,h+0.15,cz); scene.add(roof);
  const label=makeLabelSprite('旧倉庫'); label.position.set(cx,h+1.6,cz); scene.add(label);
  OBSTACLES.push({x:cx,z:cz-d/2,r:1}); // 大まかな当たり判定は壁ごとに追加済み
}
function addObstacleBoxRaw(cx,cz,w,h,d,mat){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(cx,h/2,cz); m.castShadow=true; m.receiveShadow=true; scene.add(m);
  OBSTACLES.push({x:cx,z:cz,r:Math.max(w,d)/2});
}

function buildRoof(){
  const w=48,d=48,cx=ROOF_OFFSET.x+w/2,cz=ROOF_OFFSET.z+d/2;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,d),LM(0x8a8578));
  floor.rotation.x=-Math.PI/2; floor.position.set(cx,0,cz); floor.receiveShadow=true; scene.add(floor);
  const railMat=LM(0x777777);
  function rail(x0,z0,x1,z1){
    const len=Math.hypot(x1-x0,z1-z0);
    const m=new THREE.Mesh(new THREE.BoxGeometry(len,1.1,0.15),railMat);
    m.position.set((x0+x1)/2,0.55,(z0+z1)/2);
    m.rotation.y=Math.atan2(x1-x0,z1-z0)+Math.PI/2;
    scene.add(m);
  }
  rail(ROOF_OFFSET.x,ROOF_OFFSET.z,ROOF_OFFSET.x+w,ROOF_OFFSET.z);
  rail(ROOF_OFFSET.x,ROOF_OFFSET.z,ROOF_OFFSET.x,ROOF_OFFSET.z+d);
  rail(ROOF_OFFSET.x+w,ROOF_OFFSET.z,ROOF_OFFSET.x+w,ROOF_OFFSET.z+d);
  rail(ROOF_OFFSET.x,ROOF_OFFSET.z+d,ROOF_OFFSET.x+16,ROOF_OFFSET.z+d);
  rail(ROOF_OFFSET.x+32,ROOF_OFFSET.z+d,ROOF_OFFSET.x+w,ROOF_OFFSET.z+d);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.15,0.6),LM(0x8a6a44));
  bench.position.set(cx,0.5,cz); scene.add(bench);
  const label=makeLabelSprite('屋上'); label.position.set(cx,4,cz); scene.add(label);
}

/* ---------------- 当たり判定 ---------------- */
function blocked(x,z,rad){
  rad=rad||0.4;
  if(x>=0&&x<COLS*TILE&&z>=0&&z<ROWS*TILE){
    const pts=[[0,0],[rad,0],[-rad,0],[0,rad],[0,-rad]];
    for(let i=0;i<pts.length;i++){
      const c=Math.floor((x+pts[i][0])/TILE), r=Math.floor((z+pts[i][1])/TILE);
      if(!isFloor(c,r)) return true;
    }
    return false;
  }
  if(inZone(x,z,OUTDOOR_ZONE)||inZone(x,z,ROOF_ZONE)){
    for(let i=0;i<OBSTACLES.length;i++){
      const o=OBSTACLES[i];
      if(dist2(x,z,o.x,o.z) < (o.r+rad)*(o.r+rad)) return true;
    }
    return false;
  }
  return true;
}

/* ---------------- three.js セットアップ ---------------- */
let scene,camera,renderer,clockObj;
let playerObj;
let camYaw=Math.PI, camPitch=0.22;

function initScene(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x8fb8e0);
  scene.fog=new THREE.Fog(0x8fb8e0,60,260);
  camera=new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 800);
  renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;

  const hemi=new THREE.HemisphereLight(0xffffff,0x445033,0.75); scene.add(hemi);
  window._sunLight=new THREE.DirectionalLight(0xffffff,0.9);
  window._sunLight.position.set(40,60,20);
  window._sunLight.castShadow=true;
  window._sunLight.shadow.mapSize.set(1024,1024);
  window._sunLight.shadow.camera.left=-60; window._sunLight.shadow.camera.right=60;
  window._sunLight.shadow.camera.top=60; window._sunLight.shadow.camera.bottom=-60;
  window._sunLight.shadow.camera.far=200;
  scene.add(window._sunLight);
  scene.add(window._sunLight.target);

  initGrid();
  buildIndoor();
  buildOutdoor();
  buildRoof();
  buildProps();

  window.addEventListener('resize',function(){
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
}

/* ---------------- 小物(インタラクト可能プロップ) ---------------- */
function addMarker(x,z,color,shape){
  let m;
  if(shape==='box') m=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.7),new THREE.MeshBasicMaterial({color:color}));
  else if(shape==='cyl') m=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,1.1,10),new THREE.MeshBasicMaterial({color:color}));
  else m=new THREE.Mesh(new THREE.IcosahedronGeometry(0.4,0),new THREE.MeshBasicMaterial({color:color}));
  m.position.set(x,0.7,z);
  scene.add(m);
  return m;
}
function buildProps(){
  WEAPONS.forEach(function(w){
    if(!w.pickup) return;
    const c=roomCenter(w.pickup.room);
    const ox=(Math.random()*4-2), oz=(Math.random()*4-2);
    const x=c.x+ox, z=c.z+oz+3;
    const marker=addMarker(x,z,0x66ccff,'cyl');
    PROPS.push({type:'weapon',key:w.key,x:x,z:z,marker:marker,label:w.name+'を持つ'});
  });
  GIFTS.forEach(function(gf){
    let c;
    if(gf.pickup.room) c=roomCenter(gf.pickup.room);
    else c=roomCenter('shrine'); // courtyard付近
    const x=c.x+(Math.random()*4-2), z=c.z+(Math.random()*4-2)+2;
    const marker=addMarker(x,z,0xff8fb0,'ico');
    PROPS.push({type:'gift',key:gf.key,x:x,z:z,marker:marker,label:gf.name+'を拾う',rare:!!gf.rare,daily:!gf.rare});
  });
  const board=roomCenter('entrance');
  addMarker(board.x-6,board.z,0xffe066,'box');
  PROPS.push({type:'board',x:board.x-6,z:board.z,label:'掲示板で噂を流す'});

  const hdesk=roomCenter('homeroom');
  addMarker(hdesk.x-4,hdesk.z-4,0x8fd6a0,'box');
  PROPS.push({type:'desk',x:hdesk.x-4,z:hdesk.z-4,label:'自分の席で勉強する'});
  const ldesk=roomCenter('library');
  addMarker(ldesk.x,ldesk.z,0x8fd6a0,'box');
  PROPS.push({type:'desk',x:ldesk.x,z:ldesk.z,label:'図書室で勉強する'});

  const nurse=roomCenter('nurse');
  addMarker(nurse.x,nurse.z-6,0xf2c14e,'box');
  PROPS.push({type:'roofkey',x:nurse.x,z:nurse.z-6,label:'先生の机を調べる'});

  const shr=roomCenter('shrine');
  PROPS.push({type:'shrine',x:shr.x,z:shr.z+1.6,label:'お参りする(憑依度が少し下がる)'});

  PROPS.push({type:'stairsUp',x:STAIRS_UP.x,z:STAIRS_UP.z,label:'屋上へ向かう'});
  addMarker(STAIRS_UP.x,STAIRS_UP.z,0xbfa6ff,'cyl');
  PROPS.push({type:'stairsDown',x:STAIRS_DOWN.x,z:STAIRS_DOWN.z,label:'校舎へ戻る'});
  addMarker(STAIRS_DOWN.x,STAIRS_DOWN.z,0xbfa6ff,'cyl');

  PROPS.push({type:'shed',x:SHED.x,z:SHED.z+SHED.d/2+1.5,label:'旧倉庫'});
}

/* ---------------- プレイヤー ---------------- */
let player;
function newPlayer(gender,name){
  return {
    name:name||'鴉羽 ツナグ', male:gender==='boy',
    x:100, z:106, yaw:Math.PI, sneak:false, carrying:false, captiveKey:null,
    selectedWeapon:'book', weapons:{book:true},
    affection:0, possession:0, suspicion:0, trust:50,
    grades:{国語:40,数学:40,理科:40,社会:40,英語:40,体育:40},
    testScores:{},
    gifts:{},
    day:1, timeMin:DAY_START, periodIdx:0,
    flags:{talkedToday:{}, truancy:0, roofKey:false, giftPicked:{}, confessFailed:0},
  };
}
let rivalBond=20;
let hinanoState={reputation:100,resolve:100,transferred:false,scared:false};
let captives={}; // key -> {untilDay}
let ended=false, gamePaused=false;
let dayInfo={isTestDay:false};

function initPlayerObj(){
  playerObj=person({male:player.male, hairStyle:player.male?'short':'long',
    hair:0x241a2e, skin:0xf0d3b4, uniform:0x2b2140, accent:0x7a3ffb, eye:0x3a2a52});
  playerObj.position.set(player.x,0,player.z);
  scene.add(playerObj);
}

/* ---------------- NPC ---------------- */
let npcs=[];
const NPC_KEYS=['hinata','hinano','kuroda','kiryuu','mio','nayuta','mei','janitor','kenta','sakura'];
function buildNPCs(){
  npcs=[];
  NPC_KEYS.forEach(function(k){
    const def=CHAR[k];
    const rig=person(def.look);
    const home=roomCenter(def.home);
    rig.position.set(home.x,0,home.z);
    scene.add(rig);
    npcs.push({key:k,name:def.name,role:def.role,def:def,rig:rig,
      x:home.x,z:home.z,yaw:0,path:[],patrolIdx:0,retimer:0,
      visionRange:(def.vision||1)*9,visionAngle:0.85,
      faint:false,faintT:0,captive:false,witness:0,scared:false,transferred:false});
  });
}
function npcByKey(k){ return npcs.find(function(n){ return n.key===k; }); }

const PATROL_TEACHER=[{x:25*TILE,z:6*TILE},{x:25*TILE,z:13*TILE},{x:10*TILE,z:13*TILE},
  {x:25*TILE,z:13*TILE},{x:41*TILE,z:13*TILE},{x:25*TILE,z:20*TILE},{x:25*TILE,z:26*TILE}];
const PATROL_JANITOR=[{x:80,z:150},{x:150,z:230},{x:230,z:255},{x:150,z:180},{x:90,z:200}];

function scheduleTarget(npc){
  const per=PERIODS[player.periodIdx];
  const def=npc.def;
  if(npc.key==='kiryuu') return roomCenter('nurse');
  if(npc.key==='mio') return roomCenter('library');
  if(npc.key==='nayuta') return roomCenter('council');
  if(npc.key==='mei') return roomCenter('art');
  const myRoom=def.classRoom||'homeroom';
  if(per.type==='class'||per.type==='home'){
    if(myRoom==='homeroom'&&per.room) return roomCenter(per.room);
    return roomCenter(myRoom);
  }
  if(per.type==='break') return {x:25*TILE+(Math.random()*8-4), z:13*TILE+(Math.random()*4-2)};
  if(per.type==='lunch') return roomCenter(def.lunch||myRoom);
  if(per.type==='after') return roomCenter(def.after||myRoom);
  return roomCenter(myRoom);
}
function computePath(from,to){
  const rFrom=roomKeyAt(from.x,from.z), rTo=roomKeyAt(to.x,to.z);
  const pts=[];
  if(rFrom && rFrom!==rTo && DOOR_PT[rFrom]){
    if(rFrom==='art'||rFrom==='council') pts.push(DOOR_PT.clubHall);
    pts.push(DOOR_PT[rFrom]);
  }
  if(rTo && rFrom!==rTo && DOOR_PT[rTo]){
    if(rTo==='art'||rTo==='council') pts.push(DOOR_PT.clubHall);
    pts.push(DOOR_PT[rTo]);
  }
  pts.push(to);
  return pts;
}
function followPath(npc,dt,speedMul){
  if(!npc.path||!npc.path.length) return false;
  const tgt=npc.path[0];
  const dx=tgt.x-npc.x, dz=tgt.z-npc.z, d=Math.hypot(dx,dz);
  if(d<1.1){ npc.path.shift(); return true; }
  const spd=3.1*speedMul;
  const nx=npc.x+dx/d*spd*dt, nz=npc.z+dz/d*spd*dt;
  let moved=false;
  if(!blocked(nx,npc.z,0.4)){ npc.x=nx; moved=true; }
  if(!blocked(npc.x,nz,0.4)){ npc.z=nz; moved=true; }
  npc.yaw=Math.atan2(dx,dz);
  return moved;
}
function updateNPC(npc,dt){
  if(npc.transferred||npc.captive){ npc.rig.visible=false; return; }
  npc.rig.visible=true;
  if(npc.faint){
    npc.faintT-=dt;
    if(npc.faintT<=0 && !player.carrying){ npc.faint=false; npc.rig.userData.faint=false; npc.rig.userData.faintMark.visible=false; }
  } else if(!player.carrying || player.captiveKey!==npc.key){
    if(npc.key==='kuroda'){
      if(!followPath(npc,dt,0.85)){
        if(!npc.path||!npc.path.length){ npc.patrolIdx=(npc.patrolIdx+1)%PATROL_TEACHER.length; npc.path=[PATROL_TEACHER[npc.patrolIdx]]; }
      }
    } else if(npc.key==='janitor'){
      if(!followPath(npc,dt,0.75)){
        if(!npc.path||!npc.path.length){ npc.patrolIdx=(npc.patrolIdx+1)%PATROL_JANITOR.length; npc.path=[PATROL_JANITOR[npc.patrolIdx]]; }
      }
    } else if(npc.scared && npc.key==='hinano'){
      // 怯えて陽向を避けるようになり、単独で図書室付近に留まる
      if(!npc.path||!npc.path.length) npc.path=[roomCenter('library')];
      followPath(npc,dt,0.6);
    } else {
      npc.retimer-=dt;
      if(npc.retimer<=0){
        npc.retimer=2+Math.random()*2;
        const t=scheduleTarget(npc);
        if(t) npc.path=computePath({x:npc.x,z:npc.z},t);
      }
      followPath(npc,dt,1.0);
    }
  }
  npc.rig.position.set(npc.x,0,npc.z);
  npc.rig.rotation.y=npc.yaw;
  const moving=!!(npc.path&&npc.path.length);
  animateWalk(npc.rig,dt,moving,0.9);
  npc.rig.userData.witnessMark.visible = npc.witness>0;
  npc.rig.userData.faintMark.visible = npc.faint;
}

/* ---------------- 視界/隠密 ---------------- */
function canSee(npc,x,z,rangeOverride){
  const range=rangeOverride!==undefined?rangeOverride:npc.visionRange;
  const dx=x-npc.x, dz=z-npc.z; const d=Math.hypot(dx,dz);
  if(d>range) return false;
  if(d<1.2) return true;
  const ang=Math.atan2(dx,dz);
  if(Math.abs(angNorm(ang-npc.yaw))>npc.visionAngle) return false;
  const steps=6;
  for(let i=1;i<steps;i++){
    const t=i/steps, sx=npc.x+dx*t, sz=npc.z+dz*t;
    if(sx>=0&&sx<COLS*TILE&&sz>=0&&sz<ROWS*TILE){
      const c=Math.floor(sx/TILE), r=Math.floor(sz/TILE);
      if(!isFloor(c,r)) return false;
    }
  }
  return true;
}
function witnessesAt(x,z,excludeKey){
  const mul=player.sneak?0.5:1;
  return npcs.filter(function(n){
    if(n.key===excludeKey||n.faint||n.captive||n.transferred) return false;
    return canSee(n,x,z,n.visionRange*mul);
  });
}

/* ---------------- ステータス変化 ---------------- */
function trustDelta(v){ player.trust=clamp(player.trust+v,0,100); }
function gainSuspicion(v,msg){
  const eff=v*(1-player.trust/230);
  player.suspicion=clamp(player.suspicion+eff,0,100);
  if(msg) toast(msg);
  updateMeters();
  checkGameOver();
}
function loseSuspicion(v){ player.suspicion=clamp(player.suspicion-v,0,100); }
function gainPossession(v,msg){
  player.possession=clamp(player.possession+v,0,100);
  if(msg) toast(msg);
  updateMeters();
  checkGameOver();
}
function checkGameOver(){
  if(ended) return;
  if(player.suspicion>=100) triggerEnding('expelled');
  else if(player.possession>=100) triggerEnding('possessed');
}

/* ---------------- 行動(排除・恋愛・勉強) ---------------- */
function currentWeapon(){ return WEAPONS.find(function(w){ return w.key===player.selectedWeapon; }); }

function actionTalk(npc){
  let lines;
  if(npc.key==='hinata'){
    lines = player.affection>=60?TALK_LINES.hinata_high : player.affection>=30?TALK_LINES.hinata_mid : TALK_LINES.hinata_low;
    if(!player.flags.talkedToday[npc.key]){
      player.affection=clamp(player.affection+4,0,100);
      player.flags.talkedToday[npc.key]=true;
      trustDelta(0.5);
      updateMeters();
    }
  } else if(npc.key==='hinano'){
    lines = hinanoState.scared ? ['ひなの「……もう、あなたの近くには行かない」'] : TALK_LINES.hinano_line;
  } else if(npc.key==='kuroda'){
    lines = TALK_LINES.kuroda_line;
  } else if(npc.key==='kiryuu'){
    lines = TALK_LINES.kiryuu_line;
  } else if(npc.key==='janitor'){
    lines = TALK_LINES.janitor_line;
  } else if(npc.role==='teacher'){
    lines = TALK_LINES.teacher_warn;
  } else {
    lines = TALK_LINES.generic;
  }
  showDialog(npc.name, lines[Math.floor(Math.random()*lines.length)]);
}

function actionGift(npc,giftKey){
  const gf=GIFTS.find(function(g){ return g.key===giftKey; });
  if(!gf||!player.gifts[giftKey]){ toast('持っていない。'); return; }
  player.gifts[giftKey]--;
  let v=gf.value;
  if(CHAR[npc.key]&&CHAR[npc.key].favoriteGift===giftKey) v*=1.6;
  player.affection=clamp(player.affection+v,0,100);
  trustDelta(0.5);
  toast(npc.name+'に『'+gf.name+'』を渡した(好感度+'+Math.round(v)+')');
  updateMeters();
  refreshActionMenu();
}

function actionHangout(npc){
  const per=PERIODS[player.periodIdx];
  if(per.type!=='lunch'&&per.type!=='after'){ toast('今は一緒に過ごせる時間じゃない。'); return; }
  player.affection=clamp(player.affection+14,0,100);
  trustDelta(1);
  toast(npc.name+'と過ごした。楽しい時間はあっという間だった(好感度+14)');
  player.timeMin = per.end - 1;
  updateMeters();
}

function actionConfess(npc){
  const per=PERIODS[player.periodIdx];
  if(per.type!=='after'){ toast('放課後でないと落ち着いて話せない。'); return; }
  if(player.affection<60){ toast('もう少し仲を深めてからにしよう。'); return; }
  const chance=clamp((player.affection - rivalBond*0.5 + (hinanoState.transferred||hinanoState.scared?20:0))/100, 0.05, 0.95);
  if(Math.random()<chance){
    triggerEnding(player.possession<40?'love_pure':'love_dark');
  } else {
    player.flags.confessFailed++;
    player.affection=clamp(player.affection-10,0,100);
    showDialog(npc.name,'陽向「ごめん……今はまだ、そういう気持ちになれなくて」\n（もう少し仲を深めれば、また告白できるかもしれない）');
  }
}

function actionRumor(targetKey){
  if(targetKey==='hinano'&&(hinanoState.transferred)){ toast('もう学校にいない。'); return; }
  const seen=witnessesAt(playerObj.position.x,playerObj.position.z,null);
  if(seen.length){
    seen.forEach(function(n){ n.witness=Math.max(n.witness,1); });
    gainSuspicion(16*seen.length,'誰かに陰口を見られてしまった……!');
  } else {
    gainSuspicion(1);
  }
  gainPossession(2);
  hinanoState.reputation=clamp(hinanoState.reputation-30,0,100);
  toast(RUMOR_LINES[Math.floor(Math.random()*RUMOR_LINES.length)]);
  if(hinanoState.reputation<=0 && !hinanoState.transferred){
    hinanoState.transferred=true;
    const n=npcByKey('hinano'); if(n) n.transferred=true;
    toast('ひなのが、いつの間にか転校していった……');
  }
  refreshActionMenu();
}

function actionThreaten(npc){
  const seen=witnessesAt(npc.x,npc.z,npc.key);
  const dmg=35+currentWeapon().threatBonus;
  hinanoState.resolve=clamp(hinanoState.resolve-dmg,0,100);
  gainPossession(4);
  toast(THREATEN_LINES[0]);
  if(seen.length){
    seen.forEach(function(n){ n.witness=Math.max(n.witness,1); });
    gainSuspicion(24*seen.length,'脅しているところを見られてしまった!!');
  } else {
    gainSuspicion(3);
  }
  if(hinanoState.resolve<=30 && !hinanoState.scared){
    hinanoState.scared=true;
    const n=npcByKey('hinano'); if(n) n.scared=true;
    toast('ひなのは怯えて、陽向に近づかなくなった……');
  }
  refreshActionMenu();
}

let takedown=null; // {npcKey, t, need}
function startTakedown(npc){
  const w=currentWeapon();
  if(w.needPossession&&player.possession<w.needPossession){ toast('まだその力は目覚めていない。'); return; }
  const dx=npc.x-playerObj.position.x, dz=npc.z-playerObj.position.z;
  const d=Math.hypot(dx,dz);
  if(d>w.range){ toast('近づかないと無理そうだ。'); return; }
  const facing=Math.atan2(dx,dz);
  const behindOk = Math.abs(angNorm(facing-npc.yaw))<1.6; // 相手の後方寄りにいるか(=相手が背を向けている)
  if(!behindOk && !w.supernatural){ toast('正面からでは気づかれてしまう。背後から近づこう。'); return; }
  takedown={npcKey:npc.key,t:0,need:w.time};
  toast('……気配を殺して、道具を構えた。');
}
function updateTakedown(dt){
  if(!takedown) return;
  const npc=npcByKey(takedown.npcKey);
  const w=currentWeapon();
  if(!npc||npc.faint||npc.captive||npc.transferred){ takedown=null; hideRing(); return; }
  const dx=npc.x-playerObj.position.x, dz=npc.z-playerObj.position.z;
  const d=Math.hypot(dx,dz);
  if(d>w.range+0.6){ takedown=null; hideRing(); toast('相手が離れてしまった……'); return; }
  takedown.t+=dt;
  showRing(takedown.t/takedown.need);
  if(takedown.t>=takedown.need){
    finishTakedown(npc,w);
    takedown=null; hideRing();
  }
}
function finishTakedown(npc,w){
  const seen=witnessesAt(npc.x,npc.z,npc.key);
  npc.faint=true; npc.faintT=40;
  npc.rig.userData.faint=true;
  npc.rig.userData.faintMark.visible=true;
  npc.rig.rotation.z=Math.PI/2;
  toast(npc.name+'は……パタッと倒れた（気絶）');
  gainPossession(w.supernatural?10:5);
  if(w.supernatural){
    if(seen.length){ seen.forEach(function(n){ n.witness=2; }); gainSuspicion(60,'影の手を見られた……!! 「怪異だ」という騒ぎに!'); }
  } else if(seen.length){
    seen.forEach(function(n){ n.witness=Math.max(n.witness,1); });
    gainSuspicion(35*seen.length,'気絶させる瞬間を見られてしまった……!!');
  } else {
    gainSuspicion(2);
  }
}

function actionCarry(npc){
  if(player.carrying){ toast('もう運んでいる。'); return; }
  player.carrying=true; player.captiveKey=npc.key;
  npc.rig.rotation.z=0;
  toast(npc.name+'を肩に担いだ。旧倉庫まで運ぼう……');
}
function actionRestrain(){
  if(!player.carrying) return;
  const npc=npcByKey(player.captiveKey);
  if(!npc) return;
  const seen=witnessesAt(playerObj.position.x,playerObj.position.z,npc.key);
  if(seen.length){
    gainSuspicion(60,'倉庫に連れ込むところを見られてしまった……!!');
  }
  npc.captive=true; npc.faint=false;
  npc.rig.userData.faintMark.visible=false;
  captives[npc.key]={untilDay:player.day+2};
  if(npc.witness>0){ npc.witness=0; toast(npc.name+'の口を封じた……'); }
  if(npc.key==='hinano'&&!hinanoState.scared){ hinanoState.scared=true; }
  player.carrying=false; player.captiveKey=null;
  toast(npc.name+'を旧倉庫に拘束した。');
  refreshActionMenu();
}
function actionRelease(npc){
  npc.captive=false; captives[npc.key]=null;
  gainSuspicion(5,npc.name+'が戻ってきた。少し噂になったようだ……');
  toast(npc.name+'を解放した。');
  refreshActionMenu();
}

/* ---------------- 旧倉庫の発覚リスク(拘束中の相手がいる間、誰かが倉庫に
   近づき続けると「発覚」BADエンドに繋がる) ---------------- */
let shedDangerT=0, shedWarned=false;
function checkShedExposure(dt){
  const activeCaptives=Object.keys(captives).filter(function(k){ return captives[k]; });
  if(!activeCaptives.length){ shedDangerT=0; shedWarned=false; return; }
  const near=npcs.some(function(n){
    if(n.captive||n.faint||n.transferred) return false;
    return dist2(n.x,n.z,SHED.x,SHED.z)<9*9;
  });
  if(near){
    shedDangerT+=dt;
    if(shedDangerT>1.2 && !shedWarned){
      shedWarned=true;
      toast('……旧倉庫のほうから、誰かの足音が近づいてくる……');
    }
    if(shedDangerT>3.5){
      triggerEnding('captive_exposed');
    }
  } else {
    shedDangerT=Math.max(0,shedDangerT-dt*2);
    if(shedDangerT<0.4) shedWarned=false;
  }
}

function actionStudy(subject){
  player.grades[subject]=clamp(player.grades[subject]+8,0,100);
  trustDelta(0.4);
  toast(subject+'の勉強をした(理解度+8)');
  updateMeters();
}
function doTest(subject){
  const base=player.grades[subject];
  const score=clamp(Math.round(base+(Math.random()*20-10)),0,100);
  player.testScores[subject]=score;
  trustDelta((score-50)/15);
  player.grades[subject]=clamp(Math.round((base+score)/2),0,100);
  toast('📝 '+subject+'のテスト結果: '+score+'点');
  updateMeters();
}
function actionShrine(){
  gainPossession(-8);
  trustDelta(1);
  toast('静かに手を合わせた。テネブラの気配が少しだけ和らいだ気がする。');
}
function actionPickupWeapon(key){
  player.weapons[key]=true;
  const w=WEAPONS.find(function(x){ return x.key===key; });
  player.selectedWeapon=key;
  toast('『'+w.name+'』を手に入れた。');
  buildWeaponBar();
}
function actionPickupGift(key,propRef){
  const gf=GIFTS.find(function(g){ return g.key===key; });
  player.gifts[key]=(player.gifts[key]||0)+1;
  toast('『'+gf.name+'』を手に入れた。');
  if(propRef&&propRef.rare){ propRef.picked=true; propRef.marker.visible=false; }
  else if(propRef){ propRef.marker.visible=false; propRef.cooldown=60; }
}
function actionRoofKey(){
  if(player.flags.roofKey){ toast('もう鍵は持っている。'); return; }
  player.flags.roofKey=true;
  toast('引き出しの奥に『屋上の鍵』を見つけた。');
}

/* ---------------- 時間の進行 ---------------- */
const TIME_SCALE=2.4; // 1リアル秒 = ゲーム内何分
function minToClock(m){
  const h=Math.floor(m/60), mm=Math.floor(m%60);
  return h+':'+(mm<10?'0':'')+mm;
}
function tickTime(dt){
  if(ended||gamePaused) return;
  player.timeMin += dt*TIME_SCALE;
  updatePeriodIndex();
  tickAttendance();
  player.suspicion=clamp(player.suspicion-dt*0.35*(1+player.trust/150),0,100);
  gainPossessionPassive(dt);
  if(player.timeMin>=DAY_END) endOfDay();
}
function gainPossessionPassive(dt){
  player.possession=clamp(player.possession+dt*0.02,0,100);
}
function updatePeriodIndex(){
  for(let i=0;i<PERIODS.length;i++){
    if(player.timeMin>=PERIODS[i].start && player.timeMin<PERIODS[i].end){
      if(i!==player.periodIdx){ player.periodIdx=i; onPeriodStart(i); }
      return;
    }
  }
}
function onPeriodStart(idx){
  const per=PERIODS[idx];
  toast('🔔 '+per.name+' が始まった');
  player.flags._checked=false;
}
function tickAttendance(){
  const per=PERIODS[player.periodIdx];
  if(per.type!=='class') return;
  const grace=per.start+6;
  if(player.timeMin>=grace && !player.flags._checked){
    player.flags._checked=true;
    const rm=per.room||'homeroom';
    const here = roomKeyAt(playerObj.position.x,playerObj.position.z)===rm;
    if(here){
      if(dayInfo.isTestDay) doTest(per.subject);
      else { player.grades[per.subject]=clamp(player.grades[per.subject]+2,0,100); trustDelta(0.3); }
    } else {
      player.flags.truancy++;
      gainSuspicion(8,'黒田「おい! 授業をサボるな!」');
      trustDelta(-1.5);
    }
  }
}
function endOfDay(){
  gamePaused=true;
  document.getElementById('summary').style.display='flex';
  document.getElementById('sumTitle').textContent='Day '+player.day+' の終わり';
  let body='疑いの目: '+Math.round(player.suspicion)+' ／ 憑依度: '+Math.round(player.possession)+
    ' ／ 信頼度: '+Math.round(player.trust)+' ／ 好感度: '+Math.round(player.affection);
  document.getElementById('sumBody').textContent=body;
  let html='<tr><th>教科</th><th>理解度</th><th>評価</th><th>直近テスト</th></tr>';
  SUBJECTS.forEach(function(s){
    html+='<tr><td>'+s+'</td><td>'+Math.round(player.grades[s])+'</td><td>'+gradeLetter(player.grades[s])+
      '</td><td>'+(player.testScores[s]!==undefined?player.testScores[s]+'点':'―')+'</td></tr>';
  });
  document.getElementById('sumGrades').innerHTML=html;
}
function nextDay(){
  document.getElementById('summary').style.display='none';
  gamePaused=false;
  player.day++;
  player.timeMin=DAY_START; player.periodIdx=0;
  player.flags.talkedToday={};
  player.testScores={};
  dayInfo.isTestDay = (player.day%4===0);
  if(dayInfo.isTestDay) toast('📢 今日は複数教科のテストがある日だ……');
  if(!hinanoState.transferred && !hinanoState.scared) rivalBond=clamp(rivalBond+3,0,100);
  Object.keys(captives).forEach(function(k){
    const c=captives[k]; if(!c) return;
    if(player.day>=c.untilDay){
      const npc=npcByKey(k);
      if(npc){ npc.captive=false; }
      captives[k]=null;
      gainSuspicion(10,k+'の長期欠席が問題になった……');
    }
  });
  PROPS.forEach(function(p){ if(p.type==='gift'&&!p.rare){ p.marker.visible=true; } });
  const spawn=roomCenter('entrance');
  player.x=spawn.x; player.z=spawn.z; playerObj.position.set(player.x,0,player.z);
  saveGame();
  updateMeters();
}

/* ---------------- エンディング ---------------- */
function triggerEnding(key){
  if(ended) return;
  ended=true; gamePaused=true;
  const e=ENDINGS[key];
  document.getElementById('ending').style.display='flex';
  document.getElementById('endTitle').textContent=e.title;
  document.getElementById('endBody').textContent=e.text;
  clearSave();
}

/* ---------------- UI ---------------- */
function toast(msg){
  const box=document.getElementById('toast');
  const d=document.createElement('div'); d.className='toastmsg'; d.textContent=msg;
  box.appendChild(d);
  setTimeout(function(){ d.remove(); },4200);
  while(box.children.length>4) box.removeChild(box.firstChild);
}
function showDialog(name,body,choices){
  const dlg=document.getElementById('dialog');
  document.getElementById('dlgName').textContent=name;
  document.getElementById('dlgBody').textContent=body;
  const ch=document.getElementById('dlgChoices'); ch.innerHTML='';
  if(choices&&choices.length){
    choices.forEach(function(c){
      const b=document.createElement('button'); b.className='btn'; b.textContent=c.label;
      b.onclick=function(){ hideDialog(); c.onClick&&c.onClick(); };
      ch.appendChild(b);
    });
  } else {
    const b=document.createElement('button'); b.className='btn'; b.textContent='閉じる';
    b.onclick=hideDialog;
    ch.appendChild(b);
  }
  dlg.style.display='block';
  gamePaused=true;
}
function hideDialog(){ document.getElementById('dialog').style.display='none'; gamePaused=false; }

function updateMeters(){
  document.getElementById('fillAff').style.width=player.affection+'%';
  document.getElementById('fillPos').style.width=player.possession+'%';
  document.getElementById('fillSus').style.width=player.suspicion+'%';
  document.getElementById('fillTrust').style.width=player.trust+'%';
  document.getElementById('txtAff').textContent=Math.round(player.affection);
  document.getElementById('txtPos').textContent=Math.round(player.possession);
  document.getElementById('txtSus').textContent=Math.round(player.suspicion);
  document.getElementById('txtTrust').textContent=Math.round(player.trust);
  document.getElementById('dayNum').textContent=player.day;
  document.getElementById('clockTxt').textContent=minToClock(player.timeMin);
  document.getElementById('periodTxt').textContent=PERIODS[player.periodIdx]?PERIODS[player.periodIdx].name:'';
  document.getElementById('roomlabel').textContent='現在地: '+roomNameAt(playerObj.position.x,playerObj.position.z);
  document.getElementById('sleepbtn').style.display=(PERIODS[player.periodIdx]&&PERIODS[player.periodIdx].type==='after')?'block':'none';
  const nearRoof=Math.hypot(playerObj.position.x-STAIRS_UP.x,playerObj.position.z-STAIRS_UP.z)<3;
  const nearRoofDown=Math.hypot(playerObj.position.x-STAIRS_DOWN.x,playerObj.position.z-STAIRS_DOWN.z)<3;
  document.getElementById('roofbtn').style.display=(nearRoof&&player.flags.roofKey)||nearRoofDown?'block':'none';
  document.getElementById('roofbtn').textContent=nearRoofDown?'🔽 校舎へ戻る':'🔑 屋上へ向かう';
}
function showRing(p){
  const el=document.getElementById('progring'); el.style.display='block';
  const fg=el.querySelector('.fg'); fg.style.strokeDashoffset=176*(1-clamp(p,0,1));
}
function hideRing(){ document.getElementById('progring').style.display='none'; }

function buildWeaponBar(){
  const bar=document.getElementById('weaponbar'); bar.innerHTML='';
  WEAPONS.forEach(function(w){
    if(!player.weapons[w.key]) return;
    const b=document.createElement('button');
    b.className='wbtn'+(player.selectedWeapon===w.key?' sel':'');
    b.textContent=w.icon; b.title=w.name+' - '+w.desc;
    b.onclick=function(){ player.selectedWeapon=w.key; buildWeaponBar(); };
    bar.appendChild(b);
  });
}

/* ---------------- インタラクト対象の検出とアクションメニュー ---------------- */
let lastTargetSig=null;
function findNearestInteractable(){
  let best=null,bd=3.4;
  npcs.forEach(function(n){
    if(n.captive||n.transferred) return;
    if(player.carrying&&player.captiveKey===n.key) return;
    const d=Math.hypot(playerObj.position.x-n.x,playerObj.position.z-n.z);
    if(d<bd){ bd=d; best={type:'npc',npc:n}; }
  });
  PROPS.forEach(function(p){
    if(p.picked) return;
    if(p.cooldown) return;
    const d=Math.hypot(playerObj.position.x-p.x,playerObj.position.z-p.z);
    if(d<2.8 && d<bd){ bd=d; best={type:'prop',prop:p}; }
  });
  return best;
}
function totalGifts(){
  let t=0; Object.keys(player.gifts).forEach(function(k){ t+=player.gifts[k]||0; }); return t;
}
function giftSubLabel(){
  const parts=[];
  GIFTS.forEach(function(g){ if(player.gifts[g.key]) parts.push(g.name+'x'+player.gifts[g.key]); });
  return parts.join(' ')||'持っていない';
}
function openGiftChoice(npc){
  const choices=[];
  GIFTS.forEach(function(g){
    if(player.gifts[g.key]) choices.push({label:g.name+'('+player.gifts[g.key]+')',onClick:function(){ actionGift(npc,g.key); }});
  });
  if(!choices.length){ toast('渡せる贈り物がない。'); return; }
  showDialog(npc.name,'何を渡す?',choices);
}
function actionCalm(npc){
  npc.witness=0; trustDelta(0.2); toast(npc.name+'を落ち着かせた。');
}
function buildActionsFor(target){
  const per=PERIODS[player.periodIdx];
  if(target.type==='npc'){
    const npc=target.npc;
    const acts=[{label:'話す',onClick:function(){ actionTalk(npc); }}];
    if(npc.faint && !player.carrying){
      acts.push({label:'運ぶ',sub:'旧倉庫まで連れて行く',onClick:function(){ actionCarry(npc); }});
      return acts;
    }
    if(npc.key==='hinata'&&!npc.faint){
      acts.push({label:'贈り物を渡す',sub:giftSubLabel(),disabled:totalGifts()===0,
        onClick:function(){ openGiftChoice(npc); }});
      if(per.type==='lunch'||per.type==='after') acts.push({label:'一緒に過ごす',onClick:function(){ actionHangout(npc); }});
      if(per.type==='after'&&player.affection>=60) acts.push({label:'告白する',onClick:function(){ actionConfess(npc); }});
    }
    const eliminable=(npc.role==='student'||npc.role==='rival')&&npc.key!=='hinata';
    if(eliminable){
      if(npc.key==='hinano'&&!npc.scared){
        acts.push({label:'脅す',sub:'勇気を削る／目撃注意',onClick:function(){ actionThreaten(npc); }});
      }
      acts.push({label:'気絶させる',sub:'道具:'+currentWeapon().name+'／背後から',onClick:function(){ startTakedown(npc); }});
      if(npc.witness>0) acts.push({label:'なだめる',sub:'目撃の記憶を落ち着かせる',onClick:function(){ actionCalm(npc); }});
    } else if(npc.witness>0){
      acts.push({label:'なだめる',sub:'目撃の記憶を落ち着かせる',onClick:function(){ actionCalm(npc); }});
    }
    return acts;
  }
  const p=target.prop;
  if(p.type==='weapon') return [{label:p.label,onClick:function(){ actionPickupWeapon(p.key); p.picked=true; if(p.marker) p.marker.visible=false; }}];
  if(p.type==='gift') return [{label:p.label,onClick:function(){ actionPickupGift(p.key,p); }}];
  if(p.type==='board') return [{label:'噂を流す(ひなの)',disabled:hinanoState.transferred,onClick:function(){ actionRumor('hinano'); }}];
  if(p.type==='desk') return SUBJECTS.map(function(s){
    return {label:'勉強:'+s,sub:'理解度 '+Math.round(player.grades[s]),onClick:function(){ actionStudy(s); }};
  });
  if(p.type==='roofkey') return [{label:p.label,disabled:player.flags.roofKey,onClick:actionRoofKey}];
  if(p.type==='shrine') return [{label:p.label,onClick:actionShrine}];
  if(p.type==='shed'){
    const acts=[];
    if(player.carrying) acts.push({label:'拘束する',onClick:actionRestrain});
    Object.keys(captives).forEach(function(k){
      if(captives[k]){
        const npc=npcByKey(k);
        if(npc) acts.push({label:npc.name+'を解放する',onClick:function(){ actionRelease(npc); }});
      }
    });
    if(!acts.length) acts.push({label:'……誰もいない',disabled:true,onClick:function(){}});
    return acts;
  }
  if(p.type==='stairsUp'){
    if(!player.flags.roofKey){
      return [{label:'……鍵がかかっている',sub:'保健室の先生の机を調べれば見つかるかもしれない',disabled:true,onClick:function(){}}];
    }
    return [{label:'屋上へ向かう',onClick:function(){
      playerObj.position.set(STAIRS_DOWN.x-1.5,0,STAIRS_DOWN.z+1);
    }}];
  }
  if(p.type==='stairsDown'){
    return [{label:'校舎へ戻る',onClick:function(){
      playerObj.position.set(STAIRS_UP.x+1.5,0,STAIRS_UP.z+1);
    }}];
  }
  return [];
}
function refreshActionMenu(){
  const target=findNearestInteractable();
  const interactEl=document.getElementById('interact');
  const menuEl=document.getElementById('actionmenu');
  if(!target){ interactEl.style.display='none'; if(menuEl.innerHTML) menuEl.innerHTML=''; lastTargetSig=null; return; }
  interactEl.style.display='block';
  document.getElementById('interactTxt').textContent = target.type==='npc'? target.npc.name : (target.prop.label||'調べる');
  const sig=target.type+'_'+(target.npc?target.npc.key+target.npc.witness+target.npc.faint:target.prop.type+target.prop.x)+'_'+player.affection+'_'+totalGifts()+'_'+player.flags.roofKey+'_'+Object.keys(captives).length+'_'+player.carrying;
  if(sig===lastTargetSig) return;
  lastTargetSig=sig;
  menuEl.innerHTML='';
  buildActionsFor(target).forEach(function(a){
    const b=document.createElement('button'); b.className='abtn';
    b.innerHTML=a.label+(a.sub?('<small>'+a.sub+'</small>'):'');
    b.disabled=!!a.disabled;
    b.onclick=function(){ a.onClick&&a.onClick(); lastTargetSig=null; };
    menuEl.appendChild(b);
  });
}

/* ---------------- 入力(キーボード/マウス/タッチ) ---------------- */
const keys={};
window.addEventListener('keydown',function(e){
  keys[e.key.toLowerCase()]=true;
  if(e.key.toLowerCase()==='e'){
    const btns=document.querySelectorAll('#actionmenu .abtn');
    if(btns.length&&!btns[0].disabled) btns[0].click();
  }
});
window.addEventListener('keyup',function(e){ keys[e.key.toLowerCase()]=false; });

let dragging=false,lastPX=0,lastPY=0;
function bindCameraDrag(el){
  el.addEventListener('pointerdown',function(e){ dragging=true; lastPX=e.clientX; lastPY=e.clientY; });
  window.addEventListener('pointerup',function(){ dragging=false; });
  window.addEventListener('pointermove',function(e){
    if(!dragging) return;
    const dx=e.clientX-lastPX, dy=e.clientY-lastPY; lastPX=e.clientX; lastPY=e.clientY;
    camYaw-=dx*0.006;
    camPitch=clamp(camPitch-dy*0.004,-0.3,0.85);
  });
}
const moveVec={x:0,y:0}, lookVec={x:0,y:0};
function bindJoystick(baseId,stickId,onMove,onEnd){
  const base=document.getElementById(baseId), stick=document.getElementById(stickId);
  let active=false,startX=0,startY=0;
  base.addEventListener('pointerdown',function(e){
    active=true; const r=base.getBoundingClientRect(); startX=r.left+r.width/2; startY=r.top+r.height/2;
    e.preventDefault();
  });
  window.addEventListener('pointermove',function(e){
    if(!active) return;
    let dx=e.clientX-startX, dy=e.clientY-startY;
    const d=Math.hypot(dx,dy), max=60;
    if(d>max){ dx=dx/d*max; dy=dy/d*max; }
    stick.style.transform='translate('+dx+'px,'+dy+'px)';
    onMove(dx/max,dy/max);
  });
  window.addEventListener('pointerup',function(){
    if(!active) return; active=false; stick.style.transform=''; onEnd&&onEnd();
  });
}

function updatePlayer(dt){
  let mx=0,mz=0;
  if(keys['w']||keys['arrowup']) mz-=1;
  if(keys['s']||keys['arrowdown']) mz+=1;
  if(keys['a']||keys['arrowleft']) mx-=1;
  if(keys['d']||keys['arrowright']) mx+=1;
  if(Math.abs(moveVec.x)>0.12||Math.abs(moveVec.y)>0.12){ mx=moveVec.x; mz=moveVec.y; }
  player.sneak=!!keys['q'];
  const len=Math.hypot(mx,mz);
  let moving=false;
  if(len>0.08){
    mx/=len; mz/=len;
    const fx = mx*Math.cos(camYaw) - mz*Math.sin(camYaw);
    const fz = -mx*Math.sin(camYaw) - mz*Math.cos(camYaw);
    const spd = (keys['shift']?9.4:6.1) * (player.sneak?0.55:1) * (player.carrying?0.55:1);
    const nx=playerObj.position.x+fx*spd*dt, nz=playerObj.position.z+fz*spd*dt;
    if(!blocked(nx,playerObj.position.z,0.42)) playerObj.position.x=nx;
    if(!blocked(playerObj.position.x,nz,0.42)) playerObj.position.z=nz;
    playerObj.rotation.y=Math.atan2(fx,fz);
    moving=true;
  }
  player.x=playerObj.position.x; player.z=playerObj.position.z;
  playerObj.scale.y=player.sneak?0.82:1;
  animateWalk(playerObj,dt,moving,keys['shift']?1.5:1);
  const aura=playerObj.userData.aura;
  aura.visible=player.possession>=30;
  if(aura.visible) aura.material.opacity=0.14+0.34*(player.possession/100);
  if(player.carrying){
    const npc=npcByKey(player.captiveKey);
    if(npc){
      npc.x=playerObj.position.x-Math.sin(playerObj.rotation.y)*1.1;
      npc.z=playerObj.position.z-Math.cos(playerObj.rotation.y)*1.1;
      npc.yaw=playerObj.rotation.y;
      npc.rig.position.set(npc.x,0,npc.z);
      npc.rig.rotation.y=playerObj.rotation.y;
      const seen=witnessesAt(npc.x,npc.z,npc.key);
      if(seen.length) gainSuspicion(45*dt);
    }
  }
}
function updateCamera(){
  const dist=7.6;
  const fwd={x:Math.sin(camYaw),z:Math.cos(camYaw)};
  const tx=playerObj.position.x, tz=playerObj.position.z;
  camera.position.set(tx-fwd.x*dist, 1.6+3.3+Math.sin(camPitch)*3.0, tz-fwd.z*dist);
  camera.lookAt(tx, 1.5+Math.sin(camPitch)*1.0, tz);
}

/* ---------------- メインループ ---------------- */
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clockObj.getDelta(),0.1);
  if(!gamePaused&&!ended){
    updatePlayer(dt);
    npcs.forEach(function(n){ updateNPC(n,dt); });
    updateTakedown(dt);
    checkShedExposure(dt);
    tickTime(dt);
    PROPS.forEach(function(p){
      if(p.cooldown){ p.cooldown-=dt; if(p.cooldown<=0){ p.cooldown=0; if(p.marker) p.marker.visible=true; } }
    });
  }
  camYaw-=lookVec.x*dt*2.2;
  camPitch=clamp(camPitch-lookVec.y*dt*1.6,-0.3,0.85);
  updateCamera();
  refreshActionMenu();
  updateMeters();
  renderer.render(scene,camera);
}

/* ---------------- セーブ/ロード ---------------- */
const SAVE_KEY='hyoi_save_v1';
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({player:player,rivalBond:rivalBond,hinanoState:hinanoState,
      captives:captives,dayInfo:dayInfo}));
  }catch(e){}
}
function loadGame(){
  try{ const raw=localStorage.getItem(SAVE_KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; }
}
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

/* ---------------- 起動 ---------------- */
let chosenGender='girl';
function boot(useContinue){
  document.getElementById('title').style.display='none';
  document.getElementById('hud').style.display='block';
  initScene();
  buildNPCs();
  const nameVal=(document.getElementById('nameInput').value||'').trim()||'鴉羽 ツナグ';
  player=newPlayer(chosenGender,nameVal);
  const saved=useContinue?loadGame():null;
  if(saved){
    Object.assign(player,saved.player);
    if(saved.rivalBond!==undefined) rivalBond=saved.rivalBond;
    Object.assign(hinanoState,saved.hinanoState||{});
    captives=saved.captives||{};
    Object.assign(dayInfo,saved.dayInfo||{});
    if(hinanoState.transferred){ const n=npcByKey('hinano'); if(n) n.transferred=true; }
    if(hinanoState.scared){ const n=npcByKey('hinano'); if(n) n.scared=true; }
    Object.keys(captives).forEach(function(k){ if(captives[k]){ const n=npcByKey(k); if(n) n.captive=true; } });
  }
  initPlayerObj();
  buildWeaponBar();
  bindCameraDrag(renderer.domElement);
  bindJoystick('joyL','stickL',function(dx,dy){ moveVec.x=dx; moveVec.y=dy; },function(){ moveVec.x=0; moveVec.y=0; });
  bindJoystick('joyR','stickR',function(dx,dy){ lookVec.x=dx; lookVec.y=dy; },function(){ lookVec.x=0; lookVec.y=0; });
  clockObj=new THREE.Clock();
  updateMeters();
  animate();
}
window.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('#genderSel .btn').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('#genderSel .btn').forEach(function(x){ x.classList.remove('sel'); });
      b.classList.add('sel'); chosenGender=b.dataset.g;
    });
  });
  if(loadGame()) document.getElementById('continueBtn').style.display='inline-block';
  document.getElementById('startBtn').addEventListener('click',function(){ boot(false); });
  document.getElementById('continueBtn').addEventListener('click',function(){ boot(true); });
  document.getElementById('nextDayBtn').addEventListener('click',nextDay);
  document.getElementById('sleepbtn').addEventListener('click',function(){ player.timeMin=DAY_END; });
  document.getElementById('roofbtn').addEventListener('click',function(){
    const nearRoofDown=Math.hypot(playerObj.position.x-STAIRS_DOWN.x,playerObj.position.z-STAIRS_DOWN.z)<3;
    if(nearRoofDown){
      playerObj.position.set(STAIRS_UP.x+1.5,0,STAIRS_UP.z+1);
    } else {
      playerObj.position.set(STAIRS_DOWN.x-1.5,0,STAIRS_DOWN.z+1);
    }
  });
  document.getElementById('restartBtn').addEventListener('click',function(){ location.reload(); });
});
