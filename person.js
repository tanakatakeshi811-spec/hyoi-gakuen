/* ============================================================
   人型モデルビルダー
   Quaternius製の低ポリキャラクターモデル(CC0、poly.pizza配布)を
   glTF(.glb)で読み込み、色だけをキャラクターごとに塗り替えて使う。
   ライセンス・出典は assets/CREDITS.md を参照。
   ============================================================ */
function LM(c){ return new THREE.MeshLambertMaterial({color:c}); }
function PM(c,sh,sp){ return new THREE.MeshPhongMaterial({color:c,shininess:sh||18,specular:sp||0x222222}); }

/* ---- モデル読み込み(ゲーム起動時に1回だけ) ---- */
let CHAR_TEMPLATES = null;
let CHAR_MODELS_PROMISE = null;

const CLIP_ALIASES = {
  male:  {idle:'HumanArmature|Man_Idle', walk:'HumanArmature|Man_Walk', faint:'HumanArmature|Man_Death'},
  female:{idle:'CharacterArmature|Idle', walk:'CharacterArmature|Walk', faint:'CharacterArmature|Death'},
};
/* 素材名→キャラクターごとの色設定(data.jsのlook: hair/skin/uniform/accent/eye)の対応表。
   モデルによってマテリアル名の粒度が違うため性別ごとに個別に定義する */
const TINT_MAP = {
  male:  {Shirt:'uniform', Skin:'skin', Hair:'hair', Eyes:'eye', Socks:'accent'},
  female:{White:'uniform', Skin:'skin', Hair_Blond:'hair', Hair_Brown:'hair', Orange:'accent', Brown:'eye'},
};
/* 読み込み時点のモデルの生の高さ(three.jsのBox3実測値)。ゲーム世界のスケール
   (1キャラ=だいたい2.6〜2.8ワールド単位)に合わせるための倍率を導く */
const RAW_HEIGHT = {male:4.841251701509476, female:1.8520413317610211};
const TARGET_HEIGHT = {male:2.72, female:2.58};

function loadGLTF(url){
  return new Promise(function(resolve,reject){
    new THREE.GLTFLoader().load(url,resolve,undefined,reject);
  });
}
let TREE_TEMPLATE=null, DESK_TEMPLATE=null, BLACKBOARD_TEMPLATE=null, BOOKCASE_TEMPLATE=null;
let LOCKER_TEMPLATE=null, BED_TEMPLATE=null, PIANO_TEMPLATE=null, MICROSCOPE_TEMPLATE=null,
  GYMMAT_TEMPLATE=null, EASEL_TEMPLATE=null, RNDTABLE_TEMPLATE=null;
let KNIFE_TEMPLATE=null, SCREWDRIVER_TEMPLATE=null;
/* モデルの原点位置や単位系がバラバラ(desk.glbと同じく高さ方向の中央が原点の
   ものや、piano/easelのように昔のGoogle Poly由来で座標が現実の数万倍
   スケールで焼き込まれているものが混在する)なので、Box3の実測値から
   「目標の高さになるよう一様スケール→中心を原点(x,z)・接地面をy=0に
   揃える」という汎用の正規化を通してから使う(個別モデルごとの補正値を
   ハードコードしなくて済む) */
function normalizeToFloor(root,targetH){
  const box=new THREE.Box3().setFromObject(root);
  const size=new THREE.Vector3(); box.getSize(size);
  const center=new THREE.Vector3(); box.getCenter(center);
  const scale=size.y>0?targetH/size.y:1;
  root.scale.setScalar(scale);
  root.position.set(-center.x*scale, -box.min.y*scale, -center.z*scale);
  const wrap=new THREE.Group();
  wrap.add(root);
  return wrap;
}
/* 手持ち武器用の正規化。床置き家具と違い「原点=接地面」ではなく手の位置に
   そのまま持たせたいので、一番長い辺を基準に一様スケール→中心(x,y,z全部)を
   原点に揃える(モデルの向き=長辺がどの軸かはモデルごとにバラバラなため) */
