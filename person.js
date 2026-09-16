/* ============================================================
   低ポリキャラクタービルダー(「放課後の居残り」のperson()の手法を
   踏襲した簡略版。プリミティブ図形の組み合わせのみ、アセット不使用)
   ============================================================ */
function LM(c){ return new THREE.MeshLambertMaterial({color:c}); }
function PM(c,sh,sp){ return new THREE.MeshPhongMaterial({color:c,shininess:sh||18,specular:sp||0x222222}); }

function person(opt){
  const g=new THREE.Group();
  const S=opt.tall?1.12:1.0;
  const male=!!opt.male;
  const uni=PM(opt.uniform!==undefined?opt.uniform:0x24344a,16,0x24221c);
  const hair=LM(opt.hair!==undefined?opt.hair:0x2b2118);
  const skin=PM(opt.skin!==undefined?opt.skin:0xf0d3b4,22,0x3a2c22);
  const acc=LM(opt.accent!==undefined?opt.accent:0xb5352f);
  const white=LM(0xf4f2ea), dark=LM(0x2c3038);
  const hipY=1.02*S, chest=1.58*S, headY=2.36*S;

  /* 脚(股関節ピボット + すね箱 + 靴)。単純な1関節スイングで歩行表現 */
  const legs={};
  [['L',-0.22],['R',0.22]].forEach(function(e){
    const piv=new THREE.Group(); piv.position.set(e[1]*S,hipY,0); g.add(piv);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.3*S,1.02*S,0.3*S),dark);
    leg.position.y=-0.51*S; leg.castShadow=true; piv.add(leg);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.32*S,0.16*S,0.48*S),LM(opt.shoeColor||0x25292b));
    shoe.position.set(0,-1.02*S,0.08*S); piv.add(shoe);
    legs[e[0]]=piv;
  });

  /* 胴 */
  const torso=new THREE.Mesh(new THREE.BoxGeometry(0.82*S,0.98*S,0.48*S),uni);
  torso.position.y=chest; torso.castShadow=true; g.add(torso);
  [-1,1].forEach(function(sx){
    const sh=new THREE.Mesh(new THREE.SphereGeometry(0.23*S,10,8),uni);
    sh.position.set(sx*0.43*S,chest+0.42*S,0); g.add(sh);
  });
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.16*S,0.19*S,0.28*S,10),skin);
  neck.position.y=chest+0.62*S; g.add(neck);
  const waist=new THREE.Mesh(new THREE.CylinderGeometry(0.38*S,0.33*S,0.24*S,12),uni);
  waist.position.y=chest-0.54*S; g.add(waist);

  /* 下半身(スカート or ズボン) */
  if(!male){
    const skirt=new THREE.Mesh(new THREE.CylinderGeometry(0.48*S,0.68*S,0.5*S,14),acc);
    skirt.position.y=hipY+0.14*S; skirt.castShadow=true; g.add(skirt);
    g.userData_skirt=skirt;
  } else {
    [-1,1].forEach(function(sx){
      const p=new THREE.Mesh(new THREE.BoxGeometry(0.34*S,0.95*S,0.34*S),LM(opt.pants||0x2b2f3a));
      p.position.set(sx*0.22*S,hipY-0.36*S,0); g.add(p);
    });
    torso.scale.x=1.08;
  }

  /* 襟・ベルト・リボン(男女とも共通の学生服らしさ) */
  const collar=new THREE.Mesh(new THREE.BoxGeometry(0.86*S,0.15*S,0.54*S),white);
  collar.position.y=chest+0.5*S; g.add(collar);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(0.86*S,0.13*S,0.52*S),LM(0x2a2620));
  belt.position.y=chest-0.48*S; g.add(belt);
  const tie=new THREE.Mesh(new THREE.BoxGeometry(0.18*S,male?0.5*S:0.22*S,0.09*S),acc);
  tie.position.set(0,chest+0.28*S,0.27*S); g.add(tie);

  /* 腕(肩関節ピボット + 前腕箱 + 手) */
  const arms={};
  [['L',-0.53],['R',0.53]].forEach(function(e){
    const piv=new THREE.Group(); piv.position.set(e[1]*S,chest+0.42*S,0); g.add(piv);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.22*S,0.84*S,0.26*S),uni);
    arm.position.y=-0.42*S; arm.castShadow=true; piv.add(arm);
    const hand=new THREE.Mesh(new THREE.BoxGeometry(0.2*S,0.2*S,0.22*S),skin);
    hand.position.y=-0.9*S; piv.add(hand);
    arms[e[0]]=piv;
  });

  /* 頭 */
  const head=new THREE.Group(); head.position.y=headY; g.add(head);
  const skull=new THREE.Mesh(new THREE.SphereGeometry(0.38*S,20,16),skin);
  skull.castShadow=true; head.add(skull);
  const jaw=new THREE.Mesh(new THREE.SphereGeometry(0.28*S,14,12),skin);
  jaw.position.set(0,-0.15*S,0.07*S); jaw.scale.set(1,0.8,1.05); head.add(jaw);
  const hs=opt.hairStyle||(male?'short':'long');
  if(hs!=='none'){
    const hcap=new THREE.Mesh(new THREE.SphereGeometry(0.41*S,14,12,0,Math.PI*2,0,Math.PI*0.62),hair);
    hcap.position.y=0.03*S; head.add(hcap);
  }
  if(hs==='long'){
    [-1,1].forEach(function(sx){
      const h=new THREE.Mesh(new THREE.BoxGeometry(0.15*S,0.7*S,0.28*S),hair);
      h.position.set(sx*0.34*S,-0.1*S,0.02*S); head.add(h);
    });
  } else if(hs==='twin'){
    [-1,1].forEach(function(sx){
      const h=new THREE.Mesh(new THREE.BoxGeometry(0.24*S,0.85*S,0.24*S),hair);
      h.position.set(sx*0.48*S,-0.2*S,-0.08*S); head.add(h);
    });
  } else if(hs==='wild'){
    for(let i=0;i<5;i++){
      const h=new THREE.Mesh(new THREE.BoxGeometry(0.16*S,1.0*S,0.16*S),hair);
      h.position.set((-0.36+i*0.18)*S,-0.28*S,-0.26*S); head.add(h);
    }
  } else if(hs==='bob'){
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.82*S,0.38*S,0.66*S),hair);
    h.position.set(0,-0.13*S,-0.02*S); head.add(h);
  }
  /* 目・眉・口 */
  [-1,1].forEach(function(sx){
    const w=new THREE.Mesh(new THREE.BoxGeometry(0.14*S,0.12*S,0.05*S),LM(0xf6f4ee));
    w.position.set(sx*0.14*S,0.02*S,0.35*S); head.add(w);
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.075*S,0.1*S,0.06*S),LM(opt.eye||0x22242a));
    eye.position.set(sx*0.14*S,0.02*S,0.37*S); head.add(eye);
    const bw=new THREE.Mesh(new THREE.BoxGeometry(0.16*S,0.032*S,0.05*S),hair);
    bw.position.set(sx*0.14*S,0.16*S,0.36*S); head.add(bw);
  });
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.13*S,0.028*S,0.04*S),LM(0xa8564e));
  mouth.position.set(0,-0.19*S,0.37*S); head.add(mouth);

  /* 憑依オーラ(悪魔の気配。憑依度が高いとゲーム側でvisible=trueにする) */
  const auraMat=new THREE.MeshBasicMaterial({color:0x5a1fae,transparent:true,opacity:0.28,depthWrite:false});
  const aura=new THREE.Mesh(new THREE.SphereGeometry(1.3*S,10,8),auraMat);
  aura.position.y=1.35*S; aura.visible=false; g.add(aura);
  /* 気絶時の目印(星がまわる代わりの単純な☆スプライト的マーク) */
  const faintMark=new THREE.Mesh(new THREE.TorusGeometry(0.22*S,0.05*S,6,10),LM(0xffe066));
  faintMark.position.set(0,headY+0.5*S,0); faintMark.visible=false; g.add(faintMark);
  /* 拘束(縄)の目印 */
  const bindMark=new THREE.Mesh(new THREE.TorusGeometry(0.3*S,0.05*S,6,12),LM(0x8a5a2a));
  bindMark.rotation.x=Math.PI/2; bindMark.position.y=chest; bindMark.visible=false; g.add(bindMark);
  /* 目撃者マーク(!) */
  const witnessMark=new THREE.Mesh(new THREE.ConeGeometry(0.12*S,0.3*S,6),LM(0xf2c14e));
  witnessMark.position.set(0,headY+0.55*S,0); witnessMark.visible=false; g.add(witnessMark);
  /* 接地影 */
  const blob=new THREE.Mesh(new THREE.CircleGeometry(0.62*S,16),
    new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.3,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.position.y=0.03; g.add(blob);

  g.userData={legL:legs.L,legR:legs.R,armL:arms.L,armR:arms.R,head:head,
    aura:aura,faintMark:faintMark,bindMark:bindMark,witnessMark:witnessMark,
    phase:Math.random()*10,S:S,skirt:g.userData_skirt||null,
    faint:false,bound:false};
  return g;
}

/* 歩行アニメーション(脚・腕を単純に振る) */
function animateWalk(rig,dt,moving,speedMul){
  const u=rig.userData;
  if(u.faint) return;
  const targetSpeed=moving?(6.5*(speedMul||1)):0;
  u.phase=(u.phase||0)+dt*targetSpeed;
  const amp=moving?0.55:0.0;
  const sL=Math.sin(u.phase), sR=Math.sin(u.phase+Math.PI);
  if(u.legL) u.legL.rotation.x=sL*amp;
  if(u.legR) u.legR.rotation.x=sR*amp;
  if(u.armL) u.armL.rotation.x=sR*amp*0.8;
  if(u.armR) u.armR.rotation.x=sL*amp*0.8;
}
