(()=>{
'use strict';
const boot=window.YD_ORDER_BOOT||{};
new Vue({
  el:'#app',
  data:{
    boot:Object.assign({isAdmin:false,categories:[],stats:{balance:0,spent:0,total_orders:0,completed_orders:0,open_orders:0}},boot),
    platforms:[
      {key:'instagram',label:'Instagram',icon:'📸',terms:['instagram','insta','انستجرام','انستغرام']},
      {key:'tiktok',label:'TikTok',icon:'🎵',terms:['tiktok','tik tok','تيك توك']},
      {key:'youtube',label:'YouTube',icon:'▶️',terms:['youtube','يوتيوب']},
      {key:'facebook',label:'Facebook',icon:'📘',terms:['facebook','fb','فيسبوك']},
      {key:'telegram',label:'Telegram',icon:'✈️',terms:['telegram','تلجرام','تيليجرام']},
      {key:'twitter',label:'X / Twitter',icon:'𝕏',terms:['twitter',' x ','x.com','تويتر']},
      {key:'snapchat',label:'Snapchat',icon:'👻',terms:['snapchat','snap','سناب']},
      {key:'spotify',label:'Spotify',icon:'🎧',terms:['spotify','سبوتيفاي']},
      {key:'discord',label:'Discord',icon:'🎮',terms:['discord','ديسكورد']},
      {key:'linkedin',label:'LinkedIn',icon:'💼',terms:['linkedin','linked in','لينكد']},
      {key:'reddit',label:'Reddit',icon:'🟠',terms:['reddit','ريديت']},
      {key:'twitch',label:'Twitch',icon:'🟣',terms:['twitch','تويتش']}
    ],
    activePlatform:'all',categoryId:'',services:[],serviceSearch:'',selectedService:null,serviceMeta:{},
    postdata:{service_id:'',link:'',quantity:'',notes:''},confirmation:false,totalPrice:0,
    errors:{},processing:false,submitError:'',submitSuccess:'',loadingServices:false,
    orders:{data:[],current_page:1,last_page:1},loadingOrders:false,search:''
  },
  computed:{
    filteredCategories(){
      const cats=Array.isArray(this.boot.categories)?this.boot.categories:[];
      if(this.activePlatform==='all') return cats;
      const p=this.platforms.find(x=>x.key===this.activePlatform); if(!p) return cats;
      return cats.filter(c=>{const n=(' '+(c.name||'')+' ').toLowerCase();return p.terms.some(t=>n.includes(t.toLowerCase()));});
    },
    filteredServices(){
      const q=this.serviceSearch.toLowerCase(); if(!q) return this.services;
      return this.services.filter(s=>String(s.name||'').toLowerCase().includes(q)||String(s.id).includes(q));
    },
    serviceDescription(){
      if(!this.selectedService) return '';
      const d=String(this.selectedService.description||'').trim();
      if(!d) return 'خدمة جاهزة للتنفيذ عبر مزود البطة الصفرا.';
      try{const obj=JSON.parse(d); if(obj&&typeof obj==='object') return 'نوع الخدمة: '+(obj.provider_type||'Default')+' — راجع الحدود والسعر قبل التنفيذ.';}catch(e){}
      return d;
    }
  },
  methods:{
    money(v){const n=Number(v||0);return Number.isFinite(n)?n.toFixed(4).replace(/0+$/,'').replace(/\.$/,''):'0';},
    setPlatform(key){this.activePlatform=key;this.categoryId='';this.services=[];this.postdata.service_id='';this.selectedService=null;this.serviceMeta={};this.totalPrice=0;},
    async loadServices(){
      this.services=[];this.postdata.service_id='';this.selectedService=null;this.serviceMeta={};this.totalPrice=0;this.submitError='';
      if(!this.categoryId)return;this.loadingServices=true;
      try{const r=await axios.get(this.boot.servicesBaseUrl+'/'+this.categoryId);this.services=Array.isArray(r.data)?r.data:[];}
      catch(e){this.submitError='تعذر تحميل الخدمات لهذه الفئة.';}finally{this.loadingServices=false;}
    },
    selectService(){
      this.selectedService=this.services.find(s=>String(s.id)===String(this.postdata.service_id))||null;
      this.serviceMeta={};this.postdata.quantity='';this.totalPrice=0;this.errors={};
      if(this.selectedService&&this.selectedService.description){try{const m=JSON.parse(this.selectedService.description);if(m&&typeof m==='object')this.serviceMeta=m;}catch(e){}}
    },
    calculateTotal(){if(!this.selectedService){this.totalPrice=0;return;}const q=Number(this.postdata.quantity||0);this.totalPrice=Math.max(0,(q*Number(this.selectedService.rate||0))/1000);},
    validate(){
      const e={};if(!this.categoryId)e.category_id=true;if(!this.selectedService)e.service_id=true;
      try{const u=new URL(this.postdata.link||'');if(!/^https?:$/.test(u.protocol))throw new Error();}catch(x){e.link=true;}
      const q=Number(this.postdata.quantity||0);if(!q)e.quantity='أدخل الكمية.';else if(this.selectedService&&q<Number(this.selectedService.min))e.quantity='الحد الأدنى '+this.selectedService.min;else if(this.selectedService&&q>Number(this.selectedService.max))e.quantity='الحد الأقصى '+this.selectedService.max;
      if(!this.confirmation)e.confirmation=true;this.errors=e;return Object.keys(e).length===0;
    },
    async storeOrder(){
      this.submitError='';this.submitSuccess='';if(!this.validate())return;this.processing=true;
      try{
        const payload={service_id:Number(this.postdata.service_id),link:this.postdata.link,quantity:Number(this.postdata.quantity),notes:this.postdata.notes||null};
        const r=await axios.post(this.boot.storeUrl,payload);
        if(r.status===200){this.submitSuccess='تم إرسال الطلب بنجاح. رقم الطلب #'+r.data.id;this.boot.stats.balance=Math.max(0,Number(this.boot.stats.balance||0)-Number(r.data.total||0));this.boot.stats.total_orders=Number(this.boot.stats.total_orders||0)+1;this.boot.stats.open_orders=Number(this.boot.stats.open_orders||0)+1;this.boot.stats.spent=Number(this.boot.stats.spent||0)+Number(r.data.total||0);this.postdata={service_id:'',link:'',quantity:'',notes:''};this.selectedService=null;this.serviceMeta={};this.confirmation=false;this.totalPrice=0;await this.getOrders(1);}
      }catch(e){this.submitError=(e.response&&e.response.data&&(e.response.data.message||Object.values(e.response.data.errors||{})[0]?.[0]))||'تعذر تنفيذ الطلب حاليًا.';}finally{this.processing=false;}
    },
    async getOrders(page=1){
      if(page<1)return;this.loadingOrders=true;
      try{let url=this.boot.ordersApiUrl+'?api=true&page='+page;if(this.search)url+='&search='+encodeURIComponent(this.search);const r=await axios.get(url);this.orders=r.data.orders||{data:[],current_page:1,last_page:1};}
      catch(e){this.orders={data:[],current_page:1,last_page:1};}finally{this.loadingOrders=false;}
    },
    statusClass(s){s=String(s||'').toLowerCase();if(s==='completed')return'completed';if(['refunded','error','canceled','cancelled'].includes(s))return'failed';if(['processing','in progress'].includes(s))return'processing';if(s==='partial')return'partial';return'pending';},
    statusLabel(s){const map={completed:'مكتمل',pending:'قيد الانتظار',processing:'جاري التنفيذ','in progress':'جاري التنفيذ',partial:'جزئي',refunded:'مسترد',error:'خطأ',awaiting:'قيد الانتظار'};return map[String(s||'').toLowerCase()]||s||'-';},
    dateLabel(v){if(!v)return'-';try{return new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch(e){return v;}}
  },
  mounted(){this.getOrders(1);}
});
})();