function normalizeCentered(root,targetLen){
  const box=new THREE.Box3().setFromObject(root);
  const size=new THREE.Vector3(); box.getSize(size);
  const center=new THREE.Vector3(); box.getCenter(center);
  const maxDim=Math.max(size.x,size.y,size.z);
  const scale=maxDim>0?targetLen/maxDim:1;
  root.scale.setScalar(scale);
  root.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
  const wrap=new THREE.Group();
  wrap.add(root);
  return wrap;
}
function calmMaterials(root){
  // このシーンの2灯ライティング(ヘミスフィア+ディレクショナル、IBLなし)だと
  // metalness高めのPBRマテリアルは暗く沈むため、他のオブジェクトと馴染むように
  // 質感を落ち着かせる(色・テクスチャ自体は変更しない)
  root.traverse(function(o){
    if(!o.isMesh) return;
    o.castShadow=true; o.receiveShadow=true;
    const arr=Array.isArray(o.material)?o.material:[o.material];
    arr.forEach(function(m){ m.metalness=0.05; m.roughness=1.0; });
  });
}
function preloadCharacterModels(){
  if(CHAR_MODELS_PROMISE) return CHAR_MODELS_PROMISE;
  CHAR_MODELS_PROMISE = Promise.all([
    loadGLTF('assets/models/man.glb'),
    loadGLTF('assets/models/woman.glb'),
    loadGLTF('assets/models/tree.glb'),
    loadGLTF('assets/models/desk.glb'),
    loadGLTF('assets/models/blackboard.glb'),
    loadGLTF('assets/models/bookcase.glb'),
    loadGLTF('assets/models/locker.glb'),
    loadGLTF('assets/models/bed.glb'),
    loadGLTF('assets/models/piano.glb'),
    loadGLTF('assets/models/microscope.glb'),
    loadGLTF('assets/models/gymmat.glb'),
    loadGLTF('assets/models/easel.glb'),
    loadGLTF('assets/models/rndtable.glb'),
    loadGLTF('assets/models/knife.glb'),
    loadGLTF('assets/models/screwdriver.glb'),
  ]).then(function(results){
    const manGltf=results[0], womanGltf=results[1], treeGltf=results[2],
      deskGltf=results[3], blackboardGltf=results[4], bookcaseGltf=results[5],
      lockerGltf=results[6], bedGltf=results[7], pianoGltf=results[8],
      microscopeGltf=results[9], gymmatGltf=results[10], easelGltf=results[11],
      rndtableGltf=results[12], knifeGltf=results[13], screwdriverGltf=results[14];
    CHAR_TEMPLATES = {
      male:  {scene:manGltf.scene,   animations:manGltf.animations,
        scale:TARGET_HEIGHT.male/RAW_HEIGHT.male},
      female:{scene:womanGltf.scene, animations:womanGltf.animations,
        scale:TARGET_HEIGHT.female/RAW_HEIGHT.female},
    };
    [treeGltf.scene,deskGltf.scene,blackboardGltf.scene,bookcaseGltf.scene,
      lockerGltf.scene,bedGltf.scene,pianoGltf.scene,microscopeGltf.scene,
      gymmatGltf.scene,easelGltf.scene,rndtableGltf.scene,
      knifeGltf.scene,screwdriverGltf.scene].forEach(calmMaterials);
    TREE_TEMPLATE=treeGltf.scene;
    DESK_TEMPLATE=deskGltf.scene;
    BLACKBOARD_TEMPLATE=blackboardGltf.scene;
    BOOKCASE_TEMPLATE=bookcaseGltf.scene;
    LOCKER_TEMPLATE=lockerGltf.scene;
    BED_TEMPLATE=bedGltf.scene;
    PIANO_TEMPLATE=pianoGltf.scene;
    MICROSCOPE_TEMPLATE=microscopeGltf.scene;
    GYMMAT_TEMPLATE=gymmatGltf.scene;
    EASEL_TEMPLATE=easelGltf.scene;
    RNDTABLE_TEMPLATE=rndtableGltf.scene;
    KNIFE_TEMPLATE=knifeGltf.scene;
    SCREWDRIVER_TEMPLATE=screwdriverGltf.scene;
    return CHAR_TEMPLATES;
  });
  return CHAR_MODELS_PROMISE;
}
/* 中庭の木(既製3Dモデル、CC0)。read-onlyのテンプレートを複製して配置する */
function makeTreeModel(){
  if(!TREE_TEMPLATE) return null;
  const t=TREE_TEMPLATE.clone(true);
  const rawH=7.264785291764521, targetH=5.0;
  t.scale.setScalar(targetH/rawH);
  return t;
}
/* 教室の机(既製3Dモデル、CC-BY。出典はassets/CREDITS.md参照)。当たり判定は
   持たない見た目だけの飾りで、既存のグリッド衝突判定(壁のみ)は変更しない。
   モデル自体の原点が(床ではなく)高さ方向の中央にあるため、外側にGroupを
   一枚かぶせて「原点=接地面」になるよう底上げしてから返す */
