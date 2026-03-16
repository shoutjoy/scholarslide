/**
 * ScholarSlide — imgBank (이미지 DB)
 * IndexedDB 저장, 좌측 매트릭스 갤러리 + 우측 프리뷰(확대/축소, 드래그 팬, 화살표 이동), Export/Import
 */
(function () {
  'use strict';

  var _imgBankSelected = null;
  var _imgBankDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** @param {HTMLElement} [container] - 렌더할 컨테이너. 없으면 우측 패널(#imgbank-panel) 사용 */
  function renderImgBankPanel(container) {
    var panel = container || document.getElementById('imgbank-panel');
    if (!panel) return;

    var isSidebar = !container || (panel.id === 'imgbank-panel');
    var html;

    if (isSidebar) {
      html = '<div class="imgbank-sidebar-layout">'
        + '<div class="imgbank-sidebar-top">'
        + '<div class="imgbank-sidebar-header">'
        + '<span class="imgbank-sidebar-title">🖼 imgBank (inDB)</span>'
        + '<div class="imgbank-sidebar-btns">'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="document.getElementById(\'imgbank-import-input\').click()">📥 Import</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window.imgBankExport()">📤 Export</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window.imgBankExportZip()" title="이미지들을 ZIP 파일로 저장">📦 ZIP</button>'
        + '</div></div>'
        + '<div class="imgbank-sidebar-thumbs" id="imgbank-grid"></div>'
        + '</div>'
        + '<div class="imgbank-sidebar-sep"></div>'
        + '<div class="imgbank-sidebar-preview">'
        + '<div class="imgbank-sidebar-preview-header">'
        + '<span class="imgbank-sidebar-preview-title">프리뷰</span>'
        + '<div class="imgbank-sidebar-preview-nav">'
        + '<button type="button" class="btn btn-ghost btn-xs imgbank-nav-btn" onclick="window._imgBankPrev()" title="이전">←</button>'
        + '<button type="button" class="btn btn-ghost btn-xs imgbank-nav-btn" onclick="window._imgBankNext()" title="다음">→</button>'
        + '</div></div>'
        + '<div class="imgbank-sidebar-preview-area" id="imgbank-preview-wrap">'
        + '<div class="imgbank-sidebar-preview-inner" id="imgbank-preview-inner">'
        + '<img id="imgbank-preview-img" alt="" style="display:none;cursor:pointer;pointer-events:auto;max-width:100%;max-height:100%;object-fit:contain" title="클릭하면 크게 보기"/>'
        + '</div>'
        + '<p id="imgbank-preview-placeholder" class="imgbank-sidebar-placeholder">왼쪽에서 이미지를 선택하세요</p>'
        + '</div>'
        + '<div class="imgbank-sidebar-preview-actions" id="imgbank-preview-actions" style="display:none">'
        + '<button type="button" class="btn btn-primary btn-xs" onclick="window._imgBankOpenFullscreen()">🔍 크게 보기</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window._imgBankSaveSingle()" title="선택 이미지 파일로 저장">💾 개별 저장</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window._imgBankInsertToSlide()">✓ 슬라이드에 삽입</button>'
        + '<button type="button" class="btn btn-ghost btn-xs imgbank-btn-delete" onclick="window._imgBankDeleteSelected()">🗑 삭제</button>'
        + '</div></div></div>';
    } else {
      html = '<div class="imgbank-layout">'
        + '<div class="imgbank-left">'
        + '<div class="imgbank-toolbar">'
        + '<span style="font-size:11px;font-weight:700;color:var(--text2)">🖼 imgBank (inDB)</span>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap">'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="document.getElementById(\'imgbank-import-input\').click()">📥 Import</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window.imgBankExport()">📤 Export</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window.imgBankExportZip()" title="이미지들을 ZIP 파일로 저장">📦 ZIP</button>'
        + '</div></div>'
        + '<div class="imgbank-grid" id="imgbank-grid"></div>'
        + '</div>'
        + '<div class="imgbank-right">'
        + '<div class="imgbank-preview-toolbar">'
        + '<span style="font-size:10px;color:var(--text3)">프리뷰</span>'
        + '<div style="display:flex;align-items:center;gap:4px">'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window._imgBankPrev()" title="이전 이미지">←</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window._imgBankNext()" title="다음 이미지">→</button>'
        + '</div></div>'
        + '<div class="imgbank-preview-wrap" id="imgbank-preview-wrap">'
        + '<div class="imgbank-preview-inner" id="imgbank-preview-inner">'
        + '<img id="imgbank-preview-img" alt="" style="display:none;cursor:pointer;pointer-events:auto" title="클릭 시 앱 내에서 크게 보기"/>'
        + '</div></div>'
        + '<p id="imgbank-preview-placeholder" style="font-size:11px;color:var(--text3);text-align:center;padding:24px">왼쪽에서 이미지를 선택하세요</p>'
        + '<div id="imgbank-preview-prompt" class="imgbank-preview-prompt" style="display:none;font-size:11px;color:var(--text2);padding:8px;border-top:1px solid var(--border2);max-height:80px;overflow-y:auto;white-space:pre-wrap;word-break:break-word"></div>'
        + '<div class="imgbank-preview-actions" id="imgbank-preview-actions" style="display:none;flex-wrap:wrap;gap:6px;padding:8px;border-top:1px solid var(--border2)">'
        + '<button type="button" class="btn btn-primary btn-xs" onclick="window._imgBankOpenFullscreen()" title="새 탭에서 크게 보기">🔍 크게 보기</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window._imgBankSaveSingle()" title="선택한 이미지를 파일로 저장">💾 개별 저장</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" onclick="window._imgBankInsertToSlide()" title="현재 슬라이드에 삽입">✓ 슬라이드에 삽입</button>'
        + '<button type="button" class="btn btn-ghost btn-xs" style="color:var(--danger)" onclick="window._imgBankDeleteSelected()" title="imgBank에서 삭제">🗑 삭제</button>'
        + '</div></div></div>';
    }

    panel.innerHTML = html;

    var grid = panel.querySelector('#imgbank-grid');
    var img = panel.querySelector('#imgbank-preview-img');
    var placeholder = panel.querySelector('#imgbank-preview-placeholder');

    if (!grid) return;
    if (img) img.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (_imgBankSelected && _imgBankSelected.dataURL) window._imgBankOpenInAppZoom();
    });

    /** 그리드 순서 기준 이전/다음 이미지 */
    window._imgBankPrev = function () {
      var list = window._imgBankList || [];
      if (!list.length) return;
      var idx = _imgBankSelected ? list.findIndex(function (x) { return x.id === _imgBankSelected.id; }) : 0;
      idx = idx <= 0 ? list.length - 1 : idx - 1;
      window._imgBankSelect(list[idx]);
    };
    window._imgBankNext = function () {
      var list = window._imgBankList || [];
      if (!list.length) return;
      var idx = _imgBankSelected ? list.findIndex(function (x) { return x.id === _imgBankSelected.id; }) : -1;
      idx = idx >= list.length - 1 ? 0 : idx + 1;
      window._imgBankSelect(list[idx]);
    };

    function onPreviewKey(e) {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); window._imgBankPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); window._imgBankNext(); }
    }
    document.addEventListener('keydown', onPreviewKey);

    window._imgBankSelectById = function (id) {
      var list = window._imgBankList || [];
      var item = list.find(function (x) { return x.id === id; });
      window._imgBankSelect(item || null);
    };
    /** 썸네일 클릭 시 프리뷰 영역에만 표시 (크게 보기는 프리뷰에서 클릭 시) */
    window._imgBankSelectAndOpenLightbox = function (id) {
      window._imgBankSelectById(id);
    };

    window._imgBankSelect = function (item) {
      _imgBankSelected = item;
      var root = panel && panel.querySelector ? panel : document;
      if (placeholder) placeholder.style.display = item ? 'none' : 'block';
      if (img) {
        img.style.display = item ? 'block' : 'none';
        img.src = item ? (item.dataURL || '') : '';
      }
      var promptEl = root.querySelector ? root.querySelector('#imgbank-preview-prompt') : document.getElementById('imgbank-preview-prompt');
      if (promptEl) {
        var promptText = (item && item.prompt) ? String(item.prompt).trim() : '';
        promptEl.textContent = promptText;
        promptEl.style.display = promptText ? 'block' : 'none';
      }
      var actions = root.querySelector ? root.querySelector('#imgbank-preview-actions') : document.getElementById('imgbank-preview-actions');
      if (actions) actions.style.display = item ? 'flex' : 'none';
      var items = root.querySelectorAll ? root.querySelectorAll('.imgbank-grid-item') : document.querySelectorAll('.imgbank-grid-item');
      items.forEach(function (el) {
        el.classList.toggle('selected', el.getAttribute('data-id') === (item ? String(item.id) : ''));
      });
    };

    window._imgBankOpenFullscreen = function () {
      if (!_imgBankSelected || !_imgBankSelected.dataURL) return;
      if (typeof openImageFullscreen === 'function') openImageFullscreen(_imgBankSelected.dataURL, { fromImgBank: _imgBankSelected.id });
    };
    window._imgBankOpenInAppZoom = function () {
      if (!_imgBankSelected || !_imgBankSelected.dataURL) return;
      var lb = document.getElementById('imgbank-lightbox');
      var lbImg = document.getElementById('imgbank-lightbox-img');
      var wrap = document.getElementById('imgbank-lb-wrap');
      var zoomVal = document.getElementById('imgbank-lb-zoom-val');
      if (lb && lbImg) {
        lbImg.src = _imgBankSelected.dataURL;
        lb.style.display = 'flex';
        window._imgBankLbScale = 1;
        window._imgBankLbTx = 0;
        window._imgBankLbTy = 0;
        if (wrap) wrap.style.transform = 'translate(0,0) scale(1)';
        if (zoomVal) zoomVal.textContent = '100%';
      }
    };
    window._imgBankCloseLightbox = function () {
      var lb = document.getElementById('imgbank-lightbox');
      if (lb) lb.style.display = 'none';
    };
    window._imgBankLbZoom = function (d) {
      var wrap = document.getElementById('imgbank-lb-wrap');
      var zoomVal = document.getElementById('imgbank-lb-zoom-val');
      if (!wrap) return;
      var s = (window._imgBankLbScale || 1) + d;
      s = Math.max(0.25, Math.min(4, s));
      window._imgBankLbScale = s;
      var tx = window._imgBankLbTx || 0;
      var ty = window._imgBankLbTy || 0;
      wrap.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
      if (zoomVal) zoomVal.textContent = Math.round(s * 100) + '%';
    };
    window._imgBankLbDragStart = function (e) {
      if (e.target.closest('.imgbank-lb-toolbar')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      window._imgBankLbDragging = true;
      window._imgBankLbMoved = false;
      window._imgBankLbStartX = e.clientX;
      window._imgBankLbStartY = e.clientY;
      window._imgBankLbStartTx = window._imgBankLbTx || 0;
      window._imgBankLbStartTy = window._imgBankLbTy || 0;
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      var onMove = function (ev) {
        if (!window._imgBankLbDragging) return;
        var dx = Math.abs(ev.clientX - window._imgBankLbStartX);
        var dy = Math.abs(ev.clientY - window._imgBankLbStartY);
        if (dx > 3 || dy > 3) window._imgBankLbMoved = true;
        window._imgBankLbTx = (window._imgBankLbStartTx || 0) + (ev.clientX - window._imgBankLbStartX);
        window._imgBankLbTy = (window._imgBankLbStartTy || 0) + (ev.clientY - window._imgBankLbStartY);
        var wrap = document.getElementById('imgbank-lb-wrap');
        if (wrap) wrap.style.transform = 'translate(' + window._imgBankLbTx + 'px,' + window._imgBankLbTy + 'px) scale(' + (window._imgBankLbScale || 1) + ')';
      };
      var onUp = function () {
        var wasDrag = window._imgBankLbMoved;
        window._imgBankLbDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!wasDrag && typeof window._imgBankCloseLightbox === 'function') window._imgBankCloseLightbox();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    window._imgBankInsertToSlide = function () {
      if (!_imgBankSelected || !_imgBankSelected.dataURL) return;
      if (typeof openImgBankInsertModal === 'function') openImgBankInsertModal(_imgBankSelected.dataURL);
      else if (typeof insertImgBankImageToSlide === 'function') insertImgBankImageToSlide(_imgBankSelected.dataURL);
      else if (typeof showToast === 'function') showToast('⚠️ 슬라이드 삽입 기능을 사용할 수 없습니다.');
    };
    /** 프리뷰에서 선택한 이미지 한 장을 파일로 저장 */
    window._imgBankSaveSingle = function () {
      if (!_imgBankSelected || !_imgBankSelected.dataURL) {
        if (typeof showToast === 'function') showToast('⚠️ 저장할 이미지를 선택하세요.');
        return;
      }
      var dataURL = _imgBankSelected.dataURL;
      var ext = (dataURL.indexOf('jpeg') !== -1 || dataURL.indexOf('jpg') !== -1) ? 'jpg' : 'png';
      var raw = (_imgBankSelected.name || 'imgbank_' + (_imgBankSelected.id || '') || 'image').replace(/\.(png|jpe?g|gif|webp)$/i, '');
      var safeName = raw.replace(/[^\w\uac00-\ud7a3\-\.]/g, '_') || 'image';
      var fileName = safeName + '.' + ext;
      var a = document.createElement('a');
      a.href = dataURL;
      a.download = fileName;
      a.click();
      if (typeof showToast === 'function') showToast('💾 저장됨: ' + fileName);
    };

    window._imgBankDeleteSelected = function () {
      if (!_imgBankSelected || _imgBankSelected.id == null) return;
      if (!confirm('선택한 이미지를 imgBank에서 삭제할까요?')) return;
      if (typeof imgBankDelete !== 'function') return;
      var id = _imgBankSelected.id;
      imgBankDelete(id).then(function () {
        _imgBankSelected = null;
        if (typeof showToast === 'function') showToast('🗑 삭제됨');
        loadGrid();
        if (placeholder) placeholder.style.display = 'block';
        if (img) { img.style.display = 'none'; img.src = ''; }
        var actions = document.getElementById('imgbank-preview-actions');
        if (actions) actions.style.display = 'none';
      }).catch(function () {
        if (typeof showToast === 'function') showToast('❌ 삭제 실패');
      });
    };

    function loadGrid() {
      if (typeof imgBankGetAll !== 'function') { grid.innerHTML = '<p style="color:var(--text3);font-size:11px;padding:12px">IndexedDB를 사용할 수 없습니다.</p>'; return; }
      imgBankGetAll().then(function (list) {
        if (!list || !list.length) {
          grid.innerHTML = '<p style="color:var(--text3);font-size:11px;padding:12px">저장된 이미지가 없습니다.<br>이미지 업로드 모달에서 [inDB 저장]으로 추가하세요.</p>';
          return;
        }
        var isSidebarLayout = panel.querySelector && panel.querySelector('.imgbank-sidebar-layout');
        grid.innerHTML = list.map(function (item) {
          var thumb = item.dataURL ? '<img src="' + esc(item.dataURL) + '" alt="" class="imgbank-thumb-img"/>' : '<div class="imgbank-thumb-empty">🖼</div>';
          var label = isSidebarLayout ? '' : '<span class="imgbank-thumb-label">' + esc(item.name || '#' + item.id) + '</span>';
          var onClick = isSidebarLayout ? 'window._imgBankSelectById(' + item.id + ')' : 'window._imgBankSelectById(' + item.id + ')';
          var titleText = isSidebarLayout ? '클릭하면 아래 프리뷰에 표시' : '클릭하면 프리뷰에 표시';
          return '<div class="imgbank-grid-item' + (isSidebarLayout ? ' imgbank-sidebar-thumb' : '') + '" data-id="' + esc(item.id) + '" onclick="' + onClick + '" title="' + titleText + '">' + thumb + label + '</div>';
        }).join('');
        window._imgBankList = list;
      }).catch(function () {
        grid.innerHTML = '<p style="color:var(--danger);font-size:11px;padding:12px">로드 실패</p>';
      });
    }

    loadGrid();
  }

  window.imgBankSaveCurrent = function () {
    var dataURL = typeof _finalCroppedDataURL !== 'undefined' ? _finalCroppedDataURL : (typeof _origImageDataURL !== 'undefined' ? _origImageDataURL : null);
    if (!dataURL) {
      if (typeof showToast === 'function') showToast('⚠️ 저장할 이미지가 없습니다.');
      return;
    }
    if (typeof imgBankAdd !== 'function') {
      if (typeof showToast === 'function') showToast('⚠️ imgBank를 사용할 수 없습니다.');
      return;
    }
    imgBankAdd({ dataURL: dataURL, name: 'img_' + Date.now() }).then(function () {
      if (typeof showToast === 'function') showToast('✅ inDB에 저장되었습니다.');
      var modal = document.getElementById('imgbank-modal');
      var content = document.getElementById('imgbank-modal-content');
      var panel = document.getElementById('imgbank-panel');
      if (modal && modal.classList.contains('open') && content && typeof renderImgBankPanel === 'function') renderImgBankPanel(content);
      else if (panel && panel.style.display !== 'none' && typeof renderImgBankPanel === 'function') renderImgBankPanel();
    }).catch(function () {
      if (typeof showToast === 'function') showToast('❌ 저장 실패');
    });
  };

  window.imgBankExport = function () {
    if (typeof imgBankGetAll !== 'function') return;
    imgBankGetAll().then(function (list) {
      var data = JSON.stringify(list);
      var a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
      a.download = 'scholarslide_imgbank_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      if (typeof showToast === 'function') showToast('✅ Export 완료 (' + (list.length) + '장)');
    });
  };

  /** imgBank 이미지 전체를 ZIP 파일로 저장 */
  window.imgBankExportZip = function () {
    if (typeof imgBankGetAll !== 'function') return;
    if (typeof window.JSZip === 'undefined') {
      if (typeof showToast === 'function') showToast('⚠️ ZIP 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    imgBankGetAll().then(function (list) {
      if (!list || !list.length) {
        if (typeof showToast === 'function') showToast('⚠️ 저장할 이미지가 없습니다.');
        return;
      }
      var zip = new window.JSZip();
      list.forEach(function (item, i) {
        if (!item.dataURL) return;
        var base64 = item.dataURL.indexOf(',') !== -1 ? item.dataURL.split(',')[1] : item.dataURL;
        var ext = (item.dataURL.indexOf('jpeg') !== -1 || item.dataURL.indexOf('jpg') !== -1) ? 'jpg' : 'png';
        var baseName = (item.name || 'image_' + (i + 1)).replace(/\.(png|jpe?g|gif|webp)$/i, '').replace(/[^\w\uac00-\ud7a3\-\.]/g, '_') || ('image_' + (i + 1));
        zip.file(baseName + '.' + ext, base64, { base64: true });
      });
      zip.generateAsync({ type: 'blob' }).then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'scholarslide_imgbank_' + new Date().toISOString().slice(0, 10) + '.zip';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof showToast === 'function') showToast('✅ ZIP 저장 완료 (' + list.length + '장)');
      }).catch(function () {
        if (typeof showToast === 'function') showToast('❌ ZIP 생성 실패');
      });
    });
  };

  window.imgBankImportFile = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var list = JSON.parse(reader.result);
        if (!Array.isArray(list)) list = [list];
        if (typeof imgBankAdd !== 'function') { if (typeof showToast === 'function') showToast('❌ imgBank를 사용할 수 없습니다.'); return; }
        var done = 0;
        list.forEach(function (item) {
          imgBankAdd({ dataURL: item.dataURL, name: item.name || ('img_' + Date.now() + '_' + done), createdAt: item.createdAt, prompt: item.prompt }).then(function () {
            done++;
            if (done >= list.length) {
              var modal = document.getElementById('imgbank-modal');
              var content = document.getElementById('imgbank-modal-content');
              var panel = document.getElementById('imgbank-panel');
              if (modal && modal.classList.contains('open') && content && typeof renderImgBankPanel === 'function') renderImgBankPanel(content);
              else if (typeof renderImgBankPanel === 'function') renderImgBankPanel();
              if (typeof showToast === 'function') showToast('✅ Import 완료 (' + list.length + '장)');
            }
          }).catch(function () { done++; });
        });
        if (list.length === 0 && typeof showToast === 'function') showToast('⚠️ 가져올 항목이 없습니다.');
      } catch (err) {
        if (typeof showToast === 'function') showToast('❌ 파일 형식 오류');
      }
    };
    reader.readAsText(file);
  };

    window.renderImgBankPanel = renderImgBankPanel;

  /** imgBank 모달 열기 (헤더/탭에서 호출) — 배치·드래그 초기화 */
  window.openImgBankModal = function () {
    var modal = document.getElementById('imgbank-modal');
    var content = document.getElementById('imgbank-modal-content');
    var box = document.getElementById('imgbank-modal-box');
    var dragHandle = document.getElementById('imgbank-modal-drag');
    if (!modal || !content) return;
    modal.classList.add('open');
    if (typeof renderImgBankPanel === 'function') renderImgBankPanel(content);

    if (box) {
      var w = box.offsetWidth || 900;
      var h = box.offsetHeight || 400;
      box.style.left = Math.max(16, (window.innerWidth - w) / 2) + 'px';
      box.style.top = Math.max(16, (window.innerHeight - h) / 2) + 'px';
      box.style.transform = 'none';
    }

    if (!window._imgBankDragInited && dragHandle) {
      window._imgBankDragInited = true;
      dragHandle.addEventListener('mousedown', function (e) {
        if (e.target.closest('.modal-close')) return;
        e.preventDefault();
        _imgBankDrag.active = true;
        _imgBankDrag.startX = e.clientX;
        _imgBankDrag.startY = e.clientY;
        _imgBankDrag.startLeft = box.getBoundingClientRect().left;
        _imgBankDrag.startTop = box.getBoundingClientRect().top;
      });
      document.addEventListener('mousemove', function (e) {
        if (!_imgBankDrag.active || !box) return;
        box.style.left = (_imgBankDrag.startLeft + (e.clientX - _imgBankDrag.startX)) + 'px';
        box.style.top = (_imgBankDrag.startTop + (e.clientY - _imgBankDrag.startY)) + 'px';
      });
      document.addEventListener('mouseup', function () {
        _imgBankDrag.active = false;
      });
    }
  };
})();
