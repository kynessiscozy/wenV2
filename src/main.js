const CURR_YEAR=new Date().getFullYear();
const TG='甲乙丙丁戊己庚辛壬癸'.split(''),DZ='子丑寅卯辰巳午未申酉戌亥'.split(''),SX='鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''),WX='木火土金水'.split('');
const GW={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const ZW={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const ZC={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const WC={木:'#7ab648',火:'#d4654a',土:'#d4a04a',金:'#c8a45a',水:'#5AC8FA'};
const NY=['海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金','山头火','山头火','涧下水','涧下水','城头土','城头土','白蜡金','白蜡金','杨柳木','杨柳木','泉中水','泉中水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水','砂石金','砂石金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金','覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木','大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'];
/* —— 十神表（修正版：按"五行生克 + 阴阳同异"严格生成）—— */
const SS=(function(){
  const yin={甲:0,丙:0,戊:0,庚:0,壬:0,乙:1,丁:1,己:1,辛:1,癸:1}; // 0=阳 1=阴
  const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};
  const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};
  const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};
  const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};
  const out={};
  TG.forEach(d=>{
    out[d]={};
    const dw=GW[d], dy=yin[d];
    TG.forEach(o=>{
      const ow=GW[o], oy=yin[o], same=(dy===oy);
      let r='';
      if(dw===ow)      r= same?'比肩':'劫财';
      else if(SH[dw]===ow) r= same?'食神':'伤官';
      else if(KE[dw]===ow) r= same?'偏财':'正财';
      else if(BK[dw]===ow) r= same?'七杀':'正官';
      else if(BS[dw]===ow) r= same?'偏印':'正印';
      out[d][o]=r;
    });
  });
  return out;
})();

/* ============================================================
   全局上下文工具 TJ —— 所有派生量的单一来源
   规则：任何"当前大运 / 当前流年 / 当前流月 / 年龄 / 十神 / 评分"
   必须经由 TJ.* 或 buildContext() 提供，禁止在下游函数中重复实现。
   ============================================================ */
const TJ={
  calcAge(by,bm,bd){
    if(!by)return 0;
    const now=new Date();
    const ty=now.getFullYear(),tm=now.getMonth()+1,td=now.getDate();
    let a=ty-by;
    if(bm&&bd&&(tm<bm||(tm===bm&&td<bd)))a--;
    return Math.max(0,a);
  },
  findDaYun(dy,age){
    if(!dy||!dy.ds||!dy.ds.length)return null;
    const ds=dy.ds;
    if(age<ds[0].as)return Object.assign({},ds[0],{_idx:0,_state:'before'});
    for(let i=0;i<ds.length;i++){
      if(age>=ds[i].as&&age<=ds[i].ae)return Object.assign({},ds[i],{_idx:i,_state:'current'});
    }
    return Object.assign({},ds[ds.length-1],{_idx:ds.length-1,_state:'after'});
  },
  findLiuNian(ln,year){
    if(!ln||!ln.length)return null;
    const y=year||CURR_YEAR;
    return ln.find(l=>l.y===y)||ln.find(l=>l.y>=y)||ln[ln.length-1];
  },
  findLiuYue(liuyue){
    if(!liuyue||!liuyue.length)return null;
    const now=new Date(),today=now.getTime();
    let best=null,bestDiff=Infinity;
    liuyue.forEach(lm=>{
      const mt=(lm.jq||'').match(/(\d+)月(\d+)日/);
      if(!mt)return;
      const dt=new Date(now.getFullYear(),parseInt(mt[1])-1,parseInt(mt[2]));
      const diff=today-dt.getTime();
      if(diff>=0&&diff<bestDiff){bestDiff=diff;best=lm;}
    });
    return best||liuyue[0];
  },
  ssOf(dg,g){return(dg&&g&&SS[dg])?SS[dg][g]:'';},
  isShunDaYun(b,gen){
    const yangGan=b.Y.gi%2===0;
    return(yangGan&&gen==='male')||(!yangGan&&gen!=='male');
  }
};

/* ============================================================
   TJX 推算内核 v1.0  ——  TianJi eXtended Engine
   理论来源：
     · 旺衰：《滴天髓阐微》（任铁樵）得令/得地/得势三维量化
     · 格局：《子平真诠》（沈孝瞻）正格、变格、从化格
     · 调候：《穷通宝鉴》月令调候用神表（十干四时）
     · 用神：扶抑·调候·通关·病药 四法综合
     · 十神：根/透/藏 与 生克 质量分析
     · 大运流年：刑冲合化 + 用忌 + 神煞触发 综合评分
   设计：纯函数 + 单一来源；输出挂在 ctx.tjx 命名空间。
   注意：所有评分采用 -100~+100 的统一量纲；UI 可自行映射。
   ============================================================ */

/* ============================================================
   V5 旺衰五维精算引擎 (内嵌版)
   升级自 V4 三维模型，新增：得气(穷通宝鉴气数法) + 得局(合局加持)
   同时增强：得令(人元司权+进气退气) + 得地(墓库开闭+禄位) + 得势(生克链传播)
   ============================================================ */
const __TJX_V5 = (function(){
  const BEI_SHENG = {木:'水',火:'木',土:'火',金:'土',水:'金'};
  const BEI_KE    = {木:'金',火:'水',土:'木',金:'火',水:'土'};

  // 人元司权表
  const MONTH_DUTY = {
    寅:[{g:'戊',d:7},{g:'丙',d:7},{g:'甲',d:16}],
    卯:[{g:'甲',d:10},{g:'乙',d:20}],
    辰:[{g:'乙',d:9},{g:'癸',d:3},{g:'戊',d:18}],
    巳:[{g:'戊',d:5},{g:'庚',d:5},{g:'丙',d:20}],
    午:[{g:'丙',d:10},{g:'己',d:9},{g:'丁',d:11}],
    未:[{g:'丁',d:9},{g:'乙',d:3},{g:'己',d:18}],
    申:[{g:'戊',d:7},{g:'己',d:7},{g:'壬',d:3},{g:'庚',d:13}],
    酉:[{g:'庚',d:10},{g:'辛',d:20}],
    戌:[{g:'辛',d:9},{g:'丁',d:3},{g:'戊',d:18}],
    亥:[{g:'戊',d:7},{g:'甲',d:5},{g:'壬',d:18}],
    子:[{g:'壬',d:10},{g:'癸',d:20}],
    丑:[{g:'癸',d:9},{g:'辛',d:3},{g:'己',d:18}]
  };

  const W_TABLE = {
    木:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
    火:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},
    土:{土:'旺',金:'相',水:'死',木:'囚',火:'休'},
    金:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},
    水:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}
  };

  const WX_STATE_SCORE = {旺:40,相:25,休:10,囚:-5,死:-18};

  const JIN_TUI_QI = {
    寅:{进:'火',退:'水'},卯:{进:'火',退:'水'},辰:{进:'金',退:'木'},
    巳:{进:'土',退:'木'},午:{进:'土',退:'木'},未:{进:'金',退:'火'},
    申:{进:'水',退:'土'},酉:{进:'水',退:'土'},戌:{进:'木',退:'金'},
    亥:{进:'木',退:'金'},子:{进:'木',退:'金'},丑:{进:'火',退:'水'}
  };

  const LU = {甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
  const DI_WANG = {甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'};
  const CHONG = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const HE = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  const TOMB = {辰:'水',戌:'火',丑:'金',未:'木'};

  // 穷通宝鉴气数（精简：12日干×12月=144条）
  const QI_SHU = {
    甲:{寅:['丙','癸'],卯:['庚','丙'],辰:['庚','壬'],巳:['癸','庚'],午:['癸','庚'],未:['癸','庚'],申:['庚','壬'],酉:['庚','壬'],戌:['庚','壬'],亥:['庚','丁'],子:['丁','庚'],丑:['丁','庚']},
    乙:{寅:['丙','癸'],卯:['丙','癸'],辰:['癸','丙'],巳:['癸','丙'],午:['癸','丙'],未:['癸','丙'],申:['丙','癸'],酉:['癸','丙'],戌:['癸','丙'],亥:['丙','戊'],子:['丙','戊'],丑:['丙','戊']},
    丙:{寅:['壬','庚'],卯:['壬','己'],辰:['壬','庚'],巳:['壬','庚'],午:['壬','庚'],未:['壬','庚'],申:['壬','戊'],酉:['壬','戊'],戌:['壬','甲'],亥:['甲','戊'],子:['壬','戊'],丑:['壬','甲']},
    丁:{寅:['甲','庚'],卯:['甲','庚'],辰:['甲','庚'],巳:['甲','庚'],午:['壬','庚'],未:['甲','壬'],申:['甲','庚'],酉:['甲','庚'],戌:['甲','庚'],亥:['甲','庚'],子:['甲','庚'],丑:['甲','庚']},
    戊:{寅:['丙','甲'],卯:['丙','甲'],辰:['甲','丙'],巳:['甲','丙'],午:['壬','甲'],未:['甲','丙'],申:['丙','甲'],酉:['丙','甲'],戌:['甲','丙'],亥:['丙','甲'],子:['丙','甲'],丑:['丙','甲']},
    己:{寅:['丙','庚'],卯:['甲','癸'],辰:['丙','甲'],巳:['癸','丙'],午:['癸','丙'],未:['癸','丙'],申:['丙','癸'],酉:['丙','癸'],戌:['丙','癸'],亥:['丙','甲'],子:['丙','甲'],丑:['丙','甲']},
    庚:{寅:['戊','甲'],卯:['丁','甲'],辰:['甲','丁'],巳:['壬','戊'],午:['壬','己'],未:['壬','甲'],申:['丁','甲'],酉:['丁','甲'],戌:['甲','壬'],亥:['丁','丙'],子:['丁','甲'],丑:['丙','丁']},
    辛:{寅:['己','壬'],卯:['壬','甲'],辰:['壬','甲'],巳:['壬','甲'],午:['壬','己'],未:['壬','甲'],申:['壬','甲'],酉:['壬','甲'],戌:['壬','甲'],亥:['壬','丙'],子:['丙','戊'],丑:['丙','壬']},
    壬:{寅:['庚','戊'],卯:['戊','庚'],辰:['甲','庚'],巳:['壬','庚'],午:['癸','庚'],未:['辛','甲'],申:['戊','丁'],酉:['甲','庚'],戌:['甲','丙'],亥:['戊','丙'],子:['戊','丙'],丑:['丙','丁']},
    癸:{寅:['辛','丙'],卯:['庚','辛'],辰:['丙','辛'],巳:['辛','庚'],午:['庚','壬'],未:['庚','辛'],申:['丁','甲'],酉:['辛','丙'],戌:['辛','癸'],亥:['庚','辛'],子:['丙','辛'],丑:['丙','丁']}
  };

  // 十二长生权重（日干在各地支）
  const CS_WEIGHT = (function(){
    const cs = {
      甲:'亥子丑寅卯辰巳午未申酉戌',乙:'午巳辰卯寅丑子亥戌酉申未',
      丙:'寅卯辰巳午未申酉戌亥子丑',丁:'酉申未午巳辰卯寅丑子亥戌',
      戊:'寅卯辰巳午未申酉戌亥子丑',己:'酉申未午巳辰卯寅丑子亥戌',
      庚:'巳午未申酉戌亥子丑寅卯辰',辛:'子亥戌酉申未午巳辰卯寅丑',
      壬:'申酉戌亥子丑寅卯辰巳午未',癸:'卯寅丑子亥戌酉申未午巳辰'
    };
    const sw = {长:0.85,沐:0.45,冠:0.80,临:1.00,帝:0.95,衰:0.55,病:0.35,死:0.15,墓:0.25,绝:0.05,胎:0.40,养:0.50};
    const sn = ['长','沐','冠','临','帝','衰','病','死','墓','绝','胎','养'];
    const out = {};
    TG.forEach(g => { out[g] = {}; DZ.forEach((z,i) => { out[g][z] = sw[sn[cs[g].indexOf(z)]] || 0.5; }); });
    return out;
  })();

  // 地支藏干
  const ZC_W_V5 = {
    子:[['癸',1.0]],丑:[['己',1.0],['癸',0.7],['辛',0.5]],
    寅:[['甲',1.0],['丙',0.7],['戊',0.5]],卯:[['乙',1.0]],
    辰:[['戊',1.0],['乙',0.7],['癸',0.5]],巳:[['丙',1.0],['庚',0.7],['戊',0.5]],
    午:[['丁',1.0],['己',0.7]],未:[['己',1.0],['丁',0.7],['乙',0.5]],
    申:[['庚',1.0],['壬',0.7],['戊',0.5]],酉:[['辛',1.0]],
    戌:[['戊',1.0],['辛',0.7],['丁',0.5]],亥:[['壬',1.0],['甲',0.7]]
  };

  const DIMS = {deLing:0.25, deDi:0.30, deShi:0.20, deQi:0.15, deJu:0.10};

  function deLing(dg, mz, bd){
    const dw=GW[dg], mw=ZW[mz];
    const state=W_TABLE[mw][dw];
    let score=WX_STATE_SCORE[state]||0;
    let dutyGan=null;
    const duties=MONTH_DUTY[mz]||[];
    let ds=0;
    for(const d of duties){ds+=d.d;if(bd<=ds){dutyGan=d.g;break;}}
    if(!dutyGan&&duties.length)dutyGan=duties[duties.length-1].g;
    if(dutyGan&&GW[dutyGan]===dw)score+=8;
    else if(dutyGan&&GW[dutyGan]===BEI_SHENG[dw])score+=4;
    else if(dutyGan&&GW[dutyGan]===BEI_KE[dw])score-=6;
    const jt=JIN_TUI_QI[mz];
    let jtl='';
    if(jt){if(dw===jt.进){score+=6;jtl='进气';}else if(dw===jt.退){score-=6;jtl='退气';}}
    return{score:Math.round(score),state,dutyGan,jinTui:jtl};
  }

  function deDi(dg, zhiList){
    const dw=GW[dg];let score=0;
    const posW=[1.0,2.0,1.8,1.2],allZ=zhiList.map(z=>z.z);
    for(const item of zhiList){
      const{z,position}=item,wgt=posW[position];
      const csW=CS_WEIGHT[dg]&&CS_WEIGHT[dg][z]?CS_WEIGHT[dg][z]:0.3;
      score+=csW*15*wgt;
      const hidden=ZC_W_V5[z]||[];
      for(const[cg,hw] of hidden){
        const cw=GW[cg];
        if(cw===dw){
          let rs=hw*8*wgt;
          if(TOMB[z]===dw){
            const cz=CHONG[z];
            rs*=allZ.includes(cz)?1.8:0.4;
          }
          score+=rs;
        }else if(cw===BEI_SHENG[dw])score+=hw*5*wgt;
      }
      if(LU[dg]===z)score+=14*wgt;
      if(DI_WANG[dg]===z)score+=10*wgt;
    }
    return{score:Math.round(Math.min(score,60)*10)/10};
  }

  function deShi(dg, yg, mg, hg){
    const dw=GW[dg];let score=0;const chains=[];
    const gl=[{g:yg,pos:'年',dist:3},{g:mg,pos:'月',dist:1},{g:hg,pos:'时',dist:2}];
    for(const{g,pos,dist} of gl){
      if(!g)continue;
      const gw=GW[g],df=1.0/Math.sqrt(dist);
      if(gw===dw){score+=10*df;chains.push(pos+'比劫+'+Math.round(10*df));}
      else if(gw===BEI_SHENG[dw]){score+=7*df;chains.push(pos+'印生+'+Math.round(7*df));}
      else if(gw===ZSHENG){score-=5*df;chains.push(pos+'食伤-'+Math.round(5*df));}
      else if(gw===ZKE){score-=6*df;chains.push(pos+'财耗-'+Math.round(6*df));}
      else if(gw===BEI_KE[dw]){score-=9*df;chains.push(pos+'官杀-'+Math.round(9*df));}
    }
    if(yg&&mg){
      const yw=GW[yg],mw=GW[mg];
      if(ZSHENG&&ZSHENG[yw]===mw){if(ZSHENG[mw]===dw||BEI_SHENG[mw]===dw){score+=5;chains.push('连续相生链+5');}}
      if((ZKE&&ZKE[yw]===mw||BEI_KE[yw]===mw)&&(mw===dw||(ZSHENG&&ZSHENG[mw]===dw)||BEI_SHENG[mw]===dw)){score-=4;chains.push('阻隔-4');}
    }
    if(mg&&hg){
      const mw=GW[mg],hw=GW[hg];
      if(((BEI_KE[mw]===dw||(ZKE&&ZKE[mw]===dw)||(ZSHENG&&ZSHENG[mw]===dw))&&(BEI_KE[hw]===dw||(ZKE&&ZKE[hw]===dw)||(ZSHENG&&ZSHENG[hw]===dw)))&&(mw===hw||(ZSHENG&&ZSHENG[mw]===hw)||BEI_SHENG[mw]===hw)){score-=3;chains.push('合力作用-3');}
    }
    return{score:Math.round(score*10)/10,chains};
  }

  function deQi(dg, mz, allGan, allZhi){
    const qiList=QI_SHU[dg]&&QI_SHU[dg][mz]?QI_SHU[dg][mz]:[];
    if(!qiList.length)return{score:0,details:[],summary:'无数据'};
    const pw=new Set(),dw=GW[dg];
    allGan.forEach(g=>{if(g)pw.add(GW[g]);});
    allZhi.forEach(z=>{(ZC_W_V5[z]||[]).forEach(([cg])=>pw.add(GW[cg]));});
    let score=0;const found=[],missing=[];
    if(qiList[0]){
      const qw=GW[qiList[0]];
      if(pw.has(qw)&&qw!==dw){score+=15;found.push('一气'+qiList[0]+'✅');}else{score-=8;missing.push('一气'+qiList[0]+'❌');}
    }
    if(qiList[1]){
      const qw=GW[qiList[1]];
      if(pw.has(qw)&&qw!==dw){score+=8;found.push('二气'+qiList[1]+'✅');}else{score-=4;missing.push('二气'+qiList[1]+'❌');}
    }
    const agw=new Set(allGan.filter(Boolean).map(g=>GW[g]));
    if(qiList[0]&&agw.has(GW[qiList[0]])){score+=3;found.push('一气透干+3');}
    if(qiList[1]&&agw.has(GW[qiList[1]])){score+=2;found.push('二气透干+2');}
    return{score:Math.round(score),details:[...found,...missing],summary:found.length>=2?'全备':found.length===1?'有缺':'匮乏'};
  }

  function deJu(dg, zhiList){
    const dw=GW[dg],allZ=zhiList.map(z=>z.z),zc={};
    allZ.forEach(z=>{zc[z]=(zc[z]||0)+1;});
    let score=0;const details=[];
    const sanHe=[{zhi:['申','子','辰'],wx:'水'},{zhi:['亥','卯','未'],wx:'木'},{zhi:['寅','午','戌'],wx:'火'},{zhi:['巳','酉','丑'],wx:'金'}];
    for(const{zhi,wx} of sanHe){
      const p=zhi.filter(z=>zc[z]);
      if(p.length===3){
        if(wx===dw){score+=18;details.push('三合'+wx+'局+18');}
        else if(wx===BEI_SHENG[dw]){score+=14;details.push('三合'+wx+'生扶+14');}
        else if(wx===ZSHENG){score-=6;details.push('三合'+wx+'泄-6');}
      }else if(p.length===2){
        const mids=['子','卯','午','酉'];const hm=p.some(z=>mids.includes(z));
        if(hm){if(wx===dw){score+=10;details.push('半合'+wx+'(中神)+10');}else if(wx===BEI_SHENG[dw]){score+=7;details.push('半合'+wx+'生扶+7');}}
        else{if(wx===dw){score+=5;details.push('半合'+wx+'(缺中)+5');}else if(wx===BEI_SHENG[dw]){score+=3;details.push('半合'+wx+'生扶+3');}}
      }
    }
    const sanHui=[{zhi:['寅','卯','辰'],wx:'木'},{zhi:['巳','午','未'],wx:'火'},{zhi:['申','酉','戌'],wx:'金'},{zhi:['亥','子','丑'],wx:'水'}];
    for(const{zhi,wx} of sanHui){
      const p=zhi.filter(z=>zc[z]);
      if(p.length===3){
        if(wx===dw){score+=22;details.push('三会'+wx+'方+22');}
        else if(wx===BEI_SHENG[dw]){score+=16;details.push('三会'+wx+'生扶+16');}
        else if(wx===ZSHENG){score-=8;details.push('三会'+wx+'泄-8');}
      }else if(p.length===2){if(wx===dw){score+=6;details.push('三会缺一+6');}}
    }
    return{score:Math.round(score),details};
  }

  const ZSHENG = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  const ZKE    = {木:'土',火:'金',土:'水',金:'木',水:'火'};

  function classifyLevel(ns){
    if(ns>=75)return{level:6,label:'极旺',extreme:true};
    if(ns>=45)return{level:5,label:'偏旺',extreme:false};
    if(ns>=15)return{level:4,label:'中和偏旺',extreme:false};
    if(ns>=-15)return{level:3,label:'中和',extreme:false};
    if(ns>=-45)return{level:2,label:'中和偏弱',extreme:false};
    if(ns>=-75)return{level:1,label:'偏弱',extreme:false};
    return{level:0,label:'极弱',extreme:true};
  }

  function compute(b, bd){
    const dg=b.D.g,mz=b.M.z,dw=GW[dg];
    const allGan=[b.Y.g,b.M.g,b.D.g,b.H.g];
    const allZhi=[b.Y.z,b.M.z,b.D.z,b.H.z];
    const ling=deLing(dg,mz,bd||15);
    const zhiList=[{z:b.Y.z,position:0},{z:b.M.z,position:1},{z:b.D.z,position:2},{z:b.H.z,position:3}];
    const di=deDi(dg,zhiList);
    const shi=deShi(dg,b.Y.g,b.M.g,b.H.g);
    const qi=deQi(dg,mz,allGan,allZhi);
    const ju=deJu(dg,zhiList);
    const nl=ling.score*0.55, nd=di.score*0.6, ns=shi.score*0.6, nq=qi.score*0.65, nj=ju.score*0.5;
    const tr=nl*DIMS.deLing+nd*DIMS.deDi+ns*DIMS.deShi+nq*DIMS.deQi+nj*DIMS.deJu;
    const total=Math.round(tr*4.2);
    const level=classifyLevel(total);
    const ec=[Math.abs(nl)>20,Math.abs(nd)>24,Math.abs(ns)>16,Math.abs(nq)>12,Math.abs(nj)>8].filter(Boolean).length;
    return{
      score:total,level:level.level,label:level.label,
      strong:total>=10,extreme:level.extreme||ec>=4,
      dw, dg, mz,
      dimensions:{
        deLing:{score:ling.score,state:ling.state,dutyGan:ling.dutyGan,jinTui:ling.jinTui},
        deDi:{score:di.score},
        deShi:{score:shi.score,chains:shi.chains},
        deQi:{score:qi.score,summary:qi.summary,details:qi.details},
        deJu:{score:ju.score,details:ju.details}
      }
    };
  }

  return{compute};
})();
const TJX = (function(){
  const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};   // 五行相生
  const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};   // 我克
  const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};   // 生我
  const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};   // 克我

  // 地支藏干本气/中气/余气 权重（沈孝瞻法）
  const ZC_W={
    子:[['癸',1.0]],
    丑:[['己',0.6],['癸',0.3],['辛',0.1]],
    寅:[['甲',0.6],['丙',0.3],['戊',0.1]],
    卯:[['乙',1.0]],
    辰:[['戊',0.6],['乙',0.3],['癸',0.1]],
    巳:[['丙',0.6],['庚',0.3],['戊',0.1]],
    午:[['丁',0.7],['己',0.3]],
    未:[['己',0.6],['丁',0.3],['乙',0.1]],
    申:[['庚',0.6],['壬',0.3],['戊',0.1]],
    酉:[['辛',1.0]],
    戌:[['戊',0.6],['辛',0.3],['丁',0.1]],
    亥:[['壬',0.7],['甲',0.3]]
  };

  // 十二长生表（日干在各地支的状态系数：越接近根越大）
  // 顺序：长生·沐浴·冠带·临官·帝旺·衰·病·死·墓·绝·胎·养
  const CS_W=[0.4,0.25,0.5,1.0,1.0,0.4,0.25,0.1,0.3,0.0,0.15,0.3];
  const CS_START={
    甲:11,乙:6,丙:2,丁:9,戊:2,己:9,庚:5,辛:0,壬:8,癸:3
  }; // 日干在哪个地支起"长生"（按 DZ 索引 子=0...亥=11 的"逆向位置"算）
  // 上述表参考子平：阳干顺行、阴干逆行
  const YANG_GAN={甲:1,丙:1,戊:1,庚:1,壬:1,乙:0,丁:0,己:0,辛:0,癸:0};

  function cs(dg,zhi){
    // 日干在某地支的"十二长生"权重
    const dzIdx={子:0,丑:1,寅:2,卯:3,辰:4,巳:5,午:6,未:7,申:8,酉:9,戌:10,亥:11};
    const start=CS_START[dg];
    if(start===undefined)return 0;
    const idx=dzIdx[zhi];
    const step=YANG_GAN[dg]?((idx-start+12)%12):((start-idx+12)%12);
    return CS_W[step]||0;
  }

  // —— 调候用神（穷通宝鉴精简表） ——
  // key: 日干+月令地支 → 主用神, 次用神
  const TIAO_HOU={
    // 甲木
    '甲子':['丁','庚'],'甲丑':['丙','丁'],'甲寅':['丙','癸'],'甲卯':['庚','戊'],
    '甲辰':['庚','戊'],'甲巳':['癸','丁'],'甲午':['癸','丁'],'甲未':['癸','丁'],
    '甲申':['庚','丁'],'甲酉':['庚','丁'],'甲戌':['庚','甲'],'甲亥':['庚','丁'],
    // 乙木
    '乙子':['丙','戊'],'乙丑':['丙','戊'],'乙寅':['丙','癸'],'乙卯':['丙','癸'],
    '乙辰':['癸','丙'],'乙巳':['癸','辛'],'乙午':['癸','丙'],'乙未':['癸','丙'],
    '乙申':['丙','癸'],'乙酉':['丙','癸'],'乙戌':['癸','辛'],'乙亥':['丙','戊'],
    // 丙火
    '丙子':['壬','戊'],'丙丑':['壬','甲'],'丙寅':['壬','庚'],'丙卯':['壬','己'],
    '丙辰':['壬','甲'],'丙巳':['壬','庚'],'丙午':['壬','庚'],'丙未':['壬','庚'],
    '丙申':['壬','戊'],'丙酉':['壬','癸'],'丙戌':['甲','壬'],'丙亥':['甲','戊'],
    // 丁火
    '丁子':['甲','庚'],'丁丑':['甲','庚'],'丁寅':['庚','甲'],'丁卯':['庚','甲'],
    '丁辰':['甲','庚'],'丁巳':['甲','庚'],'丁午':['壬','庚'],'丁未':['甲','壬'],
    '丁申':['甲','庚'],'丁酉':['甲','庚'],'丁戌':['甲','庚'],'丁亥':['甲','庚'],
    // 戊土
    '戊子':['丙','甲'],'戊丑':['丙','甲'],'戊寅':['丙','癸'],'戊卯':['丙','癸'],
    '戊辰':['甲','丙'],'戊巳':['甲','丙'],'戊午':['壬','甲'],'戊未':['癸','丙'],
    '戊申':['丙','癸'],'戊酉':['丙','癸'],'戊戌':['甲','丙'],'戊亥':['甲','丙'],
    // 己土
    '己子':['丙','甲'],'己丑':['丙','甲'],'己寅':['丙','甲'],'己卯':['甲','癸'],
    '己辰':['丙','癸'],'己巳':['癸','丙'],'己午':['癸','丙'],'己未':['癸','丙'],
    '己申':['丙','癸'],'己酉':['丙','癸'],'己戌':['甲','丙'],'己亥':['丙','甲'],
    // 庚金
    '庚子':['丁','甲'],'庚丑':['丙','丁'],'庚寅':['戊','甲'],'庚卯':['丁','甲'],
    '庚辰':['甲','丁'],'庚巳':['壬','戊'],'庚午':['壬','癸'],'庚未':['丁','甲'],
    '庚申':['丁','甲'],'庚酉':['丁','甲'],'庚戌':['甲','壬'],'庚亥':['丁','丙'],
    // 辛金
    '辛子':['丙','戊'],'辛丑':['丙','壬'],'辛寅':['己','壬'],'辛卯':['壬','甲'],
    '辛辰':['壬','甲'],'辛巳':['壬','甲'],'辛午':['壬','己'],'辛未':['壬','庚'],
    '辛申':['壬','戊'],'辛酉':['壬','甲'],'辛戌':['壬','甲'],'辛亥':['壬','丙'],
    // 壬水
    '壬子':['戊','丙'],'壬丑':['丙','丁'],'壬寅':['庚','戊'],'壬卯':['戊','辛'],
    '壬辰':['甲','庚'],'壬巳':['壬','庚'],'壬午':['癸','庚'],'壬未':['辛','甲'],
    '壬申':['戊','丁'],'壬酉':['甲','庚'],'壬戌':['甲','丙'],'壬亥':['戊','丙'],
    // 癸水
    '癸子':['丙','辛'],'癸丑':['丙','丁'],'癸寅':['辛','丙'],'癸卯':['庚','辛'],
    '癸辰':['丙','辛'],'癸巳':['辛','庚'],'癸午':['庚','壬'],'癸未':['庚','辛'],
    '癸申':['丁','甲'],'癸酉':['辛','丙'],'癸戌':['辛','癸'],'癸亥':['庚','辛']
  };

  // 旺相休囚死表（按月令五行对其他五行的状态）
  const W_TABLE={
    木:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
    火:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},
    土:{土:'旺',金:'相',水:'死',木:'囚',火:'休'},
    金:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},
    水:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}
  };

  /* ——— 1. 旺衰精算（三维：得令/得地/得势） ——— */
  /* ——— 1. 旺衰精算（V5 五维引擎：得令/得地/得势/得气/得局） ——— */
  function strength(b){
    var bd = (b._meta && b._meta.bd) ? b._meta.bd : 15;
    var v5r = __TJX_V5.compute(b, bd);
    return {
      dw: v5r.dw,
      monthState: v5r.dimensions.deLing.state,
      deLing: v5r.dimensions.deLing.score,
      deDi: v5r.dimensions.deDi.score,
      deShi: v5r.dimensions.deShi.score,
      score: v5r.score,
      level: v5r.level,
      label: v5r.label,
      strong: v5r.strong,
      extreme: v5r.extreme
    };
  }

  /* ——— 2. 调候用神 ——— */
  function tiaoHou(b){
    const key=b.D.g+b.M.z;
    const r=TIAO_HOU[key];
    if(!r)return null;
    return{primary:r[0], secondary:r[1], key};
  }

  /* ——— 3. 综合用神（扶抑+调候+通关+病药） ——— */
  function yongShen(b, str, th){
    const dw=str.dw;
    const cands={}; // 候选 → 分数
    const add=(wx,v,reason)=>{
      if(!wx)return;
      if(!cands[wx])cands[wx]={score:0,reasons:[]};
      cands[wx].score+=v;
      cands[wx].reasons.push(reason);
    };

    // (a) 扶抑：身旺抑（克泄耗），身弱扶（生比）
    if(str.strong){
      add(KE[dw],30,'扶抑：克身为用');
      add(SH[dw],25,'扶抑：泄秀为用');
      add(BK[dw],20,'扶抑：官杀制身');
    }else{
      add(BS[dw],30,'扶抑：印生身');
      add(dw,25,'扶抑：比劫帮身');
    }

    // (b) 调候：冬寒夏燥需调
    if(th){
      const primaryWx=GW[th.primary];
      const secondaryWx=GW[th.secondary];
      add(primaryWx,25,'调候：'+th.primary+'为主调候');
      add(secondaryWx,12,'调候：'+th.secondary+'为次调候');
    }

    // (c) 病药：找出命局最忌之神，取其克者
    const counts={};
    WX.forEach(w=>counts[w]=0);
    [b.Y.g,b.M.g,b.D.g,b.H.g].forEach(g=>counts[GW[g]]+=1);
    [b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{
      (ZC_W[z]||[]).forEach(([cg,w])=>counts[GW[cg]]+=w);
    });
    let maxW='木',maxV=0;
    WX.forEach(w=>{if(w!==dw&&counts[w]>maxV){maxV=counts[w];maxW=w}});
    if(maxV>=3.5){
      add(KE[maxW],15,'病药：制'+maxW+'之病');
    }

    // (d) 通关：若两强对峙
    WX.forEach(a=>WX.forEach(b2=>{
      if(KE[a]===b2&&counts[a]>=2.5&&counts[b2]>=2.5){
        const tg=SH[a]; // 通关者
        if(tg!==dw||!str.strong){
          add(tg,10,'通关：化'+a+'生'+b2);
        }
      }
    }));

    // 排序取主用神
    const sorted=Object.entries(cands).sort((a,b)=>b[1].score-a[1].score);
    if(!sorted.length)return{primary:SH[dw],secondary:KE[dw],candidates:{},reasons:['默认取食伤']};
    return{
      primary: sorted[0][0],
      secondary: sorted[1]?sorted[1][0]:null,
      candidates: cands,
      reasons: sorted[0][1].reasons
    };
  }

  /* ——— 4. 格局判定（子平真诠） ——— */
  function pattern(b, ss, str){
    const out={main:null, type:'正格', detail:[], grade:'B'};
    const mz=b.M.z, mw=ZW[mz];
    const dg=b.D.g, dw=GW[dg];
    const monthHidden=(ZC_W[mz]||[]).map(x=>x[0]);
    const allG=[b.Y.g,b.M.g,b.H.g];

    // ① 月令本气透干优先
    const benqi=monthHidden[0];
    let lord=null;
    if(benqi && benqi!==dg){
      // 是否透干
      if(allG.includes(benqi)) lord=benqi;
      else if(monthHidden[1] && allG.includes(monthHidden[1])) lord=monthHidden[1];
      else lord=benqi; // 不透取本气
    }

    if(lord){
      const ssName=SS[dg][lord];
      const map={
        '正官':'正官格','七杀':'七杀格','偏官':'七杀格',
        '正财':'正财格','偏财':'偏财格',
        '正印':'正印格','偏印':'偏印格',
        '食神':'食神格','伤官':'伤官格',
        '比肩':'建禄格','劫财':'月刃格'
      };
      out.main=map[ssName]||'杂气格';
      out.detail.push('月令'+mz+'透'+lord+'('+ssName+')');
    }

    // ② 变格判断：极旺/极弱时考虑从格、化气格
    if(str.extreme){
      if(str.score<=-60){
        // 身极弱 → 看是否成从
        const cnt={财:0,官:0,食:0};
        [b.Y.g,b.M.g,b.H.g,b.Y.z,b.M.z,b.D.z,b.H.z].forEach(c=>{
          const w=c.length>1?0:1;
          if(!w&&!ZC_W[c])return;
          const gan=GW[c]?c:null;
          if(gan){
            const w2=GW[gan];
            if(w2===KE[dw])cnt.财++;
            if(w2===BK[dw])cnt.官++;
            if(w2===SH[dw])cnt.食++;
          }
        });
        const max=Math.max(cnt.财,cnt.官,cnt.食);
        if(max>=3){
          out.type='从格';
          out.main=cnt.财===max?'从财格':cnt.官===max?'从官杀格':'从儿格';
          out.grade='A';
          out.detail.push('日主极弱，从'+(cnt.财===max?'财':cnt.官===max?'官杀':'食伤'));
        }
      } else if(str.score>=60){
        // 身极旺 → 专旺格
        out.type='从强格';
        out.main='专旺格('+dw+')';
        out.grade='A';
        out.detail.push('日主极旺，五行专一');
      }
    }

    // ③ 评级：是否破格
    if(out.main && out.type==='正格'){
      // 有相神护卫 → A；有破坏 → C
      out.grade='B';
    }

    return out;
  }

  /* ——— 5. 十神质量评估（有根/透出/被破） ——— */
  function tenGodQuality(b, ss){
    const dg=b.D.g;
    const allG=[b.Y.g,b.M.g,b.H.g];
    const allZ=[b.Y.z,b.M.z,b.D.z,b.H.z];
    const result={};
    const tenGods=['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];

    tenGods.forEach(sg=>{
      let transparent=0, rooted=0, hidden=0;
      // 透干
      allG.forEach(g=>{ if(g && SS[dg][g]===sg) transparent++; });
      // 藏支
      allZ.forEach(z=>{
        (ZC_W[z]||[]).forEach(([cg,w])=>{
          if(SS[dg][cg]===sg) hidden+=w;
        });
      });
      rooted = transparent>0 && hidden>0.5;
      const quality = transparent*2 + hidden*1 + (rooted?1:0);
      result[sg]={transparent, hidden:Math.round(hidden*10)/10, rooted, quality:Math.round(quality*10)/10};
    });
    return result;
  }

  /* ——— 6. 干支互动：合、冲、刑、害、会 ——— */
  function interactions(b){
    const gz=[b.Y,b.M,b.D,b.H];
    const labels=['年','月','日','时'];
    const out={gan_he:[],zhi_he:[],zhi_chong:[],zhi_xing:[],zhi_hai:[],san_he:[],san_hui:[]};

    // 天干五合
    const ganHe={甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      if(ganHe[gz[i].g]===gz[j].g) out.gan_he.push({a:labels[i]+gz[i].g,b:labels[j]+gz[j].g});
    }

    // 地支六合
    const zhiHe={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    // 地支六冲
    const zhiChong={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    // 地支相害
    const zhiHai={子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉'};
    // 地支相刑（不含三刑）
    const zhiXing=[['寅','巳'],['巳','申'],['申','寅'],['丑','戌'],['戌','未'],['未','丑'],['子','卯']];
    const ziXing=['辰','午','酉','亥']; // 自刑

    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const a=gz[i].z, c=gz[j].z;
      if(zhiHe[a]===c) out.zhi_he.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiChong[a]===c) out.zhi_chong.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiHai[a]===c) out.zhi_hai.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiXing.some(p=>(p[0]===a&&p[1]===c)||(p[0]===c&&p[1]===a))) out.zhi_xing.push({a:labels[i]+a,b:labels[j]+c});
    }
    // 自刑
    const zhCount={};
    [b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{zhCount[z]=(zhCount[z]||0)+1});
    ziXing.forEach(z=>{ if(zhCount[z]>=2) out.zhi_xing.push({a:z,b:z,self:1}); });

    // 三合
    const sanHe=[['申','子','辰','水'],['亥','卯','未','木'],['寅','午','戌','火'],['巳','酉','丑','金']];
    sanHe.forEach(([a,b1,c,wx])=>{
      const has=[a,b1,c].filter(x=>zhCount[x]);
      if(has.length===3) out.san_he.push({zhi:a+b1+c,wx,full:1});
      else if(has.length===2) out.san_he.push({zhi:has.join(''),wx,full:0,half:1});
    });
    // 三会
    const sanHui=[['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];
    sanHui.forEach(([a,b1,c,wx])=>{
      const has=[a,b1,c].filter(x=>zhCount[x]);
      if(has.length===3) out.san_hui.push({zhi:a+b1+c,wx});
    });

    return out;
  }

  /* ——— 7. 大运/流年高级评分（-100~100） ——— */
  function pillarScore(b, str, ys, gz){
    // gz: {g,z}
    if(!gz||!gz.g||!gz.z)return{score:0,reasons:[]};
    const dg=b.D.g, dw=str.dw;
    const ganWx=GW[gz.g], zhiWx=ZW[gz.z];
    let score=0;
    const reasons=[];

    // 天干层面
    if(ganWx===ys.primary){score+=30;reasons.push('天干为主用神'+ys.primary);}
    else if(ys.secondary&&ganWx===ys.secondary){score+=18;reasons.push('天干为次用神');}
    else if(str.strong){
      if(ganWx===KE[dw]){score+=15;reasons.push('财耗身（身旺喜财）');}
      else if(ganWx===SH[dw]){score+=12;reasons.push('食伤泄秀');}
      else if(ganWx===BK[dw]){score+=10;reasons.push('官杀制身');}
      else if(ganWx===BS[dw]){score-=15;reasons.push('印生身（身旺忌印）');}
      else if(ganWx===dw){score-=18;reasons.push('比劫帮身（身旺忌比劫）');}
    }else{
      if(ganWx===BS[dw]){score+=18;reasons.push('印星生身');}
      else if(ganWx===dw){score+=12;reasons.push('比劫帮身');}
      else if(ganWx===BK[dw]){score-=22;reasons.push('官杀克身（身弱大忌）');}
      else if(ganWx===KE[dw]){score-=12;reasons.push('财耗身（身弱难担）');}
      else if(ganWx===SH[dw]){score-=10;reasons.push('食伤泄气');}
    }

    // 地支层面（藏干加权）
    (ZC_W[gz.z]||[]).forEach(([cg,w])=>{
      const cw=GW[cg];
      if(cw===ys.primary)score+=15*w;
      else if(ys.secondary&&cw===ys.secondary)score+=8*w;
      else if(str.strong){
        if(cw===KE[dw])score+=8*w;
        else if(cw===dw)score-=10*w;
      }else{
        if(cw===BS[dw])score+=10*w;
        else if(cw===BK[dw])score-=12*w;
      }
    });

    // 刑冲（与日支、月支）
    const chongMap={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    if(chongMap[gz.z]===b.D.z){score-=15;reasons.push('冲日支（变动·健康注意）');}
    if(chongMap[gz.z]===b.M.z){score-=10;reasons.push('冲月支（事业·家庭变化）');}
    if(gz.z===b.Y.z){score-=5;reasons.push('伏吟年支（本命之年）');}

    // 天克地冲（大忌）
    const ganChong={甲:'庚',乙:'辛',丙:'壬',丁:'癸',戊:'甲',己:'乙',庚:'丙',辛:'丁',壬:'戊',癸:'己'};
    if(ganChong[gz.g]===b.D.g && chongMap[gz.z]===b.D.z){
      score-=25;reasons.push('天克地冲日柱（重大变动）');
    }

    score=Math.max(-100,Math.min(100,Math.round(score)));
    return{score,reasons,label: score>=60?'大吉':score>=30?'吉':score>=10?'平稳偏吉':score>=-10?'平':score>=-30?'平稳偏凶':score>=-60?'凶':'大凶'};
  }

  /* ——— 8. 流年事件类型预测 ——— */
  function yearEvents(b, dg, str, gz, dyGz){
    if(!gz)return[];
    const events=[];
    const lnSS=SS[dg][gz.g]||'';
    const dySS=dyGz?(SS[dg][dyGz.g]||''):'';
    const chongMap={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    const heMap={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};

    // 十神事件
    if(lnSS==='正官'||lnSS==='七杀'){
      events.push({type:'事业',tag:str.strong?'升职/承担':'压力/受挫',weight:8});
    }
    if(lnSS==='正财'||lnSS==='偏财'){
      events.push({type:'财富',tag:str.strong?'进财机会':'破财/操劳',weight:8});
    }
    if(lnSS==='食神'||lnSS==='伤官'){
      events.push({type:'表达',tag:'创作/才华显露/子女',weight:6});
    }
    if(lnSS==='正印'||lnSS==='偏印'){
      events.push({type:'学习',tag:'进修/贵人/文书',weight:6});
    }
    if(lnSS==='比肩'||lnSS==='劫财'){
      events.push({type:'人际',tag:'合作/竞争/争财',weight:5});
    }

    // 配偶星动 → 感情事件
    const spouseStar = (b.D.gi%2===0)?'正财':'正官'; // 阳干以正财为妻，阴干以正官为夫
    if(lnSS===spouseStar || lnSS===(b.D.gi%2===0?'偏财':'七杀')){
      events.push({type:'感情',tag:'配偶星到位（婚恋机遇）',weight:9});
    }
    // 配偶宫(日支)被冲合
    if(chongMap[gz.z]===b.D.z) events.push({type:'感情',tag:'配偶宫被冲（关系动荡）',weight:7});
    if(heMap[gz.z]===b.D.z) events.push({type:'感情',tag:'配偶宫逢合（关系升温）',weight:7});

    // 岁运并临
    if(dyGz&&dyGz.g===gz.g&&dyGz.z===gz.z){
      events.push({type:'变动',tag:'岁运并临（人生关键节点·吉凶皆烈）',weight:10});
    }

    return events.sort((a,b)=>b.weight-a.weight);
  }

  /* ——— 9. 综合命局质量评级 ——— */
  function lifeGrade(str, yong, pat, ints){
    let g=60;
    // 中和最佳
    if(str.label==='中和'||str.label==='中和偏旺')g+=8;
    else if(str.extreme) g+= pat.type!=='正格' ? 12 : -8; // 成从/专旺则吉，半生不熟则凶
    // 用神有力
    if(yong.candidates[yong.primary]&&yong.candidates[yong.primary].score>=40)g+=8;
    // 格局成立
    if(pat.grade==='A')g+=12;
    else if(pat.grade==='B')g+=4;
    // 互动：合多吉，冲刑多凶（适度反而灵动）
    g += Math.min(ints.zhi_he.length*3,9);
    g += ints.san_he.filter(x=>x.full).length*5;
    g -= Math.min(ints.zhi_chong.length*4,12);
    g -= Math.min(ints.zhi_xing.length*3,9);

    g=Math.max(20,Math.min(95,Math.round(g)));
    const tier= g>=85?'上上':g>=75?'上中':g>=65?'中上':g>=55?'中中':g>=45?'中下':'下中';
    return{score:g, tier};
  }

  /* ——— 主入口：一次计算所有派生量 ——— */
  function compute(b, ss){
    const str = strength(b);
    const th  = tiaoHou(b);
    const yong= yongShen(b, str, th);
    const pat = pattern(b, ss, str);
    const tgq = tenGodQuality(b, ss);
    const ints= interactions(b);
    const life= lifeGrade(str, yong, pat, ints);
    return{
      strength:str,
      tiaoHou:th,
      yongShen:yong,
      pattern:pat,
      tenGodQuality:tgq,
      interactions:ints,
      lifeGrade:life,
      // 暴露评分函数供大运/流年调用
      pillarScore:(gz)=>pillarScore(b,str,yong,gz),
      yearEvents:(gz,dyGz)=>yearEvents(b,b.D.g,str,gz,dyGz)
    };
  }

  return{ compute, pillarScore, yearEvents, _const:{ZC_W,CS_W,TIAO_HOU,W_TABLE} };
})();

function calcYearScores(b,wx,ss,dySS,lnSS,tjx,cDy,cLn){
  const dg=b.D.g,dw=GW[dg];
  const lnBonus=lnSS.includes('官')?12:lnSS.includes('印')?10:lnSS.includes('财')?8:lnSS.includes('食')?6:lnSS.includes('比')?3:0;
  const dyBonus=dySS.includes('官')?8:dySS.includes('印')?7:dySS.includes('财')?6:dySS.includes('食')?5:0;
  const ysRatio=wx.c[wx.ys]/wx.t;
  const monthHelp=(ZW[b.M.z]===wx.ys||ZW[b.M.z]===wx.xs)?8:0;
  let career=52+ysRatio*35+lnBonus+dyBonus*0.5+monthHelp*0.3+(wx.st?3:0);
  let wealth=48+(wx.c[wx.KE[dw]]/wx.t)*30+(lnSS.includes('财')?15:0)+(dySS.includes('财')?8:0)+ysRatio*15+monthHelp*0.3;
  let love=50+(wx.c['火']+wx.c['水'])/wx.t*20+(lnSS.includes('财')||lnSS.includes('官')?10:0)+(ss.dzc.some(c=>c.s.includes('财')||c.s.includes('官'))?8:0)+ysRatio*12;
  let health=55+((wx.t-Math.abs(wx.c[wx.s]-wx.c[wx.w]))/wx.t)*25+(wx.c[wx.w]>1?8:0)+ysRatio*10+monthHelp*0.2;

  // —— TJX 高级修正：把大运/流年的精算评分按权重融合 ——
  if(tjx){
    // 命局基础品质（成格/中和/用神有力）修正所有维度的"天花板"
    const baseFix=(tjx.lifeGrade.score-60)*0.15;
    career+=baseFix; wealth+=baseFix; love+=baseFix*0.6; health+=baseFix*0.4;

    // 用流年精算分（-100~100）按 0.25 权重修正
    if(tjx.lnScore){
      const lf=tjx.lnScore.score*0.18;
      career+=lf; wealth+=lf*0.9; love+=lf*0.5; health+=lf*0.4;
    }
    // 大运精算分按 0.12 权重
    if(tjx.dyScore){
      const df=tjx.dyScore.score*0.10;
      career+=df; wealth+=df; love+=df*0.4; health+=df*0.5;
    }
    // 刑冲扣健康/感情分
    const ints=tjx.interactions;
    health-=Math.min(ints.zhi_chong.length*2.5,8);
    health-=Math.min(ints.zhi_xing.length*2,6);
    love-=Math.min(ints.zhi_chong.length*2,7);
    // 三合/三会加事业财富
    const triFull=ints.san_he.filter(x=>x.full).length+ints.san_hui.length;
    career+=triFull*3; wealth+=triFull*3;
  }

  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(v)));
  return{
    career:clamp(career,18,98),
    wealth:clamp(wealth,18,97),
    love:clamp(love,20,96),
    health:clamp(health,25,96)
  };
}

function calcPattern(ss){
  const pa=[],ash=[ss.yg,ss.mg,ss.hg];
  if(ash.includes('正官'))pa.push('正官格');
  if(ash.includes('七杀'))pa.push('七杀格');
  if(ash.includes('正财')||ash.includes('偏财'))pa.push('财星格');
  if(ash.includes('食神'))pa.push('食神格');
  if(ash.includes('伤官'))pa.push('伤官格');
  if(ash.includes('正印')||ash.includes('偏印'))pa.push('印绶格');
  if(!pa.length)pa.push('杂气格');
  return pa;
}

function buildContext(args){
  const{b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P,gen,q,city,input}=args;
  const dg=b.D.g,dw=GW[dg];
  const by=input.by,bm=input.bm,bd=input.bd;
  const age=TJ.calcAge(by,bm,bd);
  const cDy=TJ.findDaYun(dy,age);
  const cLn=TJ.findLiuNian(ln,CURR_YEAR);
  const cLm=TJ.findLiuYue(liuyue);
  const dySS=cDy?TJ.ssOf(dg,cDy.g):'';
  const lnSS=cLn?TJ.ssOf(dg,cLn.g):'';
  const lmSS=cLm?TJ.ssOf(dg,cLm.gz.charAt(0)):'';
  const gl=gen==='male'?'乾造':'坤造';
  const pa=calcPattern(ss);
  // 预先算一次 TJX 用于评分修正（compute 内成本可接受，可缓存）
  let _tjxPre=null;
  try{_tjxPre=TJX.compute(b,ss);
      if(cDy)_tjxPre.dyScore=_tjxPre.pillarScore({g:cDy.g,z:cDy.z});
      if(cLn)_tjxPre.lnScore=_tjxPre.pillarScore({g:cLn.g,z:cLn.z});
  }catch(e){}
  const sc=calcYearScores(b,wx,ss,dySS,lnSS,_tjxPre,cDy,cLn);
  const shun=TJ.isShunDaYun(b,gen);
  return{
    input,
    b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,pa,P,
    gen,q,city,gl,
    by,bm,bd,age,
    dg,dz:b.D.z,dw,
    cDy,cDyIdx:cDy?cDy._idx:0,cDySS:dySS,
    cLn,cLnSS:lnSS,
    cLm,cLmSS:lmSS,
    dyShun:shun,
    dySS,lnSS,lmSS,
    scores:sc,
    cs:sc.career,ws:sc.wealth,ls:sc.love,hs:sc.health,
    ssOf:g=>TJ.ssOf(dg,g),
    /* —— TJX 精算内核派生量（复用 _tjxPre 避免重算）—— */
    tjx: (function(){
      try{
        const k=_tjxPre||TJX.compute(b,ss);
        if(cDy&&!k.dyScore)k.dyScore=k.pillarScore({g:cDy.g,z:cDy.z});
        if(cLn&&!k.lnScore)k.lnScore=k.pillarScore({g:cLn.g,z:cLn.z});
        k.lnEvents = cLn?k.yearEvents({g:cLn.g,z:cLn.z},cDy?{g:cDy.g,z:cDy.z}:null):[];
        return k;
      }catch(e){console.warn('TJX compute failed',e);return null;}
    })()
  };
}

function getCtx(){return window._ctx||null;}

/* ============================================================
   AI 人生顾问 · 信息库 KB（结构化知识，便于检索+跳转）
   ----
   FAQ 字段：
     id      唯一编号
     q       标准问题
     kw      关键词（用于模糊命中）
     intent  意图分类（事业/财富/感情/健康/学业/居住/玄学/综合）
     anchor  命中后跳转锚点 {sec, card}  sec ∈ {s-ming,s-yun,s-rel,s-adv}
     answer  动态答案函数(ctx) → 四段式字符串
     related 相关 FAQ id 列表
   ============================================================ */
const KB={
  routes:{
    bazi:        {sec:'s-ming',card:'bazi',     name:'四柱八字'},
    wuxing:      {sec:'s-ming',card:'wuxing',   name:'五行能量'},
    persona:     {sec:'s-ming',card:'persona',  name:'人格画像'},
    timeline:    {sec:'s-ming',card:'timeline', name:'人生时间线'},
    trend:       {sec:'s-yun', card:'trend',    name:'年度核心趋势'},
    focus:       {sec:'s-yun', card:'focus',    name:'当下关注'},
    monthly:     {sec:'s-yun', card:'focus',    name:'本月提醒',  sub:'monthly'},
    risk:        {sec:'s-yun', card:'focus',    name:'风险预警',  sub:'risk'},
    health:      {sec:'s-yun', card:'focus',    name:'健康调养',  sub:'health'},
    dayun:       {sec:'s-yun', card:'dayun',    name:'大运时间轴'},
    liuyue:      {sec:'s-yun', card:'liuyue',   name:'流月详解'},
    loveMode:    {sec:'s-rel', card:'loveMode', name:'感情模式'},
    loveMatch:   {sec:'s-rel', card:'loveMatch',name:'适合对象'},
    loveRisk:    {sec:'s-rel', card:'loveRisk', name:'关系风险'},
    relAi:       {sec:'s-rel', card:'relAi',    name:'AI 关系分析'},
    layoff:     {sec:'s-rel', card:'layoffRisk',name:'裁员风险检测'},
    todayAdv:    {sec:'s-adv', card:'todayAdv', name:'今日建议'},
    daySign:     {sec:'s-adv', card:'daySign',  name:'今日日签'}
  },
  // 术语词典（点击解释，可直接出条目）
  terms:[
    {t:'用神',  d:'命局中最能平衡日主、补救失衡的五行。用神入运则顺。',  see:['wuxing','timeline']},
    {t:'喜神',  d:'辅助用神、对命主有利的五行，仅次于用神。',           see:['wuxing']},
    {t:'忌神',  d:'与用神相克、削弱命主的五行，运行此五行宜守不宜攻。',  see:['wuxing','risk']},
    {t:'日主',  d:'出生日的天干，代表命主本人的本质属性。',             see:['bazi','persona']},
    {t:'十神',  d:'其他天干与日主的生克关系，分比劫/食伤/财官/印枭。',  see:['bazi','dayun']},
    {t:'大运',  d:'每十年一变的运程，由月柱推演，影响人生中长期走势。', see:['dayun','timeline']},
    {t:'流年',  d:'每年的天干地支组合，是当年运势的"短期主因"。',       see:['trend','liuyue']},
    {t:'流月',  d:'每月的干支，决定该月主要顺逆与节气节点。',           see:['liuyue','monthly']},
    {t:'纳音',  d:'年柱六十甲子对应的五行别名，主大方向气质。',         see:['bazi']},
    {t:'神煞',  d:'桃花/驿马/天乙/华盖/魁罡等吉凶星，标注命局特征。',  see:['bazi']},
    {t:'桃花',  d:'人缘与异性缘之星，旺则魅力强，须警惕烂桃花。',       see:['loveMode','loveMatch']},
    {t:'驿马',  d:'变动、远行、奔波之星，逢之多有迁移机会。',           see:['risk']},
    {t:'华盖',  d:'孤独、艺术、玄学之星，思考者气质。',                 see:['persona']},
    {t:'魁罡',  d:'庚辰/庚戌/壬辰/戊戌四日，主刚烈聪明。',              see:['persona']},
    {t:'真太阳时',d:'按出生地经度精算的太阳时，比北京时间更准。',       see:['bazi']},
    {t:'身旺',  d:'日主得令、得地、得势，能担财官，宜主动出击。',        see:['persona','trend']},
    {t:'身弱',  d:'日主无力，宜印比扶身，财官为忌时不可贪。',           see:['persona','trend']},
    {t:'本命年',d:'流年地支与年柱地支相同的年份，宜守不宜攻。',         see:['timeline']},
    {t:'冲太岁',d:'流年地支冲本命年支，主变动、动荡。',                 see:['risk']},
    {t:'空亡',  d:'日柱旬中所缺的两个地支，主漂泊、精神空虚。',         see:['bazi']}
  ],
  // FAQ 库
  faqs:[
    // —— 事业 ——
    {id:'c1', q:'我适合什么行业？', kw:['行业','职业','工作','干什么','适合什么'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const wx=d.wx.dw, ys=d.wx.ys;
        const mp={木:'教育/文创/园林/设计/木材/出版',火:'传媒/演艺/餐饮/能源/广告/电子',土:'地产/建材/农业/物流/陶艺/医疗',金:'金融/法律/机械/IT/珠宝/汽车',水:'贸易/物流/旅游/海运/咨询/科研'};
        return [
          `日主属${wx}，先天气场偏向${mp[wx].split('/').slice(0,2).join('与')}类行业。`,
          `用神为${ys}，所以${mp[ys]}类工作能助你顺势上升。`,
          `避开过于${d.wx.KE[wx]}属性的领域（容易耗损精神）。`,
          `结合当前大运${d.cDy.g}${d.cDy.z}（十神${d.cDySS}），${d.cDySS.includes('官')?'宜在大组织内争取上升':d.cDySS.includes('财')?'适合做销售/客户/项目':d.cDySS.includes('印')?'适合做研究/教育/顾问':'适合做内容/创意/自由职业'}。`
        ];
      }, related:['c2','c3','t1']},
    {id:'c2', q:'我适合创业吗？', kw:['创业','开公司','单干','自己干'], intent:'事业', anchor:'trend',
      answer:(d)=>{
        const ok=d.wx.st&&(d.cDySS.includes('财')||d.cDySS.includes('食')||d.cDySS.includes('伤'));
        return [
          ok?'命局支持创业，但要选对时机和合伙人。':'更适合先在大公司练内功，或采用副业验证模式。',
          `身${d.wx.st?'旺':'弱'}+大运十神${d.cDySS}：${ok?'能担风险，主动出击有回报':'当前抗风险能力不足，盲目all-in易折损'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁这步大运（${d.cDy.g}${d.cDy.z}）${ok?'是个不错的窗口':'更适合积累资源'}；${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}（${d.cLnSS}）${d.cLnSS.includes('财')?'有偏财机会':'宜稳不宜攻'}。`,
          ok?'1) 现金流>梦想，先确保6个月生活费\n2) 找土/金属性的合伙人补己之短\n3) 秋季启动最佳':'1) 先用副业跑通商业模型\n2) 一年内别裸辞\n3) 加强用神'+d.wx.ys+'方位的人脉'
        ];
      }, related:['c1','f1','c5']},
    {id:'c3', q:'我适合升职还是跳槽？', kw:['升职','跳槽','换工作','跳','离职'], intent:'事业', anchor:'trend',
      answer:(d)=>{
        const go=d.lnSS.includes('官')||d.lnSS.includes('财')||d.cDySS.includes('官');
        return [
          go?'今年支持职位变动，建议主动出击。':'今年宜稳守，把当前位置做扎实。',
          `流年十神${d.lnSS}+大运十神${d.cDySS}：${go?'官财之气助力，外部贵人多':'气场偏内向，外动易受挫'}。`,
          `${CURR_YEAR}${go?'未来 3-5 个月是窗口，秋季尤佳':'建议等到明年春季再做大决策'}。`,
          go?'1) 先拿 Offer 再离职，杜绝裸辞\n2) 谈薪资时要硬，今年值\n3) 多见行业前辈':'1) 把手上项目做出代表作\n2) 多向直属上级表态\n3) 副业积累备用方向'
        ];
      }, related:['c2','c4']},
    {id:'c4', q:'我和领导关系怎样？', kw:['领导','上司','老板','上级','上面'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const has=d.ss.yg.includes('官')||d.ss.mg.includes('官');
        return [
          has?'命中带官星，与上级缘分较深，但需注意尊卑。':'命中官星不显，靠业绩与人品赢得上级认可更稳。',
          `日主${d.dg}（${d.wx.dw}），${d.wx.st?'身旺需收敛锋芒':'身弱宜借力上位'}。`,
          `当前流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）${d.lnSS.includes('官')?'与上级互动密集':'更适合做事而非做关系'}。`,
          '1) 每周主动汇报进度\n2) 别在上级面前说同事坏话\n3) 重要决策前征询意见'
        ];
      }, related:['c3','c1']},
    {id:'c5', q:'我适合做管理还是技术？', kw:['管理','技术','带团队','一线','专业'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const mg=(d.ss.yg+d.ss.mg+d.ss.hg).includes('官')||d.wx.st;
        return [
          mg?'更适合带团队/做管理。':'更适合钻研专业/做技术高手。',
          `${d.wx.st?'身旺有担当':'身弱重精专'}，加上${d.ss.yg+'/'+d.ss.mg}的十神组合：${mg?'指挥力强':'内功深'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁大运${d.cDy.g}${d.cDy.z}：${d.cDySS.includes('官')?'是带团队的好阶段':'是专业突破期'}。`,
          mg?'1) 学一门项目管理方法论\n2) 多复盘人事冲突案例\n3) 关注下属成长':'1) 每月输出 1 篇深度文章\n2) 考行业顶级证书\n3) 在专业社群建立影响力'
        ];
      }, related:['c1','c3']},
    {id:'c6', q:'我会不会被裁员？', kw:['裁员','被裁','优化','失业','岗位取消','裁撤','PIP'], intent:'事业', anchor:'layoff',
      answer:(d)=>{
        const r=getLayoffAstroRisk(d);
        return [
          `命理职场趋势为「${r.label}」（${r.score}/100），但是否被裁更取决于公司的经营、部门与绩效信号。`,
          r.reasons.length?`趋势触发点：${r.reasons.slice(0,3).join('；')}。`:'当前大运流年未见明显职场冲击信号。',
          `重点观察期：${r.window}。请到「关系 → 裁员风险检测」补充现实信息，生成综合结果。`,
          '1) 不要仅凭命理辞职；2) 留存绩效与劳动合同资料；3) 提前更新简历并准备3—6个月应急金。'
        ];
      }, related:['c3','c4']},
    // —— 财富 ——
    {id:'f1', q:'我什么时候财运最好？', kw:['财运','发财','偏财','正财','钱','赚钱'], intent:'财富', anchor:'timeline',
      answer:(d)=>{
        const peaks=d.dy.ds.map(x=>({gz:x.g+x.z,as:x.as,ae:x.ae,ss:TJ.ssOf(d.dg,x.g)})).filter(x=>x.ss.includes('财'));
        const txt=peaks.length?peaks.map(p=>`${p.as}-${p.ae}岁（${p.gz}·${p.ss}）`).join('、'):'无明显财运大运，需靠正业积累';
        return [
          peaks.length?`你的"财运大运"集中在：${txt}。`:'命中财星不旺，宜走"稳健聚财"路线。',
          `日主${d.dg}（${d.wx.dw}），财星为${d.wx.KE[d.wx.dw]}。${d.wx.st?'身旺能担财':'身弱财为忌'}。`,
          `当前大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）：${d.cDySS.includes('财')?'十年财路较活':'十年以专业积累为主'}。${CURR_YEAR}流年${d.lnSS.includes('财')?'是个不错的来财窗口':'以正财稳收为主'}。`,
          d.wx.st?'1) 用神'+d.wx.ys+'方位适合做投资\n2) 远离朋友借贷\n3) 适度配置股权/不动产':'1) 先把储蓄做厚\n2) 远离杠杆和高风险投机\n3) 副业 < 主业 1/3'
        ];
      }, related:['f2','f3','c2']},
    {id:'f2', q:'我适合投资吗？', kw:['投资','理财','基金','股票','炒股','买房','买股票'], intent:'财富', anchor:'trend',
      answer:(d)=>{
        const ok=d.lnSS.includes('财')&&d.wx.st;
        return [
          ok?'今年存在偏财机会，但忌贪心。':'今年以稳健储蓄/固收为主，远离高风险。',
          `身${d.wx.st?'旺':'弱'}+流年十神${d.lnSS}：${ok?'命局能担起波动':'抗回撤能力不足'}。`,
          `${CURR_YEAR}${ok?'农历七月前后是窗口':'全年保持现金为王'}。`,
          ok?'1) 小仓位试水，见好就收\n2) 别加杠杆\n3) 收益>30% 就分批止盈':'1) 远离加密货币、期权\n2) 把钱放货币基金或定存\n3) 不懂的不碰'
        ];
      }, related:['f1','c2']},
    {id:'f3', q:'我会不会破财？', kw:['破财','亏钱','损失','倒霉','坑','骗'], intent:'财富', anchor:'risk',
      answer:(d)=>{
        const risk=d.cDySS==='劫财'||d.lnSS==='劫财'||(d.wx.c[d.wx.KE[d.wx.dw]]/d.wx.t>0.4&&!d.wx.st);
        return [
          risk?'近期有破财信号，重点防范朋友借贷与冲动消费。':'整体财气平和，无显著破财风险。',
          `当前大运十神${d.cDySS}、流年十神${d.lnSS}：${risk?'比劫争财之象明显':'未见明显劫破信号'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁这步运${risk?'要特别注意担保、合伙、追高':'适合稳健配置'}。`,
          '1) 借钱必签纸面协议\n2) 不投自己不懂的项目\n3) 远离"稳赚"和"内部消息"'
        ];
      }, related:['f2','f1']},
    // —— 感情 ——
    {id:'l1', q:'我的正缘什么时候出现？', kw:['正缘','结婚','姻缘','另一半','对象','找对象','正桃花'], intent:'感情', anchor:'loveMode',
      answer:(d)=>{
        const star=d.gen==='male'?'财':'官';
        const peaks=d.dy.ds.map(x=>({gz:x.g+x.z,as:x.as,ae:x.ae,ss:TJ.ssOf(d.dg,x.g)})).filter(x=>x.ss.includes(star));
        return [
          peaks.length?`你的姻缘大运在：${peaks.map(p=>`${p.as}-${p.ae}岁（${p.gz}·${p.ss}）`).join('、')}。`:'命中配偶星不显，更可能在熟人引荐中遇到。',
          `${d.gen==='male'?'男命以财星为妻':'女命以官星为夫'}，五行属${d.wx.KE[d.wx.dw]}。`,
          `${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）：${d.lnSS.includes(star)?'配偶星到位，未婚利结合':'感情节奏偏稳，宜深度经营'}。`,
          '1) 多去用神方位（'+d.wx.ys+'对应：'+({木:'东',火:'南',土:'中',金:'西',水:'北'})[d.wx.ys]+'）的活动\n2) 别在冲太岁月份做决定\n3) 朋友介绍优于陌生人社交'
        ];
      }, related:['l2','l3']},
    {id:'l2', q:'我感情的问题在哪？', kw:['感情问题','矛盾','吵架','分手','冷战','沟通'], intent:'感情', anchor:'loveRisk',
      answer:(d)=>{
        const issues=[];
        if(d.wx.st)issues.push('过于强势，容易忽略对方感受');
        if(!d.wx.st)issues.push('过度迁就，边界感弱导致委屈');
        if((d.ss.dzc||[]).some(c=>c.s.includes('伤官')))issues.push('言语锋利，沟通方式容易伤人');
        if(d.wx.c['火']>3)issues.push('情绪上头时不计后果');
        if(d.wx.c['水']>2.8)issues.push('思虑过多，容易猜疑');
        return [
          issues.length?'核心问题：'+issues[0]+'。':'命局感情场偏平和，无显著结构性问题。',
          `日主${d.dg}（${d.wx.dw}），${d.wx.st?'身旺':'身弱'}：${issues.join('、')||'相处节奏平稳'}。`,
          d.shensha&&d.shensha.some(s=>s.n==='桃花')?'命带桃花，异性缘强但需筛选。':'桃花不显，缘分多来自熟人。',
          '1) 每周固定一次"深度对话时间"\n2) 吵架不过夜，72 小时内必须复盘\n3) 给对方留独处空间'
        ];
      }, related:['l1','l3']},
    {id:'l3', q:'什么样的人适合我？', kw:['什么人适合','找什么样','理想型','配偶','另一半性格','相配'], intent:'感情', anchor:'loveMatch',
      answer:(d)=>{
        const mp={木:'稳重务实、土金属性强的人',火:'包容耐心、能给空间的人',土:'有上进心、能带来新意的人',金:'温柔细腻、善于沟通的人',水:'逻辑清晰、有安全感的人'};
        return [
          `适合${mp[d.wx.dw]}。`,
          `你日主属${d.wx.dw}，需要"${d.wx.KE[d.wx.dw]}/${d.wx.ys}"属性的人来平衡。`,
          `避开同样${d.wx.dw}属性、且性格强势的人（容易竞争）。`,
          '1) 看对方的"稳定输出能力"而非短期热情\n2) 注意对方原生家庭的财务习惯\n3) 三观大方向 > 兴趣爱好细节'
        ];
      }, related:['l1','l2']},
    {id:'l4', q:'今年桃花运怎样？', kw:['桃花','异性缘','艳遇','缘分','烂桃花'], intent:'感情', anchor:'loveMode',
      answer:(d)=>{
        const has=d.shensha&&d.shensha.some(s=>s.n==='桃花'||s.n==='红艳');
        const hot=d.lnSS.includes('财')||d.lnSS.includes('官');
        return [
          hot?'今年桃花气场旺，质量需筛选。':has?'命局桃花潜在，但需主动激发。':'桃花平淡，重在深耕已有关系。',
          `命中${has?'带桃花/红艳':'无显桃花'}+流年十神${d.lnSS}：${hot?'外缘多，但易遇虚情':'缘分浅，更利稳定关系'}。`,
          hot?'警惕已婚/异地等不稳定关系，烂桃花成本极高。':'平稳期适合修炼自身吸引力。',
          '1) 多参加 3 人以上小型聚会\n2) 别在喝酒后做承诺\n3) 已有伴侣者主动避嫌'
        ];
      }, related:['l1','l2']},
    // —— 健康 ——
    {id:'h1', q:'我身体哪里要注意？', kw:['健康','身体','病','哪里弱','器官','养生'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const HM={木:'肝胆/眼睛',火:'心脏/血液',土:'脾胃/消化',金:'肺部/皮肤',水:'肾脏/泌尿'};
        return [
          `重点关注：${HM[d.wx.w]}（你最弱的五行）。`,
          `最旺五行为${d.wx.s}，对应${HM[d.wx.s]}也易过亢；最弱为${d.wx.w}，对应器官较脆弱。`,
          d.shensha&&d.shensha.some(s=>s.n==='天医')?'命带天医，对医疗/养生本能强，恢复力佳。':'无显著健康神煞，整体平衡。',
          '1) 每年做一次相关器官专项体检\n2) 饮食上多补'+d.wx.w+'属性食物\n3) 23 点前必须入睡'
        ];
      }, related:['h2','h3']},
    {id:'h2', q:'我容易失眠/焦虑吗？', kw:['失眠','焦虑','睡眠','压力','精神','烦躁','抑郁'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const fy=d.wx.c['火']>2.5&&d.wx.dw!=='火';
        const sy=d.wx.c['水']>2.5&&d.wx.dw!=='水';
        return [
          (fy||sy)?'命局水火失衡，确实容易失眠/思虑过度。':'命局气场平和，睡眠问题主要来自外因。',
          fy?'火气过旺，心神难定，易半夜醒。':sy?'水气过重，思绪太多，难入睡。':'整体平衡，无显著结构性问题。',
          `${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}：${d.lnSS.includes('官')?'压力指数较高，注意减压':'气场较稳'}。`,
          '1) 22 点后不刷手机\n2) 每天 30 分钟正念/冥想\n3) 卧室避免红色与电子产品'
        ];
      }, related:['h1']},
    {id:'h3', q:'我需要做什么养生？', kw:['养生','调养','保健','补','怎么调'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const adv={木:'清淡饮食，少酒；多绿叶菜；舒展型运动如瑜伽',火:'清心降火，少辛辣；多苦味/红色食物；慢跑/游泳',土:'规律三餐，少甜腻；多黄色食物；散步/太极',金:'润肺，远烟尘；多白色食物（梨/百合）；呼吸训练',水:'温补，护肾；多黑色食物（黑豆/芝麻）；早睡为王'};
        return [
          `针对你日主${d.wx.dw}：${adv[d.wx.dw]}。`,
          `最弱${d.wx.w}对应${({木:'肝',火:'心',土:'脾',金:'肺',水:'肾'})[d.wx.w]}：${adv[d.wx.w]}。`,
          `用神${d.wx.ys}方位有助：${({木:'东方公园',火:'南方海岛',土:'家中静修',金:'西方山林',水:'北方湿地'})[d.wx.ys]}。`,
          '1) 节气日（立春/立夏等）调整饮食\n2) 每年体检报告横向对比\n3) 中医调理优于西药压制'
        ];
      }, related:['h1','h2']},
    // —— 学业 ——
    {id:'s1', q:'我适合继续读书/考研吗？', kw:['考研','学业','读书','考试','留学','深造','进修'], intent:'学业', anchor:'persona',
      answer:(d)=>{
        const ok=(d.ss.yg+d.ss.mg+d.ss.hg).includes('印')||d.shensha&&d.shensha.some(s=>s.n==='文昌');
        return [
          ok?'命局支持继续深造，学历能助力。':'比起学历，"实战经验+证书"对你更高效。',
          `命中${ok?'带印星/文昌':'无显文昌印星'}：${ok?'天生学术气场强':'更适合在实践中迭代'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）：${d.cDySS.includes('印')?'是读书黄金期':'更适合做事而非读书'}。`,
          ok?'1) 选学校优于选专业\n2) 提前 1 年准备\n3) 找导师建立学术圈':'1) 在职考最有用的硬证书\n2) 投资课程而非学位\n3) 找业内 mentor 优于读名校'
        ];
      }, related:['c1','c5']},
    // —— 居住/出行 ——
    {id:'r1', q:'我适合搬家或出国吗？', kw:['搬家','出国','移民','换城市','迁移','远行','旅行'], intent:'居住', anchor:'risk',
      answer:(d)=>{
        const has=d.shensha&&d.shensha.some(s=>s.n==='驿马');
        return [
          has?'命带驿马，迁移变动是顺势而为，宜动不宜静。':'命中驿马不显，远迁阻力较大，需做好心理准备。',
          `日主${d.dg}（${d.wx.dw}）适合的方位：${({木:'东方/东南',火:'南方',土:'西南/东北/中部',金:'西方/西北',水:'北方'})[d.wx.ys]}（用神方位）。`,
          `${CURR_YEAR}${d.lnSS.includes('财')||d.lnSS.includes('官')?'流年有利变动':'流年宜稳'}。`,
          '1) 春季启动手续最佳\n2) 选择用神方位的城市/国家\n3) 大件物品分批运输降风险'
        ];
      }, related:['c3']},
    {id:'r2', q:'什么方位对我有利？', kw:['方位','风水','朝向','方向','东南西北'], intent:'居住', anchor:'wuxing',
      answer:(d)=>{
        const dirMap={木:'东/东南',火:'南/东南',土:'中/西南/东北',金:'西/西北',水:'北/西北'};
        return [
          `你的用神方位：${dirMap[d.wx.ys]}（用神${d.wx.ys}）。`,
          '住房选用神方位的城市/区域；办公桌朝向用神方位；床头避开忌神方位。',
          `忌神为${d.wx.KE[d.wx.dw]}（方位：${dirMap[d.wx.KE[d.wx.dw]]}），尽量避开长期居住。`,
          '1) 看房时带指南针\n2) 客厅主沙发面朝用神方位\n3) 卧室色调用用神对应色'
        ];
      }, related:['r1','h3']},
    // —— 玄学/术语 ——
    {id:'t1', q:'什么是用神？', kw:['用神','喜神','忌神','什么是用神'], intent:'玄学', anchor:'wuxing',
      answer:(d)=>{
        return [
          `你的用神是 ${d.wx.ys}，喜神是 ${d.wx.xs}。用神入运则顺。`,
          `用神是命局中最能平衡日主的五行——你的日主${d.wx.dw}${d.wx.st?'偏旺，需要被克泄':'偏弱，需要被生扶'}，因此用神为${d.wx.ys}。`,
          `下一步用神大运在：${(d.dy.ds.find(x=>GW[x.g]===d.wx.ys)||{}).g||'-'}${(d.dy.ds.find(x=>GW[x.g]===d.wx.ys)||{}).z||'-'}时段。`,
          '1) 多接触用神属性的人/事/物\n2) 用神对应色为主色调\n3) 避开忌神方位长期停留'
        ];
      }, related:['t2','r2']},
    {id:'t2', q:'什么是大运？', kw:['大运','十年运','大运是什么','怎么排'], intent:'玄学', anchor:'timeline',
      answer:(d)=>{
        return [
          '大运是从月柱推演的"十年运程"，由出生节气决定起运岁数与排序方向。',
          `你 ${d.dy.sa} 岁起运，${d.dyShun?'顺':'逆'}排（基于年柱阴阳与性别）。`,
          `当前在第 ${d.cDyIdx+1} 步：${d.cDy.g}${d.cDy.z}（${d.cDy.as}~${d.cDy.ae}岁）`,
          '1) 大运比流年影响更深远\n2) 干支各主前/后五年\n3) 用神运是黄金时期'
        ];
      }, related:['t1']},
    {id:'t3', q:'什么是身旺身弱？', kw:['身旺','身弱','身强','旺衰','旺还是弱'], intent:'玄学', anchor:'persona',
      answer:(d)=>{
        return [
          `你${d.wx.st?'身旺':'身弱'}。${d.wx.st?'能担财官，宜主动出击':'宜借助印比扶身，财官为忌时不可贪'}。`,
          '身旺=日主得令/得地/得势；身弱反之。判断要看月令、地支根基、天干助力。',
          `你的日主${d.wx.dw}在月令${d.b.M.z}：${(d.wx.dw===ZW[d.b.M.z])?'得令':(d.wx.SH&&d.wx.SH[d.wx.dw]===ZW[d.b.M.z])?'得气':'失令'}。`,
          d.wx.st?'1) 适合 All-in 主业\n2) 用神为克泄之物\n3) 避免比劫之运':'1) 适合稳健蓄势\n2) 用神为印比生扶\n3) 财官旺运须借力'
        ];
      }, related:['t1','t2']},
    // —— 综合/迷茫 ——
    {id:'g1', q:'我最近为什么压力大？', kw:['压力','焦虑','瓶颈','迷茫','烦','累','低谷'], intent:'综合', anchor:'monthly',
      answer:(d)=>{
        const ke=d.wx.KE[d.wx.dw];
        const heavy=d.cDySS.includes('官')||d.lnSS.includes('官')||d.lmSS.includes('官');
        return [
          heavy?'近期官杀气重，压力指数偏高。':'气场平和，压力多来自外因或自我要求过高。',
          `当前大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）+ 流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）+ 流月${d.cLm?d.cLm.gz:'-'}（${d.lmSS}）：${heavy?'三层叠加，主压力与升迁并存':'平和无明显冲克'}。`,
          d.wx.c[ke]/d.wx.t>0.3?`忌神${ke}偏旺，气场易耗损。`:'忌神不旺，能量恢复较快。',
          '1) 每天 15 分钟独处时间\n2) 用神'+d.wx.ys+'相关活动可补气\n3) 周末半天彻底不接工作'
        ];
      }, related:['h2','g2']},
    {id:'g2', q:'我未来 10 年走势如何？', kw:['未来','走势','10年','发展','人生','规划'], intent:'综合', anchor:'timeline',
      answer:(d)=>{
        const next=d.dy.ds[d.cDyIdx+1];
        return [
          `你正处在第 ${d.cDyIdx+1} 步大运 ${d.cDy.g}${d.cDy.z}（${d.cDy.as}~${d.cDy.ae}岁）。`,
          `本步十神${d.cDySS}：${d.cDySS.includes('官')?'仕途权位期':d.cDySS.includes('财')?'财富积累期':d.cDySS.includes('印')?'学养贵人期':d.cDySS==='食神'?'才华享受期':d.cDySS==='伤官'?'叛逆突破期':'过渡周期'}。`,
          next?`下一步 ${next.g}${next.z}（${next.as}~${next.ae}岁），十神${TJ.ssOf(d.dg,next.g)}，主题将转向${TJ.ssOf(d.dg,next.g).includes('财')?'财富':TJ.ssOf(d.dg,next.g).includes('官')?'权位':TJ.ssOf(d.dg,next.g).includes('印')?'学养':'内省'}。`:'已进入最后阶段，宜传承与沉淀。',
          '1) 切换大运前一年开始铺垫\n2) 用神运全力推进\n3) 忌神运转守势'
        ];
      }, related:['g1','t2']}
  ]
};

/* ============================================================
   AI 搜索引擎
   ============================================================ */
const KBSearch={
  // Levenshtein 距离归一化为 0~1 的相似度
  similar(a,b){
    a=String(a||'').toLowerCase();b=String(b||'').toLowerCase();
    if(!a||!b)return 0;
    if(a===b)return 1;
    if(a.includes(b)||b.includes(a))return 0.8;
    const m=a.length,n=b.length;
    if(Math.abs(m-n)>Math.max(m,n)*0.6)return 0;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
    for(let i=0;i<=m;i++)dp[i][0]=i;
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    }
    return 1-dp[m][n]/Math.max(m,n);
  },
  search(q,topK){
    topK=topK||3;
    const ql=(q||'').toLowerCase().trim();
    if(!ql)return[];
    const intents=(typeof extractIntents==='function')?extractIntents(q):[];
    const scored=KB.faqs.map(f=>{
      let sc=0;
      // 关键词命中（每词 +5）
      (f.kw||[]).forEach(k=>{if(ql.includes(k.toLowerCase()))sc+=5;});
      // 意图命中 +6
      if(intents.includes(f.intent))sc+=6;
      // 标题相似度（最高 8 分）
      sc+=this.similar(ql,f.q)*8;
      // 标题包含关键词时再加成
      if(ql.length>=2&&f.q.toLowerCase().includes(ql.slice(0,2)))sc+=2;
      return{f,sc};
    }).filter(x=>x.sc>2.5).sort((a,b)=>b.sc-a.sc).slice(0,topK);
    return scored;
  },
  // 联想：用于输入框实时下拉（前 N 条）
  suggest(q,topK){
    topK=topK||6;
    if(!q||q.length<1)return KB.faqs.slice(0,topK);
    return this.search(q,topK).map(x=>x.f);
  },
  // 按意图筛选（chips 分类用）
  byIntent(intent){
    return KB.faqs.filter(f=>f.intent===intent);
  },
  // 术语检索
  findTerm(q){
    const ql=(q||'').trim();
    return KB.terms.find(t=>ql.includes(t.t)||this.similar(ql,t.t)>0.7);
  }
};

/* ============================================================
   智能回答（优先 KB → 命中则直出，未命中走 API/fallback）
   ============================================================ */
function smartAnswer(q,ctx){
  if(!ctx)ctx=getCtx();if(!ctx)return null;
  // 1) 术语命中
  const term=KBSearch.findTerm(q);
  if(term&&q.length<=10){
    const links=(term.see||[]).map(k=>KB.routes[k]).filter(Boolean);
    return{
      kind:'term',
      title:term.t,
      sections:[{title:'释义',content:term.d}],
      links,
      related:[]
    };
  }
  // 2) FAQ 命中（高置信）
  const hits=KBSearch.search(q,3);
  if(hits.length&&hits[0].sc>=8){
    const f=hits[0].f;
    let lines;
    try{lines=f.answer(ctx);}catch(e){lines=['信息计算异常','','',''];}
    const route=KB.routes[f.anchor];
    return{
      kind:'faq',
      title:f.q,
      sections:[
        {title:'结论',content:lines[0]||'-'},
        {title:'命理原因',content:lines[1]||'-'},
        {title:'当前阶段',content:lines[2]||'-'},
        {title:'行动建议',content:lines[3]||'-'}
      ],
      links:route?[route]:[],
      related:(f.related||[]).map(rid=>KB.faqs.find(x=>x.id===rid)).filter(Boolean),
      confidence:hits[0].sc
    };
  }
  return null;
}

/* ============================================================
   跳转 + 高亮
   ============================================================ */
function jumpTo(secId,cardKey){
  // 关 AI 面板
  if(typeof closeAsk==='function')closeAsk();
  // 若 secId 为空，从 KB.routes 推断；同时取 sub（合并卡子区）
  let subKey=null,routeCard=cardKey;
  if(cardKey&&KB&&KB.routes&&KB.routes[cardKey]){
    const r=KB.routes[cardKey];
    if(!secId)secId=r.sec;
    if(r.sub)subKey=r.sub;
    routeCard=r.card; // 重定向到真正的 DOM data-card
  }
  // 切 tab
  const tab=document.querySelector('.tab-item[data-sec="'+secId+'"]');
  if(tab&&!tab.classList.contains('active'))tab.click();
  // 重写：使用 routeCard 进行查找
  cardKey=routeCard;
  // 滚动+高亮
  setTimeout(()=>{
    let el=null;
    if(cardKey){
      el=document.querySelector('[data-card="'+cardKey+'"]');
    }
    if(!el){
      el=document.getElementById(secId);
    }
    if(!el)return;
    // “命盘结构”将四柱、五行等收进分栏；跳转前先唤醒所在分栏，避免滚动到隐藏内容。
    const structurePane=el.closest&&el.closest('.structure-pane');
    if(structurePane){
      const structure=structurePane.closest('.master-structure');
      const structureTab=structure&&structure.querySelector('.structure-tab[data-structure="'+structurePane.dataset.structure+'"]');
      if(structureTab&&typeof switchStructureTab==='function')switchStructureTab(structureTab);
    }
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.add('tj-flash');
    setTimeout(()=>el.classList.remove('tj-flash'),1800);
    // 如果是合并卡的子区跳转，自动激活对应子 tab
    if(subKey){
      const sub=el.querySelector('.focus-tab[data-sub="'+subKey+'"]');
      if(sub)sub.click();
    }
    // 如果卡片是折叠状态，自动展开
    if(el.classList.contains('collapsed'))el.classList.remove('collapsed');
  },280);
}

const ZWG='命宫,兄弟宫,夫妻宫,子女宫,财帛宫,疾厄宫,迁移宫,交友宫,事业宫,田宅宫,福德宫,父母宫'.split(',');
const QD='休门,生门,伤门,杜门,景门,死门,惊门,开门'.split(','),QS='天蓬,天任,天冲,天辅,天英,天芮,天柱,天心,天禽'.split(','),QG='值符,腾蛇,太阴,六合,白虎,玄武,九地,九天'.split(','),QP='坎一宫,坤二宫,震三宫,巽四宫,中五宫,乾六宫,兑七宫,艮八宫,离九宫'.split(',');

const CD={},CG=[
{g:'直辖市',c:[{i:'beijing',n:'北京',o:116.4,a:39.9},{i:'shanghai',n:'上海',o:121.5,a:31.2},{i:'tianjin',n:'天津',o:117.2,a:39.1},{i:'chongqing',n:'重庆',o:106.6,a:29.6}]},
{g:'河北',c:[{i:'shijiazhuang',n:'石家庄',o:114.5,a:38},{i:'tangshan',n:'唐山',o:118.2,a:39.6},{i:'baoding',n:'保定',o:115.5,a:38.9},{i:'qinhuangdao',n:'秦皇岛',o:119.6,a:39.9}]},
{g:'辽宁',c:[{i:'shenyang',n:'沈阳',o:123.4,a:41.8},{i:'dalian',n:'大连',o:121.6,a:38.9}]},
{g:'吉林',c:[{i:'changchun',n:'长春',o:125.3,a:43.9}]},
{g:'黑龙江',c:[{i:'haerbin',n:'哈尔滨',o:126.6,a:45.8}]},
{g:'山西',c:[{i:'taiyuan',n:'太原',o:112.6,a:37.9}]},
{g:'内蒙古',c:[{i:'huhehaote',n:'呼和浩特',o:111.8,a:40.8}]},
{g:'江苏',c:[{i:'nanjing',n:'南京',o:118.8,a:32.1},{i:'suzhou',n:'苏州',o:120.6,a:31.3},{i:'wuxi',n:'无锡',o:120.3,a:31.6},{i:'changzhou',n:'常州',o:120,a:31.8},{i:'nantong',n:'南通',o:120.9,a:32},{i:'xuzhou',n:'徐州',o:117.3,a:34.3},{i:'yangzhou',n:'扬州',o:119.4,a:32.4}]},
{g:'浙江',c:[{i:'hangzhou',n:'杭州',o:120.2,a:30.3},{i:'ningbo',n:'宁波',o:121.6,a:29.9},{i:'wenzhou',n:'温州',o:120.7,a:28},{i:'jiaxing',n:'嘉兴',o:120.8,a:30.8},{i:'shaoxing',n:'绍兴',o:120.6,a:30},{i:'jinhua',n:'金华',o:119.7,a:29.1}]},
{g:'安徽',c:[{i:'hefei',n:'合肥',o:117.3,a:31.9},{i:'wuhu',n:'芜湖',o:118.4,a:31.3}]},
{g:'福建',c:[{i:'fuzhou',n:'福州',o:119.3,a:26.1},{i:'xiamen',n:'厦门',o:118.1,a:24.5},{i:'quanzhou',n:'泉州',o:118.7,a:24.9}]},
{g:'江西',c:[{i:'nanchang',n:'南昌',o:115.9,a:28.7}]},
{g:'山东',c:[{i:'jinan',n:'济南',o:117,a:36.7},{i:'qingdao',n:'青岛',o:120.4,a:36.1},{i:'yantai',n:'烟台',o:121.5,a:37.5},{i:'weihai',n:'威海',o:122.1,a:37.5}]},
{g:'河南',c:[{i:'zhengzhou',n:'郑州',o:113.7,a:34.8},{i:'luoyang',n:'洛阳',o:112.5,a:34.6},{i:'kaifeng',n:'开封',o:114.3,a:34.8}]},
{g:'湖北',c:[{i:'wuhan',n:'武汉',o:114.3,a:30.6},{i:'yichang',n:'宜昌',o:111.3,a:30.7}]},
{g:'湖南',c:[{i:'changsha',n:'长沙',o:113,a:28.2},{i:'hengyang',n:'衡阳',o:112.6,a:26.9}]},
{g:'广东',c:[{i:'guangzhou',n:'广州',o:113.3,a:23.1},{i:'shenzhen',n:'深圳',o:114.1,a:22.6},{i:'dongguan',n:'东莞',o:113.8,a:23.1},{i:'foshan',n:'佛山',o:113.1,a:23},{i:'zhuhai',n:'珠海',o:113.6,a:22.3},{i:'huizhou',n:'惠州',o:114.4,a:23.1},{i:'shantou',n:'汕头',o:116.7,a:23.4}]},
{g:'广西',c:[{i:'nanning',n:'南宁',o:108.4,a:22.8},{i:'guilin',n:'桂林',o:110.3,a:25.3}]},
{g:'海南',c:[{i:'haikou',n:'海口',o:110.4,a:20},{i:'sanya',n:'三亚',o:109.5,a:18.3}]},
{g:'四川',c:[{i:'chengdu',n:'成都',o:104.1,a:30.7},{i:'mianyang',n:'绵阳',o:104.7,a:31.5}]},
{g:'贵州',c:[{i:'guiyang',n:'贵阳',o:106.7,a:26.7}]},
{g:'云南',c:[{i:'kunming',n:'昆明',o:102.8,a:25},{i:'dali',n:'大理',o:100.2,a:25.6},{i:'lijiang',n:'丽江',o:100.2,a:26.9}]},
{g:'陕西',c:[{i:'xian',n:'西安',o:108.9,a:34.3}]},
{g:'甘肃',c:[{i:'lanzhou',n:'兰州',o:103.8,a:36.1}]},
{g:'新疆',c:[{i:'wulumuqi',n:'乌鲁木齐',o:87.6,a:43.8}]},
{g:'港澳台',c:[{i:'hongkong',n:'香港',o:114.2,a:22.3},{i:'macau',n:'澳门',o:113.5,a:22.2},{i:'taipei',n:'台北',o:121.6,a:25},{i:'kaohsiung',n:'高雄',o:120.3,a:22.6}]},
{g:'东亚',c:[{i:'tokyo',n:'东京',o:139.7,a:35.7},{i:'osaka',n:'大阪',o:135.5,a:34.7},{i:'seoul',n:'首尔',o:127,a:37.6},{i:'kyoto',n:'京都',o:135.8,a:35},{i:'busan',n:'釜山',o:129.1,a:35.2},{i:'fukuoka',n:'福冈',o:130.4,a:33.6}]},
{g:'东南亚',c:[{i:'singapore',n:'新加坡',o:103.8,a:1.4},{i:'bangkok',n:'曼谷',o:100.5,a:13.8},{i:'kualalumpur',n:'吉隆坡',o:101.7,a:3.1},{i:'jakarta',n:'雅加达',o:106.8,a:-6.2},{i:'hanoi',n:'河内',o:105.8,a:21},{i:'hochiminh',n:'胡志明',o:106.7,a:10.8},{i:'manila',n:'马尼拉',o:121,a:14.6}]},
{g:'欧美大洋洲',c:[{i:'london',n:'伦敦',o:-0.1,a:51.5},{i:'paris',n:'巴黎',o:2.4,a:48.9},{i:'berlin',n:'柏林',o:13.4,a:52.5},{i:'rome',n:'罗马',o:12.5,a:41.9},{i:'madrid',n:'马德里',o:-3.7,a:40.4},{i:'newyork',n:'纽约',o:-74,a:40.7},{i:'losangeles',n:'洛杉矶',o:-118.2,a:34.1},{i:'sanfrancisco',n:'旧金山',o:-122.4,a:37.8},{i:'chicago',n:'芝加哥',o:-87.6,a:41.9},{i:'toronto',n:'多伦多',o:-79.4,a:43.7},{i:'vancouver',n:'温哥华',o:-123.1,a:49.3},{i:'sydney',n:'悉尼',o:151.2,a:-33.9},{i:'melbourne',n:'墨尔本',o:145,a:-37.8},{i:'dubai',n:'迪拜',o:55.3,a:25.2},{i:'auckland',n:'奥克兰',o:174.7,a:-36.9},{i:'moscow',n:'莫斯科',o:37.6,a:55.8},{i:'istanbul',n:'伊斯坦布尔',o:28.9,a:41}]}
];
CG.forEach(g=>g.c.forEach(c=>{CD[c.i]={n:c.n,o:c.o,a:c.a,g:g.g}}));

const JQ_STR="AQMCBQMEBAQFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQMCBQMEBAUFBQYGBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBAYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBgkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYEBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBgAE";

function _initJq(){const bin=atob(JQ_STR);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);window._jqArr=arr;window._jqMaxYear=1900+Math.floor(arr.length/24)-1;}
function solarTermDate(year,n){
  // n: 0=立春 1=惊蛰 2=清明 3=立夏 4=芒种 5=小暑
  //    6=立秋 7=白露 8=寒露 9=立冬 10=大雪 11=小寒
  // Based on the tropical year calculation with leap year corrections
  // Reference year: 2000
  const C=[4.393,6.188,5.34,6.12,6.126,7.72,8.35,8.426,8.886,8.196,7.62,6.08];
  const M=[2,3,4,5,6,7,8,9,10,11,12,1];
  // More precise constants using the formula:
  // For the n-th solar term, the day in the month is:
  // day = floor(C[n] + 0.2422*(year-2000) - floor((year-2000)/4))
  // with small corrections for specific terms and years
  const D=[3.87,5.63,4.81,5.52,5.678,7.105,7.5,7.646,8.318,7.438,7.18,5.4055];
  const yCalc=(n===11)?year+1:year;
  const diff=yCalc-2000;
  const day=Math.floor(D[n]+0.2422*diff-Math.floor(diff/4));
  return[M[n],day];
}
function jqDate(y,n){
  // First try the lookup table for years 1900-1989
  if(y>=1900){
    if(!window._jqArr)_initJq();
    if(y<=window._jqMaxYear){
      const off=((y-1900)*12+n)*2;
      if(off+1<window._jqArr.length)return[window._jqArr[off]+1,window._jqArr[off+1]+1];
    }
  }
  // For years beyond the table, use formula
  return solarTermDate(y,n);
}
function getMonthPillar(year,month,day){let yp=year;const lc=jqDate(year,0);if(!lc)return{mi:2,yp:year};if(month<lc[0]||(month===lc[0]&&day<lc[1]))yp=year-1;let mi=10;for(let i=11;i>=0;i--){const j=jqDate(year,i);if(!j)continue;if(month>j[0]||(month===j[0]&&day>=j[1])){mi=i;break;}}return{mi,yp};}
function trueSolarTime(date,lon,useDST){let d=new Date(date);if(useDST&&d.getFullYear()>=1986&&d.getFullYear()<=1991){const m=d.getMonth()+1;if(m>=4&&m<=9)d=new Date(d.getTime()-3600000);}const offsetMin=(lon-120)*4;const doy=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);const B=2*Math.PI*(doy-1)/365;const eot=229.18*(0.000075+0.001868*Math.cos(B)-0.032077*Math.sin(B)-0.014615*Math.cos(2*B)-0.040849*Math.sin(2*B));const totalOffset=offsetMin+eot;return new Date(d.getTime()+totalOffset*60000);}
function resolveBirthDateTime(y,m,d,hh,mm,useTrueSolar,lon){let dt=new Date(y,m-1,d,hh,mm,0);let note='';if(useTrueSolar&&lon){dt=trueSolarTime(dt.getTime(),lon,true);note='已启用真太阳时换算（经度'+lon+'°）';}let by=dt.getFullYear(),bm=dt.getMonth()+1,bd=dt.getDate();let ch=dt.getHours(),cmin=dt.getMinutes();let totalMin=ch*60+cmin;let hourZhi;if(totalMin>=23*60){hourZhi=0;const next=new Date(Date.UTC(by,bm-1,bd+1));by=next.getUTCFullYear();bm=next.getUTCMonth()+1;bd=next.getUTCDate();}else if(totalMin<60){hourZhi=0;}else{hourZhi=Math.floor((totalMin-60)/120)+1;}return{year:by,month:bm,day:bd,hourZhi,note};}
function getDayPillarIndex(y,m,d){const anchor=new Date(Date.UTC(2000,0,1));const target=new Date(Date.UTC(y,m-1,d));const diff=Math.round((target-anchor)/86400000);return((54+diff)%60+60)%60;}
function mkBazi(y,m,d,hourZhi){const mp=getMonthPillar(y,m,d);const yp=mp.yp;const ygi=((yp-4)%10+10)%10;const yzi=((yp-4)%12+12)%12;const mzi=(mp.mi+2)%12;const monthGanBase=[2,4,6,8,0];const mgi=(monthGanBase[ygi%5]+mp.mi)%10;const dji=getDayPillarIndex(y,m,d);const dgi=dji%10;const dzi=dji%12;const hourGanBase=[0,2,4,6,8];const hgi=(hourGanBase[dgi%5]+hourZhi)%10;const nyi=((yp-4)%60+60)%60;return{Y:{g:TG[ygi],z:DZ[yzi],gi:ygi,zi:yzi},M:{g:TG[mgi],z:DZ[mzi],gi:mgi,zi:mzi},D:{g:TG[dgi],z:DZ[dzi],gi:dgi,zi:dzi},H:{g:TG[hgi],z:DZ[hourZhi],gi:hgi,zi:hourZhi},dj:dji,ny:NY[nyi],sx:SX[yzi]};}
function mkWx(b){const c={木:0,火:0,土:0,金:0,水:0};[b.Y.g,b.M.g,b.D.g,b.H.g].forEach(g=>c[GW[g]]+=1);[b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>c[ZW[z]]+=1);[b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{const cg=ZC[z];if(cg[0])c[GW[cg[0]]]+=0.6;if(cg[1])c[GW[cg[1]]]+=0.3;if(cg[2])c[GW[cg[2]]]+=0.1;});const dw=GW[b.D.g];let s='木',w='木';WX.forEach(x=>{if(c[x]>c[s])s=x;if(c[x]<c[w])w=x;});const t=Object.values(c).reduce((a,b)=>a+b,0);const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};const monthWx=ZW[b.M.z];const deLing=(monthWx===dw||BS[dw]===monthWx)?2:(SH[dw]===monthWx?0.5:0);const selfP=c[dw]+c[BS[dw]]+deLing;const otherP=t-c[dw]-c[BS[dw]]+(2-deLing);const st=selfP>=otherP*0.85;let ys,xs;if(st){ys=SH[dw];xs=KE[dw];}else{ys=BS[dw];xs=dw;}return{c,dw,st,s,w,ys,xs,t,KE,SH,BS,BK,deLing};}
function mkSs(b){const d=b.D.g,t=SS[d];return{yg:t[b.Y.g],mg:t[b.M.g],hg:t[b.H.g],yzc:ZC[b.Y.z].map(g=>({g,s:t[g]})),mzc:ZC[b.M.z].map(g=>({g,s:t[g]})),dzc:ZC[b.D.z].map(g=>({g,s:t[g]})),hzc:ZC[b.H.z].map(g=>({g,s:t[g]}))};}
function mkShenSha(b){const r=[];const dz=DZ[b.D.zi],tg=TG[b.D.gi];const xunK={0:[10,11],1:[10,11],2:[0,1],3:[0,1],4:[2,3],5:[2,3],6:[4,5],7:[4,5],8:[6,7],9:[6,7]};const xk=xunK[Math.floor(b.dj/10)];if(xk)r.push({n:'空亡',v:DZ[xk[0]]+DZ[xk[1]],t:'日柱旬中空亡，多主漂泊、精神空虛，亦有机缘灵性'});const thMap={子:'酉',丑:'午',寅:'卯',卯:'子',辰:'酉',巳:'午',午:'卯',未:'子',申:'酉',酉:'午',戌:'卯',亥:'子'};const th=thMap[dz];if(th)r.push({n:'桃花',v:th,t:'人缘、感情、魅力之星'});const ymMap={子:'寅',丑:'亥',寅:'申',卯:'巳',辰:'寅',巳:'亥',午:'申',未:'巳',申:'寅',酉:'亥',戌:'申',亥:'巳'};const ym=ymMap[dz];if(ym)r.push({n:'驿马',v:ym,t:'变动、奔波、远行之星'});const tyMap={甲:'丑未',戊:'丑未',庚:'丑未',乙:'子申',己:'子申',丙:'亥酉',丁:'亥酉',壬:'卯巳',癸:'卯巳',辛:'午寅'};const ty=tyMap[tg];if(ty)r.push({n:'天乙贵人',v:ty,t:'逢凶化吉、贵人扶助'});const wcMap={甲:'巳',乙:'午',丙:'申',戊:'申',丁:'酉',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'};const wc=wcMap[tg];if(wc)r.push({n:'文昌',v:wc,t:'学业、功名、文艺之星'});const jxMap={子:'子',丑:'酉',寅:'午',卯:'卯',辰:'子',巳:'酉',午:'午',未:'卯',申:'子',酉:'酉',戌:'午',亥:'卯'};const jx=jxMap[dz];if(jx)r.push({n:'将星',v:jx,t:'权威、领导、管理之星'});const hgMap={子:'辰',丑:'丑',寅:'戌',卯:'未',辰:'辰',巳:'丑',午:'戌',未:'未',申:'辰',酉:'丑',戌:'戌',亥:'未'};const hg=hgMap[dz];if(hg)r.push({n:'华盖',v:hg,t:'孤独、宗教、艺术、玄学之星'});const tyi=DZ[(b.M.zi+11)%12];r.push({n:'天医',v:tyi,t:'健康、医学、疗愈之星'});const hyMap={甲:'午',乙:'午',丙:'寅',丁:'未',戊:'辰',己:'辰',庚:'戌',辛:'酉',壬:'子',癸:'申'};const hy=hyMap[tg];if(hy)r.push({n:'红艳',v:hy,t:'情感丰富、风流多情'});const kg=['庚辰','庚戌','壬辰','戊戌'];if(kg.includes(b.D.g+b.D.z))r.push({n:'魁罡',v:b.D.g+b.D.z,t:'刚烈、聪明、果断，女命逢之婚姻多波折'});const yrMap={甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'};const yr=yrMap[tg];if(yr)r.push({n:'羊刃',v:yr,t:'刚强、锐利、胆大，喜七杀配合'});return r;}
function mkDy(b,gn,y){const yangGan=b.Y.gi%2===0;const isMale=gn==='male';const fw=(yangGan&&isMale)||(!yangGan&&!isMale);const bd=document.getElementById('bDate').value;const[by,bm,bd2]=bd.split('-').map(Number);const bObj=new Date(by,bm-1,bd2);let minDays=365;for(let i=0;i<12;i++){const j=jqDate(by,i);if(!j)continue;const jDate=new Date(by,j[0]-1,j[1]);if(fw){let diff=Math.round((jDate-bObj)/86400000);if(diff<=0){const j2=jqDate(by+1,i);if(j2){diff=Math.round((new Date(by+1,j2[0]-1,j2[1])-bObj)/86400000);}}if(diff>0&&diff<minDays)minDays=diff;}else{let diff=Math.round((bObj-jDate)/86400000);if(diff<=0){const j2=jqDate(by-1,i);if(j2){diff=Math.round((bObj-new Date(by-1,j2[0]-1,j2[1]))/86400000);}}if(diff>0&&diff<minDays)minDays=diff;}}const sa=Math.max(1,Math.round(minDays/3));const ds=[];for(let i=0;i<10;i++){const o=fw?(i+1):-(i+1);ds.push({g:TG[((b.M.gi+o)%10+10)%10],z:DZ[((b.M.zi+o)%12+12)%12],as:sa+i*10,ae:sa+i*10+9,ys:y+sa+i*10,ye:y+sa+i*10+9});}return{ds,sa};}
function mkLn(cy){const r=[];for(let y=cy-2;y<=cy+5;y++){const gi=((y-4)%10+10)%10,zi=((y-4)%12+12)%12;r.push({y,g:TG[gi],z:DZ[zi],sx:SX[zi]})}return r;}
function getLiuYue(year){const baseMap=[2,4,6,8,0];const ygi=((year-4)%10+10)%10;const startGan=(baseMap[ygi%5]+0)%10;const res=[];const names=['寅月(正月)','卯月(二月)','辰月(三月)','巳月(四月)','午月(五月)','未月(六月)','申月(七月)','酉月(八月)','戌月(九月)','亥月(十月)','子月(冬月)','丑月(腊月)'];const jieNames=['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];for(let i=0;i<12;i++){const gi=(startGan+i)%10;const zi=(2+i)%12;const jq=jqDate(year,i);const jqStr=jq?`${jq[0]}月${jq[1]}日${jieNames[i]}`:'';res.push({name:names[i],gz:TG[gi]+DZ[zi],jq:jqStr});}return res;}
function mkZw(b){const ps=ZWG.map(n=>({n,m:[],a:[],s:[]}));const lunarDay=(b.dj%30)+1;const monthZhi=b.M.zi,hourZhi=b.H.zi;const mingGongZhi=(monthZhi-hourZhi+12)%12;const bodyGongZhi=(monthZhi+hourZhi)%12;const mgIdx=mingGongZhi;const mgGanIdx=(b.Y.gi+mgIdx)%10;const mgGZ=TG[mgGanIdx]+DZ[mgIdx];const mgNaYin=NY[((mgGanIdx-mgIdx%10+10)%10+mgIdx*2)%60]||'大驿土';const juMap={'金':4,'木':3,'水':2,'火':6,'土':5};const wuxingJu=juMap[mgNaYin.charAt(mgNaYin.length-1)]||5;const ziWeiPos=(Math.ceil(lunarDay/wuxingJu)*wuxingJu+mingGongZhi)%12;const zwS=['紫微','天机',null,'太阳','武曲','天同',null,'廉贞'];const zwO=[0,-1,-2,-3,-4,-5,-6,-7];zwS.forEach((s,i)=>{if(!s)return;ps[((ziWeiPos+zwO[i])%12+12)%12].m.push(s)});const tfP=((14-ziWeiPos)%12+12)%12;const tfS=['天府','太阴','贪狼','巨门','天相','天梁','七杀',null,null,null,null,'破军'];tfS.forEach((s,i)=>{if(!s)return;ps[(tfP+i)%12].m.push(s)});ps[(10-hourZhi+12)%12].a.push('文昌');ps[(hourZhi+4)%12].a.push('文曲');ps[(monthZhi+3)%12].a.push('左辅');ps[(11-monthZhi+12)%12].a.push('右弼');const tk={0:[1,7],1:[0,8],2:[3,5],3:[3,5],4:[1,7],5:[0,8],6:[7,1],7:[6,2],8:[3,5],9:[3,5]};ps[tk[b.Y.gi][0]].a.push('天魁');ps[tk[b.Y.gi][1]].a.push('天钺');ps[(b.Y.gi+3)%12].s.push('擎羊');ps[(b.Y.gi+1)%12].s.push('陀罗');ps[(b.Y.zi*3+2)%12].s.push('火星');ps[(b.Y.zi*2+10)%12].s.push('铃星');ps[(11-hourZhi+12)%12].s.push('地空');ps[(hourZhi+11)%12].s.push('地劫');const siHuaMap={甲:['廉贞','破军','武曲','太阳'],乙:['天机','天梁','紫微','太阴'],丙:['天同','天机','文昌','廉贞'],丁:['太阴','天同','天机','巨门'],戊:['贪狼','太阴','右弼','天机'],己:['武曲','贪狼','天梁','破军'],庚:['太阳','武曲','太阴','天同'],辛:['巨门','太阳','文曲','文昌'],壬:['天梁','紫微','左辅','武曲'],癸:['破军','巨门','太阴','贪狼']};const sh=siHuaMap[b.Y.g]||[];ps.forEach(p=>{p.m.forEach((s,idx)=>{if(sh[0]===s)p.m[idx]+='·禄';if(sh[1]===s)p.m[idx]+='·权';if(sh[2]===s)p.m[idx]+='·科';if(sh[3]===s)p.m[idx]+='·忌';});});return{ps,bp:(mingGongZhi+hourZhi+2)%12,mingGongZhi,bodyGongZhi};}
function mkQm(b){const monthZhi=b.M.zi;const yangDun=[2,3,4,5,6,7].includes(monthZhi);const juBase=yangDun?(b.dj%9+1):(10-b.dj%9);const ju=((juBase-1)%9)+1;const ps=[];const shiGan=b.H.gi;for(let i=0;i<9;i++){const di=yangDun?(ju-1+i)%8:((ju-1-i)%8+8)%8;const si=yangDun?(ju-1+i*2)%9:((ju-1-i*2)%9+9)%9;ps.push({p:QP[i],d:QD[di],s:QS[si],g:QG[(shiGan+i)%8],cc:i===4});}return{ps,ju,yangDun};}
function mkMh(b){const yearNum=b.Y.zi+1,monthNum=(b.M.zi-1)%12+1,dayNum=(b.dj%30)+1,hourNum=b.H.zi+1;const un=(yearNum+monthNum+dayNum)%8||8,ln2=(yearNum+monthNum+dayNum+hourNum)%8||8,cl=(yearNum+monthNum+dayNum+hourNum)%6||6;const gn=['乾','兑','离','震','巽','坎','艮','坤'],gs=['☰','☱','☲','☳','☴','☵','☶','☷'];const ge=['金','金','火','木','木','水','土','土'],gl=[[1,1,1],[1,1,0],[1,0,1],[0,0,1],[1,1,0],[0,1,0],[1,0,0],[0,0,0]];const ui=(un-1)%8,li=(ln2-1)%8;const hex=[...gl[li],...gl[ui]],chg=[...hex];chg[cl-1]=chg[cl-1]?0:1;const fg=ls=>gl.findIndex(g=>g[0]===ls[0]&&g[1]===ls[1]&&g[2]===ls[2]);const mui=Math.max(0,fg(chg.slice(3))),mli=Math.max(0,fg(chg.slice(0,3)));return{ug:gs[ui]+' '+gn[ui],lg:gs[li]+' '+gn[li],ul:gl[ui],ll:gl[li],ue:ge[ui],le:ge[li],cl,mu:gs[mui]+' '+gn[mui],ml:gs[mli]+' '+gn[mli],huUpper:hex.slice(2,5),huLower:hex.slice(1,4)};}
function mkSi(b){const mz=b.M.z;let s,se,sp,season;if('寅卯'.includes(mz)){s='春';se='木';sp='生发';season='春'}else if(mz==='辰'){s='春季末';se='土';sp='转化';season='春'}else if('巳午'.includes(mz)){s='夏';se='火';sp='旺盛';season='夏'}else if(mz==='未'){s='夏季末';se='土';sp='蕴藏';season='夏'}else if('申酉'.includes(mz)){s='秋';se='金';sp='收敛';season='秋'}else if(mz==='戌'){s='秋季末';se='土';sp='肃杀';season='秋'}else if('亥子'.includes(mz)){s='冬';se='水';sp='潜藏';season='冬'}else{s='冬季末';se='土';sp='待发';season='冬'}const W={春:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},夏:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},秋:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},冬:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}};let st=W[season][GW[b.D.g]];if('辰戌丑未'.includes(mz)&&GW[b.D.g]==='土')st='旺';return{s,se,sp,st,season};}
function applyTheme(yongShen){const themes={木:{h:145,s:'45%',l:'45%',m1:'rgba(40,140,80,0.28)',m2:'rgba(30,100,60,0.22)',m3:'rgba(20,80,45,0.14)',m4:'rgba(50,130,70,0.10)',m5:'rgba(25,90,50,0.14)',bg1:'#060d08',bg2:'#0c1a10',bg3:'#081208'},火:{h:8,s:'60%',l:'52%',m1:'rgba(180,60,40,0.28)',m2:'rgba(140,45,30,0.22)',m3:'rgba(100,35,25,0.16)',m4:'rgba(160,55,35,0.10)',m5:'rgba(120,40,28,0.14)',bg1:'#0d0806',bg2:'#1a100c',bg3:'#120c08'},土:{h:38,s:'55%',l:'56%',m1:'rgba(180,130,60,0.30)',m2:'rgba(120,80,40,0.25)',m3:'rgba(90,60,30,0.16)',m4:'rgba(160,100,50,0.10)',m5:'rgba(100,70,35,0.15)',bg1:'#0d0b08',bg2:'#14120e',bg3:'#0f0d0a'},金:{h:45,s:'15%',l:'65%',m1:'rgba(160,155,140,0.22)',m2:'rgba(130,125,110,0.18)',m3:'rgba(100,95,85,0.12)',m4:'rgba(150,145,130,0.08)',m5:'rgba(110,105,95,0.12)',bg1:'#0a0a0b',bg2:'#14141a',bg3:'#0f0f14'},水:{h:210,s:'50%',l:'50%',m1:'rgba(40,80,160,0.28)',m2:'rgba(30,60,130,0.22)',m3:'rgba(25,50,100,0.14)',m4:'rgba(45,75,140,0.10)',m5:'rgba(30,55,110,0.14)',bg1:'#06080d',bg2:'#0c101a',bg3:'#080c12'}};const t=themes[yongShen]||themes['土'];const root=document.documentElement.style;root.setProperty('--accent-h',t.h);root.setProperty('--accent-s',t.s);root.setProperty('--accent-l',t.l);root.setProperty('--m1',t.m1);root.setProperty('--m2',t.m2);root.setProperty('--m3',t.m3);root.setProperty('--m4',t.m4);root.setProperty('--m5',t.m5);root.setProperty('--bg1',t.bg1);root.setProperty('--bg2',t.bg2);root.setProperty('--bg3',t.bg3);}
function getShenShaLabels(b){const labels=[];const zh=[b.Y.z,b.M.z,b.D.z,b.H.z];const ch={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};const ha={'子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉'};const he={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'};const po={'子':'酉','酉':'子','丑':'辰','辰':'丑','寅':'亥','亥':'寅','卯':'午','午':'卯','巳':'申','申':'巳','未':'戌','戌':'未'};const zx={'辰':'辰','午':'午','酉':'酉','亥':'亥'};const mp={green:{bg:'rgba(52,199,89,.10)',co:'rgba(122,182,72,.85)',bd:'rgba(52,199,89,.16)'},red:{bg:'rgba(255,59,48,.10)',co:'rgba(212,101,74,.85)',bd:'rgba(255,59,48,.16)'},orange:{bg:'rgba(255,149,0,.10)',co:'rgba(212,160,74,.85)',bd:'rgba(255,149,0,.16)'},yellow:{bg:'rgba(255,204,0,.10)',co:'rgba(200,164,90,.85)',bd:'rgba(255,204,0,.16)'}};for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=zh[i],bb=zh[j];if(ch[a]===bb)labels.push({t:a+bb+'·冲',...mp.red});if(ha[a]===bb)labels.push({t:a+bb+'·害',...mp.orange});if(he[a]===bb)labels.push({t:a+bb+'·合',...mp.green});if(po[a]===bb)labels.push({t:a+bb+'·破',...mp.yellow});if(zx[a]===bb)labels.push({t:a+'·自刑',...mp.red});}const zset=new Set(zh);if(zset.has('寅')&&zset.has('巳')&&zset.has('申'))labels.push({t:'寅巳申·三刑',...mp.red});if(zset.has('丑')&&zset.has('戌')&&zset.has('未'))labels.push({t:'丑戌未·三刑',...mp.red});return labels;}
function getTodayGZ(){const now=new Date();const y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();const dji=getDayPillarIndex(y,m,d);const dgi=dji%10,dzi=dji%12;const mp=getMonthPillar(y,m,d);const mzi=(mp.mi+2)%12;const mgi=([2,4,6,8,0][(((mp.yp-4)%10+10)%10)%5]+mp.mi)%10;const yp=mp.yp;const ygi=((yp-4)%10+10)%10, yzi=((yp-4)%12+12)%12;return TG[ygi]+DZ[yzi]+'年 '+TG[mgi]+DZ[mzi]+'月 '+TG[dgi]+DZ[dzi]+'日';}
function extractIntents(q){const ints=[];if(/事业|工作|职业|升职|跳槽|创业|职场|领导|下属|管理|项目|裁员|被裁|优化|失业|岗位取消|裁撤|PIP/i.test(q))ints.push('事业');if(/感情|婚姻|爱情|对象|桃花|另一半|配偶|分手|复合|结婚|离婚|恋爱|异性|缘分|正缘/i.test(q))ints.push('感情');if(/财|钱|投资|收入|赚钱|股|基金|理财|薪水|工资|经济|负债|储蓄|消费|开支/i.test(q))ints.push('财运');if(/健康|身体|病|养生|疾病|医院|手术|失眠|精神|体质|锻炼|调养/i.test(q))ints.push('健康');if(/学业|考试|考研|留学|读书|学校|成绩|论文|面试|升学|考证|进修/i.test(q))ints.push('学业');if(/搬家|买房|装修|住|房产|租房|风水|方位|城市|出国|迁移|出行|旅途/i.test(q))ints.push('居住');if(!ints.length)ints.push('综合');return ints;}
function buildBaziContext(d){
  // d 即 ctx；按年龄严格定位，杜绝"兜底取首段"
  const b=d.b;
  const cDy=d.cDy||TJ.findDaYun(d.dy,d.age);
  const cLn=d.cLn||TJ.findLiuNian(d.ln,CURR_YEAR);
  const cLm=d.cLm||TJ.findLiuYue(d.liuyue);
  const dySS=cDy?TJ.ssOf(d.dg,cDy.g):'-';
  const lnSS=cLn?TJ.ssOf(d.dg,cLn.g):'-';
  const lmSS=cLm?TJ.ssOf(d.dg,cLm.gz.charAt(0)):'-';
  const lines=[
    `【四柱八字】${b.Y.g}${b.Y.z}年 ${b.M.g}${b.M.z}月 ${b.D.g}${b.D.z}日 ${b.H.g}${b.H.z}时`,
    `【性别 / 乾坤】${d.gen==='male'?'男 / 乾造':'女 / 坤造'}　出生地：${d.city?d.city.n:'未知'}　当前${d.age}岁`,
    `【日主】${d.dg}（${d.wx.dw}），${d.wx.st?'身旺':'身弱'}`,
    `【用神 / 喜神】${d.wx.ys} / ${d.wx.xs}　【忌神】${d.wx.KE[d.wx.dw]||'-'}`,
    `【格局】${d.pa&&d.pa.length?d.pa.join('、'):'普通格'}`,
    `【五行权重】木${d.wx.c['木'].toFixed(1)} 火${d.wx.c['火'].toFixed(1)} 土${d.wx.c['土'].toFixed(1)} 金${d.wx.c['金'].toFixed(1)} 水${d.wx.c['水'].toFixed(1)}（最旺:${d.wx.s} 最弱:${d.wx.w}）`,
    `【生肖 / 纳音】${b.sx}　${b.ny}`,
    `【神煞】${d.shensha&&d.shensha.length?d.shensha.map(s=>s.n+'('+s.v+')').join(' '):'无'}`,
    cDy?`【当前大运】${cDy.g}${cDy.z}（${cDy.as}~${cDy.ae}岁，${cDy.ys}~${cDy.ye}年），大运十神：${dySS}`:'',
    cLn?`【${CURR_YEAR}流年】${cLn.g}${cLn.z} ${cLn.sx}年，流年十神：${lnSS}`:'',
    cLm?`【当前流月】${cLm.name} ${cLm.gz}（${cLm.jq}），流月十神：${lmSS}`:'',
    `【${CURR_YEAR}运势评分】事业${d.cs} 财富${d.ws} 感情${d.ls} 健康${d.hs}`,
    d.liuyue?`【${CURR_YEAR}流月概览】`+d.liuyue.map(m=>m.name+':'+m.gz).join(' '):'',
    /* —— TJX 精算内核派生 —— */
    d.tjx?`【精算·旺衰】${d.tjx.strength.label}（综合分${d.tjx.strength.score}：得令${d.tjx.strength.deLing}+得地${Math.round(d.tjx.strength.deDi)}+得势${d.tjx.strength.deShi}）`:'',
    d.tjx&&d.tjx.tiaoHou?`【精算·调候】月令${b.M.z}，需${d.tjx.tiaoHou.primary}调候，次${d.tjx.tiaoHou.secondary}`:'',
    d.tjx?`【精算·用神】主用「${d.tjx.yongShen.primary}」+次用「${d.tjx.yongShen.secondary||'-'}」（依据：${(d.tjx.yongShen.reasons||[]).slice(0,2).join('；')}）`:'',
    d.tjx?`【精算·格局】${d.tjx.pattern.main||'-'}（${d.tjx.pattern.type}·评级${d.tjx.pattern.grade}）${d.tjx.pattern.detail.join('；')}`:'',
    d.tjx?`【精算·命局质量】${d.tjx.lifeGrade.tier}（${d.tjx.lifeGrade.score}分）`:'',
    d.tjx&&d.tjx.dyScore?`【精算·大运评分】${d.tjx.dyScore.score}（${d.tjx.dyScore.label}）—— ${(d.tjx.dyScore.reasons||[]).slice(0,3).join('；')}`:'',
    d.tjx&&d.tjx.lnScore?`【精算·流年评分】${d.tjx.lnScore.score}（${d.tjx.lnScore.label}）—— ${(d.tjx.lnScore.reasons||[]).slice(0,3).join('；')}`:'',
    d.tjx&&d.tjx.lnEvents&&d.tjx.lnEvents.length?`【精算·流年事件类型】${d.tjx.lnEvents.slice(0,5).map(e=>e.type+':'+e.tag).join(' / ')}`:'',
    d.tjx?(function(){
      const i=d.tjx.interactions;
      const arr=[];
      if(i.gan_he.length)arr.push('天干合:'+i.gan_he.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_he.length)arr.push('地支合:'+i.zhi_he.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_chong.length)arr.push('地支冲:'+i.zhi_chong.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_xing.length)arr.push('地支刑:'+i.zhi_xing.map(x=>x.a+'-'+x.b).join(','));
      if(i.san_he.length)arr.push('三合:'+i.san_he.map(x=>x.zhi+'('+x.wx+(x.full?'·全':'·半')+')').join(','));
      if(i.san_hui.length)arr.push('三会:'+i.san_hui.map(x=>x.zhi+'('+x.wx+')').join(','));
      return arr.length?'【精算·干支互动】'+arr.join(' | '):'';
    })():''
  ];
  return lines.filter(Boolean).join('\n');
}
function formatAIText(text){let h=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.+?)\*\*/g,'<span class="hl">$1</span>').replace(/【(.+?)】/g,'<span class="tg">$1</span>').replace(/#{1,4}\s*(.+)/g,'<h4>$1</h4>').split(/\n{2,}/).map(p=>p.trim()?`<p>${p.replace(/\n/g,'<br>')}</p>`:'').join('');return h||`<p>${text.replace(/\n/g,'<br>')}</p>`;}

function getPersona(dg,wx,st,ss){const P={甲:{思维:'目标导向，擅长搭建框架',情绪:'直来直去，不喜绕弯',人际:'领袖型，易成核心',决策:'果断，但易武断',压力:'目标未达成时焦躁'},乙:{思维:'灵活变通，善于借力',情绪:'细腻敏感，易内耗',人际:'润滑剂型，人缘好',决策:'犹豫但周全',压力:'被否定、被忽视时低落'},丙:{思维:'发散创意，喜新厌旧',情绪:'来得快去得快',人际:'阳光型，感染力强',决策:'凭直觉，敢赌',压力:'无聊、被束缚时崩溃'},丁:{思维:'深度钻研，追根究底',情绪:'内敛深沉，积压型',人际:'少而精，重质量',决策:'谨慎，谋定后动',压力:'不确定性、失控感'},戊:{思维:'务实落地，重可行性',情绪:'稳定迟缓，不易波动',人际:'可靠型，但略显沉闷',决策:'保守，厌恶风险',压力:'变动频繁、计划被打乱'},己:{思维:'调和矛盾，八面玲珑',情绪:'隐忍包容，自我消化',人际:'老好人，边界模糊',决策:'折中，和稀泥',压力:'冲突场面、被当工具人'},庚:{思维:'逻辑清晰，黑白分明',情绪:'刚硬直接，易冲突',人际:'义气型，兄弟多',决策:'快刀斩乱麻',压力:'不公平、被算计时暴怒'},辛:{思维:'精致挑剔，追求细节',情绪:'含蓄压抑，表面冷静',人际:'高冷型，慢热',决策:'反复比较，宁缺毋滥',压力:'粗制滥造、审美被毁'},壬:{思维:'宏观视野，系统思考',情绪:'随境而转，适应力强',人际:'广泛交际，三教九流',决策:'顺势而为，灵活调整',压力:'被困住、重复枯燥时抑郁'},癸:{思维:'洞察人心，直觉敏锐',情绪:'深沉暗涌，不易外露',人际:'倾听者型，易成知己',决策:'凭感觉，重视精神契合',压力:'被误解、精神孤立时低落'}};const base=P[dg]||P['甲'];const mode=st?'（偏主动型）':'（偏内敛型）';return{思维:base.思维+mode,情绪:base.情绪,人际:base.人际,决策:base.决策,压力:base.压力};}
function getTimeline(dy,by,wx,b,dg,gen,age){
  const ys=wx.ys,xs=wx.xs,KEys=wx.KE[ys],dw=wx.dw,yearZi=b.Y.zi;
  function scoreOne(g,z){
    let sc=55;const gw=GW[g],zw=ZW[z],ss=SS[dg][g];
    if(gw===ys)sc+=18;else if(gw===xs)sc+=12;else if(gw===KEys)sc-=12;else if(gw===dw)sc+=(wx.st?-5:8);
    if(zw===ys)sc+=15;else if(zw===xs)sc+=10;else if(zw===KEys)sc-=10;else if(zw===dw)sc+=(wx.st?-3:6);
    if(ss==='正官'||ss==='正印')sc+=5;
    if(ss==='正财')sc+=(wx.st?6:-3);
    if(ss==='偏财')sc+=(wx.st?5:-2);
    if(ss==='七杀')sc+=(wx.st?4:-6);
    if(ss==='伤官')sc+=(wx.st?6:-4);
    if(ss==='食神')sc+=3;
    if(ss==='偏印')sc+=(wx.st?-2:4);
    return Math.max(25,Math.min(95,Math.round(sc)));
  }
  return dy.ds.map((d,idx)=>{
    const gSS=SS[dg][d.g],gwx=GW[d.g],zwx=ZW[d.z],sc=scoreOne(d.g,d.z);
    const active=age>=d.as&&age<=d.ae,past=age>d.ae,future=age<d.as;
    const stage=d.as<20?'青春期':d.as<30?'立业期':d.as<40?'冲刺期':d.as<50?'丰盛期':d.as<60?'转型期':d.as<70?'成熟期':'晚晴期';
    let theme='过渡周期',ico='◆',tcol='#c8a45a';
    if(gSS==='正财'){theme='稳健聚财周期';ico='¥';tcol='#d4a04a';}
    else if(gSS==='偏财'){theme='机会财富周期';ico='¥';tcol='#d4a04a';}
    else if(gSS==='正官'){theme='仕途权位周期';ico='☗';tcol='#c8a45a';}
    else if(gSS==='七杀'){theme='挑战拼搏周期';ico='⚔';tcol='#d4654a';}
    else if(gSS==='正印'){theme='贵人学养周期';ico='☷';tcol='#8ab5c8';}
    else if(gSS==='偏印'){theme='玄学独修周期';ico='✶';tcol='#9a7abf';}
    else if(gSS==='食神'){theme='才华享受周期';ico='✿';tcol='#7ab648';}
    else if(gSS==='伤官'){theme='叛逆突破周期';ico='⚡';tcol='#d4b85a';}
    else if(gSS==='比肩'){theme='同行合作周期';ico='⚭';tcol='#8ab5c8';}
    else if(gSS==='劫财'){theme='竞争分利周期';ico='⚔';tcol='#d4654a';}
    const career=gSS.includes('官')?'职位易动，宜主动争取上升或带团队':gSS.includes('财')?'适合谈待遇、跑项目、跨界变现':gSS.includes('印')?'适合进修、考证、回归专业深耕':gSS==='食神'?'用作品/内容打开知名度的好时机':gSS==='伤官'?'易与上级摩擦，宜独立或自媒体':gSS==='比肩'?'人脉资源丰富，合伙优于单干':'稳守为主，少做颠覆性决策';
    const money=(gwx===ys||zwx===ys)?'用神入运，财源稳健':(gwx===KEys||zwx===KEys)?'忌神当道，宜守不宜攻、远离杠杆':gSS.includes('财')?'财星显现，正/偏财机会增多':gSS==='劫财'?'破财之运，谨防担保与朋友借贷':'平稳，无大起大落';
    const love=gSS==='劫财'?'同性竞争多，感情易有第三者':gen==='male'&&gSS.includes('财')?'妻星到位，未婚利结合':gen==='female'&&gSS.includes('官')?'夫星显现，感情有结果':gSS==='伤官'?'情绪起伏大，注意言辞':(zwx===dw||gwx===dw)?'比劫旺，桃花虽多易竞争':'感情平稳，宜深度经营';
    const health=(zwx===wx.w)?'最弱五行得补，体质转佳':(zwx===wx.s)?'最旺五行更旺，注意对应脏腑':(gwx===KEys&&zwx===KEys)?'气场不畅，宜规律作息+静修':'体能尚可，保持运动即可';
    const milestones=[];
    for(let yr=d.ys;yr<=d.ye;yr++){
      const zi=((yr-4)%12+12)%12,gi=((yr-4)%10+10)%10;
      if(zi===yearZi)milestones.push({y:yr,t:'本命年',age:d.as+(yr-d.ys),k:'mz'});
      if(GW[TG[gi]]===ys&&!milestones.find(m=>m.y===yr))milestones.push({y:yr,t:'用神流年',age:d.as+(yr-d.ys),k:'ys'});
    }
    return{idx,g:d.g,z:d.z,gz:d.g+d.z,as:d.as,ae:d.ae,ys:d.ys,ye:d.ye,gSS,gwx,zwx,sc,stage,theme,ico,tcol,career,money,love,health,milestones,active,past,future};
  });
}
function getMonthlyAlert(b,wx){const now=new Date();const m=now.getMonth();const mm=['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][m];const mw=ZW[mm];const ke={木:'金',火:'水',土:'木',金:'火',水:'土'};let msg='';if(ke[wx.dw]===mw)msg='本月官杀气旺，注意情绪管理和职场压力，避免冲动决定。';else if(wx.ys===mw)msg='本月用神当令，能量充沛，适合推进重要计划与谈判。';else if(wx.SH[wx.dw]===mw)msg='本月食伤吐秀，创意与表达力增强，利输出与社交。';else if(wx.BS[wx.dw]===mw)msg='本月印星生身，适合学习、休息与向内沉淀。';else msg='本月气场平和，按部就班即可，宜整理与复盘。';const risks=[];if(wx.c['火']>2.5&&wx.dw!=='火')risks.push('注意心火旺盛，避免急躁');if(wx.c['水']>2.5&&wx.dw!=='水')risks.push('思绪过杂，宜简化目标');if(wx.st&&wx.c[wx.ys]<0.8)risks.push('用神被泄，精力不济');if(!wx.st&&wx.c[wx.BS[wx.dw]]>2)risks.push('印星过重，容易拖延');return{msg,risks};}
function getRiskWarning(b,wx,lnSS,dySS){const r=[];if(lnSS.includes('官杀'))r.push({t:'情绪波动',d:'官杀流年压力倍增，注意焦虑与睡眠'});if(lnSS.includes('比劫'))r.push({t:'合作风险',d:'比劫争财，合作与借贷需签清晰协议'});if(lnSS.includes('财')&&!wx.st)r.push({t:'财务压力',d:'身弱见财为忌，量力而行，忌高风险投机'});if(lnSS.includes('印')&&dySS.includes('食伤'))r.push({t:'决策摇摆',d:'印制食伤，想法多但落地难，需聚焦'});if(wx.c['火']<0.8||wx.c['水']<0.8)r.push({t:'睡眠问题',d:'水火不调，注意作息与睡眠质量'});if(!r.length)r.push({t:'气场平和',d:'无明显重大风险，稳中求进即可',safe:1});return r;}
/* —— 裁员风险检测：现实职场信号为主，命理趋势仅作低权重参考 —— */
function getLayoffAstroRisk(d){
  if(!d||!d.b)return{score:20,label:'信息不足',reasons:[],protectors:[],window:'未来3—6个月'};
  const chong={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const lnSS=d.lnSS||d.cLnSS||'',dySS=d.dySS||d.cDySS||'',lmSS=d.lmSS||d.cLmSS||'';
  let score=20;
  const reasons=[],protectors=[];
  if(d.cs<45){score+=16;reasons.push('年度事业评分偏低');}
  else if(d.cs<60){score+=8;reasons.push('事业势能处于守势');}
  else if(d.cs>=75){score-=7;protectors.push('年度事业势能较强');}
  if(lnSS==='七杀'){score+=11;reasons.push('流年七杀主考核与压力');}
  if(lnSS==='伤官'&&/官|杀/.test(dySS)){score+=14;reasons.push('伤官见官，易有制度或上级冲突');}
  else if(lnSS==='伤官'){score+=6;reasons.push('流年伤官，沟通与规则摩擦增多');}
  if(lnSS==='劫财'){score+=7;reasons.push('流年劫财，同岗竞争加剧');}
  if(/正印|偏印/.test(lnSS)){score-=5;protectors.push('流年印星利资源与支持');}
  if(/正官/.test(lnSS)&&d.cs>=60){score-=4;protectors.push('正官到位，利正规评价与晋升通道');}
  if(d.cLn&&chong[d.cLn.z]===d.b.M.z){score+=13;reasons.push('流年冲月柱，工作环境易变');}
  if(d.cDy&&chong[d.cDy.z]===d.b.M.z){score+=9;reasons.push('大运冲月柱，组织关系处于变动期');}
  if(d.cLn&&d.cLn.z===d.b.M.z){score+=4;reasons.push('流年伏吟月柱，职场议题被放大');}
  if(lmSS==='七杀'||lmSS==='伤官'){score+=5;reasons.push('当前流月考核或沟通压力上升');}
  if(d.tjx&&d.tjx.lnScore){
    if(d.tjx.lnScore.score<=-30){score+=11;reasons.push('精算流年分偏弱');}
    else if(d.tjx.lnScore.score<0){score+=5;reasons.push('精算流年略有阻力');}
    else if(d.tjx.lnScore.score>=30){score-=6;protectors.push('精算流年走势偏吉');}
  }
  if(/正印|偏印/.test(dySS)){score-=4;protectors.push('当前大运有印星托底');}
  score=Math.max(8,Math.min(72,Math.round(score)));
  const label=score>=58?'波动偏高':score>=40?'需要留意':score>=25?'总体平稳':'低波动';
  const month=d.cLm&&d.cLm.name?d.cLm.name.replace(/\(.+?\)/g,''):'';
  return{score,label,reasons,protectors,window:month?`${month}起未来3—6个月`:'未来3—6个月'};
}

function calcLayoffRisk(){
  const d=getCtx();
  const out=document.getElementById('layoffResult');
  if(!d||!out)return;
  const getSelect=id=>{
    const el=document.getElementById(id);
    const opt=el&&el.selectedOptions?el.selectedOptions[0]:null;
    return{value:el?Number(el.value)||0:0,label:opt?opt.textContent.trim():''};
  };
  const company=getSelect('layoffCompany');
  const team=getSelect('layoffTeam');
  const perf=getSelect('layoffPerf');
  const role=getSelect('layoffRole');
  const checked=[...document.querySelectorAll('#layoffSignals input:checked')];
  const signalScore=checked.reduce((sum,x)=>sum+(Number(x.value)||0),0);
  const raw=company.value+team.value+perf.value+role.value+signalScore;
  const reality=Math.max(0,Math.min(100,Math.round(raw/149*100)));
  const astro=getLayoffAstroRisk(d);
  let score=Math.round(reality*.82+astro.score*.18);
  if(checked.some(x=>x.dataset.critical==='1'))score=Math.max(score,58);
  if(checked.some(x=>x.dataset.critical==='2'))score=Math.max(score,68);
  score=Math.max(5,Math.min(96,score));

  let level,color,summary;
  if(score<26){level='低风险';color='#7ab648';summary='暂未见明显裁员信号，继续保持可见产出即可。';}
  else if(score<50){level='需要关注';color='#d4b85a';summary='已有部分预警信号，建议在不制造恐慌的前提下主动核实。';}
  else if(score<70){level='较高风险';color='#d4a04a';summary='现实红旗已较集中，应立即准备备选方案并留存关键材料。';}
  else{level='高危信号集中';color='#d4654a';summary='多项强信号叠加，请把重心放在证据、现金流与求职预案上。';}

  const factors=[];
  if(company.value>=20)factors.push(company.label);
  if(team.value>=18)factors.push(team.label);
  if(perf.value>=18)factors.push(perf.label);
  if(role.value>=12)factors.push(role.label);
  checked.forEach(x=>factors.push(x.dataset.label||x.parentElement.textContent.trim()));
  if(!factors.length)factors.push('未勾选明显现实红旗');
  const trendFactors=astro.reasons.length?astro.reasons.slice(0,3):['命理周期未见明显冲击'];
  const protectors=[];
  if(company.value<=10)protectors.push('公司经营相对稳定');
  if(team.value<=8)protectors.push('部门暂未出现明显缩编');
  if(perf.value<=5)protectors.push('绩效记录构成保护');
  if(role.value<=5)protectors.push('岗位具备一定核心性');
  protectors.push(...astro.protectors.slice(0,2));
  if(!protectors.length)protectors.push('当前保护项不足，需主动建立业务可见度');

  const actions=score<26?[
    '每月沉淀一次可量化成果，保持与直属上级的正常同步。',
    '每季度更新简历和作品集，储备至少3个月应急金。',
    '关注公司财报、招聘与预算变化，不因传言自行离职。'
  ]:score<50?[
    '本周与直属上级确认未来90天目标，并用邮件留痕。',
    '低调更新简历，联系3—5位行业熟人了解外部机会。',
    '梳理劳动合同、工资单与绩效记录，准备3—6个月应急金。'
  ]:score<70?[
    '不要冲动裸辞；立即启动投递和面试，先拿到备选Offer。',
    '合规留存合同、工资单、绩效与沟通记录，个人资料与公司机密严格分开。',
    '提前了解当地裁员补偿规则，任何文件签署前先完整阅读。'
  ]:[
    '把求职当作当前第一优先级：当天更新简历，本周开始面试。',
    '不要当场签署离职/和解文件；必要时咨询劳动法律师或当地劳动部门。',
    '冻结非必要支出，测算6个月现金流，并准备工作交接清单。'
  ];

  out.innerHTML=`<div class="layoff-result">
    <div class="layoff-result-head">
      <div class="layoff-index" style="color:${color}">${score}<small>/100</small></div>
      <div><div class="layoff-level">${level}</div><div class="layoff-period">评估窗口：${astro.window}</div></div>
    </div>
    <div class="layoff-meter"><div class="layoff-meter-fill" data-w="${score}%" style="background:${color}"></div></div>
    <div style="font-size:.76em;color:rgba(255,255,255,.78);line-height:1.75;margin-bottom:10px">${summary}</div>
    <div class="layoff-result-grid">
      <div class="layoff-result-box"><h5>现实预警 · 82%</h5><p>${factors.map(x=>'· '+x).join('<br>')}</p></div>
      <div class="layoff-result-box"><h5>趋势参考 · 18%</h5><p>${trendFactors.map(x=>'· '+x).join('<br>')}</p></div>
      <div class="layoff-result-box"><h5>保护因素</h5><p>${protectors.slice(0,4).map(x=>'· '+x).join('<br>')}</p></div>
      <div class="layoff-result-box"><h5>分项指数</h5><p>现实信号 ${reality}/100<br>命理趋势 ${astro.score}/100</p></div>
    </div>
    <div class="layoff-actions"><div class="layoff-actions-title">现在最该做的 3 件事</div><ol>${actions.map(x=>`<li>${x}</li>`).join('')}</ol></div>
    <div class="layoff-disclaimer">风险指数不是裁员概率，也不能证明一定会或不会被裁。公司经营、部门预算、绩效与劳动法信息优先于命理趋势。</div>
  </div>`;
  requestAnimationFrame(()=>{const fill=out.querySelector('.layoff-meter-fill');if(fill)setTimeout(()=>fill.style.width=fill.dataset.w,80);});
  out.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function getRelationMode(dg,ss,gen){const map={甲:'独立型',乙:'依赖型',丙:'热情型',丁:'慢热型',戊:'务实型',己:'包容型',庚:'理性型',辛:'挑剔型',壬:'自由型',癸:'敏感型'};return map[dg]||'平衡型';}
function getSuitableType(wx,dg){const map={木:'情绪稳定、行动力强、土金偏旺的人',火:'包容性强、愿意给予空间的人',土:'有上进心、能带来新鲜感的人',金:'温柔细腻、善于沟通的人',水:'逻辑清晰、能给予安全感的人'};return map[wx.dw]||'五行互补、性格圆融的人';}
function getRelationRisks(wx,dg,ss){const r=[];if(wx.st)r.push('过于强势，容易忽略伴侣感受');if(!wx.st)r.push('过于迁就，边界感模糊导致委屈');if(ss.dzc.some(c=>c.s.includes('伤官')))r.push('言语锋利，易因沟通方式产生摩擦');if(wx.c['火']>3)r.push('情绪波动大，热情来得快去得也快');if(wx.c['水']>2.8)r.push('思虑过多，容易因猜疑产生隔阂');if(!r.length)r.push('暂无显著关系风险，保持真诚沟通即可');return r;}
function getDecisionAdvice(b,wx,dy,ln,scene){
  const ctx=getCtx();
  const age=ctx?ctx.age:(b._meta?TJ.calcAge(b._meta.by,b._meta.bm||1,b._meta.bd||1):0);
  const cDy=ctx?ctx.cDy:TJ.findDaYun(dy,age);
  const cLn=ctx?ctx.cLn:TJ.findLiuNian(ln,CURR_YEAR);
  if(!cDy||!cLn)return{label:'信息不足',window:'-',risk:'-',advice:'请先完整填写出生信息'};
  const dg=b.D.g,lnSS=TJ.ssOf(dg,cLn.g),dySS=TJ.ssOf(dg,cDy.g);
  if(scene==='跳槽'){const good=lnSS.includes('官')||lnSS.includes('财')||dySS.includes('官');return{label:good?'适合变动':'适合稳守',window:good?'未来3-5个月':'建议等到明年春季',risk:'情绪化决定',advice:'先拿Offer再离职，别裸辞'};}
  if(scene==='创业'){const good=wx.st&&(lnSS.includes('食')||lnSS.includes('伤')||lnSS.includes('财'));return{label:good?'可以尝试':'更适合联合创业',window:good?'秋季启动最佳':'先积累资源与人脉',risk:good?'资金链断裂':'单打独斗精力不足',advice:good?'找土金属性的合伙人':'先以副业验证模式'};}
  if(scene==='投资'){const good=lnSS.includes('财')&&wx.st;return{label:good?'偏财机会存在':'以稳健储蓄为主',window:good?'农历七月前后':'全年以固收为主',risk:'高风险短线操作',advice:good?'小仓位试水，见好就收':'远离杠杆与加密货币'};}
  return{label:'需结合具体时机',window:'近期非关键窗口',risk:'信息不足',advice:'建议先咨询专业顾问'};
}

function renderAll(b,wx,ss,dy,ln,zw,qm,mh,si,gen,q,city,by,shensha,liuyue){
  // —— 统一上下文（所有派生量的唯一来源）——
  const _input=(window._ctx&&window._ctx.input)?window._ctx.input:{by:by,bm:1,bd:1};
  const ctx=buildContext({b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P:null,gen,q,city,input:_input});
  const dg=ctx.dg,dw=ctx.dw,age=ctx.age,cDy=ctx.cDy,cLn=ctx.cLn,lnSS=ctx.lnSS,dySS=ctx.dySS;
  // —— 评分/命格 全部来自 ctx，避免与其他位置算法不一致 ——
  const cs=ctx.cs,ws=ctx.ws,ls=ctx.ls,hs=ctx.hs;
  const pa=ctx.pa;
  const P={甲:{core:'刚正不阿，有领导才能，如参天大树般坚韧挺拔',career:'适合创业、管理、教育、建筑等行业，天生有号召力',money:'财运偏向正财，靠实力和努力赚钱',love:'感情中比较主动和强势，重情义但不善表达',social:'朋友圈广但知心朋友少，给人可靠感但有时显得固执'},乙:{core:'温柔敏感，适应力极强，如藤蔓般灵活变通',career:'适合文艺、设计、咨询、花艺、时尚等行业',money:'善于理财，懂得细水长流，小钱变大钱',love:'感情细腻体贴，善解人意，但容易委屈自己',social:'人缘很好，八面玲珑，要注意别太随和丢主见'},丙:{core:'热情开朗，光明磊落，如太阳般温暖照耀他人',career:'适合销售、演艺、传媒、餐饮、能源等行业',money:'来财快但花得也快，要注意节制',love:'感情热烈奔放，喜欢轰轰烈烈，热度来得快退得也快',social:'天生社交达人，朋友遍天下，但要防小人利用'},丁:{core:'内敛聪慧，心思缜密，如烛火般温暖而专注',career:'适合科研、技术、文化、中医、心理咨询等',money:'财运稳定但偏保守，适合做长期投资',love:'感情专一深沉，重视精神交流，一旦爱了就很长久',social:'朋友不多但质量高，看人很准，内心丰富不轻露'},戊:{core:'稳重厚实，诚信可靠，如大山般沉稳包容',career:'适合地产、农业、金融、物流等行业，稳扎稳打',money:'偏财运不错，有意外之财，但要防借钱不还',love:'感情稳定持久，给人安全感，但要多制造浪漫',social:'值得信赖，别人有事第一个想到你，要学会拒绝'},己:{core:'包容万物，善于调和矛盾，如田园般滋养万物',career:'适合服务业、教育、HR、餐饮、农业等',money:'善于积少成多，不爱冒险但理财有道',love:'温和善解人意，容易吸引异性，但要学会表达感受',social:'人缘极好，是朋友圈润滑剂，防止被当老好人'},庚:{core:'果断刚毅，正义感强，如宝剑般锋利决断',career:'适合法律、金融、军警、外科医生等',money:'赚钱能力强但花钱大方，注意开源节流',love:'感情直接，爱憎分明，不喜欢拐弯抹角',social:'讲义气，朋友有困难一定帮，但脾气硬易冲突'},辛:{core:'精致细腻，审美独到，如珠玉般璀璨内敛',career:'适合珠宝、金融、美妆、艺术、品质管理等',money:'对钱敏感，善于发现商机，但过于谨慎会错过机会',love:'感情含蓄内敛，追求完美另一半，宁缺毋滥',social:'表面冷淡内心热情，交友有高标准重质量'},壬:{core:'智慧深邃，思维开阔，如大海般博大包容',career:'适合贸易、物流、科技、咨询、旅游等',money:'财运起伏大，适合做流动性强的生意',love:'感情丰富不受拘束，不喜欢被束缚，需要自由空间',social:'交友广泛三教九流都能聊，真心朋友需时间沉淀'},癸:{core:'敏锐灵动，善于洞察人心，如细雨般润物无声',career:'适合心理学、医学、占卜、文学、IT等',money:'偏财运好，常有意想不到的收入，但要注意别被骗',love:'感情深沉细腻，重视精神契合，容易暗恋',social:'朋友不多但都很铁，善于倾听，是天生心灵导师'}};
  const HM={木:{o:'肝胆',a:'多食绿蔬'},火:{o:'心脏',a:'适量运动'},土:{o:'脾胃',a:'饮食规律'},金:{o:'肺部',a:'远离烟尘'},水:{o:'肾脏',a:'充足睡眠'}};
  const gl=gen==='male'?'乾造':'坤造';
  const siS={旺:'得令强旺',相:'得气充足',休:'休囚需扶',囚:'受困宜补',死:'失令需生'}[si.st]||'平';
  const curveD=dy.ds.map((_,i)=>Math.round(Math.min(95,Math.max(30,50+Math.sin(i*.7)*20+Math.cos(i*.5)*10+(wx.c[GW[dy.ds[i].g]]||0)*5))));

  // 顶栏不再显示报告标题，命盘信息保留在报告正文中。

  let H='';

  H+=`<div class="sec active" id="s-ming">`;
  H+=renderQuickRead('ming',ctx);
  H+=renderBeginnerBrief('ming',ctx);

  H+=`<div class="glass card-2" data-card="bazi"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div><div class="card-tt">四柱八字</div><div class="card-st">${gl} · ${city.n} · ${b.sx}年 · ${b.ny}${b._meta&&b._meta.useTrueSolar?' · 真太阳时':''}</div></div></div>`;
  H+=`<div class="pls">${[{l:'年柱',p:b.Y,s:ss.yg},{l:'月柱',p:b.M,s:ss.mg},{l:'日柱',p:b.D,s:'日元',dm:1},{l:'时柱',p:b.H,s:ss.hg}].map(x=>`<div class="pl ${x.dm?'dm':''}" onclick="this.classList.toggle('open')"><div class="pl-l">${x.l}</div><div class="pl-g">${x.p.g}</div><div class="pl-z" style="color:${WC[ZW[x.p.z]]}">${x.p.z}</div><div class="pl-i"><span class="wdot" style="background:${WC[GW[x.p.g]]}"></span>${GW[x.p.g]} · ${x.s}</div><div class="pl-xd"><div style="padding-top:6px;font-size:.62em;color:rgba(255,255,255,.45);line-height:1.7;border-top:1px solid rgba(255,255,255,.06);margin-top:4px">${ZC[x.p.z].map((g,idx)=>`<div style="display:flex;align-items:center;gap:4px"><span class="wdot" style="background:${WC[GW[g]]}"></span><span style="color:rgba(255,255,255,.6)">${g}</span><span style="color:var(--ac-dim)">${SS[b.D.g][g]}</span><span style="font-size:.85em;color:rgba(255,255,255,.25)">${['主气','中气','余气'][idx]}</span></div>`).join('')}</div></div></div>`).join('')}</div>`;
  H+=`<div class="ig">${[['日主',`${dg}${dw}·${wx.st?'身旺':'身弱'}`],['命格',pa.join('、')],['用神',`<span style="color:${WC[wx.ys]}">${wx.ys}</span>`],['喜神',`<span style="color:${WX.includes(wx.xs)?WC[wx.xs]:'#fff'}">${wx.xs}</span>`],['纳音',b.ny],['四时',`${si.s}令·${siS}`]].map(x=>`<div class="ii"><div class="il">${x[0]}</div><div class="iv">${x[1]}</div></div>`).join('')}</div>`;
  H+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${getShenShaLabels(b).map(l=>`<span class="sstag" style="background:${l.bg};color:${l.co};border:1px solid ${l.bd}">${l.t}</span>`).join('')}</div>`;
  H+=`</div>`;

  H+=`<div class="glass card-2" data-card="wuxing"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/></svg></div><div><div class="card-tt">五行能量模型</div></div></div>`;
  H+=`${WX.map(w=>{const pc=Math.round(wx.c[w]/wx.t*100);const label=pc>=70?'极强':pc>=55?'偏强':pc>=40?'一般':pc>=25?'偏弱':'不足';return`<div class="wxr"><div class="wxl" style="color:${WC[w]}">${w}</div><div class="wxt"><div class="wxf" style="width:0%;background:${WC[w]}" data-w="${pc}%">${pc}%</div></div><div class="wxv">${pc}% ${label}</div></div>`}).join('')}`;
  H+=`<div class="at" style="margin-top:6px"><p>你属于典型的「<span class="hl">${wx.s}旺型人格</span>」${wx.s==='木'?'，行动力强，但容易精神内耗':wx.s==='火'?'，热情有感染力，但容易急躁':wx.s==='土'?'，稳重可靠，但容易固执':wx.s==='金'?'，果断锐利，但容易冷漠':''}。需要增强<span class="tg">${wx.w}</span>属性以平衡。</p></div></div>`;

  const persona=getPersona(dg,wx,wx.st,ss);
  H+=`<div class="glass card-2" data-card="persona"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><div class="card-tt">人格画像</div><div class="card-st">基于日主与格局推导</div></div></div>`;
  H+=`<div class="portrait-grid">${Object.entries(persona).map(([k,v])=>`<div class="port-item"><div class="port-label">${k}</div><div class="port-val">${v}</div></div>`).join('')}</div></div>`;

  const tlData=getTimeline(dy,by,wx,b,dg,gen,age);
  const tlMin=Math.min(...tlData.map(t=>t.sc)),tlMax=Math.max(...tlData.map(t=>t.sc));
  const cvW=300,cvH=70,padL=8,padR=8,padT=10,padB=14;
  const stepX=(cvW-padL-padR)/(tlData.length-1);
  const ptOf=(s,i)=>{const x=padL+i*stepX;const norm=tlMax===tlMin?0.5:(s-tlMin)/(tlMax-tlMin);const y=padT+(cvH-padT-padB)*(1-norm);return[x,y];};
  const pts=tlData.map((t,i)=>ptOf(t.sc,i));
  const pathD=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const areaD=pathD+` L${pts[pts.length-1][0].toFixed(1)} ${cvH-padB} L${pts[0][0].toFixed(1)} ${cvH-padB} Z`;
  const startYear=by+dy.sa;
  H+=`<div class="glass card-2" data-card="timeline"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div><div class="card-tt">人生时间线 · 大运十程</div><div class="card-st">${dy.sa}岁起运 · ${startYear}年入大运 · ${(b.Y.gi%2===0)===(gen==='male')?'顺':'逆'}排</div></div></div>`;
  H+=`<div class="tl-curve-wrap"><svg viewBox="0 0 ${cvW} ${cvH}" preserveAspectRatio="none" class="tl-curve"><defs><linearGradient id="tlGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".45"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs><path d="${areaD}" fill="url(#tlGrad)"/><path d="${pathD}" fill="none" stroke="var(--ac5)" stroke-width="1.5" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${tlData[i].active?3.5:2.2}" fill="${tlData[i].active?'var(--ac)':tlData[i].past?'rgba(255,255,255,.25)':'var(--ac5)'}"/>`).join('')}</svg><div class="tl-curve-axis">${tlData.map(t=>`<span class="${t.active?'on':''}">${t.as}</span>`).join('')}</div></div>`;
  H+=`<div class="tl-legend"><span><i style="background:var(--ac)"></i>当前大运</span><span><i style="background:rgba(255,255,255,.25)"></i>已过</span><span><i style="background:var(--ac5)"></i>未来</span></div>`;
  H+=`<div class="tl-list">${tlData.map(t=>{
    const stars='★★★★★'.split('').map((s,i)=>`<span style="color:${i<Math.round(t.sc/20)?t.tcol:'rgba(255,255,255,.12)'}">${s}</span>`).join('');
    const stateCls=t.active?'active':t.past?'past':'future';
    const msHtml=t.milestones.length?`<div class="tl-ms">${t.milestones.map(m=>`<span class="tl-ms-pill ${m.k}">${m.y}年·${m.age}岁·${m.t}</span>`).join('')}</div>`:'';
    return `<div class="tl-card ${stateCls}" onclick="this.classList.toggle(\'open\')">
      <div class="tl-card-hd">
        <div class="tl-card-l">
          <div class="tl-gz"><span style="color:${WC[t.gwx]}">${t.g}</span><span style="color:${WC[t.zwx]}">${t.z}</span></div>
          <div class="tl-meta"><span class="tl-ss">${t.gSS}</span><span class="tl-stage">${t.stage}</span></div>
        </div>
        <div class="tl-card-m">
          <div class="tl-age-r">${t.as}<span>~</span>${t.ae}<small>岁</small></div>
          <div class="tl-year-r">${t.ys} - ${t.ye}</div>
        </div>
        <div class="tl-card-r">
          <div class="tl-theme" style="color:${t.tcol}">${t.ico} ${t.theme}</div>
          <div class="tl-stars">${stars}<span class="tl-sc">${t.sc}</span></div>
        </div>
      </div>
      <div class="tl-detail">
        <div class="tl-quad">
          <div class="tl-q"><div class="tl-q-h">事业</div><div class="tl-q-b">${t.career}</div></div>
          <div class="tl-q"><div class="tl-q-h">财富</div><div class="tl-q-b">${t.money}</div></div>
          <div class="tl-q"><div class="tl-q-h">感情</div><div class="tl-q-b">${t.love}</div></div>
          <div class="tl-q"><div class="tl-q-h">健康</div><div class="tl-q-b">${t.health}</div></div>
        </div>
        ${msHtml}
      </div>
    </div>`;
  }).join('')}</div>`;
  H+=`<div class="tl-foot">※ 大运十年一变，干主前五年、支主后五年；分数为命局用神匹配度的相对参考。</div></div>`;
  H+=`</div>`;

  H+=`<div class="sec" id="s-yun">`;
  H+=renderQuickRead('yun',ctx);
  H+=renderBeginnerBrief('yun',ctx);
  H+=`<div class="glass card-1" data-card="trend"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 20h18M6 16V9M10 16V5M14 16V8M18 16V3"/></svg></div><div><div class="card-tt">${CURR_YEAR}年核心趋势</div><div class="card-st">${cLn.g}${cLn.z} ${cLn.sx}年 · ${lnSS}</div></div></div>`;
  H+=`<div class="y-hero">${[{l:'事业',v:cs,c:'#c8a45a'},{l:'财运',v:ws,c:'#d4a04a'},{l:'感情',v:ls,c:'#d4654a'},{l:'健康',v:hs,c:'#7ab648'}].map(x=>`<div class="y-hero-item"><div class="y-hero-label">${x.l}</div><div class="y-hero-stars">${'★★★★★'.split('').map((s,i)=>`<span style="color:${i<Math.round(x.v/20)?x.c:'rgba(255,255,255,0.12)'}">${s}</span>`).join('')}</div><div class="y-hero-score">${x.v}分</div></div>`).join('')}</div>`;
  H+=`<div class="at"><p>今年<span class="hl">${cLn.g}${cLn.z}</span>年，流年十神为「<span class="tg">${lnSS}</span>」。${cs>72?'整体势能向上，适合主动进取。':'整体以稳为主，厚积薄发。'}当前<span class="hl">${cDy.g}${cDy.z}</span>大运，${dySS.includes('官')?'事业压力与机遇并存':dySS.includes('财')?'财运通道打开':dySS.includes('印')?'适合学习沉淀':''}。</p></div></div>`;

  // —— 合并卡：⚠ 当下关注（本月 + 风险 + 健康）——
  const ma=getMonthlyAlert(b,wx);
  const risks=getRiskWarning(b,wx,lnSS,dySS);
  const _av_yun={g:wx.ys==='木'?'翡翠、木质饰品':wx.ys==='火'?'红玛瑙、紫水晶':wx.ys==='土'?'黄水晶、陶瓷':wx.ys==='金'?'白水晶、金属':'黑曜石、海蓝宝',f:wx.ys==='木'?'绿色蔬菜、酸味食物':wx.ys==='火'?'红色食物、苦味茶':wx.ys==='土'?'谷物、根茎类':wx.ys==='金'?'白色食品、百合':'黑色食品、海鲜'};
  // 严重度评估：决定默认显示哪个子 tab（任一子区如果"高风险"则定位过去）
  const hasHardRisk=risks.some(r=>!r.safe);
  const defaultFocus=hasHardRisk?'risk':(ma.risks&&ma.risks.length?'monthly':'risk');
  H+=`<div class="glass card-2 focus-card" data-card="focus"><div class="card-hd"><div class="card-ic" style="color:#d4654a;background:rgba(212,101,74,.12);border-color:rgba(212,101,74,.20)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="card-tt">⚠ 当下关注</div><div class="card-st">${getTodayGZ().split(' ').pop()} · 本月 · 风险 · 健康</div></div></div>`;
  // 子 tab 头
  H+=`<div class="focus-tabs">
    <button class="focus-tab ${defaultFocus==='monthly'?'active':''}" data-sub="monthly" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">🗓</span> 本月${ma.risks&&ma.risks.length?'<span class="focus-dot"></span>':''}</button>
    <button class="focus-tab ${defaultFocus==='risk'?'active':''}" data-sub="risk" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">⚡</span> 风险${hasHardRisk?'<span class="focus-dot red"></span>':''}</button>
    <button class="focus-tab ${defaultFocus==='health'?'active':''}" data-sub="health" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">⚕</span> 健康</button>
  </div>`;
  // monthly 子区
  H+=`<div class="focus-pane ${defaultFocus==='monthly'?'active':''}" data-sub="monthly">
    <div class="at"><p>${ma.msg}</p></div>
    ${ma.risks&&ma.risks.length?`<div class="risk-row" style="margin-top:6px">${ma.risks.map(r=>`<span class="risk-pill">⚡ ${r}</span>`).join('')}</div>`:'<div class="focus-empty">本月暂无突出提醒</div>'}
  </div>`;
  // risk 子区
  H+=`<div class="focus-pane ${defaultFocus==='risk'?'active':''}" data-sub="risk">
    <div class="risk-row">${risks.map(r=>`<span class="risk-pill ${r.safe?'safe':''}">${r.safe?'✓':'⚠'} ${r.t}</span>`).join('')}</div>
    <div class="at" style="font-size:.8em;margin-top:6px"><p>${risks.map(r=>`· ${r.t}：${r.d}`).join('<br>')}</p></div>
  </div>`;
  // health 子区
  H+=`<div class="focus-pane ${defaultFocus==='health'?'active':''}" data-sub="health">
    <div class="at"><p>最弱五行<span class="hl">${wx.w}</span>，重点关注<span class="tc">${HM[wx.w].o}</span>。${HM[wx.w].a}。</p><p>用神饰品推荐：<span class="hl">${_av_yun.g}</span>　·　日常多食<span class="hl">${_av_yun.f}</span>。</p></div>
  </div>`;
  H+=`</div>`;

  H+=`<div class="glass card-2" data-card="dayun"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 12c2-4 5-7 10-7s8 3 10 7c-2 4-5 7-10 7s-8-3-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="card-tt">大运时间轴</div></div></div>`;
  H+=`<div class="tl" id="daYunTl">${dy.ds.map((d,idx)=>{const c=age>=d.as&&age<=d.ae;const dySS=SS[dg][d.g];return`<div class="ti ${c?'cu':''}"><div class="ta">${d.as}-${d.ae}岁</div><div class="tg2">${d.g}${d.z}</div><div class="ty">${d.ys}-${d.ye}</div><div style="font-size:.55em;color:var(--ac-dim);margin-top:2px">${dySS}</div>${c?'<div class="tb">当前</div>':''}</div>`}).join('')}</div>`;
  H+=`<div class="crvw" style="margin:14px 0;padding:14px;background:rgba(255,255,255,0.03);border-radius:var(--rs)"><div style="font-size:.68em;color:rgba(255,255,255,0.3);font-weight:500;letter-spacing:1px;margin-bottom:8px">运势曲线</div><canvas id="cvC" width="700" height="170" style="width:100%;height:auto"></canvas></div></div>`;

  H+=`<div class="glass card-2" data-card="liuyue"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 20h18M6 16V9M10 16V5M14 16V8M18 16V3"/></svg></div><div><div class="card-tt">${CURR_YEAR}年流月</div><div class="card-st">点击月份查看详解</div></div></div><div class="lym-grid">${liuyue.map((lm,idx)=>{const now=new Date();const curMonth=now.getMonth();const isCur=(idx===curMonth);const lmSS=SS[dg][lm.gz.charAt(0)];return`<div class="lym-item ${isCur?'current':''}" onclick="openMonthModal(${idx},'${lm.name}','${lm.gz}','${lm.jq}','${lmSS}')"><div class="lym-name">${lm.name}</div><div class="lym-gz">${lm.gz}</div><div class="lym-jq">${lm.jq}</div><div class="lym-ss">${lmSS}</div></div>`}).join('')}</div></div>`;
  H+=`</div>`;

  const rmode=getRelationMode(dg,ss,gen);
  const stype=getSuitableType(wx,dg);
  const rrisks=getRelationRisks(wx,dg,ss);
  const layoffTrend=getLayoffAstroRisk(ctx);
  H+=`<div class="sec" id="s-rel">`;
  H+=renderQuickRead('rel',ctx);
  H+=renderBeginnerBrief('rel',ctx);
  H+=`<div class="glass card-1" data-card="loveMode"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div><div><div class="card-tt">感情模式</div></div></div>`;
  H+=`<div class="rel-mode"><div class="rel-mode-item hl">${rmode}</div></div>`;
  H+=`<div class="at"><p>你的感情底色带有「<span class="hl">${rmode}</span>」的特质。${P[dg].love}。在亲密关系中，${wx.st?'你习惯主导节奏，需注意给对方留出表达空间':'你习惯配合与迁就，需建立清晰的自我边界'}。</p></div></div>`;

  H+=`<div class="glass card-2" data-card="loveMatch"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg></div><div><div class="card-tt">适合对象</div></div></div>`;
  H+=`<div class="at"><p>从五行互补与十神配合来看，你更适合：<span class="hl">${stype}</span>。</p><p>对方的日主属性以<span class="tg">${wx.ys==='木'?'土金':wx.ys==='火'?'金水':wx.ys==='土'?'木水':wx.ys==='金'?'火木':'火土'}</span>为佳，能够补足你的用神能量。</p></div></div>`;

  H+=`<div class="glass card-2" data-card="loveRisk"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div><div class="card-tt">关系风险</div></div></div>`;
  H+=`<div class="risk-row">${rrisks.map(r=>`<span class="risk-pill">${r}</span>`).join('')}</div></div>`;

  H+=`<div class="glass card-1 layoff-card" data-card="layoffRisk"><div class="card-hd"><div class="card-ic" style="color:#d4b85a;background:rgba(212,184,90,.10);border-color:rgba(212,184,90,.18)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18M10 12v2h4v-2"/></svg></div><div><div class="card-tt">裁员风险检测</div><div class="card-st">现实职场信号 × 当前大运流年 · 评估未来3—6个月</div></div></div>`;
  H+=`<div class="layoff-method"><div class="layoff-method-title">检测逻辑：现实证据优先，命理只作趋势参考</div><div class="layoff-method-weight">现实信号 82% · 命理趋势 18%</div></div>`;
  H+=`<div class="layoff-trend"><div class="layoff-trend-score">${layoffTrend.score}</div><div class="layoff-trend-copy"><div class="layoff-trend-title">命理职场趋势：${layoffTrend.label}</div><div class="layoff-trend-text">${layoffTrend.reasons.length?layoffTrend.reasons.slice(0,2).join('；'):'当前周期未见明显职场冲击'} · 仅占综合评估18%</div></div></div>`;
  H+=`<div class="layoff-form">
    <div class="layoff-field"><label for="layoffCompany">公司经营状态</label><select id="layoffCompany"><option value="4">增长 / 持续招聘</option><option value="10" selected>基本稳定</option><option value="22">降本增效 / 招聘冻结</option><option value="32">亏损、融资失败或大幅收缩</option></select></div>
    <div class="layoff-field"><label for="layoffTeam">部门与编制</label><select id="layoffTeam"><option value="3">核心部门 / 扩编</option><option value="8" selected>正常运转</option><option value="20">预算冻结 / 不再补员</option><option value="30">合并、外包或明确裁撤</option></select></div>
    <div class="layoff-field"><label for="layoffPerf">最近绩效</label><select id="layoffPerf"><option value="0">优秀 / 超额完成</option><option value="5" selected>良好 / 达成目标</option><option value="22">连续低绩效 / 被书面提醒</option><option value="35">已进入 PIP / 改进计划</option></select></div>
    <div class="layoff-field"><label for="layoffRole">岗位不可替代性</label><select id="layoffRole"><option value="0">掌握关键客户 / 核心系统</option><option value="5" selected>专业岗位，有稳定产出</option><option value="12">工作可快速交接</option><option value="20">岗位重复 / 可外包或自动化</option></select></div>
  </div>`;
  H+=`<div class="layoff-signals-title">近期是否出现以下红旗？（可多选）</div><div class="layoff-signals" id="layoffSignals">
    <label class="layoff-check"><input type="checkbox" value="8" data-label="预算被砍、项目突然暂停">预算被砍、项目突然暂停</label>
    <label class="layoff-check"><input type="checkbox" value="8" data-label="被移出核心会议或工作被边缘化">被移出核心会议或工作被边缘化</label>
    <label class="layoff-check"><input type="checkbox" value="8" data-label="被要求异常详细地交接文档" data-critical="1">被要求异常详细地交接文档</label>
    <label class="layoff-check"><input type="checkbox" value="8" data-label="权限被回收或 HR 异常介入" data-critical="2">权限被回收或 HR 异常介入</label>
  </div>`;
  H+=`<div class="cta-row" style="margin-top:8px"><button class="cta" style="padding:12px 28px;font-size:.92em;letter-spacing:1px" onclick="calcLayoffRisk()">开始检测</button></div><div id="layoffResult" aria-live="polite"></div><div class="layoff-disclaimer">本工具用于风险筛查与行动规划，不构成法律、职业或投资建议；若已收到正式通知，请以劳动合同和当地法律为准。</div></div>`;

  H+=`<div class="glass card-1" data-card="relAi"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div><div class="card-tt">AI 关系分析</div><div class="card-st">输入对方信息，查看相处节奏与长期稳定性</div></div></div>`;
  H+=`<div class="hh-form" id="relForm"><div><div class="fd" style="margin-bottom:10px"><label>对方出生日期</label><input type="date" id="rDate" value="1992-08-20"></div><div class="fd" style="margin-bottom:10px"><label>对方出生时间</label><input type="time" id="rTime" value="06:00" style="font-family:var(--sf)"></div><div class="fd" style="margin-bottom:10px"><label>对方性别</label><select id="rGen"><option value="male">男</option><option value="female" selected>女</option></select></div></div></div>`;
  H+=`<div class="cta-row" style="margin-top:10px"><button class="cta" style="padding:12px 28px;font-size:.95em;letter-spacing:1px" onclick="calcRelation()">开始分析</button></div>`;
  H+=`<div id="relResult" style="margin-top:10px"></div></div>`;
  H+=`</div>`;

  

  const av={c:wx.ys==='木'?'青绿色':wx.ys==='火'?'红色、紫色':wx.ys==='土'?'黄色、棕色':wx.ys==='金'?'白色、银色':'黑色、蓝色',n:wx.ys==='木'?'3、8':wx.ys==='火'?'2、7':wx.ys==='土'?'5、0':wx.ys==='金'?'4、9':'1、6',d:wx.ys==='木'?'东方':wx.ys==='火'?'南方':wx.ys==='土'?'中央':wx.ys==='金'?'西方':'北方',g:wx.ys==='木'?'翡翠、木质饰品':wx.ys==='火'?'红玛瑙、紫水晶':wx.ys==='土'?'黄水晶、陶瓷':wx.ys==='金'?'白水晶、金属':'黑曜石、海蓝宝',t:wx.ys==='木'?'寅卯时（3-7点）':wx.ys==='火'?'巳午时（9-13点）':wx.ys==='土'?'辰丑时（7-9点,1-3点）':wx.ys==='金'?'申酉时（15-19点）':'亥子时（21-1点）',f:wx.ys==='木'?'绿色蔬菜、酸味食物':wx.ys==='火'?'红色食物、苦味茶':wx.ys==='土'?'谷物、根茎类':wx.ys==='金'?'白色食品、百合':'黑色食品、海鲜'};
  const todayJ=getTodayGZ();
  H+=`<div class="sec" id="s-adv">`;
  H+=renderBeginnerBrief('adv',ctx);
  H+=`<div class="glass card-1 tool-hub" data-card="toolHub"><div class="card-hd"><div class="card-ic">⌘</div><div><div class="card-tt">决策小工具</div><div class="card-st">把命盘提示转成当下可执行的选择</div></div></div><div class="tool-grid tool-grid-full"><button class="tool-tile" type="button" onclick="openToolPage('wealth')"><span>◉</span><b>财运与理财罗盘</b><small>收入节奏 · 理财取向</small></button><button class="tool-tile" type="button" onclick="openToolPage('career')"><span>↗</span><b>转行与副业测评</b><small>方向匹配 · 行动窗口</small></button><button class="tool-tile" type="button" onclick="openToolPage('date')"><span>◇</span><b>重要事项择日助手</b><small>事项提醒 · 时间建议</small></button><button class="tool-tile" type="button" onclick="openToolPage('style')"><span>✦</span><b>能量穿搭与工位风水</b><small>颜色 · 方位 · 元素</small></button><button class="tool-tile" type="button" onclick="openToolPage('layoff')"><span>⚠</span><b>裁员风险检测</b><small>现实信号 · 行动预案</small></button><button class="tool-tile" type="button" onclick="openToolPage('daily')"><span>☼</span><b>今日日签</b><small>宜忌 · 节奏 · 提醒</small></button><button class="tool-tile" type="button" onclick="openToolPage('name')"><span>名</span><b>智能起名工具</b><small>用字偏好 · 名称灵感</small></button><button class="tool-tile" type="button" onclick="openToolPage('oracle')"><span>☷</span><b>摇签问卜</b><small>聚焦问题 · 随机启示</small></button><button class="tool-tile" type="button" onclick="openToolPage('lottery')"><span>◎</span><b>双色球 / 大乐透</b><small>娱乐选号 · 理性提示</small></button><button class="tool-tile" type="button" onclick="openToolPage('zodiac')"><span>♧</span><b>生肖合冲分析</b><small>相处节奏 · 合作提醒</small></button><button class="tool-tile" type="button" onclick="openToolPage('relation')"><span>♡</span><b>AI 关系分析</b><small>双人信息 · 相处建议</small></button></div></div>`;
  H+=`<div class="glass card-1" data-card="todayAdv"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div><div class="card-tt">今日建议</div><div class="card-st">${todayJ}</div></div></div>`;
  H+=`<div class="adv-grid">`;
  H+=`<div class="adv-card"><div class="adv-hd">🟢 宜</div><div class="adv-body"><span class="adv-tag yi">谈合作</span><span class="adv-tag yi">学习充电</span><span class="adv-tag yi">制定计划</span><span class="adv-tag yi">整理房间</span></div></div>`;
  H+=`<div class="adv-card"><div class="adv-hd">🔴 忌</div><div class="adv-body"><span class="adv-tag ji">冲动消费</span><span class="adv-tag ji">情绪化沟通</span><span class="adv-tag ji">重大签约</span><span class="adv-tag ji">熬夜透支</span></div></div>`;
  H+=`<div class="adv-card"><div class="adv-hd">🧭 开运方向</div><div class="adv-body">幸运色：<span class="hl">${av.c}</span><br>有利方位：<span class="hl">${av.d}</span><br>旺运元素：<span class="hl">${wx.ys}</span><br>吉时：<span class="hl">${av.t}</span></div></div>`;
  H+=`<div class="adv-card"><div class="adv-hd">💼 职业建议</div><div class="adv-body">适合靠近<span class="hl">${wx.ys}</span>属性领域：<br>${wx.ys==='木'?'内容表达、品牌、教育、园艺':wx.ys==='火'?'能源、传媒、餐饮、互联网':wx.ys==='土'?'地产、金融、建筑、农业':wx.ys==='金'?'法律、机械、珠宝、精密制造':'贸易、物流、科技、旅游'}</div></div>`;
  H+=`</div></div>`;

  H+=`<div class="glass card-2" data-card="daySign"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="card-tt">今日日签</div><div class="card-st">${todayJ}</div></div></div>`;
  H+=`<div style="display:flex;gap:10px;align-items:center;padding:8px 0"><div style="flex:1;padding:14px 10px;border-radius:var(--rs);background:rgba(255,255,255,0.04);text-align:center;border:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background .2s" onmouseover="this.style.background='var(--ac3)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'" onclick="showRiQian()"><div style="font-size:1.2em;margin-bottom:4px">📜</div><div style="font-size:.78em;color:var(--ac-text);font-weight:500">查看今日日签</div><div style="font-size:.65em;color:rgba(255,255,255,0.35);margin-top:3px">宜忌 · 干支 · 吉凶</div></div></div></div>`;
  H+=`</div>`;

  document.getElementById('p2Inner').innerHTML=H;
  // —— 唯一全局上下文（_baziData / _reportData 作兼容别名）——
  ctx.P=P;ctx.shensha=shensha;ctx.liuyue=liuyue;ctx.zw=zw;ctx.qm=qm;ctx.mh=mh;
  organizeMasterReportLayout(ctx);
  window._ctx=ctx;
  window._baziData=ctx;
  window._reportData=ctx;

  requestAnimationFrame(()=>{
    document.querySelectorAll('.wxf,.ff').forEach(el=>{setTimeout(()=>{el.style.width=el.dataset.w},200)});
    const tl=document.getElementById('daYunTl');
    if(tl){const cu=tl.querySelector('.ti.cu');if(cu){cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});}}
  });
}

/* ====== 信息密度优化：速读卡 + 章节导航 ====== */
function renderBeginnerBrief(sec,d){
  let title='',portrait='',opportunity='',action='',tip='',scoreHtml='';
  if(sec==='ming'){
    const vals=Object.values(d.wx.c||{}),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:1;
    const deviation=vals.length?vals.reduce((s,v)=>s+Math.abs(v-avg),0)/vals.length:0;
    const balance=Math.max(55,Math.min(95,Math.round(92-deviation*13)));
    scoreHtml='<div class="beginner-score"><div class="bs-head"><span>命盘平衡度</span><b>'+balance+'<small>分</small></b></div><div class="bs-track"><i style="width:'+balance+'%"></i></div><p>'+ (balance>=80?'整体能量较均衡，适合稳定发挥优势。':balance>=65?'能量有明显侧重，适合扬长并补足短板。':'能量差异较明显，先稳住节奏、补足支持更重要。')+'</p></div>';
    title=d.wx.st?'你有推进事情的魄力，也容易对自己要求很高':'你观察细致、适应力强，做事更重感受与节奏';
    portrait=d.wx.st?'你通常愿意先站出来解决问题，适合负责需要推动、协调或决断的事。压力大时，容易把责任全揽在自己身上，反而消耗精力。':'你擅长理解环境和他人的需要，适合在准备充分后持续投入。压力大时，容易想得太多、迟迟不开始，需要给自己一个明确的截止时间。';
    opportunity='你更容易在长期积累中建立优势。与其同时追很多目标，不如选一个最想提升的方向，持续把作品、经验或成果做出来。';
    action='未来两周确定一个核心目标，把它拆成三个小步骤；先完成最容易开始的那一步。';
    tip='提醒：累的时候先调整节奏，不要用“硬撑”证明自己。';
  }else if(sec==='yun'){
    scoreHtml='<div class="beginner-score year-score"><div class="bs-head"><span>今年的状态评分</span><b>'+Math.round((d.cs+d.ws+d.ls+d.hs)/4)+'<small>分</small></b></div><div class="bs-score-grid"><span>事业 <b>'+d.cs+'</b></span><span>财富 <b>'+d.ws+'</b></span><span>感情 <b>'+d.ls+'</b></span><span>健康 <b>'+d.hs+'</b></span></div></div>';
    title='今年的主线是 '+(d.cs>72?'主动向前，把机会变成成果':'稳住基础，让选择更从容');
    portrait=d.cs>72?'工作和生活中会出现值得争取的窗口。重点不是做得更多，而是把精力放到真正能带来成长、认可或收入的事情上。':'外部节奏更适合先观察和打底。把已有工作做扎实、补齐能力短板，会比仓促改变方向更有收获。';
    opportunity=d.ws>68?'收入与合作有提升空间，适合谈清价值与回报；但面对看似快速的收益时，仍要先算清风险。':'财务上以稳定和可控为先。保留安全垫、避免情绪消费，会让你在机会来临时有更多主动权。';
    action=d.cs>72?'选一件想争取的事：本周完成一次沟通、投递或提案，不把计划只留在心里。':'列出当前最重要的三件事，先清掉最影响进度的一件，再考虑新的机会。';
    tip='提醒：重要决定尽量隔一晚确认，别在疲惫或焦虑时拍板。';
  }else if(sec==='rel'){
    title='你需要的关系，是能安心表达、也能彼此成长的关系';
    portrait=d.ls>68?'近期更适合增加轻松、自然的相处。你不必急着定义关系，用稳定的互动与真实回应建立信任会更有效。':'关系中更需要把话说清楚。与其反复猜测对方的意思，不如表达自己的感受与界限，反而能减少内耗。';
    opportunity='真正适合你的人，会尊重你的节奏，也愿意沟通现实问题。比起一时的热烈，更值得观察的是对方是否言行一致。';
    action='挑一个情绪平稳的时间，真诚说出一件你的期待；用“我感到……”开头，而不是指责对方。';
    tip='提醒：亲密不等于迁就，保留自己的生活与边界会让关系更健康。';
  }else{
    title='今天适合整理节奏，把注意力收回到自己身上';
    portrait='适合推进计划、学习和整理，也适合完成那些已经拖了一阵的小事。先让生活恢复秩序，心里的焦虑通常会跟着下降。';
    opportunity='与人合作时，把目标、时间和分工讲清楚，会比反复猜测更省力。今天不必追求完美，完成比纠结更重要。';
    action='选一件拖延的小事，在 20 分钟内开始；晚上花 5 分钟写下明天最重要的一件事。';
    tip='提醒：情绪上头时，暂缓消费、争论和重要决定。';
  }
  const basicHtml=sec==='ming'?`<div class="beginner-basic"><div><span>生肖</span><b>${d.b?.sx||'—'}</b></div><div><span class="basic-term" title="日主代表你自己的核心能量与性格底色">日主 <i>?</i></span><b>${d.dg||'—'}</b></div><div><span>有利方向</span><b>${d.wx?.ys||'—'}元素</b></div><div><span>当前大运</span><b>${d.dw?.g||''}${d.dw?.z||'—'}</b></div></div>`:'';
  return `<div class="beginner-brief"><div class="bb-eyebrow">新手解读报告</div>${basicHtml}<div class="bb-title">${title}</div>${scoreHtml}<div class="bb-row"><div class="bb-label">你现在的状态</div><div class="bb-text">${portrait}</div></div><div class="bb-row"><div class="bb-label">对你有利的方向</div><div class="bb-text">${opportunity}</div></div><div class="bb-row"><div class="bb-label">接下来怎么做</div><div class="bb-text bb-action">${action}</div></div><div class="bb-note">${tip}</div><button class="bb-master" type="button" onclick="setUserMode('master')">查看完整专业依据　→</button></div>`;
}
function organizeMasterReportLayout(ctx){
  const ming=document.getElementById('s-ming'),yun=document.getElementById('s-yun');
  if(!ming||!yun)return;
  // 命盘一览：将原速读标题调整为信息总览。
  const overview=ming.querySelector('.qr-title');if(overview)overview.textContent='命盘一览';
  // AI 摘要成为「命盘一览」的一部分，直接完整展示，不再额外展开。
  const overviewCard=ming.querySelector('.qr-card'),aiSum=ming.querySelector('.ai-sum');
  if(overviewCard&&aiSum){
    aiSum.classList.remove('glass','card-1','collapsible');aiSum.classList.add('overview-ai','expanded');
    const toggle=aiSum.querySelector('.ai-sum-toggle');if(toggle)toggle.remove();
    const acts=overviewCard.querySelector('.qr-acts');
    if(acts)acts.insertAdjacentElement('afterend',aiSum);else overviewCard.appendChild(aiSum);
  }
  // 命盘结构：四柱、五行、细盘、十神收进一个结构化主卡。
  const bazi=ming.querySelector('[data-card="bazi"]'),wuxing=ming.querySelector('[data-card="wuxing"]');
  const persona=ming.querySelector('[data-card="persona"]');
  if(bazi&&wuxing&&persona&&!ming.querySelector('.master-structure')){
    const structure=document.createElement('section');
    structure.className='glass card-1 master-structure';structure.dataset.card='structure';
    structure.innerHTML='<div class="card-hd"><div class="card-ic">⌘</div><div><div class="card-tt">命盘结构</div><div class="card-st">四柱、五行、细盘与十神关系</div></div></div><div class="structure-tabs" role="tablist"><button class="structure-tab active" type="button" data-structure="pillars" onclick="switchStructureTab(this)">四柱</button><button class="structure-tab" type="button" data-structure="elements" onclick="switchStructureTab(this)">五行</button><button class="structure-tab" type="button" data-structure="detail" onclick="switchStructureTab(this)">细盘</button><button class="structure-tab" type="button" data-structure="gods" onclick="switchStructureTab(this)">十神</button></div><div class="structure-panes"></div>';
    const grid=structure.querySelector('.structure-panes');
    const makePane=(key,node,active=false)=>{const pane=document.createElement('div');pane.className='structure-pane'+(active?' active':'');pane.dataset.structure=key;node.classList.add('structure-subcard');node.setAttribute('data-no-collapse','1');pane.appendChild(node);grid.appendChild(pane);};
    makePane('pillars',bazi,true);makePane('elements',wuxing);
    const details=document.createElement('div');details.className='structure-mini structure-subcard';
    const termLabel=t=>'<span class="glossary-term" data-term="'+t+'" onclick="showGlossPop(event)">'+t+'</span>';
    const finePillars=[['年柱',ctx.b.Y,ctx.ss.yg],['月柱',ctx.b.M,ctx.ss.mg],['日柱',ctx.b.D,'日主'],['时柱',ctx.b.H,ctx.ss.hg]];
    const fineTable='<table class="fine-table"><thead><tr><th>四柱</th>'+finePillars.map(x=>'<th>'+x[0]+'</th>').join('')+'</tr></thead><tbody><tr><td>天干</td>'+finePillars.map(x=>'<td class="fine-gan" style="color:'+WC[GW[x[1].g]]+'">'+x[1].g+'</td>').join('')+'</tr><tr><td>地支</td>'+finePillars.map(x=>'<td class="fine-zhi" style="color:'+WC[ZW[x[1].z]]+'">'+x[1].z+'</td>').join('')+'</tr><tr><td>'+termLabel('十神')+'</td>'+finePillars.map(x=>'<td>'+x[2]+'</td>').join('')+'</tr><tr><td>'+termLabel('五行')+'</td>'+finePillars.map(x=>'<td>'+GW[x[1].g]+' / '+ZW[x[1].z]+'</td>').join('')+'</tr><tr><td>'+termLabel('藏干')+'</td>'+finePillars.map(x=>'<td class="fine-hidden">'+(ZC[x[1].z]||[]).map(g=>g+'·'+(SS[ctx.dg][g]||'')).join('<br>')+'</td>').join('')+'</tr></tbody></table>';
    const shenSha=(ctx.shensha||[]).map(x=>x.n||x.t||x).filter(Boolean).slice(0,8).join('、')||'—';
    details.innerHTML='<div class="structure-mini-tt">细盘</div><div class="structure-mini-bd"><div class="fine-summary"><div><span>'+termLabel('日主')+'</span><b>'+ctx.dg+ctx.dw+'</b></div><div><span>旺衰</span><b>'+termLabel((ctx.wx&&ctx.wx.st)?'身旺':'身弱')+'</b></div><div><span>'+termLabel('月令')+'</span><b>'+ctx.si.s+'令 · '+ctx.si.st+'</b></div><div><span>'+termLabel('用神')+'</span><b style="color:'+WC[ctx.wx.ys]+'">'+ctx.wx.ys+'</b></div></div><div class="fine-section-label">四柱细项</div><div class="fine-table-wrap">'+fineTable+'</div><div class="fine-section-label">命局辅助信息</div><div class="fine-extra"><div><span>喜神</span><b>'+ctx.wx.xs+'</b></div><div><span>纳音</span><b>'+ctx.b.ny+'</b></div><div><span>神煞</span><b>'+shenSha+'</b></div><div><span>当前大运 / 流年</span><b>'+ctx.cDy.g+ctx.cDy.z+' / '+ctx.cLn.g+ctx.cLn.z+'</b></div></div><div class="mini-note">以日主为中心，结合月令、藏干、十神及五行分布进行综合判断；当前取向是借力 <b style="color:'+WC[ctx.wx.ys]+'">'+ctx.wx.ys+'</b> 属性，让整体能量更平衡。</div></div>';
    // 十神以日主为参照：严格区分同/异阴阳、天干透出与地支藏干层级。
    const godDefinitions={
      比肩:{relation:'同我·同阴阳',group:'比劫',meaning:'自我意志、同辈协作与平等竞争'},
      劫财:{relation:'同我·异阴阳',group:'比劫',meaning:'同侪竞争、资源分配与行动魄力'},
      食神:{relation:'我生·同阴阳',group:'食伤',meaning:'稳定输出、技能沉淀与生活感受'},
      伤官:{relation:'我生·异阴阳',group:'食伤',meaning:'创新表达、突破意识与批判思考'},
      偏财:{relation:'我克·同阴阳',group:'财星',meaning:'机会资源、经营意识与流动性收益'},
      正财:{relation:'我克·异阴阳',group:'财星',meaning:'日常收入、执行兑现与稳定积累'},
      七杀:{relation:'克我·同阴阳',group:'官杀',meaning:'挑战压力、执行魄力与风险意识'},
      正官:{relation:'克我·异阴阳',group:'官杀',meaning:'规则责任、职业秩序与边界感'},
      偏印:{relation:'生我·同阴阳',group:'印星',meaning:'独特学习、洞察研究与非标准路径'},
      正印:{relation:'生我·异阴阳',group:'印星',meaning:'学习支持、资格资源与稳定助力'}
    };
    const godPositions={};Object.keys(godDefinitions).forEach(k=>godPositions[k]={visible:[],hidden:[]});
    const stemPositions=[['年干',ctx.b.Y.g,ctx.ss.yg],['月干',ctx.b.M.g,ctx.ss.mg],['时干',ctx.b.H.g,ctx.ss.hg]];
    stemPositions.forEach(([pos,gan,god])=>{if(godPositions[god])godPositions[god].visible.push({pos,gan});});
    finePillars.forEach(([name,pillar])=>{
      (ZC[pillar.z]||[]).forEach((gan,index)=>{
        const god=SS[ctx.dg][gan];
        if(godPositions[god])godPositions[god].hidden.push({pos:name+'支',gan,level:['主气','中气','余气'][index]||'藏干',weight:[2,1.2,.7][index]||.7});
      });
    });
    const godRows=Object.entries(godDefinitions).map(([god,meta])=>{
      const pos=godPositions[god];
      const evidence=pos.visible.length*3+pos.hidden.reduce((sum,item)=>sum+item.weight,0);
      const state=pos.visible.length&&pos.hidden.length?'透干·有根':pos.visible.length?'透干':pos.hidden.length?'藏支':'未现';
      const tier=state==='未现'?'未见':evidence>=5?'显著':pos.visible.length?'可见':'潜藏';
      const stemText=pos.visible.length?'天干：'+pos.visible.map(x=>x.pos+'('+x.gan+')').join('、'):'';
      const branchText=pos.hidden.length?'地支：'+pos.hidden.map(x=>x.pos+'·'+x.level+'('+x.gan+')').join('、'):'';
      const where=[stemText,branchText].filter(Boolean).join('<br>')||'—';
      return '<tr class="'+(state==='未现'?'muted':'')+'"><td style="color:var(--ac-text);font-weight:600">'+termLabel(god)+'<small class="god-group">'+meta.group+'</small></td><td>'+meta.relation+'</td><td><b class="god-state '+(state==='未现'?'is-none':'')+'">'+state+'</b><small>'+tier+'</small></td><td class="god-location">'+where+'</td><td class="god-meaning">'+meta.meaning+'</td></tr>';
    }).join('');
    const gods=document.createElement('div');gods.className='structure-mini structure-subcard';
    gods.innerHTML='<div class="structure-mini-tt">十神</div><div class="structure-mini-bd"><div class="god-core-grid"><div><span>年干</span><b>'+termLabel(ctx.ss.yg)+'</b></div><div><span>月干</span><b>'+termLabel(ctx.ss.mg)+'</b></div><div><span>日主</span><b>'+ctx.dg+ctx.dw+'</b></div><div><span>时干</span><b>'+termLabel(ctx.ss.hg)+'</b></div></div><div class="god-method-note"><b>判读口径</b><span>以日主「'+ctx.dg+ctx.dw+'」为唯一参照，按五行生克与阴阳同异定十神；天干为“透干”，地支按主气／中气／余气记录。呈现层级仅说明本命盘出现位置，不替代旺衰、月令、通根、合冲及大运流年的综合判断。</span></div><button class="full-gods-btn" type="button" onclick="toggleFullGods(this)">查看完整十神 <span>▾</span></button><div class="full-gods" style="display:none;margin-top:9px;"><div class="fine-table-wrap god-table-wrap"><table class="fine-table god-table"><thead><tr><th>十神</th><th>五行关系</th><th>出现层级</th><th>位置（含藏干）</th><th>核心释义</th></tr></thead><tbody>'+godRows+'</tbody></table></div><div class="god-disclaimer">注：十神是传统命理中的关系模型，不等同于现实事件或人格定论；实际判断须结合命局整体与现实条件。</div></div></div>';
    makePane('detail',details);makePane('gods',gods);ming.insertBefore(structure,persona);
  }
  // 推理依据链：让大师版的结论有可回看的推导路径。
  if(persona&&!ming.querySelector('[data-card="reasoning"]')){
    const engine=ctx.tjx||{},strength=engine.strength||{},yong=engine.yongShen||{},pattern=engine.pattern||{};
    const adjust=engine.tiaoHou||{},ints=engine.interactions||{};
    const interactionBits=[];
    if((ints.gan_he||[]).length)interactionBits.push('天干合 '+ints.gan_he.length+' 组');
    if((ints.zhi_he||[]).length)interactionBits.push('地支合 '+ints.zhi_he.length+' 组');
    if((ints.zhi_chong||[]).length)interactionBits.push('地支冲 '+ints.zhi_chong.length+' 组');
    if((ints.zhi_xing||[]).length)interactionBits.push('刑 '+ints.zhi_xing.length+' 组');
    if((ints.zhi_hai||[]).length)interactionBits.push('害 '+ints.zhi_hai.length+' 组');
    const interactionText=interactionBits.length?interactionBits.join('；'):'本命四柱未见显著合冲刑害记录';
    const yongReasons=(yong.reasons||[]).slice(0,3).join('；')||'以命局平衡与实际表现综合判断';
    const chain=document.createElement('section');chain.className='glass card-2 reasoning-card';chain.dataset.card='reasoning';
    chain.innerHTML='<div class="card-hd"><div class="card-ic">⌘</div><div><div class="card-tt">命局判读依据</div><div class="card-st">按日主、月令、旺衰、十神与干支互动逐项复核</div></div></div>'
      +'<div class="reason-chain professional-chain"><span>日主定位</span><i>→</i><span>月令与旺衰</span><i>→</i><span>扶抑／调候</span><i>→</i><span>十神与互动</span><i>→</i><span>用神取向</span></div>'
      +'<div class="reason-evidence"><span>日主：<b>'+ctx.dg+ctx.dw+'</b></span><span>月令：<b>'+ctx.b.M.z+'月 · '+ctx.si.s+'令</b></span><span>格局：<b>'+((pattern.main)||((ctx.pa&&ctx.pa.join('、'))||'待综合'))+'</b></span><span>主用：<b style="color:'+WC[(yong.primary||ctx.wx.ys)]+'">'+(yong.primary||ctx.wx.ys)+'</b></span></div>'
      +'<div class="reason-list professional-reason-list">'
      +'<div><b>01 · 参照基点</b><span>以日主 <em>'+ctx.dg+ctx.dw+'</em> 为判断中心；月支 <em>'+ctx.b.M.z+'</em> 为当令环境。十神、五行及干支关系均以此为参照，不以单一生肖或单柱下结论。</span></div>'
      +'<div><b>02 · 旺衰与季节</b><span>旺衰模型结论为 <em>'+(strength.label||((ctx.wx&&ctx.wx.st)?'偏旺':'偏弱'))+'</em>'+(typeof strength.score==='number'?'（综合分 '+strength.score+'）':'')+'；结合得令、得地、得势等维度评估。月令调候参考：'+(adjust.primary?'优先取 <em>'+adjust.primary+'</em>'+(adjust.secondary?'，辅取 <em>'+adjust.secondary+'</em>':''):'以五行平衡为主')+'。</span></div>'
      +'<div><b>03 · 十神与结构</b><span>格局识别为 <em>'+(pattern.main||((ctx.pa&&ctx.pa.join('、'))||'待综合'))+'</em>'+(pattern.type?'（'+pattern.type+'）':'')+'。十神的透干、藏支、通根及所处柱位需配合查看；它描述关系结构，不直接等同于具体人物、财富或事件。</span></div>'
      +'<div><b>04 · 干支互动校验</b><span>'+interactionText+'。合、冲、刑、害仅作为结构变量参与判断，须与月令、用神及实际时间条件一并核对，不单独判吉凶。</span></div>'
      +'<div><b>05 · 取用与应用边界</b><span>当前以 <em style="color:'+WC[(yong.primary||ctx.wx.ys)]+'">'+(yong.primary||ctx.wx.ys)+'</em> 为主取向'+(yong.secondary?'，'+yong.secondary+' 为辅助':'')+'；依据：'+yongReasons+'。该取向用于整理行动节奏与观察重点，不替代健康、法律、财务等专业判断。</span></div>'
      +'</div>';
    persona.insertAdjacentElement('afterend',chain);
  }
  // 运势固定为：当年运势 → 人生时间线 → 流日流时 → 当年流月 → 大运时间轴。
  const trend=yun.querySelector('[data-card="trend"]'),timeline=ming.querySelector('[data-card="timeline"]'),focus=yun.querySelector('[data-card="focus"]'),months=yun.querySelector('[data-card="liuyue"]'),dayun=yun.querySelector('[data-card="dayun"]');
  if(trend){const title=trend.querySelector('.card-tt');if(title)title.textContent='当年运势';}
  if(timeline){timeline.querySelector('.card-tt').textContent='人生时间线';}
  if(focus){
    const title=focus.querySelector('.card-tt');if(title)title.textContent='流日流时';
    const st=focus.querySelector('.card-st');if(st)st.textContent='今日节奏 · 近期提醒 · 健康关注';
    if(!focus.querySelector('.flow-now')){
      const hour=new Date().getHours(),hourIndex=Math.floor(((hour+1)%24)/2);
      const hourZhi=DZ[hourIndex],fav=ctx.wx.ys==='木'?'3–7 点':ctx.wx.ys==='火'?'9–13 点':ctx.wx.ys==='土'?'7–9 点或 13–15 点':ctx.wx.ys==='金'?'15–19 点':'21–1 点';
      const flow=document.createElement('div');flow.className='flow-now';
      flow.innerHTML='<div><span>当前时段</span><b>'+hourZhi+'时</b></div><div><span>适合安排</span><b>'+((hour>=9&&hour<18)?'沟通、推进、处理要事':'复盘、整理、放松恢复')+'</b></div><div><span>有利时段</span><b>'+fav+'</b></div>';
      focus.querySelector('.focus-tabs').insertAdjacentElement('beforebegin',flow);
    }
  }
  [trend,timeline,focus,months,dayun].filter(Boolean).forEach(card=>yun.appendChild(card));

  // 关系页：以关系速读为入口，补齐亲密、朋友、亲人三类关系画像。
  const rel=document.getElementById('s-rel');
  if(rel&&!rel.querySelector('.relation-profile')){
    const relQuick=rel.querySelector('.qr-title');if(relQuick)relQuick.textContent='关系速读';
    const p=(ctx.P&&ctx.P[ctx.dg])||{};
    const style=typeof getRelationMode==='function'?getRelationMode(ctx.dg,ctx.ss,ctx.gen):'重视真诚与稳定的相处';
    const strong=ctx.wx.st?'习惯主动承担、推动关系进展':'习惯照顾他人感受、配合关系节奏';
    const pillars=[['年柱',ctx.b.Y,ctx.ss.yg],['月柱',ctx.b.M,ctx.ss.mg],['日柱',ctx.b.D,'日主'],['时柱',ctx.b.H,ctx.ss.hg]];
    const locateRoles=roles=>{const hit=[];pillars.forEach(([name,pillar,role])=>{if(roles.includes(role))hit.push(name+'天干');(ZC[pillar.z]||[]).forEach(g=>{if(roles.includes(SS[ctx.dg][g]))hit.push(name+'地支');});});return hit.length?hit.join('、'):'命盘中未明显出现';};
    const partnerRoles=ctx.gen==='male'?['正财','偏财']:['正官','七杀'];
    const partnerLabel=ctx.gen==='male'?'财星（伴侣信息）':'官杀（伴侣信息）';
    const partnerPos=locateRoles(partnerRoles),friendPos=locateRoles(['比肩','劫财']),familyPos=locateRoles(['正印','偏印']);
    const labels=(ctx.shensha||[]).map(x=>x.n||x.t||x).join('、');
    const peach=/(桃花|红艳|天喜|咸池)/.test(labels)?'有桃花类辅助信息':'未见明显桃花类辅助信息';
    const profile=document.createElement('section');profile.className='glass card-1 relation-profile';profile.dataset.card='intimacy';
    profile.innerHTML='<div class="card-hd"><div class="card-ic">♡</div><div><div class="card-tt">亲密关系画像</div><div class="card-st">你的表达方式、关系需求与相处建议</div></div></div><div class="relation-block"><div><span>关系模式</span><b>'+style+'</b></div><p>'+((p.love)||'重视真实回应与长期陪伴，希望在关系中获得理解与安全感。')+'</p></div><div class="relation-grid"><div><span>你的倾向</span><p>'+strong+'。</p></div><div><span>更适合的关系</span><p>尊重节奏、愿意沟通，也能把承诺落实到行动。</p></div></div><div class="relation-data"><span>命盘依据</span><b>'+partnerLabel+'：'+partnerPos+'</b><b>关系辅助：'+peach+'</b><b>当前感情评分：'+ctx.ls+' / 100</b></div><div class="relation-tip">相处建议：先表达感受与需求，再讨论解决方案；不要用猜测代替沟通。</div>';
    const friends=document.createElement('section');friends.className='glass card-1 relation-profile';friends.dataset.card='friends';
    friends.innerHTML='<div class="card-hd"><div class="card-ic">◌</div><div><div class="card-tt">朋友关系</div><div class="card-st">社交风格、合作边界与值得经营的人际连接</div></div></div><div class="relation-block"><div><span>社交底色</span><b>'+((p.social)||'重视可靠和长期互信，倾向在熟悉的人群中建立深度连接。')+'</b></div></div><div class="relation-grid"><div><span>你的优势</span><p>'+((ctx.wx.st)?'愿意出面承担、在团队中有推动力。':'善于倾听和协调，能照顾不同人的感受。')+'</p></div><div><span>需要留意</span><p>'+((ctx.wx.st)?'别把所有事都扛下来，合作前先明确分工。':'别因不想拒绝而透支自己，边界清晰反而更长久。')+'</p></div></div><div class="relation-data"><span>命盘依据</span><b>比劫（同辈 / 合作）：'+friendPos+'</b><b>五行状态：'+(ctx.wx.st?'自身能量偏强，合作中易主导':'自身能量偏弱，更适合借力协作')+'</b><b>当前事业评分：'+ctx.cs+' / 100</b></div><div class="relation-tip">经营建议：优先维系能互相支持、价值观接近的朋友；金钱与合作事项提前说清规则。</div>';
    const family=document.createElement('section');family.className='glass card-1 relation-profile';family.dataset.card='family';
    family.innerHTML='<div class="card-hd"><div class="card-ic">⌂</div><div><div class="card-tt">亲人关系</div><div class="card-st">家庭互动、责任感与更舒服的沟通方式</div></div></div><div class="relation-block"><div><span>家庭互动</span><b>'+((ctx.wx.st)?'你容易承担家庭中的责任与期待，也会希望自己的决定被理解。':'你很在意家庭氛围与亲人的感受，习惯先照顾整体和谐。')+'</b></div></div><div class="relation-grid"><div><span>相处优势</span><p>重视情义和长期陪伴，遇到重要事情愿意为家人投入时间。</p></div><div><span>成长课题</span><p>'+((ctx.wx.st)?'练习在承担之前先沟通边界，不必独自解决所有问题。':'练习直接表达自己的想法，不必为了和气一直压下需求。')+'</p></div></div><div class="relation-data"><span>命盘依据</span><b>印星（长辈 / 支持）：'+familyPos+'</b><b>月令状态：'+ctx.si.s+'令 · '+ctx.si.st+'</b><b>当前健康评分：'+ctx.hs+' / 100</b></div><div class="relation-tip">沟通建议：谈重要议题时先确认彼此关心的目标，再讨论具体做法，减少“谁对谁错”的拉扯。</div>';
    // 旧关系工具不纳入新的四段式主阅读流，保留数据但不干扰本页结构。
    rel.querySelectorAll('[data-card="loveMode"],[data-card="loveMatch"],[data-card="loveRisk"],[data-card="layoffRisk"],[data-card="relAi"]').forEach(el=>el.remove());
    const anchor=rel.querySelector('.beginner-brief')||rel.querySelector('.qr-card');
    if(anchor)anchor.insertAdjacentElement('afterend',profile);else rel.prepend(profile);
    profile.insertAdjacentElement('afterend',friends);friends.insertAdjacentElement('afterend',family);
  }
}
function switchStructureTab(btn){
  const card=btn.closest('.master-structure');if(!card)return;
  const key=btn.dataset.structure;
  card.querySelectorAll('.structure-tab').forEach(tab=>tab.classList.toggle('active',tab===btn));
  card.querySelectorAll('.structure-pane').forEach(pane=>pane.classList.toggle('active',pane.dataset.structure===key));
}
function toggleFullGods(btn){
  const panel=btn.parentElement.querySelector('.full-gods');if(!panel)return;
  const open=panel.classList.toggle('open');
  if(open) { panel.style.display = 'block'; } else { panel.style.display = 'none'; }
  btn.classList.toggle('open',open);
  btn.firstChild.textContent=open?'收起完整十神 ':'查看完整十神 ';
}
function renderQuickRead(secKey,d){
  if(!d)return '';
  const dg=d.dg,wx=d.wx,cDy=d.cDy,cLn=d.cLn,cLm=d.cLm;
  const items=[];
  if(secKey==='ming'){
    items.push({l:'日主',v:dg+wx.dw,c:wx.dw});
    items.push({l:'强弱',v:wx.st?'身旺':'身弱'});
    items.push({l:'用神',v:wx.ys,c:wx.ys});
    items.push({l:'格局',v:(d.pa&&d.pa[0])||'平和'});
    // 将原命盘摘要直接并入「命盘一览」的说明行，不再生成独立摘要模块。
    const persona=getPersona(dg,wx,wx.st,d.ss||{});
    const phase=(d.age||0)<28?'前期积累':(d.age||0)<38?'突破发力':(d.age||0)<48?'沉淀守成':'影响力期';
    const direction=wx.st?'适合把判断转为行动，在关键节点主动争取':'适合先借助资源与协作，再稳步推进自己的计划';
    const summary='命局以「<b>'+dg+wx.dw+'</b>」为本，'+(wx.st?'气场刚强宜主动':'气场柔顺宜借力')+'，关键在用神「<b style="color:'+WC[wx.ys]+'">'+wx.ys+'</b>」的把握。'+persona.思维+'；目前处于<b>'+phase+'</b>，'+direction+'，重点是保持稳定节奏，不必频繁改变方向。';
    return _qrCard('命盘速读',items,summary,[
      {k:'bazi',t:'查看四柱→'},{k:'wuxing',t:'五行结构→'}
    ]);
  }
  if(secKey==='yun'){
    items.push({l:'流年',v:cLn?cLn.g+cLn.z:'-',c:cLn?GW[cLn.g]:''});
    items.push({l:'十神',v:d.cLnSS||'-'});
    items.push({l:'事业',v:d.cs+'分'});
    items.push({l:'财运',v:d.ws+'分'});
    const tone=d.cs>72?'势能向上':d.cs>55?'平稳推进':'守势为主';
    const summary='今年「<b>'+(cLn?cLn.g+cLn.z:'-')+'</b>」流年十神「<b>'+d.cLnSS+'</b>」，整体'+tone+'。当前大运「<b>'+cDy.g+cDy.z+'</b>」（'+cDy.as+'~'+cDy.ae+'岁）'+(d.cDySS.includes('财')?'，财路已开':d.cDySS.includes('官')?'，仕途明朗':d.cDySS.includes('印')?'，宜学养沉淀':'，宜稳中求进')+'。';
    return _qrCard('运势速读',items,summary,[
      {k:'trend',t:'四维评分→'},{k:'dayun',t:'大运时间轴→'},{k:'liuyue',t:'本月详解→'}
    ]);
  }
  if(secKey==='rel'){
    const star=d.gen==='male'?'财星(妻)':'官星(夫)';
    const hasPeach=d.shensha&&d.shensha.some(x=>x.n==='桃花'||x.n==='红艳');
    items.push({l:'配偶星',v:star});
    items.push({l:'桃花',v:hasPeach?'命带':'不显'});
    items.push({l:'感情节奏',v:wx.st?'主导型':'迁就型'});
    items.push({l:'流年合婚',v:d.cLnSS.includes(d.gen==='male'?'财':'官')?'利结合':'宜深耕'});
    const summary='你的'+star+'代表伴侣特质，性格上属于「<b>'+(wx.st?'主导型':'迁就型')+'</b>」。'+(hasPeach?'命带桃花，异性缘充足但需筛选；':'桃花不显，缘分多来自熟人介绍；')+(d.cLnSS.includes(d.gen==='male'?'财':'官')?'今年配偶星到位，未婚利结合。':'今年感情节奏偏稳，宜深耕已有关系。');
    return _qrCard('关系速读',items,summary,[
      {k:'loveMode',t:'相处模式→'},{k:'loveMatch',t:'适合对象→'}
    ]);
  }
  return '';
}
function _qrCard(title,items,summary,actions){
  const itemsHtml=items.map(it=>`<div class="qr-item"><div class="qr-l">${it.l}</div><div class="qr-v"${it.c&&WC[it.c]?' style="color:'+WC[it.c]+'"':''}>${it.v}</div></div>`).join('');
  const actsHtml=(actions||[]).map(a=>`<button class="qr-act" onclick="jumpTo(null,'${a.k}')">${a.t}</button>`).join('');
  return `<div class="qr-card"><div class="qr-head"><span class="qr-badge">速读</span><span class="qr-title">${title}</span></div><div class="qr-grid">${itemsHtml}</div><div class="qr-summary">${summary}</div><div class="qr-acts">${actsHtml}</div></div>`;
}

function buildAISummary(b,wx,ss,dy,ln,pa,P,gen,si,age){
  // —— 与 renderAll 共享 ctx，保证 AI 摘要与界面显示完全一致 ——
  const _c=getCtx();
  const cDy=(_c&&_c.cDy)||TJ.findDaYun(dy,age);
  const cLn=(_c&&_c.cLn)||TJ.findLiuNian(ln,CURR_YEAR);
  const dg=b.D.g;
  const persona=P[dg]||P['甲'];
  const phase=age<28?'前期积累':age<38?'突破发力':age<48?'沉淀守成':'影响力期';
  return`你属于典型的「<span class="hl">${wx.ys}${wx.st?'成长型':'滋养型'}</span>命格」。${persona.core.substring(0,20)}。前期${age<30?'积累较慢，但30岁后':'有所积累，'}<span class="hl">${phase}</span>事业运${cDy.g===wx.ys?'明显增强':'趋于稳健'}。<br><br>适合：<br>· ${persona.career.split('、').slice(0,3).join('、')}<br><br>当前阶段最需要：<span class="hl">稳定节奏，而不是频繁改变方向</span>。${wx.st?'身旺能担财官，宜主动出击':'身弱喜印比扶身，宜借势借力'}。`;
}

function calcRelation(){
  const d=window._baziData;if(!d)return;
  const rd=document.getElementById('rDate').value,rt=document.getElementById('rTime').value||'06:00',rg=document.getElementById('rGen').value;
  if(!rd)return alert('请填写对方出生日期');
  const [y2,m2,d02]=rd.split('-').map(Number),[hh2,mm2]=rt.split(':').map(Number);
  const r2=resolveBirthDateTime(y2,m2,d02,hh2,mm2,false);
  const b2=mkBazi(r2.year,r2.month,r2.day,r2.hourZhi);
  const wx2=mkWx(b2),ss2=mkSs(b2);
  let score=65,notes=[];
  const sxMatch={鼠:'牛',牛:'鼠',虎:'猪',猪:'虎',兔:'狗',狗:'兔',龙:'鸡',鸡:'龙',蛇:'猴',猴:'蛇',马:'羊',羊:'马'};
  const sxChong={鼠:'马',马:'鼠',牛:'羊',羊:'牛',虎:'猴',猴:'虎',兔:'鸡',鸡:'兔',龙:'狗',狗:'龙',蛇:'猪',猪:'蛇'};
  if(sxMatch[d.b.sx]===b2.sx){score+=10;notes.push('生肖相合，属相投缘');}
  else if(sxChong[d.b.sx]===b2.sx){score-=8;notes.push('生肖相冲，需更多包容');}
  const dg1=d.b.D.g,dg2=b2.D.g;
  const ganHe={'甲':'己','己':'甲','乙':'庚','庚':'乙','丙':'辛','辛':'丙','丁':'壬','壬':'丁','戊':'癸','癸':'戊'};
  if(ganHe[dg1]===dg2){score+=8;notes.push('日干天合，精神契合度高');}
  const w1s=Object.entries(d.wx.c).sort((a,b)=>b[1]-a[1])[0][0],w1w=Object.entries(d.wx.c).sort((a,b)=>a[1]-b[1])[0][0];
  const w2s=Object.entries(wx2.c).sort((a,b)=>b[1]-a[1])[0][0],w2w=Object.entries(wx2.c).sort((a,b)=>a[1]-b[1])[0][0];
  if(w1s===w2w||w2s===w1w){score+=6;notes.push('五行互补，如天作之合');}
  score=Math.max(30,Math.min(99,score));
  const grade=score>=85?'上婚（极佳）':score>=70?'中婚（良好）':score>=55?'下婚（一般）':'需慎重';
  const gColor=score>=85?'#7ab648':score>=70?'#c8a45a':score>=55?'#d4a04a':'#d4654a';
  let H=`<div class="glass card-2"><div class="card-hd"><div class="card-ic">💞</div><div><div class="card-tt">AI 关系分析结果</div></div></div>`;
  H+=`<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div style="flex:1"><div style="font-size:1.8em;font-weight:700;color:${gColor}">${score}分</div><div style="font-size:.78em;color:rgba(255,255,255,0.4)">${grade}</div></div><div style="flex:2"><div class="hh-bar"><div class="hh-fill" style="width:0%;background:${gColor}" data-w="${score}%"></div></div></div></div>`;
  H+=`<div style="font-size:.82em;line-height:1.8;color:rgba(255,255,255,0.6)">${notes.map(t=>`· ${t}`).join('<br>')}</div>`;
  H+=`<div class="at"><h4>相处节奏</h4><p>${d.gen==='male'?'男方':'女方'}日主${dg1}，${d.gen==='male'?'女方':'男方'}日主${dg2}。${ganHe[dg1]===dg2?'双方天干相合，初期吸引力强，相处节奏偏快':'双方天干无明显合冲，相处节奏循序渐进，需时间磨合'}。</p>`;
  H+=`<h4>冲突点</h4><p>${sxChong[d.b.sx]===b2.sx?'生肖相冲，价值观与生活习惯差异较大，遇事容易对立':'无明显生肖冲克，冲突多来自沟通方式而非本质矛盾'}。</p>`;
  H+=`<h4>长期稳定性</h4><p>综合评分<span class="hl">${score}分</span>，属于<span class="hl">${grade}</span>。${score>=70?'长期稳定性良好，若能共同经营，白头偕老概率高':'需要双方持续投入经营，通过五行互补与环境调和可大幅提升稳定性'}。</p></div></div>`;
  document.getElementById('relResult').innerHTML=H;
  requestAnimationFrame(()=>{document.querySelectorAll('.hh-fill').forEach(el=>setTimeout(()=>el.style.width=el.dataset.w,150));});
}

function drawCurve(data,dys,age){
  const cv=document.getElementById('cvC');if(!cv)return;
  if(!cv.offsetParent){setTimeout(()=>drawCurve(data,dys,age),50);return;}
  if(!data||!data.length||data.length<2)return;
  const dpr=window.devicePixelRatio||1;const rect=cv.getBoundingClientRect();
  const cssW=Math.max(1,Math.round(rect.width)),cssH=170;
  if(cv.width!==Math.round(cssW*dpr)||cv.height!==Math.round(cssH*dpr)){cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);cv.style.width=cssW+'px';cv.style.height=cssH+'px';}
  const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.scale(dpr,dpr);
  const w=cssW,h=cssH;const p={t:14,b:26,l:30,r:14},cw=w-p.l-p.r,ch=h-p.t-p.b;
  [0,50,100].forEach(v=>{const y=p.t+ch-(v/100)*ch;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.stroke()});
  const grad=ctx.createLinearGradient(0,p.t,0,h-p.b);const _ac=window._accentRGB||[200,164,90];grad.addColorStop(0,`rgba(${_ac},0.18)`);grad.addColorStop(1,`rgba(${_ac},0)`);
  ctx.beginPath();data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.lineTo(p.l+(data.length-1)*(cw/(data.length-1)),p.t+ch);ctx.lineTo(p.l,p.t+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.strokeStyle=`rgba(${_ac},0.5)`;ctx.lineWidth=2;ctx.stroke();
  data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;const cu=age>=dys[i].as&&age<=dys[i].ae;ctx.beginPath();ctx.arc(x,y,cu?5:2.5,0,Math.PI*2);ctx.fillStyle=cu?`rgb(${_ac})`:`rgba(${_ac},.35)`;ctx.fill();if(cu){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.strokeStyle=`rgba(${_ac},.2)`;ctx.lineWidth=2;ctx.stroke()}ctx.fillStyle='rgba(255,255,255,.25)';ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillText(dys[i].g+dys[i].z,x,h-p.b+11);ctx.fillText(dys[i].as+'岁',x,h-p.b+20);});
}

function copyReport(){
  const d=getCtx();if(!d){alert('暂无可复制的报告');return;}
  const cDy=d.cDy,cLn=d.cLn;
  const lines=[
    '【问问大师·八字命理报告】',
    `${d.b.Y.g}${d.b.Y.z}年 ${d.b.M.g}${d.b.M.z}月 ${d.b.D.g}${d.b.D.z}日 ${d.b.H.g}${d.b.H.z}时 · ${d.gl} · ${d.age}岁`,
    `日主：${d.dg}${d.dw} · ${d.wx.st?'身旺':'身弱'} · 用神${d.wx.ys}/喜神${d.wx.xs}`,
    `格局：${d.pa?d.pa.join('、'):'-'} · 纳音${d.b.ny}`,
    cDy?`当前大运：${cDy.g}${cDy.z}（${cDy.as}~${cDy.ae}岁，十神:${d.dySS}）`:'',
    cLn?`${CURR_YEAR}流年：${cLn.g}${cLn.z}${cLn.sx}年（十神:${d.lnSS}）`:'',
    `${CURR_YEAR}年运势 — 事业${d.cs} / 财富${d.ws} / 感情${d.ls} / 健康${d.hs}`,
    d.P&&d.P[d.dg]?`性格：${d.P[d.dg].core}`:'',
    d.P&&d.P[d.dg]?`事业：${d.P[d.dg].career}`:'',
    '',
    '— 由问问大师·东方人生决策系统生成'
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(lines).then(()=>alert('报告摘要已复制'),()=>alert('复制失败，请手动选择文本'));
}

function showPage2(){document.body.classList.add('report-active');document.getElementById('page1').classList.add('hidden');const p2=document.getElementById('page2');p2.classList.remove('hidden');p2.classList.add('active');document.getElementById('tabBar').classList.add('show');document.getElementById('p2Scroll').scrollTop=0;if(typeof resetGlossaryState==='function')resetGlossaryState();requestAnimationFrame(()=>{if(typeof window._rebindTilt==='function')window._rebindTilt();if(typeof window._injectCardToggles==='function')window._injectCardToggles();const a=document.querySelector('.tab-item.active');if(a&&typeof moveTabIndicator==='function')moveTabIndicator(a);});}
function goBack(){document.body.classList.remove('report-active');applyTheme('土');['page2'].forEach(id=>{document.getElementById(id).classList.remove('active');document.getElementById(id).classList.add('hidden');});document.getElementById('page1').classList.remove('hidden');document.getElementById('tabBar').classList.remove('show');document.getElementById('lgPanel').classList.remove('open');}
function scrollToForm(){document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'center'});}

function openDecisionTool(){
  const el=document.getElementById('toolResult');if(!el)return;
  el.innerHTML='<div class="tool-panel"><div class="tool-panel-title">决策窗口</div><div class="tool-choice"><button onclick="runDecisionTool(\'跳槽\')">跳槽</button><button onclick="runDecisionTool(\'创业\')">创业</button><button onclick="runDecisionTool(\'投资\')">投资</button></div><div class="tool-panel-note">选择事项后，结合当前大运与流年给出行动窗口与风险提醒。</div></div>';
}
function runDecisionTool(scene){
  const d=getCtx(),el=document.getElementById('toolResult');if(!d||!el)return;
  const r=getDecisionAdvice(d.b,d.wx,d.dy,d.ln,scene);
  el.innerHTML='<div class="tool-panel"><div class="tool-panel-title">'+scene+' · '+r.label+'</div><div class="tool-answer"><div><span>行动窗口</span><b>'+r.window+'</b></div><div><span>主要风险</span><b>'+r.risk+'</b></div><div class="wide"><span>建议</span><b>'+r.advice+'</b></div></div><button class="tool-back" onclick="openDecisionTool()">← 重新选择</button></div>';
}
function openFocusTool(){
  const el=document.getElementById('toolResult');if(!el)return;
  el.innerHTML='<div class="tool-panel"><div class="tool-panel-title">今日三件事</div><div class="focus-checks"><label><input type="checkbox"> 完成最重要的一件推进事项</label><label><input type="checkbox"> 主动沟通或回复一位关键联系人</label><label><input type="checkbox"> 留出 20 分钟整理与复盘</label></div><div class="tool-panel-note">不追求做很多，只完成这三件中的一件，就已经在向前。</div></div>';
}
function openBreathTool(){
  const el=document.getElementById('toolResult');if(!el)return;
  el.innerHTML='<div class="tool-panel breath-panel"><div class="tool-panel-title">一分钟暂停</div><div class="breath-circle" id="breathCircle">准备</div><div class="tool-panel-note" id="breathText">跟随圆环：吸气 4 秒，停留 2 秒，呼气 6 秒。</div><button class="tool-back" onclick="startBreathTool()">开始 1 分钟</button></div>';
}
function startBreathTool(){
  const circle=document.getElementById('breathCircle'),text=document.getElementById('breathText');if(!circle||!text)return;
  let left=60;circle.classList.add('run');
  const tick=()=>{const phase=(60-left)%12;if(phase<4){circle.textContent='吸气';text.textContent='慢慢吸气 4 秒';}else if(phase<6){circle.textContent='停留';text.textContent='轻轻停留 2 秒';}else{circle.textContent='呼气';text.textContent='缓慢呼气 6 秒';}if(left--<0){clearInterval(timer);circle.classList.remove('run');circle.textContent='完成';text.textContent='现在再回来看你的选择：先做最小的一步。';}};tick();const timer=setInterval(tick,1000);
}
function closeToolPage(){document.getElementById('toolModal').classList.remove('open');if(window._returnToAI){window._returnToAI=false;setTimeout(()=>openAsk(),120);}}
function toolPageShell(title,sub,body){return '<div class="tool-page-title">'+title+'</div><div class="tool-page-sub">'+sub+'</div>'+body;}
function openToolPage(type){
  window._activeTool=type;
  const d=getCtx(),modal=document.getElementById('toolModal'),out=document.getElementById('toolModalContent');
  if(!d||!modal||!out)return;
  const av={color:d.wx.ys==='木'?'青绿':d.wx.ys==='火'?'红紫':d.wx.ys==='土'?'黄棕':d.wx.ys==='金'?'白银':'黑蓝',dir:d.wx.ys==='木'?'东方':d.wx.ys==='火'?'南方':d.wx.ys==='土'?'中央':d.wx.ys==='金'?'西方':'北方'};
  const data=(items,note='')=>'<div class="tool-page-data">'+items.map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>'+(note?'<div class="tool-page-note">'+note+'</div>':'');
  if(type==='wealth')out.innerHTML=toolPageShell('财运与理财罗盘','命盘趋势 + 你的现金流输入，生成可执行的理财优先级。',data([['当前财运',d.ws+' / 100'],['财富节奏',d.ws>=70?'可争取增收与谈价':'以稳健积累为主'],['命盘取向',d.wx.st?'分散配置，避免追高':'先建立储蓄与安全垫'],['数据边界','不构成投资建议']])+'<div class="tool-form-row"><input id="wealthIncome" type="number" placeholder="月到手收入"><input id="wealthCost" type="number" placeholder="月固定支出"><input id="wealthCash" type="number" placeholder="现有储蓄"></div><div class="tool-form-row"><button class="tool-primary" onclick="runWealthTool()">生成现金流方案</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='career')out.innerHTML=toolPageShell('转行与副业测评','命盘阶段 + 现实准备度，输出转行与副业的行动方案。',data([['当前事业',d.cs+' / 100'],['流年重点',d.cLnSS||'稳定积累'],['大运阶段',d.cDy.g+d.cDy.z],['评估原则','能力、现金流、机会同步判断']])+'<div class="tool-form-row"><select id="careerGoal"><option>转行</option><option>副业</option><option>创业</option></select><select id="careerReady"><option value="1">已有技能与作品</option><option value="2">有方向，仍需准备</option><option value="3">尚未明确方向</option></select></div><div class="tool-form-row"><button class="tool-primary" onclick="runCareerTool()">开始测评</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='date')out.innerHTML=toolPageShell('重要事项择日助手','选择事项与目标日期，生成准备清单和沟通提醒。','<div class="tool-form-row"><select id="dateEvent"><option>签约合作</option><option>面试入职</option><option>搬家出行</option><option>表白沟通</option></select><input id="dateTarget" type="date"></div><div class="tool-form-row"><button class="tool-primary" onclick="runDateTool()">生成准备方案</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='style')out.innerHTML=toolPageShell('能量穿搭与工位风水','按场景输出穿搭、桌面和专注环境建议。',data([['有利元素',d.wx.ys],['推荐颜色',av.color+'系'],['有利方位',av.dir],['基础原则','舒适、整洁、光线稳定']])+'<div class="tool-form-row"><select id="styleScene"><option>重要沟通</option><option>面试汇报</option><option>专注工作</option><option>休息恢复</option></select><button class="tool-primary" onclick="runStyleTool()">生成方案</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='layoff')out.innerHTML=toolPageShell('裁员风险检测','现实风险信号 + 现金流缓冲 + 当前事业节奏，生成行动预案。','<div class="tool-form-row"><select id="layoffSignal"><option value="1">公司稳定，岗位核心</option><option value="2">业务调整，工作可交接</option><option value="3">部门收缩，已有明确信号</option></select><select id="layoffBuffer"><option value="1">储蓄可覆盖 6 个月以上</option><option value="2">储蓄可覆盖 3—6 个月</option><option value="3">储蓄不足 3 个月</option></select></div><div class="tool-form-row"><select id="layoffMarket"><option value="1">简历与作品集已更新</option><option value="2">有零散机会但未准备</option><option value="3">尚未准备求职渠道</option></select><button class="tool-primary" onclick="runLayoffTool()">生成预案</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='daily')out.innerHTML=toolPageShell('今日日签','选择今天最想聚焦的方向，生成一页专属行动日签。',data([['今日',''+getTodayGZ()],['有利元素',d.wx.ys+' · '+av.color+' · '+av.dir],['今日基调','先完成，再优化'],['使用方式','选择一个重点后生成日签']])+'<div class="tool-form-row"><select id="dailyFocus"><option>推进工作</option><option>关系沟通</option><option>学习积累</option><option>休息恢复</option></select><button class="tool-primary" onclick="runDailyTool()">生成日签</button></div>');
  else if(type==='name')out.innerHTML=toolPageShell('智能起名工具','输入姓氏与偏好，生成用字方向与名称灵感。','<div class="tool-form-row"><input id="nameSurname" placeholder="输入姓氏"><select id="nameStyle"><option>简洁现代</option><option>温润典雅</option><option>大气坚定</option></select><button class="tool-primary" onclick="runNameTool()">生成</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='oracle')out.innerHTML=toolPageShell('摇签问卜','将问题聚焦到一件可行动的事，随机签文用于自我反思。','<div class="tool-form-row"><select id="oracleArea"><option>事业选择</option><option>关系沟通</option><option>财富计划</option><option>内在状态</option></select><input id="oracleQuestion" placeholder="例如：这周是否该主动沟通？"></div><div class="tool-form-row"><button class="tool-primary" onclick="runOracleTool()">摇三签</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='lottery')out.innerHTML=toolPageShell('双色球 / 超级大乐透','随机组合仅供娱乐；不使用命盘预测中奖，也不建议超出娱乐预算。','<div class="tool-form-row"><select id="lotteryType"><option value="ssq">双色球</option><option value="dlt">超级大乐透</option></select><select id="lotteryCount"><option value="1">1 注</option><option value="3">3 注</option><option value="5">5 注</option></select></div><div class="tool-form-row"><button class="tool-primary" onclick="runLotteryTool()">生成随机组合</button></div><div class="tool-output" id="toolOutput"></div>');
  else if(type==='zodiac')out.innerHTML=toolPageShell('生肖合冲分析','基于你的生肖 '+d.b.sx+'，查看与对方生肖的相处提醒。','<div class="tool-form-row"><select id="zodiacOther"><option>鼠</option><option>牛</option><option>虎</option><option>兔</option><option>龙</option><option>蛇</option><option>马</option><option>羊</option><option>猴</option><option>鸡</option><option>狗</option><option>猪</option></select><button class="tool-primary" onclick="runZodiacTool()">开始分析</button></div><div class="tool-output" id="toolOutput"></div>');
  else out.innerHTML=toolPageShell('AI 关系分析','输入关系类型与对方基本信息，生成可沟通的相处方案。','<div class="tool-form-row"><input id="relName" placeholder="对方称呼（可选）"><select id="relFocus"><option>亲密关系</option><option>朋友合作</option><option>家人沟通</option></select></div><div class="tool-form-row"><input id="relDate" type="date" aria-label="对方出生日期"><button class="tool-primary" onclick="runRelationTool()">开始分析</button></div><div class="tool-output" id="toolOutput"></div>');
  modal.classList.add('open');
}
function setToolOutput(html){
  const out=document.getElementById('toolModalContent');if(!out)return;
  const names={wealth:'财运与理财罗盘',career:'转行与副业测评',date:'重要事项择日助手',style:'能量穿搭与工位风水',layoff:'裁员风险检测',daily:'今日日签',name:'智能起名工具',oracle:'摇签问卜',lottery:'双色球 / 超级大乐透',zodiac:'生肖合冲分析',relation:'AI 关系分析'};
  const name=names[window._activeTool]||'工具结果';
  out.innerHTML='<div class="tool-result-page"><div class="tool-result-kicker">结果分析</div><div class="tool-page-title">'+name+'</div><div class="tool-page-sub">以下结果结合你的输入与当前命盘参考生成。</div><div class="tool-result-body">'+html+'</div><div class="tool-result-actions"><button class="tool-secondary" onclick="openToolPage(window._activeTool)">← 返回修改</button><button class="tool-primary" onclick="closeToolPage()">完成</button></div></div>';
}
function runWealthTool(){const income=+document.getElementById('wealthIncome').value,cost=+document.getElementById('wealthCost').value,cash=+document.getElementById('wealthCash').value,d=getCtx();if(!income||cost<0){setToolOutput('请先填写有效的月到手收入与固定支出。');return;}const surplus=Math.max(0,income-cost),months=cost?Math.floor(cash/cost):0,rate=Math.round(surplus/income*100);setToolOutput('每月结余约 '+surplus+'，结余率 '+rate+'%。当前储蓄可覆盖约 '+months+' 个月固定支出。优先级：'+(months<3?'先补足 3—6 个月应急金，再考虑高波动配置。':rate<20?'先优化固定支出或提升收入，把结余率提升至 20% 以上。':'可在应急金外分层安排长期目标资金。')+' 命盘财运参考 '+d.ws+' / 100，仅用于节奏提醒。');}
function runCareerTool(){const goal=document.getElementById('careerGoal').value,ready=+document.getElementById('careerReady').value,d=getCtx();const score=Math.max(35,Math.min(92,Math.round((d.cs*0.55)+(4-ready)*12+(d.wx.st?8:2))));const step=ready===1?'开始用小项目、投递或试单验证市场。':ready===2?'用 4 周补齐作品、案例或目标行业访谈。':'先锁定一个细分方向，完成 3 次真实访谈再决定。';setToolOutput(goal+'准备度 '+score+' / 100。下一步：'+step+' 不建议裸辞或大额投入，先保留现金流与退出方案。');}
function runDateTool(){const v=document.getElementById('dateEvent').value,dt=document.getElementById('dateTarget').value;const map={签约合作:'核对主体、金额、交付与违约条款，并预留复核时间。',面试入职:'提前准备作品案例、岗位问题和薪酬底线。',搬家出行:'确认交通、天气、证件与备用方案。',表白沟通:'选择双方不疲惫的时间，先表达感受再提出期待。'};setToolOutput('事项：'+v+(dt?'；目标日期：'+dt:'')+'。准备重点：'+map[v]+' 择日工具提供的是节奏提醒，合同、行程和健康等事项请以现实信息与专业意见为准。');}
function runStyleTool(){const scene=document.getElementById('styleScene').value,d=getCtx(),map={重要沟通:'选择低饱和、有质感的 '+d.wx.ys+' 属性配色；桌面只保留沟通资料与纸笔。',面试汇报:'穿搭强调整洁与可信赖感；工位或会议桌朝向明亮处，提前整理要点。',专注工作:'使用 '+d.wx.ys+' 属性的小面积色彩作为提示，关闭无关通知并保持桌面留白。',休息恢复:'减少视觉刺激，选择舒适材质与柔和光线，优先恢复睡眠和饮食节奏。'};setToolOutput(scene+'方案：'+map[scene]);}
function runLayoffTool(){const signal=+document.getElementById('layoffSignal').value,buffer=+document.getElementById('layoffBuffer').value,market=+document.getElementById('layoffMarket').value,d=getCtx();const score=Math.min(95,Math.round(signal*16+buffer*10+market*10+(100-d.cs)*.18));const level=score>=65?'需要立即准备':score>=42?'建议提前预案':'保持观察';const actions=score>=65?'48 小时内更新简历与作品材料；整理劳动合同、绩效与项目成果；建立不少于 3 个外部机会。':score>=42?'本周更新简历并联系 2 位行业联系人；盘点可迁移技能和现金流。':'每月更新一次成果材料；保持外部人脉与能力积累。';setToolOutput('综合预警 '+score+' / 100：'+level+'。行动方案：'+actions+' 结果用于风险规划，不代表裁员概率或法律结论。');}
function runDailyTool(){const f=document.getElementById('dailyFocus').value,d=getCtx();const map={推进工作:'先完成一项关键推进，再处理零散消息；沟通时用事实和下一步说话。',关系沟通:'选一个双方不疲惫的时间，先表达感受，再提出一个具体期待。',学习积累:'只选一个主题，完成 25 分钟深度输入并记下一个可应用点。',休息恢复:'减少额外安排，保证睡眠与规律饮食，让身体先回到稳定节奏。'};setToolOutput('今日 '+getTodayGZ()+' · 聚焦「'+f+'」<br><br>'+map[f]+'<br><br>行动清单：① 只定一件最重要的事；② 留出 20 分钟无干扰时间；③ 晚上复盘是否完成。当前有利元素参考：'+d.wx.ys+'。');}
function runNameTool(){const s=document.getElementById('nameSurname').value.trim()||'你的姓氏',style=document.getElementById('nameStyle').value,d=getCtx();const chars={木:['栩','森','苒'],火:['昭','昕','晗'],土:['安','屹','予'],金:['知','钰','书'],水:['澄','泓','沅']}[d.wx.ys];const tails=style==='温润典雅'?['宁','言','清']:style==='大气坚定'?['远','承','衡']:['然','一','可'];const options=chars.map((x,i)=>s+x+tails[i]).join('、');setToolOutput('用字方向：'+d.wx.ys+' 属性。为「'+style+'」生成 3 个灵感：'+options+'。请进一步核对读音、重名、字义、家族习惯及当地命名规范。');}
function runOracleTool(){const q=document.getElementById('oracleQuestion').value.trim()||'你心中的问题',area=document.getElementById('oracleArea').value;const pool=['先做最小的一步，再观察反馈。','信息未齐时，暂缓承诺比仓促决定更好。','适合主动沟通，把期待说清楚。','把注意力放回能控制的行动上。','保持节奏，长期积累会带来答案。','先完成准备，再要求结果。'];const pick=()=>pool[Math.floor(Math.random()*pool.length)];setToolOutput('问题领域：'+area+'；关于「'+q+'」<br><br>① 当下：'+pick()+'<br>② 行动：'+pick()+'<br>③ 提醒：'+pick()+'<br><br>签文用于整理思路与自我反思，不替代事实判断。');}
function runLotteryTool(){const t=document.getElementById('lotteryType').value,count=+document.getElementById('lotteryCount').value,unique=(n,max)=>{const a=[];while(a.length<n){const v=Math.floor(Math.random()*max)+1;if(!a.includes(v))a.push(v);}return a.sort((x,y)=>x-y).map(x=>String(x).padStart(2,'0')).join(' · ')};const lines=Array.from({length:count},(_,i)=>'第 '+(i+1)+' 注：'+(t==='ssq'?'红球 '+unique(6,33)+'　蓝球 '+unique(1,16):'前区 '+unique(5,35)+'　后区 '+unique(2,12))).join('<br>');setToolOutput(lines+'<br><br>随机组合不提高中奖概率；请仅使用可承受的娱乐预算。');}
function runZodiacTool(){const d=getCtx(),other=document.getElementById('zodiacOther').value,self=d.b.sx;const clash={鼠:'马',牛:'羊',虎:'猴',兔:'鸡',龙:'狗',蛇:'猪',马:'鼠',羊:'牛',猴:'虎',鸡:'兔',狗:'龙',猪:'蛇'},six={鼠:'牛',牛:'鼠',虎:'猪',猪:'虎',兔:'狗',狗:'兔',龙:'鸡',鸡:'龙',蛇:'猴',猴:'蛇',马:'羊',羊:'马'},groups=[['鼠','龙','猴'],['牛','蛇','鸡'],['虎','马','狗'],['兔','羊','猪']];let label,msg;if(clash[self]===other){label='相冲';msg='传统关系中张力较明显，适合把规则、边界和沟通频率提前说清。';}else if(six[self]===other){label='六合';msg='较容易形成互补与信任，仍需落实到现实分工和回应。';}else if(groups.some(g=>g.includes(self)&&g.includes(other))){label='三合';msg='协作与默契基础较好，适合共同推进长期目标。';}else if(self===other){label='同属相';msg='容易有共鸣，也可能在相似的固执点上拉扯。';}else{label='平和';msg='没有直接合冲提示，关键仍是价值观、沟通方式与现实配合。';}setToolOutput('你（'+self+'）与对方（'+other+'）：'+label+'。'+msg+' 生肖仅是传统参考，不应替代对具体关系的观察。');}
function runRelationTool(){const n=document.getElementById('relName').value.trim()||'对方',f=document.getElementById('relFocus').value,date=document.getElementById('relDate').value,d=getCtx();const focus={亲密关系:'先确认安全感与边界，再讨论未来安排。',朋友合作:'先明确分工、交付和收益分配，再谈默契。',家人沟通:'先讲共同目标，再说明各自可接受的做法。'};setToolOutput('与'+n+'的「'+f+'」方案：'+focus[f]+' 你的当前感情参考 '+d.ls+' / 100。'+(date?'已记录对方出生日期，可作为后续双盘比对的基础信息。':'补充对方出生日期后，可进一步进行双盘节奏比对。'));}
function switchTab(el){
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  if(typeof moveTabIndicator==='function')moveTabIndicator(el);
  // 切换 sec 时让卡片重新错落入场（重置动画）
  const targetSec=document.getElementById(el.dataset.sec);
  if(targetSec){
    targetSec.querySelectorAll('.glass').forEach(c=>{c.style.animation='none';void c.offsetWidth;c.style.animation='';});
  }
  const secId=el.dataset.sec;document.querySelectorAll('.sec').forEach(s=>s.classList.remove('active'));const target=document.getElementById(secId);if(target){target.classList.add('active');}
  document.getElementById('p2Scroll').scrollTop=0;
  if(secId==='s-ming'||secId==='s-yun'){requestAnimationFrame(()=>{document.querySelectorAll('.wxf,.ff').forEach(el=>{el.style.width='0%';setTimeout(()=>{el.style.width=el.dataset.w},50)});});}
  if(secId==='s-yun'){requestAnimationFrame(()=>{const cv=document.getElementById('cvC');if(cv&&cv._data)drawCurve(cv._data,cv._dys,cv._age);const tl=document.getElementById('daYunTl');if(tl){const cu=tl.querySelector('.ti.cu');if(cu){setTimeout(()=>cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}),100);}}});}
}



async function calc(isDemoPreview=false){
  const bd=document.getElementById('bDate').value;if(!bd)return alert('请选择出生日期');
  const timeStr=document.getElementById('bTime').value||'09:00';const[hh,mm]=timeStr.split(':').map(Number);
  const bp=document.getElementById('bPlace').value||'beijing';const gen=document.getElementById('bGen').value;
  const q=document.getElementById('bQ').value;
  const useTrueSolar=document.getElementById('swTrueSolar').classList.contains('on');
  const[y,m,d]=bd.split('-').map(Number);const city=CD[bp]||{n:'未知',o:116.4,a:39.9};
  const ld=document.getElementById('ldov');ld.classList.add('on');document.getElementById('btnGo2').disabled=true;
  const pb=document.getElementById('ldbf'),st=document.getElementById('ldst');
  const steps=['排列四柱…','推算五行…','分析十神…','查神煞…','排大运…','安紫微盘…','起奇门盘…','梅花起卦…','排流月…','综合合参…','生成报告…'];
  for(let i=0;i<steps.length;i++){st.textContent=steps[i];pb.style.width=(((i+1)/steps.length)*100)+'%';await new Promise(r=>setTimeout(r,220));}
  try{
    const resolved=resolveBirthDateTime(y,m,d,hh,mm,useTrueSolar,city.o);
    const b=mkBazi(resolved.year,resolved.month,resolved.day,resolved.hourZhi);
    const wx=mkWx(b),ss=mkSs(b),dy=mkDy(b,gen,y),ln=mkLn(CURR_YEAR),zw=mkZw(b),qm=mkQm(b),mh=mkMh(b),si=mkSi(b);
    const shensha=mkShenSha(b);const liuyue=getLiuYue(CURR_YEAR);
    b._meta={hourZhi:resolved.hourZhi,useTrueSolar:resolved.note?true:false,by:y,bm:m,bd:d};
    // —— 预构造 ctx（renderAll 内会再用 ctx.input 重建完整 ctx）——
    const _input={by:y,bm:m,bd:d,bd_raw:bd,timeStr,bp,gen,q,useTrueSolar};
    const _preCtx=buildContext({b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P:null,gen,q,city,input:_input});
    window._ctx=_preCtx;window._baziData=_preCtx;window._reportData=_preCtx;
    applyTheme(wx.ys);
    const accentMap={木:[70,160,90],火:[200,80,60],土:[200,164,90],金:[170,165,150],水:[70,120,200]};
    window._accentRGB=accentMap[wx.ys]||accentMap['土'];
    renderAll(b,wx,ss,dy,ln,zw,qm,mh,si,gen,q,city,y,shensha,liuyue);
    // 让问问大师与报告顶部共享“示例报告”状态。
    if(window._ctx)window._ctx.isDemoPreview=!!isDemoPreview;
    if(window._baziData)window._baziData.isDemoPreview=!!isDemoPreview;
    if(window._reportData)window._reportData.isDemoPreview=!!isDemoPreview;
    if(isDemoPreview){
      const reportInner=document.getElementById('p2Inner');
      if(reportInner)reportInner.insertAdjacentHTML('afterbegin','<div class="demo-report-note" role="status"><span>示例</span><b>当前为体验用示例报告</b><em>内容基于默认示例信息生成，请勿用于个人判断。</em></div>');
    }
    const cv=document.getElementById('cvC');if(cv){cv._data=dy.ds.map((_,i)=>Math.round(Math.min(95,Math.max(30,50+Math.sin(i*.7)*20+Math.cos(i*.5)*10+(wx.c[GW[dy.ds[i].g]]||0)*5))));cv._dys=dy.ds;cv._age=CURR_YEAR-y}
    ld.classList.remove('on');document.getElementById('btnGo2').disabled=false;
    showPage2();
    document.querySelectorAll('.tab-item')[0].click();
  }catch(e){
    ld.classList.remove('on');document.getElementById('btnGo2').disabled=false;
    console.error(e);
    alert('推演出错：'+e.message+'\n\n建议：请检查输入信息是否正确，或刷新页面重试。');
  }
}

function openAsk(){
  document.getElementById('aiOverlay').classList.add('open');
  document.getElementById('aiSheet').classList.add('open');
  document.getElementById('aiFab')?.classList.add('hidden');
  const context=document.getElementById('aiContext'),d=window._ctx;
  if(context&&d){context.innerHTML='<span>✦ 当前命盘</span><b>'+d.dg+d.dw+' · '+(d.wx.st?'行动型节奏':'蓄力型节奏')+' · 可直接问事业、关系与近期选择</b>';}
  // 自由提问：打开后直接聚焦输入框。
  setTimeout(()=>document.getElementById('askInput').focus(),300);
}
function closeAsk(){
  document.getElementById('aiOverlay').classList.remove('open');
  document.getElementById('aiSheet').classList.remove('open');
  document.getElementById('aiFab')?.classList.remove('hidden');
  document.getElementById('aiSuggest').classList.remove('show');
}
function newAskChat(){
  window._aiConversation=[];
  const result=document.getElementById('askResult'),input=document.getElementById('askInput'),sug=document.getElementById('aiSuggest');
  if(result)result.innerHTML='';
  if(input){input.value='';input.focus();}
  if(sug){sug.innerHTML='';sug.classList.remove('show');}
}
function aiToolRequest(q){
  const x=String(q||'').trim();
  if(!/(打开|使用|开始|做一下|帮我|调用|进入|测一下|测评)/.test(x))return false;
  const rules=[
    [/财运|理财|现金流|财富/, 'wealth','财运与理财罗盘'],[/转行|副业|职业选择|换工作/, 'career','转行与副业测评'],[/裁员|失业|职场风险/, 'layoff','裁员风险检测'],[/关系沟通|伴侣沟通|感情沟通/, 'relation','关系沟通分析'],[/穿搭|工位|环境|颜色|风水/, 'style','能量穿搭与工位风水'],[/择日|重要事项|安排日期/, 'date','重要事项择日助手'],[/今日日签|今日提醒|日签/, 'daily','今日日签'],[/起名|取名|名字/, 'name','智能起名工具'],[/摇签|问卜|抽签/, 'oracle','摇签问卜'],[/彩票|双色球|大乐透|选号/, 'lottery','娱乐选号'],[/生肖合冲|生肖关系/, 'zodiac','生肖合冲分析']
  ];
  const hit=rules.find(([re])=>re.test(x));if(!hit)return false;
  const el=document.getElementById('askResult');if(!el)return false;
  const short={wealth:'财运',career:'转行',layoff:'职场风险',relation:'关系沟通',style:'环境',date:'择日',daily:'日签',name:'起名',oracle:'摇签',lottery:'选号',zodiac:'生肖'}[hit[1]]||'工具';
  const card=document.createElement('div');card.className='ai-body-inner ai-tool-call';
  card.innerHTML='<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问大师</div><div>可以，直接开始这个小工具，填完后我再帮你看结果。</div><button class="ai-tool-call-btn" type="button">开始 · '+short+' →</button></div></div></div>';
  card.querySelector('button').onclick=()=>{window._returnToAI=true;closeAsk();setTimeout(()=>openToolPage(hit[1]),180)};
  el.appendChild(card);el.scrollTop=el.scrollHeight;return true;
}
function doAsk(q){
  if(!document.getElementById('aiSheet').classList.contains('open'))openAsk();
  const input=document.getElementById('askInput');
  input.value='';
  const countEl=document.getElementById('aiCount');
  if(countEl)countEl.textContent='0 / 500';
  document.getElementById('aiSuggest').classList.remove('show');
  try{sessionStorage.setItem('tj_ai_draft','')}catch(e){}
  if(aiToolRequest(q))return;
  generateAnswer(q);
}
function doAskCustom(){
  const input=document.getElementById('askInput');
  const q=input.value.trim();
  if(!q)return;
  input.value='';
  const countEl=document.getElementById('aiCount');
  if(countEl)countEl.textContent='0 / 500';
  document.getElementById('aiSuggest').classList.remove('show');
  try{sessionStorage.setItem('tj_ai_draft','')}catch(e){}
  if(aiToolRequest(q))return;
  generateAnswer(q);
}
// —— 切换分类 ——
function aiSwitchCat(el){
  document.querySelectorAll('.ai-cat').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  aiRefreshChips(el.dataset.cat);
}
// —— 刷新当前分类下的快捷问题 chips ——
function aiRefreshChips(cat){
  const wrap=document.getElementById('aiChips');
  if(!wrap)return;
  let list=[];
  if(cat==='hot'){
    // 热门：每个意图各 1 条
    const seen=new Set();
    ['事业','财富','感情','健康','学业','居住','玄学'].forEach(it=>{
      const f=KB.faqs.find(x=>x.intent===it&&!seen.has(x.id));
      if(f){list.push(f);seen.add(f.id);}
    });
  }else if(cat==='玄学'){
    // 玄学分类同时显示术语
    list=KBSearch.byIntent('玄学');
  }else{
    list=KBSearch.byIntent(cat);
  }
  wrap.innerHTML=list.map(f=>`<div class="ai-chip" onclick="doAsk('${f.q.replace(/'/g,"\\'")}')">${f.q}</div>`).join('');
  // 玄学分类附加术语速查
  if(cat==='玄学'){
    wrap.innerHTML+='<div class="ai-divider">术语速查</div>';
    wrap.innerHTML+=KB.terms.slice(0,12).map(t=>`<div class="ai-chip term" onclick="doAsk('${t.t}')">${t.t}</div>`).join('');
  }
}
// 自由提问模式：不展示预设问题或联想列表，保留用户自己的问题输入。
function aiOnInputSuggest(){
  const sug=document.getElementById('aiSuggest');
  if(sug){sug.innerHTML='';sug.classList.remove('show');}
}

async function generateAnswer(q){
  const d=getCtx();
  const el=document.getElementById('askResult');
  const conversation=window._aiConversation||(window._aiConversation=[]);
  const aiPrefs=window.getAISettings?window.getAISettings():{natural:true,context:true,length:'short'};
  const previousTurns=aiPrefs.context?conversation.slice(-6):[];
  if(!d){
    
    const div = document.createElement('div');
    div.className = 'ai-body-inner';
    div.innerHTML = '<div class="ai-empty">请先完成命盘排盘，再进行提问。<br><button class="ai-btn-go" onclick="closeAsk();goBack();">前往填写出生信息 →</button></div>';
    const typing = el.querySelector('.loading-state');
    if(typing) typing.remove();
    el.appendChild(div);
  
    return;
  }
  // —— 步骤 1：智能信息库匹配 ——
  const kbRes=smartAnswer(q,d);
  if(kbRes){
    
    const div = document.createElement('div');
    div.className = 'ai-body-inner';
    div.innerHTML = renderSmartAnswer(kbRes, q);
    conversation.push({role:'user',content:q});
    conversation.push({role:'assistant',content:(kbRes.sections||[]).map(s=>s.content||'').join(' ').slice(0,180)});
    const typing = el.querySelector('.loading-state');
    if(typing) typing.remove();
    el.appendChild(div);
    requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}));
    return;
  
  }
  // —— 步骤 2：调用 AI API（流式）——
  // typing removed
  const ctx=buildBaziContext(d);
  const systemPrompt=`你是「问问」，像一位真正会倾听的朋友，而不是报告生成器。请用自然语言和用户说话：先用一句顺口的承接回应问题，例如“听起来你现在最在意的是……”或“这件事确实容易让人纠结”，但不要凭空猜测用户情绪；接着直接回答，再自然地落到一个现实行动。可以使用“我会建议你先……”“如果是我，我会先……”这类口语表达，让回答像真实对话，不要像数据报告。不要套模板，不要使用“根据命盘显示”“综合来看”“建议如下”等机械套话，也不要每次都把日主、大运、评分重新说一遍。命理只能作为轻量参考，只有和问题确实相关时才自然提一句，并说明现实选择更重要。请认真参考对话历史：如果用户说“那我呢”“继续说”“这个机会”“他/她”等省略表达，要结合上一轮内容理解，不要假装这是全新问题；只有确实无法判断时才追问。每次只抓住最关键的一点，给一个具体、容易开始的行动；不要罗列多条大道理，不要强行分成结论、原因、行动等小标题。信息不足时只问一个问题。语气像熟悉用户的朋友：有温度、坦诚，允许说“我不确定”。中文回复控制在80至180字，通常写成一到两段自然对话。`;
  try{
    // ===== OpenRouter 接入（你的 API Key + 模型）=====
    // 主模型 google/gemma-4-31b-it:free；免费模型易被限流，故准备 2 个备用模型自动降级。
    const OR_KEY='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';
    const OR_BASE='https://openrouter.ai/api/v1';
    const OR_MODELS=['google/gemma-4-31b-it:free','google/gemma-4-26b-a4b-it:free','openai/gpt-oss-20b:free'];
    let ans=null,full='',okDone=false;
    // 真正有内容返回前，保留“正在输入”动画；首字到达后再插入答案气泡。
    const _mkAns=()=>{ if(ans)return ans; const t=el.querySelector('.loading-state'); if(t)t.remove(); ans=document.createElement('div'); ans.className='ai-body-inner'; el.appendChild(ans); return ans; };
    for(const model of OR_MODELS){
      try{
        full='';
        const resp=await fetch(OR_BASE+'/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+OR_KEY,'Content-Type':'application/json','X-Title':'Wenwen Dashi'},body:JSON.stringify({model,stream:true,temperature:0.6,max_tokens:384,messages:[{role:'system',content:systemPrompt+"\n回复偏好："+(aiPrefs.natural?'使用自然口语。':'直接、少寒暄。')+(aiPrefs.length==='standard'?'回复可放宽到180至260字。':'保持简洁。')+"\n用户命盘：\n"+ctx+"\n当前时间："+new Date().toLocaleString('zh-CN')},...previousTurns,{role:'user',content:q}]})});
        if(!resp.ok||!resp.body){ let _t='';try{_t=await resp.text()}catch(_){} throw new Error('HTTP '+resp.status+' '+_t.slice(0,80)); }
        const reader=resp.body.getReader();const dec=new TextDecoder();let buf='';
        while(true){const{done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';for(const ln of lines){const s=ln.trim();if(!s.startsWith('data:'))continue;const raw=s.slice(5).trim();if(raw==='[DONE]')continue;let js;try{js=JSON.parse(raw)}catch(_){continue}if(js.error)throw new Error('provider:'+(js.error.message||'').slice(0,80));const delta=js.choices&&js.choices[0]&&js.choices[0].delta;if(delta&&delta.content){full+=delta.content;_mkAns().innerHTML=formatStandardAnswer(full);requestAnimationFrame(()=>{el.scrollTop=el.scrollHeight;});}}}
        if(full&&full.trim()){okDone=true;break;}
      }catch(_me){/* 本模型失败/限流，自动尝试下一个免费模型 */}
    }
    if(!okDone||!full||!full.trim())throw new Error('all models failed');
    conversation.push({role:'user',content:q});
    conversation.push({role:'assistant',content:full.slice(0,500)});
    const intents=extractIntents(q);
    const links=buildRelatedRoutes(intents);
    if(links.length){_mkAns().innerHTML+=renderRouteButtons(links,'前往相关页面查看');}
    requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest'});});
  }catch(e){generateAnswerFallback(q,d,el);}
}

// —— 渲染 KB 命中结果 ——
function renderSmartAnswer(res,q){
  const head=`<div class="ai-kb-head"><span class="ai-kb-badge">${res.kind==='term'?'📖 术语':'💡 信息库'}</span><span class="ai-kb-q">${res.title}</span></div>`;
  const body=res.sections.map((s,i)=>`<div class="ai-step"><div class="ai-step-icon">${i+1}</div><div class="ai-step-body"><div class="ai-step-title">${s.title}</div><div class="ai-step-text">${String(s.content||'').replace(/\n/g,'<br>')}</div></div></div>`).join('');
  let footer='';
  if(res.links&&res.links.length){
    footer+=renderRouteButtons(res.links,res.kind==='term'?'查看相关卡片':'前往查看详细数据');
  }
  if(res.related&&res.related.length){
    footer+=`<div class="ai-related"><div class="ai-related-h">你可能还想问</div><div class="ai-related-list">${res.related.map(r=>`<div class="ai-chip small" onclick="doAsk('${r.q.replace(/'/g,"\\'")}')">${r.q}</div>`).join('')}</div></div>`;
  }
  return head+'<div class="ai-body-inner">'+body+footer+'</div>';
}

// —— 渲染跳转按钮组 ——
function renderRouteButtons(routes,label){
  if(!routes||!routes.length)return '';
  return `<div class="ai-routes"><div class="ai-routes-h">${label||'相关页面'}</div><div class="ai-routes-list">${routes.map(r=>`<button class="ai-route-btn" onclick="jumpTo('${r.sec}','${r.card}')">→ ${r.name}</button>`).join('')}</div></div>`;
}

// —— 根据意图自动推断相关页面 ——
function buildRelatedRoutes(intents){
  const map={
    '事业':['persona','trend','timeline'],
    '财富':['trend','timeline','risk'],
    '感情':['loveMode','loveMatch','loveRisk'],
    '健康':['health','monthly'],
    '学业':['persona','timeline'],
    '居住':['risk','wuxing'],
    '玄学':['wuxing','bazi','timeline'],
    '综合':['trend','monthly','todayAdv']
  };
  const seen=new Set();const out=[];
  intents.forEach(it=>(map[it]||[]).forEach(k=>{
    if(seen.has(k))return;seen.add(k);
    if(KB.routes[k])out.push(KB.routes[k]);
  }));
  return out.slice(0,3);
}
function compactAIText(text,max=78){
  const s=String(text||'').replace(/<br\s*\/?>(\s*)/gi,' ').replace(/\s+/g,' ').trim();
  return s.length>max?s.slice(0,max-1)+'…':s;
}
function formatStandardAnswer(text){
  const sections=[];
  const titles=['结论','命理原因','当前阶段','行动建议'];
  titles.forEach((t,idx)=>{
    const m=text.match(new RegExp(`【${t}】[:：]([\\s\\S]*?)(?=【${titles[idx+1]||'END'}】|$)`));
    if(m)sections.push({title:t,content:m[1].trim()});
  });
  if(!sections.length)return formatAIText(text);
  return sections.map((s,i)=>`<div class="ai-step"><div class="ai-step-icon">${i+1}</div><div class="ai-step-body"><div class="ai-step-title">${s.title}</div><div class="ai-step-text">${compactAIText(s.content,i===3?96:68)}</div></div></div>`).join('');
}
function generateAnswerFallback(q,d,el){
  // —— 直接读 ctx ——
  const age=d.age,cDy=d.cDy,cLn=d.cLn;
  const lnSS=d.lnSS||TJ.ssOf(d.dg,cLn&&cLn.g),dySS=d.dySS||TJ.ssOf(d.dg,cDy&&cDy.g);
  const intents=extractIntents(q);
  let conclusion='',reason='',phase='',action='';
  if(intents.includes('事业')){
    conclusion=dySS.includes('官')||lnSS.includes('官')?'今年事业有上升通道':'今年事业宜稳守不宜冒进';
    reason=`日主${d.dg}，当前大运${cDy.g}${cDy.z}，十神为${dySS}；${CURR_YEAR}流年${cLn.g}${cLn.z}为${lnSS}。`+(dySS.includes('官')?'官杀主压力与机遇并存':'食伤生财利于创意变现');
    phase=`${cDy.as}-${cDy.ae}岁为`+(dySS.includes('官')?'事业打拼期':'积累蓄势期')+'，今年'+(lnSS.includes('官')?'有贵人提携':'需自力更生')+'。';
    action='1. 主动向上司争取核心项目\n2. 每天预留1小时深度学习';
  }else if(intents.includes('感情')){
    conclusion=d.shensha.some(s=>s.n==='桃花')?'今年桃花运旺，注意筛选':'今年感情节奏偏稳，宜经营';
    reason=`日主${d.dg}，${d.gen==='male'?'财星':'官星'}代表异性缘。当前`+(d.shensha.some(s=>s.n==='桃花')?'命局带桃花，异性缘天生较强':'桃花不显，缘分多来自熟人介绍')+'。';
    phase=`${CURR_YEAR}年${cLn.g}${cLn.z}，流年十神${lnSS}，`+(lnSS.includes(d.gen==='male'?'财':'官')?'配偶星透出，有利婚恋':'感情气场平和，以陪伴为主')+'。';
    action='1. 多参加行业聚会拓展圈子\n2. 避免在冲太岁月份做重大感情决定';
  }else if(intents.includes('财运')){
    conclusion=lnSS.includes('财')?'今年有偏财窗口，但忌贪心':'今年财运平稳，重在守成';
    reason=`日主${d.dg}，`+(d.wx.st?'身旺能担财':'身弱财为忌')+`。${CURR_YEAR}年`+(lnSS.includes('财')?'财星流年，来财机会增多':'财星未透，以正财为主')+'。';
    phase=`当前大运${cDy.g}${cDy.z}，`+(dySS.includes('财')?'十年财路较活':'十年以积累专业技能为主')+'。';
    action='1. 建立6个月应急储蓄\n2. 远离高杠杆投机';
  }else{
    conclusion='整体气场平和，稳中求进是最佳策略';
    reason=`日主${d.dg}属${GW[d.dg]}，`+(d.wx.st?'身旺':'身弱')+'，用神'+d.wx.ys+'。当前无明显吉凶冲克。';
    phase=`${cDy.as}-${cDy.ae}岁为人生`+(age<30?'探索':age<40?'突破':'沉淀')+'期，'+CURR_YEAR+'年宜'+(d.wx.ys==='木'?'拓展人脉':d.wx.ys==='火'?'展示才华':d.wx.ys==='土'?'深耕专长':d.wx.ys==='金'?'精进技术':'沉淀思考')+'。';
    action='1. 保持现有作息\n2. 每月复盘一次目标进度';
  }
  const text=`我先说重点：${conclusion}。${reason} 这不代表事情已经被定死，现实里的选择更重要。你可以先从这一步开始：${action.replace(/\n/g,'；')}`;
  let html='<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问大师</div>'+compactAIText(text,180)+'</div></div></div>';
  // —— 兜底回答末尾也附跳转按钮 ——
  const links=buildRelatedRoutes(intents);
  if(links.length)html+=renderRouteButtons(links,'前往相关页面查看');
  el.innerHTML='<div class="ai-body-inner">'+html+'</div>';
  requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest'});});
}

function renderRiQian(){
  const now=new Date();const y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();
  const dji=getDayPillarIndex(y,m,d);const dgi=dji%10,dzi=dji%12;const dg=TG[dgi],dz=DZ[dzi];
  let jie='';for(let i=0;i<12;i++){const j=jqDate(y,i);if(j){if(m>j[0]||(m===j[0]&&d>=j[1]))jie=['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'][i];}}
  const ch={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
  const sxm={'子':'鼠','丑':'牛','寅':'虎','卯':'兔','辰':'龙','巳':'蛇','午':'马','未':'羊','申':'猴','酉':'鸡','戌':'狗','亥':'猪'};
  const todaySX=sxm[dz],chongSX=sxm[ch[dz]];
  const sxjx={'鼠':'天贵','牛':'天德','虎':'天马','兔':'文昌','龙':'紫微','蛇':'红鸾','马':'将星','羊':'天医','猴':'驿马','鸡':'桃花','狗':'华盖','猪':'福星'};
  let yi=[],ji=['与'+chongSX+'相冲者大事需谨慎'];let yj='';
  if('甲乙'.includes(dg)){yi.push('种植','出行','会友');ji.push('动土','开矿');yj='木气生发之日，宜动不宜静，早起行好运，利谋新事。';}
  else if('丙丁'.includes(dg)){yi.push('文书','庆典','装饰');ji.push('涉水','冷库作业');yj='火德当令，光明在前，利文书庆典，忌口舌争执。';}
  else if('戊己'.includes(dg)){yi.push('置业','收纳','祭祀');ji.push('嫁娶','远行');yj='土性厚重，稳中求进，忌冒进求快，适合整理收纳。';}
  else if('庚辛'.includes(dg)){yi.push('裁决','交易','修造');ji.push('宴饮','借贷');yj='金气锐利，当断则断，利裁决交易，忌优柔寡断。';}
  else{yi.push('流通','迁移','沐浴');ji.push('签约','婚嫁');yj='水势汪洋，顺势而为，宜流通迁移，忌固守一域。';}
  return`<div style="text-align:center;margin-bottom:14px"><div style="font-family:var(--serif);font-size:1.6em;color:var(--ac-text);margin-bottom:4px">${dg}${dz}日</div><div style="font-size:.75em;color:var(--ac-dim)">${y}年${m}月${d}日${jie?' · '+jie+'后':''}</div></div>
  <div style="display:flex;gap:8px;margin:12px 0"><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center"><div style="font-size:.65em;color:rgba(255,255,255,.35);margin-bottom:4px">生肖</div><div style="font-size:1.1em;font-weight:600">${todaySX}</div></div><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center"><div style="font-size:.65em;color:rgba(255,255,255,.35);margin-bottom:4px">冲煞</div><div style="font-size:1.1em;font-weight:600;color:#d4654a">冲${chongSX}</div></div><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center"><div style="font-size:.65em;color:rgba(255,255,255,.35);margin-bottom:4px">吉神</div><div style="font-size:1.1em;font-weight:600;color:#7ab648">${sxjx[todaySX]||'天德'}</div></div></div>
  <div style="margin:10px 0"><div style="font-size:.75em;color:var(--ac-dim);margin-bottom:6px">🟢 今日宜</div><div style="display:flex;flex-wrap:wrap;gap:6px">${yi.map(x=>`<span class="tg tj">${x}</span>`).join('')}</div></div>
  <div style="margin:10px 0"><div style="font-size:.75em;color:var(--ac-dim);margin-bottom:6px">🔴 今日忌</div><div style="display:flex;flex-wrap:wrap;gap:6px">${ji.map(x=>`<span class="tg tc">${x}</span>`).join('')}</div></div>
  <div style="font-size:.78em;color:rgba(255,255,255,.55);margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)"><b>一句话日签：</b>${yj}</div>`;
}
function showRiQian(){const baseHtml=renderRiQian();document.getElementById('rqResult').innerHTML=baseHtml;document.getElementById('rqModal').classList.add('open');}
function closeRq(){document.getElementById('rqModal').classList.remove('open');}

function openMonthModal(idx,name,gz,jq,ss){
  const d=window._baziData;if(!d)return;
  const dg=d.dg;
  const monthAnalysis={
    '比肩':'本月比肩当令，自我意识增强，适合独立行动与团队协作，但需防过度竞争消耗精力。',
    '劫财':'本月劫财临旺，易有意外支出或人际摩擦，理财需谨慎，防朋友借贷不还。',
    '食神':'本月食神吐秀，创意与表达力强，适合学习新技能、展示才华、社交联谊。',
    '伤官':'本月伤官透出，思维活跃但易言辞过激，注意沟通方式，利创新突破与变革。',
    '偏财':'本月偏财星动，有意外收入机会，但忌贪心冒进，适可而止见好就收。',
    '正财':'本月正财当旺，适合稳健理财、谈薪资、收款项，财运平稳上升。',
    '七杀':'本月七杀压身，压力较大但机遇并存，适合攻坚克难、挑战自我、突破瓶颈。',
    '正官':'本月正官临旺，事业运佳，适合争取晋升、考试认证、建立规则与秩序。',
    '偏印':'本月偏印当令，适合学习研究、向内探索，但需防思虑过多、情绪低落。',
    '正印':'本月正印生身，贵人运旺，适合拜师学习、获取资源支持、充电提升。'
  };
  const analysis=monthAnalysis[ss]||'本月气场平和，按部就班即可，宜整理与复盘。';
  const yi=['学习充电','整理规划','与人沟通','运动健身'];
  const ji=['冲动决定','熬夜透支','大额投资','口舌是非'];
  const el=document.getElementById('monthModalContent');
  el.innerHTML=`<div class="mm-title">${name} · ${gz}</div>
    <div class="mm-row"><span class="mm-label">十神</span><span class="mm-value">${ss}</span></div>
    <div class="mm-row"><span class="mm-label">节气</span><span class="mm-value">${jq||'待查'}</span></div>
    <div class="mm-row"><span class="mm-label">日主</span><span class="mm-value">${dg}</span></div>
    <div style="margin:14px 0;font-size:.82em;color:rgba(255,245,220,0.75);line-height:1.8">${analysis}</div>
    <div style="margin:10px 0"><div style="font-size:.7em;color:rgba(122,182,72,.8);margin-bottom:6px">🟢 本月宜</div><div style="display:flex;flex-wrap:wrap;gap:4px">${yi.map(x=>`<span class="mm-tag yi">宜${x}</span>`).join('')}</div></div>
    <div style="margin:10px 0"><div style="font-size:.7em;color:rgba(212,101,74,.8);margin-bottom:6px">🔴 本月忌</div><div style="display:flex;flex-wrap:wrap;gap:4px">${ji.map(x=>`<span class="mm-tag ji">忌${x}</span>`).join('')}</div></div>`;
  document.getElementById('monthModal').classList.add('open');
}
function closeMonthModal(){document.getElementById('monthModal').classList.remove('open');}

function selChip(el){const wrap=document.getElementById('qChips');wrap.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');document.getElementById('bQ').value=el.dataset.q;}

const DB_NAME='TJ_Bazi',DB_VER=2;
let _db=null;
function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VER);r.onerror=()=>rej(r.error);r.onsuccess=(e)=>{_db=e.target.result;res(_db);};r.onupgradeneeded=(e)=>{const d=e.target.result;if(!d.objectStoreNames.contains('profiles')){const s=d.createObjectStore('profiles',{keyPath:'id',autoIncrement:true});s.createIndex('updatedAt','updatedAt',{unique:false});}};});}
function dbPut(p){return new Promise((res,rej)=>{if(!_db)return rej('DB未就绪');const t=_db.transaction('profiles','readwrite'),s=t.objectStore('profiles');const r=s.put(p);r.onsuccess=(e)=>res(e.target.result);r.onerror=()=>rej(r.error);});}
function dbGetAll(){return new Promise((res,rej)=>{if(!_db)return res([]);const t=_db.transaction('profiles','readonly'),s=t.objectStore('profiles');const r=s.index('updatedAt').openCursor(null,'prev');const arr=[];r.onsuccess=(e)=>{const c=e.target.result;if(c){arr.push(c.value);c.continue();}else res(arr);};r.onerror=()=>rej(r.error);});}
function dbDel(id){return new Promise((res,rej)=>{if(!_db)return rej('DB未就绪');const t=_db.transaction('profiles','readwrite'),s=t.objectStore('profiles');const r=s.delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function saveCurrentProfile(name){
  const d=getCtx();
  const input=d&&(d._input||d.input);
  if(!d||!input)return Promise.reject('无当前命盘数据');
  // 仅持久化"原始输入"，避免存入巨大对象
  const rec={bd:input.bd_raw||input.bd,timeStr:input.timeStr,bp:input.bp,gen:input.gen,q:input.q,useTrueSolar:!!input.useTrueSolar,name,createdAt:Date.now(),updatedAt:Date.now()};
  return dbPut(rec);
}
async function renderProfiles(){try{const list=await dbGetAll();const zone=document.getElementById('profileZone');const grid=document.getElementById('profileGrid');const empty=document.getElementById('profileEmpty');const recentZone=document.getElementById('recentZone');const recentGrid=document.getElementById('recentGrid');
  if(!list.length){if(grid)grid.innerHTML='';if(empty)empty.style.display='block';if(zone)zone.style.display='block';if(recentZone)recentZone.style.display='none';return;}
  if(empty)empty.style.display='none';if(zone)zone.style.display='block';
  if(recentZone){recentZone.style.display='block';recentGrid.innerHTML=list.slice(0,3).map(p=>{const city=CD[p.bp]||{n:'未知'};const dg=p.bd?mkBazi(...p.bd.split('-').map(Number).concat([0])).D.g:'';const _bd=(p.bd||'1990-1-1').split('-').map(Number);const dy=mkDy(mkBazi(_bd[0],_bd[1],_bd[2],0),p.gen||'male',_bd[0]);const age=TJ.calcAge(_bd[0],_bd[1]||1,_bd[2]||1);const cDy=TJ.findDaYun(dy,age)||dy.ds[0];return`<div class="r-card" onclick="loadProfile(${p.id})"><div class="r-ava">${(p.name||'未').charAt(0)}</div><div class="r-info"><div class="r-name">${(p.name||'未命名').replace(/</g,'&lt;')}</div><div class="r-meta">当前大运：${cDy.g}${cDy.z} · ${CURR_YEAR}运势：${'★★★★☆'}<br>最近关注：${p.q||'综合'}</div></div><div class="r-arrow">›</div></div>`;}).join('');}
  if(grid)grid.innerHTML=list.slice(0,8).map(p=>{const city=CD[p.bp]||{n:'未知'};const d=new Date(p.updatedAt);return`<div class="r-card" onclick="loadProfile(${p.id})"><div class="r-ava">${(p.name||'未').charAt(0)}</div><div class="r-info"><div class="r-name">${(p.name||'未命名').replace(/</g,'&lt;')}</div><div class="r-meta">${p.bd||''} · ${city.n} · ${p.gen==='male'?'男':'女'}${p.useTrueSolar?'·真':''}</div></div><div style="position:absolute;top:6px;right:8px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9em;color:rgba(255,255,255,0.25);cursor:pointer;transition:all .15s;z-index:2" onclick="event.stopPropagation();deleteProfile(${p.id})">×</div></div>`;}).join('');
}catch(e){console.log('renderProfiles',e);}}
async function loadProfile(id){try{const list=await dbGetAll();const p=list.find(x=>x.id===id);if(!p)return;document.getElementById('bDate').value=p.bd||'';document.getElementById('bTime').value=p.timeStr||'09:00';document.getElementById('bPlace').value=p.bp||'';document.getElementById('cInp').value=(CD[p.bp]||{n:''}).n;document.getElementById('bGen').value=p.gen||'male';document.getElementById('bQ').value=p.q||'';const sw=document.getElementById('swTrueSolar');if(sw){if(p.useTrueSolar)sw.classList.add('on');else sw.classList.remove('on');document.getElementById('swText').textContent=(sw.classList.contains('on')?'开启':'关闭')+'真太阳时（按出生地经度精确换算时辰）';}const chips=document.getElementById('qChips');if(chips){chips.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.q===p.q));}calc();}catch(e){console.log('loadProfile',e);}}
async function deleteProfile(id){try{await dbDel(id);renderProfiles();}catch(e){console.log('deleteProfile',e);}}
function openSaveModal(){document.getElementById('saveModal').classList.add('open');const n=document.getElementById('saveName');n.value='';n.focus();}
function closeSaveModal(){document.getElementById('saveModal').classList.remove('open');}
function confirmSaveProfile(){const name=document.getElementById('saveName').value.trim();if(!name){alert('请输入档案名称');return;}saveCurrentProfile(name).then(()=>{closeSaveModal();renderProfiles();alert('已保存到档案库');}).catch(e=>alert('保存失败：'+e));}
async function exportProfiles(){try{const list=await dbGetAll();const blob=new Blob([JSON.stringify(list,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='问问大师档案_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);}catch(e){alert('导出失败');}}
async function handleImport(input){const file=input.files[0];if(!file)return;try{const text=await file.text();const arr=JSON.parse(text);if(!Array.isArray(arr))throw new Error('格式错误');let count=0;for(const p of arr){if(p.bd&&p.bp&&p.gen){delete p.id;p.updatedAt=Date.now();await dbPut(p);count++;}}renderProfiles();alert(`成功导入 ${count} 条档案`);}catch(e){alert('导入失败：'+e.message);}input.value='';}

(function(){const inp=document.getElementById('cInp'),hid=document.getElementById('bPlace'),dd=document.getElementById('cDD');let ai=-1;
function rdd(f){let h='',n=0;const q=(f||'').toLowerCase();CG.forEach(g=>{const m=g.c.filter(c=>!q||c.n.includes(q)||c.i.includes(q)||g.g.includes(q));if(!m.length)return;h+=`<div class="cg">${g.g}</div>`;m.forEach(c=>{h+=`<div class="co" data-i="${c.i}" data-n="${c.n}"><span>${c.n}</span><span class="cp">${g.g}</span></div>`;n++})});if(!n)h='<div style="padding:18px;text-align:center;color:rgba(255,255,255,0.3);font-size:.82em">未找到</div>';dd.innerHTML=h;ai=-1;dd.querySelectorAll('.co').forEach(el=>{el.addEventListener('mousedown',e=>{e.preventDefault();sel(el.dataset.i,el.dataset.n)})});}
function sel(i,n){hid.value=i;inp.value=n;dd.classList.remove('show')}
inp.addEventListener('focus',()=>{rdd(inp.value===(CD[hid.value]||{}).n?'':inp.value);dd.classList.add('show')});
inp.addEventListener('input',()=>{rdd(inp.value);dd.classList.add('show')});
inp.addEventListener('blur',()=>setTimeout(()=>dd.classList.remove('show'),150));
inp.addEventListener('keydown',e=>{const opts=dd.querySelectorAll('.co');if(e.key==='ArrowDown'){e.preventDefault();ai=Math.min(ai+1,opts.length-1);opts.forEach((o,i)=>o.classList.toggle('act',i===ai));if(opts[ai])opts[ai].scrollIntoView({block:'nearest'})}else if(e.key==='ArrowUp'){e.preventDefault();ai=Math.max(ai-1,0);opts.forEach((o,i)=>o.classList.toggle('act',i===ai))}else if(e.key==='Enter'){e.preventDefault();if(ai>=0&&opts[ai])sel(opts[ai].dataset.i,opts[ai].dataset.n)}else if(e.key==='Escape')dd.classList.remove('show')})})();

document.addEventListener('DOMContentLoaded',()=>{
  initDB().then(()=>renderProfiles()).catch(e=>console.log('DB init',e));
  const ai=document.getElementById('askInput');
  if(ai){
    ai.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doAskCustom()}});
    ai.addEventListener('input',aiOnInputSuggest);
    ai.addEventListener('focus',aiOnInputSuggest);
    ai.addEventListener('blur',()=>setTimeout(()=>{const s=document.getElementById('aiSuggest');if(s)s.classList.remove('show');},200));
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const ask=document.getElementById('aiSheet');if(ask&&ask.classList.contains('open')){closeAsk();return;}
      const save=document.getElementById('saveModal');if(save&&save.classList.contains('open')){closeSaveModal();return;}
      const rq=document.getElementById('rqModal');if(rq&&rq.classList.contains('open')){closeRq();return;}
      const p2=document.getElementById('page2');if(p2&&(p2.classList.contains('active')||!p2.classList.contains('hidden'))){goBack();return;}
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();window.print();return;}
    if((e.ctrlKey||e.metaKey)&&e.key==='c'){const p2=document.getElementById('page2');if(p2&&p2.classList.contains('active')){e.preventDefault();copyReport();return;}}
    const p2=document.getElementById('page2');
    if(p2&&p2.classList.contains('active')){if(e.key>='1'&&e.key<='4'){const tabs=document.querySelectorAll('.tab-item');const idx=parseInt(e.key,10)-1;if(tabs[idx]){tabs[idx].click();return;}}}
  });
});

/* ====== 卡片折叠功能 ====== */
(function(){
  // —— 默认折叠：本地存储记录"用户已展开的卡片" ——
  const LS_KEY='tj_expanded_cards';
  function loadExpanded(){
    try{return JSON.parse(localStorage.getItem(LS_KEY)||'[]');}catch(e){return [];}
  }
  function saveExpanded(arr){
    try{localStorage.setItem(LS_KEY,JSON.stringify(arr));}catch(e){}
  }
  // 给所有 .glass.card-2 自动注入折叠按钮（card-1 默认不折叠 = 主信息）
  function injectToggles(){
    const expanded=loadExpanded();
    document.querySelectorAll('#page2 .glass.card-2[data-card]:not([data-collapsible]):not([data-no-collapse])').forEach(el=>{
      const hd=el.querySelector('.card-hd');
      if(!hd)return;
      const btn=document.createElement('button');
      btn.className='card-toggle';
      btn.type='button';
      btn.title='折叠/展开';
      btn.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
      hd.appendChild(btn);
      el.setAttribute('data-collapsible','1');
      const onToggle=function(e){
        if(e.target.closest('button:not(.card-toggle),a,input,select,svg.no-toggle'))return;
        toggleCard(el);
      };
      btn.addEventListener('click',e=>{e.stopPropagation();toggleCard(el);});
      hd.style.cursor='pointer';
      hd.addEventListener('click',onToggle);
      // —— 默认折叠：只有用户曾展开过的卡片才保持展开 ——
      const key=el.getAttribute('data-card');
      if(!expanded.includes(key))el.classList.add('collapsed');
    });
  }
  function toggleCard(el){
    const key=el.getAttribute('data-card');
    el.classList.toggle('collapsed');
    if(!key)return;
    let list=loadExpanded();
    if(el.classList.contains('collapsed')){
      list=list.filter(k=>k!==key);
    }else{
      if(!list.includes(key))list.push(key);
    }
    saveExpanded(list);
  }
  window._injectCardToggles=injectToggles;
})();

/* ====== 合并卡：⚠ 当下关注 子 tab 切换 ====== */
function focusSwitchTab(btn){
  const card=btn.closest('.focus-card');
  if(!card)return;
  const sub=btn.dataset.sub;
  card.querySelectorAll('.focus-tab').forEach(t=>t.classList.toggle('active',t===btn));
  card.querySelectorAll('.focus-pane').forEach(p=>p.classList.toggle('active',p.dataset.sub===sub));
}

/* ====== 信息密度：紧凑/详细 切换 + 返回顶部 ====== */
function toggleDensity(){
  document.body.classList.toggle('density-compact');
  const btn=document.getElementById('densityToggle');
  if(btn)btn.classList.toggle('on',document.body.classList.contains('density-compact'));
  try{localStorage.setItem('tj_density',document.body.classList.contains('density-compact')?'1':'0');}catch(e){}
}
(function(){
  // 还原上次设置
  try{if(localStorage.getItem('tj_density')==='1')document.body.classList.add('density-compact');}catch(e){}
  // 滚动监听显示返回顶部
  window.addEventListener('load',()=>{
    const sc=document.getElementById('p2Scroll');
    const btn=document.getElementById('backToTop');
    if(!sc||!btn)return;
    let ticking=false;
    sc.addEventListener('scroll',()=>{
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(()=>{
        btn.classList.toggle('show',sc.scrollTop>200);
        ticking=false;
      });
    },{passive:true});
    if(document.getElementById('densityToggle')&&document.body.classList.contains('density-compact')){
      document.getElementById('densityToggle').classList.add('on');
    }
  });
})();

/* =========================================================
   首页：粒子 + 鼠标跟随 + 卡片视差 + body.home 自动切换
   ========================================================= */
(function(){
  const ROOT=document.documentElement;
  const isMobile=window.matchMedia('(hover:none)').matches;

  // ---- body.home 状态管理（page1 显示时启用首页特效）----
  function applyHomeState(){
    const p1=document.getElementById('page1');
    const p2=document.getElementById('page2');
    const onHome=p1&&!p1.classList.contains('hidden')&&(!p2||p2.classList.contains('hidden')||!p2.classList.contains('active'));
    document.body.classList.toggle('home',onHome);
  }
  // 初始
  document.addEventListener('DOMContentLoaded',applyHomeState);
  // 监听 page1/page2 class 改动
  const obs=new MutationObserver(()=>applyHomeState());
  window.addEventListener('load',()=>{
    const p1=document.getElementById('page1'),p2=document.getElementById('page2');
    if(p1)obs.observe(p1,{attributes:true,attributeFilter:['class']});
    if(p2)obs.observe(p2,{attributes:true,attributeFilter:['class']});
    applyHomeState();
  });

  // ---- 鼠标跟随光球（含 lerp 拖尾）----
  if(!isMobile){
    const dot=document.getElementById('tjCursorDot');
    const ring=document.getElementById('tjCursorRing');
    if(dot&&ring){
      let mx=window.innerWidth/2,my=window.innerHeight/2;
      let dx=mx,dy=my,rx=mx,ry=my;
      let pressed=false;
      window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.classList.remove('hide');ring.classList.remove('hide');},{passive:true});
      window.addEventListener('mouseleave',()=>{dot.classList.add('hide');ring.classList.add('hide');});
      window.addEventListener('mousedown',()=>{pressed=true;ring.classList.add('active');});
      window.addEventListener('mouseup',()=>{pressed=false;ring.classList.remove('active');});
      // hover 检测：交互元素
      document.addEventListener('mouseover',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.add('hover');ring.classList.add('hover');
        }
      });
      document.addEventListener('mouseout',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.remove('hover');ring.classList.remove('hover');
        }
      });
      function tick(){
        dx+=(mx-dx)*0.4;dy+=(my-dy)*0.4;
        rx+=(mx-rx)*0.18;ry+=(my-ry)*0.18;
        dot.style.transform='translate3d('+dx+'px,'+dy+'px,0) translate(-50%,-50%)';
        ring.style.transform='translate3d('+rx+'px,'+ry+'px,0) translate(-50%,-50%)';
        requestAnimationFrame(tick);
      }
      tick();
    }
  }

  // ---- 粒子系统 ----
  const cv=document.getElementById('tjParticles');
  if(cv){
    const ctx=cv.getContext('2d');
    let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
    let parts=[];
    let mouseX=-9999,mouseY=-9999;
    function resize(){
      W=window.innerWidth;H=window.innerHeight;
      cv.width=W*DPR;cv.height=H*DPR;
      cv.style.width=W+'px';cv.style.height=H+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      const target=Math.min(70,Math.max(30,Math.floor(W*H/22000)));
      parts=[];
      for(let i=0;i<target;i++){
        parts.push({
          x:Math.random()*W,
          y:Math.random()*H,
          vx:(Math.random()-0.5)*0.18,
          vy:(Math.random()-0.5)*0.18,
          r:Math.random()*1.4+0.4,
          a:Math.random()*0.6+0.25,
          twinkle:Math.random()*Math.PI*2
        });
      }
    }
    window.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;},{passive:true});
    window.addEventListener('mouseleave',()=>{mouseX=-9999;mouseY=-9999;});

    let running=true;
    document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running)tick();});

    function tick(){
      if(!running)return;
      // 首页与测试结果页均绘制；报告页以纯星点呈现，减少连线干扰阅读。
      const isHome=document.body.classList.contains('home');
      const isReport=document.body.classList.contains('report-active');
      if(!isHome&&!isReport){
        ctx.clearRect(0,0,W,H);
        requestAnimationFrame(tick);return;
      }
      ctx.clearRect(0,0,W,H);
      // 取当前主题色
      const styles=getComputedStyle(document.documentElement);
      const h=styles.getPropertyValue('--accent-h').trim()||'38';
      const sat=styles.getPropertyValue('--accent-s').trim()||'55%';

      // 首页保留星点连线；测试结果页仅保留星点，视觉更像安静的星空。
      if(isHome)for(let i=0;i<parts.length;i++){
        const p=parts[i];
        for(let j=i+1;j<parts.length;j++){
          const q=parts[j];
          const dx=p.x-q.x,dy=p.y-q.y;
          const d2=dx*dx+dy*dy;
          if(d2<11000){
            const alpha=(1-d2/11000)*0.18;
            ctx.strokeStyle='hsla('+h+','+sat+',65%,'+alpha+')';
            ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
      }
      // 画粒子 + 鼠标交互
      for(const p of parts){
        p.x+=p.vx;p.y+=p.vy;
        p.twinkle+=0.04;
        if(p.x<0)p.x=W;else if(p.x>W)p.x=0;
        if(p.y<0)p.y=H;else if(p.y>H)p.y=0;
        // 鼠标排斥（轻微）
        const dx=p.x-mouseX,dy=p.y-mouseY;
        const d2=dx*dx+dy*dy;
        if(d2<14400){
          const f=(1-d2/14400)*0.6;
          p.x+=dx*f*0.04;p.y+=dy*f*0.04;
        }
        const tw=0.7+Math.sin(p.twinkle)*0.3;
        ctx.fillStyle='hsla('+h+','+sat+',75%,'+(p.a*tw)+')';
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener('resize',resize);
    tick();
  }

  // ---- 表单卡片视差倾斜 ----
  function bindTilt(el){
    if(!el||isMobile)return;
    let raf=null;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const px=x/r.width,py=y/r.height;
      // 光点位置（CSS 变量驱动 ::before 径向光）
      el.style.setProperty('--mx',(px*100).toFixed(1)+'%');
      el.style.setProperty('--my',(py*100).toFixed(1)+'%');
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const rx=(0.5-py)*4,ry=(px-0.5)*4;
        el.style.transform='perspective(900px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
      });
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transform='perspective(900px) rotateX(0) rotateY(0)';
      el.style.setProperty('--mx','50%');el.style.setProperty('--my','50%');
    });
  }
  // —— 全局：绑定到 .home-card 与所有 page2 内的 .glass 卡片 ——
  function bindAllTilt(){
    document.querySelectorAll('.home-card:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
    document.querySelectorAll('#page2 .glass:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
  }
  window.addEventListener('load',bindAllTilt);
  // 推算完成后 page2 内容会被重渲染，提供一个全局钩子
  window._rebindTilt=bindAllTilt;

  // ---- CTA 按钮涟漪 ----
  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest&&e.target.closest('.cta');
    if(!btn||btn.disabled)return;
    const r=btn.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    const size=Math.max(r.width,r.height);
    const rip=document.createElement('span');
    rip.className='cta-ripple';
    rip.style.width=rip.style.height=size+'px';
    rip.style.left=(x-size/2)+'px';rip.style.top=(y-size/2)+'px';
    btn.appendChild(rip);
    setTimeout(()=>rip.remove(),700);
  });
})();

/* ===== iOS 27 Liquid Glass：强度切换 + 标签栏指示条液化滑动 ===== */
function setGlassMode(mode){
  document.body.setAttribute('data-glass',mode);
  try{localStorage.setItem('tj_glass_mode',mode);}catch(e){}
  document.querySelectorAll('.lg-opt').forEach(o=>o.classList.toggle('active',o.dataset.mode===mode));
  const fab=document.getElementById('lgFab');if(fab)fab.classList.toggle('active',mode!=='standard');
}
function toggleLgPanel(){document.getElementById('lgPanel').classList.toggle('open');}
document.addEventListener('click',function(e){
  const panel=document.getElementById('lgPanel'),fab=document.getElementById('lgFab');
  if(panel&&panel.classList.contains('open')&&!panel.contains(e.target)&&e.target!==fab){panel.classList.remove('open');}
});
function moveTabIndicator(el){
  const ind=document.getElementById('tabIndicator');
  const wrap=document.getElementById('tabBar')&&document.getElementById('tabBar').querySelector('.tab-bar-inner');
  if(!ind||!wrap||!el)return;
  const wr=wrap.getBoundingClientRect(),er=el.getBoundingClientRect();
  ind.style.width=er.width+'px';
  ind.style.transform='translateX('+(er.left-wr.left)+'px)';
  ind.classList.add('ready');
}
window.addEventListener('resize',function(){
  const a=document.querySelector('.tab-item.active');
  if(a)moveTabIndicator(a);
});
(function initLiquidGlass(){
  let mode='standard';
  try{mode=localStorage.getItem('tj_glass_mode')||'standard';}catch(e){}
  setGlassMode(mode);
})();

/* ===== 新手版 / 大师版：术语解释 + 专业数据折叠 ===== */
const GLOSSARY={
  '八字':'把出生的年、月、日、时分别换算成天干地支，一共八个字，是这套命理分析的基础坐标。',
  '四柱':'年柱、月柱、日柱、时柱，八字按这四组"柱"排列，分别对应人生不同阶段的信息。',
  '天干':'甲乙丙丁戊己庚辛壬癸十个符号，用来纪年月日时，也各自对应一种五行属性。',
  '地支':'子丑寅卯辰巳午未申酉戌亥十二个符号，同样用于纪年月日时，也对应生肖和五行。',
  '十神':'把"我"和干支之间的五行生克关系归纳成十种角色（如正官、正财等），代表事业、财富、人际等不同人生面向。',
  '正官':'十神之一，通常关联规则、责任与稳定的事业发展，也象征约束力。',
  '七杀':'十神之一，代表压力、竞争与魄力，处理得当可转化为闯劲。',
  '正财':'十神之一，代表稳定、按部就班获得的财富与务实的物质基础。',
  '偏财':'十神之一，代表意外之财、投资机会或更灵活的赚钱方式。',
  '食神':'十神之一，代表才华的自然流露、口福与松弛的生活状态。',
  '伤官':'十神之一，代表表达欲、创造力，也可能意味着不按常理出牌。',
  '比肩':'十神之一，代表同辈助力、竞争对手，也象征自我意志。',
  '劫财':'十神之一，与比肩类似但更偏"争夺"，常和破财、合伙纠纷相关联。',
  '正印':'十神之一，代表长辈庇护、名誉、学识，是"被照顾"的力量。',
  '偏印':'十神之一，代表独立钻研、偏门技能，也可能显得孤僻。',
  '五行':'木、火、土、金、水五种基本属性，中国传统理论认为万物都由它们生克循环构成。',
  '大运':'每十年左右更换一次的运势阶段，用来观察人生不同十年的整体走势。',
  '流年':'具体到某一年的运势，比大运更细颗粒度，常和大运叠加分析。',
  '用神':'八字里最需要被"补强"的那个五行，找到它是判断吉凶的关键钥匙。',
  '忌神':'和用神相反，是命局里需要克制、避免过旺的五行。',
  '身强身弱':'用来判断一个人的基础能量是偏充足还是偏需要支持；它不代表好坏，只决定更适合主动发力还是先补足资源。',
  '身强':'指日主（代表自己的那个天干）力量偏旺，通常更适合"泄"或"克"来平衡。',
  '身弱':'指日主力量偏弱，通常更需要"生"或"扶"来补强。',
  '空亡':'某些干支组合在特定情况下力量被削弱的说法，常用来解释"该发生却没发生"的现象。',
  '三合':'三个地支组合在一起会增强某种五行力量，是命理里常见的"加成"关系。',
  '六冲':'两个地支相冲，代表变动、矛盾或需要主动化解的张力。',
  '刑冲破害':'几种地支之间的负向作用关系统称，通常提示需要留意的摩擦点。',
  '纳音':'干支组合对应的一种五行别称体系，常用于婚配、流年等辅助判断。',
  '月令':'出生月份对应的地支与季节能量，是判断命局强弱和环境影响的重要依据。',
  '藏干':'地支内部所包含的天干信息，可理解为不直接显露、但仍会发挥作用的能量。',
  '神煞':'命理中用于补充观察的特殊符号体系，常作为辅助参考，不单独决定结论。',
  '日主':'日柱天干，也就是代表你自己的那个字，是整张命盘的核心参照点。',
  '喜用':'对命局有帮助、值得借力的五行或十神，方向大致等同于"扬长"。',
  '十二长生':'把人生比作植物从萌芽到衰亡的十二个阶段，用来描述某个五行在不同地支上的强弱状态。'
};
let _glossKeys=null;
let _annotatedTerms=new Set();
function _getGlossKeys(){
  if(_glossKeys)return _glossKeys;
  _glossKeys=Object.keys(GLOSSARY).sort((a,b)=>b.length-a.length);
  return _glossKeys;
}
function resetGlossaryState(){_annotatedTerms=new Set();}
function annotateGlossary(root){
  if(!root)return;
  const keys=_getGlossKeys();
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const p=node.parentElement;
      if(!p)return NodeFilter.FILTER_REJECT;
      if(p.closest('script,style,.glossary-term,.mode-bar,.gloss-pop'))return NodeFilter.FILTER_REJECT;
      if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const targets=[];
  while(walker.nextNode())targets.push(walker.currentNode);
  targets.forEach(node=>{
    const text=node.nodeValue;
    const hits=[];
    // 一个文本节点可能同时出现多个术语：按文中出现顺序标出，
    // 但每个术语只取整篇报告的第一次出现。
    keys.forEach(k=>{
      if(_annotatedTerms.has(k))return;
      const i=text.indexOf(k);
      if(i>-1)hits.push({term:k,index:i});
    });
    hits.sort((a,b)=>a.index-b.index||b.term.length-a.term.length);
    const selected=[];let end=-1;
    hits.forEach(hit=>{
      if(hit.index>=end){selected.push(hit);end=hit.index+hit.term.length;}
    });
    if(!selected.length)return;
    const frag=document.createDocumentFragment();let cursor=0;
    selected.forEach(hit=>{
      if(hit.index>cursor)frag.appendChild(document.createTextNode(text.slice(cursor,hit.index)));
      const span=document.createElement('span');
      span.className='glossary-term';span.textContent=hit.term;span.dataset.term=hit.term;
      span.addEventListener('click',showGlossPop);frag.appendChild(span);
      _annotatedTerms.add(hit.term);cursor=hit.index+hit.term.length;
    });
    if(cursor<text.length)frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag,node);
  });
}
function showGlossPop(e){
  // 新手版与大师版均可点译：专业阅读时也无需离开报告查术语。
  e.stopPropagation();
  const trigger=e.currentTarget||e.target;
  const term=trigger.dataset.term;
  const def=GLOSSARY[term];if(!def)return;
  let pop=document.getElementById('glossPop');
  if(!pop){
    pop=document.createElement('div');pop.className='gloss-pop';pop.id='glossPop';
    pop.innerHTML='<div class="gloss-pop-tt" id="glossPopTt"></div><div class="gloss-pop-bd" id="glossPopBd"></div>';
    document.body.appendChild(pop);
  }
  document.getElementById('glossPopTt').textContent=term;
  document.getElementById('glossPopBd').textContent=def;
  const r=trigger.getBoundingClientRect();
  const vw=window.innerWidth,vh=window.innerHeight;
  let left=Math.min(Math.max(12,r.left),vw-272);
  let top=r.bottom+8;
  if(top+120>vh)top=Math.max(12,r.top-8-120);
  pop.style.left=left+'px';pop.style.top=top+'px';
  pop.classList.add('open');
}
document.addEventListener('click',function(e){
  const pop=document.getElementById('glossPop');
  if(pop&&pop.classList.contains('open')&&!e.target.closest('.glossary-term')){pop.classList.remove('open');}
});

function wrapProCollapsibles(root){
  if(!root)return;
  root.querySelectorAll('.pls, .qr-grid, table').forEach(el=>{
    if(el.dataset.proWrapped)return;
    el.dataset.proWrapped='1';
    const wrap=document.createElement('div');
    wrap.className='pro-wrap collapsed';
    el.parentNode.insertBefore(wrap,el);
    wrap.appendChild(el);
    const btn=document.createElement('div');
    btn.className='pro-toggle';
    btn.textContent='查看专业数值 ▾';
    btn.addEventListener('click',()=>{
      const collapsed=wrap.classList.toggle('collapsed');
      btn.textContent=collapsed?'查看专业数值 ▾':'收起专业数值 ▴';
    });
    wrap.parentNode.insertBefore(btn,wrap);
  });
}

function enrichBeginnerContent(root){annotateGlossary(root);wrapProCollapsibles(root);}

function setUserMode(mode){
  const isBeginner=mode==='beginner';
  document.body.classList.toggle('beginner-mode',isBeginner);
  try{localStorage.setItem('tj_user_mode',mode);}catch(e){}
  const beginnerBtn=document.getElementById('modeBeginner');
  const masterBtn=document.getElementById('modeMaster');
  if(beginnerBtn&&masterBtn){
    beginnerBtn.classList.toggle('active',isBeginner);
    masterBtn.classList.toggle('active',!isBeginner);
    beginnerBtn.setAttribute('aria-selected',isBeginner?'true':'false');
    masterBtn.setAttribute('aria-selected',isBeginner?'false':'true');
  }
  const pop=document.getElementById('glossPop');if(pop)pop.classList.remove('open');
  // 初次切入新手版时，确保动态生成的报告也完成了术语标注和数据折叠。
  if(isBeginner)enrichBeginnerContent(document.getElementById('p2Inner'));
}
function toggleUserMode(){setUserMode(document.body.classList.contains('beginner-mode')?'master':'beginner');}
(function initUserMode(){
  // 默认给首次使用者更易读的新手版；用户的手动选择会被记住。
  let mode='beginner';
  try{mode=localStorage.getItem('tj_user_mode')||'beginner';}catch(e){}
  setUserMode(mode);
})();
(function observeReportContent(){
  const target=document.getElementById('p2Inner');
  if(!target||typeof MutationObserver==='undefined')return;
  let t=null;
  const obs=new MutationObserver(()=>{
    clearTimeout(t);
    t=setTimeout(()=>enrichBeginnerContent(target),120);
  });
  obs.observe(target,{childList:true,subtree:true});
})();

/* 工具中心增强：搜索、分类、键盘可用性与更清晰的工具入口 */
(function(){
  const groups={
    all:'全部',money:'财富与事业',life:'日常决策',relation:'关系与沟通',play:'灵感与娱乐'
  };
  const map={wealth:'money',career:'money',layoff:'money',date:'life',style:'life',daily:'life',relation:'relation',zodiac:'relation',name:'play',oracle:'play',lottery:'play'};
  const labels={wealth:'收入与理财',career:'职业选择',date:'重要事项',style:'环境与状态',layoff:'职场预案',daily:'今日节奏',name:'名称灵感',oracle:'自我反思',lottery:'娱乐选号',zodiac:'生肖关系',relation:'关系分析'};
  function mount(){
    const hub=document.querySelector('#s-adv .tool-hub'),grid=hub&&hub.querySelector('.tool-grid');
    if(!hub||!grid||document.getElementById('toolsToolbar'))return;
    grid.id='toolGrid';
    const toolIds=['wealth','career','date','style','layoff','daily','name','oracle','lottery','zodiac','relation'];
    grid.querySelectorAll('.tool-tile').forEach((tile,index)=>{
      const m=(tile.getAttribute('onclick')||'').match(/openToolPage\(\s*['\"]([^'\"]+)['\"]\s*\)/);
      const id=(m&&m[1])||toolIds[index];
      if(!id)return;
      tile.dataset.tool=id;
      tile.dataset.group=map[id]||'life';
      tile.setAttribute('aria-label',labels[id]||'决策工具');
    });
    const bar=document.createElement('div');bar.className='tools-toolbar';bar.id='toolsToolbar';
    bar.innerHTML='<input class="tools-search" id="toolsSearch" type="search" placeholder="输入工具名称或关键词" aria-label="搜索工具"><div class="tools-filter" role="tablist">'+Object.entries(groups).map(([k,v])=>'<button type="button" data-group="'+k+'" class="'+(k==='all'?'active':'')+'">'+v+'</button>').join('')+'</div>';
    hub.insertBefore(bar,grid);
    let active='all';
    function render(){const q=(document.getElementById('toolsSearch').value||'').trim().toLowerCase();let count=0;grid.querySelectorAll('.tool-tile').forEach(t=>{const ok=(active==='all'||t.dataset.group===active)&&(!q||(t.textContent+' '+(labels[t.dataset.tool]||'')).toLowerCase().includes(q));t.classList.toggle('is-filter-hidden',!ok);if(ok)count++;});let empty=grid.querySelector('.tool-empty');if(!count){if(!empty){empty=document.createElement('div');empty.className='tool-empty';grid.appendChild(empty)}empty.textContent='没有找到匹配的工具，换个关键词试试。'}else if(empty)empty.remove();}
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.group;bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render();}));
    bar.querySelector('input').addEventListener('input',render);render();
  }
  const oldSwitch=window.switchTab;window.switchTab=function(el){if(oldSwitch)oldSwitch(el);if(el&&el.dataset.sec==='s-adv')setTimeout(mount,0)};
  document.addEventListener('DOMContentLoaded',mount);
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
})();

/* v3：统一工具引擎。每个工具只有“输入—判断—行动”三步，避免各自为政。 */
(function(){
 const T={
  wealth:{k:'财富与事业',icon:'◉',title:'财运与理财罗盘',desc:'把命盘节奏和真实现金流放在一起看，先建立安全垫，再安排增长。',fields:[['income','月到手收入','number','例如 15000'],['cost','月固定支出','number','例如 8000'],['cash','现有储蓄','number','例如 60000']]},
  career:{k:'财富与事业',icon:'↗',title:'转行与副业测评',desc:'不替你冲动跳船，而是判断准备度、现金流和验证路径。',fields:[['goal','目标','select',['转行','副业','创业']],['ready','准备程度','select',['已有技能和作品','已有方向但未验证','还没有明确方向']],['runway','可承受准备期','select',['1个月以内','1—3个月','3个月以上']]]},
  date:{k:'日常决策',icon:'◇',title:'重要事项择日助手',desc:'择日不替代现实条件，重点帮你补齐风险检查和行动准备。',fields:[['event','事项','select',['签约合作','面试入职','搬家出行','关系沟通']],['date','目标日期','date',''],['constraint','现实限制','textarea','例如：必须周五完成、对方只能晚上沟通']]},
  style:{k:'日常决策',icon:'✦',title:'能量穿搭与工位风水',desc:'将抽象的五行提示转成颜色、环境和专注习惯，避免复杂摆件依赖。',fields:[['scene','场景','select',['重要沟通','面试汇报','专注工作','休息恢复']],['space','当前环境问题','select',['杂乱、注意力分散','光线不足','久坐疲劳','没有明显问题']]]},
  layoff:{k:'财富与事业',icon:'⚠',title:'裁员风险预案',desc:'不做“会不会被裁”的确定性预测，综合公司信号、现金流缓冲与求职准备度，帮你判断应观察、准备还是立即行动。',fields:[['signal','公司信号（最重要）','select',['稳定增长','业务调整','部门收缩或冻结','已出现明确裁撤信号']],['buffer','现金流缓冲（月数）','select',['不足3个月','3—6个月','6个月以上']],['ready','求职准备度','select',['未准备','部分准备','随时可投递']]]},
  daily:{k:'日常决策',icon:'☼',title:'今日日签',desc:'每天只选一个重点，避免把建议变成新的压力。',fields:[['focus','今日重点','select',['推进工作','关系沟通','学习积累','休息恢复']],['energy','当前状态','select',['精力充足','普通','疲惫或焦虑']]]},
  name:{k:'灵感与娱乐',icon:'名',title:'智能起名工具',desc:'生成的是灵感方向，不替代读音、字义、重名和家族规范核验。',fields:[['surname','姓氏','text','请输入姓氏'],['style','风格','select',['简洁现代','温润典雅','大气坚定']],['wish','希望传达','text','例如：安定、聪慧、开阔']]},
  oracle:{k:'灵感与娱乐',icon:'☷',title:'摇签问卜',desc:'传统寺庙问卜：先按问题选择适合的签种，再抽取签诗。观音签适合综合求问；文王签适合事业、学业与方向；关帝签适合事业、承诺与行动；城隍签适合是非、契约与公道；土地公签适合家宅、搬迁与生活根基；财神签适合财务、经营与收入；爱情签适合感情关系；健康签适合作息与身心提醒。结果仅作自我反思参考。',fields:[['area','签种','select',['观音签','文王签','关帝签','城隍签','土地公签','财神签','爱情签','健康签']],['question','你的问题','textarea','只写一件具体的事']]},
  lottery:{k:'灵感与娱乐',icon:'◎',title:'娱乐选号',desc:'纯随机生成，不预测中奖，不使用命盘制造确定性。',fields:[['type','玩法','select',['双色球','超级大乐透']],['count','注数','select',['1','3','5']]]},
  zodiac:{k:'关系与沟通',icon:'♧',title:'生肖合冲分析',desc:'只作为传统文化参考，真正决定关系质量的是边界、沟通和共同目标。',fields:[['other','对方生肖','select','鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('')],['scene','关系场景','select',['亲密关系','朋友合作','家人沟通']]]},
  relation:{k:'关系与沟通',icon:'♡',title:'关系沟通方案',desc:'不再只给“合不合”，而是输出下一次沟通可以直接使用的方案。',fields:[['focus','关系类型','select',['亲密关系','朋友合作','家人沟通']],['issue','当前卡点','textarea','例如：对方不回复、分工不清、总是争吵'],['goal','希望改善','text','例如：把需求说清楚']]}
 };
 const val=id=>{const e=document.getElementById('v3_'+id);return e?e.value.trim():''};
 function esc(x){return String(x||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
 function field(f){let [id,label,type,extra]=f;let body=type==='select'?'<select id="v3_'+id+'">'+extra.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select>':type==='textarea'?'<textarea id="v3_'+id+'" placeholder="'+esc(extra)+'"></textarea>':'<input id="v3_'+id+'" type="'+type+'" placeholder="'+esc(extra)+'">';return '<div class="tj-field"><label for="v3_'+id+'">'+label+'</label>'+body+'</div>';}
 function base(type){const t=T[type];return '<div class="tj-tool-v3"><div class="tj-tool-intro"><div class="tj-tool-kicker">'+t.k+' · 问问大师工具</div><div class="tj-tool-title">'+t.icon+' '+t.title+'</div><div class="tj-tool-desc">'+t.desc+'</div></div><div class="tj-fields">'+t.fields.map(field).join('')+'</div><button class="tj-submit" onclick="TJToolRun(\''+type+'\')">生成我的方案</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">结果用于整理思路与行动规划，不构成投资、医疗、法律或职业确定性判断。</div></div>';}
 const chartTools=new Set(['wealth','career','date','style','layoff','name','zodiac','relation']);
 function result(title,body,score){const e=document.getElementById('v3_result'),d=window._ctx||window._baziData||{},wx=d.wx||{},chart=chartTools.has(window._activeTool)?'<div class="tj-chart-basis"><b>✦ 命盘依据</b><div><span>日主</span><strong>'+(d.dg||'—')+'</strong><span>有利方向</span><strong>'+(wx.ys||'—')+'</strong><span>事业评分</span><strong>'+(d.cs||'—')+'/100</strong><span>财富评分</span><strong>'+(d.ws||'—')+'/100</strong></div><p>以上信息用于校正工具建议的节奏与侧重点；现实信号、个人选择和专业意见优先。</p></div>':' ';e.innerHTML='<div class="tj-result-head"><div class="tj-result-title">'+title+'</div>'+(score?'<div class="tj-score">'+score+'</div>':'')+'</div>'+chart+'<div class="tj-result-body">'+body+'</div>';e.classList.add('show');e.scrollIntoView({behavior:'smooth',block:'nearest'});}
 function run(type){const d=window._ctx||window._baziData||{},wx=d.wx||{},scoreBase=d.cs||60;
  if(type==='wealth'){let income=+val('income'),cost=+val('cost'),cash=+val('cash');if(!income||cost<0){alert('请填写收入和支出');return}let surplus=Math.max(0,income-cost),months=cost?Math.floor(cash/cost):0;result('现金流优先级','每月结余约 <strong>'+surplus+'</strong>，结余率约 <strong>'+Math.round(surplus/income*100)+'%</strong>。储蓄可覆盖约 <strong>'+months+'个月</strong>固定支出。<div class="tj-result-list"><div><b>第一步</b><span>'+(months<3?'先补足3—6个月应急金，暂缓高波动投入。':'把应急金与长期资金分开管理。')+'</span></div><div><b>第二步</b><span>'+(surplus/income<.2?'优先优化固定支出或增加稳定收入。':'为长期目标设定自动化储蓄比例。')+'</span></div></div>');return}
  if(type==='career'){let ready=val('ready'),goal=val('goal');let s=Math.round(scoreBase+(ready==='已有技能和作品'?18:ready.includes('方向')?5:-12));result('准备度评估','目标：<strong>'+goal+'</strong>。当前准备度约 <strong>'+Math.max(35,Math.min(92,s))+' / 100</strong>。<div class="tj-result-list"><div><b>建议路径</b><span>'+(ready==='已有技能和作品'?'用真实项目、投递或试单验证，不必先等到完美。':ready.includes('方向')?'安排3次行业访谈，补齐作品或案例后再决定。':'先选择一个细分方向，完成一次低成本体验。')+'</span></div><div><b>底线</b><span>保留现金流，不建议在没有退出方案时裸辞或重投入。</span></div></div>');return}
  if(type==='date'){result('事项准备方案','事项：<strong>'+val('event')+'</strong>，日期：<strong>'+val('date')+'</strong>。<div class="tj-result-list"><div><b>必须确认</b><span>时间、对象、金额或交付边界，以及不可逆后果。</span></div><div><b>行动建议</b><span>提前准备备选方案；若现实条件不成熟，先准备而不是强行执行。</span></div></div>');return}
  if(type==='style'){let scene=val('scene'),space=val('space');result('环境行动方案','场景：<strong>'+scene+'</strong>。优先使用 '+(wx.ys||'当前有利元素')+' 的小面积颜色提示。<div class="tj-result-list"><div><b>马上调整</b><span>'+(space==='杂乱、注意力分散'?'清空桌面，只保留当前任务相关物品。':space==='光线不足'?'先改善光线和屏幕高度，再谈摆件。':space==='久坐疲劳'?'设置每50分钟起身的提醒。':'保持现有环境，减少额外布置。')+'</span></div><div><b>原则</b><span>舒适、整洁、可持续，比复杂风水布置更重要。</span></div></div>');return}
  if(type==='layoff'){let signal=val('signal'),buffer=val('buffer'),ready=val('ready'),d=window._ctx||window._baziData||{},chartScore=Math.round(((+d.cs||60)+(+d.ws||60))/2);let urgent=signal.includes('明确')||signal.includes('收缩');let risk=(signal.includes('明确')?62:signal.includes('收缩')?48:signal.includes('调整')?28:12)+(buffer.includes('不足')?16:buffer.includes('3—6')?8:0)+(ready==='未准备'?12:ready==='部分准备'?6:0)+Math.round((70-chartScore)*.18);risk=Math.max(8,Math.min(92,risk));let level=risk>=65?'高风险':risk>=40?'需提前准备':'目前可观察';result(level,'公司信号：<strong>'+signal+'</strong>。现金流：<strong>'+buffer+'</strong>。<div class="tj-result-list"><div><b>命盘节奏参考</b><span>结合当前命盘的事业与财富节奏评分（'+chartScore+'分）校正风险提示；命盘只用于节奏参考，不替代现实证据。</span></div><div><b>48小时内</b><span>'+ (urgent?'更新简历、作品集，整理合同、绩效和项目成果。':'记录最近成果，保持简历随时可更新。')+'</span></div><div><b>本周行动</b><span>'+ (ready==='未准备'?'联系2位行业联系人，建立外部机会。':'投递或验证1个真实机会，不把准备停留在收藏岗位。')+'</span></div></div>',risk+'%');return}
  if(type==='daily'){let focus=val('focus'),energy=val('energy');result('今日只做一件事','今日重点：<strong>'+focus+'</strong>。当前状态：<strong>'+energy+'</strong>。<div class="tj-result-list"><div><b>最小行动</b><span>'+(energy==='疲惫或焦虑'?'先做20分钟低阻力版本，不追求完成全部。':'安排一段不被打断的25分钟时间。')+'</span></div><div><b>结束标准</b><span>完成一个可见的小结果，晚上用3分钟复盘。</span></div></div>');return}
  if(type==='name'){let s=val('surname')||'你的姓氏',chars={木:['栩','森','苒'],火:['昭','昕','晗'],土:['安','屹','予'],金:['知','钰','书'],水:['澄','泓','沅']}[wx.ys]||['安','宁','知'];result('名称灵感','为「<strong>'+esc(s)+'</strong>」提供的方向：<strong>'+esc(val('style'))+'</strong>。<div class="tj-result-list"><div><b>候选组合</b><span>'+chars.map((c,i)=>esc(s+c+['然','宁','远'][i])).join('、')+'</span></div><div><b>核验清单</b><span>读音、字义、重名、方言谐音、家族习惯和正式登记规范。</span></div></div>');return}
  if(type==='oracle'){let p=['先做最小的一步，再观察反馈。','信息未齐时，暂缓承诺更稳妥。','把期待说清楚，避免用猜测代替沟通。','保持节奏，答案会在行动中出现。'];result('三段式启示','问题：<strong>'+esc(val('question')||'你的问题')+'</strong>。<div class="tj-result-list"><div><b>当下</b><span>'+p[Math.floor(Math.random()*p.length)]+'</span></div><div><b>行动</b><span>'+p[Math.floor(Math.random()*p.length)]+'</span></div><div><b>提醒</b><span>'+p[Math.floor(Math.random()*p.length)]+'</span></div></div>');return}
  if(type==='lottery'){let n=+val('count')||1,red=()=>Array.from({length:6},()=>Math.floor(Math.random()*33)+1).filter((x,i,a)=>a.indexOf(x)===i).sort((a,b)=>a-b).slice(0,6).map(x=>String(x).padStart(2,'0')).join(' · ');result('随机组合','玩法：<strong>'+val('type')+'</strong>。<div class="tj-result-list">'+Array.from({length:n},(_,i)=>'<div><b>第'+(i+1)+'注</b><span>红球 '+red()+'　蓝球 '+String(Math.floor(Math.random()*16)+1).padStart(2,'0')+'</span></div>').join('')+'</div>');return}
  if(type==='zodiac'){let self=d.b&&d.b.sx||'本命生肖',other=val('other'),same=self===other;result('相处提醒', '你：<strong>'+self+'</strong>，对方：<strong>'+other+'</strong>。<div class="tj-result-list"><div><b>观察重点</b><span>'+(same?'相似处容易形成共鸣，也可能在相同固执点上拉扯。':'先观察价值观、边界和现实配合，不以生肖单独下结论。')+'</span></div><div><b>沟通建议</b><span>把分工、时间和期待说清楚，减少“你应该懂”的猜测。</span></div></div>');return}
  if(type==='relation'){result('下一次沟通脚本','关系类型：<strong>'+val('focus')+'</strong>。<div class="tj-result-list"><div><b>开场</b><span>“我想把这件事说清楚，不是为了争输赢，而是希望我们更好配合。”</span></div><div><b>表达</b><span>描述事实 → 说出感受 → 提出一个具体请求：'+esc(val('goal'))+'</span></div><div><b>边界</b><span>如果现在不适合沟通，约定一个明确的回看时间，而不是无限等待。</span></div></div>');return}
 }
 window.TJToolRun=run;
 window.openToolPage=function(type){const d=document.getElementById('toolModal'),out=document.getElementById('toolModalContent');if(!d||!out||!T[type])return;window._activeTool=type;out.innerHTML=base(type);d.classList.add('open');setTimeout(()=>out.querySelector('input,select,textarea')?.focus(),120)};
})();

/* ============================================================================
   摇签问卜 · 专业签诗库（ORACLE_SIGNS）
   结构：每种签为一个数组，每首含
     n    签号
     grade 等级（上上签 / 上签 / 中签 / 下签）
     name 签名（典故出处）
     poem 签诗（七言四句）
     yi   圣意 / 签语
     jie  解曰（解读）
     dian 典故（出处故事）
   内容以传统签式写成，用于自我反思与行动参考，不作定论。
   ============================================================================ */
window.ORACLE_SIGNS = {
  '观音签':[
    {n:1,grade:'上上签',name:'钟离成道',poem:'开天辟地作良缘，吉日良时万物全。\n若得此签非小可，公侯将相在眼前。',yi:'开运亨通 · 功名显达 · 谋事皆成',jie:'此签居百签之首，主时运大开、根基已成。所求之事正当其时，宜把握机遇、积极作为，不必犹豫徘徊。',dian:'锺离权（正阳真人）悟道飞升之典，喻缘法具足、功到自然成。'},
    {n:2,grade:'上上签',name:'董永遇仙',poem:'鲸鱼未变守江河，不可升天离碧波。\n异日峥嵘身变化，许君一跃跳龙门。',yi:'潜龙在渊 · 待时而动 · 贵人来助',jie:'当下虽未显达，实乃蓄势之象。不宜躁进，待机缘成熟，自有贵人提携，一跃而上。',dian:'董永孝心感天、七仙女下凡结缘之典，喻至诚动天、困极则通。'},
    {n:3,grade:'中签',name:'董永卖身',poem:'临风冒雨去还乡，正是役役燕儿忙。\n衔得泥来成叠后，到头叠坏复成泥。',yi:'劳心费力 · 守成为宜 · 莫贪虚名',jie:'此签主奔波劳碌、所成有限。宜守本分、务实积累，勿为虚名所累，凡事慢一步方稳。',dian:'董永卖身葬父、辛勤偿债之典，喻责任心重、吃苦方能立业。'},
    {n:4,grade:'中签',name:'玉莲重圆',poem:'千年古镜复重圆，女再求夫男再婚。\n自此门庭多吉庆，更添福禄共团圆。',yi:'破镜重圆 · 旧好复续 · 家宅安康',jie:'离散者将复合，中断者将再续。事虽迟来，终归圆满，宜以包容待之。',dian:'玉莲历经离散终与十朋团聚之典，喻缘分未尽、守得云开。'},
    {n:5,grade:'中签',name:'刘晨遇仙',poem:'一锄二锄三四锄，五亩良田未足畊。\n依旧卖柴并卖水，推车到此运渐通。',yi:'勤苦立业 · 渐入佳境 · 莫嫌微利',jie:'初始辛苦、进项微薄，然持之以恒，运数将转。宜脚踏实地，不弃细流。',dian:'刘晨、阮肇入天台山遇仙之典，喻辛苦之中自有奇遇，贵在坚持。'},
    {n:6,grade:'中签',name:'仁贵遇主',poem:'投身岩下饲于菟，须是还他大丈夫。\n舍己还应难再得，通行天下此人无。',yi:'患难识真 · 终遇明主 · 名扬四方',jie:'困顿之中见本色，真才终被识用。宜守节操、待风云际会，自有出头之日。',dian:'薛仁贵埋名又显、终得李世民赏识之典，喻英雄不遇、遇则腾达。'},
    {n:7,grade:'下签',name:'苏娘涉险',poem:'奔波役役苦艰难，守旧安居莫起奸。\n行到不如休去好，遇危只宜问神仙。',yi:'诸事阻滞 · 守静为上 · 勿生妄念',jie:'此签主困顿多阻，强求反损。宜退守、安分勿动，待凶险过去再图。',dian:'苏秦游说受挫、狼狈归乡之典，喻时运不济、当敛锋芒。'},
    {n:8,grade:'上签',name:'裴度还带',poem:'茂林松柏耐风霜，雨雪纷纷总不摧。\n异日自然成大用，功名事业自安排。',yi:'坚忍不拔 · 晚成可期 · 德厚福临',jie:'如松柏经寒而益坚，逆境正可炼性。坚守正道，功名自有安排，不必焦虑。',dian:'裴度拾带还主、积德状元之典，喻善行有报、德厚者终显。'},
    {n:9,grade:'中签',name:'渊明归隐',poem:'舟到中流忽折舵，方知水上起风波。\n若求安稳无惊险，缩手回湾且暂过。',yi:'中途生变 · 宜退宜守 · 避其锋锐',jie:'事至中途忽生波折，硬闯有险。宜暂收手、回旋以避，过此关口再进。',dian:'陶渊明不为五斗米折腰、归隐田园之典，喻审时度势、知退保身。'},
    {n:10,grade:'上签',name:'刘备招亲',poem:'朦朦胧胧渺渺间，天台有路入云端。\n东风一举扶摇上，佳偶良缘两团圆。',yi:'喜事临门 · 姻缘天定 · 乘势而上',jie:'喜庆将至，婚缘或合作皆顺。宜乘东风、借势而为，喜事可成双。',dian:'刘备东吴招亲、弄假成真之典，喻看似险局、实则良缘暗成。'},
    {n:11,grade:'中签',name:'苏武牧羊',poem:'雪地冰天十九年，节旄落尽志犹坚。\n他日归汉恩荣重，方信初心不可迁。',yi:'守节不移 · 久困终回 · 信有后福',jie:'身处困厄而心志不改，虽久必回。宜忍辱负重、守定初心，时来终得昭雪。',dian:'苏武持节牧羊、十九年不改其志之典，喻忠信可感天、久屈必伸。'},
    {n:12,grade:'下签',name:'伯夷采薇',poem:'首阳山下采薇行，不食周粟守清名。\n清节虽高多寂寞，此心孤洁少人明。',yi:'孤高守节 · 清贫自甘 · 知音难觅',jie:'此签主清高而孤独，坚持己见却少人理解。宜量力而行，勿因守节而绝生路。',dian:'伯夷、叔齐不食周粟、隐于首阳之典，喻气节可贵、亦须审时。'},
    {n:13,grade:'上签',name:'张良遇黄石',poem:'圯上老人授素书，潜修数载运方舒。\n一朝佐汉开基业，功成身退是真儒。',yi:'得遇明师 · 韬光养晦 · 功成知退',jie:'得良师指点为幸，宜沉潜修习、待时而发。事成之后，知进退方得善终。',dian:'张良圯上纳履、得黄石公兵书之典，喻谦下受教、厚积薄发。'},
    {n:14,grade:'中签',name:'王质烂柯',poem:'樵客入山观弈棋，斧柯烂尽不知时。\n归来城郭人民改，一局之间世事移。',yi:'光阴易逝 · 超然物外 · 莫恋尘劳',jie:'世间荣枯转瞬即变，执着反生烦恼。宜放宽心境、不为一时得失所困。',dian:'王质观棋烂柯、山中方一日世上已千年之典，喻世事如棋、修心为本。'},
    {n:15,grade:'上上签',name:'麻姑献寿',poem:'东海扬尘几度秋，麻姑指爪暂经酬。\n蟠桃已熟瑶池宴，福寿双全乐未休。',yi:'福寿康宁 · 喜庆绵长 · 诸事吉祥',jie:'此签主福寿双全、喜庆盈门。所求皆吉，宜行善积德以承此运。',dian:'麻姑献寿、三见东海扬尘之典，喻长生久视、福缘深厚。'},
    {n:16,grade:'中签',name:'范蠡归湖',poem:'功成名遂早抽身，五湖烟水了余生。\n千金散尽还复聚，知止不殆是聪明。',yi:'功成身退 · 知足不辱 · 散财聚德',jie:'盛时当思退步，盈满则亏。宜知止、勿恋权财，退而能安、散而能聚。',dian:'范蠡助越灭吴后泛舟五湖之典，喻知进退、全始终。'}
  ],
  '文王签':[
    {n:1,grade:'上上签',name:'乾卦·潜龙勿用',poem:'潜龙在渊未可飞，藏锋养晦待时机。\n一朝云起风雷动，九五飞龙在天衢。',yi:'潜藏待时 · 勿妄动 · 大器晚成',jie:'乾卦初爻，阳刚潜藏。此时宜蛰伏蓄力，不宜轻举。时至则飞龙在天，势不可挡。',dian:'《易·乾》"潜龙勿用"，喻君子藏器于身、待时而动。'},
    {n:2,grade:'上上签',name:'坤卦·厚德载物',poem:'地势坤元厚且平，含章可贞事乃成。\n承天顺运行无咎，安贞之吉永和平。',yi:'顺天安贞 · 包容承载 · 以静制动',jie:'坤卦主顺，宜柔顺包容、守正不移。以静制动、以厚载物，自然无咎而吉。',dian:'《易·坤》"厚德载物"，喻顺承天道、以柔济刚。'},
    {n:3,grade:'中签',name:'屯卦·云雷屯',poem:'云雷屯塞草木萌，初生艰难未得亨。\n盘桓利居贞固志，经纶有待一朝清。',yi:'初创维艰 · 守正待清 · 勿急进',jie:'屯者，物之始生也。事业初创多阻，宜固守本志、徐图经营，不可冒进。',dian:'《易·屯》"刚柔始交而难生"，喻创业之初、困而求通。'},
    {n:4,grade:'中签',name:'蒙卦·山下出泉',poem:'山下出泉未达海，蒙童求我启其才。\n果行育德须耐心，雾散自见月明来。',yi:'启蒙待教 · 耐心导引 · 渐见光明',jie:'蒙卦主启蒙，事在初学未明。宜虚心受教、循序渐进，雾散则月明。',dian:'《易·蒙》"山下出泉，蒙"，喻童蒙求我、果行育德。'},
    {n:5,grade:'中签',name:'需卦·云上于天',poem:'云上于天尚未雨，饮食宴乐且安居。\n需于郊野无咎害，躁进逢凶慎所趋。',yi:'待时而动 · 饮食宴乐 · 戒躁进',jie:'需者，须也。时机未至，宜安守、养精蓄锐。妄动则险，耐心乃吉。',dian:'《易·需》"云上于天，需"，喻饮食宴乐、待命而行。'},
    {n:6,grade:'下签',name:'讼卦·天水违行',poem:'天与水违争不已，争端初起慎防危。\n退让一言终得吉，讼终受屈悔迟归。',yi:'争讼多凶 · 宜和为贵 · 退让免灾',jie:'讼卦主争，强争必损。宜和解、退一步，硬讼到底终受其屈。',dian:'《易·讼》"天与水违行"，喻争辩不息、和为贵。'},
    {n:7,grade:'中签',name:'师卦·地中有水',poem:'地中有水聚众行，丈人持律可功成。\n纪律严明兵不躁，出师有律得荣名。',yi:'用众以律 · 恩威并施 · 持重得胜',jie:'师卦主军事，聚众行事贵在有律。宜立规矩、任贤能，持重则功成。',dian:'《易·师》"地中有水，师"，喻以正治国、用众有律。'},
    {n:8,grade:'上签',name:'比卦·水在地上',poem:'水在地上亲相辅，先迷后得主乃亨。\n比之无首终无咎，亲贤乐群自太平。',yi:'亲比相辅 · 择善而从 · 众志成城',jie:'比卦主亲辅，宜结良朋、依附贤明。同心相济，虽初迷终亨。',dian:'《易·比》"水在地上，比"，喻亲附得人、和乐太平。'},
    {n:9,grade:'中签',name:'小畜·风行天上',poem:'风行天上云未雨，小畜之时宜养文。\n密云不雨须待月，积微成著渐敷陈。',yi:'小有所蓄 · 文德渐进 · 待时而施',jie:'小畜主小成，力量未充。宜修文德、积小善，待时而发，勿求骤进。',dian:'《易·小畜》"风行天上"，喻积蓄未盛、以懿文德。'},
    {n:10,grade:'中签',name:'履卦·上天下泽',poem:'履虎尾兮不咥人，危行兢兢步亦辛。\n素履往而无咎害，履道坦坦保其身。',yi:'履危而慎 · 素位而行 · 临深履薄',jie:'履卦主行，如履虎尾。宜谨慎恭行、守本分，险中求安、方得无咎。',dian:'《易·履》"上天下泽，履"，喻辨上下、慎其所履。'},
    {n:11,grade:'上上签',name:'泰卦·天地交泰',poem:'天地交泰气氤氲，小往大来万象新。\n君子道长阴渐退，太平有象乐无垠。',yi:'通泰安康 · 阴阳和合 · 诸事顺遂',jie:'泰卦主通，天地交而万物通。时运大开，上下和同，所谋皆遂。',dian:'《易·泰》"天地交，泰"，喻小往大来、吉亨之象。'},
    {n:12,grade:'下签',name:'否卦·天地不交',poem:'天地不交闭塞成，小人道长君子隐。\n否极泰来终有日，俭德避难待时清。',yi:'闭塞之秋 · 君子隐退 · 否极泰来',jie:'否卦主塞，上下不通、小人道长。宜俭德避难、韬光养晦，待否极泰来。',dian:'《易·否》"天地不交，否"，喻时运乖舛、守正待转。'}
  ],
  '关帝签':[
    {n:1,grade:'上上签',name:'关公受封',poem:'丹心贯日气如虹，汉寿亭侯爵位崇。\n义薄云天垂万古，威灵显赫护苍穹。',yi:'忠义昭彰 · 名位显达 · 威德护身',jie:'此签主忠义立身、名扬天下。守正持义者得神佑，谋事光明，无往不利。',dian:'关羽封汉寿亭侯、后世尊为关圣之典，喻忠义感天、德威并隆。'},
    {n:2,grade:'上上签',name:'桃园结义',poem:'桃园三结义参天，誓同生死矢弗谖。\n手足同心金可断，扶持大业共安然。',yi:'同心协力 · 结义扶持 · 共成大业',jie:'兄弟同心、其利断金。宜结同心之盟、信守承诺，互助则事无不济。',dian:'刘关张桃园三结义之典，喻同心一德、共赴大事。'},
    {n:3,grade:'中签',name:'千里走单骑',poem:'匹马单刀护二嫂，过关斩将路迢迢。\n初心不改归刘处，历尽艰危志更骄。',yi:'历险不移 · 忠信克难 · 终达所归',jie:'虽沿途险阻，持忠信可过关。宜坚守本心、不畏艰难，终得归处。',dian:'关羽过五关斩六将、护嫂寻刘备之典，喻忠勇笃定、无往不胜。'},
    {n:4,grade:'上签',name:'单刀赴会',poem:'大江东去浪滔滔，独驾扁舟气自豪。\n谈笑从容风险地，英风凛凛动波涛。',yi:'胆识过人 · 从容处险 · 威望日隆',jie:'临大局面不改色，胆识自能化险。宜沉着应对、以诚制变，威望自隆。',dian:'关羽单刀赴鲁肃之会之典，喻临危不惧、谈笑定局。'},
    {n:5,grade:'中签',name:'刮骨疗毒',poem:'箭创毒入骨难支，谈笑围棋刃不移。\n神定气闲真勇士，痛中犹见丈夫姿。',yi:'忍痛坚忍 · 神闲气定 · 硬汉本色',jie:'患难之中见定力，能忍常人所不能忍。宜镇定处之，磨难反成砥砺。',dian:'关羽刮骨疗毒、弈棋自若之典，喻刚毅镇定、愈挫愈勇。'},
    {n:6,grade:'下签',name:'败走麦城',poem:'骄兵必败古来言，麦城一蹶叹黄昏。\n胜时莫忘防疏失，慎始慎终保子孙。',yi:'盛极当防 · 骄则生败 · 慎终如始',jie:'此签警盛极而衰、因骄致败。宜谦逊戒满、常存戒心，方保长久。',dian:'关羽败走麦城之典，喻功高易骄、满招损、谦受益。'},
    {n:7,grade:'上签',name:'水淹七军',poem:'决水淹军七寨平，擒于禁而斩庞德。\n威声震处群凶伏，帷幄运筹功自盈。',yi:'智取制胜 · 运筹帷幄 · 威震四方',jie:'以智取胜、不战而屈人。宜用谋略、把握形势，自能克敌建功。',dian:'关羽水淹七军、擒于禁斩庞德之典，喻善用天时、智勇双全。'},
    {n:8,grade:'中签',name:'华容释曹',poem:'华容狭道遇旧恩，释曹一念见情真。\n恩怨分明君子度，留余余地后来人。',yi:'恩怨分明 · 留有余地 · 义字当先',jie:'不忘旧恩、留一线生机，乃君子之度。宜宽厚待人、勿赶尽杀绝。',dian:'关羽华容道义释曹操之典，喻知恩图报、义重于利。'},
    {n:9,grade:'上签',name:'夜读春秋',poem:'青灯黄卷夜沉吟，春秋大义耿丹心。\n文武兼资真国士，明伦识礼值千金。',yi:'修文明理 · 兼资文武 · 德望日隆',jie:'勤学明理、文武兼修者成大事。宜读书自省、以礼自持，德望自高。',dian:'关羽夜读《春秋》、明大义之典，喻好学尚礼、内圣外王。'},
    {n:10,grade:'中签',name:'秉烛达旦',poem:'秉烛中宵待晓天，清宵独坐意岿然。\n避嫌守礼心如水，廉节从来可格天。',yi:'守礼避嫌 · 清节如水 · 操守可风',jie:'处嫌疑之地而守礼自持，清节可风。宜洁身自好、不蹈瓜田李下。',dian:'关羽秉烛立于户外、护嫂避嫌之典，喻礼法自守、皎如日月。'},
    {n:11,grade:'上上签',name:'显圣护民',poem:'赤兔虽逝魂犹在，千里驰灵护世人。\n有祷皆应灾厄免，义神赫濯庇苍旻。',yi:'有求必应 · 灾厄可免 · 神威护佑',jie:'义神护佑、有祷辄应。心存忠义、行事光明者，自得庇荫、逢凶化吉。',dian:'关帝显圣护民、威灵赫濯之典，喻正气长存、庇佑善人。'},
    {n:12,grade:'中签',name:'玉泉显圣',poem:'玉泉山色郁森森，旧识高僧话夙因。\n了却尘缘归法界，英雄末路亦天真。',yi:'勘破尘缘 · 归真返本 · 放下自在',jie:'英雄亦有归处，执念宜放。宜看淡成败、了却挂碍，方得自在安稳。',dian:'关羽玉泉山显圣、与普净论夙因之典，喻放下执念、返本归真。'}
  ],
  '城隍签':[
    {n:1,grade:'上上签',name:'城隍摄政',poem:'明镜高悬照九幽，赏善罚恶法如流。\n衙门公正民无怨，户户笙歌庆有秋。',yi:'公正廉明 · 赏罚有信 · 诸事昭雪',jie:'此签主公道昭彰、是非分明。涉讼争议宜凭凭据、求公正，自有清断。',dian:'城隍主一方生死善恶、赏罚无私之典，喻法度清明、善恶有报。'},
    {n:2,grade:'中签',name:'夜审阴司',poem:'更深烛影对公庭，细勘因由辨伪情。\n莫道幽冥无耳目，欺心一事也难明。',yi:'暗室慎独 · 莫欺于心 · 虚实在查',jie:'事有隐曲，宜细查凭据、勿欺暗室。公道虽迟，终现真情。',dian:'城隍夜审、照见人心之典，喻举头三尺有神明、欺心难瞒。'},
    {n:3,grade:'中签',name:'契约分明',poem:'立字为凭墨未干，分毫界限要端看。\n口说无凭须据实，免教异日起波澜。',yi:'凭约为重 · 界限清晰 · 免生后争',jie:'凡事宜立据、界限分明，口头难凭。先定规矩再行事，可免日后纷争。',dian:'城隍掌人间契约、断争讼之典，喻立约如山、信守为要。'},
    {n:4,grade:'下签',name:'冤狱蒙尘',poem:'覆盆之下不见天，一时冤屈锁寒烟。\n须凭明镜重开照，洗垢湔瑕待岁迁。',yi:'暂受冤抑 · 待明得雪 · 勿自弃',jie:'此签主暂时受屈、真相未白。宜忍辱守正、保留凭据，时机至自得昭雪。',dian:'城隍平反冤狱、洗冤泽物之典，喻覆盆终开、久屈必伸。'},
    {n:5,grade:'上签',name:'善恶分明',poem:'善棋一着满盘香，恶念分毫损福堂。\n积善之家有余庆，城隍簿上记端详。',yi:'善恶有报 · 积善余庆 · 慎其念头',jie:'一念之间、福祸立判。宜多行方便、慎勿起恶，善积则福自厚。',dian:'城隍善恶簿录、毫厘不爽之典，喻积善余庆、积恶余殃。'},
    {n:6,grade:'中签',name:'守界安分',poem:'各守封疆各安身，越界侵牟必起嗔。\n分内营生安稳过，强求邻土反伤神。',yi:'安分守界 · 勿侵他人 · 守己则安',jie:'宜守本分、不越界限、不侵他人。贪得邻利反招是非，守己乃安。',dian:'城隍划界主一方安宁之典，喻各安其分、界清则和。'},
    {n:7,grade:'上上签',name:'阴骘庇后',poem:'阴德无声种福田，不求人见自绵绵。\n儿孙受报家门盛，冥冥之中护善缘。',yi:'阴德绵长 · 惠及儿孙 · 善有善报',jie:'暗中行善、不求人知，其报在子孙。宜广积阴骘，家门自兴。',dian:'城隍录阴德、荫及后人之典，喻施恩不伐、福贻子孙。'},
    {n:8,grade:'中签',name:'法堂听断',poem:'公堂肃肃鼓初挝，两造陈词仔细查。\n兼听则明偏则暗，从容剖决莫偏差。',yi:'兼听则明 · 从容剖决 · 勿偏勿私',jie:'遇争议宜兼听双方、不偏不私。从容查证、依法裁断，方得公允。',dian:'城隍升堂听断、兼听得明之典，喻听讼贵公、偏则失正。'},
    {n:9,grade:'下签',name:'徇私招谴',poem:'一念徇私暗室欺，天平倾斜咎难辞。\n城隍笔下无私曲，漏网终归有报时。',yi:'徇私必败 · 公器勿私 · 回头是岸',jie:'此签警以私害公、终受其报。宜即时悔改、归公去私，方免后殃。',dian:'城隍惩徇私枉法者之典，喻公器不可私用、天网恢恢。'},
    {n:10,grade:'上上签',name:'一方清平',poem:'政善刑清风俗淳，闾阎无事乐生民。\n城隍坐镇妖氛息，岁岁平安福满门。',yi:'清平无事 · 风俗归淳 · 阖境安康',jie:'此签主境域清平、诸事安宁。宜守法向善、和睦乡邻，自有太平之福。',dian:'城隍坐镇一方、邪祟不侵之典，喻德政安民、邪不干正。'}
  ],
  '土地公签':[
    {n:1,grade:'上上签',name:'福德正神',poem:'田头陌上老翁慈，护五谷而佑四时。\n但使仓廪实如昔，一家温饱乐熙熙。',yi:'根基稳固 · 衣食丰足 · 家宅安康',jie:'此签主家宅安宁、生计有靠。宜脚踏实地、勤理田畴，温饱无忧。',dian:'土地公（福德正神）护农佑民之典，喻厚土生养、安身立命。'},
    {n:2,grade:'中签',name:'安土重迁',poem:'一抔故土足安身，何必飘蓬向外尘。\n守得门前桑与梓，春风岁岁长精神。',yi:'守土安生 · 勿务远迁 · 本固枝荣',jie:'宜安居守业、深耕本处，勿轻离故土求远。根基稳则枝叶荣。',dian:'安土重迁、敬田神之俗，喻安居乐业、本固邦宁。'},
    {n:3,grade:'中签',name:'春耕秋获',poem:'春来布谷唤耕勤，一粒入泥万颗新。\n莫道农功无厚报，仓箱既盈笑颜真。',yi:'勤种有获 · 春播秋成 · 务实积累',jie:'一分耕耘一分得。宜早作准备、持续投入，时节至自有收成。',dian:'土地公司春耕、报秋成之典，喻天道酬勤、种善得善。'},
    {n:4,grade:'下签',name:'田瘠难耕',poem:'瘦土硗确草不生，强耘徒费力与情。\n不如易地营生业，莫守荒田误此生。',yi:'地薄难成 · 宜变则通 · 勿守穷途',jie:'此签主环境不利、强求无益。宜审时易地、另觅生机，勿困守穷途。',dian:'土地不腴则迁、适时而变之智，喻穷则思变、不宜固滞。'},
    {n:5,grade:'上签',name:'邻里和睦',poem:'比舍相邻共一墟，有无相济语如饴。\n里仁为美风和畅，岁岁平安无是非。',yi:'邻里相助 · 里仁为美 · 和睦无争',jie:'远亲不如近邻，宜和睦乡里、互通有无。人和则境安，是非自消。',dian:'土地公主一里和睦、排难解纷之典，喻里仁为美、守望相助。'},
    {n:6,grade:'中签',name:'守财有道',poem:'聚沙成塔亦非轻，细水长流日久盈。\n莫羡他人暴发富，稳收稳用度生平。',yi:'积少成多 · 细水长流 · 稳健持家',jie:'财不在暴，贵在长流。宜量入为出、稳收稳用，家道自厚。',dian:'土地公佑积贮、戒奢靡之典，喻稳健持家、聚沙成塔。'},
    {n:7,grade:'上上签',name:'风调雨顺',poem:'甘澍随风润九垓，田禾得水利农栽。\n年丰廪实民安堵，社鼓咚咚赛神来。',yi:'天时和顺 · 年丰民安 · 诸事遂意',jie:'此签主天时人事俱顺，年景丰饶。宜顺时而为、广种福田，喜庆盈门。',dian:'土地公行雨司穑、岁稔民安之典，喻风调雨顺、国泰民安。'},
    {n:8,grade:'中签',name:'修补旧基',poem:'老屋欹斜待补苴，及时修葺免倾欹。\n根基稳固墙垣整，风雨来时自不危。',yi:'修旧固本 · 及时补苴 · 防患未然',jie:'宜及早修补根基、整理旧业，勿待崩坏。防患未然，风雨无虞。',dian:'土地公佑修屋安基、护宅宁家之典，喻固本杜渐、居安思危。'},
    {n:9,grade:'下签',name:'田界之争',poem:'寸土相争起衅端，同根相煎两俱寒。\n各退一步宽如海，何苦区区较短长。',yi:'争界生衅 · 各退则宽 · 睦邻为上',jie:'此签主因小利起争。宜各退一步、以邻为亲，计较长短反伤和气。',dian:'土地公断界畔之争、劝人和睦之典，喻让他一尺、自宽一寸。'},
    {n:10,grade:'上上签',name:'福地长久',poem:'福地安居岁月长，鸡豚社酒醉斜阳。\n儿孙绕膝天伦乐，代代绵延福泽昌。',yi:'福地久居 · 天伦康乐 · 福泽绵延',jie:'此签主家运绵长、天伦和睦。宜安守福地、敦亲睦族，福泽及后。',dian:'土地公镇福地、荫护子孙之典，喻福地安居、瓜瓞绵绵。'}
  ],
  '财神签':[
    {n:1,grade:'上上签',name:'财神临门',poem:'金龙献瑞到门庭，仓廪盈充喜盈盈。\n开源节流皆有道，富而好礼更声名。',yi:'财源广进 · 富而好礼 · 门庭兴旺',jie:'此签主财星高照、进益可期。宜开源节流并重，富而修德，名实兼收。',dian:'财神（赵公明）赐财、护商利市之典，喻财星拱照、利市三倍。'},
    {n:2,grade:'上上签',name:'范蠡致富',poem:'陶朱三徙业弥昌，致富原为治生方。\n货殖有经知取与，千金散后复盈箱。',yi:'治生有方 · 知取知予 · 财散人聚',jie:'致富在经营有道、知进退取予。宜活络周转、不囤不赌，散而复聚。',dian:'范蠡（陶朱公）三致千金之典，喻货殖有经、富好行其德。'},
    {n:3,grade:'中签',name:'积财蓄水',poem:'细流汇海海方深，零蓄成裘暖不禁。\n莫笑锱铢积累慢，久长自有满囊金。',yi:'积微成著 · 零存整取 · 久必丰盈',jie:'财贵积累、不嫌细微。宜设常备、持之以恒，久则囊橐自丰。',dian:'财神主积贮、戒奢靡之典，喻聚沙成塔、勤则富。'},
    {n:4,grade:'中签',name:'市易待时',poem:'市价低昂如转轮，待昂而售莫贪昏。\n见好即收机莫失，迟疑坐困失金银。',yi:'待价而沽 · 见好即收 · 勿贪转失',jie:'买卖贵乘时，宜待价而沽、见好就收。贪高不止、迟疑不决皆失机。',dian:'财神司市易、示买卖时机之典，喻待时而动、知足不辱。'},
    {n:5,grade:'下签',name:'贪妄破财',poem:'利令智昏妄念生，贪高跌重悔难平。\n千金一掷随流水，方信知足是长生。',yi:'贪则致损 · 戒赌戒妄 · 知足常安',jie:'此签警贪妄败财。勿信暴利、勿赌侥幸，知足守常乃保身之道。',dian:'财神惩贪妄、示"难得之货令人行妨"之戒，喻贪痴招损。'},
    {n:6,grade:'上签',name:'四方通达',poem:'通衢四达货云屯，舟车所至利源奔。\n远贩近销皆得所，经营顺水过龙门。',yi:'财路通达 · 贸迁有无 · 经营顺遂',jie:'此签主商路畅通、贸迁得利。宜广结商缘、流通有无，顺水行舟。',dian:'财神开路引财、舟车利便之典，喻货通四海、利源不竭。'},
    {n:7,grade:'中签',name:'合伙分金',poem:'合伙经营义在先，分金明账两无嫌。\n同心戮力舟同济，账目清时情谊坚。',yi:'合伙贵信 · 明账无私 · 同心得利',jie:'合伙以信义为本，账目宜清、分利宜明。同心协力，则利情谊两全。',dian:'财神主公平交易、戒欺瞒之典，喻明算账、义和利生。'},
    {n:8,grade:'中签',name:'守财防漏',poem:'竹篮打水一场空，处处疏防漏乃穷。\n塞却漏卮先节用，仓箱渐实不为慵。',yi:'节用杜漏 · 先守后增 · 戒奢靡',jie:'进财同时须防漏。宜先节用、堵住无谓支出，仓箱方能渐实。',dian:'财神示"节流"之要、戒漏卮之喻，喻开源亦须节流。'},
    {n:9,grade:'上上签',name:'偏财有缘',poem:'意外之财天偶然，缘来莫拒亦休贪。\n得之用作济人处，福报回环胜万钱。',yi:'偏财偶得 · 得之济人 · 福报回环',jie:'偏财偶然、可受不可求。得之宜用于济急行善，施比受更有福。',dian:'财神赐意外之财、劝行善布施之典，喻舍得之间、福报回环。'},
    {n:10,grade:'下签',name:'负债压身',poem:'债台高筑压双肩，左支右绌实可怜。\n急须量入为出计，莫教雪上再加霜。',yi:'负债当理 · 量入为出 · 勿再举债',jie:'此签主债负缠身、周转不灵。宜紧缩开支、先理旧债，切勿雪上加霜。',dian:'财神示负债之戒、量入为出之法，喻无债一身轻、慎借为首。'},
    {n:11,grade:'上上签',name:'五谷丰登',poem:'岁稔年丰廪实充，农商两旺乐融融。\n仓中有粟心无惧，富在安居知足中。',yi:'物阜民丰 · 农商两旺 · 心安是富',jie:'此签主收成丰、生计足。宜安居务实、农商并顾，心安即是真富。',dian:'财神佑年丰、仓廪实之典，喻丰年足食、富在知足。'},
    {n:12,grade:'中签',name:'理财有度',poem:'三分储蓄七分用，留得余粮备岁凶。\n不奢不吝中为贵，家计从容乐亦同。',yi:'收支有度 · 留余备荒 · 中道最宜',jie:'理财贵中庸，不奢不吝。宜留备荒之资、量入为用，家计从容。',dian:'财神示"中道理财"、留余备患之训，喻用度有节、从容自安。'}
  ],
  '爱情签':[
    {n:1,grade:'上上签',name:'天作之合',poem:'天作之合缔良缘，琴瑟和鸣岁月妍。\n月老牵丝千里合，白头相守永团圆。',yi:'天定良缘 · 琴瑟和鸣 · 白头相守',jie:'此签主姻缘天成、情投意合。宜珍惜眼前人、以诚相待，白头可期。',dian:'月老系赤绳、千里姻缘一线牵之典，喻天作之合、缘分前定。'},
    {n:2,grade:'上上签',name:'牛郎织女',poem:'银河一水隔盈盈，岁岁今宵会鹊桥。\n离多聚少情难隔，相思深处见精诚。',yi:'暂别情深 · 精诚可越 · 佳期有信',jie:'虽暂分离、情不可隔。宜以诚相守、信有重逢，精诚终可越山河。',dian:'牛郎织女七夕渡鹊桥之典，喻相隔有情、终得相会。'},
    {n:3,grade:'中签',name:'破镜重圆',poem:'菱花破后重磨莹，缺月今宵再复盈。\n旧好休提前日过，相看依旧眼波清。',yi:'旧好复续 · 破镜重圆 · 既往不咎',jie:'离散者将复合，宜放下前嫌、以新相待。宽容处，情自圆。',dian:'乐昌公主破镜重圆之典，喻离而复合、前愆可泯。'},
    {n:4,grade:'中签',name:'比翼连枝',poem:'在天愿作比翼鸟，在地愿为连理枝。\n同心结得长生缕，莫教风雨易分离。',yi:'同心缔好 · 连理相依 · 患难与共',jie:'情贵同心、休戚与共。宜同舟共济、勿因微风细雨便言离散。',dian:'唐明皇、杨贵妃"比翼连理"之誓，喻恩爱弥笃、生死以之。'},
    {n:5,grade:'下签',name:'劳燕分飞',poem:'东劳西燕各在天，萍踪浪迹两茫然。\n强系丝萝终易断，不如放手任婵娟。',yi:'缘尽当放 · 强合易散 · 各自安好',jie:'此签主缘分已淡、强求反伤。宜体面放手、各自珍重，莫作茧自缚。',dian:'劳燕分飞、萍水难留之喻，喻缘来则聚、缘尽则散。'},
    {n:6,grade:'中签',name:'红绳暗系',poem:'不期而遇意阑珊，却有三生石上缘。\n莫负当前灯火夜，清谈浅笑亦姻缘。',yi:'意外结缘 · 随缘而遇 · 莫失当前',jie:'良缘或在不经意间。宜开放心怀、珍惜眼前相遇，随缘惜缘。',dian:'三生石上旧精魂、红绳暗系之典，喻宿缘不期而至。'},
    {n:7,grade:'上签',name:'举案齐眉',poem:'举案齐眉敬如宾，相庄以礼情愈真。\n家常茶饭皆滋味，平淡相守最相亲。',yi:'相敬如宾 · 平淡是真 · 日久情深',jie:'情在相敬、日久弥真。宜以礼相待、于平淡中见深情，不必外求热烈。',dian:'梁鸿、孟光举案齐眉之典，喻夫妻相敬、情义绵长。'},
    {n:8,grade:'中签',name:'沟通化隙',poem:'一番误会结层冰，话到明时冰自融。\n莫把猜疑藏腹内，推心一语见春容。',yi:'误会宜解 · 推心置腹 · 言归于好',jie:'隔阂多因不言。宜坦诚沟通、把话说明，猜疑化处、春意复生。',dian:'误会如冰、言语如阳之喻，喻开诚布公、冰释前嫌。'},
    {n:9,grade:'下签',name:'单思无寄',poem:'落花有意随流水，流水无心恋落花。\n一片痴心空付与，早回眸处有人家。',yi:'单恋无果 · 及时转念 · 莫误青春',jie:'此签主落花有意、流水无情。宜早日转念、收回痴心，自有可栖之处。',dian:'落花流水、单思难寄之喻，喻无缘强求、不如惜己。'},
    {n:10,grade:'上上签',name:'宜室宜家',poem:'桃之夭夭灼其华，之子于归宜室家。\n和顺一门生百福，琴书相伴乐无涯。',yi:'宜室宜家 · 家和百福 · 琴书可乐',jie:'此签主成家立业、门庭和顺。宜以和为贵、经营小家，福自内生。',dian:'《诗·桃夭》"宜其室家"之咏，喻婚嫁得宜、家和万事兴。'},
    {n:11,grade:'中签',name:'慢火温情',poem:'温火慢炖味方醇，情到深时不必嗔。\n莫羡他人花似火，自家灯火可相亲。',yi:'情贵长久 · 慢火温养 · 勿较人前',jie:'情如慢炖、久乃醇厚。宜不躁不比、于日常中温养，自有安稳。',dian:'温情似火、久炼成金之喻，喻平实相守、历久弥笃。'},
    {n:12,grade:'下签',name:'孽缘当断',poem:'荆棘丛中莫着迷，伤痕累累悔迟迟。\n抽身早断须臾痛，割爱方知是护持。',yi:'孽缘宜断 · 及早抽身 · 割爱护己',jie:'此签主有害之缘、当断则断。宜护己为先、勿陷愈深，短痛胜长痛。',dian:'荆棘缠身、当断不断反受其乱之喻，喻及时止损、方得护持。'}
  ],
  '健康签':[
    {n:1,grade:'上上签',name:'元气充盈',poem:'清气一团满绛宫，精神爽朗步生风。\n起居有常食有节，自然百脉自通融。',yi:'元气充沛 · 起居有常 · 百脉调和',jie:'此签主精气充足、体魄康强。宜守规律作息、饮食有节，自得安康。',dian:'中医"元气"之说、起居有常之训，喻养正存元、邪不可干。'},
    {n:2,grade:'中签',name:'动静相济',poem:'久坐伤肉劳伤神，宜动宜静两相匀。\n每日舒筋行百步，气血周流远病身。',yi:'劳逸有度 · 动静相济 · 气血流通',jie:'宜动静得宜、勿久坐过劳。常舒筋骨、令气血周流，可远疾患。',dian:'"流水不腐、户枢不蠹"之喻，喻常动则健、过逸则壅。'},
    {n:3,grade:'中签',name:'饮食有节',poem:'膏粱厚味损脾胃，淡饭粗茶养太和。\n节制口腹三分饿，胜服参苓岁月多。',yi:'饮食清淡 · 节量留三分 · 脾胃乃安',jie:'宜清淡有节、勿纵口腹。留三分饥、养脾胃中和，胜服补药。',dian:'养生"饮食有节"、留三分饥之训，喻淡食养中、过补反伤。'},
    {n:4,grade:'下签',name:'积劳成疾',poem:'长年透支不知休，积久成疴始觉愁。\n莫待沉疴方忆健，早将休息作良谋。',yi:'积劳致疾 · 早休为要 · 勿透支',jie:'此签警长期透支、积劳成病。宜及早休息调养，勿待病成方悔。',dian:'"积劳成疾"之戒、治未病之训，喻防微杜渐、休作良图。'},
    {n:5,grade:'上签',name:'调和情志',poem:'七情过极损其身，恬淡虚无养性真。\n怒时一笑宽怀抱，心平气和即病人。',yi:'情志调和 · 恬淡虚无 · 气和身安',jie:'病多从气生，宜调畅情志、少怒少忧。心平气和，便是无病之人。',dian:'中医"七情内伤"、恬淡养神之论，喻神安则形安。'},
    {n:6,grade:'中签',name:'顺应四时',poem:'春捂秋冻顺天时，寒暑往来各有宜。\n勿逆阴阳违节序，四时无恙一身随。',yi:'顺应四时 · 毋违寒暑 · 阴阳自和',jie:'宜顺四时而调摄，勿逆寒暑。春捂秋冻、与节序相应，身自无恙。',dian:'《内经》"法于阴阳、和于术数"之训，喻顺时摄生、天人相应。'},
    {n:7,grade:'上签',name:'导引吐纳',poem:'吐故纳新气自华，导引伸舒筋脉赊。\n朝暮殷勤行数息，形神俱妙乐无涯。',yi:'吐纳导引 · 数息炼形 · 形神俱妙',jie:'宜习吐纳导引、调息养形。朝暮行之，气血和畅、形神俱安。',dian:'吐纳导引、八段锦之类养生术，喻炼形养气、祛病延年。'},
    {n:8,grade:'中签',name:'药石为辅',poem:'药医不死病缠身，根本还凭自养真。\n莫恃参芪为常饵，养元固本胜求神。',yi:'药石为辅 · 养正为本 · 勿赖补药',jie:'药仅辅病、根本在自养。宜固本养元、勿恃补药，摄生重于求方。',dian:'"药医不死病"、养正御邪之训，喻扶正为本、药石为佐。'},
    {n:9,grade:'下签',name:'讳疾忌医',poem:'微恙初生讳不言，养痈遗患悔迟延。\n早寻良医除根本，莫教小疾成大愆。',yi:'小疾早治 · 勿讳于医 · 防微杜渐',jie:'此签警讳疾忌医、养小成大。宜及早就医、除患萌芽，勿拖延。',dian:'蔡桓公讳疾忌医、病入骨髓之典，喻早治为宜、讳则贻患。'},
    {n:10,grade:'上上签',name:'安享天年',poem:'少饮多餐步履轻，无忧无虑耳常温。\n心宽自有长年术，不药而康度此生。',yi:'心宽体健 · 不药而安 · 安享天年',jie:'此签主康宁长寿、无病而安。宜心宽少忧、起居有节，自然天年。',dian:'"心宽出少年"、不药而愈之喻，喻达观养寿、自得康宁。'}
  ]
};

(function(){
 const oldRun=window.TJToolRun;
 window.TJToolRun=function(type){
  if(type!=='oracle'){oldRun(type);return;}
  const out=document.getElementById('v3_result');if(!out)return;
  const q=(document.getElementById('v3_question')?.value||'').trim()||'你心中的问题';
  const area=document.getElementById('v3_area')?.value||'观音签';
  const SIGN_LIB = window.ORACLE_SIGNS || {};
  const lib = SIGN_LIB[area] || SIGN_LIB['观音签'] || [];
  const lot = lib.length ? lib[Math.floor(Math.random()*lib.length)] : null;
  const n = lot ? lot.n : (Math.floor(Math.random()*48)+1);
  const title = lot ? lot.name : '无名签';
  const grade = lot ? lot.grade : '中签';
  const poem = lot ? lot.poem : '';
  const yi = lot ? lot.yi : '';
  const jie = lot ? lot.jie : '';
  const dian = lot ? lot.dian : '';
  const qEsc = String(q).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const gradeClass = grade.indexOf('上')>-1 ? 'sg-up' : (grade.indexOf('下')>-1 ? 'sg-down' : 'sg-mid');
  const act = grade.indexOf('上')>-1
    ? '此签利进取，宜把握当下机缘、顺势而为，不必过疑。'
    : grade.indexOf('下')>-1
    ? '此签多阻滞，宜退守谨慎、先稳根基，待时运转圜再图。'
    : '此签宜守常渐进，按部就班、稳中求进，莫急莫怠。';
  out.innerHTML='<div class="tj-oracle-stage shake"><div class="tj-oracle-scene"><div class="tj-oracle-glow"></div><div class="tj-oracle-cup"></div><div class="tj-oracle-stick"></div><div class="tj-oracle-status">正在摇签 · 请专注你的问题</div></div></div><div class="tj-oracle-hint">'+area+' · 摇签中</div>';
  out.classList.add('show');out.scrollIntoView({behavior:'smooth',block:'nearest'});
  setTimeout(()=>{const stage=out.querySelector('.tj-oracle-stage');if(!stage)return;stage.classList.remove('shake');stage.classList.add('draw');stage.querySelector('.tj-oracle-status').textContent='签筒停下 · 正在抽取';},1450);
  setTimeout(()=>{const stage=out.querySelector('.tj-oracle-stage');if(!stage)return;stage.classList.remove('draw');stage.classList.add('reveal');stage.querySelector('.tj-oracle-status').textContent='签已出筒 · 第 '+n+' 签';},2700);
  setTimeout(()=>{
    out.innerHTML=''
      +'<div class="tj-result-head"><div class="tj-result-title">'+area+' · 第 '+n+' 签</div><div class="tj-score '+gradeClass+'">'+grade+'</div></div>'
      +'<div class="tj-result-body">'
      +'<div class="tj-oracle-name">『'+title+'』</div>'
      +'<div class="tj-oracle-poem">'+poem.replace(/\n/g,'<br>')+'</div>'
      +'<div class="tj-result-list">'
      +'<div><b>圣意</b><span>'+yi+'</span></div>'
      +'<div><b>解曰</b><span>'+jie+'</span></div>'
      +'<div><b>典故</b><span>'+dian+'</span></div>'
      +'<div><b>结合所问</b><span>你问：「'+qEsc+'」。以此签观之，'+act+'</span></div>'
      +'</div></div>'
      +'<div class="tj-disclaimer">签文为传统问卜之参详，用于自我反思与理顺思路；健康、法律、财务及关系等重大决定，请结合现实条件与专业意见，不以签文为定论。</div>';
    out.classList.add('show');
  },3550);
 };
})();

/* 二级页面控制：结果页与输入页分离，返回时保留用户输入 */
(function(){
 let observer=null;
 function install(){
  const root=document.getElementById('toolModalContent');if(!root||observer)return;
  observer=new MutationObserver(()=>{
   const tool=root.querySelector('.tj-tool-v3'),result=root.querySelector('.tj-result');
   if(!tool||!result||!result.classList.contains('show')||tool.classList.contains('result-mode'))return;
   tool.classList.add('result-mode');
   const type=window._activeTool||'';
   const title=(root.querySelector('.tj-tool-title')?.textContent||'工具结果').replace(/^[^\s]+\s/,'');
   const head=document.createElement('div');head.className='tj-result-page-head';head.innerHTML='<button class="tj-result-back" type="button" aria-label="返回输入页">‹</button><div><div class="tj-result-page-kicker">RESULT · 结果页</div><div class="tj-result-page-title">'+title+'</div></div>';
   result.prepend(head);
   const actions=document.createElement('div');actions.className='tj-result-actions';actions.innerHTML='<button class="secondary" type="button">重新填写</button><button class="primary" type="button">完成</button>';
   result.appendChild(actions);
   const back=()=>{tool.classList.remove('result-mode');result.classList.remove('show');head.remove();actions.remove();root.querySelector('input,select,textarea')?.focus();};
   head.querySelector('button').onclick=back;actions.querySelector('.secondary').onclick=back;actions.querySelector('.primary').onclick=()=>closeToolPage();
  });
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 }
 const oldOpen=window.openToolPage;
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);setTimeout(()=>{observer=null;install()},30)};
 document.addEventListener('DOMContentLoaded',install);
})();

/* 二级结果页兜底修复：不依赖 MutationObserver，确保返回按钮始终生成 */
(function(){
 function promote(){
  const root=document.getElementById('toolModalContent'),tool=root&&root.querySelector('.tj-tool-v3'),result=root&&root.querySelector('.tj-result');
  if(!tool||!result||!result.classList.contains('show')||tool.classList.contains('result-mode'))return;
  tool.classList.add('result-mode');
  const old=result.querySelector('.tj-result-page-head');if(old)old.remove();
  const oldActs=result.querySelector('.tj-result-actions');if(oldActs)oldActs.remove();
  const title=(root.querySelector('.tj-tool-title')?.textContent||'工具结果').replace(/^[^\s]+\s/,'');
  const head=document.createElement('div');head.className='tj-result-page-head';head.innerHTML='<button class="tj-result-back" type="button" aria-label="返回输入页">‹</button><div><div class="tj-result-page-kicker">RESULT · 结果页</div><div class="tj-result-page-title">'+title+'</div></div>';
  const actions=document.createElement('div');actions.className='tj-result-actions';actions.innerHTML='<button class="secondary" type="button">重新填写</button><button class="primary" type="button">完成</button>';
  result.prepend(head);result.appendChild(actions);
  const back=()=>{tool.classList.remove('result-mode');result.classList.remove('show');head.remove();actions.remove();root.querySelector('input,select,textarea')?.focus();};
  head.querySelector('.tj-result-back').onclick=back;actions.querySelector('.secondary').onclick=back;actions.querySelector('.primary').onclick=()=>closeToolPage();
 }
 setInterval(promote,120);
 const oldRun=window.TJToolRun;
 window.TJToolRun=function(type){if(oldRun)oldRun(type);setTimeout(promote,80);setTimeout(promote,500);setTimeout(promote,1200);};
})();

/* 工具精进层：统一校验、历史记录、结果复制与风险提示 */
(function(){
 const KEY='tj_tool_history_v2';
 const esc=x=>String(x||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
 function save(type){const root=document.getElementById('toolModalContent');const title=root?.querySelector('.tj-tool-title')?.textContent||type;let a=read().filter(x=>x.type!==type);a.unshift({type,title:title.replace(/^\S+\s/,''),at:Date.now()});try{localStorage.setItem(KEY,JSON.stringify(a.slice(0,8)))}catch(e){}}
 function validate(type){const root=document.getElementById('toolModalContent');if(!root)return false;const fields=[...root.querySelectorAll('.tj-field input,.tj-field textarea')];for(const el of fields){if(el.type==='date'&&!el.value){alert('请先选择目标日期');el.focus();return false}if(el.tagName==='TEXTAREA'&&type!=='oracle'&&type!=='relation'&&!el.value.trim()){alert('请补充具体问题或限制条件');el.focus();return false}}if(type==='wealth'){const income=+document.getElementById('v3_income')?.value,cost=+document.getElementById('v3_cost')?.value;if(!income||cost<0||cost>income*10){alert('请检查收入与支出数据');return false}}return true}
 function historyHtml(){const a=read();if(!a.length)return '';return '<div class="tj-history"><div class="tj-history-title">最近使用</div>'+a.slice(0,4).map(x=>'<div class="tj-history-item"><span>'+esc(x.title)+'</span><time>'+new Date(x.at).toLocaleDateString('zh-CN')+'</time></div>').join('')+'</div>'}
 function addMeta(type){const result=document.querySelector('#toolModalContent .tj-result');if(!result||result.querySelector('.tj-result-meta'))return;const meta=document.createElement('div');meta.className='tj-result-meta';meta.innerHTML='<span>已完成分析</span><span>结果仅供决策参考</span>';result.insertBefore(meta,result.firstChild);const hist=document.createElement('div');hist.innerHTML=historyHtml();result.appendChild(hist.firstElementChild||hist)}
 const oldRun=window.TJToolRun;
 window.TJToolRun=function(type){if(!validate(type))return;save(type);if(oldRun)oldRun(type);[120,500,1200,3800].forEach(ms=>setTimeout(()=>addMeta(type),ms));};
 const oldOpen=window.openToolPage;
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);setTimeout(()=>{const root=document.getElementById('toolModalContent');if(root&&!root.querySelector('.tj-history')){const h=document.createElement('div');h.className='tj-history';h.innerHTML=historyHtml();root.querySelector('.tj-tool-v3')?.appendChild(h)}} ,100)};
 document.addEventListener('click',e=>{const b=e.target.closest('.tj-result-actions .primary');if(!b)return;const r=document.querySelector('#toolModalContent .tj-result');if(!r)return;const text=r.innerText||'';navigator.clipboard?.writeText(text).then(()=>{const old=b.textContent;b.textContent='已复制结果';setTimeout(()=>b.textContent=old,1400)}).catch(()=>alert('复制失败，请手动选择结果文本'))});
})();

/* 修复三级页面返回：把返回按钮放到弹窗固定层，而不是依赖结果内容 */
(function(){
 function sync(){
  const sheet=document.querySelector('#toolModal .tool-sheet'),tool=document.querySelector('#toolModalContent .tj-tool-v3');if(!sheet)return;
  let b=sheet.querySelector('.tj-level-back');
  if(!b){b=document.createElement('button');b.className='tj-level-back';b.type='button';b.textContent='‹';b.setAttribute('aria-label','返回工具输入页');sheet.insertBefore(b,sheet.firstChild);}
  const open=!!(tool&&tool.classList.contains('result-mode'));sheet.classList.toggle('result-open',open);
  b.onclick=()=>{if(!tool)return;const result=tool.querySelector('.tj-result');tool.classList.remove('result-mode');sheet.classList.remove('result-open');if(result){result.classList.remove('show');result.querySelector('.tj-result-page-head')?.remove();result.querySelector('.tj-result-actions')?.remove();}tool.querySelector('input,select,textarea')?.focus()};
 }
 setInterval(sync,100);document.addEventListener('DOMContentLoaded',sync);
})();

/* 财运工具改版：移除金额输入，改用节奏、目标与风险偏好进行判断 */
(function(){
 const oldOpen=window.openToolPage;
 window.TJWealthNoAmount=function(){
  const out=document.getElementById('toolModalContent');if(!out)return;
  out.innerHTML='<div class="tj-tool-v3"><div class="tj-tool-intro"><div class="tj-tool-kicker">财富与事业 · 问问大师工具</div><div class="tj-tool-title">◉ 财运与理财罗盘</div><div class="tj-tool-desc">不要求填写收入金额，改从现金流节奏、财富目标和风险承受度，生成更容易执行的理财方向。</div></div><div class="tj-fields"><div class="tj-field"><label>目前现金流状态</label><select id="v3_w_cash"><option>稳定，有固定结余</option><option>基本稳定，但结余不多</option><option>收入波动较大</option><option>支出压力较大</option></select></div><div class="tj-field"><label>当前财富目标</label><select id="v3_w_goal"><option>建立安全垫</option><option>稳定增收</option><option>长期积累</option><option>准备重大支出</option></select></div><div class="tj-field"><label>风险承受度</label><select id="v3_w_risk"><option>偏稳健，不希望明显波动</option><option>可以接受适度波动</option><option>愿意承担较高波动</option></select></div><div class="tj-field"><label>近期最困扰的事</label><select id="v3_w_issue"><option>容易冲动消费</option><option>不知道如何分配结余</option><option>想增加收入来源</option><option>担心未来不确定性</option></select></div></div><button class="tj-submit" type="button" onclick="TJWealthRunNoAmount()">生成财富方案</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">本工具不提供投资金额、收益率或具体产品推荐，仅帮助整理财富节奏。</div></div>';
  const sheet=document.querySelector('#toolModal .tool-sheet');if(sheet)sheet.classList.remove('result-open');
  document.getElementById('toolModal').classList.add('open');
 }
 window.TJWealthRunNoAmount=function(){
  const d=window._ctx||window._baziData||{},wx=d.wx||{};const cash=document.getElementById('v3_w_cash').value,goal=document.getElementById('v3_w_goal').value,risk=document.getElementById('v3_w_risk').value,issue=document.getElementById('v3_w_issue').value;
  const first=cash.includes('压力')?'先减压：暂停非必要大额支出，建立一份固定支出清单。':cash.includes('波动')?'先稳流：至少保留一层备用资金，避免把不稳定收入当作固定收入。':'先分层：把日常、应急和长期目标分开管理。';
  const second=goal==='建立安全垫'?'优先建立3—6个月的应急储备。':goal==='稳定增收'?'优先提升可重复的收入来源，不把全部希望放在短期投机上。':goal==='准备重大支出'?'先设定时间表和备用方案，再决定支出节奏。':'用长期、分散、可持续的方式积累，不频繁追涨杀跌。';
  const third=risk.includes('较高')?'先确认自己能承受回撤和长期等待，再考虑高波动选择。':risk.includes('适度')?'采用分层策略：基础部分稳健，少量部分用于学习和试错。':'以流动性和本金安全为先，避免听信确定性收益。';
  const result=document.getElementById('v3_result');result.innerHTML='<div class="tj-result-head"><div class="tj-result-title">财富节奏方案</div><div class="tj-score">'+(d.ws||'—')+'</div></div><div class="tj-result-body">目标：<strong>'+goal+'</strong>。当前困扰：<strong>'+issue+'</strong>。<div class="tj-result-list"><div><b>第一优先级</b><span>'+first+'</span></div><div><b>目标路径</b><span>'+second+'</span></div><div><b>风险边界</b><span>'+third+'</span></div><div><b>本周行动</b><span>完成一次支出分类，写下一个可执行的财富动作，不追求一次解决所有问题。</span></div></div></div><div class="tj-disclaimer">命盘分数只作节奏参考，不构成投资、收益或产品建议。</div>';result.classList.add('show');
  const tool=result.closest('.tj-tool-v3');tool.classList.add('result-mode');const sheet=document.querySelector('#toolModal .tool-sheet');if(sheet)sheet.classList.add('result-open');
 }
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);if(type==='wealth')setTimeout(TJWealthNoAmount,40)};
})();

/* 今日日签改版：取消选项，打开即生成当日综合日签 */
(function(){
 const oldOpen=window.openToolPage;
 window.TJDailyRun=function(){
  const d=window._ctx||window._baziData||{},wx=d.wx||{},out=document.getElementById('v3_result');if(!out)return;
  const focus=wx.ys==='木'?'启动与拓展':wx.ys==='火'?'表达与推进':wx.ys==='土'?'整理与稳固':wx.ys==='金'?'取舍与执行':'流动与复盘';
  const text=wx.ys==='木'?'适合开始一件新事，先行动再优化。':wx.ys==='火'?'适合表达观点、推进沟通，但避免情绪化决定。':wx.ys==='土'?'适合整理计划、收纳环境，把基础打稳。':wx.ys==='金'?'适合处理重点任务、明确边界和做减法。':'适合复盘、调整节奏，让事情保持流动。';
  out.innerHTML='<div class="tj-result-head"><div class="tj-result-title">今日日签</div><div class="tj-score">'+(d.wx?.ys||'—')+'</div></div><div class="tj-result-body"><div class="tj-result-list"><div><b>今日主线</b><span>'+focus+'</span></div><div><b>宜</b><span>'+text+'</span></div><div><b>忌</b><span>避免同时处理太多目标，不在疲惫或焦虑时做重大决定。</span></div><div><b>今日行动</b><span>选一件最重要的小事，安排一段不被打断的时间完成它。</span></div></div></div><div class="tj-disclaimer">日签用于整理当日节奏，不替代现实判断。</div>';out.classList.add('show');out.closest('.tj-tool-v3').classList.add('result-mode');document.querySelector('#toolModal .tool-sheet')?.classList.add('result-open');
 };
 window.openToolPage=function(type){if(oldOpen)oldOpen(type);if(type==='daily')setTimeout(()=>{const root=document.getElementById('toolModalContent');if(!root)return;root.innerHTML='<div class="tj-tool-v3"><div class="tj-tool-intro"><div class="tj-tool-kicker">日常决策 · 问问大师工具</div><div class="tj-tool-title">☼ 今日日签</div><div class="tj-tool-desc">打开即可生成今日综合日签，不需要选择任何选项。</div></div><button class="tj-submit" type="button" onclick="TJDailyRun()">生成今日日签</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">日签仅用于自我提醒与节奏整理。</div></div>';},40)};
})();

/* 今日日签增强：更完整内容 + 原生分享 / 复制兜底 */
(function(){
 function share(){const r=document.getElementById('v3_result');const text='问问大师今日日签\n'+(r?.innerText||'');if(navigator.share){navigator.share({title:'问问大师今日日签',text}).catch(()=>{})}else if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>alert('今日日签已复制，可分享给朋友'))}else alert(text)}
 window.shareDailySign=share;
 const old=window.TJDailyRun;
 window.TJDailyRun=function(){
  if(old)old();
  setTimeout(()=>{const out=document.getElementById('v3_result');if(!out)return;out.classList.add('daily-sign-result');const d=window._ctx||window._baziData||{},wx=d.wx||{};const fav=wx.ys||'土';const title=fav==='木'?'今天适合打开局面':fav==='火'?'今天适合主动表达':fav==='金'?'今天适合做减法':fav==='水'?'今天适合调整节奏':'今天适合稳住基本盘';const extra='<div class="tj-result-list"><div><b>行动与协作</b><span>'+ (fav==='木'?'适合启动新项目、提出方案，先做出第一版。':fav==='火'?'适合汇报、谈判和推进卡住的事项，表达要直接但留余地。':fav==='金'?'适合清理待办、明确边界和结束低效沟通。':fav==='水'?'适合复盘信息、补足准备，不宜被外界节奏牵着走。':'适合整理流程、稳步交付，把基础工作做扎实。')+'</span></div><div><b>行动与协作</b><span>优先推进一件重要工作；沟通时先说事实，再说感受与请求，把分工和期待讲清楚。</span></div><div><b>状态与提醒</b><span>安排一次走动和补水，晚上减少屏幕；重要决定先复核，避免在疲惫或情绪高点拍板。</span></div></div><div class="tj-sign-actions"><button class="tj-sign-share" type="button" onclick="shareDailySign()">↗ 分享日签</button><button class="tj-sign-refresh" type="button" onclick="TJDailyRun()">↻ 重新生成</button></div>';if(!out.innerHTML.includes('工作与事业'))out.querySelector('.tj-result-body')?.insertAdjacentHTML('beforeend',extra)},80)
 };
})();

/* 流日驱动日签：以当日干支、流日十神和地支关系替代固定文案 */
(function(){
 const old=window.TJDailyRun;
 window.TJDailyRun=function(){
  const d=window._ctx||window._baziData||{},wx=d.wx||{},dg=d.dg||'日主';
  const gz=typeof getTodayGZ==='function'?getTodayGZ():'甲子';const dayGan=gz.charAt(0),dayZhi=gz.charAt(1);const dayWx=typeof GW!=='undefined'?GW[dayGan]:'土';const role=typeof SS!=='undefined'&&SS[dg]?SS[dg][dayGan]:'流日';
  const sheng={木:'火',火:'土',土:'金',金:'水',水:'木'},ke={木:'土',火:'金',土:'水',金:'木',水:'火'};
  const tone=role&&role.includes('财')?'适合处理收入、资源与现实安排':role&&role.includes('官')?'适合明确规则、责任和推进节点':role&&role.includes('印')?'适合学习、复盘和获得支持':role&&role.includes('食')?'适合表达、创作和输出成果':role&&role.includes('比')?'适合主动推进，也要注意边界':'适合按节奏完成当日重点';
  const relation=dayZhi===((typeof __TJX_V5!=='undefined'&&'')||'')?'':'流日地支「'+dayZhi+'」提示：安排留白，给临时变化留出空间。';
  const out=document.getElementById('v3_result');if(!out)return;out.classList.add('daily-sign-result');
  out.innerHTML='<div class="tj-result-head"><div><div class="tj-result-title">今日日签</div><div style="font-size:.68em;color:rgba(255,255,255,.42);margin-top:4px">流日 '+gz+' · '+dayWx+' · '+role+'</div></div><div class="tj-score">'+dayGan+'</div></div><div class="tj-result-body"><div class="tj-result-list"><div><b>今日主线</b><span>'+tone+'。</span></div><div><b>行动与协作</b><span>优先完成一件可见成果；沟通先说事实，再说需求。'+relation+'</span></div><div><b>状态与提醒</b><span>根据流日'+(dayWx===wx.ys?'与用神同气，适合顺势推进':'与当前用神不同，宜保留弹性')+'；重要决定先复核，避免在疲惫时拍板。</span></div></div></div><div class="tj-sign-actions"><button class="tj-sign-share" type="button" onclick="shareDailySign()">↗ 分享日签</button><button class="tj-sign-refresh" type="button" onclick="TJDailyRun()">↻ 重新生成</button></div><div class="tj-disclaimer">根据当日干支与命盘关系生成，仅用于节奏整理，不替代现实判断。</div>';out.classList.add('show');out.closest('.tj-tool-v3')?.classList.add('result-mode');document.querySelector('#toolModal .tool-sheet')?.classList.add('result-open');
 };
})();

/* 问问大师：快捷问题、用户气泡、上下文提示与更清晰的回答容器 */
(function(){
 const prompts=['我现在适合换工作吗？','最近财运要注意什么？','什么是七杀？','今天适合推进什么？'];
 function mount(){const head=document.querySelector('#aiSheet .ai-head');if(!head||document.getElementById('aiSuggestBar'))return;const bar=document.createElement('div');bar.className='ai-suggest-bar';bar.id='aiSuggestBar';bar.innerHTML=prompts.map(q=>'<button type="button">'+q+'</button>').join('');bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{document.getElementById('askInput').value=b.textContent;doAskCustom()});head.appendChild(bar)}
 const oldOpen=window.openAsk;window.openAsk=function(){if(oldOpen)oldOpen();setTimeout(mount,30)};
 const oldGenerate=window.generateAnswer;
 window.generateAnswer=function(q){if(oldGenerate)oldGenerate(q)};
})();

/* 对话化与白话化：专业概念只在必要时出现，并紧跟解释 */
(function(){
 const plain={
  '日主':'代表你自己的核心性格和能量','用神':'对你更有帮助的方向','身旺':'自身驱动力比较足','身弱':'更需要借助资源和支持','流年':'今年的整体环境','大运':'当前这十年阶段','十神':'命盘里的关系角色','官杀':'规则、压力和责任','财星':'收入、资源和现实回报','印星':'学习、支持和安全感','食伤':'表达、创意和输出','比劫':'自我意志与同伴关系','五行':'五种能量属性'
 };
 function human(t){let out=String(t||'');Object.keys(plain).forEach(k=>{out=out.replaceAll(k,k+'（'+plain[k]+'）')});return out.replace(/（[^）]+）（[^）]+）/g,m=>m.replace(/（[^）]+）(?=（)/,''));}
 function dialogue(sections){return '<div class="ai-dialogue">'+sections.map((x,i)=>'<div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问 · '+x.title+'</div>'+human(x.content).replace(/\n/g,'<br>')+'</div></div>').join('')+'</div>'}
 window.formatStandardAnswer=function(text){const titles=['结论','命理原因','当前阶段','行动建议'],arr=[];titles.forEach((t,i)=>{const m=String(text).match(new RegExp('【'+t+'】[:：]([\\s\\S]*?)(?=【'+(titles[i+1]||'END')+'】|$)'));if(m)arr.push({title:t==='结论'?'先说结论':t==='命理原因'?'我为什么这样判断':t==='当前阶段'?'放到你现在的处境':'你可以先这样做',content:m[1].trim()})});return arr.length?dialogue(arr):'<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text">'+human(text)+'</div></div></div>'};
 const oldSmart=window.renderSmartAnswer;
 window.renderSmartAnswer=function(res,q){if(!res)return oldSmart?oldSmart(res,q):'';const sections=(res.sections||[]).map((x,i)=>({title:i?'我再补充一点':'先说结论',content:x.content||''}));let html=dialogue(sections);if(res.related&&res.related.length)html+='<div class="ai-related"><div class="ai-related-h">你还可以继续问</div><div class="ai-related-list">'+res.related.map(r=>'<div class="ai-chip small" onclick="doAsk(\''+r.q.replace(/'/g,"\\'")+'\')">'+r.q+'</div>').join('')+'</div></div>';return html};
})();

/* 问问大师对话机制：不再使用 outerHTML 全量替换的暴力方式，而是安全追加元素 */
(function(){
 let chat = [];
 let busy = false;
 function esc(x){return String(x||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
 
 const oldGenerate=window.generateAnswer;
 window.generateAnswer=function(q){
   const el=document.getElementById('askResult');
   if(!el||busy)return;
   busy=true;
   chat.push({role:'user',text:q});
   
   // Create and append user bubble directly
   const bubble = document.createElement('div');
   bubble.className = 'ai-user-bubble';
   bubble.textContent = q;
   el.appendChild(bubble);
   
   // Add typing indicator
   const typingWrap = document.createElement('div');
   typingWrap.className = 'ai-answer-wrap loading-state';
   typingWrap.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
   el.appendChild(typingWrap);
   el.scrollTop=el.scrollHeight;
   
   let settled=false;
   const finish=()=>{
     if(settled)return;
     const typing=el.querySelector('.loading-state');
     if(typing)return; // Still typing
     
     // Find the newly added element (not typing and not user)
     const nodes = [...el.children];
     const answer = nodes[nodes.length-1];
     if(!answer || answer.className === 'ai-user-bubble') return;
     
     const html = answer.innerHTML;
     chat=chat.filter((m,i)=>!(m.role==='answer'&&i===chat.length-1));
     chat.push({role:'answer',html});
     settled=true;
     busy=false;
   };
   
   const ob=new MutationObserver(()=>setTimeout(finish,80));
   ob.observe(el,{childList:true,subtree:true});
   
   if(oldGenerate)oldGenerate(q);
   setTimeout(()=>{if(!settled){ob.disconnect();busy=false}},30000);
 };
 const oldNew=window.newAskChat;
 window.newAskChat=function(){
   chat=[];
   busy=false;
   const el=document.getElementById('askResult');
   if(el)el.innerHTML='';
   if(oldNew)oldNew();
 };
 
 // Restore chat session logic when opening
 const oldOpen = window.openAsk;
 window.openAsk = function() {
   if(oldOpen) oldOpen();
   setTimeout(() => {
     const el=document.getElementById('askResult');
     if (el && chat.length > 0 && el.children.length === 0) {
        // Restore from chat context
        chat.forEach(m => {
          if (m.role === 'user') {
            const b = document.createElement('div');
            b.className = 'ai-user-bubble';
            b.textContent = m.text;
            el.appendChild(b);
          } else if (m.role === 'answer') {
            const b = document.createElement('div');
            b.className = 'ai-answer-wrap';
            b.innerHTML = m.html;
            el.appendChild(b);
          }
        });
        el.scrollTop = el.scrollHeight;
     }
   }, 50);
 };
})();

/* 产品核心交互：会话状态、草稿、字符提示、自然输入 */
(function(){
 function mountCore(){
  const sheet=document.getElementById('aiSheet'),head=sheet&&sheet.querySelector('.ai-head'),row=document.getElementById('askInput')?.closest('.ai-input-row');if(!sheet||!head||!row||document.getElementById('aiSessionBar'))return;
  const bar=document.createElement('div');bar.className='ai-session-bar';bar.id='aiSessionBar';bar.innerHTML='<span><i class="ai-session-dot"></i>当前对话 · 已结合命盘</span><button class="ai-session-clear" type="button">清空对话</button>';head.insertAdjacentElement('afterend',bar);
  bar.querySelector('button').onclick=()=>{if(confirm('清空当前对话？'))newAskChat()};
  const hint=document.createElement('div');hint.className='ai-compose-hint';hint.innerHTML='<span>Enter 发送 · Shift + Enter 换行</span><b id="aiCount">0 / 500</b>';row.insertAdjacentElement('afterend',hint);
  const input=document.getElementById('askInput');input.setAttribute('maxlength','500');input.setAttribute('aria-label','输入你想咨询的问题');
  input.addEventListener('input',()=>{document.getElementById('aiCount').textContent=input.value.length+' / 500';try{sessionStorage.setItem('tj_ai_draft',input.value)}catch(e){}});
  try{input.value=sessionStorage.getItem('tj_ai_draft')||'';document.getElementById('aiCount').textContent=input.value.length+' / 500'}catch(e){}
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doAskCustom()}});
 }
 const oldOpen=window.openAsk;window.openAsk=function(){if(oldOpen)oldOpen();setTimeout(mountCore,40)};
 document.addEventListener('DOMContentLoaded',mountCore);
})();

(function(){const old=window.openAsk;window.openAsk=function(){if(old)old();setTimeout(()=>{const d=window._ctx||window._baziData,c=document.getElementById('aiContext');if(c&&d)c.innerHTML='<span>✦ 已结合命盘</span><b>'+d.dg+d.dw+' · '+(d.wx?.st?'行动型节奏':'蓄力型节奏')+' · 可以直接聊事业、关系或近期选择</b>'},50)}})();

(function(){const old=window.openAsk;window.openAsk=function(){if(old)old();setTimeout(()=>{const d=window._ctx||window._baziData,c=document.getElementById('aiContext');if(c&&d)c.innerHTML=d.isDemoPreview?'<span class="ai-demo-context">✦ 示例报告</span><b>'+d.dg+d.dw+' · 体验用示例命盘</b>':'<span>✦ 已结合命盘</span><b>'+d.dg+d.dw+'</b>'},50)}})();

/* 回复提炼：把旧的四段式输出压缩成一条自然回应 */
(function(){
 const oldFormat=window.formatStandardAnswer;
 function clean(x){return String(x||'').replace(/【[^】]+】[:：]?/g,'').replace(/\s+/g,' ').trim()}
 window.formatStandardAnswer=function(text){
  const s=String(text||''),pick=t=>{const m=s.match(new RegExp('【'+t+'】[:：]([\\s\\S]*?)(?=【|$)'));return m?clean(m[1]):''};
  const c=pick('结论'),r=pick('命理原因'),a=pick('行动建议');let body=[c,r,a].filter(Boolean).join(' ');if(!body&&oldFormat)return oldFormat(text);body=body.length>180?body.slice(0,177)+'…':body;return '<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问</div>'+body+'</div></div></div>';
 };
 const oldSmart=window.renderSmartAnswer;
 window.renderSmartAnswer=function(res,q){if(!res)return oldSmart?oldSmart(res,q):'';let parts=(res.sections||[]).map(x=>String(x.content||'').replace(/\s+/g,' ').trim()).filter(Boolean);let body=parts.join(' ');body=body.length>180?body.slice(0,177)+'…':body;return '<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问</div>'+body+'</div></div></div>'};
})();

/* 闲聊模式：日常问候不强行套用命理分析 */
(function(){
 const old=window.generateAnswer;
 window.generateAnswer=function(q){const el=document.getElementById('askResult'),x=(q||'').trim();let reply='';
  if(/^(你好|嗨|哈喽|在吗|有人吗|早上好|晚上好|晚安|谢谢|感谢|哈哈|好的|明白了)[！!。？?\s]*$/.test(x)){
   if(/谢谢|感谢/.test(x))reply='不用客气。你想继续聊刚才的事，还是换一个话题？';
   else if(/晚安|晚上好/.test(x))reply='晚上好。今天如果已经很累了，先把事情放一放，休息本身也是一种推进。';
   else if(/好的|明白了/.test(x))reply='好。如果你之后想到新的细节，直接接着说就行，我会沿着当前话题继续。';
   else reply='我在。你可以先随便说说最近发生了什么，不一定要整理成一个正式问题。';
   
   if(el) {
     const div = document.createElement('div');
     div.className = 'ai-body-inner';
     div.innerHTML = '<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问</div>'+reply+'</div></div></div>';
     const typing = el.querySelector('.loading-state');
     if(typing) typing.remove();
     el.appendChild(div);
   }
   return;
  
  }
  if(old)old(q)
 };
})();

/* 问问大师 × 小工具：根据当前话题给出真正可操作的工具入口 */
(function(){
 const map=[[/财富|收入|赚钱|理财|投资/,[['打开财运罗盘','wealth'],['查看今日日签','daily']]],[/换工作|跳槽|转行|副业|事业/,[['开始转行测评','career'],['做职场风险预案','layoff']]],[/感情|恋爱|对象|伴侣|关系/,[['生成关系沟通方案','relation'],['做生肖合冲参考','zodiac']]],[/今天|今日|现在|当下/,[['生成今日日签','daily']]],[/摇签|纠结|选择/,[['摇签问卜','oracle']]]];
 function links(q){for(const [re,ls] of map)if(re.test(q))return ls;return[]}
 const old=window.generateAnswer;
 window.generateAnswer=function(q){
  if(old)old(q);
  setTimeout(()=>{
   const el=document.getElementById('askResult');
   if(!el)return;
   const ls=links(q);if(!ls.length)return;
   
   // 不要在已有的最末尾直接 append，而是把 link 注入到最后一个气泡中
   const nodes = [...el.children];
   const lastAnswer = nodes[nodes.length - 1];
   if (!lastAnswer || lastAnswer.className === 'ai-user-bubble') return;
   
   if(lastAnswer.querySelector('.ai-tool-links')) return;
   
   const box=document.createElement('div');
   box.className='ai-tool-links';
   box.innerHTML='<div class="ai-tool-links-title">如果你想继续做一步</div>'+ls.map(x=>'<button class="ai-tool-link" type="button">→ '+x[0]+'</button>').join('');
   box.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{closeAsk();setTimeout(()=>openToolPage(ls[i][1]),180)});
   
   const inner = lastAnswer.querySelector('.ai-body-inner') || lastAnswer;
   inner.appendChild(box);
  }, 500);
 };
})();

/* 能量穿搭与工位风水：补充明确颜色建议 */
(function(){
 const old=window.TJToolRun;
 window.TJToolRun=function(type){if(type!=='style'){if(old)old(type);return}const d=window._ctx||window._baziData||{},wx=d.wx||{},colors={木:'青绿色、墨绿色',火:'朱红色、珊瑚色、紫色',土:'米色、暖黄色、咖色',金:'白色、银灰色、香槟色',水:'深蓝色、黑色、雾蓝色'};const color=colors[wx.ys]||'米色、暖黄色';const scene=document.getElementById('v3_scene')?.value||'当前场景',space=document.getElementById('v3_space')?.value||'当前环境',out=document.getElementById('v3_result');if(!out)return;out.innerHTML='<div class="tj-result-head"><div class="tj-result-title">能量穿搭与工位方案</div><div class="tj-score">'+(wx.ys||'土')+'</div></div><div class="tj-result-body"><div class="tj-result-list"><div><b>推荐颜色</b><span>'+color+'</span></div><div><b>场景建议</b><span>'+scene+'：选择低饱和、舒适且容易长期使用的颜色，不必大面积铺陈。</span></div><div><b>工位调整</b><span>'+((space.includes('杂乱'))?'清理桌面，只保留当前任务物品。':space.includes('光线')?'优先改善光线和屏幕高度。':space.includes('久坐')?'每50分钟起身活动，调整座椅与显示器高度。':'保持简洁，减少不必要的视觉刺激。')+'</span></div></div></div><div class="tj-disclaimer">颜色与环境建议用于状态提醒，舒适、整洁和可持续使用优先。</div>';out.classList.add('show');out.closest('.tj-tool-v3')?.classList.add('result-mode');document.querySelector('#toolModal .tool-sheet')?.classList.add('result-open')};
})();

/* 修复连续问答：跳转问题 */
(function(){
  const oldFallback = window.generateAnswerFallback;

  let chatContext = {
    turn: 0,
    lastTopic: '',
    history: []
  };

  window.generateAnswerFallback = function(q, d, el) {
    const age = d.age || 30;
    const dg = d.dg || '日主';
    const wx = d.wx || {ys: '未知'};
    const cDy = d.cDy || {g:'', z:''};
    const cLn = d.cLn || {g:'', z:''};

    chatContext.turn++;
    chatContext.history.push(q);

    let realQ = q;
    const keys = typeof _getGlossKeys === 'function' ? _getGlossKeys() : (typeof GLOSSARY !== 'undefined' ? Object.keys(GLOSSARY) : []);
    let foundTerms = [];
    for(const k of keys) {
        if (q === k || q === `什么是${k}` || q === `${k}是什么` || q === `解释${k}` || q === `解释一下${k}`) {
            if(!foundTerms.includes(k)) foundTerms.push(k);
        }
    }
    if (foundTerms.length === 0) {
        for(const k of keys) {
            if (q.includes(k) && (q.includes('什么') || q.includes('意思') || q.includes('解释') || q.includes('啥'))) {
                if(!foundTerms.includes(k)) foundTerms.push(k);
            }
        }
    }
    if(foundTerms.length > 0) {
        let reply = foundTerms.map(k => `「<b>${k}</b>」：${GLOSSARY[k]}`).join('<br><br>');
        reply += '<br><br><span style="font-size:0.85em;color:rgba(255,255,255,0.4)">（💡 提示：你可以结合自己的命盘继续问我，比如：“我命盘里的' + foundTerms[0] + '代表什么？”）</span>';
        
        let html = `<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问大师</div>${reply}</div></div></div>`;
        const div = document.createElement('div');
        div.className = 'ai-body-inner';
        div.innerHTML = html;
        
    const typing = el.querySelector('.loading-state') || el.querySelector('.ai-typing');
    if(typing) {
      if (typing.classList.contains('loading-state')) typing.remove();
      else if (typing.parentElement) typing.parentElement.remove();
    }
  
        el.appendChild(div);
        requestAnimationFrame(() => { el.scrollIntoView({behavior:'smooth',block:'nearest'}); });
        return;
    }
    let isFollowUp = false;
    let topic = '';

    if (q.includes('用户在继续追问上一话题')) {
      isFollowUp = true;
      let match = q.match(/「(.*?)」：(.*?)。请不要重复/);
      if(match) {
        topic = match[1];
        realQ = match[2];
      }
    } else if (q.includes('当前对话主题是')) {
      isFollowUp = true;
      let match = q.match(/直接回答：(.*?)。/);
      if(match) realQ = match[1];
      let tMatch = q.match(/当前对话主题是「(.*?)」/);
      if(tMatch) topic = tMatch[1];
    } else {
      if (/事业|工作|跳槽|职场|赚钱/.test(q)) topic = '事业';
      else if (/感情|恋爱|婚姻|对象|复合/.test(q)) topic = '感情';
      else if (/财运|钱|理财|投资/.test(q)) topic = '财运';
    }

    if(topic) chatContext.lastTopic = topic;
    else topic = chatContext.lastTopic || '综合';

    let reply = '';

    if (isFollowUp || realQ.length < 6 || /具体|然后|怎么做|怎么办|那|例子/.test(realQ)) {
      if (topic === '事业') {
        const replies = [
          `具体来说，你现在的流年气场提示“以守代攻”。比如，如果想跳槽，不要裸辞，而是先骑驴找马；如果想接新项目，先评估自己手头的资源够不够。先把当下的基础盘稳住。`,
          `你可以试着把你现在最头疼的工作拆分成三件小事。命理上你走到这一步需要决断力，也就是学会做减法。推掉那些不核心的应酬，把精力聚焦在能出成绩的地方。`,
          `从你的五行来看，接下来的两个月会有一些小波动。最落地的建议是：下周尝试主动向上司或客户汇报一次进度，把你的“需求”和“困难”摆到明面上，这会化解潜在的职场压力。`
        ];
        reply = replies[chatContext.turn % replies.length];
      } else if (topic === '感情') {
        const replies = [
          `落实在行动上，就是先停止“过度猜测对方的想法”。你命盘里带着的特质，让你容易在关系中内耗。本周末不妨给自己安排一个独立放松的计划，不把注意力全放在对方身上，关系反而会松弛下来。`,
          `比如在沟通时，试着用“我感觉到...”来代替“你总是...”。这在你的运势节奏里，能很好地化解口舌之争，让对方真正听懂你的诉求。`,
          `现阶段不适合做“分手”或“结婚”这种不可逆的重大决定。感情就像你的流年流月一样在波动，不如把重点放在共同完成一件小事上，比如一起做顿饭或看场电影，用行动代替争吵。`
        ];
        reply = replies[chatContext.turn % replies.length];
      } else if (topic === '财运') {
        const replies = [
          `现阶段的“防守”也是一种赚钱。比如，把接下来一个月的非必要支出列个清单砍掉一半。大运提示你现在不适合高杠杆，留足现金流就是最大的安全感。`,
          `你可以开始关注主业之外的“微技能”变现。不需要投大钱，用你擅长的小技能先去赚第一块钱，这符合你目前点滴积累的运势特征。`,
          `给你个具体的例子：如果你在犹豫要不要买某个大件或理财产品，强迫自己冷静 72 小时。这段时间的运势容易受情绪冲动影响，拖一拖往往能避开很多坑。`
        ];
        reply = replies[chatContext.turn % replies.length];
      } else {
        const replies = [
          `顺着这个思路，我建议你今天就挑一件五分钟能做完的小事去执行。不管是打个关键电话，还是整理一下办公桌，行动能立刻打破你现在的凝滞感。`,
          `其实你心里已经有隐约的答案了，对吧？命盘只是外在的参考，关键在于你要接受“不是所有事情都能立刻看到结果”的现实。给自己一点耐心。`,
          `既然如此，不妨换个环境。周末去接触一下大自然，或者见一个很久没见的老朋友，外在环境的流动能很好地帮你梳理目前的思绪。`
        ];
        reply = replies[chatContext.turn % replies.length];
      }
    } else {
      if (topic === '事业') {
        reply = `看到你的日主是${dg}。结合当前大运，事业上你现在正处于一个“蓄能”向“爆发”过渡的阶段。不要急于立刻看到大回报，今年的流年提示你需要建立核心壁垒。如果有想转行或跳槽的念头，建议先用业余时间做测试，不要轻易做重大决定。`;
      } else if (topic === '感情') {
        reply = `你的命盘显示，今年的感情节奏偏向“需要经营和沟通”。如果你单身，容易遇到让你觉得有安全感的人；如果非单身，可能会因为现实压力产生摩擦。记住，今年化解矛盾最好的方式是“直白表达需求”，而不是让对方去猜。`;
      } else if (topic === '财运') {
        reply = `从你的八字来看，你本身具备担财的能力，但这十年的大运更倾向于“稳健积累”而非“暴富”。特别是今年，偏财机会会有，但切忌贪多嚼不烂。把注意力放在自己可控的收入上，先建立起充足的安全备用金。`;
      } else {
        reply = `看你的命盘，五行以${wx.ys}为用神。整体气场目前比较平和，没有特别剧烈的冲克。现阶段最重要的是找到生活的主心骨。如果感到迷茫，不妨从整理当下的环境、规律作息开始，把能量聚拢回来，再去想更长远的发展。`;
      }
    }

    let html = `<div class="ai-dialogue"><div class="ai-dialogue-line"><div class="ai-dialogue-avatar">✦</div><div class="ai-dialogue-text"><div class="ai-dialogue-label">问问大师</div>${reply}</div></div></div>`;

    let intents = [];
    if(topic === '事业') intents.push('事业');
    if(topic === '感情') intents.push('感情');
    if(topic === '财运') intents.push('财运');
    
    if (typeof buildRelatedRoutes === 'function') {
        const links = buildRelatedRoutes(intents);
        if (links && links.length) {
            html += `<div class="ai-tool-links"><div class="ai-tool-links-title">如果你想结合报告看一看</div>` + links.map(x => `<button class="ai-tool-link" type="button" onclick="closeAsk(); setTimeout(()=>jumpTo('${x.sec}','${x.card}'), 180)">→ ${x.name}</button>`).join('') + `</div>`;
        }
    }

    const div = document.createElement('div');
    div.className = 'ai-body-inner';
    div.innerHTML = html;
    
    // Find the loading indicator and remove it, or just append
    
    const typing = el.querySelector('.loading-state') || el.querySelector('.ai-typing');
    if(typing) {
      if (typing.classList.contains('loading-state')) typing.remove();
      else if (typing.parentElement) typing.parentElement.remove();
    }
  
    
    el.appendChild(div);
    requestAnimationFrame(() => { el.scrollIntoView({behavior:'smooth',block:'nearest'}); });
  };

  if (typeof window.newAskChat !== 'undefined') {
    const oldNewChat = window.newAskChat;
    window.newAskChat = function() {
      chatContext.turn = 0;
      chatContext.lastTopic = '';
      chatContext.history = [];
      if (oldNewChat) oldNewChat();
    };
  }
})();

/* 工具中心最终版：问题入口与快捷筛选 */
(function(){
 function enhance(){
  const hub=document.querySelector('#s-adv .tool-hub'),bar=document.getElementById('toolsToolbar');
  if(!hub||!bar)return;
 }
 const obs=new MutationObserver(enhance);obs.observe(document.body,{childList:true,subtree:true});
 enhance();
})();

/* 择日助手改版：不再让用户手动挑日期，直接根据推演结果给出候选日期 */
(function(){
  const oldOpen=window.openToolPage;
  function fmt(d){return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'}
  function renderDateTool(){
    const modal=document.getElementById('toolModal'),root=document.getElementById('toolModalContent');if(!root||!modal)return;
    modal.classList.add('open');
    root.innerHTML='<div class="tj-tool-v3 tj-date-auto"><div class="tj-tool-intro"><div class="tj-tool-kicker">日常决策 · 问问大师工具</div><div class="tj-tool-title">◇ 重要事项择日助手</div><div class="tj-tool-desc">结合你的命盘节奏与近期日期，筛选更适合推进重要事项的时间。你只需要告诉我事项类型。</div></div><div class="tj-fields"><div class="tj-field"><label>准备安排什么事项</label><select id="v3_event"><option>签约合作</option><option>面试入职</option><option>发布项目</option><option>搬家出行</option><option>关系沟通</option><option>启动新计划</option></select></div><div class="tj-field"><label>希望安排在</label><select id="v3_range"><option>未来7天</option><option>未来14天</option><option>未来30天</option></select></div></div><button class="tj-submit" type="button" onclick="TJDateRunAuto()">开始推算合适日期</button><div class="tj-result" id="v3_result"></div><div class="tj-disclaimer">结果用于安排节奏与准备重点，不替代天气、交通、合同及其他现实条件判断。</div></div>';
  }
  window.TJDateRunAuto=function(){
    const event=document.getElementById('v3_event')?.value||'重要事项';
    const days=+(document.getElementById('v3_range')?.value.match(/\d+/)?.[0]||7);
    const ctx=window._ctx||window._baziData||{},wx=ctx.wx||{};
    const goodWeek=[2,3,4,5]; const candidates=[];
    for(let i=1;i<=days;i++){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);const wd=d.getDay();let score=60+(goodWeek.includes(wd)?15:0);if((wx.ys==='木'&&[1,4].includes(wd))||(wx.ys==='火'&&[2,5].includes(wd))||(wx.ys==='金'&&[3,6].includes(wd))||(wx.ys==='水'&&[0,3].includes(wd))||(wx.ys==='土'&&[2,4].includes(wd)))score+=8;candidates.push({d,score:Math.min(96,score+Math.floor(Math.random()*7))});}
    candidates.sort((a,b)=>b.score-a.score);const top=candidates.slice(0,3);
    const notes={'签约合作':'适合确认边界、责任与交付节点','面试入职':'适合展示准备成果并主动沟通','发布项目':'适合公开推进，让成果获得反馈','搬家出行':'优先核对交通、天气和物品清单','关系沟通':'适合在情绪稳定时把需求说清楚','启动新计划':'适合先完成一个可见的第一步'};
    const rows=top.map((x,i)=>'<div class="tj-date-choice"><div><b>'+fmt(x.d)+'</b><span>星期'+['日','一','二','三','四','五','六'][x.d.getDay()]+'</span></div><strong>'+x.score+'<small>适配度</small></strong><p>'+(i===0?'首选：':'备选：')+notes[event]+'。</p></div>').join('');
    const out=document.getElementById('v3_result');out.innerHTML='<div class="tj-result-head"><div class="tj-result-title">为「'+event+'」推荐的日期</div><div class="tj-score">'+(wx.ys||'—')+'</div></div><div class="tj-result-body"><div class="tj-date-list">'+rows+'</div><div class="tj-date-note">推算依据：结合近期节奏、事项类型与命盘有利方向筛选。最终请再核对对方时间、天气、交通和实际截止日期。</div></div>';out.classList.add('show');out.closest('.tj-tool-v3')?.classList.add('result-mode');document.querySelector('#toolModal .tool-sheet')?.classList.add('result-open');
  };
  window.openToolPage=function(type){if(type==='date'){setTimeout(renderDateTool,40);return}if(oldOpen)oldOpen(type)};
})();

/* 自定义工具结果兜底：所有工具页面都显示命盘结合提示 */
(function(){
 function sync(){if(!['wealth','career','date','style','layoff','name','zodiac','relation'].includes(window._activeTool))return;const d=window._ctx||window._baziData||{},wx=d.wx||{};document.querySelectorAll('#toolModalContent .tj-result.show').forEach(e=>{if(e.querySelector('.tj-chart-basis'))return;const n=document.createElement('div');n.className='tj-chart-basis';n.innerHTML='<b>✦ 命盘依据</b><div><span>日主</span><strong>'+(d.dg||'—')+'</strong><span>有利方向</span><strong>'+(wx.ys||'—')+'</strong><span>事业评分</span><strong>'+(d.cs||'—')+'/100</strong><span>财富评分</span><strong>'+(d.ws||'—')+'/100</strong></div><p>用于校正建议节奏；现实信息优先。</p>';const head=e.querySelector('.tj-result-head');if(head)head.insertAdjacentElement('afterend',n);else e.insertBefore(n,e.firstChild)});}
 setInterval(sync,250);
})();

/* 问问大师应答数据库扩展：补充高频、可执行问题 */
(function(){
 if(typeof KB==='undefined'||!KB.faqs)return;
 KB.faqs.push(
  {id:'ux1',q:'最近为什么总是焦虑？',kw:['焦虑','压力','内耗','烦躁','睡不着'],intent:'综合',anchor:'health',answer:d=>[
   `先把它理解为节奏过载，而不是简单的“运气不好”。当前事业评分${d.cs||'—'}、财富评分${d.ws||'—'}提示你更需要恢复可控感。`,
   `命盘中的${d.dg||'日主'}与有利方向${d.wx?.ys||'—'}，适合用明确边界、规律作息和小步行动来稳定状态。`,
   `${d.cDy?.g||''}${d.cDy?.z||''}阶段不宜同时承担太多目标，先处理最影响睡眠和现金流的那一件。`,
   '今天写下3件事：必须做、可以等、暂时不做；只完成“必须做”中的最小一步。若持续影响睡眠或生活，请寻求专业帮助。'
  ],related:['c3']},
  {id:'ux2',q:'我该不该答应这个机会？',kw:['机会','答应','要不要','选择','决定','纠结'],intent:'选择',anchor:'focus',answer:d=>[
   '先不要只问“吉不吉”，而要看这件事是否同时满足收益、风险和退出条件。',
   `结合${d.dg||'日主'}的当前节奏与有利方向${d.wx?.ys||'—'}，建议优先选择能积累能力、资源或稳定现金流的机会。`,
   `当前大运${d.cDy?.g||''}${d.cDy?.z||''}更适合${d.cs>70?'主动验证、争取反馈':'小范围试错、保留退路'}。`,
   '给自己24小时：写下最坏结果、可承受损失和退出时间；三项都说得清，再答应。'
  ],related:['c2','c3']},
  {id:'ux3',q:'我的财运什么时候会好？',kw:['财运','赚钱','收入','发财','财富'],intent:'财运',anchor:'trend',answer:d=>[
   `财运不只看某一天，而看收入能力、现金流和机会能否形成闭环。当前财富评分为${d.ws||'—'}/100。`,
   `命盘有利方向为${d.wx?.ys||'—'}，更适合把资源投入到可重复的技能、客户或产品，而不是追逐一次性暴利。`,
   `在${d.cDy?.g||''}${d.cDy?.z||''}阶段，先建立安全垫再扩大投入，现金流稳定比短期高回报更重要。`,
   '本周完成一次支出分类，并选一个能在30天内验证的增收动作；不使用杠杆，不把签文或命理当收益承诺。'
  ],related:['c2']},
  {id:'ux4',q:'感情里总是沟通不好怎么办？',kw:['沟通','吵架','冷战','感情','伴侣','关系'],intent:'感情',anchor:'loveMode',answer:d=>[
   '先停止猜测对方真正想法，把一次沟通缩小到一个具体事件和一个具体请求。',
   `你的命盘日主${d.dg||'—'}与当前关系节奏提示，表达需求比证明谁对谁错更重要。`,
   `在当前大运${d.cDy?.g||''}${d.cDy?.z||''}下，稳定、重复的沟通比一次性摊牌更容易建立信任。`,
   '用“事实—感受—请求”说三句话；如果情绪超过7分，先约定第二天再谈。涉及安全或伤害时优先保护自己并寻求专业支持。'
  ],related:['c3']}
 );
})();

/* 部分工具接入 AI：只在用户主动点击时调用，避免自动消耗额度。 */
(function(){
  const enabled={wealth:'财富与现金流',career:'职业选择',layoff:'职场风险',relation:'关系沟通',style:'环境与状态'};
  const key='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';
  const models=['google/gemma-4-31b-it:free','openai/gpt-oss-20b:free'];
  function install(type){
    if(!enabled[type])return;
    const out=document.getElementById('v3_result');if(!out||!out.classList.contains('show')||out.querySelector('.tj-ai-btn'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='tj-ai-btn';btn.textContent='让 AI 帮我换个角度看看';btn.onclick=()=>window.TJAskToolAI(type,btn);out.appendChild(btn);
  }
  window.TJAskToolAI=async function(type,btn){
    const out=document.getElementById('v3_result');if(!out||!enabled[type])return;
    const source=(out.querySelector('.tj-result-body')||out).innerText.slice(0,1800),ctx=window._ctx||window._baziData||{};
    btn.disabled=true;btn.textContent='AI 正在整理…';
    let answer='';
    const prompt=`你是一个简洁、有人情味的决策助理。用户刚完成“${enabled[type]}”工具。请结合工具结果给一段自然中文回复，先接住用户可能的顾虑，再指出一个最重要的现实重点，最后给一个今天就能做的小动作。不要重复整份结果，不要把命理说成事实，不要使用标题、编号或夸张承诺，控制在100字以内。工具结果：${source}。用户命盘参考：日主${ctx.dg||'—'}，有利方向${ctx.wx?.ys||'—'}。`;
    for(const model of models){
      try{const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','X-Title':'Wenwen Dashi Tool'},body:JSON.stringify({model,temperature:.65,max_tokens:180,messages:[{role:'user',content:prompt}]})});if(!r.ok)continue;const j=await r.json();answer=j.choices?.[0]?.message?.content?.trim()||'';if(answer)break}catch(e){}
    }
    if(answer){let box=out.querySelector('.tj-ai-box');if(!box){box=document.createElement('div');box.className='tj-ai-box';out.appendChild(box)}box.innerHTML='<b>AI 换个角度</b>'+answer.replace(/[<>]/g,'');btn.remove()}
    else{btn.disabled=false;btn.textContent='暂时无法连接 AI，重试一次'}
  };
  const old=window.TJToolRun;
  window.TJToolRun=function(type){const r=old?old(type):undefined;if(enabled[type])setTimeout(()=>install(type),90);return r};
  new MutationObserver(()=>{const type=window._activeTool;if(enabled[type])install(type)}).observe(document.body,{childList:true,subtree:true});
})();

(function(){
  const defaults={natural:true,context:true,length:'short'};
  function settings(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem('tj_ai_settings')||'{}'))}catch(e){return {...defaults}}}
  window.getAISettings=settings;
  window.toggleAISettings=function(){
    const sheet=document.getElementById('aiSheet');if(!sheet)return;
    let panel=sheet.querySelector('.ai-settings-panel');
    if(!panel){
      const v=settings();panel=document.createElement('div');panel.className='ai-settings-panel';panel.innerHTML='<div class="ai-settings-title">AI 设置</div><label class="ai-setting-row"><span>自然对话</span><input id="aiSettingNatural" type="checkbox" '+(v.natural?'checked':'')+'></label><label class="ai-setting-row"><span>结合上下文</span><input id="aiSettingContext" type="checkbox" '+(v.context?'checked':'')+'></label><label class="ai-setting-row"><span>回复长度</span><select id="aiSettingLength"><option value="short">简洁</option><option value="standard">标准</option></select></label><div class="ai-settings-note">设置只影响后续 AI 回复，不会修改已有对话。</div>';sheet.appendChild(panel);panel.hidden=true;panel.querySelector('#aiSettingLength').value=v.length;
      panel.querySelectorAll('input,select').forEach(x=>x.addEventListener('change',()=>{const n={natural:panel.querySelector('#aiSettingNatural').checked,context:panel.querySelector('#aiSettingContext').checked,length:panel.querySelector('#aiSettingLength').value};try{localStorage.setItem('tj_ai_settings',JSON.stringify(n))}catch(e){}}));
    }
    const open=panel.hidden!==false;panel.hidden=!open;document.querySelector('.ai-settings')?.setAttribute('aria-expanded',String(open));
  };
  document.addEventListener('click',e=>{const p=document.querySelector('.ai-settings-panel'),b=e.target.closest?.('.ai-settings');if(p&&!p.hidden&&!p.contains(e.target)&&!b){p.hidden=true;document.querySelector('.ai-settings')?.setAttribute('aria-expanded','false')}});
})();

(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'a1ea79e8d97f0c4e',t:'MTc4NDYzOTc0NQ=='};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();

(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'a1efb75e0871f44f',t:'MTc4NDY5NDY5MQ=='};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();

// Expose legacy inline event handlers after moving scripts into a Vite module.
Object.assign(window, {
  _getGlossKeys,
  _initJq,
  _qrCard,
  aiOnInputSuggest,
  aiRefreshChips,
  aiSwitchCat,
  aiToolRequest,
  annotateGlossary,
  applyTheme,
  buildAISummary,
  buildBaziContext,
  buildContext,
  buildRelatedRoutes,
  calcLayoffRisk,
  calcPattern,
  calcRelation,
  calcYearScores,
  closeAsk,
  closeMonthModal,
  closeRq,
  closeSaveModal,
  closeToolPage,
  compactAIText,
  confirmSaveProfile,
  copyReport,
  dbDel,
  dbGetAll,
  dbPut,
  doAsk,
  doAskCustom,
  drawCurve,
  enrichBeginnerContent,
  extractIntents,
  focusSwitchTab,
  formatAIText,
  formatStandardAnswer,
  generateAnswerFallback,
  getCtx,
  getDayPillarIndex,
  getDecisionAdvice,
  getLayoffAstroRisk,
  getLiuYue,
  getMonthPillar,
  getMonthlyAlert,
  getPersona,
  getRelationMode,
  getRelationRisks,
  getRiskWarning,
  getShenShaLabels,
  getSuitableType,
  getTimeline,
  getTodayGZ,
  goBack,
  initDB,
  jqDate,
  jumpTo,
  mkBazi,
  mkDy,
  mkLn,
  mkMh,
  mkQm,
  mkShenSha,
  mkSi,
  mkSs,
  mkWx,
  mkZw,
  moveTabIndicator,
  newAskChat,
  openAsk,
  openBreathTool,
  openDecisionTool,
  openFocusTool,
  openMonthModal,
  openSaveModal,
  openToolPage,
  organizeMasterReportLayout,
  rdd,
  renderAll,
  renderBeginnerBrief,
  renderQuickRead,
  renderRiQian,
  renderRouteButtons,
  renderSmartAnswer,
  resetGlossaryState,
  resolveBirthDateTime,
  runCareerTool,
  runDailyTool,
  runDateTool,
  runDecisionTool,
  runLayoffTool,
  runLotteryTool,
  runNameTool,
  runOracleTool,
  runRelationTool,
  runStyleTool,
  runWealthTool,
  runZodiacTool,
  saveCurrentProfile,
  scrollToForm,
  sel,
  selChip,
  setGlassMode,
  setToolOutput,
  setUserMode,
  showGlossPop,
  showPage2,
  showRiQian,
  smartAnswer,
  solarTermDate,
  startBreathTool,
  switchStructureTab,
  switchTab,
  toggleDensity,
  toggleFullGods,
  toggleLgPanel,
  toggleUserMode,
  toolPageShell,
  trueSolarTime,
  wrapProCollapsibles,
});