const DESK_RAW_MIN_Y=-0.6491820216178894, DESK_SCALE=0.9;
function makeDeskModel(){
  if(!DESK_TEMPLATE) return null;
  const inner=DESK_TEMPLATE.clone(true);
  inner.scale.setScalar(DESK_SCALE);
  inner.position.y=-DESK_RAW_MIN_Y*DESK_SCALE;
  const wrap=new THREE.Group();
  wrap.add(inner);
  return wrap;
}
/* 黒板(既製3Dモデル、CC-BY。出典はassets/CREDITS.md参照) */
function makeBlackboardModel(){
  if(!BLACKBOARD_TEMPLATE) return null;
  const b=BLACKBOARD_TEMPLATE.clone(true);
  b.scale.set(3.3,3.3,1);
  return b;
}
/* 図書室の本棚(既製3Dモデル、CC0) */
function makeBookcaseModel(){
  if(!BOOKCASE_TEMPLATE) return null;
  const b=BOOKCASE_TEMPLATE.clone(true);
  b.scale.setScalar(0.85);
  return b;
}
/* 2026-09-17続報3: 校舎の見た目強化(廊下・昇降口・保健室・理科室・音楽室・
   体育館・美術部室・生徒会室に既製3Dモデルの備品を追加)。当たり判定は
   これまで通り一切追加しない見た目だけの飾り */

/* ロッカー(廊下の備品/昇降口の靴箱を兼用、CC-BY) */
function makeLockerModel(){
  if(!LOCKER_TEMPLATE) return null;
  const inner=LOCKER_TEMPLATE.clone(true);
  return normalizeToFloor(inner,2.0);
}
/* 保健室のベッド(CC0) */
function makeBedModel(){
  if(!BED_TEMPLATE) return null;
  const inner=BED_TEMPLATE.clone(true);
  return normalizeToFloor(inner,0.85);
}
/* 音楽室のピアノ(CC-BY、旧Google Poly由来で座標スケールが極端に大きい
   ためnormalizeToFloor()での正規化が必須) */
function makePianoModel(){
  if(!PIANO_TEMPLATE) return null;
  const inner=PIANO_TEMPLATE.clone(true);
  return normalizeToFloor(inner,1.15);
}
/* 理科室の顕微鏡(机の上に置く小物、CC-BY) */
function makeMicroscopeModel(){
  if(!MICROSCOPE_TEMPLATE) return null;
  const inner=MICROSCOPE_TEMPLATE.clone(true);
  return normalizeToFloor(inner,0.32);
}
/* 体育館のマット(CC-BY) */
function makeGymmatModel(){
  if(!GYMMAT_TEMPLATE) return null;
  const inner=GYMMAT_TEMPLATE.clone(true);
  return normalizeToFloor(inner,0.16);
}
/* 美術部室のイーゼル(CC-BY、ピアノと同じく旧Google Poly由来) */
function makeEaselModel(){
  if(!EASEL_TEMPLATE) return null;
  const inner=EASEL_TEMPLATE.clone(true);
  return normalizeToFloor(inner,1.4);
}
/* 生徒会室の丸テーブル(CC0) */
function makeRoundTableModel(){
  if(!RNDTABLE_TEMPLATE) return null;
  const inner=RNDTABLE_TEMPLATE.clone(true);
  return normalizeToFloor(inner,0.75);
}

