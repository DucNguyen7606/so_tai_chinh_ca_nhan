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
    if(native){ try{ const p=payload(); const out=cKey? {app:p.app,version:2,savedAt:p.savedAt,enc:await seal(p.data)} : p; await native.save(JSON.stringify(out,null,1)); fileSavedAt=p.savedAt; fileState="native"; }catch(e){ console.warn(e); fileState="error"; } notify(); return; }
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
  const ITER=310000, TE=new TextEncoder(), TD=new TextDecoder();
  let cKey=null, cSalt=null;
  const b64=u=>{ let s=""; const a=new Uint8Array(u); for(let i=0;i<a.length;i+=0x8000) s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000)); return btoa(s); };
  const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function derive(pw,salt,iter=ITER){ const base=await crypto.subtle.importKey("raw",TE.encode(pw),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]); }
  async function seal(obj){ const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},cKey,TE.encode(JSON.stringify(obj)));
    return {kdf:"PBKDF2-SHA256",iter:ITER,salt:b64(cSalt),iv:b64(iv),ct:b64(ct)}; }
  async function unseal(enc,pw){ const salt=unb64(enc.salt), key=await derive(pw,salt,enc.iter||ITER);
    const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(enc.iv)},key,unb64(enc.ct)); cKey=key; cSalt=salt; return JSON.parse(TD.decode(pt)); }
  async function setPassword(pw){ cSalt=crypto.getRandomValues(new Uint8Array(16)); cKey=await derive(pw,cSalt); }
  function lockScreen(mode,err){ return new Promise(res=>{
    let el=document.getElementById("lock"); if(!el){ el=document.createElement("div"); el.id="lock"; document.body.appendChild(el); }
    const create=mode!=="unlock";
    el.innerHTML=`<form class="lock-card" autocomplete="off">
      <div class="lock-cat">${typeof catSVG==="function"?catSVG(create?"happy":"cheer"):""}</div>
      <h2>${mode==="change"?"Đổi mật khẩu":create?"Đặt mật khẩu cho app":"Sổ Thu Chi & Đầu Tư"}</h2>
      <p class="hint">${create?"Dữ liệu sẽ được mã hoá bằng mật khẩu này. <b>Nếu quên mật khẩu sẽ không mở lại được dữ liệu</b>, hãy ghi nhớ thật kỹ.":"Nhập mật khẩu để mở khoá dữ liệu của bạn."}</p>
      <input type="password" name="p1" placeholder="Mật khẩu" aria-label="Mật khẩu" autofocus>
      ${create?`<input type="password" name="p2" placeholder="Nhập lại mật khẩu" aria-label="Nhập lại mật khẩu">`:""}
      <div class="lock-err" role="alert">${err||""}</div>
      <button class="primary" type="submit">${create?"Lưu mật khẩu":"Mở khoá"}</button>
      ${mode==="change"?`<button type="button" data-cancel>Huỷ</button>`:""}
    </form>`;
    el.hidden=false; const f=el.querySelector("form"); setTimeout(()=>f.p1.focus(),30);
    const cancel=el.querySelector("[data-cancel]"); if(cancel) cancel.onclick=()=>{ el.hidden=true; res(null); };
    f.onsubmit=e=>{ e.preventDefault(); const p1=f.p1.value, p2=f.p2?.value;
      if(create&&p1.length<4){ el.querySelector(".lock-err").textContent="Mật khẩu cần ít nhất 4 ký tự"; return; }
      if(create&&p1!==p2){ el.querySelector(".lock-err").textContent="Hai lần nhập không khớp"; return; }
      if(!p1) return; el.querySelector(".lock-err").textContent="Đang xử lý…"; res(p1); };
  }); }
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
        if(j&&j.enc){ let err="";
          for(;;){ const pw=await lockScreen("unlock",err); try{ D=norm(await unseal(j.enc,pw)); break; }catch(e){ err="Sai mật khẩu, thử lại nhé"; } }
          fileSavedAt=savedAt=j.savedAt||null; }
        else {
          const legacyLocal=loadLocal();
          D= j? readPayload(txt).data : (legacyLocal?.data||norm(clone(initial||{})));
          await setPassword(await lockScreen("create"));
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
    async exportNative(){ if(!native) return false; const p=payload(); return await native.export_backup(JSON.stringify({app:p.app,version:2,savedAt:p.savedAt,enc:await seal(p.data)},null,1)); },
    async changePassword(){ const pw=await lockScreen("change"); if(!pw) return false; await setPassword(pw); await writeFile(); hideLock(); return true; },
    async openFolder(){ if(native) await native.open_folder(); },
    download(){ if(native) return this.exportNative(); const b=new Blob([JSON.stringify(payload(),null,1)],{type:"application/json"}); const a=document.createElement("a"); const d=new Date();
      a.href=URL.createObjectURL(b); a.download=`so-tai-chinh-sao-luu-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); },
    async importText(txt){ const j=JSON.parse(txt);
      if(j&&j.enc){ let err=""; for(;;){ const pw=await lockScreen("unlock",err||"Nhập mật khẩu của bản sao lưu này"); try{ D=norm(await unseal(j.enc,pw)); break; }catch(e){ err="Sai mật khẩu, thử lại nhé"; } } hideLock(); }
      else D=readPayload(txt).data;
      persist(); emitAll(); }
  };
})();
