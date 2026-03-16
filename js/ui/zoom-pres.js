/**
 * ScholarSlide — 슬라이드/발표 줌·폰트 스케일·외부 발표 창
 * 전역 의존: showToast, markdownToHtml, renderPresSlide, getSlides, getPresentationScript, getSlideStyle, getActiveSlideIndex
 */
(function () {
  'use strict';
  var _slideZoom = 100;
  var _slideFontScale = 100;

  window._setSlideZoom = function (v) { _slideZoom = v; };
  window.getSlideZoom = function () { return _slideZoom; };
  window._setSlideFontScale = function (v) { _slideFontScale = v; };
  window.getSlideFontScale = function () { return _slideFontScale; };

  function changeSlideZoom(delta) {
    _slideZoom = Math.max(50, Math.min(200, _slideZoom + delta));
    applySlideZoom();
    if (typeof window._syncPresZoomFromSlide === 'function') window._syncPresZoomFromSlide(_slideZoom);
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
    var getDefaultImageSlotPos = function (slotIndex) {
      if (slotIndex === 0) return { right: 0, centerY: true, w: 280, h: 280 };
      var base = 20, step = 40;
      return { left: base + slotIndex * step, top: base + slotIndex * step, w: 200, h: 150 };
    };
    var getSlideImageItems = function (s) {
      var arr = [];
      var imgs = Array.isArray(s.images) && s.images.length ? s.images : [];
      if (!imgs.length && (s.imageUrl || s.imageUrl2)) {
        if (s.imageUrl) arr.push({ url: s.imageUrl, slideImage: null });
        if (s.imageUrl2) arr.push({ url: s.imageUrl2, slideImage: null });
      } else {
        for (var i = 0; i < imgs.length; i++) if (imgs[i] && imgs[i].url) arr.push({ url: imgs[i].url, slideImage: imgs[i].slideImage || null });
      }
      return arr.map(function (it, i) {
        var pos = (it.slideImage && (it.slideImage.w || it.slideImage.h || it.slideImage.left != null || it.slideImage.top != null || it.slideImage.right != null || it.slideImage.centerY)) ? it.slideImage : getDefaultImageSlotPos(i);
        var p = { w: pos.w || 200, h: pos.h || 150 };
        if (pos.centerY === true) { p.right = pos.right != null ? pos.right : 0; p.centerY = true; }
        else if (pos.right != null) { p.right = pos.right; p.top = pos.top != null ? pos.top : 0; }
        else { p.left = pos.left != null ? pos.left : 0; p.top = pos.top != null ? pos.top : 0; }
        return { url: it.url, pos: p };
      });
    };
    var slidesForExt = sl.map(function (s) {
      var imageItems = getSlideImageItems(s);
      var hasImage = imageItems.length > 0;
      var rawPct = (hasImage && s.innerSize && s.innerSize.widthPct != null) ? s.innerSize.widthPct : 45;
      var textPct = hasImage ? Math.max(10, Math.min(90, rawPct)) : 45;
      return {
        title: s.title,
        titleHtml: md(s.title),
        bullets: s.bullets || [],
        bulletsHtml: (s.bullets || []).map(function (b) { return md(b); }),
        isCover: s.isCover,
        imageUrl: imageItems[0] ? imageItems[0].url : null,
        imageUrls: imageItems.map(function (it) { return it.url; }),
        imageItems: imageItems,
        notes: s.notes,
        textPct: textPct
      };
    });
    var slidesJSON = JSON.stringify(slidesForExt);
    var scriptJSON = JSON.stringify((typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : []) || []);
    var styleMode = (typeof window.getSlideStyle === 'function' ? window.getSlideStyle() : 'light') || 'light';
    var startIdx = (typeof window.getActiveSlideIndex === 'function' ? window.getActiveSlideIndex() : 0) || 0;
    var fontScale = _slideFontScale / 100;
    var syncOn = (typeof window._slideSyncEnabled !== 'undefined' ? window._slideSyncEnabled : false);
    var html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><title>발표 — ScholarSlide AI</title><style>'
      + '*{box-sizing:border-box;margin:0;padding:0}body{background:#111;display:flex;flex-direction:column;height:100vh;overflow:hidden;font-family:\'DM Sans\',sans-serif,system-ui}'
      + '.pres-area{flex:1;display:flex;align-items:center;justify-content:center;background:#111;overflow:hidden;position:relative}'
      + '.pres-inner{position:relative;flex-shrink:0;transition:transform 0.2s ease}'
      + '.pres-controls{display:flex;align-items:center;justify-content:center;gap:8px;padding:7px 14px;background:rgba(10,12,20,0.98);border-top:1px solid #1e2332;flex-shrink:0;flex-wrap:wrap}'
      + '.pb{background:rgba(79,142,247,0.18);border:1px solid rgba(79,142,247,0.35);color:#9ecbff;border-radius:8px;padding:5px 13px;font-size:12px;cursor:pointer;white-space:nowrap}.pb:hover{background:rgba(79,142,247,0.35)}'
      + '.pb.sm{padding:5px 9px;font-size:13px;font-weight:700;min-width:30px}.counter{font-size:13px;color:#9ecbff;min-width:56px;text-align:center;cursor:pointer;padding:2px 6px;border-radius:6px;border:1px solid transparent}.counter:hover{border-color:rgba(79,142,247,0.35);background:rgba(79,142,247,0.14)}'
      + '.zv{font-size:10px;color:rgba(158,203,255,0.65);min-width:36px;text-align:center}.sep{width:1px;height:18px;background:rgba(79,142,247,0.2);flex-shrink:0}'
      + '.notes{background:rgba(12,16,24,0.97);color:#a0aab8;font-size:12px;padding:7px 18px;line-height:1.6;display:none;border-top:1px solid #1e2332;max-height:110px;overflow-y:auto}.notes.show{display:block}'
      + '</style></head><body><div class="pres-area" id="pres-area"><div class="pres-inner" id="pres-inner"></div></div>'
      + '<div class="pres-controls"><button class="pb" onclick="nav(-1)">◀ 이전</button><span class="counter" id="counter" onclick="jumpPrompt()" title="페이지 번호 입력하여 이동">1/1</span><button class="pb" onclick="nav(1)">다음 ▶</button><div class="sep"></div>'
      + '<button class="pb sm" onclick="chZoom(-10)">−</button><span class="zv" id="zv">100%</span><button class="pb sm" onclick="chZoom(10)">+</button>'
      + '<button class="pb" onclick="fitZoom()">⊡ 맞추기</button><div class="sep"></div>'
      + '<button class="pb sm" onclick="chFontScale(-0.1)">A−</button><span class="zv" id="fv">100%</span><button class="pb sm" onclick="chFontScale(0.1)">A+</button><div class="sep"></div>'
      + '<button class="pb" onclick="toggleNotes()">📝 노트</button><div class="sep"></div><button class="pb" id="ext-sync-btn" onclick="toggleSync()" title="내부 창과 슬라이드 번호 동기화">' + (syncOn ? '🔗 동기화 ON' : '🔗 동기화 OFF') + '</button><button class="pb" onclick="togglePresFullscreen()" title="전체화면 토글">⊞ 전체화면</button><button class="pb" onclick="window.close()">✕ 닫기</button></div><div class="notes" id="notes"></div>'
      + '<script>var SL=' + slidesJSON + ';var SC=' + scriptJSON + ';var SM="' + String(styleMode).replace(/"/g, '\\"') + '";var idx=' + startIdx + ';var fontScale=' + fontScale + ';var nv=false;var zoom=100;var _syncLock=false;var _syncOn=' + (syncOn ? 'true' : 'false') + ';'
      + 'function escH(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}'
      + 'function applyZoom(){var el=document.getElementById("pres-inner");if(el)el.style.transform="scale("+(zoom/100)+")";var zv=document.getElementById("zv");if(zv)zv.textContent=zoom+"%";}'
      + 'function chZoom(d){zoom=Math.max(25,Math.min(300,zoom+d));applyZoom();}'
      + 'function chFontScale(d){fontScale=Math.max(0.3,Math.min(3,fontScale+d));var fv=document.getElementById("fv");if(fv)fv.textContent=Math.round(fontScale*100)+"%";render();}'
      + 'function fitZoom(){var area=document.getElementById("pres-area"),inner=document.getElementById("pres-inner");if(!area||!inner)return;var aw=area.clientWidth-32,ah=area.clientHeight-32,iw=inner.offsetWidth||900,ih=inner.offsetHeight||506;if(!iw||!ih)return;zoom=Math.round(Math.max(25,Math.min(200,Math.min(aw/iw,ah/ih)*100)));applyZoom();}'
      + 'function render(){var s=SL[idx];if(!s)return;var inner=document.getElementById("pres-inner"),area=document.getElementById("pres-area");var baseW=Math.min((area.clientWidth||1200)*0.9,1100),baseH=Math.round(baseW*9/16);inner.style.width=baseW+"px";inner.style.height=baseH+"px";var isDark=SM==="dark"||s.isCover;var bg=s.isCover?"background:linear-gradient(135deg,#0f2027,#203a43,#2c5364)":isDark?"background:linear-gradient(135deg,#1a1a2e,#16213e)":"background:#fff";var tc=isDark?"color:#e8f4fd":"color:#1a1a2e",bc=s.isCover?"color:#d8e4f0":(isDark?"color:#b8d4f0":"color:#333"),dot=s.isCover?"display:none":"background:#4f8ef7";var tMin=Math.round(18*fontScale),tMax=Math.round(40*fontScale),tVw=(3.2*fontScale).toFixed(1),bMin=Math.round(10*fontScale),bMax=Math.round(20*fontScale),bVw=(1.6*fontScale).toFixed(1);var titleHtml=s.titleHtml!=null?s.titleHtml:escH(s.title),bulletsHtml=s.bulletsHtml||[];var hasImg=s.imageUrls&&s.imageUrls.length>0;if(!hasImg&&s.imageUrl)hasImg=true;var textPct=(hasImg&&s.textPct!=null)?Math.max(20,Math.min(80,s.textPct)):55;var imgW=100-textPct;var rootPad=(hasImg&&!s.isCover)?"5% "+imgW+"% 5% 6%":"5% 6%";var h="<div style=\\"position:absolute;inset:0;padding:"+rootPad+";display:flex;flex-direction:column;z-index:2;"+bg+(s.isCover?";align-items:center;justify-content:center;text-align:center":"")+"\\">";h+="<div style=\\"position:absolute;left:0;top:0;bottom:0;width:0.6%;background:#4f8ef7;"+(s.isCover?"display:none":"")+"\\"></div>";h+="<div style=\\"font-size:clamp("+tMin+"px,"+tVw+"vw,"+tMax+"px);font-weight:700;line-height:1.2;margin-bottom:4%;"+tc+(s.isCover?";border-bottom:2px solid rgba(79,142,247,0.5);padding-bottom:18px;margin-bottom:14px":"")+"\\">"+titleHtml+"</div><div style=\\"flex:1\\">";if(bulletsHtml.length>0){bulletsHtml.forEach(function(html){h+="<div style=\\"display:flex;gap:10px;margin-bottom:1.8%;align-items:flex-start\\"><div style=\\"width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:0.45em;"+dot+"\\"></div><div style=\\"font-size:clamp("+bMin+"px,"+bVw+"vw,"+bMax+"px);line-height:1.5;"+bc+"\\">"+html+"</div></div>";});}else{(s.bullets||[]).forEach(function(b){h+="<div style=\\"display:flex;gap:10px;margin-bottom:1.8%;align-items:flex-start\\"><div style=\\"width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:0.45em;"+dot+"\\"></div><div style=\\"font-size:clamp("+bMin+"px,"+bVw+"vw,"+bMax+"px);line-height:1.5;"+bc+"\\">"+escH(b)+"</div></div>";});}h+="</div></div>";if(s.imageItems&&s.imageItems.length>0){h+="<div style=\\"position:absolute;inset:0;pointer-events:none;z-index:1\\">";for(var i=0;i<s.imageItems.length;i++){var it=s.imageItems[i],p=it.pos,u=String(it.url||"").replace(/&/g,"&amp;").replace(/\"/g,"&quot;").replace(/</g,"&lt;");var sty="position:absolute;width:"+(p.w||200)+"px;height:"+(p.h||150)+"px;object-fit:contain;z-index:"+i;if(p.centerY){sty+=";right:"+(p.right!=null?p.right:0)+"px;top:50%;transform:translateY(-50%);left:auto";}else if(p.right!=null){sty+=";right:"+p.right+"px;top:"+(p.top!=null?p.top:0)+"px";}else{sty+=";left:"+(p.left!=null?p.left:0)+"px;top:"+(p.top!=null?p.top:0)+"px";}h+="<img style=\\""+sty+"\\" src=\\""+u+"\\" alt=\\"\\"/>";}h+="</div>";}else if(s.imageUrls&&s.imageUrls.length>0){h+="<div style=\\"position:absolute;right:0;top:0;bottom:0;width:"+imgW+"%;display:flex;gap:6px;padding:8px;align-items:stretch;background:#f8fbff\\">";for(var i=0;i<s.imageUrls.length;i++)h+="<img style=\\"flex:1;min-width:0;object-fit:contain;height:100%\\" src=\\""+s.imageUrls[i]+"\\" alt=\\"\\"/>";h+="</div>";}else if(s.imageUrl)h+="<img style=\\"position:absolute;right:0;top:0;bottom:0;width:"+imgW+"%;object-fit:cover;object-position:center center;background:#f8fbff\\" src=\\""+s.imageUrl+"\\" alt=\\"\\"/>";inner.innerHTML=h;document.getElementById("counter").textContent=(idx+1)+"/"+SL.length;var nd=document.getElementById("notes");nd.textContent=SC[idx]||s.notes||"";if(nv)nd.classList.add("show");else nd.classList.remove("show");applyZoom();var fv=document.getElementById("fv");if(fv)fv.textContent=Math.round(fontScale*100)+"%";}'
      + 'function notifySync(){if(!_syncOn)return;try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"ss_sync_slide",index:idx,origin:"external"},"*");}}catch(e){}}'
      + 'function nav(d){idx=Math.max(0,Math.min(SL.length-1,idx+d));render();if(!_syncLock)notifySync();}'
      + 'function jumpPrompt(){var v=prompt("이동할 페이지 번호를 입력하세요 (1-"+SL.length+")",String(idx+1));if(v===null)return;var n=parseInt(v,10);if(!isFinite(n)||n<1||n>SL.length){alert("유효한 페이지 번호를 입력하세요.");return;}idx=n-1;render();if(!_syncLock)notifySync();}'
      + 'function toggleNotes(){nv=!nv;document.getElementById("notes").classList.toggle("show",nv);}'
      + 'function togglePresFullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(function(){});else document.exitFullscreen();}'
      + 'function toggleSync(){try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"ss_toggle_sync"},"*");}}catch(e){}}'
      + 'function updateSyncBtn(){var b=document.getElementById("ext-sync-btn");if(b){b.textContent=_syncOn?"🔗 동기화 ON":"🔗 동기화 OFF";b.style.color=_syncOn?"#9ecbff":"rgba(158,203,255,0.6)";}}'
      + 'window.addEventListener("message",function(ev){var d=ev&&ev.data;if(!d)return;if(d.type==="ss_sync_state"){_syncOn=!!d.enabled;updateSyncBtn();return;}if(d.type!=="ss_sync_slide")return;var ni=parseInt(d.index,10);if(!isFinite(ni)||ni<0||ni>=SL.length)return;if(ni===idx)return;_syncLock=true;idx=ni;render();setTimeout(function(){_syncLock=false;},0);});'
      + 'document.addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();nav(1);}else if(e.key==="ArrowLeft"){e.preventDefault();nav(-1);}else if(e.key==="Escape")window.close();else if(e.key==="n"||e.key==="N")toggleNotes();else if(e.ctrlKey&&e.key==="9"){e.preventDefault();chZoom(-10);}else if(e.ctrlKey&&e.key==="0"){e.preventDefault();chZoom(10);}else if(!e.ctrlKey&&(e.key==="+"||e.key==="="))chZoom(10);else if(!e.ctrlKey&&e.key==="-")chZoom(-10);else if(e.key==="f"||e.key==="F")fitZoom();});'
+ 'document.addEventListener("wheel",function(e){e.preventDefault();if(e.deltaY>0)nav(1);else if(e.deltaY<0)nav(-1);},{passive:false});'
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
      if (typeof window !== 'undefined') window._extPresWindow = w;
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setTimeout(function () {
        try {
          var enabled = (typeof window._slideSyncEnabled !== 'undefined' ? window._slideSyncEnabled : false);
          w.postMessage({ type: 'ss_sync_state', enabled: enabled }, '*');
        } catch (e) {}
      }, 150);
      return w;
    } catch (e) {
      if (typeof window.showToast === 'function') window.showToast('⚠️ 외부 발표 창을 열 수 없습니다');
      return null;
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