/* 2026-09-17続報4: 武器の見た目(手持ちモデル)。消火器だけ実体があって
   他の道具が「アイコンだけ」だったのを解消するため、data.jsのWEAPONS
   全9種(既存7種+新規のナイフ/ドライバー)それぞれに専用の見た目を用意する。
   ナイフ/ドライバーは既製3Dモデル(CC0/CC-BY)、他はこのゲームの低ポリな
   雰囲気に合わせた原始形状の組み合わせで自作。どれも中心が原点になるよう
   揃えてあり、attachWeaponVisual()側で持ち手の位置に置くだけで済む */
function makeKnifeWeaponModel(){
  if(!KNIFE_TEMPLATE) return null;
  const inner=KNIFE_TEMPLATE.clone(true);
  return normalizeCentered(inner,0.34);
}
function makeScrewdriverWeaponModel(){
  if(!SCREWDRIVER_TEMPLATE) return null;
  const inner=SCREWDRIVER_TEMPLATE.clone(true);
  return normalizeCentered(inner,0.24);
}
function makeBookWeaponModel(){
  const g=new THREE.Group();
  const cover=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.03,0.17),LM(0x3f5aa0));
  g.add(cover);
  const pages=new THREE.Mesh(new THREE.BoxGeometry(0.225,0.022,0.16),LM(0xf0ece0));
  pages.position.y=0.001; g.add(pages);
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}
function makeBroomWeaponModel(){
  const g=new THREE.Group();
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.85,6),LM(0x8a6a44));
  stick.position.y=0.2; g.add(stick);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.28,0.05),LM(0xd9b25a));
  head.position.y=-0.32; g.add(head);
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}
function makeMopWeaponModel(){
  const g=new THREE.Group();
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.85,6),LM(0xb0a890));
  stick.position.y=0.2; g.add(stick);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6),LM(0xe8e2d0));
  head.scale.set(1,0.8,1); head.position.y=-0.34; g.add(head);
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}
function makeConeWeaponModel(){
  const g=new THREE.Group();
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.36,10),LM(0xe8622a));
  g.add(cone);
  const stripe=new THREE.Mesh(new THREE.TorusGeometry(0.08,0.018,6,12),LM(0xf0ece0));
  stripe.position.y=0.03; stripe.rotation.x=Math.PI/2; g.add(stripe);
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}
function makeRopeWeaponModel(){
  const g=new THREE.Group();
  const coil=new THREE.Mesh(new THREE.TorusGeometry(0.14,0.025,6,16),LM(0xcf3f3f));
  g.add(coil);
  [[-0.14,0],[0.14,0]].forEach(function(p){
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.16,6),LM(0x3a3a3a));
    handle.position.set(p[0],0,0); handle.rotation.z=Math.PI/2; g.add(handle);
  });
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}
function makeDrumWeaponModel(){
  const g=new THREE.Group();
  [-0.05,0.05].forEach(function(x){
    const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.34,6),LM(0xc79a5a));
    stick.position.set(x,0,0); stick.rotation.z=Math.PI*0.06; g.add(stick);
  });
  g.traverse(function(o){ if(o.isMesh) o.castShadow=true; });
  return g;
}
function makeShadowWeaponModel(){
  // テネブラの「影の手」。実体の道具ではなく暗い爪状のオーラで表現する
  const g=new THREE.Group();
  const auraMat=new THREE.MeshBasicMaterial({color:0x2a0a3a,transparent:true,opacity:0.6,depthWrite:false});
  const aura=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),auraMat);
  g.add(aura);
  const clawMat=new THREE.MeshBasicMaterial({color:0x120018});
  [-0.09,0,0.09].forEach(function(x,i){
    const claw=new THREE.Mesh(new THREE.ConeGeometry(0.022,0.22,5),clawMat);
    claw.position.set(x,-0.14,0.02*i); claw.rotation.x=Math.PI; g.add(claw);
  });
  return g;
}
const WEAPON_MODEL_MAKERS={
  book:makeBookWeaponModel, broom:makeBroomWeaponModel, mop:makeMopWeaponModel,
  cone:makeConeWeaponModel, rope:makeRopeWeaponModel, drum:makeDrumWeaponModel,
  knife:makeKnifeWeaponModel, driver:makeScrewdriverWeaponModel, shadow:makeShadowWeaponModel,
};
/* 現在選択中の武器の見た目をrig(person()の戻り値)の右手位置に付け替える。
   ボーン追従ではなく固定オフセット(既存のfaintMark/blindMark等と同じ設計)
   なので歩行アニメーション中は完全には手に追従しないが、待機/接近時の
   「何を持っているか一目でわかる」という目的には十分 */
