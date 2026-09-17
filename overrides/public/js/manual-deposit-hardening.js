(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function resetButton(button) {
        if (!button) return;
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || '<span>إرسال طلب الإيداع</span>';
    }

    function showClientError(form, message) {
        var old = form.querySelector('.yd-client-deposit-error');
        if (old) old.remove();
        var box = document.createElement('div');
        box.className = 'yd-client-deposit-error';
        box.style.cssText = 'width:100%;max-width:680px;margin:0 auto;padding:12px 14px;border:1px solid #f2b8b5;border-radius:10px;background:#fff3f2;color:#9b1c1c;font-weight:800;text-align:right';
        box.textContent = message;
        form.insertBefore(box, form.firstChild);
    }

    function readAsDataURL(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(typeof reader.result === 'string' ? reader.result : ''); };
            reader.onerror = function () { reject(new Error('read_failed')); };
            reader.readAsDataURL(file);
        });
    }

    function loadImage(dataUrl) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('image_failed')); };
            img.src = dataUrl;
        });
    }

    async function safeReceiptData(file) {
        var original = await readAsDataURL(file);
        if (!original || original.indexOf('data:image/') !== 0) throw new Error('invalid_image');

        // Keep already-small receipts untouched. Large phone screenshots/photos are
        // downscaled before the request so PHP receives a normal, predictable POST.
        if (file.size <= 1200 * 1024) return original;

        var img = await loadImage(original);
        var maxSide = 1800;
        var scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        var width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        var height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        if (!ctx) return original;
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.86);
    }

    ready(function () {
        document.querySelectorAll('.yd-manual-payment-form').forEach(function (form) {
            if (form.dataset.ydBound === '1') return;
            form.dataset.ydBound = '1';

            form.addEventListener('submit', function (event) {
                if (form.dataset.ydNativeSubmit === '1') return;

                var fileInput = form.querySelector('input[type="file"][name="proof"]');
                var file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
                if (!file) return;

                var allowed = ['image/jpeg', 'image/png', 'image/webp'];
                if (allowed.indexOf(file.type) === -1) {
                    event.preventDefault();
                    showClientError(form, 'صورة الإثبات يجب أن تكون JPG أو PNG أو WEBP.');
                    return;
                }
                if (file.size <= 0 || file.size > 12 * 1024 * 1024) {
                    event.preventDefault();
                    showClientError(form, 'حجم صورة الإثبات كبير جدًا. اختر صورة أقل من 12 ميجابايت.');
                    return;
                }

                event.preventDefault();
                var button = form.querySelector('button[type="submit"]');
                if (button) {
                    button.disabled = true;
                    button.dataset.originalText = button.innerHTML;
                    button.innerHTML = '<span>جاري إرسال طلب الإيداع...</span><small>يرجى عدم إغلاق الصفحة</small>';
                }

                safeReceiptData(file).then(function (data) {
                    if (!data || data.indexOf('data:image/') !== 0) throw new Error('invalid_result');

                    var proofData = form.querySelector('input[name="proof_data"]');
                    if (!proofData) {
                        proofData = document.createElement('input');
                        proofData.type = 'hidden';
                        proofData.name = 'proof_data';
                        form.appendChild(proofData);
                    }
                    proofData.value = data;

                    var proofName = form.querySelector('input[name="proof_name"]');
                    if (!proofName) {
                        proofName = document.createElement('input');
                        proofName.type = 'hidden';
                        proofName.name = 'proof_name';
                        form.appendChild(proofName);
                    }
                    proofName.value = file.name || 'deposit-proof.jpg';

                    // This is deliberate: the production smoke path that is proven to
                    // work is application/x-www-form-urlencoded. Clearing/disabling the
                    // file and switching the encoding makes real Chrome use that exact
                    // server parsing path instead of PHP's multipart upload parser.
                    fileInput.required = false;
                    fileInput.disabled = true;
                    form.enctype = 'application/x-www-form-urlencoded';
                    form.encoding = 'application/x-www-form-urlencoded';
                    form.dataset.ydNativeSubmit = '1';
                    HTMLFormElement.prototype.submit.call(form);
                }).catch(function () {
                    resetButton(button);
                    showClientError(form, 'تعذر تجهيز صورة الإثبات للإرسال. اختر الصورة مرة أخرى ثم حاول مجددًا.');
                });
            }, true);
        });
    });
})();
