<div class="modal fade mt-4" id="edit-payment-method-modal" tabindex="-1" role="dialog" aria-labelledby="modal-details" aria-hidden="true">
    <div class="modal-dialog modal-dialog-top modal-lg" role="document">
        <div class="modal-content yd-payment-modal">
            <form id="from-payment-method" action="{{ route('admin.payment-methods.store') }}" method="post">
                @csrf
                <div class="block block-themed block-transparent mb-0">
                    <div class="block-header bg-primary">
                        <h3 class="block-title">تعديل طريقة الدفع</h3>
                        <div class="block-options">
                            <button type="button" class="btn-block-option" data-dismiss="modal" aria-label="Close">
                                <i class="fa fa-fw fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="block-content">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="name">اسم طريقة الدفع</label>
                                    <input v-model="postdata.name" type="text" class="form-control" id="name" placeholder="Vodafone Cash / InstaPay Egypt">
                                    <div v-if="errors.name" class="invalid-feedback m-0 d-block">
                                        <span v-if="errors.name.required">الاسم مطلوب</span>
                                        <span v-if="errors.name.over_length">الحد الأقصى 150 حرف</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="status">الحالة</label>
                                    <select v-model="postdata.status" class="form-control" id="status">
                                        <option value="active">active</option>
                                        <option value="deactive">deactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-4">
                                <div class="form-group">
                                    <label for="min">الحد الأدنى بالدولار</label>
                                    <input v-model="postdata.min" type="number" min="0" class="form-control" id="min">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="form-group">
                                    <label for="max">الحد الأقصى بالدولار</label>
                                    <input v-model="postdata.max" type="number" min="0" class="form-control" id="max">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="form-group">
                                    <label for="fee">الرسوم %</label>
                                    <input v-model="postdata.fee" type="number" min="0" max="100" step="0.01" class="form-control" id="fee">
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="image">ملف الشعار / QR داخل public/images</label>
                                    <input v-model="postdata.image" type="text" class="form-control" id="image" placeholder="vodafone-cash.svg أو instapay-qr.png">
                                    <small class="form-text text-muted">لو إنستا باي: يمكن وضع اسم صورة QR هنا أو وضع الرابط في الحقل التالي.</small>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="api_key">رابط QR أو رابط الدفع العام</label>
                                    <input v-model="postdata.api_key" type="text" class="form-control" id="api_key" placeholder="https://... أو instapay-qr.png">
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="private_key">رقم المحفظة / حساب الاستقبال</label>
                                    <input v-model="postdata.private_key" type="text" class="form-control" id="private_key" placeholder="01205323440">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="environment">البيئة</label>
                                    <select v-model="postdata.environment" class="form-control" id="environment">
                                        <option value="production">production</option>
                                        <option value="sandbox">sandbox</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="client_id">تعليمات تظهر للمستخدم</label>
                            <textarea v-model="postdata.client_id" class="form-control" id="client_id" placeholder="اكتب تعليمات الإيداع التي ستظهر في صفحة إضافة الرصيد"></textarea>
                        </div>
                    </div>

                    <div class="d-flex justify-content-center block-content block-content-full text-right bg-light">
                        <button v-on:click="storePaymentMethod(postdata.id)" type="button" class="w-100 btn btn-primary">
                            حفظ طريقة الدفع
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
