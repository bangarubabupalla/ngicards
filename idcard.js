/* idcard.js
   Core logic for the ID Card app.
   Usage: include this file and the idcard.css file. It auto-initializes on DOMContentLoaded.
*/

(function(){
  'use strict';

  // === CONFIG: Replace GAS_URL here if you redeploy later ===
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbysOW9Uls96G-IZe4354cb2l26dpUbtlWvcwcrLrefbCXeyN5u_a9SOsRO0lpZeRNUW/exec';

  // Background images (kept as confirmed)
  const BG = {
    "Student NIE": "https://iili.io/fHuJnBS.png",
    "Student NIST": "https://iili.io/fHuqfSI.png",
    "Staff NIE": "https://iili.io/fd2lq3Q.png",
    "Staff NIST": "https://iili.io/fd2lK6x.png"
  };

  // Local uploaded file you mentioned (reference)
  const LOCAL_FILE = '/mnt/data/46c76863-7b9a-4069-88ce-249c71c94a20.png';

  // Coordinates for canvas (638x1016)
  const COORD = {
    "Student NIE": { photo:{x:60,y:130,w:180,h:230}, name:{x:280,y:180,color:'#000',size:32}, id:{x:280,y:240,color:'#000',size:30}, course:{x:280,y:300,color:'#0033AA',size:28}, blood:{x:280,y:360,color:'#CC0000',size:28}, contact:{x:280,y:420,color:'#000',size:28}, parent:{x:280,y:480,color:'#000',size:28}, parentContact:{x:280,y:540,color:'#000',size:28} },
    "Student NIST": { photo:{x:70,y:150,w:170,h:220}, name:{x:270,y:190,color:'#000',size:32}, id:{x:270,y:250,color:'#000',size:30}, course:{x:270,y:310,color:'#0033AA',size:28}, blood:{x:270,y:370,color:'#CC0000',size:28}, contact:{x:270,y:430,color:'#000',size:28}, parent:{x:270,y:490,color:'#000',size:28}, parentContact:{x:270,y:550,color:'#000',size:28} },
    "Staff NIE": { photo:{x:80,y:160,w:160,h:210}, name:{x:270,y:200,color:'#000',size:32}, id:{x:270,y:260,color:'#000',size:30}, designation:{x:270,y:320,color:'#004488',size:28}, department:{x:270,y:380,color:'#004488',size:28}, blood:{x:270,y:440,color:'#CC0000',size:28}, contact:{x:270,y:500,color:'#000',size:28} },
    "Staff NIST": { photo:{x:75,y:150,w:170,h:220}, name:{x:260,y:190,color:'#000',size:32}, id:{x:260,y:250,color:'#000',size:30}, designation:{x:260,y:310,color:'#004488',size:28}, department:{x:260,y:370,color:'#004488',size:28}, blood:{x:260,y:430,color:'#CC0000',size:28}, contact:{x:260,y:490,color:'#000',size:28} }
  };

  // Utility helpers
  const $ = id => document.getElementById(id);

  function toTitleCase(str){
    return String(str || '').replace(/\s+/g,' ').split(' ').map(w=>{
      if(!w) return '';
      return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();
    }).join(' ');
  }

  function fileToDataUrl(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=> res(fr.result);
      fr.onerror = e => rej(e);
      fr.readAsDataURL(file);
    });
  }

  // show small success toast
  function showSuccess(){
    const el = $('successMsg');
    if(!el) return;
    el.style.display = 'flex';
    setTimeout(()=>el.style.display='none', 2000);
  }

  // show not approved popup
  function showNotApproved(){
    const el = $('notApproved');
    if(!el) return;
    el.style.display = 'flex';
    setTimeout(()=>el.style.display='none', 2000);
  }

  // POST to GAS
  async function sendPost(payload){
    const res = await fetch(GAS_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  // GET from GAS by id
  async function fetchById(id){
    const res = await fetch(GAS_URL + '?id=' + encodeURIComponent(id));
    return res.json();
  }

  // draw to offscreen canvas and open same-tab page with print/save (page replacement)
  async function drawAndOpenSameTab(data){
    const cardType = String(data.CardType || data.cardType || '');
    const bgUrl = BG[cardType];
    const pos = COORD[cardType];
    if(!bgUrl || !pos) return alert('Card type or background missing');

    const canvas = $('offCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 638; canvas.height = 1016;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // load bg
    const bg = new Image(); bg.crossOrigin = 'anonymous'; bg.src = bgUrl;
    await new Promise((res,rej)=>{ bg.onload=res; bg.onerror=()=>rej(new Error('BG load failed')); });

    ctx.drawImage(bg,0,0,canvas.width,canvas.height);

    // load font
    try{
      const pop = new FontFace('Poppins','url(https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrLPTucHtA.woff2)');
      await pop.load(); document.fonts.add(pop);
    }catch(e){ console.log('font load failed', e); }

    // draw photo if exists
    if(data.PhotoUrl){
      try{
        const p = new Image(); p.crossOrigin='anonymous'; p.src = data.PhotoUrl;
        await new Promise((res,rej)=>{ p.onload=res; p.onerror=()=>rej(new Error('photo load failed')); });
        ctx.drawImage(p, pos.photo.x, pos.photo.y, pos.photo.w, pos.photo.h);
      }catch(e){ console.log('photo draw error', e); }
    }

    const draw = (cfg, value) => {
      if(!cfg || !value) return;
      ctx.fillStyle = cfg.color || '#000';
      ctx.textBaseline = 'middle';
      ctx.font = (cfg.size || 26) + 'px Poppins';
      ctx.fillText(String(value), cfg.x, cfg.y);
    };

    const isStudent = cardType.startsWith('Student');
    const idValue = isStudent ? (data.RollNumber || data.RollNumber || '') : (data.EmployeeID || data.EmployeeID || '');

    if(isStudent){
      draw(pos.name, data.Name || '');
      draw(pos.id, idValue || '');
      draw(pos.course, data.Course || '');
      draw(pos.blood, data.BloodGroup || '');
      draw(pos.contact, data.ContactNumber || '');
      draw(pos.parent, data.ParentName || '');
      draw(pos.parentContact, data.ParentContact || '');
    } else {
      draw(pos.name, data.Name || '');
      draw(pos.id, idValue || '');
      draw(pos.designation, data.Designation || '');
      draw(pos.department, data.Department || '');
      draw(pos.blood, data.BloodGroup || '');
      draw(pos.contact, data.ContactNumber || '');
    }

    const dataURL = canvas.toDataURL('image/png');

    // open same tab: replace document with small viewer containing Print & Save
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>ID Card</title>
        <style>
          body{margin:0;background:#f6f7f8;display:flex;flex-direction:column;min-height:100vh;font-family:Poppins, sans-serif}
          .top{display:flex;gap:10px;align-items:center;padding:12px;background:#fff;border-bottom:1px solid #eee}
          .btn{background:#1976d2;color:#fff;padding:10px 12px;border-radius:8px;border:none;cursor:pointer;font-weight:700}
          .btn.secondary{background:#388e3c}
          .container{flex:1;display:flex;align-items:center;justify-content:center;padding:18px}
          img{max-width:100%;height:auto;display:block;box-shadow:0 6px 20px rgba(0,0,0,0.1)}
          @media (max-width:720px){ .top{flex-direction:column;gap:8px} }
        </style>
      </head>
      <body>
        <div class="top">
          <div>
            <button class="btn" id="printBtn">Print</button>
            <button class="btn secondary" id="saveBtn">Save PNG</button>
          </div>
          <div style="margin-left:8px;color:#444">Use Print or Save to keep the ID card.</div>
        </div>
        <div class="container">
          <img id="cardImg" src="${dataURL}" alt="ID Card" />
        </div>

        <script>
          const imgData = "${dataURL}";
          document.getElementById('printBtn').addEventListener('click', ()=>{ window.print(); });
          document.getElementById('saveBtn').addEventListener('click', ()=>{
            const a = document.createElement('a'); a.href = imgData; a.download = 'id-card.png'; document.body.appendChild(a); a.click(); a.remove();
          });
        </script>
      </body>
      </html>
    `;
    document.open();
    document.write(html);
    document.close();
  }

  // Initialize: attach event listeners
  function init(){
    // graceful exit if DOM elements missing
    if(!$('cardType')) return;

    // UI behavior: show/hide fields
    $('cardType').addEventListener('change', ()=>{
      const v = $('cardType').value || '';
      if(v.startsWith('Student')){
        $('studentFields').style.display='block';
        $('staffFields').style.display='none';
      } else if(v.startsWith('Staff')){
        $('studentFields').style.display='none';
        $('staffFields').style.display='block';
      } else {
        $('studentFields').style.display='none';
        $('staffFields').style.display='none';
      }
    });

    // title-case while typing
    ['name','parent','sname','designation','department','course'].forEach(id=>{
      const el = $(id); if(!el) return;
      el.addEventListener('input', ()=>{ const pos = el.selectionStart; el.value = toTitleCase(el.value); el.setSelectionRange(pos,pos); });
    });

    // submit
    $('submitBtn').addEventListener('click', async ()=>{
      const cardType = ($('cardType').value || '').trim();
      if(!cardType) return alert('Select Card Type');

      const payload = { cardType };

      if(cardType.startsWith('Student')){
        payload.course = $('course').value.trim();
        payload.name = toTitleCase($('name').value.trim());
        payload.rollNumber = $('rollNumber').value.trim();
        payload.bloodGroup = $('blood').value.trim();
        payload.contactNumber = $('contact').value.trim();
        payload.parentName = toTitleCase($('parent').value.trim());
        payload.parentContact = $('parentContact').value.trim();
        const f = $('photo').files[0]; if(f) payload.photoData = await fileToDataUrl(f);
        if(!payload.rollNumber) return alert('Roll Number required for Student');
      } else {
        payload.name = toTitleCase($('sname').value.trim());
        payload.employeeID = $('employeeID').value.trim();
        payload.designation = toTitleCase($('designation').value.trim());
        payload.department = toTitleCase($('department').value.trim());
        payload.bloodGroup = $('sblood').value.trim();
        payload.contactNumber = $('scontact').value.trim();
        const f = $('sphoto').files[0]; if(f) payload.photoData = await fileToDataUrl(f);
        if(!payload.employeeID) return alert('Employee ID required for Staff');
      }

      try{
        const json = await sendPost(payload);
        if(json.status === 'inserted' || json.status === 'updated'){
          showSuccess();
        } else {
          alert('Save error: ' + (json.message || JSON.stringify(json)));
        }
      }catch(err){
        alert('Network error while saving. Details: ' + err.message + '\n\nMake sure GAS is deployed as "Anyone, even anonymous".');
      }
    });

    // fetch
    $('verifyBtn').addEventListener('click', async ()=>{
      const id = $('verifyId').value.trim();
      if(!id) return alert('Enter RollNumber or EmployeeID');
      try{
        const json = await fetchById(id);
        if(json.status === 'success'){
          const data = json.data || {};
          const approved = (String(data.Approved || data.approved || '').toLowerCase() === 'yes');
          if(!approved){ showNotApproved(); return; }
          await drawAndOpenSameTab(data);
        } else if(json.status === 'not_found'){
          alert('Not found');
        } else {
          alert('Error: ' + JSON.stringify(json));
        }
      }catch(err){
        alert('Network error while fetching. Details: ' + err.message + '\n\nEnsure GAS URL is correct and deployment is public.');
      }
    });

  } // end init

  // wait for DOM
  document.addEventListener('DOMContentLoaded', init);

  // expose for debugging (optional)
  window.IDCARD = { drawAndOpenSameTab, BG, COORD, LOCAL_FILE };
})();
