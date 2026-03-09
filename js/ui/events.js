/* =========================================================
   EVENTS AND HANDLERS (Drag & Drop, etc.)
   ========================================================= */

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('img-drop-zone')?.classList.add('dragover');
}
function handleDragLeave(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('img-drop-zone')?.classList.remove('dragover');
}
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        document.getElementById('img-file-input').files = e.dataTransfer.files;
        if (typeof loadImageForCrop === 'function') {
            // Create synthetic event
            loadImageForCrop({ target: document.getElementById('img-file-input') });
        }
    }
}

// Global window event listeners initialization
window.addEventListener('DOMContentLoaded', () => {
    // Initialize anything needed on load
    const dropZone = document.getElementById('img-drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    }
});
