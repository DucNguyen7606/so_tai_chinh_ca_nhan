/* ---------- bảng quản lý dữ liệu ---------- */
const fmtTime=s=>{ if(!s) return "chưa có"; const d=new Date(s); return d.toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit",year:"numeric"}); };
function renderDataUI(st){
  if(st.native){
    setSync(st.fileState==="error"?"⚠️ không ghi được file":`đã lưu vào file lúc ${fmtTime(st.fileSavedAt).split(" ")[0]}`);
    $("#fileBanner").hidden=st.fileState!=="error"; $("#fileBanner").innerHTML=st.fileState==="error"?`<span>⚠️ Không ghi được file dữ liệu. Kiểm tra thư mục của app có bị khoá hoặc đầy ổ đĩa không.</span>`:"";
    $("#dataBody").innerHTML=`
      <div class="stack" style="gap:6px">
        <div><span class="hint">File dữ liệu</span><div class="num" style="overflow-wrap:anywhere;font-size:.85rem">${esc(st.fileName||"")}</div></div>
        <div class="row"><span class="hint">Lần lưu gần nhất</span><span class="num hint">${fmtTime(st.fileSavedAt)}</span></div>
      </div>
      <div class="stack">
        <button data-act="lock">🔒 Khoá app ngay</button>
        <button data-act="passwd">Đổi mật khẩu</button>
        <button data-act="folder">Mở thư mục dữ liệu</button>
        <button data-act="download">Xuất bản sao lưu…</button>
        <label class="btn" style="text-align:center">Nhập từ bản sao lưu…<input id="impFile" type="file" accept=".json,application/json" hidden></label>
      </div>
      <div class="hint">🔐 File dữ liệu và bản sao lưu đều được mã hoá bằng mật khẩu của bạn (AES-256). Mỗi thay đổi tự ghi vào file sau nửa giây. Mỗi ngày app tự giữ một bản sao trong thư mục <b>sao-luu</b> (30 ngày gần nhất).</div>`;
    return;
  }
  setSync(st.fileState==="ok"? `đã lưu vào file lúc ${fmtTime(st.fileSavedAt).split(" ")[0]}` : "đã lưu trong trình duyệt");
  const b=$("#fileBanner");
  const msg = st.fileState==="permission"? `<span>🔒 Bấm để tiếp tục tự động lưu vào file <b>${esc(st.fileName||"")}</b>.</span><button class="primary" data-act="reconnect">Tiếp tục lưu vào file</button>`
    : st.fileState==="none"? `<span>💾 Dữ liệu đang lưu trong trình duyệt. Chọn một file trên ổ đĩa để lưu, sẽ an toàn hơn khi xoá lịch sử trình duyệt.</span><button class="primary" data-act="save">Chọn nơi lưu file</button>`
    : st.fileState==="error"? `<span>⚠️ Không đọc hoặc ghi được file <b>${esc(st.fileName||"")}</b>. File có thể đã bị đổi tên hoặc di chuyển.</span><button class="primary" data-act="open">Chọn lại file</button>`
    : "";
  b.hidden=!msg; b.innerHTML=msg;
  $("#dataBody").innerHTML=`
    <div class="stack" style="gap:6px">
      <div class="row"><span>🧭 Trong trình duyệt</span><b class="num">${fmtTime(st.savedAt)}</b></div>
      <div class="row"><span>💾 File trên ổ đĩa</span><b>${st.fileState==="ok"||st.fileState==="permission"||st.fileState==="error"? esc(st.fileName||"") : st.canFS? "chưa chọn" : "trình duyệt không hỗ trợ"}</b></div>
      ${st.fileState==="ok"?`<div class="row"><span class="hint">Lần ghi file gần nhất</span><span class="num hint">${fmtTime(st.fileSavedAt)}</span></div>`:""}
    </div>
    ${st.canFS?`<div class="stack">
      ${st.fileState==="permission"?`<button class="primary" data-act="reconnect">Cấp lại quyền ghi file</button>`:""}
      <button ${st.fileState==="ok"?"":'class="primary"'} data-act="save">Chọn nơi lưu file mới…</button>
      <button data-act="open">Mở file dữ liệu có sẵn…</button>
      ${st.fileName?`<button class="ghost" data-act="forget">Ngừng dùng file này</button>`:""}
    </div>`:`<div class="note">Trình duyệt này chưa hỗ trợ tự lưu ra file. Hãy dùng Chrome hoặc Edge, hoặc bấm “Tải bản sao lưu” thường xuyên.</div>`}
    <div class="stack" style="border-top:1px solid var(--line);padding-top:12px">
      <button data-act="download">Tải bản sao lưu (.json)</button>
      <label class="btn" style="text-align:center">Nhập từ bản sao lưu…<input id="impFile" type="file" accept=".json,application/json" hidden></label>
    </div>
    <div class="hint">Mỗi thay đổi tự lưu ngay vào trình duyệt và ghi ra file sau nửa giây. Nên đặt file trong thư mục SoTaiChinh hoặc OneDrive để có thêm bản sao.</div>`;
}
document.addEventListener("click",async e=>{
  const t=e.target.closest("[data-act],#dataBtn,#dataClose"); if(!t) return; e.stopPropagation();
  const dlg=$("#dataDlg");
  if(t.id==="dataBtn"){ renderDataUI(LocalDB.info()); dlg.showModal?dlg.showModal():dlg.setAttribute("open",""); return; }
  if(t.id==="dataClose"){ dlg.close?dlg.close():dlg.removeAttribute("open"); return; }
  try{
    const a=t.dataset.act;
    if(a==="reconnect"){ if(await LocalDB.reconnect()) toast("Đã kết nối lại file dữ liệu"); }
    else if(a==="save"){ await LocalDB.chooseSave(); toast("Từ giờ dữ liệu tự lưu vào file này"); }
    else if(a==="open"){ if(!confirm("Mở file này sẽ thay dữ liệu đang hiển thị bằng dữ liệu trong file. Tiếp tục?")) return; await LocalDB.chooseOpen(); toast("Đã mở file dữ liệu"); }
    else if(a==="forget"){ await LocalDB.forget(); toast("Đã ngừng dùng file, dữ liệu vẫn còn trong trình duyệt"); }
    else if(a==="download"){ const r=await LocalDB.download(); if(r!==false) toast("Đã lưu bản sao lưu"); }
    else if(a==="folder"){ await LocalDB.openFolder(); }
    else if(a==="lock"){ location.reload(); return; }
    else if(a==="passwd"){ $("#dataDlg").close?.(); if(await LocalDB.changePassword()) toast("Đã đổi mật khẩu"); return; }
  }catch(err){ if(err&&err.name==="AbortError") return; console.warn(err); toast(err.message||"Không thực hiện được"); }
  renderDataUI(LocalDB.info());
},true);
document.addEventListener("change",async e=>{
  if(e.target.id!=="impFile"||!e.target.files[0]) return;
  if(!confirm("Thay toàn bộ dữ liệu hiện tại bằng bản sao lưu này?")){ e.target.value=""; return; }
  try{ await LocalDB.importText(await e.target.files[0].text()); toast("Đã nhập dữ liệu từ bản sao lưu"); renderDataUI(LocalDB.info()); }
  catch(err){ toast("File không đúng định dạng sao lưu"); }
  e.target.value="";
});
