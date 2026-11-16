/* ---------- kho dữ liệu trên máy: trình duyệt + file JSON trên ổ đĩa ---------- */
const LocalDB=(()=>{
  const KEY="sotaichinh-data-v1", COLS=["tx","funds","investments","budget","cfg"];
  const canFS = typeof window.showSaveFilePicker==="function";
  const isNative = /SoTaiChinhApp/.test(navigator.userAgent);
  let native=null;
  const waitNative=()=>new Promise(res=>{ if(window.pywebview&&window.pywebview.api&&window.pywebview.api.load) return res(window.pywebview.api);
    const t=setTimeout(()=>res(null),15000); window.addEventListener("pywebviewready",()=>{ clearTimeout(t); res(window.pywebview.api); },{once:true}); });
  let D=null, handle=null, fileState=canFS?"none":"unsupported", savedAt=null, fileSavedAt=null, wTimer=null;
  const colL={}, docL={}, stateL=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  const emptyData=()=>{ const o={}; COLS.forEach(c=>o[c]={}); return o; };
  const norm=d=>{ const o=emptyData(); for(const c of COLS) if(d&&d[c]&&typeof d[c]==="object") o[c]=d[c]; return o; };
  const payload=()=>({app:"so-thu-chi-dau-tu",version:1,savedAt:new Date().toISOString(),data:D});
  function readPayload(txt){ const j=JSON.parse(txt); if(j&&j.data&&typeof j.data==="object") return {savedAt:j.savedAt||null,data:norm(j.data)}; if(j&&COLS.some(c=>j[c])) return {savedAt:null,data:norm(j)}; throw new Error("File không đúng định dạng"); }
  // IndexedDB chỉ để nhớ file đã chọn
  const idb=()=>new Promise((res,rej)=>{ const r=indexedDB.open("sotaichinh",1); r.onupgradeneeded=()=>r.result.createObjectStore("kv"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  async function kv(k,v){ try{ const db=await idb(); return await new Promise((res,rej)=>{ const tx=db.transaction("kv",v===undefined?"readonly":"readwrite"), st=tx.objectStore("kv");
    const r= v===undefined? st.get(k) : v===null? st.delete(k) : st.put(v,k); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }catch(e){ return undefined; } }
  function saveLocal(){ if(native){ try{localStorage.removeItem(KEY);}catch(e){} savedAt=new Date().toISOString(); return; } try{ const p=payload(); localStorage.setItem(KEY,JSON.stringify(p)); savedAt=p.savedAt; }catch(e){ console.warn(e); } }
  function loadLocal(){ try{ const s=localStorage.getItem(KEY); return s? readPayload(s) : null; }catch(e){ return null; } }
  async function writeFile(){
    if(native){ try{ const p=payload(); const out=hasKey()? {app:p.app,version:DK?3:2,savedAt:p.savedAt,enc:await seal(p.data)} : p; await native.save(JSON.stringify(out,null,1)); fileSavedAt=p.savedAt; fileState="native"; }catch(e){ console.warn(e); fileState="error"; } notify(); return; }
    if(!handle||fileState!=="ok") return;
    try{ const w=await handle.createWritable(); const p=payload(); await w.write(JSON.stringify(p,null,1)); await w.close(); fileSavedAt=p.savedAt; }
    catch(e){ console.warn(e); fileState= e&&e.name==="NotAllowedError"?"permission":"error"; }
    notify();
  }
  function persist(){ saveLocal(); clearTimeout(wTimer); wTimer=setTimeout(writeFile,500); notify(); }
  const docSnap=(id,d,pending)=>({id,exists:!!d,data:()=>clone(d),metadata:{hasPendingWrites:!!pending}});
  function emitCol(c){ (colL[c]||[]).forEach(fn=>fn({docs:Object.entries(D[c]||{}).map(([i,d])=>docSnap(i,d))})); }
  function emitDoc(path,pending){ const [c,i]=path.split("/"); (docL[path]||[]).forEach(fn=>fn(docSnap(i,(D[c]||{})[i],pending))); }
  function emitAll(){ COLS.forEach(emitCol); Object.keys(docL).forEach(p=>emitDoc(p,false)); }
  function notify(){ stateL.forEach(fn=>fn(info())); }
  function info(){ return {canFS,native:!!native,fileState,fileName:native?nativePath:(handle?.name||null),savedAt,fileSavedAt}; }
  let nativePath=null;
  // ---- mã hoá: PBKDF2-SHA256 + AES-GCM 256 ----
  // v3: dữ liệu mã hoá bằng khoá ngẫu nhiên DK; DK được "bọc" 2 lần: bằng mật khẩu (pw) và bằng họ tên + ngày sinh (rec) để khôi phục khi quên mật khẩu.
  const ITER=310000, TE=new TextEncoder(), TD=new TextDecoder();
  let cKey=null, cSalt=null;            // định dạng cũ (chỉ mật khẩu)
  let DKraw=null, DK=null, W=null;      // định dạng mới
  const b64=u=>{ let s=""; const a=new Uint8Array(u); for(let i=0;i<a.length;i+=0x8000) s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000)); return btoa(s); };
  const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const recSecret=(name,dob)=>"rec|"+String(name||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[đĐ]/g,"d").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()+"|"+dob;
  async function derive(pw,salt,iter=ITER){ const base=await crypto.subtle.importKey("raw",TE.encode(pw),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]); }
  async function useDK(raw){ DKraw=raw; DK=await crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]); cKey=null; cSalt=null; }
  async function wrap(secret){ const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12)), k=await derive(secret,salt);
    return {iter:ITER,salt:b64(salt),iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:"AES-GCM",iv},k,DKraw))}; }
  async function unwrap(w,secret){ const k=await derive(secret,unb64(w.salt),w.iter||ITER); return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(w.iv)},k,unb64(w.ct))); }
  async function decData(enc){ const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(enc.iv)},DK,unb64(enc.ct)); return JSON.parse(TD.decode(pt)); }
  const hasKey=()=>!!(DK||cKey);
  const hasRecovery=()=>!!(W&&W.rec);
  async function seal(obj){ const iv=crypto.getRandomValues(new Uint8Array(12));
    if(DK){ const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},DK,TE.encode(JSON.stringify(obj))); return {v:3,iv:b64(iv),ct:b64(ct),wraps:W}; }
    const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},cKey,TE.encode(JSON.stringify(obj)));
    return {kdf:"PBKDF2-SHA256",iter:ITER,salt:b64(cSalt),iv:b64(iv),ct:b64(ct)}; }
  // mở bằng mật khẩu (cả định dạng cũ và mới)
  async function unseal(enc,pw){
    if(enc.v===3){ const raw=await unwrap(enc.wraps.pw,pw); await useDK(raw); W=JSON.parse(JSON.stringify(enc.wraps)); return decData(enc); }
    const salt=unb64(enc.salt), key=await derive(pw,salt,enc.iter||ITER);
    const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(enc.iv)},key,unb64(enc.ct)); cKey=key; cSalt=salt; DK=DKraw=null; W=null; return JSON.parse(TD.decode(pt)); }
  // mở bằng họ tên + ngày sinh
  async function unsealRec(enc,name,dob){ if(enc.v!==3||!enc.wraps||!enc.wraps.rec) throw new Error("norec");
    const raw=await unwrap(enc.wraps.rec,recSecret(name,dob)); await useDK(raw); W=JSON.parse(JSON.stringify(enc.wraps)); return decData(enc); }
  async function setupKeys(pw,name,dob){ await useDK(crypto.getRandomValues(new Uint8Array(32))); W={pw:await wrap(pw)}; if(name&&dob) W.rec=await wrap(recSecret(name,dob)); }
  async function setPassword(pw){ if(DK){ W.pw=await wrap(pw); return; } cSalt=crypto.getRandomValues(new Uint8Array(16)); cKey=await derive(pw,cSalt); }
  async function setRecovery(name,dob){ W.rec=await wrap(recSecret(name,dob)); }
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const todayISO=()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
  const recFields=()=>`<label class="lock-l">Họ và tên đầy đủ<input type="text" name="fn" placeholder="Ví dụ: Nguyễn Văn An" aria-label="Họ và tên đầy đủ" autocomplete="off"></label>
      <label class="lock-l">Ngày sinh<input type="date" name="dob" aria-label="Ngày sinh" max="${todayISO()}" min="1900-01-01"></label>`;
  function lockScreen(mode,err){ return new Promise(res=>{
    let el=document.getElementById("lock"); if(!el){ el=document.createElement("div"); el.id="lock"; document.body.appendChild(el); }
    const askPw=["create","change","reset","unlock"].includes(mode), twice=["create","change","reset"].includes(mode), askRec=["create","recover","setrec","changerec"].includes(mode);
    const T={create:"Đặt mật khẩu cho app",change:"Đổi mật khẩu",reset:"Đặt mật khẩu mới",unlock:"Sổ Thu Chi & Đầu Tư",recover:"Quên mật khẩu",setrec:"Thêm cách khôi phục mật khẩu",changerec:"Đổi thông tin khôi phục"}[mode];
    const H={create:"Dữ liệu được mã hoá bằng mật khẩu này. Họ tên và ngày sinh dùng để <b>lấy lại quyền truy cập khi quên mật khẩu</b>, hãy nhập đúng và nhớ cách bạn đã gõ.",
      change:"Nhập mật khẩu mới. Họ tên và ngày sinh khôi phục vẫn giữ nguyên.",
      reset:"Xác minh thành công 🎉 Giờ hãy đặt mật khẩu mới cho app.",
      unlock:"Nhập mật khẩu để mở khoá dữ liệu của bạn.",
      recover:"Trả lời câu hỏi bảo mật: nhập họ tên đầy đủ và ngày sinh bạn đã khai khi đặt mật khẩu.",
      setrec:"Bản cập nhật mới cho phép lấy lại mật khẩu khi quên. Nhập họ tên đầy đủ và ngày sinh làm câu hỏi bảo mật.",
      changerec:"Nhập họ tên đầy đủ và ngày sinh mới dùng để khôi phục khi quên mật khẩu."}[mode];
    const B={create:"Lưu mật khẩu",change:"Lưu mật khẩu mới",reset:"Lưu mật khẩu mới",unlock:"Mở khoá",recover:"Xác minh",setrec:"Lưu",changerec:"Lưu"}[mode];
    el.innerHTML=`<form class="lock-card" autocomplete="off" data-mode="${mode}">
      <div class="lock-cat">${typeof catSVG==="function"?catSVG(mode==="unlock"?"cheer":"happy"):""}</div>
      <h2>${T}</h2>
      <p class="hint">${H}</p>
      ${askPw?`<input type="password" name="p1" placeholder="${twice?"Mật khẩu mới":"Mật khẩu"}" aria-label="Mật khẩu">`:""}
      ${twice?`<input type="password" name="p2" placeholder="Nhập lại mật khẩu" aria-label="Nhập lại mật khẩu">`:""}
      ${askRec?(mode==="create"?`<div class="lock-sec">Câu hỏi bảo mật khi quên mật khẩu</div>`:"")+recFields():""}
      <div class="lock-err" role="alert">${err||""}</div>
      <button class="primary" type="submit">${B}</button>
      ${mode==="unlock"?`<button type="button" class="lock-link" data-forgot>Quên mật khẩu?</button>`:""}
      ${mode==="recover"?`<button type="button" class="lock-link" data-back>← Quay lại nhập mật khẩu</button>`:""}
      ${["change","changerec","setrec"].includes(mode)?`<button type="button" data-cancel>${mode==="setrec"?"Để sau":"Huỷ"}</button>`:""}
    </form>`;
    el.hidden=false; const f=el.querySelector("form"); const first=f.querySelector("input"); setTimeout(()=>first&&first.focus(),30);
    const E=m=>{ el.querySelector(".lock-err").textContent=m; };
    const cancel=el.querySelector("[data-cancel]"); if(cancel) cancel.onclick=()=>{ if(mode!=="setrec") el.hidden=true; res(null); };
    const fg=el.querySelector("[data-forgot]"); if(fg) fg.onclick=()=>res({forgot:true});
    const bk=el.querySelector("[data-back]"); if(bk) bk.onclick=()=>res({back:true});
    f.onsubmit=e=>{ e.preventDefault(); const out={};
      if(askPw){ const p1=f.p1.value; if(!p1) return E("Hãy nhập mật khẩu");
        if(twice){ if(p1.length<4) return E("Mật khẩu cần ít nhất 4 ký tự"); if(p1!==f.p2.value) return E("Hai lần nhập không khớp"); }
        out.pw=p1; }
      if(askRec){ const fn=f.fn.value.trim(), dob=f.dob.value;
        if(fn.replace(/\s+/g,"").length<2||!/\s/.test(fn)) return E("Hãy nhập họ và tên đầy đủ (có cả họ và tên)");
        if(!dob) return E("Hãy chọn ngày sinh"); if(dob>todayISO()) return E("Ngày sinh không thể ở tương lai");
        out.name=fn; out.dob=dob; }
      E("Đang xử lý…"); res(out); };
  }); }
  // vòng mở khoá: mật khẩu, hoặc quên mật khẩu → họ tên + ngày sinh → đặt mật khẩu mới
  async function unlockLoop(enc,firstErr){ let err=firstErr||"", mode="unlock";
    for(;;){
      if(mode==="unlock"){ const r=await lockScreen("unlock",err); if(r.forgot){ mode="recover"; err=""; continue; }
        try{ const data=await unseal(enc,r.pw); return {data,pw:r.pw}; }catch(e){ err="Sai mật khẩu, thử lại nhé"; await sleep(600); } }
      else { if(enc.v!==3||!enc.wraps||!enc.wraps.rec){ mode="unlock"; err="Dữ liệu này chưa cài câu hỏi bảo mật nên không khôi phục được. Hãy thử nhớ lại mật khẩu."; continue; }
        const r=await lockScreen("recover",err); if(r.back){ mode="unlock"; err=""; continue; }
        try{ const data=await unsealRec(enc,r.name,r.dob); const n=await lockScreen("reset"); await setPassword(n.pw); return {data,reset:true}; }
        catch(e){ err="Họ tên hoặc ngày sinh không khớp. App không phân biệt dấu, chữ hoa hay khoảng trắng, hãy kiểm tra lại chính tả và ngày sinh."; await sleep(1500); } } } }
  const hideLock=()=>{ const el=document.getElementById("lock"); if(el) el.hidden=true; };
  const api={
    collection:c=>({onSnapshot:(fn)=>{ (colL[c]=colL[c]||[]).push(fn); setTimeout(()=>fn({docs:Object.entries(D[c]||{}).map(([i,d])=>docSnap(i,d))}),0); return()=>{}; }}),
    doc:path=>{ const [c,i]=path.split("/"); return {
      onSnapshot:(fn)=>{ (docL[path]=docL[path]||[]).push(fn); setTimeout(()=>fn(docSnap(i,(D[c]||{})[i])),0); return()=>{}; },
      set:async data=>{ (D[c]=D[c]||{})[i]=clone(data); persist(); setTimeout(()=>{ emitCol(c); emitDoc(path,true); },0); },
      delete:async()=>{ if(D[c]) delete D[c][i]; persist(); setTimeout(()=>{ emitCol(c); emitDoc(path,false); },0); } }; }
  };
  async function bindHandle(h){ handle=h; await kv("file",h); fileState="ok"; }
  return {
    info, onState:fn=>{ stateL.push(fn); fn(info()); },
    async open(initial){
      if(isNative){ native=await waitNative(); }
      if(native){
        nativePath=await native.path(); fileState="native";
        const txt=await native.load(); const j=txt?JSON.parse(txt):null;
        if(j&&j.enc){ const r=await unlockLoop(j.enc); D=norm(r.data);
          fileSavedAt=savedAt=j.savedAt||null;
          if(!DK){ const rec=await lockScreen("setrec"); if(rec){ await setupKeys(r.pw,rec.name,rec.dob); } }
          if(r.reset||(DK&&j.enc.v!==3)) await writeFile(); }
        else {
          const legacyLocal=loadLocal();
          D= j? readPayload(txt).data : (legacyLocal?.data||norm(clone(initial||{})));
          const c=await lockScreen("create"); await setupKeys(c.pw,c.name,c.dob);
          await writeFile(); }
        hideLock(); saveLocal(); return api;
      }
      const loc=loadLocal(); D=loc?.data||null; savedAt=loc?.savedAt||null;
      if(canFS){ const h=await kv("file");
        if(h){ handle=h; let perm="prompt"; try{ perm=await h.queryPermission({mode:"readwrite"}); }catch(e){}
          if(perm==="granted"){ try{ const f=await (await h.getFile()).text(); const p=readPayload(f); fileState="ok"; fileSavedAt=p.savedAt;
              if(!D || (p.savedAt&&(!savedAt||p.savedAt>savedAt))){ D=p.data; saveLocal(); } }catch(e){ console.warn(e); fileState="error"; } }
          else fileState="permission"; } }
      if(!D){ D=norm(clone(initial||{})); saveLocal(); }
      return api;
    },
    async reconnect(){ if(!handle) return false; const p=await handle.requestPermission({mode:"readwrite"}); if(p!=="granted") return false;
      try{ const f=readPayload(await (await handle.getFile()).text()); if(f.savedAt&&(!savedAt||f.savedAt>savedAt)){ D=f.data; saveLocal(); emitAll(); } }catch(e){}
      fileState="ok"; await writeFile(); return true; },
    async chooseSave(){ const h=await window.showSaveFilePicker({suggestedName:"so-tai-chinh-data.json",types:[{description:"Dữ liệu Sổ Thu Chi",accept:{"application/json":[".json"]}}]});
      await bindHandle(h); await writeFile(); return true; },
    async chooseOpen(){ const [h]=await window.showOpenFilePicker({types:[{description:"Dữ liệu Sổ Thu Chi",accept:{"application/json":[".json"]}}]});
      const p=readPayload(await (await h.getFile()).text()); if((await h.requestPermission({mode:"readwrite"}))!=="granted") throw new Error("Chưa cho phép ghi file");
      D=p.data; saveLocal(); await bindHandle(h); emitAll(); await writeFile(); return true; },
    async forget(){ handle=null; await kv("file",null); fileState=canFS?"none":"unsupported"; notify(); },
    async exportNative(){ if(!native) return false; const p=payload(); return await native.export_backup(JSON.stringify({app:p.app,version:DK?3:2,savedAt:p.savedAt,enc:await seal(p.data)},null,1)); },
    async changePassword(){ const r=await lockScreen("change"); if(!r) return false; await setPassword(r.pw); await writeFile(); hideLock(); return true; },
    hasRecovery,
    async changeRecovery(){ const r=await lockScreen(DK?"changerec":"setrec"); if(!r){ hideLock(); return false; }
      if(!DK){ const p=await lockScreen("change","Đặt lại mật khẩu để bật tính năng khôi phục"); if(!p){ hideLock(); return false; } await setupKeys(p.pw,r.name,r.dob); }
      else await setRecovery(r.name,r.dob);
      await writeFile(); hideLock(); return true; },
    async openFolder(){ if(native) await native.open_folder(); },
    download(){ if(native) return this.exportNative(); const b=new Blob([JSON.stringify(payload(),null,1)],{type:"application/json"}); const a=document.createElement("a"); const d=new Date();
      a.href=URL.createObjectURL(b); a.download=`so-tai-chinh-sao-luu-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); },
    async importText(txt){ const j=JSON.parse(txt);
      if(j&&j.enc){ const r=await unlockLoop(j.enc,"Nhập mật khẩu của bản sao lưu này"); D=norm(r.data); hideLock(); }
      else D=readPayload(txt).data;
      persist(); emitAll(); }
  };
})();
