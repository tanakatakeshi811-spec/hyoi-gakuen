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
let TREE_TEMPLATE=null;
function preloadCharacterModels(){
  if(CHAR_MODELS_PROMISE) return CHAR_MODELS_PROMISE;
  CHAR_MODELS_PROMISE = Promise.all([
    loadGLTF('assets/models/man.glb'),
    loadGLTF('assets/models/woman.glb'),
    loadGLTF('assets/models/tree.glb'),
  ]).then(function(results){
    const manGltf=results[0], womanGltf=results[1], treeGltf=results[2];
    CHAR_TEMPLATES = {
      male:  {scene:manGltf.scene,   animations:manGltf.animations,
        scale:TARGET_HEIGHT.male/RAW_HEIGHT.male},
      female:{scene:womanGltf.scene, animations:womanGltf.animations,
        scale:TARGET_HEIGHT.female/RAW_HEIGHT.female},
    };
    treeGltf.scene.traverse(function(o){
      if(!o.isMesh) return;
      o.castShadow=true; o.receiveShadow=true;
      // このシーンの2灯ライティング(ヘミスフィア+ディレクショナル、IBLなし)だと
      // metalness高めのPBRマテリアルは暗く沈むため、他のオブジェクトと馴染むように
      // 質感を落ち着かせる(色・テクスチャ自体は変更しない)
      const arr=Array.isArray(o.material)?o.material:[o.material];
      arr.forEach(function(m){ m.metalness=0.05; m.roughness=1.0; });
    });
    TREE_TEMPLATE=treeGltf.scene;
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
  /* 接地影 */
  const blob=new THREE.Mesh(new THREE.CircleGeometry(0.62,16),
    new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.3,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.position.y=0.03; g.add(blob);

  g.userData={mixer:mixer,actions:actions,currentAction:actions.idle||null,
    aura:aura,faintMark:faintMark,bindMark:bindMark,witnessMark:witnessMark,
    faint:false,H:H};
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
