@extends('layouts.app')

@section('content')
@include('web.partials.header',['links'=>true])
<main class="yd-landing" dir="rtl">
    <section class="yd-section" style="padding-top:130px">
        <div class="container">
            <div class="yd-section-heading">
                <span class="eyebrow">البطة الصفرا</span>
                <h1 style="font-size:clamp(32px,4vw,46px);font-weight:900">الشروط والأحكام</h1>
                <p>استخدامك للمنصة يعني موافقتك على القواعد التالية. الهدف منها حماية حسابك وضمان تنفيذ الطلبات بشكل واضح.</p>
            </div>
            <div class="yd-faq-list" style="max-width:980px">
                <article class="yd-faq-item"><h3>1. استخدام الحساب</h3><div class="answer">أنت مسؤول عن الحفاظ على بيانات دخول حسابك وعدم مشاركتها مع الآخرين. يجب استخدام المنصة للأغراض المشروعة فقط.</div></article>
                <article class="yd-faq-item"><h3>2. تنفيذ الخدمات</h3><div class="answer">سرعة التنفيذ والتوفر قد يختلفان حسب نوع الخدمة والمزود. لا ترسل طلبًا جديدًا لنفس الرابط أثناء وجود طلب سابق قيد التنفيذ إلا إذا كانت تعليمات الخدمة تسمح بذلك.</div></article>
                <article class="yd-faq-item"><h3>3. الروابط والبيانات</h3><div class="answer">العميل مسؤول عن إدخال الرابط والكمية والبيانات المطلوبة بشكل صحيح قبل تأكيد الطلب. الطلبات التي تم إرسالها للمزود قد لا يمكن تعديلها بعد بدء التنفيذ.</div></article>
                <article class="yd-faq-item"><h3>4. الرصيد والمدفوعات</h3><div class="answer">يتم إضافة الرصيد بعد نجاح طريقة الدفع أو اعتماد الدفع اليدوي من الإدارة. أي رسوم أو حدود خاصة بطريقة الدفع تظهر للمستخدم قبل إتمام العملية عند تفعيلها.</div></article>
                <article class="yd-faq-item"><h3>5. الاسترجاع والتعويض</h3><div class="answer">الاسترجاع أو التعويض يعتمد على حالة الطلب وسياسة الخدمة والمزود. عند تعذر تنفيذ خدمة مدفوعة يتم التعامل مع الرصيد وفق نتيجة الطلب الفعلية وسياسة المنصة.</div></article>
                <article class="yd-faq-item"><h3>6. إساءة الاستخدام</h3><div class="answer">يحق للإدارة تعليق الحسابات التي تستخدم المنصة في الاحتيال أو إساءة الاستخدام أو محاولة الإضرار بالمنصة أو مزودي الخدمة.</div></article>
                <article class="yd-faq-item"><h3>7. تحديث الشروط</h3><div class="answer">قد يتم تحديث هذه الشروط عند إضافة مزودي خدمات أو طرق دفع أو خصائص جديدة، وسيتم اعتماد النسخة المنشورة على المنصة وقت الاستخدام.</div></article>
            </div>
        </div>
    </section>
</main>
@include('web.partials.footer')
@endsection
