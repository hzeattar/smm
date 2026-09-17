(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(function () {
        document.querySelectorAll('.yd-manual-payment-form').forEach(function (form) {
            if (form.dataset.ydBound === '1') return;
            form.dataset.ydBound = '1';

            form.addEventListener('submit', function (event) {
                if (form.dataset.ydNativeSubmit === '1') return;

                var fileInput = form.querySelector('input[type="file"][name="proof"]');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) return;

                var file = fileInput.files[0];
                var allowed = ['image/jpeg', 'image/png', 'image/webp'];
                if (allowed.indexOf(file.type) === -1) return;
                if (file.size <= 0 || file.size > 5 * 1024 * 1024) return;

                event.preventDefault();

                var submit = form.querySelector('button[type="submit"]');
                if (submit) {
                    submit.disabled = true;
                    submit.dataset.originalText = submit.innerHTML;
                    submit.innerHTML = '<span>جاري إرسال طلب الإيداع...</span><small>يرجى عدم إغلاق الصفحة</small>';
                }

                var reader = new FileReader();
                reader.onload = function () {
                    var data = typeof reader.result === 'string' ? reader.result : '';
                    if (!data || data.indexOf('data:image/') !== 0) {
                        if (submit) {
                            submit.disabled = false;
                            submit.innerHTML = submit.dataset.originalText || 'إرسال طلب الإيداع';
                        }
                        return;
                    }

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

                    fileInput.required = false;
                    fileInput.value = '';
                    form.dataset.ydNativeSubmit = '1';
                    HTMLFormElement.prototype.submit.call(form);
                };

                reader.onerror = function () {
                    if (submit) {
                        submit.disabled = false;
                        submit.innerHTML = submit.dataset.originalText || 'إرسال طلب الإيداع';
                    }
                };

                reader.readAsDataURL(file);
            });
        });
    });
})();
