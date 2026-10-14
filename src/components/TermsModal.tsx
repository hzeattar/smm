import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[#272c3d]">
          <div className="flex items-center gap-2 text-white font-black text-lg">
            <ShieldCheck className="w-5 h-5 text-[#f6b100]" />
            <span>الشروط والأحكام - البطة الصفرا</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#222634] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto py-4 space-y-4 text-xs text-slate-300 leading-relaxed">
          <section>
            <h4 className="font-bold text-white text-sm mb-1">1. قبول الشروط</h4>
            <p>
              باستخدامك لمنصة "البطة الصفرا"، فإنك توافق على الالتزام بجميع الشروط والأحكام المذكورة هنا، وتتحمل المسؤولية الكاملة عن صحة الروابط والبيانات التي يتم تقديمها أثناء إنشاء الطلبات.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-white text-sm mb-1">2. سياسة تنفيذ الخدمات</h4>
            <p>
              نحن نبذل قصارى جهدنا لتقديم الخدمات في أسرع وقت ممكن وفق التقديرات الموضحة في وصف كل خدمة. لا نطلب أبداً كلمات مرور الحسابات، ويجب التأكد من أن الحسابات أو الروابط عامة (Public) طوال فترة التنفيذ.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-white text-sm mb-1">3. سياسة شحن الرصيد والمدفوعات</h4>
            <p>
              تتم عمليات الإيداع عبر الوسائل المعتمدة في مصر (فودافون كاش وإنستاباي). يتم احتساب الرصيد بسعر الصرف الموضح في المنصة، وتتم مراجعة التحويلات من قبل الإدارة لضمان أمان ومطابقة المبالغ المحولة.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-white text-sm mb-1">4. الإلغاء والتعويض</h4>
            <p>
              في حال تعذر تنفيذ أي طلب أو تم إلغاؤه من قبل النظام، يتم استرداد التكلفة مباشرة وبشكل آلي إلى رصيد حسابك داخل المنصة لإعادة استخدامه في أي خدمة أخرى.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[#272c3d] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs transition-colors"
          >
            فهمت وموافق
          </button>
        </div>
      </div>
    </div>
  );
};