function attachWeaponVisual(rig,weaponKey){
  const slot=rig.userData.heldSlot;
  if(!slot) return;
  while(slot.children.length) slot.remove(slot.children[0]);
  const maker=WEAPON_MODEL_MAKERS[weaponKey];
  if(!maker) return;
  const model=maker();
  if(model){ model.rotation.set(0.3,0,0.15); slot.add(model); }
}

/* 2026-09-17続報5: 武器ごとの「刺す/振るう」攻撃モーション。この
   モデルは既製glTF(Quaternius)のスキンメッシュで、男女でボーン名の
   構成が違う(HumanArmature系/CharacterArmature系)ため、肘・肩の
   ボーンを名前で直接掴んで動かすのは壊れやすい。代わりに、既存の
   heldSlot(道具を持たせている固定オフセットのGroup、faintMark等と
   同じ「外付けの目印」パターン)自体をtakedownの経過(0〜1)に応じて
   動かすことで、ボーン構成に依存しない安全な方法で武器ごとに違う
   軌道を再現する。style:
     thrust=鋭く突く(ナイフ)  smash=振りかぶって叩きつける(教科書/三角コーン)
     arc=横に薙ぐ(ほうき/モップ/影の手)  drill=ねじ込む(ドライバー)
     flurry=連打(太鼓のバチ)  choke=引き絞る(縄跳び) */
