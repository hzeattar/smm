/* Yellow Duck compatibility bridge for the CKEditor 5 Classic build expected by the legacy admin templates. */
(function () {
    if (window.ClassicEditor) return;
    document.write('<script src="https://cdn.ckeditor.com/ckeditor5/35.4.0/classic/ckeditor.js"><\/script>');
})();
