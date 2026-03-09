/**
 * ScholarSlide — 슬라이드/발표 줌·폰트 스케일·외부 발표 창
 * 전역 의존: showToast, markdownToHtml, renderPresSlide, getSlides, getPresentationScript, getSlideStyle, getActiveSlideIndex
 */
(function () {
  'use strict';
  var _slideZoom = 100;
  var _slideFontScale = 100;

  window._setSlideZoom = function (v) { _slideZoom = v; };
  window._setSlideFontScale = function (v) { _slideFontScale = v; };
  window.getSlideFontScale = function () { return _slideFontScale; };

  function changeSlideZoom(delta) {
    _slideZoom = Math.max(50, Math.min(200, _slideZoom + delta));
    applySlideZoom();
  }

  function applySlideZoom() {
    var canvas = document.getElementById('slides-canvas');
    var lbl = document.getElementById('slide-zoom-val');
    var scale = _slideZoom / 100;
    if (canvas) {
      canvas.style.zoom = _slideZoom + '%';
      if (!supportsZoom()) {
        canvas.style.zoom = '';
        canvas.style.transform = 'scale(' + scale + ')';
        canvas.style.transformOrigin = 'top center';
      } else {
        canvas.style.transform = '';
      }
    }
    if (lbl) lbl.textContent = _slideZoom + '%';
  }

  function supportsZoom() {
    var el = document.createElement('div');
    el.style.cssText = 'zoom: 1';
    return el.style.zoom === '1' || el.style.zoom === 1;
  }

  function changeSlideFontScale(delta) {
    _slideFontScale = Math.max(30, Math.min(300, _slideFontScale + delta));
    applySlideFontScale();
  }

  function applySlideFontScale() {
    var canvas = document.getElementById('slides-canvas');
    var lbl = document.getElementById('slide-font-val');
    var presLbl = document.getElementById('pres-font-val');
    if (canvas) canvas.style.setProperty('--slide-font-scale', _slideFontScale / 100);
    if (lbl) lbl.textContent = _slideFontScale + '%';
    if (presLbl) presLbl.textContent = _slideFontScale + '%';
  }

  function changePresFontScale(delta) {
    _slideFontScale = Math.max(30, Math.min(300, _slideFontScale + delta));
    applySlideFontScale();
    if (typeof window.renderPresSlide === 'function') window.renderPresSlide();
  }

  function openExternalPresentation() {
    var sl = (typeof window.getSlides === 'function' ? window.getSlides() : []) || [];
    if (!sl.length) {
      if (typeof window.showToast === 'function') window.showToast('⚠️ 슬라이드가 없습니다');
      return;
    }
    var md = typeof window.markdownToHtml === 'function' ? window.markdownToHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var slidesForExt = sl.map(function (s) {
      return {
        title: s.title,
        titleHtml: md(s.title),
        bullets: s.bullets || [],
        bulletsHtml: (s.bullets || []).map(function (b) { return md(b); }),
        isCover: s.isCover,
        imageUrl: s.imageUrl,
        notes: s.notes
      };
    });
    var slidesJSON = JSON.stringify(slidesForExt);
    var scriptJSON = JSON.stringify((typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : []) || []);
    var styleMode = (typeof window.getSlideStyle === 'function' ? window.getSlideStyle() : 'light') || 'light';
    var startIdx = (typeof window.getActiveSlideIndex === 'function' ? window.getActiveSlideIndex() : 0) || 0;
    var fontScale = _slideFontScale / 100;
    var html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><title>발표 — ScholarSlide AI</title><style>'
      + '*{box-sizing:border-box;margin:0;padding:0}body{background:#111;display:flex;flex-direction:column;height:100vh;overflow:hidden;font-family:\'DM Sans\',sans-serif,system-ui}'
      + '.pres-area{flex:1;display:flex;align-items:center;justify-content:center;background:#111;overflow:hidden;position:relative}'
      + '.pres-inner{position:relative;flex-shrink:0;transition:transform 0.2s ease}'
      + '.pres-controls{display:flex;align-items:center;justify-content:center;gap:8px;padding:7px 14px;background:rgba(10,12,20,0.98);border-top:1px solid #1e2332;flex-shrink:0;flex-wrap:wrap}'
      + '.pb{background:rgba(79,142,247,0.18);border:1px solid rgba(79,142,247,0.35);color:#9ecbff;border-radius:8px;padding:5px 13px;font-size:12px;cursor:pointer;white-space:nowrap}.pb:hover{background:rgba(79,142,247,0.35)}'
      + '.pb.sm{padding:5px 9px;font-size:13px;font-weight:700;min-width:30px}.counter{font-size:13px;color:#9ecbff;min-width:56px;text-align:center}'
      + '.zv{font-size:10px;color:rgba(158,203,255,0.65);min-width:36px;text-align:center}.sep{width:1px;height:18px;background:rgba(79,142,247,0.2);flex-shrink:0}'
      + '.notes{background:rgba(12,16,24,0.97);color:#a0aab8;font-size:12px;padding:7px 18px;line-height:1.6;display:none;border-top:1px solid #1e2332;max-height:110px;overflow-y:auto}.notes.show{display:block}'
      + '</style></head><body><div class="pres-area" id="pres-area"><div class="pres-inner" id="pres-inner"></div></div>'
      + '<div class="pres-controls"><button class="pb" onclick="nav(-1)">◀ 이전</button><span class="counter" id="counter">1/1</span><button class="pb" onclick="nav(1)">다음 ▶</button><div class="sep"></div>'
      + '<button class="pb sm" onclick="chZoom(-10)">−</button><span class="zv" id="zv">100%</span><button class="pb sm" onclick="chZoom(10)">+</button>'
      + '<button class="pb" onclick="fitZoom()">⊡ 맞추기</button><div class="sep"></div>'
      + '<button class="pb sm" onclick="chFontScale(-0.1)">A−</button><span class="zv" id="fv">100%</span><button class="pb sm" onclick="chFontScale(0.1)">A+</button><div class="sep"></div>'
      + '<button class="pb" onclick="toggleNotes()">📝 노트</button><button class="pb" onclick="window.close()">✕ 닫기</button></div><div class="notes" id="notes"></div>'
      + '<script>var SL=' + slidesJSON + ';var SC=' + scriptJSON + ';var SM="' + String(styleMode).replace(/"/g, '\\"') + '";var idx=' + startIdx + ';var fontScale=' + fontScale + ';var nv=false;var zoom=100;'
      + 'function escH(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}'
      + 'function applyZoom(){var el=document.getElementById("pres-inner");if(el)el.style.transform="scale("+(zoom/100)+")";var zv=document.getElementById("zv");if(zv)zv.textContent=zoom+"%";}'
      + 'function chZoom(d){zoom=Math.max(25,Math.min(300,zoom+d));applyZoom();}'
      + 'function chFontScale(d){fontScale=Math.max(0.3,Math.min(3,fontScale+d));var fv=document.getElementById("fv");if(fv)fv.textContent=Math.round(fontScale*100)+"%";render();}'
      + 'function fitZoom(){var area=document.getElementById("pres-area"),inner=document.getElementById("pres-inner");if(!area||!inner)return;var aw=area.clientWidth-32,ah=area.clientHeight-32,iw=inner.offsetWidth||900,ih=inner.offsetHeight||506;if(!iw||!ih)return;zoom=Math.round(Math.max(25,Math.min(200,Math.min(aw/iw,ah/ih)*100)));applyZoom();}'
      + 'function render(){var s=SL[idx];if(!s)return;var inner=document.getElementById("pres-inner"),area=document.getElementById("pres-area");var baseW=Math.min((area.clientWidth||1200)*0.9,1100),baseH=Math.round(baseW*9/16);inner.style.width=baseW+"px";inner.style.height=baseH+"px";var isDark=SM==="dark"||s.isCover;var bg=s.isCover?"background:linear-gradient(135deg,#0f2027,#203a43,#2c5364)":isDark?"background:linear-gradient(135deg,#1a1a2e,#16213e)":"background:#fff";var tc=isDark?"color:#e8f4fd":"color:#1a1a2e",bc=s.isCover?"color:#d8e4f0":(isDark?"color:#b8d4f0":"color:#333"),dot=s.isCover?"display:none":"background:#4f8ef7";var tMin=Math.round(18*fontScale),tMax=Math.round(40*fontScale),tVw=(3.2*fontScale).toFixed(1),bMin=Math.round(10*fontScale),bMax=Math.round(20*fontScale),bVw=(1.6*fontScale).toFixed(1);var titleHtml=s.titleHtml!=null?s.titleHtml:escH(s.title),bulletsHtml=s.bulletsHtml||[];var h="<div style=\\"position:absolute;inset:0;padding:5% 6%;display:flex;flex-direction:column;"+bg+(s.isCover?";align-items:center;justify-content:center;text-align:center":"")+"\\">";h+="<div style=\\"position:absolute;left:0;top:0;bottom:0;width:0.6%;background:#4f8ef7;"+(s.isCover?"display:none":"")+"\\"></div>";h+="<div style=\\"font-size:clamp("+tMin+"px,"+tVw+"vw,"+tMax+"px);font-weight:700;line-height:1.2;margin-bottom:4%;"+tc+(s.isCover?";border-bottom:2px solid rgba(79,142,247,0.5);padding-bottom:18px;margin-bottom:14px":"")+"\\">"+titleHtml+"</div><div style=\\"flex:1\\">";if(bulletsHtml.length>0){bulletsHtml.forEach(function(html){h+="<div style=\\"display:flex;gap:10px;margin-bottom:1.8%;align-items:flex-start\\"><div style=\\"width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:0.45em;"+dot+"\\"></div><div style=\\"font-size:clamp("+bMin+"px,"+bVw+"vw,"+bMax+"px);line-height:1.5;"+bc+"\\">"+html+"</div></div>";});}else{(s.bullets||[]).forEach(function(b){h+="<div style=\\"display:flex;gap:10px;margin-bottom:1.8%;align-items:flex-start\\"><div style=\\"width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:0.45em;"+dot+"\\"></div><div style=\\"font-size:clamp("+bMin+"px,"+bVw+"vw,"+bMax+"px);line-height:1.5;"+bc+"\\">"+escH(b)+"</div></div>";});}h+="</div></div>";if(s.imageUrl)h+="<img style=\\"position:absolute;right:0;top:0;bottom:0;width:38%;object-fit:cover\\" src=\\""+s.imageUrl+"\\" alt=\\"\\"/>";inner.innerHTML=h;document.getElementById("counter").textContent=(idx+1)+"/"+SL.length;var nd=document.getElementById("notes");nd.textContent=SC[idx]||s.notes||"";if(nv)nd.classList.add("show");else nd.classList.remove("show");applyZoom();var fv=document.getElementById("fv");if(fv)fv.textContent=Math.round(fontScale*100)+"%";}'
      + 'function nav(d){idx=Math.max(0,Math.min(SL.length-1,idx+d));render();}function toggleNotes(){nv=!nv;document.getElementById("notes").classList.toggle("show",nv);}'
      + 'document.addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();nav(1);}else if(e.key==="ArrowLeft"){e.preventDefault();nav(-1);}else if(e.key==="Escape")window.close();else if(e.key==="n"||e.key==="N")toggleNotes();else if(e.ctrlKey&&e.key==="9"){e.preventDefault();chZoom(-10);}else if(e.ctrlKey&&e.key==="0"){e.preventDefault();chZoom(10);}else if(!e.ctrlKey&&(e.key==="+"||e.key==="="))chZoom(10);else if(!e.ctrlKey&&e.key==="-")chZoom(-10);else if(e.key==="f"||e.key==="F")fitZoom();});'
      + 'window.addEventListener("resize",function(){render();setTimeout(fitZoom,30);});render();setTimeout(fitZoom,60);</scr' + 'ipt></body></html>';

    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var w = window.open(url, '_blank', 'width=1280,height=800,resizable=yes,scrollbars=no');
      if (!w) {
        URL.revokeObjectURL(url);
        if (typeof window.showToast === 'function') window.showToast('⚠️ 팝업이 차단됨 — 팝업 허용 후 다시 시도하세요');
        return;
      }
      if (typeof window.registerChildWindow === 'function') window.registerChildWindow(w);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    } catch (e) {
      if (typeof window.showToast === 'function') window.showToast('⚠️ 외부 발표 창을 열 수 없습니다');
    }
  }

  window.changeSlideZoom = changeSlideZoom;
  window.applySlideZoom = applySlideZoom;
  window.supportsZoom = supportsZoom;
  window.changeSlideFontScale = changeSlideFontScale;
  window.applySlideFontScale = applySlideFontScale;
  window.changePresFontScale = changePresFontScale;
  window.openExternalPresentation = openExternalPresentation;
})();