const WEAPON_SWING={
  book:  {style:'smash', windup:0.55, amp:1.0},
  broom: {style:'arc',   windup:0.5,  amp:1.3},
  mop:   {style:'arc',   windup:0.5,  amp:1.05},
  cone:  {style:'smash', windup:0.6,  amp:0.85},
  rope:  {style:'choke', windup:0.45, amp:0.7},
  drum:  {style:'flurry',windup:0.0,  amp:0.55},
  knife: {style:'thrust',windup:0.6,  amp:1.0},
  driver:{style:'drill', windup:0.55, amp:0.8},
  shadow:{style:'arc',   windup:0.35, amp:1.6},
};
function easeOutQuad(x){ x=Math.max(0,Math.min(1,x)); return 1-(1-x)*(1-x); }
function applyWeaponSwingPose(rig,weaponKey,t){
  const slot=rig.userData.heldSlot;
  if(!slot) return;
  const p=WEAPON_SWING[weaponKey]||WEAPON_SWING.book;
  const tt=Math.max(0,Math.min(1,t));
  const wu=Math.max(0.001,p.windup);
  const raise=Math.sin(Math.min(1,tt/wu)*Math.PI/2); // 0→1(構え/溜め)
  const strike=easeOutQuad(Math.max(0,(tt-p.windup)/Math.max(0.001,1-p.windup))); // 0→1(振り/突き)
  let dx=0,dy=0,dz=0,rx=0,ry=0,rz=0,lean=0;
  if(p.style==='thrust'){
    dz = -0.12*raise*p.amp + 0.46*p.amp*strike;
    rx = -0.35*raise*p.amp + 0.55*p.amp*strike;
    lean = -0.08*raise + 0.22*strike; // 溜めで少し引き、突きで前に踏み込む
  } else if(p.style==='smash'){
    rx = -1.5*p.amp*raise + 1.9*p.amp*strike;
    dy = 0.22*p.amp*raise - 0.18*p.amp*strike;
    lean = -0.1*raise + 0.28*strike; // 振りかぶりで軽く反り、叩きつけで前傾
  } else if(p.style==='arc'){
    ry = 0.9*p.amp*raise - 1.7*p.amp*strike;
    rx = 0.3*p.amp*raise;
    lean = 0.05*raise + 0.16*strike;
  } else if(p.style==='drill'){
    dz = -0.08*raise*p.amp + 0.32*p.amp*strike;
    rz = strike*Math.PI*1.6*p.amp;
    lean = -0.06*raise + 0.2*strike;
  } else if(p.style==='flurry'){
    rx = Math.sin(tt*Math.PI*11)*0.55*p.amp;
    dz = Math.abs(Math.sin(tt*Math.PI*11))*0.14*p.amp;
    lean = 0.08+Math.abs(Math.sin(tt*Math.PI*11))*0.06;
  } else if(p.style==='choke'){
    dx = -0.1*raise*p.amp + 0.16*p.amp*strike;
    dz = 0.06*raise*p.amp - 0.1*p.amp*strike;
    ry = -0.4*p.amp*strike;
    lean = 0.1*strike;
  }
  const H=rig.userData.H||2.6;
  slot.position.set(0.3+dx, H*0.54+dy, 0.14+dz);
  slot.rotation.set(rx,ry,rz);
  /* ボーン(肘/肩)を直接掴む代わりに、体全体をわずかに前傾させて「踏み込んで
     攻撃している」印象を補強する(GLTFモデルは男女でボーン名の構成が違い
     直接掴むのは壊れやすいため、外側のrigごと傾けるだけに留める安全策) */
  rig.rotation.x=lean;
}
function resetWeaponPose(rig){
  const slot=rig.userData.heldSlot;
  if(!slot) return;
  const H=rig.userData.H||2.6;
  slot.position.set(0.3, H*0.54, 0.14);
  slot.rotation.set(0,0,0);
  rig.rotation.x=0;
}

function person(opt){
  if(!CHAR_TEMPLATES){
    throw new Error('preloadCharacterModels()の完了前にperson()が呼ばれた');
  }
  const male=!!opt.male;
  const key=male?'male':'female';
  const tmpl=CHAR_TEMPLATES[key];
  const tallMul=opt.tall?1.08:1.0;

  const g=new THREE.Group();
  const inner=THREE.SkeletonUtils.clone(tmpl.scene);
  inner.scale.setScalar(tmpl.scale*tallMul);
  g.add(inner);

  /* マテリアルはテンプレートと共有されたままだと全キャラが同じ色になって
     しまうので、インスタンスごとにクローンしてから色を塗り替える */
  const tint=TINT_MAP[key];
  const colorOf={
    uniform:opt.uniform!==undefined?opt.uniform:0x24344a,
    skin:opt.skin!==undefined?opt.skin:0xf0d3b4,
    hair:opt.hair!==undefined?opt.hair:0x2b2118,
    accent:opt.accent!==undefined?opt.accent:0xb5352f,
    eye:opt.eye!==undefined?opt.eye:0x22242a,
  };
  inner.traverse(function(o){
    if(!o.isMesh) return;
    o.castShadow=true; o.receiveShadow=true;
    const arr=Array.isArray(o.material)?o.material:[o.material];
    const cloned=arr.map(function(m){
      const nm=m.clone();
      nm.metalness=0.1; nm.roughness=0.85; // PBRの金属っぽい光沢を抑えて素朴な低ポリ見た目に
      const field=tint[nm.name];
      if(field) nm.color.setHex(colorOf[field]);
      return nm;
    });
    o.material=Array.isArray(o.material)?cloned:cloned[0];
  });

  /* アニメーション(idle/walk/気絶=faintを流用) */
  const mixer=new THREE.AnimationMixer(inner);
  const aliases=CLIP_ALIASES[key];
  const actions={};
  Object.keys(aliases).forEach(function(k){
    const clip=THREE.AnimationClip.findByName(tmpl.animations,aliases[k]);
    if(clip) actions[k]=mixer.clipAction(clip);
  });
  if(actions.idle){ actions.idle.play(); }

  const H=TARGET_HEIGHT[key]*tallMul;

  /* 憑依オーラ(悪魔の気配) */
  const auraMat=new THREE.MeshBasicMaterial({color:0x5a1fae,transparent:true,opacity:0.28,depthWrite:false});
  const aura=new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8),auraMat);
  aura.position.y=H*0.56; aura.visible=false; g.add(aura);
  /* 気絶時の目印 */
  const faintMark=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.05,6,10),LM(0xffe066));
  faintMark.position.set(0,H+0.35,0); faintMark.visible=false; g.add(faintMark);
  /* 拘束(縄)の目印 */
  const bindMark=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.05,6,12),LM(0x8a5a2a));
  bindMark.rotation.x=Math.PI/2; bindMark.position.y=H*0.6; bindMark.visible=false; g.add(bindMark);
  /* 目撃者マーク(!) */
  const witnessMark=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,6),LM(0xf2c14e));
  witnessMark.position.set(0,H+0.4,0); witnessMark.visible=false; g.add(witnessMark);
  /* 消火器で視界を奪われている間の目印(顔の周りの白い霧っぽい塊) */
  const blindMark=new THREE.Group();
  const puffMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.55,depthWrite:false});
  [[0,0,0.12],[0.12,0.05,-0.05],[-0.11,-0.04,-0.04]].forEach(function(o){
    const puff=new THREE.Mesh(new THREE.SphereGeometry(0.17,8,6),puffMat);
    puff.position.set(o[0],o[1],o[2]); blindMark.add(puff);
  });
  blindMark.position.y=H*0.92; blindMark.visible=false; g.add(blindMark);
  /* 接地影 */
  const blob=new THREE.Mesh(new THREE.CircleGeometry(0.62,16),
    new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.3,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.position.y=0.03; g.add(blob);

  /* 2026-09-17続報4: 手持ち武器の取り付け位置。ボーン追従ではなく右手
     あたりの固定オフセット(他の目印マークと同じ設計思想)。
     attachWeaponVisual()がここに現在の武器モデルを差し替える */
  const heldSlot=new THREE.Group();
  heldSlot.position.set(0.3,H*0.54,0.14);
  g.add(heldSlot);

  g.userData={mixer:mixer,actions:actions,currentAction:actions.idle||null,
    aura:aura,faintMark:faintMark,bindMark:bindMark,witnessMark:witnessMark,blindMark:blindMark,
    heldSlot:heldSlot,faint:false,H:H};
  return g;
}

/* 歩行アニメーション。glTFに同梱のIdle/Walk/気絶(Death)クリップを
   AnimationMixerでクロスフェード再生する(以前の手動ボーン角度計算から
   置き換え済み) */
function animateWalk(rig,dt,moving,speedMul){
  const u=rig.userData;
  if(!u||!u.mixer) return;
  const actions=u.actions;
  const target = u.faint ? actions.faint : (moving ? actions.walk : actions.idle);
  if(target && u.currentAction!==target){
    target.reset();
    if(u.faint){ target.setLoop(THREE.LoopOnce,1); target.clampWhenFinished=true; }
    target.fadeIn(0.15).play();
    if(u.currentAction) u.currentAction.fadeOut(0.15);
    u.currentAction=target;
  }
  if(u.currentAction) u.currentAction.timeScale=(!u.faint&&moving)?(speedMul||1):1;
  u.mixer.update(dt);
}
